# 寻觅 V3 Profile Icon Path Components

这是一套按当前提供的「个人主页图标主题」整理的可维护 SVG Path 组件。

## 目录
- `svg/`：可直接作为小程序静态资源引用的独立 SVG。
- `vue/`：uni-app / Vue 3 可直接注册使用的 SFC，内部只使用 `<path>` 几何，不依赖位图。
- `vue/index.ts`：统一导出。

## 设计基线
- 默认 viewBox：24×24（online 胶囊为 48×24）。
- 线性图标：2px stroke，round cap / join。
- 颜色通过 CSS variable 或 `currentColor` 控制，避免复制多套几何。
- 推荐尺寸：24 / 32 / 40 / 48 px。
- 不要把整张设计稿切成一个 SVG；每个 icon 独立维护。

## 示例

```vue
<script setup lang="ts">
import { NavProfileIcon, HeartFillIcon } from '@/components/icons'
</script>

<template>
  <NavProfileIcon :size="24" color="#34C38F" />
  <HeartFillIcon :size="24" color="#FF5A91" />
</template>
```

## 资源边界
头像、故事照片等真实照片不是 SVG Path 图标，应作为 PNG/WebP 独立资源；否则会导致不可维护且产生明显失真。
本包对“图标”做 Path 化拆分，图片类内容不强行伪矢量化。
