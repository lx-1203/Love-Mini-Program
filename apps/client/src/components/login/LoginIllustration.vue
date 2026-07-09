<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

defineProps<{
  emoji?: string;
}>();

const t = designTokens;
</script>

<template>
  <view class="illustration">
    <view class="illustration-bg" />
    <image class="illustration-img" src="/static/assets/icons/common/school.png" mode="aspectFit" />
  </view>
</template>

<style scoped>
.illustration {
  width: 400rpx;
  height: 320rpx;
  margin: 0 auto;
  border-radius: 48rpx;
  background: linear-gradient(135deg, v-bind('t.color.brand[100]'), v-bind('t.color.brand[50]'));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.illustration-bg {
  position: absolute;
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: v-bind('t.color.brand[400]');
  opacity: 0.08;
  top: 40rpx;
  left: -40rpx;
}
.illustration-bg::after {
  content: '';
  position: absolute;
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: v-bind('t.color.pink[400]');
  opacity: 0.06;
  bottom: 20rpx;
  right: -20rpx;
}
.illustration-emoji {
  font-size: 96rpx;
  z-index: 1;
}
</style>
