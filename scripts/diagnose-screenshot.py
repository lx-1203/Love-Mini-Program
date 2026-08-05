"""诊断截图：寻觅页卡片可见性 + 黄色圆圈检测（收尾轮）"""
import sys
from PIL import Image

def analyze(path):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    # 1) 卡片区白色占比（白色圆角卡片）
    white = 0
    total = 0
    for y in range(180, min(650, h), 6):
        for x in range(0, w, 6):
            r, g, b = img.getpixel((x, y))
            total += 1
            if r > 235 and g > 235 and b > 235:
                white += 1
    # 2) 黄色圆圈检测（cream blob 255,212,121 系）
    yellow = 0
    for y in range(0, h, 6):
        for x in range(0, w, 6):
            r, g, b = img.getpixel((x, y))
            if r > 230 and 190 < g < 235 and 90 < b < 160:
                yellow += 1
    print(f"image: {w}x{h}")
    print(f"card-area white ratio: {white/total:.1%}")
    print(f"yellow pixel ratio: {yellow/((w//6)*(h//6)):.2%}")

if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(f"--- {p} ---")
        analyze(p)
