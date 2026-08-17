<script setup lang="ts">
defineEmits<{ (e: "invite"): void }>();
</script>

<template>
  <view class="invite-banner" @tap="$emit('invite')">
    <view class="invite-banner__icon">
      <text class="invite-banner__icon-text">🎁</text>
    </view>
    <view class="invite-banner__body">
      <text class="invite-banner__title">邀请好友一起寻觅</text>
      <text class="invite-banner__desc">遇见更多美好，解锁专属权益</text>
    </view>
    <view class="invite-banner__btn">
      <text class="invite-banner__btn-text">去邀请 ›</text>
    </view>
    <text class="invite-banner__wing">💗</text>
  </view>
</template>

<style scoped lang="scss">
.invite-banner {
  position: relative;
  margin: 0 40rpx 16rpx;
  padding: 24rpx 28rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #FF6B81 0%, #FF8DA1 100%);
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 129, 0.25);
  display: flex;
  align-items: center;
  gap: 20rpx;
  overflow: hidden;
}

.invite-banner__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.invite-banner__icon-text {
  font-size: 34rpx;
}

.invite-banner__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.invite-banner__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}

.invite-banner__desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.invite-banner__btn {
  padding: 14rpx 30rpx;
  border-radius: 999rpx;
  background: #ffffff;
}

.invite-banner__btn-text {
  font-size: 26rpx;
  color: #FF6B81;
  font-weight: 600;
}

.invite-banner__wing {
  position: absolute;
  right: -16rpx;
  bottom: -16rpx;
  font-size: 80rpx;
  opacity: 0.5;
}
</style>
