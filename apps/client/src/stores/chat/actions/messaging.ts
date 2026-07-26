/**
 * Chat Store 消息发送 Actions
 *
 * 集中维护聊天消息发送（文本 / 语音）与消息投递状态管理行为。
 *
 * 拆分目的：原 chat/index.ts 单文件 555 行，违反单一职责原则。
 * 拆分后消息发送相关 action 独立成文件，便于维护与测试。
 *
 * 注意：本文件中所有 action 函数均使用 `this: ChatStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import {
  chatTransport,
  withMockMode,
} from "../higher-order";
import {
  saveMessageStatus,
  withSendRetry,
} from "../utils";
import { mockSession1, mockSessionMap } from "../mock-data";
import type {
  MessageDeliveryStatus,
  TempChatSession,
} from "../types";
import type { ChatStoreThis } from "../store-type";

/**
 * 发送文本消息（带状态持久化与失败重试）。
 *
 * 修复（P1 BUG）：
 * 1. 新增消息投递状态持久化：通过 messageDeliveryStatus 映射表跟踪
 *    sending/sent/failed 状态，持久化到本地存储，确保刷新/切换会话后可恢复展示。
 * 2. 新增失败处理与重试：Real 模式下网络层错误自动重试 1 次，
 *    最终失败时设置 errorMessage 并标记消息为 failed。
 *
 * @param body - 消息正文
 */
export async function sendText(
  this: ChatStoreThis,
  body: string
): Promise<void> {
  if (!this.activeSession) {
    return;
  }

  // 修复（P1 BUG）：生成客户端 sendId 用于跟踪消息投递状态
  const sendId = `send-${Date.now()}`;
  this._setMessageStatus(sendId, "sending");

  try {
    // 使用 withMockMode 统一处理 Mock/Real 切换、activeSession 更新、概览刷新
    // 修复（P1 BUG）：Real 模式新增 withSendRetry 重试机制
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
      // Real 模式：调用后端 API 发送消息（带重试）
      // 注意：ChatMessageRequest 仅包含 sender/kind/body/durationSeconds/quoteRef，
      // recalled / deliveryStatus 是前端扩展字段，不应发送到后端
      () =>
        withSendRetry(() =>
          chatTransport.pushMessage(this.activeSession!.id, {
            sender: "self",
            kind: "text",
            body,
            durationSeconds: null,
          })
        )
    );
    // 发送成功，更新状态为 sent
    this._setMessageStatus(sendId, "sent");
  } catch (error) {
    // 修复（P1 BUG）：发送失败，更新状态为 failed 并设置 errorMessage
    this._setMessageStatus(sendId, "failed");
    this.errorMessage =
      error instanceof Error ? error.message : "发送消息失败，请重试";
  }
}

/**
 * 发送语音消息
 *
 * @param durationSeconds - 语音时长（秒）
 */
export async function sendVoice(
  this: ChatStoreThis,
  durationSeconds: number
): Promise<void> {
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
}

/**
 * 更新消息投递状态（内部辅助方法）。
 *
 * 修复（P1 BUG）：原 sendText 无状态持久化，页面刷新或切换会话后，
 * 用户无法感知上一条消息是否发送成功。
 * 现将消息投递状态写入 state.messageDeliveryStatus 并同步到本地存储，
 * 确保跨会话/刷新后仍可恢复展示。
 *
 * @param sendId - 客户端生成的消息发送唯一 ID
 * @param status - 消息投递状态：sending / sent / failed
 */
export function _setMessageStatus(
  this: ChatStoreThis,
  sendId: string,
  status: MessageDeliveryStatus
): void {
  this.messageDeliveryStatus = {
    ...this.messageDeliveryStatus,
    [sendId]: status,
  };
  saveMessageStatus(this.messageDeliveryStatus);
}
