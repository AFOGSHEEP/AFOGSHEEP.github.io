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

2026-09-12 给本机的 dsh（DeepSeek Harness）核心做了一次从 0.1.1-rc.2 到 0.1.5-rc.2 的升级，目的是挂载 dsh-dcp 这个确定性上下文压缩插件。升级之后连锁触发了一串前端插件故障，最终整体回退。下面是按时间顺序记录的完整过程。

## 起因

dsh-dcp 要求核心 ≥ 0.1.5-rc.2，而本机是 0.1.1-rc.2。当天下午执行了 `npm i -g @deepseek-ai/dsh@next` 升级核心，再用 `dsh plugin --profile web add @aiwayds/dsh-dcp` 挂载插件。升级完成后没有重启正在运行的 dsh web 进程。

## 故障 1：boot manifest 报错

重启 dsh web 后，浏览器报：

```
Failed to load plugins
client-modules: boot manifest batches must be an array
```

根因是旧进程（0.1.1-rc.2）的内存态与磁盘上已被 pnpm 换成新版的 bundle 不一致。旧进程按旧逻辑读新元数据，生成的 boot manifest 格式错乱。这个报错本身通过重启就能消掉，但它暴露了更深的问题。

## 故障 2：client 模块重构

重启后新核心接管，报出新的错误：

```
failed to import loader entry (dsh-ui-appearance):
client-modules: require("@deepseek-ai/dsh-client-runtime/client") missed the module table
```

0.1.5-rc.2 重构了 client 模块系统。旧插件编译产物里 `require("@deepseek-ai/dsh-client-*/client")` 这种带 `/client` 子路径的写法在新版失效了。

排查出 5 个插件受影响：

| 插件 | 处理 |
|---|---|
| dsh-ui-appearance | 0.1.6 → 0.1.9，上游已适配 |
| dsh-better-sidebar | 0.15.0 → 0.19.1，上游已适配 |
| dsh-at-file | 0.6.3 已是最新，仍未适配 |
| dsh-writing-pad | 1.1.2，最新 1.1.3 仍未适配 |
| dsh-file-changes | github 源，未适配 |

先把能升级的两个升级，再禁用另外三个，让 dsh 先能启动。

## 故障 3：runtime 模块被整体移除

让 dsh 自己去修剩余插件，它用 pnpm patch 把 `/client` 改成了裸名，但重启后仍然报：

```
require("@deepseek-ai/dsh-client-runtime") missed the module table
```

真相是 `@deepseek-ai/dsh-client-runtime` 这个客户端模块在新版里被整体移除了，不是改名。boot manifest 里出现的同名字符串只是 inject 服务名（服务端 Cordis 依赖），不是可 require 的 seed word。可 require 的 seed word 是 `@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/dsh-client-ui-slots` 这些。

三个插件的正确迁移：

- dsh-at-file 只用 `createSnapshotStore`，这个 API 移到了 `@deepseek-ai/dsh-client-store`，把 require 目标改掉即可。
- dsh-file-changes 用 `isAppendSurfaceEvent` 和 `resolveWorkspacePath`，这两个 API 在新版没有客户端替代，把实现内联进插件（源码取自新版核心的 `dsh-session` 和 `dsh-util-workspace-path`）。
- dsh-writing-pad 升到 1.1.3 后本来就只 require primitives，之前判断它未适配是被 sourcemap 里的旧引用误导了。

这里也踩了一个坑：判断插件是否 require 旧模块，必须 grep 实际的 `.js` 文件并排除 `.map`，sourcemap 里保留着旧源码的引用，会误报。

## 故障 4：conversationEvents 服务被移除

修完 require 后，dsh-file-changes 又报：

```
web boot: 1 entry did not activate
dsh-file-changes: pending (waiting for service: conversationEvents)
```

新版还移除了 `conversationEvents` 这个 Cordis 短服务。dsh-file-changes 靠它注册对话事件定义（match/start/update/render 那套机制），新版把这套机制整体重构了，没有简单的替代。这个插件只能先禁用。

## 故障 5：dsh-dcp 不兼容

boot 终于通过了，但对话一运行就报：

```
events is not iterable
```

每轮 turn 一开始就 `turn/end`，无法对话。定位到 dsh-dcp：它的 README 标注 verified against 0.1.2-alpha.3，而核心已经是 0.1.5-rc.2。它 override 了核心的 `summarize()` 并订阅 `session/event`，与新版事件流 API 不兼容。

到这里事情的性质已经清楚了。升级核心的唯一目的是挂 dcp，但 dcp 自己不兼容这个版本；升级还连锁砸了 client 模块、conversationEvents 服务和一堆社区插件。继续在 @next 上硬撑没有意义。

## 回退

用户决定回退。步骤：

1. `npm i -g @deepseek-ai/dsh@0.1.1-rc.2` 降级核心。
2. 用升级前打的 tar 快照恢复 `package.json`、`pnpm-lock.yaml`、`cordis.patch.yml`、`pnpm-workspace.yaml`。
3. 清掉 node_modules 重装，同时清掉了 dcp、pnpm patch 和新版插件。

回退过程遇到一个坑：pnpm 的 patch 记录不只写在 lockfile，也写在 `pnpm-workspace.yaml` 的 `patchedDependencies` 字段里。只恢复 lockfile 不够，`pnpm install` 会因为找不到 `patches/` 里的 patch 文件而失败。

## 误删与恢复

清 node_modules 时误删了两个手动装的插件：`dsh-theme-atelier` 和 `dsh-ui-theme-switch`。它们不在 npm 上，tar 快照里也没有 node_modules，本地没有备份。

这两个插件的源码最后是从 dsh 的会话历史里找回来的。dsh 的 session 日志是 zstd 压缩的 JSONL 事件流，agent 写文件用的是 write 工具，`arguments` 字段里带 `file_path` 和 `content`。遍历事件流，按文件取最后一次写入的 content，就拿到了最终版源码。两个插件共 9 个文件，完整重建后加回 bundles，验证通过。

## 结论

这次事故的根源是把一个尚未被社区插件适配的候选版核心当成了稳定版使用。@next 频道的破坏性变更（client 模块重构、服务移除、事件流 API 变化）会一层层暴露出来，每修一层又冒出下一层。判断标准应该倒过来：先确认要用的插件（这里是 dcp）已经适配目标版本，再决定升级，而不是升完再回头补插件。
