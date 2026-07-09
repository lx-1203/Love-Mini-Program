<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

defineProps<{
  school?: string;
}>();

const emit = defineEmits<{
  schoolTap: [];
  searchTap: [];
  notifyTap: [];
}>();

const t = designTokens;
</script>

<template>
  <view class="home-header">
    <view class="header-left" @tap="emit('schoolTap')">
      <text class="header-school">{{ school || '校园恋爱' }}</text>
      <image class="header-arrow" src="/static/assets/icons/common/arrow-right.png" mode="aspectFit" />
      <view class="header-badge">
        <text class="header-badge-text">本校限定</text>
      </view>
    </view>
    <view class="header-right">
      <view class="header-icon" @tap="emit('searchTap')">
        <image class="header-icon-img" src="/static/assets/icons/common/search.png" mode="aspectFit" />
      </view>
      <view class="header-icon" @tap="emit('notifyTap')">
        <image class="header-icon-img" src="/static/assets/icons/common/notification.png" mode="aspectFit" />
        <view class="header-dot" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.header-school {
  font-size: v-bind('`${t.typography.size.h3}rpx`');
  font-weight: v-bind('t.typography.weight.bold');
  color: v-bind('t.color.text.primary');
  max-width: 240rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.header-arrow {
  width: 28rpx;
  height: 28rpx;
  transform: rotate(90deg);
  transition: transform v-bind('`${t.motion.duration.normal}ms`') v-bind('t.motion.easing.default');
}
.header-badge {
  padding: 4rpx 16rpx;
  border-radius: 9999rpx;
  background: v-bind('t.color.brand[50]');
  border: 1rpx solid v-bind('t.color.brand[100]');
}
.header-badge-text {
  font-size: v-bind('`${t.typography.size.caption}rpx`');
  font-weight: v-bind('t.typography.weight.semibold');
  color: v-bind('t.color.brand[500]');
}
.header-right {
  display: flex;
  gap: 16rpx;
}
.header-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: v-bind('t.color.neutral[100]');
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: v-bind('t.color.text.tertiary');
  cursor: pointer;
  position: relative;
}
/* #ifdef H5 */
.header-icon:hover { background: v-bind('t.color.brand[100]'); }
/* #endif */
.header-dot {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: v-bind('t.color.error');
  border: 3rpx solid #fff;
}
</style>
