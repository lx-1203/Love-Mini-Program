<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';

const props = withDefaults(defineProps<{
  type?: 'no-data' | 'no-match' | 'no-chat';
  message?: string;
}>(), {
  type: 'no-data',
  message: '',
});

const { t } = useI18n();

const iconSrc = computed(() => {
  const map: Record<string, string> = {
    'no-data': IMAGE_PATHS.ICONS_COMMON.SEARCH,
    'no-match': IMAGE_PATHS.ICONS_COMMON.CLOSE,
    'no-chat': IMAGE_PATHS.ICONS_COMMON.NOTIFICATION,
  };
  return map[props.type];
});

const messageText = computed(() => props.message || t('empty.noData'));

const subText = computed(() => {
  const map: Record<string, string> = {
    'no-data': t('empty.noDataSub'),
    'no-match': t('empty.noMatchSub'),
    'no-chat': t('empty.noChatSub'),
  };
  return map[props.type] || t('empty.noDataSub');
});
</script>

<template>
  <view
    class="empty"
    <!-- #ifdef H5 -->
    role="status"
    aria-live="polite"
    :aria-label="messageText"
    <!-- #endif -->
  >
    <image class="empty-icon" :src="iconSrc" mode="aspectFit" />
    <text class="empty-msg">{{ messageText }}</text>
    <text class="empty-sub">{{ subText }}</text>
    <slot />
  </view>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}
.empty-icon { width: 120rpx; height: 120rpx; margin-bottom: 16rpx; }
.empty-msg {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-secondary);
}
.empty-sub {
  font-size: var(--fs-base);
  color: var(--c-text-quaternary);
  margin-top: 8rpx;
}
</style>
