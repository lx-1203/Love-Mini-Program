<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";

defineProps<{
  counts: { likedMeCount: number; waitingReplyCount: number; warmingCount: number };
}>();

const emit = defineEmits<{
  tapLikes: [];
  tapWaiting: [];
  tapWarming: [];
}>();
</script>

<template>
  <view class="today-heart">
    <view class="today-heart__card today-heart__card--likes" hover-class="today-heart__card--hover" @tap="emit('tapLikes')">
      <image class="today-heart__icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <text class="today-heart__value">{{ counts.likedMeCount }}</text>
      <text class="today-heart__label">个人喜欢你</text>
    </view>
    <view class="today-heart__card today-heart__card--waiting" hover-class="today-heart__card--hover" @tap="emit('tapWaiting')">
      <image class="today-heart__icon" :src="IMAGE_PATHS.ICONS_EMOJI.COMMENT" mode="aspectFit" alt="" />
      <text class="today-heart__value">{{ counts.waitingReplyCount }}</text>
      <text class="today-heart__label">个等待回应</text>
    </view>
    <view class="today-heart__card today-heart__card--warming" hover-class="today-heart__card--hover" @tap="emit('tapWarming')">
      <image class="today-heart__icon" :src="IMAGE_PATHS.ICONS_EMOJI.SPARKLES" mode="aspectFit" alt="" />
      <text class="today-heart__value">{{ counts.warmingCount }}</text>
      <text class="today-heart__label">个正在升温</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.today-heart {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 32rpx;
}
.today-heart__card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx 12rpx;
  border-radius: 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #EEF2F0;
}
.today-heart__card--hover {
  opacity: 0.8;
}
.today-heart__icon {
  width: 40rpx;
  height: 40rpx;
  color: #FF6B81;
}
.today-heart__value {
  font-size: 40rpx;
  font-weight: 800;
  color: #333A37;
}
.today-heart__label {
  font-size: 22rpx;
  color: #666666;
}
</style>

