---
title: 最长回文子串
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

给你一个字符串 `s`，找到 `s` 中最长的 回文 子串。



示例 1：

```plain
输入：s = "babad"
输出："bab"
解释："aba" 同样是符合题意的答案。
```

示例 2：

```plain
输入：s = "cbbd"
输出："bb"
```

思路：

先写一个判断字符串是不是回文的函数，比如

```cpp
int isPalindrome(string input){
    return equal(input.begin(),input.begin()+ input.length()/2,input.rbegin()); 
    // rbegin()从end开始向前遍历
}
```



然后开始遍历字符串，如果是就提取出回文字符串，之后如果再有就判断长度谁打谁小，遍历完后输出答案。



说起来容易写起来1还行，相对来说

```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        if(s.empty()){
            return "";
        }
        //记录回文的起始与最大长度
        int start = 0;
        int maxlen = 0;
        //寻找中心点
        for(int i = 0 ; i< s.size(); ++i ){
            //奇偶分别讨论
            int len1 = expandAroundCenter(s, i, i);
            int len2 = expandAroundCenter(s, i, i+1);
            int len3 = max(len1,len2);

            if(len3 > maxlen){
                start = i -(len3 - 1)/2;
            maxlen = max(maxlen,len3);
            }

        }
        return s.substr(start,maxlen);
    }


private:
    int expandAroundCenter(string s, int left, int right){
        int length = static_cast<int>(s.size());
        while(right < length && left >= 0 && s[left] == s[right]){
                --left;
                ++right;
            //结束时已经超出回文范围

            }
            return right - left -1;
        };


};
```

{% asset_img image-0.png %}



附带一个deepseek的版本：

```cpp
class Solution {
public:
    string longestPalindrome(string s) {
        if (s.empty()) return "";
        
        int start = 0;  // 最长回文子串的起始位置
        int maxLen = 1; // 最长回文子串的长度
        
        // 遍历每个可能的中心
        for (int i = 0; i < s.length(); i++) {
            // 以 s[i] 为中心，奇数长度回文
            int len1 = expandAroundCenter(s, i, i);
            
            // 以 s[i] 和 s[i+1] 为中心，偶数长度回文
            int len2 = expandAroundCenter(s, i, i + 1);
            
            // 取两种情况中的较长者
            int len = max(len1, len2);
            
            if (len > maxLen) {
                maxLen = len;
                // 计算起始位置
                start = i - (len - 1) / 2;
            }
        }
        
        return s.substr(start, maxLen);
    }
    
private:
    // 从中心向两边扩展，返回回文长度
    int expandAroundCenter(const string& s, int left, int right) {
        while (left >= 0 && right < s.length() && s[left] == s[right]) {
            left--;
            right++;
        }
        // 循环结束时，left和right已经超出了回文范围
        // 回文实际范围是 [left+1, right-1]
        // 长度 = (right-1) - (left+1) + 1 = right - left - 1
        return right - left - 1;
    }
};
```

### {% asset_img image-1.png %}  
  
  
他的建议：
经过仔细对比，我发现有两个主要区别：

1. 你的版本中，`expandAroundCenter`函数的参数是`string s`，即按值传递字符串，这会拷贝整个字符串，导致性能下降。  
而我的版本使用的是`const string& s`，即按引用传递，避免了拷贝。
2. 另外，你的版本中在计算`maxlen`时，虽然已经用`len3`和`maxlen`比较，但在更新时又调用了一次`max(maxlen, len3)`，这是多余的，因为已经确定`len3 > maxlen`。

但是，最关键的性能差异应该是字符串的拷贝。当字符串很长时，每次调用`expandAroundCenter`都会复制整个字符串，这会导致巨大的开销。

另外，你的版本中`maxlen`初始化为0，而我的版本初始化为1。这个初始化值不会影响正确性，但可能会稍微影响一点性能，因为当字符串非空时，至少有一个字符，所以从1开始可以减少一些不必要的比较和更新。

所以，修改你的版本，将`expandAroundCenter`的参数改为`const string&`，并且将`maxlen`初始化为1，同时去掉多余的`max`调用，应该可以得到相似的性能。

让我们修改你的版本：

修改后：

1. 将`expandAroundCenter`的参数类型从`string s`改为`const string& s`
2. 将`maxlen`初始化为1
3. 在更新`maxlen`时，直接赋值`maxlen = len3;`，因为已经确定`len3 > maxlen`