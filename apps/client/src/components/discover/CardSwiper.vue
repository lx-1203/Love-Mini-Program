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
 * Task 2/3 打磨：
 * - 强化主视觉区、信息层级与卡片质感（圆角/阴影/微边框/渐变遮罩/堆叠）
 * - 拖动倾斜、滑动阈值反馈、释放飞出与下一张顶上动画
 * - 点击触发 showDetail，由 CardDetailOverlay 完成全屏展开
 * - 长按 500ms 调出 LongPressMenu；移动超过 10px 取消长按识别
 * - 菜单项包含：查看详情、超级喜欢、不感兴趣、举报、取消
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（hover-class 替代）
 * - 不使用 backdrop-filter（高不透明度降级）
 * - 不使用 import.meta.env.DEV
 * - 所有过渡动画内联在 .vue 文件中
 */
import { ref, computed, watch, nextTick, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import type { DiscoverCard, SwipeDirection } from "../../stores/discover";
import SafeImage from "../common/SafeImage.vue";
import VerificationBadge from "../common/VerificationBadge.vue";
import CardDetailOverlay from "./CardDetailOverlay.vue";
import LongPressMenu from "./LongPressMenu.vue";
import { lightHaptic, mediumHaptic, heavyHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";
import { featureFlags } from "../../config/feature-flags";
// Task 32：使用 compat 层统一触摸事件类型，替代浏览器原生 TouchEvent
import type { UniTouchEvent } from "../../compat";
// 统一常量：手势阈值、长按时延、卡片动画参数等
import {
  SWIPE_THRESHOLD,
  SWIPE_ROTATION_MAX,
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_MOVE_THRESHOLD,
  TAP_MOVE_THRESHOLD,
  CARD_TILT_MAX_DEGREE,
  CARD_TILT_DIVISOR,
  SWIPE_ROTATION_DIVISOR,
  DRAG_TINT_OPACITY_DIVISOR,
  SWIPE_INDICATOR_RATIO_DIVISOR,
  CARD_FLY_OUT_DURATION_MS,
  CARD_ENTER_DELAY_MS,
  CARD_FLY_OUT_DISTANCE_PX,
  CARD_FLY_OUT_ROTATION_DEGREE,
  PHOTO_GALLERY_MAX,
  CARD_SCALE_STATIC,
  CARD_SCALE_DRAGGING,
  CARD_SCALE_LONG_PRESS,
  NEXT_CARD_SCALE_DRAGGING,
  NEXT_CARD_SCALE_STATIC,
  NEXT_CARD_TRANSLATE_Y_DRAGGING,
  NEXT_CARD_TRANSLATE_Y_STATIC,
  NEXT_CARD_OPACITY_DRAGGING,
  NEXT_CARD_OPACITY_STATIC,
  DEFAULT_MATCH_SCORE,
  MATCH_SCORE_BASE,
  MATCH_SCORE_STEP,
  MATCH_SCORE_MAX,
  DEFAULT_AGE_FALLBACK,
} from "../../constants/match";

const { t } = useI18n();

/** Emoji 替换 SVG 图标路径 */
const emojiIcons = {
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
  graduation: IMAGE_PATHS.ICONS_COMMON.GRADUATION_SVG,
  video: IMAGE_PATHS.ICONS_COMMON.CAMERA,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  chat: IMAGE_PATHS.ICONS_EMOJI.CHAT,
  group: IMAGE_PATHS.ICONS_EMOJI.GROUP,
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
  /** 发消息操作（由 CardDetailOverlay 透传，父组件负责导航到聊天页） */
  (e: "message", userId: string): void;
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

/* ========== 点击 / 长按状态 ========== */
/** 是否正在长按 */
const isLongPressing = ref(false);
/** 是否显示详情弹出层 */
const showDetail = ref(false);
/** 是否显示快捷菜单 */
const showMenu = ref(false);
/** 长按定时器 */
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * SubTask 1.5.2：动画相关 setTimeout 集合，用于卸载时统一清理。
 *
 * <p>原实现 fly-out / card-enter / watch-enter 三处 setTimeout 未保存返回值，
 * 用户在动画进行中快速返回上一页时，定时器仍会触发并修改已销毁组件的响应式状态。</p>
 */
const animTimers = new Set<ReturnType<typeof setTimeout>>();
/** 触摸是否已移动（移动超过阈值则取消长按） */
let hasMovedForLongPress = false;
// 注：LONG_PRESS_DELAY_MS / LONG_PRESS_MOVE_THRESHOLD 由 constants/match 统一提供

/** 触摸起始坐标 */
let startX = 0;
let startY = 0;
/** 当前触摸坐标 */
let currentX = 0;
let currentY = 0;
// 注：SWIPE_THRESHOLD / SWIPE_ROTATION_MAX 由 constants/match 统一提供

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

  // 2. photoGallery（多图浏览场景，最多 PHOTO_GALLERY_MAX 张）
  if (card.photoGallery && card.photoGallery.length > 0) {
    return card.photoGallery.slice(0, PHOTO_GALLERY_MAX);
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
 * Phase 4.7：视频功能暂时下架（featureFlags.videoCallEnabled=false 时角标隐藏）。
 */
const hasVideo = computed<boolean>(() => {
  return featureFlags.videoCallEnabled && !!currentCard.value?.personalVideoUrl;
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
  if (!headline) return DEFAULT_AGE_FALLBACK;
  const match = headline.match(/(\d{2})\s*岁/);
  // 修复（严格模式 noUncheckedIndexedAccess）：match[1] 索引访问返回 string | undefined，
  // 此处追加兜底，确保返回值始终为 string。
  return match?.[1] ?? DEFAULT_AGE_FALLBACK;
};

/** 匹配度分数（基于共同兴趣圈数量计算） */
const matchScore = computed(() => {
  const card = currentCard.value;
  if (!card) return DEFAULT_MATCH_SCORE;
  const base = card.commonCircleCount ?? 1;
  return Math.min(MATCH_SCORE_MAX, MATCH_SCORE_BASE + base * MATCH_SCORE_STEP);
});

/** 月收入展示（与 CardDetailOverlay 对齐，基于 userId 做稳定映射） */
const incomeLabel = computed(() => {
  const seed = (currentCard.value?.userId?.charCodeAt(0) ?? 0) % 4;
  const ranges = ["3k-8k", "8k-15k", "15k-30k", "30k+"];
  return ranges[seed];
});

/** 性格预览（优先取前两个标签，否则用固定性格词表按 userId 稳定选取） */
const personalityPreview = computed(() => {
  const card = currentCard.value;
  const tags = card?.tags ?? [];
  if (tags.length > 0) {
    return tags.slice(0, 2).join(" · ");
  }
  const moods = [
    t('discover.personalityOutgoing'),
    t('discover.personalityGentle'),
    t('discover.personalityHumorous'),
    t('discover.personalityArtistic'),
    t('discover.personalitySporty'),
    t('discover.personalityRational'),
  ];
  const seed = (card?.userId?.charCodeAt(0) ?? 0) % moods.length;
  return [moods[seed], moods[(seed + 1) % moods.length]].join(" · ");
});

/** 社交圈预览（优先取前两个标签，否则用兴趣圈词表按 userId 稳定选取） */
const socialCirclesPreview = computed(() => {
  const card = currentCard.value;
  const tags = card?.tags ?? [];
  if (tags.length > 0) {
    return tags.slice(0, 2).join(" / ");
  }
  const circles = [
    t('discover.circleReading'),
    t('discover.circlePhotography'),
    t('discover.circleFood'),
    t('discover.circleHiking'),
    t('discover.circleMusic'),
    t('discover.circleMurder'),
    t('discover.circleExam'),
    t('discover.circleDance'),
  ];
  const seed = (card?.userId?.charCodeAt(0) ?? 0) % circles.length;
  return [circles[seed], circles[(seed + 1) % circles.length]].join(" / ");
});

/* ========== Phase Feedback1：寻觅页改版新增展示 ========== */

/**
 * 活跃状态文案（基于 activeStatusText 字段）。
 *
 * 支持 mock 字段值：just_now / today / hours_{n} / days_{n} / offline / 自定义文案。
 * 字段缺失时回退到 onlineStatus 推断，再兜底返回空串（模板 v-if 控制显隐）。
 */
const activeStatusLabel = computed(() => {
  const card = currentCard.value;
  if (!card) return "";
  const raw = card.activeStatusText;
  if (raw) {
    if (raw === "just_now") return t('discover.activeJustNow');
    if (raw === "today") return t('discover.activeToday');
    if (raw === "offline") return t('discover.offline');
    const hoursMatch = raw.match(/^hours_(\d+)$/);
    if (hoursMatch?.[1]) return t('discover.activeHoursAgo', { n: hoursMatch[1] });
    const daysMatch = raw.match(/^days_(\d+)$/);
    if (daysMatch?.[1]) return t('discover.activeDaysAgo', { n: daysMatch[1] });
    // 自定义文案直接展示
    return raw;
  }
  // 回退：基于 onlineStatus 推断
  if (card.onlineStatus === "online") return t('discover.activeJustNow');
  if (card.onlineStatus === "away") return t('discover.activeToday');
  return "";
});

/**
 * 距离文案（基于 distanceText 字段）。
 * distanceText 为纯数值时拼接 km 单位；含单位/自定义文案直接展示；同校时展示"同校"。
 */
const distanceLabel = computed(() => {
  const card = currentCard.value;
  if (!card) return "";
  if (card.isSameSchool) return t('discover.sameCampusDistance');
  const raw = card.distanceText;
  if (!raw) return card.availability || "";
  if (/^\d+(\.\d+)?$/.test(raw)) {
    return `${raw}${t('discover.distanceSuffix')}`;
  }
  return raw;
});

/**
 * 认证文案（基于 machineVerified / humanVerified 字段）。
 * 双重认证展示"双重认证"，仅单项认证时展示对应文案，均无时返回空串。
 */
const verificationLabel = computed(() => {
  const card = currentCard.value;
  if (!card) return "";
  if (card.machineVerified && card.humanVerified) return t('discover.doubleVerified');
  if (card.machineVerified) return t('discover.machineVerified');
  if (card.humanVerified) return t('discover.humanVerified');
  return "";
});

/**
 * 个人 ID 展示文案（基于 displayId 字段）。
 */
const displayIdLabel = computed(() => {
  const card = currentCard.value;
  if (!card?.displayId) return "";
  return t('discover.personalId', { id: card.displayId });
});

/** 拖动时红/绿遮罩的不透明度（跟随拖动距离增强，最大 1） */
const dragTintOpacity = computed(() => {
  if (!isDragging.value || translateX.value === 0) return { opacity: 0, transition: "none" };
  return {
    opacity: Math.min(Math.abs(translateX.value) / DRAG_TINT_OPACITY_DIVISOR, 1),
    transition: "none",
  };
});

/** 滑动指示器动态样式（随拖动距离放大并淡入） */
const swipeIndicatorStyle = computed(() => {
  if (!isDragging.value || translateX.value === 0) {
    return { opacity: 0, transform: "scale(0.6)" };
  }
  const ratio = Math.min(Math.abs(translateX.value) / SWIPE_INDICATOR_RATIO_DIVISOR, 1);
  const rotate = translateX.value > 0 ? -22 : 22;
  return {
    opacity: ratio,
    transform: `scale(${0.65 + ratio * 0.45}) rotate(${rotate}deg)`,
    transition: "none",
  };
});

/** 当前卡片样式（Phase D5 · 静止/dragging 状态添加 scale 突出特殊） */
const currentCardStyle = computed(() => {
  if (isFlyingOut.value) {
    const x = flyDirection.value === "left" ? -CARD_FLY_OUT_DISTANCE_PX : CARD_FLY_OUT_DISTANCE_PX;
    return {
      transform: `translateX(${x}px) rotate(${flyDirection.value === "left" ? -CARD_FLY_OUT_ROTATION_DEGREE : CARD_FLY_OUT_ROTATION_DEGREE}deg) scale(0.92)`,
      opacity: 0,
      transition: "transform 480ms cubic-bezier(0.22, 1, 0.36, 1), opacity 360ms ease-out",
    };
  }

  if (isEntering.value) {
    return {
      transform: "translateY(55%) translateX(0) rotate(0deg) scale(0.88)",
      opacity: 0,
      transition: "none",
    };
  }

  const transition = isDragging.value
    ? "none"
    : "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 260ms ease-out";
  // Phase D5 · 静止/dragging 状态保持 scale 突出当前卡片
  return {
    transform: `translateX(${translateX.value}px) rotate(${rotate.value}deg) rotateY(${tiltY.value}deg) scale(${cardScale.value})`,
    opacity: opacity.value,
    transition,
  };
});

/** 下一张卡片样式（堆叠效果） */
const nextCardStyle = computed(() => {
  const scale = isDragging.value ? NEXT_CARD_SCALE_DRAGGING : NEXT_CARD_SCALE_STATIC;
  const translateY = isDragging.value ? NEXT_CARD_TRANSLATE_Y_DRAGGING : NEXT_CARD_TRANSLATE_Y_STATIC;
  const opacity = isDragging.value ? NEXT_CARD_OPACITY_DRAGGING : NEXT_CARD_OPACITY_STATIC;
  return {
    transform: `scale(${scale}) translateY(${translateY}px)`,
    opacity,
    transition: isDragging.value ? "none" : "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 260ms ease-out",
  };
});

/** 简介展开状态 */
const isBioExpanded = ref(false);

/* ========== 卡片缩放效果（长按时缩小） ========== */
const cardScale = computed(() => {
  if (isLongPressing.value) return CARD_SCALE_LONG_PRESS;
  if (isDragging.value) return CARD_SCALE_DRAGGING;
  return CARD_SCALE_STATIC;
});

/** 卡片 3D 倾斜角度（拖动时根据位移计算 Y 轴旋转） */
const tiltY = computed(() => {
  if (!isDragging.value) return 0;
  const ratio = Math.min(Math.abs(translateX.value) / CARD_TILT_DIVISOR, 1);
  return (translateX.value > 0 ? 1 : -1) * ratio * CARD_TILT_MAX_DEGREE;
});

/**
 * 点击卡片 → 打开详情
 */
function handleTap() {
  if (!currentCard.value || isFlyingOut.value) return;
  try {
    lightHaptic();
  } catch (err) {
    // 振动反馈失败时静默降级
    console.warn("[CardSwiper] tap haptic failed:", err);
  }
  showDetail.value = true;
}

/**
 * 关闭详情弹出层
 */
function closeDetail() {
  showDetail.value = false;
}

/**
 * 关闭快捷菜单
 */
function closeMenu() {
  showMenu.value = false;
  isLongPressing.value = false;
}

/**
 * 快捷菜单 → 查看详情
 */
function onMenuDetail() {
  showMenu.value = false;
  isLongPressing.value = false;
  showDetail.value = true;
}

/**
 * 快捷菜单 → 举报
 */
function handleReport() {
  closeMenu();
  uni.showToast({ title: t('discover.reportSubmitted'), icon: "none" });
}

/**
 * 快捷菜单 → 不感兴趣
 * 关闭菜单并将当前卡片向左滑出（与"跳过"一致），同时 toast 提示用户
 */
function handleNotInterested() {
  closeMenu();
  uni.showToast({ title: t('discover.recommendReduced'), icon: "none" });
  if (!currentCard.value || isFlyingOut.value) return;
  try {
    lightHaptic();
  } catch (err) {
    // 振动反馈失败时静默降级
    console.warn("[CardSwiper] not-interested haptic failed:", err);
  }
  performFlyOut("left");
}

/* ========== 触摸事件处理 ========== */

/**
 * 触摸开始
 */
function onTouchStart(e: UniTouchEvent) {
  if (isFlyingOut.value || !currentCard.value) return;
  // 修复（严格模式 noUncheckedIndexedAccess）：e.touches[0] 索引访问返回 UniTouchPoint | undefined，
  // 此处提取首触点后做非空校验，避免在未触点时访问 clientX 抛 undefined。
  const touch = e.touches[0];
  if (!touch) return;
  isDragging.value = true;
  hasMovedForLongPress = false;
  startX = touch.clientX;
  startY = touch.clientY;
  currentX = startX;
  currentY = startY;

  // 启动长按定时器
  clearLongPressTimer();
  longPressTimer = setTimeout(() => {
    if (!hasMovedForLongPress && !isFlyingOut.value) {
      isLongPressing.value = true;
      isDragging.value = false;
      try {
        heavyHaptic();
      } catch (err) {
        console.warn("[CardSwiper] long-press haptic failed:", err);
      }
      showMenu.value = true;
    }
  }, LONG_PRESS_DELAY_MS);
}

function clearLongPressTimer() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

/**
 * SubTask 1.5.2：注册动画 setTimeout，返回值入队 animTimers，便于卸载时统一清理。
 *
 * <p>回调触发后自动出队，避免 Set 无限增长。</p>
 *
 * @param fn 回调函数
 * @param delay 延迟毫秒数
 * @returns setTimeout 返回值（timer id）
 */
function registerAnimTimer(fn: () => void, delay: number): ReturnType<typeof setTimeout> {
  const timer = setTimeout(() => {
    animTimers.delete(timer);
    fn();
  }, delay);
  animTimers.add(timer);
  return timer;
}

/**
 * SubTask 1.5.2：清空所有动画定时器，避免组件销毁后定时器仍触发回调。
 */
function clearAnimTimers() {
  animTimers.forEach((timer) => clearTimeout(timer));
  animTimers.clear();
}

/**
 * 组件卸载时清理长按定时器与所有动画定时器，避免组件销毁后定时器仍触发回调导致内存泄漏。
 * 修复（P1 BUG）：原实现缺少 onUnmounted 钩子，组件卸载后 longPressTimer 仍可能触发，
 * 进而在已销毁组件上修改响应式状态（isLongPressing / showMenu）。
 * SubTask 1.5.2：扩展清理范围至 animTimers，覆盖 fly-out / card-enter / watch-enter 三类动画定时器。
 */
onUnmounted(() => {
  clearLongPressTimer();
  clearAnimTimers();
});

/**
 * 触摸移动
 * 注：catchtouchmove 在 mp-weixin 端原生阻止冒泡与默认行为；
 * H5 端 catchtouchmove 不生效，需手动调用 preventDefault 阻止页面滚动默认行为。
 */
function onTouchMove(e: UniTouchEvent) {
  // H5 兼容：阻止 touchmove 默认行为（页面滚动），mp-weixin 端 catchtouchmove 已原生处理
  // #ifdef H5
  if (typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  // #endif
  if (!isDragging.value || isFlyingOut.value) return;
  // 修复（严格模式 noUncheckedIndexedAccess）：e.touches[0] 可能为 undefined，做非空校验。
  const touch = e.touches[0];
  if (!touch) return;
  currentX = touch.clientX;
  currentY = touch.clientY;

  const deltaX = currentX - startX;

  // 检查是否移动超过长按阈值，取消长按
  if (Math.abs(deltaX) > LONG_PRESS_MOVE_THRESHOLD || Math.abs(currentY - startY) > LONG_PRESS_MOVE_THRESHOLD) {
    hasMovedForLongPress = true;
    clearLongPressTimer();
  }

  translateX.value = deltaX;
  // 根据滑动距离计算旋转角度
  const ratio = Math.min(Math.abs(deltaX) / SWIPE_ROTATION_DIVISOR, 1);
  rotate.value = (deltaX > 0 ? 1 : -1) * ratio * SWIPE_ROTATION_MAX;
}

/**
 * 触摸结束
 */
function onTouchEnd() {
  clearLongPressTimer();

  if (isLongPressing.value) {
    isLongPressing.value = false;
    return;
  }

  if (!isDragging.value || isFlyingOut.value) return;
  isDragging.value = false;

  const deltaX = currentX - startX;
  const totalMove = Math.abs(deltaX) + Math.abs(currentY - startY);

  // 几乎没移动 → 点击
  if (totalMove < TAP_MOVE_THRESHOLD) {
    resetCardPosition();
    handleTap();
    return;
  }

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
  try {
    heavyHaptic();
  } catch (err) {
    console.warn("[CardSwiper] fly-out haptic failed:", err);
  }

  const cardId = currentCard.value.id;

  // 动画结束后通知父组件
  // SubTask 1.5.2：使用 registerAnimTimer 跟踪定时器，卸载时统一清理
  registerAnimTimer(() => {
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
        // SubTask 1.5.2：嵌套定时器同样入队清理
        registerAnimTimer(() => {
          isEntering.value = false;
        }, CARD_ENTER_DELAY_MS);
      });
    }
  }, CARD_FLY_OUT_DURATION_MS);
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
  try {
    lightHaptic(); // 拒绝：轻振动
  } catch (err) {
    console.warn("[CardSwiper] reject haptic failed:", err);
  }
  performFlyOut("left");
}

/**
 * 点击喜欢按钮
 */
function onLike() {
  if (isFlyingOut.value || !currentCard.value) return;
  try {
    mediumHaptic(); // 喜欢：中等振动
  } catch (err) {
    console.warn("[CardSwiper] like haptic failed:", err);
  }
  performFlyOut("right");
}

/**
 * 点击超级喜欢按钮
 */
function onSuperLike() {
  if (isFlyingOut.value || !currentCard.value) return;
  try {
    heavyHaptic(); // 超级喜欢：重振动
  } catch (err) {
    console.warn("[CardSwiper] super-like haptic failed:", err);
  }
  emit("superLike", currentCard.value.id);
}

/* ========== 收藏状态（组件本地维护，Task A2） ========== */

/** 已收藏的卡片 ID 集合（本地状态，不强制同步后端） */
const collectedIds = ref<Set<string>>(new Set());

/** 收藏持久化 key（收尾轮：收藏跨会话保持，不再随页面销毁丢失） */
const COLLECTED_KEY = "campus-love:collected-card-ids";

/** 初始化：从本地存储恢复收藏集合 */
try {
  const raw = uni.getStorageSync(COLLECTED_KEY) as unknown;
  if (Array.isArray(raw)) {
    collectedIds.value = new Set(raw.filter((id): id is string => typeof id === "string"));
  }
} catch (_e) {
  // 读取失败按空集合
}

/** 持久化收藏集合 */
function persistCollected(): void {
  try {
    uni.setStorageSync(COLLECTED_KEY, Array.from(collectedIds.value));
  } catch (_e) {
    // 写入失败静默（仅影响下次启动恢复）
  }
}

/**
 * 当前卡片是否已收藏
 * @param cardId - 卡片 ID
 */
function isCollected(cardId: string): boolean {
  return collectedIds.value.has(cardId);
}

/**
 * 切换收藏状态：收藏/取消收藏 + 轻振动反馈。
 * 以不可变方式更新 Set，保证响应式触发。
 */
function onCollect() {
  if (!currentCard.value || isFlyingOut.value) return;
  const id = currentCard.value.id;
  const next = new Set(collectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  collectedIds.value = next;
  persistCollected();
  try {
    lightHaptic();
  } catch (err) {
    console.warn("[CardSwiper] collect haptic failed:", err);
  }
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
  try {
    lightHaptic();
  } catch (err) {
    console.warn("[CardSwiper] video-badge haptic failed:", err);
  }
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
        // SubTask 1.5.2：watch 触发的入场动画定时器同样入队清理
        registerAnimTimer(() => {
          isEntering.value = false;
        }, CARD_ENTER_DELAY_MS);
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

// 修复（严格模式 noUnusedLocals）：onTouchMove/toggleBio/onVideoBadgeTap 通过 catchtap/catchtouchmove
// 绑定到模板，vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ onTouchMove, toggleBio, onVideoBadgeTap, onCollect });
</script>

<template>
  <view class="card-swiper">
    <!-- 卡片堆叠区域：catchtouchmove 阻止冒泡与默认行为，mp-weixin 原生兼容；H5 端在 onTouchMove 内调用 preventDefault -->
    <view class="card-stack" @touchstart="onTouchStart" catchtouchmove="onTouchMove" @touchend="onTouchEnd">
      <!-- 无卡片状态 -->
      <view
        v-if="!currentCard"
        class="empty-state"
        role="status"
        aria-live="polite"
      >
        <image class="empty-state__icon" :src="IMAGE_PATHS.ICONS_COMMON.NOTIFICATION" mode="aspectFit" alt="" />
        <text class="empty-state__title">{{ t('discover.noMoreRecommend') }}</text>
        <text class="empty-state__subtitle">{{ t('discover.refreshAtNoon') }}</text>
      </view>

      <!-- 下一张卡片（堆叠底层） -->
      <view v-if="nextCard" class="card card--next" :style="nextCardStyle">
        <!-- Phase D2 · 下一张卡片仅展示首图预览（保持堆叠层次简洁） -->
        <!-- SubTask 5.2.4：下一张卡片非首屏可见，开启 lazy-load 延迟加载，减少首屏并发请求数 -->
        <SafeImage
          v-if="getDisplayImages(nextCard).length > 0"
          :src="getDisplayImages(nextCard)[0]"
          custom-class="card__bg"
          mode="aspectFill"
          :lazy-load="true"
        />
        <view v-else class="card__bg card__bg--placeholder">
          <text class="card__placeholder-text">{{ nextCard.name[0] }}</text>
        </view>
      </view>

      <!-- 当前卡片（可操作层） -->
      <view v-if="currentCard" class="card card--current" :style="currentCardStyle">
        <!-- Phase D2 · 4:5 大图区，照片墙 swiper 支持多图浏览 -->
        <!-- 单图场景直接渲染 SafeImage，避免内部 swiper 与卡片整体拖动产生手势冲突 -->
        <SafeImage
          v-if="currentDisplayImages.length === 1"
          :src="currentDisplayImages[0]"
          custom-class="card__bg"
          mode="aspectFill"
        />
        <swiper
          v-else-if="currentDisplayImages.length > 1"
          class="card__gallery"
          :current="currentImageIndex"
          :indicator-dots="false"
          :autoplay="false"
          :circular="false"
          :duration="300"
          @change="onSwiperChange"
        >
          <swiper-item
            v-for="(imageUrl, idx) in currentDisplayImages" :key="idx"
            class="card__gallery-item"
          >
            <!-- 性能优化：开启 lazy-load，仅在网络图片进入视口时加载，减少首屏并发请求数 -->
            <SafeImage
              :src="imageUrl"
              custom-class="card__bg"
              mode="aspectFill"
              :lazy-load="true"
            />
          </swiper-item>
        </swiper>

        <!-- 无图兜底：渐变背景 + 昵称首字 -->
        <view v-else class="card__bg card__bg--placeholder">
          <text class="card__placeholder-text">{{ currentCard.name[0] }}</text>
        </view>

        <!-- 渐变遮罩（Phase D2 · 下半区加强渐变以提升文字可读性） -->
        <view class="card__overlay" />

        <!-- 拖动红/绿反馈遮罩 -->
        <view
          class="card__drag-tint"
          :class="{
            'card__drag-tint--like': translateX > 0,
            'card__drag-tint--nope': translateX < 0
          }"
          :style="dragTintOpacity"
        />

        <!-- 顶部在线状态 -->
        <view class="card__online-badge" v-if="currentCard.onlineStatus === 'online'">
          <view class="card__online-dot" />
          <text class="card__online-text">{{ t('chat.online') }}</text>
        </view>

        <!-- Phase D2 · 视频角标（右上角，personalVideoUrl 存在时展示） -->
        <view
          v-if="hasVideo"
          class="card__video-badge press-feedback"
          hover-class="card__video-badge--pressed"
          hover-stay-time="120"
  @tap.stop="onVideoBadgeTap"
          role="button"
          :aria-label="t('discover.videoBadge')"
        >
          <image class="card__video-badge-icon" :src="emojiIcons.video" mode="aspectFit" alt="" />
          <text class="card__video-badge-text">{{ t('discover.videoBadge') }}</text>
        </view>

        <!-- Phase D2 · 照片墙分页指示器（多图场景下展示） -->
        <view
          v-if="hasMultipleImages"
          class="card__pagination"
        >
          <view
            v-for="(_, idx) in currentDisplayImages" :key="idx"
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
        <view
          v-if="isDragging && translateX !== 0"
          class="swipe-indicator"
          :class="translateX > 0 ? 'swipe-indicator--like' : 'swipe-indicator--nope'"
          :style="swipeIndicatorStyle"
          role="status"
          aria-live="polite"
        >
          <text class="swipe-indicator__text">{{ translateX > 0 ? t('discover.like') : t('discover.skip') }}</text>
        </view>

        <!-- 卡片内容 -->
        <view class="card__content">
          <!-- 昵称 + 年龄 + 认证 -->
          <view class="card__name-row">
            <text class="card__name">{{ currentCard.name }}</text>
            <text class="card__age">{{ extractAge(currentCard.headline) }}{{ t('discover.ageUnit') }}</text>
            <!-- Phase D3 · 集成 VerificationBadge -->
            <VerificationBadge
              v-if="currentCard.verificationBadgeLevel"
              :level="(currentCard.verificationBadgeLevel as 'none' | 'school' | 'email' | 'idcard')"
              size="sm"
              :show-cta-when-none="false"
            />
            <!-- Phase Feedback1 · 双重认证文案标识（机器认证 + 人工认证） -->
            <text v-if="verificationLabel" class="card__verify-text">{{ verificationLabel }}</text>
          </view>

          <!-- Phase Feedback1 · 个人 ID + 活跃状态行 -->
          <view v-if="displayIdLabel || activeStatusLabel" class="card__meta-row">
            <text v-if="displayIdLabel" class="card__meta-text">{{ displayIdLabel }}</text>
            <text v-if="displayIdLabel && activeStatusLabel" class="card__meta-dot">·</text>
            <text v-if="activeStatusLabel" class="card__meta-text card__meta-text--active">
              ● {{ activeStatusLabel }}
            </text>
          </view>

          <!-- 核心资料：收入 / 性格 / 社交圈 / MBTI -->
          <view class="card__key-info">
            <view class="key-info-chip key-info-chip--income">
              <text class="key-info-chip__label">{{ t('discover.income') }}</text>
              <text class="key-info-chip__value">{{ incomeLabel }}</text>
            </view>
            <view class="key-info-chip key-info-chip--personality">
              <text class="key-info-chip__value">{{ personalityPreview }}</text>
            </view>
            <view class="key-info-chip key-info-chip--circles">
              <image class="key-info-chip__icon" :src="emojiIcons.group" mode="aspectFit" alt="" />
              <text class="key-info-chip__label">{{ t('discover.circles') }}</text>
              <text class="key-info-chip__value">{{ socialCirclesPreview }}</text>
            </view>
            <!-- Phase Feedback1 · MBTI 标签 -->
            <view v-if="currentCard.mbti" class="key-info-chip key-info-chip--mbti">
              <text class="key-info-chip__value">{{ currentCard.mbti }}</text>
            </view>
          </view>

          <!-- 学校、距离、活跃 -->
          <view class="card__info-row">
            <view class="card__school">
              <image class="card__school-icon" :src="emojiIcons.graduation" mode="aspectFit" alt="" />
              <text class="card__school-text">{{ currentCard.campusName || currentCard.headline?.split('·')[0]?.trim() || t('discover.sameSchoolStudent') }}</text>
            </view>
            <text class="card__dot">·</text>
            <view class="card__distance">
              <image class="card__distance-icon" :src="emojiIcons.location" mode="aspectFit" alt="" />
              <text class="card__distance-text">{{ distanceLabel || currentCard.availability || t('discover.nearby') }}</text>
            </view>
          </view>

          <!-- 校园标签 -->
          <view class="card__campus-tags">
            <text v-if="currentCard.isSameSchool" class="campus-tag campus-tag--school">{{ t('home.personSameSchool') }}</text>
            <text v-if="currentCard.isSameMajor" class="campus-tag campus-tag--major">{{ t('home.personSameMajor') }}</text>
            <text class="campus-tag campus-tag--match">
              <image class="campus-tag__icon" :src="emojiIcons.heart" mode="aspectFit" alt="" />
              {{ matchScore }}{{ t('discover.matchSuffix') }}
            </text>
          </view>

          <!-- 标签区 -->
          <view v-if="currentCard.tags && currentCard.tags.length > 0" class="card__tags">
            <text
              v-for="(tag, idx) in currentCard.tags.slice(0, 4)" :key="idx"
              class="tag-pill"
            >{{ tag }}</text>
          </view>

          <!-- 底部：个人简介 -->
          <view
            class="card__bio"
  @tap.stop="toggleBio"
            role="button"
            :aria-label="isBioExpanded ? t('home.collapse') : t('home.expand')"
          >
            <text
              class="card__bio-text"
              :class="{ 'card__bio-text--expanded': isBioExpanded }"
            >{{ currentCard.bio || t('discover.defaultBio') }}</text>
            <text v-if="(currentCard.bio && currentCard.bio.length > 30) || !currentCard.bio" class="card__bio-more">
              {{ isBioExpanded ? t('home.collapse') : t('home.expand') }}
            </text>
          </view>

          <!-- Phase 4.1 验收 · 最新动态预览（最多 2 条：内容 + 点赞/评论计数） -->
          <view v-if="currentCard.recentPosts && currentCard.recentPosts.length > 0" class="card__moments">
            <view
              v-for="post in currentCard.recentPosts.slice(0, 2)" :key="post.id"
              class="card__moment"
            >
              <text class="card__moment-text">{{ post.content }}</text>
              <view class="card__moment-meta">
                <image class="card__moment-icon" :src="emojiIcons.heart" mode="aspectFit" alt="" />
                <text class="card__moment-count">{{ post.likes }}</text>
                <image class="card__moment-icon card__moment-icon--chat" :src="emojiIcons.chat" mode="aspectFit" alt="" />
                <text class="card__moment-count">{{ post.comments }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 卡片详情弹出层 -->
    <CardDetailOverlay
      :visible="showDetail"
      :card="currentCard"
      @close="closeDetail"
      @like="() => { closeDetail(); onLike(); }"
      @superLike="() => { closeDetail(); onSuperLike(); }"
      @pass="() => { closeDetail(); onReject(); }"
      @message="(userId: string) => { closeDetail(); emit('message', userId); }"
    />

    <!-- 长按快捷菜单 -->
    <LongPressMenu
      :visible="showMenu"
      :card-name="currentCard?.name ?? ''"
      @close="closeMenu"
      @detail="onMenuDetail"
      @super-like="closeMenu(); onSuperLike();"
      @report="handleReport"
      @not-interested="handleNotInterested"
    />

    <!-- 底部浮动操作栏：半透明叠加在卡片底部边缘（Task A3），catchtap 阻止冒泡避免被卡片手势拦截 -->
    <view v-if="currentCard" class="action-bar">
      <view
        class="action-btn action-btn--reject press-feedback"
        hover-class="action-btn--pressed"
        hover-stay-time="120"
  @tap.stop="onReject"
        role="button"
        :aria-label="t('discover.skip')"
      >
        <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.PASS" mode="aspectFit" alt="" />
      </view>
      <!-- 收藏按钮：本地收藏态切换，选中态金色高亮（Task A2） -->
      <view
        class="action-btn action-btn--collect press-feedback"
        :class="{ 'action-btn--collected': isCollected(currentCard.id) }"
        hover-class="action-btn--pressed"
        hover-stay-time="120"
  @tap.stop="onCollect"
        role="button"
        :aria-label="isCollected(currentCard.id) ? t('discover.collected') : t('discover.collect')"
      >
        <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.BOOKMARK" mode="aspectFit" alt="" lazy-load />
      </view>
      <view
        class="action-btn action-btn--super press-feedback"
        hover-class="action-btn--pressed"
        hover-stay-time="120"
  @tap.stop="onSuperLike"
        role="button"
        :aria-label="t('discover.superLike')"
      >
        <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.SUPER_LIKE" mode="aspectFit" alt="" />
      </view>
      <view
        class="action-btn action-btn--like press-feedback"
        hover-class="action-btn--pressed"
        hover-stay-time="120"
  @tap.stop="onLike"
        role="button"
        :aria-label="t('discover.like')"
      >
        <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED" mode="aspectFit" alt="" />
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
  /* Phase D2 · 卡片采用 4:5 比例约束：mp-weixin 不支持 aspect-ratio，改用 padding-top 百分比（125% = 5/4 × 100%） */
  /* 内部绝对定位子元素（.card__bg/.card__overlay 等）会铺满 padding box，保持视觉一致 */
  padding-top: 125%;
  max-height: calc(100% - 32rpx);
  /* min-height 兜底防溢出 */
  min-height: 600rpx;
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
  border-radius: var(--r-xxl);
  border: 1rpx solid var(--c-overlay-border-light);
  /* 多层阴影：环境阴影 + 品牌光晕，打造“橱窗展品”级质感 */
  box-shadow:
    0 8rpx 24rpx var(--c-neutral-shadow-lg),
    0 28rpx 72rpx var(--c-neutral-shadow-xl),
    0 0 40rpx var(--c-brand-bg-tint-strong);
  will-change: transform;
}

/* 高端相框效果：顶部高光 + 内阴影 + 细白边框 */
.card--current::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: var(--r-xxl);
  border: 1rpx solid var(--c-overlay-white-border-stronger);
  box-shadow:
    inset 0 1rpx 0 var(--c-overlay-white-shadow-light),
    inset 0 -40rpx 100rpx var(--c-black-overlay-light);
  pointer-events: none;
  z-index: 2;
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
  height: 72%;
  background: linear-gradient(
    to top,
    var(--c-overlay-stronger) 0%,
    var(--c-black-overlay-mid) 32%,
    var(--c-black-overlay-light) 58%,
    var(--c-black-overlay-transparent) 100%
  );
  pointer-events: none;
  z-index: 2;
}

/* 拖动方向反馈遮罩：右滑绿色 / 左滑红色，从边缘向内渐隐 */
.card__drag-tint {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  transition: opacity var(--d-fast, 120ms) ease;
}

.card__drag-tint--like {
  background: linear-gradient(
    270deg,
    var(--s-action-success) 0%,
    var(--c-success-bg-tint) 45%,
    transparent 70%
  );
}

.card__drag-tint--nope {
  background: linear-gradient(
    90deg,
    var(--c-error-bg-tint-light) 0%,
    var(--c-action-reject-border) 45%,
    transparent 70%
  );
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
  border-radius: var(--r-circle, 50%);
  animation: pulse-dot var(--d-particle, 1500ms) ease-in-out infinite;
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
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1),
              opacity var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
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
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-bg-mid);
  transition: all var(--d-slow, 250ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card__pagination-dot--active {
  width: 32rpx;
  border-radius: var(--r-xs, 6rpx);
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
  top: 160rpx;
  padding: 28rpx 60rpx;
  border-radius: var(--r-xxl, 28rpx);
  border-width: 8rpx;
  border-style: solid;
  z-index: 5;
  background: var(--c-overlay-white-bg-most);
  /* mp-weixin 不支持，H5 保留毛玻璃；背景已用 0.96 高不透明度近似降级 */
  // #ifdef H5
  backdrop-filter: blur(10rpx);
  // #endif
}

.swipe-indicator--like {
  right: 36rpx;
  border-color: var(--c-success);
  color: var(--c-success);
  box-shadow: 0 12rpx 40rpx var(--s-action-success);
}

.swipe-indicator--nope {
  left: 36rpx;
  border-color: var(--c-error);
  color: var(--c-error);
  box-shadow: 0 12rpx 40rpx var(--s-action-error);
}

.swipe-indicator__text {
  font-size: var(--fs-6xl);
  font-weight: 900;
  letter-spacing: 6rpx;
  text-shadow: 0 2rpx 8rpx var(--c-black-shadow-md);
}

/* ========== 卡片内容 ========== */
.card__content {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 32rpx 36rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  z-index: 3;
  /* 毛玻璃信息区：半透明背景 + 模糊效果（叠加在图片遮罩之上） */
  background: linear-gradient(
    to top,
    var(--c-black-overlay-strong) 0%,
    var(--c-black-shadow-xl) 55%,
    var(--c-black-shadow-xs) 100%
  );
  // #ifdef H5
  backdrop-filter: blur(12rpx);
  // #endif
}

/* 昵称 + 年龄 + 认证 */
.card__name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.card__name {
  font-size: var(--fs-7xl);
  font-weight: 800;
  color: var(--c-text-inverse);
  text-shadow: var(--c-card-name-shadow);
  letter-spacing: 0.02em;
  /* 修复（P1 BUG）：原实现缺少文本裁剪，长昵称会溢出到年龄标签右侧导致布局错乱 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 360rpx;
}

.card__age {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-inverse);
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
  padding: 6rpx 18rpx;
  border-radius: var(--r-full);
  box-shadow: 0 2rpx 10rpx var(--c-brand-border-tint-stronger);
}

.card__verified {
  width: 40rpx;
  height: 40rpx;
  background: var(--c-gradient-brand);
  border-radius: var(--r-circle, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card__verified-icon {
  font-size: var(--fs-base);
  color: var(--c-text-inverse);
  font-weight: 700;
}

/* 核心资料：收入 / 性格 / 社交圈 */
.card__key-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12rpx;
  margin-top: 4rpx;
}

.key-info-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 18rpx;
  border-radius: var(--r-full);
  border: 1rpx solid var(--c-overlay-border-mid);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text-inverse);
  box-shadow: 0 2rpx 8rpx var(--c-black-shadow-lg);
}

.key-info-chip--income {
  background: linear-gradient(135deg, var(--c-accent-bg-tint) 0%, var(--c-accent-bg-tint-mid) 100%);
}

.key-info-chip--personality {
  background: linear-gradient(135deg, var(--c-romance-bg-tint-strong) 0%, var(--c-romance-500) 100%);
}

.key-info-chip--circles {
  background: linear-gradient(135deg, var(--c-info-500) 0%, var(--s-action-super) 100%);
}

/* Phase Feedback1 · MBTI 标签 */
.key-info-chip--mbti {
  background: linear-gradient(135deg, var(--c-brand-500) 0%, var(--c-brand-600, #2db97a) 100%);
}

/* Phase Feedback1 · 双重认证文案 */
.card__verify-text {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-text-inverse);
  background: var(--c-gradient-verify);
  padding: 4rpx 12rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
}

/* Phase Feedback1 · 个人 ID + 活跃状态行 */
.card__meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}

.card__meta-text {
  font-size: var(--fs-xs);
  font-weight: 500;
  color: var(--c-overlay-text-secondary);
}

.card__meta-text--active {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.card__meta-dot {
  font-size: var(--fs-xs);
  color: var(--c-overlay-text-quaternary);
}

.key-info-chip__label {
  font-size: var(--fs-xs);
  font-weight: 500;
  color: var(--c-overlay-text-secondary);
}

.key-info-chip__icon {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

.key-info-chip__value {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text-inverse);
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
  font-size: var(--fs-base);
  font-weight: 700;
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
  box-shadow: 0 4rpx 16rpx var(--c-shadow-romance-tint-strong);
  animation: match-pulse var(--d-loop-slow, 2000ms) ease-in-out infinite;
}

@keyframes match-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--c-shadow-romance-tint-stronger); }
  50% { box-shadow: 0 0 0 10rpx var(--c-romance-bg-tint); }
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
  border: 1rpx solid var(--c-overlay-border-mid);
}

/* 标签色彩编码：兴趣(绿) / 性格(粉) / 生活(橙) / 校园(蓝) */
.tag-pill:nth-child(4n+1) {
  background: var(--c-brand-border-tint-stronger);
  border-color: var(--c-brand-border-tint-stronger);
  color: var(--c-tint-green-50);
}

.tag-pill:nth-child(4n+2) {
  background: var(--c-romance-border-tint);
  border-color: var(--c-romance-border-tint);
  color: var(--c-tint-pink-50);
}

.tag-pill:nth-child(4n+3) {
  background: var(--c-state-ongoing-bg);
  border-color: var(--c-state-ongoing-bg);
  color: var(--c-tint-orange-50);
}

.tag-pill:nth-child(4n+4) {
  background: var(--c-secondary-blue-shadow-soft);
  border-color: var(--c-secondary-blue-shadow);
  color: var(--c-tint-blue-50);
}

/* 个人简介 */
.card__bio {
  margin-top: 8rpx;
}

/* Phase 4.1 验收 · 卡片最新动态预览 */
.card__moments {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.card__moment {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 10rpx 16rpx;
  border-radius: var(--r-lg, 16rpx);
  background: rgba(255, 255, 255, 0.12);
}

.card__moment-text {
  flex: 1;
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-overlay-text-secondary);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__moment-meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex-shrink: 0;
}

.card__moment-icon {
  width: 22rpx;
  height: 22rpx;
  color: var(--c-romance-500, #ec4899);
}

.card__moment-icon--chat {
  color: var(--c-overlay-text-tertiary);
}

.card__moment-count {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-overlay-text-tertiary);
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

/* ========== 底部浮动操作栏（Task A3：半透明叠加在卡片底部边缘，不挤压卡片本体） ========== */
.action-bar {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 18rpx 28rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 18rpx);
  border-radius: var(--r-xxl, 28rpx);
  background: var(--c-black-overlay-mid, rgba(0, 0, 0, 0.4));
  border: 1rpx solid var(--c-overlay-border-mid, rgba(255, 255, 255, 0.18));
  box-shadow: var(--s-card-soft);
  z-index: 6;
  /* H5 端毛玻璃增强；mp-weixin 不支持 backdrop-filter，高不透明度背景降级 */
  // #ifdef H5
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  // #endif
}

.action-btn {
  width: 100rpx;
  height: 100rpx;
  border-radius: var(--r-circle, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-normal, 200ms) cubic-bezier(0.34, 1.56, 0.64, 1), filter var(--d-normal, 200ms) ease;
}

/* 通用按压态（替代 :active，兼容 mp-weixin） */
.action-btn--pressed {
  transform: scale(0.78);
  filter: brightness(0.92);
  box-shadow: var(--s-action-pressed);
}

.action-btn--reject {
  width: 92rpx;
  height: 92rpx;
  background: var(--c-bg-container);
  box-shadow: var(--s-action-reject);
  border: 3rpx solid var(--c-action-reject-border);
}

.action-btn--reject.action-btn--pressed {
  box-shadow: var(--s-action-reject-pressed);
}

/* 收藏按钮：默认白底描边，收藏后金色渐变高亮（Task A2） */
.action-btn--collect {
  width: 88rpx;
  height: 88rpx;
  background: var(--c-bg-container);
  box-shadow: var(--s-action-reject);
  border: 3rpx solid var(--c-neutral-200);
}

.action-btn--collected {
  background: linear-gradient(135deg, var(--c-gold, #d4af37) 0%, var(--c-accent-400, #f59e0b) 100%);
  border-color: var(--c-gold, #d4af37);
  box-shadow: 0 4rpx 16rpx var(--c-vip-border-tint, rgba(201, 163, 106, 0.35));
  animation: collect-pop var(--d-slower, 350ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes collect-pop {
  0% { transform: scale(1); }
  45% { transform: scale(1.22); }
  100% { transform: scale(1); }
}

.action-btn--super {
  width: 88rpx;
  height: 88rpx;
  background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
  box-shadow: var(--s-action-super);
}

.action-btn--like {
  width: 116rpx;
  height: 116rpx;
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  box-shadow: var(--s-action-like);
}

/* 按钮图标样式（替代 emoji，跨设备渲染一致） */
.action-btn__icon {
  width: 44rpx;
  height: 44rpx;
}

.action-btn--reject .action-btn__icon {
  width: 38rpx;
  height: 38rpx;
}

.action-btn--collect .action-btn__icon {
  width: 40rpx;
  height: 40rpx;
}

.action-btn--super .action-btn__icon {
  width: 38rpx;
  height: 38rpx;
}

.action-btn--like .action-btn__icon {
  width: 48rpx;
  height: 48rpx;
}
</style>
