<script setup lang="ts">
defineProps<{ bio: string }>();
</script>

<template>
  <view class="public-bio">
    <text class="public-bio__quote">❝</text>
    <text class="public-bio__text">{{ bio }}</text>
  </view>
</template>

<style scoped lang="scss">
.public-bio {
  margin: 24rpx 24rpx 0;
  padding: 24rpx 28rpx;
  border-radius: 32rpx;
  background: #F2F7F5;
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.public-bio__quote {
  font-size: 40rpx;
  color: #B7C4C0;
  line-height: 1;
}

.public-bio__text {
  flex: 1;
  font-size: 26rpx;
  line-height: 1.6;
  color: #444444;
}
</style>
