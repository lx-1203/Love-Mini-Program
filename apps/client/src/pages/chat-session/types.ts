/**
 * 聊天会话页 - 类型定义
 *
 * 集中维护 chat-session 页相关的 TypeScript 类型：
 * - 视图模型类型：ChatMessageView（扩展 MessageItem，补充撤回/送达/引用字段）
 * - 引用上下文：QuoteContext / QuoteReply
 * - 长按菜单：LongPressMenuState
 * - 录音状态：RecordingState
 *
 * 这些类型被 dto.ts / view-models.ts / api.ts / index.vue 共享。
 *
 * 硬约束：本文件仅包含纯类型定义，不涉及页面转场逻辑与副作用。
 */

import type { MessageItem } from "../../stores/messages";

/**
 * 引用上下文（来自兴趣圈回复的破冰场景）
 *
 * 由页面跳转参数 `quoteContext` 序列化传入，包含被引用的兴趣圈话题信息。
 */
export interface QuoteContext {
  /** 话题标题 */
  topicTitle: string;
  /** 话题 ID */
  topicId: string;
  /** 被引用的回复 ID */
  replyId: string;
  /** 被引用的回复内容 */
  replyContent: string;
  /** 被引用的回复作者昵称 */
  replyAuthorName: string;
}

/**
 * 引用回复状态（用户长按消息后选择"引用"）
 */
export interface QuoteReply {
  /** 被引用消息 ID */
  messageId: string;
  /** 被引用消息正文 */
  body: string;
  /** 被引用消息发送方：self / peer / system */
  sender: string;
}

/**
 * 长按菜单状态
 */
export interface LongPressMenuState {
  /** 是否可见 */
  visible: boolean;
  /** 触发长按的消息 ID */
  messageId: string;
  /** 是否为本人发送的消息（决定是否显示"撤回"项） */
  isSelf: boolean;
  /** 菜单位置 X（保留字段，当前未使用坐标定位） */
  x: number;
  /** 菜单位置 Y（保留字段，当前未使用坐标定位） */
  y: number;
}

/**
 * 录音状态枚举
 */
export interface RecordingState {
  /** 是否正在录音 */
  isRecording: boolean;
  /** 录音秒数 */
  recordingSeconds: number;
}

/**
 * 消息送达状态枚举（合并各来源类型）
 *
 * 来源：
 * - ChatBubble 组件 props: "sent" | "delivered" | "read"
 * - ChatMessage（api-types-supplement）: "sent" | "read"
 * - chat store MessageDeliveryStatus: "sending" | "sent" | "failed"
 *
 * 视图层使用并集，由 ChatBubble 自行过滤不可识别的状态（不渲染对应图标）。
 */
export type MessageDeliveryStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

/**
 * 扩展消息视图模型
 *
 * 在 MessageItem 基础上补充：
 * - recalled：是否被撤回
 * - deliveryStatus：送达状态（sending/sent/delivered/read/failed）
 * - quoteRef / quoteBody / quoteSender：引用回复相关字段
 *
 * 设计目的：消除 chat-session/index.vue 中 `(message as any).xxx` 的类型断言，
 * 提供完整的类型安全保障，便于 IDE 静态检查与重构。
 */
export interface ChatMessageView extends MessageItem {
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
