# 寻觅 Match / Lake Sunset Icon System V1

本包将参考图中的核心 UI 图标重构为可维护的 SVG Path 组件。

## 设计原则
- 所有核心图标采用 `viewBox="0 0 24 24"` 或 `0 0 48 48`，避免嵌入位图。
- 图形主体使用 `<path>`，颜色通过 `currentColor` 控制，方便 uni-app / Vue / React 重用。
- 默认尺寸：24 / 32 / 48 px；需要更大尺寸时只需调整 width/height。
- 主色：#34C38F；心动粉：#FF5A91；深绿：#168B65；辅助灰：#A8ADB7。

## 文件结构
- `svg/`：可直接作为静态 SVG 资源。
- `vue/`：Vue 3 单文件组件，内部为 path SVG，可直接放到 `components/icons/`。
- `meta/icon-manifest.json`：名称、语义、默认尺寸、颜色建议。

## 重要说明
这些 SVG 是依据用户提供的 UI 截图进行“路径级重构”，不是把原始 PNG 直接包装成 SVG。因此具备可缩放、可换色、可维护的优点；但截图本身是栅格图，无法从单张 PNG 证明每一个原始矢量控制点，所以不能宣称像素级 100% 原厂 Path 数据。
