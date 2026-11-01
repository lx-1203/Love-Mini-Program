import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { request } from "../services/http";
import { useMock } from "./helpers/use-mock";
// 展示模式（全功能展示版）：VIP 全亮
import { isShowcaseMode } from "../config/showcase";
// 运行时环境判定：dev 模式会员模拟开关守卫（R4-00173）
import { isDev } from "../config/env";
import { STORAGE_KEYS } from "../constants/storage-keys";
import { t } from "@/i18n";

/**
 * VIP 会员 Store
 *
 * 提供 VIP 会员基础信息与套餐选择：
 * - 套餐选择：selectPlan
 * - 账单记录：fetchBills（分页查询，见 vip-billing.ts）
 * - 会员身份：refreshVipStatus / ensureVipStatusLoaded（真相源 = 最近一笔 SUCCESS 账单的
 *   periodEnd，与后端续费扫描同口径；第六轮 W2-1 接上，此前 `isVip` 在正式包恒假）
 *
 * R4-00193：自动续费逻辑已收敛到 vip-auto-renew.ts 单一 store（本文件原
 * 自带一份 getAutoRenewStatus / enableAutoRenew / disableAutoRenew 重复实现
 * 且零消费方——页面统一使用 useAutoRenewStore，已删除避免双实现漂移）。
 *
 * 错误处理：API 调用失败时抛出 EnhancedApiError，由页面层捕获并 toast 提示。
 *
 * mp-weixin 兼容：使用 uni.request 封装，不依赖 import.meta。
 */

export interface VipPlan {
  id: string;
  /** 套餐名（中文兜底，展示层优先用 nameKey 经 t() 渲染） */
  name: string;
  /** R4-batch2: 套餐名的 i18n key（config.vipPlans.{id}.name，zh/en 同步） */
  nameKey?: string;
  price: number;
  originalPrice: number;
  duration: string;
  features: string[];
  isPopular?: boolean;
}

/** 账单视图 */
export interface BillView {
  id: number;
  userId: number;
  planId?: string | null;
  planName?: string | null;
  amount: number;
  originalAmount?: number | null;
  type: "SUBSCRIBE" | "RENEW" | "REFUND";
  status: "SUCCESS" | "FAILED" | "REFUNDED";
  paymentMethod?: string | null;
  transactionId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  remark?: string | null;
  createdAt?: string | null;
}

/** 账单列表响应 */
export interface BillListResponse {
  items: BillView[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

/** 账单查询参数 */
export interface FetchBillsParams {
  page?: number;
  size?: number;
  forceRefresh?: boolean;
}

/** 会员状态三态（第六轮 W2-1） */
export type VipStatusState =
  /** 尚未从真相源取到会员身份——不得据此当作「非会员」扣钱 */
  | "unknown"
  /** 已确认在有效期内的会员 */
  | "vip"
  /** 已确认不是会员（无成功账单，或最近一笔成功账单已过期） */
  | "non_vip";

/**
 * 会员身份真相源口径（第六轮 W2-1）。
 *
 * <p>排查结论：后端 `UserSessionView`（apps/api .../auth/UserSessionView.java）的字段里
 * **没有** vipStatus —— `AuthController` 的接口描述写了「含 VIP 状态」，record 实际只有
 * userId/loggedIn/loginMethod/displayName/phoneBound/profileCompleted/campusVerified/
 * scheduleCompleted/campusName/featureFlags/token。于是 `stores/profile.ts` 从
 * `session.userSession.vipStatus` 解析出来的镜像在 real 模式恒为 `{isVip:false}`
 * ——「把 isVip 透传成 profileStore.vipStatus」这条看起来最省事的修法同样是死路，
 * 本轮不采纳。</p>
 *
 * <p>真正可用的真相源：`GET /vip/bills` 最近一笔 `status=SUCCESS` 账单的 `periodEnd`。
 * 这一口径与后端自己的会员判定完全一致（`AutoRenewService.isVipExpiringSoon` 即取
 * createdAt 倒序后第一笔带 periodEnd 的 SUCCESS 账单作到期时间），客户端不需要新端点。</p>
 */
function deriveVipStateFromBills(
  items: readonly BillView[],
  nowMs: number,
): { state: VipStatusState; expireDate: string | null } {
  for (const bill of items) {
    if (bill.status !== "SUCCESS") continue;
    const raw = bill.periodEnd;
    const endMs = typeof raw === "string" && raw.length > 0 ? Date.parse(raw) : NaN;
    if (Number.isNaN(endMs)) {
      // 成功账单没有可用的 periodEnd ⇒ 到期时间无从判定。宁可停在 unknown（调用方不扣钱），
      // 也不把它当成「已过期」放行扣费：同一份数据后端也会停在判定不了的那一侧。
      return { state: "unknown", expireDate: null };
    }
    return { state: endMs >= nowMs ? "vip" : "non_vip", expireDate: raw as string };
  }
  // 没有任何 SUCCESS 账单 = 从未成功开通过会员（与后端续费扫描同一结论）
  return { state: "non_vip", expireDate: null };
}

export const useVipStore = defineStore("vip", () => {
  /**
   * 会员身份（来自 `GET /vip/bills`，见 {@link deriveVipStateFromBills}）。
   *
   * <p>初值 `unknown`：本 store 不再持有「恒假的 false」——第六轮实测
   * `isVipRaw` 全仓唯一赋值就是 `= false`，所以正式包里 `isVip` 永远为假，
   * 会员免费放行分支不可达，真会员被按非会员扣币。现在它是三态，
   * 由 {@link refreshVipStatus} / {@link ensureVipStatusLoaded} 写入。</p>
   */
  const vipStatus = ref<VipStatusState>("unknown");
  /** 会员状态取数中（同一时刻只允许一次拉取） */
  const vipStatusLoading = ref(false);
  /** 最近一次会员状态取数失败的原因（成功或复位后清空） */
  const vipStatusError = ref<string | null>(null);
  /** 在途的会员状态拉取（并发调用共用同一个 Promise，避免重复出网） */
  let inflightVipStatus: Promise<VipStatusState> | null = null;
  /**
   * dev 模式会员身份模拟开关（2026-08-07 超级测试账号体系）。
   * dev 调试页可切换普通用户/会员身份，模拟不同权限的前端展示效果。
   *
   * 修复（R4-00173）：dev-vip-sim 存储键仅限开发环境生效（isDev 或 mock 模式），
   * 生产环境恒为 false——防止本地残留的模拟标记在生产环境旁路真实会员判定。
   */
  const isDevVipSimulated = computed<boolean>(() => {
    if (!isDev && !useMock()) return false;
    try {
      return uni.getStorageSync(STORAGE_KEYS.VIP_SIM_ENABLED) === "1";
    } catch (_e) {
      return false;
    }
  });
  /** 展示模式（全功能展示版）下 VIP 恒为 true，其余按真相源的三态判定 */
  const isVip = computed<boolean>(
    () => isShowcaseMode || vipStatus.value === "vip" || isDevVipSimulated.value,
  );
  const expireDate = ref<string | null>(null);

  // R4-batch2: 套餐名经 nameKey 走 i18n（config.vipPlans.*，zh/en 同步），name 保留为兜底
  const plans = ref<VipPlan[]>([
    {
      id: "monthly",
      name: "月度会员",
      nameKey: "config.vipPlans.monthly.name",
      price: 18,
      originalPrice: 28,
      duration: "1个月",
      features: ["专属标识", "解锁空档查看", "优先推荐"],
    },
    {
      id: "quarterly",
      name: "季度会员",
      nameKey: "config.vipPlans.quarterly.name",
      price: 48,
      originalPrice: 84,
      duration: "3个月",
      features: ["专属标识", "解锁空档查看", "优先推荐", "隐身浏览", "消息加速"],
      isPopular: true,
    },
    {
      id: "yearly",
      name: "年度会员",
      nameKey: "config.vipPlans.yearly.name",
      price: 128,
      originalPrice: 336,
      duration: "12个月",
      features: ["专属标识", "解锁空档查看", "优先推荐", "隐身浏览", "消息加速", "专属客服"],
    },
  ]);

  const selectedPlan = ref<string>("quarterly");

  const currentPlan = computed(() => {
    return plans.value.find((p) => p.id === selectedPlan.value);
  });

  function selectPlan(planId: string) {
    selectedPlan.value = planId;
  }

  /* ========== 账单记录相关 ========== */

  /** 账单列表（当前页） */
  const bills = ref<BillView[]>([]);

  /** 账单总数 */
  const billsTotal = ref<number>(0);

  /** 账单当前页码 */
  const billsPage = ref<number>(0);

  /** 账单每页大小 */
  const billsSize = ref<number>(20);

  /** 账单总页数 */
  const billsTotalPages = ref<number>(1);

  /** 账单加载标志 */
  const billsLoading = ref(false);

  /** 是否已加载账单 */
  const billsLoaded = ref(false);

  /**
   * 查询当前用户的账单列表（分页）。
   * <p>对应后端 GET /api/vip/bills?page=&size=</p>
   *
   * @param params 分页参数
   * @returns 账单列表响应
   */
  async function fetchBills(params: FetchBillsParams = {}): Promise<BillListResponse> {
    const requestedPage = params.page ?? 0;
    const requestedSize = params.size ?? 20;
    const forceRefresh = params.forceRefresh ?? false;

    // infra R2-00053: mock 分支提前到 loading 检查之前——mock 为同步逻辑无并发风险，
    // 且保证 forceRefresh 在 mock 下同样生效（重新生成相对日期账单）
    if (useMock()) {
      // infra R2-00054: mock 账单日期改为相对当前时间生成，避免硬编码日期随时间过期
      const DAY_MS = 24 * 60 * 60 * 1000;
      const toLocalIso = (offsetDays: number): string => {
        const d = new Date(Date.now() - offsetDays * DAY_MS);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      };
      const mockItems: BillView[] = [
        {
          id: 1001,
          userId: 1,
          planId: "quarterly",
          planName: "季度会员",
          amount: 4800,
          originalAmount: 8400,
          type: "SUBSCRIBE",
          status: "SUCCESS",
          paymentMethod: "WECHAT",
          transactionId: "wx_mock_1001",
          periodStart: toLocalIso(0),
          periodEnd: toLocalIso(-92),
          remark: "首次开通",
          createdAt: toLocalIso(0),
        },
        {
          id: 1002,
          userId: 1,
          planId: "monthly",
          planName: "月度会员",
          amount: 1800,
          originalAmount: 2800,
          type: "RENEW",
          status: "SUCCESS",
          paymentMethod: "WECHAT",
          transactionId: "wx_mock_1002",
          periodStart: toLocalIso(30),
          periodEnd: toLocalIso(-1),
          remark: "自动续费",
          createdAt: toLocalIso(30),
        },
        {
          id: 1003,
          userId: 1,
          planId: "monthly",
          planName: "月度会员",
          amount: 1800,
          originalAmount: 1800,
          type: "REFUND",
          status: "REFUNDED",
          paymentMethod: "WECHAT",
          transactionId: "wx_mock_1003",
          remark: "用户申请退款",
          createdAt: toLocalIso(60),
        },
      ];
      const start = requestedPage * requestedSize;
      const end = start + requestedSize;
      const items = mockItems.slice(start, end);
      const totalCount = mockItems.length;
      const tp = Math.max(1, Math.ceil(totalCount / requestedSize));
      const mock: BillListResponse = {
        items,
        total: totalCount,
        page: requestedPage,
        size: requestedSize,
        totalPages: tp,
      };
      bills.value = mock.items;
      billsTotal.value = mock.total;
      billsPage.value = mock.page;
      billsSize.value = mock.size;
      billsTotalPages.value = mock.totalPages;
      billsLoaded.value = true;
      return mock;
    }

    if (billsLoading.value) {
      return {
        items: bills.value,
        total: billsTotal.value,
        page: billsPage.value,
        size: billsSize.value,
        totalPages: billsTotalPages.value,
      };
    }

    // 已加载且未强制刷新且参数一致时返回缓存
    if (billsLoaded.value && !forceRefresh
      && requestedPage === billsPage.value
      && requestedSize === billsSize.value) {
      return {
        items: bills.value,
        total: billsTotal.value,
        page: billsPage.value,
        size: billsSize.value,
        totalPages: billsTotalPages.value,
      };
    }

    billsLoading.value = true;
    try {
      const result = await request<BillListResponse, unknown>({
        url: `/vip/bills?page=${requestedPage}&size=${requestedSize}`,
        method: "GET",
      });
      // 兼容后端旧版返回（仅 items + total）
      bills.value = result.items ?? [];
      billsTotal.value = result.total ?? 0;
      billsPage.value = result.page ?? requestedPage;
      billsSize.value = result.size ?? requestedSize;
      billsTotalPages.value = result.totalPages ?? 1;
      billsLoaded.value = true;
      return result;
    } finally {
      billsLoading.value = false;
    }
  }

  /**
   * 从账单真相源重取会员身份（第六轮 W2-1）。
   *
   * <p>拉取时机：调用方在**需要按会员身份决策的动作层**（解锁扣费前）调
   * {@link ensureVipStatusLoaded}，不在 App 启动期无条件出网——会员功能开关
   * （`featureFlags.membershipEnabled`）关闭时没有任何消费方，白拉一次账单分页不值得。</p>
   *
   * <p>失败态：网络/后端错误时**保持原状态不动**（首次失败即留在 `unknown`），
   * 并把错误原因写进 {@link vipStatusError}。刻意不在失败时回落 `non_vip`：
   * 「拉不到就按非会员扣钱」正是本条缺陷的伤害形态——扣错的钱是不可逆的资产损失，
   * 而「稍后重试」对用户最多是一次点击。</p>
   *
   * @param options.forceRefresh 强制重取（购买/续费成功、下拉刷新后用）
   * @returns 拉取后的三态会员状态
   */
  async function refreshVipStatus(options: { forceRefresh?: boolean } = {}): Promise<VipStatusState> {
    if (inflightVipStatus) {
      return inflightVipStatus;
    }
    if (billsLoading.value) {
      // 账单分页正被别处（账单页）拉取中：此时 fetchBills 走的是「当前页快照」短路分支，
      // 快照可能是空数组——把「还没取到」读成「不是会员」正好会重现本条缺陷的伤害，
      // 所以这里既不覆盖已有结论也不发起新拉取，停在 unknown 让调用方放弃扣费。
      vipStatusError.value = t("storeErrors.vip.statusPending");
      return vipStatus.value;
    }
    vipStatusLoading.value = true;
    const task = (async (): Promise<VipStatusState> => {
      try {
        const response = await fetchBills({ page: 0, size: 20, forceRefresh: options.forceRefresh ?? false });
        const derived = deriveVipStateFromBills(response.items ?? [], Date.now());
        vipStatus.value = derived.state;
        expireDate.value = derived.expireDate;
        vipStatusError.value = null;
        return derived.state;
      } catch (error) {
        vipStatusError.value = error instanceof Error ? error.message : String(error);
        // 失败不降级成 non_vip（口径见方法注释）
        return vipStatus.value;
      } finally {
        vipStatusLoading.value = false;
        inflightVipStatus = null;
      }
    })();
    inflightVipStatus = task;
    return task;
  }

  /**
   * 动作层用：会员状态未知时先取一次再决策。
   *
   * <p>已判定（`vip` / `non_vip`）时直接复用内存态，不再出网；返回 `unknown`
   * 只可能是「取数失败或数据不完整」，调用方必须据此**放弃扣费**并给出可重试的提示。</p>
   */
  async function ensureVipStatusLoaded(): Promise<VipStatusState> {
    if (vipStatus.value !== "unknown") {
      return vipStatus.value;
    }
    return refreshVipStatus();
  }

  /**
   * 登出清理（第五轮 FINDING 15）：会员身份、到期日、账单列表与分页游标都是账号态。
   *
   * 不清的后果与 `coins` 同一类：账号 B 登录后先看到账号 A 的「已是会员」与到期日，
   * 页面按 A 的身份渲染门控，直到异步重取才纠正。`selectedPlan` 回落成默认档位
   * 而不是留着 A 选中的那一个；`plans` 是目录（与账号无关）不动。
   */
  function resetForLogout(): void {
    // 复位成 unknown（不是 non_vip）：B 账号登录后必须先重新取一次真相源，
    // 沿用 A 的结论或把「还没取到」当成非会员都会重现同一处扣费缺陷。
    vipStatus.value = "unknown";
    vipStatusLoading.value = false;
    vipStatusError.value = null;
    inflightVipStatus = null;
    expireDate.value = null;
    selectedPlan.value = "quarterly";
    bills.value = [];
    billsTotal.value = 0;
    billsPage.value = 0;
    billsSize.value = 20;
    billsTotalPages.value = 1;
    billsLoading.value = false;
    billsLoaded.value = false;
  }

  return {
    isVip,
    vipStatus,
    vipStatusLoading,
    vipStatusError,
    refreshVipStatus,
    ensureVipStatusLoaded,
    expireDate,
    plans,
    selectedPlan,
    currentPlan,
    selectPlan,
    /* 账单记录（R4-00193：自动续费已收敛到 vip-auto-renew.ts，不再在此重复导出） */
    bills,
    billsTotal,
    billsPage,
    billsSize,
    billsTotalPages,
    billsLoading,
    billsLoaded,
    fetchBills,
    resetForLogout,
  };
});
