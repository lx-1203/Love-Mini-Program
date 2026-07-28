<script lang="ts">
/**
 * Toast 通知组件
 *
 * 从顶部滑入的通知横幅，支持 success / error / warning / info 四种类型。
 * 使用 showToast() 函数调起，自动在 duration 后消失。
 *
 * i18n 用法示例（文案统一从 i18n 资源读取，避免硬编码）：
 *   import { showToast } from '@/components/common/Toast.vue'
 *   import { t } from '@/i18n'
 *   // 操作成功提示：原硬编码 "操作成功" 替换为 t('common.success')
 *   showToast(t('common.success'), 'success')
 *   // 网络错误提示：原硬编码 "网络错误" 替换为 t('common.networkError')
 *   showToast(t('common.networkError'), 'error')
 *
 * 队列管理：新 toast 调用时，旧 toast 先淡出再显示新的，避免互相干扰。
 *
 * 注：showToast/showSuccessToast/showErrorToast 为非组件场景的便利封装，
 * 需作为模块导出，故使用普通 <script> + <script setup> 双脚本块结构。
 */
import { ref, computed, onUnmounted } from "vue";
import { IMAGE_PATHS } from "../../config/images";
// 引入全局 t 函数：Toast 组件为非组件场景的便利封装，使用全局 t 与组件内 useI18n().t 行为一致
import { t } from "../../i18n";

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

/** 等待中的 Toast 队列（新 toast 调用时，旧 toast 退出后再展示） */
interface QueueItem {
  message: string;
  type: ToastOptions["type"];
  duration: number;
  resolve: () => void;
}
const queue: QueueItem[] = [];

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let leaveTimer: ReturnType<typeof setTimeout> | null = null;
let resolvePromise: (() => void) | null = null;

/**
 * 图标映射：使用 SVG 图片资源替代 Unicode 字符
 * 旧版微信基础库对部分 Unicode 字符（✓ ✕ ❗）渲染为方框，SVG 方案兼容性更好。
 */
const iconSrcMap: Record<NonNullable<ToastOptions["type"]>, string> = {
  success: IMAGE_PATHS.ICONS_COMMON.CHECK.replace('.png', '.svg'),
  error: IMAGE_PATHS.ICONS_COMMON.CLOSE.replace('.png', '.svg'),
  warning: IMAGE_PATHS.ICONS_COMMON.NOTIFICATION.replace('.png', '.svg'),
  info: IMAGE_PATHS.ICONS_COMMON.NOTIFICATION.replace('.png', '.svg'),
};

/** 计算当前图标资源路径 */
const iconSrc = computed(() => iconSrcMap[options.value.type || "info"]);

/** 计算当前类型 */
const toastType = computed(() => options.value.type || "info");

/**
 * 显示 Toast 通知
 * @param message - 消息内容
 * @param type - 类型，默认 "info"
 * @param duration - 展示时长，默认 2000ms
 * @returns Promise，在 Toast 完全消失后 resolve
 *
 * 队列策略：若有正在展示的 Toast，先将其淡出，再展示新的；保证同时只显示一个 Toast。
 */
export function showToast(
  message: string,
  type: ToastOptions["type"] = "info",
  duration = 2000
): Promise<void> {
  return new Promise<void>((resolve) => {
    // 若当前有活跃 Toast，先入队等待
    if (active.value && !leaving.value) {
      queue.push({ message, type, duration, resolve });
      // 触发当前 Toast 提前退出
      hideToast();
      return;
    }

    options.value = { message, type, duration };
    leaving.value = false;
    active.value = true;

    resolvePromise = resolve;

    hideTimer = setTimeout(() => {
      hideToast();
    }, duration);
  });
}

/**
 * 显示「操作成功」Toast（i18n 用法示例）。
 *
 * 默认文案通过 t('common.success') 从 i18n 资源读取，替代原硬编码 "操作成功"。
 * 调用方传入自定义 message 时仍以调用方为准，仅在不传时使用 i18n 默认文案。
 *
 * @param message  自定义消息（可选，默认读取 common.success）
 * @param duration 展示时长，默认 2000ms
 */
export function showSuccessToast(
  message?: string,
  duration = 2000
): Promise<void> {
  const text = message ?? t("common.success");
  return showToast(text, "success", duration);
}

/**
 * 显示「网络错误」Toast（i18n 用法示例）。
 *
 * 默认文案通过 t('common.networkError') 从 i18n 资源读取，替代原硬编码 "网络错误"。
 * 调用方传入自定义 message 时仍以调用方为准，仅在不传时使用 i18n 默认文案。
 *
 * @param message  自定义消息（可选，默认读取 common.networkError）
 * @param duration 展示时长，默认 2000ms
 */
export function showErrorToast(
  message?: string,
  duration = 2000
): Promise<void> {
  const text = message ?? t("common.networkError");
  return showToast(text, "error", duration);
}

/** 开始隐藏 Toast（执行退出动画） */
function hideToast() {
  if (leaving.value) return;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  leaving.value = true;

  leaveTimer = setTimeout(() => {
    active.value = false;
    leaving.value = false;
    if (resolvePromise) {
      resolvePromise();
      resolvePromise = null;
    }

    // 队列中有等待的 Toast，继续展示下一个
    if (queue.length > 0) {
      const next = queue.shift()!;
      // 异步触发，确保上一个 Toast 完全消失后再展示
      setTimeout(() => {
        showToast(next.message, next.type, next.duration).then(next.resolve);
      }, 50);
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

/**
 * 重置 Toast 模块级状态（仅供测试使用）。
 *
 * 设计原因：Toast 使用模块级 ref（active/leaving/options）与队列管理,
 * 在单元测试中若不重置，前一个用例残留的 active=true 会让后续 showToast
 * 调用进入队列分支，导致 options.value 不更新、断言失败。
 * 生产代码不应调用此函数。
 */
export function __resetToastState() {
  clearTimers();
  active.value = false;
  leaving.value = false;
  options.value = { message: "" };
  queue.length = 0;
  resolvePromise = null;
}

onUnmounted(() => {
  clearTimers();
  // 清空队列，避免内存泄漏
  queue.forEach((item) => item.resolve());
  queue.length = 0;
});

// 导出供模板使用：使用 Options API 风格的 setup 函数返回响应式状态
// showToast/showSuccessToast/showErrorToast 作为模块具名导出供外部调用
export default {
  setup() {
    return { active, leaving, options, iconSrc, toastType, hideToast };
  },
};
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
    role="alert"
    aria-live="assertive"
  >
    <!-- SVG 图标替代 Unicode 字符，兼容旧版微信基础库 -->
    <image class="toast-notification__icon" :src="iconSrc" mode="aspectFit" alt="" />
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
  box-shadow: 0 8rpx 32rpx var(--c-neutral-shadow-xl, rgba(15, 23, 42, 0.12));
  max-width: 640rpx;
  min-width: 320rpx;
  will-change: transform, opacity;
}

/* ---- 颜色变体（使用 rgba 替代 color-mix） ---- */
.toast-notification--success {
  background: var(--c-success-bg-tint, rgba(16, 185, 129, 0.1));
  border: 2rpx solid var(--c-success-border-tint, rgba(16, 185, 129, 0.2));
}
.toast-notification--error {
  background: var(--c-red-bg-tint, rgba(239, 68, 68, 0.1));
  border: 2rpx solid var(--c-red-border-tint, rgba(239, 68, 68, 0.2));
}
.toast-notification--warning {
  background: var(--c-warning-bg-tint, rgba(245, 158, 11, 0.1));
  border: 2rpx solid var(--c-warning-border-tint, rgba(245, 158, 11, 0.2));
}
.toast-notification--info {
  background: var(--c-secondary-blue-bg-tint, rgba(91, 127, 255, 0.1));
  border: 2rpx solid var(--c-secondary-blue-border-tint-strong, rgba(91, 127, 255, 0.18));
}

/* ---- 图标 ---- */
.toast-notification__icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}
.toast-notification--success .toast-notification__icon { color: var(--c-success); }
.toast-notification--error .toast-notification__icon { color: var(--c-error); }
.toast-notification--warning .toast-notification__icon { color: var(--c-warning); }
.toast-notification--info .toast-notification__icon { color: var(--c-brand); }

/* ---- 消息文本 ---- */
.toast-notification__message {
  font-size: var(--fs-md, 26rpx);
  font-weight: 500;
  color: var(--c-text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toast-notification--success .toast-notification__message { color: var(--c-text-success-dark, #065f46); }
.toast-notification--error .toast-notification__message { color: var(--c-text-error-dark, #991b1b); }
.toast-notification--warning .toast-notification__message { color: var(--c-text-warning-dark, #92400e); }
.toast-notification--info .toast-notification__message { color: var(--c-brand-800); }

/* ---- 滑入动画（弹性缓动） ---- */
.toast-slide-in {
  animation: toast-slide-in var(--d-fade, 300ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
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
  animation: toast-slide-out var(--d-slow, 250ms) cubic-bezier(0.4, 0, 0.2, 1) both;
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
