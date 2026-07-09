<script setup lang="ts">
/**
 * 社交升温进度指示器组件
 *
 * 展示用户从"发现心动"到"线下见面"的6层社交漏斗进度。
 * 采用横向步骤指示器布局，已完成/当前/未到达层级分别以不同视觉状态呈现。
 * 漏斗颜色从浅蓝 (var(--c-brand-100)) 渐变到深蓝 (#5B7FFF)，层级越高颜色越深。
 *
 * @example
 * <SocialProgressIndicator />
 */
import { computed, onMounted, ref } from 'vue'
import {
  useSocialProgressStore,
  TIER_ORDER,
  TIER_META,
} from '../../stores/social-progress'
import { designTokens } from '../../theme/tokens'
import { openAppPath } from '../../utils/navigation'
import { IMAGE_PATHS } from '../../config/images'

const t = designTokens

/** 社交图标常量（统一从 config/images.ts 引入，避免硬编码路径） */
const SOCIAL_ICONS = {
  VISITOR: IMAGE_PATHS.ICONS_SOCIAL.VISITOR,
  LIKE: IMAGE_PATHS.ICONS_SOCIAL.LIKE,
  MATCH: IMAGE_PATHS.ICONS_SOCIAL.MATCH,
  MESSAGE: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
  SUPER_LIKE: IMAGE_PATHS.ICONS_SOCIAL.SUPER_LIKE,
  FOLLOW: IMAGE_PATHS.ICONS_SOCIAL.FOLLOW,
  CHECK: IMAGE_PATHS.ICONS_COMMON.CHECK,
} as const

// ==================== Store 绑定 ====================

const progressStore = useSocialProgressStore()

const progress = computed(() => progressStore.progress)
const loading = computed(() => progressStore.loading)
const currentTierIndex = computed(() => progressStore.currentTierIndex)
const progressPercentage = computed(() => progressStore.progressPercentage)
const isMaxLevel = computed(() => progressStore.isMaxLevel)

/** 当前层级的漏斗颜色 */
const currentTierColor = computed(() => {
  const idx = currentTierIndex.value
  return FUNNEL_COLORS[idx] ?? FUNNEL_COLORS[0]
})

// ==================== 漏斗颜色层级 ====================

/** 6层漏斗颜色，从浅蓝 (var(--c-brand-100)) 到深蓝 (#5B7FFF) */
const FUNNEL_COLORS = [
  t.color.brand[100], // L1: var(--c-brand-100)
  t.color.brand[200], // L2: #BBDAFF
  t.color.brand[300], // L3: #9BB8FF
  t.color.secondary[400], // L4: #7B9CFF
  t.color.brand[400],  // L5: #5B7FFF
  t.color.brand[500],  // L6: #4C6EF5
] as const

/** 漏斗颜色对应的文字色 - 深层用白色，浅层用深色 */
const FUNNEL_TEXT_COLORS = [
  t.color.text.primary,   // L1
  t.color.text.primary,   // L2
  t.color.text.primary,   // L3
  '#FFFFFF',              // L4
  '#FFFFFF',              // L5
  '#FFFFFF',              // L6
] as const

/** 漏斗颜色对应的半透明背景 */
const FUNNEL_BG_COLORS = [
  `${FUNNEL_COLORS[0]}1A`, // L1: ~10% opacity
  `${FUNNEL_COLORS[1]}26`, // L2: ~15% opacity
  `${FUNNEL_COLORS[2]}33`, // L3: ~20% opacity
  `${FUNNEL_COLORS[3]}40`, // L4: ~25% opacity
  `${FUNNEL_COLORS[4]}4D`, // L5: ~30% opacity
  `${FUNNEL_COLORS[5]}59`, // L6: ~35% opacity
] as const

/** 前一个层级是否已进入过渡动画 */
const animatingTierIndex = ref(-1)
const prevTierIndex = ref(0)

// ==================== 行动指引配置 ====================

/** 每个层级的行动指引：跳转目标 + 按钮文案 + 图标 */
const TIER_ACTIONS: Record<string, { icon: string; title: string; desc: string; btn: string; path: string }> = {
  L1_EXPOSURE: {
    icon: SOCIAL_ICONS.VISITOR,
    title: '去寻觅，发现心动的人',
    desc: '浏览推荐卡片，找到你的理想型',
    btn: '去寻觅',
    path: '/pages/discover/index',
  },
  L2_ATTENTION: {
    icon: SOCIAL_ICONS.LIKE,
    title: '表达喜欢，等待回应',
    desc: '右滑喜欢，让对方知道你的心意',
    btn: '去表达',
    path: '/pages/discover/index',
  },
  L3_MATCH: {
    icon: SOCIAL_ICONS.MATCH,
    title: '查看心动信号，开启对话',
    desc: '有人也喜欢了你，快去看看吧',
    btn: '去看信号',
    path: '/pages/messages/index',
  },
  L4_COMMUNICATION: {
    icon: SOCIAL_ICONS.MESSAGE,
    title: '发起聊天，深入了解',
    desc: '破冰话题已为你准备好',
    btn: '去聊天',
    path: '/pages/messages/index',
  },
  L5_CIRCLE: {
    icon: SOCIAL_ICONS.SUPER_LIKE,
    title: '加入兴趣圈，认识更多人',
    desc: '找到志同道合的伙伴',
    btn: '去圈子',
    path: '/pages/circles/index',
  },
  L6_SCENE: {
    icon: SOCIAL_ICONS.FOLLOW,
    title: '参加线下活动，迈出最后一步',
    desc: '从线上走到线下，开启真实社交',
    btn: '看活动',
    path: '/subpackages/discover/activities/index',
  },
}

/** 当前层级的行动指引 */
const currentAction = computed(() => {
  if (!progress.value) return null
  return TIER_ACTIONS[progress.value.currentTier] ?? null
})

/** 跳转到对应页面（自动处理 tabbar 页面） */
function navigateToAction() {
  if (!currentAction.value) return
  openAppPath(currentAction.value.path)
}

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
  /** 漏斗层级颜色 */
  color: string
  /** 漏斗层级文字色 */
  textColor: string
}

const steps = computed<StepItem[]>(() => {
  const currentIdx = currentTierIndex.value

  // 检测层级变化，触发过渡动画
  if (currentIdx !== prevTierIndex.value && currentIdx > prevTierIndex.value) {
    animatingTierIndex.value = currentIdx
    setTimeout(() => {
      animatingTierIndex.value = -1
    }, 600)
  }
  prevTierIndex.value = currentIdx

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
      color: FUNNEL_COLORS[index] ?? FUNNEL_COLORS[0],
      textColor: FUNNEL_TEXT_COLORS[index] ?? FUNNEL_TEXT_COLORS[0],
    }
  })
})

// ==================== 生命周期 ====================

onMounted(() => {
  void progressStore.fetchProgress()
})

// ==================== 辅助方法 ====================

function stepDotStyle(step: StepItem, index: number) {
  if (step.status === 'pending') {
    return {
      background: 'transparent',
      borderColor: step.color,
      borderWidth: '2rpx',
      borderStyle: 'solid',
    }
  }
  if (step.status === 'completed') {
    return {
      background: step.color,
      boxShadow: `0 4rpx 12rpx ${step.color}4D`,
    }
  }
  // current
  return {
    background: step.color,
    boxShadow: `0 4rpx 20rpx ${step.color}66`,
  }
}

/**
 * 步骤连接线样式：
 * - completed: 使用 prev→current 的渐变色，体现进度过渡
 * - current: 使用前一层纯色（半透明），表示进行中
 * - pending: 无背景（由 CSS 类控制浅灰）
 */
function stepLineStyles(step: StepItem, index: number) {
  if (step.status === 'completed') {
    const prevColor = steps.value[index - 1]?.color ?? step.color
    return {
      background: `linear-gradient(90deg, ${prevColor}, ${step.color})`,
    }
  }
  if (step.status === 'current') {
    const prevColor = steps.value[index - 1]?.color ?? step.color
    return { background: prevColor, opacity: 0.5 }
  }
  return {}
}
</script>

<template>
  <view class="sip-card card-base card-base--elevated">
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
    <view
      v-if="progress"
      class="sip-current"
      :style="{
        background: `linear-gradient(135deg, ${currentTierColor}18, ${currentTierColor}0F)`,
        borderColor: `${currentTierColor}33`,
      }"
    >
      <view class="sip-current__icon" :style="{ boxShadow: `0 4rpx 12rpx ${currentTierColor}33` }">
        <image v-if="TIER_META[progress.currentTier]?.icon" class="sip-current__icon-img" :src="TIER_META[progress.currentTier]?.icon" mode="aspectFit" />
      </view>
      <view class="sip-current__info">
        <text class="sip-current__label" :style="{ color: currentTierColor }">
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
            { 'sip-step--animating': animatingTierIndex === index },
          ]"
        >
          <!-- 步骤连接线 -->
          <view
            v-if="index > 0"
            class="sip-step__line"
            :class="`sip-step__line--${step.status}`"
            :style="stepLineStyles(step, index)"
          />

          <!-- 步骤圆点 -->
          <view class="sip-step__dot-wrap">
            <view
              class="sip-step__dot"
              :class="`sip-step__dot--${step.status}`"
              :style="stepDotStyle(step, index)"
            >
              <image v-if="step.status === 'completed'" class="sip-step__check" :src="SOCIAL_ICONS.CHECK" mode="aspectFit" />
              <image v-else class="sip-step__icon" :src="step.icon" mode="aspectFit" />
            </view>
          </view>

          <!-- 步骤标签 -->
          <text
            class="sip-step__label"
            :class="`sip-step__label--${step.status}`"
            :style="step.status === 'current' ? { color: step.color } : {}"
          >
            {{ step.label }}
          </text>

          <!-- 步骤描述 -->
          <text class="sip-step__desc" :class="`sip-step__desc--${step.status}`">
            {{ step.desc }}
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- ========== 行动指引卡片（整块可点击跳转） ========== -->
    <view
      v-if="currentAction && !isMaxLevel"
      class="sip-action-card press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      @tap="navigateToAction"
    >
      <view class="sip-action-card__left">
        <image class="sip-action-card__icon-img" :src="currentAction.icon" mode="aspectFit" />
        <view class="sip-action-card__text">
          <text class="sip-action-card__title">{{ currentAction.title }}</text>
          <text class="sip-action-card__desc">{{ currentAction.desc }}</text>
        </view>
      </view>
      <view class="sip-action-card__btn">
        <text class="sip-action-card__btn-text">{{ currentAction.btn }}</text>
        <text class="sip-action-card__btn-arrow">›</text>
      </view>
    </view>

    <!-- ========== 加载状态 ========== -->
    <view v-if="loading" class="sip-loading">
      <text class="sip-loading__text">加载中...</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 卡片容器 ==================== */
/* background / border / border-radius / box-shadow 由 .card-base .card-base--elevated 提供 */
.sip-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
  padding: var(--card-padding);
  margin-bottom: 0; /* 覆盖 .card-base 默认 section-gap，避免组件内嵌多余间距 */
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
  color: var(--c-text-primary);
}

.sip-header__subtitle {
  font-size: 24rpx;
  color: var(--c-text-secondary);
}

.sip-header__percent {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.sip-header__percent-value {
  font-size: 48rpx;
  font-weight: 800;
  color: #5B7FFF;
  line-height: 1;
  text-shadow: 0 2rpx 4rpx rgba(91, 127, 255, 0.15);
}

.sip-header__percent-unit {
  font-size: 28rpx;
  font-weight: 600;
  color: #5B7FFF;
}

/* ==================== 进度条 ==================== */
.sip-bar-wrap {
  width: 100%;
}

.sip-bar-track {
  width: 100%;
  height: 10rpx;
  border-radius: 5rpx;
  background: var(--c-bg-surface);
  overflow: hidden;
}

.sip-bar-fill {
  height: 100%;
  border-radius: 5rpx;
  background: linear-gradient(90deg, var(--c-brand-100) 0%, #5B7FFF 100%);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ==================== 当前层级高亮卡片 ==================== */
.sip-current {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  border-width: 1px;
  border-style: solid;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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
  color: var(--c-text-primary);
}

.sip-current__desc {
  font-size: 24rpx;
  color: var(--c-text-secondary);
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
  opacity: 0.7;
}

.sip-step__line--current {
  opacity: 0.5;
}

.sip-step__line--pending {
  background: var(--c-border-light);
}

/* ==================== 步骤圆点 ==================== */
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
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.sip-step__dot--current {
  animation: sip-pulse 2s ease-in-out infinite, pulse-ring 2s infinite;
  transform: scale(1.08);
}

.sip-step__dot--pending {
  border-width: 2rpx;
  border-style: solid;
  background: var(--c-bg-container);
}

.sip-step__check {
  font-size: 28rpx;
  color: var(--c-text-inverse);
  font-weight: 700;
}

.sip-step__icon {
  font-size: 24rpx;
  line-height: 1;
}

/* 层级切换入场动画 */
.sip-step--animating .sip-step__dot {
  animation: sip-pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes sip-pop-in {
  0% {
    transform: scale(0.6);
    opacity: 0.3;
  }
  60% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 步骤标签 */
.sip-step__label {
  font-size: 22rpx;
  font-weight: 600;
  text-align: center;
  line-height: 1.3;
}

.sip-step__label--current {
  font-weight: 700;
}

.sip-step__label--pending {
  color: var(--c-text-tertiary);
}

/* 步骤描述 */
.sip-step__desc {
  font-size: 20rpx;
  text-align: center;
  color: var(--c-text-tertiary);
  line-height: 1.3;
}

.sip-step__desc--completed {
  color: var(--c-text-secondary);
}

.sip-step__desc--current {
  color: var(--c-text-secondary);
}

/* 当前步骤脉冲动画 */
@keyframes sip-pulse {
  0%,
  100% {
    transform: scale(1.08);
  }
  50% {
    transform: scale(1.15);
  }
}

/* 当前步骤环形脉冲（box-shadow 扩散，与 sip-pulse 叠加） */
@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(91, 127, 255, 0.4);
  }
  70% {
    box-shadow: 0 0 0 16rpx rgba(91, 127, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(91, 127, 255, 0);
  }
}

/* ==================== 行动指引卡片 ==================== */
.sip-action-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-6);
  background: linear-gradient(135deg, var(--c-brand), var(--c-brand-700));
  border-radius: var(--r-xl);
  box-shadow: var(--s-brand-lg);
}

.sip-action-card__left {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex: 1;
  min-width: 0;
}

.sip-action-card__icon-img {
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
}

.sip-action-card__text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
  min-width: 0;
}

.sip-action-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
  line-height: 1.3;
}

.sip-action-card__desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.3;
}

.sip-action-card__btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 24rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.sip-action-card__btn-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--c-text-inverse);
}

.sip-action-card__btn-arrow {
  font-size: 28rpx;
  color: var(--c-text-inverse);
}

/* ==================== 加载状态 ==================== */
.sip-loading {
  display: flex;
  justify-content: center;
  padding: 32rpx 0;
}

.sip-loading__text {
  font-size: 26rpx;
  color: var(--c-text-tertiary);
}
</style>