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
    <!-- #ifdef H5 -->
    role="banner"
    :aria-label="titleLabel"
    <!-- #endif -->
  >
    <text class="chat-title">{{ titleLabel }}</text>
    <view class="chat-icons">
      <view
        class="chat-icon"
        @tap="emit('searchTap')"
        <!-- #ifdef H5 -->
        role="button"
        :aria-label="t('chat.searchIconAria')"
        <!-- #endif -->
      >
        <image class="chat-icon-img" :src="IMAGE_PATHS.ICONS_COMMON.SEARCH" mode="aspectFit" />
      </view>
      <view
        class="chat-icon"
        @tap="emit('addTap')"
        <!-- #ifdef H5 -->
        role="button"
        :aria-label="t('chat.addIconAria')"
        <!-- #endif -->
      >
        <image class="chat-icon-img" :src="IMAGE_PATHS.ICONS_COMMON.ADD" mode="aspectFit" />
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
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--c-neutral-50);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: var(--c-text-tertiary);
  cursor: pointer;
  transition: background 150ms ease;
}
.chat-icon:active {
  background: var(--c-brand-100);
  transform: scale(0.95);
}
</style>
