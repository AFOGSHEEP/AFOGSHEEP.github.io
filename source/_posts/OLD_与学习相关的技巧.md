---
title: 与学习相关的技巧
date: 2024-7-24 00:00:01
categories:
  - 学习笔记
tags:
  - 深度学习
---

---

date: 2024-7-24 00:00:01  
本节设计神经网络的学习中的一些重要的观点。主题有寻找最优权重参数的优化方法，权重参数的初始值，超参数的设定方法等。为了应对过拟合（神经网络在训练样本中表现过于优越，导致在验证数据集和测试数据集中表现不佳），还会介绍权值衰减，Dropout等正则化方法。

## 参数的更新
神经网络的学习的目的是找到使损失函数的值尽可能小的参数，这个过程被称作“最优化”。参数空间非常复杂，且深度神经网络中，参数的数目十分庞大，导致了最优化问题非常复杂。

我们之前使用了随机梯度下降法（stochastic gradient descent）来更新参数。SGD虽然是简单的方法，但是比起无目的的在参数空间中乱逛，无疑是有效的。接下来我们复习SGD。

用数学式可以把SGD写成如下的式子：

![image](https://cdn.nlark.com/yuque/__latex/916d990b351349bafc12be8203755ddd.svg)

需要更新的权重为w，η代表学习率，通常会实现设定好为0.1或者0.01等。箭头代表更新左边的值。

我们将SGD实现为一个名为SGD的类：

```python
class SGD:
    def __init__(self,lr = 0.01):
        self.lr = lr
        
    def update(self,params,grads):
        for key in params.keys():
            params[key] -= self.lr * grads[key]
```

虽然SGD简单且容易实现，但在面对非均向（anisotropic），比如延伸状，搜索的路径路径就会十分低效。因此，我们需要比单纯梯度方向前进的SGD更聪明的方法。SGD低效的根本原因是，梯度的方向并没有指向最小值的方向。

为了改正SGD的缺点，我们将会介绍Momentum，AdaGrad,Adam这三种方法来取代SGD。

## Momentum
用数学式来表示Momentum方法：

![image](https://cdn.nlark.com/yuque/__latex/0cacc27a5878b2586a06b748188858bb.svg)

W代表要更新的权重参数，η为学习率，分数是表示损失函数关于W的梯度。这里的新变量v对应物理上的速度。这两个式子表示了物体在梯度方向上受力，在这个力作用下，物体的速度增加这一个物理法则。下面是Momentum的代码实现：

```python
class Momentum:
    def __init__(self,lr = 0.01 , momentum = 0):
        self.lr = lr
        self.momentum = momentum
        self.v = none
        
    def update(self,params,grads):
        if self.v is none:
            self.v = {}
            for key, val in params.items():
                self.v[key] = np.zeros_like(val)
                
    for key in params.keys():
        self.v[key] = self.momentum * self.v[key] - self.lr * grads[key]
        params[key] += self.v[key]
```

## Adagrad
在神经网络的学习中，学习率（数学式中的η）的值很重要，学习率过小，会导致学习花费太多时间；学习率过大，会导致学习发散而不能正确进行。在有关学习率的有效技巧中，有一种被称为**学习率衰减（learning rate decay）**的方法。即随着学习的进行，使学习率逐渐减小。实际上，一开始“多”学，然后逐渐“少”学的方法在神经网络的学习中经常被使用。

逐渐减少学习率的想法，相当于将“全体”参数的学习率值一起降低，而AdaGrad进一步发展了这个想法，针对“一个一个”的参数，赋予其“定制”的值。Adagrad会为每个元素适当的调整学习率，与此同时进行学习。下面是用数学式表示的AdaGrad的更新方法：

![image](https://cdn.nlark.com/yuque/__latex/03f42370fb265870325b9d81542d2e29.svg)

实现方法如下：

```python
class AdaGrad:
    def __init__(self, lr=0.01):
        self.lr = lr
        self.h = None
        
    def update(self, params, grads):
        if self.h is None:
            self.h = {}
            for key, val in params.items():
                self.h[key] = np.zeros_like(val)
            
        for key in params.keys():
            self.h[key] += grads[key] * grads[key]
            params[key] -= self.lr * grads[key] / (np.sqrt(self.h[key]) + 1e-7)
            
class RMSprop:
    def __init__(self, lr=0.01, decay_rate = 0.99):
        self.lr = lr
        self.decay_rate = decay_rate
        self.h = None
        
    def update(self, params, grads):
        if self.h is None:
            self.h = {}
            for key, val in params.items():
                self.h[key] = np.zeros_like(val)
            
        for key in params.keys():
            self.h[key] *= self.decay_rate
            self.h[key] += (1 - self.decay_rate) * grads[key] * grads[key]
            params[key] -= self.lr * grads[key] / (np.sqrt(self.h[key]) + 1e-7)
```

同时，AdaGrad会记录过去所有梯度的平方和。因此，学习越深入，更新的幅度就越小。实际上，如果无止境地学习，更新量就会变为0，完全不再更新。为了改善这个问题，可以使用RMSProp方法。RMSProp方法并不是将过去所有的梯度一视同仁地相加，而是逐渐地遗忘过去的梯度，在做加法运算时将新梯度的信息更多地反映出来。这种操作从专业上讲，称为“指数移动平均”，呈指数函数式地减小过去的梯度的尺度。



最后一行的1e-7是为了防止当self.h[key]中有0时将0用作除数的情况。

## Adam
Momentum参照小球在碗中滚动的物理规则进行移动，AdaGrad为参数的每个元素适当地调整更新步伐。将这两个思路融合在一起就是Adam方法的基本思路。

adam会设置三个参数，一个是学习率，另外两个分别是一次momentum参数![image](https://cdn.nlark.com/yuque/__latex/a9b10d199201cd88d1859cf3eb990769.svg)和二次Monmouth参数![image](https://cdn.nlark.com/yuque/__latex/6725440250104208d8432b5fb7e6be6e.svg)

作为2015年提出的方法，他的理论有些复杂。这里不给出数学式，只给出python的实现方式,详细内容参考链接中的论文：

```python
class Adam:

    """Adam (http://arxiv.org/abs/1412.6980v8)"""

    def __init__(self, lr=0.001, beta1=0.9, beta2=0.999):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.iter = 0
        self.m = None
        self.v = None
        
    def update(self, params, grads):
        if self.m is None:
            self.m, self.v = {}, {}
            for key, val in params.items():
                self.m[key] = np.zeros_like(val)
                self.v[key] = np.zeros_like(val)
        
        self.iter += 1
        lr_t  = self.lr * np.sqrt(1.0 - self.beta2**self.iter) / (1.0 - self.beta1**self.iter)         
        
        for key in params.keys():
            #self.m[key] = self.beta1*self.m[key] + (1-self.beta1)*grads[key]
            #self.v[key] = self.beta2*self.v[key] + (1-self.beta2)*(grads[key]**2)
            self.m[key] += (1 - self.beta1) * (grads[key] - self.m[key])
            self.v[key] += (1 - self.beta2) * (grads[key]**2 - self.v[key])
            
            params[key] -= lr_t * self.m[key] / (np.sqrt(self.v[key]) + 1e-7)
            
            #unbias_m += (1 - self.beta1) * (grads[key] - self.m[key]) # correct bias
            #unbisa_b += (1 - self.beta2) * (grads[key]*grads[key] - self.v[key]) # correct bias
            #params[key] += self.lr * unbias_m / (np.sqrt(unbisa_b) + 1e-7)

```



## Batch Normalization
batch normalization,简称batch norm是2015年提出的方法，它有以下优点：

+ 可以使机器学习快速进行（可以增大学习率）
+ 不那么依赖初始值（对于初始值不那么神经质）
+ 抑制过拟合（降低Dropout等的必要性）

Batch的思路是调整各层的激活值分布使其拥有适当的广度，为此要向神经网络中插入对数据分布进行正规化的层，也即BatchNormalization层。

batch norm，顾名思义，以进行学习时的mini-batch为单位，按mini-batch进行正规化，具体而言，就是使数据分布的均值为0，方差为1的正规化。用数学式表达如下：

![image](https://cdn.nlark.com/yuque/__latex/32ba343c6826e08e83baea50c5fdc16b.svg)

这里对mini-batch的m个输入数据的集合**B={$ x_1 $,$ x_2 $,……,$ x_m $}**求均值$ \mu_B $和方差$ \sigma_B^2 $,然后，对输入数据进行均值为0，方差为1（任意合适的分布）的正规化。第三个式子中的$ \epsilon $是一个极小值，防止出现除以0的情况。这三个式子所做的是将mini-batch中的输入数据变化为均值为0，方差为1的数据（正规化）。通过将这个处理插入到激活函数的前面或者后面，可以减小数据分布的偏向。之后，Batch Norm层会对正规化后的数据进行缩放和平移的变换，用数学式表达如下：

$ y_i\,\leftarrow\,\gamma \hat{x_i}\,+\,\beta $

一开始，γ为1，β为0，之后再通过学习调整到合适的值。



## 正则化
### 过拟合
机器学习的问题中，过拟合是一个很常见的问题。过拟合指的是只能拟合训练数据，但不能很好地拟合不包含在训练数据中的其他数据的状态。机器学习的目标是提高泛化能力，即便是没有包含在训练数据里的未观测数据，也希望模型可以进行正确的识别。我们可以制作复杂的、表现力强的模型，

发生过拟合的原因有两个：

+ 模型拥有大量参数，表现力强
+ 训练数据少

“表现力强”是指模型的复杂程度以及其在数据拟合方面的能力。表现力强的模型能够捕捉并表示复杂的模式和细节。具体来说：

表现力强的含义：

1. **大量参数**：
    - 表现力强的模型通常拥有大量参数（例如深度神经网络中的权重和偏置）。这些参数赋予模型更大的灵活性，使其能够学习和拟合数据中的复杂关系和细节。
    - 例如，简单的线性回归模型只有少量参数，只能拟合直线，而深度神经网络具有大量参数，可以拟合高度非线性的关系。
2. **复杂结构**：
    - 复杂的模型结构（例如多层神经网络、决策树的深层树结构）使模型能够处理多维特征并捕捉复杂的模式。
    - 例如，卷积神经网络（CNN）中的卷积层和池化层能够捕捉图像数据中的空间特征和模式。
3. **高阶特征**：
    - 表现力强的模型能够自动生成高阶特征或复杂特征组合，这些特征能够更好地描述数据中的模式和关系。
    - 例如，在自然语言处理任务中，基于注意力机制的Transformer模型能够捕捉句子中不同单词之间的复杂关系。

当模型具有很强的表现力时，它能够很好地拟合训练数据中的细节，包括噪声和异常值。然而，这种过度拟合训练数据的行为会导致模型在未见过的数据上表现不佳，因为模型没有学会数据的真正模式，而是记住了训练数据的细节。

### 权值衰减
权值衰减是一直以来经常被用作的一种抑制过拟合的方法。该方法通过在学习的过程中对大的权重进行乘法来抑制过拟合。很多过拟合正是由于权重参数取值过大才发生的。

对于所有权重，权值衰减方法都会为损失函数加上$ \frac{1}{2}\lambda W^2 $。因此，在求权重梯度的计算中，要为之前的误差反向传播法的结果加上正则化的导数λW。

### Dropout
作为抑制过拟合的方法，前面我们介绍了为损失函数加上权重的L2范数的权值衰减方法。该方法可以简单地实现，在某种程度上能够抑制过拟合。但是，如果网络的模型变得很复杂，只用权值衰减就难以应对了。在这种情况下，我们经常会使用Dropout方法。  
Dropout是一种在学习的过程中随机删除神经元的方法。训练时，随机选出隐藏层的神经元，然后将其删除。被删除的神经元不再进行信号的传递.训练时，每传递一次数据，就会随机选择要删除的神经元。热后，测试时，虽然会传递所有的神经元信号，但是对于各个神经元的输出，要乘上训练时的删除比例后再输出。