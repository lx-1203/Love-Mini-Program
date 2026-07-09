<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { AppTabId } from '../../config/navigation';

const props = defineProps<{
  title: string;
  subtitle?: string;
  currentTab?: AppTabId;
}>();

/** 页面淡入动画控制 */
const pageVisible = ref(false);

onShow(() => {
  pageVisible.value = false;
  void nextTick(() => {
    pageVisible.value = true;
  });
});
</script>

<template>
  <view class="shell" :class="{ 'page-fade-in': pageVisible }">
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
  min-height: 100%;
  height: 100%;
  padding: 28rpx 28rpx calc(constant(safe-area-inset-bottom) + 180rpx);
  padding: 28rpx 28rpx calc(env(safe-area-inset-bottom) + 180rpx);
  box-sizing: border-box;
}

.shell__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 28rpx;
}

.shell__header-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.shell__back {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  align-self: flex-start;
  margin-bottom: 16rpx;
  padding: 10rpx 16rpx 10rpx 10rpx;
  border-radius: 999rpx;
  background: var(--c-bg-surface);
  border: 1px solid var(--c-border-light);
}

.shell__back:active {
  opacity: 0.7;
}

.shell__back-icon {
  width: 28rpx;
  height: 28rpx;
}

.shell__back-text {
  font-size: 24rpx;
  color: var(--c-brand);
  font-weight: 500;
}

.shell__eyebrow,
.shell__subtitle {
  display: block;
  color: var(--c-text-secondary);
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
  color: var(--c-text-primary);
}

.shell__subtitle {
  margin-top: 8rpx;
  line-height: 1.6;
}

.shell__body {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

</style>
