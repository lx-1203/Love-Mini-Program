<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../../theme/tokens';

const props = defineProps<{
  tone?: 'brand' | 'success' | 'warning';
  label: string;
}>();

const t = designTokens;

const iconSrc = computed(() => {
  const map: Record<string, string> = {
    brand: '/static/assets/icons/common/check.png',
    success: '/static/assets/icons/common/check.png',
    warning: '/static/assets/icons/common/close.png',
  };
  return map[props.tone || 'brand'];
});
</script>

<template>
  <view class="pill" :class="[`pill--${tone || 'brand'}`]">
    <image class="pill-icon" :src="iconSrc" mode="aspectFit" />
    <text class="pill-label">{{ label }}</text>
  </view>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  width: fit-content;
  padding: 8rpx 16rpx;
  border-radius: var(--r-full);
  font-size: 22rpx;
  font-weight: 600;
}

.pill-icon {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}

.pill-label {
  font-size: inherit;
  line-height: 1;
}

.pill--brand {
  background: v-bind('t.color.brand[50]');
  color: v-bind('t.color.brand[500]');
}

.pill--success {
  background: rgba(16, 185, 129, 0.12);
  color: var(--c-success);
}

.pill--warning {
  background: rgba(245, 158, 11, 0.12);
  color: var(--c-warning);
}
</style>
