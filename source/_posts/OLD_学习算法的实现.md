---
title: 简单学习算法的实现
date: 2024-7-1 00:22:36
categories:
  - 学习笔记
tags:
  - 深度学习
---

normalize : 将图像的像素值正规化为0.0~1.0
    one_hot_label : 
        one_hot_label为True的情况下，标签作为one-hot数组返回
        one-hot数组是指[0,0,1,0,0,0,0,0,0,0]这样的数组
    flatten : 是否将图像展开为一维数组
    
    Returns
    -------
    (训练图像, 训练标签), (测试图像, 测试标签)
    """
    mnist_path = "E:\\deap_learning\\resource"

    dataset = {
        'train_img': load_images(os.path.join(mnist_path, 'train-images-idx3-ubyte.gz')),
        'train_label': load_labels(os.path.join(mnist_path, 'train-labels-idx1-ubyte.gz')),
        'test_img': load_images(os.path.join(mnist_path, 't10k-images-idx3-ubyte.gz')),
        'test_label': load_labels(os.path.join(mnist_path, 't10k-labels-idx1-ubyte.gz'))
    }
    
    if normalize:
        for key in ('train_img', 'test_img'):
            dataset[key] = dataset[key].astype(np.float32)
            dataset[key] /= 255.0
            
    if one_hot_label:
        dataset['train_label'] = _change_one_hot_label(dataset['train_label'])
        dataset['test_label'] = _change_one_hot_label(dataset['test_label'])
    
    if not flatten:
        for key in ('train_img', 'test_img'):
            dataset[key] = dataset[key].reshape(-1, 1, 28, 28)

    return (dataset['train_img'], dataset['train_label']), (dataset['test_img'], dataset['test_label'])

def load_images(file_path):
    with gzip.open(file_path, 'rb') as f:
        data = np.frombuffer(f.read(), np.uint8, offset=16)
    return data.reshape(-1, 784)

def load_labels(file_path):
    with gzip.open(file_path, 'rb') as f:
        data = np.frombuffer(f.read(), np.uint8, offset=8)
    return data

def _change_one_hot_label(X):
    T = np.zeros((X.size, 10))
    for idx, row in enumerate(T):
        row[X[idx]] = 1
    return T




  
```

在代码中出现了epoch作为学习时的次数单位。

### 什么是 `epoch`？
在机器学习和深度学习中，`epoch` 是一个重要的概念。`epoch` 表示整个训练数据集通过神经网络一次。简单来说，一个 `epoch` 就是将所有的训练数据都用来更新模型参数一次。

### `epoch` 在神经网络中的作用
在训练神经网络时，我们通常不会一次性将整个训练数据集都输入到模型中进行训练，而是将数据集分成多个小批次（batch），然后依次输入模型。这样做的原因包括：

1. **内存限制**：一次性处理整个数据集可能会导致内存不足，尤其是当数据集非常大时。
2. **更稳定的梯度更新**：使用小批次数据可以使梯度更新更加平稳，并能有效避免一些局部最优解。

在每个 `epoch` 中，模型会经历以下过程：

1. 将训练数据集分成若干个批次（batches）。
2. 对每个批次进行前向传播、计算损失、后向传播、更新模型参数。
3. 一个 `epoch` 结束后，通常会进行一次验证，检查模型在验证集上的表现，以判断模型是否在训练中取得进展。

## 总结
我们以损失函数为基准，找出了使神经网络的值达到最小的权重参数，也就是神经网络学习的目标。为了尽可能找到小的损失函数值，我们使用了函数斜率的梯度法。