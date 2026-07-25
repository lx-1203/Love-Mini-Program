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
</script>

<template>
  <view
    class="heart-signal"
    @tap="emit('tap')"
    <!-- #ifdef H5 -->
    role="button"
    :aria-label="ariaLabel"
    <!-- #endif -->
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
  cursor: pointer;
  transition: background 200ms ease;
}
.heart-signal:active { background: var(--c-brand-100); }

.signal-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--c-brand-400);
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
</style>
