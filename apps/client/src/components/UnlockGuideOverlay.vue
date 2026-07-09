<script setup lang="ts">
/**
 * UnlockGuideOverlay - 首次进入锁定页一次性教学蒙层
 *
 * Phase 4 任务 20：用户首次进入锁定页时，在 UnlockGuideModal 之上展示全屏蒙层，
 * 高亮「去完善资料」主按钮，引导用户理解弹窗用途。
 *
 * 行为：
 *   - 通过 uni.getStorageSync('unlock_guide_shown') 判断是否已展示过
 *   - 仅展示一次，用户点击「我知道了」后调用 uni.setStorageSync 持久化标记
 *   - 关闭后不再出现，避免重复打扰
 *
 * 使用方式：
 *   <UnlockGuideOverlay :visible="overlayVisible" @known="handleKnown" />
 *
 * 通过 props.visible 由父组件（store）控制显隐，自身只负责渲染与"我知道了"事件回传。
 */
import { watch } from "vue";

/** 组件 Props */
const props = defineProps<{
  /** 蒙层是否可见（由 store.overlayVisible 控制） */
  visible: boolean;
}>();

/** 组件 Emits */
const emit = defineEmits<{
  /** 用户点击「我知道了」按钮 */
  (e: "known"): void;
}>();

/**
 * 监听 visible 变化：仅在变为可见时进行首次展示判断
 * 此处仅做日志记录便于调试，实际显隐完全由 props.visible 控制
 */
watch(
  () => props.visible,
  (val) => {
    if (val) {
      console.debug("[UnlockGuideOverlay] 展示首次引导蒙层");
    }
  }
);

/**
 * 点击「我知道了」按钮
 * 通知父组件执行 uni.setStorageSync 持久化（store.hideOverlay 中处理）
 */
function handleKnown() {
  emit("known");
}
</script>

<template>
  <view v-if="visible" class="unlock-overlay">
    <!-- 全屏半透明蒙层（更深，让用户专注引导内容） -->
    <view class="unlock-overlay__mask" />

    <!-- 引导提示卡片（定位在屏幕中下部，靠近主按钮位置） -->
    <view class="unlock-overlay__hint">
      <!-- 高亮指示箭头（指向下方的「去完善资料」按钮） -->
      <view class="unlock-overlay__arrow">
        <text class="unlock-overlay__arrow-icon">↓</text>
      </view>

      <!-- 引导文案 -->
      <text class="unlock-overlay__title">解锁功能</text>
      <text class="unlock-overlay__desc">点击「去完善资料」即可解锁此功能</text>

      <!-- 「我知道了」按钮 -->
      <button
        class="unlock-overlay__btn"
        @tap="handleKnown"
      >
        <text class="unlock-overlay__btn-text">我知道了</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   首次引导蒙层 - 全屏覆盖，高亮主按钮区域
   ================================================================ */

.unlock-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: calc(env(safe-area-inset-bottom) + 80rpx);
  pointer-events: auto;
  animation: overlay-fade-in 250ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes overlay-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 全屏蒙层 */
.unlock-overlay__mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.72);
}

/* 引导提示卡片 */
.unlock-overlay__hint {
  position: relative;
  z-index: 1;
  width: 600rpx;
  max-width: 86%;
  padding: 40rpx 40rpx 32rpx;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 28rpx;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.24);
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: hint-pop-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes hint-pop-in {
  from {
    opacity: 0;
    transform: translateY(40rpx) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 箭头指示 */
.unlock-overlay__arrow {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-brand-500, #3b82f6), var(--c-brand-700, #1d4ed8));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  animation: arrow-bounce 1.4s ease-in-out infinite;
}

@keyframes arrow-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(8rpx);
  }
}

.unlock-overlay__arrow-icon {
  font-size: 40rpx;
  color: #ffffff;
  font-weight: 700;
  line-height: 1;
}

/* 引导标题 */
.unlock-overlay__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--c-text-primary, #0f172a);
  margin-bottom: 12rpx;
}

/* 引导描述 */
.unlock-overlay__desc {
  font-size: 26rpx;
  color: var(--c-text-secondary, #475569);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 32rpx;
  padding: 0 16rpx;
}

/* 「我知道了」按钮 */
.unlock-overlay__btn {
  width: 100%;
  height: 84rpx;
  border-radius: 42rpx;
  background: linear-gradient(135deg, var(--c-brand-500, #3b82f6), var(--c-brand-700, #1d4ed8));
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  box-shadow: 0 6rpx 20rpx rgba(59, 130, 246, 0.32);
  &::after {
    border: none;
  }
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.unlock-overlay__btn:active {
  transform: scale(0.98);
}

.unlock-overlay__btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}
</style>