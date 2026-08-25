<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";

defineProps<{
  title: string;
  subtitle: string;
  searchActive: boolean;
}>();

const emit = defineEmits<{
  searchTap: [];
  closeSearch: [];
}>();

</script>

<template>
  <view class="message-header">
    <view class="message-header__content">
      <view class="message-header__title-row">
        <text class="message-header__title">{{ title }}</text>
        <view class="message-header__actions">
          <view class="message-header__action" hover-class="message-header__action--hover" @tap="emit('searchTap')">
            <image v-if="!searchActive" class="message-header__action-text" :src="IMAGE_PATHS.ICONS_EMOJI.SEARCH" mode="aspectFit" alt="" />
            <image v-else class="message-header__action-text" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
          </view>
          <view class="message-header__action" hover-class="message-header__action--hover">
            <text class="message-header__action-text">＋</text>
          </view>
        </view>
      </view>
      <text class="message-header__subtitle">{{ subtitle }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.message-header {
  position: relative;
  padding: 24rpx 32rpx 20rpx;
  background: #FFFFFF;
  overflow: hidden;
}
.message-header__content {
  position: relative;
}
.message-header__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.message-header__title {
  font-size: 48rpx;
  font-weight: 700;
  color: #333A37;
}
.message-header__subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 28rpx;
  color: #9AA39F;
}
.message-header__actions {
  display: flex;
  gap: 16rpx;
}
.message-header__action {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}
.message-header__action--hover {
  opacity: 0.7;
}
.message-header__action-text {
  font-size: 36rpx;
  color: #666666;
}

.message-header__action image.message-header__action-text {
  width: 34rpx;
  height: 34rpx;
}
</style>
