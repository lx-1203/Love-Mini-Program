<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";

withDefaults(
  defineProps<{
    badge?: number;
    activityCount?: number;
  }>(),
  { badge: 0, activityCount: 2 }
);

const emit = defineEmits<{
  tap: [];
}>();

const avatar = IMAGE_PATHS.MESSAGE_ICONS.ASSISTANT_AVATAR;
const officialSrc = IMAGE_PATHS.MESSAGE_ICONS.OFFICIAL;
</script>

<template>
  <view class="assistant-card" hover-class="assistant-card--hover" @tap="emit('tap')">
    <image class="assistant-card__avatar" :src="avatar" mode="aspectFill" />
    <view class="assistant-card__body">
      <view class="assistant-card__title-row">
        <text class="assistant-card__title">寻觅助手</text>
        <image class="assistant-card__official" :src="officialSrc" mode="aspectFit" />
        <view v-if="badge" class="assistant-card__badge">
          <text class="assistant-card__badge-text">{{ badge }}</text>
        </view>
      </view>
      <text class="assistant-card__desc">你的恋爱小管家</text>
      <text class="assistant-card__content">今天附近有 {{ activityCount }} 场活动适合你参加</text>
    </view>
    <text class="assistant-card__arrow">›</text>
  </view>
</template>

<style scoped lang="scss">
.assistant-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 16rpx 32rpx;
  padding: 24rpx;
  border-radius: 40rpx;
  background: #FFFFFF;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.05);
}
.assistant-card--hover {
  opacity: 0.85;
}
.assistant-card__avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.assistant-card__body {
  flex: 1;
  min-width: 0;
}
.assistant-card__title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.assistant-card__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #222222;
}
.assistant-card__official {
  width: 28rpx;
  height: 28rpx;
}
.assistant-card__badge {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: #FF6B81;
  display: flex;
  align-items: center;
  justify-content: center;
}
.assistant-card__badge-text {
  color: #FFFFFF;
  font-size: 20rpx;
  font-weight: 700;
}
.assistant-card__desc {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #999999;
}
.assistant-card__content {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #666666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.assistant-card__arrow {
  font-size: 36rpx;
  color: #C8CFCD;
  flex-shrink: 0;
}
</style>
