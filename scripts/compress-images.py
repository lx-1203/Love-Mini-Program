"""压缩 static/assets/images 下的大图（质量 72，保留尺寸）——收尾轮图片加载优化"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "apps", "client", "src", "static", "assets", "images")
QUALITY = 72
MIN_SIZE = 50 * 1024  # 只压缩 >= 50KB 的图

def main():
    changed = []
    total_saved = 0
    for dirpath, _dirs, files in os.walk(ROOT):
        for f in files:
            if not f.lower().endswith((".jpg", ".jpeg")):
                continue
            p = os.path.join(dirpath, f)
            size = os.path.getsize(p)
            if size < MIN_SIZE:
                continue
            try:
                img = Image.open(p)
                img.load()
            except Exception as e:
                print(f"SKIP {p}: {e}")
                continue
            # 转 RGB（去掉 alpha/模式差异），重存质量 82
            if img.mode != "RGB":
                img = img.convert("RGB")
            tmp = p + ".tmp.jpg"
            img.save(tmp, "JPEG", quality=QUALITY, optimize=True, progressive=True)
            new_size = os.path.getsize(tmp)
            if new_size < size:
                os.replace(tmp, p)
                saved = size - new_size
                total_saved += saved
                changed.append((os.path.relpath(p, ROOT), size, new_size))
            else:
                os.remove(tmp)
    print(f"compressed {len(changed)} files, saved {total_saved/1024:.0f} KB")
    for rel, old, new in changed[:15]:
        print(f"  {rel}: {old//1024}KB -> {new//1024}KB")

if __name__ == "__main__":
    main()
