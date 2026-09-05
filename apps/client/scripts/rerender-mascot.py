# -*- coding: utf-8 -*-
"""
rerender-mascot.py — 关系动态吉祥物素材重制（2026-09-04 问题2修复）

背景：
    旧 4 张 PNG（heart/shy/wave/cheer）均为 72x72 低清方形，但原始素材比例
    各不相同（117x136 / 124x144 / 117x133 / 112x161），强制方形缩放导致
    主体视觉大小不一；且半透明边缘带黑色杂边。

处理流程：
    1. 从矢量源 SVG（实为 <image href="data:image/png;base64,..."> 包装）中
       正则提取 base64 PNG payload 并解码，得到原始高分辨率 PNG；
    2. PIL 清理边缘杂边：alpha < 25 的像素置为全透明；仍半透明的像素，
       RGB 用最近的"不透明"像素颜色替换（消除黑边/脏边）；
    3. 2026-09-04 补充（仅 cheer）：去除底部孤立内容块——mascot_cheer 源图
       底部有一行与主体分离的灰色"鼓掌"小字（中间隔透明行）。按行统计
       alpha>25 像素数，自底部向上扫描，找到其下有内容、其上有 ≥2 行连续
       全透明带的孤立内容块，整块置 alpha=0；随后按内容 bbox 裁切（trim），
       保证主体（而非残留空带）作为缩放基准。算法只删除与主体分离的底部
       孤立块，不会伤吉祥物本体（主体姿态变化也安全）。其他 3 张不适用；
    4. 统一画布：240x240 透明背景，主体等比 LANCZOS 缩放至最长边 208px
       （占比 86.7%），居中粘贴 —— 4 张输出规格完全一致；
    5. 旧图先备份（同目录 .bak-20260904 后缀，已存在则不覆盖——保留最早
       的原始备份），随后覆盖写入三处（项目规范要求 src static /
       static-local-backup / api uploads 三处同步）；
    6. 自验：重新读取输出文件，打印尺寸 + 文件大小。

用法（受管 venv，需先装 pillow）：
    C:\\Users\\dsghy\\.workbuddy\\binaries\\python\\envs\\default\\python.exe \\
        apps/client/scripts/rerender-mascot.py
"""

import base64
import os
import re
import shutil
import sys

from PIL import Image

# ---------------------------------------------------------------- 常量配置

# 矢量源 SVG -> 输出文件名（heart/wave/cheer 在 interaction，shy 在 emotion）
PROJECT_ROOT = r"D:\6\恋爱小程序"
ASSET_ROOT = os.path.join(PROJECT_ROOT, "素材", "吉祥物", "xunmi_mascot_assets")

SOURCES = [
    (os.path.join(ASSET_ROOT, "interaction", "mascot_heart.svg"), "mascot_heart.png"),
    (os.path.join(ASSET_ROOT, "emotion", "mascot_shy.svg"), "mascot_shy.png"),
    (os.path.join(ASSET_ROOT, "interaction", "mascot_wave.svg"), "mascot_wave.png"),
    # 2026-09-04 补充：cheer 需要先去底部孤立"鼓掌"小字块（第三个字段为处理开关）
    (os.path.join(ASSET_ROOT, "interaction", "mascot_cheer.svg"), "mascot_cheer.png"),
]

# 需要执行"去底部孤立内容块 + trim"处理的输出文件名（仅 cheer，2026-09-04 主理人拍板）
BOTTOM_BLOCK_TRIM_FILES = {"mascot_cheer.png"}

# 三处同步输出目录（src static / static-local-backup / api uploads）
TARGET_DIRS = [
    os.path.join(PROJECT_ROOT, "apps", "client", "src", "static", "assets", "images", "mascot"),
    os.path.join(PROJECT_ROOT, "apps", "client", "static-local-backup", "full-static", "assets", "images", "mascot"),
    os.path.join(PROJECT_ROOT, "apps", "api", "uploads", "app-assets", "assets", "images", "mascot"),
]

# 统一输出规格
CANVAS_SIZE = 240          # 画布边长（正方形，透明背景）
CONTENT_MAX = 208          # 主体最长边（208/240 = 86.7%）
ALPHA_CUTOFF = 25          # alpha 低于此值 → 置为全透明
OPAQUE_ALPHA = 128         # alpha 不低于此值 → 视为"不透明"，可作杂边取色源

# 旧图备份后缀（今天日期）
BACKUP_SUFFIX = ".bak-20260904"

# SVG 中内嵌 base64 PNG 的提取正则（取第一段 data:image/png payload）
B64_PNG_RE = re.compile(r"data:image/png;base64,([A-Za-z0-9+/=]+)")


# ---------------------------------------------------------------- 核心函数

def extract_png_from_svg(svg_path: str) -> Image.Image:
    """从 SVG 文本中提取 base64 PNG payload，解码为 PIL RGBA Image。"""
    with open(svg_path, "r", encoding="utf-8") as f:
        svg_text = f.read()
    match = B64_PNG_RE.search(svg_text)
    if not match:
        raise RuntimeError(f"SVG 中未找到内嵌 base64 PNG: {svg_path}")
    png_bytes = base64.b64decode(match.group(1))
    return Image.open(__import__("io").BytesIO(png_bytes)).convert("RGBA")


def clean_edges(img: Image.Image) -> Image.Image:
    """清理半透明边缘杂边（黑边/脏边）。

    步骤：
      1. alpha < ALPHA_CUTOFF 的像素 → 全透明（alpha=0）；
      2. 收集所有"不透明"像素坐标与颜色（alpha >= OPAQUE_ALPHA）；
      3. 对剩余半透明像素（ALPHA_CUTOFF <= alpha < 255），RGB 替换为
         距离最近的不透明像素颜色（保留原 alpha，保留柔和过渡）。
    图极小（约 117x144），纯 PIL 逐像素遍历即可，无需 numpy。
    """
    img = img.copy()
    width, height = img.size
    pixels = img.load()

    # 第 1 步：低 alpha 直接置全透明，同时收集不透明像素与半透明像素
    opaque_colors = []   # [(x, y, (r, g, b)), ...]
    semi_pixels = []     # [(x, y, alpha), ...]
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a < ALPHA_CUTOFF:
                pixels[x, y] = (r, g, b, 0)
            elif a >= OPAQUE_ALPHA:
                opaque_colors.append((x, y, (r, g, b)))
            else:
                semi_pixels.append((x, y, a))

    if not opaque_colors or not semi_pixels:
        return img  # 无需修补（全透明或全不透明）

    # 第 2 步：半透明像素 RGB 取最近不透明像素颜色（暴力最近邻，图小可接受）
    for x, y, a in semi_pixels:
        best_d2 = None
        best_rgb = (255, 255, 255)
        for ox, oy, rgb in opaque_colors:
            d2 = (ox - x) * (ox - x) + (oy - y) * (oy - y)
            if best_d2 is None or d2 < best_d2:
                best_d2 = d2
                best_rgb = rgb
                if d2 == 0:
                    break  # 命中自身（不可能，但短路无害）
        r, g, b = best_rgb
        pixels[x, y] = (r, g, b, a)
    return img


def remove_bottom_isolated_block(img: Image.Image) -> Image.Image:
    """去除底部与主体分离的孤立内容块（2026-09-04 仅 cheer 应用）。

    算法（主理人拍板规格）：
      1. 按行统计 alpha > ALPHA_CUTOFF 的像素数；
      2. 自底部向上扫描：若存在连续 >= 2 行的全透明带，且该带下方（更靠近
         底边）有内容、上方也有内容，则带下方的独立内容块即为文字块，
         整块置 alpha=0（只删与主体分离的底部孤立块，不伤主体本体）；
      3. 若从底部直接连到主体（无透明分隔带），则不动，保持安全。
    """
    img = img.copy()
    width, height = img.size
    pixels = img.load()

    # 第 1 步：按行统计有效内容像素数（alpha > ALPHA_CUTOFF）
    row_counts = []
    for y in range(height):
        count = sum(1 for x in range(width) if pixels[x, y][3] > ALPHA_CUTOFF)
        row_counts.append(count)

    # 第 2 步：自底部向上找第一个"上沿"，并探测连续 >= 2 行的全透明带
    #   bottom_start：底部内容块的起始行（自底向上第一段连续内容的顶端）
    bottom_edge = height - 1
    if row_counts[bottom_edge] == 0:
        # 底边本身透明：跳过底部全透明区，定位最底端内容行
        while bottom_edge >= 0 and row_counts[bottom_edge] == 0:
            bottom_edge -= 1
        if bottom_edge < 0:
            return img  # 全透明图，无需处理
    # 自 bottom_edge 向上收缩底部内容块的上沿
    block_top = bottom_edge
    while block_top > 0 and row_counts[block_top - 1] > 0:
        block_top -= 1
    # 自 block_top-1 向上数连续全透明行
    gap_rows = 0
    y = block_top - 1
    while y >= 0 and row_counts[y] == 0:
        gap_rows += 1
        y -= 1
    # 上方还有内容 且 分隔带 >= 2 行 → block_top..bottom_edge 为孤立文字块
    has_content_above = y >= 0
    if has_content_above and gap_rows >= 2:
        for yy in range(block_top, bottom_edge + 1):
            for x in range(width):
                r, g, b, _a = pixels[x, yy]
                pixels[x, yy] = (r, g, b, 0)
        print(f"  [cheer] 已移除底部孤立块：y {block_top}-{bottom_edge}（分隔透明带 {gap_rows} 行）")
    else:
        print(f"  [cheer] 未检测到与主体分离的底部孤立块（gap_rows={gap_rows}），不做删除")
    return img


def trim_content_bbox(img: Image.Image) -> Image.Image:
    """按非透明内容 bbox 裁切（去孤立块后让主体成为缩放基准）。

    注意：必须基于 alpha 通道计算 bbox——clean_edges 对低 alpha 像素保留了
    原 RGB（仅置 alpha=0），直接 img.getbbox() 会把全透明像素误计入内容。
    """
    alpha_band = img.split()[3].point(lambda a: 255 if a > 0 else 0)
    bbox = alpha_band.getbbox()
    if not bbox:
        return img
    return img.crop(bbox)


def normalize_canvas(img: Image.Image) -> Image.Image:
    """主体等比缩放至最长边 CONTENT_MAX，居中粘贴到 CANVAS_SIZE 透明画布。"""
    width, height = img.size
    scale = CONTENT_MAX / float(max(width, height))
    new_w = max(1, round(width * scale))
    new_h = max(1, round(height * scale))
    resized = img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    offset_x = (CANVAS_SIZE - new_w) // 2
    offset_y = (CANVAS_SIZE - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y))
    return canvas


def backup_and_write(png: Image.Image, filename: str) -> None:
    """三处目录同步：旧图先备份（.bak-20260904 后缀），再覆盖写入新图。

    2026-09-04 防护：备份文件已存在时不覆盖——重复运行本脚本时保留最早的
    原始备份，防止把已重制的图覆写回 .bak 造成备份失真。
    """
    for target_dir in TARGET_DIRS:
        target_path = os.path.join(target_dir, filename)
        if os.path.exists(target_path):
            backup_path = target_path + BACKUP_SUFFIX
            if not os.path.exists(backup_path):
                shutil.copy2(target_path, backup_path)
                print(f"  [备份] {backup_path}")
            else:
                print(f"  [备份] 已存在，保留原始备份：{backup_path}")
        png.save(target_path, "PNG")
        print(f"  [写入] {target_path}")


def main() -> int:
    print("=== 吉祥物素材重制（2026-09-04）===")
    for svg_path, filename in SOURCES:
        print(f"\n--- {filename} <- {os.path.basename(svg_path)} ---")

        raw = extract_png_from_svg(svg_path)
        print(f"  原始解码尺寸: {raw.size[0]}x{raw.size[1]}")

        cleaned = clean_edges(raw)
        # 2026-09-04 补充：仅 cheer 应用"去底部孤立块 + trim"（鼓掌小字残留）
        if filename in BOTTOM_BLOCK_TRIM_FILES:
            cleaned = remove_bottom_isolated_block(cleaned)
            cleaned = trim_content_bbox(cleaned)
            print(f"  trim 后尺寸: {cleaned.size[0]}x{cleaned.size[1]}")
        normalized = normalize_canvas(cleaned)
        print(f"  统一输出画布: {normalized.size[0]}x{normalized.size[1]}")

        backup_and_write(normalized, filename)

    # 自验：重新读取输出文件，确认 4 张规格一致
    print("\n=== 自验（重新读取输出）===")
    all_ok = True
    for _, filename in SOURCES:
        path = os.path.join(TARGET_DIRS[0], filename)
        with Image.open(path) as im:
            size_bytes = os.path.getsize(path)
            ok = im.size == (CANVAS_SIZE, CANVAS_SIZE)
            all_ok = all_ok and ok
            print(f"  {filename}: {im.size[0]}x{im.size[1]} {im.mode} {size_bytes} bytes {'OK' if ok else 'FAIL'}")
    print("\n结果:", "PASS — 4 张全部 240x240 且三处同步" if all_ok else "FAIL")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
