<script setup lang="ts">
export interface GrowthItem {
  key: string;
  label: string;
  value?: string | number;
}

withDefaults(defineProps<{
  items: GrowthItem[];
}>(), {
  items: () => [],
});

const emit = defineEmits<{ (e: "tap", key: string): void }>();
</script>

<template>
  <view v-if="items.length > 0" class="my-growth">
    <view
      v-for="item in items"
      :key="item.key"
      class="my-growth__row"
      hover-class="my-growth__row--pressed"
      @tap="emit('tap', item.key)"
    >
      <text class="my-growth__label">{{ item.label }}</text>
      <text class="my-growth__value">{{ item.value ?? "" }}</text>
      <text class="my-growth__arrow">›</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-growth {
  margin: 24rpx 24rpx 0;
  border-radius: 40rpx;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.my-growth__row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 26rpx 32rpx;
  border-bottom: 1rpx solid #eef1f5;
}

.my-growth__row:last-child {
  border-bottom: 0;
}

.my-growth__row--pressed {
  background: #F7FAF9;
}

.my-growth__label {
  flex: 1;
  font-size: 28rpx;
  color: #222222;
}

.my-growth__value {
  font-size: 26rpx;
  color: #777777;
}

.my-growth__arrow {
  font-size: 32rpx;
  color: #777777;
}
</style>

