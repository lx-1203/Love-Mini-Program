/**
 * Chat Store 实现入口
 *
 * 聊天页 Store 主体实现：管理聊天概览、活跃会话、消息发送、联系方式交换、破冰话题。
 *
 * 模块拆分结构：
 * - ./types                  类型定义（MessageDeliveryStatus / ChatStoreLike / TempChatSession 等）
 * - ./constants              常量（MESSAGE_STATUS_STORAGE_KEY / MAX_SEND_RETRIES 等）
 * - ./mock-data              Mock 数据（mockSession1 / mockSession2 / mockChatOverview 等）
 * - ./utils                  工具函数（useMock / loadMessageStatus / withSendRetry）
 * - ./higher-order           高阶函数与传输层实例（chatTransport / withErrorHandling / withMockMode）
 * - ./store-type             Store 实例类型定义（用于拆分 action 的 this 类型）
 * - ./actions/session        会话生命周期 Actions（loadOverview / startFromMatch / loadSession / endSession）
 * - ./actions/messaging      消息发送 Actions（sendText / sendVoice / _setMessageStatus）
 * - ./actions/exchange       联系方式交换 Actions（acceptExchange / rejectExchange）
 * - ./actions/icebreakers    破冰话题 Actions（loadIcebreakers / sendIcebreaker / fetchIcebreakers）
 * - ./index.ts               本文件：store 主体实现（state + actions 装配）
 *
 * 通过 stores/chat.ts re-export，保持外部 import 路径完全兼容：
 *   import { useChatStore } from "@/stores/chat";
 *
 * 拆分目的：原 chat.ts 单文件 944 行 → 中间 index.ts 555 行 → 拆分后 index.ts ~85 行。
 * 各文件聚焦单一关注点，便于维护与测试。
 */

import { defineStore } from "pinia";
import { clientApi } from "../../services/api";
import { toChatOverviewView, toChatSessionView } from "../../view-models/chat";
import {
  loadMessageStatus,
} from "./utils";
import type { MessageDeliveryStatus } from "./types";

// 引入拆分后的 actions
import {
  loadOverview,
  startFromRecommendation,
  startFromMatch,
  loadSession,
  setSessionPinned,
  endSession,
} from "./actions/session";
import {
  sendText,
  sendVoice,
  _setMessageStatus,
} from "./actions/messaging";
import {
  acceptExchange,
  rejectExchange,
} from "./actions/exchange";
import {
  loadIcebreakers,
  sendIcebreaker,
  fetchIcebreakers,
} from "./actions/icebreakers";

// 保留 re-export 以便外部旧 import 路径仍能从 "@/stores/chat" 取到这些符号
export * from "./types";
export * from "./constants";
export * from "./mock-data";
export * from "./utils";
export * from "./higher-order";

/**
 * 聊天页 Store
 *
 * 管理聊天概览、活跃会话、消息发送、联系方式交换、破冰话题。
 *
 * Actions 装配说明：
 * 由于 actions 已拆分到 ./actions/* 文件，且这些函数使用 `this: ChatStoreThis`
 * 显式声明 this 类型，本文件通过 method shorthand 形式将函数引用挂载到 actions 对象。
 * Pinia 会自动将 this 绑定到 store 实例，因此拆分后的函数能正确访问 state。
 */
export const useChatStore = defineStore("chat", {
  state: () => ({
    loadingOverview: false,
    loadingSession: false,
    errorMessage: null as string | null,
    overview: null as Awaited<ReturnType<typeof clientApi.getChatOverview>> | null,
    overviewView: null as ReturnType<typeof toChatOverviewView> | null,
    activeSession: null as ReturnType<typeof toChatSessionView> | null,
    /** 当前匹配的破冰话题列表 */
    icebreakerTopics: [] as string[],
    /** 基于对方资料的破冰话题项（含 id、content、category、source） */
    icebreakerItems: [] as Array<{
      id: number;
      content: string;
      category: string;
      source: string;
    }>,
    /** 破冰话题加载中 */
    loadingIcebreakers: false,
    /**
     * 消息投递状态映射表（sendId -> status）。
     *
     * 修复（P1 BUG）：原 sendText 无状态持久化，页面刷新或切换会话后，
     * 用户无法感知上一条消息是否发送成功。
     * 现将每条消息的投递状态持久化到本地存储，确保跨会话/刷新后仍可恢复展示。
     * sendId 为客户端生成的唯一 ID（send-${timestamp}），与消息体解耦。
     */
    messageDeliveryStatus: loadMessageStatus() as Record<string, MessageDeliveryStatus>,
  }),
  actions: {
    // === 会话生命周期 Actions（来自 ./actions/session） ===
    loadOverview,
    startFromRecommendation,
    startFromMatch,
    loadSession,
    setSessionPinned,
    endSession,

    // === 消息发送 Actions（来自 ./actions/messaging） ===
    sendText,
    sendVoice,
    _setMessageStatus,

    // === 联系方式交换 Actions（来自 ./actions/exchange） ===
    acceptExchange,
    rejectExchange,

    // === 破冰话题 Actions（来自 ./actions/icebreakers） ===
    loadIcebreakers,
    sendIcebreaker,
    fetchIcebreakers,
  },
});
