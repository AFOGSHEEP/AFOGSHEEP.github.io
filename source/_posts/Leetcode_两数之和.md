---
title: 两数之和
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

完成代码	

```cpp

class Solution {
public:
  vector<int> twoSum(vector<int> &nums, int target) {
    unordered_map<int, int> idx; // value -> index
    for (int i = 0; i < static_cast<int>(nums.size()); ++i) {
      int need = target - nums[i];
      if (idx.count(need)) {
        return {idx[need], i};
      }
      idx[nums[i]] = i;
    }
    return {}; // 理论上不会走到这里
  }
};
```