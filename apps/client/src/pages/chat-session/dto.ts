/**
 * 聊天会话页 - DTO 转换层
 *
 * 将后端返回的消息实体 / store 中的 MessageItem / ChatMessage 转换为视图层使用的 ChatMessageView。
 *
 * 设计目的：
 * 1. 消除 index.vue 中 `(message as any).recalled` 等类型断言
 * 2. 集中维护"前端扩展字段"的默认值与字段映射规则
 * 3. 后端 DTO 字段名变更时，仅需修改本文件，不影响视图层
 * 4. 统一不同来源（messagesStore MessageItem / chatStore ChatMessage）的消息结构
 *
 * 硬约束：本文件仅包含纯函数，不涉及页面转场逻辑与副作用。
 */

import type { MessageItem } from "../../stores/messages";
import type { ChatMessageView, MessageDeliveryStatus } from "./types";

/**
 * 后端返回的临时聊天消息 DTO（部分字段）
 *
 * 对应 OpenAPI 中的 TempChatMessage / ChatMessageResponse，
 * 此处仅声明本页面消费的字段，避免与 generated/api-types 中的完整类型耦合。
 */
export interface TempChatMessageDto {
  /** 消息 ID */
  id: string | number;
  /** 会话 ID */
  sessionId?: string;
  /** 发送方：self / peer / system */
  sender?: string;
  /** 消息类型：text / voice / emoji / system */
  kind?: string;
  /** 消息正文 */
  body?: string;
  /** 发送时间（ISO 字符串或时间戳） */
  sentAt?: string | number;
  /** 语音时长（秒） */
  durationSeconds?: number | null;
  /** 是否被撤回 */
  recalled?: boolean;
  /** 送达状态 */
  deliveryStatus?: MessageDeliveryStatus;
  /** 引用回复的目标消息 ID */
  quoteRef?: string;
  /** 引用回复的目标消息正文 */
  quoteBody?: string;
  /** 引用回复的目标消息发送方 */
  quoteSender?: "self" | "peer" | "system";
}

/**
 * 消息输入接口（最小契约）
 *
 * 兼容多种来源的消息对象：
 * - MessageItem（messagesStore，无 sessionId 时也可处理）
 * - ChatMessage（chatStore，无 sessionId 字段）
 * - TempChatMessageDto（后端原始 DTO）
 *
 * 通过最小契约 + 可选字段，避免不同来源类型之间的不兼容。
 */
export interface MessageLike {
  /** 消息 ID */
  id: string | number;
  /** 会话 ID（可选，部分来源不包含此字段） */
  sessionId?: string;
  /** 发送方：self / peer / system */
  sender?: string;
  /** 消息类型：text / voice / emoji / system */
  kind?: string;
  /** 消息正文 */
  body?: string;
  /** 发送时间（ISO 字符串或时间戳） */
  sentAt?: string | number;
  /** 语音时长（秒） */
  durationSeconds?: number | null;
  /** 是否被撤回 */
  recalled?: boolean;
  /** 送达状态 */
  deliveryStatus?: MessageDeliveryStatus;
  /** 引用回复的目标消息 ID */
  quoteRef?: string | null;
  /** 引用回复的目标消息正文 */
  quoteBody?: string | null;
  /**
   * 引用回复的目标消息发送方
   *
   * 类型为 string | null 以兼容后端 generated api-types 中
   * ChatMessage.quoteSender?: string | null 的定义；
   * 由 toChatMessageView 转换为窄类型 "self" | "peer" | "system" | undefined。
   */
  quoteSender?: string | null;
}

/**
 * 将任意 MessageLike 转换为 ChatMessageView
 *
 * 处理：
 * - id 字符串化（后端可能返回数字）
 * - sentAt 字符串化（后端可能返回时间戳）
 * - sender / kind 默认值兜底
 * - sessionId 缺失时填充空字符串（保持与 MessageItem 兼容）
 * - quoteRef / quoteBody null 转 undefined
 *
 * @param message - 任意消息对象（MessageItem / ChatMessage / DTO）
 * @returns 视图层使用的 ChatMessageView
 */
export function toChatMessageView(message: MessageLike): ChatMessageView {
  return {
    id: String(message.id),
    sessionId: message.sessionId ?? "",
    sender: (message.sender as "self" | "peer" | "system") ?? "peer",
    kind: (message.kind as "text" | "voice" | "emoji" | "system") ?? "text",
    body: message.body ?? "",
    sentAt:
      typeof message.sentAt === "number"
        ? new Date(message.sentAt).toISOString()
        : message.sentAt ?? new Date().toISOString(),
    durationSeconds: message.durationSeconds ?? null,
    recalled: message.recalled,
    deliveryStatus: message.deliveryStatus,
    quoteRef: message.quoteRef ?? undefined,
    quoteBody: message.quoteBody ?? undefined,
    quoteSender: toQuoteSender(message.quoteSender),
  };
}

/**
 * 将后端 quoteSender（string | null）安全转换为视图层窄类型
 *
 * 仅接受 "self" / "peer" / "system"，其他值（含 null/undefined/未知字符串）统一回退为 undefined。
 *
 * @param raw - 后端返回的 quoteSender 原始值
 * @returns 视图层窄类型 "self" | "peer" | "system" | undefined
 */
function toQuoteSender(
  raw: string | null | undefined
): "self" | "peer" | "system" | undefined {
  if (raw === "self" || raw === "peer" || raw === "system") {
    return raw;
  }
  return undefined;
}

/**
 * 将后端 DTO 转换为 ChatMessageView
 *
 * 处理：
 * - id 字符串化（后端可能返回数字）
 * - sentAt 字符串化（后端可能返回时间戳）
 * - sender / kind 默认值兜底
 *
 * @param dto - 后端返回的临时聊天消息 DTO
 * @returns 视图层使用的 ChatMessageView
 */
export function fromTempChatMessageDto(dto: TempChatMessageDto): ChatMessageView {
  return toChatMessageView(dto);
}

/**
 * 批量将消息列表转换为 ChatMessageView
 *
 * 兼容 MessageItem[] / ChatMessage[] / TempChatMessageDto[] 等多种来源。
 *
 * @param messages - 消息列表
 * @returns ChatMessageView 列表
 */
export function toChatMessageViewList(
  messages: readonly MessageLike[]
): ChatMessageView[] {
  return messages.map(toChatMessageView);
}

/**
 * 安全获取消息的撤回状态
 *
 * 替代 index.vue 中 `(message as any).recalled` 的类型断言。
 *
 * @param message - 任意消息对象
 * @returns 是否被撤回（默认 false）
 */
export function getMessageRecalled(
  message: MessageItem | ChatMessageView | MessageLike
): boolean {
  const view = message as ChatMessageView;
  return Boolean(view.recalled);
}

/**
 * 安全获取消息的送达状态
 *
 * 替代 index.vue 中 `(message as any).deliveryStatus` 的类型断言。
 *
 * @param message - 任意消息对象
 * @returns 送达状态（默认 "sent"）
 */
export function getMessageDeliveryStatus(
  message: MessageItem | ChatMessageView | MessageLike
): MessageDeliveryStatus {
  const view = message as ChatMessageView;
  return view.deliveryStatus ?? "sent";
}

/**
 * 安全获取消息的引用回复信息
 *
 * 替代 index.vue 中 `(message as any).quoteRef / quoteBody / quoteSender` 的类型断言。
 *
 * @param message - 任意消息对象
 * @returns 引用回复信息（无引用时返回 null）
 */
export function getMessageQuote(
  message: MessageItem | ChatMessageView | MessageLike
): { quoteRef: string; quoteBody: string; quoteSender: string } | null {
  const view = message as ChatMessageView;
  if (!view.quoteRef) return null;
  return {
    quoteRef: view.quoteRef,
    quoteBody: view.quoteBody ?? "",
    quoteSender: view.quoteSender ?? "peer",
  };
}
