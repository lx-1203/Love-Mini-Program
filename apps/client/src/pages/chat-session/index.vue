<script setup lang="ts">
/**
 * 聊天详情页 - 支持私信会话和临时匿名聊天会话
 * 支持从兴趣圈"打招呼"跳转，携带预填消息和引用上下文
 *
 * 模块拆分结构（硬约束：页面转场逻辑必须内联在 .vue，仅拆出纯逻辑）：
 * - ./types            类型定义（QuoteContext / QuoteReply / LongPressMenuState / ChatMessageView）
 * - ./dto              DTO 转换层（toChatMessageView / getMessageRecalled 等）
 * - ./view-models      纯视图模型逻辑（resolvePeerUserId / formatTempCountdown 等）
 * - ./api              纯 API 调用（recallTempChatMessageApi）
 * - ./index.vue        本文件：页面转场 / 生命周期 / UI 事件 / 状态管理
 */
import { computed, ref, nextTick, watch, getCurrentInstance } from "vue";
import { onLoad, onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { featureFlags } from "../../config/feature-flags";
import ChatBubble from "../../components/chat/ChatBubble.vue";
import ActivityCard, { type ActivityCardData } from "../../components/chat/ActivityCard.vue";
import IcebreakerSuggestions from "../../components/chat/IcebreakerSuggestions.vue";
import { useMessagesStore } from "../../stores/messages";
import { useChatStore } from "../../stores/chat";
import { usePageAccess } from "../../composables/usePageAccess";
import { chatPageRequirements } from "../../config/page-access";
import { IMAGE_PATHS } from "../../config/images";
import { ROUTES } from "../../constants/routes";
import { lightHaptic } from "../../utils/haptic";
import { openAppPath } from "../../utils/navigation";
// Sentry 监控：消息发送失败上报异常，页面切换 / 关键按钮点击记录面包屑
import { captureException, addBreadcrumb } from "../../services/sentry";
// 修复 no-duplicate-imports：合并 ./types 的重复 import
import type {
  LongPressMenuState,
  QuoteContext,
  QuoteReply,
  ChatMessageView,
} from "./types";
import {
  toChatMessageViewList,
} from "./dto";
import {
  buildChatMessageRows,
  buildInitialLongPressMenu,
  buildVisibleLongPressMenu,
  computeIdleIcebreakerVisible,
  countUserMessages,
  formatTempCountdown,
  isMessageSelf,
  parsePrefillMessage,
  parseQuoteContext,
  resolvePeerUserId as resolvePeerUserIdVm,
  shouldShowIcebreakers as shouldShowIcebreakersVm,
  toChatBubbleDeliveryStatus,
} from "./view-models";
import { recallTempChatMessageApi } from "./api";
// 统一常量：空闲破冰延迟、倒计时计时器间隔
// 修复（严格模式 noUnusedLocals）：RECORDING_TICK_MS / RECORDER_MAX_DURATION_MS / RECORDER_MIN_DURATION_SECONDS
// 仅在已移除的 startVoiceRecord / initRecorder 中使用，已从导入中移除。
import {
  IDLE_ICEBREAKER_DELAY_MS,
  COUNTDOWN_TICK_MS,
} from "../../constants/chat";

const messagesStore = useMessagesStore();
const chatStore = useChatStore();
const { t } = useI18n();

/**
 * infra R2-00081: 消息错误文案友好化——store.errorMessage 可能含后端原始错误串，
 * 技术性/HTTP 类错误串统一映射为通用文案，避免向用户暴露技术细节
 */
const friendlyPageError = computed(() => {
  const raw = messagesStore.errorMessage;
  if (!raw) return "";
  if (/timeout|network|abort|status|HTTP|\d{3}/i.test(raw)) {
    return t("chat.loadFailed");
  }
  return raw;
});

/** 会话页更多菜单图标（emoji 替换为 SVG） */
const chatMenuIcons = {
  videoCall: IMAGE_PATHS.ICONS_EMOJI.VIDEO,
} as const;

/** SVG 图标资源路径（语音麦克风图标已随语音功能移除；全部 SVG，无 emoji 字符） */
const iconSrc = {
  message: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
  // Emoji 替换 SVG 图标
  smile: IMAGE_PATHS.ICONS_EMOJI.SMILE,
  check: IMAGE_PATHS.ICONS_COMMON.CHECK_SVG,
  checkWhite: IMAGE_PATHS.ICONS_COMMON.CHECK_WHITE_SVG,
  close: IMAGE_PATHS.ICONS_COMMON.CLOSE_SVG,
  chevronRight: IMAGE_PATHS.ICONS_COMMON.CHEVRON_RIGHT_SVG,
} as const;

const draft = ref("");
const sessionId = ref<string | null>(null);
const targetUserId = ref<string | null>(null);
const pageErrorMessage = ref<string | null>(null);
const tempCountdown = ref("");
/** 控制页面内容淡入动画 */
const pageVisible = ref(false);
/** Phase Feedback3 P2.4：是否缘分速配信号会话（?fromSignal=1，触发渐进解锁面板） */
const fromSignal = ref(false);

/** 引用上下文（来自兴趣圈回复的破冰场景） */
const quoteContext = ref<QuoteContext | null>(null);

/** 引用回复状态（用户长按消息后选择"引用"） */
const quoteReply = ref<QuoteReply | null>(null);

/** 长按菜单状态 */
const longPressMenu = ref<LongPressMenuState>(buildInitialLongPressMenu());

let countdownTimer: ReturnType<typeof setInterval> | null = null;

/* ========== 破冰话题 ========== */
/** 输入框是否聚焦（同时作为微信风格输入栏的 isFocused 状态） */
const inputFocused = ref(false);
/** 键盘高度（用于动态调整输入栏 padding-bottom，避免遮挡） */
const keyboardHeight = ref(0);
/** 空闲计时器 ID */
let idleTimer: ReturnType<typeof setTimeout> | null = null;
/** 是否显示空闲提示（5 秒未输入则展示） */
const showIdleIcebreakerHint = ref(false);

/**
 * 用户消息数量（排除 system 类型消息）
 *
 * Task 1.1.1：统一以 `messagesStore.currentMessages` 为单一数据源，
 * 移除对 `chatStore.activeSession.messages` 的双写读取，
 * 避免两个 store 数据不同步时计数闪烁。
 */
const userMessageCount = computed(() =>
  countUserMessages(messagesStore.currentMessages)
);

/** 是否应该展示破冰话题（消息数为 0 或极少时） */
const shouldShowIcebreakers = computed(() => {
  return shouldShowIcebreakersVm(userMessageCount.value, pageErrorMessage.value);
});

/* ========== Phase Feedback3 P2.4：缘分速配渐进解锁 ==========
 *
 * 规则（与消息页 Banner 文案一致）：
 * - 初始仅展示地区、年龄、学校
 * - 每互动 5 条解锁一部分信息
 * - 聊满 20 条解锁 TA 的主页
 * 解锁进度基于当前会话的消息总数（userMessageCount 已排除 system 消息）。
 */

/** 渐进解锁档位（threshold 为解锁所需消息条数） */
const SIGNAL_UNLOCK_LEVELS: Array<{ threshold: number; labelKey: string }> = [
  { threshold: 0, labelKey: "messages.heartSignalInitialInfo" },
  { threshold: 5, labelKey: "messages.unlockFieldHobby" },
  { threshold: 10, labelKey: "messages.unlockFieldPhotos" },
  { threshold: 15, labelKey: "messages.unlockFieldVoice" },
  { threshold: 20, labelKey: "messages.unlockFieldProfile" },
];

/** 当前已解锁档位下标（0 起，全部解锁为 length-1） */
const signalUnlockLevel = computed(() => {
  const count = userMessageCount.value;
  let level = 0;
  for (let i = SIGNAL_UNLOCK_LEVELS.length - 1; i >= 0; i--) {
    const lv = SIGNAL_UNLOCK_LEVELS[i];
    if (lv && count >= lv.threshold) { level = i; break; }
  }
  return level;
});

/** 解锁进度百分比（以聊满 20 条为基准） */
const signalUnlockProgressPct = computed(() =>
  Math.min(100, Math.round((userMessageCount.value / 20) * 100))
);

/** 下一档待解锁信息（全部解锁后为 null） */
const signalNextUnlock = computed<{ field: string; remaining: number } | null>(() => {
  if (signalUnlockLevel.value >= SIGNAL_UNLOCK_LEVELS.length - 1) return null;
  const next = SIGNAL_UNLOCK_LEVELS[signalUnlockLevel.value + 1];
  if (!next) return null;
  return {
    field: t(next.labelKey),
    remaining: Math.max(0, next.threshold - userMessageCount.value),
  };
});

/** 全部解锁后查看 TA 主页 */
function goSignalProfile() {
  const peerId = currentSession.value?.partnerId || targetUserId.value;
  if (!peerId) return;
  // P0-1 修复（2026-08-08）：profile 是 tabBar 页，navigateTo 会 fail（can not navigateTo
  // a tabbar page）→ 改用 openAppPath（switchTab + pending-tab-query 桥接传 userId）
  openAppPath(`/pages/profile/index?userId=${encodeURIComponent(peerId)}`);
}

/**
 * 当前会话消息视图模型（DTO 转换层应用）
 *
 * 将 store 中的 MessageItem[] 转换为 ChatMessageView[]，
 * 补充 recalled / deliveryStatus / quoteRef 等扩展字段（默认 undefined），
 * 消除模板中 `(message as any).xxx` 的类型断言。
 *
 * Task 1.1.1：单一数据源 - 仅消费 `messagesStore.currentMessages`，
 * 临时匿名会话由 `chatStore` 管理生命周期，但其消息通过
 * `messagesStore.setCurrentMessages()` 同步到 currentMessages 后再渲染。
 */
const currentMessagesView = computed(() =>
  toChatMessageViewList(messagesStore.currentMessages)
);

/* ========== 活动卡片消息（kind=activity，content 为 JSON） ========== */

/**
 * 解析活动卡片消息体。
 *
 * content 契约（见 docs/API-CONTRACT.md）：
 * {"title":"活动标题","desc":"描述","tag":"标签","targetUrl":"/pages/activities/detail?id=xxx"}
 *
 * @param body 消息内容（JSON）
 * @returns 解析成功返回卡片数据，失败返回 null（由 ChatBubble 文本兜底渲染）
 */
function parseActivityCard(body: string): ActivityCardData | null {
  try {
    const parsed = JSON.parse(body) as Partial<ActivityCardData>;
    if (parsed.title && parsed.targetUrl) {
      return {
        title: parsed.title,
        desc: parsed.desc || "",
        tag: parsed.tag || "",
        targetUrl: parsed.targetUrl,
      };
    }
  } catch (_e) {
    // 解析失败（旧消息/非 JSON 内容），静默回退
  }
  return null;
}

/** 点击活动卡片：跳转活动详情 */
function openActivityCard(targetUrl: string) {
  openAppPath(targetUrl);
}

/* ========== 消息流时间分隔条 + 滚动（2026-08-08 微信化重构） ========== */

/**
 * 消息行模型：按微信 5 分钟规则在消息流中插入时间分隔条。
 * 纯逻辑见 view-models.ts（buildChatMessageRows / shouldShowTimeBar / formatChatTimeBar）。
 */
const messageRows = computed(() => buildChatMessageRows(currentMessagesView.value));

/** scroll-view 纵向滚动位置（上拉加载旧消息时用于保持视口） */
const scrollTop = ref(0);
/** scroll-into-view 目标元素 id（进入/新消息滚底） */
const scrollIntoViewId = ref("");
/** 消息行滚动定位 ID 前缀（R4-00074：点击引用气泡滚动到被引用消息） */
const MESSAGE_ROW_ID_PREFIX = "msg-row-";
/** 当前 scrollTop（onScroll 持续记录） */
let curScrollTop = 0;
/** 是否正在加载更早消息（防重入） */
const loadingOlder = ref(false);
/** 是否已滚到底部附近（决定新消息是否自动滚底） */
let nearBottom = true;

/** 底部锚点 id（常量，模板与脚本共用） */
const BOTTOM_ANCHOR_ID = "chat-bottom-anchor";

/** 记录滚动位置 */
function onScroll(e: { detail?: { scrollTop?: number } }) {
  curScrollTop = e?.detail?.scrollTop ?? 0;
}

/**
 * 上拉加载更早历史消息（微信行为：加载后视口不跳）。
 * 通过「加载前 scrollHeight - 当前 scrollTop」测量距底距离，
 * 加载后设置 scrollTop = 新scrollHeight - 原距底距离 保持视口。
 */
function onScrollToUpper() {
  if (loadingOlder.value || !sessionId.value || !messagesStore.messageHasMore) return;
  void (async () => {
    loadingOlder.value = true;
    try {
      const before = await queryScrollHeight();
      await messagesStore.fetchOlderMessages(sessionId.value!, messagesStore.messagePage + 1);
      await nextTick();
      const after = await queryScrollHeight();
      // scroll-top 与 scroll-into-view 互斥：先清 into-view 再设置 scroll-top
      scrollIntoViewId.value = "";
      scrollTop.value = after - (before - curScrollTop);
    } finally {
      loadingOlder.value = false;
    }
  })();
}

/** 查询消息滚动区内容高度（Promise 包装 createSelectorQuery） */
function queryScrollHeight(): Promise<number> {
  return new Promise((resolve) => {
    uni
      .createSelectorQuery()
      .in(getCurrentInstance())
      .select(".chat-scroll")
      .fields({ size: true }, (res) => {
        // res 可能为 null / NodeInfo / NodeInfo[]，取 scrollHeight 数值
        const info = Array.isArray(res) ? res[0] : res;
        resolve(info?.scrollHeight ?? 0);
      })
      .exec();
  });
}

/** 滚动到底部（进入页面 / 新消息到达） */
function scrollToBottom() {
  scrollTop.value = 0;
  scrollIntoViewId.value = "";
  void nextTick(() => {
    scrollIntoViewId.value = BOTTOM_ANCHOR_ID;
  });
}

/**
 * 新消息到达时自动滚底（用户停留在底部附近时）。
 * 上拉加载旧消息（loadingOlder）时长度也变化，但由 onScrollToUpper 保持视口，此处跳过。
 */
watch(
  () => messagesStore.currentMessages.length,
  () => {
    if (nearBottom && !loadingOlder.value) scrollToBottom();
  }
);

/** 返回上一页（自定义导航栏） */
function goBack() {
  // #ifdef MP-WEIXIN
  uni.navigateBack({
    delta: 1,
    fail: () => {
      // 无上一页时静默处理
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateBack({ delta: 1 }).catch(() => {
    // 返回失败时静默处理
  });
  // #endif
}

usePageAccess(chatPageRequirements);

/**
 * 同步 chatStore.activeSession.messages 到 messagesStore.currentMessages
 *
 * Task 1.1.1：临时匿名会话由 `chatStore` 管理生命周期，
 * 但页面渲染统一从 `messagesStore.currentMessages` 读取。
 * 该函数在 chatStore 操作（loadSession / sendText / sendVoice / acceptExchange /
 * endSession / recallMessage）完成后调用，确保单一数据源同步。
 */
function syncChatStoreMessagesToMessagesStore(): void {
  const chatMessages = chatStore.activeSession?.messages ?? [];
  // 将 ChatMessage[] 转换为 MessageItem[] 形态后写入 messagesStore
  // R4-00073：原映射仅保留 id/sender/kind/body/sentAt/durationSeconds，
  // 丢弃 recalled/deliveryStatus/quoteRef/quoteBody/quoteSender，
  // 导致临时会话撤回态、引用回复、送达状态渲染丢失——现补充扩展字段
  // （ChatMessageView 继承 MessageItem，多出的可选字段在渲染层被消费）。
  messagesStore.setCurrentMessages(
    chatMessages.map((m) => {
      const view: ChatMessageView = {
        id: String(m.id),
        sessionId: sessionId.value ?? "",
        sender: m.sender,
        kind: m.kind,
        body: m.body,
        sentAt: m.sentAt,
        durationSeconds: m.durationSeconds ?? null,
        recalled: m.recalled,
        deliveryStatus: m.deliveryStatus,
        quoteRef: m.quoteRef ?? undefined,
        quoteBody: m.quoteBody ?? undefined,
        quoteSender: (m.quoteSender as ChatMessageView["quoteSender"]) ?? undefined,
      };
      return view;
    })
  );
}

/**
 * 加载会话消息（Task 1.1.6：改为 await 等待数据加载完成）
 *
 * 统一封装 messagesStore.fetchSessionMessages + chatStore.loadSession 的同步逻辑：
 * - 私信会话：仅调用 messagesStore.fetchSessionMessages
 * - 临时匿名会话：先调用 chatStore.loadSession，再同步消息到 messagesStore
 *
 * 防止 onShow 与 onLoad 异步创建会话竞态：仅在 sessionId 就绪时执行。
 */
async function loadSessionData(): Promise<void> {
  if (!sessionId.value) {
    return;
  }

  // Task 1.1.6：等待 messagesStore 数据加载完成，避免页面渲染空消息列表
  await messagesStore.fetchSessionMessages(sessionId.value);

  // 临时匿名会话需要额外加载 chatStore 数据并同步消息
  const session = messagesStore.sessions.find((s) => s.id === sessionId.value);
  if (!session || session.sessionType === "temp_anonymous") {
    await chatStore.loadSession(sessionId.value);
    syncChatStoreMessagesToMessagesStore();
  }
}

onLoad(async (query) => {
  // ---- 缘分速配信号会话（渐进解锁） ----
  if (query && query.fromSignal === "1") {
    fromSignal.value = true;
  }

  // ---- 预填消息参数（来自兴趣圈"打招呼"跳转） ----
  if (query && typeof query.prefillMessage === "string" && query.prefillMessage.trim().length > 0) {
    draft.value = parsePrefillMessage(query.prefillMessage);
  }

  // ---- 破冰话题参数（来自消息页匹配引导，review #30：原参数无人消费） ----
  // 未同时携带 prefillMessage 时，将 icebreaker 预填为消息草稿，发送即发出。
  if (
    query &&
    typeof query.icebreaker === "string" &&
    query.icebreaker.trim().length > 0 &&
    !draft.value
  ) {
    draft.value = parsePrefillMessage(query.icebreaker);
  }

  // ---- 引用上下文参数 ----
  if (query && typeof query.quoteContext === "string" && query.quoteContext.trim().length > 0) {
    quoteContext.value = parseQuoteContext(query.quoteContext);
  }

  if (query && typeof query.sessionId === "string" && query.sessionId.trim().length > 0) {
    sessionId.value = query.sessionId;
    pageErrorMessage.value = null;
    return;
  }

  // 支持通过 userId 参数查找或创建会话
  if (query && typeof query.userId === "string" && query.userId.trim().length > 0) {
    const rawUserId = query.userId.trim();
    targetUserId.value = rawUserId;
    const existingSession = messagesStore.sessions.find(
      (s) => s.partnerId === rawUserId && s.sessionType === "private"
    );
    if (existingSession) {
      sessionId.value = existingSession.id;
      pageErrorMessage.value = null;
      return;
    }

    // Task 1.1.3：移除硬编码 `session-${rawUserId}`，
    // 调用 POST /api/messages/conversations 创建/复用真实会话 ID。
    // 后端 PrivateMessageController.createConversation 入参 { userBId: Long }，
    // 返回 ConversationView（含真实 id / partnerId / partnerName 等）。
    // Mock 模式下 messagesStore.createSession 内部构造本地占位会话，保证 dev 流程可走通。
    try {
      const session = await messagesStore.createSession(rawUserId);
      if (session) {
        sessionId.value = session.id;
        pageErrorMessage.value = null;
        // 创建会话后立即加载消息（onShow 可能在 createSession 完成前已触发并 return）
        await loadSessionData();
      } else {
        pageErrorMessage.value = t("chat.createSessionFailed");
      }
    } catch (e) {
      pageErrorMessage.value = e instanceof Error ? e.message : t("chat.createSessionFailedShort");
    }
    return;
  }

  pageErrorMessage.value = t("chat.missingSessionId");
});

onShow(() => {
  // 记录页面进入面包屑，便于在异常发生时回溯用户跳转路径
  addBreadcrumb("navigation", "page_enter", {
    url: "/pages/chat-session/index",
    sessionId: sessionId.value,
  });

  // 页面过渡动画：先重置再触发淡入
  pageVisible.value = false;
  void nextTick(() => {
    pageVisible.value = true;
  });

  if (!sessionId.value) {
    return;
  }

  // 红点修复（2026-08-08）：标记当前正在查看的会话。
  // onShow/onHide 配对覆盖「压栈/切后台」场景：
  // 会话打开期间收到的新消息不累加未读数，退出后恢复累加。
  messagesStore.setActiveSession(sessionId.value);
  nearBottom = true;
  void nextTick(scrollToBottom);

  // Task 1.1.6：等待消息加载完成后再启动倒计时与破冰话题加载，
  // 避免页面渲染空消息列表导致破冰话题过早出现。
  // 注：onShow 为同步生命周期，使用 void 不阻塞页面渲染，
  // loadSessionData 内部已通过 await 确保 messagesStore.currentMessages 就绪。
  void loadSessionData();

  startTempCountdown();
  void loadIcebreakers();
});

onHide(() => {
  // 红点修复：退出会话页（压栈/切后台）后恢复未读累加
  messagesStore.setActiveSession(null);
  nearBottom = false;
});

onUnload(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  clearIdleTimer();
});

/** 当前会话信息（优先从 messagesStore 获取） */
const currentSession = computed(() => {
  return messagesStore.sessions.find((s) => s.id === sessionId.value) || null;
});

/** 是否为临时匿名会话 */
const isTempSession = computed(() => currentSession.value?.sessionType === "temp_anonymous");

/**
 * 临时会话是否已到期（review #51：原实现用 tempCountdown === "已结束" 比较中文文案，
 * 依赖展示文案判断状态；现改为基于 closesAt 计算，与文案解耦）。
 */
const tempSessionEnded = computed(() => {
  const session = currentSession.value;
  if (!session || session.sessionType !== "temp_anonymous" || !session.closesAt) {
    return false;
  }
  return Date.parse(session.closesAt) - Date.now() <= 0;
});

/** 是否为私信会话 */
const isPrivateSession = computed(() => currentSession.value?.sessionType === "private");

/** 会话是否已关闭 */
const isSessionClosed = computed(() => {
  if (currentSession.value) {
    return currentSession.value.phase === "closed";
  }
  return chatStore.activeSession?.phase === "closed";
});

/** 发送按钮是否可高亮（输入框非空且会话未结束） */
const canSend = computed(() => draft.value.trim().length > 0 && !isSessionClosed.value);

/** 页面标题（微信风格导航栏：仅标题，无副标题） */
const pageTitle = computed(() => {
  if (isTempSession.value) return t("chat.tempSessionTitle");
  if (isPrivateSession.value) return currentSession.value?.partnerName || t("chat.privateMessageTitle");
  // 通过 userId 导航但无现有会话时，标明目标用户
  if (targetUserId.value) {
    const partnerName = messagesStore.sessions.find(
      (s) => s.partnerId === targetUserId.value && s.sessionType === "private"
    )?.partnerName;
    return partnerName || t("chat.conversationTitle");
  }
  return chatStore.activeSession?.partnerName || t("chat.chatTitle");
});

/** 启动临时会话倒计时 */
function startTempCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  updateTempCountdown();

  const session = currentSession.value;
  if (session?.sessionType === "temp_anonymous" && session.closesAt) {
    countdownTimer = setInterval(updateTempCountdown, COUNTDOWN_TICK_MS);
  }
}

function updateTempCountdown() {
  const session = currentSession.value;
  if (!session || session.sessionType !== "temp_anonymous" || !session.closesAt) {
    tempCountdown.value = "";
    return;
  }

  const now = Date.now();
  const closesAt = Date.parse(session.closesAt);
  const diff = closesAt - now;

  // 使用纯函数格式化倒计时
  tempCountdown.value = formatTempCountdown(diff);

  // 已结束时清理计时器并清空倒计时文本（review #51：避免“剩余时间：已结束”文案残留）
  if (diff <= 0) {
    tempCountdown.value = "";
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }
}

/** 发送文字消息
 * 私信会话走 messagesStore.sendMessage，临时会话走 chatStore.sendText
 */
async function sendText() {
  if (!draft.value.trim() || !sessionId.value) {
    return;
  }

  if (isSessionClosed.value) {
    uni.showToast({ title: t("chat.sessionClosedCannotSend"), icon: "none" });
    return;
  }

  // 记录关键按钮点击面包屑，便于在发送失败时定位用户操作节点
  addBreadcrumb("ui", "button_click", {
    id: "chat.sendText",
    sessionId: sessionId.value,
  });

  const messageToSend = draft.value;
  const quoteRef = quoteReply.value;
  const currentSessionId = sessionId.value;

  try {
    if (isTempSession.value) {
      // 临时匿名会话使用 chatStore 的临时聊天链路
      await chatStore.sendText(messageToSend);
      // Task 1.1.1：单一数据源 - chatStore 操作后同步消息到 messagesStore
      syncChatStoreMessagesToMessagesStore();
    } else {
      // 私信会话使用 messagesStore 的标准私信链路
      await messagesStore.sendMessage(currentSessionId, messageToSend, quoteRef?.messageId);
    }

    // 发送成功后清空输入与引用状态；失败时保留草稿以便重试
    draft.value = "";
    quoteReply.value = null;
  } catch (error) {
    // 消息发送失败：上报到 Sentry，source 标记为 chat.sendText 便于后台筛选
    captureException(error, {
      source: "chat.sendText",
      sessionId: currentSessionId,
    });
    const message = error instanceof Error ? error.message : t("chat.sendFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/** 同意交换联系方式（仅临时匿名会话） */
async function handleAcceptExchange() {
  if (!sessionId.value) return;
  try {
    await chatStore.acceptExchange("self");
    uni.showToast({ title: t("chat.exchangeAccepted"), icon: "success" });
  } catch (_e) {
    uni.showToast({ title: chatStore.errorMessage || t("chat.operationFailed"), icon: "none" });
  }
}

/** 结束会话（仅临时匿名会话） */
async function handleEndSession() {
  if (!sessionId.value) return;
  // review #50：原实现直接结束无确认，误触会销毁整个临时会话；先弹确认框。
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: t("chat.endSessionConfirmTitle"),
      content: t("chat.endSessionConfirmContent"),
      confirmText: t("chat.endSessionConfirmOk"),
      cancelText: t("common.cancel"),
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) return;
  try {
    await chatStore.endSession();
    uni.showToast({ title: t("chat.sessionEnded"), icon: "success" });
  } catch (_e) {
    uni.showToast({ title: chatStore.errorMessage || t("chat.operationFailed"), icon: "none" });
  }
}

// 语音功能已移除（微信隐私保护指引未声明麦克风导致录音无法使用，
// 按产品要求下线语音录制/发送，输入栏仅保留文字输入）：
// - toggleVoiceMode / isVoiceMode / VoiceRecorder 组件：已移除
// - isRecording / handleVoiceRecorded / handleVoiceRecordCancel / handleVoiceStateChange：已移除
// - 历史遗留 initRecorder / startVoiceRecord / stopVoiceRecord / sendVoiceMessage：此前已移除

/* ========== 破冰话题事件处理 ========== */

/** 输入框聚焦：启动空闲计时器，清除提示 */
function onInputFocus() {
  inputFocused.value = true;
  showIdleIcebreakerHint.value = false;
  resetIdleTimer();
}

/** 输入框失焦：清除计时器和提示 */
function onInputBlur() {
  inputFocused.value = false;
  clearIdleTimer();
  showIdleIcebreakerHint.value = false;
}

/** 微信风格输入栏：发送按钮点击（委托给 sendText） */
async function onSend() {
  await sendText();
}

/** 键盘高度变化：动态调整输入栏 padding-bottom（mp-weixin 适用） */
function onKeyboardHeightChange(e: { height: number }) {
  keyboardHeight.value = e?.height ?? 0;
}

/** 输入内容变化：重置空闲计时器 */
function onDraftChange() {
  if (inputFocused.value) {
    showIdleIcebreakerHint.value = false;
    resetIdleTimer();
  }
}

/** 重置空闲计时器：IDLE_ICEBREAKER_DELAY_MS 后显示破冰话题提示 */
function resetIdleTimer() {
  clearIdleTimer();
  idleTimer = setTimeout(() => {
    // 使用纯函数判断是否展示空闲提示
    if (computeIdleIcebreakerVisible(inputFocused.value, draft.value)) {
      showIdleIcebreakerHint.value = true;
    }
  }, IDLE_ICEBREAKER_DELAY_MS);
}

/** 清除空闲计时器 */
function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

/** 选中破冰话题：将话题文本填入输入框 */
function handleIcebreakerSelect(content: string) {
  draft.value = content;
  showIdleIcebreakerHint.value = false;
}

/** 换话题：重新请求破冰话题 */
async function handleRefreshIcebreakers() {
  const peerIdNum = resolvePeerUserId();
  if (peerIdNum === null) {
    uni.showToast({ title: t("chat.icebreakersNoPeer"), icon: "none" });
    return;
  }
  try {
    await chatStore.fetchIcebreakers(peerIdNum);
  } catch (_e) {
    // P1-11：破冰话题加载失败不中断页面
    uni.showToast({ title: t("chat.icebreakersLoadFailed"), icon: "none" });
  }
}

/** 解析对方用户 ID 为数字，用于 API 调用（委托给 view-models 纯函数） */
function resolvePeerUserId(): number | null {
  return resolvePeerUserIdVm(
    currentSession.value?.partnerId,
    sessionId.value,
    targetUserId.value
  );
}

/* ========== 长按菜单 / 引用回复 / 撤回 ========== */

/** 处理消息长按 */
function handleMessageLongpress(messageId: string) {
  // Task 1.1.1：单一数据源 - 仅从 messagesStore.currentMessages 查找消息
  const message = messagesStore.currentMessages.find((m) => m.id === messageId);
  if (!message) return;

  // 使用纯函数构建长按菜单状态
  longPressMenu.value = buildVisibleLongPressMenu(
    messageId,
    isMessageSelf(message.sender)
  );
}

/** 关闭长按菜单 */
function closeLongPressMenu() {
  longPressMenu.value.visible = false;
}

/**
 * 空操作函数，用于 catchtap 阻止冒泡时的占位 handler。
 *
 * 源码层面直接使用 catchtap="noop" 阻止冒泡：
 * mp-weixin 端 catchtap 原生阻止冒泡且必须绑定 handler，故需 noop 占位；
 * H5 端 catchtap 不生效，需在 noop 内调用 event.stopPropagation()（此处 noop 不接收 event，
 * 由 catchtap 的原生语义保证 mp-weixin 端冒泡阻止；H5 端冒泡由外层遮罩 @tap 兜底关闭）。
 */
const noop = () => {};

/**
 * 复制当前长按选中的消息内容到剪贴板。
 * P2 修复（长按复制支持）：用户长按聊天消息后选择"复制"，
 * 调用 uni.setClipboardData 写入消息正文，复制成功后 toast 提示。
 * 兼容性：H5 / mp-weixin 均支持 uni.setClipboardData。
 */
function handleCopyMessage() {
  const messageId = longPressMenu.value.messageId;
  if (!messageId) {
    closeLongPressMenu();
    return;
  }
  // Task 1.1.1：单一数据源 - 仅从 messagesStore.currentMessages 查找
  const message = messagesStore.currentMessages.find((m) => m.id === messageId);
  if (!message) {
    closeLongPressMenu();
    return;
  }
  // 仅支持文本/emoji 类型消息复制，语音类型不复制
  if (message.kind && message.kind !== "text" && message.kind !== "emoji") {
    uni.showToast({ title: t("chat.copyNotSupported"), icon: "none" });
    closeLongPressMenu();
    return;
  }
  uni.setClipboardData({
    data: message.body || "",
    success: () => {
      // H5 端 uni.setClipboardData 内部已弹 toast，这里仅兜底
      // mp-weixin 端 success 后会自动展示内置 toast，无需重复
    },
    fail: () => {
      uni.showToast({ title: t("chat.copyFailed"), icon: "none" });
    },
  });
  closeLongPressMenu();
}

/** 引用消息 */
function handleQuoteMessage() {
  // Task 1.1.1：单一数据源 - 仅从 messagesStore.currentMessages 查找
  const message = messagesStore.currentMessages.find(
    (m) => m.id === longPressMenu.value.messageId
  );
  if (message) {
    quoteReply.value = {
      messageId: message.id,
      body: message.body,
      sender: message.sender,
    };
  }
  closeLongPressMenu();
}

/** 撤回消息 */
async function handleRecallMessage() {
  if (!sessionId.value || !longPressMenu.value.messageId) return;
  // R4-00072：撤回端点 POST /temp-chat/sessions/{id}/messages/{mid}/recall 仅临时会话存在，
  // 私信会话撤回必然 404。菜单项已按会话类型隐藏，此处防御性兜底。
  if (!isTempSession.value) {
    uni.showToast({ title: t("chat.recallNotSupported"), icon: "none" });
    closeLongPressMenu();
    return;
  }
  try {
    await recallTempChatMessageApi(sessionId.value, longPressMenu.value.messageId);
    uni.showToast({ title: t("chat.recalledSuccess"), icon: "success" });
    // 重新加载会话以获取最新消息
    await messagesStore.fetchSessionMessages(sessionId.value);
    // Task 1.1.1：临时会话需同步 chatStore 消息到 messagesStore 单一数据源
    if (isTempSession.value) {
      await chatStore.loadSession(sessionId.value);
      syncChatStoreMessagesToMessagesStore();
    }
  } catch (_e) {
    uni.showToast({ title: t("chat.recallFailed"), icon: "none" });
  }
  closeLongPressMenu();
}

/** 取消引用回复 */
function cancelQuoteReply() {
  quoteReply.value = null;
}

/**
 * R4-00074：点击引用消息 → 滚动定位到被引用消息。
 * 被引用消息可能因分页加载/撤回不存在，找不到时仅取消引用（原交互死点）。
 */
function handleTapQuote(quoteRef: string) {
  if (!quoteRef) return;
  const exists = messagesStore.currentMessages.some((m) => m.id === quoteRef);
  if (!exists) {
    cancelQuoteReply();
    return;
  }
  // scroll-into-view 与 scroll-top 互斥：先清空 scroll-top 再设置目标
  scrollTop.value = 0;
  scrollIntoViewId.value = "";
  // 下一帧设置目标，确保清空生效（同帧重复赋值可能被合并）
  setTimeout(() => {
    scrollIntoViewId.value = MESSAGE_ROW_ID_PREFIX + quoteRef;
  }, 0);
}

/** 加载破冰话题 */
async function loadIcebreakers() {
  if (!shouldShowIcebreakers.value) return;
  const peerIdNum = resolvePeerUserId();
  // P1-11：无法解析对方用户 ID 时提示而非静默跳过
  if (peerIdNum === null) {
    uni.showToast({ title: t("chat.icebreakersNoPeer"), icon: "none" });
    return;
  }
  // 避免重复加载
  if (chatStore.icebreakerItems.length > 0) return;
  try {
    await chatStore.fetchIcebreakers(peerIdNum);
  } catch (_e) {
    // P1-11：破冰话题加载失败给出提示，不中断页面（onShow 异步调用无未处理拒绝）
    uni.showToast({ title: t("chat.icebreakersLoadFailed"), icon: "none" });
  }
}

/* ========== "+" 更多菜单：视频通话入口 ========== */

/** 更多菜单是否展开 */
const moreMenuVisible = ref<boolean>(false);

/** 打开"+"更多菜单 */
function openMoreMenu() {
  lightHaptic();
  moreMenuVisible.value = true;
}

/** 关闭"+"更多菜单 */
function closeMoreMenu() {
  moreMenuVisible.value = false;
}

/**
 * 跳转到视频通话页：
 * - 临时匿名会话不支持视频通话
 * - 携带 sessionId 与对方 userId
 */
function goVideoCall() {
  closeMoreMenu();
  if (!sessionId.value) {
    uni.showToast({ title: t("chat.moreMenuSessionMissing"), icon: "none" });
    return;
  }
  if (isTempSession.value) {
    uni.showToast({ title: t("chat.moreMenuTempNotSupported"), icon: "none" });
    return;
  }
  const peerId = resolvePeerUserId();
  const params: string[] = [`sessionId=${encodeURIComponent(sessionId.value)}`];
  if (peerId !== null) {
    params.push(`peerUserId=${encodeURIComponent(String(peerId))}`);
  }
  uni.navigateTo({
    url: `${ROUTES.CHAT.VIDEO_CALL}?${params.join("&")}`,
  });
}

// 修复（严格模式 noUnusedLocals）：noop 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ noop });
</script>

<template>
  <view class="chat-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航（微信风格：返回箭头 + 居中标题，无副标题） -->
    <view class="chat-nav" role="banner" :aria-label="pageTitle">
      <view
        class="chat-nav__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="goBack"
        role="button"
        :aria-label="t('common.back')"
      >
        <image class="chat-nav__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
      </view>
      <view class="chat-nav__title-wrap">
        <text class="chat-nav__title">{{ pageTitle }}</text>
      </view>
      <view class="chat-nav__spacer" />
    </view>

    <!-- 临时匿名会话顶部提示（含倒计时，原副标题信息移入此处） -->
    <view v-if="isTempSession" class="temp-banner">
      <text class="temp-banner__text">
        {{ tempSessionEnded ? t("chat.sessionEndedLabel") : t("chat.tempBannerText") }}
      </text>
      <text v-if="!tempSessionEnded && tempCountdown" class="temp-banner__countdown">
        {{ t('chat.remainingTimeLabel', { time: tempCountdown }) }}
      </text>
      <text class="temp-banner__hint">
        {{ chatStore.activeSession?.availabilityHint || t('chat.defaultAvailabilityHint') }}
      </text>
    </view>

    <!-- 缘分速配：渐进解锁面板（压缩为横幅条） -->
    <view v-if="fromSignal" class="signal-banner">
      <view class="signal-unlock">
        <view class="signal-unlock__progress-row">
          <text class="signal-unlock__count">{{ t('messages.signalUnlockProgress', { n: userMessageCount }) }}</text>
          <text class="signal-unlock__pct">{{ signalUnlockProgressPct }}%</text>
        </view>
        <view class="signal-unlock__bar">
          <view class="signal-unlock__bar-fill" :style="{ width: signalUnlockProgressPct + '%' }" />
        </view>
        <view class="signal-unlock__levels" role="list">
          <view
            v-for="(lv, idx) in SIGNAL_UNLOCK_LEVELS"
            :key="lv.labelKey"
            class="signal-unlock__level"
            :class="{ 'signal-unlock__level--done': idx <= signalUnlockLevel, 'signal-unlock__level--next': idx === signalUnlockLevel + 1 }"
          >
            <view class="signal-unlock__level-dot">
              <image v-if="idx <= signalUnlockLevel" class="signal-unlock__level-dot-icon" :src="iconSrc.checkWhite" mode="aspectFit" alt="" />
              <text v-else>{{ idx + 1 }}</text>
            </view>
            <text class="signal-unlock__level-text">{{ t(lv.labelKey) }}</text>
          </view>
        </view>
        <view class="signal-unlock__hint-row">
          <text v-if="signalNextUnlock" class="signal-unlock__hint">
            {{ t('messages.signalUnlockNext', { n: signalNextUnlock.remaining, field: signalNextUnlock.field }) }}
          </text>
          <template v-else>
            <text class="signal-unlock__hint signal-unlock__hint--done">{{ t('messages.signalUnlockAllDone') }}</text>
            <view class="signal-unlock__hint-action" @tap.stop="goSignalProfile">
              <text>{{ t('messages.signalUnlockViewProfile') }}</text>
              <image class="signal-unlock__hint-arrow" :src="iconSrc.chevronRight" mode="aspectFit" alt="" />
            </view>
          </template>
        </view>
      </view>
    </view>

    <!-- 消息滚动区（微信风格：全屏沉浸，上拉加载更早历史） -->
    <scroll-view
      class="chat-scroll"
      scroll-y
      :scroll-top="scrollTop"
      :scroll-into-view="scrollIntoViewId"
      :scroll-with-animation="false"
      @scroll="onScroll"
      @scrolltoupper="onScrollToUpper"
    >
      <view v-if="pageErrorMessage" class="meta-copy meta-copy--padded">{{ pageErrorMessage }}</view>
      <view v-else-if="messagesStore.loading" class="meta-copy meta-copy--padded">{{ t('chat.loadingSessionDetail') }}</view>
      <view v-else-if="messagesStore.errorMessage" class="meta-copy meta-copy--padded">{{ friendlyPageError }}</view>
      <view v-else class="chat-list" role="list">
        <!-- 行模型：时间分隔条（微信 5 分钟规则）+ 消息/活动卡片 -->
        <template v-for="row in messageRows" :key="row.key">
          <view v-if="row.type === 'timebar'" class="chat-time-bar">{{ row.text }}</view>
          <template v-else-if="row.message">
            <!-- 活动卡片消息：ActivityCard 渲染（点击跳活动详情） -->
            <ActivityCard
              v-if="row.message.kind === 'activity' && parseActivityCard(row.message.body)"
              :card="parseActivityCard(row.message.body)!"
              @tap-card="openActivityCard"
            />
            <!-- 文本/表情/系统消息：使用 ChatBubble 渲染
              （语音功能已移除：历史 voice 消息由 ChatBubble 按语音类型兜底展示；
               activity 消息解析失败时也走此兜底） -->
            <ChatBubble
              v-else
              :id="MESSAGE_ROW_ID_PREFIX + row.message.id"
              :sender="row.message.sender"
              :kind="row.message.kind"
              :body="row.message.body"
              :sent-at="row.message.sentAt"
              :duration-seconds="row.message.durationSeconds"
              :recalled="row.message.recalled"
              :delivery-status="toChatBubbleDeliveryStatus(row.message.deliveryStatus)"
              :quote-ref="row.message.quoteRef"
              :quote-body="row.message.quoteBody"
              :quote-sender="row.message.quoteSender"
              :can-interact="true"
              @longpress="handleMessageLongpress(row.message.id)"
              @tap-quote="handleTapQuote"
            />
          </template>
        </template>
        <text v-if="!messagesStore.currentMessages.length" class="meta-copy meta-copy--padded">
          {{ t('chat.emptySessionCreated') }}
        </text>
        <text v-if="isSessionClosed" class="meta-copy meta-copy--warning">
          {{ t('chat.sessionClosedHint') }}
        </text>
      </view>
      <!-- 底部锚点：进入页面 / 新消息时滚动至此 -->
      <view :id="BOTTOM_ANCHOR_ID" class="chat-bottom-anchor" />
    </scroll-view>

    <!-- 输入区（微信风格：输入框 + 破冰建议 + 更多操作） -->
    <view class="chat-input-area" :class="{ 'chat-input-area--keyboard-up': keyboardHeight > 0 }">
      <view v-if="pageErrorMessage" class="meta-copy meta-copy--padded">{{ pageErrorMessage }}</view>
      <template v-else>
        <!-- 引用上下文卡片（来自兴趣圈"打招呼"） -->
        <view v-if="quoteContext" class="quote-card card-base">
          <view class="quote-card__header">
            <text class="quote-card__label">{{ t('chat.quoteFromTopic', { title: quoteContext.topicTitle }) }}</text>
          </view>
          <text class="quote-card__content">"{{ quoteContext.replyContent }}"</text>
          <text class="quote-card__author">-- {{ quoteContext.replyAuthorName }}</text>
        </view>

        <!-- 破冰话题建议（消息数极少时展示，2026-08-08 微信化重构保留） -->
        <IcebreakerSuggestions
          v-if="shouldShowIcebreakers"
          :items="chatStore.icebreakerItems"
          :loading="chatStore.loadingIcebreakers"
          @select="handleIcebreakerSelect"
          @refresh="handleRefreshIcebreakers"
        />

        <!-- 引用回复预览条 -->
        <view v-if="quoteReply" class="quote-reply-bar press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="cancelQuoteReply">
          <view class="quote-reply-bar__content">
            <text class="quote-reply-bar__label">
              {{ t('chat.quoteReplyLabel', { sender: quoteReply.sender === 'self' ? t('chat.quoteMe') : t('chat.quotePeer') }) }}
            </text>
            <text class="quote-reply-bar__body">{{ quoteReply.body }}</text>
          </view>
          <image class="quote-reply-bar__close" :src="iconSrc.close" mode="aspectFit" alt="" />
        </view>

        <!-- 微信风格输入栏：输入框 + 表情/更多/发送（语音模式已移除，仅保留文字输入） -->
        <view
          class="wechat-input-bar"
          :class="{ 'wechat-input-bar--keyboard-up': keyboardHeight > 0 }"
        >
          <!-- 输入框 -->
          <input
            v-model="draft"
            class="wechat-input-bar__input"
            :disabled="isSessionClosed"
            :placeholder="isSessionClosed ? t('chat.inputPlaceholderClosed') : (quoteReply ? t('chat.inputPlaceholderReply') : t('chat.inputPlaceholderMessage'))"
            :adjust-position="true"
            @focus="onInputFocus"
            @blur="onInputBlur"
            @input="onDraftChange"
            @keyboardheightchange="onKeyboardHeightChange" :aria-label="isSessionClosed ? t('chat.inputPlaceholderClosed') : (quoteReply ? t('chat.inputPlaceholderReply') : t('chat.inputPlaceholderMessage'))"
          />

          <template v-if="!inputFocused">
            <view
              class="wechat-input-bar__icon-btn press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
            >
              <image class="wechat-input-bar__icon-img" :src="iconSrc.smile" mode="aspectFit" alt="" />
            </view>
            <view
              class="wechat-input-bar__icon-btn wechat-input-bar__icon-btn--more press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              @tap="openMoreMenu"
            >
              <text class="wechat-input-bar__icon-text">+</text>
            </view>
          </template>
          <view
            v-else
            class="wechat-input-bar__send press-feedback"
            :class="{ 'wechat-input-bar__send--active': canSend }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="onSend"
          >
            <text class="wechat-input-bar__send-text">{{ t('chat.send') }}</text>
          </view>
        </view>

        <!-- 输入框空闲提示（停留 5 秒未输入时展示） -->
        <view v-if="showIdleIcebreakerHint && shouldShowIcebreakers" class="idle-hint">
          <text class="idle-hint__text">{{ t('chat.idleIcebreakerHint') }}</text>
        </view>

        <!-- 临时会话操作按钮（保留同意交换/结束会话入口） -->
        <view v-if="isTempSession" class="temp-action-row">
          <view
            class="temp-action-btn temp-action-btn--secondary press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleAcceptExchange"
          >
            <text class="temp-action-btn__text">{{ t('chat.acceptExchangeBtn') }}</text>
          </view>
          <view
            class="temp-action-btn temp-action-btn--danger press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleEndSession"
          >
            <text class="temp-action-btn__text temp-action-btn__text--danger">{{ t('chat.endSessionBtn') }}</text>
          </view>
        </view>
      </template>
    </view>

    <!--
      长按菜单遮罩：遮罩点击关闭，内容区阻止冒泡（P2 弹窗遮罩点击关闭）。
      源码层面直接使用 catchtap="noop" 阻止冒泡：
      mp-weixin 端 catchtap 原生阻止冒泡；H5 端由外层遮罩 @tap 兜底关闭。
      noop 为空操作 handler，因 mp-weixin 的 catchtap 必须绑定 handler。
    -->
    <view
      v-if="longPressMenu.visible"
      class="longpress-overlay"
      @tap="closeLongPressMenu"
      role="dialog"
      aria-modal="true"
      :aria-label="t('chat.longPressMenu.ariaLabel')"
    >
      <view
        class="longpress-menu"
  @tap.stop="noop"
      >
        <!-- 复制：将消息正文写入剪贴板（P2 长按复制支持） -->
        <view
          class="longpress-menu__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleCopyMessage"
          role="button"
          :aria-label="t('chat.longPressMenu.copyAria')"
        >
          <text class="longpress-menu__text">{{ t('chat.longPressMenu.copy') }}</text>
        </view>
        <view
          class="longpress-menu__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleQuoteMessage"
          role="button"
          :aria-label="t('chat.longPressMenu.quoteAria')"
        >
          <text class="longpress-menu__text">{{ t('chat.longPressMenu.quote') }}</text>
        </view>
        <!-- R4-00072：撤回端点仅临时会话存在，私信会话不展示撤回菜单项 -->
        <view
          v-if="longPressMenu.isSelf && isTempSession"
          class="longpress-menu__item longpress-menu__item--danger press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleRecallMessage"
          role="button"
          :aria-label="t('chat.longPressMenu.recallAria')"
        >
          <text class="longpress-menu__text longpress-menu__text--danger">{{ t('chat.longPressMenu.recall') }}</text>
        </view>
        <view
          class="longpress-menu__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="closeLongPressMenu"
          role="button"
          :aria-label="t('common.cancel')"
        >
          <text class="longpress-menu__text">{{ t('common.cancel') }}</text>
        </view>
      </view>
    </view>

    <!-- "+" 更多菜单：视频通话 -->
    <view
      v-if="moreMenuVisible"
      class="more-menu-overlay"
      @tap="closeMoreMenu"
      role="dialog"
      aria-modal="true"
      :aria-label="t('chat.moreMenuTitle')"
    >
      <view
        class="more-menu-sheet"
  @tap.stop="noop"
      >
        <view class="more-menu-sheet__title">
          <text class="more-menu-sheet__title-text">{{ t('chat.moreMenuTitle') }}</text>
        </view>
        <view class="more-menu-sheet__grid">
          <view
            v-if="featureFlags.videoCallEnabled"
            class="more-menu-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="goVideoCall"
            role="button"
            :aria-label="t('videoCall.entryLabel')"
          >
            <view class="more-menu-item__icon more-menu-item__icon--blue">
              <image class="more-menu-item__icon-emoji" :src="chatMenuIcons.videoCall" mode="aspectFit" alt="" />
            </view>
            <text class="more-menu-item__label">{{ t('videoCall.entryLabel') }}</text>
          </view>
        </view>
        <view
          class="more-menu-sheet__cancel press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="closeMoreMenu"
          role="button"
          :aria-label="t('common.cancel')"
        >
          <text class="more-menu-sheet__cancel-text">{{ t('common.cancel') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ========== 微信风格全屏布局（2026-08-08 重构） ========== */
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--c-bg-page);
  overflow: hidden;
}

/* 顶部导航：返回箭头 + 居中标题（微信聊天页风格） */
.chat-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 12rpx) var(--sp-4) var(--sp-2);
  background: var(--c-bg-page);
  flex-shrink: 0;
}

.chat-nav__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-border-light);
  flex-shrink: 0;
}

.chat-nav__back-icon {
  width: 36rpx;
  height: 36rpx;
}

.chat-nav__title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  padding: 0 var(--sp-2);
}

.chat-nav__title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-nav__spacer {
  width: 64rpx;
  flex-shrink: 0;
}

/* 消息滚动区：flex 子项必须 min-height:0（mp-weixin） */
.chat-scroll {
  flex: 1;
  min-height: 0;
  padding: 0 var(--sp-3);
  box-sizing: border-box;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: var(--sp-3) 0;
}

/* 微信式时间分隔条：居中灰字，无底色 */
.chat-time-bar {
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  padding: var(--sp-3) 0;
  flex-shrink: 0;
}

.chat-bottom-anchor {
  height: 1rpx;
}

/* 输入区：flex-shrink:0 + 底部安全区 */
.chat-input-area {
  flex-shrink: 0;
  padding: var(--sp-2) var(--sp-4) calc(env(safe-area-inset-bottom) + var(--sp-2));
  background: var(--c-bg-container);
  border-top: 1rpx solid var(--c-divider-light);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.chat-input-area--keyboard-up {
  padding-bottom: var(--sp-3);
}

.meta-copy--padded {
  padding: var(--sp-4);
}

.temp-banner {
  margin: var(--sp-2) var(--sp-4) 0;
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--c-brand-50) 0%, var(--c-romance-50) 100%);
  border: 1rpx solid var(--c-brand-shadow-tint);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  flex-shrink: 0;
}

.temp-banner__text {
  font-size: var(--fs-base);
  color: var(--c-romance-500);
  font-weight: 600;
}

.temp-banner__countdown {
  font-size: var(--fs-sm);
  color: var(--c-romance-500);
  font-weight: 500;
}

.temp-banner__hint {
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
}

/* 缘分速配：渐进解锁压缩横幅 */
.signal-banner {
  margin: var(--sp-2) var(--sp-4) 0;
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-border-light);
  flex-shrink: 0;
}

.meta-copy {
  color: var(--c-text-secondary);
  font-size: var(--fs-base);
  line-height: 1.6;
}

.meta-copy--warning {
  color: var(--c-error);
  font-weight: 600;
  text-align: center;
  padding: var(--sp-4) 0;
}

/* ========== 缘分速配：渐进解锁面板 ========== */
.signal-unlock {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.signal-unlock__progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.signal-unlock__count {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  font-weight: 600;
}

.signal-unlock__pct {
  font-size: var(--fs-sm);
  color: var(--c-brand-400);
  font-weight: 700;
}

.signal-unlock__bar {
  height: 12rpx;
  border-radius: var(--r-full);
  background: var(--c-neutral-100);
  overflow: hidden;
}

.signal-unlock__bar-fill {
  height: 100%;
  border-radius: var(--r-full);
  background: linear-gradient(90deg, var(--c-brand-400), var(--c-romance-400));
  transition: width var(--d-normal, 200ms) ease;
}

.signal-unlock__levels {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.signal-unlock__level {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  opacity: 0.55;
}

.signal-unlock__level--done {
  opacity: 1;
}

.signal-unlock__level--next {
  opacity: 1;
}

.signal-unlock__level-dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-full);
  background: var(--c-neutral-100);
  border: 1rpx solid var(--c-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
  flex-shrink: 0;
}

.signal-unlock__level-dot-icon {
  width: 24rpx;
  height: 24rpx;
}

.signal-unlock__level--done .signal-unlock__level-dot {
  background: var(--c-brand-500);
  border-color: var(--c-brand-500);
  color: var(--c-text-inverse);
}

.signal-unlock__level--next .signal-unlock__level-dot {
  border-color: var(--c-brand-400);
  color: var(--c-brand-400);
}

.signal-unlock__level-text {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
}

.signal-unlock__hint-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.signal-unlock__hint {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

.signal-unlock__hint--done {
  color: var(--c-brand-400);
  font-weight: 600;
}

.signal-unlock__hint-action {
  display: inline-flex;
  align-items: center;
  gap: 2rpx;
  font-size: var(--fs-sm);
  color: var(--c-romance-500);
  font-weight: 600;
}

.signal-unlock__hint-arrow {
  width: 20rpx;
  height: 20rpx;
  flex-shrink: 0;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* ========== 微信风格输入栏 ========== */
.wechat-input-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-height: 88rpx;
  padding: var(--sp-3) var(--sp-4);
  padding-bottom: calc(var(--sp-3) + env(safe-area-inset-bottom));
  background: var(--c-bg-container);
  border-top: 1rpx solid var(--c-border-light);
  border-radius: var(--r-lg);
  box-sizing: border-box;
}

.wechat-input-bar--keyboard-up {
  padding-bottom: var(--sp-3);
}

.wechat-input-bar__icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  background: var(--c-neutral-50);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wechat-input-bar__icon-btn--more {
  font-weight: 700;
}

.wechat-input-bar__icon-text {
  font-size: var(--fs-lg);
  line-height: 1;
}

.wechat-input-bar__icon-img {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-text-secondary);
  flex-shrink: 0;
}

/* 录音中状态 */
.wechat-input-bar__icon-btn--recording {
  background: var(--c-error);
  transform: scale(1.1);
}

.wechat-input-bar__recording-indicator {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.wechat-input-bar__recording-pulse {
  width: 16rpx;
  height: 16rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-neutral-0);
  animation: recording-pulse var(--d-spinner, 800ms) ease-in-out infinite;
}

@keyframes recording-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

.wechat-input-bar__recording-text {
  font-size: 22rpx;
  color: var(--c-neutral-0);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.wechat-input-bar__input {
  flex: 1;
  height: 64rpx;
  border-radius: var(--r-md);
  padding: 0 var(--sp-4);
  background: var(--c-neutral-50);
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  box-sizing: border-box;
}

.wechat-input-bar__send {
  background: var(--c-brand);
  padding: 0 var(--sp-6);
  border-radius: var(--r-md);
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--s-brand-sm);
}

.wechat-input-bar__send-text {
  color: var(--c-text-inverse);
  font-size: var(--fs-lg);
  font-weight: 600;
}

/* 发送按钮高亮状态（输入框非空时） */
.wechat-input-bar__send--active {
  background: var(--c-brand-600);
  box-shadow: var(--s-brand-md);
}

/* 语音功能已移除：voice-hold 按住说话按钮样式与键盘切换按钮文字样式一并下线 */

/* ========== 临时会话操作按钮 ========== */
.temp-action-row {
  display: flex;
  gap: var(--sp-3);
  margin-top: var(--sp-3);
}

.temp-action-btn {
  flex: 1;
  height: 80rpx;
  border-radius: var(--r-md);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid var(--c-border-default);
  background: var(--c-bg-container);
}

.temp-action-btn--secondary {
  background: var(--c-brand-50);
  border-color: var(--c-brand-200);
}

.temp-action-btn--danger {
  background: var(--c-romance-50);
  border-color: var(--c-romance-200);
}

.temp-action-btn__text {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  font-weight: 600;
}

.temp-action-btn__text--danger {
  color: var(--c-error);
}

/* ========== 输入框空闲提示 ========== */
.idle-hint {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5);
  margin-top: var(--sp-2);
  border-radius: var(--r-md);
  background: linear-gradient(135deg, var(--c-brand-bg-tint), var(--c-romance-bg-tint));
  border: 1rpx solid var(--c-location-bg);
  animation: idle-fade-in var(--d-bounce, 400ms) ease;
}

.idle-hint__text {
  font-size: var(--fs-sm);
  color: var(--c-brand-400);
  line-height: 1.4;
}

@keyframes idle-fade-in {
  from {
    opacity: 0;
    transform: translateY(-4rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 引用上下文卡片 ========== */
.quote-card {
  padding: var(--sp-5) var(--sp-6);
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--c-brand-50) 0%, var(--c-bg-page) 100%);
  border-left: 6rpx solid var(--c-brand-400);
  margin-bottom: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.quote-card__header {
  display: flex;
  align-items: center;
}

.quote-card__label {
  font-size: var(--fs-sm);
  color: var(--c-brand-400);
  font-weight: 600;
}

.quote-card__content {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 3em;
  /* #endif */
}

.quote-card__author {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  align-self: flex-end;
}

/* ========== 引用回复预览条 ========== */
.quote-reply-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-4);
  margin-bottom: var(--sp-3);
  border-radius: var(--r-md);
  background: linear-gradient(135deg, var(--c-romance-50) 0%, var(--c-bg-romance) 100%);
  border-left: 4rpx solid var(--c-romance-500);
  animation: slide-up-in var(--d-normal, 200ms) ease;
}

.quote-reply-bar__content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
  flex: 1;
}

.quote-reply-bar__label {
  font-size: var(--fs-xs);
  color: var(--c-romance-500);
  font-weight: 600;
}

.quote-reply-bar__body {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quote-reply-bar__close {
  width: 28rpx;
  height: 28rpx;
  padding: var(--sp-2);
  flex-shrink: 0;
}

/* ========== 长按菜单 ========== */
.longpress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-black-overlay-mid);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.longpress-menu {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  overflow: hidden;
  min-width: 240rpx;
  box-shadow: var(--s-lg);
  animation: modal-scale-in var(--d-normal, 200ms) ease;
}

.longpress-menu__item {
  padding: var(--sp-7) var(--sp-8);
  text-align: center;
  transition: background var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.longpress-menu__item:active {
  background: var(--c-bg-page);
  transform: scale(0.98);
}
/* #endif */

/* #ifdef H5 */
.longpress-menu__item--danger:active {
  background: var(--c-error-bg-tint);
}
/* #endif */

.longpress-menu__text {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
}

.longpress-menu__text--danger {
  color: var(--c-error);
}


/* ========== "+" 更多菜单（视频通话） ========== */
.more-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-black-overlay-mid);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: more-menu-fade-in var(--d-normal, 200ms) ease-out;
}

@keyframes more-menu-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.more-menu-sheet {
  width: 100%;
  background: var(--c-bg-container);
  border-top-left-radius: var(--r-xl, 32rpx);
  border-top-right-radius: var(--r-xl, 32rpx);
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom, 0));
  box-sizing: border-box;
  animation: more-menu-slide-up var(--d-slow, 240ms) cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes more-menu-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.more-menu-sheet__title {
  text-align: center;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid var(--c-border-light);
}

.more-menu-sheet__title-text {
  font-size: var(--fs-md, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
}

.more-menu-sheet__grid {
  display: flex;
  flex-direction: row;
  gap: 32rpx;
  padding: 32rpx 16rpx;
  justify-content: flex-start;
}

.more-menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  width: 144rpx;
  padding: 16rpx 0;
  border-radius: var(--r-md, 16rpx);
  transition: background var(--d-fast, 160ms) ease-out;
}

.more-menu-item__icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-circle, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-menu-item__icon--red {
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  box-shadow: var(--s-romance);
}

.more-menu-item__icon--blue {
  background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
  box-shadow: var(--s-info-soft);
}

.more-menu-item__icon-emoji {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-text-inverse);
}

.more-menu-item__label {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-primary);
  line-height: 1.4;
}

.more-menu-sheet__cancel {
  margin-top: 16rpx;
  height: 88rpx;
  border-radius: var(--r-md, 16rpx);
  background: var(--c-bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity var(--d-fast, 160ms) ease-out;
}

.more-menu-sheet__cancel-text {
  font-size: var(--fs-md, 28rpx);
  color: var(--c-text-primary);
  font-weight: 500;
}


/* ========== 返回按钮 ========== */
.chat-session-back {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-5) var(--sp-8);
  padding-top: calc(env(safe-area-inset-top) + var(--sp-5));
}

.chat-session-back__arrow {
  font-size: var(--fs-3xl);
  color: var(--c-brand-400);
  font-weight: 700;
}

.chat-session-back__text {
  font-size: var(--fs-lg);
  color: var(--c-brand-400);
  font-weight: 500;
}

</style>
