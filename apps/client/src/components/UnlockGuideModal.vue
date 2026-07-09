<script setup lang="ts">
/**
 * UnlockGuideModal - 解锁引导弹窗组件
 *
 * Phase 4 任务 20：替换 profile-guard 静默重定向为友好的 Modal 弹窗引导。
 *
 * 当用户访问锁定页面（likes/village/messages）且资料未完善时弹出，
 * 提供两个操作：
 *   - 「去完善资料」（主按钮，蓝色主题）→ emit("confirm")，调用方跳转 setup 页
 *   - 「暂不完善」（次按钮）              → emit("cancel")，关闭弹窗
 *
 * 使用 uni-app 原生组件（view/text/button）保证跨端兼容（H5 + 小程序）。
 * 蓝色主题，与项目品牌色 var(--c-brand-*) 一致。
 */
import { computed } from "vue";

/** 组件 Props 定义 */
const props = defineProps<{
  /** 弹窗是否可见（支持 v-model:visible） */
  visible: boolean;
  /** 当前页面/功能标题（保留兼容，未使用则使用 featureName） */
  pageTitle?: string;
  /** 锁定功能名称，用于弹窗文案（如「喜欢列表」） */
  featureName?: string;
  /** 当前资料完善度百分比（可选，用于副文案展示） */
  completionPercent?: number;
}>();

/** 组件 Emits 定义 */
const emit = defineEmits<{
  /** visible 变化（v-model:visible 同步） */
  (e: "update:visible", value: boolean): void;
  /** 点击「去完善资料」主按钮 */
  (e: "confirm"): void;
  /** 点击「暂不完善」次按钮 */
  (e: "cancel"): void;
}>();

/** 弹窗主文案：根据 featureName 动态生成 */
const messageText = computed(() => {
  const name = props.featureName || props.pageTitle || "此功能";
  return `完成资料完善即可解锁 ${name}`;
});

/** 弹窗副文案：展示当前完善度，鼓励用户继续 */
const subtitleText = computed(() => {
  if (
    props.completionPercent !== undefined &&
    props.completionPercent > 0 &&
    props.completionPercent < 100
  ) {
    return `当前完善度 ${props.completionPercent}%，继续加油～`;
  }
  return "完善资料，开启更多校园恋爱功能";
});

/**
 * 点击主按钮「去完善资料」
 * 通知父组件执行跳转逻辑（store.confirm 会跳转到 setup 页）
 */
function handleConfirm() {
  emit("confirm");
}

/**
 * 点击次按钮「暂不完善」
 * 通知父组件关闭弹窗（store.hide 仅关闭弹窗，不跳转）
 */
function handleCancel() {
  emit("update:visible", false);
  emit("cancel");
}

/**
 * 点击遮罩层：与「暂不完善」一致，关闭弹窗
 * 让用户能够通过点击空白处快速 dismiss
 */
/* empty noop for event modifiers */
const noop = () => {};

function handleMaskClick() {
  handleCancel();
}

</script>

<template>
  <!-- 遮罩层 + 弹窗内容（v-if 控制整体显隐，配合动画类做淡入淡出） -->
  <view
    v-if="visible"
    class="unlock-modal"
    @tap="handleMaskClick"
  >
    <!-- 弹窗主体（阻止冒泡，避免点击内容区误关闭） -->
    <view class="unlock-modal__container" @tap.stop="noop">
      <!-- 顶部图标区域 -->
      <view class="unlock-modal__icon-wrap">
        <text class="unlock-modal__icon">🔒</text>
      </view>

      <!-- 标题 -->
      <text class="unlock-modal__title">解锁功能</text>

      <!-- 主文案 -->
      <text class="unlock-modal__message">{{ messageText }}</text>

      <!-- 副文案（完善度提示） -->
      <text class="unlock-modal__subtitle">{{ subtitleText }}</text>

      <!-- 按钮组 -->
      <view class="unlock-modal__actions">
        <!-- 主按钮：去完善资料 -->
        <button
          class="unlock-modal__btn unlock-modal__btn--primary"
          @tap.stop="handleConfirm"
        >
          <text class="unlock-modal__btn-text">去完善资料</text>
        </button>

        <!-- 次按钮：暂不完善 -->
        <button
          class="unlock-modal__btn unlock-modal__btn--secondary"
          @tap.stop="handleCancel"
        >
          <text class="unlock-modal__btn-text unlock-modal__btn-text--secondary">暂不完善</text>
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   解锁引导弹窗 - 蓝色主题，与项目品牌色一致
   ================================================================ */

.unlock-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  /* 淡入动画 */
  animation: unlock-fade-in 250ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes unlock-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 弹窗主体容器 */
.unlock-modal__container {
  width: 600rpx;
  max-width: 86%;
  padding: 56rpx 48rpx 40rpx;
  background: var(--c-text-inverse, #ffffff);
  border-radius: 32rpx;
  box-shadow: 0 16rpx 48rpx rgba(15, 23, 42, 0.16);
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 弹窗放大淡入动画 */
  animation: unlock-pop-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes unlock-pop-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 顶部图标 */
.unlock-modal__icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-brand-100, #dbeafe), var(--c-brand-200, #bfdbfe));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}

.unlock-modal__icon {
  font-size: 56rpx;
  line-height: 1;
}

/* 标题 */
.unlock-modal__title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--c-text-primary, #0f172a);
  margin-bottom: 16rpx;
  line-height: 1.4;
}

/* 主文案 */
.unlock-modal__message {
  font-size: 30rpx;
  color: var(--c-text-primary, #0f172a);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 12rpx;
  padding: 0 16rpx;
}

/* 副文案 */
.unlock-modal__subtitle {
  font-size: 26rpx;
  color: var(--c-text-secondary, #475569);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 40rpx;
}

/* 按钮组 */
.unlock-modal__actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* 通用按钮样式 */
.unlock-modal__btn {
  width: 100%;
  height: 92rpx;
  border-radius: 46rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  /* 移除 uni-app button 默认样式 */
  &::after {
    border: none;
  }
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.unlock-modal__btn:active {
  transform: scale(0.98);
}

/* 主按钮（蓝色） */
.unlock-modal__btn--primary {
  background: linear-gradient(135deg, var(--c-brand-500, #3b82f6), var(--c-brand-700, #1d4ed8));
  box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.32);
}

/* 次按钮（白底蓝字） */
.unlock-modal__btn--secondary {
  background: var(--c-bg-page, #f8fafc);
  border: 2rpx solid var(--c-border-light, #e2e8f0);
}

/* 按钮文案 */
.unlock-modal__btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

.unlock-modal__btn-text--secondary {
  color: var(--c-brand-700, #1d4ed8);
  font-weight: 500;
}
</style>