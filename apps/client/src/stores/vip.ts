import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { request } from "../services/http";
import { useMock } from "./helpers/use-mock";
// 展示模式（全功能展示版）：VIP 全亮
import { isShowcaseMode } from "../config/showcase";
// 运行时环境判定：dev 模式会员模拟开关守卫（R4-00173）
import { isDev } from "../config/env";

/**
 * VIP 会员 Store
 *
 * 提供 VIP 会员基础信息与套餐选择：
 * - 套餐选择：selectPlan
 * - 账单记录：fetchBills（分页查询，见 vip-billing.ts）
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

export const useVipStore = defineStore("vip", () => {
  /** 内部 VIP 状态（保留赋值能力，供后续购买/续费逻辑更新） */
  const isVipRaw = ref(false);
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
      return uni.getStorageSync("campus-love:dev-vip-sim") === "1";
    } catch (_e) {
      return false;
    }
  });
  /** 展示模式（全功能展示版）下 VIP 恒为 true，其余透传内部状态 */
  const isVip = computed<boolean>(
    () => isShowcaseMode || isVipRaw.value || isDevVipSimulated.value,
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

  return {
    isVip,
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
  };
});
