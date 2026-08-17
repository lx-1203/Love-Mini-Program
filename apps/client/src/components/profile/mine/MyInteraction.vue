<script setup lang="ts">
export interface InteractionItem {
  key: string;
  label: string;
  value: number | string;
  icon?: string;
  color?: string;
}

withDefaults(defineProps<{ items: InteractionItem[] }>(), {
  items: () => [],
});
const emit = defineEmits<{ (e: "tap", key: string): void }>();

const DEFAULT_ICONS: Record<string, { icon: string; color: string }> = {
  likedMe: { icon: "♥", color: "#FF6B81" },
  match: { icon: "♡", color: "#FF9A57" },
  likes: { icon: "♥", color: "#8D7BFF" },
  visitors: { icon: "👁", color: "#4D8DFF" },
};
</script>

<template>
  <view class="my-interaction">
    <text class="my-interaction__title">我的互动</text>
    <view class="my-interaction__box">
      <view
        v-for="item in items"
        :key="item.key"
        class="my-interaction__row"
        hover-class="my-interaction__row--pressed"
        @tap="emit('tap', item.key)"
      >
        <view class="my-interaction__icon" :style="{ background: `${item.color || DEFAULT_ICONS[item.key]?.color || '#36C99A'}22` }">
          <text class="my-interaction__icon-text" :style="{ color: item.color || DEFAULT_ICONS[item.key]?.color || '#36C99A' }">
            {{ item.icon || DEFAULT_ICONS[item.key]?.icon || '•' }}
          </text>
        </view>
        <text class="my-interaction__label">{{ item.label }}</text>
        <text v-if="item.value" class="my-interaction__value">{{ item.value }}</text>
        <text class="my-interaction__arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-interaction {
  margin: 24rpx 24rpx 0;
}

.my-interaction__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #222222;
}

.my-interaction__box {
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.my-interaction__row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 26rpx 32rpx;
  border-bottom: 1rpx solid #EEF1F5;
}

.my-interaction__row:last-child {
  border-bottom: 0;
}

.my-interaction__row--pressed {
  background: #F7FAF9;
}

.my-interaction__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.my-interaction__icon-text {
  font-size: 28rpx;
  font-weight: 800;
}

.my-interaction__label {
  flex: 1;
  font-size: 28rpx;
  color: #222222;
  font-weight: 600;
}

.my-interaction__value {
  font-size: 26rpx;
  color: #999999;
}

.my-interaction__arrow {
  font-size: 32rpx;
  color: #C6CDCC;
}
</style>
