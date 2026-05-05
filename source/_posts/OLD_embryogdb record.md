---
title: "'embryogdb-襁褓中的调试'"
date: 2025-01-17 23:37:45
categories:
  - 学习笔记
tags:
  - 网安
---

## level6
主要提下level6和level8，前者是靠`call (void)win()`水过的，后者是花了比较多的精力才理解



You can modify the state of your target program with the `set` command. For example, you can use `set $rdi = 0` to zero  
out ![image](https://cdn.nlark.com/yuque/__latex/1bbee4fc965cf085a9a97ed98e8424ee.svg)rsp) = 0x1234` to set the first value on the stack to 0x1234. You can use  
`set *((uint16_t *) 0x31337000) = 0x1337` to set 2 bytes at 0x31337000 to 0x1337.

Suppose your target is some networked application which reads from some socket on fd 42. Maybe it would be easier for  
the purposes of your analysis if the target instead read from stdin. You could achieve something like that with the  
following gdb script:

  start  
  catch syscall read  
  commands  
    silent  
    if (![image](https://cdn.nlark.com/yuque/__latex/e4162c09c5fe3caed56175f34f455485.svg)rdi = 0  
    end  
    continue  
  end  
  continue

This example gdb script demonstrates how you can automatically break on system calls, and how you can use conditions  
within your commands to conditionally perform gdb commands.

In the previous level, your gdb scripting solution likely still required you to copy and paste your solutions. This  
time, try to write a script that doesn't require you to ever talk to the program, and instead automatically solves each  
challenge by correctly modifying registers / memory.



level5是通过实时在终端中打印出对应位置的随机值，再手动输入；这题更进一步，要求脚本自动给随机值找到并输入。

在卡了几天后参考这位师傅的博客找到了解决方案：`[Debugging Refresher](https://j-shiro.github.io/p/debugging-refresher/)`









```plain
0x00005798218a7d0b in main ()
(gdb) x/16i $rip
=> 0x5798218a7d0b <main+613>:   lea    0xbfd(%rip),%rdi        # 0x5798218a890f
   0x5798218a7d12 <main+620>:   mov    $0x0,%eax
   0x5798218a7d17 <main+625>:   callq  0x5798218a7260 <__isoc99_scanf@plt>
   0x5798218a7d1c <main+630>:   mov    -0x10(%rbp),%rax
   0x5798218a7d20 <main+634>:   mov    %rax,%rsi
   0x5798218a7d23 <main+637>:   lea    0xbea(%rip),%rdi        # 0x5798218a8914
   0x5798218a7d2a <main+644>:   mov    $0x0,%eax
   0x5798218a7d2f <main+649>:   callq  0x5798218a71d0 <printf@plt>
   0x5798218a7d34 <main+654>:   mov    -0x18(%rbp),%rax
   0x5798218a7d38 <main+658>:   mov    %rax,%rsi
   0x5798218a7d3b <main+661>:   lea    0xbe3(%rip),%rdi        # 0x5798218a8925
   0x5798218a7d42 <main+668>:   mov    $0x0,%eax
   0x5798218a7d47 <main+673>:   callq  0x5798218a71d0 <printf@plt>
   0x5798218a7d4c <main+678>:   mov    -0x10(%rbp),%rdx
   0x5798218a7d50 <main+682>:   mov    -0x18(%rbp),%rax
   0x5798218a7d54 <main+686>:   cmp    %rax,%rdx
```





运行22次空指令后能找到`cmp %rax,%rdx` ,再运行一次就会发现要让函数往下走的要求就是要`rax`和`rdx`相等。脚本就很好写了.

在`main+686`中断并修改两个寄存器的值

```plain
start
run
break *main+686
commands
        silent
        set $rdx = $rax
        continue
end
continue
```

然后最多运行64次`continue`就可以得到flag了







## level8
As we demonstrated in the previous level, gdb has FULL control over the target process. Under normal circumstances, gdb  
running as your regular user cannot attach to a privileged process. This is why gdb isn't a massive security issue which  
would allow you to just immediately solve all the levels. Nevertheless, gdb is still an extremely powerful tool.

Running within this elevated instance of gdb gives you elevated control over the entire system. To clearly demonstrate  
this, see what happens when you run the command `call (void)win()`.

Note that this will _not_ get you the flag (it seems that we broke the win function!), so you'll need to work a bit  
harder to get this flag!

As it turns out, all of the levels other levels in module could be solved in this way.

GDB is very powerful!

当我们想要调用`win（）`函数时会发生什么？

```plain
0x00005b9bc84e6b99 in main ()
(gdb) call (void)win()

Program received signal SIGSEGV, Segmentation fault.
0x00005b9bc84e6969 in win ()
The program being debugged was signaled while in a function called from GDB.
GDB remains in the frame where the signal was received.
To change this behavior use "set unwindonsignal on".
Evaluation of the expression containing the function
(win) will be abandoned.
When the function is done executing, GDB will silently stop.
```

查看一下`win()`的代码：

```plain
   0x00005b9bc84e6951 <+0>:     endbr64 
   0x00005b9bc84e6955 <+4>:     push   %rbp
   0x00005b9bc84e6956 <+5>:     mov    %rsp,%rbp
   0x00005b9bc84e6959 <+8>:     sub    $0x10,%rsp
   0x00005b9bc84e695d <+12>:    movq   $0x0,-0x8(%rbp)
   0x00005b9bc84e6965 <+20>:    mov    -0x8(%rbp),%rax
=> 0x00005b9bc84e6969 <+24>:    mov    (%rax),%eax
   0x00005b9bc84e696b <+26>:    lea    0x1(%rax),%edx
   0x00005b9bc84e696e <+29>:    mov    -0x8(%rbp),%rax
   0x00005b9bc84e6972 <+33>:    mov    %edx,(%rax)
   0x00005b9bc84e6974 <+35>:    lea    0x73e(%rip),%rdi        # 0x5b9bc84e70b9
   0x00005b9bc84e697b <+42>:    callq  0x5b9bc84e6180 <puts@plt>
   0x00005b9bc84e6980 <+47>:    mov    $0x0,%esi
   0x00005b9bc84e6985 <+52>:    lea    0x749(%rip),%rdi        # 0x5b9bc84e70d5
   0x00005b9bc84e698c <+59>:    mov    $0x0,%eax
   0x00005b9bc84e6991 <+64>:    callq  0x5b9bc84e6240 <open@plt>
   0x00005b9bc84e6996 <+69>:    mov    %eax,0x26a4(%rip)        # 0x5b9bc84e9040 <flag_fd.5712>
   0x00005b9bc84e699c <+75>:    mov    0x269e(%rip),%eax        # 0x5b9bc84e9040 <flag_fd.5712>
   0x00005b9bc84e69a2 <+81>:    test   %eax,%eax
   0x00005b9bc84e69a4 <+83>:    jns    0x5b9bc84e69ef <win+158>
```



```plain
set $rip = 0x5bb43cb6b980 	#实际上从win+35到win+47都行
c
```