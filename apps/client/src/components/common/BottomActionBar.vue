<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

defineProps<{
  primaryLabel: string;
  secondaryLabel?: string;
}>();

const emit = defineEmits<{
  primary: [];
  secondary: [];
}>();

const t = designTokens;
</script>

<template>
  <view
    class="bar"
    :class="{ 'bar--single': !secondaryLabel }"
    <!-- #ifdef H5 -->
    role="toolbar"
    aria-label="操作栏"
    <!-- #endif -->
  >
    <button
      v-if="secondaryLabel"
      class="bar__secondary"
      @tap="emit('secondary')"
      <!-- #ifdef H5 -->
      :aria-label="secondaryLabel"
      <!-- #endif -->
    >
      {{ secondaryLabel }}
    </button>
    <button
      class="bar__primary"
      @tap="emit('primary')"
      <!-- #ifdef H5 -->
      :aria-label="primaryLabel"
      <!-- #endif -->
    >
      {{ primaryLabel }}
    </button>
  </view>
</template>

<style scoped>
.bar {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}
.bar--single {
  flex-direction: row;
}

.bar__primary,
.bar__secondary {
  flex: 1;
  height: 88rpx;
  border: 0;
  border-radius: var(--r-xl);
  font-size: 28rpx;
  font-weight: 700;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.bar__primary {
  background: var(--c-gradient-brand);
  color: var(--c-text-inverse, #FFFFFF);
  box-shadow: var(--s-brand);
}
.bar__primary:active {
  transform: scale(0.97);
  transition: all 120ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--s-brand-md);
}

.bar__secondary {
  background: var(--c-bg-container);
  color: var(--c-text-primary);
  border: 1rpx solid var(--c-border-default);
}
.bar__secondary:active {
  transform: scale(0.97);
  transition: all 120ms cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--c-neutral-100);
}
</style>
