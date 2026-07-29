<script setup lang="ts">
/**
 * CardDetailOverlay — 卡片详情全屏展示层
 *
 * 从卡片位置缩放展开至全屏居中，完整展示用户资料：
 * - 顶部大图轮播 + 分页指示器
 * - 姓名 / 年龄 / 学校 / 认证信息（叠加于图片底部渐变上）
 * - 快速资料卡片：年龄 / 身高 / 学历 / 月收入
 * - 个人简介区
 * - 性格标签区
 * - 兴趣圈网格
 * - 底部固定操作栏：跳过 / 超级喜欢 / 喜欢 / 发消息
 * - 顶部关闭按钮 + 顶部栏下滑关闭手势
 *
 * 动画：入场 scale(0.9)→scale(1) + opacity 0→1，出场反向
 * 兼容：不使用 :hover / :active，使用 hover-class；backdrop-filter 仅在 H5 启用
 */
import { ref, computed, watch, nextTick, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import type { DiscoverCard } from "../../stores/discover";
import VerificationBadge from "../common/VerificationBadge.vue";
import SafeImage from "../common/SafeImage.vue";
import { lightHaptic, mediumHaptic, successHaptic } from "../../utils/haptic";
import { openAppPath } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
// Task 32：使用 compat 层统一触摸事件类型，替代浏览器原生 TouchEvent
import type { UniTouchEvent } from "../../compat";

const props = defineProps<{
  visible: boolean;
  card: DiscoverCard | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "like", cardId: string): void;
  (e: "superLike", cardId: string): void;
  (e: "pass", cardId: string): void;
  (e: "message", userId: string): void;
}>();

const { t } = useI18n();

/** 入场动画状态 */
const animating = ref(false);
/** 当前图片索引 */
const currentImageIndex = ref(0);
/** 个人简介是否展开（默认展开，长文可收起） */
const isBioExpanded = ref(true);

/**
 * SubTask 1.5.2：关闭动画定时器引用，用于组件卸载时清理。
 *
 * <p>原实现 4 处 {@code setTimeout(() => emit("close"), 320)} 均未保存返回值，
 * 若用户在 320ms 出场动画期间快速关闭弹层或父组件销毁本组件，
 * 定时器仍会触发并 emit 事件到已卸载的父组件，造成 Vue 警告与潜在状态错乱。</p>
 */
let closeAnimTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * SubTask 1.5.2：统一的"延迟触发 close 事件"封装。
 *
 * <p>每次启动前先清掉前一个未触发的 close 定时器，避免快速连点产生多次 emit。</p>
 *
 * @param delayMs 延迟毫秒数，默认 320ms（出场动画时长）
 */
function scheduleCloseEmit(delayMs = 320): void {
  if (closeAnimTimer) {
    clearTimeout(closeAnimTimer);
  }
  closeAnimTimer = setTimeout(() => {
    closeAnimTimer = null;
    emit("close");
  }, delayMs);
}

/**
 * SubTask 1.5.2：组件卸载时清理未触发的 close 定时器，避免在已销毁组件上 emit 事件。
 */
onUnmounted(() => {
  if (closeAnimTimer) {
    clearTimeout(closeAnimTimer);
    closeAnimTimer = null;
  }
});

/** 图标资源 */
const icons = {
  close: IMAGE_PATHS.ICONS_COMMON.CLOSE,
  graduation: IMAGE_PATHS.ICONS_COMMON.GRADUATION_SVG,
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  cake: IMAGE_PATHS.ICONS_EMOJI.CAKE,
  pass: IMAGE_PATHS.ICONS_SOCIAL.PASS,
  superLike: IMAGE_PATHS.ICONS_SOCIAL.SUPER_LIKE,
  like: IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED,
  message: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
} as const;

/**
 * 安全执行交互操作并在异常时给用户明确提示。
 * 符合 Spec 要求：所有滑动、喜欢、发消息操作失败时禁止静默吞掉异常。
 */
function safeAction<T>(fn: () => T, errorMsg?: string): T | undefined {
  try {
    return fn();
  } catch (error) {
    const fallbackMsg = errorMsg ?? t("cardDetail.operationFailed");
    const message = error instanceof Error ? error.message : fallbackMsg;
    uni.showToast({ title: message, icon: "none" });
    console.error(`[CardDetailOverlay] ${fallbackMsg}:`, error);
    // 修复（严格模式 noImplicitReturns）：catch 分支必须显式返回，
    // 与函数签名 T | undefined 保持一致（异常时返回 undefined 由调用方处理）。
    return undefined;
  }
}

/** 展示图片列表（与 CardSwiper 优先级保持一致） */
const displayImages = computed<string[]>(() => {
  if (!props.card) return [];
  if (props.card.halfBodyPhotoUrl) return [props.card.halfBodyPhotoUrl];
  if (props.card.photoGallery?.length) return props.card.photoGallery.slice(0, 6);
  if (props.card.avatar) return [props.card.avatar];
  if (props.card.images?.length) return props.card.images;
  return [];
});

/** 学历中文映射（使用 i18n 实时切换） */
function eduLabel(level?: string): string {
  const map: Record<string, string> = {
    high_school: t("discover.educationHighSchool"),
    bachelor: t("discover.educationBachelor"),
    master: t("discover.educationMaster"),
    phd: t("discover.educationPhd"),
  };
  return map[level ?? ""] ?? level ?? t("discover.educationBachelor");
}

/** 年级文本（从 headline 提取第二段） */
const gradeText = computed(() => {
  const headline = props.card?.headline ?? "";
  const parts = headline.split("·").map((s) => s.trim());
  return parts[1] || t("cardDetail.defaultGrade");
});

/** 性格标签（优先使用卡片 tags，否则使用默认标签） */
const personalityTags = computed(() => {
  const tags = props.card?.tags ?? [];
  if (tags.length > 0) return tags.slice(0, 6);
  return t("cardDetail.personalityTags")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
});

/** 兴趣圈（优先从卡片 tags 派生，否则使用模拟数据） */
const interestCircles = computed(() => {
  const tags = props.card?.tags ?? [];
  const preset = [
    { name: "读书会", icon: "📚", members: 128, gradient: "linear-gradient(135deg, var(--c-lavender-100) 0%, var(--c-lavender-50) 100%)" },
    { name: "摄影社", icon: "📷", members: 89, gradient: "linear-gradient(135deg, var(--c-sky-100) 0%, var(--c-sky-50) 100%)" },
    { name: "美食探店", icon: "🍜", members: 256, gradient: "linear-gradient(135deg, var(--c-apricot-100) 0%, var(--c-apricot-50) 100%)" },
    { name: "徒步旅行", icon: "🥾", members: 76, gradient: "linear-gradient(135deg, var(--c-brand-100) 0%, var(--c-brand-50) 100%)" },
  ];
  if (tags.length > 0) {
    // 修复（严格模式 noUncheckedIndexedAccess）：preset[idx % preset.length] 索引访问返回类型含 undefined，
    // 此处通过局部变量 + 兜底默认值，确保 icon / gradient 始终为 string。
    return tags.slice(0, 4).map((tag, idx) => {
      const presetItem = preset[idx % preset.length];
      return {
        name: tag,
        icon: presetItem?.icon ?? "💬",
        members: 60 + ((props.card?.userId?.charCodeAt(0) ?? 0) + idx * 31) % 240,
        gradient: presetItem?.gradient ?? "linear-gradient(135deg, var(--c-brand-100) 0%, var(--c-brand-50) 100%)",
      };
    });
  }
  return preset;
});

/** 收入范围（模拟，后续接入后端） */
const incomeLabel = computed(() => {
  const seed = (props.card?.userId?.charCodeAt(0) ?? 0) % 4;
  const ranges = ["3k-8k", "8k-15k", "15k-30k", "30k+"];
  return ranges[seed];
});

/** 从 headline 提取年龄 */
const ageText = computed(() => {
  const h = props.card?.headline ?? "";
  const m = h.match(/(\d{2})\s*岁/);
  return m ? m[1] : "22";
});

/** 匹配度分数 */
const matchScore = computed(() => {
  const count = props.card?.commonCircleCount ?? 0;
  return Math.min(98, 80 + count * 5);
});

/** 匹配度文案 */
const matchScoreText = computed(() => t("cardDetail.matchScoreLabel", { n: matchScore.value }));

/** 兴趣圈数量文案 */
const circlesCountText = computed(() => t("cardDetail.circlesCount", { n: interestCircles.value.length }));

/** 简介 toggle 文案 */
const bioToggleText = computed(() => isBioExpanded.value ? t("cardDetail.bioCollapse") : t("cardDetail.bioExpand"));

/** 默认学校文案 */
const schoolNameText = computed(() => props.card?.campusName || t("cardDetail.defaultSchool"));

/** 默认简介文案 */
const bioText = computed(() => props.card?.bio || t("cardDetail.defaultBio"));

/** 圈成员数文案 */
function circleMembersText(members: number): string {
  return t("cardDetail.circleMembers", { n: members });
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      currentImageIndex.value = 0;
      isBioExpanded.value = true;
      nextTick(() => { animating.value = true; });
    } else {
      animating.value = false;
    }
  }
);

function onSwiperChange(e: { detail: { current: number } }) {
  currentImageIndex.value = e.detail.current;
}

/** 关闭详情页（带出场动画与触觉反馈） */
function handleClose() {
  safeAction(() => {
    lightHaptic();
    animating.value = false;
    // 等待出场动画完成后再通知父组件移除弹层
    // SubTask 1.5.2：使用 scheduleCloseEmit 跟踪定时器，卸载时统一清理
    scheduleCloseEmit(320);
  }, t("cardDetail.closeFailed"));
}

/** 喜欢 */
function handleLike() {
  if (!props.card) return;
  safeAction(() => {
    mediumHaptic();
    emit("like", props.card!.id);
    animating.value = false;
    // SubTask 1.5.2：使用 scheduleCloseEmit 跟踪定时器
    scheduleCloseEmit(320);
  }, t("cardDetail.likeFailed"));
}

/** 超级喜欢 */
function handleSuperLike() {
  if (!props.card) return;
  safeAction(() => {
    successHaptic();
    emit("superLike", props.card!.id);
  }, t("cardDetail.superLikeFailed"));
}

/** 跳过 */
function handlePass() {
  if (!props.card) return;
  safeAction(() => {
    lightHaptic();
    emit("pass", props.card!.id);
    animating.value = false;
    // SubTask 1.5.2：使用 scheduleCloseEmit 跟踪定时器
    scheduleCloseEmit(320);
  }, t("cardDetail.passFailed"));
}

/**
 * 发消息：向父组件发射 message 事件并携带 userId。
 * 父组件（CardSwiper）负责关闭弹层并导航到 /pages/chat-session/index?userId={userId}。
 */
function handleMessage() {
  if (!props.card) return;
  safeAction(() => {
    lightHaptic();
    emit("message", props.card!.userId);
    animating.value = false;
    // SubTask 1.5.2：使用 scheduleCloseEmit 跟踪定时器
    scheduleCloseEmit(320);
  }, t("cardDetail.messageFailed"));
}

/** 跳转个人主页 */
function goToProfile() {
  if (!props.card) return;
  safeAction(() => {
    openAppPath(`/pages/profile/index?userId=${encodeURIComponent(props.card!.userId)}`);
  }, t("cardDetail.profileNavFailed"));
}

/** 展开/收起个人简介 */
function toggleBio() {
  safeAction(() => {
    lightHaptic();
    isBioExpanded.value = !isBioExpanded.value;
  }, t("cardDetail.bioToggleFailed"));
}

/* ========== 顶部栏下滑关闭手势 ========== */
let swipeStartY = 0;
let swipeStartX = 0;
const SWIPE_DOWN_THRESHOLD = 120;
const SWIPE_HORIZONTAL_TOLERANCE = 80;

/** 记录下滑起始坐标 */
function onSwipeDownStart(e: UniTouchEvent) {
  // 修复（严格模式 noUncheckedIndexedAccess）：e.touches[0] 索引访问返回 UniTouchPoint | undefined，
  // 此处提取首触点后做非空校验，避免在未触点时访问 clientY 抛 undefined。
  const touch = e.touches[0];
  if (!touch) return;
  swipeStartY = touch.clientY;
  swipeStartX = touch.clientX;
}

/**
 * 下滑过程中实时判断手势方向。
 * 注：不在 touchmove 中调用 preventDefault，避免在 mp-weixin 中阻塞滚动或产生兼容警告。
 */
function onSwipeDownMove(e: UniTouchEvent) {
  if (swipeStartY === 0) return;
  // 修复（严格模式 noUncheckedIndexedAccess）：e.touches[0] 可能为 undefined，做非空校验。
  const touch = e.touches[0];
  if (!touch) return;
  const deltaY = touch.clientY - swipeStartY;
  const deltaX = Math.abs(touch.clientX - swipeStartX);
  // 仅做方向校验，不阻止默认滚动行为
  if (deltaY > 0 && deltaY < 240 && deltaX < SWIPE_HORIZONTAL_TOLERANCE) {
    // 可在此扩展视觉跟随（如 translateY），当前通过 drag-bar 提供足够反馈
    void e;
  }
}

/** 下滑结束：超过阈值则关闭详情页 */
function onSwipeDownEnd(e: UniTouchEvent) {
  if (swipeStartY === 0) return;
  // 修复（严格模式 noUncheckedIndexedAccess）：e.changedTouches[0] 可能为 undefined，做非空校验。
  const touch = e.changedTouches[0];
  if (!touch) {
    swipeStartY = 0;
    return;
  }
  const deltaY = touch.clientY - swipeStartY;
  const deltaX = Math.abs(touch.clientX - swipeStartX);
  swipeStartY = 0;
  if (deltaY > SWIPE_DOWN_THRESHOLD && deltaX < SWIPE_HORIZONTAL_TOLERANCE) {
    handleClose();
  }
}
</script>

<template>
  <view
    v-if="visible"
    class="card-detail-overlay"
    :class="{ 'card-detail-overlay--active': animating }"
    role="dialog"
    aria-modal="true"
    :aria-label="t('cardDetail.detailTitle')"
  >
    <!-- 半透明背景 -->
    <view class="card-detail-overlay__backdrop" @tap="handleClose" />

    <!-- 内容面板：全屏居中 + 缩放入场 -->
    <view class="card-detail-overlay__content" :class="{ 'card-detail-overlay__content--active': animating }">
      <!-- 顶部操作栏（支持下拉关闭） -->
      <view
        class="detail-top-bar"
        @touchstart="onSwipeDownStart"
        @touchmove="onSwipeDownMove"
        @touchend="onSwipeDownEnd"
      >
        <view class="detail-top-bar__drag-handle">
          <view class="detail-top-bar__drag-bar" />
        </view>
        <view class="detail-top-bar__actions">
          <view
            class="detail-top-bar__btn"
            hover-class="detail-top-bar__btn--pressed"
            :hover-stay-time="120"
            @tap="handleClose"
            role="button"
            :aria-label="t('cardDetail.closeAria')"
          >
            <image class="detail-top-bar__icon" :src="icons.close" mode="aspectFit" alt="" />
          </view>
          <text class="detail-top-bar__title">{{ t('cardDetail.detailTitle') }}</text>
          <view
            class="detail-top-bar__btn detail-top-bar__btn--more"
            hover-class="detail-top-bar__btn--pressed"
            :hover-stay-time="120"
            @tap="goToProfile"
            role="button"
            :aria-label="t('cardDetail.homePageAria')"
          >
            <text class="detail-top-bar__more-text">{{ t('cardDetail.homePage') }}</text>
          </view>
        </view>
      </view>

      <!-- 可滚动内容区 -->
      <scroll-view scroll-y class="detail-scroll" enhanced :show-scrollbar="false">
        <!-- 大图轮播区 -->
        <view class="detail-hero">
          <swiper
            v-if="displayImages.length > 0"
            class="detail-hero__gallery"
            :current="currentImageIndex"
            :indicator-dots="false"
            :autoplay="false"
            :circular="false"
            :duration="300"
            @change="onSwiperChange"
          >
            <swiper-item v-for="(url, idx) in displayImages" :key="idx" class="detail-hero__item">
              <!-- 性能优化：详情页大图开启 lazy-load，减少首屏并发请求 -->
              <SafeImage :src="url" custom-class="detail-hero__img" mode="aspectFill" :lazy-load="true" />
            </swiper-item>
          </swiper>
          <!-- 无图兜底 -->
          <view v-else class="detail-hero__gallery detail-hero__gallery--placeholder">
            <text class="detail-hero__placeholder-text">{{ card?.name?.[0] ?? '?' }}</text>
          </view>

          <!-- 底部渐变遮罩 -->
          <view class="detail-hero__gradient" />

          <!-- 图片分页指示器 -->
          <view v-if="displayImages.length > 1" class="detail-hero__pagination">
            <view
              v-for="(_, idx) in displayImages" :key="idx"
              class="detail-hero__dot"
              :class="{ 'detail-hero__dot--active': idx === currentImageIndex }"
            />
          </view>

          <!-- 叠加在图片上的核心信息 -->
          <view class="detail-hero__info">
            <view class="detail-hero__name-row">
              <text class="detail-hero__name">{{ card?.name }}</text>
              <view class="detail-hero__age-badge">
                <text class="detail-hero__age">{{ ageText }}</text>
                <text class="detail-hero__age-unit">{{ t('cardDetail.ageUnit') }}</text>
              </view>
              <VerificationBadge
                v-if="card?.verificationBadgeLevel"
                size="sm"
                :level="(card.verificationBadgeLevel as 'none' | 'school' | 'email' | 'idcard')"
                :show-cta-when-none="false"
              />
            </view>

            <view class="detail-hero__school-row">
              <image class="detail-hero__school-icon" :src="icons.graduation" mode="aspectFit" alt="" />
              <text class="detail-hero__school-text">{{ schoolNameText }}</text>
              <text class="detail-hero__dot">·</text>
              <text class="detail-hero__grade-text">{{ gradeText }}</text>
            </view>

            <view class="detail-hero__meta-row">
              <view v-if="card?.onlineStatus === 'online'" class="detail-hero__online">
                <view class="detail-hero__online-dot" />
                <text>{{ t('cardDetail.onlineLabel') }}</text>
              </view>
              <view class="detail-hero__match">
                <image class="detail-hero__match-icon" :src="icons.heart" mode="aspectFit" alt="" />
                <text>{{ matchScoreText }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 快速资料卡片：年龄 / 身高 / 学历 / 月收入 -->
        <view class="detail-panel detail-quick-stats">
          <view class="quick-stat">
            <view class="quick-stat__icon quick-stat__icon--age">
              <image class="quick-stat__icon-img" :src="icons.cake" mode="aspectFit" alt="" />
            </view>
            <text class="quick-stat__value">{{ ageText }}{{ t('cardDetail.ageUnit') }}</text>
            <text class="quick-stat__label">{{ t('cardDetail.ageLabel') }}</text>
          </view>
          <view class="quick-stat">
            <view class="quick-stat__icon quick-stat__icon--height">
              <text class="quick-stat__icon-text">📏</text>
            </view>
            <text class="quick-stat__value">{{ card?.height ?? (165 + (card?.userId?.length ?? 0) % 25) }}{{ t('cardDetail.heightUnit') }}</text>
            <text class="quick-stat__label">{{ t('cardDetail.heightLabel') }}</text>
          </view>
          <view class="quick-stat">
            <view class="quick-stat__icon quick-stat__icon--edu">
              <image class="quick-stat__icon-img" :src="icons.graduation" mode="aspectFit" alt="" />
            </view>
            <text class="quick-stat__value">{{ eduLabel(card?.educationLevel) }}</text>
            <text class="quick-stat__label">{{ t('cardDetail.educationLabel') }}</text>
          </view>
          <view class="quick-stat">
            <view class="quick-stat__icon quick-stat__icon--income">
              <text class="quick-stat__icon-text">💰</text>
            </view>
            <text class="quick-stat__value">{{ incomeLabel }}</text>
            <text class="quick-stat__label">{{ t('cardDetail.incomeLabel') }}</text>
          </view>
        </view>

        <!-- 个人简介 -->
        <view
          class="detail-panel detail-bio"
          @tap="toggleBio"
          role="button"
          :aria-label="t('cardDetail.bioToggleAria')"
        >
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('cardDetail.bioTitle') }}</text>
            <text class="detail-panel__toggle">{{ bioToggleText }}</text>
          </view>
          <text
            class="detail-bio__text"
            :class="{ 'detail-bio__text--expanded': isBioExpanded }"
          >
            {{ bioText }}
          </text>
        </view>

        <!-- 性格标签 -->
        <view class="detail-panel detail-personality">
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('cardDetail.personalityTitle') }}</text>
          </view>
          <view class="detail-tags">
            <text
              v-for="(tag, idx) in personalityTags"
              :key="idx"
              class="detail-tag"
              :class="`detail-tag--${idx % 4}`"
            >
              {{ tag }}
            </text>
          </view>
        </view>

        <!-- 兴趣圈 -->
        <view class="detail-panel detail-circles">
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('cardDetail.circlesTitle') }}</text>
            <text class="detail-panel__subtitle">{{ circlesCountText }}</text>
          </view>
          <view class="detail-circles__grid">
            <view
              v-for="(circle, idx) in interestCircles"
              :key="idx"
              class="detail-circle-card"
              :style="{ background: circle.gradient }"
            >
              <text class="detail-circle-card__icon">{{ circle.icon }}</text>
              <view class="detail-circle-card__info">
                <text class="detail-circle-card__name">{{ circle.name }}</text>
                <text class="detail-circle-card__members">{{ circleMembersText(circle.members) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部留白（操作栏高度） -->
        <view class="detail-bottom-spacer" />
      </scroll-view>

      <!-- 底部固定操作栏：跳过 / 超级喜欢 / 喜欢 / 发消息 -->
      <view class="detail-action-bar">
        <view
          class="detail-action-bar__btn detail-action-bar__btn--pass"
          hover-class="detail-action-bar__btn--pressed"
          :hover-stay-time="120"
          @tap="handlePass"
          role="button"
          :aria-label="t('cardDetail.passAria')"
        >
          <image class="detail-action-bar__icon" :src="icons.pass" mode="aspectFit" alt="" />
          <text class="detail-action-bar__label">{{ t('cardDetail.passLabel') }}</text>
        </view>
        <view
          class="detail-action-bar__btn detail-action-bar__btn--super"
          hover-class="detail-action-bar__btn--pressed"
          :hover-stay-time="120"
          @tap="handleSuperLike"
          role="button"
          :aria-label="t('cardDetail.superLikeAria')"
        >
          <image class="detail-action-bar__icon" :src="icons.superLike" mode="aspectFit" alt="" />
          <text class="detail-action-bar__label">{{ t('cardDetail.superLikeLabel') }}</text>
        </view>
        <view
          class="detail-action-bar__btn detail-action-bar__btn--like"
          hover-class="detail-action-bar__btn--pressed"
          :hover-stay-time="120"
          @tap="handleLike"
          role="button"
          :aria-label="t('cardDetail.likeAria')"
        >
          <image class="detail-action-bar__icon" :src="icons.like" mode="aspectFit" alt="" />
          <text class="detail-action-bar__label">{{ t('cardDetail.likeLabel') }}</text>
        </view>
        <view
          class="detail-action-bar__btn detail-action-bar__btn--msg"
          hover-class="detail-action-bar__btn--pressed"
          :hover-stay-time="120"
          @tap="handleMessage"
          role="button"
          :aria-label="t('cardDetail.messageAria')"
        >
          <image class="detail-action-bar__icon" :src="icons.message" mode="aspectFit" alt="" />
          <text class="detail-action-bar__label">{{ t('cardDetail.messageLabel') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ========== 覆盖层容器 ========== */
.card-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-detail-overlay__backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-black-overlay-transparent);
  transition: background var(--d-fade, 300ms) ease;
}

.card-detail-overlay--active .card-detail-overlay__backdrop {
  background: var(--c-black-overlay-strong);
}

/* ========== 内容面板：全屏居中 + 缩放 ========== */
.card-detail-overlay__content {
  position: relative;
  width: 100vw;
  /* mp-weixin 不支持 100vh（含导航栏高度），fixed 定位下 100vh 会包含状态栏；改用 100% 配合 fixed 父级铺满可视区域 */
  height: 100%;
  background: var(--c-bg-page);
  display: flex;
  flex-direction: column;
  transform: scale(0.9) translateY(40rpx);
  opacity: 0;
  transition: transform var(--d-bounce, 400ms) cubic-bezier(0.34, 1.56, 0.64, 1), opacity var(--d-fade, 300ms) ease;
  overflow: hidden;
}

.card-detail-overlay__content--active {
  transform: scale(1) translateY(0);
  opacity: 1;
}

/* ========== 顶部栏 ========== */
.detail-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-header);
  padding-top: calc(env(safe-area-inset-top) + 12rpx);
  padding-bottom: 12rpx;
  background: linear-gradient(
    to bottom,
    var(--c-overlay-bg-pure) 0%,
    var(--c-overlay-text-secondary) 60%,
    var(--c-overlay-bg-light) 100%
  );
}

.detail-top-bar__drag-handle {
  display: flex;
  justify-content: center;
  padding: 8rpx 0 12rpx;
}

.detail-top-bar__drag-bar {
  width: 44rpx;
  height: 6rpx;
  border-radius: var(--r-full);
  background: var(--c-black-overlay-light);
}

.detail-top-bar__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-5);
}

.detail-top-bar__btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-bg-solid);
  border: 1rpx solid var(--c-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1), opacity var(--d-normal, 200ms) ease;
  box-shadow: var(--s-sm);
}

.detail-top-bar__btn--pressed {
  transform: scale(0.92);
  opacity: 0.85;
}

.detail-top-bar__icon {
  width: 28rpx;
  height: 28rpx;
}

.detail-top-bar__btn--more {
  width: auto;
  padding: 0 20rpx;
  border-radius: var(--r-full);
}

.detail-top-bar__more-text {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 600;
}

.detail-top-bar__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

/* ========== 滚动区 ========== */
.detail-scroll {
  flex: 1;
  overflow: hidden;
}

/* ========== 图片轮播 ========== */
.detail-hero {
  position: relative;
  width: 100%;
  height: 580rpx;
  flex-shrink: 0;
}

.detail-hero__gallery {
  width: 100%;
  height: 100%;
}

.detail-hero__gallery--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--c-brand-300) 0%, var(--c-romance-300) 100%);
}

.detail-hero__item {
  width: 100%;
  height: 100%;
}

.detail-hero__img {
  width: 100%;
  height: 100%;
}

.detail-hero__placeholder-text {
  font-size: var(--fs-display);
  font-weight: 800;
  color: var(--c-overlay-bg-mid);
}

.detail-hero__gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 60%;
  background: linear-gradient(
    to top,
    var(--c-overlay-stronger) 0%,
    var(--c-black-overlay-mid) 40%,
    var(--c-black-shadow-sm) 70%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 2;
}

/* ========== 分页指示器 ========== */
.detail-hero__pagination {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 108rpx);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 16rpx;
  background: var(--c-overlay-strong);
  border-radius: var(--r-full);
  z-index: 3;
}

.detail-hero__dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-bg-mid);
  transition: all var(--d-slow, 250ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

.detail-hero__dot--active {
  background: var(--c-text-inverse);
  width: 28rpx;
  border-radius: var(--r-xs, 5rpx);
}

/* ========== 叠加信息 ========== */
.detail-hero__info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0 var(--page-padding) 32rpx;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.detail-hero__name-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.detail-hero__name {
  font-size: var(--fs-7xl);
  font-weight: 800;
  color: var(--c-text-inverse);
  text-shadow: 0 2rpx 12rpx var(--c-text-shadow-overlay);
}

.detail-hero__age-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 2rpx;
  padding: 6rpx 16rpx;
  border-radius: var(--r-full);
  background: var(--c-overlay-bg-light);
  border: 1rpx solid var(--c-overlay-border-mid);
}

.detail-hero__age {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.detail-hero__age-unit {
  font-size: var(--fs-sm);
  color: var(--c-overlay-text-secondary);
}

.detail-hero__school-row {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.detail-hero__school-icon {
  width: 26rpx;
  height: 26rpx;
  color: var(--c-overlay-text-primary);
}

.detail-hero__school-text,
.detail-hero__grade-text,
.detail-hero__dot {
  font-size: var(--fs-md);
  color: var(--c-overlay-text-secondary);
}

.detail-hero__dot {
  color: var(--c-overlay-text-quaternary);
}

.detail-hero__meta-row {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-top: 4rpx;
}

.detail-hero__online {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: var(--fs-sm);
  color: var(--c-success);
  font-weight: 600;
}

.detail-hero__online-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-success);
  animation: pulse-dot var(--d-particle, 1500ms) ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.detail-hero__match {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 12rpx;
  border-radius: var(--r-full);
  background: var(--c-overlay-bg-light);
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.detail-hero__match-icon {
  width: 22rpx;
  height: 22rpx;
}

/* ========== 通用面板 ========== */
.detail-panel {
  margin: 0 var(--page-padding) var(--sp-4);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  padding: var(--sp-5);
  box-shadow: var(--card-shadow);
  border: var(--card-border);
}

.detail-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-3);
}

.detail-panel__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.detail-panel__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.detail-panel__toggle {
  font-size: var(--fs-sm);
  color: var(--c-brand-600);
  font-weight: 600;
}

/* ========== 快速资料卡片 ========== */
.detail-quick-stats {
  display: flex;
  gap: var(--sp-3);
  margin-top: -40rpx;
  position: relative;
  z-index: 4;
}

.quick-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-4) var(--sp-2);
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  box-shadow: var(--card-shadow);
  border: var(--card-border);
}

.quick-stat__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: var(--r-circle, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rpx;
}

.quick-stat__icon--age {
  background: linear-gradient(135deg, var(--c-romance-100) 0%, var(--c-romance-50) 100%);
}

.quick-stat__icon--height {
  background: linear-gradient(135deg, var(--c-brand-100) 0%, var(--c-brand-50) 100%);
}

.quick-stat__icon--edu {
  background: linear-gradient(135deg, var(--c-lavender-100) 0%, var(--c-lavender-50) 100%);
}

.quick-stat__icon--income {
  background: linear-gradient(135deg, var(--c-apricot-100) 0%, var(--c-apricot-50) 100%);
}

.quick-stat__icon-text {
  font-size: var(--fs-lg, 28rpx);
}

.quick-stat__icon-img {
  width: 28rpx;
  height: 28rpx;
}

.quick-stat__value {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-primary);
}

.quick-stat__label {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* ========== 个人简介 ========== */
.detail-bio__text {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: all var(--d-slow, 250ms) ease;
}

.detail-bio__text--expanded {
  -webkit-line-clamp: unset;
  display: block;
}

/* ========== 性格标签 ========== */
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.detail-tag {
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
  font-size: var(--fs-base);
  font-weight: 600;
  border-width: 1rpx;
  border-style: solid;
  transition: transform var(--d-normal, 200ms) ease;
}

.detail-tag--0 {
  background: var(--c-bg-brand);
  border-color: var(--c-brand-200);
  color: var(--c-brand-700);
}

.detail-tag--1 {
  background: var(--c-romance-100);
  border-color: var(--c-romance-200);
  color: var(--c-romance-700);
}

.detail-tag--2 {
  background: var(--c-lavender-100);
  border-color: var(--c-lavender-100);
  color: var(--c-lavender-500);
}

.detail-tag--3 {
  background: var(--c-apricot-100);
  border-color: var(--c-apricot-100);
  color: var(--c-apricot-500);
}

/* ========== 兴趣圈网格 ========== */
/* mp-weixin 不支持 display:grid，2 列等宽布局改用 Flexbox + 子元素 width: calc */
.detail-circles__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.detail-circle-card {
  /* 2 列布局：每行 2 个，gap var(--sp-3) 共 1 个间隙 → width = calc((100% - sp-3) / 2) */
  width: calc((100% - var(--sp-3)) / 2);
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--r-lg);
  border: 1rpx solid var(--c-overlay-white-bg-stronger);
  transition: transform var(--d-normal, 200ms) ease;
  box-sizing: border-box;
}

.detail-circle-card__icon {
  font-size: var(--fs-5xl, 44rpx);
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-bg-mid);
  flex-shrink: 0;
}

.detail-circle-card__info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.detail-circle-card__name {
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-circle-card__members {
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
}

/* ========== 底部留白 ========== */
.detail-bottom-spacer {
  height: 180rpx;
}

/* ========== 底部操作栏 ========== */
.detail-action-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--page-padding);
  padding-bottom: calc(var(--sp-4) + env(safe-area-inset-bottom));
  background: var(--c-overlay-white-bg-most);
  border-top: 1rpx solid var(--c-divider-light);
  flex-shrink: 0;
  z-index: var(--z-header);
  /* H5 保留毛玻璃，小程序使用高不透明度纯色降级 */
  // #ifdef H5
  backdrop-filter: blur(20rpx);
  // #endif
}

.detail-action-bar__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  width: 140rpx;
  height: 116rpx;
  border-radius: var(--r-xl);
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.34, 1.56, 0.64, 1), filter var(--d-normal, 200ms) ease;
}

.detail-action-bar__btn--pressed {
  transform: scale(0.9);
  filter: brightness(0.92);
}

.detail-action-bar__btn--pass {
  background: var(--c-bg-surface);
  border: 1rpx solid var(--c-border-light);
  box-shadow: var(--s-sm);
}

.detail-action-bar__btn--super {
  background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
  box-shadow: var(--s-action-super);
}

.detail-action-bar__btn--like {
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  box-shadow: var(--s-action-like);
}

.detail-action-bar__btn--msg {
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
  box-shadow: var(--s-brand);
}

.detail-action-bar__icon {
  width: 44rpx;
  height: 44rpx;
}

.detail-action-bar__btn--pass .detail-action-bar__icon {
  width: 40rpx;
  height: 40rpx;
}

.detail-action-bar__label {
  font-size: var(--fs-xs);
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  line-height: 1.2;
}

.detail-action-bar__btn--pass .detail-action-bar__label {
  color: var(--c-text-secondary);
}

.detail-action-bar__btn--super .detail-action-bar__label,
.detail-action-bar__btn--like .detail-action-bar__label,
.detail-action-bar__btn--msg .detail-action-bar__label {
  color: var(--c-text-inverse);
}
</style>