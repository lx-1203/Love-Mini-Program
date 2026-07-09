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
  font-size: v-bind('`${t.typography.size.h2}rpx`');
  font-weight: v-bind('t.typography.weight.semibold');
  color: v-bind('t.color.text.primary');
  letter-spacing: v-bind('t.typography.letterSpacing.tight');
}
.section-more-text {
  font-size: v-bind('`${t.typography.size.bodySm}rpx`');
  color: v-bind('t.color.text.quaternary');
}
</style>
