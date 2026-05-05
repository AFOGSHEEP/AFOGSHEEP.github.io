---
title: 有效的括号
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

{% asset_img image-0.png %}



初解没有考虑分开的单类符号的情况,显然光暴力枚举没有未来。还是需要用到栈这个工具。

```cpp
#include<string>

using namespace std;

class Solution{
public:
bool isValid(string s){
    int length = s.size();
    if(length % 2 == 1){
        return false;
    }
    if((s == "()[]{}") || (s == "(){}[]") || (s == "{}()[]") || (s == "{}[]()") || (s == "[](){}") || (s == "[]{}()")){
        return true;
    }
    for(int i = 0; i < length /2; ++i){
        char c1 = s[i];
        char c2 = s[length -1 - i];
        if((c1 == '(' && c2 != ')' ) || (c1 == '{' && c2 != '}') || (c1 == '[' && c2 != ']') || (c1 == '[' && c2 != ']')){
            return false;
        }
    }
    return true;
}
};
```





标准解法





```cpp
#include <string>
#include <stack>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        if (s.size() % 2 == 1) return false;

        stack<char> st;
        for (char c : s) {
            if (c == '(' || c == '[' || c == '{') {
                st.push(c);
            } else {
                if (st.empty()) return false;
                char t = st.top();
                st.pop();
                if ((c == ')' && t != '(') ||
                    (c == ']' && t != '[') ||
                    (c == '}' && t != '{')) {
                    return false;
                }
            }
        }
        return st.empty();
    }
};
```