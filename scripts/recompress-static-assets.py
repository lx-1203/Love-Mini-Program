#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
real 构建主包瘦身：对 static 内的摄影类大图原地重压缩（保持路径与格式不变）。
- JPEG：quality=72 + optimize + progressive（视觉无感，体积 -40~60%）
- PNG（摄影类，无透明需求时仍保留 PNG 但用 optimize；不做格式转换以避免代码改动）
仅处理 >20KB 的文件；幂等（已压过的再压收益趋零但无害）。
"""
import os
import sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apps", "client", "src", "static", "assets")
MIN_BYTES = 20 * 1024
JPEG_QUALITY = 72

def human(n):
    return f"{n/1024:.0f}KB"

def main():
    total_before = 0
    total_after = 0
    for dirpath, _dirnames, filenames in os.walk(ROOT):
        for name in filenames:
            path = os.path.join(dirpath, name)
            ext = os.path.splitext(name)[1].lower()
            if ext not in (".jpg", ".jpeg", ".png"):
                continue
            try:
                size = os.path.getsize(path)
                if size < MIN_BYTES:
                    continue
                img = Image.open(path)
                before = size
                if ext in (".jpg", ".jpeg"):
                    img = img.convert("RGB")
                    img.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
                else:
                    # PNG：量化到 256 色前先判断是否有 alpha；摄影类量化收益大
                    has_alpha = img.mode in ("RGBA", "LA", "P") and "A" in img.getbands() if img.mode != "P" else True
                    if has_alpha:
                        img.save(path, "PNG", optimize=True)
                    else:
                        img = img.convert("RGB").quantize(colors=256, method=Image.MEDIANCUT)
                        img.save(path, "PNG", optimize=True)
                after = os.path.getsize(path)
                total_before += before
                total_after += after
                rel = os.path.relpath(path, ROOT)
                print(f"{human(before)} -> {human(after)}  {rel}")
            except Exception as e:
                print(f"SKIP {name}: {e}", file=sys.stderr)
    print(f"== total {human(total_before)} -> {human(total_after)} (saved {human(total_before - total_after)}) ==")

if __name__ == "__main__":
    main()
