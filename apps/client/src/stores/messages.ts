import { defineStore } from "pinia";
import { request } from "../services/http";
import { useSessionStore } from "./session";
import { useMock } from "./helpers/use-mock";
// 修复（严格模式 noUnusedLocals）：components 类型未在本文件引用，已移除。
import type { InteractionEventView } from "../services/generated/api-types-supplement";
// 2026-08-07 官方号体系：官方号账号/消息流类型（契约见 docs/openapi/official-accounts.yaml）
import type {
  OfficialAccountView,
  OfficialMessageView,
} from "../services/generated/api-types-supplement";
// 统一常量：异步操作超时时间
import { ASYNC_TIMEOUT_MS } from "../constants/growth";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";
// 录音修复：私信语音上传复用共享服务（携带 Authorization 头）
import { uploadVoiceFile } from "../services/voice-upload";
// infra R2-00028: mock 头像统一走 IMAGE_PATHS 体系
import { IMAGE_PATHS } from "../config/images";

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
  kind: "text" | "voice" | "emoji" | "system" | "activity";
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
  if (kind === "activity") {
    try {
      const parsed = JSON.parse(content) as { title?: string };
      if (parsed.title) return `[活动] ${parsed.title}`;
    } catch (_e) {
      // 解析失败走默认文案
    }
    return "[活动] 活动卡片";
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

/**
 * Mock 会话数据（2026-08-07 消息页重构：覆盖全部展示状态）：
 * - 置顶 + 未读（session-private-1）
 * - 未读 99+（session-private-4）
 * - 免打扰（session-private-2，muted）
 * - 官方号：产品助手号（带未读）/ 活动运营号
 * - 匿名匹配会话（temp_anonymous，蒙面头像）
 * - 多种消息预览类型：[语音] / [图片] / [表情]
 * 时间基于当前时刻动态生成，保证列表排序与「今天/昨天/更早」展示始终真实。
 */
const mockSessions: MessageSession[] = [
  {
    id: "session-private-1", partnerId: "user-2001", partnerName: "林夕", partnerAvatar: IMAGE_PATHS.DEFAULT_AVATAR,
    partnerHeadline: "大二 · 喜欢电影和咖啡", lastMessagePreview: "明天下午有空吗？",
    lastMessageSentAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(), unreadCount: 2, pinned: true,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
  },
  {
    id: "session-private-2", partnerId: "user-2002", partnerName: "陈默", partnerAvatar: "",
    partnerHeadline: "大三 · 自习搭子", lastMessagePreview: "[语音] 30″",
    lastMessageSentAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), unreadCount: 0, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
    muted: true,
  },
  {
    id: "session-official-assistant", partnerId: "official-assistant", partnerName: "产品助手",
    partnerAvatar: "", partnerHeadline: "系统通知 · 功能答疑", lastMessagePreview: "你的校园认证已通过审核 🎉",
    lastMessageSentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), unreadCount: 3, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
    isOfficial: true, officialAccountId: "official-assistant",
  },
  {
    id: "session-private-4", partnerId: "user-2006", partnerName: "夏言", partnerAvatar: IMAGE_PATHS.DEFAULT_AVATAR,
    partnerHeadline: "大四 · 周末爬山", lastMessagePreview: "[图片] 给你看看周末拍的风景",
    lastMessageSentAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), unreadCount: 128, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
  },
  {
    id: "session-temp-1", partnerId: "user-2004", partnerName: "匿名匹配 · 星河", partnerAvatar: "",
    partnerHeadline: "匿名匹配聊天", lastMessagePreview: "你好奇的天文馆我也去过！",
    lastMessageSentAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), unreadCount: 1, pinned: false,
    phase: "active", sessionType: "temp_anonymous", closesAt: null, closedReason: null,
  },
  {
    id: "session-private-3", partnerId: "user-2005", partnerName: "顾言", partnerAvatar: "",
    partnerHeadline: "研一 · 摄影爱好者", lastMessagePreview: "[表情] 😂 笑死",
    lastMessageSentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), unreadCount: 5, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
  },
  {
    id: "session-official-promoter", partnerId: "official-promoter", partnerName: "活动运营",
    partnerAvatar: "", partnerHeadline: "活动推送 · 福利通知", lastMessagePreview: "本周五同城桌游局报名开启，名额有限",
    lastMessageSentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), unreadCount: 0, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
    isOfficial: true, officialAccountId: "official-promoter",
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
    // 2026-08-08 活动卡片消息（mock 演示）：kind=activity，content 为 JSON
    {
      id: "msg-51",
      sessionId: "session-private-3",
      sender: "peer",
      kind: "activity",
      body: '{"title":"校园春日联谊会","desc":"一场轻松的春日联谊会，有破冰游戏、桌游互动、自由交流。","tag":"本周活动","targetUrl":"/pages/activities/detail?id=sample-weekend-party"}',
      sentAt: "2026-05-18T14:25:00Z",
    },
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
    resourceId: "post-42", actionUrl: "/pages/village/detail?id=post-42",
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
  { id: 1, eventType: "NEW_LIKE", triggerUserId: 4001, triggerUserName: "夏言", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 0, referenceType: "profile", summary: "夏言喜欢了你", isRead: false, createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 2, eventType: "NEW_VISITOR", triggerUserId: 4002, triggerUserName: "顾北", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 0, referenceType: "profile", summary: "顾北访问了你的主页", isRead: false, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: 3, eventType: "NEW_FOLLOW", triggerUserId: 4003, triggerUserName: "林溪", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 0, referenceType: "profile", summary: "林溪关注了你", isRead: true, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 4, eventType: "POST_LIKED", triggerUserId: 4004, triggerUserName: "周屿", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 42, referenceType: "post", summary: "周屿赞了你的帖子", isRead: false, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: 5, eventType: "POST_COMMENTED", triggerUserId: 4001, triggerUserName: "夏言", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 42, referenceType: "post", summary: "夏言评论了你的帖子：\"写得真好！\"", isRead: false, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { id: 6, eventType: "TOPIC_REPLIED", triggerUserId: 4005, triggerUserName: "沈念", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 15, referenceType: "topic", summary: "沈念回复了你的话题", isRead: true, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
];

// 注：ASYNC_TIMEOUT_MS 由 constants/growth.ts 统一提供

// 注：本文件曾自带一份 withTimeout 实现（与 services/http.ts 导出的 withTimeout 重复）。
// 因本地版本签名不同（第三参为自定义错误文案字符串，http.ts 版本第三参为 AbortSignal），
// 且调用点依赖本地错误文案（如“加载会话列表超时”），为不改变 20+ 处调用点的错误语义，
// 此处保留本地实现，但超时语义（clearTimeout + reject）与 services/http.ts 保持一致。
// 后续如需统一，可改为传入 AbortSignal 并迁移调用点错误文案。
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    promise.then((r) => { clearTimeout(timer); resolve(r); }).catch((e) => { clearTimeout(timer); reject(e); });
  });
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
    messagePage: 0,
    messageHasMore: true,
    activeSessionId: null,
    loading: false,
    errorMessage: null,
    filterType: "all",
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
        await withTimeout(
          Promise.all([this.fetchSessions(), this.fetchHeartSignals(), this.fetchNotifications()]),
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
          // 2026-08-07 官方号体系：real 模式并行拉取官方号账号 + 消息流，
          // 映射为 isOfficial 会话与普通会话一起排序（官方未读先置 0，后端暂未计数）
          const [officialAccounts, ...accountMessages] = await Promise.all([
            request<OfficialAccountView[]>({ url: "/official-accounts", method: "GET" }).catch(() => []),
            ...["official-assistant", "official-promoter"].map((code) =>
              request<OfficialMessageView[]>({ url: `/official-accounts/${encodeURIComponent(code)}/messages`, method: "GET" }).catch(() => [])
            ),
          ]);
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
      } catch (_e) { /* 静默失败 */ }
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
     */
    setSessionMuted(sessionId: string, muted: boolean) {
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) session.muted = muted;
    },

    /**
     * 2026-08-07 消息页重构：标为未读（长按菜单）。
     * 将已读会话重新标记为 1 条未读，恢复红色角标。
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
     */
    markSessionRead(sessionId: string) {
      const session = this.sessions.find((s) => s.id === sessionId);
      if (session) {
        session.unreadCount = 0;
      }
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
        s.lastMessagePreview = message.kind === "text" ? message.body : `[${message.kind}]`;
        s.lastMessageSentAt = message.sentAt;
        // 正在查看该会话时不累加未读数（读态由后端 markAsRead 闭环）；
        // 其他会话（含免打扰语义外的会话）照常 +1
        if (!isActive) s.unreadCount += 1;
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
    async loadInteractionEvents(page: number = 1) {
      // 修复（P1 BUG）：递增 token，旧请求的响应被静默丢弃
      const token = ++loadInteractionEventsToken;
      this.loading = true; this.errorMessage = null;
      try {
        await withTimeout((async () => {
          if (useMock()) {
            // 修复：旧请求返回时不再修改状态
            if (token !== loadInteractionEventsToken) return;
            const all = [...mockInteractionEvents].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
            if (page === 1) this.interactionEvents = all;
            else this.interactionEvents = [...this.interactionEvents, ...all];
            this.interactionEventPage = page; this.interactionEventHasMore = false;
            return;
          }
          // 修复（P0-04）：互动事件端点统一挂 /notifications 前缀，分页参数为 size（后端 InteractionEventController 契约）
          const data = await request<InteractionEventView[]>({ url: `/notifications/interactions?page=${page}&size=20`, method: "GET" });
          // 修复：旧请求返回时不再修改状态
          if (token !== loadInteractionEventsToken) return;
          const mapped = data.map(mapToInteractionEvent); // infra R2-00031: 使用抽取的映射函数
          if (page === 1) this.interactionEvents = mapped;
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