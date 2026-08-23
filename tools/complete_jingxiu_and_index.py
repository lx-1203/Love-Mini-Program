"""
Generate manifest + contact sheet for the 精修版 (already manually categorized).
Also create a master index at 素材 level.
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np, os, json, math

BASE = r'd:\6\恋爱小程序\素材'
JINGXIU = os.path.join(BASE, r'首页\最终\拆分图标-精修版')

# The 精修版 subcategories with human-readable labels
CATEGORIES = {
    '01-tabbar-top': {
        'title': 'TabBar 顶部导航图标',
        'desc': '底部 TabBar 图标 + 页面顶部小图标，用于主导航切换',
        'labels': [
            '搜索图标', '发现/首页图标', '大号品牌图标/吉祥物', '消息图标',
            '附近图标', '设置/更多图标(三点)', '通知/铃铛图标', '心形/点赞图标',
            '小圆点/指示器'
        ],
    },
    '02-buttons-badges': {
        'title': '按钮与徽章图标',
        'desc': '交互按钮、状态徽章、用户信息条等组件',
        'labels': [
            '喜欢按钮(绿色)', '看看TA按钮(红色)', '已认证徽章',
            '合拍度百分比', '性别+星座+年龄信息条', '距离信息',
            '用户头像+基础信息', '关注/互动按钮'
        ],
    },
    '03-tags': {
        'title': '标签与状态图标',
        'desc': '兴趣标签、性别标签、星座标签、距离标签、在线状态等',
        'labels': [
            '兴趣标签-摄影', '兴趣标签-旅行', '兴趣标签-美食',
            '兴趣标签-音乐', '兴趣标签-运动', '兴趣标签-阅读',
            '性别标签', '星座标签', '距离标签', '在线状态标签'
        ],
    },
    '04-photos-stats': {
        'title': '照片墙与数据统计',
        'desc': '用户照片网格、数据统计卡片等展示类组件',
        'labels': [
            '照片1-旅行照', '照片2-日常照', '照片3-宠物照',
            '照片4-美食照', '照片5-活动照', '照片6-自拍照',
            '获赞数统计', '浏览量统计', '关注/粉丝数统计'
        ],
    },
    '05-task-cards': {
        'title': '任务卡片与装饰元素',
        'desc': '每日任务卡片、进度提示、装饰性图案元素',
        'labels': [
            '任务卡片-完善资料', '任务卡片-发布动态', '任务卡片-每日签到',
            '任务卡片-邀请好友', '进度条装饰', '星星装饰', '花瓣/点缀装饰'
        ],
    },
    '06-circle-entries': {
        'title': '兴趣圈入口卡片',
        'desc': '各类兴趣圈的入口卡片、按钮、角标小图标',
        'labels': [
            '摄影圈入口卡片', '旅行圈入口卡片', '美食圈入口卡片',
            '音乐圈入口卡片', '运动圈入口卡片', '读书圈入口卡片',
            '加入按钮', '成员数角标', '热度角标'
        ],
    },
    '07-toolbar': {
        'title': '底部工具栏图标',
        'desc': '页面底部工具栏的操作图标集合',
        'labels': [
            '点赞/心形', '评论/气泡', '分享/转发', '收藏/星标',
            '更多操作', '发送/发送按钮', '表情/贴纸', '图片/相册',
            '语音/麦克风', '位置/地图', '拍照/相机', '红包/礼物', '删除/垃圾桶'
        ],
    },
}


def get_font(size=12):
    for p in [r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf"]:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


def color_cn(arr):
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
    if r > 200 and g > 120 and b < 80: return '橙色'
    if g > 180 and r < 100 and b < 100: return '绿色'
    if b > 180 and r < 80 and g < 80: return '蓝色'
    if r > 150 and b > 150 and g < 80: return '紫色'
    return '彩色'


def contact_sheet(dp, entries, title, max_cols=6):
    thumb = 100
    pad = 8
    lbl_h = 36
    cw = thumb + pad * 2
    ch = thumb + lbl_h + pad
    n = len(entries)
    cols = min(max_cols, n)
    rows_count = math.ceil(n / cols)
    sw = cols * cw + pad
    sh = rows_count * ch + pad + 30  # 30 for title

    canvas = Image.new('RGBA', (sw, sh), (255, 255, 255, 255))
    draw = ImageDraw.Draw(canvas)
    font = get_font(11)
    title_font = get_font(14)

    # Title
    draw.text((pad, 4), title, fill=(0, 0, 0), font=title_font)

    for i, e in enumerate(entries):
        r, c = divmod(i, cols)
        x = c * cw + pad
        y = 30 + r * ch + pad

        img = Image.open(e['path']).convert('RGBA')
        img.thumbnail((thumb, thumb), Image.LANCZOS)

        # Checkerboard bg
        bg = Image.new('RGBA', img.size, (240, 240, 240, 255))
        for py in range(0, img.height, 8):
            for px in range(0, img.width, 8):
                if (px // 8 + py // 8) % 2 == 0:
                    for dy in range(min(8, img.height - py)):
                        for dx in range(min(8, img.width - px)):
                            bg.putpixel((px + dx, py + dy), (220, 220, 220, 255))
        bg.paste(img, (0, 0), img)
        canvas.paste(bg, (x, y))
        draw.rectangle([x - 1, y - 1, x + thumb, y + thumb], outline=(200, 200, 200, 255))

        # Labels
        label = e.get('label', e['filename'].replace('.png', ''))
        draw.text((x, y + thumb + 2), e['filename'], fill=(80, 80, 80), font=font)
        draw.text((x, y + thumb + 14), label, fill=(0, 100, 180), font=font)

    out = os.path.join(dp, '图标预览_联系表.png')
    canvas.save(out)
    return out


def process_jingxiu():
    """Process the 精修版 directory which has sub-categories."""
    print('Processing 精修版...')

    all_entries = []
    for cat_dir, cat_info in CATEGORIES.items():
        cat_path = os.path.join(JINGXIU, cat_dir)
        if not os.path.isdir(cat_path):
            print(f'  SKIP {cat_dir}')
            continue

        pngs = sorted(f for f in os.listdir(cat_path) if f.endswith('.png'))
        entries = []
        for i, fn in enumerate(pngs):
            fp = os.path.join(cat_path, fn)
            img = Image.open(fp)
            w, h = img.size
            arr = np.array(img)
            cn = color_cn(arr)
            label = cat_info['labels'][i] if i < len(cat_info['labels']) else f'{cat_dir}_{i+1}'
            entries.append({
                'index': i + 1,
                'filename': fn,
                'dimensions': f'{w}x{h}',
                'semantic_label': label,
                'color': cn,
                'category': cat_dir,
                'category_title': cat_info['title'],
                'file_size': os.path.getsize(fp),
                'path': fp,
            })

        # Write category manifest
        manifest = {
            'category': cat_dir,
            'title': cat_info['title'],
            'description': cat_info['desc'],
            'total_icons': len(entries),
            'icons': [{k: v for k, v in e.items() if k != 'path'} for e in entries],
        }
        with open(os.path.join(cat_path, 'manifest.json'), 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)

        # Write category 图标清单.txt
        lines = [
            f'{cat_info["title"]}',
            f'{cat_info["desc"]}',
            f'总数: {len(entries)} 个',
            '',
        ]
        for e in entries:
            fs = f"{e['file_size']/1024:.1f}KB" if e['file_size'] > 1024 else f"{e['file_size']}B"
            lines.append(f"  {e['filename']:<25s} {e['dimensions']:>8s}  [{e['semantic_label']}]  {e['color']}  {fs}")

        with open(os.path.join(cat_path, '图标清单.txt'), 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        # Contact sheet
        contact_sheet(cat_path, entries, f'{cat_info["title"]} ({len(entries)}个)')

        all_entries.extend(entries)
        print(f'  {cat_dir}: {len(entries)} icons OK')

    # Overall manifest for 精修版
    overall = {
        'title': '首页图标拆分(精修版)',
        'source': 'ChatGPT Image 2026年8月17日 23_31_35.png',
        'description': '首页设计系统图标集，已按功能分类到7个子目录',
        'total_icons': len(all_entries),
        'categories': {k: v['title'] for k, v in CATEGORIES.items()},
        'icons': [{k: v for k, v in e.items() if k != 'path'} for e in all_entries],
    }
    with open(os.path.join(JINGXIU, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(overall, f, ensure_ascii=False, indent=2)

    print(f'  Overall: {len(all_entries)} icons, manifest.json written')


def create_master_index():
    """Create a master index at 素材/ level listing all icon directories."""
    lines = [
        '寻觅小程序 - 图标素材总索引',
        '=' * 60,
        '',
        '所有图标均为 PNG 格式, RGBA 透明背景, 可直接在小程序中使用。',
        '每个拆分目录包含:',
        '  - manifest.json  (结构化标注, 可被程序读取)',
        '  - 图标清单.txt   (人类可读的标注列表)',
        '  - 图标预览_联系表.png (可视化缩略图预览)',
        '',
        '首页图标(精修版) - 已按功能分类',
        '-' * 40,
        '  位置: 首页/最终/拆分图标-精修版/',
        '  来源: ChatGPT Image 2026年8月17日 23_31_35.png',
        '  总数: 65 个图标, 7 个分类',
    ]

    cat_names = {
        '01-tabbar-top':     'TabBar + 顶部导航 (9个)',
        '02-buttons-badges': '按钮与徽章 (8个)',
        '03-tags':           '标签与状态 (10个)',
        '04-photos-stats':   '照片墙与统计 (9个)',
        '05-task-cards':     '任务卡片与装饰 (7个)',
        '06-circle-entries': '兴趣圈入口 (9个)',
        '07-toolbar':        '底部工具栏 (13个)',
    }
    for k, v in cat_names.items():
        lines.append(f'    {k}/  {v}')

    lines += [
        '',
        '登录页图标',
        '-' * 40,
        '  位置: 登录页/拆分图标_登录页/',
        '  来源: ChatGPT Image 2026年8月17日 23_44_12.png',
        '  总数: 52 个图标',
        '',
        '匹配中心图标',
        '-' * 40,
        '  位置: 匹配/最终/拆分图标_匹配/',
        '  来源: ChatGPT Image 2026年8月17日 23_41_34.png',
        '  总数: 70 个图标',
        '',
        '消息界面图标',
        '-' * 40,
        '  位置: 消息/最终/拆分图标_消息/',
        '  来源: ChatGPT Image 2026年8月17日 23_43_21.png',
        '  总数: 114 个图标',
        '',
        '个人主页图标',
        '-' * 40,
        '  位置: 主页/最终/个人/拆分图标_主页_个人/',
        '  来源: ChatGPT Image 2026年8月17日 23_32_20.png',
        '  总数: 28 个图标',
        '',
        '他人主页图标 (1)',
        '-' * 40,
        '  位置: 主页/最终/他人/拆分图标_主页_他人1/',
        '  来源: ChatGPT Image 2026年8月17日 23_33_29 (1).png',
        '  总数: 64 个图标',
        '',
        '他人主页图标 (2)',
        '-' * 40,
        '  位置: 主页/最终/他人/拆分图标_主页_他人2/',
        '  来源: ChatGPT Image 2026年8月17日 23_33_29 (2).png',
        '  总数: 38 个图标',
        '',
        '附近首页图标',
        '-' * 40,
        '  位置: 附近/附近首页/拆分图标_附近_首页/',
        '  来源: ChatGPT Image 2026年8月17日 23_59_47.png',
        '  总数: 82 个图标',
        '',
        '兴趣圈图标',
        '-' * 40,
        '  位置: 附近/兴趣圈/拆分图标_附近_兴趣圈/',
        '  来源: ChatGPT Image 2026年8月17日 23_56_00.png',
        '  总数: 71 个图标',
        '',
        '圈子详情图标',
        '-' * 40,
        '  位置: 附近/圈子具体/拆分图标_附近_圈子/',
        '  来源: ChatGPT Image 2026年8月18日 22_43_34.png',
        '  总数: 118 个图标',
        '',
        '帖子详情图标',
        '-' * 40,
        '  位置: 附近/帖子/拆分图标_附近_帖子/',
        '  来源: ChatGPT Image 2026年8月18日 22_51_12.png',
        '  总数: 68 个图标',
        '',
        '校园圈图标',
        '-' * 40,
        '  位置: 附近/校园圈/拆分图标_附近_校园圈/',
        '  来源: ChatGPT Image 2026年8月18日 22_49_45.png',
        '  总数: 95 个图标',
        '',
        '参考图图标 (9个目录)',
        '-' * 40,
        '  位置: 参考图/拆分图标_参考_*/',
        '  来源: ChatGPT Image 2026年8月15日 *.png',
        '  总数: 507 个图标',
        '  子目录: 个人主页/主页设计/匹配中心/品牌系统/消息界面/消息设计/登录流程/登录设计/附近探索',
        '',
        '=' * 60,
        f'总计: 约 1372 个独立PNG图标, 21 个拆分目录',
        '',
        '使用方式:',
        '  1. 直接引用: 将图标PNG放入小程序 static/images/ 对应目录',
        '  2. 按需取用: 查看对应目录的 图标清单.txt 或 manifest.json 找到所需图标',
        '  3. 可视化浏览: 打开 图标预览_联系表.png 快速查看所有图标缩略图',
    ]

    out_path = os.path.join(BASE, '图标素材总索引.txt')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'\nMaster index written to: {out_path}')


if __name__ == '__main__':
    process_jingxiu()
    create_master_index()
    print('\nAll done.')
