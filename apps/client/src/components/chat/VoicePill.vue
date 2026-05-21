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
  padding: 14rpx 18rpx;
  border-radius: 18rpx;
  background: var(--td-brand-color-1);
  color: var(--td-brand-color-7);
}

.voice--expired {
  opacity: 0.54;
}

.voice__icon {
  font-weight: 700;
}
</style>
