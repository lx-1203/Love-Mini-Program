<script setup lang="ts">
/**
 * ErrorState - 通用错误状态组件
 * 显示错误图标、消息和重试按钮
 */
defineProps<{
  /** 错误提示信息，默认为"加载失败" */
  message?: string;
  /** 重试按钮文字，默认为"重试" */
  retryText?: string;
  /** 是否全屏显示 */
  fullscreen?: boolean;
}>();

const emit = defineEmits<{
  /** 用户点击重试按钮时触发 */
  retry: [];
}>();
</script>

<template>
  <view class="error-state" :class="{ 'error-state--fullscreen': fullscreen }">
    <view class="error-state__icon">!</view>
    <text class="error-state__message">{{ message || '加载失败，请稍后重试' }}</text>
    <button class="error-state__retry-btn" @click="emit('retry')">
      {{ retryText || '重试' }}
    </button>
  </view>
</template>

<style scoped lang="scss">
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 60rpx 0;
}

.error-state--fullscreen {
  min-height: 60vh;
}

.error-state__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(190, 18, 60, 0.1);
  color: #be123c;
  font-size: 40rpx;
  font-weight: 700;
}

.error-state__message {
  font-size: 26rpx;
  color: var(--td-text-color-secondary, #475569);
  text-align: center;
  line-height: 1.6;
}

.error-state__retry-btn {
  min-width: 160rpx;
  height: 72rpx;
  padding: 0 32rpx;
  border: 1px solid var(--td-brand-color-7, #1d4ed8);
  border-radius: 36rpx;
  background: transparent;
  color: var(--td-brand-color-7, #1d4ed8);
  font-size: 26rpx;
  font-weight: 600;
  line-height: 72rpx;
}
</style>