# 寻觅个人主页设计验收规格（Profile V3）

> 依据 Figma 文件级标注稿与 5.0 SVG 素材。

## 页面画布
- Frame：375 × 812（iPhone 13 mini / 微信小程序）
- 左右安全边距 16px，内容宽度 343px
- 页面背景 #F7FAF9

## 页面区域
| 区域 | Y | 高度 |
| --- | --- | --- |
| Status Bar | 0 | 44 |
| Profile Header | 44 | 120 |
| 资料完整度 | 180 | 88 |
| 数据统计 | 268 | 64 |
| 故事模块 | 348 | 220 |
| 兴趣标签 | 588 | 80 |
| 照片墙 | 668 | 240 |
| Bottom Tab | 740 | 72 |

## 色板
| 用途 | 值 |
| --- | --- |
| Primary | #3CC99A |
| Love | #FF5A91 |
| Background | #F7FAF9 |
| Card | #FFFFFF |
| 浅绿背景 | #E8F8F2 / #EAF8F3 |
| 故事空态底 | #FFF7FA |
| Text Primary | #222222 |
| Text Secondary | #666666 |
| Divider | #ECEFF2 |

## 字体
- Title 32px Bold
- Section Title 16px SemiBold
- Body 14px Regular
- Caption 12px Regular

## 尺寸与阴影
- 卡片 radius 20px（小程序侧按 1px=2rpx）
- Header 卡片 shadow 0 4px 20px rgba(0,0,0,.05)
- Bottom Tab shadow 0 -4px 12px rgba(0,0,0,.05)
- 图片墙 3 列，gap 8px，单元 108×108，radius 12px

## SVG 绑定
- hero-gradient-bg / avatar-frame / story-empty / photo-add / icon-love / icon-match / icon-like / icon-view / nav-home / nav-near / nav-match / nav-message / nav-profile
- SVG 只做视觉皮肤，文字与用户数据由 Vue 渲染。
