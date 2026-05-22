<script setup lang="ts">
/**
 * @deprecated 首页已降级为废弃页面，仅供参考回滚使用。
 * 迁移路径：home → discover（寻觅页）
 * AI 计划功能已移除，匹配逻辑已融入卡片喜欢系统。
 * 原课表编辑器降级为 profile 中的资料字段（可显示但不可编辑）。
 * 请使用 /pages/discover/index 作为新的主入口。
 */
import HomePage from "../../../pages/home/index.vue";
</script>

<template>
  <HomePage />
</template>
