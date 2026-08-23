<script setup lang="ts">
import type { UserProfileSocialProof } from "../../../types/profile";

defineProps<{ socialProof: UserProfileSocialProof }>();
const emit = defineEmits<{ (e: "tap", key: string): void }>();

const items = [
  { key: "likes", label: "我喜欢", icon: "♥", color: "#A29BFE" },
  { key: "likedMe", label: "喜欢我的", icon: "♡", color: "#FF6B81" },
  { key: "match", label: "我赞过", icon: "👍", color: "#FF9F43" },
  { key: "visitors", label: "访客", icon: "👁", color: "#4D8DFF" },
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
        <text class="my-stats__icon-text" :style="{ color: item.color }">{{ item.icon }}</text>
      </view>
      <text class="my-stats__value">
        {{ item.key === "likes" ? socialProof.likesCount : item.key === "likedMe" ? socialProof.likedMeCount : item.key === "match" ? socialProof.matchCount : socialProof.visitorCount }}
      </text>
      <text class="my-stats__label">{{ item.label }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-stats {
  margin: 24rpx 24rpx 0;
  padding: 28rpx 8rpx;
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
  gap: 10rpx;
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

.my-stats__icon-text {
  font-size: 32rpx;
  font-weight: 800;
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
