---
title: wsl图形化界面安装踩坑
date: 2025-1-06 00:53:29
categories:
  - 学习笔记
tags:
  - linux
---

---

date: 2025-1-06 00:53:29  
安装wsl后只有终端界面太单调了，遂网上寻找给Ubuntu添加图形界面的方法。中间遇见了一些坑，记下来以备查阅。

> 主要参考：[WSL2中使用VcXsrv实现xfce4图形界面+声音传输 - 知乎](https://zhuanlan.zhihu.com/p/150555651?native.theme=1)
>

## VcXsrv安装与配置
从SourceForge上下载最新的即可，

> [VcXsrv Windows X Server download | SourceForge.net](https://sourceforge.net/projects/vcxsrv/) 
>

网站内会保持更新。

我下载的是`vcxsrv-64.1.20.14.0.installer.exe`,直接安装即可。

安装完成之后在开始菜单搜索或者在其文件夹里找到 `xlaunch.exe`并启动

<p class="fig-placeholder">图：这里曾有图片</p>

配置启动设置时，窗口模式使用 `One large window`，并在 `Extra settings`里勾选 `Disable access control`其他配置选择默认。

启动的窗口此时保持全黑。

并且一定要给VcXsrv设置通过防火墙。

<p class="fig-placeholder">图：这里曾有图片</p>

启动一次xlaunch后在开始菜单里搜索 `允许应用通过windows防火墙`,其中`VcXsrv windows xserver`一定要把专用和公用都设置上，不然后续会出现无法连接的情况。

<p class="fig-placeholder">图：这里曾有图片</p>

## 配置与启动xfce4
安装`xfce4`

```bash
$ sudo apt install -y xfce4
```

下载好后配置 `DISPLAY`**[环境变量]** ，这里有许多坑。

1. 直接启动会出现如下问题

```bash
DESKTOP-14VK3K3%:~$ startxfce4
/usr/bin/startxfce4: X server already running on display :0.0
xrdb: Connection refused
xrdb: Can't open display ':0.0'
Unable to init server: Could not connect: Connection refused
xfce4-session: Cannot open display: .
Type 'xfce4-session --help' for usage.
```

没有配置ip地址和端口，或者直接配置成`0:0`是不能顺利启动。原因是`WSL2`其实是用`Hyper-V`技术实现的一个虚拟机,和`WSL1`的工作原理不一样。

2. 配置 `DISPLAY`信息

```bash
# 首先需要查看Windows系统和WSL2通信使用的虚拟网卡地址
$ sudo vim /etc/resolv.conf
# nameserver后面的地址就是Windows系统虚拟网卡的地址,记一下,同时需要取消下面两行内容的注释,禁用自动重新生成配置文件,否则重启后这个地址会变
[network]
generateResolvConf = false


$ vim ~/.bashrc
# 在文件最后追加下面内容,地址使用上面查看到的
export DISPLAY=192.168.112.1:0
```

或者使用下面的配置来动态获取ip信息

```bash
# 自动在对应文件中检索相应信息
export DISPLAY="`grep nameserver /etc/resolv.conf | sed 's/nameserver //'`:0"

# 下面的效率更高。使用这两种就不用去掉/etc/resolv.conf文件中那两行的注释
export DISPLAY=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}'):0
```

3. 同时，如果是是使用最新的Ubuntu系统，也就是`ubuntu 22.04`或者之后的，需要在`.bashrc`加入`export WAYLAND_DISPLAY=$DISPLAY`，因为

`ubuntu22`默认使用WAYLAND而不是x11作为显示服务。之后记得`source ~/.bashrc` 保存一下配置。

4. 如果上面都没起效，可以看看wsl版本是否有问题， 在powershell里输入`wsl update`更新一下。当然如果是现在开始弄wsl的大概率是最新版本。

## 图形界面显示问题
折腾好后`xlaunch`的界面仍然是一片黑

<p class="fig-placeholder">图：这里曾有图片</p>

但是任务栏里却有Ubuntu的面板

<p class="fig-placeholder">图：这里曾有图片</p>

除了浏览器，其余应用，终端，文件管理器等都能正常使用。屏幕最上面还有横栏

<p class="fig-placeholder">图：这里曾有图片</p>

启动时的报错信息如下，每次点击应用都会增加报错，估计是因为没有在正确的屏幕上显示。

```bash
DESKTOP-14VK3K3% startxfce4
/usr/bin/startxfce4: X server already running on display :0
gpg-agent: a gpg-agent is already running - not starting a new one
Another Window Manager (Weston WM) is already running on screen :0.0
To replace the current window manager, try "--replace"

(xfwm4:1871): xfwm4-WARNING **: 22:49:38.642: Could not find a screen to manage, exiting
xfsettingsd: Another clipboard manager is already running.

(xfsettingsd:1876): xfsettingsd-WARNING **: 22:49:38.771: Failed to get the _NET_NUMBER_OF_DESKTOPS property.
```

像是没有和xserver的服务器连接。



另一方面，安装wslg的应用并不能完整的体验图形化linux的使用，里面只有分散的图形化程序，并非完全的linux桌面。







+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

								**以上是分割线**

最近折腾neovim发现自己之前稀里糊涂的安装了`zsh`作为shell，`bash`根本就不管事，我还把所有的配置都放在了`bashrc`里,也难怪没有图形界面没有正常出现。。。。麻烦的是后面还得自己把配置都写进`zshrc`。。