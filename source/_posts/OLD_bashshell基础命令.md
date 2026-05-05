---
title: bashshell基础命令
date: 2024-04-17 23:10:12
categories:
  - 学习笔记
tags:
  - Linux
---

---

date: 2024-04-17 23:10:12  
# 
## 启动终端
启动终端后会看见 **shell CLI** 提示符，在此输入shell命令。默认的提示符符号是 $ 

```bash
┌──(kali㉿kali)-[/etc]
└─$ 

```

## 与bash手册交互
大多数Linux发行版自带在线手册。使用man命令可以访问Linux系统的手册页。输入 `man 想要查看的命令`

```bash
NAME
       cat - concatenate files and print on the standard output

SYNOPSIS
       cat [OPTION]... [FILE]...

DESCRIPTION
       Concatenate FILE(s) to standard output.

       With no FILE, or when FILE is -, read standard input.

       -A, --show-all
              equivalent to -vET

       -b, --number-nonblank
              number nonempty output lines, overrides -n

       -e     equivalent to -vE

       -E, --show-ends
              display $ at end of each line

       -n, --number
              number all output lines

```

以上是 `cat`的部分用法。输入 `man cat`即可查看

其中 **DESCRIPTION** 部分提供了快速参考。从中可以迅速了解命令的作用以及用法。

mannal里通过空格翻页，enter逐行查看，以及上下箭头进行滑动。按q退出。

如果忘记命令了，可以通过 `man -k terminal`进行关键词查找。



## 浏览文件系统
### Linux中的目录
Linux采用名为“虚拟目录”的单个目录结构中。虚拟目录会将计算机中所有储存设备的文件路径都纳入单个目录结构。Linux的虚拟目录结构只包含一个叫做 root的目录的基础目录。所有文件都在root目录下一一列出。Linux中安装的第一块硬盘为根驱动器，所有目录都是从那里开始构建的。以下是kali的根目录

```bash
┌──(root㉿kali)-[/]
└─# ls
bin   home            lib32       mnt   run       sys  vmlinuz
boot  initrd.img      lib64       opt   sbin      tmp  vmlinuz.old
dev   initrd.img.old  lost+found  proc  srv       usr
etc   lib             media       root  swapfile  var

```

这里使用了ls命令来查看文件夹中的内容。常见的Linux目录名均基于文件系统层级标准（filesytem hierarchy standard, FHS）。

在Linux中，可以通过cd命令来切换目录。语法为 `cd destination`。使用 `cd ..`可以快速回到父目录。

使用 `pwd`命令可以了解当前工作目录。

`ls`命令最基本的形式会显示当前目录下的文件和目录。使用 `ls -F`(注意，Linux系统严格区分大小写，-f和-F是两个不同的命令)可以区分文件和目录

```bash
┌──(root㉿kali)-[/]
└─# ls -F
bin@   home/            lib32@       mnt/   run/      sys/  vmlinuz@
boot/  initrd.img@      lib64@       opt/   sbin@     tmp/  vmlinuz.old@
dev/   initrd.img.old@  lost+found/  proc/  srv/      usr/
etc/   lib@             media/       root/  swapfile  var/

```

-a选项能显示隐藏文件（通常是文件名以 . 开始的文件）

-R选项称作递归选项，能列出当前目录包含的子目录的文件与目录。

-l命令会产生长列表格式的输出，提供目录中各个文件的详细信息。在-l后跟上文件名即可只查看该文件的信息。

### 过滤输出列表
ls命令支持在命令行中定义过滤器，使用过滤器来决定该在命令行中显示哪些文件或者目录。

在ls最后添加文件名是最基本的过滤方式，我们可以通过使用标准通配符来进行模式匹配。

+ 问号 （ ? ）代表任意单个字符
+ 星号 （ * ）代表零个或者多个任意字符

以 `/home/kali/`目录为例：

```bash
┌──(kali㉿kali)-[~]
└─$ ls -F                
backup/   Documents/  fill    Pictures/  tast.py  teeeeeeeesy.txt  test.py
Desktop/  Downloads/  Music/  Public/    te3t.py  Templates/       Videos/

```

```bash
┌──(kali㉿kali)-[~]
└─$ ls t[a-z]st*
tast.py  test.py
```

```bash
┌──(kali㉿kali)-[~]
└─$ ls t*       
tast.py  te3t.py  teeeeeeeesy.txt  test.py
```

```bash
┌──(kali㉿kali)-[~]
└─$ ls t?st.py
tast.py  test.py
```

```bash

┌──(kali㉿kali)-[~]
└─$ ls t[^/e]st.py       
tast.py

```

!]可能被zsh认为是一个事件从而出错，把把方括号部分替换为 `'['!what_you_think']'`或者把 `!` 替换为 …`^/`

Zsh（Z Shell）是一个强大的命令行解释器，用于 UNIX 操作系统。它是 Bourne Shell 的扩展，具有许多改进，包括更好的用户交互、功能强大的脚本能力和自定义功能。