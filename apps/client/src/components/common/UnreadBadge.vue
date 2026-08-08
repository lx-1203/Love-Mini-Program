<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = withDefaults(defineProps<{
  count?: number;
  dot?: boolean;
}>(), {
  count: 0,
  dot: false,
});

const { t } = useI18n();

const show = computed(() => props.dot || props.count > 0);
const displayText = computed(() => props.count > 99 ? '99+' : String(props.count));

const ariaLabel = computed(() =>
  props.dot ? t('messages.unreadAria') : t('messages.unreadCountAria', { n: displayText.value })
);

// 修复（严格模式 noUnusedLocals）：ariaLabel 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用。
defineExpose({ ariaLabel });
</script>

<template>
  <view
    v-if="show"
    class="badge"
    :class="{ 'badge--dot': dot }"
    role="status"
    :aria-label="ariaLabel"
  >
    <text v-if="!dot" class="badge-text">{{ displayText }}</text>
  </view>
</template>

<style scoped>
.badge {
  /* 固定布局尺寸（徽章 32rpx），无对应 token */
  min-width: 32rpx;
  height: 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-secondary-blue-400, #5B7FFF);
  color: var(--c-text-inverse, #FFFFFF);
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--sp-2);
  animation: pulse-badge var(--d-loop-slow, 2000ms) ease-in-out infinite;
}
.badge--dot {
  /* 固定布局尺寸（红点 16rpx），无对应 token */
  width: 16rpx;
  height: 16rpx;
  min-width: 16rpx;
  padding: 0;
}
.badge-text {
  font-size: var(--fs-xs, 20rpx);
  line-height: 1;
}
@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
</style>
