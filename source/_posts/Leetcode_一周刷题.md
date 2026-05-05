---
title: 一周刷题
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

1 周刷题计划（侧重哈希→双指针→栈队列→图搜索→贪心）

Day 1 哈希表

知识：哈希表 O(1) 查找、冲突概念；unordered_map/unordered_set 用法。  
题单：Two Sum、Two Sum II（有序用双指针对比）、Valid Anagram、Isomorphic Strings。  
练习：一遍哈希 vs 两遍哈希，写出复杂度；手推哈希表状态。  
Day 2 双指针 / 滑窗

知识：左右夹逼、快慢指针、固定左扩右缩的滑窗。  
题单：3Sum、3Sum Closest、Container With Most Water、Longest Substring Without Repeating Characters（滑窗 + 哈希）。  
练习：画指针移动轨迹，解释窗口维护不变量。  
Day 3 栈 / 单调栈

知识：栈的典型用途、单调递增/递减栈找“下一个更大/更小”。  
题单：Valid Parentheses、Min Stack、Daily Temperatures、Next Greater Element I/II。  
练习：手动画栈变化，说明为何单调性保证 O(n)。  
Day 4 队列 / 单调队列 / BFS

知识：队列 FIFO，单调队列维护窗口最值，BFS 分层。  
题单：Sliding Window Maximum（单调队列）、Rotting Oranges（BFS）、Binary Tree Level Order Traversal。  
练习：对滑窗最大值的队列状态逐步模拟。  
Day 5 DFS / 回溯

知识：前序/中序/后序，回溯模板（选择→递归→撤销）。  
题单：Subsets、Permutations、Combination Sum、Number of Islands（DFS 版本）。  
练习：写出回溯函数的参数含义与剪枝点。  
Day 6 排序 / 贪心

知识：排序带来的有序性 + 贪心可行性证明思路。  
题单：Merge Intervals、Non-overlapping Intervals、Assign Cookies、Jump Game。  
练习：给出贪心选择的理由（如区间按结束时间排序）。  
Day 7 综合与复盘

组合练习：K Sum 模板（2Sum 基础 + 排序双指针）、Sliding Window 混合哈希。  
复盘：总结每类题的模板与易错点，整理一份“模板小抄”。  
检测：计时完成若干题，关注正确率与思路复现速度。  
方法建议

每题用 10–20 分钟想思路，若卡住再看提示；写完后手动跑示例，分析复杂度。  
记录错因：漏条件、边界、顺序（先查后存等）、类型溢出/有符号无符号比较。  
若时间紧，可各日挑 3–4 题完成核心思路；有余力再做延伸题。