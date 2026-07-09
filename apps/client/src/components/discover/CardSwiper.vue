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
 * - 底部操作按钮：拒绝（pass）、超级喜欢（super-like）、喜欢（like）
 *
 * Phase D2 重构：
 * - 大图区采用 4:5 比例布局，照片墙 swiper 支持多图浏览
 * - 图片优先级：halfBodyPhotoUrl → photoGallery[0] → avatar → images[0]
 * - 视频角标（personalVideoUrl 存在时显示于右上角），点击 emit videoTap
 * - 照片墙分页指示器（多图场景下展示当前页 / 总页数）
 * - 卡片信息区集成 VerificationBadge（基于 verificationBadgeLevel 字段）
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（hover-class 替代）
 * - 不使用 backdrop-filter（高不透明度降级）
 * - 不使用 import.meta.env.DEV
 * - 所有过渡动画内联在 .vue 文件中
 */
import { ref, computed, watch, nextTick } from "vue";
import type { DiscoverCard, SwipeDirection } from "../../stores/discover";
import SafeImage from "../common/SafeImage.vue";
import VerificationBadge from "../common/VerificationBadge.vue";
import { lightHaptic, mediumHaptic, heavyHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";

/** Emoji 替换 SVG 图标路径 */
const emojiIcons = {
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
  graduation: IMAGE_PATHS.ICONS_COMMON.GRADUATION_SVG,
  video: IMAGE_PATHS.ICONS_COMMON.CAMERA,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
} as const;

const props = defineProps<{
  /** 卡片数据列表 */
  cards: DiscoverCard[];
  /** 每日剩余次数 */
  remainingCount: number;
}>();

const emit = defineEmits<{
  /** 滑动操作 */
  (e: "swipe", direction: SwipeDirection, cardId: string): void;
  /** 超级喜欢操作 */
  (e: "superLike", cardId: string): void;
  /** 视频角标点击（Phase D2 新增） */
  (e: "videoTap", cardId: string, videoUrl: string): void;
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

/**
 * 计算卡片的展示图片列表（Phase D2 · 图片优先级）。
 *
 * 优先级链（按验收要求）：
 * 1. halfBodyPhotoUrl（半身照优先）
 * 2. photoGallery[0]（多图浏览场景，最多 6 张）
 * 3. avatarUrl（avatar 字段兜底， DiscoverCard.avatar 即后端 avatarUrl）
 * 4. images[0]（旧字段兼容）
 *
 * @param card - 卡片数据
 * @returns 图片 URL 数组（至少返回 1 张，无可用图时返回空数组）
 */
function getDisplayImages(card: DiscoverCard | null): string[] {
  if (!card) return [];

  // 1. halfBodyPhotoUrl（半身照优先）
  if (card.halfBodyPhotoUrl) {
    return [card.halfBodyPhotoUrl];
  }

  // 2. photoGallery（多图浏览场景，最多 6 张）
  if (card.photoGallery && card.photoGallery.length > 0) {
    return card.photoGallery.slice(0, 6);
  }

  // 3. avatarUrl（DiscoverCard.avatar 字段即后端 avatarUrl 映射）
  if (card.avatar) {
    return [card.avatar];
  }

  // 4. images 兼容旧字段（直接返回全部，由 swiper 渲染）
  if (card.images && card.images.length > 0) {
    return card.images;
  }

  return [];
}

/**
 * 当前卡片展示图片列表（响应式封装，模板中使用）。
 */
const currentDisplayImages = computed<string[]>(() => getDisplayImages(currentCard.value));

/**
 * 当前卡片是否有视频（Phase D2 · 视频角标显隐依据）。
 */
const hasVideo = computed<boolean>(() => {
  return !!currentCard.value?.personalVideoUrl;
});

/**
 * 当前卡片是否有多图（用于决定是否展示分页指示器）。
 */
const hasMultipleImages = computed<boolean>(() => currentDisplayImages.value.length > 1);

/**
 * 当前卡片展示图数量（用于分页指示器总数展示）。
 */
const imageCount = computed<number>(() => currentDisplayImages.value.length);

/**
 * 当前 swiper 当前页索引（多图场景下高亮指示器）。
 */
const currentImageIndex = ref<number>(0);

/** 从headline中提取年龄 */
const extractAge = (headline?: string): string => {
  if (!headline) return '22';
  const match = headline.match(/(\d{2})\s*岁/);
  return match ? match[1] : '22';
};

/** 匹配度分数（基于共同兴趣圈数量计算） */
const matchScore = computed(() => {
  const card = currentCard.value;
  if (!card) return 95;
  const base = card.commonCircleCount ?? 1;
  return Math.min(98, 80 + base * 5);
});

/** 当前卡片样式（Phase D5 · 静止/dragging 状态添加 scale(1.02) 突出特殊） */
const currentCardStyle = computed(() => {
  if (isFlyingOut.value) {
    const x = flyDirection.value === "left" ? -800 : 800;
    return {
      transform: `translateX(${x}px) rotate(${flyDirection.value === "left" ? -30 : 30}deg)`,
      opacity: 0,
      transition: "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease-out",
    };
  }

  if (isEntering.value) {
    return {
      transform: "translateY(100%) translateX(0) rotate(0deg) scale(1)",
      opacity: 0,
      transition: "none",
    };
  }

  const transition = isDragging.value
    ? "none"
    : "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 240ms ease-out";
  // Phase D5 · 静止/dragging 状态保持 scale(1.02) 突出当前卡片
  return {
    transform: `translateX(${translateX.value}px) rotate(${rotate.value}deg) scale(var(--card-current-scale, 1.02))`,
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
 * 注：默认行为阻止由模板的 @touchmove.stop.prevent 完成（mp-weixin 兼容）
 */
function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || isFlyingOut.value) return;
  currentX = e.touches[0].clientX;
  currentY = e.touches[0].clientY;

  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  // 判断主要是水平滑动还是垂直滑动（仅用于逻辑判断，默认行为由模板修饰符阻止）
  void deltaY;

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

  // 飞出时触发重振动反馈
  heavyHaptic();

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
    currentImageIndex.value = 0;

    // 触发新卡片入场动画
    if (props.cards.length > 1) {
      isEntering.value = true;
      nextTick(() => {
        setTimeout(() => {
          isEntering.value = false;
        }, 50);
      });
    }
  }, 400);
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
  lightHaptic(); // 拒绝：轻振动
  performFlyOut("left");
}

/**
 * 点击喜欢按钮
 */
function onLike() {
  if (isFlyingOut.value || !currentCard.value) return;
  mediumHaptic(); // 喜欢：中等振动
  performFlyOut("right");
}

/**
 * 点击超级喜欢按钮
 */
function onSuperLike() {
  if (isFlyingOut.value || !currentCard.value) return;
  heavyHaptic(); // 超级喜欢：重振动
  emit("superLike", currentCard.value.id);
}

/**
 * 切换简介展开状态
 */
function toggleBio() {
  isBioExpanded.value = !isBioExpanded.value;
}

/**
 * swiper 切换图片（Phase D2 新增）。
 * 由 uni-app swiper 的 @change 事件触发，更新当前页索引以驱动分页指示器。
 */
function onSwiperChange(e: { detail: { current: number } }) {
  currentImageIndex.value = e.detail.current;
}

/**
 * 视频角标点击（Phase D2 新增）。
 * 阻止冒泡到 card-stack 触摸事件，emit videoTap 由父组件跳转 video-player 页。
 */
function onVideoBadgeTap() {
  if (!currentCard.value?.personalVideoUrl) return;
  lightHaptic();
  emit("videoTap", currentCard.value.id, currentCard.value.personalVideoUrl);
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

/**
 * 监听当前卡片 ID 变化（卡片切换时重置图片索引到第一张）。
 */
watch(
  () => currentCard.value?.id,
  () => {
    currentImageIndex.value = 0;
  }
);
</script>

<template>
  <view class="card-swiper">
    <!-- 卡片堆叠区域：@touchmove.stop.prevent 替代 e.preventDefault()，mp-weixin 兼容 -->
    <view class="card-stack" @touchstart="onTouchStart" @touchmove.stop.prevent="onTouchMove" @touchend="onTouchEnd">
      <!-- 无卡片状态 -->
      <view v-if="!currentCard" class="empty-state">
        <image class="empty-state__icon" :src="IMAGE_PATHS.ICONS_COMMON.NOTIFICATION" mode="aspectFit" />
        <text class="empty-state__title">今日推荐已看完</text>
        <text class="empty-state__subtitle">明天中午 12 点刷新</text>
      </view>

      <!-- 下一张卡片（堆叠底层） -->
      <view v-if="nextCard" class="card card--next" :style="nextCardStyle">
        <!-- Phase D2 · 下一张卡片仅展示首图预览（保持堆叠层次简洁） -->
        <SafeImage
          v-if="getDisplayImages(nextCard).length > 0"
          :src="getDisplayImages(nextCard)[0]"
          custom-class="card__bg"
          mode="aspectFill"
        />
        <view v-else class="card__bg card__bg--placeholder">
          <text class="card__placeholder-text">{{ nextCard.name[0] }}</text>
        </view>
      </view>

      <!-- 当前卡片（可操作层） -->
      <view v-if="currentCard" class="card card--current" :style="currentCardStyle">
        <!-- Phase D2 · 4:5 大图区，照片墙 swiper 支持多图浏览 -->
        <swiper
          v-if="currentDisplayImages.length > 0"
          class="card__gallery"
          :current="currentImageIndex"
          :indicator-dots="false"
          :autoplay="false"
          :circular="false"
          :duration="300"
          @change="onSwiperChange"
        >
          <swiper-item
            v-for="(imageUrl, idx) in currentDisplayImages"
            :key="idx"
            class="card__gallery-item"
          >
            <SafeImage
              :src="imageUrl"
              custom-class="card__bg"
              mode="aspectFill"
            />
          </swiper-item>
        </swiper>

        <!-- 无图兜底：渐变背景 + 昵称首字 -->
        <view v-else class="card__bg card__bg--placeholder">
          <text class="card__placeholder-text">{{ currentCard.name[0] }}</text>
        </view>

        <!-- 渐变遮罩（Phase D2 · 下半区加强渐变以提升文字可读性） -->
        <view class="card__overlay" />

        <!-- 顶部在线状态 -->
        <view class="card__online-badge" v-if="currentCard.onlineStatus === 'online'">
          <view class="card__online-dot" />
          <text class="card__online-text">在线</text>
        </view>

        <!-- Phase D2 · 视频角标（右上角，personalVideoUrl 存在时展示） -->
        <view
          v-if="hasVideo"
          class="card__video-badge press-feedback"
          hover-class="card__video-badge--pressed"
          hover-stay-time="120"
          @tap.stop="onVideoBadgeTap"
        >
          <image class="card__video-badge-icon" :src="emojiIcons.video" mode="aspectFit" />
          <text class="card__video-badge-text">视频</text>
        </view>

        <!-- Phase D2 · 照片墙分页指示器（多图场景下展示） -->
        <view
          v-if="hasMultipleImages"
          class="card__pagination"
        >
          <view
            v-for="(_, idx) in currentDisplayImages"
            :key="idx"
            class="card__pagination-dot"
            :class="{ 'card__pagination-dot--active': idx === currentImageIndex }"
          />
        </view>

        <!-- Phase D2 · 图片计数（右上角，多图时与视频角标共存） -->
        <view
          v-if="hasMultipleImages"
          class="card__image-counter"
          :class="{ 'card__image-counter--with-video': hasVideo }"
        >
          <text class="card__image-counter-text">{{ currentImageIndex + 1 }}/{{ imageCount }}</text>
        </view>

        <!-- 滑动指示器 -->
        <view v-if="isDragging && translateX !== 0" class="swipe-indicator" :class="[
          translateX > 0 ? 'swipe-indicator--like' : 'swipe-indicator--nope'
        ]">
          <text class="swipe-indicator__text">{{ translateX > 0 ? '喜欢' : '跳过' }}</text>
        </view>

        <!-- 卡片内容 -->
        <view class="card__content">
          <!-- 昵称 + 年龄 + 认证 -->
          <view class="card__name-row">
            <text class="card__name">{{ currentCard.name }}</text>
            <text class="card__age">{{ extractAge(currentCard.headline) }}</text>
            <!-- Phase D3 · 集成 VerificationBadge -->
            <VerificationBadge
              v-if="currentCard.verificationBadgeLevel"
              :level="(currentCard.verificationBadgeLevel as 'none' | 'school' | 'email' | 'idcard')"
              size="sm"
              :show-cta-when-none="false"
            />
          </view>

          <!-- 学校、距离 -->
          <view class="card__info-row">
            <view class="card__school">
              <image class="card__school-icon" :src="emojiIcons.graduation" mode="aspectFit" />
              <text class="card__school-text">{{ currentCard.campusName || currentCard.headline?.split('·')[0]?.trim() || '同校同学' }}</text>
            </view>
            <text class="card__dot">·</text>
            <view class="card__distance">
              <image class="card__distance-icon" :src="emojiIcons.location" mode="aspectFit" />
              <text class="card__distance-text">{{ currentCard.availability || '附近' }}</text>
            </view>
          </view>

          <!-- 校园标签 -->
          <view class="card__campus-tags">
            <text v-if="currentCard.isSameSchool" class="campus-tag campus-tag--school">同校</text>
            <text v-if="currentCard.isSameMajor" class="campus-tag campus-tag--major">同专业</text>
            <text class="campus-tag campus-tag--match">
              <image class="campus-tag__icon" :src="emojiIcons.heart" mode="aspectFit" />
              {{ matchScore }}%匹配
            </text>
          </view>

          <!-- 标签区 -->
          <view v-if="currentCard.tags && currentCard.tags.length > 0" class="card__tags">
            <text
              v-for="(tag, idx) in currentCard.tags.slice(0, 4)"
              :key="idx"
              class="tag-pill"
            >{{ tag }}</text>
          </view>

          <!-- 底部：个人简介 -->
          <view class="card__bio" @tap.stop="toggleBio">
            <text
              class="card__bio-text"
              :class="{ 'card__bio-text--expanded': isBioExpanded }"
            >{{ currentCard.bio || '喜欢读书、旅行、看电影，希望遇到有趣的灵魂~' }}</text>
            <text v-if="(currentCard.bio && currentCard.bio.length > 30) || !currentCard.bio" class="card__bio-more">
              {{ isBioExpanded ? '收起' : '展开' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作区：图片资源 + hover-class 振动反馈，跨设备渲染一致 -->
    <view v-if="currentCard" class="action-bar">
      <view
        class="action-btn action-btn--reject press-feedback"
        hover-class="action-btn--pressed"
        hover-stay-time="120"
        @tap="onReject"
      >
        <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.PASS" mode="aspectFit" />
      </view>
      <view
        class="action-btn action-btn--super press-feedback"
        hover-class="action-btn--pressed"
        hover-stay-time="120"
        @tap="onSuperLike"
      >
        <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.SUPER_LIKE" mode="aspectFit" />
      </view>
      <view
        class="action-btn action-btn--like press-feedback"
        hover-class="action-btn--pressed"
        hover-stay-time="120"
        @tap="onLike"
      >
        <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED" mode="aspectFit" />
      </view>
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
  padding: 16rpx 24rpx;
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
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 32rpx;
  opacity: 0.4;
}

.empty-state__title {
  font-size: var(--fs-3xl);
  font-weight: 600;
  color: var(--c-text-primary);
  margin-bottom: var(--sp-3);
}

.empty-state__subtitle {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

/* ========== 卡片基础样式 ========== */
.card {
  position: absolute;
  width: calc(100% - 48rpx);
  /* Phase D2 · 卡片采用 4:5 比例约束（aspect-ratio 优先，max-height 兜底防溢出） */
  aspect-ratio: 4 / 5;
  max-height: calc(100% - 32rpx);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: var(--s-card-soft);
  background: var(--c-bg-container);
}

.card--next {
  z-index: 1;
}

.card--current {
  z-index: 2;
  touch-action: pan-y;
  /* Phase D5 · 突出特殊：品牌色阴影增强（与 scale(1.02) 配合凸显当前卡片） */
  box-shadow: var(--c-brand-shadow);
}

/* ========== 背景图片（Phase D5 · brightness + saturate 凸显背景） ========== */
.card__bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(1.05) saturate(1.1);
}

.card__bg--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 50%, var(--c-brand-400) 100%);
}

.card__placeholder-text {
  font-size: var(--fs-display);
  font-weight: 700;
  color: var(--c-overlay-text-placeholder);
}

/* ========== Phase D2 · 照片墙 swiper 大图区（4:5 比例） ========== */
.card__gallery {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.card__gallery-item {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* ========== 渐变遮罩（Phase D5 · 降低不透明度让背景更凸显） ========== */
.card__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 65%;
  background: linear-gradient(
    to top,
    var(--c-gradient-mask-strong) 0%,
    var(--c-gradient-mask-mid) 30%,
    var(--c-gradient-mask-light) 55%,
    var(--c-gradient-mask-transparent) 100%
  );
  pointer-events: none;
  z-index: 2;
}

/* ========== 在线状态徽章 ========== */
.card__online-badge {
  position: absolute;
  top: 28rpx;
  left: 28rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  background: var(--c-overlay-online-bg);
  border-radius: var(--r-full);
  /* mp-weixin 不支持，H5 保留毛玻璃；背景已用 0.95 高不透明度近似降级 */
  // #ifdef H5
  backdrop-filter: blur(8rpx);
  // #endif
  z-index: 3;
}

.card__online-dot {
  width: 14rpx;
  height: 14rpx;
  background: var(--c-text-inverse);
  border-radius: 50%;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.8); }
}

.card__online-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== Phase D2 · 视频角标（右上角） ========== */
.card__video-badge {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  background: var(--c-badge-video-bg);
  border-radius: var(--r-full);
  border: 1rpx solid var(--c-badge-video-border);
  z-index: 4;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.card__video-badge--pressed {
  transform: scale(0.94);
  opacity: 0.85;
}

.card__video-badge-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.card__video-badge-text {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  font-weight: 600;
  line-height: 1;
}

/* ========== Phase D2 · 照片墙分页指示器（点状） ========== */
.card__pagination {
  position: absolute;
  top: 88rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  z-index: 3;
}

.card__pagination-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--c-overlay-bg-mid);
  transition: all 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card__pagination-dot--active {
  width: 32rpx;
  border-radius: 6rpx;
  background: var(--c-text-inverse);
}

/* ========== Phase D2 · 图片计数器（右下角，避免与视频角标冲突） ========== */
.card__image-counter {
  position: absolute;
  bottom: 32rpx;
  right: 28rpx;
  padding: 6rpx 16rpx;
  background: var(--c-overlay-strong);
  border-radius: var(--r-full);
  border: 1rpx solid var(--c-badge-video-border);
  z-index: 4;
}

/* 视频角标存在时，图片计数器上移避让（避免与底部信息区重叠） */
.card__image-counter--with-video {
  bottom: 96rpx;
}

.card__image-counter-text {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  font-weight: 600;
  line-height: 1;
}

/* ========== 滑动指示器 ========== */
.swipe-indicator {
  position: absolute;
  top: 140rpx;
  padding: 20rpx 48rpx;
  border-radius: 20rpx;
  border-width: 6rpx;
  border-style: solid;
  z-index: 5;
  transform: rotate(-18deg);
  background: var(--c-overlay-bg-pure);
  /* mp-weixin 不支持，H5 保留毛玻璃；背景已用 0.95 高不透明度近似降级 */
  // #ifdef H5
  backdrop-filter: blur(8rpx);
  // #endif
}

.swipe-indicator--like {
  right: 40rpx;
  border-color: var(--c-success);
  color: var(--c-success);
  box-shadow: var(--s-action-success);
}

.swipe-indicator--nope {
  left: 40rpx;
  border-color: var(--c-error);
  color: var(--c-error);
  box-shadow: var(--s-action-error);
  transform: rotate(18deg);
}

.swipe-indicator__text {
  font-size: var(--fs-5xl);
  font-weight: 800;
  letter-spacing: 4rpx;
}

/* ========== 卡片内容 ========== */
.card__content {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 40rpx 40rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  z-index: 2;
}

/* 昵称 + 年龄 + 认证 */
.card__name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.card__name {
  font-size: var(--fs-6xl);
  font-weight: 700;
  color: var(--c-text-inverse);
  text-shadow: var(--c-card-name-shadow);
}

.card__age {
  font-size: var(--fs-3xl);
  font-weight: 500;
  color: var(--c-overlay-bg-solid);
  background: var(--c-overlay-bg-light);
  padding: 4rpx 16rpx;
  border-radius: var(--r-full);
}

.card__verified {
  width: 40rpx;
  height: 40rpx;
  background: var(--c-gradient-brand);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card__verified-icon {
  font-size: var(--fs-base);
  color: var(--c-text-inverse);
  font-weight: 700;
}

/* 学校、距离信息行 */
.card__info-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.card__school,
.card__distance {
  font-size: var(--fs-md);
  color: var(--c-overlay-text-secondary);
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.card__school-icon,
.card__distance-icon {
  width: 24rpx;
  height: 24rpx;
  color: var(--c-overlay-text-primary);
  flex-shrink: 0;
}

.card__school-text,
.card__distance-text {
  font-size: var(--fs-md);
  color: var(--c-overlay-text-secondary);
}

.card__dot {
  font-size: var(--fs-md);
  color: var(--c-overlay-text-quaternary);
}

/* 校园标签 */
.card__campus-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 4rpx;
}

.campus-tag {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 20rpx;
  border-radius: var(--r-full);
  font-size: var(--fs-sm);
  font-weight: 600;
  /* mp-weixin 不支持，H5 保留毛玻璃 */
  // #ifdef H5
  backdrop-filter: blur(8rpx);
  // #endif
}

.campus-tag__icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.campus-tag--school {
  background: var(--c-tag-school-overlay);
  color: var(--c-text-inverse);
  border: 1rpx solid var(--c-overlay-border-strong);
}

.campus-tag--major {
  background: var(--c-tag-major-overlay);
  color: var(--c-text-inverse);
  border: 1rpx solid var(--c-overlay-border-strong);
}

.campus-tag--match {
  background: linear-gradient(135deg, var(--c-tag-match-from), var(--c-tag-match-to));
  color: var(--c-text-inverse);
  border: 1rpx solid var(--c-overlay-border-stronger);
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
  padding: 10rpx 24rpx;
  border-radius: var(--r-full);
  background: var(--c-overlay-bg-light);
  color: var(--c-text-inverse);
  font-size: var(--fs-base);
  font-weight: 500;
  /* mp-weixin 不支持，H5 保留毛玻璃；白字+白底场景保留低不透明度避免文字不可见 */
  // #ifdef H5
  backdrop-filter: blur(8rpx);
  // #endif
  border: 1rpx solid var(--c-overlay-border-mid);
}

/* 个人简介 */
.card__bio {
  margin-top: 8rpx;
}

.card__bio-text {
  font-size: var(--fs-md);
  color: var(--c-overlay-text-secondary);
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: var(--c-card-bio-shadow);
}

.card__bio-text--expanded {
  -webkit-line-clamp: unset;
  display: block;
}

.card__bio-more {
  font-size: var(--fs-base);
  color: var(--c-overlay-text-tertiary);
  margin-top: 8rpx;
  display: inline-block;
  font-weight: 500;
}

/* ========== 底部操作栏（探探风格：大圆形彩色按钮） ========== */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40rpx;
  padding: 24rpx 40rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 40rpx);
  background: linear-gradient(
    to top,
    var(--c-bg-page) 0%,
    var(--c-bg-page) 50%,
    transparent 100%
  );
}

.action-btn {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 200ms ease;
}

/* 通用按压态（替代 :active，兼容 mp-weixin） */
.action-btn--pressed {
  transform: scale(0.78);
  filter: brightness(0.92);
  box-shadow: var(--s-action-pressed);
}

.action-btn--reject {
  width: 112rpx;
  height: 112rpx;
  background: var(--c-bg-container);
  box-shadow: var(--s-action-reject);
  border: 3rpx solid var(--c-action-reject-border);
}

.action-btn--reject.action-btn--pressed {
  box-shadow: var(--s-action-reject-pressed);
}

.action-btn--super {
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
  box-shadow: var(--s-action-super);
}

.action-btn--like {
  width: 136rpx;
  height: 136rpx;
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  box-shadow: var(--s-action-like);
}

/* 按钮图标样式（替代 emoji，跨设备渲染一致） */
.action-btn__icon {
  width: 56rpx;
  height: 56rpx;
}

.action-btn--reject .action-btn__icon {
  width: 44rpx;
  height: 44rpx;
}

.action-btn--super .action-btn__icon {
  width: 44rpx;
  height: 44rpx;
}

.action-btn--like .action-btn__icon {
  width: 56rpx;
  height: 56rpx;
}
</style>
