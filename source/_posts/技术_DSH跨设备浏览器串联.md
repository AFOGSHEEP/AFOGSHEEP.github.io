---
title: 让 iPhone 和 iPad 访问 Mac 上的 DSH：Caddy 反向代理 + launchd 闸门
date: 2026-09-10 14:00:00
cover: /images/dsh-lan-gate-cover.jpg
categories:
  - 学习笔记
tags:
  - DSH
  - Caddy
  - launchd
  - HomeLab
  - Safari
---

## 问题

DSH 的 Web GUI 只监听 `127.0.0.1:3080`。在 Mac 上用 Safari 的接力（Handoff）把这个页面递到 iPhone 或 iPad 时，传的只是 URL，`127.0.0.1` 在手机上指向手机自己，页面打不开。

目标是在不改动 DSH 的前提下，让家里的 iPhone 和 iPad 能直接访问。约束有三个：

1. dsh 的绑定地址不动。新版 dsh 直接拒绝 `--host 0.0.0.0` 这类非回环绑定：GUI 能执行 bash，暴露到局域网风险不可控。
2. 不出公网。域名、Cloudflare Tunnel、Tailscale 都不用。
3. 入口可控。只有白名单里的 Wi-Fi 才对外提供服务。

## 方案

在 Mac 本机跑 Caddy 做反向代理，前面加一道基于 Wi-Fi 白名单的闸门，由 launchd 管理启停。

```
iPhone / iPad Safari ──HTTPS──> Caddy :8443（校验门禁Cookie）
                                   │
                                   ▼
                           dsh web 127.0.0.1:3080（绑定未改动）

:8444（纯HTTP）：只用于分发根证书 root.crt

launchd 闸门（每60秒 + 网络切换事件）：
  当前 Wi-Fi 在白名单 → 保持 Caddy 运行
  陌生网络 / 公网 / 无Wi-Fi → 卸载 Caddy 作业
```

三层控制：

- 闸门：当前 Wi-Fi 不在白名单，一分钟内卸载 Caddy 作业
- 门禁：访问者先通过带令牌的链接换取一年期 Cookie
- HTTPS：Caddy 内部 CA 签发证书，同时满足 iOS 对安全上下文的要求

## 配置

### 安装 Caddy

```bash
brew install caddy
```

### Caddyfile

文件放在 `~/.config/dsh-lan-gate/`：

```caddyfile
# 把 <TOKEN> 换成自己的随机串（openssl rand -hex 16 之类）
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
# 纯HTTP辅助口：只用于分发根证书
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

说明：

- `your-mac.local` 是 Mac 的 Bonjour 名（`scutil --get LocalHostName` 查询），不随 DHCP 分配的 IP 变化
- `tls internal` 由 Caddy 自建 CA 签发证书，手机端安装根证书后不再有证书警告
- `/gate?t=<TOKEN>` 设置一年期 Cookie，之后的请求直接放行

### Wi-Fi 白名单闸门

白名单文件 `~/.config/dsh-lan-gate/allowed-ssids.txt`，一行一个 Wi-Fi 名称。

```zsh
#!/bin/zsh
# gate.sh — 白名单 Wi-Fi → bootstrap caddy 作业；非白名单 → bootout
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

Caddy 用独立的 launchd 作业承载（`RunAtLoad` + `KeepAlive`），闸门只做 `bootstrap` / `bootout`，不在脚本里直接拉起进程，原因见「遇到的问题」第 3 条。

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

闸门自己的 plist 同样格式，程序为 `/bin/zsh <gate.sh 路径>`，加 `StartInterval 60` 和两个 `WatchPaths`（指向 `/Library/Preferences/SystemConfiguration/` 下的网络配置文件），网络切换时立即执行。

### dsh 启动参数

```bash
nohup dsh web --no-open --host 127.0.0.1 --trusted-host your-mac.local --trusted-host 192.168.3.137 &
```

dsh 的 `/api` 有两层访问控制。外层是路由级信任名单，由 `--trusted-host` 控制；内层是一组特权方法（`host.pickDirectory`、`host.openPath`、`settings.*`、`credentials.*`），源码中固定为只接受本机回环请求，`--trusted-host` 对其无效。因此手机上「选择文件夹」返回 403 是预期行为，这类操作在 Mac 本机执行。

### 手机端设置

iPhone 和 iPad 步骤相同，每台设备做一次：

1. Safari 打开 `http://your-mac.local:8444/root.crt`，下载描述文件，在 设置 → 通用 → VPN与设备管理 中安装
2. 设置 → 通用 → 关于本机 → 证书信任设置，开启该证书的完全信任
3. Safari 打开 `https://your-mac.local:8443/gate?t=<TOKEN>`，自动设置 Cookie 并进入 DSH
4. 分享菜单 → 添加到主屏幕

使用接力的前提：所有设备登录同一 Apple ID，并在 设置 → 通用 → 隔空播放与接力 中开启接力。不满足时可用 iCloud 标签页同步代替。

## 遇到的问题

### 1. 选文件夹报 `crypto.randomUUID is not a function`

现象：通过 HTTP 访问时，iPhone 上点击「选择文件夹」直接报错。
原因：非 HTTPS 页面不属于安全上下文，iOS Safari 禁用部分 Web API。
解决：整体改用 HTTPS，证书由 Caddy 内部 CA 签发。

### 2. HTTP Basic Auth 反复弹出登录框

现象：iOS Safari 不断要求输入用户名密码。
原因：iOS Safari 对 Basic Auth 凭据的缓存不可靠，新标签页或新连接都会重新认证。
解决：改用门禁链接设置一年期 Cookie，之后不再出现认证提示。

### 3. Caddy 进程启动两秒后被杀

现象：`gate.sh` 用 `nohup caddy ... & disown` 拉起 Caddy，进程只存活约两秒。caddy.log 中前一行是 `serving initial configuration`，下一行是 `shutting down apps, then terminating, signal: SIGTERM`。
原因：`nohup` 只忽略 SIGHUP，`disown` 只把进程从 shell 任务表移除，进程仍在该 launchd 作业的进程组内；脚本退出时，launchd 向整个进程组发送 SIGTERM。另外闸门作业自身停止触发后，Caddy 死亡后无人重启，iPad 端表现为无法建立连接。
解决：Caddy 独立为 launchd 作业（`RunAtLoad` + `KeepAlive`，崩溃自动重启），闸门只做 `bootstrap` / `bootout`。macOS 没有 `setsid` 命令，launchd 作业化是标准做法。修改后观察 70 秒以上，闸门连续两轮调度，Caddy 均存活。

### 4. `redir / 302` 不生效

现象：写在 `/gate` 的 `handle` 块内，重定向不触发，返回 200。
原因：这种写法把 `/` 解析为路径匹配条件，而不是重定向目标。
解决：写完整目标 `redir https://your-mac.local:8443/ 302`。

### 5. `host.pickDirectory` 返回 403

现象：手机端选择 Mac 文件夹时返回 403，其余功能正常。
原因：特权方法在源码中固定为只接受回环请求，`--trusted-host` 不影响它。
解决：不处理。这是 dsh 的安全设计，相关操作在 Mac 本机完成。

### 6. `--host 0.0.0.0` 无法启动

现象：dsh 直接拒绝启动。
原因：新版本出于安全考虑只允许回环绑定。
解决：维持 `127.0.0.1` 绑定，由外部反向代理提供局域网访问。这也是整个方案的前提。

## 结果与限制

最终效果，Safari 标题栏是门禁域名而不是 `127.0.0.1`，Cookie 放行后直接进入会话：

![通过门禁域名访问 DSH 的最终效果](/images/dsh-lan-gate-result.png)

生效后的状态：

- 家里 Wi-Fi 下，iPhone/iPad 从主屏幕图标直接进入 DSH，无证书警告、无登录框
- Mac、iPhone、iPad 之间通过接力或 iCloud 标签页同步互相打开页面
- 离开白名单 Wi-Fi 后入口在一分钟内关闭，回家自动恢复，`gate.log` 记录每次起停

限制：

- 仅限家庭网络使用
- Mac 睡眠或未登录桌面时不可用
- 特权操作（选择文件夹、修改设置、管理凭据）只能在 Mac 本机进行
- 安卓未支持：系统不解析 `.local` 域名，需要改用 IP 加独立证书，暂未实施

涉及的文件：一个 Caddyfile、一个 `gate.sh`、两个 plist，以及 dsh 启动命令中的 `--trusted-host` 参数。
