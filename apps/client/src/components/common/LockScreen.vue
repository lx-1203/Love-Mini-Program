<script setup lang="ts">
/**
 * LockScreen - 资料完善锁定页面组件
 *
 * 当用户资料完善度未达到 100% 时，拦截 likes/village/messages/profile 等页面，
 * 展示锁定状态，引导用户完善资料。
 */
import { computed } from "vue";
import { openAppPath } from "../../utils/navigation";

const props = defineProps<{
  /** 当前页面名称，用于动态文案 */
  pageName?: string;
  /** 当前完善度百分比 */
  completionPercent?: number;
}>();

/**
 * 根据页面名称生成对应的锁定文案
 */
const lockMessage = computed(() => {
  const name = props.pageName || "此功能";
  return `完善资料后才能解锁「${name}」哦`;
});

/**
 * 副文案
 */
const subMessage = computed(() => {
  if (props.completionPercent !== undefined && props.completionPercent > 0) {
    return `资料完善度 ${props.completionPercent}%，继续加油～`;
  }
  return "完善资料，开启更多校园恋爱功能";
});

/**
 * 跳转到资料完善页
 */
function goToProfileSetup() {
  openAppPath("/subpackages/setup/profile/index");
}
</script>

<template>
  <view class="lock-screen">
    <!-- 模糊头像装饰背景 -->
    <view class="lock-screen__decoration">
      <view class="blur-avatar blur-avatar--left" />
      <view class="blur-avatar blur-avatar--center" />
      <view class="blur-avatar blur-avatar--right" />
    </view>

    <!-- 插画区域 -->
    <view class="lock-screen__illustration">
      <view class="illustration-couple">
        <view class="phone phone--left">
          <view class="phone-screen">
            <view class="phone-heart">💕</view>
          </view>
        </view>
        <view class="heart-float">💖</view>
        <view class="phone phone--right">
          <view class="phone-screen">
            <view class="phone-heart">💕</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 文案区域 -->
    <view class="lock-screen__content">
      <text class="lock-screen__title">{{ lockMessage }}</text>
      <text class="lock-screen__subtitle">{{ subMessage }}</text>
    </view>

    <!-- 操作按钮 -->
    <view class="lock-screen__action">
      <button class="lock-screen__btn" @tap="goToProfileSetup">
        <text class="lock-screen__btn-text">立即完善</text>
      </button>
    </view>

    <!-- 底部提示 -->
    <view class="lock-screen__footer">
      <text class="lock-screen__footer-text">资料越完善，匹配越精准</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.lock-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 48rpx 40rpx;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 60%, #f8fafc 100%);
  position: relative;
  overflow: hidden;
}

/* ========== 模糊头像装饰 ========== */
.lock-screen__decoration {
  position: absolute;
  top: 120rpx;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: -20rpx;
  pointer-events: none;
  z-index: 0;
}

.blur-avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--td-brand-color-3), var(--td-brand-color-5));
  filter: blur(16rpx);
  opacity: 0.5;
}

.blur-avatar--left {
  transform: translateX(30rpx) scale(0.9);
  background: linear-gradient(135deg, #93c5fd, #60a5fa);
}

.blur-avatar--center {
  width: 160rpx;
  height: 160rpx;
  z-index: 1;
  opacity: 0.7;
  filter: blur(12rpx);
}

.blur-avatar--right {
  transform: translateX(-30rpx) scale(0.9);
  background: linear-gradient(135deg, #fbcfe8, #f9a8d4);
}

/* ========== 插画区域 - 校园情侣风格 ========== */
.lock-screen__illustration {
  position: relative;
  z-index: 1;
  margin-bottom: 48rpx;
  margin-top: 160rpx;
}

.illustration-couple {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.phone {
  width: 120rpx;
  height: 200rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(37, 99, 235, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #e2e8f0;
}

.phone-screen {
  width: 96rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.phone-heart {
  font-size: 36rpx;
}

.heart-float {
  font-size: 48rpx;
  animation: float 2s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-16rpx) scale(1.1);
  }
}

/* ========== 文案区域 ========== */
.lock-screen__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 48rpx;
  z-index: 1;
}

.lock-screen__title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
  text-align: center;
  line-height: 1.4;
}

.lock-screen__subtitle {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
  text-align: center;
  line-height: 1.5;
}

/* ========== 操作按钮 ========== */
.lock-screen__action {
  width: 100%;
  max-width: 480rpx;
  margin-bottom: 32rpx;
  z-index: 1;
}

.lock-screen__btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, var(--td-brand-color-6), var(--td-brand-color-7));
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.25);
  transition: transform 0.2s ease;
}

.lock-screen__btn:active {
  transform: scale(0.98);
}

.lock-screen__btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}

/* ========== 底部提示 ========== */
.lock-screen__footer {
  z-index: 1;
}

.lock-screen__footer-text {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}
</style>
