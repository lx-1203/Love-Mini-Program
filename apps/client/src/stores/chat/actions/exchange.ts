/**
 * Chat Store 联系方式交换 Actions
 *
 * 集中维护聊天会话中联系方式交换的接受 / 拒绝行为。
 *
 * 拆分目的：原 chat/index.ts 单文件 555 行，违反单一职责原则。
 * 拆分后联系方式交换相关 action 独立成文件，便于维护与测试。
 *
 * 注意：本文件中所有 action 函数均使用 `this: ChatStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import { chatTransport, withMockMode } from "../higher-order";
import { mockSession1, mockSessionMap } from "../mock-data";
import type { TempChatSession } from "../types";
import type { ChatStoreThis } from "../store-type";

/**
 * 接受联系方式交换
 *
 * 状态机：
 * - idle / pending → accepted-by-self（自己先接受）
 * - accepted-by-peer → completed（对方已接受，自己再接受则完成）
 *
 * @param actor - 发起方：self / peer
 */
export async function acceptExchange(
  this: ChatStoreThis,
  actor: "self" | "peer"
): Promise<void> {
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
        decision: "accept",
      })
  );
}

/**
 * 拒绝联系方式交换
 *
 * @param actor - 发起方：self / peer
 */
export async function rejectExchange(
  this: ChatStoreThis,
  actor: "self" | "peer"
): Promise<void> {
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
        decision: "reject",
      })
  );
}
