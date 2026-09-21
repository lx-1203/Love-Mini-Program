import numpy as np
from PIL import Image
import potracer
import svgwrite
import os

SRC_DIR = r'd:\6\恋爱小程序\素材\首页\最终\拆分图标-精修版'
OUT_DIR = r'd:\6\恋爱小程序\素材\首页\最终\拆分图标-精修版\svg-测试'
os.makedirs(OUT_DIR, exist_ok=True)

# 选3个有代表性的图标测试
test_icons = [
    ('01-tabbar-top/icon_row1_03.png', 'tabbar_match'),   # 复杂：大爱心+发光+文字
    ('02-buttons-badges/btn_row2_01.png', 'btn_like'),     # 中等：按钮+爱心+文字
    ('03-tags/tag_row3_05.png', 'tag_male'),               # 简单：圆形+性别符号
]

def png_to_svg_color(png_path, svg_path, colors=8):
    """将PNG转为彩色SVG（颜色分层追踪）"""
    img = Image.open(png_path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]
    
    alpha = arr[:,:,3]
    rgb = arr[:,:,:3]
    
    # 创建SVG
    dwg = svgwrite.Drawing(svg_path, size=(w, h), viewBox=f'0 0 {w} {h}')
    
    # 方法：按颜色聚类，每层单独追踪
    # 简化：将颜色量化到指定数量，然后每层生成一个路径
    
    # 量化颜色
    from sklearn.cluster import MiniBatchKMeans
    
    # 只处理不透明像素
    mask = alpha > 10
    pixels = rgb[mask].reshape(-1, 3).astype(np.float32)
    
    if len(pixels) == 0:
        dwg.save()
        return
    
    n_colors = min(colors, len(np.unique(pixels, axis=0)))
    if n_colors < 2:
        n_colors = 2
    
    kmeans = MiniBatchKMeans(n_clusters=n_colors, random_state=42, n_init=3)
    labels = kmeans.fit_predict(pixels)
    palette = kmeans.cluster_centers_.astype(np.uint8)
    
    # 按像素数排序（从多到少），先画大面积的
    label_counts = np.bincount(labels)
    order = np.argsort(-label_counts)
    
    full_labels = np.full((h, w), -1, dtype=np.int32)
    full_labels[mask] = labels
    
    for li in order:
        layer_mask = (full_labels == li)
        if not np.any(layer_mask):
            continue
        
        color = palette[li]
        color_hex = f'#{color[0]:02x}{color[1]:02x}{color[2]:02x}'
        
        # 使用potrace追踪
        # potrace需要二值图
        bimap = layer_mask.astype(np.uint8)
        
        try:
            bmp = potracer.Bitmap(bimap)
            bmp.trace(alphamax=0.2, optcurve=True, opttolerance=0.2)
            
            for path in bmp.paths:
                d = ''
                start = path.start_point
                d += f'M {start.x:.1f} {start.y:.1f} '
                
                for curve in path.curves:
                    if curve.type == potracer.POTRACE_CORNER:
                        d += f'L {curve.c1.x:.1f} {curve.c1.y:.1f} L {curve.c2.x:.1f} {curve.c2.y:.1f} '
                    elif curve.type == potracer.POTRACE_CURVETO:
                        d += f'C {curve.c1.x:.1f} {curve.c1.y:.1f}, {curve.c2.x:.1f} {curve.c2.y:.1f}, {curve.end_point.x:.1f} {curve.end_point.y:.1f} '
                
                d += 'Z'
                dwg.add(dwg.path(d=d, fill=color_hex))
        except Exception as e:
            # 降级：用矩形代替
            ys, xs = np.where(layer_mask)
            if len(xs) > 0:
                dwg.add(dwg.rect(insert=(xs.min(), ys.min()), 
                                size=(xs.max()-xs.min(), ys.max()-ys.min()),
                                fill=color_hex))
    
    dwg.save()
    return w, h

for rel_path, name in test_icons:
    png_path = os.path.join(SRC_DIR, rel_path)
    svg_path = os.path.join(OUT_DIR, f'{name}.svg')
    
    if not os.path.exists(png_path):
        print(f'跳过(不存在): {rel_path}')
        continue
    
    try:
        w, h = png_to_svg_color(png_path, svg_path, colors=12)
        png_size = os.path.getsize(png_path)
        svg_size = os.path.getsize(svg_path)
        print(f'✓ {name}: {w}x{h}  PNG={png_size}B  SVG={svg_size}B')
    except Exception as e:
        print(f'✗ {name}: 失败 - {e}')

print(f'\n测试完成，输出: {OUT_DIR}')
