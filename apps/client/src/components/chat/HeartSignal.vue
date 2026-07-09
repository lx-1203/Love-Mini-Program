<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

defineProps<{
  title?: string;
  subtitle?: string;
  countdown?: string;
  count?: number;
}>();

const emit = defineEmits<{
  tap: [];
}>();

const t = designTokens;
</script>

<template>
  <view class="heart-signal" @tap="emit('tap')">
    <view class="signal-icon">
      <image class="signal-img" src="/static/assets/icons/social/heart-signal.png" mode="aspectFit" />
    </view>
    <view class="signal-info">
      <text class="signal-title">{{ title || '心信号 · 今日推荐' }}</text>
      <text class="signal-sub">{{ subtitle || `系统为你推荐了 ${count || 3} 位有缘人` }}</text>
    </view>
    <view class="signal-countdown" v-if="countdown">
      <text class="signal-time">{{ countdown }}</text>
    </view>
  </view>
</template>

<style scoped>
.heart-signal {
  margin: 20rpx 32rpx;
  background: v-bind('t.color.brand[50]');
  border-radius: v-bind('`${t.radius.lg}rpx`');
  padding: 24rpx;
  border: 1rpx solid v-bind('t.color.brand[100]');
  display: flex;
  align-items: center;
  gap: 20rpx;
  cursor: pointer;
  transition: background 200ms ease;
}
.heart-signal:active { background: v-bind('t.color.brand[100]'); }

.signal-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: v-bind('t.color.brand[400]');
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  animation: heart-pulse 2.4s ease-in-out infinite;
}
.signal-emoji { font-size: 32rpx; }

@keyframes heart-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(var(--c-brand-600-rgb, 37, 99, 235), 0.3);
  }
  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 12rpx rgba(var(--c-brand-600-rgb, 37, 99, 235), 0);
  }
}

.signal-info { flex: 1; }
.signal-title {
  font-size: v-bind('`${t.typography.size.body}rpx`');
  font-weight: v-bind('t.typography.weight.semibold');
  color: v-bind('t.color.text.primary');
}
.signal-sub {
  font-size: v-bind('`${t.typography.size.caption}rpx`');
  color: v-bind('t.color.text.quaternary');
  margin-top: 4rpx;
}

.signal-countdown { flex-shrink: 0; }
.signal-time {
  font-size: v-bind('`${t.typography.size.h2}rpx`');
  font-weight: v-bind('t.typography.weight.bold');
  color: v-bind('t.color.brand[400]');
  letter-spacing: v-bind('t.typography.letterSpacing.tight');
}
</style>
