<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';

defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  tap: [];
}>();

const { t } = useI18n();
</script>

<template>
  <view
    class="wechat-btn"
    :class="{ 'wechat-btn--loading': loading }"
    @tap="emit('tap')"
    role="button"
    :aria-label="t('login.wechatLogin')"
    :aria-disabled="loading"
    :aria-busy="loading"
  >
    <image
      class="wechat-btn-icon"
      :src="IMAGE_PATHS.ICONS_SOCIAL.MESSAGE"
      mode="aspectFit"
      <!-- #ifdef H5 -->
      role="img"
      :aria-label="t('login.wechatLogin')"
      <!-- #endif -->
    />
    <text class="wechat-btn-text">{{ t('login.wechatLogin') }}</text>
  </view>
</template>

<style scoped>
.wechat-btn {
  width: 100%;
  height: 104rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-gradient-brand);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  box-shadow: var(--s-secondary-blue, 0 8rpx 32rpx rgba(91, 127, 255, 0.35));
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1), box-shadow var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.wechat-btn:active {
  transform: scale(0.97);
  box-shadow: var(--s-secondary-blue-sm, 0 4rpx 16rpx rgba(91, 127, 255, 0.2));
}

.wechat-btn--loading {
  opacity: 0.7;
  pointer-events: none;
}

.wechat-btn-icon {
  width: 40rpx;
  height: 40rpx;
  /* 白色 SVG 着色 */
  filter: brightness(0) invert(1);
}

.wechat-btn-text {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--c-text-inverse, #FFFFFF);
  letter-spacing: 0.04em;
}
</style>