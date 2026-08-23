# 寻觅 Campus Circle Icon System — Path SVG 组件包

## 输出原则
- `viewBox="0 0 24 24"` 为基础图标坐标系。
- 图标使用 SVG `path / circle / rect` 等矢量几何，不嵌入 PNG/JPG。
- 默认使用 `currentColor`，开发侧可直接通过 CSS 控制颜色。
- 推荐在 16 / 20 / 24 / 32 px 下等比缩放。
- 默认线性图标建议 stroke-width 1.7–1.8。
- 激活态推荐 `#00B86B`；默认深色 `#1A1A1A`；辅助灰 `#667085`；禁用 `#C7CCD9`。
- 认证标签建议绿色底 `#E8FBEF` + `#00B86B`；未认证标签建议淡紫底 `#F3EEFF` + `#7C5CFF`。

## 文件
search / home / nearby / nearby-filled / match / message / profile /
graduation-cap / verified / unverified / chevron-down / chevron-right /
chevron-left / users / activity / pulse / more / dot / flame / star /
crown / shield / battery / signal / wifi

## 组件化
`vue/` 目录包含 Vue 3 + TypeScript 单图标组件。所有组件均以 path-based SVG 为核心，
不依赖图标字体、不依赖第三方图标库。

## 重要说明
原始截图中的学校照片、用户头像、文字、卡片阴影和页面布局不属于“图标 Path”，
因此没有伪装成 SVG Path。照片应作为 image asset；文字由页面字体渲染；卡片由 CSS/SVG
background 组件实现。这种拆分方式才适合长期维护和开发。

本包中的图标是依据当前提供的页面视觉规范重新矢量化的可维护版本。
若要求“像素级 100% 还原”，需要对原始高清图标源文件或 Figma 矢量源逐个进行路径校准。
