<script setup lang="ts">
/**
 * EmptyState - 通用空状态组件
 * 显示空状态占位、消息和操作按钮
 */
defineProps<{
  /** 空状态提示信息，默认为"暂无数据" */
  message?: string;
  /** 操作按钮文字，不传则不显示按钮 */
  actionText?: string;
  /** 是否全屏显示 */
  fullscreen?: boolean;
}>();

const emit = defineEmits<{
  /** 用户点击操作按钮时触发 */
  action: [];
}>();
</script>

<template>
  <view class="empty-state" :class="{ 'empty-state--fullscreen': fullscreen }">
    <view class="empty-state__illustration">
      <view class="empty-state__circle" />
      <view class="empty-state__circle empty-state__circle--small" />
    </view>
    <text class="empty-state__message">{{ message || '暂无数据' }}</text>
    <button
      v-if="actionText"
      class="empty-state__action-btn"
      @click="emit('action')"
    >
      {{ actionText }}
    </button>
  </view>
</template>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28rpx;
  padding: 80rpx 0;
}

.empty-state--fullscreen {
  min-height: 60vh;
}

.empty-state__illustration {
  position: relative;
  width: 120rpx;
  height: 120rpx;
}

.empty-state__circle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80rpx;
  height: 80rpx;
  border: 4rpx dashed var(--td-border-level-1-color, #dbe2ea);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.6;
}

.empty-state__circle--small {
  width: 40rpx;
  height: 40rpx;
  opacity: 0.35;
}

.empty-state__message {
  font-size: 26rpx;
  color: var(--td-text-color-secondary, #475569);
  text-align: center;
  line-height: 1.6;
}

.empty-state__action-btn {
  min-width: 160rpx;
  height: 72rpx;
  padding: 0 32rpx;
  border: 0;
  border-radius: 36rpx;
  background: var(--td-brand-color-7, #1d4ed8);
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 72rpx;
}
</style>