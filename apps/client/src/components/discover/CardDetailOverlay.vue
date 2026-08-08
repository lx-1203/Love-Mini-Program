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
import { useCoinsStore, UNLOCK_COST_YUAN } from "../../stores/coins";
import { useVipStore } from "../../stores/vip";
import { useSessionStore } from "../../stores/session";
import { useReportStore } from "../../stores/report";
// 2026-08-08 走查 P1：VIP 免费放行点统一受 membershipEnabled 门控
import { featureFlags } from "../../config/feature-flags";
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
  /** [AUTOSHOT] 仅测试钩子：打开后自动滚动到指定面板（如 panel-quick），正常使用不传 */
  initialAnchor?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "like", cardId: string): void;
  (e: "superLike", cardId: string): void;
  (e: "pass", cardId: string): void;
  (e: "message", userId: string): void;
}>();

const { t } = useI18n();

/** 交友币 Store（解锁私信扣费） */
const coinsStore = useCoinsStore();
/** VIP Store（会员解锁私信放行） */
const vipStore = useVipStore();
/** 举报 Store（更多操作 · 举报用户） */
const reportStore = useReportStore();
/** 会话 Store（超级测试账号旁路） */
const sessionStore = useSessionStore();

/** 超级测试账号（2026-08-08 走查 P1：悄悄话/私信免费旁路） */
const isSuperTest = computed(() => sessionStore.isSuperTestAccount);

/** 入场动画状态 */
const animating = ref(false);
/** 当前图片索引 */
const currentImageIndex = ref(0);
/** 个人简介是否展开（2026-08-08：默认收起，超长文点击「展开」） */
const isBioExpanded = ref(false);

/** 简介「展开」按钮阈值（2026-08-08：超过约 5 行 ≈ 100 字才显示展开交互） */
const BIO_TOGGLE_THRESHOLD = 100;

/** 简介是否需要「展开」按钮（短文完整展示、无多余交互） */
const bioNeedsToggle = computed(() => (props.card?.bio?.length ?? 0) > BIO_TOGGLE_THRESHOLD);

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
  heartOutline: IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE,
  ruler: IMAGE_PATHS.ICONS_EMOJI.RULER,
  money: IMAGE_PATHS.ICONS_EMOJI.MONEY,
  clipboard: IMAGE_PATHS.ICONS_EMOJI.CLIPBOARD,
  chat: IMAGE_PATHS.ICONS_EMOJI.CHAT,
  mail: IMAGE_PATHS.ICONS_EMOJI.MAIL,
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

/**
 * 性格标签（2026-08-08 分区修正：只用 personality 字段，不再误用兴趣 tags）。
 * 缺失时使用 i18n 默认标签兜底（保持版面）。
 */
const personalityTags = computed(() => {
  const tags = props.card?.personality ?? [];
  if (tags.length > 0) return tags.slice(0, 6);
  return t("cardDetail.personalityTags")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
});

/**
 * 兴趣爱好标签（2026-08-08 新增分区：与「性格与MBTI」分离展示）。
 * 取自 card.tags，统一浅底色胶囊，无则隐藏分区。
 */
const interestTags = computed(() => props.card?.tags ?? []);

/** 性格与 MBTI 分区文案（如 "INFJ · 阳光开朗"），缺失时隐藏 */
const personalityMbtiText = computed(() => {
  const parts: string[] = [];
  if (props.card?.mbti) parts.push(props.card.mbti);
  const first = props.card?.personality?.[0];
  if (first) parts.push(first);
  return parts.join(" · ");
});

/** 兴趣圈（优先从卡片 tags 派生，否则使用模拟数据） */
const interestCircles = computed(() => {
  const tags = props.card?.tags ?? [];
  // infra R2-00100: 以下 4 个预设圈子为模拟数据（卡片无 tags 时的兜底展示），
  // real 推荐内容应由后端下发，接入后替换 preset 数组
  // 2026-08-08 验收修复：移除未消费的 gradient 字段（模板统一白底，杜绝多色杂乱）
  const preset = [
    { name: "读书会", icon: IMAGE_PATHS.ICONS_EMOJI.BOOK, members: 128 },
    { name: "摄影社", icon: IMAGE_PATHS.ICONS_EMOJI.CAMERA_ICON, members: 89 },
    { name: "美食探店", icon: IMAGE_PATHS.ICONS_EMOJI.FOOD, members: 256 },
    { name: "徒步旅行", icon: IMAGE_PATHS.ICONS_COMMON.HIKING_SVG, members: 76 },
  ];
  if (tags.length > 0) {
    // 修复（严格模式 noUncheckedIndexedAccess）：preset[idx % preset.length] 索引访问返回类型含 undefined，
    // 此处通过局部变量 + 兜底默认值，确保 icon 始终为 string。
    return tags.slice(0, 4).map((tag, idx) => {
      const presetItem = preset[idx % preset.length];
      return {
        name: tag,
        icon: presetItem?.icon ?? IMAGE_PATHS.ICONS_EMOJI.CHAT,
        members: 60 + ((props.card?.userId?.charCodeAt(0) ?? 0) + idx * 31) % 240,
      };
    });
  }
  return preset;
});

/** 月收入档位（2026-08-08 后端真实字段，缺失时展示占位符） */
const incomeLabel = computed(() => props.card?.incomeRange || "--");

/** 职业（2026-08-08 验收修复：快速资料卡第四格，缺失时展示占位符） */
const occupationText = computed(() => props.card?.occupation || "--");

/** 年龄（2026-08-08 优先后端真实 age 字段，缺失时回退 headline 正则） */
const ageText = computed(() => {
  const card = props.card;
  if (card?.age) return String(card.age);
  const h = card?.headline ?? "";
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

/* ========== Phase Feedback1：详情页改版新增展示 ========== */

/** 认证文案（机器+人工双重认证） */
const detailVerificationLabel = computed(() => {
  const card = props.card;
  if (!card) return "";
  if (card.machineVerified && card.humanVerified) return t("discover.doubleVerified");
  if (card.machineVerified) return t("discover.machineVerified");
  if (card.humanVerified) return t("discover.humanVerified");
  return "";
});

/** 个人 ID 展示文案 */
const detailDisplayIdLabel = computed(() => {
  const card = props.card;
  if (!card?.displayId) return "";
  return t("discover.personalId", { id: card.displayId });
});

/** 距离文案 */
const detailDistanceLabel = computed(() => {
  const card = props.card;
  if (!card) return "";
  if (card.isSameSchool) return t("discover.sameCampusDistance");
  const raw = card.distanceText;
  if (!raw) return card.availability || "";
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}${t("discover.distanceSuffix")}`;
  return raw;
});

/** 活跃状态文案 */
const detailActiveLabel = computed(() => {
  const card = props.card;
  if (!card) return "";
  const raw = card.activeStatusText;
  if (raw) {
    if (raw === "just_now") return t("discover.activeJustNow");
    if (raw === "today") return t("discover.activeToday");
    if (raw === "offline") return t("discover.offline");
    const hoursMatch = raw.match(/^hours_(\d+)$/);
    if (hoursMatch?.[1]) return t("discover.activeHoursAgo", { n: hoursMatch[1] });
    const daysMatch = raw.match(/^days_(\d+)$/);
    if (daysMatch?.[1]) return t("discover.activeDaysAgo", { n: daysMatch[1] });
    return raw;
  }
  if (card.onlineStatus === "online") return t("discover.activeJustNow");
  if (card.onlineStatus === "away") return t("discover.activeToday");
  return "";
});

/**
 * 基础资料字段（关于我分区，2 行 4 列网格）：
 * 身高 / 职业 / 月收入 / 感情状态 / 籍贯 / 所在城市 / 星座 / 学历。
 * 数据缺失的项自动隐藏（籍贯/所在城市由 ipLocation "省 · 市" 拆分派生）。
 */
const basicInfoItems = computed(() => {
  const card = props.card;
  if (!card) return [];
  const items: Array<{ label: string; value: string }> = [];
  if (card.height) items.push({ label: t("cardDetail.heightLabel"), value: `${card.height}${t("cardDetail.heightUnit")}` });
  if (card.occupation) items.push({ label: t("cardDetail.occupationLabel"), value: card.occupation });
  items.push({ label: t("cardDetail.incomeLabel"), value: incomeLabel.value });
  if (card.relationshipStatus) {
    const map: Record<string, string> = {
      never: t("discover.relationshipNever"),
      married_before: t("discover.relationshipMarriedBefore"),
      divorced: t("discover.relationshipDivorced"),
      widowed: t("discover.relationshipWidowed"),
    };
    items.push({ label: t("discover.maritalLabel"), value: map[card.relationshipStatus] ?? card.relationshipStatus });
  }
  // 籍贯/所在城市：由 ipLocation（"省 · 市"）拆分派生，与后端 deriveIpLocation 口径一致
  const locationParts = (card.ipLocation ?? "").split("·").map((s) => s.trim()).filter(Boolean);
  if (locationParts[0]) items.push({ label: t("cardDetail.hometownProvinceLabel"), value: locationParts[0] });
  if (locationParts[1]) items.push({ label: t("cardDetail.hometownCityLabel"), value: locationParts[1] });
  if (card.zodiac) items.push({ label: t("cardDetail.zodiacLabel"), value: card.zodiac });
  items.push({ label: t("cardDetail.educationLabel"), value: eduLabel(card.educationLevel) });
  return items;
});

/** 动态列表（recentPosts 字段，无则空数组）——组件内副本，避免直接 mutate props */
const momentPosts = ref<NonNullable<DiscoverCard["recentPosts"]>>([]);

// 同步 props.card.recentPosts 到组件内副本（每次卡片变化时重置，避免点赞状态残留）
watch(
  () => props.card?.recentPosts,
  (posts) => {
    momentPosts.value = posts ? posts.map((p) => ({ ...p, images: [...(p.images ?? [])] })) : [];
  },
  { immediate: true }
);

/** 悄悄话内容（whisper 字段） */
const whisperText = computed(() => props.card?.whisper ?? "");

/** 是否已发送悄悄话 */
const whisperAlreadySent = computed(() => props.card?.whisperSent ?? false);

/** 期待的人物画像（expectedPartner 字段） */
const expectedPartnerText = computed(() => props.card?.expectedPartner ?? "");

/** IP 属地（Phase 4.1 验收新增） */
const ipLocationText = computed(() => props.card?.ipLocation ?? "");

/** 点击动态点赞（组件内状态翻转，不落库、不 mutate props） */
function toggleMomentLike(postId: string): void {
  const posts = momentPosts.value;
  if (!posts) return;
  const post = posts.find((p) => p.id === postId);
  if (!post) return;
  post.isLiked = !post.isLiked;
  post.likes += post.isLiked ? 1 : -1;
}

/** 点击动态评论（展开评论输入条，Phase 4.1 验收：真实评论交互） */
const commentTargetId = ref<string | null>(null);
const commentDraft = ref("");

function onMomentComment(postId: string): void {
  lightHaptic();
  commentTargetId.value = commentTargetId.value === postId ? null : postId;
  commentDraft.value = "";
}

/** 提交评论：计数 +1 并收起输入条（mock 语义，真实环境走评论 API） */
function submitComment(postId: string): void {
  const text = commentDraft.value.trim();
  if (!text) {
    uni.showToast({ title: t("discover.momentCommentEmpty"), icon: "none" });
    return;
  }
  const post = momentPosts.value.find((p) => p.id === postId);
  if (!post) return;
  post.comments += 1;
  commentDraft.value = "";
  commentTargetId.value = null;
  successHaptic();
  uni.showToast({ title: t("discover.momentCommentSent"), icon: "none" });
}

/** 私信是否已解锁（本次会话内解锁后免重复扣费） */
const privateMsgUnlocked = ref(false);

/**
 * 解锁私信并进入会话（会员放行 / 交友币扣费）。
 *
 * 优先级：
 * 1. 后端已允许（card.allowMessage=true）→ 直接进入
 * 2. VIP 会员（membershipEnabled 门控）→ 放行
 * 3. 超级测试账号 → 放行（2026-08-08 走查 P1：本地联调账号全功能）
 * 4. 其余 → 交友币扣费（UNLOCK_COST_YUAN.MESSAGE），成功后进入；余额不足提示充值
 */
function handleMessage(): void {
  const card = props.card;
  if (!card) return;

  // 后端允许、会员（门控）或超级测试账号 → 直接进入会话
  if (card.allowMessage || (featureFlags.membershipEnabled && vipStore.isVip) || isSuperTest.value) {
    emitMessage();
    return;
  }
  // 本次会话已解锁 → 直接进入
  if (privateMsgUnlocked.value) {
    emitMessage();
    return;
  }

  uni.showModal({
    title: t("discover.unlockMessage"),
    content: t("discover.privateMsgPaidHint", { coins: UNLOCK_COST_YUAN.MESSAGE }),
    confirmText: t("discover.unlockAndChat"),
    cancelText: t("common.cancel"),
    success: async (res) => {
      if (!res.confirm) return;
      const target = props.card;
      if (!target) return;
      try {
        await coinsStore.spend("MESSAGE", target.userId);
        privateMsgUnlocked.value = true;
        successHaptic();
        uni.showToast({ title: t("discover.unlockSuccess"), icon: "success" });
        setTimeout(() => emitMessage(), 500);
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

/** 点击动态私信（与主发消息同一解锁流程） */
function onMomentPrivateMsg(): void {
  if (!props.card) return;
  handleMessage();
}

/** 点击悄悄话（会员/交友币解锁发送；会员未启用时仅交友币路径） */
function onWhisperTap(): void {
  if (whisperAlreadySent.value) {
    uni.showToast({ title: t("discover.whisperSent"), icon: "none" });
    return;
  }
  // 2026-08-08 走查 P1：VIP 免费放行受 membershipEnabled 门控；超级测试账号直通
  if (featureFlags.membershipEnabled && vipStore.isVip) {
    uni.showToast({ title: t("discover.whisperUnlockByVip"), icon: "none" });
    return;
  }
  if (isSuperTest.value) {
    emitMessage();
    return;
  }
  // 交友币解锁：弹确认后扣费（演示流；完整悄悄话编辑页由后续版本补齐）
  uni.showModal({
    title: t("discover.whisperLabel"),
    content: t("discover.whisperPaidHint", { coins: UNLOCK_COST_YUAN.WHISPER }),
    confirmText: t("common.confirm"),
    cancelText: t("common.cancel"),
    success: async (res) => {
      if (!res.confirm || !props.card) return;
      try {
        await coinsStore.spend("WHISPER", props.card.userId);
        uni.showToast({ title: t("discover.whisperUnlocked"), icon: "success" });
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

/** [AUTOSHOT] 仅测试钩子：detail-scroll 的 scroll-into-view 目标面板 id */
const anchorId = ref("");

watch(
  () => props.visible,
  (val) => {
    if (val) {
      currentImageIndex.value = 0;
      isBioExpanded.value = true;
      nextTick(() => { animating.value = true; });
      // [AUTOSHOT] 测试钩子：等开启动画结束后滚动到指定面板（scroll-into-view 值变化触发一次）
      if (props.initialAnchor) {
        setTimeout(() => { anchorId.value = props.initialAnchor as string; }, 360);
      }
    } else {
      animating.value = false;
      anchorId.value = "";
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
 * 由 handleMessage（解锁校验）在放行后调用。
 */
function emitMessage() {
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

/* ========== 2026-08-08：兴趣圈 / 动态详情 / 查看全部 跳转 ========== */

/** 点击兴趣圈卡片 → 跳转圈子社区页 */
function onCircleTap(circleName: string): void {
  safeAction(() => {
    lightHaptic();
    openAppPath(`/pages/village/index?focus=${encodeURIComponent(circleName)}`);
  }, t("cardDetail.circleNavFailed"));
}

/** 点击单条动态 → 跳转动态详情页（贴吧式楼中楼评论区，pages/village/detail） */
function onMomentTap(post: { id: string }): void {
  safeAction(() => {
    lightHaptic();
    openAppPath(`/pages/village/detail?id=${encodeURIComponent(post.id)}`);
  }, t("cardDetail.momentNavFailed"));
}

/** 「查看全部」→ 跳转圈子社区（TA 的动态独立列表页后端暂未提供，见验收报告遗留说明） */
function onMomentsAllTap(): void {
  safeAction(() => {
    lightHaptic();
    openAppPath("/pages/village/index");
  }, t("cardDetail.momentsAllNavFailed"));
}

/* ========== 2026-08-08：更多操作（举报用户 / 不感兴趣） ========== */

/** 举报原因候选（与 circles/topic-detail 同口径） */
const REPORT_REASONS = computed<string[]>(() => [
  t("discover.reportReason1"),
  t("discover.reportReason2"),
  t("discover.reportReason3"),
  t("discover.reportReason4"),
]);

/**
 * 顶部「更多」→ ActionSheet：举报用户（真实举报流程，targetType=USER）/
 * 不感兴趣（等价左滑）。拉黑后端暂无接口，见验收报告遗留说明。
 */
async function onMoreTap(): Promise<void> {
  if (!props.card) return;
  let actionIndex: number;
  try {
    const res = await uni.showActionSheet({
      itemList: [t("discover.moreReportUser"), t("discover.moreNotInterested")],
    });
    actionIndex = res.tapIndex;
  } catch (_e) {
    // 用户取消，静默退出
    return;
  }

  if (actionIndex === 1) {
    // 不感兴趣：等价左滑（复用 pass 流程）
    lightHaptic();
    emit("pass", props.card.id);
    scheduleCloseEmit(320);
    return;
  }

  // 举报用户：选择原因 → 可选补充描述 → 提交
  let reason: string;
  try {
    const reasons = REPORT_REASONS.value;
    const res = await uni.showActionSheet({ itemList: reasons });
    reason = reasons[res.tapIndex] ?? reasons[0] ?? "";
  } catch (_e) {
    return;
  }

  let description: string | undefined;
  try {
    const res = await uni.showModal({
      title: t("village.detail.reportDescTitle"),
      editable: true,
      placeholderText: t("village.detail.reportDescPlaceholder"),
      confirmText: t("village.detail.reportSubmit"),
      cancelText: t("village.detail.reportSkip"),
    });
    if (res.confirm && res.content) {
      description = res.content;
    }
  } catch (_e) {
    // 取消则不附加描述，继续提交
  }

  try {
    await reportStore.reportTarget("USER", String(props.card.userId), reason, description);
    uni.showToast({ title: t("discover.moreReportSubmitted"), icon: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("discover.moreReportFailed");
    uni.showToast({ title: message, icon: "none" });
  }
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
          <!-- 更多操作（举报用户 / 不感兴趣） -->
          <view
            class="detail-top-bar__btn detail-top-bar__btn--ellipsis press-feedback"
            hover-class="detail-top-bar__btn--pressed"
            :hover-stay-time="120"
            @tap="onMoreTap"
            role="button"
            :aria-label="t('discover.moreActions')"
          >
            <text class="detail-top-bar__ellipsis-text">⋯</text>
          </view>
        </view>
      </view>

      <!-- 可滚动内容区 -->
      <!-- [AUTOSHOT] scroll-into-view 由测试钩子 initialAnchor 驱动，正常使用为空 -->
      <scroll-view scroll-y class="detail-scroll" enhanced :show-scrollbar="false" :scroll-into-view="anchorId">
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

            <!-- Phase Feedback1 · ID / 距离 / 活跃 / 双重认证 -->
            <view v-if="detailDisplayIdLabel || detailDistanceLabel || detailActiveLabel || detailVerificationLabel" class="detail-hero__extra-row">
              <text v-if="detailDisplayIdLabel" class="detail-hero__extra-text">{{ detailDisplayIdLabel }}</text>
              <text v-if="detailDistanceLabel" class="detail-hero__extra-text">{{ detailDistanceLabel }}</text>
              <text v-if="detailActiveLabel" class="detail-hero__extra-text detail-hero__extra-text--active">
                ● {{ detailActiveLabel }}
              </text>
              <text v-if="detailVerificationLabel" class="detail-hero__extra-badge">{{ detailVerificationLabel }}</text>
            </view>
          </view>
        </view>

        <!-- 快速资料卡片：身高 / 学历 / 月收入（2026-08-08 验收修复：移除「年龄」——
             hero 区已展示年龄，避免同屏重复；身高/学历/月收入在「关于我」网格有完整版，
             此处保留为快速决策信息） -->
        <view id="panel-quick" class="detail-panel detail-quick-stats">
          <view class="quick-stat">
            <view class="quick-stat__icon quick-stat__icon--height">
              <image class="quick-stat__icon-img" :src="icons.ruler" mode="aspectFit" alt="" />
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
              <image class="quick-stat__icon-img" :src="icons.money" mode="aspectFit" alt="" />
            </view>
            <text class="quick-stat__value">{{ incomeLabel }}</text>
            <text class="quick-stat__label">{{ t('cardDetail.incomeLabel') }}</text>
          </view>
          <!-- 2026-08-08 验收修复：第四格补充「职业」，与 hero 区字段互补 -->
          <view class="quick-stat">
            <view class="quick-stat__icon quick-stat__icon--occupation">
              <image class="quick-stat__icon-img" :src="icons.clipboard" mode="aspectFit" alt="" />
            </view>
            <text class="quick-stat__value">{{ occupationText }}</text>
            <text class="quick-stat__label">{{ t('cardDetail.occupationLabel') }}</text>
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
            <text v-if="bioNeedsToggle" class="detail-panel__toggle">{{ bioToggleText }}</text>
          </view>
          <text
            class="detail-bio__text"
            :class="{ 'detail-bio__text--expanded': isBioExpanded }"
          >
            {{ bioText }}
          </text>
        </view>

        <!-- 性格与 MBTI（2026-08-08 分区修正：只用 personality 字段，不再误放兴趣爱好） -->
        <view class="detail-panel detail-personality">
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('cardDetail.personalityTitle') }}</text>
            <text v-if="personalityMbtiText" class="detail-panel__subtitle">{{ personalityMbtiText }}</text>
          </view>
          <view class="detail-tags">
            <text
              v-for="(tag, idx) in personalityTags"
              :key="idx"
              class="detail-tag detail-tag--uniform"
            >
              {{ tag }}
            </text>
          </view>
        </view>

        <!-- 兴趣爱好（2026-08-08 新增分区：统一浅底色胶囊，取代原多色标签） -->
        <view v-if="interestTags.length > 0" class="detail-panel detail-hobbies">
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('cardDetail.hobbiesTitle') }}</text>
          </view>
          <view class="detail-tags">
            <text
              v-for="(tag, idx) in interestTags.slice(0, 8)"
              :key="idx"
              class="detail-tag detail-tag--uniform"
            >
              {{ tag }}
            </text>
          </view>
        </view>

        <!-- 兴趣圈（点击跳转对应圈子页） -->
        <view id="panel-circles" class="detail-panel detail-circles">
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('cardDetail.circlesTitle') }}</text>
            <text class="detail-panel__subtitle">{{ circlesCountText }}</text>
          </view>
          <scroll-view scroll-x class="detail-circles__scroll" :show-scrollbar="false">
            <view class="detail-circles__row">
              <view
                v-for="(circle, idx) in interestCircles"
                :key="idx"
                class="detail-circle-card press-feedback"
                hover-class="detail-circle-card--pressed"
                hover-stay-time="120"
                @tap="onCircleTap(circle.name)"
                role="button"
                :aria-label="t('cardDetail.circlesTitle') + ' ' + circle.name"
              >
                <image class="detail-circle-card__icon" :src="circle.icon" mode="aspectFit" alt="" />
                <view class="detail-circle-card__info">
                  <text class="detail-circle-card__name">{{ circle.name }}</text>
                  <text class="detail-circle-card__members">{{ circleMembersText(circle.members) }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- Phase Feedback1 · 关于我（基础资料） -->
        <view id="panel-basic" v-if="basicInfoItems.length > 0" class="detail-panel detail-basic-info">
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('discover.basicInfo') }}</text>
          </view>
          <view class="detail-basic-info__grid">
            <view
              v-for="(item, idx) in basicInfoItems"
              :key="idx"
              class="detail-basic-info__item"
            >
              <text class="detail-basic-info__label">{{ item.label }}</text>
              <text class="detail-basic-info__value">{{ item.value }}</text>
            </view>
          </view>
        </view>

        <!-- Phase Feedback1 · 悄悄话 -->
        <view v-if="whisperText || !whisperAlreadySent" class="detail-panel detail-whisper">
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('discover.whisperLabel') }}</text>
          </view>
          <view
            class="detail-whisper__card press-feedback"
            hover-class="detail-whisper__card--pressed"
            hover-stay-time="120"
            role="button"
            :aria-label="whisperAlreadySent ? t('discover.whisperSent') : t('discover.whisperSend')"
            @tap="onWhisperTap"
          >
            <text v-if="whisperText" class="detail-whisper__text">{{ whisperText }}</text>
            <text v-else class="detail-whisper__text detail-whisper__text--placeholder">{{ t('discover.whisperEmpty') }}</text>
            <text class="detail-whisper__action">{{ whisperAlreadySent ? t('discover.whisperSent') : t('discover.whisperSend') }}</text>
          </view>
        </view>

        <!-- Phase Feedback1 · 动态（贴吧式：发布时间 → 正文+配图 → 点赞/评论；点击进详情页） -->
        <view id="panel-moments" class="detail-panel detail-moments">
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('discover.moments') }}</text>
            <text
              class="detail-panel__more press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('discover.momentsAll')"
              @tap="onMomentsAllTap"
            >{{ t('discover.momentsAll') }}</text>
          </view>
          <view v-if="momentPosts.length > 0" class="detail-moments__list">
            <view
              v-for="post in momentPosts"
              :key="post.id"
              class="detail-moment-item press-feedback"
              hover-class="detail-moment-item--pressed"
              hover-stay-time="120"
              @tap="onMomentTap(post)"
              role="button"
              :aria-label="t('discover.momentDetailAria')"
            >
              <text class="detail-moment-item__content">{{ post.content }}</text>
              <view class="detail-moment-item__actions">
                <view
                  class="detail-moment-item__action press-feedback"
                  hover-class="press-feedback--active"
                  hover-stay-time="120"
                  role="button"
                  :aria-label="t('discover.momentLike')"
                  :aria-pressed="post.isLiked"
                  @tap.stop="toggleMomentLike(post.id)"
                >
                  <image class="detail-moment-item__action-icon" :src="post.isLiked ? icons.heart : icons.heartOutline" mode="aspectFit" alt="" />
                  <text class="detail-moment-item__action-count">{{ post.likes }}</text>
                </view>
                <view
                  class="detail-moment-item__action press-feedback"
                  hover-class="press-feedback--active"
                  hover-stay-time="120"
                  role="button"
                  :aria-label="t('discover.momentComment')"
                  @tap.stop="onMomentComment(post.id)"
                >
                  <image class="detail-moment-item__action-icon" :src="icons.chat" mode="aspectFit" alt="" />
                  <text class="detail-moment-item__action-count">{{ post.comments }}</text>
                </view>
                <view
                  class="detail-moment-item__action detail-moment-item__action--paid press-feedback"
                  hover-class="press-feedback--active"
                  hover-stay-time="120"
                  role="button"
                  :aria-label="t('discover.momentPrivateMsg')"
                  @tap.stop="onMomentPrivateMsg"
                >
                  <image class="detail-moment-item__action-icon" :src="icons.mail" mode="aspectFit" alt="" />
                  <text class="detail-moment-item__action-count">{{ t('discover.momentPrivateMsg') }}</text>
                </view>
              </view>
              <!-- Phase 4.1 验收 · 评论输入条（点击评论后展开） -->
              <view v-if="commentTargetId === post.id" class="detail-moment-comment">
                <input
                  class="detail-moment-comment__input"
                  v-model="commentDraft"
                  :placeholder="t('discover.momentCommentPlaceholder')"
                  @confirm.stop="submitComment(post.id)"
                  :aria-label="t('discover.momentCommentPlaceholder')"
                />
                <view
                  class="detail-moment-comment__send press-feedback"
                  hover-class="press-feedback--active"
                  hover-stay-time="120"
                  role="button"
                  :aria-label="t('common.send')"
                  @tap="submitComment(post.id)"
                >
                  <text class="detail-moment-comment__send-text">{{ t('common.send') }}</text>
                </view>
              </view>
            </view>
          </view>
          <text v-else class="detail-moments__empty">{{ t('discover.momentsEmpty') }}</text>
        </view>

        <!-- Phase Feedback1 · 期待的人物画像 -->
        <view id="panel-expected" v-if="expectedPartnerText" class="detail-panel detail-expected">
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('discover.expectedPartner') }}</text>
          </view>
          <text class="detail-expected__text">{{ expectedPartnerText }}</text>
        </view>

        <!-- Phase 4.1 验收 · IP 属地 -->
        <view v-if="ipLocationText" class="detail-panel detail-ip">
          <view class="detail-panel__header">
            <text class="detail-panel__title">{{ t('discover.ipLocation') }}</text>
          </view>
          <view class="detail-ip__row">
            <image class="detail-ip__icon" :src="icons.location" mode="aspectFit" alt="" />
            <text class="detail-ip__text">{{ ipLocationText }}</text>
          </view>
        </view>

        <!-- 底部留白（操作栏高度） -->
        <view class="detail-bottom-spacer" />
      </scroll-view>

      <!-- 底部固定操作栏（2026-08-08 与匹配主页统一三键）：不喜欢 / 发私信 / 喜欢 -->
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

.detail-top-bar__ellipsis-text {
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1;
  color: var(--c-text-inverse);
  padding: 0 8rpx 8rpx;
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

/* Phase Feedback1 · 详情 hero 额外信息行（ID/距离/活跃/认证） */
.detail-hero__extra-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
}

.detail-hero__extra-text {
  font-size: var(--fs-sm);
  color: var(--c-overlay-text-secondary);
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.detail-hero__extra-text--active {
  color: var(--c-success);
  font-weight: 600;
}

.detail-hero__extra-badge {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--c-text-inverse);
  background: var(--c-gradient-verify);
  padding: 4rpx 12rpx;
  border-radius: var(--r-full);
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

.detail-panel__more {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-brand-500, #3fcf8e);
  font-weight: 600;
  padding: 4rpx 8rpx;
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

/* 2026-08-08 验收修复：移除 .quick-stat__icon--age（年龄 stat 已从快速资料卡移除） */

.quick-stat__icon--height {
  background: linear-gradient(135deg, var(--c-brand-100) 0%, var(--c-brand-50) 100%);
}

.quick-stat__icon--edu {
  background: linear-gradient(135deg, var(--c-lavender-100) 0%, var(--c-lavender-50) 100%);
}

.quick-stat__icon--income {
  background: linear-gradient(135deg, var(--c-apricot-100) 0%, var(--c-apricot-50) 100%);
}

/* 2026-08-08 验收修复：职业格（替代原年龄格） */
.quick-stat__icon--occupation {
  background: linear-gradient(135deg, var(--c-lavender-100) 0%, var(--c-lavender-50) 100%);
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

/* 2026-08-08 验收修复：移除多色死样式 .detail-tag--1/2/3（模板统一 detail-tag--uniform） */

/* ========== 兴趣圈网格 ========== */
/* 2026-08-08 验收修复：移除未消费的 .detail-circles__grid（模板使用 detail-circles__row + scroll-x） */

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
  width: 56rpx;
  height: 56rpx;
  color: var(--c-brand-500);
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

/* ========== Phase Feedback1 · 关于我（基础资料） ========== */
.detail-basic-info__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 8rpx;
}

.detail-basic-info__item {
  /* 2 行 4 列（2026-08-08）：每行 4 个，gap 12rpx 共 3 个间隙 */
  width: calc((100% - 36rpx) / 4);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 12rpx 16rpx;
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
  border: 1rpx solid var(--c-divider-light);
  box-sizing: border-box;
}

.detail-basic-info__label {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.detail-basic-info__value {
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-text-primary);
}

/* ========== Phase Feedback1 · 悄悄话 ========== */
.detail-whisper__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 8rpx;
  padding: 20rpx 24rpx;
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--c-romance-bg-tint, #fdf2f8) 0%, var(--c-romance-bg-tint-strong, #fce7f3) 100%);
  border: 1rpx solid var(--c-romance-200, #fbcfe8);
}

.detail-whisper__card--pressed {
  opacity: 0.8;
}

.detail-whisper__text {
  flex: 1;
  font-size: var(--fs-base);
  color: var(--c-text-primary);
}

.detail-whisper__text--placeholder {
  color: var(--c-text-tertiary);
}

.detail-whisper__action {
  flex-shrink: 0;
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-romance-500, #ec4899);
}

/* ========== Phase Feedback1 · 动态 ========== */
.detail-moments__list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 8rpx;
}

.detail-moment-item {
  padding: 16rpx 20rpx;
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
  border: 1rpx solid var(--c-divider-light);
}

.detail-moment-item--pressed {
  transform: scale(0.99);
  opacity: 0.92;
}

.detail-moment-item__content {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  line-height: 1.6;
}

.detail-moment-item__actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 12rpx;
}

.detail-moment-item__action {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.detail-moment-item__action-icon {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-text-secondary);
}

/* Phase 4.1 验收 · 评论输入条 */
.detail-moment-comment {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
  padding: 8rpx 12rpx;
  border-radius: var(--r-lg);
  background: var(--c-bg-container, #ffffff);
  border: 1rpx solid var(--c-border-light, #e5e7eb);
}

.detail-moment-comment__input {
  flex: 1;
  height: 64rpx;
  font-size: var(--fs-base);
  color: var(--c-text-primary);
}

.detail-moment-comment__send {
  padding: 8rpx 20rpx;
  border-radius: var(--r-full);
  background: var(--c-brand-500);
}

.detail-moment-comment__send-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.detail-moment-item__action-count {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
}

.detail-moment-item__action--paid {
  margin-left: auto;
  padding: 6rpx 14rpx;
  border-radius: var(--r-full);
  background: var(--c-brand-bg-tint, #e6f9f0);
}

.detail-moments__empty {
  display: block;
  margin-top: 8rpx;
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* ========== Phase Feedback1 · 期待的人物画像 ========== */
.detail-expected__text {
  display: block;
  margin-top: 8rpx;
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  line-height: 1.7;
  padding: 16rpx 20rpx;
  border-radius: var(--r-lg);
  background: var(--c-brand-bg-tint, #e6f9f0);
  border: 1rpx solid var(--c-brand-border-tint, #b7ecd8);
}

/* ========== Phase 4.1 验收 · IP 属地 ========== */
.detail-ip__row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 8rpx;
  padding: 16rpx 20rpx;
  border-radius: var(--r-lg);
  background: var(--c-bg-container, #ffffff);
  border: 1rpx solid var(--c-border-light, #e5e7eb);
}

.detail-ip__icon {
  width: 28rpx;
  height: 28rpx;
  color: var(--c-brand-500);
}

.detail-ip__text {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  font-weight: 500;
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

/* 2026-08-08 验收修复：移除未消费的 .detail-action-bar__btn--super 死样式（模板三键为 pass/msg/like） */

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

.detail-action-bar__btn--like .detail-action-bar__label,
.detail-action-bar__btn--msg .detail-action-bar__label {
  color: var(--c-text-inverse);
}
</style>