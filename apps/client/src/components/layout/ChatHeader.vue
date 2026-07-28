<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';

const props = defineProps<{
  title?: string;
}>();

const emit = defineEmits<{
  searchTap: [];
  addTap: [];
}>();

const { t } = useI18n();
const titleLabel = computed(() => props.title || t('chat.headerTitle'));
</script>

<template>
  <view
    class="chat-header"
    role="banner"
    :aria-label="titleLabel"
  >
    <text class="chat-title">{{ titleLabel }}</text>
    <view class="chat-icons">
      <view
        class="chat-icon"
        @tap="emit('searchTap')"
        role="button"
        :aria-label="t('chat.searchIconAria')"
      >
        <image class="chat-icon-img" :src="IMAGE_PATHS.ICONS_COMMON.SEARCH" mode="aspectFit" alt="" />
      </view>
      <view
        class="chat-icon"
        @tap="emit('addTap')"
        role="button"
        :aria-label="t('chat.addIconAria')"
      >
        <image class="chat-icon-img" :src="IMAGE_PATHS.ICONS_COMMON.ADD" mode="aspectFit" alt="" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx 20rpx;
  background: var(--c-bg-container);
  border-bottom: 1rpx solid var(--c-border-light);
}
.chat-title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
  letter-spacing: -0.02em;
}
.chat-icons {
  display: flex;
  gap: 16rpx;
}
.chat-icon {
  /* 修复 P2（触摸目标过小）：从 64rpx 调整为 88rpx（44px @2x），满足 iOS HIG / Material Design 标准 */
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--c-neutral-50);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-tertiary);
  transition: background 150ms ease;
}
.chat-icon-img {
  width: 40rpx;
  height: 40rpx;
}
.chat-icon:active {
  background: var(--c-brand-100);
  transform: scale(0.95);
}
</style>
