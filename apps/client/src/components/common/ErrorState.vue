<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';

const props = withDefaults(defineProps<{
  type?: 'network' | 'server';
}>(), {
  type: 'network',
});

const emit = defineEmits<{
  retry: [];
}>();

const { t } = useI18n();

const iconSrc = computed(() => {
  const map: Record<string, string> = {
    network: IMAGE_PATHS.ICONS_COMMON.SEARCH,
    server: IMAGE_PATHS.ICONS_COMMON.CLOSE,
  };
  return map[props.type];
});

const msgKey = computed(() => (props.type === 'server' ? 'error.server' : 'error.network'));
const subKey = computed(() => (props.type === 'server' ? 'error.serverSub' : 'error.networkSub'));
const msgText = computed(() => t(msgKey.value));
const subText = computed(() => t(subKey.value));
</script>

<template>
  <view
    class="error"
    role="alert"
    aria-live="assertive"
    :aria-label="msgText"
  >
    <image class="error-icon" :src="iconSrc" mode="aspectFit" alt="" />
    <text class="error-msg">{{ msgText }}</text>
    <text class="error-sub">{{ subText }}</text>
    <view
      class="error-btn"
      @tap="emit('retry')"
      role="button"
      :aria-label="t('error.retry')"
    >
      <text class="error-btn-text">{{ t('error.retry') }}</text>
    </view>
  </view>
</template>

<style scoped>
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}
.error-icon { width: 120rpx; height: 120rpx; margin-bottom: 16rpx; }
.error-msg {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-secondary);
}
.error-sub {
  font-size: var(--fs-base);
  color: var(--c-text-quaternary);
  margin-top: 8rpx;
}
.error-btn {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  border-radius: 9999rpx;
  background: var(--c-brand-400);
  cursor: pointer;
}
.error-btn:active { transform: scale(0.97); }
.error-btn-text {
  color: var(--c-text-inverse, #fff);
  font-size: var(--fs-md);
  font-weight: 600;
}
</style>
