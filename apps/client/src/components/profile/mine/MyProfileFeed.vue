<script setup lang="ts">
import type { UserProfilePost } from "../../../types/profile";
import { profileSvg } from "../../../config/profile-svg";

defineProps<{
  posts: UserProfilePost[];
}>();

const emit = defineEmits<{ (e: "postTap", id: string): void }>();
</script>

<template>
  <view class="my-feed">
    <text class="my-feed__title">我的动态</text>
    <view v-if="posts.length > 0" class="my-feed__list">
      <view
        v-for="post in posts"
        :key="post.id"
        class="my-feed__card"
        hover-class="my-feed__card--pressed"
        @tap="emit('postTap', post.id)"
      >
        <image class="my-feed__bg" :src="profileSvg.feed.card" mode="aspectFill" alt="" />
        <view class="my-feed__body">
          <text class="my-feed__text">{{ post.content }}</text>
          <text class="my-feed__meta">{{ post.likes }} 赞 · {{ post.comments }} 评论</text>
        </view>
      </view>
    </view>
    <view v-else class="my-feed__empty">
      <image class="my-feed__empty-img" :src="profileSvg.feed.card" mode="aspectFit" alt="" />
      <text class="my-feed__empty-text">还没有动态</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-feed {
  margin: 24rpx 24rpx 0;
}

.my-feed__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #333A37;
}

.my-feed__card {
  position: relative;
  margin-bottom: 16rpx;
  border-radius: 32rpx;
  overflow: hidden;
  min-height: 240rpx;
}

.my-feed__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.my-feed__body {
  position: relative;
  padding: 24rpx;
}

.my-feed__card--pressed {
  opacity: 0.85;
}

.my-feed__text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  font-size: 28rpx;
  line-height: 1.5;
  color: #333A37;
}

.my-feed__meta {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #9AA39F;
}

.my-feed__empty {
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.my-feed__empty-img {
  width: 200rpx;
  height: 120rpx;
}

.my-feed__empty-text {
  font-size: 24rpx;
  color: #9AA39F;
}
</style>

