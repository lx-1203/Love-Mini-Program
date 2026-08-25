<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";
import type { TodayRecommendationViewModel } from "../../view-models/home-dashboard";

defineProps<{ item: TodayRecommendationViewModel | null; loading?: boolean; likeLoading?: boolean }>();
defineEmits<{ (e: "view"): void; (e: "like"): void; (e: "rotate"): void }>();
</script>

<template>
  <view class="today-card">
    <view class="today-card__head">
      <view class="today-card__titles">
        <text class="today-card__title">今日推荐</text>
      </view>
      <text class="today-card__rotate" @tap="$emit('rotate')">↻ 换一位</text>
    </view>

    <view v-if="loading" class="today-card__skeleton">正在为你挑选心动的人…</view>
    <view v-else-if="!item" class="today-card__empty">今天暂时没有合适的推荐，晚一点再来看看</view>
    <view v-else class="today-card__body">
      <view class="today-card__photo-wrap">
        <image class="today-card__photo" :src="item.photoUrl || ''" mode="aspectFill" alt="" />
        <view v-if="item.online" class="today-card__online">
          <text class="today-card__online-dot"></text>
          <text class="today-card__online-text">在线</text>
        </view>
        <view class="today-card__match-badge">
          <text class="today-card__match-score">{{ item.matchScore }}%</text>
          <text class="today-card__match-label">合拍度</text>
        </view>
      </view>

      <view class="today-card__info">
        <text class="today-card__name">{{ item.name }}</text>
        <text class="today-card__meta">{{ item.age }}岁 · {{ item.campusName }}{{ item.gradeLabel ? ' · ' + item.gradeLabel : '' }}</text>
        <view v-if="item.tags.length" class="today-card__tags">
          <text v-for="tag in item.tags.slice(0, 4)" :key="tag" class="today-card__tag">{{ tag }}</text>
        </view>
        <text v-if="item.bio" class="today-card__bio">{{ item.bio }}</text>
        <text v-if="item.expectation" class="today-card__expect">{{ item.expectation }}</text>
        <text class="today-card__distance">
          {{ item.distanceText || '' }}<text v-if="item.distanceText && item.certified"> · </text><text v-if="item.certified">已认证</text><text v-if="item.constellation"> · {{ item.constellation }}</text>
        </text>
        <view class="today-card__actions">
          <view class="today-card__btn today-card__btn--outline" @tap="$emit('view')">看看TA</view>
          <view class="today-card__btn today-card__btn--love" :class="{ 'today-card__btn--loading': likeLoading }" @tap="$emit('like')">
            <image class="today-card__btn-icon" :src="IMAGE_PATHS.HOME_ICONS.BTN_LIKE" mode="aspectFit" />
            <text>喜欢</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.today-card {
  margin: 0 32rpx 16rpx;
  padding: 24rpx;
  border-radius: 40rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.today-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.today-card__titles {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10rpx;
}

.today-card__title {
  font-size: 32rpx;
  font-weight: 800;
  color: #222222;
}

.today-card__pick {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: #FFF0F6;
}

.today-card__pick-text {
  font-size: 22rpx;
  color: #FF6B81;
  font-weight: 600;
}

.today-card__rotate {
  font-size: 22rpx;
  color: #999999;
}

.today-card__skeleton,
.today-card__empty {
  height: 320rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999999;
  font-size: 24rpx;
}

.today-card__body {
  display: flex;
  gap: 20rpx;
}

.today-card__photo-wrap {
  position: relative;
  width: 320rpx;
  height: 440rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
  overflow: hidden;
  background: #E8FBF2;
}

.today-card__photo {
  width: 100%;
  height: 100%;
}

.today-card__online {
  position: absolute;
  left: 12rpx;
  top: 12rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: #36C99A;
}

.today-card__online-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #ffffff;
}

.today-card__online-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 700;
}

.today-card__match-badge {
  position: absolute;
  left: 12rpx;
  bottom: 12rpx;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #FF6B81;
  box-shadow: 0 8rpx 20rpx rgba(255, 90, 145, 0.25);
}

.today-card__match-score {
  font-size: 22rpx;
  font-weight: 800;
  color: #FFFFFF;
}

.today-card__match-label {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.92);
}

.today-card__info {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.today-card__name {
  font-size: 44rpx;
  font-weight: 700;
  color: #333A37;
}

.today-card__meta {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #9AA39F;
}

.today-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}

.today-card__tag {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #E8FAF3;
  color: #36C99A;
  font-size: 22rpx;
  font-weight: 500;
}

.today-card__bio {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #333333;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.today-card__expect {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #999999;
}

.today-card__distance {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #36C99A;
}

.today-card__actions {
  display: flex;
  gap: 12rpx;
  margin-top: auto;
  padding-top: 16rpx;
}

.today-card__btn {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
}

.today-card__btn--outline {
  background: #FFFFFF;
  border: 2rpx solid #36C99A;
  color: #36C99A;
}

.today-card__btn--love {
  background: #FF6B81;
  color: #FFFFFF;
}

.today-card__btn-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: 6rpx;
}

.today-card__btn--loading {
  opacity: 0.6;
}
</style>

