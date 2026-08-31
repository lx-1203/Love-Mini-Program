#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""页面根元素 height:100% → min-height:100%（修复页面无法滚动/背景断层）。
仅处理指定文件中指定根类选择器块内的第一条 height:100%。"""
import io
import sys

TARGETS = [
    ("apps/client/src/subpackages/campus/campus/certification.vue", ".cert-page"),
    ("apps/client/src/subpackages/campus/campus/index.vue", ".campus-page"),
    ("apps/client/src/subpackages/campus/campus/post-topic.vue", ".post-page"),
    ("apps/client/src/subpackages/campus/campus/topic-detail.vue", ".detail-page"),
    ("apps/client/src/subpackages/circles/circles/post-topic.vue", ".post-page"),
    ("apps/client/src/subpackages/circles/circles/topic-detail.vue", ".detail-page"),
    ("apps/client/src/subpackages/circles/circles/topics.vue", ".topics-page"),
    ("apps/client/src/subpackages/market/shop/index.vue", ".shop-page"),
    ("apps/client/src/subpackages/tools/daily-question/index.vue", ".daily-question-page"),
    ("apps/client/src/subpackages/village/village/index.vue", ".village-page"),
    ("apps/client/src/subpackages/village/village/tag-posts.vue", ".tag-posts-page"),
]

def fix(path: str, cls: str) -> str:
    with io.open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    # 定位根类选择器行（style 块内）
    start = None
    for i, ln in enumerate(lines):
        if ln.strip() == (cls + " {"):
            start = i
            break
    if start is None:
        return f"SKIP(未找到 {cls}): {path}"
    # 在选择器块内找第一条 height:100%
    for j in range(start + 1, min(start + 12, len(lines))):
        if lines[j].strip() == "height: 100%;":
            lines[j] = lines[j].replace("height: 100%;", "min-height: 100%;", 1)
            with io.open(path, "w", encoding="utf-8", newline="") as f:
                f.writelines(lines)
            return f"FIXED {cls} @ line {j+1}: {path}"
        if lines[j].strip().endswith("}") :  # 块结束仍未找到
            break
    return f"SKIP(块内无 height:100%): {path}"

for p, c in TARGETS:
    print(fix(p, c))
