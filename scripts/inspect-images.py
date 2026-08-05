"""检查 static/assets/images 下图片的分辨率与体积，定位解码慢的大图"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "apps", "client", "src", "static", "assets", "images")

def main():
    rows = []
    for dirpath, _dirs, files in os.walk(ROOT):
        for f in files:
            if not f.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            p = os.path.join(dirpath, f)
            try:
                img = Image.open(p)
                w, h = img.size
                size = os.path.getsize(p)
                # 解码像素总量（百万像素）
                mp = w * h / 1e6
                rows.append((mp, w, h, size, os.path.relpath(p, ROOT)))
            except Exception as e:
                print(f"SKIP {p}: {e}")
    rows.sort(reverse=True)
    print(f"total {len(rows)} images")
    for mp, w, h, size, rel in rows[:12]:
        print(f"  {mp:.2f}MP {w}x{h} {size//1024}KB {rel}")

if __name__ == "__main__":
    main()
