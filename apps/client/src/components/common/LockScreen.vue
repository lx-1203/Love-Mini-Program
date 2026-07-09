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
    <!-- 径向渐变心动氛围叠加层 -->
    <view class="lock-screen__atmosphere" />

    <!-- 模糊头像装饰背景 -->
    <view class="lock-screen__decoration">
      <view class="blur-avatar blur-avatar--1" />
      <view class="blur-avatar blur-avatar--2" />
      <view class="blur-avatar blur-avatar--3" />
      <view class="blur-avatar blur-avatar--4" />
      <view class="blur-avatar blur-avatar--5" />
    </view>

    <!-- 插画区域 -->
    <view class="lock-screen__illustration">
      <view class="illustration-couple">
        <view class="phone phone--left">
          <view class="phone-screen">
            <view class="phone-heart">
              <image class="phone-heart__img" src="/static/assets/icons/social/like-filled.png" mode="aspectFit" />
            </view>
          </view>
        </view>
        <view class="heart-float">
          <image class="heart-float__img" src="/static/assets/icons/social/like-filled.png" mode="aspectFit" />
        </view>
        <view class="phone phone--right">
          <view class="phone-screen">
            <view class="phone-heart">
              <image class="phone-heart__img" src="/static/assets/icons/social/like-filled.png" mode="aspectFit" />
            </view>
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
  min-height: 100%;
  height: 100%;
  padding: var(--sp-10) var(--sp-8);
  padding-bottom: calc(constant(safe-area-inset-bottom) + var(--sp-10));
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-10));
  background: var(--c-gradient-page);
  position: relative;
  overflow: hidden;
}

/* ========== 径向渐变心动氛围叠加层（M-14） ========== */
.lock-screen__atmosphere {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(63, 207, 142, 0.18) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 30%, rgba(249, 168, 196, 0.2) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 80%, rgba(124, 217, 166, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 15% 70%, rgba(244, 114, 182, 0.12) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

/* ========== 模糊头像装饰（增强若隐若现感 M-14） ========== */
.lock-screen__decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.blur-avatar {
  position: absolute;
  border-radius: var(--r-full);
  filter: blur(40rpx);

  &--1 {
    width: 320rpx;
    height: 320rpx;
    top: -80rpx;
    left: -100rpx;
    background: linear-gradient(135deg, var(--c-brand-200), var(--c-brand-400));
    opacity: 0.15;
  }

  &--2 {
    width: 280rpx;
    height: 280rpx;
    top: 100rpx;
    right: -80rpx;
    background: linear-gradient(135deg, var(--c-romance-200), var(--c-romance-400));
    opacity: 0.12;
  }

  &--3 {
    width: 360rpx;
    height: 360rpx;
    top: 200rpx;
    left: -60rpx;
    background: linear-gradient(135deg, var(--c-brand-100), var(--c-brand-300));
    opacity: 0.1;
  }

  &--4 {
    width: 240rpx;
    height: 240rpx;
    bottom: 200rpx;
    right: -40rpx;
    background: linear-gradient(135deg, var(--c-romance-100), var(--c-romance-300));
    opacity: 0.13;
  }

  &--5 {
    width: 200rpx;
    height: 200rpx;
    bottom: -60rpx;
    left: 20%;
    background: linear-gradient(135deg, var(--c-brand-200), var(--c-romance-200));
    opacity: 0.12;
  }
}

/* ========== 插画区域 ========== */
.lock-screen__illustration {
  position: relative;
  z-index: 1;
  margin-bottom: var(--sp-10);
  margin-top: 80rpx;
}

.illustration-couple {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
}

.phone {
  width: 120rpx;
  height: 200rpx;
  border-radius: var(--r-xl);
  background: var(--c-neutral-0);
  box-shadow: var(--s-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--avatar-border);
}

.phone-screen {
  width: 96rpx;
  height: 160rpx;
  border-radius: var(--r-md);
  background: var(--c-gradient-page);
  display: flex;
  align-items: center;
  justify-content: center;
}

.phone-heart {
  font-size: var(--fs-2xl);
}

.heart-float {
  font-size: var(--fs-5xl);
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
  gap: var(--sp-4);
  margin-bottom: var(--sp-10);
  z-index: 1;
}

.lock-screen__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
  line-height: 1.4;
}

.lock-screen__subtitle {
  font-size: var(--fs-lg);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.5;
}

/* ========== 操作按钮 ========== */
.lock-screen__action {
  width: 100%;
  max-width: 480rpx;
  margin-bottom: var(--sp-8);
  z-index: 1;
}

.lock-screen__btn {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-brand-lg);
}

.lock-screen__btn:active {
  transform: scale(0.98);
}

.lock-screen__btn-text {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--c-neutral-0);
}

/* ========== 底部提示 ========== */
.lock-screen__footer {
  z-index: 1;
}

.lock-screen__footer-text {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}
</style>
