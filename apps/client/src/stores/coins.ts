import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { request } from "../services/http";
import { useMock } from "./helpers/use-mock";

/**
 * 交友币（钱包）Store
 *
 * 提供交友币余额、流水与扣费（解锁）入口：
 * - fetchBalance：查询余额（分）
 * - listTransactions：分页查询流水（账单）
 * - spend：交友币扣费（解锁私信/访客/喜欢你/悄悄话），幂等
 *
 * 单位约定：后端钱包金额一律为「分」（cents），前端展示换算为「元」（分 / 100）。
 *
 * mock 兼容：mock 模式返回内存模拟数据；real 模式走 /api/v1/wallet/*。
 * 后端 wallet 双 profile 可用（mock 内存 / real 数据库），展示版可完整演示。
 */
export interface CoinTransactionItem {
  id: number;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balanceAfter: number;
  relatedType: string;
  relatedId?: string | null;
  orderId?: string | null;
  remark?: string | null;
  createdAt?: string | null;
}

export interface CoinTransactionList {
  items: CoinTransactionItem[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

/** 解锁场景（用于生成幂等 orderId 与关联业务类型） */
export type UnlockScene = "MESSAGE" | "VISITORS" | "LIKES" | "WHISPER";

/** 各解锁场景的扣费金额（元），统一集中便于调整 */
export const UNLOCK_COST_YUAN: Record<UnlockScene, number> = {
  MESSAGE: 5,
  VISITORS: 3,
  LIKES: 3,
  WHISPER: 2,
};

/** 场景对应的关联业务类型（后端流水 relatedType） */
export const UNLOCK_RELATED_TYPE: Record<UnlockScene, string> = {
  MESSAGE: "MESSAGE_UNLOCK",
  VISITORS: "VISITORS_UNLOCK",
  LIKES: "LIKES_UNLOCK",
  WHISPER: "WHISPER_UNLOCK",
};

export const useCoinsStore = defineStore("coins", () => {
  /** 余额（分） */
  const balanceCents = ref<number>(0);
  /** 是否已加载 */
  const loaded = ref(false);
  /** 加载标志 */
  const loading = ref(false);

  /** 余额（元，展示用） */
  const balanceYuan = computed<number>(() => balanceCents.value / 100);

  /** 流水列表（当前页） */
  const transactions = ref<CoinTransactionItem[]>([]);
  const transactionsTotal = ref<number>(0);
  const transactionsPage = ref<number>(0);
  const transactionsSize = ref<number>(20);
  const transactionsTotalPages = ref<number>(1);

  /**
   * 查询余额（分）。
   * @param forceRefresh 是否强制刷新（默认 true：余额需实时）
   */
  async function fetchBalance(forceRefresh = true): Promise<number> {
    if (useMock()) {
      // mock：初始余额 800 元（80000 分），扣费后递减
      balanceCents.value = Math.max(0, balanceCents.value);
      if (balanceCents.value === 0) balanceCents.value = 80000;
      loaded.value = true;
      return balanceCents.value;
    }

    if (loading.value && !forceRefresh) return balanceCents.value;
    loading.value = true;
    try {
      const result = await request<{ balanceCents: number }, unknown>({
        url: "/wallet/balance",
        method: "GET",
      });
      balanceCents.value = result?.balanceCents ?? 0;
      loaded.value = true;
      return balanceCents.value;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 交友币扣费（解锁）。
   * 幂等：orderId 由场景 + 目标用户推导，后端按 orderId 去重。
   *
   * @param scene 解锁场景
   * @param targetId 目标业务 ID（如目标用户 ID）
   * @returns 扣费后余额（分）
   */
  async function spend(scene: UnlockScene, targetId: string | number): Promise<number> {
    const amountYuan = UNLOCK_COST_YUAN[scene];
    const amountCents = Math.round(amountYuan * 100);
    const orderId = `UNLOCK-${scene}-${targetId}`;

    if (useMock()) {
      const current = balanceCents.value || 80000;
      if (current < amountCents) {
        throw new Error("交友币余额不足，请先充值");
      }
      balanceCents.value = current - amountCents;
      loaded.value = true;
      return balanceCents.value;
    }

    const result = await request<{ balanceAfterCents: number }, {
      amountCents: number;
      orderId: string;
      relatedType: string;
      relatedId: string;
    }>({
      url: "/wallet/deduct",
      method: "POST",
      data: {
        amountCents,
        orderId,
        relatedType: UNLOCK_RELATED_TYPE[scene],
        relatedId: String(targetId),
      },
      headers: { "Idempotency-Key": orderId },
    });
    balanceCents.value = result?.balanceAfterCents ?? balanceCents.value;
    loaded.value = true;
    return balanceCents.value;
  }

  /**
   * 分页查询流水（账单）。
   * @param params 分页参数
   */
  async function listTransactions(params: { page?: number; size?: number } = {}): Promise<CoinTransactionList> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;

    if (useMock()) {
      const mockItems: CoinTransactionItem[] = [
        {
          id: 1,
          type: "DEBIT",
          amount: 500,
          balanceAfter: 79500,
          relatedType: "MESSAGE_UNLOCK",
          orderId: "UNLOCK-MESSAGE-1",
          remark: "解锁私信",
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: 2,
          type: "CREDIT",
          amount: 80000,
          balanceAfter: 80000,
          relatedType: "SIGNIN_BONUS",
          orderId: "BONUS-SIGNIN-1",
          remark: "签到奖励",
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ];
      const start = page * size;
      const items = mockItems.slice(start, start + size);
      const mock: CoinTransactionList = {
        items,
        total: mockItems.length,
        page,
        size,
        totalPages: Math.max(1, Math.ceil(mockItems.length / size)),
      };
      transactions.value = mock.items;
      transactionsTotal.value = mock.total;
      transactionsPage.value = mock.page;
      transactionsSize.value = mock.size;
      transactionsTotalPages.value = mock.totalPages;
      return mock;
    }

    const result = await request<CoinTransactionList, unknown>({
      url: `/wallet/transactions?page=${page}&size=${size}`,
      method: "GET",
    });
    transactions.value = result?.items ?? [];
    transactionsTotal.value = result?.total ?? 0;
    transactionsPage.value = result?.page ?? page;
    transactionsSize.value = result?.size ?? size;
    transactionsTotalPages.value = result?.totalPages ?? 1;
    return result;
  }

  return {
    balanceCents,
    balanceYuan,
    loaded,
    loading,
    transactions,
    transactionsTotal,
    transactionsPage,
    transactionsSize,
    transactionsTotalPages,
    fetchBalance,
    spend,
    listTransactions,
  };
});
