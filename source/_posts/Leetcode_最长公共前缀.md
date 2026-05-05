---
title: 最长公共前缀
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

{% asset_img image-0.png %}



最短板原则

```cpp
#include<string>
#include<vector>

using namespace std;

    


class Solution{
    public:
    string longestCommonPrefix(vector<string>& strs) {
        if(strs.empty()) return "";
        if(strs.size() == 1) return strs[0];
        int minStrIndex = 0;    //寻找最短的字符串
        for(int i = 0 ;i< strs.size();++i){
            if(strs[i].size() < strs[minStrIndex].size()){
                minStrIndex = i;
            }
        }

        const string& base =  strs[minStrIndex];
        int index = 0;
        for(; index < strs[minStrIndex].size(); index++){
            char c = base[index];
            for(int i = 0; i < strs.size(); i++){
                if(strs[i][index] != c){
                    return base.substr(0,index);
                }
            }
        }
        return base;
}

};





```