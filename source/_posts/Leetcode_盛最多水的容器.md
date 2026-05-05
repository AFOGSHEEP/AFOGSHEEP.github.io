---
title: 盛最多水的容器
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

{% asset_img image-0.png %}





一开始的暴力解

```cpp
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        int n = height.size();
        int max_Area = 0;
        for (int left = 0; left < n; ++left) {
            for (int right = left + 1; right < n; ++right) {
                int area = min(height[left], height[right]) * (right - left);
                max_Area = max(max_Area, area);
            }
        }
        return max_Area;
    }
};
```

超时了



标准解答双指针

```cpp
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        int left = 0, right = (int)height.size() - 1;
        int ans = 0;
        while (left < right) {
            int h = min(height[left], height[right]);
            ans = max(ans, h * (right - left));
            if (height[left] < height[right]) {
                ++left;
            } else {
                --right;
            }
        }
        return ans;
    }
};
```