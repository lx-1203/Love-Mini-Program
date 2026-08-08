<script setup lang="ts">
/**
 * 举报管理页（复制自旧后台 apps/admin，适配 admin-v2 目录结构）。
 * 提供举报列表的分页查询（按状态/目标类型筛选）与处理（HANDLE 已处理 / REJECT 驳回）。
 * 对应后端 com.campuslove.api.admin.AdminReportController。
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  listReports,
  handleReport,
  REPORT_TARGET_TYPES,
  REPORT_STATUSES,
  type AdminReportView,
  type AdminReportListQuery,
  type AdminReportHandleRequest,
} from "@/api/reports";
import { ApiError } from "@/api/http";
import Pagination from "@/components/Pagination.vue";
import ErrorState from "@/components/ErrorState.vue";
import { useRequestRace } from "../../composables/useRequestRace";
import { useI18n } from "vue-i18n";
import { formatDateTime } from "@/utils/format";
import { DEFAULT_PAGE_SIZE, REMARK_MAX_LENGTH } from "@/utils/constants";

const { t } = useI18n();

/** 举报列表数据 */
const reports = ref<AdminReportView[]>([]);
/** 加载中标志 */
const loading = ref(false);
/** 错误信息 */
const errorMsg = ref("");

/** 状态筛选（空字符串表示全部） */
const statusFilter = ref<"" | "PENDING" | "HANDLED" | "REJECTED">("");
/** 目标类型筛选（空字符串表示全部） */
const targetTypeFilter = ref<"" | "POST" | "COMMENT" | "USER" | "TOPIC">("");

/** 当前页码（1-based） */
const page = ref(1);
/** 每页大小 */
const pageSize = ref(DEFAULT_PAGE_SIZE);
/** 总记录数 */
const total = ref(0);
/** 总页数 */
const totalPages = ref(1);

/** 当前正在处理的举报（null 表示弹窗关闭） */
const handlingReport = ref<AdminReportView | null>(null);
/**
 * 处理结果：HANDLE 已处理 / REJECT 驳回。
 * 默认选中 REJECT（驳回），避免运营误操作把未核实的举报直接标记为已处理。
 */
const handleDecision = ref<"HANDLE" | "REJECT">("REJECT");
/** 处理备注 */
const handleRemark = ref("");
/** 提交中标志 */
const submitting = ref(false);

// 筛选防抖 + 请求竞态防护
const { nextSeq, isStale } = useRequestRace();
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 拉取举报列表。
 * 根据当前筛选条件与分页参数请求后端数据。
 */
async function fetchReports() {
  loading.value = true;
  errorMsg.value = "";
  const seq = nextSeq();
  try {
    const query: AdminReportListQuery = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (statusFilter.value) query.status = statusFilter.value;
    if (targetTypeFilter.value) query.targetType = targetTypeFilter.value;

    const result = await listReports(query);
    if (isStale(seq)) return; // 丢弃过期响应
    reports.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    if (isStale(seq)) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("reports.loadFailed");
    reports.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (!isStale(seq)) {
      loading.value = false;
    }
  }
}

/**
 * 触发查询：重置页码到第一页后拉取（带防抖）。
 */
function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    page.value = 1;
    fetchReports();
  }, 400);
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  page.value = 1;
  fetchReports();
}

/**
 * 重置筛选条件并刷新。
 */
function handleResetFilters() {
  statusFilter.value = "";
  targetTypeFilter.value = "";
  handleSearch();
}

function handlePageChange() {
  fetchReports();
}

/** 组件卸载时清理防抖定时器 */
onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});

/**
 * 打开处理弹窗。
 * @param report 当前举报记录
 */
function openHandleModal(report: AdminReportView) {
  handlingReport.value = report;
  // 每次打开弹窗都重置为保守默认（REJECT 驳回），防止沿用上次的 HANDLE 选择
  handleDecision.value = "REJECT";
  handleRemark.value = "";
}

/**
 * 关闭处理弹窗。
 */
function closeHandleModal() {
  handlingReport.value = null;
  handleRemark.value = "";
}

/**
 * 提交处理结果。
 * 调用后端 handleReport 接口，成功后关闭弹窗并刷新列表。
 */
async function submitHandle() {
  if (!handlingReport.value) return;
  submitting.value = true;
  try {
    const req: AdminReportHandleRequest = {
      result: handleDecision.value,
      remark: handleRemark.value || undefined,
    };
    await handleReport(handlingReport.value.id, req);
    handlingReport.value = null;
    handleRemark.value = "";
    await fetchReports();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("reports.handleFailed");
  } finally {
    submitting.value = false;
  }
}

/**
 * 格式化时间为本地可读格式。
 * @param iso ISO 时间字符串或 null
 */
function formatDate(iso: string | null): string {
  return formatDateTime(iso);
}

/**
 * 获取目标类型的中文标签（通过 i18n key 渲染）。
 */
function targetTypeLabel(type: string): string {
  const found = REPORT_TARGET_TYPES.find((item) => item.value === type);
  return found ? t(found.labelKey) : type;
}

/**
 * 获取状态的中文标签（通过 i18n key 渲染）。
 */
function statusLabel(status: string): string {
  const found = REPORT_STATUSES.find((item) => item.value === status);
  return found ? t(found.labelKey) : status;
}

/**
 * 举报人显示：昵称脱敏（保留首字符，其余打码），避免运营界面明文展示举报人信息。
 * 无昵称时用 i18n 插值兜底。
 */
function reporterDisplay(report: AdminReportView): string {
  if (report.reporterNickname) {
    const name = report.reporterNickname;
    // 1 字昵称全打码；2 字及以上保留首字符，其余打码
    if (name.length <= 1) return "*";
    return name[0] + "*".repeat(name.length - 1);
  }
  return t("reports.authorFallback", { id: report.reporterId });
}

/**
 * 处理人显示：handlerId 存在时显示 #id，否则占位符。
 */
function handlerDisplay(report: AdminReportView): string {
  return report.handlerId ? t("reports.handlerPrefix", { id: report.handlerId }) : "—";
}

onMounted(() => {
  fetchReports();
});
</script>

<template>
  <view class="reports-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">{{ t("reports.pageTitle") }}</text>
      <text class="page-subtitle">{{ t("reports.pageSubtitle") }}</text>
    </view>

    <!-- 筛选工具栏 -->
    <view class="toolbar">
      <select v-model="statusFilter" class="filter-select" @change="scheduleSearch">
        <option value="">{{ t("reports.filterStatusAllStatus") }}</option>
        <option value="PENDING">{{ t("reports.filterStatusPending") }}</option>
        <option value="HANDLED">{{ t("reports.filterStatusProcessed") }}</option>
        <option value="REJECTED">{{ t("reports.filterStatusRejected") }}</option>
      </select>
      <select v-model="targetTypeFilter" class="filter-select" @change="scheduleSearch">
        <option value="">{{ t("reports.filterTargetAll") }}</option>
        <option value="POST">{{ t("reports.filterTargetPost") }}</option>
        <option value="COMMENT">{{ t("reports.filterTargetComment") }}</option>
        <option value="USER">{{ t("reports.filterTargetUser") }}</option>
        <option value="TOPIC">{{ t("reports.filterTargetTopic") }}</option>
      </select>
      <button class="ghost-button" @click="handleResetFilters">{{ t("common.reset") }}</button>
    </view>

    <!-- 错误提示 -->
    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchReports" />

    <!-- 举报列表表格 -->
    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("reports.columnId") }}</th>
            <th scope="col">{{ t("reports.columnTargetType") }}</th>
            <th scope="col">{{ t("reports.columnTargetId") }}</th>
            <th scope="col">{{ t("reports.columnReporter") }}</th>
            <th scope="col">{{ t("reports.columnReason") }}</th>
            <th scope="col">{{ t("reports.columnDescription") }}</th>
            <th scope="col">{{ t("reports.columnStatus") }}</th>
            <th scope="col">{{ t("reports.columnHandler") }}</th>
            <th scope="col">{{ t("reports.columnHandledAt") }}</th>
            <th scope="col">{{ t("reports.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" class="empty-cell">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="reports.length === 0">
            <td colspan="10" class="empty-cell">{{ t("reports.noData") }}</td>
          </tr>
          <tr v-for="report in reports" :key="report.id">
            <td>{{ report.id }}</td>
            <td>
              <span class="target-badge">{{ targetTypeLabel(report.targetType) }}</span>
            </td>
            <td>{{ report.targetId }}</td>
            <td>
              <view class="reporter-cell">
                <text>{{ reporterDisplay(report) }}</text>
              </view>
            </td>
            <td>{{ report.reason }}</td>
            <td class="description-cell">{{ report.description || t("common.emptyPlaceholder") }}</td>
            <td>
              <span class="status-badge" :class="`status-${report.status}`">
                {{ statusLabel(report.status) }}
              </span>
            </td>
            <td>{{ handlerDisplay(report) }}</td>
            <td>{{ formatDate(report.handledAt) }}</td>
            <td class="action-cell">
              <button
                v-if="report.status === 'PENDING'"
                class="action-button handle"
                @click="openHandleModal(report)"
              >{{ t("reports.actionProcess") }}</button>
              <!-- 已处理/已驳回展示处理备注，便于误驳回追责复核 -->
              <text v-else class="handled-text" :title="report.handleRemark || undefined">
                {{ t("reports.handledText") }}{{ report.handleRemark ? `：${report.handleRemark}` : "" }}
              </text>
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

    <!-- 处理举报弹窗 -->
    <view v-if="handlingReport" class="modal-mask" @click.self="closeHandleModal">
      <view class="modal">
        <text class="modal-title">{{ t("reports.handleTitle", { id: handlingReport.id }) }}</text>

        <!-- 举报信息预览 -->
        <view class="report-info-box">
          <view class="info-row">
            <text class="info-label">{{ t("reports.targetLabel") }}</text>
            <text>{{ targetTypeLabel(handlingReport.targetType) }} #{{ handlingReport.targetId }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ t("reports.reporterLabel") }}</text>
            <text>{{ reporterDisplay(handlingReport) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">{{ t("reports.reasonLabel") }}</text>
            <text>{{ handlingReport.reason }}</text>
          </view>
          <view v-if="handlingReport.description" class="info-row">
            <text class="info-label">{{ t("reports.descriptionLabel") }}</text>
            <text>{{ handlingReport.description }}</text>
          </view>
        </view>

        <!-- 处理决定单选 -->
        <view class="form-row">
          <text class="form-label">{{ t("reports.handleDecisionLabel") }}</text>
          <view class="radio-group">
            <label class="radio-item">
              <input v-model="handleDecision" type="radio" value="HANDLE" />
              <span>{{ t("reports.handleDecisionHandled") }}</span>
            </label>
            <label class="radio-item">
              <input v-model="handleDecision" type="radio" value="REJECT" />
              <span>{{ t("reports.handleDecisionRejected") }}</span>
            </label>
          </view>
        </view>

        <!-- 处理备注 -->
        <view class="form-row">
          <text class="form-label">{{ t("reports.handleRemarkLabel") }}</text>
          <textarea
            v-model="handleRemark"
            class="form-textarea"
            rows="3"
            :maxlength="REMARK_MAX_LENGTH"
            :placeholder="t('reports.handleRemarkPlaceholder')"
          />
        </view>

        <!-- 操作按钮 -->
        <view class="modal-actions">
          <button class="ghost-button" @click="closeHandleModal">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="submitting" @click="submitHandle">
            {{ submitting ? t("reports.submitting") : (handleDecision === "REJECT" ? t("reports.submitReject") : t("reports.submitHandle")) }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "@/styles/admin-common.css";

.reports-page {
  max-width: 1400px;
}

.page-header {
  margin-bottom: var(--admin-space-xxxl);
}

.page-title {
  display: block;
  font-size: var(--admin-font-display);
  font-weight: 700;
  color: var(--admin-color-text-primary);
  margin-bottom: var(--admin-space-xs);
}

.page-subtitle {
  display: block;
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-quaternary);
}

.toolbar {
  display: flex;
  gap: var(--admin-space-md);
  margin-bottom: var(--admin-space-xxl);
  flex-wrap: wrap;
  align-items: center;
}

.filter-select {
  padding: var(--admin-space-md-sm) var(--admin-space-xl);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
  background: var(--admin-color-bg-container);
}

.ghost-button {
  padding: var(--admin-space-md-sm) var(--admin-space-xl);
  background: transparent;
  color: var(--admin-color-text-tertiary);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
  cursor: pointer;
}

.ghost-button:hover {
  background: var(--admin-color-bg-hover);
}

.primary-button {
  padding: var(--admin-space-md-sm) var(--admin-space-xl);
  background: var(--admin-color-primary);
  color: var(--admin-color-bg-container);
  border: none;
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
  font-weight: 500;
  cursor: pointer;
}

.primary-button:hover {
  background: var(--admin-color-primary-hover);
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-banner {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
  padding: var(--admin-space-md) var(--admin-space-lg);
  border-radius: var(--admin-radius-lg);
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-lg);
}

.table-container {
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xl);
  overflow: hidden;
  box-shadow: var(--admin-shadow-sm);
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
}

.data-table th,
.data-table td {
  padding: var(--admin-space-md-lg) var(--admin-space-lg);
  text-align: left;
  border-bottom: 1px solid var(--admin-color-border-light);
  vertical-align: middle;
  font-size: var(--admin-font-md);
}

.data-table th {
  background: var(--admin-color-bg-subtle);
  font-size: var(--admin-font-sm);
  font-weight: 600;
  color: var(--admin-color-text-tertiary);
  text-transform: uppercase;
  white-space: nowrap;
}

.data-table tbody tr:hover {
  background: var(--admin-color-bg-subtle);
}

.empty-cell {
  text-align: center;
  color: var(--admin-color-text-quaternary);
  padding: var(--admin-space-section) var(--admin-space-lg);
}

.target-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-sm);
  background: var(--admin-color-accent-soft);
  color: var(--admin-color-accent);
  border-radius: var(--admin-radius-sm);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.reporter-cell {
  display: flex;
  align-items: center;
  gap: var(--admin-space-xxs);
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
}

.description-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--admin-color-text-tertiary);
}

.status-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md-sm);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.status-PENDING {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.status-HANDLED {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-REJECTED {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.action-cell {
  display: flex;
  gap: var(--admin-space-sm);
}

.action-button.handle {
  padding: var(--admin-space-xxs) var(--admin-space-md);
  border: none;
  border-radius: var(--admin-radius-sm);
  font-size: var(--admin-font-sm);
  cursor: pointer;
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
  transition: all 0.2s;
}

.action-button.handle:hover {
  background: var(--admin-color-info-softer);
}

.handled-text {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
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
  width: 480px;
  max-width: 90%;
}

.modal-title {
  display: block;
  font-size: var(--admin-font-xxl);
  font-weight: 600;
  margin-bottom: var(--admin-space-lg);
  color: var(--admin-color-text-primary);
}

.report-info-box {
  background: var(--admin-color-bg-subtle);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-md);
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
  line-height: 1.8;
}

.info-row {
  display: flex;
  gap: var(--admin-space-xxs);
}

.info-label {
  font-weight: 600;
  color: var(--admin-color-text-tertiary);
  flex-shrink: 0;
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

.form-textarea {
  padding: var(--admin-space-md-sm) var(--admin-space-md);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-lg);
  resize: vertical;
  font-family: inherit;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--admin-space-sm);
}
</style>
