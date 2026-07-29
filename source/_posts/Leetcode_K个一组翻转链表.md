---
title: K 个一组翻转链表 (Reverse Nodes in k-Group)
date: 2026-07-28 00:00:00
categories:
  - Leetcode
tags:
  - 算法
  - 链表
  - 翻转
---

## Problem statement

给你一个链表，每 k 个节点一组进行翻转，返回修改后的链表。k 是一个正整数，小于等于链表长度。如果节点总数不是 k 的整数倍，最后剩余的节点保持原样。不能修改节点的值，只能改节点指向。要求 O(1) 额外空间。

Example: `head = [1,2,3,4,5], k=2 → [2,1,4,3,5]` / `k=3 → [3,2,1,4,5]`


## My Solution

### 思路

先处理特殊情况：空链表或 k=1 直接返回。建哑节点接在 head 前。每次翻转前从当前节点往后数 k 个，不够 k 就说明到了最后一组不足量的尾巴，退出循环。

翻转部分用头插法：遍历 k 个节点，逐个摘下插入 reversed 链。翻完后 reversed 是新头，原来的第一个节点变成了尾。用 prevGroup 保存上一组的尾节点，翻完一组后：prevGroup 指向新头（reversed）、新尾指向剩余节点（cur）、prevGroup 移动到新尾。简化为三步——数 k 个、翻 k 个、接回去。

### 代码

```cpp
class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        if (!head || k == 1) return head;

        ListNode dummy(0);
        dummy.next = head;
        ListNode* prevGroup = &dummy;

        while (prevGroup->next) {
            // 检查剩余是否够 k 个
            ListNode* end = prevGroup->next;
            int i = 0;
            while (end && i < k) { end = end->next; i++; }
            if (i < k) break;

            // 头插法翻转 k 个节点
            ListNode* cur = prevGroup->next;
            ListNode* reversed = nullptr;
            for (int j = 0; j < k; j++) {
                ListNode* nxt = cur->next;
                cur->next = reversed;
                reversed = cur;
                cur = nxt;
            }

            // 接回原链
            ListNode* oldHead = prevGroup->next;
            prevGroup->next = reversed;
            oldHead->next = cur;
            prevGroup = oldHead;
        }

        return dummy.next;
    }
};
```

哑节点统一处理头部翻转问题。头插法是反转单链表的标准写法，不需要单独写 reverse 函数。关键是翻转后保持前后连接不断掉。
