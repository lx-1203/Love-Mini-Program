<script setup lang="ts">
/**
 * XunmiHeartPulse — 心跳脉冲动画组件
 * 用于匹配中页面中心跳动爱心、匹配成功大爱心等场景
 */
withDefaults(defineProps<{
  size?: number;
  color?: string;
  animated?: boolean;
}>(), {
  size: 96,
  color: '#FF6B81',
  animated: true,
});
</script>

<template>
  <view class="heart-pulse" :class="{ 'heart-pulse--animated': animated }">
    <view class="heart-pulse__core" :style="{ width: size + 'rpx', height: size + 'rpx' }">
      <text class="heart-pulse__icon" :style="{ color, fontSize: size * 0.7 + 'rpx' }">&#9829;</text>
    </view>
    <!-- 雷达波纹层 -->
    <view class="heart-pulse__rings">
      <view class="heart-pulse__ring heart-pulse__ring--1" :style="{ borderColor: color }" />
      <view class="heart-pulse__ring heart-pulse__ring--2" :style="{ borderColor: color }" />
      <view class="heart-pulse__ring heart-pulse__ring--3" :style="{ borderColor: color }" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.heart-pulse {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.heart-pulse__core {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.heart-pulse--animated .heart-pulse__core {
  animation: heartbeat 1.2s ease-in-out infinite;
}

.heart-pulse__icon {
  line-height: 1;
}

.heart-pulse__rings {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.heart-pulse__ring {
  position: absolute;
  border-radius: 50%;
  border-style: solid;
  border-width: 2rpx;
  opacity: 0;
}

.heart-pulse--animated .heart-pulse__ring--1 {
  animation: ripple 2.4s ease-out infinite;
}

.heart-pulse--animated .heart-pulse__ring--2 {
  animation: ripple 2.4s ease-out 0.8s infinite;
}

.heart-pulse--animated .heart-pulse__ring--3 {
  animation: ripple 2.4s ease-out 1.6s infinite;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.15); }
  30% { transform: scale(1); }
  45% { transform: scale(1.08); }
}

@keyframes ripple {
  0% {
    width: 100%;
    height: 100%;
    opacity: 0.4;
  }
  100% {
    width: 300%;
    height: 300%;
    opacity: 0;
  }
}
</style>
