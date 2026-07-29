<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '../../config/images';

defineProps<{
  school?: string;
}>();

const emit = defineEmits<{
  schoolTap: [];
  searchTap: [];
  notifyTap: [];
}>();

const { t } = useI18n();
</script>

<template>
  <view class="home-header">
    <view
      class="header-left"
      @tap="emit('schoolTap')"
      role="button"
      :aria-label="t('home.selectSchool')"
    >
      <text class="header-school">{{ school || t('home.welcome') }}</text>
      <image class="header-arrow" :src="IMAGE_PATHS.ICONS_COMMON.ARROW_RIGHT" mode="aspectFit" alt="" />
      <view class="header-badge">
        <text class="header-badge-text">{{ t('home.schoolLimited') }}</text>
      </view>
    </view>
    <view class="header-right">
      <view
        class="header-icon"
        @tap="emit('searchTap')"
        role="button"
        :aria-label="t('home.searchPlaceholder')"
      >
        <image class="header-icon-img" :src="IMAGE_PATHS.ICONS_COMMON.SEARCH" mode="aspectFit" alt="" />
      </view>
      <view
        class="header-icon"
        @tap="emit('notifyTap')"
        role="button"
        :aria-label="t('home.notifications')"
      >
        <image class="header-icon-img" :src="IMAGE_PATHS.ICONS_COMMON.NOTIFICATION" mode="aspectFit" alt="" />
        <view class="header-dot" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.header-school {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
  max-width: 240rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.header-arrow {
  width: 28rpx;
  height: 28rpx;
  transform: rotate(90deg);
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}
.header-badge {
  padding: 4rpx 16rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand-50);
  border: 1rpx solid var(--c-brand-100);
}
.header-badge-text {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-brand);
}
.header-right {
  display: flex;
  gap: 16rpx;
}
.header-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-tertiary);
  position: relative;
}
.header-icon-img {
  width: 36rpx;
  height: 36rpx;
}
/* #ifdef H5 */
.header-icon:hover { background: var(--c-brand-100); }
/* #endif */
.header-dot {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-error);
  border: 3rpx solid var(--c-bg-container, #FFFFFF);
}
</style>
