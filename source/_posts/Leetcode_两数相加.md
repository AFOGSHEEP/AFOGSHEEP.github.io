---
title: 两数相加
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

:::info
给你两个 非空 的链表，表示两个非负的整数。它们每位数字都是按照 逆序 的方式存储的，并且每个节点只能存储 一位 数字。

请你将两个数相加，并以相同形式返回一个表示和的链表。

你可以假设除了数字 0 之外，这两个数都不会以 0 开头。

:::

{% asset_img image-0.png %}



思路：首先判断12两个表谁长谁端，最长的链表长求出来并设定为max，然后设出最后的答案表3，目前是全空状态。分别遍历12两个表，分三种情况，12都不是空，1空2有，或者1有2空，12都是空（这时候退出遍历），都不是空时直接相加，小于10直接放入c，大于等于10时对和取10的余，这里可能要有一个函数来获得取余结果和余数，余数放入3，取余结果放入3的下一位（开始时3里面全是0），第二种情况时直接把非空的那个链表里的放入3，第三种情况结束并返回链表3。



### 为什么生成链表要用dummy节点？
+ 作用：虚拟头节点（dummy）是个占位的首节点，不存放有效数据。它让你在往结果链表里追加首个节点时，不用写“如果是第一个节点就单独处理”的分支。
+ 好处：
    - 统一逻辑：所有新节点都用“尾插”一套流程，无需区分首节点和后续节点。
    - 代码更短更少 bug：减少空指针判断和重复分支。
    - 易于返回：最终结果从 `dummy->next` 开始返回，dummy 自己只作为锚点存在。

如果不想用 dummy，也可以手写首节点分支，但代码会多几行条件判断；用 dummy 是惯用的简化手段。



### 为什么有时候是 `. `有时候是 `->`?
在 C++ 中，访问成员有两种方式：

1. `.`（点运算符）：用于对象实例
2. `->`（箭头运算符）：用于指针

### 情况1：有实际对象，用 `.`
```plain
struct ListNode {
    int val;
    ListNode* next;
};

// 创建一个实际的对象（在栈上）
ListNode node;          // node 是一个对象
node.val = 5;           // 正确：使用点号访问成员
node.next = nullptr;    // 正确：使用点号访问成员

// 注意：node.next 是一个指针，但 node 本身是对象
```

### 情况2：有指针，用 `->`
```plain
// 创建一个指针指向 ListNode
ListNode* ptr = new ListNode();  // ptr 是一个指针
ptr->val = 5;                    // 正确：使用箭头访问成员
ptr->next = nullptr;             // 正确：使用箭头访问成员

// 这等价于：
(*ptr).val = 5;                  // 解引用后用点号，但写法繁琐
```





不用单独判断链表是否为空，为空当作0即可。

dummy为哨兵节点，tail为新链表上的指针，新链表创建在dummy上。



```cpp
class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        ListNode dummy(0);            // 结果虚拟头
        ListNode* tail = &dummy;      // 结果尾指针
        int carry = 0;

        while (l1 || l2 || carry) {   // 直到两表都空且无进位
            int v1 = l1 ? l1->val : 0;
            int v2 = l2 ? l2->val : 0;
            int sum = v1 + v2 + carry;

            carry = sum / 10;
            int digit = sum % 10;

            tail->next = new ListNode(digit);
            tail = tail->next;

            if (l1) l1 = l1->next;
            if (l2) l2 = l2->next;
        }
        return dummy.next;
    }
};
```