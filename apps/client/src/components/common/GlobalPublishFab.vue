<script setup lang="ts">
/**
 * 全局发帖悬浮按钮（GlobalPublishFab）
 *
 * 固定在右下角的绿色圆形按钮，点击跳转发帖编辑页。
 * 位置固定，不可拖动。
 */
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import { useAppConfigStore } from "../../stores/app-config";

const { t } = useI18n();
const appConfigStore = useAppConfigStore();

const emit = defineEmits<{
  (e: "publish"): void;
}>();

function handleTap() {
  emit("publish");
}
</script>

<template>
  <!-- B6：后台关闭发帖功能（post_publish_open=false）→ 隐藏全局发帖 FAB -->
  <view
    v-if="appConfigStore.isPostPublishOpen"
    class="global-fab"
    role="button"
    :aria-label="t('common.publish')"
    @tap="handleTap"
  >
    <image class="global-fab__icon" :src="IMAGE_PATHS.ICONS_EMOJI.PLUS" mode="aspectFit" lazy-load alt="" />
  </view>
</template>

<style scoped lang="scss">
.global-fab {
  position: fixed;
  bottom: 180rpx;
  right: 32rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #36C99A;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(54, 201, 154, 0.4);
  z-index: 999;
}

.global-fab__icon {
  width: 48rpx;
  height: 48rpx;
  pointer-events: none;
}
</style>
