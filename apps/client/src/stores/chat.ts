import { defineStore } from "pinia";
import { clientApi } from "../services/api";
import { useSessionStore } from "./session";
import { toChatOverviewView, toChatSessionView } from "../view-models/chat";
import { createChatTransport } from "../features/chat/transport";
import { appEnv } from "../services/env";
import { request } from "../services/http";
import type { components } from "../services/generated/api-types";
import type { ChatMessage, IcebreakerView } from "../services/generated/api-types-supplement";

type Schemas = components["schemas"];
type ChatOverview = Schemas["ChatOverview"];
type ChatSessionSummary = Schemas["ChatSessionSummary"];
type TempChatSession = Schemas["TempChatSession"];

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

/* ========== 高阶函数：统一处理重复逻辑 ========== */

/**
 * ChatStore 实例类型约束
 * 用于高阶函数的类型推断，避免循环依赖（store 定义前无法引用其类型）
 */
interface ChatStoreLike {
  loadingOverview: boolean;
  loadingSession: boolean;
  loadingIcebreakers: boolean;
  errorMessage: string | null;
  activeSession: ReturnType<typeof toChatSessionView> | null;
  loadOverview: () => Promise<void>;
}

/** loading 状态键名联合类型，限制只能操作已知的 loading 字段 */
type LoadingKey = "loadingOverview" | "loadingSession" | "loadingIcebreakers";

/**
 * 错误处理高阶函数
 * 统一处理 loading 状态设置、错误消息清理、try-catch-finally 结构
 * 消除各 action 方法中重复的错误处理代码模式
 *
 * 重复模式示例（重构前）：
 * ```ts
 * this.loadingXxx = true;
 * this.errorMessage = null;
 * try { ... } catch (error) {
 *   this.errorMessage = error instanceof Error ? error.message : "xxx失败";
 * } finally { this.loadingXxx = false; }
 * ```
 *
 * @param store - ChatStore 实例（传入 this 即可）
 * @param options - 配置选项
 * @param options.loadingKey - loading 状态的键名（可选，不传则不管理 loading 状态）
 * @param options.errorPrefix - 错误消息前缀，用于拼接 "xxx失败"
 * @param options.rethrow - 是否重新抛出错误（默认 false），sendIcebreaker 等需要上层感知错误时设为 true
 * @param fn - 业务逻辑函数
 * @returns 业务逻辑函数的返回值；出错且不重新抛出时返回 undefined
 */
async function withErrorHandling<T>(
  store: ChatStoreLike,
  options: {
    loadingKey?: LoadingKey;
    errorPrefix: string;
    rethrow?: boolean;
  },
  fn: () => Promise<T>
): Promise<T | undefined> {
  const { loadingKey, errorPrefix, rethrow = false } = options;
  // 设置 loading 状态为 true
  if (loadingKey) {
    store[loadingKey] = true;
  }
  // 清理上一次的错误消息
  store.errorMessage = null;
  try {
    return await fn();
  } catch (error) {
    // 统一设置错误消息：优先使用 Error 实例的 message，否则使用前缀拼接
    store.errorMessage = error instanceof Error ? error.message : `${errorPrefix}失败`;
    if (rethrow) {
      // 重新抛出错误，让调用方决定是否需要处理（如 sendIcebreaker 需要向上抛出）
      throw error;
    }
    return undefined;
  } finally {
    // 无论成功或失败，都重置 loading 状态
    if (loadingKey) {
      store[loadingKey] = false;
    }
  }
}

/**
 * Mock/Real 模式切换高阶函数
 * 统一处理 Mock/Real 模式判断、活跃会话更新、概览刷新
 * 消除各 action 方法中重复的模式切换代码模式
 *
 * 重复模式示例（重构前）：
 * ```ts
 * if (useMock()) {
 *   // 操作 mockSessionMap ...
 *   this.activeSession = toChatSessionView(updatedSession);
 *   await this.loadOverview();
 *   return;
 * }
 * const session = await chatTransport.xxx(...);
 * this.activeSession = toChatSessionView(session);
 * await this.loadOverview();
 * ```
 *
 * @param store - ChatStore 实例（传入 this 即可）
 * @param mockFn - Mock 模式下的处理函数，返回原始数据（TempChatSession 等）
 * @param realFn - Real 模式下的处理函数，返回原始数据
 * @param options - 配置选项
 * @param options.shouldRefreshOverview - 是否在操作后刷新概览（默认 true）
 * @param options.shouldUpdateActiveSession - 是否将结果转换为视图模型并更新 activeSession（默认 true）
 * @returns 处理函数的返回值（原始数据）
 */
async function withMockMode<T>(
  store: ChatStoreLike,
  mockFn: () => Promise<T> | T,
  realFn: () => Promise<T>,
  options: {
    shouldRefreshOverview?: boolean;
    shouldUpdateActiveSession?: boolean;
  } = {}
): Promise<T> {
  const { shouldRefreshOverview = true, shouldUpdateActiveSession = true } = options;
  let result: T;
  if (useMock()) {
    // Mock 模式：执行 Mock 处理函数，操作本地数据
    result = await mockFn();
  } else {
    // Real 模式：执行 Real 处理函数，调用后端 API
    result = await realFn();
  }
  // 统一处理活跃会话更新：当结果为对象且包含 id 字段时，转换为视图模型并更新 activeSession
  if (shouldUpdateActiveSession && result && typeof result === "object" && "id" in result) {
    // 由于 T 是泛型，无法直接断言为 TempChatSession，需先转 unknown 再转目标类型
    store.activeSession = toChatSessionView(result as unknown as TempChatSession);
  }
  // 统一刷新概览，确保会话列表的最后消息预览等保持最新
  if (shouldRefreshOverview) {
    await store.loadOverview();
  }
  return result;
}

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
      // 使用 withErrorHandling 统一处理 loading 状态和错误消息
      await withErrorHandling(
        this,
        { loadingKey: "loadingOverview", errorPrefix: "聊天页加载" },
        async () => {
          const sessionStore = useSessionStore();
          // 使用 withMockMode 统一处理 Mock/Real 切换
          // loadOverview 自身即为概览加载，无需刷新概览（避免递归），也不涉及 activeSession
          const overview = await withMockMode(
            this,
            // Mock 模式：使用本地硬编码的聊天概览数据
            () => mockChatOverview,
            // Real 模式：调用后端 API 获取聊天概览
            () => clientApi.getChatOverview(),
            { shouldRefreshOverview: false, shouldUpdateActiveSession: false }
          );
          this.overview = overview;
          this.overviewView = toChatOverviewView(overview, sessionStore.completionState);
        }
      );
    },
    async startFromRecommendation(recommendedPersonId: string) {
      // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
      await withMockMode(
        this,
        // Mock 模式：基于推荐人ID创建临时会话
        () => {
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
          return mockNewSession;
        },
        // Real 模式：调用后端 API 创建会话
        () => chatTransport.createSession({ recommendedPersonId })
      );
      return this.activeSession;
    },
    async startFromMatch(matchId: string) {
      // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
      await withMockMode(
        this,
        // Mock 模式：基于匹配ID创建临时会话
        () => {
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
          return mockNewSession;
        },
        // Real 模式：调用后端 API 创建会话
        () => chatTransport.createSession({ matchId })
      );
      return this.activeSession;
    },
    async loadSession(sessionId: string) {
      // 组合使用 withErrorHandling 和 withMockMode，统一处理错误、loading、模式切换
      await withErrorHandling(
        this,
        { loadingKey: "loadingSession", errorPrefix: "聊天详情加载" },
        async () => {
          await withMockMode(
            this,
            // Mock 模式：从本地映射表获取会话数据
            () => mockSessionMap[sessionId] ?? mockSession1,
            // Real 模式：调用后端 API 加载会话，并标记为已读
            async () => {
              const session = await chatTransport.loadSession(sessionId);
              await clientApi.markTempChatSessionRead(sessionId);
              return session;
            }
            // 默认 shouldRefreshOverview: true, shouldUpdateActiveSession: true
          );
        }
      );
    },
    async setSessionPinned(sessionId: string, pinned: boolean) {
      // 组合使用 withErrorHandling 和 withMockMode
      // setSessionPinned 不涉及 activeSession 更新，仅刷新概览
      await withErrorHandling(
        this,
        { errorPrefix: "会话置顶状态更新" },
        async () => {
          await withMockMode(
            this,
            // Mock 模式：仅更新本地概览数据中的置顶状态，不调用后端
            () => {
              const sessionSummary = mockChatOverview.sessions.find((s) => s.id === sessionId);
              if (sessionSummary) {
                sessionSummary.pinned = pinned;
              }
              return undefined;
            },
            // Real 模式：调用后端 API 更新置顶状态
            async () => {
              if (pinned) {
                await clientApi.pinTempChatSession(sessionId);
              } else {
                await clientApi.unpinTempChatSession(sessionId);
              }
              return undefined;
            },
            // 置顶操作不涉及 activeSession 更新，但需要刷新概览
            { shouldRefreshOverview: true, shouldUpdateActiveSession: false }
          );
        }
      );
    },
    async sendText(body: string) {
      if (!this.activeSession) {
        return;
      }

      // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
      await withMockMode(
        this,
        // Mock 模式：在本地会话中追加消息
        () => {
          const sessionId = this.activeSession!.id;
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
                recalled: false,
                deliveryStatus: "sent" as const,
              },
            ],
          };
          mockSessionMap[sessionId] = updatedSession;
          return updatedSession;
        },
        // Real 模式：调用后端 API 发送消息
        () =>
          chatTransport.pushMessage(this.activeSession!.id, {
            sender: "self",
            kind: "text",
            body,
            durationSeconds: null,
            recalled: false,
            deliveryStatus: "sent" as const,
          } as any)
      );
    },
    async sendVoice(durationSeconds: number) {
      if (!this.activeSession) {
        return;
      }

      // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
      await withMockMode(
        this,
        // Mock 模式：在本地会话中追加语音消息
        () => {
          const sessionId = this.activeSession!.id;
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
                recalled: false,
                deliveryStatus: "sent" as const,
              },
            ],
          };
          mockSessionMap[sessionId] = updatedSession;
          return updatedSession;
        },
        // Real 模式：调用后端 API 发送语音消息
        () => chatTransport.pushVoice(this.activeSession!.id, durationSeconds)
      );
    },
    async acceptExchange(actor: "self" | "peer") {
      if (!this.activeSession) {
        return;
      }

      // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
      await withMockMode(
        this,
        // Mock 模式：更新本地会话的联系方式交换状态
        () => {
          const sessionId = this.activeSession!.id;
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
          return updatedSession;
        },
        // Real 模式：调用后端 API 接受联系方式交换
        () =>
          chatTransport.respondToContactExchange(this.activeSession!.id, {
            actor,
            decision: "accepted",
          })
      );
    },
    async rejectExchange(actor: "self" | "peer") {
      if (!this.activeSession) {
        return;
      }

      // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
      await withMockMode(
        this,
        // Mock 模式：更新本地会话的联系方式交换状态为拒绝
        () => {
          const sessionId = this.activeSession!.id;
          const currentSession = mockSessionMap[sessionId] ?? mockSession1;
          const updatedSession: TempChatSession = {
            ...currentSession,
            contactExchange: {
              proposer: currentSession.contactExchange.proposer ?? actor,
              status: "rejected",
            },
          };
          mockSessionMap[sessionId] = updatedSession;
          return updatedSession;
        },
        // Real 模式：调用后端 API 拒绝联系方式交换
        () =>
          chatTransport.respondToContactExchange(this.activeSession!.id, {
            actor,
            decision: "rejected",
          })
      );
    },
    async endSession() {
      if (!this.activeSession) {
        return;
      }

      // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
      await withMockMode(
        this,
        // Mock 模式：将本地会话标记为已结束
        () => {
          const sessionId = this.activeSession!.id;
          const currentSession = mockSessionMap[sessionId] ?? mockSession1;
          const updatedSession: TempChatSession = {
            ...currentSession,
            phase: "closed",
            closesAt: new Date().toISOString(),
            closedReason: "ended",
          };
          mockSessionMap[sessionId] = updatedSession;
          return updatedSession;
        },
        // Real 模式：调用后端 API 结束会话
        () => chatTransport.endSession(this.activeSession!.id)
      );
    },

    /**
     * 加载破冰话题
     * 根据匹配 ID 获取推荐破冰话题列表，用于引导用户开始对话
     * Mock 模式提供本地测试数据，Real 模式调用 GET /api/matches/{matchId}/icebreakers
     * @param matchId - 匹配 ID
     */
    async loadIcebreakers(matchId: number) {
      // 使用 withErrorHandling 统一处理 loading 状态和错误消息
      // loadIcebreakers 不涉及 activeSession 和概览刷新，无需 withMockMode
      await withErrorHandling(
        this,
        { loadingKey: "loadingIcebreakers", errorPrefix: "加载破冰话题" },
        async () => {
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

          // Real 模式：调用后端 API: GET /api/matches/{matchId}/icebreakers
          const data = await request<IcebreakerView>({
            url: `/matches/${matchId}/icebreakers`,
            method: "GET",
          });
          this.icebreakerTopics = (data as any).topics ?? [];
        }
      );
    },

    /**
     * 发送破冰话题到对话
     * 将选中的破冰话题作为消息发送到当前活跃会话中
     * Mock 模式直接追加消息，Real 模式调用 POST /api/matches/{matchId}/icebreakers/send
     * @param matchId - 匹配 ID
     * @param topic - 选中的破冰话题内容
     */
    async sendIcebreaker(matchId: number, topic: string) {
      // 使用 withErrorHandling 统一处理错误消息，rethrow: true 保留原有向上抛出错误的行为
      // sendIcebreaker 的 Mock/Real 分支逻辑差异较大（Real 分支调用 sendText），不适合 withMockMode
      await withErrorHandling(
        this,
        { errorPrefix: "发送破冰话题", rethrow: true },
        async () => {
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
                  recalled: false,
                  deliveryStatus: "sent" as const,
                },
              ],
            };
            mockSessionMap[sessionId] = updatedSession;
            this.activeSession = toChatSessionView(updatedSession);
            await this.loadOverview();
            return;
          }

          // Real 模式：调用后端 API: POST /api/matches/{matchId}/icebreakers/send
          await request<void, { topic: string }>({
            url: `/matches/${matchId}/icebreakers/send`,
            method: "POST",
            data: { topic },
          });

          // 发送成功后，将话题作为普通消息追加到当前会话
          await this.sendText(topic);
        }
      );
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
