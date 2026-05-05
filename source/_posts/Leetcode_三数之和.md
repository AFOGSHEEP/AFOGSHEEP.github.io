---
title: 三数之和
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

{% asset_img image-0.png %}





固定左边界，两个指针在右半区间夹逼



```cpp
#include<vector>
#include<algorithm>

using namespace std;


class Solution{
    public:
    vector<vector<int>> threeSum(vector<int>& nums){
        vector<vector<int>> ans;
        sort(nums.begin(), nums.end());
        if(nums.size() < 3) return ans;
        for(int i =0; i < nums.size() - 2; i++){
            
            if(i>0&&nums[i] == nums[i-1]) continue;//去掉重复的i，由于i已经变动过，所以要和上一个进行比较
            
            int left = i + 1;
            int right = nums.size() -1 ;
            while( left < right){
                int sum = nums[i] + nums[left] + nums[right];
                if(sum == 0){
                    ans.push_back({nums[i],nums[left],nums[right]});
                    left++;
                    right--;
                    while(left < right && nums[left] == nums[left-1]) left++; //新的left和right和之前的left和right相同，继续移动
                    while(left < right && nums[right] == nums[right +1 ]) right-- ;
                }
                else if(sum < 0){
                    left++;
                }
                else{
                    right--;
                }
            }
        
        
        }
        return ans;

    }
};
```