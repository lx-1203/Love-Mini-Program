<script setup lang="ts">
import { appTabs, type AppTabId } from "../../config/navigation";

const props = defineProps<{
  title: string;
  subtitle?: string;
  currentTab?: AppTabId;
  showTabBar?: boolean;
}>();

function switchTab(path: string) {
  uni.switchTab({ url: path });
}
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

    <view v-if="props.showTabBar !== false" class="shell__tabbar">
      <button
        v-for="tab in appTabs"
        :key="tab.id"
        class="shell__tab"
        :class="{
          'shell__tab--active': tab.id === props.currentTab,
          'shell__tab--prominent': tab.prominent,
        }"
        @click="switchTab(tab.path)"
      >
        <view class="shell__tab-icon-wrap">
          <image
            class="shell__tab-icon"
            :src="tab.id === props.currentTab ? tab.activeIconPath : tab.iconPath"
            mode="aspectFit"
          />
        </view>
        <text class="shell__tab-label">{{ tab.label }}</text>
      </button>
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

.shell__tabbar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12rpx;
  align-items: end;
  padding: 18rpx 16rpx 16rpx;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  box-shadow: var(--td-shadow-2);
}

.shell__tab {
  display: grid;
  justify-items: center;
  gap: 6rpx;
  min-height: 88rpx;
  padding: 8rpx 0;
  border: 0;
  background: transparent;
  color: var(--td-text-color-secondary);
  font-size: 20rpx;
  line-height: 1;
}

.shell__tab--active {
  color: var(--td-brand-color-7);
}

.shell__tab--prominent {
  min-height: 112rpx;
  margin-top: -30rpx;
  padding: 14rpx 0 10rpx;
  border: 1px solid rgba(29, 78, 216, 0.18);
  border-radius: 24rpx;
  background: #fff;
  box-shadow: var(--td-shadow-2);
}

.shell__tab--prominent.shell__tab--active {
  border-color: rgba(29, 78, 216, 0.3);
  background: rgba(239, 246, 255, 0.92);
}

.shell__tab-icon-wrap {
  display: grid;
  place-items: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
}

.shell__tab--prominent .shell__tab-icon-wrap {
  width: 72rpx;
  height: 72rpx;
}

.shell__tab-icon {
  width: 40rpx;
  height: 40rpx;
}

.shell__tab--prominent .shell__tab-icon {
  width: 44rpx;
  height: 44rpx;
}

.shell__tab-label {
  font-size: 20rpx;
  font-weight: 600;
}
</style>
