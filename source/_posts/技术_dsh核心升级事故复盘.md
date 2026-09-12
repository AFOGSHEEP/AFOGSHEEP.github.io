---
title: dsh 核心升级事故复盘
date: 2026-09-12 20:00:00
cover: /images/dsh-upgrade-repair-cover.jpg
categories:
  - 学习笔记
tags:
  - DSH
  - 故障排查
  - 复盘
  - Cordis
---

9 月 12 日，本机的 dsh（DeepSeek Harness，运行 web GUI 的 agent 宿主，监听 127.0.0.1:3080）发生连环故障：六轮报错、一次降级回退、一次误删插件、一次从会话历史恢复源码。以下按事件顺序完整记录发现问题和修复问题的全过程。

总览：

| 阶段 | 事件 |
|---|---|
| 起因 | dsh 为挂载 dcp 插件，自行将核心从 0.1.1-rc.2 升级到 0.1.5-rc.2，未重启进程，GUI 无法打开 |
| 修复一 | 重启进程、修复启动脚本；被新报错推翻 |
| 修复二 | 升级 2 个插件、禁用 3 个插件；写简报交 dsh 自修 |
| dsh 自修 | 改动正确但未重启；人工重启验证通过，再次被新报错推翻 |
| 修复三 | 重写三个插件的模块引用；被推翻 |
| 修复四 | 禁用 file-changes；boot 层正常，对话功能仍不可用 |
| 定位原因 | dcp 与新版事件流 API 不兼容；确定回退 |
| 回退与重建 | 降级、快照恢复、依赖重装；误删的两个插件从会话历史复原 |

## 背景

dsh 的核心版本原为 0.1.1-rc.2，运行稳定。当天，dsh 在一次对话中为挂载 dsh-dcp（社区开发的确定性上下文压缩插件，要求核心版本不低于 0.1.5），自行执行核心升级：全局的 `@deepseek-ai/dsh` 替换为 `@next` 频道的 0.1.5-rc.2，profile 的 package.json 写入 dcp 依赖，pnpm 更新 node_modules。升级完成后，运行中的 web 进程未重启，GUI 无法打开。

升级前，机器上有一份 `~/.dsh` 全量 tar 快照（82MB）。这份快照是全程唯一起作用的预防措施。

## 第一轮：进程是旧的，磁盘是新的

现场检查：

```bash
# 版本、进程、HTTP
dsh --version          # 0.1.5-rc.2
ps aux | grep "[d]sh"  # web 进程 PID 70415，9 月 11 日启动
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3080   # 200

# 配置树
dsh --profile web --dump-config   # exit=0，配置本身没坏

# profile 现状
cat ~/.dsh/profiles/web/package.json
tail -60 ~/.dsh/CHANGELOG.md
```

关键观察：

1. 磁盘上的核心已是 0.1.5-rc.2，运行中的进程为 9 月 11 日启动，内存中仍是 0.1.1 的代码。
2. `curl` 返回 200，HTTP 层正常，浏览器白屏。
3. 浏览器端报错为 `boot manifest batches must be an array`。

根因：旧进程按旧逻辑读取已被 pnpm 更新为新版的 bundle 元数据，生成的 boot manifest 格式错误，前端解析失败，插件全部无法加载。`curl` 只能探测 HTTP 层，无法反映前端 JS 的状态，200 是假象。

会话数据以 JSONL 持久化于 `~/.dsh/sessions`，终止进程不丢失数据。执行修复：

```bash
pkill -f "dsh web"; sleep 1
nohup dsh web --no-open --host 127.0.0.1 \
  --trusted-host gwendemacbook-air.local --trusted-host 192.168.3.137 \
  >/tmp/dsh-web.log 2>&1 &
```

重启后逐项验证：HTTP 200、manifest 中 `batches` 为数组、`client.js` 与 `index.js` 静态资源均返回 200。第一层故障消除。

另发现一个问题：0.1.5 引入 auth token 机制，首次访问需通过 `/?token=xxx` 登录并写入 30 天 cookie，而 `~/.dsh/dsh-launch.sh` 中的 `open 127.0.0.1:3080` 将直接返回 401。按本机守则先备份为 `.bak-20260912-*`，再将 `dsh-launch.sh` 改为从 `/tmp/dsh-web.log` 解析 token URL 后打开。

## 第二轮：/client 子路径失效

浏览器端报错：

```
Failed to load plugins
failed to import loader entry f8bfe431 (dsh-ui-appearance):
client-modules: require("@deepseek-ai/dsh-client-runtime/client")
missed the module table — not a platform seed word, not a materialized
module, and no registered package factory
```

本次故障与进程无关：0.1.5-rc.2 重构了 client 模块系统，旧插件编译产物中 `require("@deepseek-ai/dsh-client-runtime/client")` 这种带 `/client` 子路径（无 `.js`）的写法全部失效。

排查做了四件事：

- 列出 `node_modules` 里所有 `@deepseek-ai` 包，确认 `dsh-client-runtime` 包本体是否存在及其结构；
- 扫描全部插件目录（`dsh-*`、`@aiwayds/*`、`@baconbao/*`、`@liustack/*`）的 require 语句，按三种形式分类：带 `/client"` 的（会崩）、裸名、`/client.js`（两种都兼容）；
- `npm pack` 拉取 `dsh-ui-appearance@0.1.9`、`dsh-better-sidebar@0.19.1`、`dsh-at-file@0.6.3`、`dsh-writing-pad@1.1.3` 四个最新包解开对照，确认上游适配情况；
- 解析首页 HTML 里的 boot manifest，确认新版认可的模块名的实际形式。

结论是五个插件受影响：

| 插件 | 当前 → 最新 | 上游状态 |
|---|---|---|
| dsh-ui-appearance | 0.1.6 → 0.1.9 | 新版本已适配 |
| dsh-better-sidebar | 0.15.0 → 0.19.1 | 已适配 |
| dsh-at-file | 0.6.3（已是最新） | 未适配 |
| dsh-writing-pad | 1.1.2 → 1.1.3 | 未适配（后来证明该判断有误） |
| dsh-file-changes | github 源 | 未适配 |

两个可选方案：A，降级回 0.1.1-rc.2，一条命令恢复全部功能，放弃 dcp（推荐）；B，继续使用 @next：升级两个已适配插件，禁用三个未适配插件保住启动，后续补齐。采用方案 B，剩余插件的源码修改交由 dsh 执行，改动内容记录备查。

执行：

```bash
pnpm add dsh-ui-appearance@^0.1.9 dsh-better-sidebar@^0.19.1
```

随后在 `cordis.patch.yml` 中禁用其余三个插件。此步骤出现一个问题：disabled 条目按包名书写（`dsh-writing-pad`、`dsh-file-changes`），重启后 manifest 中三个插件仍然存在，禁用未生效。原因为 bundle id 与包名不一致：`dsh-writing-pad` 的 id 是 `writing-pad`，`dsh-file-changes` 的 id 是 `file-changes`，均无 `dsh-` 前缀。经 `dsh --profile web --dump-config` 核对真实 id 后改写，重启，三个插件在 manifest 中清零。

验证结果：禁用的三个插件出现 0 次，升级的两个插件与 `dsh-client-store` seed 均存在，旧 `/client` 引用残留 0。

本轮验证仅到达 manifest 层，未做浏览器实测，该缺陷在后续轮次反复出现。

## 简报与 dsh 自修

为让 dsh 自行修复剩余三个插件，整理简报一份，内容包含四点：

1. 改法：把 `require("@deepseek-ai/dsh-client-runtime/client")` 的 `/client` 后缀去掉；
2. bundle id 坑：重新启用时 disabled 必须写 bundle id 而不是包名，写错不报错但不生效；
3. 直接改 node_modules 会被 pnpm 重装覆盖，要用 `pnpm patch` 固化；`dsh-file-changes` 是 `github:mixin-ai/dsh-file-changes` 的 git 依赖，patch 或 fork 二选一；
4. 完成后的重启与验证命令。

dsh 按简报完成修复，故障再次出现。

## 第三轮：dsh 的修复正确，但未重启

检查现场，还原 dsh 的四项改动：

1. `pnpm patch` 了 `dsh-at-file` 与 `dsh-file-changes`，将 `/client` 改为裸名，patch 文件内容正确；
2. `dsh-writing-pad` 升级到 1.1.3，该版本 dist 的实际代码为合规写法（此前"未适配"的判断有误，原因是 sourcemap 中残留的旧引用）；
3. 删除三个 disabled 条目；
4. 建立 `.dsh-module-fallback/` 目录存放 mermaid 依赖，用于修复 mermaid 插件的依赖解析，与本次故障无关。

改动方向正确，问题在于未重启，浏览器中呈现的仍是旧进程状态。

重启后验证：manifest 中三个插件各 5 处（已加载）、旧 `/client` 残留 0、全量扫描所有插件的实际 JS（排除 `.map`）无旧子路径。本轮验证仍限于 boot manifest 层。

## 第四轮：runtime 模块被整体移除

浏览器端报错变为：

```
failed to import loader entry 62d6fc81 (dsh-file-changes):
client-modules: require("@deepseek-ai/dsh-client-runtime")
missed the module table — not a platform seed word, not a materialized
module, and no registered package factory
```

裸名同样 miss。本轮排查最深入。

第一步解决一个矛盾：首页 HTML 的 manifest 中存在 6 处 `@deepseek-ai/dsh-client-runtime` 字符串，但无法 require。逐条检查上下文，这 6 处均位于各插件的 inject 声明中，属于服务端 Cordis 的服务名，不是浏览器端可 require 的模块。可 require 的 seed word 为 `@deepseek-ai/dsh-client-store`、`dsh-client-ui-primitives`、`dsh-client-ui-slots` 等。结论：`dsh-client-runtime` 客户端模块在 0.1.5-rc.2 中被整体移除，不是改名。dsh 的"去掉 `/client` 后缀"替换在方向上无效。

第二步逐插件检查实际使用的 runtime API，直接读源码：

- `dsh-at-file/lib/client.js`：只用了 `createSnapshotStore`。查新版核心，该 API 移入 `dsh-client-store`。改 require 目标即可。
- `dsh-file-changes/lib/client.js`：用了 `isAppendSurfaceEvent` 和 `resolveWorkspacePath`，新版无客户端侧替代。解法是把这两个函数的实现从新版核心源码中取出，内联进插件。
- `dsh-writing-pad`：1.1.3 本来就只 require `ui-primitives`，无需改动。

内联的两个函数，实现分别位于核心的 `dsh-session/lib/index.js`（`isAppendSurfaceEvent`，含 `SURFACE_EVENT_TYPES` 判断）与 `dsh-util-workspace-path/lib/index.js`（`resolveWorkspacePath`，含 Windows 风格路径分支），逐行确认语义后移入插件。

修复方式：先直接修改 node_modules 验证方向，重启确认可加载后，用 `pnpm patch` 固化（否则下次 `pnpm install` 会被覆盖）：

```bash
pnpm patch dsh-at-file@0.6.3
# 生成 node_modules/.pnpm_patches/dsh-at-file@0.6.3/ 临时目录
# 在临时目录里改 lib/client.js
pnpm patch-commit node_modules/.pnpm_patches/dsh-at-file@0.6.3
```

期间清理了一次 `.pnpm_patches` 的残留状态（含上次 dsh 操作留下的 `state.json`）。`dsh-file-changes` 为 github tarball 源，流程相同，临时目录名为一整串 codeload URL，在其中完成两个函数的内联后 patch-commit。

重启，最终验证：三个插件各 5 处、旧 `/client` 残留 0、裸名 runtime 残留 0、日志无报错。

## 第五轮：conversationEvents 服务被移除

报错方向改变：

```
Failed to load plugins
web boot: 1 entry did not activate
dsh-file-changes: pending (waiting for service: conversationEvents)
```

require 层全部修复，故障转移到服务层。`dsh-file-changes` 的 `exports.inject` 声明了 `conversationEvents` 这个 Cordis 短服务，插件通过 `ctx.conversationEvents.register(fileChangesDefinition)` 注册文件变更事件定义。源码中 `fileChangesDefinition` 位于 113 行，`kind: "fileChanges"`，含 `match/start/update/render` 生命周期钩子，344 行调用 register。0.1.5-rc.2 将该事件系统整体重构，短服务不存在，插件永久处于 pending。

对照确认波及范围：`dsh-at-file` 的 inject 为 `["inputTriggers", "sessions", "connection", "remote", "slots", "locale"]`，`dsh-writing-pad` 为 `["slots", "layout", "remote", "locale"]`，这些服务在新版中均存在，因此仅 `file-changes` 无法激活。

处理：再次禁用 `file-changes`。该插件提供"文件变更展示"功能，非核心，彻底修复需等待上游适配新版事件系统。备份 patch.yml、修改、YAML 校验、重启。

验证：file-changes 0 处、at-file 5 处、writing-pad 5 处、日志无报错。

boot 层至此正常：dsh 可打开，可查看历史会话，但对话功能仍不可用。

## 第六轮：events is not iterable，对话不可用

故障现象：每发送一条消息即弹出"本轮运行失败 events is not iterable UNKNOWN"，连续复现，无法对话。

本次报错位于 turn 运行时，由前端弹出。排查路径：

1. `/tmp/dsh-web.log` 中无对应错误，服务端日志正常；
2. 在 `~/.dsh/sessions/--Users-gwen-kaoyan--/` 下找到最新 session 目录，`zstd -dc` 解开 `session.v3.jsonl.zstd`，找到 turn 20 到 23 连续复现的 `turn/end` 报错 `{message: "events is not iterable", code: "UNKNOWN"}`；
3. 排查该 session 中唯一影响 turn 生命周期的组件：`@aiwayds/dsh-dcp`。检查其 `lib/index.js`、`lib/setup.js`、`lib/summarizer.js`，确认它 override 了核心 `BasicCompactionEngine.summarize(input)` 并订阅 `session/event`；
4. dcp 的 README 标注：verified against dsh 0.1.2-alpha.3。

核心版本为 0.1.5-rc.2，与 dcp 验证版本间隔三个版本。新版事件流 API 变更，dcp 的 summarize 接收的 `input.events` 不再可迭代，每轮 turn 开始即失败。

处理：禁用 `dsh-dcp`，compaction 回退核心默认的 `compaction-basic`（LLM 摘要）。boot 无报错。

此时情况已经明确：

- 升级核心的唯一目的是挂载 dcp；
- dcp 未适配该核心版本；
- 升级导致 client 模块、conversationEvents 服务与一批社区插件连锁故障。

升级未产生任何可用收益，且破坏了原有环境。唯一合理的选项为降级回 0.1.1-rc.2。确定执行回退。

## 回退

回退依据升级前的 tar 快照。步骤：

```bash
# 1. 降级核心
npm i -g @deepseek-ai/dsh@0.1.1-rc.2

# 2. 从快照恢复 profile 配置
tar -xzf ~/.dsh-upgrade-backup-20260912-143149.tar.gz -C ~/.dsh \
  profiles/web/package.json \
  profiles/web/pnpm-lock.yaml \
  profiles/web/cordis.patch.yml \
  profiles/web/cordis.yml \
  dsh-launch.sh

# 3. 重装依赖
pnpm install
```

第三步经过四轮尝试：

- 第一遍 `pnpm install` 失败。patch 记录不只写在 lockfile，还写在 `pnpm-workspace.yaml` 的 `patchedDependencies` 字段里，只恢复 lockfile 的话 install 会因为找不到 `patches/` 下的文件报错。从 tar 把 `pnpm-workspace.yaml` 也恢复了；
- 手动删掉 `node_modules/dsh-at-file`、`node_modules/dsh-file-changes` 和 `.pnpm_patches` 残留后重装，这两个包未恢复；
- 试 `pnpm install --force`，又试 `pnpm add` 手动补，`patches/` 目录再次出现；
- 最后从 tar 重新解包全部配置文件，`rm -rf node_modules patches`，完整地重新执行 `pnpm install`，得到干净状态。

回退完成后以 0.1.1-rc.2 重启：HTTP 200，旧版无 token 机制，核心与全部插件回到升级前版本（ui-appearance 0.1.6 / better-sidebar 0.15.0 / writing-pad 1.1.2 / at-file 0.6.3），dcp 移除，lockfile 与 workspace yaml 中无 patch 记录。

随后发现新问题：bundles 列表中有 `dsh-theme-atelier` 与 `dsh-ui-theme-switch`，但 node_modules 中不存在这两个目录，`rm -rf node_modules` 时被连带删除。两者不在 npm 上（`npm view` 返回 404），为 9 月 2 日手动安装，tar 快照不含 node_modules，本地无备份。

先将两者从 bundles 中临时移除以保证启动，dsh 恢复正常对话。恢复思路：theme-switch 的结构设计有记录（`exports.inject=["theme","slots"]`，循环切换主题），完整源码需从历史中查找。

## 从会话历史重建插件

重建从结构学习开始：`dsh-icon-theme` 与 `dsh-theme-whalegirl` 为两个正常运行的主题类插件，逐一检查其 `package.json`、`lib/client.js`、`lib/index.js`、`cordis.patch.yml`，确认最小可用插件所需的文件、`exports.inject` 的声明方式、设置卡片向 `settings.plugin.item` 槽位的挂载方式。

其次查找历史。dsh 的会话存储位于 `~/.dsh/sessions/`，其中 `--Users-gwen-.dsh-claudecode--` 目录下为此前导入的 Claude Code 会话，每个 session 为一份 zstd 压缩的 JSONL 事件流。编写脚本逐个解压并检索 `dsh-ui-theme-switch`，命中多个 session，其中 `import-4bf65167`（9 月 2 日的会话）出现次数最多，即创建这两个插件的原始会话。

接下来从 JSONL 中提取源码。agent 写文件通过 write 工具调用完成，事件中含 `file_path` 与 `content` 字段；同一文件可能被多次写入，需取最后一次写入的 content 作为最终版本。提取脚本经过多轮迭代达到稳定：先是字段名不匹配，继而是命中格式问题，再是同名文件分布在多个 session 中需要去重排序。最终得到完整文件清单。

`dsh-ui-theme-switch`，恢复 4 个文件：

- `package.json`
- `lib/index.js`
- `cordis.patch.yml`
- `lib/client.js`（最终版，含中文标签「浅色/深色/跟随系统」、settings 卡片、3 个 chip 按钮）

验证：`node --check` 通过，package.json 为合法 JSON，加回 bundles（`dsh-icon-theme` 之后），重启后 manifest 中出现 2 处，`/plugins/dsh-ui-theme-switch/client.js` 返回 200。

同一 session 中存在 `dsh-theme-atelier` 的全部源码。继续恢复 5 个文件：

- `package.json`
- `cordis.patch.yml`
- `lib/index.js`
- `lib/client.js`（13813 字符，含 ramp 配色引擎）
- `README.md`

bundles 顺序恢复原样：`dsh-icon-theme → dsh-theme-atelier → dsh-ui-theme-switch → dsh-theme-whalegirl`。同一套验证全部通过。

至此全部完成。最终状态：核心 0.1.1-rc.2，插件全部回到升级前版本，dcp 移除，patch 记录清零，两个手动插件从会话历史完整复原，对话正常。

## 复盘

事故根源：将尚未被插件生态适配的候选版核心当作稳定版使用。@next 频道的破坏性变更分层暴露：进程新旧不一致、client 模块移除、Cordis 服务移除、事件流 API 变更，修复一层暴露下一层。全程修复五次宣告完成，四次被新报错推翻。

几条具体教训：

1. **verified against 不等于最低版本要求。** dcp 的 package.json 声称要求核心不低于 0.1.5，README 的 verified against 写的是 0.1.2-alpha.3。挂载任何插件先看它实际验证过哪个版本，而不是它声称支持哪个版本。版本号跨了 alpha/rc 线的，先观望。
2. **一次重启窗口只上一个改动。** 核心升级和 dcp 挂载挤在同一个窗口，出事后爆炸半径翻倍，归因困难。先升核心、验证稳定、再单独挂插件，每一步都可回退可归因。
3. **manifest 层验证不等于运行时验证。** 前几轮的修复结论都只验证到 boot manifest 和静态资源 200，真正的判据是浏览器里发一句话能正常走完一个 turn。验证清单应包含"打开页面发一条消息"这一项。
4. **grep 判断插件兼容性必须排除 sourcemap。** `dsh-writing-pad` 被误判未适配，是 `.map` 文件里残留的旧源码引用造成的。要扫就扫实际的 `.js`。
5. **bundle id 不等于包名。** `dsh-writing-pad` 的 id 是 `writing-pad`。disabled 写错名字不报错、不生效，静默失败。
6. **pnpm 的 patch 记录写在两个地方。** lockfile 和 `pnpm-workspace.yaml` 的 `patchedDependencies`，回退时要一起处理。
7. **混装目录清理前先做依赖审计。** profile 的 node_modules 里混着 pnpm 管理的依赖和手动塞进去的插件，`rm -rf node_modules` 前必须对比 package.json 的 dependencies，把非 pnpm 管理的插件单独备份。
8. **会话历史是最后防线。** 两个 npm 上 404、快照里没有、本地无备份的插件，最终从 zstd 压缩的对话日志里按 write 工具调用找回。agent 写过的每个文件，日志里都留着全文。

最后记一笔：全程对 `~/.dsh` 的每次改动均先备份为 `.bak-时间戳` 并追加至 `~/.dsh/CHANGELOG.md`。该守则无法阻止事故发生，但保证了每一步可回退，这也是最终能够整体回退的原因。

## 附：环境变更守则

将上述教训整理为一份规则，放入本机 agent 的指令文件长期生效。同样的规则也适用于其他会自主修改环境的 agent（CLAUDE.md、AGENTS.md 或系统提示词均可承载）：

```markdown
# 环境变更守则（对 agent 生效，违反任何一条即停下重来）

## 动手之前
- 安装任何插件/依赖前，先查它 verified against / tested with 了哪个宿主版本。
  package.json 里的最低版本要求不代表已验证；verified against 才是事实。
  目标版本跨了 alpha/rc 线的，默认观望，等适配报告出来再动。
- 升级核心、挂载插件、修改配置，不放在同一个重启窗口。
  一次窗口只上一个改动：先升核心，验证稳定，再单独挂插件，再单独改配置。
  爆炸半径可控，归因才可控。
- 修改配置目录（~/.dsh 等）前：全量备份 + 写变更日志。
  想不出回退路径的操作，不执行。
- 有演练条件先演练：dump-config 静态检查 → 一次性测试 profile 实跑 →
  最后才动日常使用的 profile。

## 修复过程中
- 每修完一层就出现新报错，说明上一层的根因判断有误。回到排查，
  不在错误方向上继续打补丁。故障是成层的，修完一层暴露下一层，
  不代表修复方向正确。
- 同一问题连续三轮修复失败，强制停止：向用户列出选项
  （继续修复 / 回退 / 观望），不得自行硬撑。
- 验证必须到达用户可感知的最终层：页面可打开、消息可发送、
  一轮对话完整执行。配置校验通过、HTTP 200、manifest 干净，
  均不算修复完成。
- 验证清单执行完毕前，不得向用户报告"修好了"。

## 清理与善后
- rm -rf 任何目录前，先列出目录中不受包管理器管辖的内容
  （对比 package.json 依赖清单），逐个单独备份。
  混装目录中可能存在未知的手工产物。
- 会话历史与日志是最后的恢复手段，不清理、不截断。
  agent 写过的每个文件，日志中留有全文。
```

守则无法阻止错误发生，其作用是阻止错误叠加：单次失误可回退、可归因；失误连续叠加，才造成不可收拾的损失。这也是将其长期保留在 agent 指令文件中的原因。
