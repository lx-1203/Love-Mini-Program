<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  compact?: boolean;
}>();
</script>

<template>
  <view class="card" :class="{ 'card--compact': compact }">
    <text class="card__title">{{ title }}</text>
    <text v-if="subtitle" class="card__subtitle">{{ subtitle }}</text>
    <view class="card__body">
      <slot />
    </view>
  </view>
</template>

<style scoped lang="scss">
.card {
  display: grid;
  gap: 14rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: var(--td-bg-color-container);
  box-shadow: var(--td-shadow-1);
}

.card--compact {
  padding: 24rpx;
}

.card__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.card__subtitle {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--td-text-color-secondary);
}

.card__body {
  display: grid;
  gap: 16rpx;
}
</style>
