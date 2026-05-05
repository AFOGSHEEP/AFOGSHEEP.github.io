---
title: Compute 101
date: 2024-11-11 00:00:01
categories:
  - 学习笔记
tags:
  - 网安
---

---

date: 2024-11-11 00:00:01  
记录在pwncollege里的一些学习笔记



## Tracing Syscalls
As you write larger and larger programs, you (yes, even you!) might make mistakes when implementing certain functionality, introducing _bugs_ into your programs. Throughout this module, we'll go over a few tools and techniques for _debugging_ your program. The first one is pretty simple: the **s**yscall **trace**r, `strace`.

Given a program to run, `strace` will use functionality of the Linux operating system to introspect and record every system call that the program invokes, and its result. For example, let's look at our program from the previous challenge:

```plain
hacker@dojo:~$ strace /tmp/your-program
execve("/tmp/your-program", ["/tmp/your-program"], 0x7ffd48ae28b0 /* 53 vars */) = 0
exit(42)                                 = ?
+++ exited with 42 +++
hacker@dojo:~$
```

As you can see, `strace` reports what system calls are triggered, what parameters were passed to them, and what data they returned. The syntax used here for output is `system_call(parameter, parameter, parameter, ...)`. This syntax is borrowed from a programming language called C, but we don't have to worry about that yet. Just keep in mind how to read this specific syntax.

In this example, `strace` reports two system calls: the second is the `exit` system call that your program uses to request its own termination, and you can see the parameter you passed to it (42). The first is an `execve` system call. We'll learn about this system call later, but it's somewhat of a yin to `exit`'s yang: it starts a new program (in this case, `your-program`). It's not actually invoked by `your-program` in this case: its detection by `strace` is a weird artifact of how `strace` works, that we'll investigate later.

In the final line, you can see the result of `exit(42)`, which is that the program exits with an exit code of `42`!

Now, the `exit` syscall is easy to introspect without using `strace` --- after all, part of the point of `exit` is to give you an exit code that you can access. But other system calls are less visible. For example, the `alarm` system call (syscall number 37!) will set a timer in the operating system, and when that many seconds pass, Linux will terminate the program. The point of `alarm` is to, e.g., kill the program when it's frozen, but in this case, we'll use `alarm` to practice our `strace` snooping!

In this challenge, you must `strace` the `/challenge/trace-me` program to figure out what value it passes as a parameter to the `alarm` system call, then call `/challenge/submit-number` with the number you've retrieved as the argument. Good luck!

总结：

1. 使用strace跟踪/challenge/trace-me程序。
2. 观察并记录alarm系统调用的参数值。
3. 调用/challenge/submit-number，将上一步中找到的数字作为参数传递。

```powershell
hacker@your-first-program~tracing-syscalls:/challenge$ strace  ./trace-me 
execve("./trace-me", ["./trace-me"], 0x7ffd869ca7f0 /* 28 vars */) = 0
alarm(18759)                            = 0
exit(0)                                 = ?
+++ exited with 0 +++
# 提交数字即可
```

## moving betweening registers
Okay, let's learn about one more register: `rsi`! Like `rdi`, `rsi` is a place you can park some data. For example:

```plain
mov rsi, 42
```

Of course, you can also move data around between registers! Watch:

```plain
mov rsi, 42
mov rdi, rsi
```

Just like the first line there moves `42` into `rsi`, the second like moves the value in `rsi` to `rdi`. Here, we have to mention one complication: by _move_, we really mean _set_. After the snippet above, `rsi` _and_ `rdi` will be `42`. It's a mystery as to why the `mov` was chosen rather than something reasonable like `set` (even very knowledgeable people resort to [diverse speculation](https://retrocomputing.stackexchange.com/questions/12968/why-is-the-processor-instruction-called-move-not-copy) when asked), but it was, and here we are.

Anyways, on to the challenge! In this challenge, we will store a secret value in the `rsi` register, and your program must exit with that value as the return code. Since `exit` uses the value stored in `rdi` as the return code, you'll need to move the secret value in `rsi` into `rdi`. Good luck!

总结：

1. 在rsi寄存器中存储一个秘密值。
2. 编写一个程序，该程序需要将rsi寄存器中的秘密值移动到rdi寄存器中。
3. 程序必须使用exit函数退出，并且退出时的返回码应为rsi寄存器中存储的秘密值（此时已移动到rdi中，因为exit函数使用rdi的值作为返回码）。



```plain
mov rdi, rsi
mov rax,60 ;设置syscall号为exit（60）
syscall 
;调用check即可

```

## loading from memory
As seen by your program, computer memory is a huge place where data is housed. Like houses on a street, every part of memory has a numeric _address_, and like houses on a street, these numbers are (mostly) sequential. Modern computers have enormous amounts of memory, and the view of memory of a typical modern program actually has large gaps (think: a portion of the street that hasn't had houses built on it, and so those addresses are skipped). But these are all details: the point is, computers store data, mostly sequentially, in memory.

In this level, we will practice accessing data stored in memory. How might we do this? Recall that to move a value into a register, we did something like:

```plain
mov rdi, 31337
```

After this, the value of is . Cool. Well, we can use the same instruction to access memory! There is another format of the command that, instead, uses the second parameter as an address to access memory! Consider that our memory looks like this:`rdi``31337`

```latex
  Address │ Contents
+────────────────────+
│ 31337   │ 42       │
+────────────────────+
```

To access the memory contents at memory address 31337, you would can do:

```plain
mov rdi, [31337]
```

When the CPU executes this instruction, it of course understands that is an _address_, not a raw value. If you think of the instruction as a person telling the CPU what to do, and we stick with our "houses on a street" analogy, then instead of just handing the CPU data, the instruction/person _points at a house on the street_. The CPU will then go to that address, ring its doorbell, open its front door, drag the data that's in there out, and put it into . Thus, the in this context is the _memory address_ and serves to _point to_ the data stored at that memory address. After this instruction executes, the value stored in will be !`31337``rdi``31337``rdi``42`

Let's put this into practice! I've stored a secret number at memory address , as so:`133700`

```latex
  Address │ Contents
+────────────────────+
│ 133700  │ ???      │
+────────────────────+
```

You must retrieve this secret number and use it as the exit code for your program. To do this, you must read it into , whose value, if you recall, is the first parameter to and is used as the exit code. Good luck!`rdi``exit`

总结:

1. 访问地址133700处的数据
2. 把该地址的数据读取到rdi中
3. 使用这个数据作为退出参数

```bash
mov rdi ,[133700] #记住地址的表示
mov rax ,60
syscall


```

## dereferencing pointers
Did you prefer to access memory at `133700` or at `123400`? Your answer might say something about your personality, but it's not super relevant from a technical perspective. In fact, in most cases, you don't deal with actual memory addresses when writing programs at all!

How is this possible? Well, typically, memory addresses are stored in registers, and we use the values in the registers to point to data in memory! Let's start with this memory configuration:

```latex
  Address │ Contents
+────────────────────+
│ 133700  │ 42       │
+────────────────────+
```

And consider this assembly snippet:

```plain
mov rdi, 133700
```

Now, what you have is the following situation:

```latex
  Address │ Contents
+────────────────────+
│ 133700  │ 42       │◂┐
+────────────────────+ │
                       │
 Register │ Contents   │
+────────────────────+ │
│ rdi     │ 133700   │─┘
+────────────────────+
```

`rdi` now holds a value that corresponds with the address of the data that want to load! Let's load it:

```plain
mov rdi, [rax]
```

Here, we are accessing memory, but instead of specifying a fixed address like `133700` for the memory read, we're using the value stored in `rax` as the memory address. By containing the memory address, `rax` is a _pointer_ that _points to_ the data we want to access! When we use `rax` in lieu of directly specifying the address that it stores to access the memory address that it references, we call this _dereferencing_ the pointer. In the above example, we _dereference_ `rax` to load the data it points to (the value `42` at address `133700`) into `rdi`. Neat!

This also drives home another point: these registers are _general purpose_! Just because we've been using `rax` as the syscall index in our challenges so far doesn't mean that it can't have other uses as well. Here, it's used as a pointer to our secret data in memory.

Similarly, the _data_ in the registers doesn't have an implicit purpose. If `rax` contains the value `133700` and we write `mov rdi, [rax]`, the CPU uses the value as a memory address to dereference. But if we write `mov rdi, rax` in the same conditions, the CPU just happily puts `133700` into `rdi`. To the CPU, data is data; it only becomes differentiated when it's used in different ways.

In this challenge, we've initialized `rax` to contain the address of the secret data we've stored in memory. Dereference `rax` to the secret data into `rdi` and use it as the exit code of the program to get the flag!

讲了个类似C语言中指针的用法。第一次做成了这样：

```plain
mov rdi, [rax]
mov eax, rdi
syscall

;报错：Your assembly did not assemble cleanly. The errors:
;Error: unsupported instruction `mov'
```

后来发现`mov eax, rdi`的问题。`eax` 是 32 位寄存器，而 `rdi` 是 64 位寄存器，不能直接传参,而且没搞懂程序的运行原理。修改为以下后通过：

```plain
mov rdi,[rax]	;rdi 负责传参
mov rax,60 	;rax负责调起exit()
syscall


```

补充：`60` -> `exit`：退出程序

	  ` 1` -> `write`：写数据

	  `	3` -> `read`：读数据

	  `	9` -> `mmap`：内存映射

等等。

## dereferencing with offsets
So now you can dereference pointers in memory like a pro! But pointers don't always point directly at the data you need. Sometimes, for example, a pointer might point to a collection of data (say, an entire book), and you'll need to reference partway into this collection for the specific data you need.

For example, if your pointer (say, `rdi`) points to a sequence of numbers in memory, as so:

```latex
  Address │ Contents
+────────────────────+
│ 133700  │ 50       │◂┐
│ 133701  │ 42       │ │
│ 133702  │ 99       │ │
│ 133703  │ 14       │ │
+────────────────────+ │
                       │
 Register │ Contents   │
+────────────────────+ │
│ rdi     │ 133700   │─┘
+────────────────────+
```

If you want the second number of that sequence, you could do:

```plain
mov rax, [rdi+1]
```

Wow, super simple! In memory terms, we call these number slots _bytes_: each memory address represents a specific byte of memory. The above example is accessing memory 1 byte after the memory address pointed to by `rax`. In memory terms, we call this 1 byte difference an _offset_, so in this example, there is an offset of 1 from the address pointed to by `rdi`.

Let's practice this concept. As before, we will initialize `rdi` to point at the secret value, but not _directly_ at it. This time, the secret value will have an offset of 8 bytes from where `rdi` points, something analogous to this:

```latex
  Address │ Contents
+────────────────────+
│ 31337   │ 0        │◂┐
│ 31337+1 │ 0        │ │
│ 31337+2 │ 0        │ │
│ 31337+3 │ 0        │ │
│ 31337+4 │ 0        │ │
│ 31337+5 │ 0        │ │
│ 31337+6 │ 0        │ │
│ 31337+7 │ 0        │ │
│ 31337+8 │ ???      │ │
+────────────────────+ │
                       │
 Register │ Contents   │
+────────────────────+ │
│ rdi     │ 31337    │─┘
+────────────────────+
```

Of course, the actual memory address is not `31337`. We'll choose it randomly, and store it in `rdi`. Go dereference `rdi` with offset `8` and get the flag!

仍然是类似指针的操作

```plain
mov rdi,[rdi+8]
mov rax ,60
syscall


```

## double dereference
In the last few levels, you have:

+ Used an address that we told you (in one level, `133700`, and in another, `123400`) to load a secret value from memory.
+ Used an address that we put into `rax` for you to load a secret value from memory.
+ Used an address that we told you (in the last level, `567800`) to load _the address_ of a secret value from memory into a register, then used that register as a pointer to retrieve the secret value from memory!

Let's put those last two together. In this challenge, we stored our `SECRET_VALUE` in memory at the address `SECRET_LOCATION_1`, then stored `SECRET_LOCATION_1` in memory at the address `SECRET_LOCATION_2`. Then, we put `SECRET_ADDRESS_2` into `rax`! The result looks something like this, using `133700` for `SECRET_LOCATION_1` and 123400 for `SECRET_LOCATION_2` (not, in the real challenge, these values will be different and hidden from you!):

```latex
     Address │ Contents
   +────────────────────+
 ┌─│ 133700  │ 123400   │◂┐
 │ +────────────────────+ │
 └▸│ 123400  │ 42       │ │
   +────────────────────+ │
                          │
                          │
                          │
    Register │ Contents   │
   +────────────────────+ │
   │ rdi     │ 133700   │─┘
   +────────────────────+
```

Here, you will need to perform two memory reads: one dereferencing `rax` to read `SECRET_LOCATION_1` from the location that `rax` is pointing to (which is `SECRET_LOCATION_2`), and the second one dereferencing whatever register now holds `SECRET_LOCATION_1` to read `SECRET_VALUE` into `rdi`, so you can use it as the exit code!

That sounds like a lot, but you've done basically all of this already. Go put it together!



```plain
mov rax, [rax]    ; 第一步：通过rax指向的地址读取SECRET_LOCATION_1（第二层地址）
mov rdi, [rax]    ; 第二步：通过rax指向的地址读取SECRET_VALUE
mov rax, 60       
syscall           

```

在 x86-64 架构中，系统调用的参数是通过寄存器传递的。根据系统调用的约定：

+ `rdi` 用于传递第一个参数。
+ `rsi` 用于传递第二个参数。

## triple dereference
Okay, let's stretch that to one more depth! We've added an additional level of indirection in this challenge, so now you'll need _three_ dereferences to find the secret value. Something like this:

```latex
     Address │ Contents
   +────────────────────+
 ┌─│ 133700  │ 123400   │◂──┐
 │ +────────────────────+   │
 └▸│ 123400  │ 100000   │─┐ │
   +────────────────────+ │ │
   │ 100000  │ 42       │◂┘ │
   +────────────────────+   │
                            │
                            │
    Register │ Contents     │
   +────────────────────+   │
   │ rdi     │ 133700   │───┘
   +────────────────────+
```

As you can see, we'll place the first address that you must dereference into rdi. Go get the value!

类似的操作

```plain
mov rdi,[rdi]
mov rax,[rdi]
mov rdi,[rax]
mov rax,60
syscall

```

 `rsi` 是用于传递参数的寄存器，而 `rdi` 才是系统调用时的退出代码传递寄存器。

## writing output
Let's learn to write text!

Unsurprisingly, your program writes text to the screen by invoking a system call. Specifically, this is the `write` system call, and its syscall number is `1`. However, the write system call also needs to specify, via its parameters, _what_ data to write and _where_ to write it to.

You may remember, from the [Practicing Piping](https://pwn.college/linux-luminarium/piping) module of the [Linux Luminarium](https://pwn.college/linux-luminarium) dojo, the concept of _File Descriptors_ (FDs). As a reminder, each process starts out with three FDs:

+ **FD 0:** Standard _Input_ is the channel through which the process takes input. For example, your shell uses Standard Input to read the commands that you input.
+ **FD 1:** Standard _Output_ is the channel through which processes output normal data, such as the flag when it is printed to you in previous challenges or the output of utilities such as `ls`.
+ **FD 2:** Standard _Error_ is the channel through which processes output error details. For example, if you mistype a command, the shell will output, over standard error, that this command does not exist.

It turns out that, in your `write` system call, this is how you specify _where_ to write the data to! The first (and only) parameter to your `exit` system call was your exit code (`mov rdi, 42`), and the first (but, in this case, not only!) parameter to `write` is the file descriptor. If you want to write to standard output, you would set `rdi` to 1. If you want to write to standard error, you would set `rdi` to 2. Super simple!

This leaves us with _what_ to write. Now, you could imagine a world where we specify what to write through yet another register parameter to the `write` system call. But these registers don't fit a ton of data, and to write out a long story like this challenge description, you'd need to invoke the `write` system call multiple times. Relatively speaking, this has a lot of performance cost --- the CPU needs to switch from executing the instructions of your program to executing the instructions of Linux itself, do a bunch of housekeeping computation, interact with your hardware to get the actual pixels to show up on your screen, and then switch back. This is slow, and so we try to minimize the number of times we invoke system calls.

Of course, the solution to this is to write multiple characters at the same time. The `write` system call does this by taking _two_ parameters for the "what": a _where_ (in memory) to start writing from and a _how many_ characters to write. These parameters are passed as the second and third parameter to `write`. In the kinda-C syntax that we learned from `strace`, this would be:

```c
write(file_descriptor, memory_address, number_of_characters_to_write)
```

For a more concrete example, if you wanted to write 10 characters from memory address 1337000 to standard output (file descriptor 1), this would be:

```c
write(1, 1337000, 10);
```

Wow, that's simple! Now, how do we actually specify these parameters?

1. We'll pass the first parameter of a system call, as we reviewed above, in the `rdi` register.
2. We'll pass the second parameter via the `rsi` register. The agreed-upon convention in Linux is that `rsi` is used as the second parameter to system calls.
3. We'll pass the third parameter via the `rdx` register. This is the most confusing part of this entire module: `rdi` (the register holding the first parameter) has such a similar name to `rdx` that it's really easy to mix up and, unfortunately, the naming is this way for historic reasons and is here to stay. Oh well... It's just something we have to be careful about. Maybe a mnemonic like "`rdi` is the **i**nitial parameter while `rdx` is the **x**tra parameter"? Or just think of it as having to keep track of different friends with similar names, and you'll be fine.

And, of course, the `write` syscall index into `rax` itself: `1`. Other than the `rdi` vs `rdx` confusion, this is really easy!

Now, you know how to point a register at a memory address (from the [Memory](https://pwn.college/computing-101/memory) module!), and yo know how to set the system call number, and how to set the rest of the registers. So, this should be cake!

Similar to before, we wrote a single secret character value into memory at address `1337000`. Call `write` to that single character (for now! We'll do multiple-character writes later) value onto standard out, and we'll give you the flag!

如何输出某个地址上的数值？？

```plain
mov rax,1
mov rdi,1
mov rsi,1337000
mov rdx,1
syscall
```

`rax`：存储系统调用号，`1` 对应于 `write`。

`rdi`：存储文件描述符，`1` 是标准输出。

`rsi`：存储要写的数据的内存地址，这里假设数据存储在地址 `0x1337000`。

`rdx`：存储要写入的字节数，这里是 1 个字节。

`syscall`：执行系统调用，将前面设置的寄存器参数传递给内核。

依据x86_64 架构下的调用约定，即系统调用时，前四个参数分别通过 `rdi`, `rsi`, `rdx`, 和 `r10` 等寄存器传递。`rax` 存储系统调用编号，后面的寄存器则用来传递具体的参数值。

## chaining syscalls
Okay, our previous solution wrote output but then crashed. In this level, you will write output, and then _not_ crash!

We'll do this by invoking the system call, and then invoking the system call to cleanly exit the program. How do we invoke two system calls? Just like you invoke two instructions! First, you set up the necessary registers and invoke , then you set up the necessary registers and invoke `exit!`write``exit``write`

Your previous solution had 5 instructions (setting , setting , setting , setting , and ). This one should have those 5, plus three more for (setting to the exit code, setting to syscall index 60, and ). For this level, let's exit with exit code !`rdi``rsi``rdx``rax``syscall``exit``rdi``rax``syscall``42`

为了避免程序崩溃，需要调用exit（）退出

```plain
mov rax,1
mov rdi,1
mov rsi,1337000
mov rdx,1
syscall

mov rdi,42
mov rax,60
syscall


```

1. **第一步（**`write`**）**：
    - 将 `rax` 设置为 `1`，表示调用 `write` 系统调用。
    - 将 `rdi` 设置为 `1`，表示目标文件描述符是标准输出（stdout）。
    - 将 `rsi` 设置为 `0x1337000`，这是要输出的数据的内存地址。
    - 将 `rdx` 设置为 `1`，表示只写入 1 个字节。
    - 使用 `syscall` 执行 `write`。
2. **第二步（**`exit`**）**：
    - 将 `rdi` 设置为 `42`，表示退出码为 42。
    - 将 `rax` 设置为 `60`，表示调用 `exit` 系统调用。
    - 使用 `syscall` 执行 `exit`。

<font style="background-color:#f3bb2f;">为什么要有 </font>`exit`<font style="background-color:#f3bb2f;">？</font>

如果程序没有显式调用 `exit`，程序运行结束后可能会因为未定义的行为导致崩溃。调用 `exit` 是为了让内核知道程序已经正常终止，同时提供一个退出码供外部程序使用。

`write`** 系统调用**：

+ **编号：1**
+ 该系统调用用于将数据写入到文件描述符指定的文件中，通常用于输出到屏幕（标准输出）。

`write`** 的参数**：

1. `rdi`：目标文件描述符（file descriptor）。`1` 表示标准输出（stdout）。
2. `rsi`：要写入的内存地址。即你要输出的数据所在的位置。
3. `rdx`：要写入的字节数，表示你希望写入多少数据。

`write`** 系统调用流程**：

1. 设置 `rax` 为系统调用编号 `1`（表示调用 `write`）。
2. 设置 `rdi` 为文件描述符 `1`（标准输出）。
3. 设置 `rsi` 为包含要输出数据的内存地址。
4. 设置 `rdx` 为数据的字节数，通常是你希望输出的字符数。
5. 执行 `syscall` 指令发起系统调用。

`寄存器顺序`：

在 Linux x86_64 架构中，系统调用的参数需要按照一定的顺序存放在寄存器中，这些寄存器会被传递到内核：

1. `rdi`：第一个参数
2. `rsi`：第二个参数
3. `rdx`：第三个参数
4. `r10`：第四个参数
5. `r8`：第五个参数
6. `r9`：第六个参数