---
title: 寻找两个正序数组的中位数
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

给定两个大小分别为 `m` 和 `n` 的正序（从小到大）数组 `nums1` 和 `nums2`。请你找出并返回这两个正序数组的 中位数 。

算法的时间复杂度应该为 `O(log (m+n))` 。

示例 1：

```plain
输入：nums1 = [1,3], nums2 = [2]
输出：2.00000
解释：合并数组 = [1,2,3] ，中位数 2
```

示例 2：

```plain
输入：nums1 = [1,2], nums2 = [3,4]
输出：2.50000
解释：合并数组 = [1,2,3,4] ，中位数 (2 + 3) / 2 = 2.5
```



思路：创建新数组合并这两个原始数组，对新数组使用快速排序，之后根据新数组长度是奇数或偶数来计算中位数。

不需要快速排序，因为原本的两个数组就是有序的，只需要归并排序放入新数组即可。也就是先后判断两者大小，再递归的排序

```cpp
double findMedianSortedArrays(vector<int> &nums1, vector<int> &nums2) {
  // 1. 合并两个数组
  vector<int> merged;
  int i = 0, j = 0;
  int m = nums1.size(), n = nums2.size();

  // 归并两个有序数组
  while (i < m && j < n) {
    if (nums1[i] <= nums2[j]) {
      merged.push_back(nums1[i]);
      i++;
    } else {
      merged.push_back(nums2[j]);
      j++;
    }
  }

  // 将剩余元素加入，某个数组已经取光而另外的还有剩
  while (i < m) {
    merged.push_back(nums1[i]);
    i++;
  }
  while (j < n) {
    merged.push_back(nums2[j]);
    j++;
  }

  // 2. 计算中位数
  int total = merged.size();
  if (total % 2 == 1) {
    // 奇数个元素，返回中间那个
    return merged[total / 2];
  } else {
    // 偶数个元素，返回中间两个的平均值
    int mid1 = merged[total / 2 - 1];
    int mid2 = merged[total / 2];
    return (mid1 + mid2) / 2.0; // 注意：要用2.0，否则是整数除法
  }
}
```

没管时间复杂度能秒

<font style="color:rgb(249, 250, 251);background-color:rgb(21, 21, 23);">当看到 </font>**<font style="color:rgb(249, 250, 251);background-color:rgb(21, 21, 23);">"log"</font>**<font style="color:rgb(249, 250, 251);background-color:rgb(21, 21, 23);"> 的时间复杂度要求时，首先考虑</font>**<font style="color:rgb(249, 250, 251);background-color:rgb(21, 21, 23);">二分查找</font>**<font style="color:rgb(249, 250, 251);background-color:rgb(21, 21, 23);">或</font>**<font style="color:rgb(249, 250, 251);background-color:rgb(21, 21, 23);">分治算法</font>**<font style="color:rgb(249, 250, 251);background-color:rgb(21, 21, 23);">。</font>