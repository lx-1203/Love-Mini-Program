import { defineStore } from "pinia";
import { appEnv } from "../services/env";
import { request } from "../services/http";
import { useSessionStore } from "./session";
import type { components } from "../services/generated/api-types";

/** 从 api-types 中提取互动事件视图类型 */
type InteractionEventView = components["schemas"]["InteractionEventView"];

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
  kind: "text" | "voice" | "emoji" | "system";
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
  loading: boolean;
  errorMessage: string | null;
  /** 通知筛选类型：all（全部）/ social（社交信号）/ content（内容信号） */
  filterType: NotificationFilterType;
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
  const sessionStore = useSessionStore();
  return {
    id: String(raw.id),
    partnerId: String(raw.userBId),
    partnerName: raw.otherUserName,
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
    kind: raw.messageKind === "voice" ? "voice" : raw.messageKind === "emoji" ? "emoji" : "text",
    body: raw.content,
    sentAt: raw.createdAt,
  };
}

function mapToSystemNotification(raw: BackendNotificationView): SystemNotification {
  const mappedSignalType: SignalType = raw.signalType === "CONTENT" ? "CONTENT" : "SOCIAL";
  return {
    id: String(raw.id),
    type: mapNotificationType(raw.type),
    title: raw.summary,
    content: raw.summary,
    isRead: raw.isRead,
    createdAt: raw.createdAt,
    actionUrl: null,
    triggerUserId: raw.sourceUser?.displayName ?? null,
    resourceId: raw.referenceId ? String(raw.referenceId) : null,
    signalType: mappedSignalType,
  };
}

function mapNotificationType(backendType: string): SystemNotification["type"] {
  const typeMap: Record<string, SystemNotification["type"]> = {
    "follow": "follow",
    "like": "like",
    "comment": "comment",
    "visitor": "visitor",
    "match": "interaction_match",
  };
  return typeMap[backendType] || "system";
}

/* ========== Mock 数据 ========== */

const mockSessions: MessageSession[] = [
  {
    id: "session-private-1", partnerId: "user-2001", partnerName: "林夕", partnerAvatar: "",
    partnerHeadline: "大二 · 喜欢电影和咖啡", lastMessagePreview: "明天下午有空吗？",
    lastMessageSentAt: "2026-05-20T18:30:00Z", unreadCount: 2, pinned: true,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
  },
  {
    id: "session-private-2", partnerId: "user-2002", partnerName: "陈默", partnerAvatar: "",
    partnerHeadline: "大三 · 自习搭子", lastMessagePreview: "图书馆三楼见",
    lastMessageSentAt: "2026-05-19T21:00:00Z", unreadCount: 0, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
  },
  {
    id: "session-private-3", partnerId: "user-2005", partnerName: "顾言", partnerAvatar: "",
    partnerHeadline: "研一 · 摄影爱好者", lastMessagePreview: "上次拍的那组照片发你了",
    lastMessageSentAt: "2026-05-18T14:20:00Z", unreadCount: 5, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
  },
  {
    id: "session-temp-1", partnerId: "user-2004", partnerName: "对方", partnerAvatar: "",
    partnerHeadline: "24小时临时聊天", lastMessagePreview: "嗨，我是通过匹配进来的",
    lastMessageSentAt: "2026-05-20T20:00:00Z", unreadCount: 1, pinned: false,
    phase: "active", sessionType: "temp_anonymous", closesAt: "2026-05-21T20:00:00Z", closedReason: null,
  },
];

const mockMessages: Record<string, MessageItem[]> = {
  "session-private-1": [
    { id: "msg-1", sessionId: "session-private-1", sender: "peer", kind: "text", body: "嗨，看到你的资料觉得挺有缘的", sentAt: "2026-05-20T18:00:00Z" },
    { id: "msg-2", sessionId: "session-private-1", sender: "self", kind: "text", body: "哈哈，我也觉得", sentAt: "2026-05-20T18:05:00Z" },
    { id: "msg-3", sessionId: "session-private-1", sender: "peer", kind: "text", body: "明天下午有空吗？", sentAt: "2026-05-20T18:30:00Z" },
  ],
  "session-private-2": [
    { id: "msg-4", sessionId: "session-private-2", sender: "peer", kind: "text", body: "图书馆三楼见", sentAt: "2026-05-19T21:00:00Z" },
  ],
  "session-private-3": [
    { id: "msg-5", sessionId: "session-private-3", sender: "peer", kind: "text", body: "上次拍的那组照片发你了", sentAt: "2026-05-18T14:20:00Z" },
  ],
  "session-temp-1": [
    { id: "msg-6", sessionId: "session-temp-1", sender: "peer", kind: "text", body: "嗨，我是通过匹配进来的", sentAt: "2026-05-20T20:00:00Z" },
  ],
};

const mockHeartSignals: MessageHeartSignal[] = [
  {
    id: "signal-1", fromUserId: "user-2003", fromUserName: "苏晴", fromUserAvatar: "",
    status: "pending", sentAt: "2026-05-20T16:45:00Z", expiresAt: "2026-05-21T16:45:00Z",
    school: "南校区", age: 20, city: "广州",
    bioHighlight: "ta的介绍很丰富，对于找对象ta是认真的",
  },
];

/**
 * Mock 通知数据（Phase 3 更新：每条通知包含 signalType）
 * 社交信号(SOCIAL)：match/visitor/like -- 红色主题
 * 内容信号(CONTENT)：comment/follow -- 蓝色主题
 */
const mockNotifications: SystemNotification[] = [
  {
    id: "notif-1", type: "match", title: "新的匹配",
    content: "你与林夕成功匹配，可以开始聊天了", isRead: false,
    createdAt: "2026-05-20T14:00:00Z",
    actionUrl: "/pages/chat-session/index?sessionId=session-private-1",
    signalType: "SOCIAL",
  },
  {
    id: "notif-2", type: "system", title: "资料完善提醒",
    content: "完善资料可以提高匹配成功率哦", isRead: true,
    createdAt: "2026-05-18T10:00:00Z", actionUrl: "/profile",
    signalType: "SOCIAL",
  },
  {
    id: "notif-3", type: "like", title: "有人喜欢你",
    content: "一位匿名用户对你点了喜欢，快去寻觅页看看吧", isRead: false,
    createdAt: "2026-05-19T09:30:00Z", actionUrl: "/pages/likes/index",
    signalType: "SOCIAL",
  },
  {
    id: "notif-4", type: "follow", title: "新的关注",
    content: "苏晴关注了你", isRead: false,
    createdAt: "2026-05-21T10:00:00Z", triggerUserId: "user-2003",
    actionUrl: "/pages/profile/index?userId=user-2003",
    signalType: "CONTENT",
  },
  {
    id: "notif-6", type: "comment", title: "新的评论",
    content: "林夕评论了你的帖子：\"写得真好！\"", isRead: false,
    createdAt: "2026-05-20T20:30:00Z", triggerUserId: "user-2001",
    resourceId: "post-42", actionUrl: "/pages/post/detail?id=post-42",
    signalType: "CONTENT",
  },
  {
    id: "notif-7", type: "visitor", title: "新的访客",
    content: "顾北访问了你的主页", isRead: true,
    createdAt: "2026-05-20T16:00:00Z", triggerUserId: "user-2002",
    actionUrl: "/pages/profile/index?userId=user-2002",
    signalType: "SOCIAL",
  },
  {
    id: "notif-8", type: "interaction_match", title: "双向喜欢",
    content: "你和夏言互相喜欢了，快去看看", isRead: false,
    createdAt: "2026-05-21T08:45:00Z", triggerUserId: "user-4001",
    actionUrl: "/pages/messages/index",
    signalType: "SOCIAL",
  },
  {
    id: "notif-9", type: "interaction_like", title: "新的赞",
    content: "周屿赞了你的帖子", isRead: false,
    createdAt: "2026-05-21T09:15:00Z", triggerUserId: "user-4004",
    resourceId: "post-58", actionUrl: "/pages/post/detail?id=post-58",
    signalType: "CONTENT",
  },
];

const mockInteractionEvents: InteractionEvent[] = [
  { id: 1, eventType: "NEW_LIKE", triggerUserId: 4001, triggerUserName: "夏言", triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Xiayan&backgroundColor=b6e3f4", referenceId: 0, referenceType: "profile", summary: "夏言喜欢了你", isRead: false, createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 2, eventType: "NEW_VISITOR", triggerUserId: 4002, triggerUserName: "顾北", triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gubei&backgroundColor=c0aede", referenceId: 0, referenceType: "profile", summary: "顾北访问了你的主页", isRead: false, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: 3, eventType: "NEW_FOLLOW", triggerUserId: 4003, triggerUserName: "林溪", triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Linxi&backgroundColor=ffdfbf", referenceId: 0, referenceType: "profile", summary: "林溪关注了你", isRead: true, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 4, eventType: "POST_LIKED", triggerUserId: 4004, triggerUserName: "周屿", triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zhouyu&backgroundColor=d1d4f9", referenceId: 42, referenceType: "post", summary: "周屿赞了你的帖子", isRead: false, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: 5, eventType: "POST_COMMENTED", triggerUserId: 4001, triggerUserName: "夏言", triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Xiayan&backgroundColor=b6e3f4", referenceId: 42, referenceType: "post", summary: "夏言评论了你的帖子：\"写得真好！\"", isRead: false, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { id: 6, eventType: "TOPIC_REPLIED", triggerUserId: 4005, triggerUserName: "沈念", triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Shennian&backgroundColor=ffd5dc", referenceId: 15, referenceType: "topic", summary: "沈念回复了你的话题", isRead: true, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
];

function useMock() { return appEnv.apiMode === "mock"; }

const ASYNC_TIMEOUT_MS = 15000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    promise.then((r) => { clearTimeout(timer); resolve(r); }).catch((e) => { clearTimeout(timer); reject(e); });
  });
}

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
    interactionEventPage: 1,
    interactionEventHasMore: true,
    loading: false,
    errorMessage: null,
    filterType: "all",
  }),

  getters: {
    totalUnreadCount: (state): number => state.sessions.reduce((sum, s) => sum + s.unreadCount, 0),
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
        await withTimeout(
          Promise.all([this.fetchSessions(), this.fetchHeartSignals(), this.fetchNotifications()]),
          ASYNC_TIMEOUT_MS, "消息数据初始化超时，请检查网络后重试"
        );
      } catch (error) {
        if (!this.errorMessage) this.errorMessage = error instanceof Error ? error.message : "消息数据加载失败";
      }
    },

    async fetchSessions() {
      this.loading = true; this.errorMessage = null;
      try {
        await withTimeout((async () => {
          if (useMock()) {
            this.sessions = [...mockSessions].sort((a, b) => {
              if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
              return (b.lastMessageSentAt ? Date.parse(b.lastMessageSentAt) : 0) - (a.lastMessageSentAt ? Date.parse(a.lastMessageSentAt) : 0);
            });
            return;
          }
          const sessionStore = useSessionStore();
          const userId = sessionStore.userSession?.userId ?? "";
          const data = await request<ConversationView[]>({ url: `/messages/conversations?userId=${userId}`, method: "GET" });
          this.sessions = data.map(mapToMessageSession).sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return (b.lastMessageSentAt ? Date.parse(b.lastMessageSentAt) : 0) - (a.lastMessageSentAt ? Date.parse(a.lastMessageSentAt) : 0);
          });
        })(), ASYNC_TIMEOUT_MS, "加载会话列表超时");
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : "加载会话列表失败"; }
      finally { this.loading = false; }
    },

    async fetchSessionMessages(sessionId: string) {
      this.loading = true; this.errorMessage = null;
      try {
        await withTimeout((async () => {
          if (useMock()) {
            this.currentMessages = mockMessages[sessionId] ? [...mockMessages[sessionId]] : [];
            const s = this.sessions.find((x) => x.id === sessionId);
            if (s) s.unreadCount = 0;
            return;
          }
          const sessionStore = useSessionStore();
          const userId = sessionStore.userSession?.userId ?? "";
          const data = await request<BackendMessageView[]>({ url: `/messages/conversations/${sessionId}/messages?userId=${userId}`, method: "GET" });
          this.currentMessages = data.map(mapToMessageItem);
          const s = this.sessions.find((x) => x.id === sessionId);
          if (s) s.unreadCount = 0;
        })(), ASYNC_TIMEOUT_MS, "加载消息超时");
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : "加载消息失败"; }
      finally { this.loading = false; }
    },

    async sendMessage(sessionId: string, content: string) {
      this.errorMessage = null;
      try {
        if (!content || content.trim().length === 0) { this.errorMessage = "消息内容不能为空"; throw new Error("消息内容不能为空"); }
        if (content.length > 5000) { this.errorMessage = "消息内容过长，请分段发送"; throw new Error("消息内容过长，请分段发送"); }
        if (!sessionId || sessionId.trim().length === 0) { this.errorMessage = "会话 ID 无效"; throw new Error("会话 ID 无效"); }
        await withTimeout((async () => {
          if (useMock()) {
            const nm: MessageItem = { id: `msg-${Date.now()}`, sessionId, sender: "self", kind: "text", body: content, sentAt: new Date().toISOString() };
            this.currentMessages.push(nm);
            const s = this.sessions.find((x) => x.id === sessionId);
            if (s) { s.lastMessagePreview = content; s.lastMessageSentAt = nm.sentAt; }
            return nm;
          }
          const sessionStore = useSessionStore();
          const senderId = sessionStore.userSession?.userId ?? "";
          const result = await request<BackendMessageView, { senderId: string; content: string; kind: string }>({ url: `/messages/conversations/${sessionId}/messages`, method: "POST", data: { senderId, content, kind: "text" } });
          const mr = mapToMessageItem(result);
          this.currentMessages.push(mr);
          const s = this.sessions.find((x) => x.id === sessionId);
          if (s) { s.lastMessagePreview = content; s.lastMessageSentAt = mr.sentAt; }
          return mr;
        })(), ASYNC_TIMEOUT_MS, "发送消息超时，请重试");
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : "发送消息失败"; throw error; }
    },

    async fetchHeartSignals() {
      this.loading = true; this.errorMessage = null;
      try {
        await withTimeout((async () => {
          if (useMock()) { this.heartSignals = [...mockHeartSignals]; return; }
          const sessionStore = useSessionStore();
          const userId = sessionStore.userSession?.userId ?? "";
          const data = await request<MessageHeartSignal[]>({ url: `/matches/heart-signals?userId=${userId}`, method: "GET" });
          this.heartSignals = data;
        })(), ASYNC_TIMEOUT_MS, "加载心动信号超时");
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : "加载心动信号失败"; }
      finally { this.loading = false; }
    },

    async acceptHeartSignal(signalId: string): Promise<MessageSession | null> {
      this.errorMessage = null;
      try {
        if (!signalId || signalId.trim().length === 0) { this.errorMessage = "心动信号 ID 无效"; throw new Error("心动信号 ID 无效"); }
        return await withTimeout((async (): Promise<MessageSession | null> => {
          if (useMock()) {
            const signal = this.heartSignals.find((s) => s.id === signalId);
            if (!signal) throw new Error("心动信号不存在");
            if (signal.status !== "pending") throw new Error("心动信号已处理");
            const expiresAt = Date.parse(signal.expiresAt);
            if (Date.now() > expiresAt) { signal.status = "expired"; throw new Error("心动信号已过期"); }
            signal.status = "accepted";
            const ns: MessageSession = { id: `session-private-${signal.fromUserId}`, partnerId: signal.fromUserId, partnerName: signal.fromUserName, partnerAvatar: signal.fromUserAvatar, partnerHeadline: `${signal.school || ""} · ${signal.age || ""}岁 · ${signal.city || ""}`, lastMessagePreview: "你们已成为好友，开始聊天吧", lastMessageSentAt: new Date().toISOString(), unreadCount: 0, pinned: false, phase: "active", sessionType: "private", closesAt: null, closedReason: null };
            if (!this.sessions.find((s) => s.id === ns.id)) this.sessions.unshift(ns);
            return ns;
          }
          const sessionStore = useSessionStore();
          const userId = sessionStore.userSession?.userId ?? "";
          await request<void>({ url: `/matches/heart-signals/${signalId}/accept?userId=${userId}`, method: "POST" });
          const signal = this.heartSignals.find((s) => s.id === signalId);
          if (signal) signal.status = "accepted";
          await this.fetchSessions();
          return this.sessions.find((s) => s.sessionType === "private" && s.partnerId === signal?.fromUserId) ?? null;
        })(), ASYNC_TIMEOUT_MS, "接受心动信号超时，请重试");
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : "接受心动信号失败"; throw error; }
    },

    /**
     * 获取系统通知
     * Phase 3 更新：支持传入 filterType 按信号类型筛选
     */
    async fetchNotifications(filterType?: NotificationFilterType) {
      this.loading = true; this.errorMessage = null;
      if (filterType !== undefined) this.filterType = filterType;
      const activeFilter = this.filterType;
      try {
        await withTimeout((async () => {
          if (useMock()) {
            const all = [...mockNotifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
            if (activeFilter === "all") { this.notifications = all; }
            else { const target: SignalType = activeFilter === "social" ? "SOCIAL" : "CONTENT"; this.notifications = all.filter((n) => n.signalType === target); }
            return;
          }
          // Real 模式：按筛选调用不同端点
          if (activeFilter === "all") {
            const data = await request<BackendNotificationView[]>({ url: "/notifications", method: "GET" });
            this.notifications = data.map(mapToSystemNotification).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
          } else {
            const signalParam = activeFilter === "social" ? "SOCIAL" : "CONTENT";
            const data = await request<BackendNotificationView[]>({ url: `/notifications/list?page=0&size=100&signalType=${signalParam}`, method: "GET" });
            this.notifications = data.map(mapToSystemNotification).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
          }
        })(), ASYNC_TIMEOUT_MS, "加载通知超时");
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : "加载通知失败"; }
      finally { this.loading = false; }
    },

    async markNotificationRead(notificationId: string) {
      try {
        const n = this.notifications.find((x) => x.id === notificationId);
        if (!n || n.isRead) return;
        if (useMock()) { n.isRead = true; return; }
        await withTimeout(request<void>({ url: `/notifications/${notificationId}/read`, method: "PUT" }), ASYNC_TIMEOUT_MS, "标记通知已读超时");
        n.isRead = true;
      } catch { /* 静默失败 */ }
    },

    async markAllNotificationsRead() {
      try {
        if (useMock()) { this.notifications.forEach((n) => { n.isRead = true; }); return; }
        await withTimeout(request<void>({ url: "/notifications/read-all", method: "PUT" }), ASYNC_TIMEOUT_MS, "标记全部已读超时");
        this.notifications.forEach((n) => { n.isRead = true; });
      } catch { this.notifications.forEach((n) => { n.isRead = true; }); }
    },

    async fetchUnreadNotificationCount() {
      try {
        if (useMock()) return this.notifications.filter((n) => !n.isRead).length;
        const result = await withTimeout(request<UnreadCountView>({ url: "/notifications/unread-count", method: "GET" }), ASYNC_TIMEOUT_MS, "获取未读通知数量超时");
        return result.count ?? 0;
      } catch { return 0; }
    },

    async setSessionPinned(sessionId: string, pinned: boolean) {
      this.errorMessage = null;
      try {
        if (useMock()) { const s = this.sessions.find((x) => x.id === sessionId); if (s) s.pinned = pinned; return; }
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        await withTimeout(request<void>({ url: `/messages/conversations/${sessionId}/pin?pinned=${pinned}&userId=${userId}`, method: "PUT" }), ASYNC_TIMEOUT_MS, "置顶操作超时");
        const s = this.sessions.find((x) => x.id === sessionId);
        if (s) s.pinned = pinned;
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : "置顶操作失败"; throw error; }
    },

    async declineHeartSignal(signalId: string) {
      this.errorMessage = null;
      try {
        if (useMock()) { const s = this.heartSignals.find((x) => x.id === signalId); if (s) s.status = "expired"; return; }
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        await withTimeout(request<void>({ url: `/matches/heart-signals/${signalId}/decline?userId=${userId}`, method: "POST" }), ASYNC_TIMEOUT_MS, "拒绝心动信号超时");
        const s = this.heartSignals.find((x) => x.id === signalId);
        if (s) s.status = "expired";
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : "拒绝心动信号失败"; throw error; }
    },

    onNewMessage(message: MessageItem): void {
      this.currentMessages.push(message);
      const s = this.sessions.find((x) => x.id === message.sessionId);
      if (s) { s.lastMessagePreview = message.kind === "text" ? message.body : `[${message.kind}]`; s.lastMessageSentAt = message.sentAt; s.unreadCount += 1; }
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

    async loadInteractionEvents(page: number = 1) {
      this.loading = true; this.errorMessage = null;
      try {
        await withTimeout((async () => {
          if (useMock()) {
            const all = [...mockInteractionEvents].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
            if (page === 1) this.interactionEvents = all;
            else this.interactionEvents = [...this.interactionEvents, ...all];
            this.interactionEventPage = page; this.interactionEventHasMore = false;
            return;
          }
          const data = await request<InteractionEventView[]>({ url: `/interactions?page=${page}&pageSize=20`, method: "GET" });
          const mapped = data.map((item) => ({ id: item.id, eventType: item.eventType, triggerUserId: item.triggerUserId, triggerUserName: item.triggerUserName, triggerUserAvatar: item.triggerUserAvatar, referenceId: item.referenceId, referenceType: item.referenceType, summary: item.summary, isRead: item.isRead, createdAt: item.createdAt }));
          if (page === 1) this.interactionEvents = mapped;
          else this.interactionEvents = [...this.interactionEvents, ...mapped];
          this.interactionEventPage = page; this.interactionEventHasMore = mapped.length >= 20;
        })(), ASYNC_TIMEOUT_MS, "加载互动事件超时");
      } catch (error) { this.errorMessage = error instanceof Error ? error.message : "加载互动事件失败"; }
      finally { this.loading = false; }
    },

    async getUnreadInteractionCount(): Promise<number> {
      try {
        if (useMock()) return this.interactionEvents.filter((e) => !e.isRead).length;
        const result = await withTimeout(request<{ count: number }>({ url: "/interactions/unread-count", method: "GET" }), ASYNC_TIMEOUT_MS, "获取未读互动事件数超时");
        return result.count ?? 0;
      } catch { return this.interactionEvents.filter((e) => !e.isRead).length; }
    },

    async markInteractionRead(eventId: number) {
      try {
        const e = this.interactionEvents.find((x) => x.id === eventId);
        if (!e || e.isRead) return;
        if (useMock()) { e.isRead = true; return; }
        await withTimeout(request<void>({ url: `/interactions/${eventId}/read`, method: "PUT" }), ASYNC_TIMEOUT_MS, "标记互动事件已读超时");
        e.isRead = true;
      } catch { /* 静默失败 */ }
    },

    async markAllInteractionsRead() {
      try {
        if (useMock()) { this.interactionEvents.forEach((e) => { e.isRead = true; }); return; }
        await withTimeout(request<void>({ url: "/interactions/read-all", method: "PUT" }), ASYNC_TIMEOUT_MS, "标记全部互动事件已读超时");
        this.interactionEvents.forEach((e) => { e.isRead = true; });
      } catch { this.interactionEvents.forEach((e) => { e.isRead = true; }); }
    },
  },
});