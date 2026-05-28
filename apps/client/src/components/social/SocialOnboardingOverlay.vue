<!--
  社交升温引导浮层组件

  新用户首次进入时展示，通过6屏滑动引导用户理解社交漏斗升温路径。
  使用 uni.setStorageSync 存储"已看过引导"状态，避免重复展示。

  @example
  <SocialOnboardingOverlay @close="handleClose" @start="handleStart" />
-->
<!-- 普通 script 块：用于导出工具函数，供外部页面使用 -->
<script lang="ts">
/** localStorage 键名：是否已看过引导 */
const ONBOARDING_KEY = 'campus_love_social_onboarding_seen'

/**
 * 检查用户是否已看过引导
 */
export function hasSeenOnboarding(): boolean {
  try {
    const stored = uni.getStorageSync(ONBOARDING_KEY)
    return stored === 'true' || stored === true
  } catch {
    return false
  }
}

/**
 * 标记用户已看过引导
 */
export function markOnboardingSeen(): void {
  try {
    uni.setStorageSync(ONBOARDING_KEY, 'true')
  } catch {
    // 静默处理存储失败
  }
}
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { TIER_ORDER, TIER_META } from '../../stores/social-progress'

// ==================== Props & Emits ====================

const emit = defineEmits<{
  /** 用户点击关闭（跳过引导） */
  close: []
  /** 用户完成引导，点击"开始探索" */
  start: []
}>()

// ==================== 常量 ====================

/** localStorage 键名 */
const ONBOARDING_KEY_LOCAL = 'campus_love_social_onboarding_seen'

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
    <!-- ========== 半透明遮罩 ========== -->
    <view class="onboard-mask" />

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
              <text class="onboard-screen__icon">{{ screen.icon }}</text>
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
          <button
            v-if="currentIndex < TOTAL_SCREENS - 1"
            class="onboard-actions__next"
            @tap="currentIndex = currentIndex + 1"
          >
            下一步
          </button>
          <button
            v-else
            class="onboard-actions__start"
            @tap="handleStart"
          >
            开始探索
          </button>
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
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ==================== 遮罩层 ==================== */
.onboard-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8rpx);
}

/* ==================== 卡片容器 ==================== */
.onboard-card {
  position: relative;
  z-index: 1;
  width: 620rpx;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 32rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
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
  color: var(--td-text-color-placeholder);
  font-weight: 500;
}

.onboard-top__skip {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
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
  background: linear-gradient(135deg, var(--td-brand-color-1), var(--td-brand-color-2));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.1);
}

.onboard-screen__icon {
  font-size: 64rpx;
  line-height: 1;
}

.onboard-screen__badge {
  padding: 6rpx 20rpx;
  border-radius: 999px;
  background: var(--td-brand-color-1);
  margin-bottom: 16rpx;
}

.onboard-screen__badge-text {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--td-brand-color-6);
}

.onboard-screen__title {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--td-text-color-primary);
  margin-bottom: 12rpx;
}

.onboard-screen__desc {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
  margin-bottom: 24rpx;
  line-height: 1.4;
}

.onboard-screen__guide {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
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
  background: var(--td-border-level-1-color);
  transition: all 0.3s ease;
}

.onboard-dots__item--active {
  width: 36rpx;
  border-radius: 6rpx;
  background: var(--td-brand-color-6);
}

/* 操作按钮 */
.onboard-actions {
  width: 100%;
}

.onboard-actions__next,
.onboard-actions__start {
  width: 100%;
  height: 88rpx;
  border: 0;
  border-radius: 18rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 88rpx;
}

.onboard-actions__next {
  background: var(--td-brand-color-1);
  color: var(--td-brand-color-6);
}

.onboard-actions__next:active {
  background: var(--td-brand-color-2);
}

.onboard-actions__start {
  background: linear-gradient(135deg, var(--td-brand-color-6), var(--td-brand-color-7));
  color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.3);
}

.onboard-actions__start:active {
  opacity: 0.85;
}
</style>