# 寻觅「摄影圈」图标资产系统 V1

## 目标
- 统一 24×24 基准网格
- 默认 `currentColor`，避免把颜色写死在 SVG
- 默认线宽 1.8px，圆角端点与圆角连接
- 组件可直接用于 Vue3 + TypeScript + uni-app
- SVG 文件可直接导入、转 PNG 或加入 SVG Sprite

## 推荐颜色
- 主绿：#00B86B
- 正文/图标：#1A1A1A
- 次要：#667085
- 强调粉：#FF5A70
- 白色：#FFFFFF

## 尺寸
推荐 16 / 20 / 24 / 32 / 48px。
设计基准为 24px；不要为不同尺寸重新画路径，只缩放 viewBox。

## Vue
```vue
<script setup lang="ts">
import { HeartIcon, MessageIcon } from '@/design-system/xunmi-photography-icon-system-v1/vue'
</script>

<HeartIcon :size="24" :stroke-width="1.8" />
<MessageIcon :size="24" />
```

## CSS
```css
.x-icon {
  color: #1A1A1A;
}
.x-icon.is-active {
  color: #00B86B;
}
```

## 说明
本包针对用户提供的「摄影圈详情页」视觉语言进行整理：细线、圆角、低对比灰、寻觅主绿，并将页面中最核心的导航、互动、内容、媒体和圈子图标拆成独立 SVG Path 组件。
