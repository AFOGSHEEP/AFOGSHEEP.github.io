---
title: "## 题目要点"
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

# 
## 题目要点
+ 给定一个整数数组 `nums` 和目标值 `target`，找出所有不重复的四元组 `[a, b, c, d]`，使得 `a + b + c + d == target`。
+ 结果中不能有重复四元组。

## 核心思路
+ 先对数组排序。
+ 固定前两个数 `nums[i]`、`nums[j]`。
+ 剩下两个数用双指针 `left`、`right` 在有序数组中夹逼查找。
+ 遇到命中结果时，把四元组加入答案，并跳过重复值。

## 为什么这样做
+ 排序后可以用双指针把四数之和降成三层结构：`i`、`j` 枚举，`left/right` 收缩。
+ 相比暴力四重循环，复杂度从 `O(n^4)` 降到 `O(n^3)`。

## 关键实现细节
+ 使用 `long long` 计算和，避免四个 `int` 相加溢出。
+ 数组长度小于 4 时直接返回空结果。
+ 去重规则：
    - `i > 0 && nums[i] == nums[i - 1]` 时跳过。
    - `j > i + 1 && nums[j] == nums[j - 1]` 时跳过。
    - 找到答案后，`left` 和 `right` 都要跳过重复值。

## 常见坑
+ 返回类型必须是 `vector<vector<int>>`，不能误写成 `vector<string>`。
+ 结果里保存的是四个整数，不要拼成字符串。
+ 不能直接用 `nums.size() - 3` 之类的表达式而不做长度判断，短数组时容易出问题。
+ 求和一定要防溢出，尤其是数据范围较大时。

## 复杂度
+ 时间复杂度：`O(n^3)`
+ 空间复杂度：`O(1)`，不算输出结果

```markdown

class Solution {
public:
    vector<vector<int>> fourSum(vector<int>& nums, int target) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> res;
        int n = nums.size();
        if (n < 4) return res;

        for (int i = 0; i < n - 3; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            for (int j = i + 1; j < n - 2; j++) {
                if (j > i + 1 && nums[j] == nums[j - 1]) continue;

                int left = j + 1, right = n - 1;
                while (left < right) {
                    long long sum = 1LL * nums[i] + nums[j] + nums[left] + nums[right];
                    if (sum == target) {
                        res.push_back({nums[i], nums[j], nums[left], nums[right]});
                        while (left < right && nums[left] == nums[left + 1]) left++;
                        while (left < right && nums[right] == nums[right - 1]) right--;
                        left++;
                        right--;
                    } else if (sum < target) {
                        left++;
                    } else {
                        right--;
                    }
                }
            }
        }
        return res;
    }
};

```