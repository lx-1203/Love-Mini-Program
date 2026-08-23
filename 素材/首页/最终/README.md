# 寻觅 V3 SVG Path 素材包

包含：
- `svg/`：单文件 SVG，可直接作为静态资源
- `vue/`：Vue3 + TypeScript 单文件组件
- `sprite.svg`：symbol 雪碧图
- `index.ts`：组件导出
- `manifest.json`：资产清单

实现约束：
- 24×24 viewBox
- SVG 主体仅使用 path
- 使用 `currentColor`，可通过 CSS / Vue 变量统一换色
- 不嵌入任何 PNG/JPG

注意：你给出的图标表是栅格/AI生成结果，无法从像素反推出“原作者唯一的源 path”。因此这里是按该视觉稿进行可维护的矢量重绘，不伪称为原始 path 数据。像照片、风景、食物照片这类写实位图应继续作为 image asset 使用，而不是强行矢量化。
