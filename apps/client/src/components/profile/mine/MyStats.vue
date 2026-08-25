<script setup lang="ts">
import type { UserProfileSocialProof } from "../../../types/profile";
import { IMAGE_PATHS } from "../../../config/images";

defineProps<{ socialProof: UserProfileSocialProof }>();
const emit = defineEmits<{ (e: "tap", key: string): void }>();

const items = [
  // 修复#4（第五轮 QA）：4 列统计按规格「关注/粉丝/获赞/匹配」，
  // 键值对齐 followingCount/followersCount/likesCount/matchCount（mock 128/96/356/42）
  { key: "following", label: "关注", iconSrc: IMAGE_PATHS.ICONS_EMOJI.USER, color: "#36C99A" },
  { key: "followers", label: "粉丝", iconSrc: IMAGE_PATHS.ICONS_EMOJI.GROUP, color: "#4D8DFF" },
  { key: "likes", label: "获赞", iconSrc: IMAGE_PATHS.ICONS_EMOJI.THUMBS_UP, color: "#FF9F43" },
  { key: "match", label: "匹配", iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, color: "#FF6B81" },
];
</script>

<template>
  <view class="my-stats">
    <view
      v-for="item in items"
      :key="item.key"
      class="my-stats__col"
      hover-class="my-stats__col--pressed"
      @tap="emit('tap', item.key)"
    >
      <view class="my-stats__icon" :style="{ background: `${item.color}22` }">
        <image class="my-stats__icon-img" :src="item.iconSrc" mode="aspectFit" alt="" />
      </view>
      <text class="my-stats__value">
        {{ item.key === "following" ? socialProof.followingCount : item.key === "followers" ? socialProof.followersCount : item.key === "likes" ? socialProof.likesCount : socialProof.matchCount }}
      </text>
      <text class="my-stats__label">{{ item.label }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-stats {
  margin: 24rpx 24rpx 0;
  /* V-04（第五轮 QA）：4 列统计上下内边距 28→32rpx，数字与图标呼吸感 */
  padding: 32rpx 8rpx;
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  display: flex;
}

.my-stats__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* V-04：列内 icon/数字/标签间距 10→12rpx */
  gap: 12rpx;
  position: relative;
}

.my-stats__col:not(:first-child)::before {
  content: "";
  position: absolute;
  left: 0;
  top: 20%;
  bottom: 20%;
  width: 1rpx;
  background: #EEF1F5;
}

.my-stats__col--pressed {
  opacity: 0.75;
}

.my-stats__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-stats__icon-img {
  width: 36rpx;
  height: 36rpx;
}

.my-stats__value {
  font-size: 34rpx;
  font-weight: 800;
  color: #333A37;
}

.my-stats__label {
  font-size: 22rpx;
  color: #9AA39F;
}
</style>
