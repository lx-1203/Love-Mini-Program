<script setup lang="ts">
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
      <text class="today-heart__icon">❤️</text>
      <text class="today-heart__value">{{ counts.likedMeCount }}</text>
      <text class="today-heart__label">个人喜欢你</text>
    </view>
    <view class="today-heart__card today-heart__card--waiting" hover-class="today-heart__card--hover" @tap="emit('tapWaiting')">
      <text class="today-heart__icon">💬</text>
      <text class="today-heart__value">{{ counts.waitingReplyCount }}</text>
      <text class="today-heart__label">个等待回应</text>
    </view>
    <view class="today-heart__card today-heart__card--warming" hover-class="today-heart__card--hover" @tap="emit('tapWarming')">
      <text class="today-heart__icon">✨</text>
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
  border: 1rpx solid #ECEFF2;
}
.today-heart__card--hover {
  opacity: 0.8;
}
.today-heart__icon {
  font-size: 40rpx;
}
.today-heart__value {
  font-size: 40rpx;
  font-weight: 800;
  color: #222222;
}
.today-heart__label {
  font-size: 22rpx;
  color: #666666;
}
</style>
