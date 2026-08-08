/**
 * Admin v2 商业模式域 API 封装（eladmin 风格「商业运营」域）。
 *
 * 覆盖接口前缀（对应后端 com.campuslove.api.admin 下各 Controller）：
 * - VIP 账单：/api/v1/admin/business/vip/bills、/bills/{id}
 * - 兑换码：/api/v1/admin/business/promo-codes（列表 / batch / {id}/disable / export）
 * - 钱包：/api/v1/admin/business/wallets（列表 / transactions / {userId}/adjust）
 * - 签到积分流水：/api/v1/admin/business/coins
 * - 积分商城：/api/v1/admin/business/shop（CRUD + 上下架）
 *
 * 响应约定：管理端点返回 ApiResponse 包装 {code,message,data} 或直出视图对象，
 * 本模块对写操作（create/update/delete/adjust）与批量生成统一通过 unwrapApiData 解包；
 * 分页列表（AdminPageView）为直出形态，get 原样返回。
 *
 * 金额单位：钱包/VIP 账单等金额一律以「分」为整数（balanceCents/amount），
 * 视图层负责分转元展示。
 */

import {
  AdminPageView,
  get,
  post,
  put,
  del,
  unwrapApiData,
  downloadFile,
} from "./http";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";
import { buildExportCsvName, formatDatePart } from "../utils/export-name";

/* ============================================================
 * VIP 账单（AdminVipController）
 * ============================================================ */

/** VIP 账单视图（对应后端 AdminVipBillView） */
export interface VipBillView {
  id: number;
  /** 用户 ID */
  userId: number;
  /** 套餐 ID（monthly/quarterly/yearly） */
  planId: string;
  /** 套餐名称（冗余字段） */
  planName: string;
  /** 支付金额（分） */
  amount: number;
  /** 原价（分） */
  originalAmount: number;
  /** 账单类型：SUBSCRIBE 订阅 / RENEW 续费 / REFUND 退款 */
  type: string;
  /** 状态：SUCCESS 成功 / FAILED 失败 / REFUNDED 已退款 */
  status: string;
  /** 支付方式：WECHAT / ALIPAY */
  paymentMethod: string;
  /** 第三方交易号 */
  transactionId: string;
  /** VIP 有效期开始时间 */
  periodStart: string | null;
  /** VIP 有效期结束时间 */
  periodEnd: string | null;
  /**
   * 支付时间（可选）：后端账单视图暂未提供独立支付时间字段（R4-00449），
   * 待后端 AdminVipBillView 补充 paidAt 后自动展示，缺失时前端回退占位符。
   */
  paidAt?: string | null;
  createdAt: string;
}

/** VIP 账单列表查询参数 */
export interface VipBillListQuery {
  /** 用户 ID */
  userId?: number;
  /** 套餐 ID（monthly/quarterly/yearly） */
  planType?: string;
  /** 账单状态（SUCCESS/FAILED/REFUNDED） */
  status?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 分页查询 VIP 账单列表。
 * GET /api/v1/admin/business/vip/bills
 */
export function listVipBills(query: VipBillListQuery = {}): Promise<AdminPageView<VipBillView>> {
  return get<AdminPageView<VipBillView>>("/v1/admin/business/vip/bills", {
    userId: query.userId || undefined,
    planType: query.planType || undefined,
    status: query.status || undefined,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/**
 * 查询 VIP 账单详情。
 * GET /api/v1/admin/business/vip/bills/{id}
 */
export function getVipBill(id: number): Promise<VipBillView> {
  return get<VipBillView>(`/v1/admin/business/vip/bills/${id}`);
}

/* ============================================================
 * 兑换码（AdminPromoCodeController）
 * ============================================================ */

/** 兑换码视图（对应后端 AdminPromoCodeView） */
export interface PromoCodeView {
  id: number;
  /** 兑换码字符串（LVIP + 8 位随机） */
  code: string;
  /** 折扣类型：AMOUNT 满减金额（分）/ PERCENT 百分比（1-100） */
  discountType: string;
  /** 折扣值 */
  discountValue: number;
  /** 最大使用次数（0 表示不限） */
  maxUses: number;
  /** 单用户最大使用次数 */
  maxUsesPerUser: number;
  /** 已使用次数 */
  usedCount: number;
  /** 剩余可用次数 */
  remainingUses: number;
  /** 有效期开始时间 */
  validFrom: string;
  /** 有效期结束时间 */
  validTo: string;
  /** 状态：ACTIVE 可用 / DISABLED 已作废 */
  status: string;
  /** 备注 */
  remark: string | null;
  /** 创建者用户 ID */
  createdBy: number;
  createdAt: string;
}

/** 兑换码列表查询参数 */
export interface PromoCodeListQuery {
  /** 状态（ACTIVE/DISABLED） */
  status?: string;
  /** 兑换码模糊匹配 */
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/** 批量生成兑换码请求体（对应后端 AdminBatchPromoCodeRequest） */
export interface PromoCodeBatchCreateRequest {
  /** 生成数量（1-500） */
  count: number;
  /** 折扣类型：AMOUNT / PERCENT */
  discountType: "AMOUNT" | "PERCENT";
  /** 折扣值（AMOUNT 为分，PERCENT 为 1-100） */
  discountValue: number;
  /** 最大使用次数（0 表示不限） */
  maxUses: number;
  /** 有效期开始时间 */
  validFrom: string;
  /** 有效期结束时间 */
  validTo: string;
  /** 备注（可空） */
  remark?: string;
}

/** 批量生成结果（对应后端 batchCreate 返回 Map） */
export interface PromoCodeBatchResult {
  success: boolean;
  /** 生成数量 */
  count: number;
  /** 示例码 */
  sampleCode: string;
}

/** 作废兑换码结果（对应后端 disable 返回 Map） */
export interface PromoCodeDisableResult {
  id: number;
  code: string;
  status: string;
  success: boolean;
}

/**
 * 分页查询兑换码列表。
 * GET /api/v1/admin/business/promo-codes
 */
export function listPromoCodes(query: PromoCodeListQuery = {}): Promise<AdminPageView<PromoCodeView>> {
  return get<AdminPageView<PromoCodeView>>("/v1/admin/business/promo-codes", {
    status: query.status || undefined,
    keyword: query.keyword || undefined,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/**
 * 批量生成兑换码。
 * POST /api/v1/admin/business/promo-codes/batch
 */
export async function batchCreatePromoCodes(req: PromoCodeBatchCreateRequest): Promise<PromoCodeBatchResult> {
  const body = await post<unknown>("/v1/admin/business/promo-codes/batch", req);
  return unwrapApiData<PromoCodeBatchResult>(body) as PromoCodeBatchResult;
}

/**
 * 作废兑换码（置为 DISABLED，幂等操作）。
 * POST /api/v1/admin/business/promo-codes/{id}/disable
 */
export async function disablePromoCode(id: number): Promise<PromoCodeDisableResult> {
  const body = await post<unknown>(`/v1/admin/business/promo-codes/${id}/disable`);
  return unwrapApiData<PromoCodeDisableResult>(body) as PromoCodeDisableResult;
}

/**
 * 导出兑换码 CSV（全量，UTF-8 + BOM，Excel 可直接打开）。
 *
 * GET /api/v1/admin/business/promo-codes/export
 *
 * 说明：该端点返回 text/csv 文件流而非 JSON，无法复用 http.ts 的 get()（其内部
 * JSON.parse 会失败），故复用 http.ts 的 downloadFile（统一鉴权/超时/401 跳转/
 * 错误映射，文案 i18n 化，R4-00453），失败时抛出 ApiError，由调用方提示。
 */
export async function exportPromoCodes(): Promise<void> {
  // 文件名带日期切片，避免覆盖历史导出文件（命名统一走 export-name 工具，R4-00454）
  await downloadFile(
    "/v1/admin/business/promo-codes/export",
    buildExportCsvName("promo-codes", formatDatePart()),
  );
}

/* ============================================================
 * 钱包（AdminWalletController）
 * ============================================================ */

/** 钱包视图（对应后端 AdminWalletView，金额单位分） */
export interface WalletView {
  /** 钱包 ID */
  id: number;
  /** 用户 ID */
  userId: number;
  /** 可用余额（分） */
  balanceCents: number;
  /** 冻结金额（分） */
  frozenCents: number;
  createdAt: string;
  updatedAt: string;
}

/** 钱包列表查询参数 */
export interface WalletListQuery {
  /** 用户 ID */
  userId?: number;
  /** 余额下限（分） */
  balanceFrom?: number;
  /** 余额上限（分） */
  balanceTo?: number;
  page?: number;
  pageSize?: number;
}

/** 钱包流水视图（对应后端 AdminWalletTransactionView） */
export interface WalletTransactionView {
  /** 流水 ID */
  id: number;
  /** 用户 ID */
  userId: number;
  /** 交易类型：DEBIT 扣减 / CREDIT 充值 */
  type: string;
  /** 交易金额（分） */
  amount: number;
  /** 交易后余额（分） */
  balanceAfter: number;
  /** 关联业务类型 */
  relatedType: string;
  /** 关联业务实体 ID */
  relatedId: string;
  /** 业务订单号（幂等键） */
  orderId: string;
  /** 备注 */
  remark: string | null;
  createdAt: string;
}

/** 钱包流水查询参数 */
export interface WalletTransactionListQuery {
  /** 用户 ID */
  userId?: number;
  /** 交易类型（DEBIT/CREDIT） */
  type?: string;
  page?: number;
  pageSize?: number;
}

/** 调整钱包余额请求体（对应后端 AdminWalletAdjustRequest） */
export interface WalletAdjustRequest {
  /** 调整金额（分）：正数充值、负数扣减，不可为 0 */
  amount: number;
  /** 调整原因（可空） */
  reason?: string;
}

/** 调整余额结果（对应后端 adjust 返回 Map） */
export interface WalletAdjustResult {
  userId: number;
  amount: number;
  /** 交易类型：CREDIT 充值 / DEBIT 扣减 */
  type: string;
  /** 调额后余额（分） */
  balanceAfter: number;
  success: boolean;
}

/**
 * 分页查询钱包列表。
 * GET /api/v1/admin/business/wallets
 */
export function listWallets(query: WalletListQuery = {}): Promise<AdminPageView<WalletView>> {
  return get<AdminPageView<WalletView>>("/v1/admin/business/wallets", {
    userId: query.userId || undefined,
    balanceFrom: query.balanceFrom ?? undefined,
    balanceTo: query.balanceTo ?? undefined,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/**
 * 分页查询钱包流水。
 * GET /api/v1/admin/business/wallets/transactions
 */
export function listWalletTransactions(
  query: WalletTransactionListQuery = {}
): Promise<AdminPageView<WalletTransactionView>> {
  return get<AdminPageView<WalletTransactionView>>("/v1/admin/business/wallets/transactions", {
    userId: query.userId || undefined,
    type: query.type || undefined,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/**
 * 管理员调整用户钱包余额（正数充值、负数扣减）。
 * POST /api/v1/admin/business/wallets/{userId}/adjust
 */
export async function adjustWalletBalance(
  userId: number,
  req: WalletAdjustRequest
): Promise<WalletAdjustResult> {
  const body = await post<unknown>(`/v1/admin/business/wallets/${userId}/adjust`, req);
  return unwrapApiData<WalletAdjustResult>(body) as WalletAdjustResult;
}

/* ============================================================
 * 签到积分流水（AdminCoinController）
 * ============================================================ */

/** 签到积分流水视图（对应后端 AdminCoinFlowView，数据源为 CheckIn） */
export interface CoinTransactionView {
  /** 流水 ID */
  id: number;
  /** 用户 ID */
  userId: number;
  /** 签到日期 */
  checkInDate: string;
  /** 签到来源：NORMAL 正常签到 / MAKE_UP 补签 */
  source: string;
  /** 连续签到天数 */
  consecutiveDays: number;
  createdAt: string;
}

/** 签到积分流水查询参数 */
export interface CoinTransactionListQuery {
  /** 用户 ID */
  userId?: number;
  /** 流水类型（NORMAL/MAKE_UP） */
  type?: string;
  /** 签到起始日期（yyyy-MM-dd） */
  dateFrom?: string;
  /** 签到结束日期（yyyy-MM-dd） */
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 分页查询签到积分流水。
 * GET /api/v1/admin/business/coins
 */
export function listCoinTransactions(
  query: CoinTransactionListQuery = {}
): Promise<AdminPageView<CoinTransactionView>> {
  return get<AdminPageView<CoinTransactionView>>("/v1/admin/business/coins", {
    userId: query.userId || undefined,
    type: query.type || undefined,
    dateFrom: query.dateFrom || undefined,
    dateTo: query.dateTo || undefined,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/* ============================================================
 * 积分商城（AdminShopController）
 * ============================================================ */

/** 商城商品视图（对应后端 AdminShopItemView） */
export interface ShopItemView {
  id: number;
  /** 商品标题 */
  title: string;
  /** 分类：ticket 门票 / food 美食 / goods 商品 / creative 文创 */
  category: string;
  /** 积分价格（分） */
  priceCents: number;
  /** 划线价（分，可空） */
  originalPrice: number | null;
  /** 商品图片 URL */
  imageUrl: string;
  /** 商品描述 */
  description: string;
  /** 库存（-1=不限） */
  stock: number;
  /** 已售数量 */
  salesCount: number;
  /** 是否上架 */
  published: boolean;
  /** 排序权重（越小越靠前） */
  sortOrder: number;
  /** 所属校区（null=全局商品） */
  campusName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** 商城商品列表查询参数 */
export interface ShopItemListQuery {
  /** 标题模糊关键字 */
  keyword?: string;
  /** 分类：ticket/food/goods/creative */
  category?: string;
  /** 上下架筛选 */
  published?: boolean;
  /** 校区筛选（校区管理员登录时后端强制按其管辖校区，忽略本参数） */
  campusName?: string;
  page?: number;
  pageSize?: number;
}

/** 新增/编辑商城商品请求体（对应后端 AdminShopItemRequest） */
export interface ShopItemRequest {
  /** 商品标题（必填，1-128 字） */
  title: string;
  /** 分类：ticket/food/goods/creative */
  category?: string;
  /** 积分价格（分） */
  priceCents?: number;
  /** 划线价（分，可空） */
  originalPrice?: number;
  /** 商品图片 URL */
  imageUrl?: string;
  /** 商品描述 */
  description?: string;
  /** 库存（-1=不限） */
  stock?: number;
  /** 是否上架 */
  published?: boolean;
  /** 排序权重 */
  sortOrder?: number;
  /** 所属校区（可空，全局商品；校区管理员创建时后端强制归属其管辖校区） */
  campusName?: string;
}

/**
 * 分页查询商城商品列表。
 * GET /api/v1/admin/business/shop
 */
export function listShopItems(query: ShopItemListQuery = {}): Promise<AdminPageView<ShopItemView>> {
  return get<AdminPageView<ShopItemView>>("/v1/admin/business/shop", {
    keyword: query.keyword || undefined,
    category: query.category || undefined,
    published: query.published ?? undefined,
    campusName: query.campusName || undefined,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/**
 * 新增商城商品。
 * POST /api/v1/admin/business/shop
 */
export async function createShopItem(req: ShopItemRequest): Promise<ShopItemView> {
  const body = await post<unknown>("/v1/admin/business/shop", req);
  return unwrapApiData<ShopItemView>(body) as ShopItemView;
}

/**
 * 编辑商城商品（越权校验：校区管理员不可编辑其他校区商品）。
 * PUT /api/v1/admin/business/shop/{id}
 */
export async function updateShopItem(id: number, req: ShopItemRequest): Promise<ShopItemView> {
  const body = await put<unknown>(`/v1/admin/business/shop/${id}`, req);
  return unwrapApiData<ShopItemView>(body) as ShopItemView;
}

/**
 * 删除商城商品。
 * DELETE /api/v1/admin/business/shop/{id}
 */
export async function deleteShopItem(id: number): Promise<void> {
  await del<unknown>(`/v1/admin/business/shop/${id}`);
}

/**
 * 上架商品。
 * POST /api/v1/admin/business/shop/{id}/publish
 */
export async function publishShopItem(id: number): Promise<ShopItemView> {
  const body = await post<unknown>(`/v1/admin/business/shop/${id}/publish`);
  return unwrapApiData<ShopItemView>(body) as ShopItemView;
}

/**
 * 下架商品（下架后客户端商城不再展示，已兑换记录保留）。
 * POST /api/v1/admin/business/shop/{id}/unpublish
 */
export async function unpublishShopItem(id: number): Promise<ShopItemView> {
  const body = await post<unknown>(`/v1/admin/business/shop/${id}/unpublish`);
  return unwrapApiData<ShopItemView>(body) as ShopItemView;
}
