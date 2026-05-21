<script setup lang="ts">
defineProps<{
  tone?: "brand" | "success" | "warning";
  label: string;
}>();
</script>

<template>
  <text class="pill" :class="[`pill--${tone || 'brand'}`]">{{ label }}</text>
</template>

<style scoped lang="scss">
.pill {
  display: inline-flex;
  width: fit-content;
  padding: 8rpx 16rpx;
  border-radius: 999px;
  font-size: 22rpx;
  font-weight: 600;
}

.pill--brand {
  background: var(--td-brand-color-1);
  color: var(--td-brand-color-7);
}

.pill--success {
  background: rgba(15, 118, 110, 0.12);
  color: var(--td-success-color);
}

.pill--warning {
  background: rgba(180, 83, 9, 0.12);
  color: var(--td-warning-color);
}
</style>
