# 博客修改日志

## 2026-07-26
- **Anthropic 审美重设计**：暖金色 accent (#D4A853)、奶油底色 (#FEFBF7)、Plus Jakarta Sans 字体、多层柔和阴影、Bento Grid 布局、Unsplash 背景轮播、暗色模式、font switcher 三档切换
- 新文章：LeetCode 24 - 两两交换链表中的节点

## 2026-07-25
- 部署 Fancy Avalanche 主题（暗/亮双模式、终端语录框、打字机签名）
- 添加 Google Search Console 验证、sitemap.xml、robots.txt、.nojekyll

## 2026-05-06
- 添加博客维护手册
- 添加 GitHub Actions 自动部署工作流
- 使用 Hexo 7 + Butterfly 5.5 主题重建博客

## 2026-07-28

### 新增文章
- 转载《小说〈了不起的盖茨比〉到底好在哪里？》——杪秋（知乎），带封面图

### 主题样式
- **正文卡片**：Apple Liquid Glass 风格 —— 浅色 8%/深色 10% 透明度 + 20px blur + saturate + 暖金色光晕
- **标题层级**：h2 → 1.85rem/700 字重/4px 金色左边框，h3 → 1.4rem/650 字重，均 `!important` 防 Tailwind preflight 覆盖
- **h1/h4/p** 同步加 `!important` 保护
- **封面图**：模板改为 `w-full h-auto`（移除 max-h-96 object-cover 裁剪），post_cover helper 自动补全绝对路径

### TOC 目录
- 从文章内横向标签改为左侧 210px sticky 侧栏
- 桌面端竖排显示序号，移动端回退为横向排列
- 玻璃背景与正文卡片统一，金色序号

### 首页
- **打字机签名**：新增两条轮播 ——「心非木石岂无感，吞声踯躅不敢言」「北海虽赊，扶摇可接；东隅已逝，桑榆非晚」
- **终端语录**：新增波德莱尔《腐尸》原文六段、菲茨杰拉德《盖茨比》结尾、斯蒂芬·金《枪侠》开头、《尸体》结尾

### 部署配置
- `_config.yml` deploy repo 从 HTTPS 改为 SSH（`git@github.com:AFOGSHEEP/AFOGSHEEP.github.io.git`）
- 部署分支从 `main` 改为 `gh-pages`（GitHub Pages 实际从 gh-pages 分支服务）
- 安装 `hexo-deployer-git`

### 维护
- 本文件创建，后续修改请在此记录
