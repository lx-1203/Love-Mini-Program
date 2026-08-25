<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";
const props = withDefaults(defineProps<{ subtitle?: string; school?: string; locationText?: string }>(), {
  subtitle: "发现今天值得遇见的人",
  school: "",
  locationText: "",
});
defineEmits<{ (e: "schoolTap"): void; (e: "searchTap"): void; (e: "notifyTap"): void }>();
const schoolText = () => props.locationText || props.school || "北京大学 · 3km";
</script>

<template>
  <view class="home-header">
    <view class="home-header__top">
      <view class="header-left">
        <text class="home-header__title">首页</text>
        <image class="home-header__heart" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      </view>
      <view class="header-right">
        <view class="header-location" role="button" aria-label="定位" @tap="$emit('schoolTap')">
          <image class="header-location__pin" :src="IMAGE_PATHS.HOME_ICONS.LOCATION_PIN" mode="aspectFit" />
          <text class="header-location__text">{{ schoolText() }}</text>
        </view>
        <view class="header-icon" role="button" aria-label="通知" @tap="$emit('notifyTap')">
          <image class="header-icon__bell" :src="IMAGE_PATHS.HOME_ICONS.HEADER_BELL" mode="aspectFit" />
          <view class="header-badge">
            <text class="header-badge__text">6</text>
          </view>
        </view>
      </view>
    </view>
    <text class="home-header__subtitle">{{ subtitle }}</text>
  </view>
</template>

<style scoped lang="scss">
.home-header {
  padding: 20rpx 40rpx 16rpx;
}

.home-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}

.home-header__title {
  font-size: 48rpx;
  font-weight: 700;
  color: #333A37;
  line-height: 1.1;
}

.home-header__heart {
  width: 36rpx;
  height: 36rpx;
  margin-left: 4rpx;
  color: #FF6B81;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

.header-location {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 56rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.header-location__pin {
  width: 32rpx;
  height: 32rpx;
}

.header-location__text {
  font-size: 24rpx;
  color: #6B7571;
  font-weight: 500;
}

.header-icon {
  position: relative;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon__bell {
  width: 36rpx;
  height: 36rpx;
}

.header-badge {
  position: absolute;
  top: -4rpx;
  right: -6rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 6rpx;
  border-radius: 999rpx;
  background: #FF6B81;
  border: 2rpx solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.header-badge__text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 700;
  line-height: 1;
}

.home-header__subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #9AA39F;
}
</style>
