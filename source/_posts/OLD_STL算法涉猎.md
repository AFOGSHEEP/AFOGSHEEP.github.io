---
title: STL算法涉猎
date: 2024-04-23 23:28:45
categories:
  - 学习笔记
tags:
  - C语言
---

---

date: 2024-04-23 23:28:45  
## 引子
考虑以下问题：假设我们想要编写一个程序，该程序从文件中读取整数列表（可能表示作业中的成绩），然后打印出这些值的平均值。为简单起见，我们假设此数据存储在名为 data.txt 的文件中，每行一个整数。例如：

```html
100
95
92
98
87
88
100
87
89
87
89
83
87
97
99
89
88
```

以下是一个可能的例子： 

```cpp
#include<iostream>
#include<set>
#include<fstream>
using namespace std;


int main(){
    ifstream input("G:\\Cpp_Learn\\full_course_reader\\week5\\data.txt");
    set<int> values;
    
    int currVaule;
    while(input >> currVaule){
        values.insert(currVaule);
    }
    
    //习惯性的写法
    float total = 0.000; 
    for(set<int>::iterator itr = values.begin(); itr != values.end(); ++itr){
        total += *itr;
    }
    cout << "average is : " << total/values.size() << endl;
    return 0;


}
```

如果要用语言描绘这个程序，我们可以把他分为三步：

1. 读取文件内容
2. 将值相加
3. 除以元素个数

我们必须以这种机械的方式向计算机发出命令的原因正是因为计算机是机械的——它是一台高效计算功能的机器。编程的挑战是找到一种方法，将一组高级命令转换为一系列控制机器的低级指令。这通常是一件苦差事，因为计算机导出的基本操作相当有限。但编程并不一定这么难。正如你所看到的，我们可以根据旧函数来定义新函数，并且可以从这些越来越强大的子程序中构建复杂的程序。从理论上讲，你可以编译一个巨大的库，其中包含所有非平凡的编程问题的解决方案。有了这个库，你就可以轻松地编写程序，只需将这些预先编写好的组件拼接在一起。

不幸的是，没有一个库可以解决每个编程问题。然而，这并没有阻止STL的设计者尽最大努力建造一个。这些是 STL 算法，一个用于处理数据的非常强大的例程库。STL 算法不能做所有事情，但它们能做的事情却做得非常出色。实际上，使用 STL 算法，可以重写在四行代码中平均数字的程序。

## 第一个STL算法：Accumulate
关于先前求和的部分，可以用以下的方法替代：

```cpp
#include<numeric>
cout << "average is : " << accumulate(values.begin(),values.end(),0.0)/values.size() << endl;
```

在标头中定义的 accumulate 函数采用三个参数 – 两个定义元素范围的迭代器，以及用于求和的初始值。然后，它计算迭代器范围内包含的所有元素的总和，加上基本值。 accumulate（以及一般的 STL 算法）的美妙之处在于，accumulate 可以接受任何类型的迭代器。也就是说，我们可以从多集、向量或 deque 中求和迭代器。这意味着，如果您发现自己需要计算容器中包含的元素的总和，则可以将该容器的 begin（） 和 end（） 迭代器传递到 accumulate 中以获得总和。此外，accumulate 可以接受任何有效的迭代器范围，而不仅仅是跨整个容器的迭代器范围。例如，如果我们想计算多集的元素之和，这些元素介于 42 和 137 之间（含 42 和 137），我们可以写成:

```cpp
accumulate(values.lower_bound(42), values.upper_bound(137), 0);
```

在幕后，accumulate 被实现为一个模板函数，它接受两个迭代器，并简单地使用循环将值相加。这是 accumulate 的一种可能实现:

```cpp
 template <typename InputIterator, typename Type> inline
    Type accumulate(InputIterator start, InputIterator stop, Type initial) {
 while(start != stop) {
            initial += *start;
            ++start;
        }
        return initial;
    }
```

代码的核心是一个标准的迭代器循环，它不断向前推进启动迭代器，直到它到达目的地。累加没有什么神奇之处，函数调用是一行代码这一事实并没有改变它仍然使用循环将所有值相加的事实。

如果 STL 算法只是在幕后使用循环的函数，为什么我们还要费心学习呢？有几个原因，第一个原因是简单。借助 STL 算法，您可以利用已经为您编写的代码，而不是从头开始重新编写代码。这可以节省大量时间，也导致了第二个原因，即正确性。如果你每次需要使用它们时都必须从头开始重写所有算法，那么在某个时候你很可能会犯错误。例如，您可能会编写一个排序例程，该例程在您打算>时意外地使用了 <，因此根本不起作用。STL 算法则不然——它们已经过全面测试，可以正常工作于任何给定的输入。使用算法的第三个原因是速度。一般来说，你可以假设，如果有一个 STL 算法来执行一项任务，它将比你手动编写的大多数代码更快。通过模板专用化和模板元编程等先进技术，STL 算法经过透明优化，以尽可能快地工作。最后，STL 算法提供了清晰度。使用算法，您可以立即判断出对累积的调用将某个范围内的数字相加。但使用求和值的 for 循环，您必须先阅读循环中的每一行，然后才能理解代码的作用。

## 算法命名的约定
有超过 50 种 STL 算法（定义在 中或 中），至少可以说，记住它们将是一件苦差事。幸运的是，它们中的许多都有通用的命名约定，因此即使我们以前从未遇到过它们，也可以轻松识别。

### 后缀 ' _if '
以 `_if` 结尾的算法基于条件执行操作。这些函数需要一个谓词——一个接受元素作为输入并返回布尔值的函数，该布尔值指示元素是否满足特定标准。示例：

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

bool IsEven(int value) {
    return value % 2 == 0;
}

int main() {
    std::vector<int> myVec = {1, 2, 3, 4, 5, 6, 137, 137};
    std::cout << "偶数元素数量: " 
              << count_if(myVec.begin(), myVec.end(), IsEven) << std::endl;
}

```

### 关键字 ' copy '
名称中包含 `copy` 的算法执行操作并将结果存储在由另一个迭代器指定的新位置。当想保留原始数据的同时处理转换后的数据时，这非常有用。

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> src = {1, 2, 3, 4, 5};
    std::vector<int> dest;

    // 为新元素腾出空间
    dest.resize(src.size());

    remove_copy_if(src.begin(), src.end(), dest.begin(), [](int x) { return x % 2 == 0; });
    for (int val : dest) {
        std::cout << val << " ";
    }
    std::cout << std::endl;
}

```

### 后缀 '_n '
算法名称中的 `_n` 后缀表明操作将执行指定次数，而不是在一个范围内执行。当确切的操作次数比数据范围更重要时，这特别有用。

```cpp
#include <iostream>
#include <deque>
#include <algorithm>

int main() {
    std::deque<int> myDeque(10);

    fill_n(myDeque.begin(), 10, 0);
    for (int num : myDeque) {
        std::cout << num << " ";
    }
    std::cout << std::endl;
}

```

这里的`fill_n` 将 `myDeque` 的前十个元素设置为零。

## 解析 STL 迭代器的分类
在 C++ 标准模板库（STL）中，迭代器是访问和操作容器中元素的关键工具。由于不同容器的内部结构差异，迭代器的功能也有所不同，因此 STL 迭代器被分为几种不同的类型，每种迭代器具有不同的能力和限制。了解这些迭代器的分类对于有效使用 STL 是非常重要的。

### 迭代器的分类及功能
迭代器按照功能强弱分为五种类型，从功能最弱到功能最强依次是：

1. **输出迭代器（Output Iterators）**
    - 输出迭代器允许写入值（使用 `*myItr = value` 语法）。
    - 可以向前移动（使用 `++` 操作符）。
    - 不能读取值或使用 `+=` 或 `-` 操作符。
2. **输入迭代器（Input Iterators）**
    - 输入迭代器允许读取值（使用 `value = *myItr` 语法）。
    - 不能写入值或遍历同一范围两次。
3. **前向迭代器（Forward Iterators）**
    - 结合了输入和输出迭代器的功能，支持读写操作。
    - 只能向前移动（使用 `++` 操作符）。
4. **双向迭代器（Bidirectional Iterators）**
    - 拥有前向迭代器的所有功能。
    - 可以向后移动（使用 `--` 操作符）。
    - 通常用于像 `map` 和 `set` 这样的容器。
5. **随机访问迭代器（Random-Access Iterators）**
    - 提供最大的功能，支持任意前后移动。
    - 支持迭代器加减、使用方括号语法和 `+`、`+=` 操作。
    - 主要用于 `vector` 和 `deque`。

### 为什么要区分迭代器类型？
由于容器的内部数据结构不同，迭代器的实现和性能也会有很大差异。例如，`vector` 和 `deque` 支持随机访问迭代器，因为它们的元素是连续存储的，可以通过简单的地址计算快速访问任何元素。相反，`set` 和 `map` 通常使用树结构存储元素，所以它们的迭代器只能一步一步地前进或后退，这种操作的复杂度是线性的。

在实际编程中，了解并使用正确类型的迭代器非常关键，因为它关系到代码的性能和效率。当一个库函数需要特定类型的迭代器时，提供一个功能相当或更强大的迭代器是可行的。例如，如果一个函数需要一个前向迭代器，那么提供一个前向迭代器、双向迭代器或随机访问迭代器都是可以的。

通过掌握这些迭代器的分类和功能，可以更加灵活和高效地使用 STL，从而编写出更优雅和高效的 C++ 代码。

![](G:\Cpp_Learn\full_course_reader\notes\assets\image-20240423225530689.png)

## 探索 STL 重排序算法
在 C++ 的标准模板库（STL）中，有一系列用于重排序容器中元素的算法。这些算法能够在不改变元素内容的前提下，改变元素的排列顺序。以下是三种主要的重排序算法：`sort`、`random_shuffle` 和 `rotate`，它们各自的用途和功能都非常实用。

### 排序算法（`sort`）
`sort` 算法是用于将容器中的元素按照升序排序。此算法要求传入的迭代器为随机访问迭代器，因此它不能用于 `map` 或 `set` 类型的容器，不过这些容器本身就是有序的。

**基本用法：**

```cpp
std::vector<int> myVector = {5, 3, 1, 4, 2};
std::sort(myVector.begin(), myVector.end());
```

此外，`sort` 还允许指定一个自定义的比较函数，以实现不同的排序准则。

**自定义比较函数示例：**

```cpp
struct placeT {
    int x;
    int y;
};

bool ComparePlaces(placeT one, placeT two) {
    if (one.x != two.x) return one.x < two.x;
    return one.y < two.y;
}

std::vector<placeT> myPlaceVector = {{1, 2}, {3, 1}, {1, 1}};
std::sort(myPlaceVector.begin(), myPlaceVector.end(), ComparePlaces);
```

### 随机打乱算法（`random_shuffle`）
`random_shuffle` 算法用于随机打乱容器中的元素。类似于 `sort`，这个算法也需要随机访问迭代器。

**示例用法：**

```cpp
std::vector<int> myVector = {1, 2, 3, 4, 5};
std::random_shuffle(myVector.begin(), myVector.end());
```

在使用 `random_shuffle` 之前，建议使用 `srand` 函数来设定随机数生成器的种子，以确保每次程序运行结果的随机性。

### 旋转算法（`rotate`）
`rotate` 算法通过循环移动容器中的元素，使得指定位置的元素变为容器的开始。

**示例用法：**

```cpp
std::vector<int> v = {0, 1, 2, 3, 4, 5};
std::rotate(v.begin(), v.begin() + 2, v.end());
```

在此示例中，向量 `v` 中的元素会被旋转，结果为 `{2, 3, 4, 5, 0, 1}`。

这些重排序算法在日常编程中非常有用，它们可以帮助开发者有效地处理和变换数据。了解和运用这些算法，可以极大地提高编程效率和代码的可读性。

## 探索 STL 中的搜索算法
在数据处理过程中，常常需要在容器中查找特定的元素。例如，你可能想知道一个向量是否包含一个特定的元素。尽管 `map` 和 `set` 容器提供了内置的查找功能，`vector` 和 `deque` 等线性容器则缺少这样的功能。好在，STL 提供了多种算法来补充这一功能缺失。

### `find` 算法
`find` 函数是最基本的搜索算法，它接受两个迭代器（定义搜索范围）和一个值，返回第一个匹配该值的元素的迭代器。如果范围内没有匹配的元素，`find` 返回第二个迭代器作为哨兵值。

**示例用法：**

```cpp
std::vector<int> myVector = {1, 2, 3, 137, 5};
if (find(myVector.begin(), myVector.end(), 137) != myVector.end()) {
    // 向量包含元素 137
}
```

虽然你可以在 `map` 和 `set` 上使用 `find`，但通常不推荐这样做。因为 `map` 和 `set` 的成员函数 `find` 使用了容器内部数据结构的信息来加快搜索速度，而 STL 的 `find` 函数则必须线性地遍历元素，效率较低。

### `binary_search` 算法
如果你有一个已排序的线性容器（如排序后的 `vector`），可以使用 `binary_search` 来执行搜索，这比线性搜索快得多。`binary_search` 仅返回一个布尔值，表示是否找到了指定的元素。

**示例用法：**

```cpp
std::vector<int> myVector = {1, 2, 3, 5, 137};  // 假设已排序
if (binary_search(myVector.begin(), myVector.end(), 137)) {
    // 找到了元素 137
}
```

如果容器使用了特殊的比较函数进行排序，你也可以将这个比较函数传递给 `binary_search`。但要确保使用一致的比较函数，否则可能导致 `binary_search` 工作不正常。

### `lower_bound` 算法
如果你需要在排序的容器中找到一个元素并获取指向该元素的迭代器，可以使用 `lower_bound`。这个算法返回指向第一个不小于指定值的元素的迭代器。如果没有找到精确匹配的元素，`lower_bound` 可能返回指向一个更大元素的迭代器，因此在使用返回的迭代器前需要进行检查。

**示例用法：**

```cpp
std::vector<int> myVector = {1, 2, 3, 5, 137};  // 假设已排序
auto it = lower_bound(myVector.begin(), myVector.end(), 4);
if (it != myVector.end() && *it == 4) {
    // 找到元素 4
} else {
    // 元素 4 不在向量中
}
```

这些搜索算法是处理 STL 容器中数据的强大工具。合理使用这些算法不仅可以提高代码的效率，还能使代码更加清晰和易于维护。

## 迭代器适配器
在使用 C++ 标准模板库（STL）的过程中，当我们想要通过算法生成数据范围时，确保目标位置有足够的空间来存放结果是非常重要的。例如，`copy` 算法需要目标容器预先分配足够的空间以防写入数据时超出范围导致未定义行为。为了解决这个问题，STL 提供了一类特殊的工具，称为迭代器适配器，这些适配器扩展了迭代器的功能，使其更加灵活和强大。

### `ostream_iterator` —— 输出流迭代器
`ostream_iterator` 是一种输出流迭代器，它不指向任何实际的容器元素，而是将数据输出到指定的流，如 `cout` 或文件流。

**示例用法：**

```cpp
#include <iterator>
#include <iostream>

int main() {
    std::ostream_iterator<int> myItr(std::cout, " ");
    *myItr = 137; // 输出 137 到 cout
    ++myItr;
    *myItr = 42;  // 输出 42 到 cout
    ++myItr;
}
```

这段代码通过 `ostream_iterator` 将整数直接写入到标准输出流 `cout`，数字之间由空格分隔。

### 使用 `ostream_iterator` 结合 STL 算法
由于 `ostream_iterator` 本身是一个迭代器，我们可以将其与 STL 算法结合使用，从而实现复杂的输出任务。例如，我们可以将一个容器中的所有元素复制到输出流中。

**示例用法：**

```cpp
#include <vector>
#include <algorithm>
#include <iterator>
#include <iostream>

int main() {
    std::vector<int> myVector = {1, 2, 3, 4, 5};
    std::copy(myVector.begin(), myVector.end(), std::ostream_iterator<int>(std::cout, " "));
}
```

此代码将 `myVector` 中的所有元素复制到 `cout`，元素之间以空格分隔，一行代码实现了整个向量的输出。

### `back_insert_iterator` —— 后插迭代器
另一个有用的迭代器适配器是 `back_insert_iterator`，这种迭代器在写入数据时会自动调用 `push_back` 方法将数据追加到容器的末尾。

**示例用法：**

```cpp
#include <vector>
#include <iterator>

int main() {
    std::vector<int> myVector;
    std::back_insert_iterator<std::vector<int>> itr(myVector);
    for (int i = 0; i < 10; ++i) {
        *itr = i; // 追加值到 myVector
        ++itr;
    }
    std::copy(myVector.begin(), myVector.end(), std::ostream_iterator<int>(std::cout, " "));
}
```

在这个例子中，`back_insert_iterator` 被用来动态地向 `myVector` 添加元素，之后通过 `copy` 和 `ostream_iterator` 输出所有元素。

### `insert_iterator` 的应用
`insert_iterator` 是一种更通用的迭代器适配器，它可以在容器的任意位置插入元素。这种迭代器在处理需要元素插入的算法，如集合操作算法 `set_union`, `set_intersection`, `set_difference` 等时尤为有用。

**示例用法：**

```plain
std::set<int> setOne = {1, 2, 3};
std::set<int> setTwo = {2, 3, 4};
std::set<int> result;
std::set_union(setOne.begin(), setOne.end(), setTwo.begin(), setTwo.end(), std::inserter(result, result.begin()));
```

这段代码计算了 `setOne` 和 `setTwo` 的并集，并使用 `insert_iterator` 将结果存入 `result`。

### `istream_iterator` —— 输入流迭代器
`istream_iterator` 是另一种迭代器适配器，它允许从输入流（如文件或标准输入）读取数据。这使得 `istream_iterator` 成为处理输入数据流的理想工具。

**示例用法：**

```plain
std::istream_iterator<int> it(std::cin);
std::istream_iterator<int> end;
std::vector<int> values(it, end); // 从标准输入读取整数直到 EOF
```

在这个例子中，从标准输入读取的整数被存储到 `values` 向量中，直到输入结束。

## 常见的迭代器及其应用
在 C++ 标准模板库（STL）中，迭代器适配器扩展了基本迭代器的功能，使它们能够在特定的上下文中更加有效地工作。下面是一些常见迭代器适配器的详细介绍，这些适配器广泛应用于处理容器和流中的数据。

## 常见的迭代器适配器及其应用
在 C++ 标准模板库（STL）中，迭代器适配器扩展了基本迭代器的功能，使它们能够在特定的上下文中更加有效地工作。下面是一些常见迭代器适配器的详细介绍，这些适配器广泛应用于处理容器和流中的数据。

### 输出迭代器
#### `back_insert_iterator`
+ **定义**: `back_insert_iterator<Container>`
+ **构造方法**: `back_insert_iterator<vector<int>> itr(myVector);`
+ **功能**: 通过调用容器的 `push_back` 方法来存储元素。
+ **用法**: 可以显式声明或使用 `back_inserter` 函数快速创建。
+ 示例:使用 `back_insert_iterator` 将元素添加到 `vector` 的末尾。

```cpp
#include <vector>
#include <iterator>
#include <algorithm>
#include <iostream>

int main() {
    std::vector<int> data = {1, 2, 3};
    std::vector<int> result;
    std::copy(data.begin(), data.end(), std::back_inserter(result));
    
    for (int x : result) {
        std::cout << x << " ";
    }
}
```

#### `front_insert_iterator`
+ **定义**: `front_insert_iterator<Container>`
+ **构造方法**: `front_insert_iterator<deque<int>> itr(myIntDeque);`
+ **功能**: 通过调用容器的 `push_front` 方法来存储元素。
+ **限制**: 不能用于不支持 `push_front` 方法的容器，如 `vector`。
+ **用法**: 可以使用 `front_inserter` 函数创建。
+ 示例:使用 `front_insert_iterator` 将元素添加到 `deque` 的前端。

```cpp
#include <deque>
#include <iterator>
#include <iostream>

int main() {
    std::deque<int> data;
    std::front_insert_iterator<std::deque<int>> inserter(data);
    *inserter = 1;
    *inserter = 2;
    *inserter = 3;
    
    for (int x : data) {
        std::cout << x << " ";  // Output: 3 2 1
    }
}
```

#### `insert_iterator`
+ **定义**: `insert_iterator<Container>`
+ **构造方法**: `insert_iterator<set<int>> itr(mySet, mySet.begin());`
+ **功能**: 在指定位置调用容器的 `insert` 方法来插入元素。
+ **适用范围**: 可用于任何容器，尤其适合于 `set`。
+ **用法**: 可以通过 `inserter` 函数生成。
+ 示例:

	使用 `insert_iterator` 在 `set` 中插入元素。

```cpp
#include <set>
#include <iterator>
#include <iostream>

int main() {
    std::set<int> numbers;
    std::insert_iterator<std::set<int>> inserter(numbers, numbers.begin());
    *inserter = 3;
    *inserter = 1;
    *inserter = 2;
    
    for (int x : numbers) {
        std::cout << x << " ";  // Output: 1 2 3 (automatically sorted)
    }
}
```

### 流迭代器
#### `ostream_iterator`
+ **定义**: `ostream_iterator<Type>`
+ **构造方法**: `ostream_iterator<int> itr(cout, " ");`
+ **功能**: 将元素写入输出流中，可选地在每个元素后添加分隔符。
+ **用法**: 初始化时必须指定输出流和可选的分隔符。
+ 示例:

	使用 `ostream_iterator` 输出元素到标准输出。

```cpp

#include <iterator>
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> numbers = {1, 2, 3};
    std::ostream_iterator<int> output(std::cout, " ");
    std::copy(numbers.begin(), numbers.end(), output);  // Output: 1 2 3
```

#### `istream_iterator`
+ **定义**: `istream_iterator<Type>`
+ **构造方法**: `istream_iterator<int> itr(cin);`
+ **功能**: 从指定的输入流中读取值。
+ **特性**: 当到达流的末尾时，会取得一个特殊的“结束”值。
+ **注意事项**: 易受输入流状态影响，使用时需注意。
+ 示例:

	使用 `istream_iterator` 从标准输入读取整数。

```cpp

#include <iterator>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers;
    std::cout << "Enter numbers separated by spaces: ";
    std::copy(std::istream_iterator<int>(std::cin), std::istream_iterator<int>(), std::back_inserter(numbers));
    
    std::cout << "You entered: ";
    for (int num : numbers) {
        std::cout << num << " ";
    }
}
```

#### `ostreambuf_iterator`
+ **定义**: `ostreambuf_iterator<char>`
+ **构造方法**: `ostreambuf_iterator<char> itr(cout);`
+ **功能**: 将原始字符数据写入输出流。
+ **限制**: 仅能写入字符数据。
+ 示例:

	使用 `ostreambuf_iterator` 输出字符到标准输出。

```cpp
#include <iterator>
#include <iostream>

int main() {
    std::ostreambuf_iterator<char> output(std::cout);
    *output = 'H';
    *output = 'i';
    *output = '\n';
}
```

#### `istreambuf_iterator`
+ **定义**: `istreambuf_iterator<char>`
+ **构造方法**: `istreambuf_iterator<char> itr(cin);`
+ **功能**: 从输入流中读取未格式化的数据。
+ **特性**: 始终读取字符数据，不跳过空白。
+ **用途**: 常用于从文件中读取原始数据进行处理。
+ 示例:使用 `istreambuf_iterator` 从标准输入读取原始字符数据。

```cpp
#include <iterator>
#include <iostream>
#include <algorithm>
#include <vector>

int main() {
    std::cout << "Enter text, followed by EOF: ";
    std::istreambuf_iterator<char> start(std::cin), end;
    std::vector<char> characters(start, end);
    
    std::cout << "You entered: ";
    std::copy(characters.begin(), characters.end(), std::ostream_iterator<char>(std::cout, ""));
    std::cout << std::endl;
}
```