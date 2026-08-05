"""分析微信开发者工具窗口截图：输出尺寸、主色分布、是否包含大量白色（渲染页）或暗色（错误页）。"""
from PIL import Image

img = Image.open(r"D:\6\恋爱小程序\capture.png").convert("RGB")
w, h = img.size
print(f"size: {w}x{h}")

# 缩小采样
small = img.resize((w // 4, h // 4))
pixels = list(small.getdata())
total = len(pixels)

# 颜色分类
white = sum(1 for p in pixels if p[0] > 240 and p[1] > 240 and p[2] > 240)
dark = sum(1 for p in pixels if p[0] < 60 and p[1] < 60 and p[2] < 60)
green = sum(1 for p in pixels if p[1] > 150 and p[0] < 150 and p[2] < 150)
pink = sum(1 for p in pixels if p[0] > 200 and p[1] < 150 and p[2] > 150)

print(f"white: {white/total:.1%}")
print(f"dark: {dark/total:.1%}")
print(f"green: {green/total:.1%}")
print(f"pink: {pink/total:.1%}")

# 采样几个点查看颜色（左上/中部/右下）
for name, x, y in [("TL", w // 8, h // 8), ("C", w // 2, h // 2), ("BR", w * 3 // 4, h * 3 // 4), ("T", w // 2, h // 8)]:
    print(f"{name}: {img.getpixel((x, y))}")
