---
title: How to learn _hello agent_
date: 2025-03-01 00:00:00
categories:
  - 默认知识库
tags:
  - 学习笔记
---

_**agent**_是什么？

能自主收集信息思考后做出反应的智能体,要求运行的每步都有_thought_与_action_，



利用在线模型和在线api供应商  
**推理时代**

**tavily**

****

****

##   
如何生成一个简单的旅游推荐agent？  

```plain
AGENT_SYSTEM_PROMPT = """
你是一个智能旅行助手。你的任务是分析用户的请求，并使用可用工具一步步地解决问题。

# 可用工具:
- `get_weather(city: str)`: 查询指定城市的实时天气。
- `get_attraction(city: str, weather: str)`: 根据城市和天气搜索推荐的旅游景点。

# 输出格式要求:
你的每次回复必须严格遵循以下格式，包含一对Thought和Action：

Thought: [你的思考过程和下一步计划]
Action: [你要执行的具体行动]

Action的格式必须是以下之一：
1. 调用工具：function_name(arg_name="arg_value")
2. 结束任务：Finish[最终答案]

# 重要提示:
- 每次只输出一对Thought-Action
- Action必须在同一行，不要换行
- 当收集到足够信息可以回答用户问题时，必须使用 Action: Finish[最终答案] 格式结束

请开始吧！
"""

import requests
from pathlib import Path

def get_weather(city: str) -> str:
    """
    通过调用 wttr.in API 查询真实的天气信息。
    """
    # API端点，我们请求JSON格式的数据
    url = f"https://wttr.in/{city}?format=j1"
    
    try:
        # 发起网络请求
        response = requests.get(url)
        # 检查响应状态码是否为200 (成功)
        response.raise_for_status() 
        # 解析返回的JSON数据
        data = response.json()
        
        # 提取当前天气状况
        current_condition = data['current_condition'][0]
        weather_desc = current_condition['weatherDesc'][0]['value']
        temp_c = current_condition['temp_C']
        
        # 格式化成自然语言返回
        return f"{city}当前天气:{weather_desc}，气温{temp_c}摄氏度"
        
    except requests.exceptions.RequestException as e:
        # 处理网络错误
        return f"错误:查询天气时遇到网络问题 - {e}"
    except (KeyError, IndexError) as e:
        # 处理数据解析错误
        return f"错误:解析天气数据失败，可能是城市名称无效 - {e}"


import os
from tavily import TavilyClient


def load_root_env() -> None:
    """
    从项目根目录加载 .env 文件到环境变量。
    ez_2.py 位于 chapter_1 下，所以根目录是上一级目录。
    """
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        print(f"警告: 未找到环境变量文件 {env_path}")
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)

def get_attraction(city: str, weather: str) -> str:
    """
    根据城市和天气，使用Tavily Search API搜索并返回优化后的景点推荐。
    """
    # 1. 从环境变量中读取API密钥
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        return "错误:未配置TAVILY_API_KEY环境变量。"

    # 2. 初始化Tavily客户端
    tavily = TavilyClient(api_key=api_key)
    
    # 3. 构造一个精确的查询
    query = f"'{city}' 在'{weather}'天气下最值得去的旅游景点推荐及理由"
    
    try:
        # 4. 调用API，include_answer=True会返回一个综合性的回答
        response = tavily.search(query=query, search_depth="basic", include_answer=True)
        
        # 5. Tavily返回的结果已经非常干净，可以直接使用
        # response['answer'] 是一个基于所有搜索结果的总结性回答
        if response.get("answer"):
            return response["answer"]
        
        # 如果没有综合性回答，则格式化原始结果
        formatted_results = []
        for result in response.get("results", []):
            formatted_results.append(f"- {result['title']}: {result['content']}")
        
        if not formatted_results:
             return "抱歉，没有找到相关的旅游景点推荐。"

        return "根据搜索，为您找到以下信息:\n" + "\n".join(formatted_results)

    except Exception as e:
        return f"错误:执行Tavily搜索时出现问题 - {e}"


# 将所有工具函数放入一个字典，方便后续调用
available_tools = {
    "get_weather": get_weather,
    "get_attraction": get_attraction,
}


from openai import OpenAI

class OpenAICompatibleClient:
    """
    一个用于调用任何兼容OpenAI接口的LLM服务的客户端。
    """
    def __init__(self, model: str, api_key: str, base_url: str):
        self.model = model
        self.client = OpenAI(api_key=api_key, base_url=base_url)

    def generate(self, prompt: str, system_prompt: str) -> str:
        """调用LLM API来生成回应。"""
        print("正在调用大语言模型...")
        try:
            messages = [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': prompt}
            ]
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=False
            )
            answer = response.choices[0].message.content
            print("大语言模型响应成功。")
            return answer
        except Exception as e:
            print(f"调用LLM API时发生错误: {e}")
            return "错误:调用语言模型服务时出错。"



import re

# --- 1. 配置LLM客户端 ---
# 从根目录 .env 加载配置
load_root_env()

API_KEY = os.environ.get("OPENAI_API_KEY")
BASE_URL = os.environ.get("OPENAI_BASE_URL")
MODEL_ID = os.environ.get("MODEL_NAME")

missing_keys = [
    key for key, value in {
        "OPENAI_API_KEY": API_KEY,
        "OPENAI_BASE_URL": BASE_URL,
        "MODEL_NAME": MODEL_ID,
        "TAVILY_API_KEY": os.environ.get("TAVILY_API_KEY"),
    }.items() if not value
]

if missing_keys:
    raise ValueError(f"缺少环境变量: {', '.join(missing_keys)}。请检查根目录 .env 文件。")

llm = OpenAICompatibleClient(
    model=MODEL_ID,
    api_key=API_KEY,
    base_url=BASE_URL
)

# --- 2. 初始化 ---
user_prompt = "你好，请帮我查询一下今天北京的天气，然后根据天气推荐一个合适的旅游景点。"
prompt_history = [f"用户请求: {user_prompt}"]

print(f"用户输入: {user_prompt}\n" + "="*40)

# --- 3. 运行主循环 ---
for i in range(5): # 设置最大循环次数
    print(f"--- 循环 {i+1} ---\n")
    
    # 3.1. 构建Prompt
    full_prompt = "\n".join(prompt_history)
    
    # 3.2. 调用LLM进行思考
    llm_output = llm.generate(full_prompt, system_prompt=AGENT_SYSTEM_PROMPT)
    # 模型可能会输出多余的Thought-Action，需要截断
    match = re.search(r'(Thought:.*?Action:.*?)(?=\n\s*(?:Thought:|Action:|Observation:)|\Z)', llm_output, re.DOTALL)
    if match:
        truncated = match.group(1).strip()
        if truncated != llm_output.strip():
            llm_output = truncated
            print("已截断多余的 Thought-Action 对")
    print(f"模型输出:\n{llm_output}\n")
    prompt_history.append(llm_output)
    
    # 3.3. 解析并执行行动
    action_match = re.search(r"Action: (.*)", llm_output, re.DOTALL)
    if not action_match:
        observation = "错误: 未能解析到 Action 字段。请确保你的回复严格遵循 'Thought: ... Action: ...' 的格式。"
        observation_str = f"Observation: {observation}"
        print(f"{observation_str}\n" + "="*40)
        prompt_history.append(observation_str)
        continue
    action_str = action_match.group(1).strip()

    if action_str.startswith("Finish"):
        final_answer = re.match(r"Finish\[(.*)\]", action_str).group(1)
        print(f"任务完成，最终答案: {final_answer}")
        break
    
    tool_name = re.search(r"(\w+)\(", action_str).group(1)
    args_str = re.search(r"\((.*)\)", action_str).group(1)
    kwargs = dict(re.findall(r'(\w+)="([^"]*)"', args_str))

    if tool_name in available_tools:
        observation = available_tools[tool_name](**kwargs)
    else:
        observation = f"错误:未定义的工具 '{tool_name}'"

    # 3.4. 记录观察结果
    observation_str = f"Observation: {observation}"
    print(f"{observation_str}\n" + "="*40)
    prompt_history.append(observation_str)

```

  
  
workflow和agent的区别是什么？













## 亲手实现一个transformer
自注意力机制：

+ **<font style="color:rgb(44, 62, 80);">查询 (Query, Q)</font>**<font style="color:rgb(52, 73, 94);">：代表当前词元，它正在主动地“查询”其他词元以获取信息。</font>
+ **<font style="color:rgb(44, 62, 80);">键 (Key, K)</font>**<font style="color:rgb(52, 73, 94);">：代表句子中可被查询的词元“标签”或“索引”。</font>
+ **<font style="color:rgb(44, 62, 80);">值 (Value, V)</font>**<font style="color:rgb(52, 73, 94);">：代表词元本身所携带的“内容”或“信息”。</font>

<font style="color:rgb(52, 73, 94);">这三个向量都是由原始的词嵌入向量乘以三个不同的、可学习的权重矩阵 (W^Q,W^K,W^V</font>_<font style="color:rgb(52, 73, 94);">W^Q</font>_<font style="color:rgb(52, 73, 94);">,</font>_<font style="color:rgb(52, 73, 94);">W^K</font>_<font style="color:rgb(52, 73, 94);">,</font>_<font style="color:rgb(52, 73, 94);">W^V</font>_<font style="color:rgb(52, 73, 94);">) 得到的。整个计算过程可以分为以下几步，我们可以把它想象成一次高效的开卷考试：</font>

+ <font style="color:rgb(52, 73, 94);">准备“考题”和“资料”：对于句子中的每个词，都通过权重矩阵生成其Q,K,V</font>_<font style="color:rgb(52, 73, 94);"></font>_<font style="color:rgb(52, 73, 94);">向量。</font>
+ <font style="color:rgb(52, 73, 94);">计算相关性得分：要计算词A的新表示，就用词</font>_<font style="color:rgb(52, 73, 94);">A</font>_<font style="color:rgb(52, 73, 94);">的</font>_<font style="color:rgb(52, 73, 94);">Q</font>_<font style="color:rgb(52, 73, 94);">向量，去和句子中所有词（包括</font>_<font style="color:rgb(52, 73, 94);">A</font>_<font style="color:rgb(52, 73, 94);">自己）的</font>_<font style="color:rgb(52, 73, 94);">K</font>_<font style="color:rgb(52, 73, 94);">向量进行点积运算。这个得分反映了其他词对于理解词</font>_<font style="color:rgb(52, 73, 94);">A</font>_<font style="color:rgb(52, 73, 94);">的重要性。</font>
+ <font style="color:rgb(52, 73, 94);">稳定化与归一化：将得到的所有分数除以一个缩放因子</font><font style="color:#DF2A3F;">\\sqrt{d_k}</font><font style="color:rgb(52, 73, 94);">（是K向量的维度），以防止梯度过小，然后用Softmax函数将分数转换成总和为1的权重，也就是归一化的过程。</font>
+ <font style="color:rgb(52, 73, 94);">加权求和：将上一步得到的权重分别乘以每个词对应的V向量，然后将所有结果相加。最终得到的向量，就是词</font>_<font style="color:rgb(52, 73, 94);">A</font>_<font style="color:rgb(52, 73, 94);">融合了全局上下文信息后的新表示。</font>

<font style="color:rgb(52, 73, 94);"></font>

+ <font style="color:rgb(52, 73, 94);">自注意力机制（Self-Attention）的核心思想是什么？</font>
+ <font style="color:rgb(52, 73, 94);">为什么Transformer能够并行处理序列，而RNN必须串行处理？位置编码（Positional Encoding）在其中起什么作用？</font>
+ <font style="color:rgb(52, 73, 94);">Decoder-Only架构与完整的Encoder-Decoder架构有什么区别？为什么现在主流的大语言模型都采用Decoder-Only架构？</font>

<font style="color:rgb(52, 73, 94);">答：</font>

1. <font style="color:rgb(52, 73, 94);">Self-Attention 的核心思想</font>

<font style="color:rgb(52, 73, 94);">核心就一句话：让序列中每个 token 都能“按需”查看其他 token，并动态决定关注谁、关注多少。</font>

<font style="color:rgb(52, 73, 94);">更形式化一点：</font>

<font style="color:rgb(52, 73, 94);">对每个 token，都会生成 Q（query）、K（key）、V（value）。  
</font><font style="color:rgb(52, 73, 94);">当前 token 用自己的 Q 去和所有 token 的 K 做相似度，得到一组权重（attention score）。  
</font><font style="color:rgb(52, 73, 94);">用这些权重对所有 token 的 V 做加权求和，得到当前 token 的新表示。  
</font><font style="color:rgb(52, 73, 94);">这带来的好处：</font>

<font style="color:rgb(52, 73, 94);">能建模长距离依赖（句首和句尾可以直接交互）。  
</font><font style="color:rgb(52, 73, 94);">关注模式是数据驱动、上下文相关的，不是固定窗口。  
</font><font style="color:rgb(52, 73, 94);">多头注意力（Multi-Head）可以并行学习不同关系（语法、语义、指代等）。  
</font><font style="color:rgb(52, 73, 94);">2. 为什么 Transformer 能并行，RNN 必须串行？</font>

<font style="color:rgb(52, 73, 94);">关键在计算依赖关系：</font>

<font style="color:rgb(52, 73, 94);">RNN：  
</font><font style="color:rgb(52, 73, 94);">h_t = f(x_t, h_{t-1})  
</font><font style="color:rgb(52, 73, 94);">第 t 步必须等 t-1 步算完，天然时间依赖，训练和推理都难并行（尤其训练时）。  
</font><font style="color:rgb(52, 73, 94);">Transformer（自注意力）：  
</font><font style="color:rgb(52, 73, 94);">一层内所有位置的 Q/K/V 可以同时算。  
</font><font style="color:rgb(52, 73, 94);">注意力矩阵本质是大规模矩阵乘法（GPU/TPU 非常擅长），所以训练可高度并行。  
</font><font style="color:rgb(52, 73, 94);">即使是 Decoder 用了因果 mask，训练时仍可把整段序列一次性喂入，mask 保证“看不到未来”，所以仍能并行算整段 loss。  
</font><font style="color:rgb(52, 73, 94);">补一句：  
</font><font style="color:rgb(52, 73, 94);">Decoder 在生成阶段仍是逐 token 自回归（因为下一个 token 依赖已生成结果），但这和 RNN 的“每层每步都串行”不是一个层面的瓶颈，且可用 KV cache 大幅优化。</font>

3. <font style="color:rgb(52, 73, 94);">Positional Encoding 的作用</font>

<font style="color:rgb(52, 73, 94);">因为纯自注意力本身对输入是“集合式”的，不知道顺序。  
</font><font style="color:rgb(52, 73, 94);">位置编码就是把“第几个词”信息注入模型，让模型区分：</font>

<font style="color:rgb(52, 73, 94);">“猫追狗” vs “狗追猫”  
</font><font style="color:rgb(52, 73, 94);">邻近关系、远距关系、相对顺序等  
</font><font style="color:rgb(52, 73, 94);">常见做法：</font>

<font style="color:rgb(52, 73, 94);">绝对位置编码（sin/cos 或可学习向量）  
</font><font style="color:rgb(52, 73, 94);">相对位置编码（如 RoPE、ALiBi 一类思想）  
</font><font style="color:rgb(52, 73, 94);">它的本质作用：给注意力机制补上序列结构先验。</font>

4. <font style="color:rgb(52, 73, 94);">Decoder-Only vs Encoder-Decoder 的区别</font>

<font style="color:rgb(52, 73, 94);">Encoder-Decoder（完整 Transformer）</font>

<font style="color:rgb(52, 73, 94);">Encoder：双向看输入，得到源序列表征。  
</font><font style="color:rgb(52, 73, 94);">Decoder：带因果 mask，自回归生成输出，并通过 cross-attention 读取 encoder 输出。  
</font><font style="color:rgb(52, 73, 94);">典型任务：机器翻译、摘要、问答（输入->输出映射明确）。  
</font><font style="color:rgb(52, 73, 94);">Decoder-Only</font>

<font style="color:rgb(52, 73, 94);">只有一个自回归 decoder 堆栈（causal self-attention）。  
</font><font style="color:rgb(52, 73, 94);">把“输入+输出”都当成同一串 token，训练目标是下一 token 预测。  
</font><font style="color:rgb(52, 73, 94);">典型代表：GPT 系列。  
</font><font style="color:rgb(52, 73, 94);">5. 为什么主流大语言模型多用 Decoder-Only？</font>

<font style="color:rgb(52, 73, 94);">主要是工程与规模化优势叠加：</font>

<font style="color:rgb(52, 73, 94);">统一目标简单且通用  
</font><font style="color:rgb(52, 73, 94);">直接做 next-token prediction，几乎所有文本都可用作训练数据，不需要复杂标注。</font>

<font style="color:rgb(52, 73, 94);">训练管线更简单  
</font><font style="color:rgb(52, 73, 94);">一个网络、一个损失，适配海量互联网语料最自然，扩展到万亿 token 训练更直接。</font>

<font style="color:rgb(52, 73, 94);">生成任务适配最好  
</font><font style="color:rgb(52, 73, 94);">聊天、写作、代码补全本质是连续生成，Decoder-Only 和使用场景高度一致。</font>

<font style="color:rgb(52, 73, 94);">in-context learning 能力强  
</font><font style="color:rgb(52, 73, 94);">把指令、示例、上下文拼在 prompt 里即可完成多任务，减少任务特定头和复杂架构需求。</font>

<font style="color:rgb(52, 73, 94);">推理系统成熟  
</font><font style="color:rgb(52, 73, 94);">KV cache、张量并行、流水并行、量化等优化在 Decoder-Only 上生态最成熟，部署成本更可控。</font>

<font style="color:rgb(52, 73, 94);">不是说 Encoder-Decoder 过时：</font>

<font style="color:rgb(52, 73, 94);">在一些“输入理解很重、输出相对短”的任务上（如高质量翻译）仍可能很强。  
</font><font style="color:rgb(52, 73, 94);">但在“统一大模型 + 通用生成”范式下，Decoder-Only 的性价比和扩展性目前最占优。</font>