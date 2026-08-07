<script setup lang="ts">
/**
 * Admin v2 优惠码管理视图（商业模式「商业运营」域）。
 *
 * 功能：
 * - 分页列表：码 / 折扣类型 / 折扣值 / 最大次数 / 已用次数 / 状态 / 有效期起止 / 创建时间
 * - 筛选：状态（ACTIVE/DISABLED）下拉 + 码模糊搜索 + 分页
 * - 「批量生成」弹窗：count(1-500) / discountType(AMOUNT/PERCENT) / discountValue /
 *   maxUses / validFrom / validTo / remark → batchCreatePromoCodes
 * - 「作废」（ConfirmDialog 二次确认）+「导出 CSV」（后端 /export 文件流下载）
 *
 * 对应后端 com.campuslove.api.admin.AdminPromoCodeController：
 *   - GET  /api/v1/admin/business/promo-codes
 *   - POST /api/v1/admin/business/promo-codes/batch
 *   - POST /api/v1/admin/business/promo-codes/{id}/disable
 *   - GET  /api/v1/admin/business/promo-codes/export
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import {
  listPromoCodes,
  batchCreatePromoCodes,
  disablePromoCode,
  exportPromoCodes,
  type PromoCodeView,
} from "../../api/business";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE, TOAST_DURATION_MS } from "../../utils/constants";

const { t } = useI18n();

/** 兑换码列表数据 */
const promoCodes = ref<PromoCodeView[]>([]);
/** 加载中标志 */
const loading = ref(false);
/** 列表错误信息 */
const errorMsg = ref("");
/** 操作成功/失败轻提示 */
const toastMessage = ref("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

/** 状态筛选（空串=全部） */
const statusFilter = ref("");
/** 码模糊搜索 */
const keywordQuery = ref("");

/** 当前页码（1-based） */
const page = ref(1);
/** 每页大小 */
const pageSize = ref(DEFAULT_PAGE_SIZE);
/** 总记录数 */
const total = ref(0);
/** 总页数 */
const totalPages = ref(1);

/** 批量生成弹窗状态 */
const createVisible = ref(false);
const createCount = ref(50);
const createDiscountType = ref<"AMOUNT" | "PERCENT">("AMOUNT");
const createDiscountValue = ref("");
const createMaxUses = ref(0);
const createValidFrom = ref("");
const createValidTo = ref("");
const createRemark = ref("");
const creating = ref(false);
const modalError = ref("");

/** 作废确认弹窗状态 */
const disableVisible = ref(false);
const disableTarget = ref<PromoCodeView | null>(null);
const disabling = ref(false);

/** 导出中标志（防重复点击） */
const exporting = ref(false);

// 请求竞态防护
let reqSeq = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** 状态选项 */
const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "可用" },
  { value: "DISABLED", label: "已作废" },
];

/** 折扣类型文案 */
function discountTypeLabel(type: string): string {
  return type === "PERCENT" ? "百分比折扣" : "满减金额";
}

/** 折扣值展示：PERCENT 显示百分比，AMOUNT 显示元 */
function discountValueLabel(code: PromoCodeView): string {
  if (code.discountType === "PERCENT") return `${code.discountValue}%`;
  return `¥${(code.discountValue / 100).toFixed(2)}`;
}

/** 最大使用次数展示：0=不限 */
function maxUsesLabel(code: PromoCodeView): string {
  return code.maxUses === 0 ? "不限" : String(code.maxUses);
}

/** 状态徽章 class 后缀 */
function statusBadgeClass(status: string): string {
  return status === "ACTIVE" ? "status-active" : "status-disabled";
}

/** 状态文案 */
function statusLabel(status: string): string {
  const found = STATUS_OPTIONS.find((o) => o.value === status);
  return found ? found.label : status;
}

/** 轻提示（3 秒自动消失） */
function showToast(msg: string) {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
    toastTimer = null;
  }, TOAST_DURATION_MS);
}

/**
 * 拉取兑换码列表。
 */
async function fetchPromoCodes() {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listPromoCodes({
      status: statusFilter.value || undefined,
      keyword: keywordQuery.value.trim() || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (seq !== reqSeq) return;
    promoCodes.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : "加载兑换码列表失败";
    promoCodes.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** 查询（防抖） */
function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    page.value = 1;
    fetchPromoCodes();
  }, 400);
}

/** 立即查询 */
function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  page.value = 1;
  fetchPromoCodes();
}

/** 重置筛选并刷新 */
function handleReset() {
  statusFilter.value = "";
  keywordQuery.value = "";
  handleSearch();
}

/** 翻页回调 */
function handlePageChange() {
  fetchPromoCodes();
}

/** 打开批量生成弹窗（重置表单） */
function openCreate() {
  createCount.value = 50;
  createDiscountType.value = "AMOUNT";
  createDiscountValue.value = "";
  createMaxUses.value = 0;
  createValidFrom.value = "";
  createValidTo.value = "";
  createRemark.value = "";
  modalError.value = "";
  createVisible.value = true;
}

/** 关闭批量生成弹窗（提交中禁止关闭） */
function closeCreate() {
  if (creating.value) return;
  createVisible.value = false;
}

/**
 * 提交批量生成。
 * 前端校验与后端 AdminBatchPromoCodeRequest 对齐：
 * - count 1-500；discountValue 正数；PERCENT 不超过 100；maxUses 非负；
 * - validFrom/validTo 必填且 validTo 晚于 validFrom
 */
async function handleCreate() {
  if (creating.value) return;
  const count = createCount.value;
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    modalError.value = "生成数量须为 1-500 之间";
    return;
  }
  const discountValue = Number(createDiscountValue.value);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    modalError.value = "折扣值必须为正数";
    return;
  }
  if (createDiscountType.value === "PERCENT" && discountValue > 100) {
    modalError.value = "百分比折扣值不能超过 100";
    return;
  }
  if (createMaxUses.value < 0) {
    modalError.value = "最大使用次数不能为负数";
    return;
  }
  if (!createValidFrom.value || !createValidTo.value) {
    modalError.value = "有效期起止时间不能为空";
    return;
  }
  if (new Date(createValidTo.value) <= new Date(createValidFrom.value)) {
    modalError.value = "有效期结束时间必须晚于开始时间";
    return;
  }
  creating.value = true;
  modalError.value = "";
  try {
    const result = await batchCreatePromoCodes({
      count,
      discountType: createDiscountType.value,
      discountValue,
      maxUses: createMaxUses.value,
      validFrom: createValidFrom.value,
      validTo: createValidTo.value,
      remark: createRemark.value.trim() || undefined,
    });
    createVisible.value = false;
    showToast(`已生成 ${result.count} 个兑换码（示例：${result.sampleCode}）`);
    await fetchPromoCodes();
  } catch (err) {
    modalError.value = err instanceof ApiError ? err.message : "批量生成失败";
  } finally {
    creating.value = false;
  }
}

/** 点击作废 → 打开确认弹窗 */
function askDisable(code: PromoCodeView) {
  disableTarget.value = code;
  disableVisible.value = true;
}

/** 执行作废 */
async function handleDisableConfirm() {
  const target = disableTarget.value;
  if (!target || disabling.value) return;
  disabling.value = true;
  try {
    await disablePromoCode(target.id);
    disableVisible.value = false;
    disableTarget.value = null;
    showToast(`兑换码 ${target.code} 已作废`);
    await fetchPromoCodes();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : "作废失败";
    disableVisible.value = false;
  } finally {
    disabling.value = false;
  }
}

/** 导出 CSV（后端文件流下载） */
async function handleExport() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    await exportPromoCodes();
    showToast(t("promoCodes.exportSuccess"));
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : "导出失败";
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  fetchPromoCodes();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
});
</script>

<template>
  <view class="promo-codes-page">
    <view class="page-header">
      <text class="page-title">优惠码管理</text>
      <text class="page-subtitle">批量生成、作废与导出 VIP 兑换码</text>
    </view>

    <view v-if="toastMessage" class="toast-message" role="status" aria-live="polite">
      <text>{{ toastMessage }}</text>
    </view>

    <!-- 筛选工具栏 -->
    <view class="toolbar">
      <input
        v-model="keywordQuery"
        class="search-input"
        type="text"
        placeholder="搜索兑换码"
        @keyup.enter="handleSearch"
        @input="scheduleSearch"
      />
      <select v-model="statusFilter" class="filter-select" @change="scheduleSearch">
        <option value="">全部状态</option>
        <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <button class="primary-button" @click="handleSearch">搜索</button>
      <button class="ghost-button" @click="handleReset">重置</button>
      <button class="primary-button" @click="openCreate">批量生成</button>
      <button class="ghost-button" :disabled="exporting || promoCodes.length === 0" @click="handleExport">
        {{ exporting ? "导出中..." : "导出 CSV" }}
      </button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchPromoCodes" />

    <!-- 兑换码列表 -->
    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">兑换码</th>
            <th scope="col">折扣类型</th>
            <th scope="col">折扣值</th>
            <th scope="col">最大次数</th>
            <th scope="col">已用次数</th>
            <th scope="col">状态</th>
            <th scope="col">有效期起</th>
            <th scope="col">有效期止</th>
            <th scope="col">创建时间</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" class="empty-cell">加载中...</td>
          </tr>
          <tr v-else-if="promoCodes.length === 0">
            <td colspan="10" class="empty-cell">暂无兑换码数据</td>
          </tr>
          <tr v-for="code in promoCodes" :key="code.id">
            <td class="code-cell">{{ code.code }}</td>
            <td>{{ discountTypeLabel(code.discountType) }}</td>
            <td class="value-cell">{{ discountValueLabel(code) }}</td>
            <td>{{ maxUsesLabel(code) }}</td>
            <td>{{ code.usedCount }}</td>
            <td>
              <span class="status-badge" :class="statusBadgeClass(code.status)">
                {{ statusLabel(code.status) }}
              </span>
            </td>
            <td class="time-cell">{{ formatDateTime(code.validFrom) }}</td>
            <td class="time-cell">{{ formatDateTime(code.validTo) }}</td>
            <td class="time-cell">{{ formatDateTime(code.createdAt) }}</td>
            <td class="action-cell">
              <button
                v-if="code.status === 'ACTIVE'"
                class="action-button danger"
                @click="askDisable(code)"
              >作废</button>
              <text v-else class="disabled-text">已作废</text>
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

    <!-- 批量生成弹窗 -->
    <view v-if="createVisible" class="modal-mask" @click.self="closeCreate">
      <view class="modal create-modal">
        <text class="modal-title">批量生成兑换码</text>

        <view class="form-row">
          <text class="form-label">生成数量（1-500）</text>
          <input v-model.number="createCount" class="form-input" type="number" min="1" max="500" />
        </view>

        <view class="form-row">
          <text class="form-label">折扣类型</text>
          <view class="radio-group">
            <label class="radio-item">
              <input v-model="createDiscountType" type="radio" value="AMOUNT" />
              <span>满减金额（元）</span>
            </label>
            <label class="radio-item">
              <input v-model="createDiscountType" type="radio" value="PERCENT" />
              <span>百分比折扣（1-100%）</span>
            </label>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">{{ createDiscountType === "AMOUNT" ? "折扣金额（元）" : "折扣百分比（%）" }}</text>
          <input v-model="createDiscountValue" class="form-input" type="number" min="0" step="0.01" />
        </view>

        <view class="form-row">
          <text class="form-label">最大使用次数（0 表示不限）</text>
          <input v-model.number="createMaxUses" class="form-input" type="number" min="0" />
        </view>

        <view class="form-row">
          <text class="form-label">有效期开始</text>
          <input v-model="createValidFrom" class="form-input" type="datetime-local" />
        </view>

        <view class="form-row">
          <text class="form-label">有效期结束</text>
          <input v-model="createValidTo" class="form-input" type="datetime-local" />
        </view>

        <view class="form-row">
          <text class="form-label">备注</text>
          <textarea v-model="createRemark" class="form-textarea" rows="2" placeholder="可选" />
        </view>

        <text v-if="modalError" class="modal-error">{{ modalError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="creating" @click="closeCreate">取消</button>
          <button class="primary-button" :disabled="creating" @click="handleCreate">
            {{ creating ? "生成中..." : "生成" }}
          </button>
        </view>
      </view>
    </view>

    <!-- 作废确认弹窗 -->
    <ConfirmDialog
      v-model:visible="disableVisible"
      :title="'作废兑换码'"
      :message="disableTarget ? `确定要作废兑换码 ${disableTarget.code} 吗？作废后该码不可再使用。` : ''"
      :danger="true"
      :confirming="disabling"
      @confirm="handleDisableConfirm"
      @cancel="disableTarget = null"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.promo-codes-page {
  max-width: 1400px;
}

.code-cell {
  font-family: monospace;
  font-weight: 600;
  color: var(--admin-color-text-primary);
  white-space: nowrap;
}

.value-cell {
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

.status-active {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-disabled {
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-tertiary);
}

.action-button.danger {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.action-button.danger:hover {
  background: var(--admin-color-danger-softer);
}

.disabled-text {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}

.toast-message {
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
  background: var(--admin-color-success-soft);
  border-left: 3px solid var(--admin-color-success);
  border-radius: var(--admin-radius-sm);
  color: var(--admin-color-success);
  font-size: var(--admin-font-md);
  margin-bottom: var(--admin-space-lg);
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

.create-modal {
  width: 440px;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-title {
  display: block;
  font-size: var(--admin-font-xxl);
  font-weight: 600;
  margin-bottom: var(--admin-space-lg);
  color: var(--admin-color-text-primary);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-xxs);
  margin-bottom: var(--admin-space-lg);
}

.form-label {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-tertiary);
}

.form-input {
  padding: var(--admin-space-md-sm) var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-lg);
}

.form-textarea {
  padding: var(--admin-space-md-sm) var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-lg);
  resize: vertical;
  font-family: inherit;
}

.radio-group {
  display: flex;
  gap: var(--admin-space-lg);
  flex-wrap: wrap;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: var(--admin-space-xxs);
  font-size: var(--admin-font-lg);
  cursor: pointer;
}

.modal-error {
  display: block;
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger);
  margin-bottom: var(--admin-space-md);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--admin-space-sm);
}
</style>
