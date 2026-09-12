# -*- coding: utf-8 -*-
"""
repair-circle-covers.py — 修复被"白边合成图"污染的兴趣圈封面资产（2026-09-12）

背景（实机验收发现）：
  static-local-backup/assets-images/covers/ 下的 6 张圈封面
  （circle-photo/travel/music/food/sky/sports.png）实际是 185×195 的
  "白色画布 + 右下角小图"合成缩略图。real 模式小程序经后端
  /api/v1/media/app-assets/** 加载这批资产后，<image mode="aspectFill">
  满铺的是整张带白边的位图 → 热门兴趣圈卡片四周露白（用户报告：
  "图片没有正常的显示占满框"）。

修复方式：
  程序化定位合成图中的非白色内容区（bbox），裁出内层真实照片，
  居中裁方后 LANCZOS 放大到 750×750，覆盖写回：
    1) static-local-backup/assets-images/covers/   （资产源，prepare-static 与
       apps/api/scripts/seed-app-assets.ps1 的种子来源）
    2) apps/api/uploads/app-assets/assets/images/covers/  （后端 real 模式实际
       托管目录，逐请求读盘，覆盖即生效，无需重启）
    3) apps/client/dist/build/mp-weixin/static/assets/images/covers/ （当前构建产物）

用法：
  python scripts/repair-circle-covers.py
依赖：
  pip install pillow
"""
from PIL import Image
import os

NAMES = [
    "circle-photo", "circle-travel", "circle-music",
    "circle-food", "circle-sky", "circle-sports",
]
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP = os.path.join(REPO, "apps", "client", "static-local-backup", "assets-images", "covers")
TARGET_DIRS = [
    BACKUP,
    os.path.join(REPO, "apps", "api", "uploads", "app-assets", "assets", "images", "covers"),
    os.path.join(REPO, "apps", "client", "dist", "build", "mp-weixin", "static", "assets", "images", "covers"),
]


def repair(path: str):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r < 242 or g < 242 or b < 242:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if maxx < 0:
        return None
    minx = max(0, minx - 1)
    miny = max(0, miny - 1)
    maxx = min(w - 1, maxx + 1)
    maxy = min(h - 1, maxy + 1)
    crop = im.crop((minx, miny, maxx + 1, maxy + 1))
    cw, ch = crop.size
    side = min(cw, ch)
    left = (cw - side) // 2
    top = (ch - side) // 2
    sq = crop.crop((left, top, left + side, top + side))
    return sq.resize((750, 750), Image.LANCZOS)


def main():
    for n in NAMES:
        src = os.path.join(BACKUP, n + ".png")
        if not os.path.exists(src):
            print(f"[skip] {n}: source not found")
            continue
        out = repair(src)
        if out is None:
            print(f"[skip] {n}: no content bbox")
            continue
        out.save(src, optimize=True)
        for d in TARGET_DIRS:
            p = os.path.join(d, n + ".png")
            if os.path.exists(p):
                out.save(p, optimize=True)
        print(f"[ok] {n}: -> 750x750 (backup + uploads + dist)")
    print("done")


if __name__ == "__main__":
    main()
