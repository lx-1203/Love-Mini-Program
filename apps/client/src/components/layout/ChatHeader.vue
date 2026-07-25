<script setup lang="ts">
import { designTokens } from '../../theme/tokens';
import { IMAGE_PATHS } from '../../config/images';

defineProps<{
  title?: string;
}>();

const emit = defineEmits<{
  searchTap: [];
  addTap: [];
}>();

const t = designTokens;
</script>

<template>
  <view class="chat-header">
    <text class="chat-title">{{ title || '消息' }}</text>
    <view class="chat-icons">
      <view class="chat-icon" @tap="emit('searchTap')">
        <image class="chat-icon-img" :src="IMAGE_PATHS.ICONS_COMMON.SEARCH" mode="aspectFit" />
      </view>
      <view class="chat-icon" @tap="emit('addTap')">
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
