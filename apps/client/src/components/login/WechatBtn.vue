<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  tap: [];
}>();

const t = designTokens;
</script>

<template>
  <view
    class="wechat-btn"
    :class="{ 'wechat-btn--loading': loading }"
    @tap="emit('tap')"
  >
    <image
      class="wechat-btn-icon"
      src="/static/assets/icons/social/message.png"
      mode="aspectFit"
    />
    <text class="wechat-btn-text">微信登录</text>
  </view>
</template>

<style scoped>
.wechat-btn {
  width: 100%;
  height: 104rpx;
  border-radius: 9999rpx;
  background: v-bind('t.color.gradient.brand');
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  box-shadow: 0 8rpx 32rpx rgba(91, 127, 255, 0.35);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.wechat-btn:active {
  transform: scale(0.97);
  box-shadow: 0 4rpx 16rpx rgba(91, 127, 255, 0.2);
}

.wechat-btn--loading {
  opacity: 0.7;
  pointer-events: none;
}

.wechat-btn-icon {
  width: 40rpx;
  height: 40rpx;
  /* 白色 SVG 着色 */
  filter: brightness(0) invert(1);
}

.wechat-btn-text {
  font-size: 34rpx;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.04em;
}
</style>