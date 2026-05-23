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
}

/**
 * 互动事件
 * 用于互动提醒增强功能，展示更丰富的互动信息
 */
export interface InteractionEvent {
  id: number;
  /** 事件类型 */
  eventType: "NEW_LIKE" | "NEW_VISITOR" | "NEW_FOLLOW" | "POST_LIKED" | "POST_COMMENTED" | "TOPIC_REPLIED";
  /** 触发用户 ID */
  triggerUserId: number;
  /** 触发用户名称 */
  triggerUserName: string;
  /** 触发用户头像 */
  triggerUserAvatar: string;
  /** 关联资源 ID */
  referenceId: number;
  /** 关联资源类型 */
  referenceType: string;
  /** 事件摘要 */
  summary: string;
  /** 是否已读 */
  isRead: boolean;
  /** 事件创建时间 */
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
  /** 会话列表 */
  sessions: MessageSession[];
  /** 当前活跃会话的消息 */
  currentMessages: MessageItem[];
  /** 心动信号列表 */
  heartSignals: MessageHeartSignal[];
  /** 系统通知列表 */
  notifications: SystemNotification[];
  /** 互动事件列表 */
  interactionEvents: InteractionEvent[];
  /** 互动事件当前页码 */
  interactionEventPage: number;
  /** 互动事件是否还有更多 */
  interactionEventHasMore: boolean;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  errorMessage: string | null;
}

/* ========== 后端视图类型 ========== */

/**
 * 后端 ConversationView 类型
 * 对应后端 record ConversationView(Long id, String conversationUid, Long userAId, Long userBId, String otherUserName, String otherUserAvatar, String lastMessagePreview, String lastMessageAt, int unreadCount, String headline, Boolean pinned, String phase, String sessionType)
 */
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
  /** 对方用户简介/标题 */
  headline: string;
  /** 是否置顶 */
  pinned: boolean;
  /** 会话阶段：matching/active/closing/closed */
  phase: string;
  /** 会话类型：private/temp_anonymous */
  sessionType: string;
}

/**
 * 后端 MessageView 类型
 * 对应后端 record MessageView(Long id, Long conversationId, Long senderId, String content, String messageKind, boolean isRead, String createdAt)
 */
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
 * 后端 NotificationView 类型
 * 对应后端 record NotificationView(Long id, String type, NotificationSourceUserView sourceUser, Long referenceId, String referenceType, boolean isRead, String createdAt, String summary)
 */
export interface BackendNotificationView {
  id: number;
  type: string;
  sourceUser: {
    displayName: string;
    avatar: string;
  } | null;
  referenceId: number | null;
  referenceType: string | null;
  isRead: boolean;
  createdAt: string;
  summary: string;
}

/**
 * 后端 UnreadCountView 类型
 */
export interface UnreadCountView {
  count: number;
}

/**
 * 将后端 ConversationView 映射为前端 MessageSession
 */
function mapToMessageSession(raw: ConversationView): MessageSession {
  const sessionStore = useSessionStore();
  const currentUserId = sessionStore.userSession?.userId ?? "";
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

/**
 * 将后端 MessageView 映射为前端 MessageItem
 */
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

/**
 * 将后端 NotificationView 映射为前端 SystemNotification
 */
function mapToSystemNotification(raw: BackendNotificationView): SystemNotification {
  return {
    id: String(raw.id),
    type: mapNotificationType(raw.type),
    title: raw.summary,
    content: raw.summary,
    isRead: raw.isRead,
    createdAt: raw.createdAt,
    actionUrl: null,
    triggerUserId: raw.sourceUser ? String(raw.sourceUser) : null,
    resourceId: raw.referenceId ? String(raw.referenceId) : null,
  };
}

/**
 * 将后端通知类型映射为前端通知类型
 */
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
    id: "session-private-1",
    partnerId: "user-2001",
    partnerName: "林夕",
    partnerAvatar: "",
    partnerHeadline: "大二 · 喜欢电影和咖啡",
    lastMessagePreview: "明天下午有空吗？",
    lastMessageSentAt: "2026-05-20T18:30:00Z",
    unreadCount: 2,
    pinned: true,
    phase: "active",
    sessionType: "private",
    closesAt: null,
    closedReason: null,
  },
  {
    id: "session-private-2",
    partnerId: "user-2002",
    partnerName: "陈默",
    partnerAvatar: "",
    partnerHeadline: "大三 · 自习搭子",
    lastMessagePreview: "图书馆三楼见",
    lastMessageSentAt: "2026-05-19T21:00:00Z",
    unreadCount: 0,
    pinned: false,
    phase: "active",
    sessionType: "private",
    closesAt: null,
    closedReason: null,
  },
  {
    id: "session-private-3",
    partnerId: "user-2005",
    partnerName: "顾言",
    partnerAvatar: "",
    partnerHeadline: "研一 · 摄影爱好者",
    lastMessagePreview: "上次拍的那组照片发你了",
    lastMessageSentAt: "2026-05-18T14:20:00Z",
    unreadCount: 5,
    pinned: false,
    phase: "active",
    sessionType: "private",
    closesAt: null,
    closedReason: null,
  },
  {
    id: "session-temp-1",
    partnerId: "user-2004",
    partnerName: "对方",
    partnerAvatar: "",
    partnerHeadline: "24小时临时聊天",
    lastMessagePreview: "嗨，我是通过匹配进来的",
    lastMessageSentAt: "2026-05-20T20:00:00Z",
    unreadCount: 1,
    pinned: false,
    phase: "active",
    sessionType: "temp_anonymous",
    closesAt: "2026-05-21T20:00:00Z",
    closedReason: null,
  },
];

const mockMessages: Record<string, MessageItem[]> = {
  "session-private-1": [
    {
      id: "msg-1",
      sessionId: "session-private-1",
      sender: "peer",
      kind: "text",
      body: "嗨，看到你的资料觉得挺有缘的",
      sentAt: "2026-05-20T18:00:00Z",
    },
    {
      id: "msg-2",
      sessionId: "session-private-1",
      sender: "self",
      kind: "text",
      body: "哈哈，我也觉得",
      sentAt: "2026-05-20T18:05:00Z",
    },
    {
      id: "msg-3",
      sessionId: "session-private-1",
      sender: "peer",
      kind: "text",
      body: "明天下午有空吗？",
      sentAt: "2026-05-20T18:30:00Z",
    },
  ],
  "session-private-2": [
    {
      id: "msg-4",
      sessionId: "session-private-2",
      sender: "peer",
      kind: "text",
      body: "图书馆三楼见",
      sentAt: "2026-05-19T21:00:00Z",
    },
  ],
  "session-private-3": [
    {
      id: "msg-5",
      sessionId: "session-private-3",
      sender: "peer",
      kind: "text",
      body: "上次拍的那组照片发你了",
      sentAt: "2026-05-18T14:20:00Z",
    },
  ],
  "session-temp-1": [
    {
      id: "msg-6",
      sessionId: "session-temp-1",
      sender: "peer",
      kind: "text",
      body: "嗨，我是通过匹配进来的",
      sentAt: "2026-05-20T20:00:00Z",
    },
  ],
};

const mockHeartSignals: MessageHeartSignal[] = [
  {
    id: "signal-1",
    fromUserId: "user-2003",
    fromUserName: "苏晴",
    fromUserAvatar: "",
    status: "pending",
    sentAt: "2026-05-20T16:45:00Z",
    expiresAt: "2026-05-21T16:45:00Z",
    school: "南校区",
    age: 20,
    city: "广州",
    bioHighlight: "ta的介绍很丰富，对于找对象ta是认真的",
  },
];

const mockNotifications: SystemNotification[] = [
  {
    id: "notif-1",
    type: "match",
    title: "新的匹配",
    content: "你与林夕成功匹配，可以开始聊天了",
    isRead: false,
    createdAt: "2026-05-20T14:00:00Z",
    actionUrl: "/pages/chat-session/index?sessionId=session-private-1",
  },
  {
    id: "notif-2",
    type: "system",
    title: "资料完善提醒",
    content: "完善资料可以提高匹配成功率哦",
    isRead: true,
    createdAt: "2026-05-18T10:00:00Z",
    actionUrl: "/profile",
  },
  {
    id: "notif-3",
    type: "like",
    title: "有人喜欢你",
    content: "一位匿名用户对你点了喜欢，快去寻觅页看看吧",
    isRead: false,
    createdAt: "2026-05-19T09:30:00Z",
    actionUrl: "/pages/likes/index",
  },
  // ===== 互动类型通知 =====
  {
    id: "notif-4",
    type: "follow",
    title: "新的关注",
    content: "苏晴关注了你",
    isRead: false,
    createdAt: "2026-05-21T10:00:00Z",
    triggerUserId: "user-2003",
    actionUrl: "/pages/profile/index?userId=user-2003",
  },
  {
    id: "notif-6",
    type: "comment",
    title: "新的评论",
    content: "林夕评论了你的帖子：\"写得真好！\"",
    isRead: false,
    createdAt: "2026-05-20T20:30:00Z",
    triggerUserId: "user-2001",
    resourceId: "post-42",
    actionUrl: "/pages/post/detail?id=post-42",
  },
  {
    id: "notif-7",
    type: "visitor",
    title: "新的访客",
    content: "顾北访问了你的主页",
    isRead: true,
    createdAt: "2026-05-20T16:00:00Z",
    triggerUserId: "user-2002",
    actionUrl: "/pages/profile/index?userId=user-2002",
  },
  {
    id: "notif-8",
    type: "interaction_match",
    title: "双向喜欢",
    content: "你和夏言互相喜欢了，快去看看",
    isRead: false,
    createdAt: "2026-05-21T08:45:00Z",
    triggerUserId: "user-4001",
    actionUrl: "/pages/messages/index",
  },
  {
    id: "notif-9",
    type: "interaction_like",
    title: "新的赞",
    content: "周屿赞了你的帖子",
    isRead: false,
    createdAt: "2026-05-21T09:15:00Z",
    triggerUserId: "user-4004",
    resourceId: "post-58",
    actionUrl: "/pages/post/detail?id=post-58",
  },
];

function useMock() {
  return appEnv.apiMode === "mock";
}

/* ========== 互动事件 Mock 数据 ========== */

/** Mock 互动事件列表 */
const mockInteractionEvents: InteractionEvent[] = [
  {
    id: 1,
    eventType: "NEW_LIKE",
    triggerUserId: 4001,
    triggerUserName: "夏言",
    triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Xiayan&backgroundColor=b6e3f4",
    referenceId: 0,
    referenceType: "profile",
    summary: "夏言喜欢了你",
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    eventType: "NEW_VISITOR",
    triggerUserId: 4002,
    triggerUserName: "顾北",
    triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gubei&backgroundColor=c0aede",
    referenceId: 0,
    referenceType: "profile",
    summary: "顾北访问了你的主页",
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    eventType: "NEW_FOLLOW",
    triggerUserId: 4003,
    triggerUserName: "林溪",
    triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Linxi&backgroundColor=ffdfbf",
    referenceId: 0,
    referenceType: "profile",
    summary: "林溪关注了你",
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    eventType: "POST_LIKED",
    triggerUserId: 4004,
    triggerUserName: "周屿",
    triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zhouyu&backgroundColor=d1d4f9",
    referenceId: 42,
    referenceType: "post",
    summary: "周屿赞了你的帖子",
    isRead: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    eventType: "POST_COMMENTED",
    triggerUserId: 4001,
    triggerUserName: "夏言",
    triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Xiayan&backgroundColor=b6e3f4",
    referenceId: 42,
    referenceType: "post",
    summary: "夏言评论了你的帖子：\"写得真好！\"",
    isRead: false,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 6,
    eventType: "TOPIC_REPLIED",
    triggerUserId: 4005,
    triggerUserName: "沈念",
    triggerUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Shennian&backgroundColor=ffd5dc",
    referenceId: 15,
    referenceType: "topic",
    summary: "沈念回复了你的话题",
    isRead: true,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
];

/** 异步操作超时时间（毫秒） */
const ASYNC_TIMEOUT_MS = 15000;

/**
 * 带超时的 Promise 包装器
 * @param promise - 目标 Promise
 * @param timeoutMs - 超时毫秒数
 * @param errorMessage - 超时错误消息
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * 消息中心 Store
 *
 * 管理聊天会话、心动信号和系统通知。
 * 这是现有 chat store 的升级版本，整合了更多消息相关功能。
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
  }),

  getters: {
    /** 未读消息总数 */
    totalUnreadCount: (state): number => {
      return state.sessions.reduce((sum, session) => sum + session.unreadCount, 0);
    },
    /** 未读通知数量 */
    unreadNotificationCount: (state): number => {
      return state.notifications.filter((n) => !n.isRead).length;
    },
    /** 置顶会话 */
    pinnedSessions: (state): MessageSession[] => {
      return state.sessions.filter((s) => s.pinned);
    },
    /** 普通会话 */
    unpinnedSessions: (state): MessageSession[] => {
      return state.sessions.filter((s) => !s.pinned);
    },
    /** 待处理的心动信号 */
    pendingHeartSignals: (state): MessageHeartSignal[] => {
      return state.heartSignals.filter((s) => s.status === "pending");
    },
    /** 私信会话 */
    privateSessions: (state): MessageSession[] => {
      return state.sessions.filter((s) => s.sessionType === "private");
    },
    /** 临时匿名会话 */
    tempSessions: (state): MessageSession[] => {
      return state.sessions.filter((s) => s.sessionType === "temp_anonymous");
    },
    /** 未读互动事件数量 */
    unreadInteractionEventCount: (state): number => {
      return state.interactionEvents.filter((e) => !e.isRead).length;
    },
  },

  actions: {
    /**
     * 初始化所有消息数据
     */
    async bootstrap() {
      try {
        await withTimeout(
          Promise.all([
            this.fetchSessions(),
            this.fetchHeartSignals(),
            this.fetchNotifications(),
          ]),
          ASYNC_TIMEOUT_MS,
          "消息数据初始化超时，请检查网络后重试"
        );
      } catch (error) {
        // bootstrap 失败不阻塞页面渲染，由子方法各自设置 errorMessage
        if (!this.errorMessage) {
          this.errorMessage = error instanceof Error ? error.message : "消息数据加载失败";
        }
      }
    },

    /**
     * 获取会话列表
     */
    async fetchSessions() {
      this.loading = true;
      this.errorMessage = null;

      try {
        await withTimeout(
          (async () => {
            if (useMock()) {
              this.sessions = [...mockSessions].sort((a, b) => {
                if (a.pinned !== b.pinned) {
                  return a.pinned ? -1 : 1;
                }
                const aTime = a.lastMessageSentAt ? Date.parse(a.lastMessageSentAt) : 0;
                const bTime = b.lastMessageSentAt ? Date.parse(b.lastMessageSentAt) : 0;
                return bTime - aTime;
              });
              return;
            }

            // 调用后端 API: GET /api/messages/conversations?userId={userId}
            const sessionStore = useSessionStore();
            const userId = sessionStore.userSession?.userId ?? "";
            const data = await request<ConversationView[]>({
              url: `/messages/conversations?userId=${userId}`,
              method: "GET",
            });
            this.sessions = data.map(mapToMessageSession).sort((a, b) => {
              if (a.pinned !== b.pinned) {
                return a.pinned ? -1 : 1;
              }
              const aTime = a.lastMessageSentAt ? Date.parse(a.lastMessageSentAt) : 0;
              const bTime = b.lastMessageSentAt ? Date.parse(b.lastMessageSentAt) : 0;
              return bTime - aTime;
            });
          })(),
          ASYNC_TIMEOUT_MS,
          "加载会话列表超时"
        );
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载会话列表失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 获取指定会话的消息
     * @param sessionId - 会话 ID
     */
    async fetchSessionMessages(sessionId: string) {
      this.loading = true;
      this.errorMessage = null;

      try {
        await withTimeout(
          (async () => {
            if (useMock()) {
              this.currentMessages = mockMessages[sessionId] ? [...mockMessages[sessionId]] : [];

              const session = this.sessions.find((s) => s.id === sessionId);
              if (session) {
                session.unreadCount = 0;
              }
              return;
            }

            // 调用后端 API: GET /api/messages/conversations/{sessionId}/messages?userId={userId}
            const sessionStore = useSessionStore();
            const userId = sessionStore.userSession?.userId ?? "";
            const data = await request<BackendMessageView[]>({
              url: `/messages/conversations/${sessionId}/messages?userId=${userId}`,
              method: "GET",
            });
            this.currentMessages = data.map(mapToMessageItem);

            const session = this.sessions.find((s) => s.id === sessionId);
            if (session) {
              session.unreadCount = 0;
            }
          })(),
          ASYNC_TIMEOUT_MS,
          "加载消息超时"
        );
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载消息失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 发送消息
     * @param sessionId - 会话 ID
     * @param content - 消息内容
     */
    async sendMessage(sessionId: string, content: string) {
      this.errorMessage = null;

      try {
        // 消息非空检查
        if (!content || content.trim().length === 0) {
          this.errorMessage = "消息内容不能为空";
          throw new Error("消息内容不能为空");
        }

        // 消息长度检查（防止过长的消息）
        if (content.length > 5000) {
          this.errorMessage = "消息内容过长，请分段发送";
          throw new Error("消息内容过长，请分段发送");
        }

        // 会话 ID 校验
        if (!sessionId || sessionId.trim().length === 0) {
          this.errorMessage = "会话 ID 无效";
          throw new Error("会话 ID 无效");
        }

        await withTimeout(
          (async () => {
            if (useMock()) {
              const newMessage: MessageItem = {
                id: `msg-${Date.now()}`,
                sessionId,
                sender: "self",
                kind: "text",
                body: content,
                sentAt: new Date().toISOString(),
              };
              this.currentMessages.push(newMessage);

              const session = this.sessions.find((s) => s.id === sessionId);
              if (session) {
                session.lastMessagePreview = content;
                session.lastMessageSentAt = newMessage.sentAt;
              }
              return newMessage;
            }

            // 调用后端 API: POST /api/messages/conversations/{sessionId}/messages
            // 后端请求体: SendMessageRequest(senderId, content, kind)
            const sessionStore = useSessionStore();
            const senderId = sessionStore.userSession?.userId ?? "";
            const result = await request<BackendMessageView, { senderId: string; content: string; kind: string }>({
              url: `/messages/conversations/${sessionId}/messages`,
              method: "POST",
              data: { senderId, content, kind: "text" },
            });
            const mappedResult = mapToMessageItem(result);
            this.currentMessages.push(mappedResult);

            const session = this.sessions.find((s) => s.id === sessionId);
            if (session) {
              session.lastMessagePreview = content;
              session.lastMessageSentAt = mappedResult.sentAt;
            }
            return mappedResult;
          })(),
          ASYNC_TIMEOUT_MS,
          "发送消息超时，请重试"
        );
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "发送消息失败";
        throw error;
      }
    },

    /**
     * 获取心动信号列表
     */
    async fetchHeartSignals() {
      this.loading = true;
      this.errorMessage = null;

      try {
        await withTimeout(
          (async () => {
            if (useMock()) {
              this.heartSignals = [...mockHeartSignals];
              return;
            }

            // 调用后端 API: GET /api/matches/heart-signals?userId={userId}
            const sessionStore = useSessionStore();
            const userId = sessionStore.userSession?.userId ?? "";
            const data = await request<MessageHeartSignal[]>({
              url: `/matches/heart-signals?userId=${userId}`,
              method: "GET",
            });
            this.heartSignals = data;
          })(),
          ASYNC_TIMEOUT_MS,
          "加载心动信号超时"
        );
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载心动信号失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 接受心动信号并创建私信会话
     * @param signalId - 心动信号 ID
     */
    async acceptHeartSignal(signalId: string): Promise<MessageSession | null> {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!signalId || signalId.trim().length === 0) {
          this.errorMessage = "心动信号 ID 无效";
          throw new Error("心动信号 ID 无效");
        }

        return await withTimeout(
          (async (): Promise<MessageSession | null> => {
            if (useMock()) {
              const signal = this.heartSignals.find((s) => s.id === signalId);
              if (!signal) {
                throw new Error("心动信号不存在");
              }
              if (signal.status !== "pending") {
                throw new Error("心动信号已处理");
              }

              // 过期检查
              const expiresAt = Date.parse(signal.expiresAt);
              const now = Date.now();
              if (now > expiresAt) {
                signal.status = "expired";
                throw new Error("心动信号已过期");
              }

              signal.status = "accepted";

              // 创建私信会话
              const newSession: MessageSession = {
                id: `session-private-${signal.fromUserId}`,
                partnerId: signal.fromUserId,
                partnerName: signal.fromUserName,
                partnerAvatar: signal.fromUserAvatar,
                partnerHeadline: `${signal.school || ""} · ${signal.age || ""}岁 · ${signal.city || ""}`,
                lastMessagePreview: "你们已成为好友，开始聊天吧",
                lastMessageSentAt: new Date().toISOString(),
                unreadCount: 0,
                pinned: false,
                phase: "active",
                sessionType: "private",
                closesAt: null,
                closedReason: null,
              };

              // 避免重复创建
              if (!this.sessions.find((s) => s.id === newSession.id)) {
                this.sessions.unshift(newSession);
              }

              return newSession;
            }

            // 调用后端 API: POST /api/matches/heart-signals/{signalId}/accept?userId={userId}
            const sessionStore = useSessionStore();
            const userId = sessionStore.userSession?.userId ?? "";
            await request<void>({
              url: `/matches/heart-signals/${signalId}/accept?userId=${userId}`,
              method: "POST",
            });

            // 更新心动信号状态
            const signal = this.heartSignals.find((s) => s.id === signalId);
            if (signal) {
              signal.status = "accepted";
            }

            // 后端 acceptHeartSignal 返回 void，不返回 session
            // 需要刷新会话列表来获取新创建的会话
            await this.fetchSessions();

            // 从刷新后的会话列表中查找新创建的会话
            const newSession = this.sessions.find(
              (s) => s.sessionType === "private" && s.partnerId === signal?.fromUserId
            ) ?? null;
            return newSession;
          })(),
          ASYNC_TIMEOUT_MS,
          "接受心动信号超时，请重试"
        );
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "接受心动信号失败";
        throw error;
      }
    },

    /**
     * 获取系统通知（GET /api/notifications）
     */
    async fetchNotifications() {
      this.loading = true;
      this.errorMessage = null;

      try {
        await withTimeout(
          (async () => {
            if (useMock()) {
              this.notifications = [...mockNotifications].sort(
                (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
              );
              return;
            }

            // 调用后端 API: GET /api/notifications
            // 后端返回 NotificationView 列表
            const data = await request<BackendNotificationView[]>({
              url: "/notifications",
              method: "GET",
            });

            this.notifications = data.map(mapToSystemNotification).sort(
              (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
            );
          })(),
          ASYNC_TIMEOUT_MS,
          "加载通知超时"
        );
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载通知失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 标记通知为已读
     * @param notificationId - 通知 ID
     */
    async markNotificationRead(notificationId: string) {
      try {
        const notification = this.notifications.find((n) => n.id === notificationId);
        if (!notification) return;
        if (notification.isRead) return;

        if (useMock()) {
          notification.isRead = true;
          return;
        }

        // 调用后端 API: PUT /api/notifications/{id}/read
        await withTimeout(
          request<void>({
            url: `/notifications/${notificationId}/read`,
            method: "PUT",
          }),
          ASYNC_TIMEOUT_MS,
          "标记通知已读超时"
        );
        notification.isRead = true;
      } catch {
        // 静默失败，不阻塞 UI
      }
    },

    /**
     * 标记所有通知为已读
     * Real 模式调用 PUT /api/notifications/read-all
     */
    async markAllNotificationsRead() {
      try {
        if (useMock()) {
          this.notifications.forEach((n) => {
            n.isRead = true;
          });
          return;
        }

        // 调用后端 API: PUT /api/notifications/read-all
        await withTimeout(
          request<void>({
            url: "/notifications/read-all",
            method: "PUT",
          }),
          ASYNC_TIMEOUT_MS,
          "标记全部已读超时"
        );

        // 更新本地状态
        this.notifications.forEach((n) => {
          n.isRead = true;
        });
      } catch {
        // 静默失败，本地状态仍更新
        this.notifications.forEach((n) => {
          n.isRead = true;
        });
      }
    },

    /**
     * 获取未读通知数量（独立 API：GET /api/notifications/unread-count）
     */
    async fetchUnreadNotificationCount() {
      try {
        if (useMock()) {
          // mock 模式下从本地 notifications 计算
          const count = this.notifications.filter((n) => !n.isRead).length;
          return count;
        }

        // 调用后端 API: GET /api/notifications/unread-count
        // 后端返回 UnreadCountView(count)
        const result = await withTimeout(
          request<UnreadCountView>({
            url: "/notifications/unread-count",
            method: "GET",
          }),
          ASYNC_TIMEOUT_MS,
          "获取未读通知数量超时"
        );
        return result.count ?? 0;
      } catch {
        // 静默失败，返回 0
        return 0;
      }
    },

    /**
     * 置顶/取消置顶会话
     * @param sessionId - 会话 ID
     * @param pinned - 是否置顶
     */
    async setSessionPinned(sessionId: string, pinned: boolean) {
      this.errorMessage = null;

      try {
        if (useMock()) {
          const session = this.sessions.find((s) => s.id === sessionId);
          if (session) {
            session.pinned = pinned;
          }
          return;
        }

        // 调用后端 API: PUT /api/messages/conversations/{sessionId}/pin?pinned={pinned}
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        await withTimeout(
          request<void>({
            url: `/messages/conversations/${sessionId}/pin?pinned=${pinned}&userId=${userId}`,
            method: "PUT",
          }),
          ASYNC_TIMEOUT_MS,
          "置顶操作超时"
        );

        const session = this.sessions.find((s) => s.id === sessionId);
        if (session) {
          session.pinned = pinned;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "置顶操作失败";
        throw error;
      }
    },

    /**
     * 拒绝心动信号
     * @param signalId - 心动信号 ID
     */
    async declineHeartSignal(signalId: string) {
      this.errorMessage = null;

      try {
        if (useMock()) {
          const signal = this.heartSignals.find((s) => s.id === signalId);
          if (signal) {
            signal.status = "expired";
          }
          return;
        }

        // 调用后端 API: POST /api/matches/heart-signals/{signalId}/decline?userId={userId}
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        await withTimeout(
          request<void>({
            url: `/matches/heart-signals/${signalId}/decline?userId=${userId}`,
            method: "POST",
          }),
          ASYNC_TIMEOUT_MS,
          "拒绝心动信号超时"
        );

        // 更新本地状态
        const signal = this.heartSignals.find((s) => s.id === signalId);
        if (signal) {
          signal.status = "expired";
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "拒绝心动信号失败";
        throw error;
      }
    },

    /**
     * 清空当前会话消息
     */
    clearCurrentMessages() {
      this.currentMessages = [];
    },

    /**
     * 加载互动事件列表
     * 支持分页加载，首次加载重置列表，后续追加数据
     * Mock 模式提供本地测试数据，Real 模式调用 GET /api/interactions?page={page}
     * @param page - 页码（从1开始）
     */
    async loadInteractionEvents(page: number = 1) {
      this.loading = true;
      this.errorMessage = null;

      try {
        await withTimeout(
          (async () => {
            if (useMock()) {
              // Mock 模式：使用本地硬编码的互动事件数据
              const allEvents = [...mockInteractionEvents].sort(
                (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
              );
              // Mock 模式不分页，直接返回全部数据
              if (page === 1) {
                this.interactionEvents = allEvents;
              } else {
                this.interactionEvents = [...this.interactionEvents, ...allEvents];
              }
              this.interactionEventPage = page;
              this.interactionEventHasMore = false;
              return;
            }

            // 调用后端 API: GET /api/interactions?page={page}&pageSize=20
            const data = await request<InteractionEventView[]>({
              url: `/interactions?page=${page}&pageSize=20`,
              method: "GET",
            });

            // 将后端 InteractionEventView 映射为前端 InteractionEvent
            const mappedEvents: InteractionEvent[] = data.map((item) => ({
              id: item.id,
              eventType: item.eventType,
              triggerUserId: item.triggerUserId,
              triggerUserName: item.triggerUserName,
              triggerUserAvatar: item.triggerUserAvatar,
              referenceId: item.referenceId,
              referenceType: item.referenceType,
              summary: item.summary,
              isRead: item.isRead,
              createdAt: item.createdAt,
            }));

            if (page === 1) {
              this.interactionEvents = mappedEvents;
            } else {
              this.interactionEvents = [...this.interactionEvents, ...mappedEvents];
            }
            this.interactionEventPage = page;
            // 返回数据不足一页时，说明没有更多数据
            this.interactionEventHasMore = mappedEvents.length >= 20;
          })(),
          ASYNC_TIMEOUT_MS,
          "加载互动事件超时"
        );
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载互动事件失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 获取未读互动事件数
     * Mock 模式从本地数据计算，Real 模式调用 GET /api/interactions/unread-count
     * @returns 未读互动事件数量
     */
    async getUnreadInteractionCount(): Promise<number> {
      try {
        if (useMock()) {
          // Mock 模式：从本地互动事件列表中统计未读数
          return this.interactionEvents.filter((e) => !e.isRead).length;
        }

        // 调用后端 API: GET /api/interactions/unread-count
        const result = await withTimeout(
          request<{ count: number }>({
            url: "/interactions/unread-count",
            method: "GET",
          }),
          ASYNC_TIMEOUT_MS,
          "获取未读互动事件数超时"
        );
        return result.count ?? 0;
      } catch {
        // 静默失败，返回本地计算的未读数
        return this.interactionEvents.filter((e) => !e.isRead).length;
      }
    },

    /**
     * 标记单个互动事件为已读
     * Mock 模式直接更新本地状态，Real 模式调用 PUT /api/interactions/{eventId}/read
     * @param eventId - 互动事件 ID
     */
    async markInteractionRead(eventId: number) {
      try {
        // 本地状态查找
        const event = this.interactionEvents.find((e) => e.id === eventId);
        if (!event || event.isRead) return;

        if (useMock()) {
          // Mock 模式：直接更新本地状态
          event.isRead = true;
          return;
        }

        // 调用后端 API: PUT /api/interactions/{eventId}/read
        await withTimeout(
          request<void>({
            url: `/interactions/${eventId}/read`,
            method: "PUT",
          }),
          ASYNC_TIMEOUT_MS,
          "标记互动事件已读超时"
        );
        event.isRead = true;
      } catch {
        // 静默失败，不阻塞 UI
      }
    },

    /**
     * 标记所有互动事件为已读
     * Mock 模式直接更新本地状态，Real 模式调用 PUT /api/interactions/read-all
     */
    async markAllInteractionsRead() {
      try {
        if (useMock()) {
          // Mock 模式：直接更新本地所有互动事件为已读
          this.interactionEvents.forEach((e) => {
            e.isRead = true;
          });
          return;
        }

        // 调用后端 API: PUT /api/interactions/read-all
        await withTimeout(
          request<void>({
            url: "/interactions/read-all",
            method: "PUT",
          }),
          ASYNC_TIMEOUT_MS,
          "标记全部互动事件已读超时"
        );

        // 更新本地状态
        this.interactionEvents.forEach((e) => {
          e.isRead = true;
        });
      } catch {
        // 静默失败，本地状态仍更新
        this.interactionEvents.forEach((e) => {
          e.isRead = true;
        });
      }
    },
  },
});
