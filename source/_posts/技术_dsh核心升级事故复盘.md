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

9 月 12 日下午，本机的 dsh（DeepSeek Harness，跑 web GUI 的 agent 宿主，监听 127.0.0.1:3080）经历了一场五个多小时的连环故障：六轮报错、一次降级回退、一次误删插件、一次从会话历史里把源码考古挖回来。维修在 Claude Code 会话里完成。下面按事件发生的顺序完整记录，包括每一次"以为修好了"和每一次被打脸。

先给一个总览，从报修到收尾先后八个阶段：

| 阶段 | 事件 |
|---|---|
| 起因 | dsh 为挂载 dcp 插件，自己把核心从 0.1.1-rc.2 升到 0.1.5-rc.2，未重启进程，GUI 打不开 |
| 修复一 | 重启进程、修启动脚本；一分钟后被新报错推翻 |
| 修复二 | 升级 2 个插件、禁用 3 个；随后写简报交给 dsh 自修 |
| dsh 自修 | 方向正确但没重启；人工重启验证通过，几分钟后再度被推翻 |
| 修复三 | 重写三个插件的模块引用；被推翻 |
| 修复四 | 禁用 file-changes；boot 层干净了，但对话仍不可用 |
| 定位真凶 | dcp 与新版事件流 API 不兼容；建议回退，机主拍板 |
| 回退与重建 | 降级、快照恢复、依赖重装；误删的两个插件从会话历史复原 |

## 背景

dsh 的核心原本是 0.1.1-rc.2，一直稳定。当天下午，dsh 在一次对话里为了挂载 dsh-dcp（社区出的确定性上下文压缩插件，要求核心版本不低于 0.1.5），自己执行了核心升级，把全局的 `@deepseek-ai/dsh` 换成 `@next` 频道的 0.1.5-rc.2，写好 profile 的 package.json 挂上 dcp，用 pnpm 更新了 node_modules。升级完，正在跑的 web 进程没有重启。

升级前，机器上刚打过一份 `~/.dsh` 全量 tar 快照（82MB）。这份快照是后面唯一立功的预防措施。

随后机主在 Claude Code 窗口报修：dsh 又把自己搞得打不开了。

## 第一轮：进程是旧的，磁盘是新的

接到报修先看现场，几分钟内跑完这些检查：

```bash
# 版本、进程、HTTP
dsh --version          # 0.1.5-rc.2
ps aux | grep "[d]sh"  # web 进程 PID 70415，9 月 11 日启动的
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3080   # 200

# 配置树
dsh --profile web --dump-config   # exit=0，配置本身没坏

# profile 现状
cat ~/.dsh/profiles/web/package.json
tail -60 ~/.dsh/CHANGELOG.md
```

关键观察有三个：

1. 磁盘上的核心已经是 0.1.5-rc.2，但跑着的进程是 9 月 11 日启动的，内存里还是 0.1.1 的代码。
2. `curl` 返回 200，HTTP 层活着，但浏览器白屏。
3. 浏览器端的报错是 `boot manifest batches must be an array`。

对上之后根因就清楚了：旧进程按旧逻辑去读已被 pnpm 换成新版的 bundle 元数据，拼出来的 boot manifest 格式错乱，前端解析直接炸掉，插件全挂。`curl` 探测的是 HTTP 层，看不到前端 JS 的死活，所以 200 是个假象。

会话数据是 JSONL 持久化在 `~/.dsh/sessions` 的，杀进程不丢数据。机主让 Claude Code 接手，执行：

```bash
pkill -f "dsh web"; sleep 1
nohup dsh web --no-open --host 127.0.0.1 \
  --trusted-host gwendemacbook-air.local --trusted-host 192.168.3.137 \
  >/tmp/dsh-web.log 2>&1 &
```

起来之后逐项验证：HTTP 200、manifest 里 `batches` 是数组、`client.js` 和 `index.js` 静态资源都 200。到这里第一层的病根确实除掉了。

顺手发现一个新问题：0.1.5 加了 auth token 机制，首次访问要走 `/?token=xxx` 登录、种 30 天 cookie。而 `~/.dsh/dsh-launch.sh` 里那句 `open 127.0.0.1:3080` 会直接吃 401。按本机守则先备份成 `.bak-20260912-*`，再把 `dsh-launch.sh` 改成从 `/tmp/dsh-web.log` 里解析 token URL 后打开。

第一轮修复宣告完成。一分钟后，机主把新的报错贴了过来。

## 第二轮：/client 子路径失效

报错长这样：

```
Failed to load plugins
failed to import loader entry f8bfe431 (dsh-ui-appearance):
client-modules: require("@deepseek-ai/dsh-client-runtime/client")
missed the module table — not a platform seed word, not a materialized
module, and no registered package factory
```

这次不是进程问题了，是 0.1.5-rc.2 重构了 client 模块系统：旧插件编译产物里 `require("@deepseek-ai/dsh-client-runtime/client")` 这种带 `/client` 子路径（无 `.js`）的写法全部失效。

排查做了四件事：

- 列出 `node_modules` 里所有 `@deepseek-ai` 包，确认 `dsh-client-runtime` 包本体还在不在、长什么样；
- 扫全部插件目录（`dsh-*`、`@aiwayds/*`、`@baconbao/*`、`@liustack/*`）的 require 语句，按三种形式分类：带 `/client"` 的（会崩）、裸名、`/client.js`（两种都兼容）；
- `npm pack` 拉了 `dsh-ui-appearance@0.1.9`、`dsh-better-sidebar@0.19.1`、`dsh-at-file@0.6.3`、`dsh-writing-pad@1.1.3` 四个最新包解开对照，看上游适配了没有；
- 解析首页 HTML 里的 boot manifest，确认新版认可的模块名实际是什么形式。

结论是五个插件受影响：

| 插件 | 当前 → 最新 | 上游状态 |
|---|---|---|
| dsh-ui-appearance | 0.1.6 → 0.1.9 | 当天凌晨刚发版，已适配 |
| dsh-better-sidebar | 0.15.0 → 0.19.1 | 已适配 |
| dsh-at-file | 0.6.3（已是最新） | 未适配 |
| dsh-writing-pad | 1.1.2 → 1.1.3 | 未适配（后来证明这个判断是错的） |
| dsh-file-changes | github 源 | 未适配 |

摆在面前的有两个方案：A，降级回 0.1.1-rc.2，一条命令全恢复，放弃 dcp（推荐这个）；B，硬撑 @next，升两个能升的，禁三个不能升的保住启动，后面再补。机主选了 B，原话是"升级，然后我再让 dsh 来把剩下的升级了，你要把这些内容记录下来方便后续的改动"。

执行：

```bash
pnpm add dsh-ui-appearance@^0.1.9 dsh-better-sidebar@^0.19.1
```

然后在 `cordis.patch.yml` 里禁用另外三个。这一步内部先摔了一跤：disabled 条目写的是包名（`dsh-writing-pad`、`dsh-file-changes`），重启后 manifest 里这三个插件还在，禁用静默失效。原因是 bundle id 不等于包名：`dsh-writing-pad` 的 id 是 `writing-pad`，`dsh-file-changes` 的 id 是 `file-changes`，都没有 `dsh-` 前缀。用 `dsh --profile web --dump-config` 核对真实 id 后改写一遍，再重启，三个插件在 manifest 里清零。

验证输出：禁用的三个出现 0 次，升级的两个和 `dsh-client-store` seed 都在，旧 `/client` 引用残留 0。

第二轮修复宣告完成。这次的验证只做到了 manifest 层，没做浏览器实测，这个隐患后面会反复出现。

## 简报与 dsh 自修

机主要一份总结发给 dsh，让它自己修剩下三个插件。简报里写清了四件事：

1. 改法：把 `require("@deepseek-ai/dsh-client-runtime/client")` 的 `/client` 后缀去掉；
2. bundle id 坑：重新启用时 disabled 必须写 bundle id 而不是包名，写错不报错但不生效；
3. 直接改 node_modules 会被 pnpm 重装覆盖，要用 `pnpm patch` 固化；`dsh-file-changes` 是 `github:mixin-ai/dsh-file-changes` 的 git 依赖，patch 或 fork 二选一；
4. 完成后的重启与验证命令。

dsh 拿着简报去干活了。十几分钟后，机主回来说：这傻逼又把自己修坏了。

## 第三轮：dsh 修对了，但没重启

查现场，还原 dsh 干的四件事：

1. `pnpm patch` 了 `dsh-at-file` 和 `dsh-file-changes`，把 `/client` 改成裸名，patch 文件内容本身是对的；
2. `dsh-writing-pad` 升到 1.1.3，这个版本的 dist 里实际代码本来就是合规写法（此前"未适配"的判断是被它 sourcemap 里残留的旧引用误导的，这里要给它平反）；
3. 删掉了三个 disabled 条目；
4. 顺手建了个 `.dsh-module-fallback/` 目录塞了一堆 mermaid 依赖，在修 mermaid 插件的依赖解析，算支线任务。

方向全对，唯一的问题是改完没重启，机主看到的还是旧进程的旧状态。

重启后验证：manifest 里三个插件各 5 处（已加载）、旧 `/client` 残留 0、全量扫描所有插件的实际 JS（排除 `.map`）无任何旧子路径。这次也把验证的边界说清了：boot manifest 层能确认，浏览器端的实际报错需要人工反馈。几分钟后，机主把错误贴了回来。

## 第四轮：runtime 模块不是改名，是整个没了

报错变成了：

```
failed to import loader entry 62d6fc81 (dsh-file-changes):
client-modules: require("@deepseek-ai/dsh-client-runtime")
missed the module table — not a platform seed word, not a materialized
module, and no registered package factory
```

裸名也 miss。这一轮挖得最深，前后四十来分钟。

第一步先搞清楚一个矛盾：首页 HTML 的 manifest 里明明有 6 处 `@deepseek-ai/dsh-client-runtime` 字符串，为什么 require 不到？逐条看上下文，这 6 处全部出现在各插件的 inject 声明里，那是服务端 Cordis 的服务名，不是浏览器端可 require 的模块。可 require 的 seed word 是 `@deepseek-ai/dsh-client-store`、`dsh-client-ui-primitives`、`dsh-client-ui-slots` 这一批。结论：`dsh-client-runtime` 这个客户端模块在 0.1.5-rc.2 里被整体移除了，不是改名。dsh 那个"去掉 `/client` 后缀"的浅层替换从方向上就注定无效。

第二步逐个插件看它到底用了 runtime 的什么 API，直接读源码：

- `dsh-at-file/lib/client.js`：只用了 `createSnapshotStore`。查新版核心，这个 API 挪进了 `dsh-client-store`。改 require 目标就行。
- `dsh-file-changes/lib/client.js`：用了 `isAppendSurfaceEvent` 和 `resolveWorkspacePath`，新版没有客户端侧的替代。解法是把这两个函数的实现从新版核心源码里抄出来，内联进插件。
- `dsh-writing-pad`：1.1.3 本来就只 require `ui-primitives`，不用动。

其中内联的两个函数，分别在核心的 `dsh-session/lib/index.js`（`isAppendSurfaceEvent`，含 `SURFACE_EVENT_TYPES` 判断）和 `dsh-util-workspace-path/lib/index.js`（`resolveWorkspacePath`，含 Windows 风格路径分支）里找到了实现，逐行读完确认语义后搬进插件。

修法上先用直接改 node_modules 的方式快速验证方向，重启确认能加载后，再用 `pnpm patch` 把改动固化下来（否则下次 `pnpm install` 就被冲掉）：

```bash
pnpm patch dsh-at-file@0.6.3
# 生成 node_modules/.pnpm_patches/dsh-at-file@0.6.3/ 临时目录
# 在临时目录里改 lib/client.js
pnpm patch-commit node_modules/.pnpm_patches/dsh-at-file@0.6.3
```

中间清了一次 `.pnpm_patches` 的残留状态（里面有上次 dsh 操作留下的 `state.json`）。`dsh-file-changes` 是 github tarball 源，流程一样，只是临时目录名是一整串 codeload URL，在临时目录里完成 `isAppendSurfaceEvent` 和 `resolveWorkspacePath` 的内联后再 patch-commit。

重启，最终验证：三个插件各 5 处、旧 `/client` 残留 0、裸名 runtime 残留 0、日志无报错。

第四轮修复宣告完成。

## 第五轮：conversationEvents 服务也没了

还没来得及松口气，报错换了方向：

```
Failed to load plugins
web boot: 1 entry did not activate
dsh-file-changes: pending (waiting for service: conversationEvents)
```

require 层全修完了，这回轮到服务层。`dsh-file-changes` 的 `exports.inject` 声明了 `conversationEvents` 这个 Cordis 短服务，插件靠 `ctx.conversationEvents.register(fileChangesDefinition)` 注册文件变更事件的定义。翻它的源码：`fileChangesDefinition` 在 113 行，`kind: "fileChanges"`，带 `match/start/update/render` 一套生命周期钩子，344 行处调 register。0.1.5-rc.2 把这套事件系统整体重构了，短服务没了，插件永远卡在 pending。

做了个对照确认波及范围：`dsh-at-file` 的 inject 是 `["inputTriggers", "sessions", "connection", "remote", "slots", "locale"]`，`dsh-writing-pad` 是 `["slots", "layout", "remote", "locale"]`，这些服务新版都还在，所以它们能活，只有 `file-changes` 独死。

处理：再次禁用 `file-changes`。它是"文件变更展示"功能，非核心，彻底复活要等上游适配新版事件系统，不值得硬啃。备份 patch.yml、改、YAML 校验、重启。

验证：file-changes 0 处、at-file 5 处、writing-pad 5 处、日志无报错。

第五次宣告修复完成。这一轮之后 boot 层面确实干净了：dsh 能打开，能看历史会话。但离"能正常用"还差一层。

## 第六轮：events is not iterable，不能对话

boot 干净的状态没维持几分钟，机主回报：每发一句话就弹"本轮运行失败 events is not iterable UNKNOWN"，连弹三次，完全不能对话。

这次的报错不在 boot，在 turn 运行时，而且是前端弹的。排查路径：

1. `/tmp/dsh-web.log` 里没有对应错误，服务端日志是干净的；
2. 去 `~/.dsh/sessions/--Users-gwen-kaoyan--/` 找最新 session 目录，`zstd -dc` 解开 `session.v3.jsonl.zstd`，在里面找到 turn 20 到 23 连续复现的 `turn/end` 报错 `{message: "events is not iterable", code: "UNKNOWN"}`；
3. 找这个 session 里唯一一个会动 turn 生命周期的新住户：`@aiwayds/dsh-dcp`。翻它的 `lib/index.js`、`lib/setup.js`、`lib/summarizer.js`，确认它 override 了核心 `BasicCompactionEngine.summarize(input)` 并订阅 `session/event`；
4. 打开 dcp 的 README，看到那行字：verified against dsh 0.1.2-alpha.3。

而核心是 0.1.5-rc.2，中间隔了三个版本。新版事件流 API 变了，dcp 的 summarize 拿到的 `input.events` 不再可迭代，每轮 turn 一开始就炸。

处理：禁用 `dsh-dcp`，compaction 回退核心默认的 `compaction-basic`（LLM 摘要）。boot 无报错。

到这里，死局已经完全摆开：

- 升级核心的唯一目的就是挂 dcp；
- dcp 自己没适配这个核心版本；
- 升级还连锁砸了 client 模块、conversationEvents 服务和一批社区插件。

等于为了一个用不了的功能，把原本正常的环境打烂了。剩下的正确选项只有一个：降级回 0.1.1-rc.2。

机主拍板：降低吧，回退吧。

## 回退

幸好有升级前那份 tar 快照。步骤：

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

第三步比预想的啰嗦，前后折腾了四轮：

- 第一遍 `pnpm install` 失败。patch 记录不只写在 lockfile，还写在 `pnpm-workspace.yaml` 的 `patchedDependencies` 字段里，只恢复 lockfile 的话 install 会因为找不到 `patches/` 下的文件报错。从 tar 把 `pnpm-workspace.yaml` 也恢复了；
- 手动删掉 `node_modules/dsh-at-file`、`node_modules/dsh-file-changes` 和 `.pnpm_patches` 残留后重装，这两个包没回来；
- 试 `pnpm install --force`，又试 `pnpm add` 手动补，`patches/` 目录反而又冒了出来；
- 最后从 tar 重新解包全部配置文件，`rm -rf node_modules patches`，完整地再来一次 `pnpm install`，才拿到干净状态。

回退到位后用 0.1.1-rc.2 重启：HTTP 200，旧版无 token 机制，核心和全部插件回到升级前版本（ui-appearance 0.1.6 / better-sidebar 0.15.0 / writing-pad 1.1.2 / at-file 0.6.3），dcp 移除，lockfile 和 workspace yaml 里都没有 patch 记录。

然后发现新问题：bundles 列表里写着 `dsh-theme-atelier` 和 `dsh-ui-theme-switch`，但 node_modules 里没有这两个目录。`rm -rf node_modules` 的时候把它们连带删掉了。这两个不在 npm 上（`npm view` 直接 404），是 9 月 2 日手动装进 node_modules 的，tar 快照不含 node_modules，本地零备份。

先把它们从 bundles 里临时移除，不阻断启动，dsh 恢复正常对话。随后向机主说明误删情况。恢复思路是：theme-switch 的结构设计有记录（`exports.inject=["theme","slots"]`，循环切主题），完整源码则要去历史里找。

## 考古重建

机主说：来吧，你来重建。

先读现役插件学结构。`dsh-icon-theme` 和 `dsh-theme-whalegirl` 是两个能正常跑的主题类插件，把它们的 `package.json`、`lib/client.js`、`lib/index.js`、`cordis.patch.yml` 逐个过了一遍，确认一个最小可用的插件需要哪些文件、`exports.inject` 怎么声明、设置卡片怎么往 `settings.plugin.item` 槽位上挂。

然后找历史。dsh 的会话存储在 `~/.dsh/sessions/`，其中 `--Users-gwen-.dsh-claudecode--` 目录下躺着此前导入的 Claude Code 会话，每个 session 一个 zstd 压缩的 JSONL 事件流。写脚本逐个解压、grep `dsh-ui-theme-switch`，命中多个 session，其中 `import-4bf65167`（9 月 2 日的会话）出现次数遥遥领先，那正是当年创建这两个插件的现场。

接下来是从 JSONL 里把源码抠出来。agent 写文件走的是 write 工具调用，事件里有 `file_path` 和 `content` 字段，同一个文件可能被写过多次，要取最后一次写入的 content 才是最终版。提取脚本前后迭代了十来个版本才稳定：先是字段名对不上，然后是命中格式不对，再是同名文件在多个 session 里都有、要去重排序。最终拿到了完整文件清单。

`dsh-ui-theme-switch`，恢复 4 个文件：

- `package.json`
- `lib/index.js`
- `cordis.patch.yml`
- `lib/client.js`（最终版，含中文标签「浅色/深色/跟随系统」、settings 卡片、3 个 chip 按钮）

验证：`node --check` 通过，package.json 是合法 JSON，加回 bundles（`dsh-icon-theme` 之后），重启后 manifest 里出现 2 处，`/plugins/dsh-ui-theme-switch/client.js` 返回 200。

同一个 session 里还躺着 `dsh-theme-atelier` 的全部源码。机主说继续。恢复 5 个文件：

- `package.json`
- `cordis.patch.yml`
- `lib/index.js`
- `lib/client.js`（13813 字符，含 ramp 配色引擎）
- `README.md`

bundles 顺序恢复为原样：`dsh-icon-theme → dsh-theme-atelier → dsh-ui-theme-switch → dsh-theme-whalegirl`。同样一套验证全部通过。

至此全部完成。最终状态：核心 0.1.1-rc.2，插件全部回到升级前版本，dcp 移除，patch 记录清零，两个手动插件从会话历史完整复原，对话正常。

## 复盘

这次事故的根源，是把一个尚未被插件生态适配的候选版核心当成了稳定版来用。@next 频道的破坏性变更是成层的：进程新旧不一致、client 模块移除、Cordis 服务移除、事件流 API 变化，一层修完露出下一层，五个多小时里"修好了"宣告了五次，四次被新的报错在几分钟内推翻。

几条具体教训：

1. **verified against 不等于最低版本要求。** dcp 的 package.json 声称要求核心不低于 0.1.5，README 的 verified against 写的是 0.1.2-alpha.3。挂任何插件先看它实际验证过哪个版本，而不是它声称支持哪个版本。版本号跨了 alpha/rc 线的，先观望。
2. **一次重启窗口只上一个改动。** 这次核心升级和 dcp 挂载挤在同一个窗口，出事后爆炸半径翻倍，归因困难。先升核心、验稳、再单独挂插件，每一步都可回退可归因。
3. **manifest 层验证不等于运行时验证。** 前几轮的"修好了"都只验证到 boot manifest 和静态资源 200，真正的判据是浏览器里发一句话能正常走完一个 turn。后来的验证清单里加上了"打开页面发一条消息"这一项。
4. **grep 判断插件兼容性必须排除 sourcemap。** `dsh-writing-pad` 被误判未适配，就是 `.map` 文件里残留的旧源码引用造成的。要扫就扫实际的 `.js`。
5. **bundle id 不等于包名。** `dsh-writing-pad` 的 id 是 `writing-pad`。disabled 写错名字不报错、不生效，静默失败。
6. **pnpm 的 patch 记录写在两个地方。** lockfile 和 `pnpm-workspace.yaml` 的 `patchedDependencies`，回退时要一起处理。
7. **混装目录清理前先做依赖审计。** profile 的 node_modules 里混着 pnpm 管理的依赖和手动塞进去的插件，`rm -rf node_modules` 前必须对比 package.json 的 dependencies，把非 pnpm 管理的插件单独备份。
8. **会话历史是最后防线。** 两个 npm 上 404、快照里没有、本地零备份的插件，最后是从 zstd 压缩的对话日志里按 write 工具调用挖回来的。agent 写过的每个文件，日志里都留着全文。

最后记一笔：全程对 `~/.dsh` 的每次改动都先备份成 `.bak-时间戳` 并追加进 `~/.dsh/CHANGELOG.md`，这条守则五个多小时里没有破过一次例。它不能阻止事故发生，但保证了每一步都可回退，这也是最后能整体退回升级前状态的原因。

## 附：环境变更守则

复盘的最后，把上面的教训收拢成一份规则，放进 agent 的指令文件里长期生效。如果读者手里也有会自己改环境的 agent，可以直接放进它的 CLAUDE.md、AGENTS.md 或系统提示词：

```markdown
# 环境变更守则（对 agent 生效，违反任何一条即停下重来）

## 动手之前
- 装任何插件/依赖前，先查它 verified against / tested with 了哪个宿主版本。
  package.json 里的最低版本要求不算数，那是愿望；verified against 才是事实。
  目标版本跨了 alpha/rc 线的，默认观望，等适配报告出来再说。
- 升级核心、挂载插件、改配置，永远不要挤在同一个重启窗口里。
  一次窗口只上一个改动：先升核心，验稳，再单独挂插件，再单独改配置。
  爆炸半径可控，归因才可控。
- 动配置目录（~/.dsh 等）前：全量备份 + 写变更日志。
  想不出回退路径的操作，不做。
- 有演练条件就先演练：dump-config 静态检查 → 一次性测试 profile 实跑 →
  最后才碰日常在用的 profile。自己住的地方不是试验田。

## 修复过程中
- 每修完一层就冒出新报错，说明上一层的根因判断是错的。回到排查，
  不要在错误的方向上继续打补丁。地雷是成层的，越挖越深不代表越挖越对。
- 同一个问题连续三轮修复失败，强制熔断：停下，向用户摆出选项
  （继续修 / 回退 / 放着观望），不要自作主张硬撑。
- 验证必须到达用户可感知的最终层：页面打得开、消息发得出去、
  一轮对话完整跑完。配置校验通过、HTTP 200、manifest 干净，都不算修好。
- 验证清单走完之前，禁止对用户说"修好了"。

## 清理与善后
- rm -rf 任何目录前，先列出目录里不受包管理器管辖的东西
  （对比 package.json 的依赖清单），逐个单独备份。
  混装目录里永远有你不知道的手工产物。
- 会话历史和日志是最后的恢复防线，永远不清理、不截断。
  你今天写下的每个文件，日志里都留着全文。
```

守则防不住错误本身，agent 该犯的错还是会犯。它防的是错误叠加：单次失误可回退、可归因，只有一串失误连锁起来，才会把一个下午和一整套环境一起烧掉。警钟长鸣，鸣的不是"不要摔倒"，而是摔倒之后先停一下，别立刻用更大的动作去掩盖上一次。
