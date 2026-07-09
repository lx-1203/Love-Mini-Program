<script setup lang="ts">
defineProps<{
  durationSeconds: number;
  expired?: boolean;
}>();
</script>

<template>
  <view class="voice" :class="{ 'voice--expired': expired }">
    <text class="voice__icon">♪</text>
    <text>{{ durationSeconds }} 秒语音</text>
  </view>
</template>

<style scoped lang="scss">
.voice {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  width: fit-content;
  padding: 16rpx 22rpx;
  border-radius: 20rpx 4rpx 20rpx 20rpx;
  background: var(--c-bg-brand);
  color: var(--c-brand-700);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  transition: opacity 200ms ease;
  font-size: 26rpx;
}

.voice--expired {
  opacity: 0.48;
}

.voice__icon {
  font-weight: 700;
  font-size: 28rpx;
}
</style>
