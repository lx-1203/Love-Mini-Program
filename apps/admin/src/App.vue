<script setup lang="ts">
/**
 * Admin v2 根组件：仅作为 router-view 的根容器。
 *
 * 2026-10-29：英文版不上线，语言切换入口（独立页浮层 + Layout 头像下拉）
 * 与 en-US 语言包一并移除；后台固定 zh-CN。
 * 会话恢复（bootstrap）由 main.ts 负责，此处不再重复调用。
 */
</script>

<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<style>
.app-container {
  width: 100%;
  min-height: 100vh;
  background-color: var(--admin-color-bg-page);
}
</style>
