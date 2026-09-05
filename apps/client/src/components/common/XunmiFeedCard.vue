<script setup lang="ts">
/**
 * XunmiFeedCard — 社区动态 Feed 卡片组件
 * 用于首页社区动态、个人主页最近动态
 */
defineProps<{
  avatar?: string;
  nickname?: string;
  school?: string;
  time?: string;
  content?: string;
  images?: string[];
  likes?: number;
  comments?: number;
  shares?: number;
}>();
</script>

<template>
  <view class="feed-card">
    <view class="feed-card__head">
      <view class="feed-card__user">
        <view class="feed-card__avatar-wrap">
          <image v-if="avatar" class="feed-card__avatar" :src="avatar" mode="aspectFill" />
          <view v-else class="feed-card__avatar-placeholder" />
        </view>
        <view class="feed-card__info">
          <view class="feed-card__name-row">
            <text class="feed-card__name">{{ nickname }}</text>
            <view v-if="school" class="feed-card__school-tag">
              <text class="feed-card__school-text">{{ school }}</text>
            </view>
          </view>
          <text class="feed-card__time">{{ time }}</text>
        </view>
      </view>
      <view class="feed-card__follow" hover-class="feed-card__follow--pressed">
        <text class="feed-card__follow-text">关注</text>
      </view>
    </view>

    <text v-if="content" class="feed-card__content">{{ content }}</text>

    <view v-if="images && images.length" class="feed-card__images">
      <view
        v-for="(img, i) in images.slice(0, 3)"
        :key="i"
        class="feed-card__img-wrap"
      >
        <image class="feed-card__img" :src="img" mode="aspectFill" />
      </view>
    </view>

    <view class="feed-card__actions">
      <view class="feed-card__action">
        <text class="feed-card__action-icon">&#9825;</text>
        <text class="feed-card__action-text">{{ likes || 0 }}</text>
      </view>
      <view class="feed-card__action">
        <text class="feed-card__action-icon">&#9993;</text>
        <text class="feed-card__action-text">{{ comments || 0 }}</text>
      </view>
      <view class="feed-card__action">
        <text class="feed-card__action-icon">&#8618;</text>
        <text class="feed-card__action-text">{{ shares || 0 }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.feed-card {
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.feed-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.feed-card__user {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.feed-card__avatar-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.feed-card__avatar {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}

.feed-card__avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #EEF2F0;
}

.feed-card__info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.feed-card__name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.feed-card__name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333A37;
}

.feed-card__school-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #E8FAF3;
}

.feed-card__school-text {
  font-size: 20rpx;
  color: #36C99A;
  font-weight: 500;
}

.feed-card__time {
  font-size: 24rpx;
  color: #9AA39F;
}

.feed-card__follow {
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  border: 2rpx solid #36C99A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feed-card__follow--pressed {
  opacity: 0.7;
}

.feed-card__follow-text {
  font-size: 24rpx;
  color: #36C99A;
  font-weight: 500;
}

.feed-card__content {
  font-size: 28rpx;
  color: #4A524E;
  line-height: 44rpx;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feed-card__images {
  display: flex;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.feed-card__img-wrap {
  flex: 1;
  aspect-ratio: 1;
  border-radius: 16rpx;
  overflow: hidden;
}

.feed-card__img {
  width: 100%;
  height: 100%;
}

.feed-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 40rpx;
}

.feed-card__action {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.feed-card__action-icon {
  font-size: 32rpx;
  color: #9AA39F;
}

.feed-card__action-text {
  font-size: 24rpx;
  color: #6B7571;
}
</style>
