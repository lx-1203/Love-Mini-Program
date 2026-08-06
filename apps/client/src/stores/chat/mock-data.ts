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
// 展示文案 i18n 化：非组件场景使用 i18n.global.t（与 fixtures.ts 一致）。
// mock 数据在模块加载时求值一次；如后续需要 locale 切换后实时跟随，
// 请参照 services/mocks/fixtures.ts 改为 builder 函数在调用时解析 key。
import { t } from "@/i18n";

/** Mock 会话1：普通私信会话 */
// 修复（P1 BUG）：recommendedPersonId 由 "rp-001" 改为 "4001"，与
// services/mocks/fixtures.ts 的推荐人数字 id 体系对齐（4001=夏言，对应
// i18n mockData.recommendedPeople.name1），消除三套 id 体系错位。
export const mockSession1: TempChatSession = {
  id: "mock-session-1",
  recommendedPersonId: "4001",
  partnerName: t("mockData.recommendedPeople.name1"),
  partnerHeadline: t("mockData.recommendedPeople.headline1"),
  availabilityHint: t("mockData.recommendedPeople.availability1"),
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
// 修复（P1 BUG）：recommendedPersonId 由 "rp-002" 改为 "4002"（fixtures 数字体系，
// 4002=顾北，对应 i18n mockData.recommendedPeople.name2）。
export const mockSession2: TempChatSession = {
  id: "mock-session-2",
  recommendedPersonId: "4002",
  partnerName: t("mockData.recommendedPeople.name2"),
  partnerHeadline: t("mockData.recommendedPeople.headline2"),
  availabilityHint: t("mockData.recommendedPeople.availability2"),
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
  emptyStateLead: t("mockData.tempChat.emptyState"),
  recommendedPeople: [
    // 修复（P1 BUG）：id 由 rp-003/rp-004 改为 fixtures 数字体系 4003/4004
    // （4003=林溪、4004=周屿，对应 i18n mockData.recommendedPeople.name3/name4）。
    // 展示文案（headline/commonGround/availability）经 i18n key 解析。
    {
      id: "4003",
      name: t("mockData.recommendedPeople.name3"),
      initials: "林",
      headline: t("mockData.recommendedPeople.headline3"),
      commonGround: t("mockData.recommendedPeople.commonGround3"),
      availability: t("mockData.recommendedPeople.availability3"),
    },
    {
      id: "4004",
      name: t("mockData.recommendedPeople.name4"),
      initials: "周",
      headline: t("mockData.recommendedPeople.headline4"),
      commonGround: t("mockData.recommendedPeople.commonGround4"),
      availability: t("mockData.recommendedPeople.availability4"),
    },
  ],
};

/** Mock 会话映射表，用于根据 sessionId 获取完整会话数据 */
export const mockSessionMap: Record<string, TempChatSession> = {
  [mockSession1.id]: mockSession1,
  [mockSession2.id]: mockSession2,
};
