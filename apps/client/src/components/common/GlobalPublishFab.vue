<script setup lang="ts">
/**
 * 全局发帖悬浮按钮（GlobalPublishFab）
 *
 * Task B4：圆形 FAB（104rpx 直径、border-radius 50%），品牌色渐变背景，内含加号 SVG。
 * 按下/悬停时 border-radius 过渡到 24rpx 方形并 scale 0.9，松开恢复圆形。
 *
 * 使用方式：
 * <GlobalPublishFab @publish="handlePublish" />
 *
 * 事件：
 * - publish：点击 FAB 时触发，由调用方决定跳转目标（如发帖编辑页）
 */
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
// B6：后台配置即时生效——发帖开关（post_publish_open=false 时隐藏 FAB）
import { useAppConfigStore } from "../../stores/app-config";

const { t } = useI18n();
const appConfigStore = useAppConfigStore();

const emit = defineEmits<{
  (e: "publish"): void;
}>();

/** 点击 FAB：仅向上抛 publish 事件，跳转逻辑由页面侧决定 */
function handleTap() {
  emit("publish");
}
</script>

<template>
  <!-- B6：后台关闭发帖功能（post_publish_open=false）→ 隐藏全局发帖 FAB -->
  <view
    v-if="appConfigStore.isPostPublishOpen"
    class="global-fab press-feedback"
    hover-class="global-fab--pressed"
    hover-stay-time="120"
    role="button"
    :aria-label="t('common.publish')"
    @tap="handleTap"
  >
    <image class="global-fab__icon" :src="IMAGE_PATHS.ICONS_EMOJI.PLUS" mode="aspectFit" lazy-load alt="" />
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   GlobalPublishFab - 全局发帖悬浮按钮
   - var(--btn-height-lg)（104rpx）直径圆形，品牌色渐变背景
   - 按下：border-radius → var(--r-xl)（24rpx）方形 + scale 0.9（形态动画，使用 --d-bounce token）
   ================================================================ */
.global-fab {
  position: fixed;
  right: var(--page-padding);
  bottom: calc(env(safe-area-inset-bottom) + 180rpx);
  width: var(--btn-height-lg);
  height: var(--btn-height-lg);
  border-radius: var(--r-xl);
  background: var(--c-gradient-float-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-float-btn);
  z-index: 100;
  transition:
    border-radius var(--d-bounce, 400ms) cubic-bezier(0.34, 1.56, 0.64, 1),
    transform var(--d-bounce, 400ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 按压态（mp-weixin hover-class 与 H5 :active 共用形态：方形 → 微圆角 + 缩小） */
.global-fab--pressed {
  border-radius: var(--r-lg);
  transform: scale(0.98);
}

/* #ifdef H5 */
.global-fab:active {
  border-radius: var(--r-lg);
  transform: scale(0.98);
}
/* #endif */

.global-fab__icon {
  /* 固定布局尺寸（图标 56rpx），无对应 token */
  width: 56rpx;
  height: 56rpx;
  color: var(--c-neutral-0);
  pointer-events: none;
}
</style>
