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
// 悄悄话付费解锁（与 CardDetailOverlay 共用同一套交友币逻辑）
import { useCoinsStore, UNLOCK_COST_YUAN } from "../../stores/coins";
import { useVipStore } from "../../stores/vip";
// 2026-08-08 走查 P1：超级测试账号悄悄话免费旁路（会话 store 的 isSuperTestAccount getter）
import { useSessionStore } from "../../stores/session";
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

const coinsStore = useCoinsStore();
const vipStore = useVipStore();
const sessionStore = useSessionStore();

/** 超级测试账号（2026-08-08 走查 P1：悄悄话免费旁路） */
const isSuperTest = computed(() => sessionStore.isSuperTestAccount);

/** Emoji 替换 SVG 图标路径 */
const emojiIcons = {
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
  graduation: IMAGE_PATHS.ICONS_COMMON.GRADUATION_SVG,
  video: IMAGE_PATHS.ICONS_COMMON.CAMERA,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  chat: IMAGE_PATHS.ICONS_EMOJI.CHAT,
  group: IMAGE_PATHS.ICONS_EMOJI.GROUP,
  message: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
  lock: IMAGE_PATHS.ICONS_EMOJI.LOCK,
  ruler: IMAGE_PATHS.ICONS_EMOJI.RULER,
  briefcase: IMAGE_PATHS.ICONS_COMMON.BRIEFCASE_SVG,
  money: IMAGE_PATHS.ICONS_EMOJI.MONEY,
  ring: IMAGE_PATHS.ICONS_COMMON.RING_SVG,
} as const;

const props = defineProps<{
  /** 卡片数据列表 */
  cards: DiscoverCard[];
  /** 每日剩余次数 */
  remainingCount: number;
  /**
   * 蒙面匿名模式（设计改进方案 · 附近的人）：
   * 未解锁时头像模糊、昵称隐藏为 ????，卡片中上部展示解锁规则提示；
   * 其余信息（ID/认证/活跃/距离/基础资料/标签）照常展示。
   */
  masked?: boolean;
  /** [AUTOSHOT] 仅测试钩子：卡片就绪后自动打开详情弹层（一次），正常使用不传 */
  autoOpenDetail?: boolean;
  /** [AUTOSHOT] 仅测试钩子：透传给 CardDetailOverlay 的 initialAnchor */
  detailAnchor?: string;
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

/**
 * [AUTOSHOT] 仅测试钩子：autoOpenDetail 为 true 且首卡就绪时自动打开详情弹层（仅一次）。
 * 正常使用不传该 prop，此逻辑零影响。
 */
watch(
  () => [props.autoOpenDetail, props.cards[0]?.userId] as const,
  ([auto, firstCardId]) => {
    if (auto && firstCardId && !showDetail.value) {
      showDetail.value = true;
    }
  },
  { immediate: true }
);
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
 * 背景大图 custom-class（蒙面模式下叠加模糊样式）。
 * SafeImage 将 custom-class 透传到根 image 元素。
 */
const bgCustomClass = computed<string>(() =>
  props.masked ? "card__bg card__bg--masked" : "card__bg"
);

/** 蒙面模式下展示的昵称（隐藏真实昵称） */
const displayName = computed<string>(() =>
  props.masked ? "????" : (currentCard.value?.name ?? "")
);

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

/**
 * 年龄提取（2026-08-08 精简卡片）：优先后端真实 age 字段，
 * 缺失时回退 headline 正则（旧数据兼容）。
 */
const extractAge = (card?: DiscoverCard): string => {
  if (card?.age) return String(card.age);
  const headline = card?.headline;
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

/**
 * 学校/学历文案（昵称行）：优先校区名，其次 headline 拆分，再回退学历层级。
 * 精简卡片蒙层第一行展示（昵称 + 年龄 + 学校/学历）。
 */
const schoolLabel = computed(() => {
  const card = currentCard.value;
  if (!card) return "";
  if (card.campusName) return card.campusName;
  const fromHeadline = card.headline?.split("·")[0]?.trim();
  if (fromHeadline) return fromHeadline;
  return educationLabel.value;
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
    // 设计改进方案：弱化「离线」展示——不占用显眼位置，避免打击互动意愿
    if (raw === "offline") return "";
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

/* ========== 2026-08-08 走查 P0-2：卡片信息区块还原（基础资料/性格MBTI/期待画像/动态预览） ========== */

/** 自我描述展开阈值（超 30 字时展示「展开/收起」按钮） */
const BIO_CLAMP_CHARS = 30;

/** 身高文案（基础资料胶囊：172cm，空值隐藏） */
const heightText = computed(() => {
  const card = currentCard.value;
  return card?.height ? `${card.height}${t('cardDetail.heightUnit')}` : "";
});

/** 职业文案（基础资料胶囊） */
const occupationText = computed(() => currentCard.value?.occupation ?? "");

/** 月收入档位文案（基础资料胶囊） */
const incomeText = computed(() => currentCard.value?.incomeRange ?? "");

/**
 * 感情状态文案（基础资料胶囊）。
 * 枚举映射与 CardDetailOverlay 口径一致：never→未婚 / married_before→曾婚 / divorced→离异 / widowed→丧偶。
 */
const relationshipText = computed(() => {
  const card = currentCard.value;
  if (!card?.relationshipStatus) return "";
  const map: Record<string, string> = {
    never: t('discover.relationshipNever'),
    married_before: t('discover.relationshipMarriedBefore'),
    divorced: t('discover.relationshipDivorced'),
    widowed: t('discover.relationshipWidowed'),
  };
  return map[card.relationshipStatus] ?? card.relationshipStatus;
});

/** 性格标签（卡片仅展示前 3 个，避免信息过载） */
const personalityFirst3 = computed<string[]>(() => (currentCard.value?.personality ?? []).slice(0, 3));

/** 最新一条动态预览（卡片最底部「TA的动态」） */
const latestPost = computed(() => currentCard.value?.recentPosts?.[0] ?? null);

/** 自我描述展开态（3 行截断 → 展开全文） */
const bioExpanded = ref(false);

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

/* ========== 设计需求改版：身份头部区 / 基础资料区 / 标签两行 ==========
 * 2026-08-08 精简卡片：卡片仅保留「头像 + 右上双认证角标 + 蒙层 4 行
 * （昵称年龄学校学历 / 距离活跃匹配度 / 一行简介 / 3-4 兴趣标签）」，
 * 基础资料/性格 MBTI/期待画像/动态预览全部移入 CardDetailOverlay 详情页。 */

/** 认证详情弹窗显隐 */
const showCertDetail = ref(false);

/** 距离文案（「距离你12km」前缀格式，需求示例；同校时直接展示「同校」避免「距离你同校」） */
const identityDistance = computed(() => {
  if (currentCard.value?.isSameSchool) return t('discover.sameCampusDistance');
  const label = distanceLabel.value;
  if (!label) return "";
  return `${t('discover.distancePrefix')}${label}`;
});

/** 学历展示文案（与 CardDetailOverlay 对齐） */
const educationLabel = computed(() => {
  const level = currentCard.value?.educationLevel;
  if (!level) return "";
  const map: Record<string, string> = {
    high_school: t('discover.educationHighSchool'),
    bachelor: t('discover.educationBachelor'),
    master: t('discover.educationMaster'),
    phd: t('discover.educationPhd'),
  };
  return map[level] ?? "";
});

/**
 * 底部操作栏「悄悄话」：付费私信入口。
 * 优先级：后端已允许（allowMessage）、会员（membershipEnabled 门控）或超级测试账号 → 直接进入会话；
 * 其余 → 交友币扣费（UNLOCK_COST_YUAN.WHISPER）后进入会话。
 *
 * 2026-08-08 走查：悄悄话功能暂未开放（WHISPER_ENABLED=false 时按钮置灰，
 * 点击仅提示，不执行扣费/跳转；开放后置 true 即可恢复原逻辑）。
 */
const WHISPER_ENABLED = false;

function onWhisperTap(): void {
  const card = currentCard.value;
  if (!card || isFlyingOut.value) return;
  if (!WHISPER_ENABLED) {
    uni.showToast({ title: t("discover.whisperComingSoon"), icon: "none" });
    return;
  }
  if (card.allowMessage || (featureFlags.membershipEnabled && vipStore.isVip) || isSuperTest.value) {
    emit("message", card.userId);
    return;
  }
  uni.showModal({
    title: t("discover.whisperLabel"),
    content: t("discover.whisperPaidHint", { coins: UNLOCK_COST_YUAN.WHISPER }),
    confirmText: t("common.confirm"),
    cancelText: t("common.cancel"),
    success: async (res) => {
      if (!res.confirm || !currentCard.value) return;
      const target = currentCard.value;
      try {
        await coinsStore.spend("WHISPER", target.userId);
        uni.showToast({ title: t("discover.unlockSuccess"), icon: "success" });
        setTimeout(() => emit("message", target.userId), 500);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        uni.showModal({
          title: t("discover.unlockFailTitle"),
          content: message,
          confirmText: t("common.gotIt"),
          showCancel: false,
        });
      }
    },
  });
}

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

/** 2026-08-08 精简卡片：简介/期待画像改单行/移除，折叠交互随区块一并删除 */

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
defineExpose({ onTouchMove, onVideoBadgeTap });
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
          root-class="card__bg-wrap"
          custom-class="card__bg"
          mode="aspectFill"
          :lazy-load="true"
        />
        <view v-else class="card__bg card__bg--placeholder">
          <text class="card__placeholder-text">{{ (nextCard.name || '?')[0] }}</text>
        </view>
      </view>

      <!-- 当前卡片（可操作层） -->
      <view v-if="currentCard" class="card card--current" :style="currentCardStyle">
        <!-- Phase D2 · 4:5 大图区，照片墙 swiper 支持多图浏览 -->
        <!-- 单图场景直接渲染 SafeImage，避免内部 swiper 与卡片整体拖动产生手势冲突 -->
        <SafeImage
          v-if="currentDisplayImages.length === 1"
          :src="currentDisplayImages[0]"
          root-class="card__bg-wrap"
          :custom-class="bgCustomClass"
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
              root-class="card__bg-wrap"
              :custom-class="bgCustomClass"
              mode="aspectFill"
              :lazy-load="true"
            />
          </swiper-item>
        </swiper>

        <!-- 无图兜底（2026-08-07）：头像框 + 昵称首字/蒙面问号，替代纯渐变背景 -->
        <view v-else class="card__bg card__bg--placeholder">
          <view class="card__avatar-frame">
            <text class="card__placeholder-text">{{ masked ? '?' : (currentCard.name || '?')[0] }}</text>
          </view>
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

        <!-- 身份头部区（2026-08-08 精简卡片）：左上个人 ID 小字 + 右上双重认证角标（点击弹认证详情） -->
        <view class="card__identity">
          <text v-if="displayIdLabel" class="card__identity-id">{{ displayIdLabel }}</text>
          <view
            v-if="verificationLabel"
            class="card__identity-cert press-feedback"
            hover-class="card__identity-cert--pressed"
            hover-stay-time="120"
            @tap.stop="showCertDetail = true"
            role="button"
            :aria-label="t('discover.certDetailTitle')"
          >
            <text class="card__identity-cert-text">{{ verificationLabel }}</text>
            <text class="card__identity-cert-arrow">›</text>
          </view>
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

        <!-- 蒙面匿名解锁规则提示（设计改进方案：替代突兀的大号问号，明确解锁条件） -->
        <view v-if="masked" class="card__masked-hint">
          <image class="card__masked-hint-icon" :src="emojiIcons.lock" mode="aspectFit" alt="" />
          <text class="card__masked-hint-text">{{ t('discover.maskUnlockHint') }}</text>
        </view>

        <!-- 卡片内容（2026-08-08 走查 P0-2 还原：自上而下覆盖需求 13 项信息，决策信息一屏呈现） -->
        <view class="card__content">
          <!-- ① 昵称ID + 年龄 + 学校/学历（蒙面时昵称隐藏为 ????） -->
          <view class="card__name-row">
            <text class="card__name">{{ displayName }}</text>
            <text class="card__age">{{ extractAge(currentCard) }}{{ t('discover.ageUnit') }}</text>
            <text v-if="schoolLabel" class="card__school">{{ schoolLabel }}</text>
            <!-- Phase D3 · 集成 VerificationBadge（学校/邮箱/实名徽章） -->
            <VerificationBadge
              v-if="currentCard.verificationBadgeLevel"
              :level="(currentCard.verificationBadgeLevel as 'none' | 'school' | 'email' | 'idcard')"
              size="sm"
              :show-cta-when-none="false"
            />
          </view>

          <!-- ② 距离 · 活跃状态 · 匹配度（决策辅助） -->
          <view class="card__meta-row">
            <text v-if="identityDistance" class="card__meta">{{ identityDistance }}</text>
            <text v-if="activeStatusLabel" class="card__meta card__meta--active">
              {{ activeStatusLabel }}
            </text>
            <text class="card__meta card__meta--match">{{ matchScore }}{{ t('discover.matchSuffix') }}</text>
          </view>

          <!-- ③ 基础资料 4 项：身高 / 职业 / 月收入 / 感情状态（仅渲染非空） -->
          <view
            v-if="heightText || occupationText || incomeText || relationshipText"
            class="card__basics"
          >
            <view v-if="heightText" class="card__basics-item">
              <image class="card__basics-icon" :src="emojiIcons.ruler" mode="aspectFit" alt="" />
              <text>{{ heightText }}</text>
            </view>
            <view v-if="occupationText" class="card__basics-item">
              <image class="card__basics-icon" :src="emojiIcons.briefcase" mode="aspectFit" alt="" />
              <text>{{ occupationText }}</text>
            </view>
            <view v-if="incomeText" class="card__basics-item">
              <image class="card__basics-icon" :src="emojiIcons.money" mode="aspectFit" alt="" />
              <text>{{ incomeText }}</text>
            </view>
            <view v-if="relationshipText" class="card__basics-item">
              <image class="card__basics-icon" :src="emojiIcons.ring" mode="aspectFit" alt="" />
              <text>{{ relationshipText }}</text>
            </view>
          </view>

          <!-- ④ 自我描述：3 行截断 + 展开/收起（mp-weixin 不支持 -webkit-line-clamp，用 max-height 实现） -->
          <view class="card__bio-block">
            <text class="card__bio" :class="{ 'card__bio--clamped': !bioExpanded }">
              {{ currentCard.bio || t('discover.defaultBio') }}
            </text>
            <view
              v-if="(currentCard.bio?.length ?? 0) > BIO_CLAMP_CHARS"
              class="card__bio-footer"
            >
              <text class="card__bio-toggle press-feedback" @tap.stop="bioExpanded = !bioExpanded">
                {{ bioExpanded ? t('discover.collapseBio') : t('discover.expandBio') }}
              </text>
            </view>
          </view>

          <!-- ⑤ 喜好兴趣标签（3-4 个核心标签，统一浅底色胶囊） -->
          <view v-if="currentCard.tags && currentCard.tags.length > 0" class="card__tags">
            <text
              v-for="(tag, idx) in currentCard.tags.slice(0, 4)" :key="idx"
              class="tag-pill"
            >{{ tag }}</text>
          </view>

          <!-- ⑥ 性格标签 + MBTI 人格类型 -->
          <view
            v-if="currentCard.mbti || personalityFirst3.length > 0"
            class="card__personality"
          >
            <text v-if="currentCard.mbti" class="card__mbti-badge">{{ currentCard.mbti }}</text>
            <text
              v-for="(pt, idx) in personalityFirst3" :key="idx"
              class="tag-pill tag-pill--soft"
            >{{ pt }}</text>
          </view>

          <!-- ⑦ 期待的人物画像（小标题 + 2 行截断） -->
          <view v-if="currentCard.expectedPartner" class="card__expect">
            <text class="card__expect-title">{{ t('discover.myExpectedPartner') }}</text>
            <text class="card__expect-text">{{ currentCard.expectedPartner }}</text>
          </view>

          <!-- ⑧ 动态预览：最新 1 条（缩略图 + 文案 + 点赞/评论数），点击进入详情页动态分区 -->
          <view
            v-if="latestPost"
            class="card__post-preview press-feedback"
            hover-class="card__post-preview--pressed"
            hover-stay-time="120"
            @tap.stop="showDetail = true"
            role="button"
            :aria-label="t('discover.latestPostSection')"
          >
            <view class="card__post-preview-main">
              <text class="card__post-preview-title">{{ t('discover.latestPostSection') }}</text>
              <text class="card__post-preview-content">{{ latestPost.content }}</text>
              <view class="card__post-preview-stats">
                <view class="card__post-preview-stat">
                  <image class="card__post-preview-stat-icon" :src="emojiIcons.heart" mode="aspectFit" alt="" />
                  <text>{{ latestPost.likes }}</text>
                </view>
                <view class="card__post-preview-stat">
                  <image class="card__post-preview-stat-icon" :src="emojiIcons.chat" mode="aspectFit" alt="" />
                  <text>{{ latestPost.comments }}</text>
                </view>
              </view>
            </view>
            <SafeImage
              v-if="latestPost.images && latestPost.images.length > 0"
              :src="latestPost.images[0]"
              custom-class="card__post-thumb"
              mode="aspectFill"
            />
          </view>
        </view>
      </view>
    </view>

    <!-- 卡片详情弹出层 -->
    <!-- [AUTOSHOT] detail-anchor 透传给详情弹层（测试钩子，正常使用为空） -->
    <CardDetailOverlay
      :visible="showDetail"
      :card="currentCard"
      :initial-anchor="detailAnchor"
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

    <!-- 底部固定操作栏（参考 QQ 主页改版）：X(关闭) | 小纸条(胶囊) | ❤️(喜欢) 居中排列 -->
    <!-- catchtap 阻止冒泡避免被卡片手势拦截 -->
    <view v-if="currentCard" class="action-bar">
      <!-- 左侧：X 关闭/不喜欢（小灰圆按钮） -->
      <view
        class="action-btn action-btn--reject press-feedback"
        hover-class="action-btn--pressed"
        hover-stay-time="120"
        @tap.stop="onReject"
        role="button"
        :aria-label="t('discover.skip')"
      >
        <image class="action-btn__reject-icon" :src="IMAGE_PATHS.ICONS_COMMON.CLOSE_SVG" mode="aspectFit" alt="" />
      </view>
      <!-- 中间：小纸条胶囊按钮（最大，品牌色渐变；2026-08-08 暂未开放，置灰） -->
      <view
        class="action-btn action-btn--whisper action-btn--whisper--disabled press-feedback"
        hover-class="action-btn--pressed"
        hover-stay-time="120"
        @tap.stop="onWhisperTap"
        role="button"
        :aria-label="t('discover.whisperLabel')"
      >
        <image class="action-btn__whisper-icon" :src="emojiIcons.message" mode="aspectFit" alt="" />
        <text class="action-btn__whisper-label">{{ t('discover.whisperLabel') }}</text>
      </view>
      <!-- 右侧：❤️ 喜欢（粉色心形按钮） -->
      <view
        class="action-btn action-btn--like press-feedback"
        hover-class="action-btn--pressed"
        hover-stay-time="120"
        @tap.stop="onLike"
        role="button"
        :aria-label="t('discover.like')"
      >
        <image class="action-btn__like-icon" :src="IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED" mode="aspectFit" alt="" />
      </view>
    </view>

    <!-- 认证详情弹窗（设计需求）：点击双重认证标识弹出，展示机器/人工认证的方式与可信度 -->
    <view v-if="showCertDetail" class="cert-modal" @tap.stop="showCertDetail = false">
      <view class="cert-modal__panel" @tap.stop>
        <text class="cert-modal__title">{{ t('discover.certDetailTitle') }}</text>
        <view class="cert-modal__item">
          <view class="cert-modal__item-head">
            <text class="cert-modal__item-name">{{ t('discover.machineVerified') }}</text>
            <text class="cert-modal__item-badge">
              {{ t('discover.certReliabilityLabel') }}：{{ t('discover.certMachineReliability') }}
            </text>
          </view>
          <text class="cert-modal__item-desc">{{ t('discover.certMachineDesc') }}</text>
          <text class="cert-modal__item-method">{{ t('discover.certMethodLabel') }}：{{ t('discover.certMachineMethod') }}</text>
        </view>
        <view class="cert-modal__item">
          <view class="cert-modal__item-head">
            <text class="cert-modal__item-name">{{ t('discover.humanVerified') }}</text>
            <text class="cert-modal__item-badge">
              {{ t('discover.certReliabilityLabel') }}：{{ t('discover.certHumanReliability') }}
            </text>
          </view>
          <text class="cert-modal__item-desc">{{ t('discover.certHumanDesc') }}</text>
          <text class="cert-modal__item-method">{{ t('discover.certMethodLabel') }}：{{ t('discover.certHumanMethod') }}</text>
        </view>
        <view class="cert-modal__close" role="button" :aria-label="t('common.close')" @tap.stop="showCertDetail = false">
          <text class="cert-modal__close-text">{{ t('common.gotIt') }}</text>
        </view>
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
  /* mp-weixin 修复（2026-08-08）：.card-swiper 是 .card-area（flex column）的直接子项，
   * 用 flex:1 撑满父容器，避免 height:100% 在 mp-weixin WebView 中对 flex item
   * 父级高度解析不稳定 → 高度链断裂 → .card-stack 高度为 0 → 卡片被裁切不可见 */
  // #ifndef H5
  flex: 1;
  /* 2026-08-08 P0 兜底：微信自定义组件宿主节点（<card-swiper> 标签）是 .card-area
   * 的 flex 子项，但默认 flex:0 1 auto 高度仅由内容决定（空内容时塌缩为 ~16px）。
   * 即便外部 host-class 的 flex:1 因样式隔离/编译差异未生效，组件根节点也自带
   * 最小高度 860rpx（与 .card-area 同策略），宿主节点随内容自然撑开，
   * 内部 .card-stack flex:1 → .card absolute 四边拉伸的高度链即可恢复。 */
  min-height: 860rpx;
  // #endif
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

/* mp-weixin 修复（2026-08-08，P0）：小程序端全局样式强制 view,text,image{box-sizing:border-box}，
 * 而 padding-top:125% 撑高 + max-height + min-height 组合在 border-box 下存在冲突：
 * - max-height 约束 border-box 总高度，但 padding-top 固定占位不可压缩；
 * - 当 max-height < padding-top 撑出的高度时，卡片被压缩，绝对定位内容
 *   （.card__content bottom:0 / .card__overlay 等）定位到 padding box 底部
 *   被 overflow:hidden 裁切，表现为「卡片无法正常显示 / 内容被截断」。
 * 修复：小程序端弃用 padding-top 撑高，改用 top/left/right/bottom 四边拉伸，
 * 卡片高度直接由 .card-stack 决定（与 .card__bg-wrap 同一策略，不依赖百分比高度）。
 * H5 端保持原有 4:5 比例布局不变。 */
/* #ifndef H5 */
.card {
  top: 16rpx;
  left: 24rpx;
  right: 24rpx;
  bottom: 16rpx;
  width: auto;
  padding-top: 0;
  max-height: none;
  min-height: 0;
}
/* #endif */

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
/* :deep() 必需：custom-class 落在 SafeImage 内部 <image>（H5 为 <uni-image> 包装元素）上，
 * scoped 属性选择器不落子组件内部元素。⚠️ 2026-08-08 运行时验证：
 * 卡片用 padding-top:125% 撑高，height:100% 百分比在部分环境下解析为 0 →
 * 必须用 top/right/bottom/left 四边拉伸（inset 模式），不依赖百分比高度 */
:deep(.card__bg-wrap) {
  /* 2026-08-08 走查 P0-1：SafeImage 根容器默认无尺寸（height:0），
   * 必须拉伸容器，内层 .card__bg 才能铺满卡片 */
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: auto;
  height: auto;
}

:deep(.card__bg) {
  /* !important：SafeImage 自带 .safe-image__img{width/height:100%} 与拉伸模式冲突，
   * 若其胜出则 height:100% 在 padding-top 撑高的卡片内解析为 0 → 大图空白 */
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  width: auto !important;
  height: auto !important;
  object-fit: cover;
  filter: brightness(1.05) saturate(1.1);
}

.card__bg--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 50%, var(--c-brand-400) 100%);
}

/* 蒙面匿名模式（设计改进方案）：头像模糊处理，隐藏身份细节 */
:deep(.card__bg--masked) {
  filter: blur(28rpx) brightness(0.72);
  transform: scale(1.08);
}

/* 蒙面解锁规则提示条（替代突兀的大号问号，明确解锁条件） */
.card__masked-hint {
  position: absolute;
  top: 216rpx;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 12rpx 28rpx;
  border-radius: var(--r-full);
  background: var(--c-overlay-mid, rgba(15, 23, 42, 0.55));
  border: 1rpx solid var(--c-overlay-border-mid, rgba(255, 255, 255, 0.25));
  /* #ifdef H5 */
  backdrop-filter: blur(12rpx);
  /* #endif */
}

.card__masked-hint-icon {
  width: 32rpx;
  height: 32rpx;
}

.card__masked-hint-text {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-overlay-text-primary, rgba(255, 255, 255, 0.95));
}

/* 身份头部区小头像同样模糊（蒙面时） */
:deep(.card__identity-avatar-img--masked) {
  filter: blur(10rpx);
}

/* 2026-08-07：无头像用户显示头像框（白圈 + 渐变底 + 昵称首字） */
.card__avatar-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 260rpx;
  height: 260rpx;
  border-radius: 50%;
  background: linear-gradient(160deg, var(--c-brand-100) 0%, var(--c-brand-300) 100%);
  border: 10rpx solid var(--c-overlay-bg-pure, rgba(255, 255, 255, 0.95));
  box-shadow: var(--s-lg, 0 8rpx 32rpx rgba(15, 23, 42, 0.08));
}

.card__placeholder-text {
  font-size: var(--fs-display);
  font-weight: 700;
  color: var(--c-brand-700);
}

/* ========== Phase D2 · 照片墙 swiper 大图区（4:5 比例） ========== */
/* 同 .card__bg：padding-top 撑高的卡片内 height:100% 可能解析为 0，改用四边拉伸 */
.card__gallery {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: auto;
  height: auto;
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
  /* 2026-08-08 走查 P0-2：信息区块增多，收紧内边距与行距保证一屏容纳 */
  padding: 24rpx 36rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
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

/* ========== 身份头部区（2026-08-08 精简卡片：左上 ID + 右上双重认证角标） ========== */
.card__identity {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  z-index: 4;
  /* 两端渐变仅压暗顶部两角，保证 ID/认证角标可读，不遮挡中部头像 */
  background: linear-gradient(to bottom, var(--c-overlay-mid-strong, rgba(15, 23, 42, 0.5)) 0%, var(--c-black-overlay-light, rgba(0, 0, 0, 0.16)) 55%, transparent 100%);
}

.card__identity-id {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-overlay-text-primary, rgba(255, 255, 255, 0.95));
  text-shadow: 0 1rpx 6rpx var(--c-text-shadow-overlay, rgba(0, 0, 0, 0.3));
}

.card__identity-cert {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 14rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%);
  box-shadow: 0 2rpx 10rpx var(--c-black-shadow-xl, rgba(0, 0, 0, 0.24));
}

.card__identity-cert--pressed {
  opacity: 0.85;
}

.card__identity-cert-text {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-overlay-text-primary, rgba(255, 255, 255, 0.95));
}

.card__identity-cert-arrow {
  font-size: var(--fs-sm);
  color: var(--c-overlay-text-primary, rgba(255, 255, 255, 0.95));
}

/* ========== 精简卡片蒙层 4 行（2026-08-08：昵称年龄学校学历 / 距离活跃匹配度 / 一行简介 / 兴趣标签） ========== */
/* 行 1：昵称 + 年龄 + 学校/学历（学校为浅色半透明胶囊，防长校名溢出） */
.card__school {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 600;
  color: var(--c-overlay-text-primary);
  background: var(--c-overlay-border-light, rgba(255, 255, 255, 0.18));
  border: 1rpx solid var(--c-overlay-border-mid, rgba(255, 255, 255, 0.25));
  padding: 6rpx 16rpx;
  border-radius: var(--r-full);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 320rpx;
}

/* 行 2：距离 · 活跃状态 · 匹配度（决策辅助，弱化视觉强调） */
.card__meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx 20rpx;
  margin-top: 2rpx;
}

.card__meta {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-overlay-text-primary);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.card__meta--active::before {
  content: "";
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: var(--c-overlay-online-bg, rgba(16, 185, 129, 0.95));
  display: inline-block;
}

.card__meta--match {
  color: var(--c-brand-300, #86efac);
  font-weight: 700;
}

/* 行 3：一行自我简介（单行省略，完整展示在详情页） */
/* ④ 自我描述：3 行截断 + 展开/收起（2026-08-08 走查 P0-2） */
.card__bio-block {
  display: flex;
  flex-direction: column;
}

.card__bio {
  font-size: var(--fs-md);
  color: var(--c-overlay-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-shadow: var(--c-card-bio-shadow);
  word-break: break-all;
}

/* mp-weixin 的 text 不支持 -webkit-line-clamp，用 max-height（3 行 × 1.4）实现截断 */
.card__bio--clamped {
  max-height: 4.2em;
}

.card__bio-footer {
  display: flex;
  align-items: center;
  margin-top: -2rpx;
}

.card__bio-toggle {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  color: var(--c-brand-300);
  padding: 2rpx 6rpx;
}

/* ③ 基础资料 4 项胶囊（身高/职业/月收入/感情状态） */
.card__basics {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.card__basics-item {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 14rpx;
  border-radius: var(--r-full);
  background: var(--c-overlay-bg-solid, rgba(255, 255, 255, 0.9));
  color: var(--c-neutral-700, #334155);
  font-size: var(--fs-xs, 20rpx);
  font-weight: 600;
}

.card__basics-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

/* ⑥ 性格标签 + MBTI 徽标 */
.card__personality {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.card__mbti-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 76rpx;
  padding: 4rpx 16rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-brand-500, #3fcf8e), var(--c-brand-300, #7be0b4));
  color: var(--c-overlay-text-primary, rgba(255, 255, 255, 0.95));
  font-size: var(--fs-base);
  font-weight: 700;
  letter-spacing: 1rpx;
}

/* 性格胶囊弱化底色（区别于喜好兴趣标签） */
.tag-pill--soft {
  background: var(--c-overlay-white-text-mid, rgba(255, 255, 255, 0.7));
  border-color: var(--c-overlay-border-stronger, rgba(255, 255, 255, 0.4));
}

/* ⑦ 期待的人物画像（小标题 + 2 行截断） */
.card__expect {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.card__expect-title {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  color: var(--c-overlay-text-primary);
  letter-spacing: 1rpx;
}

.card__expect-text {
  font-size: var(--fs-sm);
  color: var(--c-overlay-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  max-height: 2.8em; /* 2 行 × 1.4 */
  word-break: break-all;
}

/* ⑧ 动态预览卡（半透明底 + 圆角，样式参考贴吧帖子摘要） */
.card__post-preview {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 10rpx 14rpx;
  border-radius: var(--r-md, 12rpx);
  background: var(--c-overlay-white-bg-tint-strong, rgba(255, 255, 255, 0.12));
  border: 1rpx solid var(--c-overlay-border-light, rgba(255, 255, 255, 0.18));
}

.card__post-preview--pressed {
  background: var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.25));
}

.card__post-preview-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.card__post-preview-title {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  color: var(--c-overlay-text-primary);
}

.card__post-preview-content {
  font-size: var(--fs-sm);
  color: var(--c-overlay-text-secondary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card__post-preview-stats {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.card__post-preview-stat {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-overlay-text-secondary);
}

.card__post-preview-stat-icon {
  width: 20rpx;
  height: 20rpx;
}

/* 动态缩略图（SafeImage 内部元素，需 :deep() 穿透） */
:deep(.card__post-thumb) {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-md, 12rpx);
  flex-shrink: 0;
  object-fit: cover;
}

/* ⑤ 兴趣标签（统一浅底色胶囊 + 深色文字，视觉规整） */
.card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 4rpx;
}

.tag-pill {
  display: inline-flex;
  padding: 8rpx 22rpx;
  border-radius: var(--r-full);
  background: var(--c-overlay-bg-pure, rgba(255, 255, 255, 0.95));
  color: var(--c-neutral-700, #334155);
  font-size: var(--fs-base);
  font-weight: 600;
  border: 1rpx solid var(--c-overlay-bg-strong, rgba(255, 255, 255, 0.6));
}

/* ========== 底部固定操作栏（参考 QQ 主页改版：X | 小纸条胶囊 | ❤️ 居中） ========== */
.action-bar {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32rpx;
  padding: 16rpx 28rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 16rpx);
  border-radius: var(--r-xxl, 28rpx);
  background: var(--c-black-overlay-mid, rgba(0, 0, 0, 0.35));
  border: 1rpx solid var(--c-overlay-border-mid, rgba(255, 255, 255, 0.15));
  box-shadow: var(--s-card-soft);
  z-index: 6;
  /* H5 端毛玻璃增强；mp-weixin 不支持 backdrop-filter，高不透明度背景降级 */
  // #ifdef H5
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  // #endif
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-normal, 200ms) cubic-bezier(0.34, 1.56, 0.64, 1), filter var(--d-normal, 200ms) ease;
}

/* 通用按压态（替代 :active，兼容 mp-weixin） */
.action-btn--pressed {
  transform: scale(0.88);
  filter: brightness(0.92);
}

/* 左侧 X 关闭/不喜欢：小灰圆按钮（48rpx） */
.action-btn--reject {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-container);
  box-shadow: 0 4rpx 16rpx var(--c-black-shadow-md, rgba(0, 0, 0, 0.1));
  border: 2rpx solid var(--c-neutral-200);
}

.action-btn--reject.action-btn--pressed {
  box-shadow: 0 2rpx 8rpx var(--c-black-shadow-sm, rgba(0, 0, 0, 0.08));
}

.action-btn__reject-icon {
  width: 36rpx;
  height: 36rpx;
}

/* 中间小纸条：胶囊形大按钮（最大，品牌色渐变） */
.action-btn--whisper {
  height: 88rpx;
  padding: 0 56rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-brand-400, #2dd4bf) 0%, var(--c-brand-500, #3fcf8e) 100%);
  box-shadow: var(--s-brand-lg, 0 8rpx 24rpx rgba(63, 207, 142, 0.3));
  border: 3rpx solid var(--c-overlay-white-text-strong, rgba(255, 255, 255, 0.8));
  gap: 10rpx;
}

/* 2026-08-08 走查：悄悄话暂未开放 → 按钮置灰（WHISPER_ENABLED=false） */
.action-btn--whisper--disabled {
  opacity: 0.55;
  filter: saturate(0.6);
}

.action-btn__whisper-icon {
  width: 40rpx;
  height: 40rpx;
  filter: brightness(0) invert(1);
}

.action-btn__whisper-label {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-overlay-text-primary, rgba(255, 255, 255, 0.95));
  line-height: 1;
}

/* 右侧 ❤️ 喜欢：粉色心形圆按钮（88rpx） */
.action-btn--like {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-circle, 50%);
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  box-shadow: var(--s-romance-md, 0 4rpx 16rpx rgba(236, 72, 153, 0.3));
}

.action-btn__like-icon {
  width: 44rpx;
  height: 44rpx;
}

/* ========== 认证详情弹窗（设计需求） ========== */
.cert-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-overlay-mid, rgba(15, 23, 42, 0.55));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
  padding: 40rpx;
}

.cert-modal__panel {
  width: 100%;
  max-width: 640rpx;
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--r-2xl, 32rpx);
  padding: 36rpx 32rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.cert-modal__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
}

.cert-modal__item {
  background: var(--c-bg-container, #f8fafc);
  border: 1rpx solid var(--c-overlay-border-light, #e2e8f0);
  border-radius: var(--r-lg, 16rpx);
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.cert-modal__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.cert-modal__item-name {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-primary);
}

.cert-modal__item-badge {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-brand-600, #0d9488);
  background: var(--c-brand-50, #f0fdf9);
  padding: 4rpx 12rpx;
  border-radius: var(--r-full);
}

.cert-modal__item-desc {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  line-height: 1.6;
}

.cert-modal__item-method {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.cert-modal__close {
  margin-top: 8rpx;
  align-self: center;
  min-width: 320rpx;
  text-align: center;
  padding: 16rpx 0;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
}

.cert-modal__close-text {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-overlay-text-primary, rgba(255, 255, 255, 0.95));
}
</style>
