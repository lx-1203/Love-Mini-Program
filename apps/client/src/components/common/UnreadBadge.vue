<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../../theme/tokens';

const props = withDefaults(defineProps<{
  count?: number;
  dot?: boolean;
}>(), {
  count: 0,
  dot: false,
});

const t = designTokens;

const show = computed(() => props.dot || props.count > 0);
const displayText = computed(() => props.count > 99 ? '99+' : String(props.count));
</script>

<template>
  <view v-if="show" class="badge" :class="{ 'badge--dot': dot }">
    <text v-if="!dot" class="badge-text">{{ displayText }}</text>
  </view>
</template>

<style scoped>
.badge {
  min-width: 32rpx;
  height: 32rpx;
  border-radius: 9999rpx;
  background: #5B7FFF;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  animation: pulse-badge 2s ease-in-out infinite;
}
.badge--dot {
  width: 16rpx;
  height: 16rpx;
  min-width: 16rpx;
  padding: 0;
}
.badge-text {
  font-size: 20rpx;
  line-height: 1;
}
@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
</style>
