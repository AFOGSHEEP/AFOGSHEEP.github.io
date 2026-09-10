---
title: 让 iPhone 和 iPad 无感用上 Mac 里的 DSH：Caddy + launchd 局域网网关实录
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

我想做的事很小：在 Mac 上用 DSH 写到一半，拿起 iPhone 或 iPad，用 Safari 把这个对话接着看下去。Safari 的接力（Handoff）确实把 URL 递过来了，但打开的是 `127.0.0.1`，那在手机上指向的是手机自己。

DSH 的 Web GUI 只监听 `127.0.0.1:3080`，这件事一开始我并没当回事，甚至试过直接 `--host 0.0.0.0`，被新版 dsh 一口回绝。现在回头看这是好事：这个 GUI 能跑 bash，绑到局域网等于把电脑交出去。域名、Cloudflare Tunnel、Tailscale 也全被我否了：不想为家里内网买个域名放公网，也不想每台设备装客户端。

剩下的路只有一条：在 Mac 本机架一个反向代理，dsh 的绑定一个字节不动，隧道包在外面。而代理的入口，必须由一道闸门管着，只有我确认过的 Wi-Fi 才开门。

```
iPhone / iPad Safari ──HTTPS──> Caddy :8443（校验门禁Cookie）
                                   │
                                   ▼
                           dsh web 127.0.0.1:3080（绑定从未改动）

:8444（纯HTTP）：只发根证书 root.crt

launchd 闸门（每60秒 + 网络切换事件）：
  当前 Wi-Fi 在白名单 → 让 Caddy 活着
  陌生网络 / 公网 / 无Wi-Fi → 整个作业卸载，入口物理消失
```

## 动手

先装 Caddy：

```bash
brew install caddy
```

Caddyfile 放在 `~/.config/dsh-lan-gate/`：

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
# 纯HTTP辅助口：只用于向手机分发根证书
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

`your-mac.local` 用 Mac 的 Bonjour 名（`scutil --get LocalHostName` 查看），好处是不随路由器分 IP 变化而失效。`tls internal` 让 Caddy 自建 CA 给这个名字签证书，手机上装一次根证书就终身无警告。门禁是个带令牌的链接，访问一次种下一年期 Cookie，之后再无任何登录环节。

然后是闸门。白名单文件 `allowed-ssids.txt` 一行一个 Wi-Fi 名，脚本每次跑的时候取当前 SSID 做比对，不在名单里就把 Caddy 的 launchd 作业整个卸载：

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

注意这里 Caddy 是**独立的 launchd 作业**（`RunAtLoad` + `KeepAlive`），闸门只做 bootstrap/bootout，绝不亲自去拉进程。为什么非要这样，踩坑一节细说。

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

闸门自己的 plist 同款格式，程序是 `/bin/zsh gate.sh路径`，`RunAtLoad` + `StartInterval 60`，再加两个 `WatchPaths` 指向 `/Library/Preferences/SystemConfiguration/` 下的网络配置文件，Wi-Fi 一切换立刻触发。

dsh 这边只加信任白名单，绑定地址不动：

```bash
nohup dsh web --no-open --host 127.0.0.1 --trusted-host your-mac.local --trusted-host 192.168.3.137 &
```

这里有个读源码才知道的细节：dsh 的 `/api` 有两层围栏。外层是路由层的信任名单，吃 `--trusted-host` 参数；内层是一批特权方法（`host.pickDirectory` 选目录、`host.openPath`、`settings.*`、`credentials.*`），源码里硬编码 `isTrustedApiRequest(request, [])`，传的是空名单，永远只认本机回环，白名单也放不开。后来 iPhone 上点「选择文件夹」报 403 就是它干的，设计如此，这类操作老老实实回 Mac 上做。

手机端每台三分钟，iOS 和 iPadOS 步骤完全一样：Safari 开 `http://your-mac.local:8444/root.crt` 下载描述文件，去 设置 → 通用 → VPN与设备管理 安装；然后 设置 → 通用 → 关于本机 → 证书信任设置，把 Caddy 根证书的完全信任打开（这步最容易漏，漏了就一直报证书错误）；最后访问一次 `https://your-mac.local:8443/gate?t=<TOKEN>`，跳进 DSH 的同时 Cookie 已经种好，分享菜单加到主屏幕就完事。

想体验 Mac 看一半、手机接着看的串联，还得满足接力的前提：所有设备同一个 Apple ID，设置 → 通用 → 隔空播放与接力里打开接力，Wi-Fi 和蓝牙都开着。没开接力的备胎是 iCloud 标签页同步，效果差不多。

## 踩坑

第一个坑其实是 Apple 埋的。最初图省事走纯 HTTP，结果 iPhone 上点选文件夹直接弹 `crypto.randomUUID is not a function`。非 HTTPS 页面不算安全上下文，iOS Safari 禁用一批 Web API，没有绕路的余地，只能上 HTTPS，于是才有了自建 CA 那套。上 HTTPS 之前我还用过 HTTP Basic Auth，iOS Safari 对它的凭据缓存出了名地不可靠，新开个标签页就重新要密码，烦到怀疑人生。换成门禁链接种 Cookie 之后，一年没再见过登录框。

最大的翻车是 Caddy 的存活问题，翻得很难看。闸门脚本第一版，我用 Linux 时代的老手艺：`nohup caddy ... & disown`，觉得这就是守护进程了。结果 Caddy 每次只活两秒。日志里看得清清楚楚，前一行 `serving initial configuration`，下一行 `shutting down apps, then terminating, signal: SIGTERM`。查了半天才想明白：`nohup` 只挡 SIGHUP，`disown` 只把进程从 shell 的任务表里划掉，进程还坐在 launchd 作业的进程组里，脚本一退出，launchd 给整个进程组发 SIGTERM，Caddy 属于陪葬。更糟的是闸门作业后来自己也停了，Caddy 死了没人拉，iPad 上就是一句「无法连接服务器」。我对着 401/403 全套正常、TCP 却连不上的现场发懵了很久。

修法其实很干脆：Caddy 独立成自己的 launchd 作业，`KeepAlive` 守着，崩了 launchd 自己拉活，闸门只负责 bootstrap/bootout。macOS 连 `setsid` 都没有，别想在进程组上耍花样，launchd 作业化是唯一的正解。修完我特意等了七十秒再查：闸门跑了两轮，Caddy 纹丝不动。

还有两个小的。一个是 Caddy v2 的 `redir / 302` 写在 `/gate` 的 handle 块里根本不生效，它会把 `/` 当成路径匹配条件，必须写完整目标 `redir https://your-mac.local:8443/ 302`，这个坑吞了我一次「验证通过」的假阳性。另一个是最开始的死胡同：`--host 0.0.0.0` 被新版 dsh 直接拒绝，理由写在设计里，不能把能跑 bash 的 GUI 暴露到局域网。整个方案因此才定型成「dsh 零改动，隧道外包」，事后看这个约束反而救了整个架构的形态。

## 现在什么样

家里 Wi-Fi 下，iPhone 和 iPad 点主屏幕图标直接进 DSH，没有证书警告，没有登录框。Mac 上开着的页面，拿起手机从 Safari 接力里一点就接上了，反向也一样。出门或连上陌生 Wi-Fi，入口六十秒内消失，回家自动恢复，`gate.log` 里每一次起停都有时间和 SSID 记录。

代价也明说：出门用不了；Mac 合盖就断；文件夹级的操作（DSH 的特权方法）只认 Mac 本机。安卓暂时没做，系统根本不解析 `.local`，得走 IP 加独立证书，哪天有兴致再说。

整套东西拢共一个 Caddyfile、一个 gate.sh、两个 plist，加上启动命令里几个参数。搭完之后 launchd 自己管自己，我再没碰过。
