"""
Generate manifest + README for every split-icon directory under 素材/.
Each icon gets: filename, size, type, color, grid position, file-size.
Outputs: manifest.json + 图标清单.txt  in each directory.
"""
from PIL import Image
import numpy as np, os, json

BASE = r'd:\6\恋爱小程序\素材'

# ===== per-directory context =====
CTX = {}
DIR_MAP = {
    r'登录页\拆分图标_登录页':         ('登录页图标素材',       'ChatGPT Image 2026年8月17日 23_44_12.png',          '登录流程 UI 图标'),
    r'匹配\最终\拆分图标_匹配':       ('匹配中心图标素材',     'ChatGPT Image 2026年8月17日 23_41_34.png',          '匹配流程/卡片/操作按钮图标'),
    r'消息\最终\拆分图标_消息':       ('消息界面图标素材',     'ChatGPT Image 2026年8月17日 23_43_21.png',          '消息列表/聊天界面图标'),
    r'主页\最终\个人\拆分图标_主页_个人':   ('个人主页图标素材',   'ChatGPT Image 2026年8月17日 23_32_20.png',  '我的主页资料/统计/设置图标'),
    r'主页\最终\他人\拆分图标_主页_他人1':  ('他人主页图标素材1',  'ChatGPT Image 2026年8月17日 23_33_29 (1).png', '他人主页互动/资料/操作图标'),
    r'主页\最终\他人\拆分图标_主页_他人2':  ('他人主页图标素材2',  'ChatGPT Image 2026年8月17日 23_33_29 (2).png', '他人主页补充/认证/标签图标'),
    r'附近\附近首页\拆分图标_附近_首页':   ('附近首页图标素材',   'ChatGPT Image 2026年8月17日 23_59_47.png',      '附近筛选/定位/用户卡片图标'),
    r'附近\兴趣圈\拆分图标_附近_兴趣圈':   ('兴趣圈图标素材',     'ChatGPT Image 2026年8月17日 23_56_00.png',      '圈子类型/热度/成员图标'),
    r'附近\圈子具体\拆分图标_附近_圈子':   ('圈子详情图标素材',   'ChatGPT Image 2026年8月18日 22_43_34.png',      '圈子信息/成员/帖子操作图标'),
    r'附近\帖子\拆分图标_附近_帖子':       ('帖子详情图标素材',   'ChatGPT Image 2026年8月18日 22_51_12.png',      '点赞/评论/分享/收藏图标'),
    r'附近\校园圈\拆分图标_附近_校园圈':   ('校园圈图标素材',     'ChatGPT Image 2026年8月18日 22_49_45.png',      '校园认证/院系/活动图标'),
    r'参考图\拆分图标_参考_个人主页':      ('参考-个人主页图标',  'ChatGPT Image 2026年8月15日 18_05_18.png',      '参考稿个人主页图标'),
    r'参考图\拆分图标_参考_主页设计':      ('参考-主页设计图标',  'ChatGPT Image 2026年8月15日 18_11_55.png',      '参考稿主页布局/导航图标'),
    r'参考图\拆分图标_参考_匹配中心':      ('参考-匹配中心图标',  'ChatGPT Image 2026年8月15日 18_13_31.png',      '参考稿匹配中心/交友图标'),
    r'参考图\拆分图标_参考_品牌系统':      ('参考-品牌系统图标',  'ChatGPT Image 2026年8月15日 20_48_15.png',      '参考稿品牌/Logo/吉祥物图标'),
    r'参考图\拆分图标_参考_消息界面':      ('参考-消息界面图标',  'ChatGPT Image 2026年8月15日 20_52_25.png',      '参考稿消息/聊天功能图标'),
    r'参考图\拆分图标_参考_消息设计':      ('参考-消息设计图标',  'ChatGPT Image 2026年8月15日 21_11_18.png',      '参考稿消息功能补充图标'),
    r'参考图\拆分图标_参考_登录流程':      ('参考-登录流程图标',  'ChatGPT Image 2026年8月15日 21_13_24.png',      '参考稿登录注册流程图标'),
    r'参考图\拆分图标_参考_登录设计':      ('参考-登录设计图标',  'ChatGPT Image 2026年8月15日 21_21_43.png',      '参考稿登录页面UI图标'),
    r'参考图\拆分图标_参考_附近探索':      ('参考-附近探索图标',  'ChatGPT Image 2026年8月15日 21_44_09.png',      '参考稿附近探索/地图功能图标'),
}


def color_name(arr):
    """Return dominant color label for visible pixels."""
    if arr.ndim == 3 and arr.shape[2] == 4:
        mask = arr[:, :, 3] > 128
        if mask.sum() == 0:
            return 'transparent'
        px = arr[mask, :3].astype(float)
    elif arr.ndim == 3:
        px = arr.reshape(-1, 3).astype(float)
    else:
        return 'gray'
    r, g, b = px[:, 0].mean(), px[:, 1].mean(), px[:, 2].mean()
    if r > 200 and g < 100 and b < 100:
        return 'red'
    if r > 200 and g > 150 and b < 100:
        return 'orange'
    if r < 100 and g > 150 and b < 100:
        return 'green'
    if r < 100 and g < 100 and b > 150:
        return 'blue'
    if r > 150 and g < 100 and b > 150:
        return 'purple'
    if r > 200 and g > 200 and b > 200:
        return 'light/white'
    if r < 80 and g < 80 and b < 80:
        return 'dark/black'
    if abs(r - g) < 30 and abs(g - b) < 30:
        return 'gray'
    return 'mixed'


def icon_type(w, h):
    ar = w / h if h else 1
    if ar > 2.5:
        return 'long-button/tag'
    if ar > 1.8:
        return 'wide-label/button'
    if ar < 0.5:
        return 'tall-bar'
    if w > 100 and h > 100:
        return 'square-icon/card'
    if w > 60 and h > 60:
        return 'medium-icon'
    if w > 35 and h > 35:
        return 'small-icon/badge'
    return 'tiny-indicator'


def parse_grid(fname):
    """Extract row, col from e.g. 消息_r03_c02.png -> (3, 2)."""
    r = c = 0
    if '_r' in fname:
        try:
            r = int(fname.split('_r')[1].split('_c')[0])
        except ValueError:
            pass
    if '_c' in fname:
        try:
            c = int(fname.split('_c')[1].replace('.png', ''))
        except ValueError:
            pass
    return r, c


def process(rel_dir, title, source, context):
    dp = os.path.join(BASE, rel_dir)
    if not os.path.isdir(dp):
        print(f'  SKIP {rel_dir}')
        return

    pngs = sorted(f for f in os.listdir(dp) if f.endswith('.png'))
    if not pngs:
        print(f'  EMPTY {rel_dir}')
        return

    print(f'  {rel_dir}  ({len(pngs)} icons)')

    entries = []
    for i, fn in enumerate(pngs, 1):
        fp = os.path.join(dp, fn)
        img = Image.open(fp)
        w, h = img.size
        arr = np.array(img)
        cn = color_name(arr)
        it = icon_type(w, h)
        row, col = parse_grid(fn)
        sz = os.path.getsize(fp)
        entries.append({
            'index': i,
            'filename': fn,
            'dimensions': f'{w}x{h}',
            'grid_row': row,
            'grid_col': col,
            'icon_type': it,
            'color': cn,
            'file_size': sz,
        })

    # --- manifest.json ---
    manifest = {
        'title': title,
        'source_image': source,
        'context': context,
        'total_icons': len(entries),
        'format': 'PNG RGBA transparent',
        'usage': 'Each icon is independent and can be used directly.',
        'icons': entries,
    }
    with open(os.path.join(dp, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # --- 图标清单.txt ---
    lines = [
        f'{title}',
        f'来源: {source}',
        f'总数: {len(entries)} 个',
        f'背景: 透明 (RGBA)',
        '',
    ]
    cur_row = -1
    for e in entries:
        if e['grid_row'] != cur_row:
            cur_row = e['grid_row']
            lines.append(f'--- 第 {cur_row} 行 ---')
        fs = f"{e['file_size']/1024:.1f}KB" if e['file_size'] > 1024 else f"{e['file_size']}B"
        lines.append(
            f"  {e['filename']}:  {e['dimensions']}  "
            f"[{e['icon_type']}]  color={e['color']}  {fs}"
        )

    with open(os.path.join(dp, '图标清单.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f'    -> manifest.json + 图标清单.txt written')


def main():
    print('=== Generating icon manifests ===\n')
    count = 0
    for rel, (title, source, ctx) in DIR_MAP.items():
        process(rel, title, source, ctx)
        count += 1
    print(f'\nDone. Processed {count} directories.')


if __name__ == '__main__':
    main()
