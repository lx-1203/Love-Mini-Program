/**
 * Chat Store 类型定义
 *
 * 集中维护聊天 store 用到的类型，避免与实现耦合，便于多文件复用。
 *
 * 拆分目的：原 chat.ts 单文件 944 行，违反单一职责原则。
 * 拆分后类型独立成文件，被 constants / mock-data / utils / higher-order / index 复用。
 */

import type { components } from "../../services/generated/api-types";
import type { toChatSessionView } from "../../view-models/chat";

/** OpenAPI schemas 命名空间别名，简化后续类型引用 */
type Schemas = components["schemas"];

/** 聊天概览（包含会话摘要列表、空状态文案、推荐人列表） */
export type ChatOverview = Schemas["ChatOverview"];

/** 聊天会话摘要（列表项） */
export type ChatSessionSummary = Schemas["ChatSessionSummary"];

/** 临时聊天会话（完整会话数据，含消息列表与联系方式交换状态） */
export type TempChatSession = Schemas["TempChatSession"];

/**
 * 消息投递状态：sending-发送中 / sent-已发送 / failed-发送失败
 *
 * 修复（P1 BUG）：原 sendText 无状态持久化，刷新或切换会话后用户无法感知
 * 上一条消息是否发送成功。现引入三态跟踪并持久化到本地存储。
 */
export type MessageDeliveryStatus = "sending" | "sent" | "failed";

/**
 * 消息投递状态映射表（sendId -> status）
 * sendId 为客户端生成的唯一 ID（send-${timestamp}），与消息体解耦。
 */
export type MessageDeliveryStatusMap = Record<string, MessageDeliveryStatus>;

/**
 * ChatStore 实例类型约束
 * 用于高阶函数的类型推断，避免循环依赖（store 定义前无法引用其类型）。
 *
 * 仅声明高阶函数依赖的字段，避免与 store 定义耦合。
 */
export interface ChatStoreLike {
  /** 概览加载中标记 */
  loadingOverview: boolean;
  /** 会话加载中标记 */
  loadingSession: boolean;
  /** 破冰话题加载中标记 */
  loadingIcebreakers: boolean;
  /** 错误消息（null 表示无错误） */
  errorMessage: string | null;
  /** 当前活跃会话视图模型 */
  activeSession: ReturnType<typeof toChatSessionView> | null;
  /** 加载概览方法（高阶函数内部会调用以刷新会话列表） */
  loadOverview: () => Promise<void>;
}

/** loading 状态键名联合类型，限制只能操作已知的 loading 字段 */
export type LoadingKey = "loadingOverview" | "loadingSession" | "loadingIcebreakers";
