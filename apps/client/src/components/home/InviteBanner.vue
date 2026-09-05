<script setup lang="ts">
/**
 * 邀请好友 Banner
 * 2026-08-25 P0：文案接入 i18n（home.inviteTitle / home.inviteSubtitle），与规格书 3.15 对齐
 */
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";

const { t } = useI18n();
defineEmits<{ (e: "invite"): void }>();
</script>

<template>
  <view class="invite-banner" @tap="$emit('invite')">
    <view class="invite-banner__icon">
      <image class="invite-banner__icon-text" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.GIFT)" mode="aspectFit" alt="" />
    </view>
    <view class="invite-banner__body">
      <text class="invite-banner__title">{{ t('home.inviteTitle') }}</text>
      <text class="invite-banner__desc">{{ t('home.inviteSubtitle') }}</text>
    </view>
    <view class="invite-banner__btn">
      <text class="invite-banner__btn-text">去邀请</text>
    </view>
    <image class="invite-banner__wing" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED)" mode="aspectFit" alt="" />
  </view>
</template>

<style scoped lang="scss">
.invite-banner {
  position: relative;
  /* 2026-09-04 问题5修复：banner 下方由首页 .home-section-gap（tabBar 净空区）兜底，
     上方与 CommunityFeed 之间留 16rpx 间距即可，去掉原 16rpx 下 margin */
  margin: 16rpx 40rpx 0;
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
  width: 34rpx;
  height: 34rpx;
  color: #ffffff;
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
  width: 80rpx;
  height: 80rpx;
  color: #ffffff;
  opacity: 0.5;
}
</style>
