<script setup lang="ts">
/**
 * 全局发帖悬浮按钮（GlobalPublishFab）
 *
 * 固定在屏幕右下角、底部导航栏正上方的绿色圆形按钮：
 * - 默认：圆形 + 中间黑色加号。
 * - 按压：轻微缩小（scale 0.92）+ 触觉反馈（震动）。
 * - 点击：按钮从圆形水平向左侧拉长，过渡为圆角矩形，轻快柔和（300ms，ease），
 *   完成后跳转发帖编辑页；返回本页时恢复圆形初始状态。
 * - 位置完全固定，不随页面滚动移动，层级高于底部导航栏。
 */
import { ref, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useAppConfigStore } from "../../stores/app-config";

const { t } = useI18n();
const appConfigStore = useAppConfigStore();

const emit = defineEmits<{
  (e: "publish"): void;
}>();

/** 是否处于按压态（缩放反馈） */
const isPressed = ref(false);
/** 是否展开（圆形 → 圆角矩形） */
const isExpanded = ref(false);

let expandTimer: ReturnType<typeof setTimeout> | undefined;
let resetTimer: ReturnType<typeof setTimeout> | undefined;

// 2026-09-07 R16：产品要求移除「发动态」点击震动反馈（项目已统一禁用震动，
// 此处此前绕过 utils/haptic 直接调 uni.vibrateShort，一并移除）

/** 手指按下：缩放 */
function onTouchStart() {
  isPressed.value = true;
}

/** 手指抬起：从圆形拉长为圆角矩形，完成后跳转 */
function onTouchEnd() {
  if (!isPressed.value) return;
  isPressed.value = false;
  triggerExpandAndNavigate();
}

/** 手指移动（取消）：恢复按压态 */
function onTouchCancel() {
  isPressed.value = false;
}

/** 展开动画 + 延迟跳转 */
function triggerExpandAndNavigate() {
  if (isExpanded.value) return; // 防止重复触发
  isExpanded.value = true;
  clearTimeout(expandTimer);
  // 动画周期 300ms（ease），完成后跳转
  expandTimer = setTimeout(() => {
    emit("publish");
    // 跳转后让按钮恢复圆形，保证返回本页时为初始状态
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      isExpanded.value = false;
    }, 420);
  }, 300);
}

/** 回到本页时，恢复圆形初始状态 */
onShow(() => {
  clearTimeout(expandTimer);
  clearTimeout(resetTimer);
  isPressed.value = false;
  isExpanded.value = false;
});

onUnmounted(() => {
  clearTimeout(expandTimer);
  clearTimeout(resetTimer);
});
</script>

<template>
  <!-- B6：后台关闭发帖功能（post_publish_open=false）→ 隐藏全局发帖 FAB -->
  <view
    v-if="appConfigStore.isPostPublishOpen"
    class="global-fab"
    :class="{ 'global-fab--pressed': isPressed, 'global-fab--expanded': isExpanded }"
    role="button"
    :aria-label="t('common.publish')"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
    @tap="onTouchEnd"
  >
    <view class="global-fab__content">
      <text class="global-fab__plus">＋</text>
      <text class="global-fab__label">发动态</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* 固定在屏幕右下角、底部导航栏正上方，不随滚动移动，层级高于导航栏 */
.global-fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(env(safe-area-inset-bottom) + 170rpx);
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #36C99A;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(54, 201, 154, 0.4);
  z-index: 1000;
  /* 圆 → 圆角矩形（水平向左拉长）过渡：宽/圆角/缩放均走 ease，柔和轻快 */
  transition:
    width 300ms cubic-bezier(0.25, 0.1, 0.25, 1),
    border-radius 300ms cubic-bezier(0.25, 0.1, 0.25, 1),
    transform 140ms ease;
  box-sizing: border-box;
}

/* 按压反馈：轻微缩小 */
.global-fab--pressed {
  transform: scale(0.92);
}

/* 展开态：从圆形水平拉长为大圆角矩形 */
.global-fab--expanded {
  width: 240rpx;
  border-radius: 44rpx;
}

.global-fab__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  width: 100%;
  height: 100%;
}

.global-fab__plus {
  font-size: 44rpx;
  color: #0B1B16;
  font-weight: 700;
  line-height: 1;
  transition: opacity 200ms ease;
}

.global-fab__label {
  font-size: 26rpx;
  color: #0B1B16;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  width: 0;
  overflow: hidden;
  transition: opacity 200ms ease 60ms;
}

.global-fab--expanded .global-fab__label {
  opacity: 1;
  width: auto;
}
</style>
