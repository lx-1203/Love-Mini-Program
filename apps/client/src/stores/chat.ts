import { defineStore } from "pinia";
import { clientApi } from "../services/api";
import { useSessionStore } from "./session";
import { toChatOverviewView, toChatSessionView } from "../view-models/chat";
import { createChatTransport } from "../features/chat/transport";
import { appEnv } from "../services/env";
import { request } from "../services/http";
import type { components } from "../services/generated/api-types";

type Schemas = components["schemas"];
type ChatOverview = Schemas["ChatOverview"];
type ChatSessionSummary = Schemas["ChatSessionSummary"];
type TempChatSession = Schemas["TempChatSession"];
/** 破冰话题视图类型 */
type IcebreakerView = Schemas["IcebreakerView"];

/** 判断当前是否为 Mock 模式 */
function useMock() {
  return appEnv.apiMode === "mock";
}

/* ========== Mock 数据 ========== */

/** Mock 会话1：普通私信会话 */
const mockSession1: TempChatSession = {
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
    },
    {
      id: "m-1-2",
      sender: "self",
      kind: "text",
      body: "嗨！最近看了《你的名字》，觉得特别适合校园恋爱的氛围",
      sentAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      durationSeconds: null,
    },
    {
      id: "m-1-3",
      sender: "peer",
      kind: "text",
      body: "那部我也超喜欢！新海诚的画面太美了，要不要周末一起去重温一下？",
      sentAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      durationSeconds: null,
    },
    {
      id: "m-1-4",
      sender: "self",
      kind: "text",
      body: "好呀！周六下午怎么样？学校附近有家影院在重映",
      sentAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      durationSeconds: null,
    },
    {
      id: "m-1-5",
      sender: "peer",
      kind: "text",
      body: "太棒了，那就周六下午见！看完还可以去旁边的咖啡馆聊聊～",
      sentAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      durationSeconds: null,
    },
  ],
  contactExchange: {
    proposer: "peer",
    status: "pending",
  },
};

/** Mock 会话2：临时聊天会话 */
const mockSession2: TempChatSession = {
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
    },
    {
      id: "m-2-2",
      sender: "peer",
      kind: "text",
      body: "嗨，我是顾北，喜欢探店和摄影，你呢？",
      sentAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      durationSeconds: null,
    },
    {
      id: "m-2-3",
      sender: "self",
      kind: "text",
      body: "你好！我也喜欢摄影，最近在学胶片拍摄",
      sentAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      durationSeconds: null,
    },
  ],
  contactExchange: {
    proposer: null,
    status: "idle",
  },
};

/** Mock 会话摘要列表 */
const mockChatSessionSummaries: ChatSessionSummary[] = [
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
const mockChatOverview: ChatOverview = {
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
const mockSessionMap: Record<string, TempChatSession> = {
  [mockSession1.id]: mockSession1,
  [mockSession2.id]: mockSession2,
};

const chatTransport = createChatTransport();

export const useChatStore = defineStore("chat", {
  state: () => ({
    loadingOverview: false,
    loadingSession: false,
    errorMessage: null as string | null,
    overview: null as Awaited<ReturnType<typeof clientApi.getChatOverview>> | null,
    overviewView: null as ReturnType<typeof toChatOverviewView> | null,
    activeSession: null as ReturnType<typeof toChatSessionView> | null,
    /** 当前匹配的破冰话题列表 */
    icebreakerTopics: [] as string[],
    /** 基于对方资料的破冰话题项（含 id、content、category、source） */
    icebreakerItems: [] as Array<{
      id: number;
      content: string;
      category: string;
      source: string;
    }>,
    /** 破冰话题加载中 */
    loadingIcebreakers: false,
  }),
  actions: {
    async loadOverview() {
      this.loadingOverview = true;
      this.errorMessage = null;

      try {
        const sessionStore = useSessionStore();

        if (useMock()) {
          // Mock 模式：使用本地硬编码的聊天概览数据
          this.overview = mockChatOverview;
          this.overviewView = toChatOverviewView(this.overview, sessionStore.completionState);
        } else {
          this.overview = await clientApi.getChatOverview();
          this.overviewView = toChatOverviewView(this.overview, sessionStore.completionState);
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "聊天页加载失败";
      } finally {
        this.loadingOverview = false;
      }
    },
    async startFromRecommendation(recommendedPersonId: string) {
      if (useMock()) {
        // Mock 模式：基于推荐人ID创建临时会话
        const mockNewSession: TempChatSession = {
          id: `mock-session-${Date.now()}`,
          recommendedPersonId,
          partnerName: "新匹配",
          partnerHeadline: "校园恋爱推荐",
          availabilityHint: "今晚",
          phase: "matching",
          closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          closedReason: null,
          messages: [],
          contactExchange: { proposer: null, status: "idle" },
        };
        this.activeSession = toChatSessionView(mockNewSession);
        await this.loadOverview();
        return this.activeSession;
      }

      const session = await chatTransport.createSession({ recommendedPersonId });
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
      return this.activeSession;
    },
    async startFromMatch(matchId: string) {
      if (useMock()) {
        // Mock 模式：基于匹配ID创建临时会话
        const mockNewSession: TempChatSession = {
          id: `mock-session-${Date.now()}`,
          recommendedPersonId: "rp-match",
          partnerName: "匹配对象",
          partnerHeadline: "校园恋爱匹配",
          availabilityHint: "今晚",
          phase: "matching",
          closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          closedReason: null,
          messages: [],
          contactExchange: { proposer: null, status: "idle" },
        };
        this.activeSession = toChatSessionView(mockNewSession);
        await this.loadOverview();
        return this.activeSession;
      }

      const session = await chatTransport.createSession({ matchId });
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
      return this.activeSession;
    },
    async loadSession(sessionId: string) {
      this.loadingSession = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 模式：从本地映射表获取会话数据
          const session = mockSessionMap[sessionId] ?? mockSession1;
          this.activeSession = toChatSessionView(session);
        } else {
          const session = await chatTransport.loadSession(sessionId);
          this.activeSession = toChatSessionView(session);
          await clientApi.markTempChatSessionRead(sessionId);
        }
        await this.loadOverview();
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "聊天详情加载失败";
      } finally {
        this.loadingSession = false;
      }
    },
    async setSessionPinned(sessionId: string, pinned: boolean) {
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 模式：仅更新本地概览数据中的置顶状态，不调用后端
          const sessionSummary = mockChatOverview.sessions.find((s) => s.id === sessionId);
          if (sessionSummary) {
            sessionSummary.pinned = pinned;
          }
        } else {
          if (pinned) {
            await clientApi.pinTempChatSession(sessionId);
          } else {
            await clientApi.unpinTempChatSession(sessionId);
          }
        }

        await this.loadOverview();
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "会话置顶状态更新失败";
      }
    },
    async sendText(body: string) {
      if (!this.activeSession) {
        return;
      }

      if (useMock()) {
        // Mock 模式：在本地会话中追加消息
        const sessionId = this.activeSession.id;
        const currentSession = mockSessionMap[sessionId] ?? mockSession1;
        const updatedSession: TempChatSession = {
          ...currentSession,
          phase: "active",
          messages: [
            ...currentSession.messages,
            {
              id: `m-${Date.now()}`,
              sender: "self",
              kind: "text",
              body,
              sentAt: new Date().toISOString(),
              durationSeconds: null,
            },
          ],
        };
        mockSessionMap[sessionId] = updatedSession;
        this.activeSession = toChatSessionView(updatedSession);
        await this.loadOverview();
        return;
      }

      const session = await chatTransport.pushMessage(this.activeSession.id, {
        sender: "self",
        kind: "text",
        body,
        durationSeconds: null,
      });
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
    },
    async sendVoice(durationSeconds: number) {
      if (!this.activeSession) {
        return;
      }

      if (useMock()) {
        // Mock 模式：在本地会话中追加语音消息
        const sessionId = this.activeSession.id;
        const currentSession = mockSessionMap[sessionId] ?? mockSession1;
        const updatedSession: TempChatSession = {
          ...currentSession,
          phase: "active",
          messages: [
            ...currentSession.messages,
            {
              id: `m-${Date.now()}`,
              sender: "self",
              kind: "voice",
              body: "语音消息",
              sentAt: new Date().toISOString(),
              durationSeconds,
            },
          ],
        };
        mockSessionMap[sessionId] = updatedSession;
        this.activeSession = toChatSessionView(updatedSession);
        await this.loadOverview();
        return;
      }

      const session = await chatTransport.pushVoice(this.activeSession.id, durationSeconds);
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
    },
    async acceptExchange(actor: "self" | "peer") {
      if (!this.activeSession) {
        return;
      }

      if (useMock()) {
        // Mock 模式：更新本地会话的联系方式交换状态
        const sessionId = this.activeSession.id;
        const currentSession = mockSessionMap[sessionId] ?? mockSession1;
        const currentStatus = currentSession.contactExchange.status;
        const newStatus =
          actor === "self"
            ? currentStatus === "accepted-by-peer"
              ? "completed"
              : "accepted-by-self"
            : currentStatus === "accepted-by-self"
              ? "completed"
              : "accepted-by-peer";
        const updatedSession: TempChatSession = {
          ...currentSession,
          contactExchange: {
            proposer: currentSession.contactExchange.proposer ?? actor,
            status: newStatus,
          },
        };
        mockSessionMap[sessionId] = updatedSession;
        this.activeSession = toChatSessionView(updatedSession);
        await this.loadOverview();
        return;
      }

      const session = await chatTransport.respondToContactExchange(this.activeSession.id, {
        actor,
        decision: "accepted",
      });
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
    },
    async rejectExchange(actor: "self" | "peer") {
      if (!this.activeSession) {
        return;
      }

      if (useMock()) {
        // Mock 模式：更新本地会话的联系方式交换状态为拒绝
        const sessionId = this.activeSession.id;
        const currentSession = mockSessionMap[sessionId] ?? mockSession1;
        const updatedSession: TempChatSession = {
          ...currentSession,
          contactExchange: {
            proposer: currentSession.contactExchange.proposer ?? actor,
            status: "rejected",
          },
        };
        mockSessionMap[sessionId] = updatedSession;
        this.activeSession = toChatSessionView(updatedSession);
        await this.loadOverview();
        return;
      }

      const session = await chatTransport.respondToContactExchange(this.activeSession.id, {
        actor,
        decision: "rejected",
      });
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
    },
    async endSession() {
      if (!this.activeSession) {
        return;
      }

      if (useMock()) {
        // Mock 模式：将本地会话标记为已结束
        const sessionId = this.activeSession.id;
        const currentSession = mockSessionMap[sessionId] ?? mockSession1;
        const updatedSession: TempChatSession = {
          ...currentSession,
          phase: "closed",
          closesAt: new Date().toISOString(),
          closedReason: "ended",
        };
        mockSessionMap[sessionId] = updatedSession;
        this.activeSession = toChatSessionView(updatedSession);
        await this.loadOverview();
        return;
      }

      const session = await chatTransport.endSession(this.activeSession.id);
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
    },

    /**
     * 加载破冰话题
     * 根据匹配 ID 获取推荐破冰话题列表，用于引导用户开始对话
     * Mock 模式提供本地测试数据，Real 模式调用 GET /api/matches/{matchId}/icebreakers
     * @param matchId - 匹配 ID
     */
    async loadIcebreakers(matchId: number) {
      this.loadingIcebreakers = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 模式：根据 matchId 返回预设的破冰话题
          const mockIcebreakers: Record<number, string[]> = {
            1: [
              "你们都喜欢看电影，最近有什么好片推荐吗？",
              "看到你也喜欢咖啡，你最喜欢哪种咖啡？",
              "你们有共同的朋友圈，要不要聊聊校园生活？",
            ],
            2: [
              "你们都选了美食话题，有没有推荐的校园美食？",
              "看到你也喜欢摄影，平时用什么相机？",
              "你们都在同一个城市，周末有什么好去处？",
            ],
          };
          this.icebreakerTopics = mockIcebreakers[matchId] ?? [
            "嗨，很高兴认识你！",
            "你们有共同的兴趣，聊聊看？",
            "最近有什么有趣的事想分享吗？",
          ];
          return;
        }

        // 调用后端 API: GET /api/matches/{matchId}/icebreakers
        const data = await request<IcebreakerView>({
          url: `/matches/${matchId}/icebreakers`,
          method: "GET",
        });
        this.icebreakerTopics = data.topics ?? [];
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载破冰话题失败";
      } finally {
        this.loadingIcebreakers = false;
      }
    },

    /**
     * 发送破冰话题到对话
     * 将选中的破冰话题作为消息发送到当前活跃会话中
     * Mock 模式直接追加消息，Real 模式调用 POST /api/matches/{matchId}/icebreakers/send
     * @param matchId - 匹配 ID
     * @param topic - 选中的破冰话题内容
     */
    async sendIcebreaker(matchId: number, topic: string) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!topic || topic.trim().length === 0) {
          this.errorMessage = "破冰话题内容不能为空";
          throw new Error("破冰话题内容不能为空");
        }

        if (!this.activeSession) {
          this.errorMessage = "当前没有活跃会话";
          throw new Error("当前没有活跃会话");
        }

        if (useMock()) {
          // Mock 模式：在本地会话中追加破冰消息
          const sessionId = this.activeSession.id;
          const currentSession = mockSessionMap[sessionId] ?? mockSession1;
          const updatedSession: TempChatSession = {
            ...currentSession,
            phase: "active",
            messages: [
              ...currentSession.messages,
              {
                id: `m-ice-${Date.now()}`,
                sender: "self" as const,
                kind: "text" as const,
                body: topic,
                sentAt: new Date().toISOString(),
                durationSeconds: null,
              },
            ],
          };
          mockSessionMap[sessionId] = updatedSession;
          this.activeSession = toChatSessionView(updatedSession);
          await this.loadOverview();
          return;
        }

        // 调用后端 API: POST /api/matches/{matchId}/icebreakers/send
        await request<void, { topic: string }>({
          url: `/matches/${matchId}/icebreakers/send`,
          method: "POST",
          data: { topic },
        });

        // 发送成功后，将话题作为普通消息追加到当前会话
        await this.sendText(topic);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "发送破冰话题失败";
        throw error;
      }
    },

    async fetchIcebreakers(peerUserId: number) {
      this.loadingIcebreakers = true;
      this.errorMessage = null;
      try {
        const data = await clientApi.getIcebreakers(peerUserId);
        this.icebreakerItems = data.items ?? [];
        this.icebreakerTopics = (data.items ?? []).slice(0, 3).map((item) => item.content);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载破冰话题失败";
      } finally {
        this.loadingIcebreakers = false;
      }
    },
  },
});
