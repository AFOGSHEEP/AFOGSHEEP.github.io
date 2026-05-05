---
title: building_web_server_record
date: 2025-03-01 00:00:00
categories:
  - 学习笔记
tags:
  - 未分类
---

## level1
跟着题目做即可

## level2
晃眼看好像和第一题一样，运行server又不正确，看了几遍题目，问了DS明白了这是要我用上socket套接字。当前的汇编代码只是调用了 `exit(0)`，需要修改它，使其调用 `socket()` 系统调用来创建一个套接字。

```plain
.intel_syntax noprefix
.globl _start

.section .text

_start:
    mov rdi, 2
    mov rsi, 1
    mov rdx, 0
    mov rax, 41
    syscall

    mov rdi, 0
    mov rax, 60
    syscall

.section .data
```

1. `mov rdi, 2`:
    - 将 `2` 赋值给 `rdi` 寄存器。`rdi` 是系统调用的第一个参数寄存器，`2` 表示 `AF_INET`（IPv4 协议族）。
2. `mov rsi, 1`:
    - 将 `1` 赋值给 `rsi` 寄存器。`rsi` 是系统调用的第二个参数寄存器，`1` 表示 `SOCK_STREAM`（TCP 套接字类型）。
3. `mov rdx, 0`:
    - 将 `0` 赋值给 `rdx` 寄存器。`rdx` 是系统调用的第三个参数寄存器，`0` 表示默认协议。
4. `mov rax, 41`:



执行系统调用后会自动生成TCP套接字。

    - 将 `41` 赋值给 `rax` 寄存器。`rax` 是系统调用号寄存器，`41` 是 `socket()` 系统调用的系统调用号。

当然，创建一个 TCP 套接字只是进行完整的TCP通信的第一步。

## level3
将一个地址绑定到套接字（In this challenge you will bind an address to a socket.）

继续在原有代码上进行增添：

```plain
.intel_syntax noprefix
.globl _start

#数据段
.section .data
    socketadd:
        .2byte 2
        .2byte 0x5000
        .4byte 0
        .8byte 0

.section .text

_start:
    # socket
    mov rdi, 2
    mov rsi, 1
    mov rdx, 0
    mov rax, 41
    syscall

    #bind
    mov rdi,rax
    lea rsi,[rip+socketadd]	
    mov rdx, 16
    mov rax, 0x31
    syscall



    #exit
    mov rdi, 0
    mov rax, 60
    syscall



.section .data



```

+ `lea` 是 **Load Effective Address** 指令，用于计算地址并将其加载到寄存器中。
+ `[rip+sockaddr]` 表示 `sockaddr` 结构体的地址相对于当前指令指针（`rip`）的偏移量。
1. **设置参数**:
    - 将套接字文件描述符（`3`）赋值给 `rdi`。
    - 将 `sockaddr` 结构体的地址赋值给 `rsi`。
    - 将 `sockaddr` 结构体的大小（`16`）赋值给 `rdx`。
    - 将 `bind()` 的系统调用号（`0x31`）赋值给 `rax`。
2. **执行系统调用**:
    - 调用 `syscall`，执行 `bind()` 系统调用。
    - 操作系统会将 `sockaddr` 中的地址信息绑定到套接字。





## level4
监听端口（In this challenge you will listen on a socket.）



```plain
.intel_syntax noprefix
.globl _start


.section .data
    socketadd:
        .2byte 2
        .2byte 0x5000 
        .4byte 0
        .8byte 0

.section .text

_start:
    # socket
    mov rdi, 2
    mov rsi, 1
    mov rdx, 0
    mov rax, 41
    syscall

    #bind
    mov rdi, rax
    lea rsi,[rip+socketadd]
    mov rdx, 16
    mov rax, 0x31
    syscall

    #listen
    mov rdi, 3      # 参数1：套接字文件描述符（假设为 3）
    mov rsi, 0      # 参数2：backlog（等待连接队列长度）
    mov rax, 0x32   # 系统调用号：listen()
    syscall


    #exit
    mov rdi, 0
    mov rax, 60
    syscall






```

backlog设置为零会导致操作系统拒绝所有连接请求。通常应设置为正整数。

不过接受请求在下一个level里。





## level5
接受连接（In this challenge you will accept a connection.）

```plain
.intel_syntax noprefix
.globl _start


.section .data
    socketadd:
        .2byte 2
        .2byte 0x5000 
        .4byte 0
        .8byte 0

.section .text

_start:
    # socket
    mov rdi, 2
    mov rsi, 1
    mov rdx, 0
    mov rax, 41
    syscall

    #bind
    mov rdi, rax
    lea rsi,[rip+socketadd]
    mov rdx, 16
    mov rax, 0x31
    syscall

    #listen
    mov rdi, 3
    mov rsi, 0
    mov rax, 0x32
    syscall

    # Accept 
    mov rdi, 3
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x2b
    syscall

    #exit
    mov rdi, 0
    mov rax, 60
    syscall






```









## level6
静态响应http请求（In this challenge you will respond to an http request.）