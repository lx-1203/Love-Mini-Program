# 寻觅 V3 Icon / UI Asset Pack

## 目录
- `svg/`：可维护的 SVG 组件资产。图标主体使用 path/circle/rect 等矢量元素；中文标签保持为 live text，避免像素描字。
- `vue/`：uni-app/Vue3 可直接引入的轻量组件包装。请把 `svg/` 放到 `src/assets/xunmi/icons/`。
- `png/`：建议把原始复杂插画/照片类素材保留为位图，不强制“假矢量化”。本包没有伪造不可逆的照片路径。

## 重要说明
源文件是 AI 生成的整张 PNG，因此无法从像素层面保证“100% 还原”的真正原始 vector path。以下 SVG 是**按画面结构重新矢量化的可维护版本**，适合开发落地；复杂照片/猫脸等仍建议保留 PNG/WebP，避免失真和体积膨胀。

## 使用
```vue
<script setup lang="ts">
import XnHeartFill from '@/components/xunmi/icons/XnHeartFill.vue'
</script>
<template>
  <XnHeartFill class="w-6 h-6 text-[#FF5A91]" />
</template>
```

## 设计 token 建议
- Main green: `#17C98B`
- Heart pink: `#FF5A91`
- Deep green: `#16AE78`
- Mint surface: `#E8F8F1`
- Food accent: `#FFF1DB`
- Radius: 8 / 12 / 16 px
- Icon default stroke: 1.7–2.0 px
