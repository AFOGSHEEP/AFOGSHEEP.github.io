---
title: 合并两个有序链表
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

{% asset_img image-0.png %}



一开始有好几处大错误

你这版代码的问题不是一个点，而是有几处核心逻辑都错了，所以基本过不了。

最致命的有 4 个：

1. 你的 while 条件写错了  
你写的是：

```cpp
while(l1->next != nullptr && l2->next != nullptr)
```

这会直接漏掉最后一个节点，而且如果某个链表一开始就是空的，还会空指针访问。  
正确判断应该是看当前节点本身是不是空：

```cpp
while (l1 != nullptr && l2 != nullptr)
```

2. 你没有用“当前尾指针”来接链表  
你一直在写：

```cpp
dummy.next = l1;
```

这意味着每次都把 dummy.next 覆盖掉了，前面已经接好的节点全丢了。  
正确做法应该是准备一个 `cur`，让它一直指向结果链表的尾巴：

```cpp
cur->next = l1;
cur = cur->next;
```

3. 你把“相等”的情况单独拿出来了，但写法不对  
这一段：

```cpp
dummy.next = l1;
dummy.next->next = l2;
l1 = l1->next;
l2 = l2->next;
```

会把链表结构改乱。  
其实根本不需要单独处理相等，直接用 `<=` 就行，统一写成“小的接上去”。

4. 你没有把剩余链表接到结果后面  
如果一个链表先空了，另一个链表剩下的一整段要直接接上去。  
你现在写完 while 就直接 `return dummy.next;` 了，剩余部分丢了。

---



修改之后的版本

```cpp
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};



class Solution{
    public:
    ListNode* mergeTwoLists(ListNode* l1, ListNode* l2){
        ListNode dummy;
        ListNode* cur = &dummy;
        while(l1 != nullptr && l2 != nullptr
        ){
            if(l1->val <= l2->val){
                cur->next = l1;
                l1 = l1->next;
            }
            else{
                cur->next = l2;
                l2 = l2->next;
            }
            cur = cur->next;
        }
        cur->next = (l1 == nullptr)?l2:l1;
        return dummy.next;
    }
};
```

如果直接在while循环里改退出条件是二者都不空，容易导致访问空指针。