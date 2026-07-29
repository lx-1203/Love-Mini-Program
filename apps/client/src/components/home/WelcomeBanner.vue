<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  greeting?: string;
  subtitle?: string;
  tags?: string[];
}>();

const { t } = useI18n();

// 修复（严格模式 noUnusedLocals）：原 `const t = designTokens;` 后未使用 t，
// designTokens 导入也仅用于该别名；模板/style 未引用 designTokens，故导入与别名一并移除。
</script>

<template>
  <view class="banner">
    <view class="banner-bg">
      <view class="banner-deco banner-deco--1" />
      <view class="banner-deco banner-deco--2" />
      <view class="banner-deco banner-deco--3" />
    </view>
    <view class="banner-content">
      <text class="banner-greeting">{{ greeting || t('home.bannerGreetingDefault') }}</text>
      <text class="banner-sub">{{ subtitle || t('home.bannerSubtitleDefault') }}</text>
      <view class="banner-tags" v-if="tags && tags.length > 0">
        <view v-for="(tag, idx) in tags" :key="idx" class="banner-tag">
          <text class="banner-tag-text">{{ tag }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.banner {
  margin: 0 16rpx;
  border-radius: var(--r-lg);
  overflow: hidden;
  position: relative;
}
.banner::before {
  content: '';
  position: absolute;
  top: -100rpx;
  left: -32rpx;
  right: -32rpx;
  height: 300rpx;
  background: var(--c-gradient-page);
  z-index: -1;
  border-radius: 0 0 var(--r-xl, 40rpx) var(--r-xl, 40rpx);
}
.banner-bg {
  position: absolute;
  inset: 0;
  background: var(--c-gradient-brand);
  z-index: 0;
}
.banner-bg::after {
  content: '';
  position: absolute;
  width: 300rpx;
  height: 300rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint-mid, rgba(255,255,255,0.1));
  top: -80rpx;
  right: -60rpx;
  animation: breathe var(--d-breathe-slow, 4000ms) ease-in-out infinite alternate;
}

.banner-deco {
  position: absolute;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.08));
  pointer-events: none;
}

.banner-deco--1 {
  width: 200rpx;
  height: 200rpx;
  bottom: -60rpx;
  left: -40rpx;
  background: var(--c-overlay-white-bg-tint-strong, rgba(255, 255, 255, 0.12));
  animation: breathe var(--d-breathe-slow, 5000ms) ease-in-out infinite alternate;
}

.banner-deco--2 {
  width: 160rpx;
  height: 160rpx;
  top: 40rpx;
  right: 80rpx;
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.08));
  animation: breathe var(--d-breathe-slow, 4500ms) ease-in-out infinite alternate-reverse;
}

.banner-deco--3 {
  width: 120rpx;
  height: 120rpx;
  bottom: 40rpx;
  right: -30rpx;
  background: var(--c-overlay-white-bg-tint-mid, rgba(255, 255, 255, 0.1));
  animation: breathe var(--d-breathe, 3500ms) ease-in-out infinite alternate;
}

@keyframes breathe {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.05);
    opacity: 1;
  }
}
.banner-content {
  position: relative;
  z-index: 1;
  padding: 32rpx;
}
.banner-greeting {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
  position: relative;
}
.banner-sub {
  font-size: var(--fs-base);
  color: var(--c-overlay-text-secondary, rgba(255,255,255,0.85));
  margin-top: 8rpx;
  position: relative;
  line-height: 1.5;
}
.banner-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
  position: relative;
}
.banner-tag {
  padding: 8rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-bg-light, rgba(255,255,255,0.2));
  /* mp-weixin 不支持，H5 保留毛玻璃；白字+白底场景保留低不透明度避免文字不可见 */
  // #ifdef H5
  backdrop-filter: blur(16rpx);
  // #endif
}
.banner-tag-text {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--c-text-inverse, #FFFFFF);
}
</style>
