# -*- coding: utf-8 -*-
"""
分析微信开发者工具屏幕截图：检测高饱和彩色像素块（emoji 字体特征）。
emoji 通常渲染为大面积高饱和纯色（红/黄/蓝/绿），而本项目 UI 主色为
品牌绿 + 中性色，SVG 图标为单色 currentColor。此脚本统计高饱和像素
占比与分布，作为 emoji 残留的启发式证据。
"""
import sys
from collections import Counter

from PIL import Image


def analyze(path):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    pixels = img.load()

    high_sat = 0
    total = w * h
    colors = Counter()
    # 采样步长 2 加速
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = pixels[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            if mx < 40:
                continue  # 纯黑/深色跳过
            sat = (mx - mn) / 255.0
            # 高饱和：饱和度 > 0.55 且明度 > 0.4
            if sat > 0.55 and mx > 100:
                high_sat += 1
                # 量化颜色桶
                bucket = (r // 64 * 64, g // 64 * 64, b // 64 * 64)
                colors[bucket] += 1

    ratio = high_sat / (total / 4)
    print(f"image: {w}x{h}")
    print(f"high-saturation pixel ratio (sampled): {ratio * 100:.3f}%")
    print("top color buckets:", colors.most_common(8))
    return ratio


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "verification_logs/final-20260805/screen-1.png"
    analyze(path)
