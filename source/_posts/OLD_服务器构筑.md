---
title: "'Building a Web Server study'"
date: 2025-01-25 22:23:02
categories:
  - 学习笔记
tags:
  - 学习笔记
---

---

date: 2025-01-25 22:23:02  
# Building a Web Server
## 我学到的内容
1. `open()`** 系统调用**:
    - `open()` 系统调用会返回一个文件描述符（file descriptor）。文件描述符是一个小的非负整数，用于访问文件。
2. **网络通信中的 **`socket()`** 系统调用**:
    - 在网络通信中，我们需要使用 `socket()` 系统调用来创建一个套接字（socket）。套接字是一个连接两个进程的文件，用于发送和接收数据。
    - `socket()` 有三个参数：
        * `domain`: 协议族。例如，`AF_INET` 用于 IPv4，`AF_INET6` 用于 IPv6，`AF_UNIX` 用于 Unix 域套接字等。
        * `type`: 套接字类型。例如，`SOCK_STREAM` 用于 TCP，`SOCK_DGRAM` 用于 UDP 等。
        * `protocol`: 使用的协议。例如，`IPPROTO_TCP` 用于 TCP，`IPPROTO_UDP` 用于 UDP 等。
3. `bind()`** 系统调用**:
    - 接下来，我们需要调用 `bind()` 系统调用来将套接字绑定到一个地址。
    - `bind()` 有三个参数：
        * `sockfd`: 套接字文件描述符，之前通过 `socket()` 获得。
        * `addr`: 要绑定的地址，是一个指向 `sockaddr` 结构体的指针。
        * `addrlen`: 地址的长度。
4. `sockaddr`** 结构体**:
    - `sockaddr` 结构体定义如下：c复制

```plain
struct sockaddr {
    unsigned short sa_family;   // 地址族，如 AF_xxx
    char           sa_data[14]; // 14 字节的协议地址
};
```

    - 对于互联网通信，我们通常使用 `sockaddr_in` 结构体：c复制

```plain
struct sockaddr_in {
    short            sin_family;   // 例如 AF_INET, AF_INET6
    unsigned short   sin_port;     // 例如 htons(80)
    struct in_addr   sin_addr;     // 例如 inet_addr("127.0.0.1")
    char             __pad[8];
};
```

    - 对于互联网通信，我们需要将 `sin_family` 设置为 `AF_INET`，`sin_port` 设置为要连接的端口，`sin_addr` 设置为要连接的 IP 地址。
5. `listen()`** 系统调用**:
    - 接下来，我们需要调用 `listen()` 系统调用来监听套接字。这将标记套接字为被动套接字（用于接受传入的连接）。
    - `listen()` 有两个参数：
        * `sockfd`: 套接字文件描述符，之前通过 `socket()` 获得。
        * `backlog`: 等待连接队列的最大长度。
6. `accept()`** 系统调用**:
    - 然后，我们需要调用 `accept()` 系统调用来接受传入的连接。它会：
        * 提取等待连接队列中的第一个连接请求。
        * 创建一个新的套接字，该套接字连接到发出连接请求的套接字。
        * 返回一个引用该套接字的新文件描述符。
    - `accept()` 有三个参数：
        * `sockfd`: 套接字文件描述符，之前通过 `socket()` 获得。
        * `addr`: 要绑定的地址，是一个指向 `sockaddr` 结构体的指针。
        * `addrlen`: 地址的长度。
7. **总结创建套接字的步骤**:
    - `open()`
    - `socket()`
    - `bind()`
    - `listen()`
    - `accept()`
    - 通过 `accept()` 返回的套接字，我们可以使用 `read()` 和 `write()` 系统调用来读取和写入数据。
8. **HTTP 协议**:
    - HTTP 是一种协议，规定了通过套接字发送的字符串的格式。例如，我们可以约定第一行是请求方法，第二行是路径等。
    - 示例请求：复制

```plain
GET / HTTP/1.1
Host: localhost:8080
```

    - 示例响应：复制

```plain
HTTP/1.1 200 OK
```

## 补充内容
1. **文件描述符**:
    - 文件描述符是操作系统用来管理打开文件的一个抽象概念。它是一个非负整数，用于标识打开的文件或其他 I/O 资源。
    - 在 Linux 系统中，前三个文件描述符有特殊用途：
        * `0`: 标准输入（`stdin`）
        * `1`: 标准输出（`stdout`）
        * `2`: 标准错误（`stderr`）
2. **套接字编程**:
    - 套接字编程是网络编程的基础。通过套接字，程序可以在网络上进行通信。
    - 常见的套接字类型包括流式套接字（`SOCK_STREAM`，用于 TCP）和数据报套接字（`SOCK_DGRAM`，用于 UDP）。
3. **HTTP 协议**:
    - HTTP 是一种应用层协议，用于在 Web 浏览器和服务器之间传输数据。
    - HTTP 请求和响应的格式是文本形式的，易于理解和解析。