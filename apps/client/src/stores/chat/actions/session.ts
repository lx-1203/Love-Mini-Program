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
      const mockNewSession: TempChatSession = {
        id: `mock-session-${Date.now()}`,
        recommendedPersonId,
        partnerName: "新匹配",
        partnerHeadline: "校园恋爱推荐",
        availabilityHint: "今晚",
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
    () => {
      const mockNewSession: TempChatSession = {
        id: `mock-session-${Date.now()}`,
        recommendedPersonId: "rp-match",
        partnerName: "匹配对象",
        partnerHeadline: "校园恋爱匹配",
        availabilityHint: "今晚",
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
    { errorPrefix: "会话置顶状态更新" },
    async () => {
      await withMockMode(
        this,
        // Mock 模式：仅更新本地概览数据中的置顶状态，不调用后端
        () => {
          const sessionSummary = mockChatOverview.sessions.find(
            (s) => s.id === sessionId
          );
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
