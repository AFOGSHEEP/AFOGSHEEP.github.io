---
title: 递归小谈
date: 2024-09-28 21:46:02
categories:
  - 学习笔记
tags:
  - C++
---

---

date: 2024-09-28 21:46:02  
# 递归小谈
考虑以下的递归公式：

					$![image](https://cdn.nlark.com/yuque/__latex/bddea37d8316c7948ea358e70d01ecee.svg)$

用C语言表示如下：

```cpp
int factorial(int n) {
 if (n == 0) {
     return 1;
 }
 else 
     {
     return n * factorial(n - 1);
         }
 }
 

```

## 递归思维
用递归解决问题需要两个步骤： 首先，确定如何解决简单情况的问题。

 ● 这称为基本情况（base case）。 其次，确定如何将较大情况分解为较小的实例。 

 ● 这称为递归步骤（recursive step）。

```python
if (问题非常简单) {
    # 直接解决问题
    return 解决方案;
} else {
    # 将问题分解为一个或多个与原问题结构相同的子问题
    # 解决每个子问题
    # 将结果合并以得到整体解决方案
    return 整体解决方案;
}
```

现在试试把以下代码改写成递归的形式：

```cpp
 int sumOfDigitsOf(int n) {
     int result = 0;
     while (n > 0) {
         result += (n % 10);
         n /= 10;
     }
 return result;
 }
```

示例:

```cpp
int sumOfDigitsOf(int n) {
    // 基本情况：如果 n 为 0，返回 0
    if (n == 0) {
        return 0;
    }
    // 递归步骤：取出最低位 (n % 10) + 剩余部分的递归结果 (n / 10)
    return (n % 10) + sumOfDigitsOf(n / 10);
}

```

## 数根问题
数根是指通过反复将数字的各位数相加，直到得到一个个位数为止。

5 的数根是什么？ 5 已经是一个个位数，所以答案是 5。

27 的数根是什么？ 2 + 7 = 9。  答案是 9。

137 的数根是什么？用代码来解决。

```cpp
int digitalRoot(int n) {
    // 基本情况：如果 n 是个位数，直接返回 n
    if (n < 10) {
        return n;
    }
    // 递归步骤：将各个位数相加，继续递归调用
    return digitalRoot(n % 10 + digitalRoot(n / 10));
}

```

现在尝试利用递归来逆转字符串：

```cpp
#include <iostream>
#include <string>

using namespace std;

// 递归函数，用于逆转字符串
string reverseString(string s) {
    // 基本情况：如果字符串为空或者只有一个字符，则直接返回
    if (s.empty() || s.length() == 1) {
        return s;
    }
    
    // 递归步骤：将第一个字符放在最后，其余部分递归处理
    return reverseString(s.substr(1)) + s[0];
}

void solve() {
    string s;
    
    // 读取输入字符串
    cin >> s;

    // 输出原始字符串的长度
    cout << s.length() << endl;

    // 输出原始字符串，每个字符用空格分隔
    for(auto fw : s) {
        cout << fw << ' ';
    }
    cout << endl;

    // 调用递归函数，输出逆转后的字符串
    cout << reverseString(s) << endl;
}

```







用标准库的做法

```cpp
#include <iostream>
#include <string>
#include <algorithm> // 包含 reverse 函数

using namespace std;

void solve() {
    string s;
    
    // 读取输入字符串
    cin >> s;

    // 输出字符串长度
    cout << s.length() << endl;

    // 遍历并输出原始字符串的每个字符，字符之间用空格分隔
    for(auto fw : s) {
        cout << fw << ' ';
    }
    cout << endl;

    // 逆转字符串
    reverse(s.begin(), s.end());

    // 输出逆转后的字符串
    for(auto fw : s) {
        cout << fw;
    }
    cout << endl;

    return;
}
```