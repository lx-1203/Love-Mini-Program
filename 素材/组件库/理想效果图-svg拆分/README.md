# 寻觅 SVG 素材库

「寻觅」恋爱小程序全套矢量 UI 素材，共 14 个分类，118 个 SVG 文件。

## 目录结构

```
理想效果图-svg拆分/
├── 01-tabbar/           # 底部导航栏图标 (5个)
├── 02-buttons/          # 按钮与徽章 (10个)
├── 03-icons/            # 功能图标 (30个)
├── 04-avatars/          # 头像相关 (8个)
├── 05-tags/             # 标签组件 (12个)
├── 06-cards/            # 卡片模板 (6个)
├── 07-progress/         # 进度组件 (5个)
├── 08-mascot/           # 吉祥物「寻觅芽」(8个)
├── 09-decorations/      # 装饰元素 (12个)
├── 10-empty/            # 空状态插画 (5个)
├── 11-logo/             # 品牌Logo (3个)
├── 12-chat/             # 聊天元素 (6个)
├── 13-login/            # 登录相关 (5个)
├── 14-page-templates/   # 页面线框模板 (3个)
├── index.html           # 素材预览页
└── README.md            # 本文件
```

## 文件统计

| 分类 | 数量 | 说明 |
|------|------|------|
| 01-tabbar | 5 | 底部导航栏图标 |
| 02-buttons | 10 | 按钮形状与徽章 |
| 03-icons | 30 | 功能图标 |
| 04-avatars | 8 | 头像边框、状态点、认证徽章 |
| 05-tags | 12 | 兴趣标签、状态标签 |
| 06-cards | 6 | 卡片外壳模板 |
| 07-progress | 5 | 进度条、匹配圆环 |
| 08-mascot | 8 | 吉祥物寻觅芽 |
| 09-decorations | 12 | 装饰元素（叶子、爱心、闪光） |
| 10-empty | 5 | 空状态插画 |
| 11-logo | 3 | 品牌Logo |
| 12-chat | 6 | 聊天气泡、输入栏 |
| 13-login | 5 | 登录页元素 |
| 14-page-templates | 3 | 页面线框模板 |
| **合计** | **118** | |

## 设计规范

### 品牌色

- 主色（薄荷绿）：`#36C99A`
- 浅薄荷绿：`#6FD4AA`
- 超浅绿：`#D4F5E4` / `#E8F8F0`
- 辅色（心形粉）：`#FF6B81`
- 浅粉：`#FF8FA3`
- 超浅粉：`#FFE4E9` / `#FFB6C1`

### SVG 规范

1. 所有图标均设置 `viewBox` 属性
2. 线框图标使用 `currentColor`，便于通过 CSS `color` 控制颜色
3. 统一 `stroke-linecap="round"` 和 `stroke-linejoin="round"`
4. 渐变使用品牌色（薄荷绿 / 心形粉）
5. 纯 SVG 代码，无嵌入位图
6. 文件命名：kebab-case（英文描述）

## 使用方法

### 微信小程序

在微信小程序中使用 SVG，推荐以下方式：

1. **使用 `<image>` 标签**（推荐）
   ```xml
   <image src="/images/icons/home.svg" mode="aspectFit" />
   ```

2. **转为 base64 内联**
   - 适合小图标，减少网络请求
   - 可使用构建工具自动转换

3. **使用第三方组件**
   - `wx-svg` 等组件库支持直接渲染 SVG

### H5 / Web

1. **直接内联 SVG**（推荐，可控制颜色）
   ```html
   <svg class="icon" aria-hidden="true">
     <use xlink:href="#icon-home"></use>
   </svg>
   ```

2. **img 标签引用**
   ```html
   <img src="icons/home.svg" alt="home" />
   ```

3. **CSS background**
   ```css
   .icon { background: url('icons/home.svg') center/contain no-repeat; }
   ```

### currentColor 变色

所有线框图标（tabbar、icons 等）使用 `currentColor` 作为 stroke 颜色，可通过父元素的 `color` 属性控制图标颜色：

```css
.icon {
  color: #36C99A;  /* 图标变为薄荷绿 */
}
.icon.active {
  color: #FF6B81;  /* 激活态变粉色 */
}
```

### React / Vue 项目

可将 SVG 作为组件导入，支持 props 控制大小、颜色：

```jsx
// React 示例
import { ReactComponent as HomeIcon } from './icons/home.svg';

<HomeIcon style={{ width: 24, height: 24, color: '#36C99A' }} />
```

## 预览

打开 `index.html` 可查看所有 SVG 素材的预览效果。

## 注意事项

1. 微信小程序对 SVG 的支持有限，建议使用 PNG 后备方案
2. 部分老版本 Android 设备可能存在 SVG 渲染问题，建议测试
3. 吉祥物形象为「寻觅」品牌专属，请勿用于其他项目
4. 建议根据实际需求对 SVG 进行压缩（如使用 SVGO）
