import { defineStore } from "pinia";
import { request, withTimeout as withHttpTimeout, EnhancedApiError } from "../services/http";
import { useSessionStore } from "./session";
import { useMock } from "./helpers/use-mock";
// 2026-08-10 切换提速：消息页 TTL 缓存（30s 新鲜度，官方号消息流 60s）
import { isCacheFresh, fetchWithStaleWhileRevalidate } from "../utils/cache-ttl";

/** 消息页 bootstrap 新鲜度窗口 */
const BOOTSTRAP_TTL_MS = 30_000;
/** 官方号消息流新鲜度窗口（消除 N+1 重复拉取） */
const OFFICIAL_MESSAGES_TTL_MS = 60_000;
/** 2026-08-10 B1④：typing 自动复位窗口（对方未发 typing=false 时兜底复位） */
const TYPING_RESET_MS = 3_000;
/** 2026-08-10 B1④：会话 typing 复位定时器表（模块级，避免污染 Pinia state） */
const typingResetTimers: Record<string, ReturnType<typeof setTimeout>> = {};
// 修复（严格模式 noUnusedLocals）：components 类型未在本文件引用，已移除。
// 2026-08-07 官方号体系：官方号账号/消息流类型（契约见 docs/openapi/official-accounts.yaml）
import type {
  InteractionEventView,
  OfficialAccountView,
  OfficialMessageView,
} from "../services/generated/api-types-supplement";
// 统一常量：异步操作超时时间
import { ASYNC_TIMEOUT_MS } from "../constants/growth";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";
// 录音修复：私信语音上传复用共享服务（携带 Authorization 头）
import { uploadVoiceFile } from "../services/voice-upload";
// Mock 数据（R4-batch2：mock 用户/会话数据移入 stores/messages/mock-data.ts，
// 仅 useMock() 分支引用，real 模式不会读取 mock ID）
import {
  mockHeartSignals,
  mockInteractionEvents,
  mockMessages,
  mockNotifications,
  mockSessions,
} from "./messages/mock-data";

/**
 * 会话类型
 */
export type SessionType = "private" | "temp_anonymous";

/**
 * 通知信号分类类型
 * Phase 3 新增：社交信号(SOCIAL) vs 内容信号(CONTENT)
 */
export type SignalType = "SOCIAL" | "CONTENT";

/**
 * 通知筛选类型
 */
export type NotificationFilterType = "all" | "social" | "content";

/**
 * 会话摘要
 */
export interface MessageSession {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  partnerHeadline: string;
  lastMessagePreview: string;
  lastMessageSentAt: string | null;
  unreadCount: number;
  pinned: boolean;
  phase: "matching" | "active" | "closing" | "closed";
  sessionType: SessionType;
  closesAt?: string | null;
  closedReason?: "expired" | "ended" | null;
  /**
   * 2026-08-07 消息页重构：会话免打扰（左滑操作设置）。
   * 免打扰会话不再在列表顶栏统计未读数（unreadCount 保留展示红点）。
   */
  muted?: boolean;
  /**
   * 2026-08-07 消息页重构：是否官方号会话。
   * 官方号会话点击进入 official-chat 页（产品助手号 / 活动运营号）。
   */
  isOfficial?: boolean;
  /** 官方号账号 ID（isOfficial=true 时有效，对应 official-chat 的 accountId） */
  officialAccountId?: string;
}

/**
 * 心动信号
 */
export interface MessageHeartSignal {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  status: "pending" | "accepted" | "expired";
  sentAt: string;
  expiresAt: string;
  /** 学校 */
  school?: string;
  /** 年龄 */
  age?: number;
  /** 城市 */
  city?: string;
  /** 简介亮点文案 */
  bioHighlight?: string;
}

/**
 * 系统通知
 * Phase 3 新增：signalType 字段，区分社交信号(SOCIAL)和内容信号(CONTENT)
 */
export interface SystemNotification {
  id: string;
  type: "system" | "match" | "like" | "activity" | "follow" | "interaction_like" | "comment" | "visitor" | "interaction_match";
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
  /** 触发用户 ID（互动类型通知用于跳转用户资料） */
  triggerUserId?: string | null;
  /** 关联资源 ID（帖子等，用于跳转帖子详情） */
  resourceId?: string | null;
  /** 信号分类：SOCIAL（社交信号）/ CONTENT（内容信号） */
  signalType: SignalType;
}

/**
 * 互动事件
 */
export interface InteractionEvent {
  id: number;
  eventType: "NEW_LIKE" | "NEW_VISITOR" | "NEW_FOLLOW" | "POST_LIKED" | "POST_COMMENTED" | "TOPIC_REPLIED";
  triggerUserId: number;
  triggerUserName: string;
  triggerUserAvatar: string;
  referenceId: number;
  referenceType: string;
  summary: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * 消息项
 */
export interface MessageItem {
  id: string;
  sessionId: string;
  sender: "self" | "peer" | "system";
  kind: "text" | "voice" | "emoji" | "image" | "system" | "activity";
  body: string;
  sentAt: string;
  durationSeconds?: number | null;
}

/**
 * MessagesStore 状态
 */
export interface MessagesState {
  sessions: MessageSession[];
  currentMessages: MessageItem[];
  heartSignals: MessageHeartSignal[];
  notifications: SystemNotification[];
  interactionEvents: InteractionEvent[];
  interactionEventPage: number;
  interactionEventHasMore: boolean;
  /** 2026-08-08 微信化重构：上拉加载更早历史的分页游标（正序分页） */
  messagePage: number;
  messageHasMore: boolean;
  /** 2026-08-08 红点修复：当前正在查看的会话 ID（会话内新消息不累加未读数） */
  activeSessionId: string | null;
  loading: boolean;
  errorMessage: string | null;
  /** 通知筛选类型：all（全部）/ social（社交信号）/ content（内容信号） */
  filterType: NotificationFilterType;
  /** 2026-08-10 B1④：对方「正在输入」状态映射（sessionId → typing，WS /queue/typing 驱动） */
  typingMap: Record<string, boolean>;
}

/* ========== 后端视图类型 ========== */

export interface ConversationView {
  id: number;
  conversationUid: string;
  userAId: number;
  userBId: number;
  otherUserName: string;
  otherUserAvatar: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  headline: string;
  pinned: boolean;
  phase: string;
  sessionType: string;
}

export interface BackendMessageView {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageKind: string;
  isRead: boolean;
  createdAt: string;
  /** 语音消息时长（秒），非语音消息为 null（录音修复：后端 MessageView 已支持） */
  durationSeconds?: number | null;
}

/**
 * 后端 NotificationView 类型（Phase 3 更新：增加 signalType 字段）
 */
export interface BackendNotificationView {
  id: number;
  type: string;
  sourceUser: { displayName: string; avatar: string } | null;
  referenceId: number | null;
  referenceType: string | null;
  isRead: boolean;
  createdAt: string;
  summary: string;
  signalType: string;
}

export interface UnreadCountView {
  count: number;
}

/* ========== 映射函数 ========== */

function mapToMessageSession(raw: ConversationView): MessageSession {
  // 修复（P1 BUG）：partnerId 原实现恒取 raw.userBId，当自己是会话的 userB 时
  // partnerId 会指向自己，导致会话列表点击跳转错乱（进入自己的资料页/错误的私信）。
  // 现根据当前登录用户判断：自己是 userA 则对方是 userB，反之亦然。
  const sessionStore = useSessionStore();
  // infra R2-00029: 判空逻辑简化为统一空串处理
  const currentUserIdStr = sessionStore.userSession?.userId ?? "";
  const isSelfUserA = currentUserIdStr.length > 0 && String(raw.userAId) === currentUserIdStr;
  const partnerId = isSelfUserA ? String(raw.userBId) : String(raw.userAId);
  return {
    id: String(raw.id),
    partnerId,
    // 修复（P2-06）：otherUserName 可能为空，统一兜底为空串，
    // 避免下游（如消息页搜索 partnerName.toLowerCase()）空值崩溃
    partnerName: raw.otherUserName || "",
    partnerAvatar: raw.otherUserAvatar || "",
    partnerHeadline: raw.headline || "",
    lastMessagePreview: raw.lastMessagePreview,
    lastMessageSentAt: raw.lastMessageAt,
    unreadCount: raw.unreadCount,
    pinned: raw.pinned ?? false,
    phase: (raw.phase || "active") as MessageSession["phase"],
    sessionType: (raw.sessionType || "private") as SessionType,
    closesAt: null,
    closedReason: null,
  };
}

function mapToMessageItem(raw: BackendMessageView): MessageItem {
  const sessionStore = useSessionStore();
  const currentUserId = sessionStore.userSession?.userId ?? "";
  return {
    id: String(raw.id),
    sessionId: String(raw.conversationId),
    sender: String(raw.senderId) === currentUserId ? "self" : "peer",
    // 2026-08-08 活动卡片：kind=activity（content 为 JSON）；未知 kind 回退 text 容错旧数据
    kind: raw.messageKind === "voice" ? "voice"
      : raw.messageKind === "emoji" ? "emoji"
      : raw.messageKind === "activity" ? "activity"
      : "text",
    body: raw.content,
    sentAt: raw.createdAt,
    // 录音修复：语音时长透传（后端 MessageView.durationSeconds）
    durationSeconds: raw.durationSeconds ?? null,
  };
}

/**
 * 本地构造会话列表预览文案（与后端 preview 规则对齐）。
 * - activity：解析 content JSON 的 title → 「[活动] 标题」；解析失败回退「[活动] 活动卡片」
 * - 其余类型：直接截取（<= 50 字）
 *
 * @param kind 消息类型
 * @param content 消息内容
 * @returns 预览文案
 */
function buildLocalPreview(kind: MessageItem["kind"], content: string): string {
  if (kind === "image") {
    return t("messages.imagePrefix");
  }
  if (kind === "activity") {
    try {
      const parsed = JSON.parse(content) as { title?: string };
      if (parsed.title) return `${t("messages.activityCardPrefix")} ${parsed.title}`;
    } catch (_e) {
      // 解析失败走默认文案
    }
    // R4-00138：前缀与兜底文案走 i18n（en 语言下不再显示中文）
    return `${t("messages.activityCardPrefix")} ${t("messages.activityCardFallback")}`;
  }
  return content.length > 50 ? `${content.substring(0, 50)}...` : content;
}

function mapToSystemNotification(raw: BackendNotificationView): SystemNotification {
  const mappedSignalType: SignalType = raw.signalType === "CONTENT" ? "CONTENT" : "SOCIAL";
  // 修复（P1 BUG）：triggerUserId 原实现写入 raw.sourceUser?.displayName（显示名而非 ID），
  // 导致通知跳转用户资料时按名字查 ID 失败。后端 NotificationView.sourceUser 目前只提供
  // displayName/avatar，未暴露用户 ID —— 这里置 null 并保留 resourceId 跳转，
  // 待后端补 sourceUserId 字段后可恢复映射（TODO(backend): 补充 sourceUser.id）。
  return {
    id: String(raw.id),
    type: mapNotificationType(raw.type),
    title: raw.summary,
    content: raw.summary,
    isRead: raw.isRead,
    createdAt: raw.createdAt,
    actionUrl: null,
    triggerUserId: null,
    resourceId: raw.referenceId ? String(raw.referenceId) : null,
    signalType: mappedSignalType,
  };
}

function mapNotificationType(backendType: string): SystemNotification["type"] {
  // infra R2-00030: 用 satisfies 校验映射值类型，类型演进时由编译器捕获遗漏
  const typeMap = {
    "follow": "follow",
    "like": "like",
    "comment": "comment",
    "visitor": "visitor",
    "match": "interaction_match",
  } as const satisfies Record<string, SystemNotification["type"]>;
  return (typeMap as Record<string, SystemNotification["type"]>)[backendType] || "system";
}

/* ========== Mock 数据 ========== */

/**
 * infra R2-00031: 互动事件字段映射（抽离 loadInteractionEvents 内联单行长映射，
 * 统一处理后端多字段兼容与兜底）
 */
function mapToInteractionEvent(item: InteractionEventView): InteractionEvent {
  return {
    id: Number(item.id),
    eventType: item.eventType ?? item.type,
    triggerUserId: Number(item.triggerUserId ?? item.fromUserId ?? 0),
    triggerUserName: String(item.triggerUserName ?? item.fromUserName ?? ""),
    triggerUserAvatar: String(item.triggerUserAvatar ?? item.fromUserAvatar ?? ""),
    referenceId: Number(item.referenceId ?? 0),
    referenceType: String(item.referenceType ?? ""),
    summary: String(item.summary ?? ""),
    isRead: Boolean(item.isRead ?? item.read),
    createdAt: String(item.createdAt),
  } as InteractionEvent;
}


// 注：ASYNC_TIMEOUT_MS 由 constants/growth.ts 统一提供

// R4-00156：withTimeout 收敛到 services/http.ts 单一实现（不再本地重复实现超时语义）。
// 本地签名第三参为自定义错误文案（调用点依赖如“加载会话列表超时”），
// 通过委托 http.ts 的 withTimeout 保持超时语义一致，超时时将错误转为业务文案。
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  try {
    return await withHttpTimeout(promise, timeoutMs);
  } catch (error) {
    // http.ts 超时 reject EnhancedApiError({ error: "timeout" })，转调用点约定的业务文案；
    // 其余错误（业务/网络/取消）原样透传，与旧实现语义一致
    if (error instanceof EnhancedApiError && error.error === "timeout") {
      throw new Error(errorMessage);
    }
    throw error;
  }
}

/* ========== 模块级请求令牌（修复 P1 BUG：异步竞态条件） ==========
 *
 * 修复（P1 BUG）：原 fetchSessions / fetchSessionMessages / fetchNotifications /
 * fetchHeartSignals / loadInteractionEvents 未处理竞态条件，
 * 用户快速切换会话或筛选标签时，新请求发起时旧请求仍在途，
 * 旧请求返回后可能覆盖新请求的结果，导致展示错误列表。
 *
 * 现使用请求令牌（递增计数器）模式：每次请求生成唯一 token，
 * 仅当 token 等于当前最新 token 时才允许更新状态，
 * 旧 token 的响应被静默丢弃，避免覆盖新请求结果。
 *
 * 相比 AbortController 模式：
 * - 不需要修改 request() 签名或传递 signal
 * - 与现有 withTimeout 包装兼容
 * - token 比较为原子操作，无并发风险
 */
let fetchSessionsToken = 0;
let fetchSessionMessagesToken = 0;
let fetchNotificationsToken = 0;
let fetchHeartSignalsToken = 0;
let loadInteractionEventsToken = 0;

/**
 * 2026-08-09 未读红点修复（BUG 3）：私信显式已读回执的节流状态。
 * key=sessionId，value=最近一次已读请求的毫秒时间戳。
 * 会话页停留期间连续收到 N 条新消息时，节流版 markConversationRead 只发一次
 * （后端按会话级批量 markAsRead，无需逐条回执）。
 */
const conversationReadThrottle = new Map<string, number>();
/** 已读回执节流窗口：2s（无对应常量档位，局部定义） */
const CONVERSATION_READ_THROTTLE_MS = 2000;

/**
 * 消息中心 Store
 * Phase 3 新增：filterType 状态支持社交/内容信号分类筛选
 */
export const useMessagesStore = defineStore("messages", {
  state: (): MessagesState => ({
    sessions: [],
    currentMessages: [],
    heartSignals: [],
    notifications: [],
    interactionEvents: [],
    interactionEventPage: 0,
    interactionEventHasMore: true,
    messagePage: 0,
    messageHasMore: true,
    activeSessionId: null,
    loading: false,
    errorMessage: null,
    filterType: "all",
    typingMap: {},
  }),

  getters: {
    // 2026-08-08 红点修复：免打扰会话不计入 tabBar 总角标
    // （MessageSession.muted 注释「免打扰会话不再在列表顶栏统计未读数」，原实现未生效）
    totalUnreadCount: (state): number =>
      state.sessions.filter((s) => !s.muted).reduce((sum, s) => sum + s.unreadCount, 0),
    unreadNotificationCount: (state): number => state.notifications.filter((n) => !n.isRead).length,
    pinnedSessions: (state): MessageSession[] => state.sessions.filter((s) => s.pinned),
    unpinnedSessions: (state): MessageSession[] => state.sessions.filter((s) => !s.pinned),
    pendingHeartSignals: (state): MessageHeartSignal[] => state.heartSignals.filter((s) => s.status === "pending"),
    privateSessions: (state): MessageSession[] => state.sessions.filter((s) => s.sessionType === "private"),
    tempSessions: (state): MessageSession[] => state.sessions.filter((s) => s.sessionType === "temp_anonymous"),
    unreadInteractionEventCount: (state): number => state.interactionEvents.filter((e) => !e.isRead).length,
    /** Phase 3：根据当前 filterType 过滤后的通知列表 */
    filteredNotifications: (state): SystemNotification[] => {
      if (state.filterType === "all") return state.notifications;
      const target: SignalType = state.filterType === "social" ? "SOCIAL" : "CONTENT";
      return state.notifications.filter((n) => n.signalType === target);
    },
  },

  actions: {
    async bootstrap() {
      try {
        // 2026-08-10 切换提速：30s 新鲜度窗口，新鲜时直接跳过（内容已在 store 中，秒开）
        if (!useMock() && isCacheFresh("messages:bootstrap", BOOTSTRAP_TTL_MS)) {
          return;
        }
        await withTimeout(
          // stale-while-revalidate：过期时返回旧值并后台刷新，切 tab 不等待网络
          fetchWithStaleWhileRevalidate(
            "messages:bootstrap",
            BOOTSTRAP_TTL_MS,
            () => Promise.all([this.fetchSessions(), this.fetchHeartSignals(), this.fetchNotifications()])
          ),
          ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutBootstrap") // infra R2-00028: 超时文案 i18n 化
        );
      } catch (error) {
        if (!this.errorMessage) this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.loadMessagesFailed");
      }
    },

    async fetchSessions() {
      // 修复（P1 BUG - 异步竞态）：递增 token，旧请求的响应被静默丢弃
      const token = ++fetchSessionsToken;
      this.loading = true; this.errorMessage = null;
      try {
        await withTimeout((async () => {
          if (useMock()) {
            // 修复：旧请求返回时不再修改状态，避免覆盖新请求结果
            if (token !== fetchSessionsToken) return;
            // 2026-08-07 消息页重构：mock 模式保留运行期状态（已读清零/置顶/免打扰/删除），
            // 避免「进入会话清空红点 → 返回列表刷新后红点反弹」的假数据现象。
            const runtime = new Map(this.sessions.map((s) => [s.id, s]));
            const isFirstLoad = this.sessions.length === 0;
            this.sessions = mockSessions
              // 首次加载全部会话；非首次仅保留仍存在的会话（已删除的不再出现）
              .filter((m) => isFirstLoad || runtime.has(m.id))
              .map((m) => {
                const live = runtime.get(m.id);
                return live
                  ? { ...m, unreadCount: live.unreadCount, pinned: live.pinned, muted: live.muted ?? m.muted, lastMessagePreview: live.lastMessagePreview, lastMessageSentAt: live.lastMessageSentAt }
                  : { ...m };
              })
              .sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return (b.lastMessageSentAt ? Date.parse(b.lastMessageSentAt) : 0) - (a.lastMessageSentAt ? Date.parse(a.lastMessageSentAt) : 0);
              });
            return;
          }
          // P2-13：会话列表接口 userId 由后端 JWT 获取（PrivateMessageController 无 userId 参数），不再携带 query
          const data = await request<ConversationView[]>({ url: "/messages/conversations", method: "GET" });
          // 2026-08-07 官方号体系：real 模式并行拉取官方号账号，再按响应中的 code 逐个拉取消息流，
          // 映射为 isOfficial 会话与普通会话一起排序（官方未读先置 0，后端暂未计数）。
          // R4-00137：官方号列表不再硬编码（后端新增官方号无需发版），以 /official-accounts 响应为准。
          const [officialAccounts] = await Promise.all([
            request<OfficialAccountView[]>({ url: "/official-accounts", method: "GET" }).catch(() => []),
          ]);
          // 2026-08-10 切换提速：官方号消息流按账号 60s 缓存（消除 N+1 重复拉取）
          const accountMessages = await Promise.all(
            officialAccounts.map((acc) =>
              fetchWithStaleWhileRevalidate(
                `official-messages:${acc.code}`,
                OFFICIAL_MESSAGES_TTL_MS,
                () =>
                  request<OfficialMessageView[]>({
                    url: `/official-accounts/${encodeURIComponent(acc.code)}/messages`,
                    method: "GET",
                  }).catch(() => [] as OfficialMessageView[])
              )
            )
          );
          // 修复：旧请求返回时不再修改状态，避免覆盖新请求结果
          if (token !== fetchSessionsToken) return;
          const officialSessions: MessageSession[] = officialAccounts.map((acc, idx) => {
            const messages = accountMessages[idx] ?? [];
            const latest = messages[messages.length - 1];
            return {
              id: `official-${acc.code}`,
              partnerId: acc.code,
              partnerName: acc.name,
              partnerAvatar: acc.iconUrl || "",
              partnerHeadline: acc.description,
              lastMessagePreview: latest?.content ?? "",
              lastMessageSentAt: latest?.publishedAt ?? null,
              unreadCount: 0,
              pinned: false,
              phase: "active",
              sessionType: "private",
              isOfficial: true,
              officialAccountId: acc.code,
            };
          });
          this.sessions = [...data.map(mapToMessageSession), ...officialSessions].sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return (b.lastMessageSentAt ? Date.parse(b.lastMessageSentAt) : 0) - (a.lastMessageSentAt ? Date.parse(a.lastMessageSentAt) : 0);
          });
        })(), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutSessions")); // infra R2-00028
      } catch (error) {
        // 修复：旧请求的错误不更新 errorMessage
        if (token !== fetchSessionsToken) return;
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.loadSessionsFailed"); // infra R2-00028
      }
      finally {
        // 修复：仅当当前 token 仍是最新时才清 loading
        if (token === fetchSessionsToken) {
          this.loading = false;
        }
      }
    },

    async fetchSessionMessages(sessionId: string) {
      // 修复（P1 BUG - 异步竞态）：递增 token，旧请求的响应被静默丢弃
      const token = ++fetchSessionMessagesToken;
      this.loading = true; this.errorMessage = null;
      try {
        await withTimeout((async () => {
          if (useMock()) {
            // 修复：旧请求返回时不再修改状态
            if (token !== fetchSessionMessagesToken) return;
            this.currentMessages = mockMessages[sessionId] ? [...mockMessages[sessionId]] : [];
            const s = this.sessions.find((x) => x.id === sessionId);
            if (s) s.unreadCount = 0;
            this.messagePage = 0;
            this.messageHasMore = false;
            return;
          }
          // P2-13：会话消息接口 userId 由后端 JWT 获取（PrivateMessageController 无 userId 参数），不再携带 query
          const data = await request<BackendMessageView[]>({ url: `/messages/conversations/${encodeURIComponent(sessionId)}/messages`, method: "GET" });
          // 修复：旧请求返回时不再修改状态
          if (token !== fetchSessionMessagesToken) return;
          this.currentMessages = data.map(mapToMessageItem);
          const s = this.sessions.find((x) => x.id === sessionId);
          if (s) s.unreadCount = 0;
          // 重置上拉历史分页游标（新会话上下文）
          this.messagePage = 0;
          this.messageHasMore = data.length >= 20;
          // 2026-08-09 未读红点修复（BUG 3）：进入会话立即发送显式已读回执
          // （force 跳过节流，覆盖「进入前最后一条 → 加载完成」间隙）
          void this.markConversationRead(sessionId, true);
        })(), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutMessages")); // infra R2-00028
      } catch (error) {
        // 修复：旧请求的错误不更新 errorMessage
        if (token !== fetchSessionMessagesToken) return;
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.loadMessagesListFailed"); // infra R2-00028
      }
      finally {
        if (token === fetchSessionMessagesToken) {
          this.loading = false;
        }
      }
    },

    /**
     * 2026-08-08 微信化重构：加载更早的历史消息（正序分页，上拉触发）。
     *
     * real：GET /messages/conversations/{id}/messages?page=N&size=20&order=asc，
     * 返回最早在前的下一页，按 id 去重合并到 currentMessages 头部（整体保持 sentAt 升序）。
     * mock：mock 数据量小，直接置 hasMore=false（不做分片）。
     *
     * @param sessionId 会话 ID
     * @param page 目标页码（正序第 N 页，0 起）
     */
    async fetchOlderMessages(sessionId: string, page: number) {
      if (useMock()) {
        this.messageHasMore = false;
        return;
      }
      const data = await request<BackendMessageView[]>({
        url: `/messages/conversations/${encodeURIComponent(sessionId)}/messages?page=${page}&size=20&order=asc`,
        method: "GET",
      });
      const older = data.map(mapToMessageItem);
      // 按 id 去重（分页边界可能重复），保持 sentAt 升序合并到头部
      const existingIds = new Set(this.currentMessages.map((m) => m.id));
      const fresh = older.filter((m) => !existingIds.has(m.id));
      this.currentMessages = [...fresh, ...this.currentMessages];
      this.messagePage = page;
      this.messageHasMore = data.length >= 20;
    },

    /**
     * 2026-08-08 红点修复：标记当前正在查看的会话。
     *
     * 会话页 onShow 时传入 sessionId，onHide 时传 null：
     * - 正在查看的会话收到 WS 推送时不累加未读数（读态由后端 markAsRead 闭环）
     * - 其他会话照常 +1
     *
     * @param sessionId 会话 ID 或 null（退出会话页）
     */
    setActiveSession(sessionId: string | null) {
      this.activeSessionId = sessionId;
    },

    /**
     * 2026-08-09 未读红点修复（BUG 3）：私信会话显式已读回执。
     *
     * 原实现私信已读完全依赖「GET messages 时后端隐式 markAsRead」
     * （RealPrivateMessageService.getMessages L276），会话页停留期间收到的新消息
     * 后端永远拿不到已读回执，返回消息列表重新拉取后红点反弹——
     * 「列表红点 ≠ 会话内真实未读数」的直接成因。
     *
     * 本 action 显式调用 `PUT /messages/conversations/{id}/read`
     * （PrivateMessageController L111，接口已存在但前端原无引用）：
     * - 进入会话首次：force=true 立即发送（覆盖「进入前最后一条 → 加载完成」间隙）
     * - 停留期间收新消息：节流版（2s 内只发一次，避免连发 N 条触发 N 次请求）
     *
     * @param sessionId 私信会话 ID（数字字符串；temp 会话非数字 ID 早退防误请求 404）
     * @param force 是否跳过 2s 节流（进入会话的首次已读应立即可达）
     * @returns 是否应视为已读（true=已成功发送/无需发送；false=请求失败，调用方可按需回滚）
     */
    async markConversationRead(sessionId: string, force = false): Promise<boolean> {
      // 仅私信会话生效：temp 会话 ID 形如 session-xxx 非纯数字，防止误请求 404/500；
      // 返回 true 表示"无需后端回执"（temp 已读走 markTempChatSessionRead，本地清零仍合理）
      if (!/^\d+$/.test(sessionId)) return true;
      if (useMock()) return true; // mock 分支 fetchSessionMessages 已本地清零
      const now = Date.now();
      const lastCall = conversationReadThrottle.get(sessionId) ?? 0;
      if (!force && now - lastCall < CONVERSATION_READ_THROTTLE_MS) return true; // 节流命中：上一次已发
      conversationReadThrottle.set(sessionId, now);
      try {
        // 使用本文件 L347 的 withTimeout 包装器（第三参为业务错误文案，非 AbortSignal）
        await withTimeout(
          request<void>({ url: `/messages/conversations/${encodeURIComponent(sessionId)}/read`, method: "PUT" }),
          ASYNC_TIMEOUT_MS,
          t("storeErrors.messages.timeoutMarkRead") // infra R2-00028
        );
        return true;
      } catch (error) {
        // 静默失败 + console.warn：已读回执失败不阻塞消息流（与 markNotificationRead 同策略）
        console.warn("[messages] markConversationRead 失败:", sessionId, error);
        return false;
      }
    },

    /**
     * 创建或获取与指定对方的私信会话（Task 1.1.3）。
     *
     * 替代旧的硬编码 `session-${rawUserId}` 写法，调用后端
     * `POST /api/messages/conversations` 创建/复用真实会话 ID。
     *
     * 后端由 `PrivateMessageController.createConversation` 处理，
     * 入参 `CreateConversationRequest { userBId: Long }`，
     * 返回 `ConversationView`（含真实 id / partnerId / partnerName 等）。
     *
     * Mock 模式下构造一个本地会话占位，保证 dev 环境流程可走通。
     *
     * @param peerUserId 对方用户 ID（字符串形式，内部转 number）
     * @returns 创建/复用的会话对象；失败时返回 null 并设置 errorMessage
     */
    async createSession(peerUserId: string): Promise<MessageSession | null> {
      this.errorMessage = null;
      const trimmedId = (peerUserId ?? "").trim();
      if (trimmedId.length === 0) {
        this.errorMessage = t("storeErrors.messages.peerUserIdInvalid");
        throw new Error(t("storeErrors.messages.peerUserIdInvalid"));
      }
      try {
        return await withTimeout((async (): Promise<MessageSession> => {
          if (useMock()) {
            // Mock 模式：构造一个本地占位会话，避免硬编码 session-${rawUserId}
            const nowIso = new Date().toISOString();
            const session: MessageSession = {
              id: `session-private-${trimmedId}`,
              partnerId: trimmedId,
              partnerName: "对方",
              partnerAvatar: "",
              partnerHeadline: "",
              lastMessagePreview: "",
              lastMessageSentAt: nowIso,
              unreadCount: 0,
              pinned: false,
              phase: "active",
              sessionType: "private",
              closesAt: null,
              closedReason: null,
            };
            if (!this.sessions.find((s) => s.id === session.id)) {
              this.sessions.unshift(session);
            }
            this.currentMessages = [];
            return session;
          }
          const userBId = Number(trimmedId);
          if (!Number.isFinite(userBId) || userBId <= 0) {
            throw new Error(t("storeErrors.messages.peerUserIdNotPositive"));
          }
          const data = await request<ConversationView, { userBId: number }>({
            url: "/messages/conversations",
            method: "POST",
            data: { userBId },
          });
          const session = mapToMessageSession(data);
          if (!this.sessions.find((s) => s.id === session.id)) {
            this.sessions.unshift(session);
          }
          this.currentMessages = [];
          return session;
        })(), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutCreateSession")); // infra R2-00028
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.createSessionFailed"); // infra R2-00028
        throw error;
      }
    },

    /**
     * 直接设置当前消息列表（Task 1.1.1 单一数据源同步用）。
     *
     * 临时匿名会话由 `chatStore` 管理会话生命周期，但其消息渲染统一通过
     * `messagesStore.currentMessages` 输出，避免页面同时读取两个 store 的
     * `messages` 字段造成双写/重复渲染。
     *
     * 调用时机：
     * - `chatStore.loadSession()` 成功后，将 `activeSession.messages` 同步到 currentMessages
     * - `chatStore.sendText()` / `sendVoice()` 成功后，重新同步
     *
     * @param messages 消息列表（按时间顺序排列）
     */
    setCurrentMessages(messages: MessageItem[]): void {
      this.currentMessages = [...messages];
    },

    // 修复（严格模式 noUnusedLocals）：原 quoteRef 参数未在函数体内使用，
    // 加 _ 前缀标识为有意未使用（保留签名以维持调用方兼容性）。
    async sendMessage(sessionId: string, content: string, _quoteRef?: string, kind: MessageItem["kind"] = "text") {
      this.errorMessage = null;
      try {
        if (!content || content.trim().length === 0) { this.errorMessage = t("storeErrors.messages.contentEmpty"); throw new Error(t("storeErrors.messages.contentEmpty")); }
        if (content.length > 5000) { this.errorMessage = t("storeErrors.messages.contentTooLong"); throw new Error(t("storeErrors.messages.contentTooLong")); }
        if (!sessionId || sessionId.trim().length === 0) { this.errorMessage = t("storeErrors.messages.sessionIdInvalid"); throw new Error(t("storeErrors.messages.sessionIdInvalid")); }
        await withTimeout((async () => {
          if (useMock()) {
            const nm: MessageItem = { id: `msg-${Date.now()}`, sessionId, sender: "self", kind, body: content, sentAt: new Date().toISOString() };
            this.currentMessages.push(nm);
            const s = this.sessions.find((x) => x.id === sessionId);
            if (s) { s.lastMessagePreview = buildLocalPreview(kind, content); s.lastMessageSentAt = nm.sentAt; }
            return nm;
          }
          // 修复（P0-12）：后端 SendMessageRequest 不含 senderId（从 JWT 取当前用户），
          // 请求体仅发送内容与类型，删除多余字段避免后端契约不匹配
          const result = await request<BackendMessageView, { content: string; kind: string }>({ url: `/messages/conversations/${encodeURIComponent(sessionId)}/messages`, method: "POST", data: { content, kind } });
          const mr = mapToMessageItem(result);
          this.currentMessages.push(mr);
          const s = this.sessions.find((x) => x.id === sessionId);
          if (s) { s.lastMessagePreview = buildLocalPreview(kind, content); s.lastMessageSentAt = mr.sentAt; }
          return mr;
        })(), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutSendMessage")); // infra R2-00028
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.sendMessageFailed"); throw error; }
    },

    /**
     * 发送语音消息（录音修复：私信链路语音上传 + kind=voice 发送）。
     *
     * 流程：
     * 1. Real 模式：先通过 uploadVoiceFile 上传录音文件到 POST /api/v1/chat/voice，
     *    拿到音频 URL 后再以 kind="voice" 发送私信消息（body 为音频 URL）；
     * 2. Mock 模式：跳过上传，以占位 body + durationSeconds 本地追加，保证 dev 流程可走通。
     *
     * @param sessionId 私信会话 ID
     * @param tempFilePath 录音文件临时路径（mp-weixin 由 RecorderManager.onStop 提供）
     * @param durationSeconds 语音时长（秒）
     */
    async sendVoiceMessage(sessionId: string, tempFilePath: string, durationSeconds: number) {
      this.errorMessage = null;
      try {
        if (!sessionId || sessionId.trim().length === 0) { this.errorMessage = t("storeErrors.messages.sessionIdInvalid"); throw new Error(t("storeErrors.messages.sessionIdInvalid")); }
        await withTimeout((async () => {
          if (useMock()) {
            const nm: MessageItem = { id: `msg-${Date.now()}`, sessionId, sender: "self", kind: "voice", body: t("chat.voicePlaceholder"), sentAt: new Date().toISOString(), durationSeconds };
            this.currentMessages.push(nm);
            const s = this.sessions.find((x) => x.id === sessionId);
            if (s) { s.lastMessagePreview = t("chat.voicePlaceholder"); s.lastMessageSentAt = nm.sentAt; }
            return nm;
          }
          // Real：先上传录音文件，再以 kind=voice 发送（body 为音频 URL）。
          // H5 端 tempFilePath 恒为空（模拟录音，createRecorder 返回空路径），
          // 降级为占位 body 发送（与 chatStore.sendVoice 行为一致）
          const voiceUrl = tempFilePath && tempFilePath.trim().length > 0
            ? await uploadVoiceFile(tempFilePath, durationSeconds)
            : t("chat.voicePlaceholder");
          const result = await request<BackendMessageView, { content: string; kind: string; durationSeconds: number }>({
            url: `/messages/conversations/${encodeURIComponent(sessionId)}/messages`,
            method: "POST",
            data: { content: voiceUrl, kind: "voice", durationSeconds },
          });
          const mr = mapToMessageItem(result);
          this.currentMessages.push(mr);
          const s = this.sessions.find((x) => x.id === sessionId);
          if (s) { s.lastMessagePreview = t("chat.voicePlaceholder"); s.lastMessageSentAt = mr.sentAt; }
          return mr;
        })(), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutSendMessage")); // infra R2-00028
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.sendMessageFailed"); throw error; }
    },

    async fetchHeartSignals() {
      // 修复（P1 BUG - 异步竞态）：递增 token，旧请求的响应被静默丢弃
      const token = ++fetchHeartSignalsToken;
      this.loading = true; this.errorMessage = null;
      try {
        await withTimeout((async () => {
          if (useMock()) {
            // 修复：旧请求返回时不再修改状态
            if (token !== fetchHeartSignalsToken) return;
            this.heartSignals = [...mockHeartSignals];
            return;
          }
          // P2-13：心动信号列表接口 userId 由后端 JWT 获取（MatchController.getHeartSignals 无 userId 参数），不再携带 query
          const data = await request<MessageHeartSignal[]>({ url: "/matches/heart-signals", method: "GET" });
          // 修复：旧请求返回时不再修改状态
          if (token !== fetchHeartSignalsToken) return;
          this.heartSignals = data;
        })(), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutSignals")); // infra R2-00028
      } catch (error) {
        // 修复：旧请求的错误不更新 errorMessage
        if (token !== fetchHeartSignalsToken) return;
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.loadSignalsFailed");
      }
      finally {
        if (token === fetchHeartSignalsToken) {
          this.loading = false;
        }
      }
    },

    async acceptHeartSignal(signalId: string): Promise<MessageSession | null> {
      this.errorMessage = null;
      try {
        if (!signalId || signalId.trim().length === 0) { this.errorMessage = t("storeErrors.messages.signalIdInvalid"); throw new Error(t("storeErrors.messages.signalIdInvalid")); }
        return await withTimeout((async (): Promise<MessageSession | null> => {
          if (useMock()) {
            const signal = this.heartSignals.find((s) => s.id === signalId);
            if (!signal) throw new Error(t("storeErrors.messages.signalNotFound"));
            if (signal.status !== "pending") throw new Error(t("storeErrors.messages.signalHandled"));
            const expiresAt = Date.parse(signal.expiresAt);
            if (Date.now() > expiresAt) { signal.status = "expired"; throw new Error(t("storeErrors.messages.signalExpired")); }
            signal.status = "accepted";
            const ns: MessageSession = { id: `session-private-${signal.fromUserId}`, partnerId: signal.fromUserId, partnerName: signal.fromUserName, partnerAvatar: signal.fromUserAvatar, partnerHeadline: t("messages.partnerHeadlineTemplate", { school: signal.school || "", age: signal.age || "", city: signal.city || "" }), lastMessagePreview: t("messages.becameFriends"), lastMessageSentAt: new Date().toISOString(), unreadCount: 0, pinned: false, phase: "active", sessionType: "private", closesAt: null, closedReason: null }; // infra R2-00028: 会话预览文案 i18n 化
            if (!this.sessions.find((s) => s.id === ns.id)) this.sessions.unshift(ns);
            return ns;
          }
          // P2-13：接受心动信号接口 userId 由后端 JWT 获取，不再携带 query
          await request<void>({ url: `/matches/heart-signals/${encodeURIComponent(signalId)}/accept`, method: "POST" });
          const signal = this.heartSignals.find((s) => s.id === signalId);
          if (signal) signal.status = "accepted";
          await this.fetchSessions();
          return this.sessions.find((s) => s.sessionType === "private" && s.partnerId === signal?.fromUserId) ?? null;
        })(), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutAcceptSignal")); // infra R2-00028
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.acceptSignalFailed"); throw error; }
    },

    /**
     * 获取系统通知
     * Phase 3 更新：支持传入 filterType 按信号类型筛选
     *
     * 修复（P1 BUG - 异步竞态）：递增 token，旧请求的响应被静默丢弃，
     * 避免快速切换筛选标签时旧请求覆盖新请求结果。
     */
    async fetchNotifications(filterType?: NotificationFilterType) {
      // 修复（P1 BUG）：递增 token，旧请求的响应被静默丢弃
      const token = ++fetchNotificationsToken;
      this.loading = true; this.errorMessage = null;
      if (filterType !== undefined) this.filterType = filterType;
      const activeFilter = this.filterType;
      try {
        await withTimeout((async () => {
          if (useMock()) {
            // 修复：旧请求返回时不再修改状态
            if (token !== fetchNotificationsToken) return;
            const all = [...mockNotifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
            if (activeFilter === "all") { this.notifications = all; }
            else { const target: SignalType = activeFilter === "social" ? "SOCIAL" : "CONTENT"; this.notifications = all.filter((n) => n.signalType === target); }
            return;
          }
          // Real 模式：按筛选调用不同端点
          if (activeFilter === "all") {
            const data = await request<BackendNotificationView[]>({ url: "/notifications", method: "GET" });
            // 修复：旧请求返回时不再修改状态
            if (token !== fetchNotificationsToken) return;
            this.notifications = data.map(mapToSystemNotification).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
          } else {
            // 通知列表分页：保留 size=100（与后端默认契约一致，单页拉取足够覆盖通知量），
            // 如后续通知量大可改为 page/pageSize 滚动加载（暂未实现，避免过度设计）
            const signalParam = activeFilter === "social" ? "SOCIAL" : "CONTENT";
            const data = await request<BackendNotificationView[]>({ url: `/notifications/list?page=0&size=100&signalType=${signalParam}`, method: "GET" });
            // 修复：旧请求返回时不再修改状态
            if (token !== fetchNotificationsToken) return;
            this.notifications = data.map(mapToSystemNotification).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
          }
        })(), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutNotifications")); // infra R2-00028
      } catch (error) {
        // 修复：旧请求的错误不更新 errorMessage
        if (token !== fetchNotificationsToken) return;
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.loadNotificationsFailed"); // infra R2-00028
      }
      finally {
        if (token === fetchNotificationsToken) {
          this.loading = false;
        }
      }
    },

    async markNotificationRead(notificationId: string) {
      try {
        const n = this.notifications.find((x) => x.id === notificationId);
        if (!n || n.isRead) return;
        if (useMock()) { n.isRead = true; return; }
        await withTimeout(request<void>({ url: `/notifications/${notificationId}/read`, method: "PUT" }), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutMarkRead")); // infra R2-00028
        n.isRead = true;
      } catch (error) {
        // R4-00165：标记已读失败不再完全静默——保留未读状态（避免 UI 与服务端不一致反弹），
        // 至少 console.warn 便于排查；后续可在 UI 提供重试入口
        console.warn(`[messages.markNotificationRead] 标记已读失败 id=${notificationId}:`, error);
      }
    },

    async markAllNotificationsRead() {
      try {
        if (useMock()) { this.notifications.forEach((n) => { n.isRead = true; }); return; }
        await withTimeout(request<void>({ url: "/notifications/read-all", method: "PUT" }), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutMarkAllRead")); // infra R2-00028
        this.notifications.forEach((n) => { n.isRead = true; });
      } catch (error) {
        // 修复：原代码失败时仍强制标记为已读，导致 UI 与服务端数据不一致（下次刷新会"已读变未读"反弹）
        // 现在保留未读状态，提示用户重试
        console.error("[messages.markAllNotificationsRead] 标记失败:", error);
        throw new Error(t("storeErrors.messages.markAllReadFailed"));
      }
    },

    /**
     * 2026-08-09 喜欢/访客闭环：按类型批量标记通知为已读。
     *
     * <p>进入「喜欢与访客」页时调用，将喜欢/访客/匹配类型的未读通知清为已读，
     * 消除消息页快捷入口的红点角标（驱动「谁喜欢了我/谁看了我」的告知闭环）。</p>
     *
     * <p>mock 分支本地置位；real 分支逐个调用后端已读接口（失败项静默保留未读，
     * 下次进入再尝试）。</p>
     *
     * @param types 需要标记已读的通知类型（like / visitor / interaction_match 等）
     */
    async markTypeRead(types: SystemNotification["type"][]) {
      const targets = this.notifications.filter(
        (n) => !n.isRead && types.includes(n.type),
      );
      if (targets.length === 0) return;
      if (useMock()) {
        targets.forEach((n) => { n.isRead = true; });
        return;
      }
      // 逐个调用已读接口（Promise.allSettled：部分失败不阻塞其余）
      await Promise.allSettled(targets.map((n) => this.markNotificationRead(n.id)));
    },

    async fetchUnreadNotificationCount() {
      try {
        if (useMock()) return this.notifications.filter((n) => !n.isRead).length;
        const result = await withTimeout(request<UnreadCountView>({ url: "/notifications/unread-count", method: "GET" }), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutUnreadCount")); // infra R2-00028
        return result.count ?? 0;
      } catch (error) {
        // 修复：原代码失败时返回 0 会误导用户以为没有未读消息
        // 现在返回 null 表示数据不可用，调用方可据此显示"数据加载失败"而非"0 条未读"
        console.error("[messages.fetchUnreadNotificationCount] 获取失败:", error);
        return null;
      }
    },

    async setSessionPinned(sessionId: string, pinned: boolean) {
      this.errorMessage = null;
      try {
        if (useMock()) { const s = this.sessions.find((x) => x.id === sessionId); if (s) s.pinned = pinned; return; }
        // P2-13：置顶接口 userId 由后端 JWT 获取（PrivateMessageController 仅接收 pinned 参数），不再携带 query
        await withTimeout(request<void>({ url: `/messages/conversations/${encodeURIComponent(sessionId)}/pin?pinned=${pinned}`, method: "PUT" }), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutPinSession")); // infra R2-00028
        const s = this.sessions.find((x) => x.id === sessionId);
        if (s) s.pinned = pinned;
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.pinSessionFailed"); throw error; } // infra R2-00028
    },

    /**
     * 删除指定的私信会话。
     *
     * 业务流程：
     * 1. 调用后端 DELETE /api/messages/conversations/{sessionId}?userId={userId}
     * 2. 从本地 sessions 列表中移除该会话
     * 3. 失败时设置 errorMessage 并向上抛出，由调用方决定是否回滚 UI
     *
     * @param sessionId 待删除的会话 ID
     */
    /** Phase 4.3 验收 · 置顶/取消置顶会话（委托 setSessionPinned，真实模式同步后端） */
    toggleSessionPin(sessionId: string) {
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) {
        void this.setSessionPinned(sessionId, !session.pinned).catch(() => {
          // 失败时由 setSessionPinned 设置 errorMessage，此处不再重复处理
        });
      }
    },

    /**
     * 2026-08-07 消息页重构：设置会话免打扰（左滑操作）。
     * 免打扰仅影响新消息通知提醒，未读红点仍正常展示。
     *
     * 2026-08-10 B1③：real 模式同步后端（PUT /messages/conversations/{id}/mute），
     * 后端成功后才改本地状态；mock 分支保持纯本地（会话不落库）。
     * 后端持久化后刷新/换端不还原（ConversationView.muted 下发）。
     */
    async setSessionMuted(sessionId: string, muted: boolean) {
      if (!useMock()) {
        try {
          await request({
            url: `/messages/conversations/${encodeURIComponent(sessionId)}/mute`,
            method: "PUT",
            data: { muted },
          });
        } catch (_e) {
          // 服务端失败：不改本地状态（保持原值），错误由调用方 toast 提示
          return;
        }
      }
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) session.muted = muted;
    },

    /**
     * 2026-08-10 B1④：设置对方「正在输入」状态（WS /queue/typing 驱动）。
     * 收到 typing=true 时置位并启动 3s 自动复位（对方未发 typing=false 也不卡死）；
     * typing=false 时立即复位并清理定时器。
     */
    setSessionTyping(sessionId: string, typing: boolean) {
      const prev = typingResetTimers[sessionId];
      if (prev) {
        clearTimeout(prev);
        delete typingResetTimers[sessionId];
      }
      if (typing) {
        this.typingMap[sessionId] = true;
        typingResetTimers[sessionId] = setTimeout(() => {
          this.typingMap[sessionId] = false;
          delete typingResetTimers[sessionId];
        }, TYPING_RESET_MS);
      } else {
        this.typingMap[sessionId] = false;
      }
    },

    /**
     * 2026-08-07 消息页重构：标为未读（长按菜单）。
     * 将已读会话重新标记为 1 条未读，恢复红色角标。
     *
     * R4-00184：当前仅本地改状态，无后端同步（未读计数以服务端会话数据为准，
     * 刷新后按后端计数还原）。TODO(backend): 后端补充会话未读元数据同步接口。
     */
    markSessionUnread(sessionId: string) {
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) {
        session.unreadCount = Math.max(1, session.unreadCount);
      }
    },

    /**
     * 2026-08-07 消息页重构：标为已读（长按菜单）。
     * 手动消除未读红点。
     *
     * 2026-08-09 未读红点修复（BUG 4）：改为后端同步——先发送显式已读回执
     * （复用 markConversationRead），成功后再本地清零；失败回滚返回 false，
     * 避免刷新列表后红点反弹（原实现仅本地清零，后端无感知）。
     * markSessionUnread 后端无对应接口，保留本地 + TODO(backend)。
     *
     * @param sessionId 会话 ID
     * @returns 是否已读成功（false=后端回执失败，本地未清零）
     */
    async markSessionRead(sessionId: string): Promise<boolean> {
      const session = this.sessions.find((s) => s.id === sessionId);
      if (!session) return false;
      const ok = await this.markConversationRead(sessionId, true);
      if (!ok) {
        console.warn("[messages] markSessionRead 后端已读失败，回滚本地清零:", sessionId);
        return false;
      }
      session.unreadCount = 0;
      return true;
    },

    async deleteSession(sessionId: string) {
      this.errorMessage = null;
      try {
        // mock 模式：直接从本地列表移除，不调用后端
        if (useMock()) {
          this.sessions = this.sessions.filter((s) => s.id !== sessionId);
          return;
        }
        // P2-13：删除会话接口 userId 由后端 JWT 获取（PrivateMessageController 仅接收 path id），不再携带 query
        await withTimeout(
          request<void>({ url: `/messages/conversations/${encodeURIComponent(sessionId)}`, method: "DELETE" }),
          ASYNC_TIMEOUT_MS,
          t("storeErrors.messages.timeoutDeleteSession") // infra R2-00028
        );
        // 删除成功后从本地列表移除
        this.sessions = this.sessions.filter((s) => s.id !== sessionId);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.deleteSessionFailed"); // infra R2-00028
        throw error;
      }
    },

    async declineHeartSignal(signalId: string) {
      this.errorMessage = null;
      try {
        if (useMock()) { const s = this.heartSignals.find((x) => x.id === signalId); if (s) s.status = "expired"; return; }
        // P2-13：拒绝心动信号接口 userId 由后端 JWT 获取，不再携带 query
        await withTimeout(request<void>({ url: `/matches/heart-signals/${encodeURIComponent(signalId)}/decline`, method: "POST" }), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutDeclineSignal")); // infra R2-00028
        const s = this.heartSignals.find((x) => x.id === signalId);
        if (s) s.status = "expired";
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.rejectSignalFailed"); throw error; } // infra R2-00028
    },

    onNewMessage(message: MessageItem): void {
      // 修复：WebSocket 重连重复订阅会导致同一消息被推送多次
      // 此处按 messageId 去重，避免消息列表出现重复项
      // 2026-08-08 红点修复：仅当前正在查看的会话才进入 currentMessages 消息流，
      // 其他会话的消息不再污染当前会话流（原实现任意消息都 push 的隐藏 bug）
      const isActive = message.sessionId === this.activeSessionId;
      const exists = this.currentMessages.some((m) => m.id === message.id);
      if (!exists && isActive) {
        this.currentMessages.push(message);
      }
      const s = this.sessions.find((x) => x.id === message.sessionId);
      if (s) {
        // 2026-08-09 表情包机制：emoji 消息预览直接显示表情字符（其余非文本类型走 [type] 占位）
        s.lastMessagePreview =
          message.kind === "text" || message.kind === "emoji" ? message.body : `[${message.kind}]`;
        s.lastMessageSentAt = message.sentAt;
        // 2026-08-09 未读红点修复：仅「对方发送的消息」计入未读——
        // 我方发送的消息（self，如多端回推确认）、系统消息均不计入
        // （需求：列表红点 = 会话内对方未读消息数，100% 匹配）
        if (!isActive && message.sender === "peer") {
          s.unreadCount += 1;
        } else if (isActive) {
          // 2026-08-09 未读红点修复（BUG 3）：停留期间收到新消息即发显式已读回执
          // （节流版，连收 N 条只发一次）。原实现后端拿不到回执，返回列表刷新后
          // 红点反弹——「列表红点 ≠ 会话内真实未读数」的直接成因。
          void this.markConversationRead(message.sessionId);
        }
      }
    },

    clearCurrentMessages() { this.currentMessages = []; },

    /**
     * Phase 3：设置通知筛选类型，自动重新加载通知列表
     */
    async setFilterType(type: NotificationFilterType) {
      if (this.filterType === type) return;
      this.filterType = type;
      await this.fetchNotifications(type);
    },

    /**
     * 加载互动事件列表
     *
     * 修复（P1 BUG - 异步竞态）：递增 token，旧请求的响应被静默丢弃，
     * 避免快速切换页面或刷新时旧请求覆盖新请求结果。
     */
    async loadInteractionEvents(page: number = 0) {
      // 修复（P1 BUG）：递增 token，旧请求的响应被静默丢弃
      const token = ++loadInteractionEventsToken;
      this.loading = true; this.errorMessage = null;
      try {
        await withTimeout((async () => {
          if (useMock()) {
            // 修复：旧请求返回时不再修改状态
            if (token !== loadInteractionEventsToken) return;
            const all = [...mockInteractionEvents].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
            if (page === 0) this.interactionEvents = all;
            else this.interactionEvents = [...this.interactionEvents, ...all];
            this.interactionEventPage = page; this.interactionEventHasMore = false;
            return;
          }
          // 修复（P0-04）：互动事件端点统一挂 /notifications 前缀，分页参数为 size（后端 InteractionEventController 契约）
          // 修复（R4-00164）：后端分页为 0 基（page=0 首页），默认页码由 1 改为 0，
          // 避免首屏请求 page=1 跳过最新 20 条（展示第 21~40 条）。
          const data = await request<InteractionEventView[]>({ url: `/notifications/interactions?page=${page}&size=20`, method: "GET" });
          // 修复：旧请求返回时不再修改状态
          if (token !== loadInteractionEventsToken) return;
          const mapped = data.map(mapToInteractionEvent); // infra R2-00031: 使用抽取的映射函数
          if (page === 0) this.interactionEvents = mapped;
          else this.interactionEvents = [...this.interactionEvents, ...mapped];
          this.interactionEventPage = page; this.interactionEventHasMore = mapped.length >= 20;
        })(), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutInteractions")); // infra R2-00028
      } catch (error) {
        // 修复：旧请求的错误不更新 errorMessage
        if (token !== loadInteractionEventsToken) return;
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.messages.loadInteractionsFailed"); // infra R2-00028
      }
      finally {
        if (token === loadInteractionEventsToken) {
          this.loading = false;
        }
      }
    },

    async getUnreadInteractionCount(): Promise<number> {
      try {
        if (useMock()) return this.interactionEvents.filter((e) => !e.isRead).length;
        const result = await withTimeout(request<{ count: number }>({ url: "/notifications/interactions/unread-count", method: "GET" }), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutUnreadInteractionCount")); // infra R2-00028
        return result.count ?? 0;
      } catch (_e) { return this.interactionEvents.filter((e) => !e.isRead).length; }
    },

    async markInteractionRead(eventId: number) {
      try {
        const e = this.interactionEvents.find((x) => x.id === eventId);
        if (!e || e.isRead) return;
        if (useMock()) { e.isRead = true; return; }
        await withTimeout(request<void>({ url: `/notifications/interactions/${eventId}/read`, method: "PUT" }), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutMarkInteractionRead")); // infra R2-00028
        e.isRead = true;
      } catch (_e) { /* 静默失败 */ }
    },

    async markAllInteractionsRead() {
      try {
        if (useMock()) { this.interactionEvents.forEach((e) => { e.isRead = true; }); return; }
        await withTimeout(request<void>({ url: "/notifications/interactions/read-all", method: "PUT" }), ASYNC_TIMEOUT_MS, t("storeErrors.messages.timeoutMarkAllInteractionsRead")); // infra R2-00028
        this.interactionEvents.forEach((e) => { e.isRead = true; });
      } catch (error) {
        // 修复：原代码失败时仍强制标记为已读，导致数据不一致
        console.error("[messages.markAllInteractionsRead] 标记失败:", error);
        throw new Error(t("storeErrors.messages.markAllInteractionsReadFailed"));
      }
    },
  },
});