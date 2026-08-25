<script setup lang="ts">
import { IMAGE_PATHS } from "../../../config/images";

export interface MoreItem {
  key: string;
  label: string;
}

withDefaults(defineProps<{ items: MoreItem[] }>(), {
  items: () => [],
});
const emit = defineEmits<{ (e: "tap", key: string): void }>();

const ICONS: Record<string, { iconSrc?: string; image?: string; color: string }> = {
  favorites: { image: "/static/assets/images/profile-favorite.svg", color: "#FFB020" },
  visitors: { image: "/static/assets/images/profile-visitors.svg", color: "#4D8DFF" },
  album: { image: "/static/assets/images/profile-album.svg", color: "#FF6B81" },
  privacy: { image: "/static/assets/images/profile-privacy.svg", color: "#A29BFE" },
  profile: { iconSrc: IMAGE_PATHS.ICONS_EMOJI.USER, color: "#36C99A" },
  interest: { iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, color: "#FF6B81" },
  posts: { iconSrc: IMAGE_PATHS.ICONS_EMOJI.FILE_TEXT, color: "#FF9F43" },
  checkin: { iconSrc: IMAGE_PATHS.ICONS_EMOJI.CHECK, color: "#36C99A" },
};
</script>

<template>
  <view class="my-more">
    <text class="my-more__title">更多功能</text>
    <view class="my-more__grid">
      <view
        v-for="item in items"
        :key="item.key"
        class="my-more__cell"
        hover-class="my-more__cell--pressed"
        @tap="emit('tap', item.key)"
      >
        <view class="my-more__icon" :style="{ background: `${ICONS[item.key]?.color || '#36C99A'}22` }">
          <image v-if="ICONS[item.key]?.image" class="my-more__icon-img" :src="ICONS[item.key]?.image ?? ''" mode="aspectFit" alt="" />
          <image v-else-if="ICONS[item.key]?.iconSrc" class="my-more__icon-img" :src="ICONS[item.key]?.iconSrc ?? ''" mode="aspectFit" alt="" />
          <text v-else class="my-more__icon-text" :style="{ color: ICONS[item.key]?.color || '#36C99A' }">•</text>
        </view>
        <text class="my-more__label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-more {
  margin: 24rpx 24rpx 0;
}

.my-more__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.my-more__grid {
  display: flex;
  flex-wrap: wrap;
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  padding: 12rpx 0;
}

.my-more__cell {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* V-04（第五轮 QA）：菜单行高 24→28rpx，触控区更舒适 */
  gap: 10rpx;
  padding: 28rpx 0;
  box-sizing: border-box;
}

.my-more__cell--pressed {
  opacity: 0.75;
}

.my-more__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-more__icon-text {
  font-size: 30rpx;
  font-weight: 800;
}

.my-more__icon-img {
  width: 40rpx;
  height: 40rpx;
}

.my-more__label {
  font-size: 22rpx;
  color: #4A524E;
  font-weight: 500;
}
</style>
