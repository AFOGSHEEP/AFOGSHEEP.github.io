---
title: DSH Desktop 在 Windows 上起不来：同目录改名竟然报「跨设备」
date: 2026-10-09 01:00:00
cover: /images/dsh-exdev-cover.jpg
categories:
  - 学习笔记
tags:
  - DSH
  - Windows
  - MSIX
  - 故障排查
  - 原子写
---

朋友丢来一个 2.7 KB 的 zip，名字叫 `dsh-desktop-diagnostics.zip`，说他的 DSH Desktop 打不开了，一启动就崩，崩三次之后干脆不再自动重启。压缩包里只有两个文件：`diagnostics.json` 和 `privacy.txt`。这就是全部线索。

我把整个排查过程记下来，因为这次的坑很有意思：崩溃的直接原因是一句 `EXDEV: cross-device link not permitted`，而它出现在**同一个目录内的改名操作**上——按常理，这等于说从你家客厅走到你家客厅需要跨海大桥。

（先说结局，免得你跟着我一层层往下猜：根因最终没能定论，卡在三个并列的嫌疑上，因为当事人后来直接放弃了 DSH，不打算再配合取证。但这一路排查本身很有意思，而且暴露出一个我认为更值得说的问题。）

## 第一步：先读崩溃签名

`diagnostics.json` 里结构很简单，几行就交代了案情：

```json
{
  "status": "crashed",
  "lastError": "Harness 进程异常退出 (code 1)；已连续崩溃 3 次，停止自动重启",
  "platform": { "os": "windows", "arch": "x86_64" },
  "versions": {
    "desktop": "0.2.15",
    "distribution": "store",
    "harness": "0.1.1-rc.2",
    "node": "24.19.0",
    "sidecar": "0.2.5"
  }
}
```

日志尾部 372 行，里面**同样的顶层失败出现了 12 次**，签名完全一致：

```
Error: dsh: plugin tree failed to load:
  failed to apply loader entry include (cordis:include):
  failed to apply loader entry workspace (@deepseek-ai/dsh-workspace):
  EXDEV: cross-device link not permitted, rename
    'C:\Users\<user>\AppData\Roaming\com.yeagoo.dsh-desktop\harness\storages\.27a18e06-2bfe-4ec3-93c9-c50c971cba79.tmp'
 -> 'C:\Users\<user>\AppData\Roaming\com.yeagoo.dsh-desktop\harness\storages\workspace.json'

errno: -4037
code: 'EXDEV'
syscall: 'rename'
```

`EXDEV` 在 Windows 上对应 `ERROR_NOT_SAME_DEVICE`（系统错误码 17），语义很明确：**rename 的源和目标不在同一个卷上**。

可是你仔细看那两个路径——它们在**同一个目录里**，都在 C 盘。这不是「用户把家目录挪到 D 盘」那种经典跨盘事故，路径前缀一模一样，只是文件名不同。

## 第二步：拆开 rename 这一步的成败

这里有个容易被忽略的细节，也是整个案子的关键指纹。

崩溃连发了 12 次，每一次的 tmp 文件名都不一样（`.2c45e361…`、`.cc3e90c2…`、`.27a18e06…`）。tmp 名是 `randomUUID()` 生成的，每次都不一样说明什么？说明**每次都在该目录下成功新建了临时文件**。

也就是说，这个目录上：

| 操作 | 结果 |
|---|---|
| 在 `storages\` 里创建 `.uuid.tmp` | ✅ 成功 |
| 往里写内容、fsync 落盘 | ✅ 成功 |
| 把 `.uuid.tmp` 改名成 `workspace.json`（同目录） | ❌ EXDEV |

**允许创建，拒绝改名覆盖**。这个组合不是正常 NTFS 该有的行为，它指向文件系统层面上有一层拦截或重定向。

## 第三步：翻代码，先排除「DSH 自己把路径写错了」

跨设备错误最常见的成因确实是代码在跨盘搬运文件，所以先看代码。DSH 的原子写实现在 `@deepseek-ai/dsh-storage-json`：

```js
async function writeAtomic(path, data) {
	const tmp = join(dirname(path), `.${randomUUID()}.tmp`);
	try {
		const handle = await open(tmp, "wx", 384);
		try {
			await handle.writeFile(data, "utf8");
			await handle.sync();
		} finally {
			await handle.close();
		}
		await rename(tmp, path);
		await fsyncDirectory(dirname(path));
	} catch (error) {
		await rm(tmp, { force: true });
		throw error;
	}
}
```

`tmp` 就是 `join(dirname(path), …)` 生成的——**和目标是同一个目录，不存在任何跨盘搬运**。这个写法本身是「原子替换」的标准姿势：同目录写临时文件 + rename + fsync，保证要么看到旧内容、要么看到新内容，不会读到写了一半的文件。

所以代码没问题：在正常文件系统上，这段代码不可能报 `EXDEV`。

## 第四步：为什么一崩就死透，连抢救的机会都没有

看调用栈的走向：

```
boot()
  → cordis plugin loader: Entry._init
    → workspace 插件 (@deepseek-ai/dsh-workspace) 初始化
      → writeAtomic → rename → EXDEV 💥
```

两件事叠在一起，把「环境怪癖」升级成了「应用无法启动」：

1. **写盘发生在插件树加载期**。workspace 插件在自己的初始化阶段就要落一次自己的存储（`workspace.json`），这是启动路径上的必经之路。
2. **这个异常是致命的**。它沿着 cordis loader 一路冒泡到 `boot()`，harness 直接以 `exit code 1` 退出；桌面版重试 3 次（每次都撞同一堵墙）后停止自动重启。

结果就是：**这台机器上的 DSH Desktop 100% 起不来，用户侧没有任何自救路径**——没有降级、没有「跳过写盘继续启动」的开关，连进设置界面的机会都没有。一次存储写入失败，代价是整个应用变砖。

## 第五步：谁在拦？三个并列的嫌疑

同目录 rename 不该报跨设备，所以嫌疑锁定在文件系统过滤层。下面三个候选人，**最终没能收敛到一个**（诊断包含的信息不够，桌面侧的详细 stderr 也没抓到）：

| 嫌疑 | 支持理由 | 疑点 |
|---|---|---|
| **MSIX / 商店版 AppData 虚拟化** | 这是商店分发（`distribution: store`），而路径正好落在 `AppData\Roaming` —— MSIX 默认就对这棵树做重定向与写时复制。过滤器之下，rename 的源与目标可能被认为落在不同「设备视图」上 | 按理说虚拟化对同目录 rename 应该透明 |
| **`workspace.json` 本身是重解析点** | 如果目标文件是符号链接/占位文件，`ReplaceExisting` 语义下内核可能判定目标真身在别的卷——「新建成功、覆盖改名失败」完全自洽 | 需要实机确认该文件的重解析属性 |
| **第三方过滤驱动（杀软/EDR/同步盘）** | 同目录 rename 被拦的经典来源 | 这类拦截通常报 `EPERM`/`EACCES`，报 `EXDEV` 很反常 |

判别方法其实不难，因为「新建成功、改名失败」这个指纹本身就是最好的分水岭——下面这份脚本就是干这个的。

## 第六步：一份跑不成的取证脚本

为了把三个嫌疑收敛成一个，我整理了一份 PowerShell 取证脚本：[dsh-exdev-check.ps1](/downloads/dsh-exdev-check.ps1)。它只读为主，唯一的写操作是在 `storages` 里建一个探针文件再改名，结束会清理：

```powershell
# 1. 列 storages 内容（含隐藏文件、属性、链接目标）
Get-ChildItem -Force "$env:APPDATA\com.yeagoo.dsh-desktop\harness\storages" |
    Select-Object Name, Length, Attributes, LinkType, Target

# 2. 查重解析点（junction / symlink / 占位符）
fsutil reparsepoint query "…\storages\workspace.json"

# 3. 最小复现：同目录「新建 → 改名」
Set-Content -LiteralPath "$s\probe.tmp" -Value 'x'
Move-Item   -LiteralPath "$s\probe.tmp" -Destination "$s\probe.json"
```

脚本还顺带查了 `%LOCALAPPDATA%\Packages\<包名>\LocalCache\...` 下有没有被虚拟化出去的「真身」、`fltmc filters` 里有哪些过滤驱动、以及卷与包信息。

**分流规则本来是这样的**：

- 第 3 步**也失败** → 整个目录被系统拦截（虚拟化或过滤驱动）→ 走甲方案
- 第 3 步**成功** → 目录本身正常，问题出在 `workspace.json` 这个文件身上 → 走乙方案

**但它没跑成。** 当事人把 zip 丢给我之后就不打算再折腾了——他觉得为了一个装不上的软件去跑脚本、回传日志不值当，脚本就搁在那儿了，那份输出永远不会有了。所以这份脚本的用途只剩一个：**谁以后踩到同一个坑，拿去自己跑**，它能把上面三个嫌疑当场收敛成一个。

## 第七步：如果换成你遇到，怎么救

这两套方案对后来者仍然有效。

**乙方案（先试，代价最小，最可能一招见效）**

把 `workspace.json` 改名或删掉，顺手清掉 `storages` 里所有 `.uuid.tmp` 残留，然后重开 DSH Desktop。

理由：如果罪名是「目标文件本身特殊」，那么删掉目标之后，rename 就从「覆盖已存在的特殊文件」退化成「纯新建」——而新建这个动作已经用 12 次崩溃证明是可行的。代价是丢工作区列表（本地状态，DSH 会重建默认工作区，会话和文件都不受影响），而且改名即可回退。

**甲方案（若最小复现也失败，说明目录整体被拦）**

1. **把数据根挪出 AppData**：设用户环境变量 `DSH_HOME` 指向普通目录（如 `C:\dsh-home`）再重启桌面版。⚠️ 这里要说实话：harness 侧的路径优先级是 `调用方传入 > DSH_HOME 环境变量 > ~/.dsh`，而桌面版显然自己传了 `%APPDATA%\com.yeagoo.dsh-desktop\harness` 这个路径（否则它会用 `~\.dsh`），**所以 `DSH_HOME` 很可能被桌面版覆盖而无效**。值得一试，不行就别在这条路上纠缠。
2. **排查过滤驱动**：`fltmc filters` 里若有非微软的驱动（杀软/EDR/同步盘），给该目录加排除，或临时停掉验证。
3. **换成非商店分发**：如果有便携版/exe 版本的 DSH Desktop，直接绕开 MSIX 虚拟化这一整层。

**另外**：遇到这类问题，先在桌面版设置里打开「详细诊断」再复现。这次拿到的诊断包 `detailedDiagnostics.enabled: false`，桌面侧的 stderr 没被捕获，证据直接少了一半——如果当时开了详细诊断，说不定就不用麻烦当事人跑脚本了。

## 第八步：环境怪癖是悬案，健壮性问题是定论

根因停在三个并列嫌疑上，这个我不装懂。但有一件事不需要等根因定论就能说：**一次存储写失败就把整个应用砖掉，这个代价太不成比例了。**

1. **`writeAtomic` 遇到 `EXDEV` 应该降级**，而不是直接抛。同目录 rename 失败时退化成 `copyFile(tmp, path)` + `rm(tmp)`（失去原子性但保住可用性），Windows 上也可以用 `ReplaceFileW`。
2. **加载期的存储写入失败不应致命**。workspace 插件的存储写不进去，完全可以降级成内存态 + 一条告警，让应用先起来、让用户能进设置界面把数据挪个地方——而不是让用户对着一个「崩了三次就放弃」的窗口发愣。

原子写的正确性很重要，但可用性不该被它绑架。退一万步说，就算这个用户的环境真的有什么古怪的过滤驱动，一个成熟的桌面应用也应该能带着一条警告启动，而不是直接摆烂。

## 结语：还有一种失败叫「排查到一半，当事人不玩了」

这次的经验其实有一半不在技术上。前端报障、后端排查，最理想的是能拿到现场；可现实里用户配合到某个深度就到头了——他要的是「能用」，不是「知道为什么不能用」。他试了几次、崩了几次、丢给我一个 zip，然后就去装别的东西了。

所以记录下来的东西有三层：一层是技术推理（同目录 rename 报跨设备这个反常识指纹），一层是可以复用的取证脚本，最后一层是那个还没定论的根因。前两层对别人有用，第三层留给上游——毕竟他们手上有源码、有环境、也有动机去复现这个 MSIX 下的 corner case。

## 备查信息

| 项 | 值 |
|---|---|
| 平台 | Windows x86_64 |
| DSH Desktop | 0.2.15（`distribution: store`，MSIX 商店分发） |
| harness | 0.1.1-rc.2 |
| sidecar | 0.2.5 |
| Node | 24.19.0 |
| 数据根 | `%APPDATA%\com.yeagoo.dsh-desktop\harness` |
| 错误 | `EXDEV` / `errno: -4037` / `syscall: rename` |
| 复现率 | 12/12（每次启动必崩，新 tmp 名） |
| 取证脚本 | [dsh-exdev-check.ps1](/downloads/dsh-exdev-check.ps1)（未在当事人机器上执行） |

最小复现：在同目录里新建一个文件，再把它改名——若报「源和目标不在同一个卷」，即复现成功；此时与 DSH 代码无关。
