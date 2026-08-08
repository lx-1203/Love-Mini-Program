/**
 * Chat Store 会话生命周期 Actions
 *
 * 集中维护聊天会话的创建、加载、置顶、结束等生命周期行为。
 *
 * 拆分目的：原 chat/index.ts 单文件 555 行，违反单一职责原则。
 * 拆分后会话相关 action 独立成文件，便于维护与测试。
 *
 * 注意：本文件中所有 action 函数均使用 `this: ChatStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import { clientApi } from "../../../services/api";
import { useSessionStore } from "../../session";
import { toChatOverviewView } from "../../../view-models/chat";
// 统一常量：临时会话默认时长（24 小时）
import { TEMP_SESSION_DURATION_MS } from "../../../constants/growth";
import { mockChatOverview, mockSession1, mockSessionMap } from "../mock-data";
import {
  chatTransport,
  withErrorHandling,
  withMockMode,
} from "../higher-order";
import type { TempChatSession } from "../types";
import type { ChatStoreThis } from "../store-type";
// i18n 翻译函数（infra R2-00087: mock 会话占位文案 i18n 化）
import { t } from "@/i18n";

/** infra R2-00087: mock 会话 id 递增计数器（同毫秒创建避免 Date.now() 碰撞） */
let mockSessionSeq = 0;

/**
 * 加载聊天概览
 *
 * 通过 withErrorHandling 统一处理 loading 状态和错误消息，
 * 通过 withMockMode 自动切换 Mock/Real 模式。
 *
 * 概览加载自身无需刷新概览（避免递归），也不涉及 activeSession 更新。
 */
export async function loadOverview(this: ChatStoreThis): Promise<void> {
  // 使用 withErrorHandling 统一处理 loading 状态和错误消息
  await withErrorHandling(
    this,
    { loadingKey: "loadingOverview", errorPrefixKey: "storeErrors.chat.loadOverviewFailed" },
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
      this.overviewView = toChatOverviewView(
        overview,
        sessionStore.completionState
      );
    }
  );
}

/**
 * 从推荐人创建临时会话
 *
 * @param recommendedPersonId - 推荐人 ID
 * @returns 当前活跃会话视图模型
 */
export async function startFromRecommendation(
  this: ChatStoreThis,
  recommendedPersonId: string
) {
  // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
  await withMockMode(
    this,
    // Mock 模式：基于推荐人ID创建临时会话
    () => {
      // 修复（P1 BUG）：原实现 partnerName 硬编码“新匹配”，与 fixtures 推荐人
      // 姓名体系（mockData.recommendedPeople.name1..7）脱节。现从 mock 概览的
      // 推荐人列表按 recommendedPersonId 解析姓名/标题，查不到时才回退占位文案。
      const person = mockChatOverview.recommendedPeople.find(
        (p) => p.id === recommendedPersonId
      );
      const mockNewSession: TempChatSession = {
        id: `mock-session-${Date.now()}-${++mockSessionSeq}`, // infra R2-00087: 避免同毫秒碰撞
        recommendedPersonId,
        partnerName: person?.name ?? t("chat.mockSession.newMatchName"), // infra R2-00087
        partnerHeadline: person?.headline ?? t("chat.mockSession.newMatchHeadline"), // infra R2-00087
        availabilityHint: person?.availability ?? t("chat.mockSession.availabilityTonight"), // infra R2-00087
        phase: "matching",
        closesAt: new Date(Date.now() + TEMP_SESSION_DURATION_MS).toISOString(),
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
}

/**
 * 从心动信号创建临时会话（2026-08-08 走查 P0-3：已接受信号「开聊」入口）
 *
 * @param signalId - 心动信号 ID
 * @returns 当前活跃会话视图模型
 */
export async function startFromSignal(
  this: ChatStoreThis,
  signalId: string
) {
  // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
  await withMockMode(
    this,
    // Mock 模式：基于信号 ID 创建占位临时会话（真实数据走后端，mock 仅保证链路可走通）
    () => {
      const mockNewSession: TempChatSession = {
        id: `mock-session-${Date.now()}-${++mockSessionSeq}`, // infra R2-00087: 避免同毫秒碰撞
        recommendedPersonId: `rp-signal-${signalId}`,
        partnerName: t("chat.mockSession.matchName"),
        partnerHeadline: t("chat.mockSession.matchHeadline"),
        availabilityHint: t("chat.mockSession.availabilityTonight"),
        phase: "matching",
        closesAt: new Date(Date.now() + TEMP_SESSION_DURATION_MS).toISOString(),
        closedReason: null,
        messages: [],
        contactExchange: { proposer: null, status: "idle" },
      };
      return mockNewSession;
    },
    // Real 模式：调用后端 API 创建会话（signalId 由服务端校验归属与状态后解析对端用户）
    () => chatTransport.createSession({ signalId })
  );
  return this.activeSession;
}

/**
 * 从匹配创建临时会话
 *
 * @param matchId - 匹配 ID
 * @returns 当前活跃会话视图模型
 */
export async function startFromMatch(
  this: ChatStoreThis,
  matchId: string
) {
  // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
  await withMockMode(
    this,
    // Mock 模式：基于匹配ID创建临时会话
    // infra R2-00087: 匹配信息回退文案走 i18n（后端匹配数据接入后可按 matchId 解析）
    () => {
      const mockNewSession: TempChatSession = {
        id: `mock-session-${Date.now()}-${++mockSessionSeq}`, // infra R2-00087: 避免同毫秒碰撞
        recommendedPersonId: "rp-match",
        partnerName: t("chat.mockSession.matchName"),
        partnerHeadline: t("chat.mockSession.matchHeadline"),
        availabilityHint: t("chat.mockSession.availabilityTonight"),
        phase: "matching",
        closesAt: new Date(Date.now() + TEMP_SESSION_DURATION_MS).toISOString(),
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
}

/**
 * 加载指定会话
 *
 * 组合使用 withErrorHandling 和 withMockMode，统一处理错误、loading、模式切换。
 * Real 模式下加载会话后还会调用 markTempChatSessionRead 标记已读。
 *
 * @param sessionId - 会话 ID
 */
export async function loadSession(
  this: ChatStoreThis,
  sessionId: string
): Promise<void> {
  // 组合使用 withErrorHandling 和 withMockMode，统一处理错误、loading、模式切换
  await withErrorHandling(
    this,
    { loadingKey: "loadingSession", errorPrefixKey: "storeErrors.chat.loadSessionFailed" },
    async () => {
      const session = await withMockMode(
        this,
        // Mock 模式：从本地映射表获取会话数据
        // 修复（P1 BUG）：未知 sessionId 不再 fallback 到 mockSession1——
        // 那样会把 A 会话的数据错位展示成 B 会话（聊天内容张冠李戴）。
        // 现返回 null，由下方分支清空 activeSession 并提示错误/空态。
        () => mockSessionMap[sessionId] ?? null,
        // Real 模式：调用后端 API 加载会话，并标记为已读
        async () => {
          const session = await chatTransport.loadSession(sessionId);
          await clientApi.markTempChatSessionRead(sessionId);
          return session;
        }
        // 默认 shouldRefreshOverview: true, shouldUpdateActiveSession: true
      );
      // 修复：会话不存在（mock 未知 id / 后端 404 已由 transport 抛错）时，
      // 显式清空 activeSession 并抛出错误，让页面展示错误态而非残留旧会话
      if (!session) {
        this.activeSession = null;
        throw new Error("会话不存在或已失效");
      }
      return session;
    }
  );
}

/**
 * 设置会话置顶状态
 *
 * 组合使用 withErrorHandling 和 withMockMode。
 * 不涉及 activeSession 更新，仅刷新概览。
 *
 * @param sessionId - 会话 ID
 * @param pinned - 是否置顶
 */
export async function setSessionPinned(
  this: ChatStoreThis,
  sessionId: string,
  pinned: boolean
): Promise<void> {
  // 组合使用 withErrorHandling 和 withMockMode
  // setSessionPinned 不涉及 activeSession 更新，仅刷新概览
  await withErrorHandling(
    this,
    { errorPrefixKey: "storeErrors.chat.updatePinnedFailed" },
    async () => {
      await withMockMode(
        this,
        // Mock 模式：仅更新本地概览数据中的置顶状态，不调用后端
        () => {
          // 修复（P1 BUG）：原实现直接修改共享常量 mockChatSessionSummaries
          // 中的对象（sessionSummary.pinned = pinned），会污染模块级数据
          // （页面销毁/重建后置顶状态残留）。现改为复制对象后替换数组元素。
          const index = mockChatOverview.sessions.findIndex(
            (s) => s.id === sessionId
          );
          if (index >= 0) {
            mockChatOverview.sessions[index] = {
              ...mockChatOverview.sessions[index]!,
              pinned,
            };
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
}

/**
 * 结束当前活跃会话
 *
 * Mock 模式将本地会话标记为已结束，Real 模式调用后端 endSession API。
 */
export async function endSession(this: ChatStoreThis): Promise<void> {
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
}
