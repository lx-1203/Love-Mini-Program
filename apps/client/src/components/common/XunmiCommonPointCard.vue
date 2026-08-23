<script setup lang="ts">
/**
 * XunmiCommonPointCard — 共同点卡片组件
 * 用于他人主页"我们有N个共同点"区域
 */
withDefaults(defineProps<{
  icon?: string;
  title?: string;
  description?: string;
  color?: string;
  bgColor?: string;
}>(), {
  icon: '📷',
  title: '',
  description: '',
  color: '#36C99A',
  bgColor: '#E8FAF3',
});
</script>

<template>
  <view class="common-card">
    <view class="common-card__icon" :style="{ background: bgColor }">
      <text class="common-card__icon-text" :style="{ color }">{{ icon }}</text>
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

.common-card__icon-text {
  font-size: 24rpx;
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
