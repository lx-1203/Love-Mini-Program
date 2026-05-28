<script setup lang="ts">
/**
 * 社交升温进度指示器组件
 *
 * 展示用户从"发现心动"到"线下见面"的6层社交漏斗进度。
 * 采用横向步骤指示器布局，已完成/当前/未到达层级分别以不同视觉状态呈现。
 *
 * @example
 * <SocialProgressIndicator />
 */
import { computed, onMounted } from 'vue'
import {
  useSocialProgressStore,
  TIER_ORDER,
  TIER_META,
} from '../../stores/social-progress'

// ==================== Store 绑定 ====================

const progressStore = useSocialProgressStore()

const progress = computed(() => progressStore.progress)
const loading = computed(() => progressStore.loading)
const currentTierIndex = computed(() => progressStore.currentTierIndex)
const progressPercentage = computed(() => progressStore.progressPercentage)

// ==================== 步骤数据 ====================

/** 根据进度数据计算每个步骤的显示状态 */
interface StepItem {
  /** 层级标识 */
  tier: string
  /** 层级标签 */
  label: string
  /** 层级图标 */
  icon: string
  /** 层级描述 */
  desc: string
  /** 步骤状态：completed | current | pending */
  status: 'completed' | 'current' | 'pending'
}

const steps = computed<StepItem[]>(() => {
  const currentIdx = currentTierIndex.value

  return TIER_ORDER.map((tier, index) => {
    const meta = TIER_META[tier]
    const status: StepItem['status'] =
      index < currentIdx
        ? 'completed'
        : index === currentIdx
          ? 'current'
          : 'pending'

    return {
      tier,
      label: meta?.label ?? tier,
      icon: meta?.icon ?? '',
      desc: meta?.desc ?? '',
      status,
    }
  })
})

// ==================== 生命周期 ====================

onMounted(() => {
  void progressStore.fetchProgress()
})
</script>

<template>
  <view class="sip-card">
    <!-- ========== 顶部进度概览 ========== -->
    <view class="sip-header">
      <view class="sip-header__left">
        <text class="sip-header__title">社交升温进度</text>
        <text class="sip-header__subtitle">完成更多互动，解锁更高层级</text>
      </view>
      <view class="sip-header__percent">
        <text class="sip-header__percent-value">{{ progressPercentage }}</text>
        <text class="sip-header__percent-unit">%</text>
      </view>
    </view>

    <!-- ========== 进度条 ========== -->
    <view class="sip-bar-wrap">
      <view class="sip-bar-track">
        <view
          class="sip-bar-fill"
          :style="{ width: progressPercentage + '%' }"
        />
      </view>
    </view>

    <!-- ========== 当前层级高亮卡片 ========== -->
    <view v-if="progress" class="sip-current">
      <view class="sip-current__icon">
        {{ TIER_META[progress.currentTier]?.icon ?? '' }}
      </view>
      <view class="sip-current__info">
        <text class="sip-current__label">
          {{ TIER_META[progress.currentTier]?.label ?? progress.currentTier }}
        </text>
        <text class="sip-current__desc">
          {{ TIER_META[progress.currentTier]?.desc ?? '' }}
        </text>
      </view>
    </view>

    <!-- ========== 6步漏斗指示器（横向滚动） ========== -->
    <scroll-view scroll-x class="sip-steps-scroll" :show-scrollbar="false">
      <view class="sip-steps">
        <view
          v-for="(step, index) in steps"
          :key="step.tier"
          class="sip-step"
          :class="[
            `sip-step--${step.status}`,
            { 'sip-step--last': index === steps.length - 1 },
          ]"
        >
          <!-- 步骤连接线 -->
          <view
            v-if="index > 0"
            class="sip-step__line"
            :class="`sip-step__line--${step.status}`"
          />

          <!-- 步骤圆点 -->
          <view class="sip-step__dot-wrap">
            <view class="sip-step__dot" :class="`sip-step__dot--${step.status}`">
              <text v-if="step.status === 'completed'" class="sip-step__check">✓</text>
              <text v-else class="sip-step__icon">{{ step.icon }}</text>
            </view>
          </view>

          <!-- 步骤标签 -->
          <text class="sip-step__label" :class="`sip-step__label--${step.status}`">
            {{ step.label }}
          </text>

          <!-- 步骤描述 -->
          <text class="sip-step__desc" :class="`sip-step__desc--${step.status}`">
            {{ step.desc }}
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- ========== 下一步行动建议 ========== -->
    <view v-if="progress?.nextAction" class="sip-action">
      <text class="sip-action__icon">💡</text>
      <text class="sip-action__text">{{ progress.nextAction }}</text>
    </view>

    <!-- ========== 加载状态 ========== -->
    <view v-if="loading" class="sip-loading">
      <text class="sip-loading__text">加载中...</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 卡片容器 ==================== */
.sip-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
}

/* ==================== 顶部概览 ==================== */
.sip-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.sip-header__left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.sip-header__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.sip-header__subtitle {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.sip-header__percent {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.sip-header__percent-value {
  font-size: 48rpx;
  font-weight: 800;
  color: var(--td-brand-color-6);
  line-height: 1;
}

.sip-header__percent-unit {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-brand-color-6);
}

/* ==================== 进度条 ==================== */
.sip-bar-wrap {
  width: 100%;
}

.sip-bar-track {
  width: 100%;
  height: 10rpx;
  border-radius: 5rpx;
  background: var(--td-bg-color-surface);
  overflow: hidden;
}

.sip-bar-fill {
  height: 100%;
  border-radius: 5rpx;
  background: linear-gradient(90deg, var(--td-brand-color-6) 0%, var(--td-brand-color-7) 100%);
  transition: width 0.5s ease;
}

/* ==================== 当前层级高亮卡片 ==================== */
.sip-current {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, var(--td-brand-color-1), rgba(37, 99, 235, 0.06));
  border-radius: 20rpx;
  border: 1px solid var(--td-brand-color-3);
}

.sip-current__icon {
  font-size: 48rpx;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 4rpx 12rpx rgba(37, 99, 235, 0.12);
  flex-shrink: 0;
}

.sip-current__info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
  min-width: 0;
}

.sip-current__label {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.sip-current__desc {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

/* ==================== 6步漏斗（横向滚动） ==================== */
.sip-steps-scroll {
  width: 100%;
}

.sip-steps {
  display: flex;
  gap: 0;
  padding: 8rpx 0;
}

/* ==================== 步骤项 ==================== */
.sip-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  position: relative;
  flex-shrink: 0;
  width: 180rpx;
  padding: 0 16rpx;
  box-sizing: border-box;
}

/* 步骤连接线 */
.sip-step__line {
  position: absolute;
  top: 28rpx;
  right: calc(100% - 180rpx / 2 + 16rpx);
  width: calc(180rpx - 32rpx);
  height: 4rpx;
  transform: translateY(-50%);
}

.sip-step__line--completed {
  background: var(--td-success-color);
}

.sip-step__line--current {
  background: linear-gradient(90deg, var(--td-success-color), var(--td-brand-color-4));
}

.sip-step__line--pending {
  background: var(--td-border-level-1-color);
}

/* 步骤圆点 */
.sip-step__dot-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  position: relative;
  z-index: 1;
}

.sip-step__dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  transition: all 0.3s ease;
}

.sip-step__dot--completed {
  background: var(--td-success-color);
  box-shadow: 0 4rpx 12rpx rgba(16, 185, 129, 0.3);
}

.sip-step__dot--current {
  background: linear-gradient(135deg, var(--td-brand-color-6), var(--td-brand-color-7));
  box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.35);
  animation: sip-pulse 2s ease-in-out infinite;
}

.sip-step__dot--pending {
  background: var(--td-bg-color-surface);
  border: 2rpx solid var(--td-border-level-1-color);
}

.sip-step__check {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 700;
}

.sip-step__icon {
  font-size: 24rpx;
  line-height: 1;
}

/* 步骤标签 */
.sip-step__label {
  font-size: 22rpx;
  font-weight: 600;
  text-align: center;
  line-height: 1.3;
}

.sip-step__label--completed {
  color: var(--td-success-color);
}

.sip-step__label--current {
  color: var(--td-brand-color-6);
}

.sip-step__label--pending {
  color: var(--td-text-color-placeholder);
}

/* 步骤描述 */
.sip-step__desc {
  font-size: 20rpx;
  text-align: center;
  color: var(--td-text-color-placeholder);
  line-height: 1.3;
}

.sip-step__desc--completed {
  color: var(--td-text-color-secondary);
}

.sip-step__desc--current {
  color: var(--td-text-color-secondary);
}

/* 当前步骤脉冲动画 */
@keyframes sip-pulse {
  0%,
  100% {
    box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.35);
  }
  50% {
    box-shadow: 0 4rpx 28rpx rgba(37, 99, 235, 0.55);
  }
}

/* ==================== 行动建议 ==================== */
.sip-action {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: rgba(245, 158, 11, 0.08);
  border-radius: 16rpx;
  border: 1px solid rgba(245, 158, 11, 0.15);
}

.sip-action__icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.sip-action__text {
  flex: 1;
  font-size: 26rpx;
  color: var(--td-text-color-primary);
  line-height: 1.5;
}

/* ==================== 加载状态 ==================== */
.sip-loading {
  display: flex;
  justify-content: center;
  padding: 32rpx 0;
}

.sip-loading__text {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
}
</style>