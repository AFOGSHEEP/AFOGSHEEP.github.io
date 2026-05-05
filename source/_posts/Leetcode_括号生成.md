---
title: 括号生成
date: 2025-03-01 00:00:00
categories:
  - Leetcode
tags:
  - Leetcode
  - 算法
---

感觉是最近最难的一道题

{% asset_img image-0.png %}



首先想到的思路是深度优先，遍历括号的左中右三个位置递归生成，为了防止重复所以用无重复集合`unordered_set`来保存每一轮的结果。为了防止多轮













```cpp
#include<unordered_set>
#include<string>
#include<vector>


using namespace std;

class Solution {
public:
    vector<string> generateParenthesis(int n) {
        if(n==0) return {};
        unordered_set<string> res;
        res.insert("()");

        for(int step =2 ; step <= n ; step++){
            unordered_set<string> cur_round;
            for(const string& s:res){
                for(int i=0;i< s.size(); i++){
                    string t = s.substr(0,i) + "()" + s.substr(i);
                    cur_round.insert(t);
                }
            }
            res.swap(cur_round);

        }
        vector<string> ans(res.begin(), res.end());
        return ans;
    }
};



// () () ()
// (())()
// ((())) 
// ()(())       how to insert ? 
//总先生成一个（），之后根据n，来分别在（）里面和外面插入。
```



1. 我这段代码在做什么  
我想从 1 对括号开始，逐轮扩展到 n 对括号。  
每一轮里，我会把旧结果中的每个字符串都插入一对新的 ()，得到新结果。  
我用 unordered_set 来自动去重。
2. 变量在我脑子里的意义  
res：我上一轮已经得到的完整答案集合。  
cur_round：我这一轮新生成的答案集合。  
s：我从 res 里拿出来的一个完整括号串，不是单个字符。  
i：插入位置。  
t：我把 s 切成两段，在中间插入 () 拼出来的新串。
3. t 是怎么构成的  
我用这个式子构造：  
前半段 + () + 后半段。  
也就是：  
s.substr(0, i) + "()" + s.substr(i)。

举例：当 s = (()) 时  
i=0：() (()) -> ()(())  
i=1：( + () + ()) -> (()())  
i=2：(( + () + )) -> ((()))  
i=3：(() + () + ) -> (())()  
i=4：在末尾插入（只有 i <= s.size() 时才会枚举到）

4. 我为什么要用两个无序集合  
我必须把旧结果和新结果分开。  
如果我一边遍历 res 一边往 res 里插入，会有两个问题：

第一，容器层面有风险。  
在 C++ 的 unordered_set 里，插入新元素可能触发 rehash（扩容重排），这会让迭代器失效，导致遍历行为不稳定，甚至崩溃。

第二，逻辑层面会错轮。  
我本来希望“这一轮只加 1 对括号”，但如果新插入的元素又被本轮继续处理，就会变成“本轮加了 2 对甚至更多”，相当于多插一轮，结果层次就乱了。

5. 错轮的具体样子（我怎么理解）  
假设我当前只有 ()，这一轮目标是得到 2 对括号。  
正确结果应该只有：()() 和 (())。  
如果我在同一个集合里边遍历边插入，可能会先生成 ()()，然后又立刻拿 ()() 继续插，生成 3 对括号的串。  
这样本轮就混入了下一轮内容，step 的意义被破坏。
6. step 为什么从 2 开始到 n  
因为我已经手动放了基础答案 ()，它就是 1 对括号的结果。  
所以后面循环从 step=2 开始，一直扩展到 step=n。
7. 我这版代码的一个注意点  
如果我写 i < s.size()，会漏掉“在末尾插入”的位置。  
更完整的是 i <= s.size()，这样能覆盖所有插入点。





标准做法

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<string> ans;

    void dfs(int n, int left, int right, string& path) {
        if ((int)path.size() == 2 * n) {
            ans.push_back(path);
            return;
        }

        if (left < n) {
            path.push_back('(');
            dfs(n, left + 1, right, path);
            path.pop_back();
        }

        if (right < left) {
            path.push_back(')');
            dfs(n, left, right + 1, path);
            path.pop_back();
        }
    }

    vector<string> generateParenthesis(int n) {
        ans.clear();
        string path;
        dfs(n, 0, 0, path);
        return ans;
    }
};
```