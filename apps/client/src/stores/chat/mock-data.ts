/**
 * Chat Store Mock 数据
 *
 * 集中维护 mock 模式下的聊天会话与概览数据，便于本地开发与测试。
 *
 * 拆分目的：原 chat.ts 单文件 944 行，违反单一职责原则。
 * 拆分后 mock 数据独立成文件，被 higher-order / index 复用。
 */

import type {
  ChatOverview,
  ChatSessionSummary,
  TempChatSession,
} from "./types";

/** Mock 会话1：普通私信会话 */
export const mockSession1: TempChatSession = {
  id: "mock-session-1",
  recommendedPersonId: "rp-001",
  partnerName: "夏言",
  partnerHeadline: "北京大学 · 大三 · 心理学",
  availabilityHint: "今晚 19:00-21:00",
  phase: "active",
  closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  closedReason: null,
  messages: [
    {
      id: "m-1-1",
      sender: "peer",
      kind: "text",
      body: "你好呀，看到你也喜欢看电影，最近有什么推荐吗？",
      sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      durationSeconds: null,
      recalled: false,
      deliveryStatus: "sent" as const,
    },
    {
      id: "m-1-2",
      sender: "self",
      kind: "text",
      body: "嗨！最近看了《你的名字》，觉得特别适合校园恋爱的氛围",
      sentAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      durationSeconds: null,
      recalled: false,
      deliveryStatus: "sent" as const,
    },
    {
      id: "m-1-3",
      sender: "peer",
      kind: "text",
      body: "那部我也超喜欢！新海诚的画面太美了，要不要周末一起去重温一下？",
      sentAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      durationSeconds: null,
      recalled: false,
      deliveryStatus: "sent" as const,
    },
    {
      id: "m-1-4",
      sender: "self",
      kind: "text",
      body: "好呀！周六下午怎么样？学校附近有家影院在重映",
      sentAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      durationSeconds: null,
      recalled: false,
      deliveryStatus: "sent" as const,
    },
    {
      id: "m-1-5",
      sender: "peer",
      kind: "text",
      body: "太棒了，那就周六下午见！看完还可以去旁边的咖啡馆聊聊～",
      sentAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      durationSeconds: null,
      recalled: false,
      deliveryStatus: "sent" as const,
    },
  ],
  contactExchange: {
    proposer: "peer",
    status: "pending",
  },
};

/** Mock 会话2：临时聊天会话 */
export const mockSession2: TempChatSession = {
  id: "mock-session-2",
  recommendedPersonId: "rp-002",
  partnerName: "顾北",
  partnerHeadline: "清华大学 · 研一 · 建筑学",
  availabilityHint: "周末下午",
  phase: "matching",
  closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  closedReason: null,
  messages: [
    {
      id: "m-2-1",
      sender: "system",
      kind: "system",
      body: "你们已匹配成功，快来打个招呼吧！",
      sentAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      durationSeconds: null,
      recalled: false,
      deliveryStatus: "sent" as const,
    },
    {
      id: "m-2-2",
      sender: "peer",
      kind: "text",
      body: "嗨，我是顾北，喜欢探店和摄影，你呢？",
      sentAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      durationSeconds: null,
      recalled: false,
      deliveryStatus: "sent" as const,
    },
    {
      id: "m-2-3",
      sender: "self",
      kind: "text",
      body: "你好！我也喜欢摄影，最近在学胶片拍摄",
      sentAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      durationSeconds: null,
      recalled: false,
      deliveryStatus: "sent" as const,
    },
  ],
  contactExchange: {
    proposer: null,
    status: "idle",
  },
};

/** Mock 会话摘要列表 */
export const mockChatSessionSummaries: ChatSessionSummary[] = [
  {
    id: mockSession1.id,
    recommendedPersonId: mockSession1.recommendedPersonId,
    partnerName: mockSession1.partnerName,
    partnerHeadline: mockSession1.partnerHeadline,
    availabilityHint: mockSession1.availabilityHint,
    phase: mockSession1.phase,
    closesAt: mockSession1.closesAt,
    closedReason: mockSession1.closedReason,
    lastMessagePreview: "太棒了，那就周六下午见！看完还可以去旁边的咖啡馆聊聊～",
    lastMessageSentAt: mockSession1.messages[4]?.sentAt ?? null,
    contactExchangeStatus: mockSession1.contactExchange.status,
    pinned: false,
    unreadCount: 1,
  },
  {
    id: mockSession2.id,
    recommendedPersonId: mockSession2.recommendedPersonId,
    partnerName: mockSession2.partnerName,
    partnerHeadline: mockSession2.partnerHeadline,
    availabilityHint: mockSession2.availabilityHint,
    phase: mockSession2.phase,
    closesAt: mockSession2.closesAt,
    closedReason: mockSession2.closedReason,
    lastMessagePreview: "你好！我也喜欢摄影，最近在学胶片拍摄",
    lastMessageSentAt: mockSession2.messages[2]?.sentAt ?? null,
    contactExchangeStatus: mockSession2.contactExchange.status,
    pinned: false,
    unreadCount: 0,
  },
];

/** Mock 聊天概览数据 */
export const mockChatOverview: ChatOverview = {
  sessions: mockChatSessionSummaries,
  emptyStateLead: "还没有临时会话时，继续从推荐的人进入。",
  recommendedPeople: [
    {
      id: "rp-003",
      name: "林溪",
      initials: "林",
      headline: "复旦大学 · 大二 · 日语系",
      commonGround: "你们都选了摄影话题",
      availability: "周三、周五晚上",
    },
    {
      id: "rp-004",
      name: "周屿",
      initials: "周",
      headline: "浙江大学 · 大四 · 计算机",
      commonGround: "你们都选了运动话题",
      availability: "每天傍晚",
    },
  ],
};

/** Mock 会话映射表，用于根据 sessionId 获取完整会话数据 */
export const mockSessionMap: Record<string, TempChatSession> = {
  [mockSession1.id]: mockSession1,
  [mockSession2.id]: mockSession2,
};
