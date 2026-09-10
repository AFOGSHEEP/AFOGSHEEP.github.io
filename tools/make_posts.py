#!/usr/bin/env python3
"""把 Reddit灵异故事/ 的中英对照 md 转换为 Hexo 博客文章(归入「阅读」分类)。
规矩:系列/多部作品合并为一篇文章发布。
"""
import pathlib, re

SRC = pathlib.Path("/Users/gwen/.dsh/claudecode/Reddit灵异故事")
DST = pathlib.Path("/Users/gwen/Downloads/AFOGSHEEP.github.io-main/source/_posts")
BASE = "/2026/09/08/"

def read_story(name):
    """返回 (原帖信息行列表, 英文正文, 中文译文, 译注)"""
    text = (SRC / name).read_text(encoding="utf-8")
    m = (re.search(r"## 英文原版\(全文\)\n(.*?)\n---\n\n## 中文译文", text, re.S),
         re.search(r"## 中文译文\n(.*?)\n---\n\n## 译注", text, re.S),
         re.search(r"## 译注\n(.*)$", text, re.S))
    info = re.findall(r"^> (.+)$", text.split("---")[0], re.M)
    return info, m[0].group(1).strip(), m[1].group(1).strip(), m[2].group(1).strip()

def standalone(src_name, dst_name, title, hhmm, tags, cover_n):
    text = (SRC / src_name).read_text(encoding="utf-8")
    body = "\n".join(text.split("\n")[1:]).lstrip("\n")
    fm = (f"---\ntitle: {title}\ndate: 2026-09-08 {hhmm}:00\n"
          f"cover: /images/stories/cover-{cover_n}.jpg\n"
          "categories:\n  - 阅读\ntags:\n" +
          "".join(f"  - {t}\n" for t in tags) + "---\n\n")
    (DST / dst_name).write_text(fm + body, encoding="utf-8")
    print(f"OK {dst_name} (cover-{cover_n})")

def series():
    """搜救官系列 5 部合并为一篇"""
    parts_meta = [  # (源文件, Part号, 日期, 得分, 链接ID)
        ("02_森林里的楼梯_搜救官系列Part1_中英对照.md", 1, "2015-08-26", 7091, "3iex1h"),
        ("04_搜救官系列Part2_中英对照.md", 2, "2015-08-27", 5403, "3ijnt6"),
        ("05_搜救官系列Part3_中英对照.md", 3, "2015-08-28", 5207, "3iocju"),
        ("06_搜救官系列Part4_中英对照.md", 4, "2015-09-02", 6575, "3jadum"),
        ("07_搜救官系列Part5_中英对照.md", 5, "2015-09-10", 5652, "3kd90k"),
    ]
    slug = "https://www.reddit.com/r/nosleep/comments/{id}/im_a_search_and_rescue_officer_for_the_us_forest/"
    header = (
        "> **系列信息** r/nosleep · 作者 u/searchandrescuewoods · 2015-08-26 至 09-10 连更五部,累计得分 28,936\n"
        "> **五部原帖**\n" +
        "".join(f"> Part {n}({d}):{slug.format(id=i)}\n" for _, n, d, _, i in parts_meta) +
        "> 「森林里凭空立着的楼梯」由此成为欧美网络最流行的都市传说之一。英文原文经 Arctic Shift 从原帖逐字提取;作者其后另有续作(Part 6+)。\n\n---\n\n"
    )
    chunks = []
    for src, n, d, score, _ in parts_meta:
        info, en, zh, notes = read_story(src)
        zh = zh.replace("想看后续告诉我,原帖全系列 5 部我都已经存档,随时可以继续翻译。", "")
        zh = re.sub(r"\n{3,}", "\n\n", zh).strip()
        notes = re.sub(r"想看后续告诉我.*$", "", notes, flags=re.S).strip()
        chunks.append(
            f"## Part {n} · {d} 发帖 · 得分 {score}\n\n"
            f"### 英文原版\n\n{en}\n\n---\n\n"
            f"### 中文译文\n\n{zh}\n\n---\n\n"
            f"### 译注\n\n{notes}\n\n---\n\n")
    fm = ("---\ntitle: 森林里的楼梯 · 搜救官系列(全五部)\ndate: 2026-09-08 16:00:00\n"
          "cover: /images/stories/cover-3.jpg\n"
          "categories:\n  - 阅读\ntags:\n  - Reddit\n  - 翻译\n  - 恐怖\n  - 搜救官系列\n---\n\n")
    out = DST / "阅读_森林里的楼梯_搜救官系列.md"
    out.write_text(fm + header + "".join(chunks), encoding="utf-8")
    print(f"OK 阅读_森林里的楼梯_搜救官系列.md (全五部合并, cover-3, {len(fm+header+''.join(chunks))} chars)")
    # 删除旧的拆分版
    for i in range(1, 6):
        p = DST / f"阅读_森林里的楼梯_搜救官系列Part{i}.md"
        if p.exists():
            p.unlink(); print(f"DEL {p.name}")

if __name__ == "__main__":
    standalone("01_微笑男_The_Smiling_Man_中英对照.md", "阅读_微笑男.md",
               "微笑男 · The Smiling Man", "10:00", ["Reddit", "翻译", "都市传说"], 1)
    standalone("03_无尽之屋_NoEnd_House_中英对照.md", "阅读_无尽之屋_NoEnd_House.md",
               "无尽之屋 · NoEnd House", "11:00", ["Reddit", "翻译", "恐怖"], 2)
    series()
