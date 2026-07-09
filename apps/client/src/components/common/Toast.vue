<script setup lang="ts">
/**
 * Toast 通知组件
 *
 * 从顶部滑入的通知横幅，支持 success / error / warning / info 四种类型。
 * 使用 showToast() 函数调起，自动在 duration 后消失。
 *
 * 使用方式：
 *   import { showToast } from '@/components/common/Toast.vue'
 *   showToast('操作成功', 'success')
 */
import { ref, computed, onUnmounted } from "vue";

export interface ToastOptions {
  /** 消息内容 */
  message: string;
  /** 类型：success | error | warning | info */
  type?: "success" | "error" | "warning" | "info";
  /** 展示时长（ms），默认 2000 */
  duration?: number;
}

/** 当前活跃的 Toast 状态 */
const active = ref(false);
/** 是否正在退出动画中 */
const leaving = ref(false);
/** 当前 Toast 配置 */
const options = ref<ToastOptions>({ message: "" });

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let leaveTimer: ReturnType<typeof setTimeout> | null = null;
let resolvePromise: (() => void) | null = null;

/** 图标映射（使用纯 Unicode，避免依赖 emoji） */
const iconMap: Record<string, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "i",
};

/** 计算当前图标 */
const icon = computed(() => iconMap[options.value.type || "info"]);

/** 计算当前类型 */
const toastType = computed(() => options.value.type || "info");

/**
 * 显示 Toast 通知
 * @param message - 消息内容
 * @param type - 类型，默认 "info"
 * @param duration - 展示时长，默认 2000ms
 * @returns Promise，在 Toast 完全消失后 resolve
 */
export function showToast(
  message: string,
  type: ToastOptions["type"] = "info",
  duration = 2000
): Promise<void> {
  clearTimers();

  options.value = { message, type, duration };
  leaving.value = false;
  active.value = true;

  return new Promise<void>((resolve) => {
    resolvePromise = resolve;

    hideTimer = setTimeout(() => {
      hideToast();
    }, duration);
  });
}

/** 开始隐藏 Toast（执行退出动画） */
function hideToast() {
  leaving.value = true;

  leaveTimer = setTimeout(() => {
    active.value = false;
    leaving.value = false;
    if (resolvePromise) {
      resolvePromise();
      resolvePromise = null;
    }
  }, 250); // 与 CSS toast-slide-out 动画时长一致
}

/** 清除所有定时器 */
function clearTimers() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    leaveTimer = null;
  }
}

onUnmounted(() => {
  clearTimers();
});
</script>

<template>
  <view
    v-if="active"
    class="toast-notification"
    :class="[
      `toast-notification--${toastType}`,
      leaving ? 'toast-slide-out' : 'toast-slide-in'
    ]"
    @tap="hideToast"
  >
    <text class="toast-notification__icon">{{ icon }}</text>
    <text class="toast-notification__message">{{ options.message }}</text>
  </view>
</template>

<style scoped>
/* ================================================================
   Toast 通知组件 - 从顶部滑入（设计研究优化版）
   ================================================================ */

.toast-notification {
  position: fixed;
  top: calc(constant(safe-area-inset-top) + 24rpx);
  top: calc(env(safe-area-inset-top) + 24rpx);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 36rpx;
  border-radius: 48rpx;
  box-shadow: 0 8rpx 32rpx rgba(15, 23, 42, 0.12);
  max-width: 640rpx;
  min-width: 320rpx;
  will-change: transform, opacity;
}

/* ---- 颜色变体（使用 rgba 替代 color-mix） ---- */
.toast-notification--success {
  background: rgba(16, 185, 129, 0.1);
  border: 2rpx solid rgba(16, 185, 129, 0.2);
}
.toast-notification--error {
  background: rgba(239, 68, 68, 0.1);
  border: 2rpx solid rgba(239, 68, 68, 0.2);
}
.toast-notification--warning {
  background: rgba(245, 158, 11, 0.1);
  border: 2rpx solid rgba(245, 158, 11, 0.2);
}
.toast-notification--info {
  background: rgba(91, 127, 255, 0.1);
  border: 2rpx solid rgba(91, 127, 255, 0.18);
}

/* ---- 图标 ---- */
.toast-notification__icon {
  font-size: 28rpx;
  flex-shrink: 0;
  line-height: 1;
  font-weight: 700;
}
.toast-notification--success .toast-notification__icon { color: var(--c-success); }
.toast-notification--error .toast-notification__icon { color: var(--c-error); }
.toast-notification--warning .toast-notification__icon { color: var(--c-warning); }
.toast-notification--info .toast-notification__icon { color: var(--c-brand); }

/* ---- 消息文本 ---- */
.toast-notification__message {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--c-text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toast-notification--success .toast-notification__message { color: #065f46; }
.toast-notification--error .toast-notification__message { color: #991b1b; }
.toast-notification--warning .toast-notification__message { color: #92400e; }
.toast-notification--info .toast-notification__message { color: var(--c-brand-800); }

/* ---- 滑入动画（弹性缓动） ---- */
.toast-slide-in {
  animation: toast-slide-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes toast-slide-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* ---- 滑出动画 ---- */
.toast-slide-out {
  animation: toast-slide-out 250ms cubic-bezier(0.4, 0, 0.2, 1) both;
}
@keyframes toast-slide-out {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-100%);
  }
}
</style>
