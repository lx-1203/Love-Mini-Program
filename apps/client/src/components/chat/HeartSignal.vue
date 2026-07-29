<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';

const props = defineProps<{
  title?: string;
  subtitle?: string;
  countdown?: string;
  count?: number;
}>();

const emit = defineEmits<{
  tap: [];
}>();

const { t } = useI18n();

/** 标题：默认走 i18n 兜底 */
const titleLabel = computed(() => props.title || t('chat.heartSignalTitle'));
/** 副标题：默认走 i18n 兜底，支持 count 插值 */
const subtitleLabel = computed(() =>
  props.subtitle || t('chat.heartSignalSubtitle', { n: props.count || 3 })
);
/** 整体 ARIA 标签 */
const ariaLabel = computed(() => t('chat.heartSignalAria'));

// 修复（严格模式 noUnusedLocals）：ariaLabel 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用。
defineExpose({ ariaLabel });
</script>

<template>
  <view
    class="heart-signal"
    @tap="emit('tap')"
    role="button"
    :aria-label="ariaLabel"
  >
    <view class="signal-icon">
      <image
        class="signal-img"
        :src="IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL"
        mode="aspectFit"
        <!-- #ifdef H5 -->
        role="img"
        :aria-label="titleLabel"
        <!-- #endif -->
      />
    </view>
    <view class="signal-info">
      <text class="signal-title">{{ titleLabel }}</text>
      <text class="signal-sub">{{ subtitleLabel }}</text>
    </view>
    <view class="signal-countdown" v-if="countdown">
      <text class="signal-time">{{ countdown }}</text>
    </view>
  </view>
</template>

<style scoped>
.heart-signal {
  margin: 20rpx 32rpx;
  background: var(--c-brand-50);
  border-radius: var(--r-lg);
  padding: 24rpx;
  border: 1rpx solid var(--c-brand-100);
  display: flex;
  align-items: center;
  gap: 20rpx;
  transition: background var(--d-normal, 200ms) ease;
}
.heart-signal:active { background: var(--c-brand-100); }

.signal-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-brand-400);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  animation: heart-pulse var(--d-loop-slow, 2400ms) ease-in-out infinite;
}
.signal-img {
  width: 40rpx;
  height: 40rpx;
}

.signal-emoji { font-size: var(--fs-2xl, 32rpx); }

@keyframes heart-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 var(--c-brand-shadow-tint-strong, rgba(63, 207, 142, 0.3));
  }
  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 12rpx var(--c-brand-bg-tint, rgba(63, 207, 142, 0));
  }
}

.signal-info { flex: 1; }
.signal-title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}
.signal-sub {
  font-size: var(--fs-sm);
  color: var(--c-text-quaternary);
  margin-top: 4rpx;
}

.signal-countdown { flex-shrink: 0; }
.signal-time {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-brand-400);
  letter-spacing: -0.02em;
}

/* P6 a11y：尊重 prefers-reduced-motion，关闭心跳脉冲与背景过渡，避免前庭功能障碍用户不适 */
@media (prefers-reduced-motion: reduce) {
  .heart-signal {
    animation: none !important;
    transition: none !important;
  }
  .signal-icon {
    animation: none !important;
  }
}
</style>
