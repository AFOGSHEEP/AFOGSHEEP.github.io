---
title: Assembly Crash Course record
date: 2025-01-09 16:16:48
categories:
  - 学习笔记
tags:
  - 网安
---

## set-register
题目要求：

In this level, you will be working with registers. You will be asked to modify or read from registers.

In this level, you will work with registers! Please set the following: 

```plain
rdi = 0x1337
```

似乎很简单，要求我们将 rdi 的值设置成 `0x1337`，但是会得到

<font style="background-color:#f3bb2f;">"WARNING: It looks like your input might not be assembled binary code, but assembly source code. This challenge needs the raw binary assembled code as input."</font>

程序并不能理解我们输入的汇编代码，所以我们要使用 pwntools 的工具来构造机器码。

```python
from pwn import *
context.arch='amd64'
p=process('/challenge/run')
p.recvline()#这行代码从进程 p 中接收一行数据。它会读取数据直到遇到换行符##（\n），然后返回这一行的内容。默认情况下，recvline() 会保留行尾的换行符。在这里，它用于读取目标程序输出的第一行数据，可能是程序的提示信息或其他初始输出，以便知#道程序已经准备好接收后续的输入。
p.send(asm('mov rdi,0x1337'))
print(p.readallS())#首先调用 p.readall() 函数，读取进程 p 的所有剩余输出直到进程结束。它会阻塞当前线程，直到目标进程关闭其输出流。并自动转换成字符串，之后用print()输出
```

得到 `flag:pwn.college{QRxMx73Zr7Op3kSe-GPyic6TjdY.0FN5EDL4EDOxYzW}`

## set-multiple-registers
In this level, you will be working with registers. You will be asked to modify or read from registers.

In this level, you will work with multiple registers. Please set the following:

+ `rax = 0x1337`
+ `r12 = 0xCAFED00D1337BEEF`
+ `rsp = 0x31337`

类似的题目，从设置一个寄存器变为了设置多个

```python
from pwn import *
context.arch = 'amd64'
p = process('/challenge/run')
p.recv()
p.send(asm('''
    mov rax ,0x1337
    mov r12 ,0xCAFED00D1337BEEF
    mov rsp ,0x31337

'''))
print(p.recvall())
```

## add-to-register
In this level, you will be working with registers. You will be asked to modify or read from registers.

We will set some values in memory dynamically before each run. On each run, the values will change. This means you will need to perform some formulaic operation with registers. We will tell you which registers are set beforehand and where you should put the result. In most cases, it's `rax`.

Many instructions exist in x86 that allow you to perform all the normal math operations on registers and memory.

For shorthand, when we say `A += B`, it really means `A = A + B`.

Here are some useful instructions:

+ `add reg1, reg2` <=> `reg1 += reg2`
+ `sub reg1, reg2` <=> `reg1 -= reg2`
+ `imul reg1, reg2` <=> `reg1 *= reg2`

`div` is more complicated, and we will discuss it later. Note: all `regX` can be replaced by a constant or memory location.

Do the following:

+ Add `0x331337` to `rdi`

要求对寄存器进行加法。

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    add rdi, 0x331337'''))
print(p.recvallS())

```





得到 `flag:pwn.college{oQeaHikpX98CEqAk6biPBYRAxUc.0VN5EDL4EDOxYzW}`





## linear-equation-registers
In this level, you will be working with registers. You will be asked to modify or read from registers.

We will now set some values in memory dynamically before each run. On each run, the values will change. This means you will need to do some type of formulaic operation with registers. We will tell you which registers are set beforehand and where you should put the result. In most cases, it's `rax`.

Using your new knowledge, please compute the following:

```plain
f(x) = mx + b
```

, where:

    - `m = rdi`
    - `x = rsi`
    - `b = rdx`

Place the result into `rax`.

Note: There is an important difference between `mul` (unsigned multiply) and `imul` (signed multiply) in terms of which registers are used. Look at the documentation on these instructions to see the difference.

In this case, you will want to use `imul`.



练习一下乘法

```python
from pwn import *
context.arch = 'amd64'
p= process("/challenge/run")
p.recvline()
p.send(asm('''
    xor rax,rax		#初始化寄存器
    imul rdi,rsi
    mov rax,rdx
    add rax,rdi
'''))
print(p.recvall())
```

获取答案。后面还是不要直接写出 flag 了。



## integer-division
Division in x86 is more special than in normal math. Math here is called integer math, meaning every value is a whole number.

As an example: `10 / 3 = 3` in integer math.

Why?

Because `3.33` is rounded down to an integer.

The relevant instructions for this level are:

+ `mov rax, reg1`
+ `div reg2`

Note: `div` is a special instruction that can divide a 128-bit dividend by a 64-bit divisor while storing both the quotient and the remainder, using only one register as an operand.

How does this complex `div` instruction work and operate on a 128-bit dividend (which is twice as large as a register)?

For the instruction `div reg`, the following happens:

+ `rax = rdx:rax / reg`
+ `rdx = remainder`

`rdx:rax` means that `rdx` will be the upper 64-bits of the 128-bit dividend and `rax` will be the lower 64-bits of the 128-bit dividend.

You must be careful about what is in `rdx` and `rax` before you call `div`.

Please compute the following:

```plain
speed = distance / time
```

, where:

    - `distance = rdi`
    - `time = rsi`
    - `speed = rax`

Note that distance will be at most a 64-bit value, so `rdx` should be 0 when dividing.

在 x86 汇编中，`div` 指令用于执行整数除法，它可以将一个 128 位的被除数除以一个 64 位的除数，并同时存储商和余数。这个指令的特殊之处在于它使用了两个寄存器来表示被除数：`rdx` 和 `rax`。其中，`rdx` 存储被除数的高 64 位，而 `rax` 存储被除数的低 64 位。

在执行 `div reg` 指令时，以下操作会发生：

1. `rax` 寄存器将被设置为 `rdx:rax`（即由 `rdx` 和 `rax` 组成的 128 位数）除以 `reg` 的商。
2. `rdx` 寄存器将被设置为除法的余数。

接下来就是练习除法

```python
from pwn import *
context.arch = 'amd64'
p= process("/challenge/run")
p.recv()
p.send(asm('''
    mov rax,rdi
    xor rdx,rdx
    div rsi
'''))
print(p.recvall())
```



## module-opretion
Modulo in assembly is another interesting concept!

x86 allows you to get the remainder after a `div` operation.

For instance: `10 / 3` results in a remainder of `1`.

The remainder is the same as modulo, which is also called the "mod" operator.

In most programming languages, we refer to mod with the symbol `%`.

Please compute the following: `rdi % rsi`

Place the value in `rax`.

关于模的运算。但是 x86 没有直接求模的运算。所以需要手动算一下。

```python
from pwn import *
context.arch = 'amd64'
p= process("/challenge/run")
p.recv()
p.send(asm('''
    xor rdx,rdx
    mov rax,rdi
    div rsi
    xor rax,rax
    mov rax,rdx
'''))
print(p.recvall())
```

记得寄存器用前要清零，还有就是一般用 `rax` 作为函数返还数值的寄存器。



## set-upper-byte
Another cool concept in x86 is the ability to independently access the lower register bytes.

Each register in x86_64 is 64 bits in size, and in the previous levels, we have accessed the full register using `rax`, `rdi`, or `rsi`.

We can also access the lower bytes of each register using different register names.

For example, the lower 32 bits of `rax` can be accessed using `eax`, the lower 16 bits using `ax`, and the lower 8 bits using `al`.

```plain
MSB                                    LSB
+----------------------------------------+
|                   rax                  |
+--------------------+-------------------+
                     |        eax        |
                     +---------+---------+
                               |   ax    |
                               +----+----+
                               | ah | al |
                               +----+----+
```

Lower register bytes access is applicable to almost all registers.

Using only one move instruction, please set the upper 8 bits of the `ax` register to `0x42`.

介绍了 `x86` 架构中寄存器的特性——寄存器可以被划分为不同的部分，以便可以单独访问其部分位。这种设计允许程序员更灵活地处理数据，尤其是在需要对数据的特定部分进行操作时。

以 `rax` 寄存器为例，它是一个 64 位的寄存器，可以被分为不同的部分：

+ `rax`：整个 64 位寄存器。
+ `eax`：`rax` 的低 32 位。
+ `ax`：`eax` 的低 16 位。
+ `al`：`ax` 的低 8 位。
+ `ah`：`ax` 的高 8 位。

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov ah,0x42

'''
))
output = p.recvall().decode()  

print(output)  
```

补充:

MSB 和 LSB 是位的两种称呼：

+ **MSB (Most Significant Bit)**：最高有效位。在二进制数中，MSB 是位于最左侧的位，具有最大的数值权重。例如，在一个 8 位的二进制数 `10110101` 中，最左边的 `1` 就是 MSB，它代表了 `2^7` 的权重。
+ **LSB (Least Significant Bit)**：最低有效位。在二进制数中，LSB 是位于最右侧的位，具有最小的数值权重。例如，在同一个 8 位的二进制数 `10110101` 中，最右边的 `1` 就是 LSB，它代表了 `2^0` 的权重。

常用寄存器

| x64 调用约定 | 64 位寄存器 | 32 位寄存器 | 16 位寄存器 | 8 位寄存器（低） | 8 位寄存器（高） |
| --- | --- | --- | --- | --- | --- |
| 函数返回值 | rax | eax | ax | al | al |
|  | rbx | ebx | bx | bl | bl |
| 第四个参数 | rcx | ecb | cx | cl | cl |
| 第三个参数 | rdx | edx | dx | dl | dl |
| 第一个参数 | rdi | edi | di | dil |  |
| 第二个参数 | rsi | esi | si | sil |  |
| 下一条指令的地址 | rip | eip | ip |  |  |
| 栈底指针 | rbp | ebp | bp | bpl |  |
| 栈顶指针 | rsp | esp | sp | spl |  |
| 第五个参数 | r8 | r8d | r8w | r8b |  |
| 第六个参数 | r9 | r9d | r9w | r9b |  |


## efficient-modulo
It turns out that using the `div` operator to compute the modulo operation is slow!

We can use a math trick to optimize the modulo operator (`%`). Compilers use this trick a lot.

If we have `x % y`, and `y` is a power of 2, such as `2^n`, the result will be the lower `n` bits of `x`.

Therefore, we can use the lower register byte access to efficiently implement modulo!

Using only the following instruction(s):

+ `mov`

Please compute the following:

+ `rax = rdi % 256`
+ `rbx = rsi % 65536`

如何使用寄存器的低位字节来高效地实现模运算？不难发现，当模数是 2 的幂时，例如 2^n，模数就是低 n 位，也就是说可以通过直接取寄存器的低位字节来得到模运算的结果。

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov al, dil
    mov bx, si
'''
))
output = p.recvall().decode()  
print(output)  
```



## byte-extraction
Shifting bits around in assembly is another interesting concept!

x86 allows you to 'shift' bits around in a register.

Take, for instance, `al`, the lowest 8 bits of `rax`.

The value in `al` (in bits) is:

```plain
rax = 10001010
```

If we shift once to the left using the `shl` instruction:

```plain
shl al, 1
```

The new value is:

```plain
al = 00010100
```

Everything shifted to the left, and the highest bit fell off while a new 0 was added to the right side.

You can use this to do special things to the bits you care about.

Shifting has the nice side effect of doing quick multiplication (by 2) or division (by 2), and can also be used to compute modulo.

Here are the important instructions:

+ `shl reg1, reg2` <=> Shift `reg1` left by the amount in `reg2`
+ `shr reg1, reg2` <=> Shift `reg1` right by the amount in `reg2`

Note: 'reg2' can be replaced by a constant or memory location.

Using only the following instructions:

+ `mov`, `shr`, `shl`

Please perform the following: Set `rax` to the 5th least significant byte of `rdi`.

For example:

```plain
rdi = | B7 | B6 | B5 | B4 | B3 | B2 | B1 | B0 |
Set rax to the value of B4
```

移位时最高位遗弃，填充最低位置零。`shl rax, rbx` 意思是 rax 左移 rbx 的值，rbx 为 8 则左移 8 位。

当一个寄存器的高位都是 0 时，读取的数值实际上就是其最低有效位（LSB）部分的值。这是因为高位的 0 对数值没有贡献。

例如，假设有一个 64 位寄存器，其值为：

```plain
00000000000000000000000000000000000000000000000000000000001010
```

这个寄存器的值实际上是 10（十进制），因为只有最低的 4 位是有效的（`1010` 表示的是 10）。高位的 0 并不影响最终的数值。

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    shl rdi,24
    shr rdi,56
    mov rax,rdi'''
))
output = p.recvall().decode()  
print(output)  
```

## bitwise-and
In this level, you will be working with bit logic and operations. This will involve heavy use of directly interacting with bits stored in a register or memory location. You will also likely need to make use of the logic instructions in x86: `and`, `or`, `not`, `xor`.

Bitwise logic in assembly is yet another interesting concept! x86 allows you to perform logic operations bit by bit on registers.

For the sake of this example, say registers only store 8 bits.

The values in `rax` and `rbx` are:

+ `rax = 10101010`
+ `rbx = 00110011`

If we were to perform a bitwise AND of `rax` and `rbx` using the `and rax, rbx` instruction, the result would be calculated by ANDing each bit pair one by one, hence why it's called bitwise logic.

So from left to right:

+ 1 AND 0 = 0
+ 0 AND 0 = 0
+ 1 AND 1 = 1
+ 0 AND 1 = 0
+ ...

Finally, we combine the results together to get:

+ `rax = 00100010`

Without using the following instructions: `mov`, `xchg`, please perform the following:

Set `rax` to the value of `(rdi AND rsi)`

学习 `x86` 中的逻辑运算符，此处是 `and`

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    xor rax,rax
    and rdi,rsi
    add rax,rdi		#题目要求不能直接用mov,那就先初始化后加上
'''
))
output = p.recvall().decode()  
print(output)  

```

## check-even
In this level, you will be working with bit logic and operations. This will involve heavy use of directly interacting with bits stored in a register or memory location. You will also likely need to make use of the logic instructions in x86: `and`, `or`, `not`, `xor`.

Using only the following instructions:

+ `and`
+ `or`
+ `xor`

Implement the following logic:

```plain
if x is even then
  y = 1
else
  y = 0
```

Where:

+ `x = rdi`
+ `y = rax`

经典的判断奇偶性，但是 `x86` 只用逻辑运算符

二进制下的数字的奇偶性由最低位的那个 `1` 来决定，因为其他位置的变化都是在十进制下增减 `2` 的倍数。

故先用 `add` 运算来提取出最低位的数字，题目要求正好和当前结果相反，用 `xor` 来获得相对的数。最后把这个数字打入清零后的 `rax` 即可

```python
from pwn import *

context.arch = 'amd64'
p = process('/challenge/run')

p.recvline()
p.send(asm('''
    and rdi,1
    xor rdi,1
    xor rax,rax
    or rax,rdi
'''
          ))
output = p.recvall().decode()  
print(output)  

```

## memory-read
Recall that memory can be addressed, and each address contains something at that location. Note that this is similar to addresses in real life!

As an example: the real address '699 S Mill Ave, Tempe, AZ 85281' maps to the 'ASU Brickyard'. We would also say it points to 'ASU Brickyard'. We can represent this like:

```plain
['699 S Mill Ave, Tempe, AZ 85281'] = 'ASU Brickyard'
```

The address is special because it is unique. But that also does not mean other addresses can't point to the same thing (as someone can have multiple houses).

Memory is exactly the same!

For instance, the address in memory where your code is stored (when we take it from you) is `0x400000`.

In x86, we can access the thing at a memory location, called dereferencing, like so:

```plain
mov rax, [some_address]        <=>     Moves the thing at 'some_address' into rax
```

This also works with things in registers:

```plain
mov rax, [rdi]         <=>     Moves the thing stored at the address of what rdi holds to rax
```

This works the same for writing to memory:

```plain
mov [rax], rdi         <=>     Moves rdi to the address of what rax holds.
```

So if `rax` was `0xdeadbeef`, then `rdi` would get stored at the address `0xdeadbeef`:

```plain
[0xdeadbeef] = rdi
```

Note: Memory is linear, and in x86_64, it goes from `0` to `0xffffffffffffffff` (yes, huge).

Please perform the following: Place the value stored at `0x404000` into `rax`. Make sure the value in `rax` is the original value stored at `0x404000`.

类似上个模块里的练习，不过这次得通过 `pwntools` 给的渠道而不是直接运行汇编代码。

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov rax,[0x404000]
'''
))
output = p.recvall().decode()  
print(output)  

```



## memory-write
In this level, you will be working with memory. This will require you to read or write to things stored linearly in memory. If you are confused, go look at the linear addressing module in 'ike. You may also be asked to dereference things, possibly multiple times, to things we dynamically put in memory for your use.

Please perform the following: Place the value stored in `rax` to `0x404000`.

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov [0x404000],rax
'''
))
output = p.recvall().decode()  
print(output)  

```

## memory-increment
In this level, you will be working with memory. This will require you to read or write to things stored linearly in memory. If you are confused, go look at the linear addressing module in 'ike. You may also be asked to dereference things, possibly multiple times, to things we dynamically put in memory for your use.

Please perform the following:

+ Place the value stored at `0x404000` into `rax`.
+ Increment the value stored at the address `0x404000` by `0x1337`.

Make sure the value in `rax` is the original value stored at `0x404000` and make sure that `[0x404000]` now has the incremented value.

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov rax,[0x404000]
    mov rsi,0x1337
    add [0x404000],rsi
'''
))
output = p.recvall().decode()  
print(output)  

```

记得灵活运用可以调用的寄存器

更多相关信息参考 **<font style="background-color:#f3bb2f;">汇编的寻址模式和过程调用约定</font>**

## byte-access
Recall that registers in x86_64 are 64 bits wide, meaning they can store 64 bits. Similarly, each memory location can be treated as a 64-bit value. We refer to something that is 64 bits (8 bytes) as a quad word.

Here is the breakdown of the names of memory sizes:

+ Quad Word = 8 Bytes = 64 bits
+ Double Word = 4 bytes = 32 bits
+ Word = 2 bytes = 16 bits
+ Byte = 1 byte = 8 bits

In x86_64, you can access each of these sizes when dereferencing an address, just like using bigger or smaller register accesses:

+ `mov al, [address]` <=> moves the least significant byte from address to `rax`
+ `mov ax, [address]` <=> moves the least significant word from address to `rax`
+ `mov eax, [address]` <=> moves the least significant double word from address to `rax`
+ `mov rax, [address]` <=> moves the full quad word from address to `rax`

Remember that moving into `al` does not fully clear the upper bytes.

Please perform the following: Set `rax` to the byte at `0x404000`.

**四字 = 8 字节 = 64bits**

**双字 = 4 字节 = 32bits**

**字 = 2 字节 = 16bits**

**1 字节 = 8bits**

**rax = 四字**

**eax = 双字**

**ax = 字**

**al = 字节**

按要求给寄存器按字节设置即可

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov al,[0x404000]
'''
))
output = p.recvall().decode()  
print(output)  

```

## memory-size-access
Recall the following:

+ The breakdown of the names of memory sizes:
    - Quad Word = 8 Bytes = 64 bits
    - Double Word = 4 bytes = 32 bits
    - Word = 2 bytes = 16 bits
    - Byte = 1 byte = 8 bits

In x86_64, you can access each of these sizes when dereferencing an address, just like using bigger or smaller register accesses:

+ `mov al, [address]` <=> moves the least significant byte from address to `rax`
+ `mov ax, [address]` <=> moves the least significant word from address to `rax`
+ `mov eax, [address]` <=> moves the least significant double word from address to `rax`
+ `mov rax, [address]` <=> moves the full quad word from address to `rax`

Please perform the following:

+ Set `rax` to the byte at `0x404000`
+ Set `rbx` to the word at `0x404000`
+ Set `rcx` to the double word at `0x404000`
+ Set `rdx` to the quad word at `0x404000`

加量训练

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov al,[0x404000]
    mov bx,[0x404000]
    mov ecx,[0x404000]
    mov rdx,[0x404000]
'''
))
output = p.recvall().decode()  
print(output)  

```

不记得该用哪个寄存器可以去七号题 `set-upper-byte` 回忆一下

## little-endian-write
It is worth noting, as you may have noticed, that values are stored in reverse order of how we represent them.

As an example, say:

```plain
[0x1330] = 0x00000000deadc0de
```

If you examined how it actually looked in memory, you would see:

```plain
[0x1330] = 0xde
[0x1331] = 0xc0
[0x1332] = 0xad
[0x1333] = 0xde
[0x1334] = 0x00
[0x1335] = 0x00
[0x1336] = 0x00
[0x1337] = 0x00
```

This format of storing things in 'reverse' is intentional in x86, and it's called "Little Endian".

For this challenge, we will give you two addresses created dynamically each run.

The first address will be placed in `rdi`. The second will be placed in `rsi`.

Using the earlier mentioned info, perform the following:

+ Set `[rdi] = 0xdeadbeef00001337`
+ Set `[rsi] = 0xc0ffee0000`

Hint: it may require some tricks to assign a big constant to a dereferenced register. Try setting a register to the constant value, then assigning that register to the dereferenced register.

小端序以字为单位逆顺序排列，题目给了个提示：要将一个大常量赋值给一个内存地址，可以将大常量先加载到一个寄存器中，然后将寄存器的值存储到内存地址处。依次赋值即可。

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov rax,0xdeadbeef00001337
    mov [rdi],rax
    mov rax,0xc0ffee0000
    mov [rsi],rax
'''
))
output = p.recvall().decode()  
print(output)  

```

## memory-sum
Recall that memory is stored linearly.

What does that mean?

Say we access the quad word at `0x1337`:

```plain
[0x1337] = 0x00000000deadbeef
```

The real way memory is laid out is byte by byte, little endian:

```plain
[0x1337] = 0xef
[0x1337 + 1] = 0xbe
[0x1337 + 2] = 0xad
...
[0x1337 + 7] = 0x00
```

What does this do for us?

Well, it means that we can access things next to each other using offsets, similar to what was shown above.

Say you want the 5th _byte_ from an address, you can access it like:

```plain
mov al, [address+4]
```

Remember, offsets start at 0.

Perform the following:

+ Load two consecutive quad words from the address stored in `rdi`.
+ Calculate the sum of the previous steps' quad words.
+ Store the sum at the address in `rsi`.

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov rax,[rdi]
    add rax,[rdi+8]
    mov [rsi],rax 	#不要忘记给rsi添加括号，不然就只是修改寄存器的值而不是指向的内存地址中的值
'''
))
output = p.recvall().decode()  
print(output)  

```



## stack-subtraction
In these levels, we are going to introduce the stack.

The stack is a region of memory that can store values for later.

To store a value on the stack, we use the `push` instruction, and to retrieve a value, we use `pop`.

The stack is a last in, first out (LIFO) memory structure, and this means the last value pushed is the first value popped.

Imagine unloading plates from the dishwasher. Let's say there are 1 red, 1 green, and 1 blue. First, we place the red one in the cabinet, then the green on top of the red, then the blue.

Our stack of plates would look like:

```plain
Top ----> Blue
          Green
Bottom -> Red
```

Now, if we wanted a plate to make a sandwich, we would retrieve the top plate from the stack, which would be the blue one that was last into the cabinet, ergo the first one out.

On x86, the `pop` instruction will take the value from the top of the stack and put it into a register.

Similarly, the `push` instruction will take the value in a register and push it onto the top of the stack.

Using these instructions, take the top value of the stack, subtract `rdi` from it, then put it back.

终于学到栈了/(ㄒoㄒ)/~~。

想象一下你有一叠书放在桌子上，你只能从最上面拿书或放书，不能从中间或底部操作。这就像一个栈，只能从栈顶进行操作。

+ **入栈（Push）**：
    - **比喻**：就像在书堆的最上面再放一本书。
    - **操作**：将一个新元素添加到栈顶。在计算机中，这通常意味着将数据存储到栈的顶部，并更新栈指针（指向栈顶的指针）。
    - **效果**：栈的大小增加，新元素成为栈顶元素。
+ **出栈（Pop）**：
    - **比喻**：从书堆的最上面拿走一本书。
    - **操作**：从栈顶移除一个元素，并返回该元素的值。同时更新栈指针。
    - **效果**：栈的大小减少，原来位于栈顶下面的元素成为新的栈顶元素。
+ **查看栈顶（Peek）**：
    - **比喻**：查看书堆最上面的书是什么，但不拿走它。
    - **操作**：获取栈顶元素的值，但不移除该元素。
    - **效果**：栈的大小和内容不变，只是查看了栈顶元素。

他这里没提具体用汇编代码如何操作，其实直接`pop`弹出，`push`压入即可。

栈是一种线性数据结构，遵循“后进先出”（Last In, First Out, LIFO）的原则。这意味着最后放入栈中的元素将是第一个被取出的元素。由于寄存器数量有限，使用栈来储存数据便是一个极佳的选择。后面会经常和它打交道。

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    pop rax
    sub,rax,rdi
    push rax
'''
))
output = p.recvall().decode()  
print(output)  

```

## swap-satck-values
In this level, you will be working with the stack, the memory region that dynamically expands and shrinks. You will be required to read and write to the stack, which may require you to use the `pop` and `push` instructions. You may also need to use the stack pointer register (`rsp`) to know where the stack is pointing.

In this level, we are going to explore the last in first out (LIFO) property of the stack.

Using only the following instructions:

+ `push`
+ `pop`

Swap values in `rdi` and `rsi`.

Example:

+ If to start `rdi = 2` and `rsi = 5`
+ Then to end `rdi = 5` and `rsi = 2`

仅用`pop`和`push`进行数值交换，栈的基本用法

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    push rdi
    pop rax
    push rsi
    pop rdi
    push rax
    pop rsi
'''
))
output = p.recvall().decode()  
print(output)  

```

## average-stack-values
In the previous levels, you used `push` and `pop` to store and load data from the stack. However, you can also access the stack directly using the stack pointer.

On x86, the stack pointer is stored in the special register, `rsp`. `rsp` always stores the memory address of the top of the stack, i.e., the memory address of the last value pushed.

Similar to the memory levels, we can use `[rsp]` to access the value at the memory address in `rsp`.

Without using `pop`, please calculate the average of 4 consecutive quad words stored on the stack. Push the average on the stack.

Hint:

+ `RSP+0x??` Quad Word A
+ `RSP+0x??` Quad Word B
+ `RSP+0x??` Quad Word C
+ `RSP` Quad Word D

介绍了栈指针`rsp`,提示了我们用栈指针的具体操作。

+ **栈指针的操作**：
    - **入栈（Push）**：将数据推入栈时，`RSP`会减小（向下移动），因为x86-64架构的栈是向下增长的。
    - **出栈（Pop）**：从栈中弹出数据时，`RSP`会增加（向上移动）。
    - **直接访问**：可以通过`[RSP + offset]`的形式直接访问栈上的数据，其中`offset`是相对于栈顶的偏移量。

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov rax,[rsp]
    add rax,[rsp+8]
    add rax,[rsp+16]
    add rax,[rsp+24]
    mov rsi,4			; rax存储被除数的低 64 位。
    div rsi	
    push rax
'''
))
output = p.recvall().decode()  
print(output)  

```

## abusolute-jump
Earlier, you learned how to manipulate data in a pseudo-control way, but x86 gives us actual instructions to manipulate control flow directly.

There are two major ways to manipulate control flow:

+ Through a jump
+ Through a call

In this level, you will work with jumps.

There are two types of jumps:

+ Unconditional jumps
+ Conditional jumps

Unconditional jumps always trigger and are not based on the results of earlier instructions.

As you know, memory locations can store data and instructions. Your code will be stored at `0x400042` (this will change each run).

For all jumps, there are three types:

+ Relative jumps: jump + or - the next instruction.
+ Absolute jumps: jump to a specific address.
+ Indirect jumps: jump to the memory address specified in a register.

In x86, absolute jumps (jump to a specific address) are accomplished by first putting the target address in a register `reg`, then doing `jmp reg`.

In this level, we will ask you to do an absolute jump. Perform the following: Jump to the absolute address `0x403000`.

x86_64用法 jmp 

绝对跳转和相对跳转也是两个经久不衰的话题。题目里说到的`reg`其实就是regitser，寄存器的缩写，并不是特指某一个寄存器。当然jmp指令也不能直接给出地址进行跳转，必须要用寄存器作为中介。

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    mov rax,0x403000
    jmp rax
'''
))
output = p.recvall().decode()  
print(output)  

```

## relative-jump
Recall that for all jumps, there are three types:

+ Relative jumps
+ Absolute jumps
+ Indirect jumps

In this level, we will ask you to do a relative jump. You will need to fill space in your code with something to make this relative jump possible. We suggest using the `nop` instruction. It's 1 byte long and very predictable.

In fact, the assembler that we're using has a handy `.rept` directive that you can use to repeat assembly instructions some number of times: [GNU Assembler Manual](https://ftp.gnu.org/old-gnu/Manuals/gas-2.9.1/html_chapter/as_7.html)

Useful instructions for this level:

+ `jmp (reg1 | addr | offset)`
+ `nop`

Hint: For the relative jump, look up how to use `labels` in x86.

Using the above knowledge, perform the following:

+ Make the first instruction in your code a `jmp`.
+ Make that `jmp` a relative jump to 0x51 bytes from the current position.
+ At the code location where the relative jump will redirect control flow, set `rax` to 0x1.

头一次看晕乎乎的，问了几遍kimi终于明白了。

题目要求的相对跳转实际上是通过设置一个`label`地址后，不断填充无意义的`nop`空指令来实现的跳转。当我们执行到`label`时，结果的确是相对于目前的地址进行了一定字节的跳转。

` .rept 0x??`

`instructions`

`  .endr`

相当于一个循环语句.

`address`是一个标签（label）,它用于标记代码中的某个位置,通常用于指示跳转指令的目标位置或其他重要的代码段。



```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    jmp address
    .rept 0x51
    nop
    .endr
    address:
    mov rax,0x1
'''
))
output = p.recvall().decode()  
print(output)  

```

关于代码的可能问题：

1. **执行**`jmp address`**指令**：
    - 这条指令告诉CPU跳转到`address`标签所标记的位置。由于`address`标签标记的是`mov rax, 0x1`指令的起始位置，所以CPU会跳过接下来的81个`nop`指令，直接跳转到`mov rax, 0x1`指令处开始执行。
2. **跳转到**`address`**标签后，执行**`mov rax, 0x1`**指令**：
    - 在跳转到`address`标签后，CPU会执行`mov rax, 0x1`指令，将`rax`寄存器的值设置为1。
3. **关于81个**`nop`**指令**
+ **填充作用**：这81个`nop`指令实际上是用来填充代码空间的。它们确保从`jmp address`指令到`address`标签之间的距离正好是81字节。这是为了满足相对跳转的要求，使得`jmp`指令能够正确地跳转到目标位置。
+ **不执行**：在程序执行过程中，这81个`nop`指令并不会被实际执行。因为`jmp address`指令已经将控制流跳转到了`address`标签处，所以CPU会跳过这些`nop`指令，直接执行`mov rax, 0x1`指令。



## jump-trampoline
Now, we will combine the two prior levels and perform the following:

+ Create a two jump trampoline:
    - Make the first instruction in your code a `jmp`.
    - Make that `jmp` a relative jump to 0x51 bytes from its current position.
    - At 0x51, write the following code:
        * Place the top value on the stack into register `rdi`.
        * `jmp` to the absolute address 0x403000.

熟悉下刚学到的两种跳转方式

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
 
p.recvline()
p.send(asm('''
    jmp address
    .rept 0x51
    nop
    .endr
    address:
    pop rax
    mov rdi,rax
    mov rsi,0x403000
    jmp rsi
'''
))
output = p.recvall().decode()  
print(output)  

```





## conditional-jump
In this level, you will be working with control flow manipulation. This involves using instructions to both indirectly and directly control the special register `rip`, the instruction pointer. You will use instructions such as `jmp`, `call`, `cmp`, and their alternatives to implement the requested behavior.

We will be testing your code multiple times in this level with dynamic values! This means we will be running your code in a variety of random ways to verify that the logic is robust enough to survive normal use.

We will now introduce you to conditional jumps--one of the most valuable instructions in x86. In higher-level programming languages, an if-else structure exists to do things like:

```plain
if x is even:
    is_even = 1
else:
    is_even = 0
```

This should look familiar since it is implementable in only bit-logic, which you've done in a prior level. In these structures, we can control the program's control flow based on dynamic values provided to the program.

Implementing the above logic with jmps can be done like so:

```plain
; assume rdi = x, rax is output
; rdx = rdi mod 2
mov rax, rdi
mov rsi, 2
div rsi
; remainder is 0 if even
cmp rdx, 0
; jump to not_even code if it's not 0
jne not_even
; fall through to even code
mov rbx, 1
jmp done
; jump to this only when not_even
not_even:
mov rbx, 0
done:
mov rax, rbx
; more instructions here
```

Often though, you want more than just a single 'if-else'. Sometimes you want two if checks, followed by an else. To do this, you need to make sure that you have control flow that 'falls-through' to the next `if` after it fails. All must jump to the same `done` after execution to avoid the else.

There are many jump types in x86, it will help to learn how they can be used. Nearly all of them rely on something called the ZF, the Zero Flag. The ZF is set to 1 when a `cmp` is equal, 0 otherwise.

Using the above knowledge, implement the following:

```plain
if [x] is 0x7f454c46:
    y = [x+4] + [x+8] + [x+12]
else if [x] is 0x00005A4D:
    y = [x+4] - [x+8] - [x+12]
else:
    y = [x+4] * [x+8] * [x+12]
```

Where:

+ `x = rdi`, `y = rax`.

Assume each dereferenced value is a signed dword. This means the values can start as a negative value at each memory position.

A valid solution will use the following at least once:

+ `jmp` (any variant), `cmp`

接下来的挑战是进行流操作，后悔没在下午开始学。。最后十道题几乎要花上做之前二十道两倍的时间。。。😭😭😭😅😅😅

还好有没脾气的ai，不然去discord或者bing上早不知道要猴年马月才能做完。

```python
from pwn import *
 
context.update(arch="amd64")
p = process("/challenge/run")
p.write(asm("""
mov eax, [rdi]
mov ebx, [rdi + 4]
mov ecx, [rdi + 8]
mov edx, [rdi + 12]
 
cmp eax, 0x7f454c46
je con1
 
cmp eax, 0x00005A4D
je con2
 
imul ebx, ecx
imul ebx, edx
jmp done
 
con1:
add ebx, ecx
add ebx, edx
jmp done
 
con2:
sub ebx, ecx
sub ebx, edx
done:
mov eax, ebx"""))
output = p.recvall().decode()  
print(output)  

```



## indirect-jump
The last jump type is the indirect jump, often used for switch statements in the real world. Switch statements are a special case of if-statements that use only numbers to determine where the control flow will go.

Here is an example:

```plain
switch(number):
  0: jmp do_thing_0
  1: jmp do_thing_1
  2: jmp do_thing_2
  default: jmp do_default_thing
```

The switch in this example works on `number`, which can either be 0, 1, or 2. If `number` is not one of those numbers, the default triggers. You can consider this a reduced else-if type structure. In x86, you are already used to using numbers, so it should be no surprise that you can make if statements based on something being an exact number. Additionally, if you know the range of the numbers, a switch statement works very well.

Take, for instance, the existence of a jump table. A jump table is a contiguous section of memory that holds addresses of places to jump.

In the above example, the jump table could look like:

```plain
[0x1337] = address of do_thing_0
[0x1337+0x8] = address of do_thing_1
[0x1337+0x10] = address of do_thing_2
[0x1337+0x18] = address of do_default_thing
```

Using the jump table, we can greatly reduce the amount of `cmps` we use. Now all we need to check is if `number` is greater than 2. If it is, always do:

```plain
jmp [0x1337+0x18]
```

Otherwise:

```plain
jmp [jump_table_address + number * 8]
```

Using the above knowledge, implement the following logic:

```plain
if rdi is 0:
  jmp 0x40301e
else if rdi is 1:
  jmp 0x4030da
else if rdi is 2:
  jmp 0x4031d5
else if rdi is 3:
  jmp 0x403268
else:
  jmp 0x40332c
```

Please do the above with the following constraints:

+ Assume `rdi` will NOT be negative.
+ Use no more than 1 `cmp` instruction.
+ Use no more than 3 jumps (of any variant).
+ We will provide you with the number to 'switch' on in `rdi`.
+ We will provide you with a jump table base address in `rsi`.

Here is an example table:

```plain
[0x40427c] = 0x40301e (addrs will change)
[0x404284] = 0x4030da
[0x40428c] = 0x4031d5
[0x404294] = 0x403268
[0x40429c] = 0x40332c
```

学会使用跳转表来实现`switch`的功能，这就是底层代码。

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
p.send(asm('''
cmp rdi, 4
jae default
jmp [rsi + rdi * 8]
jmp end
default:
jmp [rsi + 4 * 8]
end:
nop
'''))
output = p.recvall().decode()  
print(output)  

```

## average-loop
In a previous level, you computed the average of 4 integer quad words, which was a fixed amount of things to compute. But how do you work with sizes you get when the program is running?

In most programming languages, a structure exists called the for-loop, which allows you to execute a set of instructions for a bounded amount of times. The bounded amount can be either known before or during the program's run, with "during" meaning the value is given to you dynamically.

As an example, a for-loop can be used to compute the sum of the numbers 1 to n:

```plain
sum = 0
i = 1
while i <= n:
    sum += i
    i += 1
```

Please compute the average of `n` consecutive quad words, where:

+ `rdi` = memory address of the 1st quad word
+ `rsi` = `n` (amount to loop for)
+ `rax` = average computed

就像是在实现高级语言

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
p.send(asm('''
    mov rax,0
    mov rcx,0
    loop_start:
        cmp rcx, rsi
        jge loop_end
        add rax, [rdi + rcx * 8]
        inc rcx
        jmp loop_start
    loop_end:
    div rsi
        
'''))
output = p.recvall().decode()  
print(output)  

```

## count-non-zero
In previous levels, you discovered the for-loop to iterate for a _number_ of times, both dynamically and statically known, but what happens when you want to iterate until you meet a condition?

A second loop structure exists called the while-loop to fill this demand. In the while-loop, you iterate until a condition is met.

As an example, say we had a location in memory with adjacent numbers and we wanted to get the average of all the numbers until we find one bigger or equal to `0xff`:

```plain
average = 0
i = 0
while x[i] < 0xff:
  average += x[i]
  i += 1
average /= i
```

Using the above knowledge, please perform the following:

Count the consecutive non-zero bytes in a contiguous region of memory, where:

+ `rdi` = memory address of the 1st byte
+ `rax` = number of consecutive non-zero bytes

Additionally, if `rdi = 0`, then set `rax = 0` (we will check)!

An example test-case, let:

+ `rdi = 0x1000`
+ `[0x1000] = 0x41`
+ `[0x1001] = 0x42`
+ `[0x1002] = 0x43`
+ `[0x1003] = 0x00`

Then: `rax = 3` should be set.

建构一下while循环

```python
from pwn import *
 
context.arch = 'amd64'
p = process('/challenge/run')
p.write(asm('''
    cmp rdi,0
    je set_zero
    
    xor rcx,rcx
    while_loop:
        cmp byte [rdi],0
        je end_loop
        inc rcx
        inc rdi
        jmp while_loop
    end_loop:
        mov rax,rcx
        jmp done
    
    set_zero:
    xor rax,rax
    
    done:
        
'''))
output = p.recvall().decode()  
print(output)  

```

注意,在x86-64汇编中，使用`cmp`指令比较内存中的值时，需要明确指定操作数的大小。提示“ambiguous operand size for `cmp`”

```bash
/tmp/pwn-asm-n0jy2att/step1: Assembler messages:
/tmp/pwn-asm-n0jy2att/step1:12: Error: ambiguous operand size for `cmp'
```

可以通过在`cmp`指令中明确指定操作数的大小，例如：

```plain
cmp byte ptr [rdi], 0
```

或者：

```plain
cmp dword ptr [rdi], 0
```

`ptr`,**Pointer**,汇编语言中，`ptr`是一个类型指示符，用于明确指定操作数的大小。使用`cmp`指令比较内存中的值时，汇编器可能不知道你是想比较一个字节、一个字（16位）、一个双字（32位）还是一个四字（64位）。通过加上`ptr`，你可以明确指定操作数的大小，从而消除歧义。

就像题目里，我们比较的是一个字节，所以要用`byte`指出。





## string-lower
In previous levels, you implemented a while loop to count the number of consecutive non-zero bytes in a contiguous region of memory.

In this level, you will be provided with a contiguous region of memory again and will loop over each performing a conditional operation till a zero byte is reached. All of which will be contained in a function!

A function is a callable segment of code that does not destroy control flow.

Functions use the instructions "call" and "ret".

The "call" instruction pushes the memory address of the next instruction onto the stack and then jumps to the value stored in the first argument.

Let's use the following instructions as an example:

```plain
0x1021 mov rax, 0x400000
0x1028 call rax
0x102a mov [rsi], rax
```

1. `call` pushes `0x102a`, the address of the next instruction, onto the stack.
2. `call` jumps to `0x400000`, the value stored in `rax`.

The "ret" instruction is the opposite of "call".

`ret` pops the top value off of the stack and jumps to it.

Let's use the following instructions and stack as an example:

```plain
Stack ADDR  VALUE
0x103f mov rax, rdx         RSP + 0x8   0xdeadbeef
0x1042 ret                  RSP + 0x0   0x0000102a
```

Here, `ret` will jump to `0x102a`.

Please implement the following logic:

```plain
str_lower(src_addr):
  i = 0
  if src_addr != 0:
    while [src_addr] != 0x00:
      if [src_addr] <= 0x5a:
        [src_addr] = foo([src_addr])
        i += 1
      src_addr += 1
  return i
```

`foo` is provided at `0x403000`. `foo` takes a single argument as a value and returns a value.

All functions (`foo` and `str_lower`) must follow the Linux amd64 calling convention (also known as System V AMD64 ABI): [System V AMD64 ABI](https://en.wikipedia.org/wiki/X86_calling_conventions#System_V_AMD64_ABI)

Therefore, your function `str_lower` should look for `src_addr` in `rdi` and place the function return in `rax`.

An important note is that `src_addr` is an address in memory (where the string is located) and `[src_addr]` refers to the byte that exists at `src_addr`.

Therefore, the function `foo` accepts a byte as its first argument and returns a byte.



注意foo函数返还的是一个字节大小的值，不能直接用al





```python
from pwn import *

context.arch = 'amd64'
p = process('/challenge/run')
p.write(asm('''
    cmp rdi, 0
    je return_0
    
    xor rcx, rcx
    
    while_loop:
        cmp byte ptr [rdi], 0
        je return_0
        
        mov al, byte ptr [rdi]
        cmp al, 0x5a
        jg next_byte
        
           mov rsi,rdi
        mov dil,al
        call rbx
        mov rdi,rsi
        mov byte ptr [rdi],al
        inc rcx
        
    next_byte:
        inc rdi
        jmp while_loop
    
        
    return_0:
        mov rax, rcx
        ret
'''))
output = p.recvall().decode()
print(output)
```

上面代码不对，暂时没有debug成功





以下是网上找到的通过的代码

```python
from pwn import *

context.arch = 'amd64'
p = process('/challenge/run')
p.write(asm('''
    str_lower:
    mov rbx, 0x403000       
    xor rcx, rcx            
    test rdi, rdi          
    jz done                 
process_string:
    mov al, byte ptr [rdi]  
    test al, al             
    jz done                
    cmp al, 0x5A           
    jg skip_conversion      
    mov rsi, rdi           
    mov dil, al             
    call rbx                
    mov rdi, rsi            
    mov byte ptr [rdi], al   
    inc rcx                 
skip_conversion:
    inc rdi                  
    jmp process_string       
done:
    mov rax, rcx             
    ret        
'''))
output = p.recvall().decode()
print(output)
```





## most-common-byte
A function stack frame is a set of pointers and values pushed onto the stack to save things for later use and allocate space on the stack for function variables.

First, let's talk about the special register `rbp`, the Stack Base Pointer.

The `rbp` register is used to tell where our stack frame first started. As an example, say we want to construct some list (a contiguous space of memory) that is only used in our function. The list is 5 elements long, and each element is a dword. A list of 5 elements would already take 5 registers, so instead, we can make space on the stack!

The assembly would look like:

```plain
; setup the base of the stack as the current top
mov rbp, rsp
; move the stack 0x14 bytes (5 * 4) down
; acts as an allocation
sub rsp, 0x14
; assign list[2] = 1337
mov eax, 1337
mov [rbp-0x8], eax
; do more operations on the list ...
; restore the allocated space
mov rsp, rbp
ret
```

Notice how `rbp` is always used to restore the stack to where it originally was. If we don't restore the stack after use, we will eventually run out. In addition, notice how we subtracted from `rsp`, because the stack grows down. To make the stack have more space, we subtract the space we need. The `ret` and `call` still work the same.

Once again, please make function(s) that implement the following:

```plain
most_common_byte(src_addr, size):
  i = 0
  while i <= size-1:
    curr_byte = [src_addr + i]
    [stack_base - curr_byte] += 1
    i += 1

  b = 0
  max_freq = 0
  max_freq_byte = 0
  while b <= 0xff:
    if [stack_base - b] > max_freq:
      max_freq = [stack_base - b]
      max_freq_byte = b
    b += 1

  return max_freq_byte
```

**Assumptions:**

+ There will never be more than 0xffff of any byte
+ The size will never be longer than 0xffff
+ The list will have at least one element

**Constraints:**

+ You must put the "counting list" on the stack
+ You must restore the stack like in a normal function
+ You cannot modify the data at `src_addr`

汇编代码部分的终局一战🥲🥲🥲🥲🥲

---

```python
from pwn import *

context.arch = 'amd64'
p = process('/challenge/run')
p.write(asm('''
    most_common_byte:
    push rbp                 
    mov rbp, rsp           
    sub rsp, 256            
    xor rcx, rcx            
initialize_counting_list_with_zero:
    mov byte ptr [rbp + rcx - 256], 0  
    inc rcx                              
    cmp rcx, 256                         
    jl initialize_counting_list_with_zero 
    xor rcx, rcx                        
count_bytes:
    movzx eax, byte ptr [rdi + rcx]     
    inc byte ptr [rbp + rax - 256]      
    inc rcx                             
    cmp rcx, rsi                       
    jl count_bytes                     
init_b_max_freq_max_freq_byte:
    xor rcx, rcx                        
    xor rdx, rdx                         
    xor rbx, rbx                         
find_most_common_byte:
    movzx eax, byte ptr [rbp + rcx - 256] 
    cmp al, dl                           
    jle next_byte                        
update_max_freq_and_max_freq_byte:
    mov dl, al                           
    mov bl, cl                           
next_byte:
    inc rcx                              
    cmp rcx, 256                        
    jl find_most_common_byte             
return:
    mov al, bl                          
restore:
    mov rsp, rbp                        
    pop rbp                               
    ret                                   
'''))
output = p.recvall().decode()
print(output)
```



还得沉淀