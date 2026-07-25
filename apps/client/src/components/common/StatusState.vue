<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../../theme/tokens';
import { IMAGE_PATHS } from '../../config/images';

const props = defineProps<{
  tone?: 'brand' | 'success' | 'warning';
  label: string;
}>();

const t = designTokens;

const iconSrc = computed(() => {
  const map: Record<string, string> = {
    brand: IMAGE_PATHS.ICONS_COMMON.CHECK,
    success: IMAGE_PATHS.ICONS_COMMON.CHECK,
    warning: IMAGE_PATHS.ICONS_COMMON.CLOSE,
  };
  return map[props.tone || 'brand'];
});
</script>

<template>
  <view
    class="pill"
    :class="[`pill--${tone || 'brand'}`]"
    <!-- #ifdef H5 -->
    role="img"
    :aria-label="label"
    <!-- #endif -->
  >
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
  background: var(--c-brand-50);
  color: var(--c-brand);
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
