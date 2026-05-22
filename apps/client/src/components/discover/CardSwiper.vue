<script setup lang="ts">
/**
 * 寻觅页 - 卡片滑动推荐组件
 *
 * 功能：
 * - 全屏卡片堆叠展示，支持下一张卡片边缘预览
 * - 手势交互：左滑拒绝、右滑喜欢
 * - 滑动动画：卡片跟随手指移动，释放后根据滑动距离决定飞出方向
 * - 飞出动画：左滑向左飞出并淡出，右滑向右飞出并淡出
 * - 新卡片从底部滑入
 * - 底部操作按钮：拒绝（X，灰色）、喜欢（❤️，红色）
 */
import { ref, computed, watch, nextTick } from "vue";
import type { DiscoverCard, SwipeDirection } from "../../stores/discover";

const props = defineProps<{
  /** 卡片数据列表 */
  cards: DiscoverCard[];
  /** 每日剩余次数 */
  remainingCount: number;
}>();

const emit = defineEmits<{
  /** 滑动操作 */
  (e: "swipe", direction: SwipeDirection, cardId: string): void;
}>();

/* ========== 手势状态 ========== */

/** 是否正在触摸 */
const isDragging = ref(false);
/** 当前卡片水平位移（px） */
const translateX = ref(0);
/** 当前卡片旋转角度 */
const rotate = ref(0);
/** 当前卡片透明度 */
const opacity = ref(1);
/** 飞出动画状态 */
const isFlyingOut = ref(false);
/** 飞出方向 */
const flyDirection = ref<SwipeDirection | null>(null);
/** 新卡片入场动画 */
const isEntering = ref(false);

/** 触摸起始坐标 */
let startX = 0;
let startY = 0;
/** 当前触摸坐标 */
let currentX = 0;
let currentY = 0;
/** 滑动阈值：超过此距离触发飞出 */
const SWIPE_THRESHOLD = 120;
/** 最大旋转角度 */
const MAX_ROTATE = 15;

/* ========== 计算属性 ========== */

/** 当前展示的卡片 */
const currentCard = computed<DiscoverCard | null>(() => props.cards[0] ?? null);
/** 下一张卡片 */
const nextCard = computed<DiscoverCard | null>(() => props.cards[1] ?? null);

/** 当前卡片样式 */
const currentCardStyle = computed(() => {
  if (isFlyingOut.value) {
    const x = flyDirection.value === "left" ? -800 : 800;
    return {
      transform: `translateX(${x}px) rotate(${flyDirection.value === "left" ? -30 : 30}deg)`,
      opacity: 0,
      transition: "transform 300ms ease-out, opacity 300ms ease-out",
    };
  }

  if (isEntering.value) {
    return {
      transform: "translateY(100%) translateX(0) rotate(0deg)",
      opacity: 0,
      transition: "none",
    };
  }

  const transition = isDragging.value ? "none" : "transform 240ms ease-out, opacity 240ms ease-out";
  return {
    transform: `translateX(${translateX.value}px) rotate(${rotate.value}deg)`,
    opacity: opacity.value,
    transition,
  };
});

/** 下一张卡片样式（堆叠效果） */
const nextCardStyle = computed(() => {
  const scale = isDragging.value ? 0.95 : 0.92;
  const translateY = isDragging.value ? -8 : -16;
  return {
    transform: `scale(${scale}) translateY(${translateY}px)`,
    opacity: 0.6,
    transition: isDragging.value ? "none" : "transform 240ms ease-out",
  };
});

/** 简介展开状态 */
const isBioExpanded = ref(false);

/* ========== 触摸事件处理 ========== */

/**
 * 触摸开始
 */
function onTouchStart(e: TouchEvent) {
  if (isFlyingOut.value || !currentCard.value) return;
  isDragging.value = true;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  currentX = startX;
  currentY = startY;
}

/**
 * 触摸移动
 */
function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || isFlyingOut.value) return;
  currentX = e.touches[0].clientX;
  currentY = e.touches[0].clientY;

  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  // 判断主要是水平滑动还是垂直滑动，防止滚动冲突
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // 阻止默认行为，防止页面滚动
    e.preventDefault();
  }

  translateX.value = deltaX;
  // 根据滑动距离计算旋转角度
  const ratio = Math.min(Math.abs(deltaX) / 300, 1);
  rotate.value = (deltaX > 0 ? 1 : -1) * ratio * MAX_ROTATE;
}

/**
 * 触摸结束
 */
function onTouchEnd() {
  if (!isDragging.value || isFlyingOut.value) return;
  isDragging.value = false;

  const deltaX = currentX - startX;

  if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
    // 超过阈值，触发飞出
    const direction: SwipeDirection = deltaX > 0 ? "right" : "left";
    performFlyOut(direction);
  } else {
    // 未超过阈值，回弹复位
    resetCardPosition();
  }
}

/**
 * 执行飞出动画
 */
function performFlyOut(direction: SwipeDirection) {
  if (!currentCard.value) return;
  isFlyingOut.value = true;
  flyDirection.value = direction;

  const cardId = currentCard.value.id;

  // 动画结束后通知父组件
  setTimeout(() => {
    emit("swipe", direction, cardId);
    // 重置状态
    isFlyingOut.value = false;
    flyDirection.value = null;
    translateX.value = 0;
    rotate.value = 0;
    opacity.value = 1;
    isBioExpanded.value = false;

    // 触发新卡片入场动画
    if (props.cards.length > 1) {
      isEntering.value = true;
      nextTick(() => {
        setTimeout(() => {
          isEntering.value = false;
        }, 50);
      });
    }
  }, 300);
}

/**
 * 复位卡片位置
 */
function resetCardPosition() {
  translateX.value = 0;
  rotate.value = 0;
  opacity.value = 1;
}

/**
 * 点击拒绝按钮
 */
function onReject() {
  if (isFlyingOut.value || !currentCard.value) return;
  performFlyOut("left");
}

/**
 * 点击喜欢按钮
 */
function onLike() {
  if (isFlyingOut.value || !currentCard.value) return;
  performFlyOut("right");
}

/**
 * 切换简介展开状态
 */
function toggleBio() {
  isBioExpanded.value = !isBioExpanded.value;
}

/* ========== 监听卡片变化 ========== */

watch(
  () => props.cards.length,
  (newLen, oldLen) => {
    if (newLen > 0 && oldLen === 0) {
      // 从无卡片到有卡片，触发入场动画
      isEntering.value = true;
      nextTick(() => {
        setTimeout(() => {
          isEntering.value = false;
        }, 50);
      });
    }
  }
);
</script>

<template>
  <view class="card-swiper">
    <!-- 卡片堆叠区域 -->
    <view class="card-stack" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
      <!-- 无卡片状态 -->
      <view v-if="!currentCard" class="empty-state">
        <text class="empty-state__icon">🌙</text>
        <text class="empty-state__title">今日推荐已看完</text>
        <text class="empty-state__subtitle">明天中午 12 点刷新</text>
      </view>

      <!-- 下一张卡片（堆叠底层） -->
      <view v-if="nextCard" class="card card--next" :style="nextCardStyle">
        <image
          v-if="nextCard.images && nextCard.images.length > 0"
          class="card__bg"
          :src="nextCard.images[0]"
          mode="aspectFill"
        />
        <view v-else class="card__bg card__bg--placeholder">
          <text class="card__placeholder-text">{{ nextCard.name[0] }}</text>
        </view>
      </view>

      <!-- 当前卡片（可操作层） -->
      <view v-if="currentCard" class="card card--current" :style="currentCardStyle">
        <!-- 背景图片 -->
        <image
          v-if="currentCard.images && currentCard.images.length > 0"
          class="card__bg"
          :src="currentCard.images[0]"
          mode="aspectFill"
        />
        <view v-else class="card__bg card__bg--placeholder">
          <text class="card__placeholder-text">{{ currentCard.name[0] }}</text>
        </view>

        <!-- 渐变遮罩 -->
        <view class="card__overlay" />

        <!-- 滑动指示器 -->
        <view v-if="isDragging && translateX !== 0" class="swipe-indicator" :class="[
          translateX > 0 ? 'swipe-indicator--like' : 'swipe-indicator--nope'
        ]">
          <text class="swipe-indicator__text">{{ translateX > 0 ? '喜欢' : '跳过' }}</text>
        </view>

        <!-- 卡片内容 -->
        <view class="card__content">
          <!-- 顶部：头像 + 昵称 -->
          <view class="card__header">
            <view class="card__avatar">
              <image
                v-if="currentCard.avatar"
                class="card__avatar-img"
                :src="currentCard.avatar"
                mode="aspectFill"
              />
              <text v-else class="card__avatar-text">{{ currentCard.name[0] }}</text>
            </view>
            <view class="card__name-wrap">
              <text class="card__name">{{ currentCard.name }}</text>
              <text v-if="currentCard.commonGround" class="card__common">{{ currentCard.commonGround }}</text>
            </view>
          </view>

          <!-- 中部：学校、年级、专业 -->
          <view class="card__info">
            <view class="info-row">
              <text class="info-row__label">学校</text>
              <text class="info-row__value">{{ currentCard.headline?.split('·')[0]?.trim() || '-' }}</text>
            </view>
            <view class="info-row">
              <text class="info-row__label">年级专业</text>
              <text class="info-row__value">{{ currentCard.headline?.split('·')[1]?.trim() || currentCard.headline }}</text>
            </view>
            <view v-if="currentCard.availability" class="info-row">
              <text class="info-row__label">空闲时间</text>
              <text class="info-row__value">{{ currentCard.availability }}</text>
            </view>
          </view>

          <!-- 标签区 -->
          <view v-if="currentCard.tags && currentCard.tags.length > 0" class="card__tags">
            <text
              v-for="(tag, idx) in currentCard.tags.slice(0, 5)"
              :key="idx"
              class="tag-pill"
            >{{ tag }}</text>
          </view>

          <!-- 底部：个人简介 -->
          <view class="card__bio" @tap.stop="toggleBio">
            <text
              class="card__bio-text"
              :class="{ 'card__bio-text--expanded': isBioExpanded }"
            >{{ currentCard.bio }}</text>
            <text v-if="currentCard.bio && currentCard.bio.length > 30" class="card__bio-more">
              {{ isBioExpanded ? '收起' : '展开' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作区 -->
    <view v-if="currentCard" class="action-bar">
      <button class="action-btn action-btn--reject" @tap="onReject">
        <text class="action-btn__icon">✕</text>
      </button>
      <view class="action-bar__count">
        <text class="action-bar__count-text">剩余 {{ remainingCount }} 次</text>
      </view>
      <button class="action-btn action-btn--like" @tap="onLike">
        <text class="action-btn__icon">♥</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.card-swiper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
}

/* ========== 卡片堆叠区域 ========== */
.card-stack {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  overflow: hidden;
}

/* ========== 空状态 ========== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}

.empty-state__icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-state__title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin-bottom: 12rpx;
}

.empty-state__subtitle {
  font-size: 28rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 卡片基础样式 ========== */
.card {
  position: absolute;
  width: calc(100% - 64rpx);
  height: calc(100% - 64rpx);
  border-radius: var(--td-radius-large);
  overflow: hidden;
  box-shadow: var(--td-shadow-2);
  background: var(--td-bg-color-container);
}

.card--next {
  z-index: 1;
}

.card--current {
  z-index: 2;
  touch-action: pan-y;
}

/* ========== 背景图片 ========== */
.card__bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__bg--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--td-brand-color-2), var(--td-brand-color-3));
}

.card__placeholder-text {
  font-size: 120rpx;
  font-weight: 700;
  color: var(--td-brand-color-7);
  opacity: 0.4;
}

/* ========== 渐变遮罩 ========== */
.card__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 70%;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.5) 40%,
    rgba(0, 0, 0, 0) 100%
  );
  pointer-events: none;
}

/* ========== 滑动指示器 ========== */
.swipe-indicator {
  position: absolute;
  top: 60rpx;
  padding: 12rpx 32rpx;
  border-radius: 12rpx;
  border-width: 4rpx;
  border-style: solid;
  z-index: 3;
  transform: rotate(-15deg);
}

.swipe-indicator--like {
  right: 40rpx;
  border-color: #22c55e;
  color: #22c55e;
}

.swipe-indicator--nope {
  left: 40rpx;
  border-color: #ef4444;
  color: #ef4444;
}

.swipe-indicator__text {
  font-size: 36rpx;
  font-weight: 700;
}

/* ========== 卡片内容 ========== */
.card__content {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 40rpx;
  padding-bottom: 48rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  z-index: 2;
}

/* 头部：头像 + 昵称 */
.card__header {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.card__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  overflow: hidden;
  background: var(--td-brand-color-2);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.card__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__avatar-text {
  font-size: 40rpx;
  font-weight: 600;
  color: var(--td-brand-color-7);
}

.card__name-wrap {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.card__name {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
}

.card__common {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* 中部信息 */
.card__info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.info-row__label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
  width: 100rpx;
  flex-shrink: 0;
}

.info-row__value {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}

/* 标签区 */
.card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 4rpx;
}

.tag-pill {
  display: inline-flex;
  padding: 8rpx 20rpx;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 500;
  backdrop-filter: blur(8rpx);
}

/* 个人简介 */
.card__bio {
  margin-top: 4rpx;
}

.card__bio-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__bio-text--expanded {
  -webkit-line-clamp: unset;
  display: block;
}

.card__bio-more {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8rpx;
  display: inline-block;
}

/* ========== 底部操作栏 ========== */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48rpx;
  padding: 24rpx 40rpx 48rpx;
  background: linear-gradient(to top, var(--td-bg-app-page), transparent);
}

.action-btn {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  box-shadow: var(--td-shadow-1);
  transition: transform 120ms ease;
}

.action-btn:active {
  transform: scale(0.92);
}

.action-btn--reject {
  background: #ffffff;
}

.action-btn--reject .action-btn__icon {
  font-size: 48rpx;
  color: #6b7280;
  font-weight: 700;
}

.action-btn--like {
  background: linear-gradient(135deg, #f43f5e, #e11d48);
}

.action-btn--like .action-btn__icon {
  font-size: 48rpx;
  color: #ffffff;
}

.action-bar__count {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.action-bar__count-text {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}
</style>
