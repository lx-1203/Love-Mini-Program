<script setup lang="ts">
import type { CommunityPostViewModel } from "../../view-models/home-dashboard";

defineProps<{ items: CommunityPostViewModel[] }>();
defineEmits<{ (e: "more"): void; (e: "select", id: number): void }>();
</script>

<template>
  <view class="community-feed">
    <view class="section-head">
      <text class="section-head__title">社区动态</text>
      <text class="section-head__more" @tap="$emit('more')">查看更多 ›</text>
    </view>

    <view v-if="items.length === 0" class="community-feed__empty">今天还没有新的动态，去附近看看</view>
    <scroll-view v-else scroll-x class="community-feed__scroll" :show-scrollbar="false">
      <view class="community-feed__list">
        <view v-for="post in items" :key="post.id" class="post-card" @tap="$emit('select', post.id)">
          <view class="post-card__head">
            <image class="post-card__avatar" :src="post.authorAvatar || ''" mode="aspectFill" alt="" />
            <view class="post-card__author">
              <view class="post-card__name-row">
                <text class="post-card__name">{{ post.authorName }}</text>
                <text class="post-card__school">· {{ post.circleName }}</text>
              </view>
              <text class="post-card__time">{{ post.timeText }}</text>
            </view>
            <view class="post-card__follow">
              <text class="post-card__follow-text">关注</text>
            </view>
          </view>
          <text class="post-card__content">{{ post.content }}</text>
          <view v-if="post.images.length" class="post-card__images">
            <image v-for="img in post.images.slice(0, 3)" :key="img" class="post-card__img" :src="img" mode="aspectFill" alt="" />
          </view>
          <view class="post-card__meta">
            <text class="post-card__stat post-card__stat--like">♥ {{ post.likeCount }}</text>
            <text class="post-card__stat">○ {{ post.commentCount }}</text>
            <text class="post-card__stat">↗</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.community-feed {
  padding: 8rpx 32rpx 16rpx;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0 12rpx;
}

.section-head__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #222222;
}

.section-head__more {
  font-size: 22rpx;
  color: #999999;
}

.community-feed__empty {
  padding: 32rpx;
  border-radius: 20rpx;
  background: #ffffff;
  border: 1rpx solid #ECEFF2;
  color: #999999;
  font-size: 22rpx;
  text-align: center;
}

.community-feed__scroll {
  width: 100%;
}

.community-feed__list {
  display: inline-flex;
  gap: 16rpx;
  padding-right: 16rpx;
}

.post-card {
  width: 320rpx;
  flex-shrink: 0;
  padding: 20rpx;
  border-radius: 20rpx;
  background: #ffffff;
  border: 1rpx solid #ECEFF2;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.04);
}

.post-card__head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.post-card__avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #F0F2F5;
  flex-shrink: 0;
}

.post-card__author {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.post-card__name-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
  min-width: 0;
}

.post-card__name {
  font-size: 24rpx;
  font-weight: 700;
  color: #222222;
}

.post-card__school {
  font-size: 18rpx;
  color: #168B65;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.post-card__time {
  font-size: 18rpx;
  color: #999999;
}

.post-card__follow {
  flex-shrink: 0;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: #E8FBF2;
}

.post-card__follow-text {
  font-size: 20rpx;
  color: #168B65;
  font-weight: 600;
}

.post-card__content {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #333333;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-card__images {
  display: flex;
  gap: 8rpx;
  margin-top: 14rpx;
}

.post-card__img {
  width: 88rpx;
  height: 88rpx;
  border-radius: 10rpx;
  background: #F0F2F5;
}

.post-card__meta {
  display: flex;
  gap: 20rpx;
  margin-top: 14rpx;
}

.post-card__stat {
  font-size: 20rpx;
  color: #999999;
}

.post-card__stat--like {
  color: #FF6B81;
}
</style>
