<script setup lang="ts">
import type { UserProfilePost } from "../../../types/profile";
import { IMAGE_PATHS } from "../../../config/images";

defineProps<{ posts: UserProfilePost[] }>();
</script>

<template>
  <view v-if="posts.length > 0" class="public-moment">
    <view class="public-moment__head">
      <text class="public-moment__title">最近动态</text>
      <text class="public-moment__more">···</text>
    </view>
    <view v-for="post in posts" :key="post.id" class="public-moment__card">
      <text class="public-moment__content">{{ post.content }}</text>
      <view v-if="post.images && post.images.length > 0" class="public-moment__images">
        <image
          v-for="(img, idx) in post.images.slice(0, 3)"
          :key="`${post.id}-${idx}`"
          class="public-moment__img"
          :src="img"
          mode="aspectFill"
          alt=""
        />
      </view>
      <view class="public-moment__footer">
        <view class="public-moment__stat">
          <image class="public-moment__stat-icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
          <text>{{ post.likes }}</text>
        </view>
        <text class="public-moment__stat">○ {{ post.comments }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.public-moment {
  margin: 24rpx 24rpx 0;
}

.public-moment__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.public-moment__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.public-moment__more {
  font-size: 36rpx;
  color: #9AA39F;
  line-height: 1;
}

.public-moment__card {
  margin-bottom: 16rpx;
  padding: 24rpx;
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.public-moment__content {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  font-size: 26rpx;
  line-height: 1.55;
  color: #333333;
}

.public-moment__images {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.public-moment__img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 32rpx;
  background: #EEF2F0;
}

.public-moment__footer {
  display: flex;
  gap: 24rpx;
  margin-top: 16rpx;
}

.public-moment__stat {
  font-size: 22rpx;
  color: #9AA39F;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.public-moment__stat-icon {
  width: 22rpx;
  height: 22rpx;
  color: #FF6B81;
}
</style>
