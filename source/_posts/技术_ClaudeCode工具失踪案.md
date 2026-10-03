---
title: Claude Code 工具集体失踪，凶手叫 ToolSearch
date: 2026-10-03 16:39:00
cover: /images/cc-toolsearch-cover.jpg
categories:
  - 学习笔记
tags:
  - Claude Code
  - 智谱
  - GLM
  - 故障排查
---

上个会话我让 Claude Code 帮我画个鹈鹕骑自行车的 SVG 动画。它跟我聊得挺热络，完整代码都写在对话里了，就是不肯动手建文件。后来看记录才知道，它压根看不见 Write 工具：它能感知到的工具只有 ToolSearch、WebFetch 这类外围货，Bash、Read、Write、Edit、Agent、Skill 一个都不在。它还不死心，用 ToolSearch 搜了八次，`bash|write|read`，次次空手而归。

先交代下背景：我的 Claude Code 走智谱的 Anthropic 兼容端点（`open.bigmodel.cn/api/anthropic`），模型是 glm-5.3。ToolSearch 是 Claude Code 的按需加载机制，开了 tool search 之后长尾工具不随请求发全量定义，模型要用得先搜一下再加载。

第一反应是权限。翻出 settings.json，`defaultMode` 是 bypassPermissions，白名单一堆裸工具名，没问题。下一个怀疑对象是 env 里那行 `"ENABLE_TOOL_SEARCH": "true"`：工具按需加载模式，开了之后核心工具本该出现在 deferred 注册表里，可注册表也是空的。于是有了这场排查。

## 踩的第一个坑：grep 会话记录

遇到"工具没挂载"，直觉就是翻日志。会话记录在 `~/.claude/projects/` 下，一行一个 JSON：

```bash
f=$(ls -t ~/.claude/projects/-Users-gwen/*.jsonl | head -1)
grep -c '"name":"Bash"' "$f"
# 0
```

结果是 0，当时差点就信了"CLI 压根没发工具定义"。写完第二版取证才反应过来：会话 jsonl 只记对话内容，根本不记请求里的 tools 数组。grep 到 0 只说明"模型这个会话没调用过 Bash"，分不清是没发还是发了没被看见。这条路从根上就是死的，0 不构成任何证据。

## 正确姿势：把请求抓下来

要看 CLI 到底发了什么，只能上网络层。几十行的反代，本机起个服务转发到智谱端点，顺手把每个请求体落盘：

```python
# proxy.py 主干，完整版在文末仓库
class Handler(http.server.BaseHTTPRequestHandler):
    def _handle(self, method):
        body = self.rfile.read(length)
        doc = json.loads(body)
        tools = doc.get("tools")
        with open(LOG, "a") as fh:
            fh.write(json.dumps({
                "n_tools": len(tools),
                "tool_names": [t.get("name") for t in tools],
            }) + "\n")
        # 原样转发到 open.bigmodel.cn，流式回写响应 ...
```

再让 Claude Code 把流量指过来：

```bash
claude -p 'say OK' \
  --settings '{"env":{"ANTHROPIC_BASE_URL":"http://127.0.0.1:8899"}}'
```

`--settings` 的 env 会盖掉 settings.json 里的 env，原文件一个字不用动。抓到的真实请求：

```json
{
  "model": "glm-5.3",
  "n_tools": 12,
  "tool_names": ["Agent", "Bash", "Edit", "ListAgents", "Read",
                 "ReportFindings", "ScheduleWakeup", "Skill",
                 "ToolSearch", "Workflow", "DeferredToolPlaceholder", "Write"]
}
```

Bash、Read、Write、Edit 全在，schema 和 tool search 关闭时逐字节相同（Read 描述 790 字符、schema 776 字符，Bash 1182 / 1456）。CLI 没病。

把这份请求体绕开 CLI 直接回放给智谱，模型还是看不见 Read。但就是这个"还是看不见"，藏着真正的线索。

## 消融实验：一次只动一个变量

手里有能稳定复现的请求体，就能做消融。判据很简单：强制 `tool_choice` 指定 Read，看模型是不是真发出 `tool_use` 调用。变体跑下来：

| 变体 | 动了什么 | Read 能用吗 |
|---|---|---|
| A | 原样（tool search 开） | ❌ 只调 ToolSearch |
| B | tool search 关（28 个工具） | ✅ |
| C | 公告消息 role system 改 user | ❌ |
| D | 删掉 deferred 工具公告消息 | ❌ |
| E | 删掉 DeferredToolPlaceholder | ❌ |
| F | 删掉 ToolSearch | ✅ |
| G | 去掉 defer_loading 标记 | ❌ |
| H | 只删 ToolSearch，placeholder 留着 | ✅ |
| K | ToolSearch 改名 LoadDeferredTools | ✅ |

C、D、E、G 这几组把我手里的假设挨个排掉了：不是消息 role 的锅，不是公告文本的锅，不是 placeholder 的锅，也不是 defer_loading 标记的锅。分水岭在 F、H 和 K。

K 最有意思。把工具改个名，叫 LoadDeferredTools，描述一个字不动、schema 一个字不动，Read 立刻复活。反过来另做了一组（J）：保留原名，描述换成一句干巴巴的 "Search deferred tools."，照样死。

凶手就是 `ToolSearch` 这个名字本身。

## 为什么偏偏是它

先说明，下面是高置信推断，不是字节级实锤。ToolSearch 的描述里有这么一段：

> Fetches full schema definitions for deferred tools so they can be called... Until fetched, only the name is known — there is no parameter schema, so the tool cannot be invoked.

官方 Claude 模型和这套协议是联合训练的，"数组里的工具直接可调，deferred 的才要先搜"对它们是常识。glm-5.3 没吃过这套训练，把"必须先 fetch 才能调用"这条规则过度泛化，套到了所有工具头上。核心工具不在 deferred 注册表里，ToolSearch 永远搜不到，模型于是得出"这些工具不存在"的结论。连 tool_choice 强制指定 Read 都被无视，还是跑去调 ToolSearch，说明这是模型侧的强先验，不是参数校验失败。

责任划分也清楚了。CLI 没问题，定义完整送达；智谱网关没砍，同一个网关同一个模型，ToolSearch 不在数组里 Read 就能用。锅在 glm-5.3 经 Anthropic 兼容端点处理这个工具名的方式。工单已经拟好，描述很具体：请求的 tools 数组含名为 ToolSearch 的工具时，模型丢失其余全部工具定义。

## 修复

罪魁是 ToolSearch 这个工具定义本身，那就别让 CLI 发它。它只在 tool search 开着的时候发：

```diff
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "...",
    "ANTHROPIC_BASE_URL": "https://open.bigmodel.cn/api/anthropic",
-   "CLAUDE_CODE_ATTRIBUTION_HEADER": "0",
-   "ENABLE_TOOL_SEARCH": "true"
+   "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  },
```

删掉之后 CLI 自己在 debug 日志里坦白了：

```
[ToolSearch:optimistic] disabled: ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic
is not a first-party Anthropic host.
```

工具数组回到 29 个，核心工具全在。然后跑个十来行的验证，判据不看模型自述，直接看文件落没落盘：

```bash
#!/bin/bash
T="$(mktemp /tmp/cc-health.XXXXXX).txt"
claude -p "Use the Write tool to create $T with one line: healthcheck-ok.
Then use the Read tool to read it back." >/dev/null 2>&1
if [ -f "$T" ] && grep -q healthcheck-ok "$T"; then
  echo "OK: Write + Read 可用"
else
  echo "FAIL: 核心工具异常"
fi
rm -f "$T"
```

输出 OK。一个 183 字节的测试文件躺在磁盘上，比任何"已修复"的口头承诺都实在。

## 附带纠正一个误会

排查时我把 Glob、Grep、TodoWrite 也列进了失踪名单，其实是冤枉。这三个在 2.1.236 里压根不存在：认得的模型（claude-sonnet-4-5）、不认得的模型（glm-5.3）、tool search 开或关，CLI 发的内置工具都是同样 31 个，里面没有这三个。二进制里残留的 Glob/Grep 描述字符串是给子 agent 和历史路径用的。

所以判断"工具没挂载"，有效判据是 Bash/Read/Write/Edit/Agent/Skill，别拿 Glob/Grep 说事。

## 以后怎么防

改完 settings.json、换端点、换模型，先跑一遍上面那个验证脚本再开工。十秒钟，省下的是整个会话白干。

还有一条比脚本值钱：模型说"我没有 X 工具"、而权限白名单里明明有 X 的时候，第一反应别查权限，去抓请求体。权限是本地的，工具定义是发出去的，两边对不上，问题多半在路上或者在模型那头。而会话 jsonl 里永远找不到答案，它根本不记这个。
