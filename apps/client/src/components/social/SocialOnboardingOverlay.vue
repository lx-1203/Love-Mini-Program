<!--
  社交升温引导浮层组件

  新用户首次进入时展示，通过6屏滑动引导用户理解社交漏斗升温路径。
  使用 uni.setStorageSync 存储"已看过引导"状态，避免重复展示。

  @example
  <SocialOnboardingOverlay @close="handleClose" @start="handleStart" />
-->
<!-- 普通 script 块：用于导出工具函数，供外部页面使用 -->
<script lang="ts">
export { hasSeenOnboarding, markOnboardingSeen } from './onboarding-utils';
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { TIER_ORDER, TIER_META } from '../../stores/social-progress'
import { markOnboardingSeen } from './onboarding-utils'
import { designTokens } from '../../theme/tokens'

const t = designTokens

// ==================== Props & Emits ====================

const emit = defineEmits<{
  /** 用户点击关闭（跳过引导） */
  close: []
  /** 用户完成引导，点击"开始探索" */
  start: []
}>()

// ==================== 常量 ====================

/** localStorage 键名 */


/** 引导页总数 */
const TOTAL_SCREENS = TIER_ORDER.length

// ==================== 状态 ====================

/** 当前滑动到的屏幕索引 */
const currentIndex = ref(0)

/** 引导是否已关闭 */
const dismissed = ref(false)

/** 引导页数据（从常量构建） */
const screens = computed(() =>
  TIER_ORDER.map((tier, index) => {
    const meta = TIER_META[tier]
    return {
      tier,
      step: index + 1,
      icon: meta?.icon ?? '',
      label: meta?.label ?? tier,
      desc: meta?.desc ?? '',
      /** 每个步骤的引导文案 */
      guideText: getGuideText(index),
    }
  })
)

// ==================== 工具函数 ====================

/**
 * 根据索引返回每个层级的引导文案
 */
function getGuideText(index: number): string {
  const texts = [
    '每天浏览为你精选的校园推荐卡片，\n发现身边有趣的灵魂，开始你的社交之旅。',
    '看到心动的人就大胆表达喜欢吧！\n每一次喜欢都是靠近TA的第一步。',
    '当你们相互喜欢时，就会触发双向匹配！\n这是属于你们两人的专属时刻。',
    '匹配成功后开启私信聊天，\n在轻松的氛围中了解彼此的故事。',
    '加入兴趣圈，参与热门话题讨论，\n让更多志同道合的人认识你。',
    '从线上走到线下，\n参加校园活动，享受真实相处的美好时光。',
  ]
  return texts[index] ?? ''
}

// ==================== 事件处理 ====================

/** swiper 切换事件 */
function onSwiperChange(e: { detail: { current: number } }) {
  currentIndex.value = e.detail.current
}

/** 点击跳过/关闭按钮 */
function handleDismiss() {
  dismissed.value = true
  markOnboardingSeen()
  emit('close')
}

/** 点击"开始探索"按钮 */
function handleStart() {
  dismissed.value = true
  markOnboardingSeen()
  emit('start')
}
</script>

<template>
  <view v-if="!dismissed" class="onboard-overlay">
    <!-- ========== 装饰：三个模糊头像营造若隐若现 ========== -->
    <view class="onboard-decor-avatars" aria-hidden="true">
      <image class="decor-avatar decor-avatar--1" src="/static/assets/images/avatars/avatar-3.jpg" mode="aspectFill" />
      <image class="decor-avatar decor-avatar--2" src="/static/assets/images/avatars/avatar-5.jpg" mode="aspectFill" />
      <image class="decor-avatar decor-avatar--3" src="/static/assets/images/avatars/avatar-8.jpg" mode="aspectFill" />
    </view>

    <!-- ========== 装饰：浮动小心形 CSS 动画 ========== -->
    <view class="onboard-decor-hearts" aria-hidden="true">
      <text class="floating-heart floating-heart--1">❤</text>
      <text class="floating-heart floating-heart--2">❤</text>
      <text class="floating-heart floating-heart--3">❤</text>
      <text class="floating-heart floating-heart--4">❤</text>
    </view>

    <!-- ========== 半透明遮罩 ========== -->
    <view class="onboard-mask" />
    <!-- ========== 半透明渐变叠加（粉→白） ========== -->
    <view class="onboard-overlay-gradient" />

    <!-- ========== 引导卡片容器 ========== -->
    <view class="onboard-card">
      <!-- 顶部操作栏 -->
      <view class="onboard-top">
        <text class="onboard-top__step">
          {{ currentIndex + 1 }} / {{ TOTAL_SCREENS }}
        </text>
        <text class="onboard-top__skip" @tap="handleDismiss">跳过</text>
      </view>

      <!-- 滑动内容区 -->
      <swiper
        class="onboard-swiper"
        :current="currentIndex"
        :indicator-dots="false"
        @change="onSwiperChange"
      >
        <swiper-item v-for="screen in screens" :key="screen.tier">
          <view class="onboard-screen">
            <!-- 层级图标 -->
            <view class="onboard-screen__icon-wrap">
              <image class="onboard-screen__icon-img" :src="screen.icon" mode="aspectFit" />
            </view>

            <!-- 步骤编号 -->
            <view class="onboard-screen__badge">
              <text class="onboard-screen__badge-text">第 {{ screen.step }} 层</text>
            </view>

            <!-- 层级名称 -->
            <text class="onboard-screen__title">{{ screen.label }}</text>

            <!-- 层级描述 -->
            <text class="onboard-screen__desc">{{ screen.desc }}</text>

            <!-- 引导文案 -->
            <text class="onboard-screen__guide">{{ screen.guideText }}</text>
          </view>
        </swiper-item>
      </swiper>

      <!-- 底部指示器和按钮 -->
      <view class="onboard-bottom">
        <!-- 圆点指示器 -->
        <view class="onboard-dots">
          <view
            v-for="(screen, index) in screens"
            :key="screen.tier"
            class="onboard-dots__item"
            :class="{ 'onboard-dots__item--active': currentIndex === index }"
          />
        </view>

        <!-- 操作按钮 -->
        <view class="onboard-actions">
          <view
            v-if="currentIndex < TOTAL_SCREENS - 1"
            class="onboard-btn onboard-btn--outline"
            @tap="currentIndex = currentIndex + 1"
          >
            下一步
          </view>
          <view
            v-else
            class="onboard-btn onboard-btn--primary"
            @tap="handleStart"
          >
            开始探索
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 浮层容器 ==================== */
.onboard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* Task F2 / M-09：z-index 提升至 9999，确保覆盖所有其他元素（如 TabBar / 弹窗） */
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ==================== 装饰：模糊头像 ==================== */
.onboard-decor-avatars {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.decor-avatar {
  position: absolute;
  border-radius: 50%;
  /* 默认透明度 0.6 营造若隐若现 */
  opacity: 0.6;
  /* H5 端追加模糊滤镜；mp-weixin 不支持 filter，保留 opacity fallback */
  // #ifdef H5
  filter: blur(8rpx);
  // #endif
}

.decor-avatar--1 {
  width: 200rpx;
  height: 200rpx;
  top: 12%;
  left: -60rpx;
}

.decor-avatar--2 {
  width: 240rpx;
  height: 240rpx;
  top: 38%;
  right: -80rpx;
}

.decor-avatar--3 {
  width: 180rpx;
  height: 180rpx;
  bottom: 14%;
  left: 18%;
}

/* ==================== 装饰：浮动小心形 ==================== */
.onboard-decor-hearts {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.floating-heart {
  position: absolute;
  font-size: var(--fs-2xl);
  color: var(--c-romance-400);
  opacity: 0.6;
  animation: heart-float 6s ease-in-out infinite;
}

.floating-heart--1 {
  top: 22%;
  left: 18%;
  animation-delay: 0s;
  font-size: var(--fs-lg);
}

.floating-heart--2 {
  top: 40%;
  right: 22%;
  animation-delay: 1.5s;
  font-size: var(--fs-2xl);
}

.floating-heart--3 {
  bottom: 28%;
  left: 32%;
  animation-delay: 3s;
  font-size: var(--fs-md);
}

.floating-heart--4 {
  top: 65%;
  right: 30%;
  animation-delay: 4.5s;
  font-size: var(--fs-lg);
}

@keyframes heart-float {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-30rpx) scale(1.15);
    opacity: 0.4;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.6;
  }
}

/* ==================== 遮罩层 ==================== */
.onboard-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.7);
  /* mp-weixin 不支持，H5 保留毛玻璃；mp-weixin 通过提高遮罩不透明度 0.55→0.7 近似降级 */
  // #ifdef H5
  backdrop-filter: blur(12rpx);
  -webkit-backdrop-filter: blur(12rpx);
  // #endif
}

/* ==================== 半透明渐变叠加（粉→白） ==================== */
.onboard-overlay-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,245,247,0.9) 100%);
  pointer-events: none;
  z-index: 0;
}

/* ==================== 卡片容器 ==================== */
.onboard-card {
  position: relative;
  z-index: 1;
  width: 620rpx;
  max-height: 80vh;
  background: var(--c-bg-primary, #ffffff);
  border-radius: 32rpx;
  box-shadow: 0 20rpx 60rpx rgba(15, 23, 42, 0.12), 0 4rpx 16rpx rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==================== 顶部操作栏 ==================== */
.onboard-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 8rpx;
  flex-shrink: 0;
}

.onboard-top__step {
  font-size: 24rpx;
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.onboard-top__skip {
  font-size: 26rpx;
  color: var(--c-text-secondary);
  padding: 4rpx 8rpx;
}

/* ==================== Swiper ==================== */
.onboard-swiper {
  flex: 1;
  width: 100%;
}

/* ==================== 每屏内容 ==================== */
.onboard-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 48rpx 32rpx;
  text-align: center;
}

.onboard-screen__icon-wrap {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-brand-50), var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(91, 127, 255, 0.12);
}

.onboard-screen__icon {
  font-size: var(--fs-4xl, 64rpx);
  line-height: 1;
}

.onboard-screen__icon-img {
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
}

.onboard-screen__badge {
  padding: 6rpx 20rpx;
  border-radius: 999px;
  background: var(--c-bg-brand);
  margin-bottom: 16rpx;
}

.onboard-screen__badge-text {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--c-brand);
}

.onboard-screen__title {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--c-text-primary);
  margin-bottom: 12rpx;
}

.onboard-screen__desc {
  font-size: 28rpx;
  color: var(--c-text-secondary);
  margin-bottom: 24rpx;
  line-height: 1.4;
}

.onboard-screen__guide {
  font-size: 26rpx;
  color: var(--c-text-secondary);
  line-height: 1.8;
  white-space: pre-line;
}

/* ==================== 底部区域 ==================== */
.onboard-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 32rpx 36rpx;
  flex-shrink: 0;
}

/* 圆点指示器 */
.onboard-dots {
  display: flex;
  gap: 12rpx;
}

.onboard-dots__item {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--c-border-light);
  transition: all 0.3s ease;
}

.onboard-dots__item--active {
  width: 36rpx;
  border-radius: 6rpx;
  background: var(--c-brand);
}

/* 操作按钮 */
.onboard-actions {
  width: 100%;
}

.onboard-btn {
  width: 100%;
  height: 88rpx;
  border: none;
  border-radius: 9999rpx;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.onboard-btn:active {
  transform: scale(0.97);
}

.onboard-btn--primary {
  background: var(--c-brand-500, #5B7FFF);
  color: var(--c-text-inverse, #ffffff);
  box-shadow: 0 4rpx 16rpx rgba(91, 127, 255, 0.25);
}

.onboard-btn--outline {
  background: transparent;
  border: 2rpx solid var(--c-border-light, #E2E8F0);
  color: var(--c-text-secondary, #475569);
}

.onboard-btn--outline:active {
  background: var(--c-brand-50);
  border-color: var(--c-brand-500, #5B7FFF);
  color: var(--c-brand-500, #5B7FFF);
}
</style>