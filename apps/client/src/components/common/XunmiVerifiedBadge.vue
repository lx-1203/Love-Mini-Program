<script setup lang="ts">
/**
 * XunmiVerifiedBadge — 认证徽章组件
 * 用于头像右下角或姓名旁的认证标识
 */
withDefaults(defineProps<{
  size?: number;
  variant?: 'avatar' | 'inline';
}>(), {
  size: 28,
  variant: 'avatar',
});
</script>

<template>
  <view
    v-if="variant === 'avatar'"
    class="badge badge--avatar"
    :style="{ width: size + 'rpx', height: size + 'rpx' }"
  >
    <text class="badge__icon" :style="{ fontSize: (size * 0.6) + 'rpx' }">&#10003;</text>
  </view>
  <view v-else class="badge badge--inline">
    <text class="badge__check">&#10003;</text>
    <text class="badge__text">已认证</text>
  </view>
</template>

<style scoped lang="scss">
.badge--avatar {
  background: #36C99A;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge__icon {
  color: #FFFFFF;
  font-weight: 700;
  line-height: 1;
}

.badge--inline {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  height: 40rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.25);
}

.badge__check {
  font-size: 20rpx;
  color: #FFFFFF;
}

.badge__text {
  font-size: 20rpx;
  color: #FFFFFF;
  font-weight: 500;
}
</style>
