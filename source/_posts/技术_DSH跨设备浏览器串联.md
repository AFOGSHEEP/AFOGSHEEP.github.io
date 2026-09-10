---
title: 让 iPad 无感用上 Mac 里的 DSH：Caddy + launchd 局域网网关实录
date: 2026-09-10 14:00:00
categories:
  - 学习笔记
tags:
  - DSH
  - Caddy
  - launchd
  - HomeLab
  - Safari
  - 踩坑
---

> **一句话**：DSH 的 Web GUI 只监听 `127.0.0.1`，Safari 的跨设备接力（Handoff）同步的只是 URL，所以 iPad 上永远打不开。这篇记录我如何在不改 DSH 一行代码、不暴露公网的前提下，用 Caddy + launchd 搭出一套「Wi-Fi 白名单闸门 + HTTPS + Cookie 门禁」的局域网访问体系，以及路上踩过的全部坑。

## 背景与目标

[DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 的 Web GUI 默认只监听 `127.0.0.1:3080`。它跑在 Mac 上，Safari 的 Handoff / 标签页同步功能把页面「接力」到 iPad 时，传的只是 URL——`127.0.0.1` 在 iPad 上指向 iPad 自己，自然连不上。

目标很明确：

- iPad / iPhone 在**家里 Wi-Fi** 下无感访问 DSH（Safari 接力可用）
- **不出公网**：域名、Cloudflare Tunnel、Tailscale 全部否决
- **不改 DSH 任何代码与绑定地址**（新版 dsh 出于安全直接拒绝非回环绑定，只允许 127.0.0.1）
- 安全面最小化：只有确认过的 Wi-Fi 才开门，进门还要过令牌

## 方案选型：为什么剩下的路只有「本机反向代理」

| 方案 | 结论 |
|---|---|
| `dsh web --host 0.0.0.0` | ✗ 新版 dsh 直接拒绝——GUI 能跑 bash，暴露到局域网等于交出电脑 |
| Tailscale | ✗ 每台设备都要装客户端，国内走中继不稳 |
| Cloudflare Tunnel | ✗ 要买域名且入口在公网，被否决 |
| **Caddy 反向代理（本机）** | ✓ dsh 绑定不动，代理进程监听局域网，前面加闸门和门禁 |

架构最终长这样：

```
iPad Safari ──HTTPS──> Caddy :8443（校验门禁Cookie）
                          │
                          ▼
                  dsh web 127.0.0.1:3080（绑定从未改动）
                          ▲
:8444（纯HTTP）：只发根证书 root.crt，无其他功能

launchd 闸门（每60s + 网络切换事件）：
  当前 Wi-Fi 在白名单 → 允许 Caddy 存活
  陌生网络/公网/无Wi-Fi → bootout 整个 Caddy 作业
```

三个安全层：

1. **Wi-Fi 白名单闸门**：不在家，入口物理消失（60 秒内），全程审计日志
2. **Cookie 门禁**：不知道带令牌的门禁链接，一律 401
3. **HTTPS**：既是加密，也是解锁 Safari「安全上下文」API 的前提（后述）

## 实现

### 1. 装 Caddy

```bash
brew install caddy
```

### 2. Caddyfile（HTTPS + Cookie 门禁 + 证书分发口）

`~/.config/dsh-lan-gate/Caddyfile`：

```caddyfile
# 把 <TOKEN> 换成你自己的随机串（openssl rand -hex 16 之类）
https://your-mac.local:8443 {
	tls internal
	@gated not header Cookie *dsh_gate=<TOKEN>*
	handle /gate {
		@wrongt not query t=<TOKEN>
		respond @wrongt "Forbidden" 403
		header Set-Cookie "dsh_gate=<TOKEN>; Max-Age=31536000; Path=/; HttpOnly; SameSite=Lax"
		redir https://your-mac.local:8443/ 302
	}
	handle {
		respond @gated "请先访问一次门禁链接 /gate?t=<令牌>" 401
		reverse_proxy 127.0.0.1:3080
	}
}
# 纯HTTP辅助口：只用于向 iPad 分发根证书
http://your-mac.local:8444 {
	root * "/Users/你的用户名/Library/Application Support/Caddy/pki/authorities/local"
	handle /root.crt {
		file_server
	}
	handle {
		respond "此端口仅用于下载 root.crt" 404
	}
}
```

要点：

- `tls internal`：Caddy 自建 CA 给 `your-mac.local` 签证书，iPad 装一次根证书即可全程无警告
- `your-mac.local` 用你 Mac 的 Bonjour 名（终端 `scutil --get LocalHostName` 查看，加 `.local` 后缀），不随 DHCP 变 IP 而失效
- 门禁走 `/gate?t=<TOKEN>` 种一年期 Cookie，之后浏览器不再要任何凭据

### 3. Wi-Fi 白名单闸门（launchd）

白名单文件 `~/.config/dsh-lan-gate/allowed-ssids.txt`，一行一个 Wi-Fi 名。

闸门脚本 `gate.sh`（v2，核心逻辑）：

```zsh
#!/bin/zsh
# 白名单 Wi-Fi → bootstrap caddy 作业；非白名单 → bootout
GATE_DIR="$HOME/.config/dsh-lan-gate"
ALLOWED_FILE="$GATE_DIR/allowed-ssids.txt"
CADDY_PLIST="$HOME/Library/LaunchAgents/com.gwen.dsh-lan-caddy.plist"
GATE_LOG="$GATE_DIR/gate.log"
LABEL="com.gwen.dsh-lan-caddy"
UID_N=$(id -u)

log() { echo "$(date '+%F %T') $*" >>"$GATE_LOG"; }

SSID=$(ipconfig getsummary en0 2>/dev/null | awk -F': ' '/^ *SSID/ {print $2; exit}')
[[ -z "$SSID" ]] && SSID=$(networksetup -getairportnetwork en0 2>/dev/null | sed -E 's/.*: //')

allowed=0
[[ -n "$SSID" ]] && grep -qxF -- "$SSID" "$ALLOWED_FILE" 2>/dev/null && allowed=1

RUNNING=$(pgrep -f -- "caddy run --config $GATE_DIR/Caddyfile" 2>/dev/null)

if (( allowed )) && [[ -z "$RUNNING" ]]; then
  if launchctl bootstrap gui/${UID_N} "$CADDY_PLIST" 2>/dev/null; then
    log "START ok   ssid=$SSID (launchd)"
  else
    launchctl kickstart gui/${UID_N}/${LABEL} 2>/dev/null && log "START ok   ssid=$SSID (kickstart)" || log "START FAIL ssid=$SSID"
  fi
elif (( ! allowed )) && [[ -n "$RUNNING" ]]; then
  launchctl bootout gui/${UID_N}/${LABEL} 2>>"$GATE_LOG"
  log "STOP ok    ssid=${SSID:-none} (bootout)"
fi
exit 0
```

**关键设计：Caddy 必须是独立的 launchd 作业**（`com.gwen.dsh-lan-caddy`，`RunAtLoad` + `KeepAlive`），闸门只负责 `bootstrap` / `bootout`，绝不亲自 spawn——原因见踩坑第 3 条。

Caddy 作业 `~/Library/LaunchAgents/com.gwen.dsh-lan-caddy.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.gwen.dsh-lan-caddy</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/caddy</string>
        <string>run</string>
        <string>--config</string>
        <string>/Users/你的用户名/.config/dsh-lan-gate/Caddyfile</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>/Users/你的用户名/.config/dsh-lan-gate/caddy.log</string>
    <key>StandardErrorPath</key><string>/Users/你的用户名/.config/dsh-lan-gate/caddy.log</string>
</dict>
</plist>
```

闸门作业 `~/Library/LaunchAgents/com.gwen.dsh-lan-gate.plist`：同样格式，程序为 `/bin/zsh gate.sh路径`，加 `RunAtLoad` + `StartInterval 60` + `WatchPaths`（指向 `/Library/Preferences/SystemConfiguration/NetworkInterfaces.plist` 和 `preferences.plist`，网络切换即刻触发）。

### 4. 让 DSH 的围栏认识这个域名

dsh 的 `/api` 有「浏览器信任围栏」：Host 必须是回环，或在 `--trusted-host` 白名单里。启动命令加上（绑定地址不动）：

```bash
nohup dsh web --no-open --host 127.0.0.1 --trusted-host your-mac.local --trusted-host 192.168.3.137 &
```

注意这是**两层围栏**：路由层吃 `--trusted-host` 白名单；但 `PRIVILEGED_METHODS`（选目录 `host.pickDirectory`、打开路径 `host.openPath`、`settings.*`、`credentials.*` 等）在源码里硬编码为**永远只认本机回环**——这是 DSH 作者的安全设计，白名单也放不开。所以 iPad 上点「选择 Mac 文件夹」报 403 是预期行为，这类操作回 Mac 上做。

### 5. iPad 一次性设置（3 分钟）

1. Safari 开 `http://your-mac.local:8444/root.crt` → 允许下载 → 设置 → 通用 → VPN与设备管理 → 安装
2. 设置 → 通用 → 关于本机 → **证书信任设置** → 打开 Caddy 根证书的完全信任（最容易漏的一步）
3. Safari 开 `https://your-mac.local:8443/gate?t=<TOKEN>` → 自动跳进 DSH，Cookie 一年有效
4. 分享菜单 → 添加到主屏幕

之后：Safari 接力 / 标签页同步传过来的 URL 在任何苹果设备上都能直接打开，回家连上 Wi-Fi 即用。

## 踩坑实录（这部分最值钱）

### 坑 1：`crypto.randomUUID is not a function`

纯 HTTP 不算「安全上下文」，iPad Safari 对非 HTTPS 页面禁用一批 Web API。症状是选文件夹直接弹 JS 报错。解法只有一个：上 HTTPS。这也是整个方案从「HTTP + Basic Auth」进化到「内部 CA + Cookie 门禁」的直接原因。

### 坑 2：iOS Safari 的 Basic Auth 反复弹登录框

HTTP Basic Auth 的凭据缓存，iOS Safari 出了名地不可靠——新标签页、新连接动不动就重新要密码。换成「门禁链接种 Cookie」后一年免登录。

### 坑 3：`nohup` + `disown` 骗不过 launchd（本次最大翻车）

最初让闸门脚本用 `nohup caddy ... & disown` 直接拉起 Caddy。结果 Caddy 每次活 **2 秒**就被 SIGTERM——`nohup` 只挡 SIGHUP，`disown` 只从 shell 任务表移除，**进程仍在 launchd 作业的进程组里**，脚本一退出，launchd 向整个进程组发 SIGTERM，常驻进程当场陪葬。更糟的是闸门作业随后停止触发，死了没人拉，iPad 直接「无法连接服务器」。

**教训：launchd 作业脚本里 spawn 的任何常驻进程，必须独立成自己的 launchd 作业（KeepAlive 兜底），父脚本只做 `bootstrap`/`bootout`。** 真正脱离进程组要用 `setsid`，而 macOS 根本没有这个命令——launchd 作业化才是 macOS 上的正解。

### 坑 4：Caddy v2 的 `redir / 302` 不生效

`redir / 302` 会被解析成「路径匹配 `/` 才重定向」，写在 `/gate` 的 handle 块里等于没写。要写完整目标：`redir https://your-mac.local:8443/ 302`。

### 坑 5：DSH 的两层围栏

只加 `--trusted-host` 重启后，普通 API 全通，但「选择文件夹」依旧 403——读源码才发现 `PRIVILEGED_METHODS` 硬编码 `isTrustedApiRequest(request, [])`，永远只认回环。理解并尊重它：这些方法会弹 Mac 原生对话框、能动设置和凭据，远程放行等于把主机交出去。**别去改编译产物硬撬**——升级即炸，还拆了别人的安全机制。

### 坑 6：别碰 dsh web 的绑定地址

我一开始试图 `--host 0.0.0.0`，新版 dsh 直接拒绝（设计上防止把 RCE 暴露到局域网）。整个方案的立足点因此变成：**dsh 一行参数都不改绑定，隧道在外面包**。事后看这是最正确的约束。

## 最终形态

- iPad 点主屏幕图标 → HTTPS → Cookie 门禁 → DSH，全程无感
- Safari 接力 / 标签页同步的 URL 在家里任何苹果设备上即点即开
- Mac 睡眠、出门、陌生 Wi-Fi：入口自动消失，回家自动恢复，`gate.log` 全程审计
- DSH 本体：绑定 127.0.0.1，零改动

已知取舍：出门用不了；Mac 合盖即断；文件夹级操作（DSH 特权方法）只认 Mac 本机。安卓端因为系统不支持 `.local` 解析，要用 IP + 独立证书，暂时没做。

## 安全模型一句话

**入口只存在于你确认过的 Wi-Fi 里，进门要令牌，路上有加密，钥匙串在 launchd 手里自动管理——而 DSH 本体从头到尾只信你 Mac 的回环。**
