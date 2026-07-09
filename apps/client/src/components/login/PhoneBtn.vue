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
  <view class="phone-btn" :class="{ 'phone-btn--loading': loading }" @tap="emit('tap')">
    <text class="phone-btn-text">手机号登录</text>
  </view>
</template>

<style scoped>
.phone-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 9999rpx;
  background: transparent;
  border: 2rpx solid rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}
.phone-btn:active { transform: scale(0.98); }
/* #ifdef H5 */
.phone-btn:hover {
  border-color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.1);
}
/* #endif */
.phone-btn--loading { opacity: 0.7; pointer-events: none; }
.phone-btn-text {
  font-size: v-bind('`${t.typography.size.subtitle}rpx`');
  font-weight: v-bind('t.typography.weight.semibold');
  color: rgba(255,255,255,0.8);
}
</style>
