---
title: 判断整数回文
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

```cpp
#include<iostream>
#include<string>

using namespace std;

class Solution{
    public:
    bool isPalindrome(int x){
        string str = to_string(x);
        int left =0, right = str.size() - 1;
        while(left < right){
            if(str[left] != str[right]){
                return false;
            }
            left++;
            right--;
        }
        return true;

    }

};
```

算是最简单的一道题了



评论区看到了不转换成字符串的做法

```cpp
bool isPalindrome(int x) {
    if(x<0||x%10==0&&x!=0)return false;
    int reversedHalf=0;
    while(x>reversedHalf){
        reversedHalf=reversedHalf*10+x%10;
        x/=10;
    }
    return x==reversedHalf||x==reversedHalf/10;
}
```