<script setup lang="ts">
import type { AppTabId } from "../../config/navigation";

const props = defineProps<{
  title: string;
  subtitle?: string;
  currentTab?: AppTabId;
}>();
</script>

<template>
  <view class="shell">
    <view class="shell__header">
      <view>
        <text class="shell__eyebrow">校园恋爱</text>
        <text class="shell__title">{{ props.title }}</text>
        <text v-if="props.subtitle" class="shell__subtitle">{{ props.subtitle }}</text>
      </view>
      <slot name="header-right" />
    </view>

    <view class="shell__body">
      <slot />
    </view>

  </view>
</template>

<style scoped lang="scss">
.shell {
  min-height: 100vh;
  padding: 28rpx 28rpx 236rpx;
  box-sizing: border-box;
}

.shell__header {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 28rpx;
}

.shell__eyebrow,
.shell__subtitle {
  display: block;
  color: var(--td-text-color-secondary);
  font-size: 24rpx;
}

.shell__eyebrow {
  margin-bottom: 8rpx;
  letter-spacing: 0;
}

.shell__title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.shell__subtitle {
  margin-top: 8rpx;
  line-height: 1.6;
}

.shell__body {
  display: grid;
  gap: 24rpx;
}

</style>
