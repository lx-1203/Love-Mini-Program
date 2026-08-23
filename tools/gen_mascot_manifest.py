"""
为吉祥物参考图拆分生成标注清单 + 联系表
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import os, json

SPLIT_DIR = r'd:\6\恋爱小程序\素材\吉祥物\拆分图标_吉祥物参考'

# 加载manifest
with open(os.path.join(SPLIT_DIR, 'manifest.json'), 'r', encoding='utf-8') as f:
    manifest = json.load(f)

# 图标分类中文名
CAT_CN = {
    'mascot_base': '主吉祥物表情',
    'expression': '互动表情/动作',
    'decor': '装饰元素',
    'utility': '场景功能/辅助',
}

# 生成图标清单.txt
lines = []
lines.append('吉祥物参考图 - 拆分图标清单')
lines.append('=' * 50)
lines.append(f'来源: {manifest["source"]}')
lines.append(f'总数: {manifest["total"]} 个独立PNG图标')
lines.append(f'格式: PNG, RGBA透明背景')
lines.append('')

for cat, cn in CAT_CN.items():
    icons = [i for i in manifest['icons'] if i['category'] == cat]
    if not icons:
        continue
    lines.append(f'--- {cn} ({cat}) [{len(icons)}个] ---')
    for ic in icons:
        lines.append(f'  {ic["filename"]:30s}  {ic["dimensions"]:10s}  位置:({ic["position"][0]},{ic["position"][1]})')
    lines.append('')

with open(os.path.join(SPLIT_DIR, '图标清单.txt'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('图标清单.txt written')

# 生成联系表
pngs = sorted([f for f in os.listdir(SPLIT_DIR) if f.endswith('.png')])
THUMB = 80
PAD = 12
LABEL_H = 18
COLS = 8

rows_needed = (len(pngs) + COLS - 1) // COLS
sheet_w = COLS * (THUMB + PAD) + PAD
sheet_h = rows_needed * (THUMB + LABEL_H + PAD) + PAD + 40

sheet = Image.new('RGBA', (sheet_w, sheet_h), (255, 255, 255, 255))
draw = ImageDraw.Draw(sheet)

try:
    font = ImageFont.truetype("C:\\Windows\\Fonts\\msyh.ttc", 11)
except:
    font = ImageFont.load_default()

draw.text((PAD, 8), f'吉祥物参考图 - 联系表 ({len(pngs)} icons)', fill=(0, 0, 0), font=font)

for i, fname in enumerate(pngs):
    r, c = divmod(i, COLS)
    x = PAD + c * (THUMB + PAD)
    y = 32 + r * (THUMB + LABEL_H + PAD)

    img = Image.open(os.path.join(SPLIT_DIR, fname))
    img.thumbnail((THUMB, THUMB), Image.LANCZOS)
    # 粘贴到居中位置
    ox = x + (THUMB - img.width) // 2
    oy = y + (THUMB - img.height) // 2
    sheet.paste(img, (ox, oy), img if img.mode == 'RGBA' else None)

    label = fname.replace('.png', '')
    draw.text((x, y + THUMB + 1), label, fill=(80, 80, 80), font=font)

out_path = os.path.join(SPLIT_DIR, '图标预览_联系表.png')
sheet.save(out_path)
print(f'图标预览_联系表.png written ({sheet_w}x{sheet_h})')
