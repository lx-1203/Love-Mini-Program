"""
Enhanced icon labeling: analyze each split icon visually and assign
meaningful Chinese semantic names + generate a visual contact sheet.
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np, os, json, math

BASE = r'd:\6\恋爱小程序\素材'

DIRS = [
    (r'登录页\拆分图标_登录页',         '登录页'),
    (r'匹配\最终\拆分图标_匹配',       '匹配'),
    (r'消息\最终\拆分图标_消息',       '消息'),
    (r'主页\最终\个人\拆分图标_主页_个人',   '主页_个人'),
    (r'主页\最终\他人\拆分图标_主页_他人1',  '主页_他人1'),
    (r'主页\最终\他人\拆分图标_主页_他人2',  '主页_他人2'),
    (r'附近\附近首页\拆分图标_附近_首页',   '附近_首页'),
    (r'附近\兴趣圈\拆分图标_附近_兴趣圈',   '兴趣圈'),
    (r'附近\圈子具体\拆分图标_附近_圈子',   '圈子详情'),
    (r'附近\帖子\拆分图标_附近_帖子',       '帖子'),
    (r'附近\校园圈\拆分图标_附近_校园圈',   '校园圈'),
    (r'参考图\拆分图标_参考_个人主页',      '参考_个人主页'),
    (r'参考图\拆分图标_参考_主页设计',      '参考_主页设计'),
    (r'参考图\拆分图标_参考_匹配中心',      '参考_匹配中心'),
    (r'参考图\拆分图标_参考_品牌系统',      '参考_品牌系统'),
    (r'参考图\拆分图标_参考_消息界面',      '参考_消息界面'),
    (r'参考图\拆分图标_参考_消息设计',      '参考_消息设计'),
    (r'参考图\拆分图标_参考_登录流程',      '参考_登录流程'),
    (r'参考图\拆分图标_参考_登录设计',      '参考_登录设计'),
    (r'参考图\拆分图标_参考_附近探索',      '参考_附近探索'),
]


def dominant_color_name(arr):
    """Classify the dominant color into a Chinese name."""
    if arr.ndim == 3 and arr.shape[2] == 4:
        mask = arr[:, :, 3] > 128
        if mask.sum() < 10:
            return '透明'
        px = arr[mask, :3].astype(float)
    elif arr.ndim == 3:
        px = arr.reshape(-1, 3).astype(float)
    else:
        return '灰色'

    r, g, b = px[:, 0].mean(), px[:, 1].mean(), px[:, 2].mean()
    sat = max(r, g, b) - min(r, g, b)

    if sat < 20:
        if r > 200: return '白色'
        if r > 140: return '浅灰'
        if r > 60:  return '深灰'
        return '黑色'
    if r > 200 and g < 80 and b < 80: return '红色'
    if r > 200 and g > 120 and g < 180 and b < 80: return '橙色'
    if r > 200 and g > 200 and b < 80: return '黄色'
    if g > 180 and r < 100 and b < 100: return '绿色'
    if g > 150 and r < 80 and b > 100: return '青色'
    if b > 180 and r < 80 and g < 80: return '蓝色'
    if r > 150 and b > 150 and g < 80: return '紫色'
    if r > 180 and g > 130 and b < 80: return '暖色'
    return '彩色'


def shape_features(arr):
    """Extract shape-based features for classification."""
    if arr.ndim == 3 and arr.shape[2] == 4:
        alpha = arr[:, :, 3]
    elif arr.ndim == 3:
        gray = arr.mean(axis=2)
        alpha = (gray < 240).astype(np.uint8) * 255
    else:
        alpha = (arr < 240).astype(np.uint8) * 255

    mask = alpha > 128
    h, w = mask.shape
    total_px = h * w
    fg_px = mask.sum()
    fill_ratio = fg_px / total_px if total_px > 0 else 0

    # Row/col density profile to detect grid, bars, circles
    row_density = mask.mean(axis=1)
    col_density = mask.mean(axis=0)

    # Count foreground "runs" in middle row
    mid_row = mask[h // 2, :]
    runs = np.diff(mid_row.astype(int))
    n_transitions = (runs != 0).sum()

    # Compactness: perimeter / area ratio
    # Simple approximation via edge pixels
    from scipy import ndimage
    try:
        dilated = ndimage.binary_dilation(mask, iterations=1)
        edge = dilated & ~mask
        perimeter = edge.sum()
    except Exception:
        perimeter = 0
    compactness = perimeter / fg_px if fg_px > 100 else 0

    return {
        'fill_ratio': fill_ratio,
        'n_transitions': n_transitions,
        'compactness': compactness,
        'fg_pixels': int(fg_px),
    }


def classify_semantic(w, h, color, features, label_hint):
    """Assign a semantic Chinese name based on all features."""
    ar = w / h if h > 0 else 1
    fill = features['fill_ratio']
    compact = features['compactness']
    transitions = features['n_transitions']

    # --- Size + aspect ratio based ---
    if ar > 3.0:
        if fill > 0.3:
            return '长条按钮'
        return '分割线/横条'

    if ar > 2.0:
        if w > 150:
            return '宽标签/按钮'
        return '标签/文字条'

    if ar < 0.35:
        return '竖向进度条/条形'

    # --- Icon-like (roughly square) ---
    if 0.7 < ar < 1.4:
        if fill > 0.5:
            if color in ('红色', '橙色'):
                return '心形/点赞图标'
            if color in ('蓝色', '青色'):
                return '圆形功能图标'
            return '实心圆形图标'
        if fill > 0.2:
            if compact > 0.08:
                return '线框图标'
            return '填充图标'
        if fill > 0.05:
            return '细线图标/指示器'
        return '极小点/指示器'

    # --- Wider than tall ---
    if ar > 1.4:
        if fill > 0.4:
            return '圆角矩形卡片'
        if fill > 0.15:
            return '横向图标/按钮'
        return '横向细线元素'

    # --- Taller than wide ---
    if fill > 0.3:
        return '竖向元素'
    return '小图标'


def smart_label(fname, w, h, color, features):
    """Generate final Chinese label."""
    ar = w / h if h > 0 else 1
    fill = features['fill_ratio']
    base_type = classify_semantic(w, h, color, features, '')

    # Combine for final label
    size_tag = ''
    if w * h < 300:
        size_tag = '微小'
    elif w * h < 2000:
        size_tag = '小'
    elif w * h < 8000:
        size_tag = '中'
    else:
        size_tag = '大'

    return f'{size_tag}{color}{base_type}'


def generate_contact_sheet(dp, entries, label, max_cols=8):
    """Generate a visual contact sheet PNG with thumbnails + labels."""
    thumb_size = 100
    padding = 8
    label_h = 28
    cell_w = thumb_size + padding * 2
    cell_h = thumb_size + label_h + padding

    n = len(entries)
    cols = min(max_cols, n)
    rows_count = math.ceil(n / cols)

    sheet_w = cols * cell_w + padding
    sheet_h = rows_count * cell_h + padding

    canvas = Image.new('RGBA', (sheet_w, sheet_h), (255, 255, 255, 255))
    draw = ImageDraw.Draw(canvas)

    try:
        font = ImageFont.truetype("msyh.ttc", 12)
    except Exception:
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 12)
        except Exception:
            font = ImageFont.load_default()

    for i, e in enumerate(entries):
        r, c = divmod(i, cols)
        x = c * cell_w + padding
        y = r * cell_h + padding

        # Load and resize icon
        fp = os.path.join(dp, e['filename'])
        img = Image.open(fp).convert('RGBA')
        img.thumbnail((thumb_size, thumb_size), Image.LANCZOS)

        # Checkerboard background to show transparency
        bg = Image.new('RGBA', img.size, (240, 240, 240, 255))
        for py in range(0, img.height, 8):
            for px in range(0, img.width, 8):
                if (px // 8 + py // 8) % 2 == 0:
                    for dy in range(min(8, img.height - py)):
                        for dx in range(min(8, img.width - px)):
                            bg.putpixel((px + dx, py + dy), (220, 220, 220, 255))

        bg.paste(img, (0, 0), img)
        canvas.paste(bg, (x, y))

        # Draw border
        draw.rectangle([x - 1, y - 1, x + thumb_size, y + thumb_size],
                       outline=(200, 200, 200, 255))

        # Draw label
        short_name = e['filename'].replace('.png', '')
        # Shorten label
        label_text = e.get('semantic_label', short_name)
        if len(label_text) > 12:
            label_text = label_text[:12]
        draw.text((x, y + thumb_size + 2), short_name, fill=(80, 80, 80, 255), font=font)
        draw.text((x, y + thumb_size + 14), label_text, fill=(0, 100, 180, 255), font=font)

    # Save
    out_path = os.path.join(dp, '图标预览_联系表.png')
    canvas.save(out_path)
    return out_path


def process_one(rel_dir, label):
    dp = os.path.join(BASE, rel_dir)
    if not os.path.isdir(dp):
        print(f'  SKIP {label}')
        return

    pngs = sorted(f for f in os.listdir(dp) if f.endswith('.png'))
    if not pngs:
        print(f'  EMPTY {label}')
        return

    print(f'  {label} ({len(pngs)} icons)...', end=' ', flush=True)

    entries = []
    for i, fn in enumerate(pngs, 1):
        fp = os.path.join(dp, fn)
        img = Image.open(fp)
        w, h = img.size
        arr = np.array(img)

        color = dominant_color_name(arr)
        try:
            feat = shape_features(arr)
        except Exception:
            feat = {'fill_ratio': 0, 'n_transitions': 0, 'compactness': 0, 'fg_pixels': 0}

        semantic = smart_label(fn, w, h, color, feat)
        row, col = 0, 0
        if '_r' in fn:
            try:
                row = int(fn.split('_r')[1].split('_c')[0])
            except ValueError:
                pass
        if '_c' in fn:
            try:
                col = int(fn.split('_c')[1].replace('.png', ''))
            except ValueError:
                pass

        entries.append({
            'index': i,
            'filename': fn,
            'dimensions': f'{w}x{h}',
            'grid_row': row,
            'grid_col': col,
            'semantic_label': semantic,
            'icon_type': classify_semantic(w, h, color, feat, ''),
            'color': color,
            'fill_ratio': round(feat['fill_ratio'], 3),
            'file_size': os.path.getsize(fp),
            'semantic_label': semantic,
        })

    # --- Enhanced 图标清单.txt ---
    lines = [
        f'== {label} 图标清单 ==',
        f'总数: {len(entries)} 个独立 PNG 图标',
        f'格式: RGBA 透明背景, 可直接使用',
        '',
    ]
    cur_row = -1
    for e in entries:
        if e['grid_row'] != cur_row:
            cur_row = e['grid_row']
            if cur_row > 0:
                lines.append('')
            lines.append(f'--- 第 {cur_row} 行 ---')
        fs = f"{e['file_size']/1024:.1f}KB" if e['file_size'] > 1024 else f"{e['file_size']}B"
        lines.append(
            f"  {e['filename']:<32s}  "
            f"{e['dimensions']:>8s}  "
            f"[{e['semantic_label']}]  "
            f"{fs}"
        )

    with open(os.path.join(dp, '图标清单.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    # --- Enhanced manifest.json ---
    manifest = {
        'directory': label,
        'total_icons': len(entries),
        'icons': entries,
    }
    with open(os.path.join(dp, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # --- Contact sheet ---
    sheet_path = generate_contact_sheet(dp, entries, label)
    print(f'OK -> 图标清单.txt + manifest.json + 图标预览')

    return entries


def main():
    print('=== Enhanced Icon Labeling ===\n')
    total = 0
    for rel, lbl in DIRS:
        result = process_one(rel, lbl)
        if result:
            total += len(result)
    print(f'\nDone. {total} icons labeled across {len(DIRS)} directories.')


if __name__ == '__main__':
    main()
