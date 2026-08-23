"""检查所有拆分图标的质量：透明背景、前景占比、尺寸分布"""
from PIL import Image
import numpy as np
import os

base = r'd:\6\恋爱小程序\素材'

for root, subdirs, files in os.walk(base):
    for d in subdirs:
        if not d.startswith('拆分图标'):
            continue
        dp = os.path.join(root, d)
        png_files = sorted([f for f in os.listdir(dp) if f.endswith('.png')])
        if not png_files:
            continue

        rel = os.path.relpath(dp, base)
        total = len(png_files)
        rgba_count = 0
        rgb_count = 0
        small_count = 0  # < 30x30
        tiny_file_count = 0  # < 200 bytes
        sizes = []

        for f in png_files:
            fp = os.path.join(dp, f)
            sz = os.path.getsize(fp)
            sizes.append(sz)
            if sz < 200:
                tiny_file_count += 1
            try:
                img = Image.open(fp)
                w, h = img.size
                if w < 30 or h < 30:
                    small_count += 1
                if 'A' in img.mode:
                    rgba_count += 1
                else:
                    rgb_count += 1
            except Exception as e:
                pass

        avg_size = sum(sizes) / len(sizes) if sizes else 0
        print(f'{rel}:')
        print(f'  Total: {total} icons')
        print(f'  RGBA: {rgba_count}, RGB: {rgb_count}')
        print(f'  Tiny files (<200B): {tiny_file_count}')
        print(f'  Small icons (<30px): {small_count}')
        print(f'  Avg file size: {avg_size:.0f} bytes')
        print()
