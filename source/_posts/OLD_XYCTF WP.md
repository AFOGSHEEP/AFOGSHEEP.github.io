---
title: XYCTF_WP
date: 2024-04-25 22:23:02
categories:
  - 学习笔记
tags:
  - CTF
---

---

date: 2024-04-25 22:23:02  
咸鱼头一次做出比较多的比赛，学到了很多东西（虽然感觉应该早该会的），后面会逐步把没做出的re复现

## 聪明的信使 
```plain
int __cdecl encrypt(char *a1, int a2)
{
  int result; // eax
  char v3; // [esp+Bh] [ebp-5h]
  int i; // [esp+Ch] [ebp-4h]

  for ( i = 0; ; ++i )
  {
    result = (unsigned __int8)a1[i];
    if ( !(_BYTE)result )
      break;
    v3 = a1[i];
    if ( v3 <= 96 || v3 > 122 )
    {
      if ( v3 > 64 && v3 <= 90 )
        v3 = (v3 + a2 - 65) % 26 + 65;
    }
    else
    {
      v3 = (v3 + a2 - 97) % 26 + 97;
    }
    a1[i] = v3;
  }
  return result;
}
```

签到题，点开加密函数发现是凯撒密码，偏移量为9，使用逆向解密函数得解：

```python
def decrypt_caesar(encrypted_str, shift):
    decrypted_str = ""
    for char in encrypted_str:
        # 确保字符是字母
        if char.isalpha():
            # 获取字符的ASCII码
            ascii_offset = ord(char)
            # 判断是大写还是小写字母
            if char.isupper():
                # 大写字母的ASCII范围是65-90
                base = ord('A')
            else:
                # 小写字母的ASCII范围是97-122
                base = ord('a')
                # 执行解密操作
            decrypted_char = chr((ascii_offset - base - shift) % 26 + base)
        else:
            # 非字母字符不进行解密
            decrypted_char = char
            # 将解密后的字符添加到结果字符串中
        decrypted_str += decrypted_char
    return decrypted_str



encrypted_str = "oujp{H0d_TwXf_Lahyc0_14_e3ah_Rvy0ac@wc!}"
shift = -9

# 解密字符串
decrypted_str = decrypt_caesar(encrypted_str, -shift)
print(decrypted_str)
# flag{Y0u_KnOw_Crypt0_14_v3ry_Imp0rt@nt!}
```



## 喵喵喵的flag碎了一地
```plain
puts("Hint:");
  puts("1. Open in IDA and Learn about `Strings` to find the first part of the flag");
  puts("2. Learn about `Functions` to find the second part of the flag which is the name of a function");
  puts("3. The hint for the last part is in the function you found in the second part");
```

打开主函数发现hint。根据提示一步一步来。shift + F12发现目标字符串

`flag{My_fl@g_h4s_`

在函数栏里搜索  `_` 发现第二段 `br0ken_4parT_`

点进去后对函数头按下X发现引用路径 `int func718()`，转换成字符后发现不够，转换成汇编代码发现余下部分。结合得到flag: ``flag{My_fl@g_h4s_br0ken_4parT_f1x_1t!}``

## 你真的是大学生吗
DIE查看发现是16位文件，无法运行。在ida里只能查看汇编代码和流程图。分析得知逻辑:输入的20个字符首先第零位和第19位进行异或，代替第十八位，19位和18位异或代替17位。。。以此类推将整个输入除了第19位全部替换。由于异或的逆运算是本身，所以得到解密脚本

```python
# 待比较的字节序列
enc = [
    0x76, 0x0E, 0x77, 0x14, 0x60, 0x06, 0x7D, 0x04, 0x6B, 0x1E,
    0x41, 0x2A, 0x44, 0x2B, 0x5C, 0x03, 0x3B, 0x0B, 0x33, 0x05
]

denc = []

for i in range(19):
    denc.append(chr(enc[i] ^ enc[i+1]))
for i in denc:
    print(i,end='')
# 最后一位为 '}'
# flag: xyctf{you_know_8086}
```

## DebugMe
jeb打开文件后分析java

```java
  public void onClick(View view0) {
                if(Debug.isDebuggerConnected()) {
                    Toast.makeText(MainActivity.this, What.x("WikFhRxyYjoSJ8mMbM3fRwty/74bc7Ip7ojqenHaSqc9wDv3JDG9XfV6xEiC7Eg1RWTUa4LaM%2BD0W%2BPKanSA5w=="), 0).show();
                    return;
                }

                Toast.makeText(MainActivity.this, "flag呢", 0).show();
            }
```

发现关键部分，只要检测到调试就会自动解密就会弹出flag。用模拟器连接调试得到 flag: 

## TrustMe
启动后需要输入用户名和密码。打开源码发现用户名是个RC4加密

```java
 if(MainActivity.bytesToHex(MainActivity.RC4(textView1.getText().toString().getBytes(), "XYCTF".getBytes())).equals("5a3c46e0228b444decc7651c8a7ca93ba4cb35a46f7eb589bef4")) {
            Toast.makeText(this, "成功!", 0);
```

在线解密可得账户`The Real username is admin`

接着查看剩下的类没有发现具体处理密码的痕迹。但是在 `ProxyApplication` 类中发现了文件读入读出，以及一个可疑的异或

```java
private byte[] decrypt(byte[] arr_b) {
        for(int v = 0; v < arr_b.length; ++v) {
            arr_b[v] = (byte)(arr_b[v] ^ 0xFF);
        }

        return arr_b;
    }
```

继续往下查看发现

```java
private byte[] readDexFileFromApk() throws IOException {
        ByteArrayOutputStream byteArrayOutputStream0 = new ByteArrayOutputStream();
        ZipInputStream zipInputStream0 = new ZipInputStream(new BufferedInputStream(new FileInputStream(this.getApplicationInfo().sourceDir)));
        while(true) {
            ZipEntry zipEntry0 = zipInputStream0.getNextEntry();
            if(zipEntry0 == null) {
                break;
            }
```

百度后发现是加壳的方法，

继续往下发现最重要的方法：

```java
 private void splitPayloadFromDex(byte[] arr_b) throws IOException {
        byte[] arr_b1 = new byte[4];
        System.arraycopy(arr_b, arr_b.length - 4, arr_b1, 0, 4);
        int v = new DataInputStream(new ByteArrayInputStream(arr_b1)).readInt();
        byte[] arr_b2 = new byte[v];
        System.arraycopy(arr_b, arr_b.length - 4 - v, arr_b2, 0, v);
        byte[] arr_b3 = this.decrypt(arr_b2);
        File file0 = new File(this.apkFileName);
        FileOutputStream fileOutputStream0 = new FileOutputStream(file0);
        fileOutputStream0.write(arr_b3);
        fileOutputStream0.close();
        ZipInputStream zipInputStream0 = new ZipInputStream(new BufferedInputStream(new FileInputStream(file0)));
        while(true) {
            ZipEntry zipEntry0 = zipInputStream0.getNextEntry();
            if(zipEntry0 == null) {
                break;
            }

            String s = zipEntry0.getName();
            if((s.startsWith("lib/")) && (s.endsWith(".so"))) {
                File file1 = new File(this.libPath + "/" + s.substring(s.lastIndexOf("/")));
                file1.createNewFile();
                FileOutputStream fileOutputStream1 = new FileOutputStream(file1);
                byte[] arr_b4 = new byte[0x400];
                while(true) {
                    int v1 = zipInputStream0.read(arr_b4);
                    if(v1 == -1) {
                        break;
                    }

                    fileOutputStream1.write(arr_b4, 0, v1);
                }

                fileOutputStream1.flush();
                fileOutputStream1.close();
            }

            zipInputStream0.closeEntry();
        }

        zipInputStream0.close();
        zipInputStream0.close();
    }
}

```

百度函数名后发现类似题目： `[[原创\]安卓逆向之2016年华山杯CTF安卓writeUp-Android安全-看雪-安全社区|安全招聘|kanxue.com](https://bbs.kanxue.com/thread-218555.htm)`

**通过以上分析，我们可以得到加壳了以后的apk的结构应该是：**   
+——-+———–|——————+   
+ 壳子 | 原始apk | 原始apk的长度 |   
+ ——+———–+——————+

模仿java代码写出提取脚本：

```python
import os
import struct


def new_byte(path):
    with open(path, 'rb') as file:
        src_len = file.read()

    decrypt_len = struct.unpack('>I', src_len[-4:])[0]
    print("长度是：{:x}".format(decrypt_len))

    new_dex_byte = src_len[-4 - decrypt_len:-4]

    decrypted_data = bytes([b ^ 0xFF for b in new_dex_byte])

    output_path = r"G:\Chanllages\xyctf\notrust\new_write_dex.apk"
    with open(output_path, 'wb') as file:
        file.write(decrypted_data)

    return decrypted_data


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        path = sys.argv[1]
        new_byte(path)
    else:
        print("请提供Dex文件的路径！")

```

打开提取后的apk文件终于发现hint所说的简单漏洞是什么了

```java
public class MainActivity extends AppCompatActivity {
    public void onClick(View view0) {
        TextView textView0 = (TextView)this.findViewById(id.username);
        TextView textView1 = (TextView)this.findViewById(id.password);
        String s = textView0.getText().toString();
        String s1 = textView1.getText().toString();
        SQLiteDatabase sQLiteDatabase0 = new DBHelper(this.getApplicationContext()).getReadableDatabase();
        String s2 = "SELECT * FROM User WHERE username = \'" + s + "\' AND password = \'" + s1 + "\'";
        Log.i("SQL语句", s2);
        try {
            Cursor cursor0 = sQLiteDatabase0.rawQuery(s2, null);
            if(cursor0 != null && (cursor0.moveToFirst())) {
                Log.d("Login", "登录成功");
                Cursor cursor1 = sQLiteDatabase0.rawQuery("SELECT password FROM User WHERE username = \'flag\'", null);
                if(cursor1 != null && (cursor1.moveToFirst())) {
                    String s3 = cursor1.getString(cursor1.getColumnIndex("password"));
                    Builder alertDialog$Builder0 = new Builder(this);
                    alertDialog$Builder0.setTitle("登录成功!");
                    alertDialog$Builder0.setMessage("flag: " + s3);
                    alertDialog$Builder0.setPositiveButton("确定", null);
                    alertDialog$Builder0.show();
                }

                if(cursor1 != null) {
                    cursor1.close();
                }
            }
            else {
                Log.d("Login", "登录失败");
                Builder alertDialog$Builder1 = new Builder(this);
                alertDialog$Builder1.setTitle("Failed");
                alertDialog$Builder1.setMessage("登录失败，如果不知道用户名的话想想之前是否漏了什么提示没有解密");
                alertDialog$Builder1.setPositiveButton("收到", null);
                alertDialog$Builder1.show();
            }

            if(cursor0 != null) {
                cursor0.close();
            }
        }
        catch(Exception exception0) {
            try {
                Log.d("Login", "SQL查询错误: " + exception0.getMessage());
            }
            catch(Throwable throwable0) {
                sQLiteDatabase0.close();
                throw throwable0;
            }
        }
        catch(Throwable throwable0) {
            sQLiteDatabase0.close();
            throw throwable0;
        }

        sQLiteDatabase0.close();
    }
```

简单的MySQL漏洞，在账户处输入`admin' or '1' = '1 `即可构建万能密码

获得flag: `XYCTF{And0r1d_15_V3ryEasy}`

## 砸核桃
放入die中发现是国产加密，百度到拖壳器后得到文件

题目很实诚，加密方法就在main里面

```c
 if ( strlen(Buffer) == 42 )
  {
    v4 = 0;
    while ( (Buffer[v4] ^ byte_402130[v4 % 16]) == dword_402150[v4] )
    {
      if ( ++v4 >= 42 )
      {
        printf("right!\n");
        return 0;
      }
    }
    printf("error!\n");
    return 0;
  }
  else
  {
    printf("error!\n");
    return -1;
  }
```

显然flag长度是42，点击byte_402130和dword_402150即可得到解密所需要的数据（虽然后者内含大量无关的0x00）

写出解密脚本:

```python
#删除所有0x00即可
byte_402130 = 'this_is_not_flag'
dword_402150 = [ 0x12,0x4,0x8,0x14,0x24,0x5c,0x4a,0x3d,0x56,0xa,0x10,0x67,0x00,0x41,0x00,0x1,0x46,0x5a,0x44,0x42,0x6e,0xc,0x44,0x72,0x0c,0x0d,0x40,0x3E,0x4B, 0x5F, 0x2, 0x1, 0x4C, 0x5E, 0x5B, 0x17, 0x6E, 0x0C ,0x16,0x68,0x5b,0x12,0x02,0x48,0x0e]

x = ''

for i in range(0,42):
    x += chr(dword_402150[i]^ord(byte_402130[i%16]))

print(x)
#flag: flag{59b8ed8f-af22-11e7-bb4a-3cf862d1ee75}
```

## Ez_enc
die查看无壳，扔进ida中，发现没有main函数，但是又start函数，进去走几步后无果。开始查找字符串，内含大量无用信息，但是发现最下方有奇怪的字符串 `.data:000000014001E000	00000007	C	IMouto` 百度后发现是妹控相关（二次元真下头）。查看交叉引用发现加密函数：

```cpp
_int64 sub_140011960()
{
  signed int i; // [rsp+44h] [rbp+24h]
  int j; // [rsp+64h] [rbp+44h]

  sub_14001137F((__int64)&unk_140023008);
  sub_1400111A4(&unk_14001ACB0);
  sub_1400111A4(&unk_14001AE60);
  sub_1400111A4(&unk_14001AF20);
  sub_1400111A4(&unk_14001B1A0);
  sub_1400111A4(&unk_14001B290);
  sub_1400111A4(&unk_14001B640);
  sub_1400111A4(&unk_14001AE18);
  sub_14001109B(&unk_14001BA14, Str);
  for ( i = 0; i < (int)(j_strlen(Str) - 1); ++i )
    Str[i] = aImouto[i % 6] ^ (Str[i + 1] + (unsigned __int8)Str[i] % 20);
  for ( j = 0; j < (int)j_strlen(Str); ++j )
  {
    if ( Str[j] != byte_14001E008[j] )
    {
      sub_1400111A4("Wrong");
      return 0i64;
    }
  }
  sub_1400111A4("Right,but where is my Imouto?\n");
  return 0i64;
}
```

前面几个函数估计是输出终端中的虾头发言，重点在于第一个循环。最后的比对内容点击即可获得，但是困难的是前面的加密。将34个字符处理33个，但是由于是取余运算导致结果多样且之后的解密高度依赖先前的解密。再询问群内佬后了解了DFS（深度优先算法，西湖论剑时遇见过但是没有认真学，那题到现在都还没有复现。。）,网上学习速成后得到脚本：

```python
def decrypt(enc, key):
    N = len(enc)
    Str = [0] * N  # 初始化解密后的字符串数组
    key = [ord(c) for c in key]  # 将key字符串转换为其ASCII值的列表

    # 尝试解密从最后一个已知的Str[N-1]
    Str[N-1] = enc[N-1]  # 最后一个字符未被加密修改

    # 从后向前递归解密每个字符
    def decrypt_character(i):
        if i < 0:
            return True  # 成功解密所有字符
        for possible_char in range(32, 127):  # 只考虑ASCII的可见字符
            # 检查这个字符是否能够适应加密方程
            if key[i % 6] ^ (Str[i + 1] + possible_char % 20) == enc[i]:
                Str[i] = possible_char
                if decrypt_character(i - 1):  # 递归密解前一个字符
                    return True
        return False

    if decrypt_character(N-2):  # 从倒数第二个字符开始解密
        return ''.join(chr(x) for x in Str)
    return "Decryption failed"

enc = [0x27, 0x24, 0x17, 0x0B, 0x50, 0x03, 0xC8, 0x0C, 0x1F, 0x17,
       0x36, 0x55, 0xCB, 0x2D, 0xE9, 0x32, 0x0E, 0x11, 0x26, 0x02,
       0x0C, 0x07, 0xFC, 0x27, 0x3D, 0x2D, 0xED, 0x35, 0x59, 0xEB,
       0x3C, 0x3E, 0xE4, 0x7D]
key = 'IMouto'

decrypted_text = decrypt(enc, key)
print("Decrypted text:", decrypted_text)
#output：*lag{!_r3ea11y_w4nt_@_cu7e_s1$ter}
```

没有特别处理第一个字符，改成f后flag正确。

## 熊博士
以为是凯撒密码但是解密后显然不对，基于对这种没头没脑的密码题的认识，百度关键词“熊博士”和解密发现埃特巴什码 - Atbash Cipher。在线网站解密后得到flag: xyctf{liu_ye_mei_you_xiao_jj}(头要改成大写)

## zzl的护理小课堂
老老实实完成所有题目后遭遇雌小鬼，怒而按下F12发现真相。

```html
 <script>
        document.getElementById('quizForm').addEventListener('submit', function(event) {
            event.preventDefault(); 
    
            var formData = new FormData(this);
    
            var xhr = new XMLHttpRequest(); 
            xhr.open('POST', 'getScore.php', true); 
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && xhr.status === 200) { 
                    var score = xhr.responseText;
                    if(score != 111111110) {
                        var flagXhr = new XMLHttpRequest(); 
                        flagXhr.open('GET', 'flag.php', true);
                        flagXhr.onreadystatechange = function() {
                            if (flagXhr.readyState === 4 && flagXhr.status === 200) {
                                var flag = flagXhr.responseText;
                                document.getElementById('scoreDisplay').innerText = "Flag: " + flag;
                            }
                        };
                        flagXhr.send(); // 发送请求获取 flag
                    }
                }
            };
            xhr.send(formData); // 发送请求获取分数
        });
    </script>

```

用修改条件后的网页替代后得到flag： XYCTF{Z2I_T3IL_YOU_2991b3d1fb37}

## 签到
公众号关注并输入特定字符后得到flag ： XYCTF{WELCOME_TO_XYCTF}

## game
在某个单机游戏贴吧里发帖得到回应，游戏是paper，please。按格式输入即可。

## 真<签到
发现无法解压后010打开，发现flag：XYCTF{59bd0e77d13c_1406b23219e_f91cf3a_153e8ea4_77508ba}