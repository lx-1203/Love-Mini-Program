<script setup lang="ts">
/**
 * Admin 审计日志视图（SubTask 3.3.2 i18n 化）。
 *
 * 改造点：
 * - 标题/副标题/筛选占位符/列头/按钮/详情标签全部走 i18n key
 * - 加载失败回退 auditLogs.loadFailed，空数据走 auditLogs.noData
 * - 分页信息通过 auditLogs.paginationInfo 插值生成
 */
import { ref, onMounted, computed } from "vue";
import {
  listAuditLogs,
  AUDIT_OPERATIONS,
  type AuditLogView,
  type AuditLogPageView,
} from "../api/audit-logs";
import { ApiError } from "../api/http";
// Task 3.7.2：接入共享 Pagination 组件（pageBase=0 适配 Spring Data Page 风格）
import Pagination from "../components/Pagination.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

// 列表数据
const logs = ref<AuditLogView[]>([]);
const totalElements = ref(0);
const totalPages = ref(0);
const page = ref(0);
const size = ref(20);

// 筛选条件
const filterOperator = ref("");
const filterOperation = ref("");
const filterStartDate = ref("");
const filterEndDate = ref("");

const loading = ref(false);
const error = ref("");

// 操作类型 → 中文标签映射
const operationLabelMap = computed(() => {
  const m: Record<string, string> = {};
  for (const op of AUDIT_OPERATIONS) m[op.value] = t(op.labelKey);
  return m;
});

function buildQuery() {
  return {
    page: page.value,
    size: size.value,
    operator: filterOperator.value || undefined,
    operation: filterOperation.value || undefined,
    startDate: filterStartDate.value
      ? `${filterStartDate.value}T00:00:00`
      : undefined,
    endDate: filterEndDate.value ? `${filterEndDate.value}T23:59:59` : undefined,
  };
}

async function fetchLogs() {
  loading.value = true;
  error.value = "";
  try {
    const result: AuditLogPageView = await listAuditLogs(buildQuery());
    logs.value = result.content || [];
    totalElements.value = result.totalElements || 0;
    totalPages.value = result.totalPages || 0;
    page.value = result.page;
    size.value = result.size;
  } catch (err: unknown) {
    // 修复 no-explicit-any：catch 类型改为 unknown，通过类型守卫收敛
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("auditLogs.loadFailed");
    logs.value = [];
    totalElements.value = 0;
    totalPages.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 0;
  fetchLogs();
}

function handleReset() {
  filterOperator.value = "";
  filterOperation.value = "";
  filterStartDate.value = "";
  filterEndDate.value = "";
  page.value = 0;
  fetchLogs();
}

function handlePrev() {
  if (page.value > 0) {
    page.value--;
    fetchLogs();
  }
}

function handleNext() {
  if (page.value < totalPages.value - 1) {
    page.value++;
    fetchLogs();
  }
}

/**
 * Task 3.7.2：分页变更回调（由 Pagination 组件触发，pageBase=0）。
 */
function handlePageChange() {
  fetchLogs();
}

function formatTime(s?: string): string {
  if (!s) return "-";
  // 兼容 ISO 时间：截到秒
  return s.replace("T", " ").slice(0, 19);
}

function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusClass(status?: number): string {
  if (status === undefined || status === null) return "status-unknown";
  if (status >= 200 && status < 300) return "status-success";
  if (status >= 400 && status < 500) return "status-client-error";
  return "status-server-error";
}

onMounted(() => {
  fetchLogs();
});
</script>

<template>
  <view class="audit-page">
    <view class="page-header">
      <text class="page-title">{{ t("auditLogs.title") }}</text>
      <text class="page-subtitle">{{ t("auditLogs.tableSubtitle") }}</text>
    </view>

    <view class="toolbar">
      <input
        v-model="filterOperator"
        class="filter-input"
        type="text"
        :placeholder="t('auditLogs.filterOperatorPlaceholder')"
      />
      <select v-model="filterOperation" class="filter-select">
        <option value="">{{ t("auditLogs.filterActionAll") }}</option>
        <option v-for="op in AUDIT_OPERATIONS" :key="op.value" :value="op.value">
          {{ t(op.labelKey) }}
        </option>
      </select>
      <input v-model="filterStartDate" class="filter-input filter-date" type="date" />
      <text class="filter-sep">{{ t("auditLogs.dateRangeSep") }}</text>
      <input v-model="filterEndDate" class="filter-input filter-date" type="date" />
      <button class="primary-button" @click="handleSearch">{{ t("auditLogs.queryButton") }}</button>
      <button class="secondary-button" @click="handleReset">{{ t("common.reset") }}</button>
    </view>

    <view v-if="error" class="error-message">{{ error }}</view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("auditLogs.columnId") }}</th>
            <th scope="col">{{ t("auditLogs.columnTime") }}</th>
            <th scope="col">{{ t("auditLogs.columnOperator") }}</th>
            <th scope="col">{{ t("auditLogs.columnOperatorRole") }}</th>
            <th scope="col">{{ t("auditLogs.columnAction") }}</th>
            <th scope="col">{{ t("auditLogs.columnTarget") }}</th>
            <th scope="col">{{ t("auditLogs.columnHttp") }}</th>
            <th scope="col">{{ t("auditLogs.columnStatus") }}</th>
            <th scope="col">{{ t("auditLogs.columnDuration") }}</th>
            <th scope="col">{{ t("auditLogs.columnIp") }}</th>
            <th scope="col">{{ t("auditLogs.columnDetail") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="11" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="logs.length === 0">
            <td colspan="11" class="empty-row">{{ t("auditLogs.noData") }}</td>
          </tr>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ log.id }}</td>
            <td>{{ formatTime(log.createdAt) }}</td>
            <td>
              <text class="operator-name">{{ log.operatorUsername }}</text>
              <text class="operator-id">#{{ log.operatorId }}</text>
            </td>
            <td>
              <span class="role-badge" :class="`role-${log.operatorRole?.toLowerCase()}`">
                {{ log.operatorRole }}
              </span>
            </td>
            <td>
              <span class="operation-tag">
                {{ operationLabelMap[log.operation] || log.operation }}
              </span>
            </td>
            <td>
              <text v-if="log.targetType || log.targetId" class="target-text">
                {{ log.targetType || "-" }}{{ log.targetId ? ` / ${log.targetId}` : "" }}
              </text>
              <text v-else class="empty-cell">-</text>
            </td>
            <td>
              <text class="http-method">{{ log.requestMethod || "-" }}</text>
              <text class="http-url">{{ log.requestUrl || "" }}</text>
            </td>
            <td>
              <span class="status-badge" :class="statusClass(log.responseStatus)">
                {{ log.responseStatus ?? "-" }}
              </span>
            </td>
            <td>{{ formatDuration(log.durationMs) }}</td>
            <td>{{ log.ip || "-" }}</td>
            <td class="detail-cell">
              <details v-if="log.requestBody || log.errorMessage">
                <summary>{{ t("auditLogs.detailView") }}</summary>
                <view v-if="log.errorMessage" class="error-detail">
                  <text class="detail-label">{{ t("auditLogs.detailErrorLabel") }}</text>
                  <text>{{ log.errorMessage }}</text>
                </view>
                <view v-if="log.requestBody" class="body-detail">
                  <text class="detail-label">{{ t("auditLogs.detailRequestBodyLabel") }}</text>
                  <pre>{{ log.requestBody }}</pre>
                </view>
              </details>
              <text v-else class="empty-cell">-</text>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <view class="pagination">
      <text class="pagination-info">
        {{ t("auditLogs.paginationInfo", { total: totalElements, page: page + 1, totalPages: Math.max(totalPages, 1) }) }}
      </text>
      <view class="pagination-actions">
        <button class="page-button" :disabled="page === 0" @click="handlePrev">{{ t("common.prevPage") }}</button>
        <button
          class="page-button"
          :disabled="page >= totalPages - 1"
          @click="handleNext"
        >{{ t("common.nextPage") }}</button>
      </view>
    </view>

    <!-- Task 3.7.2：接入共享 Pagination 组件（pageBase=0 适配 Spring Data Page 风格） -->
    <Pagination
      v-model:page="page"
      :total-pages="totalPages"
      :total="totalElements"
      :page-base="0"
      :disabled="loading"
      @change="handlePageChange"
    />
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

.audit-page {
  max-width: 1400px;
}

.page-header {
  margin-bottom: var(--admin-space-xxl);
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

.filter-input {
  padding: var(--admin-space-md-sm) var(--admin-space-md-lg);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
  min-width: 140px;
}

.filter-date {
  min-width: 130px;
}

.filter-select {
  padding: var(--admin-space-md-sm) var(--admin-space-md-lg);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
  background: var(--admin-color-bg-container);
  min-width: 160px;
}

.filter-sep {
  color: var(--admin-color-text-quaternary);
  font-size: var(--admin-font-lg);
}

.primary-button,
.secondary-button {
  padding: var(--admin-space-md-sm) var(--admin-space-xl);
  border: none;
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-button {
  background: var(--admin-color-primary);
  color: var(--admin-color-bg-container);
}

.primary-button:hover {
  background: var(--admin-color-primary-hover);
}

.secondary-button {
  background: var(--admin-color-bg-hover);
  color: var(--admin-color-text-tertiary);
}

.secondary-button:hover {
  background: var(--admin-color-bg-hover);
}

.error-message {
  padding: var(--admin-space-md);
  background: var(--admin-color-danger-soft);
  border-left: 3px solid var(--admin-color-danger);
  border-radius: var(--admin-radius-sm);
  color: var(--admin-color-danger);
  font-size: var(--admin-font-md);
  margin-bottom: var(--admin-space-lg);
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
  padding: var(--admin-space-md) var(--admin-space-md-lg);
  text-align: left;
  border-bottom: 1px solid var(--admin-color-border-light);
  font-size: var(--admin-font-md);
  vertical-align: top;
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

.empty-row {
  text-align: center;
  color: var(--admin-color-text-quaternary);
  padding: var(--admin-space-xxxl);
}

.empty-cell {
  color: var(--admin-color-text-placeholder);
}

.operator-name {
  display: block;
  font-weight: 500;
  color: var(--admin-color-text-primary);
}

.operator-id {
  display: block;
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-quaternary);
}

.role-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-sm);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-xs);
  font-weight: 500;
}

.role-admin {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.role-user {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.operation-tag {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-sm);
  background: var(--admin-color-accent-soft);
  color: var(--admin-color-accent);
  border-radius: var(--admin-radius-sm);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.target-text {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-tertiary);
}

.http-method {
  display: inline-block;
  padding: var(--admin-space-xxs);
  background: var(--admin-color-bg-hover);
  border-radius: var(--admin-radius-sm);
  font-size: var(--admin-font-xs);
  font-weight: 600;
  color: var(--admin-color-text-primary);
  margin-right: var(--admin-space-xs);
}

.http-url {
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-quaternary);
  word-break: break-all;
}

.status-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-sm);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-xs);
  font-weight: 500;
}

.status-success {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-client-error {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.status-server-error {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.status-unknown {
  background: var(--admin-color-bg-hover);
  color: var(--admin-color-text-quaternary);
}

.detail-cell details {
  cursor: pointer;
}

.detail-cell summary {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-primary);
  user-select: none;
}

.detail-cell .detail-label {
  font-weight: 600;
  color: var(--admin-color-text-tertiary);
}

.detail-cell .error-detail {
  color: var(--admin-color-danger);
  font-size: var(--admin-font-sm);
  margin-top: var(--admin-space-xxs);
}

.detail-cell .body-detail pre {
  font-size: var(--admin-font-xs);
  background: var(--admin-color-bg-subtle);
  padding: var(--admin-space-sm);
  border-radius: var(--admin-radius-sm);
  margin-top: var(--admin-space-xs);
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--admin-color-text-primary);
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--admin-space-xl);
}

.pagination-info {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-tertiary);
}

.pagination-actions {
  display: flex;
  gap: var(--admin-space-sm);
}

.page-button {
  padding: var(--admin-space-sm) var(--admin-space-lg);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-color-bg-container);
  color: var(--admin-color-text-primary);
  font-size: var(--admin-font-md);
  cursor: pointer;
  transition: all 0.2s;
}

.page-button:hover:not(:disabled) {
  background: var(--admin-color-primary);
  color: var(--admin-color-bg-container);
  border-color: var(--admin-color-primary);
}

.page-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
