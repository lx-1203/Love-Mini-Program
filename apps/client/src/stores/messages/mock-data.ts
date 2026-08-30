/**
 * Messages Store Mock 数据（mock 模式专用）。
 */
import type {
  InteractionEvent,
  MessageHeartSignal,
  MessageItem,
  MessageSession,
  SystemNotification,
} from "../messages";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "@/utils/media";

export const mockSessions: MessageSession[] = [
  {
    id: "session-private-1", partnerId: "user-2001", partnerName: "夏言",
    partnerAvatar: IMAGE_PATHS.AVATARS.AVATAR_1,
    partnerHeadline: "大二 · 喜欢电影和咖啡", lastMessagePreview: "明天下午有空吗？",
    lastMessageSentAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(), unreadCount: 2, pinned: true,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
    relationship: {
      status: "ambiguous", score: 62, lastInteractionTime: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
            relationDays: 12,
      commonInterests: ["电影", "咖啡"], commonActivities: 1,
      suggestedAction: { type: "reply", text: "一起聊聊电影？", targetUrl: null, reason: "keepChatting" },
    },
  },
  {
    id: "session-private-2", partnerId: "user-2002", partnerName: "陈默",
    partnerAvatar: IMAGE_PATHS.AVATARS.AVATAR_2,
    partnerHeadline: "大三 · 自习搭子", lastMessagePreview: "[语音] 30″",
    lastMessageSentAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), unreadCount: 0, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
    muted: true,
    relationship: {
      status: "chatting", score: 32, lastInteractionTime: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
            relationDays: 12,
      commonInterests: ["自习"], commonActivities: 0,
      suggestedAction: { type: "reply", text: "继续聊天", targetUrl: null, reason: "keepChatting" },
    },
  },
  {
    id: "session-official-assistant", partnerId: "official-assistant", partnerName: "寻觅助手",
    partnerAvatar: "", partnerHeadline: "你的恋爱小管家", lastMessagePreview: "今天有 3 个恋爱机会，别错过",
    lastMessageSentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), unreadCount: 3, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
    isOfficial: true, officialAccountId: "official-assistant",
  },
  {
    id: "session-private-4", partnerId: "user-2006", partnerName: "叶知秋",
    partnerAvatar: IMAGE_PATHS.AVATARS.AVATAR_6,
    partnerHeadline: "暨南大学 · 大二 · 文学系", lastMessagePreview: "[图片] 给你看看周末拍的风景",
    lastMessageSentAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), unreadCount: 1, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
    relationship: {
      status: "mutual_follow", score: 88, lastInteractionTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            relationDays: 12,
      commonInterests: ["摄影", "旅行"], commonActivities: 2,
      suggestedAction: { type: "invite", text: "邀请参加一场共同兴趣活动", targetUrl: "/subpackages/discover/activities/index", reason: "commonInterestWithoutActivity" },
    },
  },
  {
    id: "session-temp-1", partnerId: "user-2004", partnerName: "匿名匹配 · 星河",
    partnerAvatar: "", partnerHeadline: "匿名匹配聊天", lastMessagePreview: "你好奇的天文馆我也去过！",
    lastMessageSentAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), unreadCount: 1, pinned: false,
    phase: "active", sessionType: "temp_anonymous", closesAt: null, closedReason: null,
  },
  {
    id: "session-private-3", partnerId: "user-2005", partnerName: "顾言",
    partnerAvatar: IMAGE_PATHS.AVATARS.AVATAR_5,
    partnerHeadline: "研一 · 摄影爱好者", lastMessagePreview: "[表情] 😂 笑死",
    lastMessageSentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), unreadCount: 5, pinned: false,
    phase: "active", sessionType: "private", closesAt: null, closedReason: null,
    relationship: {
      status: "just_met", score: 12, lastInteractionTime: null,
            relationDays: 12,
      commonInterests: [], commonActivities: 0,
      suggestedAction: { type: "reply", text: "发一句问候", targetUrl: null, reason: "lastInteractionStale" },
    },
  },
];

export const mockMessages: Record<string, MessageItem[]> = {
  "session-private-1": [
    { id: "msg-1", sessionId: "session-private-1", sender: "peer", kind: "text", body: "嗨，看到你的资料觉得挺有缘的", sentAt: new Date(Date.now() - 4 * 3600_000).toISOString() },
    { id: "msg-2", sessionId: "session-private-1", sender: "self", kind: "text", body: "哈哈，我也觉得", sentAt: new Date(Date.now() - 3.5 * 3600_000).toISOString() },
    { id: "msg-3", sessionId: "session-private-1", sender: "peer", kind: "text", body: "明天下午有空吗？", sentAt: new Date(Date.now() - 8 * 60_000).toISOString() },
  ],
  "session-private-2": [
    { id: "msg-4", sessionId: "session-private-2", sender: "peer", kind: "text", body: "图书馆三楼见", sentAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
  ],
  "session-private-3": [
    { id: "msg-5", sessionId: "session-private-3", sender: "peer", kind: "text", body: "上次拍的那组照片发你了", sentAt: new Date(Date.now() - 5 * 3600_000).toISOString() },
    {
      id: "msg-51",
      sessionId: "session-private-3",
      sender: "peer",
      kind: "activity",
      body: '{"title":"校园春日联谊会","desc":"一场轻松的春日联谊会，有破冰游戏、桌游互动、自由交流。","tag":"本周活动","targetUrl":"/subpackages/tools/activities/detail?id=sample-weekend-party"}',
      sentAt: new Date(Date.now() - 4 * 3600_000).toISOString(),
    },
    { id: "msg-52", sessionId: "session-private-3", sender: "self", kind: "text", body: "这个活动看起来不错！", sentAt: new Date(Date.now() - 3.5 * 3600_000).toISOString() },
    { id: "msg-53", sessionId: "session-private-3", sender: "peer", kind: "text", body: "一起去吧？", sentAt: new Date(Date.now() - 3 * 3600_000).toISOString() },
    { id: "msg-54", sessionId: "session-private-3", sender: "self", kind: "emoji", body: "😂", sentAt: new Date(Date.now() - 2.5 * 3600_000).toISOString() },
    { id: "msg-55", sessionId: "session-private-3", sender: "peer", kind: "text", body: "约好了！", sentAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
  ],
  "session-private-4": [
    { id: "msg-10", sessionId: "session-private-4", sender: "peer", kind: "text", body: "周末去爬山吗？", sentAt: new Date(Date.now() - 24 * 3600_000).toISOString() },
    { id: "msg-11", sessionId: "session-private-4", sender: "self", kind: "text", body: "好啊，去哪座山？", sentAt: new Date(Date.now() - 23 * 3600_000).toISOString() },
    { id: "msg-12", sessionId: "session-private-4", sender: "peer", kind: "text", body: "白云山怎么样？", sentAt: new Date(Date.now() - 22 * 3600_000).toISOString() },
    { id: "msg-13", sessionId: "session-private-4", sender: "self", kind: "text", body: "可以，几点出发？", sentAt: new Date(Date.now() - 21 * 3600_000).toISOString() },
    { id: "msg-14", sessionId: "session-private-4", sender: "peer", kind: "text", body: "早上8点？", sentAt: new Date(Date.now() - 20 * 3600_000).toISOString() },
    { id: "msg-15", sessionId: "session-private-4", sender: "self", kind: "text", body: "没问题！", sentAt: new Date(Date.now() - 19 * 3600_000).toISOString() },
    { id: "msg-16", sessionId: "session-private-4", sender: "peer", kind: "text", body: "给你看看周末拍的风景", sentAt: new Date(Date.now() - 4 * 3600_000).toISOString() },
  ],
  "session-temp-1": [
    { id: "msg-6", sessionId: "session-temp-1", sender: "peer", kind: "text", body: "嗨，我是通过匹配进来的", sentAt: new Date(Date.now() - 3600_000).toISOString() },
    { id: "msg-7", sessionId: "session-temp-1", sender: "self", kind: "text", body: "你好！", sentAt: new Date(Date.now() - 1800_000).toISOString() },
    { id: "msg-8", sessionId: "session-temp-1", sender: "peer", kind: "text", body: "你好奇的天文馆我也去过！", sentAt: new Date(Date.now() - 1080_000).toISOString() },
  ],
};

export const mockHeartSignals: MessageHeartSignal[] = [
  {
    id: "signal-1", fromUserId: "user-2003", fromUserName: "小满", fromUserAvatar: resolveMediaUrl("/static/assets/images/avatars/avatar-4.jpg"),
    status: "pending", sentAt: "2026-05-20T16:45:00Z", expiresAt: "2026-05-21T16:45:00Z",
    school: "南校区", age: 20, city: "广州",
    bioHighlight: "ta的介绍很丰富，对于找对象ta是认真的",
  },
];

export const mockNotifications: SystemNotification[] = [
  {
    id: "notif-1", type: "match", title: "新的匹配",
    content: "你与夏言成功匹配，可以开始聊天了", isRead: false,
    createdAt: "2026-05-20T14:00:00Z",
    actionUrl: "/subpackages/chat/chat-session/index?sessionId=session-private-1",
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
    createdAt: "2026-05-19T09:30:00Z", actionUrl: "/subpackages/discover-extra/likes/index",
    signalType: "SOCIAL",
  },
  {
    id: "notif-4", type: "follow", title: "新的关注",
    content: "小满关注了你", isRead: false,
    createdAt: "2026-05-21T10:00:00Z", triggerUserId: "user-2003",
    actionUrl: "/pages/profile/index?userId=user-2003",
    signalType: "CONTENT",
  },
  {
    id: "notif-6", type: "comment", title: "新的评论",
    content: "夏言评论了你的帖子：\"写得真好！\"", isRead: false,
    createdAt: "2026-05-20T20:30:00Z", triggerUserId: "user-2001",
    resourceId: "post-42", actionUrl: "/subpackages/village/village/detail?id=post-42",
    signalType: "CONTENT",
  },
  {
    id: "notif-7", type: "visitor", title: "新的访客",
    content: "林晓访问了你的主页", isRead: true,
    createdAt: "2026-05-20T16:00:00Z", triggerUserId: "user-2002",
    actionUrl: "/pages/profile/index?userId=user-2002",
    signalType: "SOCIAL",
  },
  {
    id: "notif-8", type: "interaction_match", title: "双向喜欢",
    content: "你和林晓互相喜欢了，快去看看", isRead: false,
    createdAt: "2026-05-21T08:45:00Z", triggerUserId: "user-4001",
    actionUrl: "/pages/messages/index",
    signalType: "SOCIAL",
  },
  {
    id: "notif-9", type: "interaction_like", title: "新的赞",
    content: "小满赞了你的帖子", isRead: false,
    createdAt: "2026-05-21T09:15:00Z", triggerUserId: "user-4004",
    resourceId: "post-58", actionUrl: "/pages/post/detail?id=post-58",
    signalType: "CONTENT",
  },
];

export const mockInteractionEvents: InteractionEvent[] = [
  { id: 1, eventType: "NEW_LIKE", triggerUserId: 4001, triggerUserName: "林晓", triggerUserAvatar: IMAGE_PATHS.AVATARS.AVATAR_1, referenceId: 0, referenceType: "profile", summary: "林晓喜欢了你", isRead: false, createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 2, eventType: "NEW_VISITOR", triggerUserId: 4002, triggerUserName: "夏言", triggerUserAvatar: IMAGE_PATHS.AVATARS.AVATAR_2, referenceId: 0, referenceType: "profile", summary: "夏言访问了你的主页", isRead: false, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: 3, eventType: "NEW_FOLLOW", triggerUserId: 4003, triggerUserName: "阿辰", triggerUserAvatar: IMAGE_PATHS.AVATARS.AVATAR_3, referenceId: 0, referenceType: "profile", summary: "阿辰关注了你", isRead: true, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 4, eventType: "POST_LIKED", triggerUserId: 4004, triggerUserName: "小满", triggerUserAvatar: IMAGE_PATHS.AVATARS.AVATAR_4, referenceId: 42, referenceType: "post", summary: "小满赞了你的帖子", isRead: false, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: 5, eventType: "POST_COMMENTED", triggerUserId: 4001, triggerUserName: "林晓", triggerUserAvatar: IMAGE_PATHS.AVATARS.AVATAR_1, referenceId: 42, referenceType: "post", summary: "林晓评论了你的帖子：\"写得真好！\"", isRead: false, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { id: 6, eventType: "TOPIC_REPLIED", triggerUserId: 4005, triggerUserName: "Luna", triggerUserAvatar: IMAGE_PATHS.AVATARS.AVATAR_5, referenceId: 15, referenceType: "topic", summary: "Luna回复了你的话题", isRead: true, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
];
