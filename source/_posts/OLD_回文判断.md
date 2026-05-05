---
title: STL运用示例：回文判断
date: 2024-5-1 17:24:34
categories:
  - 学习笔记
tags:
  - C++
---

---

top: true  
date: 2024-5-1 17:24:34  
是时候用一个简短的例子来结束短暂的STL学习了。

## 回文
回文是向前或向后阅读时相同的单词或短语，例如“racecar”或“Malayalam”。阅读回文时，习惯上会忽略空格、标点符号和大写字母，因此“Mr. Owl ate my metal worm”和“Go hang a salami! I'm a lasagna hog。”这两句话将被视为回文。 

## 判断实现
```cpp
bool IsPalindrome(string input) {
        for(int k = 0; k < input.size() / 2; ++k)
            if(input[k] != input[input.length() - 1 – k])
                return false;
        return true;
    }
```

这种方法只需遍历字符串的前半部分，检查每个字符是否等于字符串另一半上的相应字符。作为一种可能是头一个出现在脑海里的方法，他并没有错，但是太不优雅了。让我们用STL的方法试试。

```cpp
 bool IsPalindrome(string input) {
     string reversed = input;
      reverse(input.begin(), input.end());
     return reversed == input;
    }
```

这种方法看起来好多了，但需要我们创建字符串的副本，因此效率低于我们的原始实现。我们可以使用迭代器以某种方式模拟初始 for 循环的功能吗？答案是肯定的，多亏了reverse_iterators。每个 STL 容器类都导出一个类型reverse_iterator，该类型类似于迭代器，只是它向后遍历容器。正如 begin 和 end 函数定义容器上的迭代器范围一样，rbegin 和 rend 函数定义跨容器的reverse_iterator范围。

```cpp
int isPalindrome(string input){
    return equal(input.begin(),input.begin()+ input.length()/2,input.rbegin()); 
    // rbegin()从end开始向前遍历


}
```

以上的这个代码一行即可实现判断的功能。

但这还不能正确处理大写、空格或标点符号。如何改进呢？让我们首先从字符串中剥离除字母字符之外的所有内容。对于此任务，我们可以使用 STL remove_if 算法，该算法接受迭代器范围和谓词作为输入，然后通过删除谓词返回 true 的所有元素来修改范围。与它的伙伴算法 remove 一样，remove_if 实际上并没有从序列中删除元素，因此我们需要在之后擦除剩余的元素。

```cpp
bool IsNotAlpha(char ch) { //<cctype>
    return !isalpha(ch);
    }


bool IsPalindrome(string input){
        input.erase(remove_if(input.begin(), input.end(), IsNotAlpha),input.end());
        transform(input.begin(), input.end(), input.begin(), ::toupper);
        return equal(input.begin(), input.begin() + input.size() / 2,input.rbegin());
    }
```

在三行代码中，我们去除了字符串中所有不是字母的字符，将剩下的字符转换为大写，并返回字符串是否向前和向后相同。

的技术的力量。在结束这个例子之前，让我们考虑回文上的一个变体，我们检查短语中的单词是否向前和向后相同。例如，“Did mom pop?  Mom did!”是回文，无论是字母还是文字，而”This is this“是一个短语，它不是回文，而是回文。与常规回文一样，我们将忽略空格和标点符号，因此“It's an its”算作单词回文，即使它使用了两种不同形式的单词 its/it's。我们上面使用的算法适用于整个string，我们可以修改它以逐字工作吗？

我们仍然要忽略空格、标点符号和大写字母，但现在需要将单词而不是字母视为有意义的单位。有许多可能的算法可以检查此属性，但有一种解决方案特别好。思路如下：

1.清理输入：去掉除字母和空格以外的所有内容，然后将结果转换为大写。

2.将输入分解为单词列表。

3.向前和向后返回列表是否相同

这是一个完整的代码

```cpp
#include <algorithm>  
#include <cctype>  
#include <sstream>  
#include <iterator>  
#include <string>  
#include <vector>
#include<iostream>
using namespace std;


bool IsNotAlphaOrSpace(char ch) {
    return !isalpha(ch) && !isspace(ch);
    }


bool IsWordPalindrome(string input) {
        input.erase(remove_if(input.begin(), input.end(), IsNotAlphaOrSpace),
                    input.end());
        transform(input.begin(), input.end(), input.begin(), ::toupper);
        stringstream tokenizer(input);
        vector<string> tokens;
        tokens.insert(tokens.begin(),
                      istream_iterator<string>(tokenizer),
                      istream_iterator<string>());
        // 手动检查单词列表是否为回文,书里的equal()可能出现问题，具体https://blog.csdn.net/qq_52828510/article/details/121213451?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522171454848816800184139758%2522%252C%2522scm%2522%253A%252220140713.130102334..%2522%257D&request_id=171454848816800184139758&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~baidu_landing_v2~default-1-121213451-null-null.142
        int start = 0;
        int end = input.length() - 1;
        while (start < end) {
        if (input[start] != input[end]) {
            return false;
        }
        start++;
        end--;
    }
    return true;
    }

int main(){
    string input;
    getline(cin,input);
    if(IsWordPalindrome(input)){
        cout << "yes" << endl;
    }else{
        cout << "no" << endl;
    }

    return 0 ;
}
```

## remove的使用介绍
代码中，`input.erase(...)` 这一部分是用来清除字符串中不需要的字符。具体来说，它结合了 `remove_if` 函数和 `erase` 方法来实现这个功能。这里是它的工作原理详解：

1. `remove_if`** 函数**：
    - `remove_if` 是 C++ STL (Standard Template Library) 中的一个函数，用于从一个容器中移除满足特定条件的元素。
    - 这个函数接受三个参数：容器的开始迭代器、结束迭代器和一个谓词函数（即一个返回布尔值、决定元素是否应被移除的函数）。
    - 在您的代码中，谓词函数是 `IsNotAlphaOrSpace`，它检查一个字符是否既不是字母也不是空格。如果字符不是字母也不是空格，谓词返回 `true`，表示该字符应被移除。
    - `remove_if` 实际上并不直接删除元素，而是通过重排容器中的元素，将所有不应被移除的元素移到容器的开始部分，返回一个新的迭代器，指向重排后的最后一个有效元素的下一个位置。
2. `erase`** 方法**：
    - 一旦 `remove_if` 完成了元素的重排，`erase` 方法被用来实际从容器中删除那些不需要的元素。
    - `erase` 接受两个迭代器：开始和结束。在这里，它从 `remove_if` 返回的迭代器开始，到字符串的末尾。
    - 这意味着所有从 `remove_if` 返回的迭代器到容器末尾的元素（即被标记为移除的元素）都将被从字符串中删除。

这样的组合使用`remove_if` 和 `erase` 被称为“擦除-删除”惯用法（Erase-Remove Idiom），是一种高效清理容器的方式。

## 练习
**1. 为什么STL算法比手写循环更受推荐？**

+ **性能优化**：STL算法经过严格优化，能够比手写循环提供更好的性能。
+ **可读性和维护性**：使用STL算法可以使代码更加清晰和易于维护。
+ **减少错误**：STL算法减少了编程中常见的错误，如边界错误和指针错误。

**2. STL算法中的_if后缀和_n后缀分别表示什么意思？**

+ **_if后缀**：表示算法版本接受一个谓词（条件函数），用于指定操作的条件。
+ **_n后缀**：指算法接受一个额外的数量参数，用于指定操作的元素数量或范围。

**3. STL迭代器有哪五种类别？**

+ **输入迭代器**：仅支持读取序列中的元素。
+ **输出迭代器**：仅支持写入序列中的元素。
+ **前向迭代器**：支持读写操作，并能多次遍历序列。
+ **双向迭代器**：除了前向迭代器的功能外，还可以向后遍历。
+ **随机访问迭代器**：支持直接访问任何元素，提供最灵活的访问方式。

**4. 输入迭代器是否可以在需要前向迭代器的场合使用？反之亦然可以吗？**

+ **输入迭代器用于前向迭代器**：通常不可以，因为输入迭代器不支持多次遍历或双向移动。
+ **前向迭代器用于输入迭代器**：可以，前向迭代器功能更全。

**5. 为什么我们需要back_insert_iterator这类迭代器适配器？**

如果没有这些迭代器适配器，许多STL算法在处理需要动态添加元素到容器的情况时将无法工作，例如在使用`copy`算法时直接将元素添加到容器尾部。

**6. 如何修改代码以计算文件中25到75之间的值的平均数？**

首先使用`std::find_if`定位值在25到75之间的范围的迭代器，然后使用`std::accumulate`和`std::distance`计算这个范围的平均值。如果范围内没有元素，输出相应的消息。

**7.编写一个名为 **`RemoveShortWords`** 的函数，它接受一个 **`vector<string>`** 并移除其中所有长度为3或更短的字符串。**

（如果你正确地利用了算法，这个函数可以在两行代码内完成。）

这个问题可以通过结合使用 STL 的 `std::remove_if` 和 `erase` 方法解决。这里使用 `std::remove_if` 来标记所有应当被移除的元素，然后用 `erase` 实际移除这些元素。

```cpp
#include <vector>
#include <string>
#include <algorithm>

void RemoveShortWords(std::vector<std::string>& words) {
    auto newEnd = std::remove_if(words.begin(), words.end(),
                                 [](const std::string& s) { return s.length() <= 3; });
    words.erase(newEnd, words.end());
}
```

**注释**:

+ `remove_if` 将遍历 `words` 向量，并应用 lambda 函数到每个字符串。
+ Lambda 函数检查字符串长度是否小于等于3，返回 `true` 表示该字符串应被移除。
+ `remove_if` 将不应被移除的字符串移动到向量的前部，并返回一个新的结束迭代器。
+ `erase` 使用这个新的结束迭代器，将所有被标记为移除的字符串从向量中删除。

**8.计算 n 维空间中点到原点的距离**

**问题**: 在 n 维空间中，一个点 (x1, x2, x3, ..., xn) 到原点的距离是 sqrt(x1<sup>2 + x2</sup>2 + x3<sup>2 + ... + xn</sup>2)。编写一个函数 `DistanceToOrigin`，它接受一个代表空间中点的 `vector<double>`，并返回该点到原点的距离。不要使用任何循环，让算法为你完成繁重的工作。（提示：使用 `inner_product` 算法来计算平方根下的表达式。）

我们可以使用 `std::inner_product` 算法来计算向量元素的平方和，然后取平方根得到欧几里得距离。

```cpp
#include <vector>
#include <cmath>
#include <numeric> // For std::inner_product

double DistanceToOrigin(const std::vector<double>& point) {
    return std::sqrt(std::inner_product(point.begin(), point.end(), point.begin(), 0.0));
}
```

**注释**:

+ `std::inner_product` 计算两个序列的点积。这里我们使用同一个向量 `point` 两次，即计算每个维度的平方。
+ 初始值 `0.0` 表示累加的起始值。
+ 最终结果是所有维度平方和的平方根，即从原点到点的距离。
9. **实现一个具有偏好的排序函数 BiasedSort**

**问题**: 编写一个名为 `BiasedSort` 的函数，它接受一个引用类型的 `vector<string>` 并按字典顺序对其进行排序，但如果向量中包含字符串 “Me First”，则该字符串始终位于排序列表的最前面。

**解决方案**：

为了解决这个问题，我们可以首先检查是否存在 "Me First" 字符串，如果存在，则先将其移至向量的开始位置，然后对剩余的元素进行排序。

```cpp
#include <vector>
#include <string>
#include <algorithm>

void BiasedSort(std::vector<std::string>& vec) {
    auto it = std::find(vec.begin(), vec.end(), "Me First");
    if (it != vec.end()) {
        std::iter_swap(vec.begin(), it);
        std::sort(vec.begin() + 1, vec.end());
    } else {
        std::sort(vec.begin(), vec.end());
    }
}
```

**注释**:

+ 使用 `std::find` 查找 "Me First"，如果找到，则与第一个元素交换位置。
+ 使用 `std::sort` 对除 "Me First" 外的所有元素进行排序。
10. **编写一个函数 CriticsPick**

**问题**: 编写一个函数 `CriticsPick`，该函数接受一个 `map<string, double>`，其中包含电影及其评分（0.0 到 10.0之间），并返回一个 `set<string>`，其中包含地图中评分最高的前十部电影的名称。如果 map 中的元素少于十个，则结果 set 应包含 map 中的每个字符串。

**解决方案**：

```cpp
#include <map>
#include <set>
#include <string>
#include <algorithm>
#include <vector>

std::set<std::string> CriticsPick(const std::map<std::string, double>& movies) {
    std::vector<std::pair<std::string, double>> sortedMovies(movies.begin(), movies.end());
    std::sort(sortedMovies.begin(), sortedMovies.end(), [](const auto& a, const auto& b) {
        return a.second > b.second;  // 降序排序
    });

    std::set<std::string> topMovies;
    for (int i = 0; i < std::min(10, static_cast<int>(sortedMovies.size())); ++i) {
        topMovies.insert(sortedMovies[i].first);
    }
    return topMovies;
}
```

**注释**:

+ 将 map 转换为 vector，以便使用排序算法。
+ 按评分降序排序电影。
+ 选取排序后的前10部电影（或者小于10部，如果元素不足的话）。
11. **实现 count 算法**

**问题**: 为 `vector<int>` 实现 count 算法。你的函数应该有如下原型：`int count(vector<int>::iterator start, vector<int>::iterator stop, int element)`，并应该返回区间 [start, stop) 中等于 element 的元素数量。

**解决方案**：

```cpp
#include <vector>
#include <algorithm>

int count(std::vector<int>::iterator start, std::vector<int>::iterator stop, int element) {
    return std::count(start, stop, element);
}
```

**注释**:

+ 直接使用 STL 中的 `std::count` 函数，传递给定的迭代器和元素。
12. **使用 generate_n 和 rand 函数填充随机数向量，并计算平均值**

**问题**: 使用 `generate_n` 算法、`rand` 函数和 `back_insert_iterator` 来填充一个向量，指定数量的随机值。然后使用 `accumulate` 计算该范围的平均值。

**解决方案**：

```cpp
#include <vector>
#include <algorithm>
#include <numeric>
#include <cstdlib>  // For rand()
#include <iostream>

void PopulateAndAverage(int count) {
    std::vector<int> numbers;
    std::generate_n(std::back_inserter(numbers), count, []() { return rand() % 100; });
    double average = static_cast<double>(std::accumulate(numbers.begin(), numbers.end(), 0)) / numbers.size();

    std::cout << "Average: " << average << std::endl;
}
```

**注释**:

+ 使用 `generate_n` 和 `back_inserter` 向量填充随机数。`back_inserter` 创建一个后插迭代器，自动处理向量的大小调整。
+ 随机数范围设置为 0 到 99。
+ 使用 `accumulate` 计算总和，然后除以元素数量得到平均值。
13. **计算一组数据的中位数**

**问题**: 中位数是指在一组数据中，有一半的数据比它大，另一半数据比它小。对于拥有奇数个元素的数据集，这是排序后的中间元素；对于偶数个元素的数据集，它是两个中间元素的平均值。使用 `nth_element` 算法编写一个计算数据集中位数的函数。

**解决方案**：

```cpp
#include <vector>
#include <algorithm>
#include <iostream>

double Median(std::vector<double>& data) {
    if (data.empty()) return 0.0;

    size_t n = data.size() / 2;
    std::nth_element(data.begin(), data.begin() + n, data.end());

    if (data.size() % 2 == 1) {
        return data[n];
    } else {
        auto max_it = std::max_element(data.begin(), data.begin() + n);
        return (*max_it + data[n]) / 2.0;
    }
}
```

**注释**:

+ 使用 `nth_element` 定位中间元素，该算法可以更快地找到第 n 个位置的元素，而不需要完全排序。
+ 对于偶数元素的数据集，找到前半部分的最大值，与中间位置的下一个元素求平均。
14. **使用 copy、istreambuf_iterator 和 ostreambuf_iterator 打开文件并打印其内容**

**问题**: 展示如何使用 `copy`、`istreambuf_iterator` 和 `ostreambuf_iterator` 打开一个文件并将其内容打印到 cout。

**解决方案**：

```cpp
#include <fstream>
#include <iostream>
#include <iterator>

void PrintFileContents(const std::string& filename) {
    std::ifstream file(filename);
    std::copy(std::istreambuf_iterator<char>(file),
              std::istreambuf_iterator<char>(),
              std::ostreambuf_iterator<char>(std::cout));
}
```

**注释**:

+ 使用 `istreambuf_iterator` 从文件读取字符。
+ 使用 `ostreambuf_iterator` 将字符输出到标准输出。
+ `copy` 算法在这两个迭代器之间传输内容，直接从文件流复制到输出流，无需额外缓存。
15. **使用 copy 和迭代器适配器将 STL 容器的内容写入文件**

**问题**: 展示如何使用 `copy` 和迭代器适配器将 STL 容器的内容写入文件，其中每个元素存储在自己的一行上。

**解决方案**：

```cpp
#include <vector>
#include <fstream>
#include <iterator>
#include <algorithm>

template<typename T>
void WriteToFile(const std::vector<T>& data, const std::string& filename) {
    std::ofstream file(filename);
    std::ostream_iterator<T> out_it(file, "\n");
    std::copy(data.begin(), data.end(), out_it);
}
```



**注释**:

+ 使用 `ostream_iterator` 定义输出到文件的迭代器，并设置每个元素后跟一个换行符。
+ `copy` 算法用于从容器复制元素到文件流，每写入一个元素后自动插入一个换行符。
16. **打印两个已排序向量的共同元素**

**问题**: 假设你有两个元素已经存储在排序顺序中的 `vector<int>`。展示如何使用一行代码通过 `set_intersection` 算法和适当的迭代器适配器打印出这两个向量的共有元素。

**解决方案**：

```cpp
#include <vector>
#include <algorithm>
#include <iterator>
#include <iostream>

void PrintCommonElements(const std::vector<int>& v1, const std::vector<int>& v2) {
    std::set_intersection(v1.begin(), v1.end(), v2.begin(), v2.end(),
                          std::ostream_iterator<int>(std::cout, " "));
}
```

**注释**:

+ 使用 `set_intersection` 算法找出两个排序向量的共同元素。
+ `ostream_iterator` 用于将找到的共同元素直接打印到标准输出，每个元素后面跟一个空格。

这些示例展示了如何有效地利用 STL 算法和迭代器来简化常见的编程任务，同时保持代码的简洁和高效。通过这种方式，可以显著提升代码的可读性和维护性，同时利用现代 C++ 提供的强大功能来处理复杂的数据结构和算法操作。