/**
 * WebSocket 消息载荷 → MessageItem 转换适配层
 *
 * 修复（未读红点 BUG 1）：real 模式下后端 WS 推送的私信载荷形状（MessageView：
 * {id, conversationId, senderId, content, messageKind, isRead, createdAt}）与前端
 * MessageItem 内部形状（{id, sessionId, sender, kind, body, sentAt}）不一致，
 * 导致 isMessageItem 守卫永远拒绝、WS 新消息被丢弃、未读红点不实时 +1。
 *
 * 设计：外部载荷先经本层转换为内部形状，再过 isMessageItem 守卫校验——
 * 守卫语义不变（mock 载荷已接近 MessageItem，透传后行为零变化），
 * 仅新增「外部 → 内部」的转换步骤。
 *
 * 三形态：
 * - 形态 A（私信，/queue/messages）：后端 MessageView（conversationId/senderId/messageKind）
 * - 形态 B（临时会话，/queue/temp-chat/messages）：ChatMessageView
 *   （字段名与 MessageItem 一致，但无 sessionId——后端 TempChatViewMapper 不携带，
 *   归因依赖当前会话页的 chatStore.activeSession，见 resolveWsSessionId）
 * - 形态 C（mock 模拟）：已接近 MessageItem 形状，透传
 */

import type { MessageItem } from "../../stores/messages";
import { useSessionStore } from "../../stores/session";
import { useChatStore } from "../../stores/chat";
import { isRecord } from "../../types/guards";

/**
 * 后端 messageKind → 前端 kind 映射
 * 与 stores/messages.ts mapToMessageItem 同规则；未知 kind 回退 text 容错旧数据。
 * 大小写不敏感：后端枚举为大小写（如 VOICE/ACTIVITY，白名单 (?i) 忽略大小写），
 * mock 载荷为小写，两端都能正确映射。
 */
export function mapWsKind(value: string): MessageItem["kind"] {
  const normalized = value.toLowerCase();
  if (normalized === "voice") return "voice";
  if (normalized === "emoji") return "emoji";
  if (normalized === "activity") return "activity";
  return "text";
}

/**
 * 从外部 WS 载荷构造 MessageItem；无法识别/无法归因时返回 null（由调用方丢弃）。
 *
 * @param data - 解析后的 WS 载荷
 * @param destination - STOMP 目标路径（用于区分队列、参与 temp 消息归因兜底）
 */
export function fromWsPayload(data: unknown, destination: string): MessageItem | null {
  if (!isRecord(data)) return null;

  // 形态 A：私信 MessageView（后端 /queue/messages 推送形状）
  if ("conversationId" in data && "senderId" in data && "messageKind" in data) {
    const sessionStore = useSessionStore();
    const currentUserId = sessionStore.userSession?.userId ?? "";
    return {
      id: String(data.id ?? ""),
      sessionId: String(data.conversationId ?? ""),
      sender: String(data.senderId) === currentUserId ? "self" : "peer",
      kind: mapWsKind(String(data.messageKind ?? "text")),
      body: String(data.content ?? ""),
      sentAt: String(data.createdAt ?? ""),
      durationSeconds: data.durationSeconds != null ? Number(data.durationSeconds) : null,
    };
  }

  // 形态 B/C：临时会话 / mock——字段名与 MessageItem 一致，透传 + sessionId 兜底
  if (!("id" in data) || !("body" in data) || !("sentAt" in data)) return null;
  return {
    id: String(data.id ?? ""),
    sessionId: resolveWsSessionId(data, destination),
    sender: data.sender === "self" || data.sender === "peer" || data.sender === "system" ? data.sender : "peer",
    kind: mapWsKind(String(data.kind ?? "text")),
    body: String(data.body ?? ""),
    // 数字时间戳转 ISO 字符串，与 pages/chat-session/dto.ts 的 toChatMessageView 规则一致，
    // 避免 WS 新消息的时间条（shouldShowTimeBar/formatChatTimeBar）错乱
    sentAt:
      typeof data.sentAt === "number" ? new Date(data.sentAt).toISOString() : String(data.sentAt ?? ""),
    durationSeconds: data.durationSeconds != null ? Number(data.durationSeconds) : null,
  };
}

/**
 * 形态 B（temp 消息无 sessionId）的会话归因兜底：
 * 仅当用户正停留在某临时会话页（chatStore.activeSession 命中）且为 peer 消息时归因，
 * 否则返回空串（由调用方丢弃，属预期降级——temp 未读以服务端计数为准，
 * 进入会话时 loadSession 全量刷新兜底）。
 *
 * 根治方案：后端 TempChatViewMapper.toMessageView 增加 sessionUid 字段（可选后续项）。
 *
 * @param raw - WS 载荷
 * @param destination - STOMP 目标路径
 */
export function resolveWsSessionId(raw: Record<string, unknown>, destination: string): string {
  if (typeof raw.sessionId === "string" && raw.sessionId) return raw.sessionId;
  if (destination.includes("temp-chat") && raw.sender === "peer") {
    const chatStore = useChatStore();
    if (chatStore.activeSession?.id) return chatStore.activeSession.id;
  }
  return "";
}
