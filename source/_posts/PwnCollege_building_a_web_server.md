---
title: building_a_web_server
date: 2025-03-01 00:00:00
categories:
  - PwnCollege
tags:
  - PwnCollege
  - CTF
---

```plain
.intel_syntax noprefix
.globl _start

.section .text

_start:
    # Socket syscall
    mov rdi, 2
    mov rsi, 1
    mov rdx, 0
    mov rax, 0x29
    syscall

    # Bind syscall
    mov rdi, 3
    lea rsi, [rip+sockaddr]
    mov rdx, 16
    mov rax, 0x31
    syscall

    # Listen syscall
    mov rdi, 3
    mov rsi, 0
    mov rax, 0x32
    syscall

    # Accept syscall
    mov rdi, 3
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x2b
    syscall

    # Read syscall
    mov rdi, 4
    mov rsi, rsp
    mov rdx, 1024
    mov rax, 0x00
    syscall

    # Write syscall
    mov rdi, 4
    lea rsi, [rip+response]
    mov rdx, 19
    mov rax, 0x01
    syscall

    # Delay before closing the connection
    mov rax, 0x20
    mov rdi, 1
    syscall

    # Close syscall
    mov rdi, 4
    mov rax, 0x03
    syscall


    # Exit syscall
    mov rdi, 0
    mov rax, 0x3c    
    syscall

.section .data
sockaddr:
    .2byte 2
    .2byte 0x5000
    .4byte 0
    .8byte 0

response: 
    .string "HTTP/1.0 200 OK\r\n\r\n"


```

目前的服务器代码，能监听http接口并返回固定http消息。





接下来的改进方向：

能根据HTTP请求来处理动态内容，并返回消息。





当通过 `read` 系统调用从客户端读取 HTTP 请求时，返回的内容是一个字符串，这个字符串包含了完整的 HTTP 请求。例如，一个典型的 HTTP GET 请求可能如下所示(换行符由/n'表示)：

```http
GET /path/to/file HTTP/1.1
Host: localhost
User-Agent: Some/Client
Accept: */*
Connection: keep-alive
```

我们可以使用循环来得到所求的字段

```plain
.intel_syntax noprefix
.globl _start

.section .text
_start:
    # Socket syscall
    mov rdi, 2
    mov rsi, 1
    mov rdx, 0
    mov rax, 0x29
    syscall

    # Bind syscall
    mov rdi, 3
    lea rsi, [rip+sockaddr]
    mov rdx, 16
    mov rax, 0x31
    syscall

    # Listen syscall
    mov rdi, 3
    mov rsi, 0
    mov rax, 0x32
    syscall

    # Accept syscall
    mov rdi, 3
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x2b
    syscall

    # Read syscall
    mov rdi, 4
    mov rsi, rsp
    mov rdx, 256
    mov rax, 0x00
    syscall

    mov r10, rsp

Parse_GET:
    mov al, byte ptr [r10]
    cmp al, ' '
    je Done_1
    add r10, 1
    jmp Parse_GET

Done_1:
    add r10, 1
    mov r11, r10

Parse_filename:
    mov al, byte ptr [r11]
    cmp al, ' '
    je Done_2
    add r11, 1
    jmp Parse_filename

Done_2:
    mov byte ptr [r11], 0

    # Open syscall
    mov rdi, r10
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x02
    syscall

    # Read syscall
    mov rdi, 5
    mov rsi, rsp
    mov rdx, 256
    mov rax, 0x00
    syscall

    mov r12, rax

    # Close syscall
    mov rdi, 5
    mov rax, 0x03
    syscall

    # Write syscall
    mov rdi, 4
    lea rsi, [rip+response]
    mov rdx, 19
    mov rax, 0x01
    syscall

    # Write syscall
    mov rdi, 4
    mov rsi, rsp
    mov rdx, r12
    mov rax, 0x01
    syscall

    # Close syscall
    mov rdi, 4
    mov rax, 0x03
    syscall

    # Exit syscall
    mov rdi, 0
    mov rax, 0x3c    
    syscall

.section .data
sockaddr:
    .2byte 2
    .2byte 0x5000
    .4byte 0
    .8byte 0

response: 
    .string "HTTP/1.0 200 OK\r\n\r\n"

```

目前的服务器处理完一次GET请求后就会终止，现在我们要修改成其能按顺序处理多个GET请求。这需要将“接受连接-读取-写入-关闭连接”的序列包装在一个循环中。每次有客户端连接时，服务器将接受连接，处理GET请求，然后干净地关闭客户端会话，同时保持活跃状态以等待下一个请求。



```plain
.intel_syntax noprefix
.globl _start

.section .text
_start:
    # Socket syscall
    mov rdi, 2
    mov rsi, 1
    mov rdx, 0
    mov rax, 0x29
    syscall

    # Bind syscall
    mov rdi, 3
    lea rsi, [rip+sockaddr]
    mov rdx, 16
    mov rax, 0x31
    syscall

    # Listen syscall
    mov rdi, 3
    mov rsi, 0
    mov rax, 0x32
    syscall

    # Accept syscall
    mov rdi, 3
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x2b
    syscall

    # Read syscall
    mov rdi, 4
    mov rsi, rsp
    mov rdx, 256
    mov rax, 0x00
    syscall

    mov r10, rsp

Parse_GET:
    mov al, byte ptr [r10]
    cmp al, ' '
    je Done_1
    add r10, 1
    jmp Parse_GET

Done_1:
    add r10, 1
    mov r11, r10

Parse_filename:
    mov al, byte ptr [r11]
    cmp al, ' '
    je Done_2
    add r11, 1
    jmp Parse_filename

Done_2:
    mov byte ptr [r11], 0

    # Open syscall
    mov rdi, r10
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x02
    syscall

    # Read syscall
    mov rdi, 5
    mov rsi, rsp
    mov rdx, 256
    mov rax, 0x00
    syscall

    mov r12, rax

    # Close syscall
    mov rdi, 5
    mov rax, 0x03
    syscall

    # Write syscall
    mov rdi, 4
    lea rsi, [rip+response]
    mov rdx, 19
    mov rax, 0x01
    syscall

    # Write syscall
    mov rdi, 4
    mov rsi, rsp
    mov rdx, r12
    mov rax, 0x01
    syscall

    # Close syscall
    mov rdi, 4
    mov rax, 0x03
    syscall

    # Accept syscall
    mov rdi, 3
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x2b
    syscall

    # Exit syscall
    mov rdi, 0
    mov rax, 0x3c    
    syscall

.section .data
sockaddr:
    .2byte 2
    .2byte 0x5000
    .4byte 0
    .8byte 0

response: 
    .string "HTTP/1.0 200 OK\r\n\r\n"

    
```





为了让服务器能够同时处理多个客户端，你将通过使用`fork`系统调用来引入并发。当一个客户端连接时，`fork`会创建一个子进程，专门用于处理该连接。与此同时，父进程会立即返回，以便接受更多的连接。在这种设计中，子进程使用`read`和`write`与客户端进行交互，而父进程则继续监听。

```plain
fork`系统调用
`pid_t fork(void);
```

**返回值**

+ 成功时，在父进程中返回子进程的PID，在子进程中返回0。
+ 失败时，在父进程中返回-1，不创建子进程，并设置`errno`以指示错误。

`fork`系统调用返回子进程的PID，且不接受任何参数。

如果我们执行代码，可以检查返回的PID。

`fork`系统调用

assembly

复制

```plain
mov rax, 0x39  
syscall  
```

[✓] `fork()` = 7

正如我们所见，返回值是7，这意味着我们处于父进程中。

```shell
===== 预期：父进程 =====
[ ] `execve(<execve_args>)` = 0
[ ] `socket(AF_INET, SOCK_STREAM, IPPROTO_IP)` = 3
[ ] `bind(3, {sa_family=AF_INET, sin_port=htons(<bind_port>), sin_addr=inet_addr("<bind_address>")}, 16)` = 0
\- 绑定到端口80
\- 绑定到地址0.0.0.0
[ ] `listen(3, 0)` = 0
[ ] `accept(3, NULL, NULL)` = 4
[ ] `fork()` = `<fork_result>`
[ ] `close(4)` = 0
[ ] `accept(3, NULL, NULL)` = ?

===== 预期：子进程 =====
[ ] `close(3)` = 0
[ ] `read(4, <read_request>, <read_request_count>)` = `<read_request_result>`
[ ] `open("<open_path>", O_RDONLY)` = 3
[ ] `read(3, <read_file>, <read_file_count>)` = `<read_file_result>`
[ ] `close(3)` = 0
[ ] `write(4, "HTTP/1.0 200 OK\r\n\r\n", 19)` = 19
[ ] `write(4, <write_file>, <write_file_count>)` = `<write_file_result>`
[ ] `exit(0)` = ?
```

在完成`fork`之后，我们需要在父进程中执行两个系统调用，然后进入子进程。为了分离控制流程，我们需要创建一个简单的检查，以判断我们是处于父进程还是子进程中。

assembly

复制

```plain
cmp rax, 0		# 检查`fork`的返回值是否为零  
            # 如果相等：  
je Child_process		# 跳转到子进程代码  
```

完成这个检查后，我们可以使用标签来分离代码：

assembly

复制

```plain
Parent_process:  
    # 父进程的代码  

Child_process:  
    # 子进程的代码  
```





```plain
.intel_syntax noprefix
.globl _start

.section .text
_start:
    # Socket syscall
    mov rdi, 2
    mov rsi, 1
    mov rdx, 0
    mov rax, 0x29
    syscall

    # Bind syscall
    mov rdi, 3
    lea rsi, [rip+sockaddr]
    mov rdx, 16
    mov rax, 0x31
    syscall

    # Listen syscall
    mov rdi, 3
    mov rsi, 0
    mov rax, 0x32
    syscall

    # Accept syscall
    mov rdi, 3
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x2b
    syscall

    # Fork syscall
    mov rax, 0x39
    syscall

    cmp rax, 0
    je Child_process

Parent_process:
    # Close syscall
    mov rdi, 4		# Close the accepted connection
    mov rax, 0x03
    syscall

    # Accept syscall
    mov rdi, 3
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x2b
    syscall

Child_process:
    # Close syscall 
    mov rdi, 3		# Close the Socket listener
    mov rax, 0x03
    syscall

    # Read syscall
    mov rdi, 4
    mov rsi, rsp
    mov rdx, 256
    mov rax, 0x00
    syscall

    mov r10, rsp

Parse_GET:
    mov al, byte ptr [r10]
    cmp al, ' '
    je Done_1
    add r10, 1
    jmp Parse_GET

Done_1:
    add r10, 1
    mov r11, r10

Parse_filename:
    mov al, byte ptr [r11]
    cmp al, ' '
    je Done_2
    add r11, 1
    jmp Parse_filename

Done_2:
    mov byte ptr [r11], 0

    # Open syscall
    mov rdi, r10
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x02
    syscall

    # Read syscall
    mov rdi, 3
    mov rsi, rsp
    mov rdx, 256
    mov rax, 0x00
    syscall

    mov r12, rax

    # Close syscall
    mov rdi, 3
    mov rax, 0x03
    syscall

    # Write syscall
    mov rdi, 4
    lea rsi, [rip+response]
    mov rdx, 19
    mov rax, 0x01
    syscall

    # Write syscall
    mov rdi, 4
    mov rsi, rsp
    mov rdx, r12
    mov rax, 0x01
    syscall

    # Close syscall
    mov rdi, 4
    mov rax, 0x03
    syscall

    # Accept syscall
    mov rdi, 3
    mov rsi, 0
    mov rdx, 0
    mov rax, 0x2b
    syscall

    # Exit syscall
    mov rdi, 0
    mov rax, 0x3c    
    syscall

.section .data
sockaddr:
    .2byte 2
    .2byte 0x5000
    .4byte 0
    .8byte 0

response: 
    .string "HTTP/1.0 200 OK\r\n\r\n"
```

我们将进一步扩展服务器的功能，专注于并发处理HTTP POST请求。POST请求比GET请求更复杂，因为它既包含头部信息，也包含消息体。你将再次使用`fork`来管理多个连接，同时使用`read`来捕获整个请求。

你仍然需要解析URL路径以确定指定的文件，但这次不是从该文件中读取内容，而是将传入的POST数据写入该文件。为此，你必须确定传入POST数据的长度。最直接的方法是解析`Content-Length`头部，它正好指定了数据的长度。或者，你可以考虑使用`read`的返回值来确定请求的总长度，解析请求以找到头部的总长度（头部以`\r\n\r\n`结束），并利用这两者的差值来确定消息体的长度——尽管这种看似更复杂的算法实际上可能更容易实现。

```plain
.intel_syntax noprefix
.globl _start

.section .text

_start:
    # Open socket
    mov rdi, 2
    mov rsi, 1
    mov rdx, 0
    mov rax, 41
    syscall
    # Store socket fd in rbx
    mov rbx, rax

    # Bind socket to address
    mov rdi, rbx
    lea rsi, sa_family_t
    mov rdx, 16
    mov rax, 49
    syscall

    # Listen on socket
    mov rdi, rbx
    mov rsi, 0
    mov rax, 50
    syscall

    accept_jump:
    # Accept a connection
    mov rdi, rbx
    mov rsi, 0
    mov rdx, 0
    mov rax, 43
    syscall
    # Save new fd for bound connection in r12
    mov r12, rax

    # Fork the process and let the child do the serving
    mov rax, 57
    syscall
    cmp rax, 0
    je serve_connection
    # Close the connection if parent
    mov rdi, r12
    mov rax, 3
    syscall
    # Then go back to listening
    jmp accept_jump

    serve_connection:
    # Close listening socket
    mov rdi, rbx
    mov rax, 3
    syscall

    # Read from the connection
    mov rdi, r12
    lea rsi, read_buffer
    mov rdx, [read_packet_length]
    mov rax, 0
    syscall

    # Figure out what file was requested
    lea rdi, read_buffer
    mov rsi, 1
    lea rdx, space
    call get_nth_substr
    mov r13, rax
    lea rdi, read_buffer
    mov rsi, 2
    call get_nth_substr
    mov r14, rax
    sub r14, 1
    # r13 = start (exclusive), r14 = end (inclusive)
    mov rdi, r13
    mov rsi, r14
    lea rdx, file_name_buffer
    call write_to_buf
    # Filename is now stored in file_name_buffer

    # Check request type
    mov dil, [read_buffer]
    # Compare to "G"
    cmp dil, 0x47
    # Continue (GET process) if G, otherwise do POST
    jne POST

    GET:
        # Open that file
        lea rdi, file_name_buffer
        mov rsi, 0
        mov rdx, 0
        mov rax, 2
        syscall
        mov r13, rax

        # Read file contents
        mov rdi, r13
        lea rsi, file_read_buffer
        mov rdx, 1024
        mov rax, 0
        syscall

        # Close the file
        mov rdi, r13
        mov rax, 3
        syscall

        # Write status to connection
        mov rdi, r12
        lea rsi, write_static
        mov rdx, 19
        mov rax, 1
        syscall

        # Write file contents to connection
        lea rdi, file_read_buffer
        call get_len
        mov rdx, rax
        sub rdx, 1
        mov rdi, r12
        lea rsi, file_read_buffer
        mov rax, 1
        syscall

        jmp exit

    POST:
        # Open that file
        lea rdi, file_name_buffer
        mov rsi, 0x41 # O_CREAT, O_WRONLY
        mov rdx, 0777
        mov rax, 2
        syscall
        mov r13, rax

        # Get the POST content
        lea rdi, read_buffer
        mov rsi, 1
        lea rdx, double_cr_lf
        call get_nth_substr
        mov rsi, rax
        add rsi, 1

        # Get write length
        mov rdi, rsi
        call get_len
        mov rdx, rax
        # Get rid of the pesky null byte
        sub rdx, 1
        # Write to file
        mov rdi, r13
        mov rax, 1
        syscall

        # Close the file
        mov rdi, r13
        mov rax, 3
        syscall

        # Write status to connection
        mov rdi, r12
        lea rsi, write_static
        mov rdx, 19
        mov rax, 1
        syscall

    exit:
    # Close the connection
    mov rdi, r12
    mov rax, 3
    syscall

    # Sys exit
    mov rdi, 0
    mov rax, 60
    syscall

    # Get the length of a null-terminated string (including the first null byte)
    # Args:
    # rdi - buffer we're checking the length of
    # rax - length
    get_len:
        mov rax, 0
        get_len_loop:
            # See if rdi + rax-th byte is null
            mov r10, rdi
            add r10, rax
            mov r10, [r10]
            add rax, 1
            cmp r10, 0x00
            jne get_len_loop
        ret

    # Copy the bytes spanning rdi to rsi to the buffer rdx
    # rdx MUST BE LONGER THAN rsi - rdi BYTES, rdi MUST BE LESS THAN rsi
    # Args:
    # rdi - start (exclusive) of the string we're copying
    # rsi - end (inclusive) of the string we're copying
    # rdx - buffer we're copying to
    # rax - unchanged
    write_to_buf:
        write_to_buf_loop:
            add rdi, 1
            mov r9, [rdi]
            mov [rdx], r9
            add rdx, 1
            cmp rdi, rsi
            jne write_to_buf_loop
        mov byte ptr [rdx], 0x00
        ret

    # Get address of the (last byte of) the nth occurence of substring in string (occurences must be non-overlapping)
    # ONLY GUARANTEED TO WORK ON NULL-TERMINATED STRINGS
    # Args:
    # rdi - target string address
    # rsi - n
    # rdx - substring

    # rax - address of nth character
    get_nth_substr:
        # Set rcx (ocurrence counter)
        mov rcx, 0
        # Set r10 (to traverse substring)
        mov r10, rdx
        check_character_loop:
            # r9b = character at position
            mov r9b, [rdi]
            # If string's terminated, obviously the substring doesn't occur enough times
            cmp r9b, 0x00
            je not_enough_occurrences
            # Step through substring iff r9b = current byte
            cmp r9b, byte ptr [r10]
            jne character_not_equal
                add r10, 1
                # If we've reached the end of the substring, increment counter and reset r10
                cmp byte ptr [r10], 0x00
                jne after_comparison
                    mov r10, rdx
                    add rcx, 1
                    jmp after_comparison
            character_not_equal:
                # Reset r10 without adding to count
                mov r10, rdx
            after_comparison:
            # Return address if we've got the nth ocurrence
            cmp rcx, rsi
            je match
            # Otherwise increment and continue
            add rdi, 1
            jmp check_character_loop
        match:
        mov rax, rdi
        ret
        not_enough_occurrences:
        mov rax, -1
        ret

.section .data
    # sockaddr_in struct
    sa_family_t: .word 2
    bind_port: .word 0x5000
    bind_address: .double 0x00000000
    pad: .byte 0,0,0,0,0,0,0,0
    # Make empty buffers to read to
    read_buffer: .space 1024
    file_name_buffer: .space 1024
    file_read_buffer: .space 1024
    # Constants
    # Yes it's dumb to use a quad word for this, but it simplifies copying it to the register
    read_packet_length: .quad 0x0000000000000400
    write_static: .string "HTTP/1.0 200 OK\r\n\r\n"
    space: .string " "
    double_cr_lf: .string "\r\n\r\n"
```

网上找的完整版。没写出来post的部分