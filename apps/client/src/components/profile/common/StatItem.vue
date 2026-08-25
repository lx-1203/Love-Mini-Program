<script setup lang="ts">
import { IMAGE_PATHS } from "../../../config/images";

withDefaults(defineProps<{
  value: number | string;
  label: string;
  icon?: string;
  locked?: boolean;
  emphasis?: boolean;
}>(), {
  icon: "",
  locked: false,
  emphasis: false,
});

const emit = defineEmits<{ (e: "tap"): void }>();
</script>

<template>
  <view class="stat-item" hover-class="stat-item--pressed" @tap="emit('tap')">
    <text v-if="icon" class="stat-item__icon">{{ icon }}</text>
    <text class="stat-item__value" :class="{ 'stat-item__value--emphasis': emphasis }">{{ value }}</text>
    <text class="stat-item__label">{{ label }}</text>
    <image v-if="locked" class="stat-item__lock" :src="IMAGE_PATHS.ICONS_EMOJI.LOCK" mode="aspectFit" alt="" />
  </view>
</template>

<style scoped lang="scss">
.stat-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stat-item__icon {
  font-size: 28rpx;
}

.stat-item--pressed {
  opacity: 0.75;
}

.stat-item__value {
  font-size: 32rpx;
  font-weight: 600;
  color: #333A37;
}

.stat-item__value--emphasis {
  color: #FF6B81;
}

.stat-item__label {
  font-size: 24rpx;
  color: #4A524E;
}

.stat-item__lock {
  position: absolute;
  top: -10rpx;
  right: 12rpx;
  width: 22rpx;
  height: 22rpx;
}
</style>



