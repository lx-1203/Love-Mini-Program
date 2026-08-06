import { defineStore } from "pinia";
import { ref } from "vue";
import { request } from "../services/http";
import { useMock } from "./helpers/use-mock";

/**
 * VIP 账单 Store
 *
 * 提供 VIP 账单列表查询功能（支持分页）：
 * - listBills：查询当前用户的 VIP 账单历史（GET /api/vip/bills?page=&size=）
 *
 * 错误处理：API 调用失败时抛出 EnhancedApiError，由页面层捕获并提示。
 *
 * mp-weixin 兼容：使用 uni.request 封装，不依赖 import.meta。
 */

/** 账单类型：SUBSCRIBE 订阅 / RENEW 续费 / REFUND 退款 */
export type BillType = "SUBSCRIBE" | "RENEW" | "REFUND";

/** 账单状态：SUCCESS 成功 / FAILED 失败 / REFUNDED 已退款 */
export type BillStatus = "SUCCESS" | "FAILED" | "REFUNDED";

/** 账单视图（后端 BillView 对应） */
export interface BillView {
  id: number;
  userId: number;
  planId?: string | null;
  planName?: string | null;
  amount: number;
  originalAmount?: number | null;
  type: BillType;
  status: BillStatus;
  paymentMethod?: string | null;
  transactionId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  remark?: string | null;
  createdAt?: string | null;
}

/** 账单列表响应（含分页元信息） */
export interface BillListResponse {
  items: BillView[];
  /** 总记录数 */
  total: number;
  /** 当前页码（从 0 开始） */
  page: number;
  /** 每页大小 */
  size: number;
  /** 总页数 */
  totalPages: number;
}

/** 账单列表查询参数 */
export interface BillListParams {
  /** 页码（从 0 开始，默认 0） */
  page?: number;
  /** 每页大小（默认 20，最大 100） */
  size?: number;
  /** 是否强制刷新（忽略缓存） */
  forceRefresh?: boolean;
}

/**
 * infra R2-00062: 本 store 与 stores/vip.ts 的 fetchBills 存在重复的账单 mock/分页实现，
 * 字段易漂移；合并需同时调整两处调用方，留待后续重构（本轮仅统一 mock 日期为相对时间）
 */
/** mock 数据（按时间倒序） */
function buildMockBills(): BillView[] {
  // infra R2-00063: mock 账单日期相对当前时间生成，避免硬编码日期随时间过期
  const DAY_MS = 24 * 60 * 60 * 1000;
  const toLocalIso = (offsetDays: number): string => {
    const d = new Date(Date.now() - offsetDays * DAY_MS);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  return [
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
}

export const useVipBillingStore = defineStore("vip-billing", () => {
  /** 账单列表（当前页） */
  const bills = ref<BillView[]>([]);

  /** 总数 */
  const total = ref<number>(0);

  /** 当前页码 */
  const page = ref<number>(0);

  /** 每页大小 */
  const size = ref<number>(20);

  /** 总页数 */
  const totalPages = ref<number>(1);

  /** 加载中标志 */
  const loading = ref(false);

  /** 是否已加载（用于判断是否首次进入页面） */
  const loaded = ref(false);

  /**
   * 查询当前用户的账单列表（分页）
   * <p>对应后端 GET /api/vip/bills?page=&size=</p>
   *
   * 兼容两种调用：
   * - listBills(true) 或 listBills(false)：旧版布尔入参，表示是否强制刷新
   * - listBills({ page, size, forceRefresh })：新版对象入参，支持分页
   *
   * @param params 分页参数或布尔（兼容旧版）
   * @returns 账单列表响应
   */
  async function listBills(params: BillListParams | boolean = {}): Promise<BillListResponse> {
    // 兼容旧版布尔入参
    const normalizedParams: BillListParams =
      typeof params === "boolean" ? { forceRefresh: params } : params;

    const requestedPage = normalizedParams.page ?? 0;
    const requestedSize = normalizedParams.size ?? 20;
    const forceRefresh = normalizedParams.forceRefresh ?? false;

    // 已加载且未强制刷新时返回缓存
    if (loaded.value && !forceRefresh && requestedPage === page.value && requestedSize === size.value) {
      return {
        items: bills.value,
        total: total.value,
        page: page.value,
        size: size.value,
        totalPages: totalPages.value,
      };
    }
    if (loading.value) {
      return {
        items: bills.value,
        total: total.value,
        page: page.value,
        size: size.value,
        totalPages: totalPages.value,
      };
    }

    if (useMock()) {
      const allMock = buildMockBills();
      const start = requestedPage * requestedSize;
      const end = start + requestedSize;
      const items = allMock.slice(start, end);
      const totalCount = allMock.length;
      const tp = Math.max(1, Math.ceil(totalCount / requestedSize));

      const mock: BillListResponse = {
        items,
        total: totalCount,
        page: requestedPage,
        size: requestedSize,
        totalPages: tp,
      };
      bills.value = mock.items;
      total.value = mock.total;
      page.value = mock.page;
      size.value = mock.size;
      totalPages.value = mock.totalPages;
      loaded.value = true;
      return mock;
    }

    loading.value = true;
    try {
      const result = await request<BillListResponse, unknown>({
        url: `/vip/bills?page=${requestedPage}&size=${requestedSize}`,
        method: "GET",
      });
      // 兼容后端旧版返回（仅 items + total）
      bills.value = result.items ?? [];
      total.value = result.total ?? 0;
      page.value = result.page ?? requestedPage;
      size.value = result.size ?? requestedSize;
      totalPages.value = result.totalPages ?? 1;
      loaded.value = true;
      return result;
    } finally {
      loading.value = false;
    }
  }

  /** 重置状态 */
  function reset() {
    bills.value = [];
    total.value = 0;
    page.value = 0;
    size.value = 20;
    totalPages.value = 1;
    loading.value = false;
    loaded.value = false;
  }

  return {
    bills,
    total,
    page,
    size,
    totalPages,
    loading,
    loaded,
    listBills,
    reset,
  };
});
