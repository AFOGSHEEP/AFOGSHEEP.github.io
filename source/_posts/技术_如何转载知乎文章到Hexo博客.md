---
title: 如何把知乎专栏文章完整转载到 Hexo 博客：正文抓取与配图本地化
date: 2026-09-19 16:30:00
cover: /images/zhihu-repost-howto-cover.jpg
categories:
  - 学习笔记
tags:
  - Hexo
  - 知乎
  - 转载
  - Jina Reader
  - Cloudflare Pages
  - 踩坑
---

刚把一篇知乎专栏文章转载到本站（[《大龄程序员被裁后：个人开发 → 接外包 → 自媒体 → 带货 → 铁人三项全经历》](/2026/09/19/阅读_大龄程序员被裁后的铁人三项全经历/)），整个过程踩了几个挺典型的坑，记下来备用。

知乎的转载难点不在正文，正文随便什么方式都能弄到。真正会让人翻车的是配图：`pic*.zhimg.com` 有防盗链，你要是直接把图片地址写进 Markdown，本地预览可能看着好好的，一上线全变裂图。所以这篇的重点是配图本地化。

## 一、先别急着写脚本，知乎把常规路子都堵了

按顺序试下来：

| 方式 | 结果 |
|---|---|
| 浏览器访问 | 正常人能看 |
| `fetch` 类工具 | 被 `robots.txt` 拒绝（`User-agent: *` → `Disallow: /`） |
| `curl` 直连 | `403`，只有 694 字节的错误页 |
| 知乎 API `/api/v4/articles/<id>` | `403`，`{"error":{"code":10003}}` |
| 带 Cookie / 换 UA | 依然 403 |

注意最后一行：知乎的 403 不是靠换个 User-Agent 就能绕的，它要的是登录态和前端签名。硬刚没有意义，直接换思路。

## 二、正文：用 Jina Reader 兜底

`r.jina.ai` 是个把网页转成 Markdown 的渲染服务，它自己带浏览器和渲染环境，所以能拿到知乎对普通爬虫不给的内容：

```bash
curl -sL --max-time 40 \
  "https://r.jina.ai/https://zhuanlan.zhihu.com/p/2083550046256158185" \
  -o article.txt
```

返回的是干净的 Markdown，标题、段落、图片位置都在。开头三行是它自己的元信息（`Title:` / `URL Source:` / `Markdown Content:`），处理时跳过。

代价是正文里会混进两类脏东西，必须清掉：

**1. 站内搜索链接。** 知乎把正文里几乎每个名词都包成了 `zhida.zhihu.com` 的搜索结果页链接，一个链接上千字符，还内嵌了带签名的 JWT。一篇一万字的文章能塞进两百个。这些要还原成纯文本：

```python
import re

def strip_zhida_links(text: str) -> str:
    """[锚文本](https://zhida.zhihu.com/...) -> 锚文本"""
    return re.sub(
        r"\[([^\]]+)\]\(https://zhida\.zhihu\.com/[^)]*\)",
        r"\1",
        text,
    )
```

**2. 页面 JS 碎片。** 偶尔会有类似 `ai_wZ1">` 这样的残留混在段落开头，是渲染时从内联脚本里串出来的，直接 `str.replace` 掉即可。

## 三、配图本地化（这一步才是重点）

知乎图片走 `picx` / `pica` / `pic1` / `pic4` 这几个 CDN，直连能下，但**带 Referer 校验**。所以要在 Markdown 里直接外链它，访客打开就是一堆裂图。

流程是：下载 → 转存本站 → 改引用路径。

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

mkdir -p source/images/<你的目录名>

i=1
while read -r url; do
  curl -sL --max-time 40 \
    -A "$UA" \
    -e "https://zhuanlan.zhihu.com/" \
    "$url" -o "source/images/<你的目录名>/img-$i.jpg"
  i=$((i+1))
done < image_urls.txt
```

两个细节别省：

- `-e`（Referer）必须带，虽然实测有些图不带也能下，但带了更稳。
- `-A` 用真实浏览器 UA，别用 curl 默认的。

然后批量改引用：

```python
IMG_MAP = {
    1: ("01-pawn-records.jpg", "典当黄金与闲置物品的记录截图"),
    2: ("02-tuiwen-sample.jpg", "推文投放后引导回站的示意"),
}
```

给图片起**有意义的中文 alt**，别留 `Image 1`。这不只是好看——图挂了的时候 alt 是唯一能告诉读者这里原本是什么的东西，对无障碍访问也是必须的。

**存哪儿？** 本站 `_config.yml` 里 `post_asset_folder: true`，但既有文章统一用 `source/images/<目录>/` 配 `/images/<目录>/xxx.jpg` 的绝对路径。两种都行，**关键是全文统一**，混用迟早出问题。我选后者，和站内其它文章保持一致。

## 四、作者信息：API 挂了怎么拿

要给作者署名，就得知道作者是谁。但知乎 API 是 403。

办法是让 Jina 返回原始 HTML，再从里面抠：

```bash
curl -sL -H "x-return-format: html" \
  "https://r.jina.ai/https://zhuanlan.zhihu.com/p/2083550046256158185" \
  -o raw.html
```

知乎会把文章数据以 JSON 形式内联在 HTML 里，搜 `"author":{` 就能定位到作者对象，含 `name`、`urlToken`、`headline` 等字段。

**这里有个真实的坑。** 我第一次是用 `json.loads` 之前先做了转义还原，写法是：

```python
seg.encode().decode("unicode_escape")   # 错误示范
```

结果中文全变乱码，`霓虹小飞猪` 变成了 `éè¹å°é£çª`。原因是 `unicode_escape` 按 latin-1 解码，而 `\uXXXX` 还原后还是 UTF-8 字节序列，被二次破坏了。

正确做法是只对 `\uXXXX` 转义序列做替换，不碰其它字符：

```python
import json, re

def parse_embedded_json(blob: str) -> dict:
    fixed = re.sub(
        r"\\u([0-9a-fA-F]{4})",
        lambda m: chr(int(m.group(1), 16)),
        blob,
    )
    return json.loads(fixed)
```

更省事的办法是直接用 `json.loads` 吃原始串——Python 的 JSON 解析器本来就认识 `\uXXXX`，根本不需要手工还原。我绕的那一圈纯属多余。

## 五、front-matter 与转载信息块

本站的转载惯例是在正文最前面放一个引用块，把出处、作者、链接交代清楚：

```markdown
> **原帖信息** 知乎专栏 · 作者 **霓虹小飞猪**
> **原帖链接** https://zhuanlan.zhihu.com/p/2083550046256158185
> **作者主页** https://www.zhihu.com/people/74-73-69-65-91
> **备注** 本文为转载，版权归原作者所有。仅做排版整理：去掉站内搜索链接、配图转存本站、更新分隔线改为小标题，正文未做改动。
```

那个「备注」不是客套。**你改了什么必须写清楚**——读者有权知道拿到的是原文还是加工版，这也是「没改正文」这句话有意义的前提。

## 六、构建验证：别信"假绿灯"

这是整个流程里最值得单独拎出来讲的一条。

`npm run build` 报成功，**不代表页面是对的**。我这次就中招了：Markdown 里引用的图片名是我改名后的（`01-pawn-records.jpg`），但磁盘上文件还叫 `img-1.jpg`。构建照样全绿，`Generated` 日志一条不少，实际上 7 张图全是 404。

要逮住这种错，得把渲染结果和文件系统对一遍，而不是看构建退出码：

```bash
npm run build >/dev/null 2>&1

P=$(find public/2026/09/19 -name index.html | head -1)

for f in $(grep -oE '/images/[^"]+' "$P" | sort -u); do
  if [ -f "public$f" ]; then
    echo "OK   $f"
  else
    echo "MISS $f"
  fi
done
```

原理很简单：把渲染出来的 HTML 里所有 `src` 抠出来，逐个去 `public/` 里找对应文件。找不到就是坏的。这比"构建成功"可靠得多，而且能顺手抓到主题配置、`url_for` 之类的问题。

## 七、部署：两条管线，验证方式不一样

本站 `push main` 会同时触发两条管线：

| 管线 | 构建命令 | 响应头特征 |
|---|---|---|
| GitHub Actions → GitHub Pages | `npx hexo generate` | `server: GitHub.com` |
| Cloudflare Pages | `npm run build` | `server: cloudflare` |

注意两条的构建命令**不一样**。Cloudflare 跑 `npm run build`（含 Tailwind 编译），GitHub Actions 只跑 `npx hexo generate`。所以新增 Tailwind 类名时，必须本地 `npm run build` 之后把受 git 跟踪的 `themes/fancy-avalanche/source/css/tailwind.css` 一起提交，否则 GitHub Pages 那份会缺样式类。

**推送被墙的话**，走 443 端口：

```bash
GIT_SSH_COMMAND="ssh -o Hostname=ssh.github.com -o Port=443" git push origin main
```

**验证时的坑：** Cloudflare Pages 对 `HEAD` 请求不返回响应头，`curl -sI` 拿到空的，看着像页面挂了。改用 GET 就正常：

```bash
# 可能什么都不返回，别被误导
curl -sI "https://<你的>.pages.dev/<文章路径>/"

# 用这个
curl -s -o /dev/null -w "%{http_code}\n" "https://<你的>.pages.dev/<文章路径>/"
```

我一开始就被这个骗了一下，以为 Cloudflare 那条管线没部署成功，实际是好的。

## 八、转载的边界

技术上跑通不代表可以随便转。动手前过一遍这三条：

1. **先问作者。** 知乎专栏默认是「保留所有权利」，标注出处不等于拿到授权。我这篇转载就是先跟作者私聊确认过的——对方明确表示不介意在非盈利的个人博客转载。**不盈利不等于不需要授权，这两件事没有因果关系。**
2. **标明出处。** 原文链接、作者名、作者主页，能给的都给。
3. **别改正文。** 格式可以整理（去链接、调分隔线、图片本地化），但观点、事实、语气一个字都别动。改了就必须在备注里写明改了哪里。

另外提醒一句：原作者如果还在连载，转载时把「未完待续」的状态也交代一下，别让读者以为这就是全文。

## 小结

按依赖顺序排下来是：

1. 正文 —— Jina Reader
2. 清理 —— 正则剥离站内链接与 JS 碎片
3. 配图 —— 下载转存 + 改引用路径（**防盗链是最大的坑**）
4. 署名 —— 从内联 JSON 抠作者信息
5. 排版 —— front-matter + 转载信息块
6. 验证 —— `src` 与 `public/` 逐个比对，别信构建退出码
7. 部署 —— push 触发双管线，注意两条构建命令不同

真正花时间的不是抓正文，是「抓完之后怎么确认它真的没坏」。构建绿灯、本地预览正常、图片能打开，这三件事都不能证明线上是好的——只有把渲染结果和文件系统对一遍才能。
