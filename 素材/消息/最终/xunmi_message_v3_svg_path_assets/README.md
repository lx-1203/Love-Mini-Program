# 寻觅 消息 V3 — SVG Path 组件资产包

## 目标
将你提供的「消息首页 + 寻觅助手聊天页」视觉中的图标拆成可维护的 SVG Path 组件。

## 核心原则
- SVG 内不嵌入 PNG/JPG/WebP。
- 图标使用 `<path>` 绘制；不依赖外部 SVG `<use>`。
- Vue3 组件支持 `size` 与 `color`。
- 默认采用寻觅 V3 的绿色 `#34C38F`、心动粉 `#FF5A91`。
- 线性图标使用 `currentColor`，方便主题切换。
- 填充型状态图标使用品牌色，保证与参考稿一致。

## 目录
```text
xunmi_message_v3_svg_path_assets/
├── svg/                  # 独立 SVG 文件，可直接作为微信小程序/uni-app 静态资源
├── vue/                  # Vue 3 + TypeScript Path 组件
├── manifest.json         # 素材清单
└── README.md
```

## 典型用法
```vue
<script setup lang="ts">
import XnHeartLine from '@/components/xunmi/icons/XnHeartLine.vue'
import XnMessageFill from '@/components/xunmi/icons/XnMessageFill.vue'
</script>

<template>
  <XnHeartLine :size="24" color="#222222" />
  <XnMessageFill :size="24" />
</template>
```

## 小程序/uni-app
SVG 文件可以作为 `static/xunmi/icons/*.svg` 资源直接管理。若你的构建链对 SVG import 有限制，可继续使用 SVG 文件作为静态资源，或把 Path 内容内联到组件。

## 还原精度说明
参考图是 PNG，不包含原始 Figma/SVG Path 数据。因此这套资产属于“按参考稿重新矢量化”，不是原始设计文件路径导出。UI 级图标可做到高度一致；照片、人像和复杂助手插画不应硬转成 Path，应保留为 PNG/WebP 或独立插画 SVG。
