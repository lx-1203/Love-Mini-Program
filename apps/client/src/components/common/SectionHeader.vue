<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

const props = withDefaults(defineProps<{
  title?: string;
  more?: boolean;
  moreText?: string;
}>(), {
  more: false,
  moreText: '查看全部',
});

const emit = defineEmits<{
  more: [];
}>();

const t = designTokens;
</script>

<template>
  <view class="section-header">
    <text class="section-title">{{ title }}</text>
    <view v-if="more" class="section-more" @tap="emit('more')">
      <text class="section-more-text">{{ moreText }} ›</text>
    </view>
    <slot name="right" />
  </view>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 0 20rpx;
}
.section-title {
  font-size: var(--fs-3xl);
  font-weight: 600;
  color: var(--c-text-primary);
  letter-spacing: -0.02em;
}
.section-more-text {
  font-size: var(--fs-base);
  color: var(--c-text-quaternary);
}
</style>
