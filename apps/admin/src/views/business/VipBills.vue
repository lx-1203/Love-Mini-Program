<script setup lang="ts">
/**
 * Admin v2 VIP 账单管理视图（商业模式「商业运营」域）。
 *
 * 功能：
 * - 分页列表：账单 ID / 用户 ID / 套餐 / 金额（分转元）/ 状态 / 支付时间 / 创建时间
 * - 筛选：用户 ID + 套餐类型（monthly/quarterly/yearly）下拉 + 账单状态下拉
 * - 「查看」弹窗：调用 getVipBill 拉取账单全量详情
 *
 * 对应后端 com.campuslove.api.admin.AdminVipController：
 *   - GET /api/v1/admin/business/vip/bills
 *   - GET /api/v1/admin/business/vip/bills/{id}
 * 金额单位：分（amount），展示时转元并保留两位小数。
 * 时间字段说明：后端账单视图仅有 createdAt（账单/支付创建时间），无独立支付时间字段，
 * 故「支付时间」与「创建时间」两列均展示 createdAt。
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  listVipBills,
  getVipBill,
  type VipBillView,
} from "../../api/business";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

/** 账单列表数据 */
const bills = ref<VipBillView[]>([]);
/** 加载中标志 */
const loading = ref(false);
/** 错误信息（ErrorState 展示，含重试） */
const errorMsg = ref("");

/** 用户 ID 筛选（空串=全部） */
const userIdQuery = ref("");
/** 套餐类型筛选（空串=全部） */
const planTypeFilter = ref("");
/** 账单状态筛选（空串=全部） */
const statusFilter = ref("");

/** 当前页码（1-based） */
const page = ref(1);
/** 每页大小 */
const pageSize = ref(DEFAULT_PAGE_SIZE);
/** 总记录数 */
const total = ref(0);
/** 总页数 */
const totalPages = ref(1);

/** 详情弹窗状态 */
const detailVisible = ref(false);
const detailBill = ref<VipBillView | null>(null);
const detailLoading = ref(false);

// 请求竞态防护（快速翻页/切换筛选时旧响应不覆盖新数据）
let reqSeq = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** 套餐类型选项（后端 planId 取值） */
const PLAN_TYPE_OPTIONS = [
  { value: "monthly", label: "月度套餐" },
  { value: "quarterly", label: "季度套餐" },
  { value: "yearly", label: "年度套餐" },
];

/** 账单状态选项 */
const BILL_STATUS_OPTIONS = [
  { value: "SUCCESS", label: "支付成功" },
  { value: "FAILED", label: "支付失败" },
  { value: "REFUNDED", label: "已退款" },
];

/** 账单类型文案 */
function typeLabel(type: string): string {
  switch (type) {
    case "SUBSCRIBE":
      return "订阅";
    case "RENEW":
      return "续费";
    case "REFUND":
      return "退款";
    default:
      return type;
  }
}

/** 状态徽章 class 后缀 */
function statusBadgeClass(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "status-success";
    case "FAILED":
      return "status-failed";
    case "REFUNDED":
      return "status-refunded";
    default:
      return "status-unknown";
  }
}

/** 状态文案 */
function statusLabel(status: string): string {
  const found = BILL_STATUS_OPTIONS.find((o) => o.value === status);
  return found ? found.label : status;
}

/** 分转元展示（保留两位小数），空值返回占位符 */
function formatYuan(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "-";
  return (cents / 100).toFixed(2);
}

/**
 * 拉取账单列表（按当前筛选条件与分页参数）。
 */
async function fetchBills() {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listVipBills({
      userId: userIdQuery.value.trim() ? Number(userIdQuery.value.trim()) : undefined,
      planType: planTypeFilter.value || undefined,
      status: statusFilter.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (seq !== reqSeq) return; // 丢弃过期响应
    bills.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : "加载 VIP 账单列表失败";
    bills.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** 查询：重置页码到第一页后拉取（防抖合并高频筛选变更） */
function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    page.value = 1;
    fetchBills();
  }, 400);
}

/** 立即查询（回车/按钮触发） */
function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  page.value = 1;
  fetchBills();
}

/** 重置筛选条件并刷新 */
function handleReset() {
  userIdQuery.value = "";
  planTypeFilter.value = "";
  statusFilter.value = "";
  handleSearch();
}

/** 翻页回调（v-model:page 已同步，仅触发加载） */
function handlePageChange() {
  fetchBills();
}

/** 打开详情弹窗（调用详情接口） */
async function handleViewDetail(bill: VipBillView) {
  detailBill.value = null;
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    detailBill.value = await getVipBill(bill.id);
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : "加载账单详情失败";
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

/** 关闭详情弹窗 */
function closeDetail() {
  detailVisible.value = false;
  detailBill.value = null;
}

onMounted(() => {
  fetchBills();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});
</script>

<template>
  <view class="vip-bills-page">
    <view class="page-header">
      <text class="page-title">VIP 账单</text>
      <text class="page-subtitle">查询与查看用户 VIP 订单与支付记录</text>
    </view>

    <!-- 筛选工具栏 -->
    <view class="toolbar">
      <input
        v-model="userIdQuery"
        class="search-input"
        type="number"
        min="1"
        placeholder="用户 ID"
        @keyup.enter="handleSearch"
      />
      <select v-model="planTypeFilter" class="filter-select" @change="scheduleSearch">
        <option value="">全部套餐</option>
        <option v-for="p in PLAN_TYPE_OPTIONS" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
      <select v-model="statusFilter" class="filter-select" @change="scheduleSearch">
        <option value="">全部状态</option>
        <option v-for="s in BILL_STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <button class="primary-button" @click="handleSearch">搜索</button>
      <button class="ghost-button" @click="handleReset">重置</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchBills" />

    <!-- 账单列表 -->
    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">账单 ID</th>
            <th scope="col">用户 ID</th>
            <th scope="col">套餐</th>
            <th scope="col">金额（元）</th>
            <th scope="col">状态</th>
            <th scope="col">支付时间</th>
            <th scope="col">创建时间</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="empty-cell">加载中...</td>
          </tr>
          <tr v-else-if="bills.length === 0">
            <td colspan="8" class="empty-cell">暂无 VIP 账单数据</td>
          </tr>
          <tr v-for="bill in bills" :key="bill.id">
            <td>{{ bill.id }}</td>
            <td>{{ bill.userId }}</td>
            <td>
              <text class="plan-name">{{ bill.planName || bill.planId }}</text>
              <text class="plan-id">{{ bill.planId }}</text>
            </td>
            <td class="amount-cell">{{ formatYuan(bill.amount) }}</td>
            <td>
              <span class="status-badge" :class="statusBadgeClass(bill.status)">
                {{ statusLabel(bill.status) }}
              </span>
            </td>
            <td class="time-cell">{{ formatDateTime(bill.createdAt) }}</td>
            <td class="time-cell">{{ formatDateTime(bill.createdAt) }}</td>
            <td class="action-cell">
              <button class="action-button view" @click="handleViewDetail(bill)">查看</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <Pagination
      v-model:page="page"
      :total-pages="totalPages"
      :total="total"
      :disabled="loading"
      @change="handlePageChange"
    />

    <!-- 账单详情弹窗 -->
    <view v-if="detailVisible" class="modal-mask" @click.self="closeDetail">
      <view class="modal detail-modal">
        <text class="modal-title">账单详情</text>
        <view v-if="detailLoading" class="detail-loading">加载中...</view>
        <view v-else-if="detailBill" class="detail-body">
          <view class="detail-row">
            <text class="detail-label">账单 ID:</text>
            <text>{{ detailBill.id }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">用户 ID:</text>
            <text>{{ detailBill.userId }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">套餐:</text>
            <text>{{ detailBill.planName || detailBill.planId }}（{{ detailBill.planId }}）</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">金额（元）:</text>
            <text>{{ formatYuan(detailBill.amount) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">原价（元）:</text>
            <text>{{ formatYuan(detailBill.originalAmount) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">账单类型:</text>
            <text>{{ typeLabel(detailBill.type) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">状态:</text>
            <text>{{ statusLabel(detailBill.status) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">支付方式:</text>
            <text>{{ detailBill.paymentMethod || "-" }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">交易号:</text>
            <text>{{ detailBill.transactionId || "-" }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">有效期起:</text>
            <text>{{ formatDateTime(detailBill.periodStart) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">有效期止:</text>
            <text>{{ formatDateTime(detailBill.periodEnd) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">创建时间:</text>
            <text>{{ formatDateTime(detailBill.createdAt) }}</text>
          </view>
        </view>
        <view class="modal-actions">
          <button class="ghost-button" @click="closeDetail">关闭</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.vip-bills-page {
  max-width: 1400px;
}

.plan-name {
  display: block;
  font-weight: 500;
  color: var(--admin-color-text-primary);
}

.plan-id {
  display: block;
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}

.amount-cell {
  font-weight: 600;
  color: var(--admin-color-text-primary);
  white-space: nowrap;
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.status-success {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-failed {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.status-refunded {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.status-unknown {
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-tertiary);
}

.action-button.view {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.action-button.view:hover {
  background: var(--admin-color-info-softer);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: var(--admin-color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xl);
  padding: var(--admin-space-xxl);
  max-width: 90%;
}

.detail-modal {
  width: 460px;
}

.modal-title {
  display: block;
  font-size: var(--admin-font-xxl);
  font-weight: 600;
  margin-bottom: var(--admin-space-lg);
  color: var(--admin-color-text-primary);
}

.detail-loading {
  padding: var(--admin-space-xxl);
  text-align: center;
  color: var(--admin-color-text-quaternary);
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-md);
  margin-bottom: var(--admin-space-lg);
  max-height: 60vh;
  overflow-y: auto;
}

.detail-row {
  display: flex;
  gap: var(--admin-space-sm);
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-primary);
  word-break: break-all;
}

.detail-label {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--admin-color-text-tertiary);
  min-width: 90px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--admin-space-sm);
}
</style>
