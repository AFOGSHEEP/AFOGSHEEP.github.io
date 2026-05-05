---
title: 无重复字符的最长子串
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

给定一个字符串 `s` ，请你找出其中不含有重复字符的 最长 子串 的长度。



示例 1:

```plain
输入: s = "abcabcbb"
输出: 3 
解释: 因为无重复字符的最长子串是 "abc"，所以其长度为 3。注意 "bca" 和 "cab" 也是正确答案。
```

示例 2:

```plain
输入: s = "bbbbb"
输出: 1
解释: 因为无重复字符的最长子串是 "b"，所以其长度为 1。
```

示例 3:

```plain
输入: s = "pwwkew"
输出: 3
解释: 因为无重复字符的最长子串是 "wke"，所以其长度为 3。
     请注意，你的答案必须是 子串 的长度，"pwke" 是一个子序列，不是子串。
```





思路：创建哈希表B，int的计数器count，容器c,遍历s，同步放入s每位的值和其对应在s中的位置，当遍历到重复的，存count的值进c，重置count的值为一，清空哈希表，再开始遍历的位置移动到当前重复的字符的位置的下一位，直到遍历完s。取最大值。

初始代码：

```cpp
#include <bits/stdc++.h>
using namespace std;

int lengthOfLongestSubstring_bruteforce(const string &s) {
    unordered_map<char,int> pos ;
    int n = static_cast<int>(s.size());
    int best = 0;
    int i = 0;

    while(i < n){
        pos.clear();
        int count = 0;
        int j = i;
        for(;j<n;++j){
            if(pos.count(s[j]){
                //此时发生了重复，记录当前长度并返回到重复字符的下一位
                best = max(best,count);
                i = pos[s[j]] + 1;
                break;
            }
            else{
                pos[s[j]] = j;
                count++;
            }
            
        }
        if(j == n){
            best = max(best,count);
            break;
        }
    }
    
        
    return best;
    
}

```

运行结果：

{% asset_img image-0.png %}



1. 不需要清空整个哈希表 - 只需要删除窗口起始位置之前的字符，
2. 不需要容器c存储所有count - 只需要维护一个最大值，使用max函数
3. 移动起始位置的方法可以更高效 - 可以直接跳到重复字符的下一位



改为完全滑动窗口：

```cpp
// 滑动窗口版本
int lengthOfLongestSubstring(string &s) {
  unordered_map<char, int> pos; // 记录字符 -> 位置
  int n = static_cast<int>(s.size());
  int best = 0;
  int right = 0; // 当前窗口 [left, right)
  int left = 0;
  for (; right < n; ++right) {
    char c = s[right];
    if (pos.count(c) && pos[c] >= left) {
      // 此时滑动窗口刚遇见重复字符，更新左边界
      left = pos[c] + 1;
    } else {
      // 未遇见重复字符，更新最大长度并扩展右边界
      best = max(best, right - left + 1);
    }
    pos[c] = right; // 记录字符最新位置
  }
  return best;
}
```