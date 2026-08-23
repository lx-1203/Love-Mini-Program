<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";

defineProps<{
  count: number;
}>();

const emit = defineEmits<{
  tap: [];
}>();

const icon = IMAGE_PATHS.MESSAGE_ICONS.LIKE_NOTICE;
</script>

<template>
  <view class="heart-notice" hover-class="heart-notice--hover" @tap="emit('tap')">
    <image class="heart-notice__icon" :src="icon" mode="aspectFit" />
    <view class="heart-notice__body">
      <text class="heart-notice__title">有人喜欢你</text>
      <text class="heart-notice__desc">{{ count }}个人想认识你</text>
    </view>
    <view class="heart-notice__cta">
      <text class="heart-notice__cta-text">查看</text>
      <text class="heart-notice__arrow">›</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.heart-notice {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 16rpx 32rpx;
  padding: 24rpx;
  border-radius: 40rpx;
  background: #E8F8F1;
  min-height: 176rpx;
}
.heart-notice--hover {
  opacity: 0.85;
}
.heart-notice__icon {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
}
.heart-notice__body {
  flex: 1;
  min-width: 0;
}
.heart-notice__title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #333A37;
}
.heart-notice__desc {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #666666;
}
.heart-notice__cta {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.heart-notice__cta-text {
  font-size: 28rpx;
  color: #36C99A;
  font-weight: 600;
}
.heart-notice__arrow {
  font-size: 32rpx;
  color: #36C99A;
}
</style>
