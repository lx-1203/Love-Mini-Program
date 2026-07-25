import { defineStore } from "pinia";
import { ref } from "vue";
import { appEnv } from "../services/env";
import { request } from "../services/http";

/**
 * VIP 红包 Store
 *
 * 提供 VIP 红包相关业务的状态管理与 API 调用封装：
 * - 创建红包（普通 / 拼手气）
 * - 领取红包
 * - 查询红包详情
 *
 * 错误处理：所有 API 调用失败时抛出 EnhancedApiError，
 * 由调用方（页面层）通过 try/catch 捕获并 toast 提示。
 *
 * mp-weixin 兼容：使用 uni.request 封装，不依赖 import.meta。
 */

/** 红包类型：NORMAL 普通（等额） / LUCKY 拼手气（随机） */
export type RedPacketType = "NORMAL" | "LUCKY";

/** 红包状态：PENDING 待领取 / DEPLETED 已领完 / EXPIRED 已过期 */
export type RedPacketStatus = "PENDING" | "DEPLETED" | "EXPIRED";

/** 红包视图（后端 RedPacketView 对应） */
export interface RedPacketView {
  id: number;
  senderId: number;
  totalAmount: number;
  totalCount: number;
  claimedCount: number;
  claimedAmount: number;
  type: RedPacketType;
  chatId?: string | null;
  blessing?: string | null;
  expireAt?: string | null;
  status: RedPacketStatus;
  createdAt?: string | null;
  claims: ClaimView[];
}

/** 领取记录视图 */
export interface ClaimView {
  id: number;
  claimerId: number;
  amount: number;
  claimedAt?: string | null;
}

/** 领取结果视图 */
export interface ClaimResultView {
  amount: number;
  claimedCount: number;
  totalCount: number;
}

/** 创建红包请求体 */
export interface CreateRedPacketPayload {
  /** 总金额（分），100~100000 */
  totalAmount: number;
  /** 总个数，1~100 */
  totalCount: number;
  /** 类型 NORMAL / LUCKY */
  type: RedPacketType;
  /** 关联聊天会话 ID（可选） */
  chatId?: string;
  /** 祝福语（可选，最长 200 字符） */
  blessing?: string;
}

/**
 * 判断是否使用 mock 模式
 */
function useMock(): boolean {
  return appEnv.apiMode === "mock";
}

/**
 * Mock 模式下生成假数据，便于 H5 调试与单元测试
 */
function buildMockRedPacket(payload: CreateRedPacketPayload, senderId: number): RedPacketView {
  return {
    id: Math.floor(Math.random() * 100000) + 1,
    senderId,
    totalAmount: payload.totalAmount,
    totalCount: payload.totalCount,
    claimedCount: 0,
    claimedAmount: 0,
    type: payload.type,
    chatId: payload.chatId ?? null,
    blessing: payload.blessing ?? null,
    expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "PENDING",
    createdAt: new Date().toISOString(),
    claims: [],
  };
}

export const useVipRedPacketStore = defineStore("vip-red-packet", () => {
  /** 最近创建的红包（用于创建后跳转或展示） */
  const lastCreatedPacket = ref<RedPacketView | null>(null);

  /** 当前查看的红包详情 */
  const currentDetail = ref<RedPacketView | null>(null);

  /** 创建中标志（防止重复提交） */
  const creating = ref(false);

  /** 领取中标志 */
  const claiming = ref(false);

  /** 当前会话的红包列表（按创建时间倒序，不含领取记录） */
  const sessionPackets = ref<RedPacketView[]>([]);

  /** 会话红包列表加载中标志 */
  const loadingSessionPackets = ref(false);

  /**
   * 创建红包
   *
   * @param payload 创建红包请求体
   * @param senderId 发送者 ID（mock 模式下使用）
   * @returns 创建后的红包视图
   */
  async function createRedPacket(
    payload: CreateRedPacketPayload,
    senderId = 1
  ): Promise<RedPacketView> {
    // 参数前置校验，与后端 @Valid 注解保持一致
    if (!payload.totalAmount || payload.totalAmount < 100) {
      throw new Error("红包总金额不能少于 100 分（1 元）");
    }
    if (payload.totalAmount > 100_000) {
      throw new Error("红包总金额不能超过 100000 分（1000 元）");
    }
    if (!payload.totalCount || payload.totalCount < 1) {
      throw new Error("红包个数至少为 1");
    }
    if (payload.totalCount > 100) {
      throw new Error("红包个数不能超过 100");
    }
    if (payload.type === "NORMAL" && payload.totalAmount % payload.totalCount !== 0) {
      throw new Error("普通红包总金额必须能被个数整除");
    }

    if (useMock()) {
      const mock = buildMockRedPacket(payload, senderId);
      lastCreatedPacket.value = mock;
      return mock;
    }

    creating.value = true;
    try {
      const result = await request<RedPacketView, CreateRedPacketPayload>({
        url: "/vip/red-packets",
        method: "POST",
        data: payload,
      });
      lastCreatedPacket.value = result;
      return result;
    } finally {
      creating.value = false;
    }
  }

  /**
   * 领取红包
   *
   * @param redPacketId 红包 ID
   * @returns 领取结果视图（含本次领取金额）
   */
  async function claimRedPacket(redPacketId: number): Promise<ClaimResultView> {
    if (!redPacketId || redPacketId <= 0) {
      throw new Error("红包 ID 非法");
    }

    if (useMock()) {
      // mock 模式：随机返回 1~平均金额之间的值
      const amount = Math.floor(Math.random() * 99) + 1;
      return {
        amount,
        claimedCount: Math.floor(Math.random() * 10) + 1,
        totalCount: 10,
      };
    }

    claiming.value = true;
    try {
      return await request<ClaimResultView, unknown>({
        url: `/vip/red-packets/${redPacketId}/claim`,
        method: "POST",
      });
    } finally {
      claiming.value = false;
    }
  }

  /**
   * 查询红包详情
   *
   * @param redPacketId 红包 ID
   * @returns 红包视图（含领取记录）
   */
  async function fetchRedPacketDetail(redPacketId: number): Promise<RedPacketView> {
    if (!redPacketId || redPacketId <= 0) {
      throw new Error("红包 ID 非法");
    }

    if (useMock()) {
      const mock: RedPacketView = {
        id: redPacketId,
        senderId: 1,
        totalAmount: 1000,
        totalCount: 10,
        claimedCount: 3,
        claimedAmount: 300,
        type: "LUCKY",
        chatId: null,
        blessing: "祝你天天开心",
        expireAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        status: "PENDING",
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        claims: [
          { id: 1, claimerId: 2, amount: 88, claimedAt: new Date().toISOString() },
          { id: 2, claimerId: 3, amount: 56, claimedAt: new Date().toISOString() },
          { id: 3, claimerId: 4, amount: 156, claimedAt: new Date().toISOString() },
        ],
      };
      currentDetail.value = mock;
      return mock;
    }

    const result = await request<RedPacketView, unknown>({
      url: `/vip/red-packets/${redPacketId}`,
      method: "GET",
    });
    currentDetail.value = result;
    return result;
  }

  /** 重置状态 */
  function reset() {
    lastCreatedPacket.value = null;
    currentDetail.value = null;
    creating.value = false;
    claiming.value = false;
    sessionPackets.value = [];
    loadingSessionPackets.value = false;
  }

  /**
   * 查询指定会话下的红包列表
   *
   * 调用 GET /api/chat/{chatId}/red-packets 获取该会话历史红包列表，
   * 按 createdAt 倒序排列，仅返回基础信息（不含领取记录列表）。
   *
   * 错误处理：API 调用失败时抛出 EnhancedApiError，
   * 由调用方（页面层）通过 try/catch 捕获并 toast 提示。
   *
   * @param chatId 聊天会话 ID
   * @returns 红包视图列表（按创建时间倒序，不含领取记录）
   */
  async function listByChatId(chatId: string): Promise<RedPacketView[]> {
    if (!chatId || chatId.trim().length === 0) {
      throw new Error("聊天会话 ID 不能为空");
    }

    if (useMock()) {
      // mock 模式：返回空列表，由页面通过消息流自行渲染红包消息
      const mock: RedPacketView[] = [];
      sessionPackets.value = mock;
      return mock;
    }

    loadingSessionPackets.value = true;
    try {
      const result = await request<RedPacketView[], unknown>({
        url: `/chat/${encodeURIComponent(chatId)}/red-packets`,
        method: "GET",
      });
      sessionPackets.value = result;
      return result;
    } finally {
      loadingSessionPackets.value = false;
    }
  }

  return {
    lastCreatedPacket,
    currentDetail,
    creating,
    claiming,
    sessionPackets,
    loadingSessionPackets,
    createRedPacket,
    claimRedPacket,
    fetchRedPacketDetail,
    listByChatId,
    reset,
  };
});
