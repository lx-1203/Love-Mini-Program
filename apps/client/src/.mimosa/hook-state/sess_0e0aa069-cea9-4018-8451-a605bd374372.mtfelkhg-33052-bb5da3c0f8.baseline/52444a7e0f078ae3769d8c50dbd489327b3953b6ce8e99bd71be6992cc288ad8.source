/**
 * Chat Store 实例类型定义
 *
 * 用于在拆分的 action 文件中显式声明 this 类型，避免 noImplicitThis 错误。
 *
 * 背景：Pinia Option API 中 actions 的 this 类型由 defineStore 自动推断，
 * 但当 actions 拆分到独立文件时，TypeScript 无法自动推断 this 类型，
 * 需要通过显式声明确保类型安全。
 *
 * 该接口包含 state + actions 两部分，与 store 实例的公开 API 一致。
 * 当 store 结构变更时，需同步更新此接口。
 */

import type {
  toChatOverviewView,
  toChatSessionView,
} from "../../view-models/chat";
import type {
  ChatOverview,
  MessageDeliveryStatus,
} from "./types";

/** 聊天概览视图模型类型 */
type OverviewView = ReturnType<typeof toChatOverviewView>;
/** 聊天会话视图模型类型 */
type SessionView = ReturnType<typeof toChatSessionView>;

/**
 * 破冰话题项结构（基于对方资料生成）
 */
export interface IcebreakerItem {
  /** 话题 ID */
  id: number;
  /** 话题内容 */
  content: string;
  /** 话题分类 */
  category: string;
  /** 话题来源（如兴趣、学校等） */
  source: string;
}

/**
 * Chat Store 状态接口
 */
export interface ChatState {
  /** 概览加载中标记 */
  loadingOverview: boolean;
  /** 会话加载中标记 */
  loadingSession: boolean;
  /** 错误消息（null 表示无错误） */
  errorMessage: string | null;
  /** 后端原始概览数据 */
  overview: ChatOverview | null;
  /** 概览视图模型（用于 UI 渲染） */
  overviewView: OverviewView | null;
  /** 当前活跃会话视图模型 */
  activeSession: SessionView | null;
  /** 当前匹配的破冰话题列表（仅话题文案） */
  icebreakerTopics: string[];
  /** 基于对方资料的破冰话题项（含 id、content、category、source） */
  icebreakerItems: IcebreakerItem[];
  /** 破冰话题加载中标记 */
  loadingIcebreakers: boolean;
  /**
   * 消息投递状态映射表（sendId -> status）。
   *
   * 修复（P1 BUG）：原 sendText 无状态持久化，页面刷新或切换会话后，
   * 用户无法感知上一条消息是否发送成功。
   * 现将每条消息的投递状态持久化到本地存储，确保跨会话/刷新后仍可恢复展示。
   * sendId 为客户端生成的唯一 ID（send-${timestamp}），与消息体解耦。
   */
  messageDeliveryStatus: Record<string, MessageDeliveryStatus>;
}

/**
 * Chat Store 实例类型（state + actions）
 *
 * 拆分的 action 文件中函数需使用 `this: ChatStoreThis` 显式声明 this 类型。
 * 该接口结构上兼容 ChatStoreLike（higher-order.ts 中定义），
 * 因此可传递给 withErrorHandling / withMockMode 高阶函数。
 */
export interface ChatStoreThis extends ChatState {
  // === Actions ===
  /** 加载聊天概览 */
  loadOverview: () => Promise<void>;
  /** 从推荐人创建会话 */
  startFromRecommendation: (
    recommendedPersonId: string
  ) => Promise<SessionView | null>;
  /** 从匹配创建会话 */
  startFromMatch: (matchId: string) => Promise<SessionView | null>;
  /** 加载指定会话 */
  loadSession: (sessionId: string) => Promise<void>;
  /** 设置会话置顶状态 */
  setSessionPinned: (sessionId: string, pinned: boolean) => Promise<void>;
  /** 发送文本消息 */
  sendText: (body: string) => Promise<void>;
  /**
   * 发送语音消息
   *
   * Task 1.1.4：第二个参数 tempFilePath 为录音文件临时路径，
   * 由 VoiceRecorder 组件 onStop 回调提供（mp-weixin 端为 wxfile:// 协议）。
   * Real 模式下会先通过 uni.uploadFile 上传至 /api/chat/voice 拿到 URL，
   * 再调用 chatTransport.pushMessage 发送 kind="voice" 的消息。
   * H5 端 tempFilePath 为空时降级为占位 body，保留会话流程。
   */
  sendVoice: (durationSeconds: number, tempFilePath?: string) => Promise<void>;
  /** 接受联系方式交换 */
  acceptExchange: (actor: "self" | "peer") => Promise<void>;
  /** 拒绝联系方式交换 */
  rejectExchange: (actor: "self" | "peer") => Promise<void>;
  /** 结束当前会话 */
  endSession: () => Promise<void>;
  /** 加载破冰话题列表（基于匹配 ID） */
  loadIcebreakers: (matchId: number) => Promise<void>;
  /** 发送破冰话题到对话 */
  sendIcebreaker: (matchId: number, topic: string) => Promise<void>;
  /** 拉取破冰话题项（基于对方用户 ID） */
  fetchIcebreakers: (peerUserId: number) => Promise<void>;
  /** 更新消息投递状态（内部辅助方法） */
  _setMessageStatus: (sendId: string, status: MessageDeliveryStatus) => void;
}

/**
 * 兼容性别名：ChatStoreInstance 与 ChatStoreThis 等价。
 * 保留此别名便于未来切换到 ReturnType<typeof useChatStore> 推断。
 */
export type ChatStoreInstance = ChatStoreThis;
