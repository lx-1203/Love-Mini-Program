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
  /* R20（2026-09-08）：高饱和粉渐变（#FF6B81→#FF8DA1 满铺）与页面浅绿主色冲突突兀，
     对齐理想图改为浅粉云底 + 深粉点缀：背景降饱和，强调色只保留在图标/按钮上 */
  background: linear-gradient(135deg, #FFEDF0 0%, #FFE4E9 100%);
  border: 1rpx solid #FFD9DF;
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 129, 0.12);
  display: flex;
  align-items: center;
  gap: 20rpx;
  overflow: hidden;
}

.invite-banner__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #FF6B81 0%, #FF8DA1 100%);
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
  font-size: 30rpx;
  font-weight: 700;
  color: #47393C;
}

.invite-banner__desc {
  font-size: 22rpx;
  color: #A98F94;
}

.invite-banner__btn {
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #FF6B81 0%, #FF8DA1 100%);
  box-shadow: 0 6rpx 16rpx rgba(255, 107, 129, 0.3);
}

.invite-banner__btn-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
}

.invite-banner__wing {
  position: absolute;
  right: -16rpx;
  bottom: -16rpx;
  width: 80rpx;
  height: 80rpx;
  color: #FFC9D2;
  opacity: 0.6;
}
</style>
