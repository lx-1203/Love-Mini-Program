<script setup lang="ts">
/**
 * LoadingState - 通用加载状态组件
 * 显示旋转加载动画和可选文字提示
 */
defineProps<{
  /** 加载提示文字，默认为"加载中..." */
  text?: string;
  /** 是否全屏显示，默认在父容器内居中 */
  fullscreen?: boolean;
}>();
</script>

<template>
  <view class="loading-state" :class="{ 'loading-state--fullscreen': fullscreen }">
    <view class="loading-state__spinner" />
    <text v-if="text" class="loading-state__text">{{ text }}</text>
    <text v-else class="loading-state__text">加载中...</text>
  </view>
</template>

<style scoped lang="scss">
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 60rpx 0;
}

.loading-state--fullscreen {
  min-height: 60vh;
}

.loading-state__spinner {
  width: 56rpx;
  height: 56rpx;
  border: 4rpx solid var(--td-bg-app-page, #e2e8f0);
  border-top-color: var(--td-brand-color-7, #1d4ed8);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state__text {
  font-size: 26rpx;
  color: var(--td-text-color-secondary, #475569);
}
</style>