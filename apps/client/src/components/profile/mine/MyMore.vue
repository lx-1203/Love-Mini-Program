<script setup lang="ts">
export interface MoreItem {
  key: string;
  label: string;
}

withDefaults(defineProps<{ items: MoreItem[] }>(), {
  items: () => [],
});
const emit = defineEmits<{ (e: "tap", key: string): void }>();

const ICONS: Record<string, { icon: string; color: string }> = {
  favorites: { icon: "★", color: "#FFB020" },
  visitors: { icon: "👁", color: "#4D8DFF" },
  album: { icon: "🖼", color: "#FF6B81" },
  privacy: { icon: "🔒", color: "#8D7BFF" },
  profile: { icon: "👤", color: "#36C99A" },
  interest: { icon: "♥", color: "#FF6B81" },
  posts: { icon: "📝", color: "#FF9A57" },
  checkin: { icon: "✓", color: "#36C99A" },
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
          <text class="my-more__icon-text" :style="{ color: ICONS[item.key]?.color || '#36C99A' }">
            {{ ICONS[item.key]?.icon || '•' }}
          </text>
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
  color: #222222;
}

.my-more__grid {
  display: flex;
  flex-wrap: wrap;
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
  padding: 12rpx 0;
}

.my-more__cell {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 24rpx 0;
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

.my-more__label {
  font-size: 22rpx;
  color: #666666;
  font-weight: 500;
}
</style>
