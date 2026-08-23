"""
智能拆分 ChatGPT 合成PNG图标素材图为独立PNG图标 v2
改进点：
1. 连通区域分析 + 智能合并（基于行列间距检测）
2. 自动检测背景色，处理 RGB 和 RGBA 两种模式
3. 按行→列排序，命名清晰
4. 输出透明背景 + 3px安全边距的紧凑裁剪PNG
5. 过滤文本标签（宽度远大于高度的窄条），只保留图标级元素

使用方法: python tools\split_chatgpt_icons_v2.py
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

BASE_DIR = r'd:\6\恋爱小程序'

# ============ 配置 ============
PADDING = 3           # 安全边距(像素)
MIN_ICON_SIZE = 20    # 图标最小边长(像素)
MAX_ICON_SIZE = 500   # 图标最大边长(像素)
BG_THRESHOLD = 230    # 背景色阈值 (>此值视为背景)
MERGE_X_GAP = 15      # 水平合并间距
MERGE_Y_GAP = 8       # 垂直合并间距
ROW_GAP_RATIO = 0.5   # 行间距判定比例(相对于平均行高)

# 需要拆分的ChatGPT合成图片 (排除已有精修版的首页)
TARGET_IMAGES = [
    (r'素材\登录页\ChatGPT Image 2026年8月17日 23_44_12.png', '登录页'),
    (r'素材\匹配\最终\ChatGPT Image 2026年8月17日 23_41_34.png', '匹配'),
    (r'素材\消息\最终\ChatGPT Image 2026年8月17日 23_43_21.png', '消息'),
    (r'素材\主页\最终\个人\ChatGPT Image 2026年8月17日 23_32_20.png', '主页_个人'),
    (r'素材\主页\最终\他人\ChatGPT Image 2026年8月17日 23_33_29 (1).png', '主页_他人1'),
    (r'素材\主页\最终\他人\ChatGPT Image 2026年8月17日 23_33_29 (2).png', '主页_他人2'),
    (r'素材\附近\附近首页\ChatGPT Image 2026年8月17日 23_59_47.png', '附近_首页'),
    (r'素材\附近\兴趣圈\ChatGPT Image 2026年8月17日 23_56_00.png', '附近_兴趣圈'),
    (r'素材\附近\圈子具体\ChatGPT Image 2026年8月18日 22_43_34.png', '附近_圈子'),
    (r'素材\附近\帖子\ChatGPT Image 2026年8月18日 22_51_12.png', '附近_帖子'),
    (r'素材\附近\校园圈\ChatGPT Image 2026年8月18日 22_49_45.png', '附近_校园圈'),
    (r'素材\参考图\ChatGPT Image 2026年8月15日 18_05_18.png', '参考_品牌系统'),
    (r'素材\参考图\ChatGPT Image 2026年8月15日 18_11_55.png', '参考_登录流程'),
    (r'素材\参考图\ChatGPT Image 2026年8月15日 18_13_31.png', '参考_登录设计'),
    (r'素材\参考图\ChatGPT Image 2026年8月15日 20_48_15.png', '参考_附近探索'),
    (r'素材\参考图\ChatGPT Image 2026年8月15日 20_52_25.png', '参考_匹配中心'),
    (r'素材\参考图\ChatGPT Image 2026年8月15日 21_11_18.png', '参考_消息界面'),
    (r'素材\参考图\ChatGPT Image 2026年8月15日 21_13_24.png', '参考_消息设计'),
    (r'素材\参考图\ChatGPT Image 2026年8月15日 21_21_43.png', '参考_个人主页'),
    (r'素材\参考图\ChatGPT Image 2026年8月15日 21_44_09.png', '参考_主页设计'),
]


def detect_background(img_arr):
    """从图片边角采样检测背景色"""
    h, w = img_arr.shape[:2]
    # 采样四角各5x5区域
    corners = []
    for y, x in [(3, 3), (3, w-4), (h-4, 3), (h-4, w-4)]:
        patch = img_arr[max(0,y-2):y+3, max(0,x-2):x+3, :3]
        corners.append(patch.reshape(-1, 3).mean(axis=0))
    bg_color = np.mean(corners, axis=0).astype(int)
    return bg_color


def create_foreground_mask(img_arr, bg_threshold=BG_THRESHOLD):
    """创建前景mask：非背景区域为True，支持RGBA"""
    rgb = img_arr[:, :, :3]

    if img_arr.shape[2] == 4:
        alpha = img_arr[:, :, 3]
        # RGBA模式: 用alpha通道判断前景
        # alpha > 128 = 不透明前景, alpha < 30 = 完全透明背景
        # 中间alpha的像素按RGB与背景的差异判断
        opaque = alpha > 128
        transparent = alpha < 30
        # 对不透明像素用RGB距离判断
        bg = detect_background(img_arr)
        diff = np.sqrt(np.sum((rgb.astype(float) - bg.astype(float)) ** 2, axis=2))
        rgb_fg = diff > 30
        mask = opaque & rgb_fg
        return mask
    else:
        # RGB模式: 用背景色距离判断
        bg = detect_background(img_arr)
        diff = np.sqrt(np.sum((rgb.astype(float) - bg.astype(float)) ** 2, axis=2))
        mask = diff > (255 - bg_threshold)
        return mask


def dilate_mask(mask, iterations=3):
    """膨胀mask，连接相邻的前景像素"""
    from scipy import ndimage
    struct = ndimage.generate_binary_structure(2, 1)  # 4-连通，更保守
    return ndimage.binary_dilation(mask, structure=struct, iterations=iterations)


def find_connected_regions(mask):
    """使用scipy查找连通区域"""
    from scipy import ndimage
    labeled, num_features = ndimage.label(mask)
    regions = []
    for i in range(1, num_features + 1):
        ys, xs = np.where(labeled == i)
        x_min, x_max = int(xs.min()), int(xs.max())
        y_min, y_max = int(ys.min()), int(ys.max())
        w = x_max - x_min + 1
        h = y_max - y_min + 1
        area = len(xs)
        regions.append({
            'x': x_min, 'y': y_min, 'w': w, 'h': h,
            'area': area, 'center_x': (x_min + x_max) / 2,
            'center_y': (y_min + y_max) / 2
        })
    return regions


def filter_regions(regions, img_w, img_h):
    """过滤太小/太大的区域，以及文字标签"""
    filtered = []
    img_area = img_w * img_h
    for r in regions:
        # 跳过太小（面积 < MIN_ICON_SIZE^2）
        if r['w'] < MIN_ICON_SIZE or r['h'] < MIN_ICON_SIZE:
            continue
        # 跳过太大（占图片面积超过20%）
        if r['w'] * r['h'] > img_area * 0.20:
            continue
        # 跳过明显的文字标签（宽高比 > 4:1 且高度很小）
        aspect = r['w'] / max(r['h'], 1)
        if aspect > 4 and r['h'] < 20:
            continue
        filtered.append(r)
    return filtered
def filter_by_pixel_density(mask, regions, min_density=0.03):
    """过滤像素密度过低的区域（可能是噪点或标签文字）"""
    filtered = []
    for r in regions:
        x1, y1, x2, y2 = r['x'], r['y'], r['x']+r['w'], r['y']+r['h']
        region_mask = mask[y1:y2, x1:x2]
        density = region_mask.sum() / max(region_mask.size, 1)
        if density >= min_density:
            filtered.append(r)
    return filtered



def merge_overlapping(regions, x_gap=MERGE_X_GAP, y_gap=MERGE_Y_GAP):
    """合并重叠或非常接近的区域"""
    if not regions:
        return regions

    regions = sorted(regions, key=lambda r: (r['y'], r['x']))
    merged = True
    while merged:
        merged = False
        new_regions = []
        used = set()
        for i in range(len(regions)):
            if i in used:
                continue
            r = regions[i].copy()
            for j in range(i + 1, len(regions)):
                if j in used:
                    continue
                r2 = regions[j]
                # 检查水平重叠/接近
                x_overlap = r['x'] <= r2['x'] + r2['w'] + x_gap and r2['x'] <= r['x'] + r['w'] + x_gap
                y_overlap = r['y'] <= r2['y'] + r2['h'] + y_gap and r2['y'] <= r['y'] + r['h'] + y_gap
                if x_overlap and y_overlap:
                    # 合并
                    nx = min(r['x'], r2['x'])
                    ny = min(r['y'], r2['y'])
                    nw = max(r['x'] + r['w'], r2['x'] + r2['w']) - nx
                    nh = max(r['y'] + r['h'], r2['y'] + r2['h']) - ny
                    r = {'x': nx, 'y': ny, 'w': nw, 'h': nh,
                         'area': r['area'] + r2['area'],
                         'center_x': (nx + nw / 2),
                         'center_y': (ny + nh / 2)}
                    used.add(j)
                    merged = True
            new_regions.append(r)
            used.add(i)
        regions = new_regions
    return regions


def group_into_rows(regions):
    """将区域按行分组（基于y坐标聚类）"""
    if not regions:
        return []

    regions = sorted(regions, key=lambda r: r['y'])
    
    # 计算平均高度来确定行间距阈值
    avg_h = np.mean([r['h'] for r in regions])
    row_threshold = avg_h * ROW_GAP_RATIO

    rows = []
    current_row = [regions[0]]
    current_y = regions[0]['y']

    for r in regions[1:]:
        if abs(r['y'] - current_y) < row_threshold:
            current_row.append(r)
        else:
            rows.append(sorted(current_row, key=lambda r: r['x']))
            current_row = [r]
            current_y = r['y']
    rows.append(sorted(current_row, key=lambda r: r['x']))
    return rows


def save_icon(img, bbox, output_path, padding=PADDING):
    """裁剪并保存单个图标为透明背景PNG"""
    x, y, w, h = bbox
    x1 = max(0, x - padding)
    y1 = max(0, y - padding)
    x2 = min(img.width, x + w + padding)
    y2 = min(img.height, y + h + padding)

    crop = img.crop((x1, y1, x2, y2))

    # 创建透明背景版本
    if crop.mode != 'RGBA':
        crop = crop.convert('RGBA')

    # 检测背景色并设为透明
    arr = np.array(crop)
    bg_color = detect_background(arr)
    rgb = arr[:, :, :3].astype(float)
    diff = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=2))
    # 背景像素设为完全透明
    arr[diff < 20, 3] = 0

    result = Image.fromarray(arr, 'RGBA')
    result.save(output_path, 'PNG')
    return result


def split_image(img_path, output_dir, page_name):
    """拆分单张图片"""
    print(f"\n{'='*60}")
    print(f"处理: {page_name}")
    print(f"文件: {os.path.relpath(img_path, BASE_DIR)}")

    img = Image.open(img_path)
    img_arr = np.array(img)
    h, w = img_arr.shape[:2]
    print(f"尺寸: {w}x{h}, 模式: {img.mode}")

    # Step 1: 创建前景mask
    mask = create_foreground_mask(img_arr)
    fg_pct = 100 * mask.sum() / mask.size
    print(f"前景像素占比: {fg_pct:.1f}%")

    # Step 2: 膨胀连接相邻像素
    # 根据图片大小自适应膨胀次数
    dilate_iters = max(1, min(3, int(w / 500)))
    mask_dilated = dilate_mask(mask, iterations=dilate_iters)
    print(f"膨胀次数: {dilate_iters}")

    # Step 3: 查找连通区域
    regions = find_connected_regions(mask_dilated)
    print(f"原始区域数: {len(regions)}")

    # Step 4: 过滤
    regions = filter_regions(regions, w, h)
    print(f"过滤后: {len(regions)}")

    # Step 4.5: 基于像素密度过滤
    regions = filter_by_pixel_density(mask_dilated, regions)
    print(f"密度过滤后: {len(regions)}")

    # Step 5: 合并相近区域
    regions = merge_overlapping(regions)
    print(f"合并后: {len(regions)}")

    # Step 6: 按行列分组
    rows = group_into_rows(regions)
    print(f"分为 {len(rows)} 行")

    # Step 7: 保存
    os.makedirs(output_dir, exist_ok=True)
    total = 0
    for row_idx, row in enumerate(rows, 1):
        for col_idx, r in enumerate(row, 1):
            fname = f"{page_name}_r{row_idx:02d}_c{col_idx:02d}.png"
            out_path = os.path.join(output_dir, fname)
            save_icon(img, (r['x'], r['y'], r['w'], r['h']), out_path)
            total += 1

    print(f"已保存 {total} 个图标到 {os.path.relpath(output_dir, BASE_DIR)}")
    return total


def main():
    total_icons = 0
    total_images = 0

    for rel_path, name in TARGET_IMAGES:
        img_path = os.path.join(BASE_DIR, rel_path)
        if not os.path.exists(img_path):
            print(f"[跳过] 文件不存在: {rel_path}")
            continue

        # 输出到同级"拆分图标"文件夹
        img_dir = os.path.dirname(img_path)
        output_dir = os.path.join(img_dir, f"拆分图标_{name}")

        count = split_image(img_path, output_dir, name)
        total_icons += count
        total_images += 1

    print(f"\n{'='*60}")
    print(f"完成! 共处理 {total_images} 张图片, 拆分出 {total_icons} 个独立图标")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
