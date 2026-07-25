/**
 * 聊天会话页 - API 调用层
 *
 * 抽取 chat-session/index.vue 中的纯 API 调用，
 * 便于单元测试 mock 与未来端点变更的统一维护。
 *
 * 端点说明：
 * - POST /api/temp-chat/sessions/{sessionId}/messages/{messageId}/recall - 撤回临时聊天消息
 *
 * 注意：临时会话的发送 / 接收 / 加载等链路由 chatStore / messagesStore 管理，
 * 本文件仅封装页面直接调用的 API（如撤回）。
 *
 * 硬约束：本文件仅包含纯 API 调用，不涉及页面转场逻辑与副作用。
 */

import { clientApi } from "../../services/api";

/**
 * 撤回临时聊天会话中的某条消息
 *
 * 仅发送者本人可在发送后 2 分钟内撤回。
 *
 * @param sessionId - 会话 ID
 * @param messageId - 消息 ID
 * @returns 后端返回的会话快照（含撤回后的消息列表）
 */
export async function recallTempChatMessageApi(
  sessionId: string,
  messageId: string
): Promise<ReturnType<typeof clientApi.recallTempChatMessage>> {
  return clientApi.recallTempChatMessage(sessionId, messageId);
}
