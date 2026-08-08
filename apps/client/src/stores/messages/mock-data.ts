/**
 * Messages Store Mock 数据（mock 模式专用）。
 *
 * 隔离原则：本文件仅被 stores/messages.ts 的 useMock() 分支引用，
 * real 模式（apiMode=real）不会读取其中的任何 mock 用户/会话 ID。
 * 类型经 import type 引用（编译期擦除，无运行时循环依赖）。
 * 时间字段基于当前时刻动态生成，保证列表排序与「今天/昨天/更早」展示真实。
 */
import type {
  InteractionEvent,
  MessageHeartSignal,
  MessageItem,
  MessageSession,
  SystemNotification,
} from "../messages";
// infra R2-00028: mock 头像统一走 IMAGE_PATHS 体系
import { IMAGE_PATHS } from "../../config/images";

/**
 * Mock 会话数据（2026-08-07 消息页重构：覆盖全部展示状态）：
 * - 置顶 + 未读（session-private-1）
 * - 未读 99+（session-private-4）
 * - 免打扰（session-private-2，muted）
 * - 官方号：产品助手号（带未读）/ 活动运营号
 * - 匿名匹配会话（temp_anonymous，蒙面头像）
 * - 多种消息预览类型：[语音] / [图片] / [表情]
 * 时间基于当前时刻动态生成，保证列表排序与「今天/昨天/更早」展示始终真实。
 *
 * R4-00136：对端用户 ID 与昵称与 likes/mock-data.ts 的 mock 用户体系对齐
 * （user-2001 林夕 / user-2002 陈默 / user-2003 苏晴 / user-2005 顾言 /
 * user-2006 叶知秋），同一 ID 在不同模块展示同一人物，避免演示数据混淆。
 */
export const mockSessions: MessageSession[] = [
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
    id: "session-private-4", partnerId: "user-2006", partnerName: "叶知秋", partnerAvatar: IMAGE_PATHS.DEFAULT_AVATAR,
    partnerHeadline: "暨南大学 · 大二 · 文学系", lastMessagePreview: "[图片] 给你看看周末拍的风景",
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

export const mockMessages: Record<string, MessageItem[]> = {
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

export const mockHeartSignals: MessageHeartSignal[] = [
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
export const mockNotifications: SystemNotification[] = [
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

export const mockInteractionEvents: InteractionEvent[] = [
  { id: 1, eventType: "NEW_LIKE", triggerUserId: 4001, triggerUserName: "夏言", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 0, referenceType: "profile", summary: "夏言喜欢了你", isRead: false, createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 2, eventType: "NEW_VISITOR", triggerUserId: 4002, triggerUserName: "顾北", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 0, referenceType: "profile", summary: "顾北访问了你的主页", isRead: false, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: 3, eventType: "NEW_FOLLOW", triggerUserId: 4003, triggerUserName: "林溪", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 0, referenceType: "profile", summary: "林溪关注了你", isRead: true, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 4, eventType: "POST_LIKED", triggerUserId: 4004, triggerUserName: "周屿", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 42, referenceType: "post", summary: "周屿赞了你的帖子", isRead: false, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: 5, eventType: "POST_COMMENTED", triggerUserId: 4001, triggerUserName: "夏言", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 42, referenceType: "post", summary: "夏言评论了你的帖子：\"写得真好！\"", isRead: false, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { id: 6, eventType: "TOPIC_REPLIED", triggerUserId: 4005, triggerUserName: "沈念", triggerUserAvatar: IMAGE_PATHS.DEFAULT_AVATAR, referenceId: 15, referenceType: "topic", summary: "沈念回复了你的话题", isRead: true, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
];
