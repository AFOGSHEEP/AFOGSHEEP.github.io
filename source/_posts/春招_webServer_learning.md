---
title: webServer_learning
date: 2025-03-01 00:00:00
categories:
  - 春招
tags:
  - 春招
  - 面试
---

项目框架

```cpp
kama -webserver/
|-- img
|-- include
|-- lib
|
|--log/ #日志管理模块
    |--log.cc #日志实现
|--memory/ #内存管理模块
    |--memory.cc #内存管理实现
|--src/ #源代码目录
    |--main.cpp #主程序入口
    |--... # 其他源文件
|-- CMakeLists.txt #CMake构建文件
|-- LISCENSE #许可证文件
|-- README.md #项目说明文件
    
```

  


### GPT的要求
你这个目标非常清晰：用四五天把项目脉络理顺并能讲明白。我先快速做一次“定向读码”，提取入口函数、核心调用链和优先学习模块，然后给你一份按天可执行的学习路径。

搜索完成: 定位入口与主链路

搜索与 `project` · `my_server/kama-webserver/**` 匹配的文件，66 匹配项

搜索与 `project` · `my_server/kama-webserver/**/*.{cpp,h,cc,hpp,c,md,txt}` 匹配的文件，59 匹配项

搜索正则表达式 `int main|TcpServer|EventLoop|EPollPoller|TcpConnection|start\(|loop\(|newConnection|handleRead|thread|AsyncLogging|Logger` (`project` · `my_server/kama-webserver/src/**`)，200 个结果

搜索正则表达式 `class TcpServer|class EventLoop|class EPollPoller|class TcpConnection|class Acceptor|class EventLoopThreadPool|class Logger|class AsyncLogging` (`project` · `my_server/kama-webserver/include/**`)，19 个结果

读取 [](file:///home/dohy/project/my_server/kama-webserver/src/main.cc)

读取 [](file:///home/dohy/project/my_server/kama-webserver/src/TcpServer.cc)

读取 [](file:///home/dohy/project/my_server/kama-webserver/src/EventLoop.cc)

搜索正则表达式 `int main\(|EchoServer|server_\.start|loop\.loop|AsyncLogging log|Logger::setOutput` (`project` · `my_server/kama-webserver/src/main.cc`)，11 个结果

搜索正则表达式 `TcpServer::TcpServer|TcpServer::start|TcpServer::newConnection|TcpServer::removeConnection|TcpServer::removeConnectionInLoop|setThreadNum` (`project` · `my_server/kama-webserver/src/TcpServer.cc`)，13 个结果

搜索正则表达式 `EventLoop::EventLoop|EventLoop::loop|EventLoop::runInLoop|EventLoop::queueInLoop|EventLoop::wakeup|EventLoop::handleRead|updateChannel|removeChannel|doPendingFunctors|createEventfd` (`project` · `my_server/kama-webserver/src/EventLoop.cc`)，17 个结果

搜索正则表达式 `Poller::newDefaultPoller|new EPollPoller` (`project` · `my_server/kama-webserver/src/DefaultPoller.cc`)，2 个结果

我已经抽取到了主链路和核心模块，下一步我补上“怎么跑、每天读哪些文件、每天要输出什么成果”，给你一份可执行到小时级的 5 天路径。

读取 [](file:///home/dohy/project/my_server/kama-webserver/CMakeLists.txt)

读取 [](file:///home/dohy/project/my_server/kama-webserver/README.md)

读取 [](file:///home/dohy/project/my_server/kama-webserver/src/CMakeLists.txt)

读取 [](file:///home/dohy/project/my_server/kama-webserver/src/main.cc)

你这个时间窗口很好，4-5天完全可以把项目理清到“能讲清、能追链路、能改小功能”的程度。  
重点不是背源码，而是建立一张可复用的认知地图。

先给你一个基于你当前仓库的专用学习路径（我已经按主链读过核心代码）。

**项目主链（先记这一条）**

1. 程序入口与装配在 main.cc
2. 服务启动与新连接分发在 TcpServer.cc
3. 监听与 accept 在 Acceptor.cc
4. 事件循环在 EventLoop.cc
5. epoll 封装在 EPollPoller.cc
6. 连接读写在 TcpConnection.cc

你只要把这 6 步讲顺，就已经超过多数“只会背八股”的候选人。

**5天学习路径（每天都有产出）**

1. Day 1：跑通 + 看懂启动装配
+ 读文件：  
<font style="background-color:#FBDE28;">main.cc</font>  
<font style="background-color:#FBDE28;">TcpServer.cc</font>  
<font style="background-color:#FBDE28;">Acceptor.cc</font>
+ 目标：  
能口述“main 做了哪三件事：日志、内存池/LFU、网络启动”
+ 当日产出：  
一页启动流程图（手写也行），只写函数名和调用方向
2. Day 2：吃透 Reactor 主循环
+ 读文件：  
EventLoop.cc  
DefaultPoller.cc  
EPollPoller.cc  
Channel.cc
+ 目标：  
理解“谁在阻塞、谁在唤醒、谁在分发回调”
+ 当日产出：  
写出 8-12 行“事件到回调”的文字链路
3. Day 3：连接生命周期与数据收发
+ 读文件：  
TcpConnection.cc  
Buffer.cc  
TcpConnection.h
+ 目标：  
搞清 connectEstablished、handleRead、sendInLoop、handleWrite、connectDestroyed
+ 当日产出：  
一张状态流转小图（连接建立 -> 收发 -> 关闭）
4. Day 4：线程模型 + 日志系统
+ 读文件：  
EventLoopThread.cc  
EventLoopThreadPool.cc  
Thread.cc  
Logger.cc  
AsyncLogging.cc
+ 目标：  
能解释 one loop per thread 和异步日志双缓冲的目的
+ 当日产出：  
“线程与日志”两段 1 分钟口述稿
5. Day 5：补业务模块 + 做一个可展示改动
+ 读文件：  
memoryPool.cc  
memoryPool.h  
LFU.h
+ 做一个小改动（建议）：  
把 subloop 线程数从硬编码改成命令行参数（现在在 main.cc 里是固定 3）
+ 当日产出：  
1 个 commit + 1 段改动说明（为什么改、改了什么、如何验证）

**每天固定学习节奏（防止陷进细节）**

1. 30 分钟：先跑程序并观察日志
2. 60 分钟：只追一条调用链，不扩散
3. 30 分钟：写当日产出（图或口述稿）
4. 20 分钟：复述给自己听，卡住处第二天优先补

**你现在最该避免的事**

1. 全文件顺序通读
2. 开新目录默写源码
3. 在一个函数里死磕超过 40 分钟

**你现在最该做的第一步（今天）**

1. 先把 Day 1 三个文件读完并画启动图
2. 把你画的“调用链草图文字版”发我
3. 我会按你的草图逐行纠偏，直接带你进 Day 2

如果你愿意，我下一条就给你“Day 1 的标准答案模板”，你照着填空，今晚就能完成第一轮梳理。







## Class EchoServer


### <font style="background-color:#FBDE28;">public区域：</font>
必须先有构造函数初始化自己，构造函数和类同名

参数有`EventLoop *loop, const InetAddress &addr, const std::string &name`

主事件循环对象的地址，服务器监听地址，服务器名字



随后**注册**函数，把成员函数和当前对象绑在一起，变成框架可调用的函数对象。<font style="background-color:#FBDE28;">初始化是现在做，回调注册是为了将来事件发生时再做。</font>

<font style="background-color:#FBDE28;"></font>

<font style="background-color:#FBDE28;">start方法，调用时用私有类里面定义的sever_成员变量自动启动底层服务器流程。</font>

<font style="background-color:#FBDE28;"></font>

### <font style="background-color:#FBDE28;">private区域：</font>
定义两个回调函数`onConnection`和`onMessage`，分别负责监听连接成功和失败的状态，处理连接上下线日志。和读取缓冲区的信息并转换成字符串然后回显给客户端。

定义两个内部变量`server_ & loop`,底层服务器对象和内部指针。



### 回调适配器 `AsyncLogging`
定义了一个全局指针`g_asynclog`指向日志对象和一个返回指针的函数

随后通过把指针的指向对象赋予日志对象再把日志追加到异步缓冲区。