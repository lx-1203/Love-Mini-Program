# 寻觅 Post Detail Icon Assets V1

来源：用户提供的「帖子详情」界面截图，按截图中可独立复用的图标/徽标进行路径化重建。

## 目录

- `svg/`：每个图标一个独立 SVG，viewBox 统一为 `0 0 24 24`
- `vue/`：Vue 3 + TypeScript 单文件组件，直接内联 SVG Path
- `tokens.json`：推荐设计 Token

## 重要说明

这些 SVG 是依据截图进行“路径级重建”，不是从原设计文件导出的原始 vector source。
因此可直接用于开发、PNG/SVG 导出和二次维护，但不能声称与原始设计源文件数学意义上的 100% Path 数据一致。

头像、摄影图片等照片内容不适合强行转为 SVG Path；应作为 image asset 使用，并通过 SVG clipPath/mask 做圆形裁切。
