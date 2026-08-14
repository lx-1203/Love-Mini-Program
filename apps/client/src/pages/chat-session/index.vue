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
import { onLoad, onShow, onHide, onUnload, onShareAppMessage } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import ChatBubble from "../../components/chat/ChatBubble.vue";
import ActivityCard, { type ActivityCardData } from "../../components/chat/ActivityCard.vue";
import MatchGreetingTip from "../../components/chat/MatchGreetingTip.vue";
import EmojiPanel from "../../components/chat/EmojiPanel.vue";
import { useMessagesStore, type MessageItem } from "../../stores/messages";
import { useChatStore } from "../../stores/chat";
// 2026-08-09 微信 1:1 重构：正在输入提示的 mock 演示模式判定
import { useMock } from "../../stores/helpers/use-mock";
// 2026-08-09 微信 1:1 重构：「···」菜单举报入口复用举报 Store
import { useReportStore } from "../../stores/report";
import { usePageAccess } from "../../composables/usePageAccess";
import { chatPageRequirements } from "../../config/page-access";
// 2026-08-09 免踢登录：未登录切换进本页不跳登录页，由 LockScreen（未登录版）引导
import { useSessionStore } from "../../stores/session";
import LockScreen from "../../components/common/LockScreen.vue";
import { IMAGE_PATHS } from "../../config/images";
import { ROUTES } from "../../constants/routes";
import { STORAGE_KEYS } from "../../constants/storage-keys";
import { lightHaptic } from "../../utils/haptic";
import { openAppPath } from "../../utils/navigation";
// 2026-08-09 微信 1:1 重构：正在输入头像 / 转发会话头像的媒体 URL 解析
import { resolveMediaUrl, chooseImages } from "../../utils/media";
import { wsClient } from "../../services/websocket";
import { clientApi, type UniUploadFileLike } from "../../services/api";
import { request } from "../../services/http";
import type { OnlineStatusView } from "../../services/generated/api-types-supplement";
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
  countUserMessages,
  formatTempCountdown,
  isMessageSelf,
  parsePrefillMessage,
  parseQuoteContext,
  resolvePeerUserId as resolvePeerUserIdVm,
  toChatBubbleDeliveryStatus,
} from "./view-models";
import { recallTempChatMessageApi } from "./api";
// 统一常量：倒计时计时器间隔
// 修复（严格模式 noUnusedLocals）：RECORDING_TICK_MS / RECORDER_MAX_DURATION_MS /
// RECORDER_MIN_DURATION_SECONDS 仅在已移除的录音功能中使用；
// IDLE_ICEBREAKER_DELAY_MS 随输入栏上方破冰卡片流一并移除（2026-08-09 微信化重构）。
import { COUNTDOWN_TICK_MS } from "../../constants/chat";

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

/** SVG 图标资源路径（语音麦克风已随对应功能移除；全部 SVG，无 emoji 字符） */
const iconSrc = {
  message: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
  check: IMAGE_PATHS.ICONS_COMMON.CHECK_SVG,
  checkWhite: IMAGE_PATHS.ICONS_COMMON.CHECK_WHITE_SVG,
  close: IMAGE_PATHS.ICONS_COMMON.CLOSE_SVG,
  chevronRight: IMAGE_PATHS.ICONS_COMMON.CHEVRON_RIGHT_SVG,
  /* 2026-08-09 微信 1:1 重构：表情按钮（smile.svg）/ 图片占位（camera.png） */
  smile: IMAGE_PATHS.ICONS_EMOJI.SMILE,
  camera: IMAGE_PATHS.ICONS_COMMON.CAMERA,
} as const;

const draft = ref("");
const sessionId = ref<string | null>(null);
const targetUserId = ref<string | null>(null);
const pageErrorMessage = ref<string | null>(null);
const tempCountdown = ref("");
/** Phase Feedback3 P2.4：是否缘分速配信号会话（?fromSignal=1，触发渐进解锁面板） */
const fromSignal = ref(false);

/** 引用上下文（来自兴趣圈回复的破冰场景） */
const quoteContext = ref<QuoteContext | null>(null);

/** 引用回复状态（用户长按消息后选择"引用"） */
const quoteReply = ref<QuoteReply | null>(null);

/** 长按菜单状态 */
const longPressMenu = ref<LongPressMenuState>(buildInitialLongPressMenu());

let countdownTimer: ReturnType<typeof setInterval> | null = null;

/* ========== 输入栏状态（2026-08-09 微信化重构） ========== */
/** 输入框是否聚焦 */
const inputFocused = ref(false);
/** 键盘高度（用于动态调整输入栏 padding-bottom，避免遮挡） */
const keyboardHeight = ref(0);
/** 表情面板是否展开（点表情按钮 toggle，展开时收起键盘） */
const emojiPanelVisible = ref(false);

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

/**
 * 2026-08-09 微信 1:1 重构：聊天首条固定破冰提示。
 * 展示条件：会话尚无任何用户消息（system 消息不计）。
 */
const showMatchGreeting = computed(
  () => userMessageCount.value === 0 && !pageErrorMessage.value && !messagesStore.loading
);

/** 破冰按钮文案：优先个性化 icebreakerItems 前 2 条，不足时用固定文案补齐 */
const matchGreetingButtons = computed(() => {
  const items = chatStore.icebreakerItems
    .slice(0, 2)
    .map((i) => i.content)
    .filter((c) => c.length > 0);
  const fallback = [t("chat.matchGreeting.buttonFallback1"), t("chat.matchGreeting.buttonFallback2")];
  return items.length >= 2 ? items : [...items, ...fallback].slice(0, 2);
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
  const session = currentSession.value;
  // 2026-08-09：私信会话（MessageSession）用 partnerId；临时会话
  // （ChatSessionView）无 partnerId 字段，改用 recommendedPersonId
  const peerId =
    session && "partnerId" in session
      ? session.partnerId
      : session && "recommendedPersonId" in session
        ? session.recommendedPersonId
        : null;
  const resolvedPeerId = peerId || targetUserId.value;
  if (!resolvedPeerId) return;
  // P0-1 修复（2026-08-08）：profile 是 tabBar 页，navigateTo 会 fail（can not navigateTo
  // a tabbar page）→ 改用 openAppPath（switchTab + pending-tab-query 桥接传 userId）
  // R4-00076：路径走 ROUTES 常量，避免硬编码
  openAppPath(`${ROUTES.PROFILE.INDEX}?userId=${encodeURIComponent(resolvedPeerId)}`);
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

/** 底部锚点 id（常量，模板与脚本共用） */
const BOTTOM_ANCHOR_ID = "chat-bottom-anchor";

/** 删除消息本地存储 key（2026-08-09 微信化重构：删除为本地持久隐藏，微信语义；2026-08-10 统一至 STORAGE_KEYS） */
const DELETED_MESSAGES_STORAGE_KEY = STORAGE_KEYS.DELETED_MESSAGE_IDS;

/** 已删除消息 ID 集合（本地持久隐藏，重进会话不恢复；real 模式同步调用后端 DELETE /messages/{messageId}，见 handleDeleteMessage） */
const deletedMessageIds = ref<Set<string>>(
  new Set<string>((uni.getStorageSync(DELETED_MESSAGES_STORAGE_KEY) as string[]) ?? [])
);

/**
 * 消息行模型：按微信 5 分钟规则在消息流中插入时间分隔条。
 * 纯逻辑见 view-models.ts（buildChatMessageRows / shouldShowTimeBar / formatChatTimeBar）。
 * 2026-08-09：过滤本地删除的消息（页面级持久隐藏）。
 */
const messageRows = computed(() =>
  buildChatMessageRows(currentMessagesView.value).filter((row) => {
    if (row.type !== "message" || !row.message) return true;
    return !deletedMessageIds.value.has(row.message.id);
  })
);

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
/** 是否已滚到底部附近（决定新消息是否自动滚底 / 提示条展示） */
let nearBottom = true;
/** 2026-08-09 微信化重构：浏览历史时收到新消息的「有新消息」提示条 */
const unreadHintVisible = ref(false);
/** 滚动区视口/内容高度缓存（onScroll 每帧查询会卡顿，仅在新消息到达时查询一次） */
let scrollViewportHeight = 0;
let scrollContentHeight = 0;

/**
 * 记录滚动位置并维护 nearBottom（微信行为：贴底自动滚底，浏览历史亮提示条）。
 * 修复（2026-08-09）：原实现 onScroll 从不更新 nearBottom（恒为 onShow 的 true），
 * 导致「浏览历史时收到新消息强制滚底」，提示条机制无从生效。
 */
function onScroll(e: { detail?: { scrollTop?: number } }) {
  curScrollTop = e?.detail?.scrollTop ?? 0;
  const bottom = scrollContentHeight - scrollViewportHeight;
  if (bottom > 0) {
    // 距底 < 120px 视为贴底（阈值固定字面量，无对应 token 档位）
    nearBottom = bottom - curScrollTop < 120;
    if (nearBottom && unreadHintVisible.value) unreadHintVisible.value = false;
  }
}

/**
 * 上拉加载更早历史消息（微信行为：加载后视口不跳）。
 * 通过「加载前 scrollHeight - 当前 scrollTop」测量距底距离，
 * 加载后设置 scrollTop = 新scrollHeight - 原距底距离 保持视口。
 */
function onScrollToUpper() {
  // 2026-08-09 修复：临时匿名会话跳过上拉分页——fetchOlderMessages 走私信接口
  // （会话 ID 为 Long 数字主键），temp 会话（"session-{a}-{b}-{hex}"）调用必然 500；
  // 且 temp-chat 的 loadSession 一次性返回全部消息，无历史分页概念。
  if (
    loadingOlder.value ||
    !sessionId.value ||
    !messagesStore.messageHasMore ||
    isTempSession.value
  ) {
    return;
  }
  void (async () => {
    loadingOlder.value = true;
    try {
      const before = await queryScrollHeight();
      await messagesStore.fetchOlderMessages(sessionId.value!, messagesStore.messagePage + 1);
      await nextTick();
      const after = await queryScrollHeight();
      // 2026-08-09：同步更新滚动区高度缓存（nearBottom 计算依赖）
      scrollContentHeight = after;
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

/** 查询消息滚动区视口高度（与 queryScrollHeight 同款，2026-08-09 新增：nearBottom 计算用） */
function queryScrollViewportHeight(): Promise<number> {
  return new Promise((resolve) => {
    uni
      .createSelectorQuery()
      .in(getCurrentInstance())
      .select(".chat-scroll")
      .fields({ size: true }, (res) => {
        const info = Array.isArray(res) ? res[0] : res;
        resolve(info?.height ?? 0);
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
 * 新消息到达时的滚动策略（2026-08-09 微信化重构）：
 * - 贴底（nearBottom）：自动滚底，最新消息始终可见；
 * - 浏览历史（未贴底）：不打断阅读，亮「有新消息」提示条，点击后跳转最新。
 * 上拉加载旧消息（loadingOlder）时长度也变化，但由 onScrollToUpper 保持视口，此处跳过。
 */
watch(
  () => messagesStore.currentMessages.length,
  () => {
    if (loadingOlder.value) return;
    if (nearBottom) {
      scrollToBottom();
    } else {
      // 仅在「未贴底 + 有新消息」时查询一次滚动区高度，缓存供 onScroll 的 nearBottom 计算
      // （避免 onScroll 每帧查询导致滚动卡顿）
      void Promise.all([queryScrollHeight(), queryScrollViewportHeight()]).then(
        ([contentH, viewportH]) => {
          scrollContentHeight = contentH;
          scrollViewportHeight = viewportH;
          unreadHintVisible.value = true;
        }
      );
    }
  }
);

/** 点击「有新消息」提示条：跳转最新并隐藏（微信行为：提示条在底部，点击跳底） */
function jumpToLatest() {
  unreadHintVisible.value = false;
  nearBottom = true;
  scrollToBottom();
}

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

// 2026-08-09 免踢登录：未登录 → 展示 LockScreen 引导，不渲染会话、不发鉴权请求
const sessionStore = useSessionStore();
const isUnlocked = computed(() => sessionStore.isLoggedIn);
const completionPercent = computed(() => sessionStore.profileCompletion);

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
 * 2026-08-09 修复（喜欢后流程 500）：先判定会话类型再加载消息。
 * 原实现无条件调用 messagesStore.fetchSessionMessages（私信接口，会话 ID 为
 * Long 数字主键）；临时匿名会话的 ID 为 "session-{a}-{b}-{hex}" 字符串
 * （TempChatSessionService 生成），传入该接口触发类型转换失败返回 500，
 * 且 errorMessage 被置位导致页面消息区被错误态遮罩、发送/交流链路中断。
 *
 * 防止 onShow 与 onLoad 异步创建会话竞态：仅在 sessionId 就绪时执行。
 */
async function loadSessionData(): Promise<void> {
  if (!sessionId.value) {
    return;
  }

  // 会话类型判定：临时匿名会话不存在于私信会话列表（messagesStore.sessions），
  // 或虽存在但标记为 temp_anonymous——两者均走 temp-chat 链路。
  const session = messagesStore.sessions.find((s) => s.id === sessionId.value);
  const isTemp = !session || session.sessionType === "temp_anonymous";

  if (isTemp) {
    // 临时匿名会话：temp-chat 接口加载会话（返回会话含全部消息），
    // 同步到 messagesStore 单一数据源后渲染
    await chatStore.loadSession(sessionId.value);
    syncChatStoreMessagesToMessagesStore();
    return;
  }

  // Task 1.1.6：等待 messagesStore 数据加载完成，避免页面渲染空消息列表
  await messagesStore.fetchSessionMessages(sessionId.value);
}

onLoad(async (query) => {
  // 2026-08-09 免踢登录：未登录展示 LockScreen 引导，不创建会话、不发鉴权请求
  if (!isUnlocked.value) return;

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
  // 2026-08-09 免踢登录：未登录展示 LockScreen 引导，不加载会话/消息/破冰话题（避免 401）
  if (!isUnlocked.value) return;

  // 记录页面进入面包屑，便于在异常发生时回溯用户跳转路径
  addBreadcrumb("navigation", "page_enter", {
    url: "/pages/chat-session/index",
    sessionId: sessionId.value,
  });

  if (!sessionId.value) {
    return;
  }

  // 红点修复（2026-08-08）：标记当前正在查看的会话。
  // onShow/onHide 配对覆盖「压栈/切后台」场景：
  // 会话打开期间收到的新消息不累加未读数，退出后恢复累加。
  messagesStore.setActiveSession(sessionId.value);
  // 2026-08-10 功能补齐：进入会话时拉取对方真实在线状态
  void loadPeerOnlineStatus();
  nearBottom = true;
  void nextTick(() => {
    // 2026-08-09 微信化重构：初始化滚动区高度缓存
    // （onScroll 的 nearBottom 计算依赖该缓存，不初始化则浏览历史时 nearBottom 恒为 true）
    void Promise.all([queryScrollHeight(), queryScrollViewportHeight()]).then(
      ([contentH, viewportH]) => {
        scrollContentHeight = contentH;
        scrollViewportHeight = viewportH;
      }
    );
    scrollToBottom();
  });

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
  // 2026-08-09：切后台时复位「正在输入」态与计时器；2026-08-10 B1④：通知对方停止输入
  clearTypingTimer();
  peerTypingLocal.value = false;
  clearTypingStopTimer();
});

onUnload(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  clearTypingTimer();
  clearTypingStopTimer();
});

/** 当前会话信息（优先从 messagesStore 获取） */
const currentSession = computed(() => {
  // 2026-08-09 修复：临时匿名会话由 chatStore 管理生命周期（loadSession 后写入
  // activeSession），不在 messagesStore.sessions（仅私信会话）中——原实现查找不到
  // 时返回 null，导致 isTempSession 恒为 false，temp 会话的发送/撤回走错私信链路。
  // 现回退到 chatStore.activeSession，保证 temp 会话也能被识别。
  return (
    messagesStore.sessions.find((s) => s.id === sessionId.value) ||
    chatStore.activeSession ||
    null
  );
});

/**
 * 是否为临时匿名会话。
 *
 * 2026-08-09 修复：私信会话（MessageSession）带 sessionType 字段；
 * 临时会话（ChatSessionView = TempChatSession & contactExchangeLabel）由
 * chatStore.activeSession 管理，**无 sessionType 字段**，以 contactExchange
 * 标识——原实现仅按 sessionType 判断，temp 会话恒判为 false。
 */
const isTempSession = computed(() => {
  const session = currentSession.value;
  if (!session) return false;
  return "sessionType" in session
    ? session.sessionType === "temp_anonymous"
    : "contactExchange" in session;
});

/**
 * 临时会话是否已到期（review #51：原实现用 tempCountdown === "已结束" 比较中文文案，
 * 依赖展示文案判断状态；现改为基于 closesAt 计算，与文案解耦）。
 */
const tempSessionEnded = computed(() => {
  if (!isTempSession.value) return false;
  const session = currentSession.value;
  if (!session || !session.closesAt) return false;
  return Date.parse(session.closesAt) - Date.now() <= 0;
});

/** 是否为私信会话（MessageSession 才带 sessionType="private"） */
const isPrivateSession = computed(() => {
  const session = currentSession.value;
  if (!session) return false;
  return "sessionType" in session ? session.sessionType === "private" : false;
});

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

/* ========== 顶部导航：对方状态文字 + 「···」更多菜单（2026-08-09 微信化重构） ========== */

/** 2026-08-10 功能补齐：对方真实在线状态（GET /online-status?userIds= 批量接口） */
const peerOnlineStatus = ref<"online" | "away" | "offline" | null>(null);

/** 拉取对方在线状态（失败静默，保持默认展示） */
async function loadPeerOnlineStatus(): Promise<void> {
  const peerId = resolvePeerUserId();
  if (!peerId) return;
  try {
    const data = await request<OnlineStatusView[]>({
      url: `/online-status?userIds=${encodeURIComponent(String(peerId))}`,
      method: "GET",
    });
    const item = data?.[0];
    if (item) {
      peerOnlineStatus.value =
        (item.status as "online" | "away" | "offline" | undefined) ??
        (item.online ? "online" : "offline");
    }
  } catch (_e) {
    // 静默：在线状态失败不影响聊天主流程
  }
}

/**
 * 对方在线状态文字（微信：昵称下方 12px 灰字）。
 * - mock 模式：按 sessionId 哈希取「在线/刚刚活跃/离线」三态（演示用）；
 * - real 模式：GET /online-status 真实数据，未取到/非私信会话回退「刚刚活跃」。
 */
const peerStatusText = computed(() => {
  if (!isPrivateSession.value) return ""; // 临时会话沿用 temp-banner，不展示状态文字
  if (useMock()) {
    const seed = (sessionId.value ?? "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const mod = seed % 3;
    return mod === 0 ? t("chat.statusOnline") : mod === 1 ? t("chat.statusActive") : t("chat.statusOffline");
  }
  if (peerOnlineStatus.value) {
    return peerOnlineStatus.value === "online"
      ? t("chat.statusOnline")
      : peerOnlineStatus.value === "away"
        ? t("chat.statusActive")
        : t("chat.statusOffline");
  }
  return t("chat.statusActive");
});

/** 顶部「···」菜单是否展开 */
const navMenuVisible = ref(false);
/** 本次会话内已拉黑的对方（本会话内隐藏操作入口；TODO(backend): POST /users/{id}/block） */
const blockedPeerIds = ref<Set<string>>(new Set());

/** 当前会话是否免打扰（顶部菜单切换文案用） */
const isSessionMuted = computed(() => {
  const session = currentSession.value;
  if (!session || !("id" in session)) return false;
  return messagesStore.sessions.find((s) => s.id === session.id)?.muted ?? false;
});

/** 打开顶部「···」菜单 */
function openNavMenu() {
  lightHaptic();
  navMenuVisible.value = true;
}

/** 关闭顶部「···」菜单 */
function closeNavMenu() {
  navMenuVisible.value = false;
}

/** 查看对方主页：复用缘分速配的 partnerId 解析与跳转（ROUTES.PROFILE.INDEX） */
function handleViewProfile() {
  closeNavMenu();
  goSignalProfile();
}

/**
 * 会话页分享（2026-08-10 A3 补齐）：
 * 微信不支持直接分享会话，分享卡片指向对方个人主页
 * （对方昵称 + 主页路径，接收方点开即浏览对方主页）。
 */
onShareAppMessage(() => {
  const peerId = resolvePeerUserId();
  if (peerId === null) {
    return { title: t("share.shareVillage"), path: ROUTES.TAB.VILLAGE };
  }
  const session = currentSession.value;
  const name =
    session && "partnerName" in session && session.partnerName
      ? session.partnerName
      : t("chat.privateMessageTitle");
  return {
    title: t("profile.shareProfileTitle", { name }),
    path: `${ROUTES.PROFILE.INDEX}?userId=${encodeURIComponent(String(peerId))}`,
  };
});

/**
 * 切换消息免打扰（2026-08-10 B1③：real 模式同步后端 PUT /conversations/{id}/mute，
 * 后端成功才生效；mock 分支保持本地状态）。
 * 临时匿名会话（TempChatSession）无后端 mute 元数据，保持前端本地并降级提示。
 */
async function handleToggleMute() {
  closeNavMenu();
  const session = currentSession.value;
  if (!session || !("id" in session)) return;
  const sid = session.id as string;
  const muted = messagesStore.sessions.find((s) => s.id === sid)?.muted ?? false;
  if (isTempSession.value && !useMock()) {
    // 临时会话免打扰降级：仅本地提示（后端会话元数据不含 muted 字段）
    messagesStore.setSessionMuted(sid, !muted);
    uni.showToast({ title: t("chat.muteLocalOnly"), icon: "none" });
    return;
  }
  await messagesStore.setSessionMuted(sid, !muted);
}

/** 拉黑：2026-08-10 功能补齐——real 模式调用 POST /users/{id}/block（后端生效：会话过滤/发送拦截/推荐排除），
 *  mock 模式保持页面级集合演示；成功后退回列表（被拉黑会话不再展示）。 */
function handleBlock() {
  closeNavMenu();
  uni.showModal({
    title: t("chat.nav.blockConfirmTitle"),
    content: t("chat.nav.blockConfirmContent"),
    confirmText: t("chat.nav.block"),
    cancelText: t("common.cancel"),
    success: async (res) => {
      if (!res.confirm) return;
      const peerId = resolvePeerUserId();
      if (peerId === null) return;
      if (useMock()) {
        blockedPeerIds.value.add(String(peerId));
        uni.showToast({ title: t("chat.nav.blockDone"), icon: "none" });
        return;
      }
      try {
        await request({
          url: `/users/${encodeURIComponent(String(peerId))}/block`,
          method: "POST",
        });
        blockedPeerIds.value.add(String(peerId));
        uni.showToast({ title: t("chat.nav.blockDone"), icon: "success" });
        // 拉黑后后端会过滤该会话，返回上一页
        setTimeout(() => {
          uni.navigateBack();
        }, 600);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("chat.nav.blockFailed");
        uni.showToast({ title: message, icon: "none" });
      }
    },
  });
}

/** 举报：复用举报 Store，原因走 ActionSheet 预设（USER 类型） */
function handleReport() {
  closeNavMenu();
  const peerId = resolvePeerUserId();
  if (peerId === null) {
    uni.showToast({ title: t("chat.nav.reportReasonHint"), icon: "none" });
    return;
  }
  const reasons = [
    t("chat.nav.reportReasonHarass"),
    t("chat.nav.reportReasonAbuse"),
    t("chat.nav.reportReasonFraud"),
    t("chat.nav.reportReasonOther"),
  ];
  uni.showActionSheet({
    itemList: reasons,
    success: async (res) => {
      const reason = reasons[res.tapIndex];
      if (!reason) return;
      try {
        await useReportStore().reportTarget("USER", peerId, reason);
        uni.showToast({ title: t("chat.nav.reportDone"), icon: "none" });
      } catch (_e) {
        uni.showToast({ title: t("chat.operationFailed"), icon: "none" });
      }
    },
  });
}

/** 启动临时会话倒计时 */
function startTempCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  updateTempCountdown();

  const session = currentSession.value;
  if (isTempSession.value && session?.closesAt) {
    countdownTimer = setInterval(updateTempCountdown, COUNTDOWN_TICK_MS);
  }
}

function updateTempCountdown() {
  if (!isTempSession.value) {
    tempCountdown.value = "";
    return;
  }
  const session = currentSession.value;
  if (!session || !session.closesAt) {
    tempCountdown.value = "";
    return;
  }

  const now = Date.now();
  const closesAt = Date.parse(session.closesAt);
  const diff = closesAt - now;

  // 使用纯函数格式化倒计时（R4-00077：已结束时返回 null，不再返回硬编码中文）
  tempCountdown.value = formatTempCountdown(diff) ?? "";

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
    // 2026-08-09 微信化重构：mock 模式模拟对方「正在输入」（1.5~3s 后出现）
    scheduleTypingSimulation();
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

/* ========== 输入栏事件处理（2026-08-09 微信化重构） ========== */

/** 输入框聚焦：收起表情面板（微信行为：键盘与表情面板互斥） */
function onInputFocus() {
  inputFocused.value = true;
  emojiPanelVisible.value = false;
}

/** 输入框失焦（表情面板展开时 input 为 blur 态，面板由 toggleEmojiPanel 控制） */
function onInputBlur() {
  inputFocused.value = false;
}

/** 微信风格输入栏：发送按钮点击（委托给 sendText） */
async function onSend() {
  await sendText();
}

/** 键盘高度变化：动态调整输入栏 padding-bottom（mp-weixin 适用） */
function onKeyboardHeightChange(e: { height: number }) {
  keyboardHeight.value = e?.height ?? 0;
}

/**
 * 输入内容变化（2026-08-10 B1④）：real 模式向对方推送「正在输入」状态
 * （停顿 2.5s 自动发 typing=false；mock 模式无操作）。
 */
function onDraftChange() {
  notifyTyping();
}

/** 切换表情面板：展开时收起键盘（微信行为：表情面板与键盘互斥） */
function toggleEmojiPanel() {
  emojiPanelVisible.value = !emojiPanelVisible.value;
  if (emojiPanelVisible.value) {
    uni.hideKeyboard();
  }
}

/**
 * 选中表情：直接发送 kind="emoji" 表情消息（2026-08-09 表情包机制）。
 * 与私信/临时会话两条链路共用：temp 走 chatStore.sendText(kind="emoji")，
 * 私信走 messagesStore.sendMessage(kind="emoji")，后端已支持 EMOJI 白名单与
 * utf8mb4 存储。发送失败 toast 提示（面板已收起，草稿不受影响）。
 */
async function handleEmojiSelect(emoji: string) {
  if (!sessionId.value) return;
  emojiPanelVisible.value = false;
  if (isSessionClosed.value) {
    uni.showToast({ title: t("chat.sessionClosedCannotSend"), icon: "none" });
    return;
  }
  try {
    if (isTempSession.value) {
      await chatStore.sendText(emoji, "emoji");
      // Task 1.1.1：单一数据源 - chatStore 操作后同步消息到 messagesStore
      syncChatStoreMessagesToMessagesStore();
    } else {
      await messagesStore.sendMessage(sessionId.value, emoji, undefined, "emoji");
    }
    // 表情消息发送后同样触发对方「正在输入」演示（mock 模式）
    scheduleTypingSimulation();
  } catch (error) {
    captureException(error, {
      source: "chat.sendEmoji",
      sessionId: sessionId.value,
    });
    uni.showToast({ title: t("chat.sendFailed"), icon: "none" });
  }
}

/* ========== 破冰首条提示（2026-08-09 微信化重构） ========== */

/** 点击破冰快捷按钮：直接发送该文案（sendText 发送成功后自动清空草稿） */
async function handleGreetingSend(text: string) {
  if (!text.trim() || !sessionId.value) return;
  draft.value = text;
  await sendText();
}

/* ========== 正在输入提示（2026-08-09 微信化重构，2026-08-10 B1④ 接通 WS） ========== */

/** mock 模式演示输入态（仅 mock 使用；real 由 messagesStore.typingMap 驱动） */
const peerTypingLocal = ref(false);
/** typing 演示计时器 ID */
let typingTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 对方是否正在输入：
 * - real 模式：由 WS /user/queue/typing 事件 → messagesStore.typingMap[sessionId] 驱动
 *   （后端 MessageWebSocketHandler.handleTyping 推送，3s 自动复位兜底）；
 * - mock 模式：发送成功后随机 1.5~3s 模拟对方开始输入，2~4s 后停止（增强实时感）。
 */
const peerTyping = computed(() => {
  if (useMock()) return peerTypingLocal.value;
  return !!messagesStore.typingMap[sessionId.value ?? ""];
});

/**
 * mock 模式演示：发送成功后随机 1.5~3s 模拟对方开始输入，2~4s 后停止（增强实时感）。
 * 仅私信会话演示（临时会话不模拟，避免误导）。
 */
function scheduleTypingSimulation() {
  if (!useMock() || isTempSession.value) return;
  clearTypingTimer();
  typingTimer = setTimeout(() => {
    peerTypingLocal.value = true;
    typingTimer = setTimeout(() => {
      peerTypingLocal.value = false;
      typingTimer = null;
    }, 2000 + Math.floor(Math.random() * 2000));
  }, 1500 + Math.floor(Math.random() * 1500));
}

/** 清理 typing 计时器（onHide/onUnload 调用，避免切后台后误触） */
function clearTypingTimer() {
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
}

/* ---- 2026-08-10 B1④：我方输入态推送（real 模式，STOMP /app/chat/typing） ---- */

/** 输入停止通知定时器（输入停顿 2.5s 后发 typing=false） */
let typingStopTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 通知对方「我正在输入」（real 模式）。
 * 载荷与后端契约对齐：{conversationId, recipientId, typing}（会话页使用 sessionId 作为会话 ID）。
 * mock 模式不发（本地演示由 scheduleTypingSimulation 模拟）。
 */
function notifyTyping() {
  if (useMock() || !sessionId.value) return;
  const peerId = resolvePeerUserId();
  if (peerId === null) return;
  wsClient.send("/app/chat/typing", {
    conversationId: sessionId.value,
    recipientId: String(peerId),
    typing: true,
  });
  if (typingStopTimer) clearTimeout(typingStopTimer);
  typingStopTimer = setTimeout(() => {
    wsClient.send("/app/chat/typing", {
      conversationId: sessionId.value!,
      recipientId: String(peerId),
      typing: false,
    });
    typingStopTimer = null;
  }, 2500);
}

/** 离开页面时发送 typing=false 并清理定时器（onHide/onUnload 调用） */
function clearTypingStopTimer() {
  if (typingStopTimer) {
    clearTimeout(typingStopTimer);
    typingStopTimer = null;
  }
  if (!useMock() && sessionId.value) {
    const peerId = resolvePeerUserId();
    if (peerId !== null) {
      wsClient.send("/app/chat/typing", {
        conversationId: sessionId.value,
        recipientId: String(peerId),
        typing: false,
      });
    }
  }
}

/** 对方头像（正在输入行展示；默认配置 AVATAR_1，与 ChatBubble 默认一致） */
const peerAvatarSrc = computed(() => {
  const session = currentSession.value;
  if (session && "partnerAvatar" in session && session.partnerAvatar) {
    return session.partnerAvatar;
  }
  return IMAGE_PATHS.AVATARS.AVATAR_1;
});

/** 解析对方用户 ID 为数字，用于 API 调用（委托给 view-models 纯函数） */
function resolvePeerUserId(): number | null {
  // 2026-08-09：临时会话（ChatSessionView）无 partnerId 字段，传 undefined
  // 由 view-models 兜底从 sessionId 数字部分 / targetUserId 解析
  const session = currentSession.value;
  const partnerId = session && "partnerId" in session ? session.partnerId : undefined;
  return resolvePeerUserIdVm(partnerId, sessionId.value, targetUserId.value);
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
    // 2026-08-09 修复：撤回后重新加载会话——原实现先调 messagesStore.fetchSessionMessages
    // （私信接口，temp 会话 ID 非 Long 必然 500 且污染 errorMessage），再走 chatStore 链路；
    // 此处已由上方 isTempSession 守卫保证为 temp 会话，直接走 temp-chat 加载即可。
    await chatStore.loadSession(sessionId.value);
    // Task 1.1.1：临时会话需同步 chatStore 消息到 messagesStore 单一数据源
    syncChatStoreMessagesToMessagesStore();
  } catch (_e) {
    uni.showToast({ title: t("chat.recallFailed"), icon: "none" });
  }
  closeLongPressMenu();
}

/* ========== 转发 / 删除（2026-08-09 微信化重构） ========== */

/** 转发会话选择弹层状态（message 为消息流中的 MessageItem，转发时 body/kind 原样复用） */
const forwardSheet = ref<{ visible: boolean; message: MessageItem | null }>({
  visible: false,
  message: null,
});

/** 可转发目标会话（私信会话，排除当前会话） */
const forwardableSessions = computed(() =>
  messagesStore.sessions.filter(
    (s) => s.id !== sessionId.value && s.sessionType === "private"
  )
);

/** 打开转发选择弹层（仅 text/emoji/activity 可转发，voice/system 提示不支持） */
function openForwardSheet() {
  const message = messagesStore.currentMessages.find(
    (m) => m.id === longPressMenu.value.messageId
  );
  closeLongPressMenu();
  if (!message) return;
  if (message.kind === "voice" || message.kind === "system") {
    uni.showToast({ title: t("chat.forwardNotSupported"), icon: "none" });
    return;
  }
  if (forwardableSessions.value.length === 0) {
    uni.showToast({ title: t("chat.forwardNoTarget"), icon: "none" });
    return;
  }
  forwardSheet.value = { visible: true, message };
}

/** 关闭转发选择弹层 */
function closeForwardSheet() {
  forwardSheet.value.visible = false;
  forwardSheet.value.message = null;
}

/**
 * 转发到目标会话：复用现有 sendMessage API（body/kind 原样转发），无新后端接口。
 * text/emoji 直转；activity 传 kind="activity"（body 为 JSON，后端白名单已含 ACTIVITY）。
 */
async function handleForwardTo(targetSessionId: string) {
  const message = forwardSheet.value.message;
  if (!message) return;
  closeForwardSheet();
  try {
    await messagesStore.sendMessage(targetSessionId, message.body, undefined, message.kind);
    uni.showToast({ title: t("chat.forwardSuccess"), icon: "none" });
  } catch (_e) {
    uni.showToast({ title: t("chat.operationFailed"), icon: "none" });
  }
}

/**
 * 删除消息：微信语义软删（仅自己不可见，对方仍可见）。
 * 2026-08-10 功能补齐——real 模式调用 DELETE /messages/{messageId}（后端软删 deleted_for_sender）；
 * 无论服务端结果如何都本地隐藏（本地语义优先，服务端失败仅提示）。
 */
async function handleDeleteMessage() {
  const messageId = longPressMenu.value.messageId;
  closeLongPressMenu();
  if (!messageId) return;
  if (!useMock()) {
    try {
      await request({
        url: `/messages/${encodeURIComponent(messageId)}`,
        method: "DELETE",
      });
    } catch (_e) {
      // 服务端删除失败：仍本地隐藏（微信语义），不打断用户操作
    }
  }
  const next = new Set(deletedMessageIds.value);
  next.add(messageId);
  deletedMessageIds.value = next;
  try {
    uni.setStorageSync(DELETED_MESSAGES_STORAGE_KEY, Array.from(next));
  } catch (_e) {
    // 存储失败不影响本次会话内隐藏（仅刷新后恢复）
  }
  uni.showToast({ title: t("chat.deleteLocalOnly"), icon: "none" });
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

/**
 * 加载破冰话题（2026-08-09 微信化重构：首条破冰提示的快捷按钮文案需要个性化话题；
 * 原实现仅在输入栏上方卡片流展示时加载，已随卡片流移除）
 */
async function loadIcebreakers() {
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

/** 2026-08-10 功能补齐：图片发送（选图 → 上传 → kind=image 消息，参考语音链路） */
const isSendingImage = ref(false);

async function handleImagePlaceholder() {
  closeMoreMenu();
  if (!sessionId.value) {
    uni.showToast({ title: t("chat.moreMenuSessionMissing"), icon: "none" });
    return;
  }
  if (isSendingImage.value) return;
  isSendingImage.value = true;
  try {
    const paths = await chooseImages({ count: 9, maxSizeMB: 10 });
    if (paths.length === 0) return; // 用户取消
    // 2026-08-13 收尾：上传期间显示加载提示（多张仅首次弹，结束时统一收起）
    uni.showLoading({ title: t("chat.sendingImage"), mask: true });
    for (const path of paths) {
      // 逐张上传 + 发送（保持顺序；单张失败跳过继续）
      try {
        const { url } = await clientApi.uploadPostImage({
          path,
          name: `chat-${Date.now()}.jpg`,
        } as UniUploadFileLike);
        if (!url) continue;
        await messagesStore.sendMessage(sessionId.value, url, undefined, "image");
      } catch (err) {
        captureException(err, { source: "chat.send-image" });
      }
    }
    uni.hideLoading();
    if (paths.length > 0) {
      uni.showToast({ title: t("chat.imageSent"), icon: "success" });
    }
  } catch (error) {
    uni.hideLoading();
    // 2026-08-13：失败文案修正——原 moreMenuImageWip（「开发中」占位）已过期
    const message = error instanceof Error ? error.message : t("chat.sendImageFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    isSendingImage.value = false;
  }
}

// 修复（严格模式 noUnusedLocals）：noop 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ noop });
</script>

<template>
  <view class="chat-page">
    <!-- 2026-08-09 免踢登录：未登录切换进本页展示引导页，点击按钮才跳登录 -->
    <LockScreen v-if="!isUnlocked" :completion-percent="completionPercent" />
    <template v-else>
    <!-- 顶部导航（2026-08-09 微信 1:1：返回箭头 + 两行标题（昵称/状态）+ 「···」更多） -->
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
        <!-- 微信：昵称下方 12px 灰色状态文字（仅私信会话，temp 会话沿用 temp-banner） -->
        <text v-if="peerStatusText" class="chat-nav__status">{{ peerStatusText }}</text>
      </view>
      <!-- 微信：右侧「···」更多按钮（查看主页/免打扰/拉黑/举报） -->
      <view
        class="chat-nav__more press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="openNavMenu"
        role="button"
        :aria-label="t('chat.nav.moreAria')"
      >
        <text class="chat-nav__more-text">···</text>
      </view>
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
        <!-- 2026-08-09 微信化重构：聊天首条固定破冰提示（会话无任何用户消息时展示，点击直发） -->
        <MatchGreetingTip
          v-if="showMatchGreeting"
          :buttons="matchGreetingButtons"
          @send="handleGreetingSend"
        />

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
      <!-- 2026-08-09 微信化重构：对方正在输入提示（mock 模拟 / real WS 预留） -->
      <view
        v-if="peerTyping && isPrivateSession"
        class="typing-row"
        role="status"
        :aria-label="t('chat.typingAria')"
      >
        <image class="typing-row__avatar" :src="resolveMediaUrl(peerAvatarSrc)" mode="aspectFill" />
        <view class="typing-row__bubble">
          <text class="typing-row__text">{{ t('chat.typing') }}</text>
          <view class="typing-row__dots" aria-hidden="true">
            <view class="typing-row__dot" /><view class="typing-row__dot" /><view class="typing-row__dot" />
          </view>
        </view>
      </view>
      <!-- 底部锚点：进入页面 / 新消息时滚动至此 -->
      <view :id="BOTTOM_ANCHOR_ID" class="chat-bottom-anchor" />
    </scroll-view>

    <!-- 2026-08-09 微信化重构：浏览历史时收到新消息的「有新消息」提示条（点击跳转最新，不打断阅读） -->
    <view
      v-if="unreadHintVisible"
      class="unread-hint press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      @tap="jumpToLatest"
      role="button"
      :aria-label="t('chat.newMessageHint')"
    >
      <text class="unread-hint__text">{{ t('chat.newMessageHint') }} ↓</text>
    </view>

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

        <!-- 微信风格输入栏（2026-08-09 微信 1:1：表情按钮 + "+" + 输入框 + 常显发送按钮） -->
        <view
          class="wechat-input-bar"
          :class="{ 'wechat-input-bar--keyboard-up': keyboardHeight > 0 }"
        >
          <!-- 表情按钮：点击展开表情面板（键盘收起；微信行为：表情面板与键盘互斥） -->
          <view
            class="wechat-input-bar__icon-btn wechat-input-bar__icon-btn--emoji press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="toggleEmojiPanel"
            role="button"
            :aria-label="t('chat.emojiPanelOpenAria')"
          >
            <image class="wechat-input-bar__icon-img" :src="iconSrc.smile" mode="aspectFit" alt="" />
          </view>

          <!-- "+" 附件按钮：展开更多菜单（视频通话 / 图片占位） -->
          <view
            class="wechat-input-bar__icon-btn wechat-input-bar__icon-btn--more press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="openMoreMenu"
          >
            <text class="wechat-input-bar__icon-text">+</text>
          </view>

          <!-- 输入框（单行 input，微信视觉一致；多行能力二期 textarea 再议） -->
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

          <!-- 发送按钮：常显；输入为空置灰，有内容品牌绿高亮（微信行为） -->
          <view
            class="wechat-input-bar__send press-feedback"
            :class="{ 'wechat-input-bar__send--disabled': !canSend }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="onSend"
          >
            <text class="wechat-input-bar__send-text">{{ t('chat.send') }}</text>
          </view>
        </view>

        <!-- 表情面板：点击表情追加到输入框草稿（2026-08-09 微信 1:1 新增） -->
        <EmojiPanel v-if="emojiPanelVisible" @select="handleEmojiSelect" />

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
        <!-- 2026-08-09 微信 1:1：转发（text/emoji/activity 可转，选择目标会话复用发送 API） -->
        <view
          class="longpress-menu__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="openForwardSheet"
          role="button"
          :aria-label="t('chat.longPressMenu.forwardAria')"
        >
          <text class="longpress-menu__text">{{ t('chat.longPressMenu.forward') }}</text>
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
        <!-- 2026-08-09 微信 1:1：删除（本地持久隐藏，仅当前设备生效） -->
        <view
          class="longpress-menu__item longpress-menu__item--danger press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleDeleteMessage"
          role="button"
          :aria-label="t('chat.longPressMenu.deleteAria')"
        >
          <text class="longpress-menu__text longpress-menu__text--danger">{{ t('chat.longPressMenu.delete') }}</text>
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
          <!-- 2026-08-09 微信 1:1：发送图片（本期占位，图片消息独立迭代） -->
          <view
            class="more-menu-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleImagePlaceholder"
            role="button"
            :aria-label="t('chat.moreMenuImage')"
          >
            <view class="more-menu-item__icon more-menu-item__icon--green">
              <image class="more-menu-item__icon-emoji" :src="iconSrc.camera" mode="aspectFit" alt="" />
            </view>
            <text class="more-menu-item__label">{{ t('chat.moreMenuImage') }}</text>
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

    <!-- 顶部「···」更多菜单（2026-08-09 微信 1:1：查看主页/免打扰/拉黑/举报） -->
    <view
      v-if="navMenuVisible"
      class="more-menu-overlay"
      @tap="closeNavMenu"
      role="dialog"
      aria-modal="true"
      :aria-label="t('chat.nav.moreAria')"
    >
      <view class="more-menu-sheet" @tap.stop="noop">
        <view class="more-menu-sheet__title">
          <text class="more-menu-sheet__title-text">{{ t('chat.nav.moreAria') }}</text>
        </view>
        <view class="nav-menu__list">
          <view
            class="nav-menu__item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleViewProfile"
            role="button"
            :aria-label="t('chat.nav.viewProfile')"
          >
            <text class="nav-menu__item-text">{{ t('chat.nav.viewProfile') }}</text>
          </view>
          <view
            class="nav-menu__item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleToggleMute"
            role="button"
            :aria-label="isSessionMuted ? t('chat.nav.unmute') : t('chat.nav.mute')"
          >
            <text class="nav-menu__item-text">{{ isSessionMuted ? t('chat.nav.unmute') : t('chat.nav.mute') }}</text>
          </view>
          <view
            class="nav-menu__item nav-menu__item--danger press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleBlock"
            role="button"
            :aria-label="t('chat.nav.block')"
          >
            <text class="nav-menu__item-text nav-menu__item-text--danger">{{ t('chat.nav.block') }}</text>
          </view>
          <view
            class="nav-menu__item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleReport"
            role="button"
            :aria-label="t('chat.nav.report')"
          >
            <text class="nav-menu__item-text">{{ t('chat.nav.report') }}</text>
          </view>
        </view>
        <view
          class="more-menu-sheet__cancel press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="closeNavMenu"
          role="button"
          :aria-label="t('common.cancel')"
        >
          <text class="more-menu-sheet__cancel-text">{{ t('common.cancel') }}</text>
        </view>
      </view>
    </view>

    <!-- 转发会话选择弹层（2026-08-09 微信 1:1：长按消息 → 转发） -->
    <view
      v-if="forwardSheet.visible"
      class="more-menu-overlay"
      @tap="closeForwardSheet"
      role="dialog"
      aria-modal="true"
      :aria-label="t('chat.longPressMenu.forward')"
    >
      <view class="more-menu-sheet" @tap.stop="noop">
        <view class="more-menu-sheet__title">
          <text class="more-menu-sheet__title-text">{{ t('chat.longPressMenu.forward') }}</text>
        </view>
        <scroll-view class="forward-list" scroll-y>
          <view
            v-for="s in forwardableSessions"
            :key="s.id"
            class="forward-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleForwardTo(s.id)"
            role="button"
            :aria-label="s.partnerName"
          >
            <image class="forward-item__avatar" :src="resolveMediaUrl(s.partnerAvatar)" mode="aspectFill" />
            <text class="forward-item__name">{{ s.partnerName }}</text>
          </view>
        </scroll-view>
        <view
          class="more-menu-sheet__cancel press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="closeForwardSheet"
          role="button"
          :aria-label="t('common.cancel')"
        >
          <text class="more-menu-sheet__cancel-text">{{ t('common.cancel') }}</text>
        </view>
      </view>
    </view>
    </template>
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

/* 2026-08-09 微信 1:1 重构：标题区两行（昵称 16px 粗体 + 状态 12px 灰字） */
.chat-nav__title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  padding: 0 var(--sp-2);
}

/* 微信：昵称 16px 加粗 = 32rpx/700（无对应 token 档位，局部字面量） */
.chat-nav__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 微信：状态文字 12px 灰色 = 24rpx（无对应 token 档位，局部字面量） */
.chat-nav__status {
  font-size: 24rpx;
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 微信：右侧「···」更多按钮（与返回按钮对称 64rpx） */
.chat-nav__more {
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

.chat-nav__more-text {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--c-text-secondary);
  line-height: 1;
  /* 三点字符垂直居中微调，无对应 token 档位 */
  letter-spacing: 2rpx;
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

/* 2026-08-09 微信 1:1：发送按钮置灰态（输入为空时，微信行为：不可点击） */
.wechat-input-bar__send--disabled {
  background: var(--c-neutral-300, rgba(0, 0, 0, 0.2));
  box-shadow: none;
  opacity: 0.7;
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

/* ========== 2026-08-09 微信 1:1 重构新增样式 ========== */

/* 「有新消息」提示条：输入区上方居中胶囊条，点击跳转最新 */
.unread-hint {
  position: absolute;
  left: 50%;
  bottom: 320rpx;
  transform: translateX(-50%);
  z-index: 50;
  display: inline-flex;
  align-items: center;
  padding: 10rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light);
  box-shadow: var(--s-md, 0 4rpx 16rpx rgba(0, 0, 0, 0.08));
  animation: unread-hint-pop var(--d-normal, 200ms) ease;
}

@keyframes unread-hint-pop {
  from { opacity: 0; transform: translateX(-50%) translateY(8rpx); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.unread-hint__text {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-brand-500, #3FCF8E);
  font-weight: 600;
}

/* 对方正在输入行（头像 + 气泡灰字 + 三点动画） */
.typing-row {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  padding: var(--sp-2) 0;
  flex-shrink: 0;
}

.typing-row__avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  border: 2rpx solid var(--c-bg-container);
  flex-shrink: 0;
  background: var(--c-neutral-100);
}

.typing-row__bubble {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5);
  border-radius: 0 24rpx 24rpx 24rpx;
  background: var(--c-bubble-other, #FFFFFF);
  box-shadow: none;
}

.typing-row__text {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-tertiary);
}

/* 三点动画（微信正在输入样式） */
.typing-row__dots {
  display: flex;
  gap: 4rpx;
  align-items: center;
}

.typing-row__dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: var(--r-full);
  background: var(--c-text-tertiary);
  animation: typing-dot 1.2s ease-in-out infinite;
}

.typing-row__dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-row__dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-dot {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4rpx); }
}

/* 顶部「···」菜单列表 */
.nav-menu__list {
  display: flex;
  flex-direction: column;
  padding: var(--sp-3) 0;
}

.nav-menu__item {
  padding: var(--sp-6) var(--sp-5);
  border-radius: var(--r-md, 16rpx);
  transition: background var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.nav-menu__item:active {
  background: var(--c-bg-page);
}
/* #endif */

.nav-menu__item--danger {
  /* 无独立激活态：H5 下由 :active 变体兜底 */
}

.nav-menu__item-text {
  font-size: var(--fs-md, 28rpx);
  color: var(--c-text-primary);
}

.nav-menu__item-text--danger {
  color: var(--c-error);
}

/* 转发会话选择列表 */
.forward-list {
  max-height: 50vh;
  min-height: 160rpx;
  padding: var(--sp-3) 0;
}

.forward-item {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--r-md, 16rpx);
}

.forward-item:active {
  background: var(--c-bg-page);
}

.forward-item__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
  background: var(--c-neutral-100);
}

.forward-item__name {
  font-size: var(--fs-md, 28rpx);
  color: var(--c-text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 「+」菜单：图片占位入口（品牌绿图标） */
.more-menu-item__icon--green {
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
  box-shadow: var(--s-brand-sm, 0 4rpx 12rpx rgba(63, 207, 142, 0.35));
}

</style>
