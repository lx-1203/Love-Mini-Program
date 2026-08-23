<script setup lang="ts">
/**
 * XunmiMatchRing — 匹配度环形进度组件
 * 用于匹配卡片右下角、推荐卡片合拍度徽章等场景
 * Props:
 *   score  - 匹配度百分比 0-100
 *   size   - 环的直径 rpx，默认 128rpx
 *   showLabel - 是否显示"匹配度"文字，默认 true
 */
withDefaults(defineProps<{
  score?: number;
  size?: number;
  showLabel?: boolean;
}>(), {
  score: 0,
  size: 128,
  showLabel: true,
});
</script>

<template>
  <view class="match-ring" :style="{ width: size + 'rpx', height: size + 'rpx' }">
    <view class="match-ring__bg" />
    <view class="match-ring__inner">
      <text class="match-ring__score">{{ score }}%</text>
      <text v-if="showLabel" class="match-ring__label">匹配度</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.match-ring {
  position: relative;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.match-ring__bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(#36C99A 0%, #55D5A7 var(--ring-pct, 0%), rgba(0,0,0,0.15) var(--ring-pct, 0%));
  mask: radial-gradient(farthest-side, transparent calc(100% - 8rpx), #000 calc(100% - 8rpx));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 8rpx), #000 calc(100% - 8rpx));
}

.match-ring__inner {
  position: absolute;
  inset: 10rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.match-ring__score {
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1;
}

.match-ring__label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4rpx;
}
</style>
