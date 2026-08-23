"""
拆分 素材/吉祥物/参考吉祥物.png 为独立图标
1536x1024 RGBA 合成图，半透明渐变背景+吉祥物网格排列
"""
from PIL import Image
import numpy as np
import os
import json
from scipy import ndimage

SRC = r'd:\6\恋爱小程序\素材\吉祥物\参考吉祥物.png'
OUT = r'd:\6\恋爱小程序\素材\吉祥物\拆分图标_吉祥物参考'
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC).convert('RGBA')
arr = np.array(img)
w, h = img.size
print(f'Source: {w}x{h}')

# 前景检测：alpha > 240 (仅不透明的吉祥物主体)
alpha = arr[:, :, 3]
fg_mask = alpha > 240
print(f'Foreground (alpha>240): {fg_mask.sum()/fg_mask.size*100:.1f}%')

# 膨胀合并：5次迭代将同一图标的各部分合并
struct = ndimage.generate_binary_structure(2, 2)
dilated = ndimage.binary_dilation(fg_mask, structure=struct, iterations=5)
labeled, n = ndimage.label(dilated)
print(f'Connected components: {n}')

# 提取bbox，过滤太小的碎片
bboxes_raw = ndimage.find_objects(labeled)
MIN_W, MIN_H, MIN_AREA = 40, 40, 2000
SAFETY = 6
icons = []
for slc in bboxes_raw:
    y_s, x_s = slc
    bh = y_s.stop - y_s.start
    bw = x_s.stop - x_s.start
    if bw < MIN_W or bh < MIN_H or bw * bh < MIN_AREA:
        continue
    y1 = max(0, y_s.start - SAFETY)
    y2 = min(h, y_s.stop + SAFETY)
    x1 = max(0, x_s.start - SAFETY)
    x2 = min(w, x_s.stop + SAFETY)
    icons.append([x1, y1, x2, y2, bw, bh])

# 按位置排序：先按行(y/100分组)，再按列(x)
icons.sort(key=lambda b: (b[1] // 100, b[0]))
print(f'Meaningful icons (>{MIN_W}x{MIN_H}, area>{MIN_AREA}): {len(icons)}')

# 分类命名：基于位置和尺寸
mascot_names = [
    'default', 'smile', 'happy', 'wink', 'thinking',
    'surprised', 'tearful', 'angry', 'sleepy',
]
manifest = []
for idx, (x1, y1, x2, y2, bw, bh) in enumerate(icons):
    # 根据位置推测类别
    row = y1 // 100
    if row <= 2:
        cat = 'mascot_base'
        name_idx = idx if idx < len(mascot_names) else idx
        name = f'mascot_{mascot_names[name_idx]}' if name_idx < len(mascot_names) else f'mascot_extra_{idx+1}'
    elif row <= 5:
        cat = 'expression'
        name = f'expression_{idx+1:02d}'
    elif row <= 7:
        cat = 'decor'
        name = f'decor_{idx+1:02d}'
    else:
        cat = 'utility'
        name = f'utility_{idx+1:02d}'

    crop = img.crop((x1, y1, x2, y2))
    fname = f'{name}.png'
    crop.save(os.path.join(OUT, fname))
    manifest.append({
        'index': idx + 1,
        'filename': fname,
        'category': cat,
        'dimensions': f'{bw}x{bh}',
        'position': [x1, y1, x2, y2],
    })
    print(f'  [{cat}] {fname}: {bw}x{bh}')

# 保存 manifest
manifest_path = os.path.join(OUT, 'manifest.json')
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump({
        'title': '吉祥物参考图拆分素材',
        'source': '参考吉祥物.png',
        'source_size': f'{w}x{h}',
        'total': len(manifest),
        'categories': list(set(m['category'] for m in manifest)),
        'icons': manifest,
    }, f, ensure_ascii=False, indent=2)

print(f'\nDone: {len(manifest)} icons -> {OUT}')
print(f'Manifest: {manifest_path}')
