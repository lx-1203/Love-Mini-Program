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

/**
 * 各解锁场景的扣费金额（元），统一集中便于调整。
 *
 * 修复（R4-00171）：扣费金额不得由调用方自定，统一按场景码从定价表读取：
 * - LIKES / VISITORS：后端提供 POST /wallet/unlock（服务端配置 app.unlock-price.*
 *   定价，见 application.yml），扣费金额以服务端为准，本表仅用于 UI 提示；
 * - MESSAGE / WHISPER：后端暂未提供解锁定价查询接口，金额取自本表（服务端定价口径的
 *   客户端镜像）。
 *
 * ⚠️ P2 修复（2026-10-31）：本表此前写着 MESSAGE=5 元（500 分），而服务端
 * `app.wallet.price.MESSAGE_UNLOCK` 的定价是 **100 分 = 1 元**
 * （apps/api/.../wallet/WalletController.java 的 @Value 默认值 + resolveServerPrice()，
 * 该 key 未在 application.yml 里覆盖）⇒ 解锁私信的预检文案向用户报 5 元、实际扣 1 元。
 * 现在：
 * 1. 本表数值与服务端在册定价逐条对齐，并由 `src/tests/stores/server-price-mirror.spec.ts`
 *    解析服务端声明（application.yml + WalletController 的 @Value）钉死 —— 镜像再漂移就红；
 * 2. 扣费响应里服务端**已经**回传实际扣减金额（WalletDeductView.amountCents），
 *    store 把它记进 `serverPrices` 并优先透出 ⇒ 一旦真的扣过费，展示价就是服务端价，
 *    本表退化为「首次扣费前的兜底镜像」；
 * 3. 消费方请改用 `unlockCostCents()` / `unlockCostYuan()`（定义见下，同一处派生），
 *    不要再各自 `Math.round(UNLOCK_COST_YUAN.x * 100)`。
 */
export const UNLOCK_COST_YUAN: Record<UnlockScene, number> = {
  MESSAGE: 1,
  VISITORS: 3,
  LIKES: 3,
  WHISPER: 2,
};

/**
 * 单一派生处：场景 → 展示/预检用的扣费金额（分）。
 *
 * 取值优先级：服务端本次实际扣减额（`/wallet/deduct` 响应的 amountCents，资金权威）
 * > 本地定价镜像表 UNLOCK_COST_YUAN。调用方不许再各自 *100 / 另写一份数字。
 *
 * @param scene 解锁场景
 * @param serverObservedCents 服务端本次实际扣减额（分，可空；由 store 内部记录）
 * @returns 扣费金额（分）
 */
export function unlockCostCents(
  scene: UnlockScene,
  serverObservedCents?: number | null,
): number {
  const observed = serverObservedCents;
  if (typeof observed === "number" && Number.isFinite(observed) && observed > 0) {
    return Math.round(observed);
  }
  return Math.round(UNLOCK_COST_YUAN[scene] * 100);
}

/** 场景 → 展示用金额（元），与 unlockCostCents 同一处派生（不另算第二遍）。 */
export function unlockCostYuan(
  scene: UnlockScene,
  serverObservedCents?: number | null,
): number {
  return unlockCostCents(scene, serverObservedCents) / 100;
}

/**
 * 场景 → 后端 /wallet/unlock 的 targetType 映射（服务端定价路径）。
 * 仅含后端已提供解锁接口（P0-17）的场景；其余场景走 /wallet/deduct + 定价镜像表。
 */
const UNLOCK_TARGET_TYPE: Partial<Record<UnlockScene, "LIKED_ME" | "VISITOR">> = {
  LIKES: "LIKED_ME",
  VISITORS: "VISITOR",
};

/** 场景对应的关联业务类型（后端流水 relatedType） */
export const UNLOCK_RELATED_TYPE: Record<UnlockScene, string> = {
  MESSAGE: "MESSAGE_UNLOCK",
  VISITORS: "VISITORS_UNLOCK",
  LIKES: "LIKES_UNLOCK",
  WHISPER: "WHISPER_UNLOCK",
};

/**
 * 生成解锁 orderId（自 2026-10-30 起仅作日志/兼容用途，不再是幂等键）。
 *
 * 后端契约变更：`/wallet/deduct` 的幂等键已改为服务端派生的
 * `UNLOCK-{relatedType}-{userId}-{relatedId}`（见 WalletController.deriveOrderId），
 * 客户端传来的 orderId 不再参与计算。原因是 wallet_transaction_log.order_id 是
 * **全局**唯一索引，而本函数旧格式不含 userId —— 用户 A 解锁过 T 之后，
 * 用户 B 解锁同一个 T 会命中 A 的流水并被拒（400 "orderId 已存在但归属用户不一致"），
 * 等于同一目标只有第一个人能付费解锁。
 *
 * 保留本函数的理由：/wallet/unlock 与 /wallet/deduct 两条入口此前各自手写键格式，
 * 收敛成一个函数便于日志对账；若将来后端恢复"客户端提供幂等键"的契约，
 * 键格式必须包含当前用户 id，否则上述跨用户碰撞会复发。
 *
 * @param scene 解锁场景
 * @param targetId 目标业务 ID（如目标用户 ID）
 * @returns orderId（如 `UNLOCK-LIKES-2003`）
 */
export function buildUnlockOrderId(scene: UnlockScene, targetId: string | number): string {
  return `UNLOCK-${scene}-${String(targetId)}`;
}

export const useCoinsStore = defineStore("coins", () => {
  /** 余额（分） */
  const balanceCents = ref<number>(0);
  /** 是否已加载 */
  const loaded = ref(false);
  /** 加载标志 */
  const loading = ref(false);

  /**
   * 服务端实际扣减额（分）按场景记录 —— P2 修复（2026-10-31）：
   * `/wallet/deduct` 的响应 WalletDeductView.amountCents 一直是服务端**真正扣的钱**
   * （客户端上送的 amountCents 自 2026-10-05 起只是建议值，见 WalletController.deduct
   * 的「以服务端为准」分支），此前本 store 把它扔了、只读 balanceAfterCents。
   * 现在收下并优先透出给展示层 ⇒ 扣过费之后页面报的是服务端价，不再是手抄镜像。
   */
  const serverPrices = ref<Partial<Record<UnlockScene, number>>>({});

  /** 场景 → 展示/预检金额（分）：服务端实测价优先，回落到定价镜像表（同一处派生）。 */
  function costCentsFor(scene: UnlockScene): number {
    return unlockCostCents(scene, serverPrices.value[scene]);
  }

  /** 场景 → 展示/预检金额（元）：与 costCentsFor 同一处派生，不另算第二遍。 */
  function costYuanFor(scene: UnlockScene): number {
    return costCentsFor(scene) / 100;
  }

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
   * 修复（R4-00171）：扣费金额不再由客户端/调用方自定，统一从服务端定价读取：
   * - LIKES / VISITORS：有后端 /wallet/unlock 接口（服务端 app.unlock-price.* 定价），
   *   走服务端定价扣费，客户端不传金额，目标 ID 有效时优先此路径；
   * - MESSAGE / WHISPER 或目标 ID 无效（如列表级解锁）：无对应解锁接口，
   *   金额取自 costCentsFor()（服务端回传价优先，回落 UNLOCK_COST_YUAN 定价镜像表；
   *   按场景码读，禁止调用方传任意金额）。
   * orderId 按后端契约规范生成（WalletController Javadoc：UNLOCK-{scene}-{targetUserId}）。
   *
   * @param scene 解锁场景
   * @param targetId 目标业务 ID（如目标用户 ID）
   * @returns 扣费后余额（分）
   */
  async function spend(scene: UnlockScene, targetId: string | number): Promise<number> {
    // R4-00171：金额仅从服务端定价或定价镜像表读取，不接受调用方金额参数
    // P2 修复（2026-10-31）：本行不再直接吃 UNLOCK_COST_YUAN，改走 costCentsFor()
    // —— 一旦本会话真的扣过费，服务端回传的实际扣减额就是这里的价格来源。
    const amountCents = costCentsFor(scene);
    // R4-00171：orderId 按后端契约规范生成（UNLOCK-{scene}-{targetUserId}）
    // R4-00195：幂等 orderId 统一经 buildUnlockOrderId 生成（单一真相源）
    const orderId = buildUnlockOrderId(scene, targetId);

    if (useMock()) {
      const current = balanceCents.value || 80000;
      if (current < amountCents) {
        throw new Error("交友币余额不足，请先充值");
      }
      balanceCents.value = current - amountCents;
      loaded.value = true;
      return balanceCents.value;
    }

    // 服务端定价路径：POST /wallet/unlock 按后端配置单价扣费，客户端不传金额。
    // 幂等键沿用规范 orderId（后端按 orderId 唯一索引去重）。
    const targetType = UNLOCK_TARGET_TYPE[scene];
    const targetNum = Number(targetId);
    if (targetType && Number.isInteger(targetNum) && targetNum > 0) {
      const result = await request<{ unlocked: boolean; balance: number }, unknown>({
        url: "/wallet/unlock",
        method: "POST",
        data: { targetType, targetId: targetNum },
        headers: { "Idempotency-Key": orderId },
      });
      balanceCents.value = result?.balance ?? balanceCents.value;
      loaded.value = true;
      return balanceCents.value;
    }

    // 定价镜像路径：金额取自 costCentsFor()（服务端实测价优先，回落定价镜像表）。
    // 服务端 deduct 仍为最终扣费权威（余额不足 / 金额超限由后端校验）。
    const result = await request<{ balanceAfterCents: number; amountCents?: number }, {
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
    // P2 修复：把服务端**实际扣减额**（WalletDeductView.amountCents）收下来，
    // 之后这一场景的展示/预检价就以它为准，手抄镜像表不再是唯一来源。
    if (typeof result?.amountCents === "number" && result.amountCents > 0) {
      serverPrices.value = { ...serverPrices.value, [scene]: result.amountCents };
    }
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
    serverPrices,
    costCentsFor,
    costYuanFor,
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
