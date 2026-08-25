<script setup lang="ts">
/**
 * XunmiCommonPointCard — 共同点卡片组件（2026-08-26 第三轮 emoji→SVG）
 * 用于他人主页"我们有N个共同点"区域。icon 改为 SVG 路径，不再接受 emoji 字符。
 */
import { IMAGE_PATHS } from "../../config/images";

withDefaults(defineProps<{
  /** SVG 路径（绝对路径，mp-weixin `<image>` 可直接使用） */
  iconSrc?: string;
  title?: string;
  description?: string;
  color?: string;
  bgColor?: string;
}>(), {
  iconSrc: IMAGE_PATHS.ICONS_EMOJI.CAMERA_ICON,
  title: "",
  description: "",
  color: "#36C99A",
  bgColor: "#E8FAF3",
});
</script>

<template>
  <view class="common-card">
    <view class="common-card__icon" :style="{ background: bgColor }">
      <image
        class="common-card__icon-img"
        :src="iconSrc"
        mode="aspectFit"
        :style="{ color }"
        alt=""
      />
    </view>
    <text class="common-card__title">{{ title }}</text>
    <text class="common-card__desc">{{ description }}</text>
  </view>
</template>

<style scoped lang="scss">
.common-card {
  flex: 1;
  padding: 20rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.common-card__icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.common-card__icon-img {
  width: 28rpx;
  height: 28rpx;
  display: block;
}

.common-card__title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333A37;
  text-align: center;
}

.common-card__desc {
  font-size: 22rpx;
  color: #9AA39F;
  text-align: center;
}
</style>