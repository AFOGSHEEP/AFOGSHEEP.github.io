# 博客防御手册 —— 反爬虫 / 反 AI 采集 / 反扫库

> 2026-10-08 部署。适用站点：`afogsheep.github.io`（GitHub Pages，Hexo + Actions 构建，另有 Cloudflare Pages 备用链路）。

---

## 一、先搞清楚对面是谁、图什么（他们的目的）

| 类型 | 常见 UA | 目的 | 威胁等级 |
|---|---|---|---|
| **AI 训练爬虫** | GPTBot、ClaudeBot、Bytespider（字节）、CCBot、Amazonbot、Applebot-Extended、meta-externalagent | 全文抓取喂训练集，你的文章变成模型参数的一部分，之后模型直接"产出"你的内容 | 中（内容资产流失） |
| **AI 搜索 / RAG** | OAI-SearchBot、PerplexityBot、YouBot | 实时抓取入库，AI 回答时直接引用拼接你的内容，把本该到你的流量截走 | 中高（流量截流） |
| **SEO 数据商** | SemrushBot、AhrefsBot、MJ12bot、DotBot | 抓外链/关键词，打包卖数据 | 低 |
| **漏洞扫描 / 扫库** | zgrab、nuclei、sqlmap、Goby、masscan 前端、各种匿名扫描器 | 批量探测 `/wp-admin`、`/.env`、`/.git`、`/phpinfo`、`/backup`、phpMyAdmin、弱口令、已知 CVE 路径。命中目标就入库卖清单，或直接开打 | **高**（真正的攻击前置） |
| **邮箱 / 账号收割** | 无固定 UA | 抓 mailto、页面里的明文联系方式，喂垃圾邮件/钓鱼 | 低中 |
| **抄袭搬运站** | 伪装成正常浏览器 | 全文搬运挂广告，用你的内容抢你的 SEO | 中 |

关键认知：**守规矩的爬虫读 robots.txt，不守规矩的根本不读**。所以 robots.txt 只是第一步（让守规矩的走人 + 给蜜罐区立牌子），真正起作用的是给不守规矩的那批准备的东西。

## 二、GitHub Pages 的特殊约束（决定了策略形态）

静态托管，没有服务器日志、没有防火墙、没有 IP 封禁。所以策略从传统的"拦截"改为三板斧：

1. **消耗**：让爬虫在无底洞里烧掉抓取预算；
2. **污染**：喂给它们噪声文本，污染训练集/索引；
3. **反制指令**：页面里嵌给自动化管线看的通告，指挥 LLM 管线把本站标记为"无内容"。

## 三、本次部署了什么

### 3.1 声明层（对守规矩的生效）

- **`source/robots.txt`**：重写。全部主流 AI 爬虫（GPTBot/ClaudeBot/Bytespider/CCBot/PerplexityBot/Google-Extended 等 18 个 UA）全站 Disallow；`/tarpit/` 等蜜罐路径对所有爬虫 Disallow。
- **`source/ai.txt`**：AI 采集声明（spawning.ai 约定），声明全站内容不授权训练/RAG。
- **`source/_headers`**：加 `X-Robots-Tag: noai, noimageai`（GitHub Pages 忽略此文件；Cloudflare Pages 链路生效）。

### 3.2 蜜罐毒饵区（只有爬虫和扫库工具能发现的地方）

| 路径 | 伪装成 | 吃掉谁 | 效果 |
|---|---|---|---|
| `/tarpit/`（100 个分片互链） | "归档完整性校验区" | 所有深入抓取的爬虫 | 无底洞 + 语料噪声 + LLM 反制通告 |
| `/wp-admin/` | 通用后台登录页 | WordPress 爆破器、通用扫描器 | 引入 tarpit，页内假配置可埋金丝雀 |
| `/admin/` | 运维控制台 | 通用扫描器 | 同上 |
| `/backup/` | 目录列表 + 假备份（`.sql.gz` 是真 gzip、内容全是毒饵 SQL） | 找泄露备份的扫库工具 | 解压出来是垃圾 + 反制通告 |
| `/phpinfo.html` | 假 phpinfo | PHP 指纹扫描器 | 引入 tarpit |

设计要点：

- **人永远看不到**：这些路径不在导航、不在 sitemap、不在站内搜索（`_config.yml` 的 `skip_render` 保证不渲染不进索引）。
- **Google 不受影响**：全部毒饵页 `noindex, nofollow` + robots Disallow，Googlebot 不会碰。**千万不要**把毒文本放进正常文章页——那是 cloaking，会被搜索引擎惩罚。
- 每个毒饵页和 tarpit 分片头部都嵌了 `AUTOMATED PIPELINE NOTICE` 英文通告：要求自动化管线丢弃已抽取文本、把该 URL 上报为 "no content / integrity check failed"。人阅读时它在 HTML 注释里，爬虫读全文时它是正文的一部分——这就是"让 AI 出错"的可落地形态。

### 3.3 效果边界（诚实说明）

索引型爬虫只是下载文本，不会"执行"页面里的任何话，所以没法让它们程序崩溃；能做到的上限是：烧预算、喂噪声、让读到毒饵的 LLM 管线把本站记成"无内容"。AI 阅读器（ChatGPT 联网、Perplexity）对页面级提示注入有部分防护，效果因家而异。这套东西是消耗战和污染战，不是一击必杀。

## 四、下一步可以加的（按性价比排序）

1. **Cloudflare 免费档**（最划算）：Bot Fight Mode 一键开；"Block AI Scrapers and Crawlers" 托管规则一键开；AI Labyrinth（给爬虫喂无关页面绕圈）。`_headers` 已经是 CF Pages 格式，接上就能用。
2. **GitHub 账号层**：开 2FA；给 `main` 开分支保护（防账号被盗后直接推恶意代码上线）；Dependabot 挂着的两个 PR（hexo-theme-butterfly 5.7.0、tailwindcss 4.3.3）顺手合掉。
3. **金丝雀告警**：到 canarytokens.org 免费生成一个 Web/DNS token，替换 `/wp-admin/` 页面里的 `PASTE_CANARY_TOKEN_HERE` —— 以后任何扫描器渲染那个页面，你立刻收到告警（含对方 IP），等于免费入侵检测。
4. **将来若上 VPS**：再上 nginx（444 静默断连）+ fail2ban + Anubis（PoW 质询，反 AI 爬虫利器）+ Nepenthes（tarpit 完全体）。
5. **历史遗留**：`_config.yml` 的 hexo `deploy:` 用的是 `git@github.com` SSH 地址，机器上没配 SSH key，这条路是断的；发布统一走 GitHub Actions（推 `main` 即可），建议把这段 deploy 配置删掉避免混淆。

## 五、日常运维

```bash
# 重新生成 tarpit（换个 seed，内容全变，防止被爬虫去重）
python tools/gen_tarpit.py --seed 20261009

# 调规模（分片数 / 每片出链数）
python tools/gen_tarpit.py --shards 200 --links 32

# 本地构建验证
npx hexo clean && npx hexo generate
# 检查 public/tarpit/ 存在、public/sitemap.xml 里没有 tarpit

# 发布：GitHub Desktop 里 commit + push main 即可，Actions 自动部署

# 线上验证（部署完等 2-3 分钟）
curl -s https://afogsheep.github.io/robots.txt | head -5
curl -s -o /dev/null -w "%{http_code}" https://afogsheep.github.io/tarpit/index.html   # 200
curl -s -o /dev/null -w "%{http_code}" https://afogsheep.github.io/wp-admin/           # 200
```

**注意**：GitHub Pages 软性限额约 100GB/月。当前 tarpit 共 400KB，普通爬虫随便吃都到不了线；如果哪天想放大到几千片，先看看 Cloudflare 那条路。

## 六、千万别做的事

- 别把毒文本/隐藏链接放进正常文章页（cloaking，Google 会惩罚真内容）。
- 别在毒饵里写任何"看起来像真的"凭据——要么明显占位符，要么换成金丝雀 token。
- 别指望 robots.txt 挡住任何人，它只是牌子。
