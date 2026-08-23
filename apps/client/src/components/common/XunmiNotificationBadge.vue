<script setup lang="ts">
/**
 * XunmiNotificationBadge — 通知徽章组件
 * 用于未读消息红点/数字角标
 */
withDefaults(defineProps<{
  count?: number;
  showDot?: boolean;
  size?: number;
}>(), {
  count: 0,
  showDot: false,
  size: 36,
});
</script>

<template>
  <view
    v-if="showDot || count > 0"
    class="notify-badge"
    :style="{
      width: (count > 99 ? size * 1.6 : size) + 'rpx',
      height: size + 'rpx',
    }"
  >
    <text class="notify-badge__text">
      {{ count > 99 ? '99+' : (count > 0 ? count : '') }}
    </text>
  </view>
</template>

<style scoped lang="scss">
.notify-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background: #FF6B81;
  border-radius: 999rpx;
  border: 4rpx solid #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.notify-badge__text {
  font-size: 20rpx;
  color: #FFFFFF;
  font-weight: 700;
  line-height: 1;
}
</style>
