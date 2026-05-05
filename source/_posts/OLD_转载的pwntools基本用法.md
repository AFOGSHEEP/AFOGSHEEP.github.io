---
title: "\"[转载文章]菜鸟笔记之pwn工具篇--pwntools库的基本使用\""
date: 2025-01-13 20:28:45
categories:
  - 学习笔记
tags:
  - 网安
---

---

date: 2025-01-13 20:28:45  
<font style="background-color:#f3bb2f;">原文章链接：</font>`[菜鸟笔记之pwn工具篇--pwntools库的基本使用 - XiDP - 博客园](https://www.cnblogs.com/XiDP0/p/18445564)`

## 啥是pwntools?
**Pwntools** 是一个用于漏洞利用和二进制分析的 `Python 库`，广泛应用于安全研究、渗透测试和竞争性编程（如 CTF，Capture The Flag）它为用户提供了一套强大的工具和功能，以`简化与二进制文件的交互`、`网络通信`以及各种`常见任务的执行`。

简而言之，`pwntools`可以说是pwn手必备的工具，它帮助pwn手`连接远程服务器`，`发送信息`，`接收信息`，以及提供了很多工具来帮助pwn手快速攻克题目

## 如何安装pwntools?
按照以下流程在python3中安装pwntools

```bash
>>> apt-get update
>>> apt-get install python3 python3-pip python3-dev git libssl-dev libffi-dev build-essential
>>> python3 -m pip install --upgrade pip
>>> python3 -m pip install --upgrade pwntools
```

## 如何使用pwntools?
显然我们需要学会使用python,并在编写脚本的时候导入pwntools库

### 导入pwntools:
这大概会是每一个pwn手的编写脚本时的第一句话

```python
from pwn import * #使用from来导入pwntools模块
```

### 设置基本信息:
在打靶机前需要按照靶机的类型设置好基本信息,因为`pwntools`中很多工具需要依靠`contest`来自动选择类型，比如`shellcraft(用于生成shellcode代码的工具)`等  
`os`是靶机的系统类型一般就是`linux系统`  
`arch`是指题目的架构,我们可以使用`checksec`工具来查看具体的架构，一般是`AMD64`或`i386`  
`log_level`是指日志输出等级，可以设置为`debug`或者直接不设置删掉也行，设置为debug在脚本运行的时候会输出我们具体发送了什么信息，靶机反馈了什么信息。

```python
context(os='linux', arch='AMD64', log_level='debug')
```

### 连接远程靶机:
在pwn(1.0.0)中曾经介绍过，我们启动靶机后会得到一个靶机地址，把靶机地址的前缀和端口分别输入在`remote`里面，`ip`用`''`包裹起来用逗号隔开`端口`，这样就实现了远程连接

```python
用于连接远程服务器，并把连接到的进程命名为p，后续的函数都围绕这个p进程展开
p = remote("ip",port) 
比如:p = remote("node5.buuoj.cn",5555)
```

当然偶尔也有题目需要用ssh来连接靶机的

```python
通过使用ssh来连接靶机
p = ssh(host='192.168.xx.xxx', user='xidp', port=6666, password='88888888')
```

### 本地调试:
在远程之前，我们可以在本地先进行一些测试,那么我们可以本地运行文件

```python
本地调试程序,并且将进程命名为p
p = process("文件名")
比如:p = process("./pwn")
```

### 发送信息:
假设我们需要发送的是`payload`这个变量

```python
**************************************************
p.send(payload) # 直接发送payload
**************************************************
p.sendline(payload) # 发送payload，但是结尾会有一个\n
**************************************************
p.sendafter("string", payload) # 接收到 string (这里说的string可以替换成任何信息) 之后会发送payload，但是如果没有接收到string，那么就会导致脚本一直卡在这里不动
**************************************************
p.sendlineafer("string", payload) # 接收到 string 之后会发送payload 并且在payload最后添加\n
```

一般常用的发送就这几种，此时可能会有一个疑问，`p.send` 和 `p.sendline` 就差一个`\n`有什么区别?  
有区别，比如`gets()`和`scanf()`这类函数它们会以`\n`作为结束符号，如果我们没有发送`\n`,它们就会一直卡着等待输入，所以遇到这类输入函数就必须要用`p.sendline`来添加`\n`(当然如果我们手动在payload里面添加`\n`也OK)。遇到`read()`这类函数则使用`p.sendline`和`p.send`都可以.

那如果我们都使用`p.sendline`不就好了吗? NO，这并不好，比如我们遇到`read()`并且希望发送一些字符串比如`"flag"`,如果你用`p.send("flag")`那么没错你发送的是`flag`，计算机解析后是`\x67\x61\x6C\x66`，而如果你用的是`p.sendline("flag")`，则你发送的是`flag\n`,计算机解析后是`\x0a\x67\x61\x6C\x66`,这一点细节上的差距就可能导致我们的脚本无法打通，所以我们需要面对合适的函数使用合适的方法，后续我们将会继续讨论`read()、scanf()、fgets()和gets()`这类函数在输入的时候具体有什么区别

### 接收信息:
```python
**************************************************
p.recv(int) 利用recv来接收返回的数据，并且可以控制接受到的字节数
比如:p.recv(7) => 系统输出'hello world' => 我们会接受到'hello w' 
**************************************************
p.recvline('string') 设置一个标识符，接收标识符所在的那一行
比如:p.recvline('O.o')
#系统输出:
Hello World 
This is a test. 
O.o This is the target line. 
Goodbye.
#我们接收:
O.o This is the target line. 
**************************************************
p.recvlines(N) 接收 N 行输出
**************************************************
p.recvuntil('string') 可以指定接收到某一字符串的时候停止 ,还有第二个参数 drop，drop=True(默认为false) 表示丢弃设定的停止符号
比如:p.recvuntil('or') 
#系统输出:
hello world 
#我们接收:
hello wor  
比如:a = io.recvuntil(']', drop=True)
就是一直获取到`]`符号出现就停止，并且不接收`]`符号
**************************************************
```

### 传递到终端:
大概是每个脚本的最后一句话

```python
p.interactive()
接受信息并且在终端操作，程序拿到shell，然后就可以转接到linux终端上，让pwn手享受拿flag的乐趣
```

### 构造发送地址类型:
`p64/p32/u64/u32`这类函数的作用:

```python
**************************************************
p64(int) 
p64(0xfaceb00c) => '\x0c\xb0\xce\xfa\x00\x00\x00\x00\x00'
**************************************************
u64(str) 
u64('\x0c\xb0\xce\xfa\x00\x00\x00\x00') =>0xfaceb00c
**************************************************
p32(int)  
p32(0xfaceb00c) => '\x0c\xb0\xce\xfa'
**************************************************
u32(str) 
u32('\x0c\xb0\xce\xfa') => 0xfaceb00c
**************************************************
```

`p64()`这种类型用于将消息变成对应的进制流（因为原本程序里面的数据都是已经编译过的，所以打入的数据也需要是编译过的,所以需要使用p64()这类工具）  
`u64()`这种类型`用于泄露地址`的时候将泄露的进制流变成对应的原本的样子，方便来辨认查找glibc版本

因为一般计算机都是小端程序，所以这两个函数都自带有将数据变成小端需要的样子，如果遇到大端程序可能需要额外注意

除了`p32()`这种转化方式还有，`flat()`，它可以将多个数据结构（如字符串、整数等）连接在一起，并将它们转换为二进制数据。通常用于构建复杂的ROP链的`shellcode`。flat 函数会将数据扁平化，将它们按照顺序连接在一起，不做任何其他处理。在提供的代码中，`flat` 被用于构建一个包含多个元素的列表，然后将它们连接起来形成一个二进制数据。

```python
payload = flat([0x12345678, 'AAAA', 0xdeadbeef], word_size=4/8)
```

#### 的汇编与反汇编:
pwntools提供了两个工具:  
`asm`函数可以将汇编代码转为对应的二进制  
`disasm`函数则相反可以将二进制转化为汇编代码

```python
>>> asm('mov eax, 0')   #汇编
'\xb8\x00\x00\x00\x00'

>>> disasm('\xb8\x0b\x00\x00\x00')  #反汇编
'mov    eax,0xb'
```

#### 生成shllcode后门:
**pwnlib.shellcraft模块**包含**生成shell代码**的函数。  
在使用之前我们需要通过**context设置架构**，然后**生成shellcode**也就是生成后门

```python
context(os='linux', arch='i386')
# 表示将当前执行上下文的体系结构设置为i386(这里的i386可以通过checksec来查看文件是什么架构的  
shellcode = asm(shellcraft.sh())
# asm()是把括号内的内容编译成机器码(只有机器码才可以执行)，一般用来打入后门。pwntools自带的后门函数，可以生成类似system('/bin/sh/')这样功能的汇编代码 
# 通常可以配合  .ljust() 来使用  
shellcode.ljust(112, b'A')  
# 这里的 .ljust() 是 Python 中字符串对象的方法，用于在字符串的右侧填充指定的字符，使字符串达到指定的长度。
```

纯净版shellcode

```python
from pwn import *
context(arch='i386', os='linux')
shellcode = asm(shellcraft.sh())
shellcode.ljust(112, b'A')  
```

当然也有专门的网站收集shellcode  
shellcode的网址：  
 [https://www.exploit-db.com/shellcodes/43550](https://www.exploit-db.com/shellcodes/43550)  
下面也提供一些已经编译好的shellcode:  
64位linux的24Byte的shellcode

```python
shellcode_x64 ="\x6a\x3b\x58\x99\x52\x48\xbb\x2f\x2f\x62\x69\x6e\x2f\x73\x68\x53\x54\x5f\x52\x57\x54\x5e\x0f\x05"
```

64位Linux的23Byte的shellcode

```python
shellcode_x64 ="\x48\x31\xf6\x56\x48\xbf\x2f\x62\x69\x6e\x2f\x2f\x73\x68\x57\x54\x5f\x6a\x3b\x58\x99\x0f\x05"
```

更多的时候根据题目的要求，我们需要自己手动编写shellcode来绕过一些检测，所以编写`shellcode`是后续必须要掌握的一种技巧

运行时调用gdb调试:  
使用`gdb.attach`函数

```python
gdb.attach(p, gdbscript=""" b main; commands; silent printf "Breakpoint hit\n"; continue; end """)
在需要进行调试的位置插入gdb.attach(p)即可在执行到的时候打开gdb进行调试
p是指定的需要调试的进程(必须要本地调试，否则会报错)
gdbscript是打开gdb后需要进行的操作，使用 ; 进行隔离
```

一般`gdb.attach(p)`可以和`pause()`函数连用，可以确保在gdb完全打开之前脚本不运行  
`pause()`函数用于暂停脚本的运行，直到用户输入任意数据

#### ELF模块:
我们可以通过这个模块来快速获取pwn文件的`got表地址`以及`plt表地址`  
用于获取`ELF文件的信息`，首先使用`ELF()`获取这个文件的句柄，然后使用这个句柄调用函数，和IO模块很相似。  
下面演示了：获取基地址、获取函数地址（基于符号）、获取函数got地址、获取函数plt地址，和LibcSearcher库联动使用

```python
elf = ELF('./pwn')

elf.address # 文件装载的基地址 => 0x400000

main_addr = elf.symbols['main'] # 获取函数地址 => 0x401680

write_got = elf.got['write'] # 获取对应函数在GOT表的地址 => 0x60b070

write_plt = elf.plt['write'] # 获取对应函数在PLT表的地址 => 0x401680
```