<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

defineProps<{
  title?: string;
  subtitle?: string;
}>();

const t = designTokens;
</script>

<template>
  <view class="login-header">
    <!-- 品牌 Logo -->
    <view class="login-logo">
      <image
        class="login-logo-icon"
        src="/static/assets/icons/common/school.png"
        mode="aspectFit"
      />
    </view>
    <!-- 主标题 -->
    <text class="login-title">{{ title || '校园恋爱' }}</text>
    <!-- 副标题 -->
    <text class="login-subtitle">{{ subtitle || '在校园里，自然地遇见对的人' }}</text>
  </view>
</template>

<style scoped>
.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.login-logo {
  width: 144rpx;
  height: 144rpx;
  border-radius: 40rpx;
  background: v-bind('t.color.gradient.brand');
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(91, 127, 255, 0.3);
  margin-bottom: 12rpx;
}

.login-logo-icon {
  width: 72rpx;
  height: 72rpx;
  /* 白色 SVG 着色：通过 CSS filter 将图标转为白色 */
  filter: brightness(0) invert(1);
}

.login-title {
  font-size: 72rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.04em;
  text-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.25);
  line-height: 1.2;
}

.login-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  line-height: 1.6;
  letter-spacing: 0.02em;
  text-shadow: 0 1rpx 6rpx rgba(0, 0, 0, 0.15);
  max-width: 480rpx;
}
</style>