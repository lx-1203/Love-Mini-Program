"""
自动拆分 ChatGpt 5.6 Luna生成的合成PNG图标素材图为独立PNG图标
使用方法: python tools\split_chatgpt_icons.py
"""
import os
import sys
from PIL import Image
import numpy as np

BASE_DIR = r'd:\6\恋爱小程序'

# 需要拆分的ChatGPT合成图片列表 (相对路径)
TARGET_IMAGES = [
    # 首页 - 已有拆分，跳过
    # r'素材\首页\最终\ChatGPT Image 2026年8月17日 23_31_35.png',
    # 登录页
    r'素材\登录页\ChatGPT Image 2026年8月17日 23_44_12.png',
    # 匹配
    r'素材\匹配\最终\ChatGPT Image 2026年8月17日 23_41_34.png',
    # 消息
    r'素材\消息\最终\ChatGPT Image 2026年8月17日 23_43_21.png',
    # 主页-个人
    r'素材\主页\最终\个人\ChatGPT Image 2026年8月17日 23_32_20.png',
    # 主页-他人
    r'素材\主页\最终\他人\ChatGPT Image 2026年8月17日 23_33_29 (1).png',
    r'素材\主页\最终\他人\ChatGPT Image 2026年8月17日 23_33_29 (2).png',
    # 附近
    r'素材\附近\附近首页\ChatGPT Image 2026年8月17日 23_59_47.png',
    r'素材\附近\兴趣圈\ChatGPT Image 2026年8月17日 23_56_00.png',
    r'素材\附近\圈子具体\ChatGPT Image 2026年8月18日 22_43_34.png',
    r'素材\附近\帖子\ChatGPT Image 2026年8月18日 22_51_12.png',
    r'素材\附近\校园圈\ChatGPT Image 2026年8月18日 22_49_45.png',
    # 参考图 (这些可能是完整设计板，需要判断是否包含可拆分的图标网格)
    r'素材\参考图\ChatGPT Image 2026年8月15日 18_05_18.png',
    r'素材\参考图\ChatGPT Image 2026年8月15日 18_11_55.png',
    r'素材\参考图\ChatGPT Image 2026年8月15日 18_13_31.png',
    r'素材\参考图\ChatGPT Image 2026年8月15日 20_48_15.png',
    r'素材\参考图\ChatGPT Image 2026年8月15日 20_52_25.png',
    r'素材\参考图\ChatGPT Image 2026年8月15日 21_11_18.png',
    r'素材\参考图\ChatGPT Image 2026年8月15日 21_13_24.png',
    r'素材\参考图\ChatGPT Image 2026年8月15日 21_21_43.png',
    r'素材\参考图\ChatGPT Image 2026年8月15日 21_44_09.png',
]


def detect_icon_grid(img_array, min_icon_size=15, max_icon_size=300, gap_threshold=8):
    """
    智能检测图标网格布局。
    返回一个列表，每个元素是一组图标的 bounding box: [(x, y, w, h), ...]
    
    策略:
    1. 将图像转为灰度，二值化(非白色区域为前景)
    2. 投影到水平方向找到行间隙
    3. 在每个行内投影到垂直方向找到列间隙
    4. 提取每个单元格
    """
    h, w = img_array.shape[:2]
    
    # 转灰度
    if len(img_array.shape) == 3:
        gray = np.mean(img_array[:, :, :3], axis=2)
    else:
        gray = img_array.astype(float)
    
    # 二值化: 低于阈值的为前景 (图标)
    # 使用自适应方法: 找到最亮的20%像素作为背景色
    flat = gray.flatten()
    bg_threshold = np.percentile(flat, 85)
    binary = (gray < bg_threshold - 10).astype(np.uint8)
    
    # 水平投影: 统计每行的前景像素数量
    h_proj = np.sum(binary, axis=1)
    
    # 找到行边界 (投影值连续为0或很小的区域)
    in_gap = h_proj < max(2, w * 0.005)
    
    # 找到行段: 连续的非间隙区域
    rows = []
    start = None
    for i in range(h):
        if not in_gap[i]:
            if start is None:
                start = i
        else:
            if start is not None:
                row_h = i - start
                if min_icon_size <= row_h <= max_icon_size * 2:
                    rows.append((start, i))
                start = None
    if start is not None:
        row_h = h - start
        if min_icon_size <= row_h <= max_icon_size * 2:
            rows.append((start, h))
    
    # 对每个行，做垂直投影找到列
    all_icons = []
    for row_top, row_bot in rows:
        row_slice = binary[row_top:row_bot, :]
        v_proj = np.sum(row_slice, axis=0)
        
        # 找列边界
        in_vgap = v_proj < max(2, (row_bot - row_top) * 0.005)
        
        cols = []
        col_start = None
        for j in range(w):
            if not in_vgap[j]:
                if col_start is None:
                    col_start = j
            else:
                if col_start is not None:
                    col_w = j - col_start
                    if min_icon_size <= col_w <= max_icon_size * 2:
                        cols.append((col_start, j))
                    col_start = None
        if col_start is not None:
            col_w = w - col_start
            if min_icon_size <= col_w <= max_icon_size * 2:
                cols.append((col_start, w))
        
        for col_left, col_right in cols:
            all_icons.append((col_left, row_top, col_right - col_left, row_bot - row_top))
    
    return all_icons


def detect_contour_icons(img_array, min_size=20, max_size=400):
    """
    备用方案: 使用连通分量检测图标。
    """
    h, w = img_array.shape[:2]
    
    if len(img_array.shape) == 3:
        gray = np.mean(img_array[:, :, :3], axis=2)
    else:
        gray = img_array.astype(float)
    
    bg_threshold = np.percentile(gray.flatten(), 85)
    binary = (gray < bg_threshold - 10).astype(np.uint8) * 255
    
    # 简单的连通分量标记 (不依赖cv2)
    labeled = np.zeros_like(binary, dtype=int)
    label_id = 0
    labels_map = {}
    
    # 简单的 flood fill 连通分量
    for y in range(h):
        for x in range(w):
            if binary[y, x] == 255 and labeled[y, x] == 0:
                label_id += 1
                # BFS flood fill
                queue = [(y, x)]
                labeled[y, x] = label_id
                pixels = [(y, x)]
                while queue:
                    cy, cx = queue.pop(0)
                    for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
                        ny, nx = cy+dy, cx+dx
                        if 0 <= ny < h and 0 <= nx < w:
                            if binary[ny, nx] == 255 and labeled[ny, nx] == 0:
                                labeled[ny, nx] = label_id
                                queue.append((ny, nx))
                                pixels.append((ny, nx))
                
                # 过滤大小
                if len(pixels) < min_size * min_size * 0.1:
                    continue
                if len(pixels) > max_size * max_size * 4:
                    continue
                
                ys = [p[0] for p in pixels]
                xs = [p[1] for p in pixels]
                bbox = (min(xs), min(ys), max(xs)-min(xs)+1, max(ys)-min(ys)+1)
                
                if min_size <= bbox[2] <= max_size and min_size <= bbox[3] <= max_size:
                    labels_map[label_id] = bbox
    
    return list(labels_map.values())


def merge_nearby_icons(icons, merge_x_gap=15, merge_y_gap=8):
    """
    合并距离太近的小区域(可能是同一图标的碎片)。
    """
    if not icons:
        return icons
    
    # 按y排序，然后按x排序
    icons = sorted(icons, key=lambda b: (b[1], b[0]))
    merged = list(icons)
    
    changed = True
    while changed:
        changed = False
        new_merged = []
        used = set()
        for i in range(len(merged)):
            if i in used:
                continue
            x1, y1, w1, h1 = merged[i]
            for j in range(i+1, len(merged)):
                if j in used:
                    continue
                x2, y2, w2, h2 = merged[j]
                
                # 检查是否在同一行附近
                if abs(y1 - y2) < merge_y_gap and abs(x1 + w1 - x2) < merge_x_gap:
                    # 合并
                    nx = min(x1, x2)
                    ny = min(y1, y2)
                    nw = max(x1+w1, x2+w2) - nx
                    nh = max(y1+h1, y2+h2) - ny
                    x1, y1, w1, h1 = nx, ny, nw, nh
                    used.add(j)
                    changed = True
            
            new_merged.append((x1, y1, w1, h1))
            used.add(i)
        merged = new_merged
    
    return merged


def filter_icons(icons, img_w, img_h, min_size=25, padding_ratio=0.02):
    """
    过滤掉太小或太大的区域，只保留合理的图标区域。
    """
    filtered = []
    min_area = min_size * min_size
    max_area = (img_w * 0.8) * (img_h * 0.8)
    
    for x, y, w, h in icons:
        area = w * h
        # 过滤太小
        if area < min_area:
            continue
        # 过滤太大(可能是整张图片的背景)
        if area > max_area:
            continue
        # 过滤长宽比极端的
        ratio = max(w, h) / max(min(w, h), 1)
        if ratio > 6:
            continue
        filtered.append((x, y, w, h))
    
    return filtered


def split_image(img_path, output_dir, prefix="icon", padding=4):
    """
    拆分单张合成图片为独立图标。
    """
    img = Image.open(img_path)
    img_array = np.array(img)
    img_w, img_h = img.size
    
    print(f"\n处理: {os.path.basename(img_path)} ({img_w}x{img_h})")
    
    # 方法1: 网格检测
    icons = detect_icon_grid(img_array)
    method = "grid"
    
    # 如果检测到的图标太少，尝试连通分量法
    if len(icons) < 3:
        print(f"  网格法检测到 {len(icons)} 个图标，尝试连通分量法...")
        icons2 = detect_contour_icons(img_array)
        if len(icons2) > len(icons):
            icons = icons2
            method = "contour"
            print(f"  连通分量法检测到 {len(icons)} 个图标")
    
    if len(icons) == 0:
        print(f"  未检测到图标，跳过")
        return 0
    
    # 合并碎片
    icons = merge_nearby_icons(icons)
    print(f"  合并后: {len(icons)} 个图标 ({method}法)")
    
    # 过滤不合理区域
    icons = filter_icons(icons, img_w, img_h)
    print(f"  过滤后: {len(icons)} 个图标")
    
    if len(icons) == 0:
        print(f"  过滤后无图标，跳过")
        return 0
    
    # 按行分组
    icons_sorted = sorted(icons, key=lambda b: (b[1], b[0]))
    rows = []
    current_row = []
    last_y = -999
    for icon in icons_sorted:
        x, y, w, h = icon
        if abs(y - last_y) > h * 0.8 and current_row:
            rows.append(current_row)
            current_row = []
        current_row.append(icon)
        last_y = y
    if current_row:
        rows.append(current_row)
    
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 保存每个图标
    count = 0
    for row_idx, row in enumerate(rows):
        row_sorted = sorted(row, key=lambda b: b[0])
        for col_idx, (x, y, w, h) in enumerate(row_sorted):
            # 添加padding
            left = max(0, x - padding)
            top = max(0, y - padding)
            right = min(img_w, x + w + padding)
            bottom = min(img_h, y + h + padding)
            
            icon_img = img.crop((left, top, right, bottom))
            
            icon_name = f"{prefix}_r{row_idx+1:02d}_c{col_idx+1:02d}.png"
            icon_path = os.path.join(output_dir, icon_name)
            icon_img.save(icon_path, 'PNG')
            count += 1
    
    print(f"  已拆分保存 {count} 个图标到 {os.path.relpath(output_dir, BASE_DIR)}")
    return count


def process_image(rel_path):
    """处理单张图片"""
    img_path = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(img_path):
        print(f"文件不存在: {rel_path}")
        return 0
    
    # 生成输出目录: 在同级目录下创建"拆分图标"文件夹
    img_dir = os.path.dirname(img_path)
    img_name = os.path.splitext(os.path.basename(img_path))[0]
    
    # 用简短名称作为前缀
    # 从路径推断页面名
    rel_dir = os.path.relpath(img_dir, os.path.join(BASE_DIR, '素材'))
    page_name = rel_dir.replace('\\', '_').replace(' ', '_')
    page_name = page_name.replace('最终_', '').replace('最终', '')
    if not page_name:
        page_name = 'root'
    
    output_dir = os.path.join(img_dir, f"拆分图标_{page_name}")
    prefix = page_name.replace('_', '')
    
    return split_image(img_path, output_dir, prefix=prefix)


def main():
    print("=" * 60)
    print("ChatGpt 5.6 Luna生成的合成PNG图标素材自动拆分工具")
    print("=" * 60)
    
    total = 0
    processed = 0
    
    for rel_path in TARGET_IMAGES:
        count = process_image(rel_path)
        if count > 0:
            processed += 1
        total += count
    
    print("\n" + "=" * 60)
    print(f"完成! 共处理 {processed}/{len(TARGET_IMAGES)} 张图片, 拆分出 {total} 个独立图标")
    print("=" * 60)


if __name__ == '__main__':
    main()
