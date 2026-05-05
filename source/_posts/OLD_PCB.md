---
title: 鹏城杯三道
date: 2024-11-19 24:00:56
categories:
  - 学习笔记
tags:
  - CTF
---

---

date: 2024-11-19 24:00:56  
日常做不出题。。。要是功力有这师傅一半深就好了...orz...

# Rafflesia
去花指令后即可得到

```plain
en = 'H@^jHwpsH)[jH{M/\\tBBK_|-O{W.iJZ7\\)|~zaB^H+Lwv{SS|-j@\\_[Y'
de = ''
for i in range(len(en)):
    de += chr(ord(en[i])^0x18)
print(de)
```

PXFrPohkP1CrPcU7DlZZSGd5WcO6qRB/D1dfbyZFP3ToncKKd5rXDGCA

接着是tls改了表

HElRNYGmBOMWnbDvUCgcpu1QdPqJIS+iTry39KXse4jLh/x26Ff5Z7Vokt8wzAa0

赛博厨子解密得到

flag{8edae458-4tf3-2ph2-9f26-1f8719ec8f8d}

# joyVBS
用vbsedit打开，运行即可得到源码，找到

{% asset_img image-0.png %}

{% asset_img image-1.png %}

flag{VB3_1s_S0_e1sY_4_u_r1gh3?btw_1t_iS_a1s0_Us3Fu1_a3D_1nTe3eSt1ng!}

# RE5
{% asset_img image-2.png %}



主要加密函数

{% asset_img image-3.png %}

发现是魔改的tea。

我们尝试进行解密，钥匙为1 2 3 4

但是不对，猜测有tls，继续找

{% asset_img image-4.png %}

函数挺少的，我们直接在函数窗口一个一个找

然后发现这个

{% asset_img image-5.png %}

我们发现他用0作为种子给到srand里面，用rand进行传值

{% asset_img image-6.png %}

第二次定位

{% asset_img image-7.png %}

我们动调发现了

我们打印一下rand值：

{% asset_img image-8.png %}

{% asset_img image-9.png %}

就是delta加上rand

直接写个tea解密脚本就好

这个其实还是不对，我们用初始值进行查看发现key被改为了2 2 3 3

{% asset_img image-10.png %}

是通过异常来控制的

这下对了

```c
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

void tea(uint32_t* v) {
    uint32_t v6 = v[0], v5 = v[1], i;
    uint32_t v4 = 0;

    uint32_t rand1[64] = {};
    uint32_t a2[4] = {
        2,2,3,3
    };
    for (i = 0; i < 32; i++)
    {
        rand1[i] = rand();
        //printf("0x%x,", randnum[i]);
    }
    for (i = 0; i < 32; i++)
    {
        v4 += randnum[i];
        //printf("0x%x,", v4);
    }
    for (i = 0; i < 32; i++) {
        v5 -= (a2[3] + (v6 >> 5)) ^ (v4 + v6) ^ (a2[2] + 16 * v6);
        v6 -= (a2[1] + (v5 >> 5)) ^ (v4 + v5) ^ (a2[0] + 16 * v5);
        v4 -= randnum[32-1-i];

    }
    v[0] = v6; v[1] = v5;
}
int main()
{
    uint32_t data[8] = { 0x0EA2063F8,0x8F66F252,0x902A72EF,0x411FDA74,0x19590d4d, 0xcae74317, 0x63870f3f, 0xd753ae61 };
    uint32_t temp[2] = { 0,0 };
    int i = 0;
    srand(0);
    for (i = 0; i < 8; i += 2)
    {
        temp[0] = data[i];
        temp[1] = data[i + 1];
        tea(temp);
        printf("%c%c%c%c%c%c%c%c", *((char*)&temp[0] + 0), *((char*)&temp[0] + 1), *((char*)&temp[0] + 2), *((char*)&temp[0] + 3), *((char*)&temp[1] + 0), *((char*)&temp[1] + 1), *((char*)&temp[1] + 2), *((char*)&temp[1] + 3));
    }
    return 0;
}
```

d555ce75ec293c8ed232d83dffb0ff82