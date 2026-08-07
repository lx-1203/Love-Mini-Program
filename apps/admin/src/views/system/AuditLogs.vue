<script setup lang="ts">
/**
 * Admin v2 审计日志视图（参考旧后台 apps/admin/src/views/AuditLogs.vue 复制并扩展）。
 *
 * 扩展点：
 * - 筛选条件：operator（操作者ID，纯数字校验）/ operation（操作类型下拉）/
 *   startDate / endDate / exceptionOnly（仅异常日志勾选）
 * - 表格列：id / operatorUsername / operation / targetType / targetId /
 *   requestMethod / requestUrl / responseStatus / errorMessage（异常红色）/
 *   ip / durationMs / createdAt + 详情（请求体脱敏展示）
 * - 分页：page 从 0 开始（后端约定 page/size 参数），Pagination 组件 pageBase=0 适配
 */
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import {
  listAuditLogs,
  AUDIT_OPERATIONS,
  type AuditLogView,
  type AuditLogPageView,
} from "../../api/system";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ErrorState from "../../components/ErrorState.vue";
import { useI18n } from "vue-i18n";
import {
  formatTimeCompact,
  formatDuration,
  maskSensitiveJson,
  maskSensitiveUrl,
} from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

const { t } = useI18n();

// ===== 列表数据 =====
const logs = ref<AuditLogView[]>([]);
const totalElements = ref(0);
const totalPages = ref(0);
const page = ref(0);
const size = ref(DEFAULT_PAGE_SIZE);

// ===== 筛选条件 =====
const filterOperator = ref("");
const filterOperation = ref("");
const filterStartDate = ref("");
const filterEndDate = ref("");
/** 仅异常日志（errorMessage 非空）勾选 */
const filterExceptionOnly = ref(false);

const loading = ref(false);
const error = ref("");

// 请求竞态防护 + 查询防抖
let reqSeq = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** 操作类型 → 中文标签映射 */
const operationLabelMap = computed(() => {
  const m: Record<string, string> = {};
  for (const op of AUDIT_OPERATIONS) m[op.value] = t(op.labelKey);
  return m;
});

/** targetType 英文枚举 → i18n 标签 */
function targetTypeLabel(type?: string): string {
  switch (type) {
    case "POST":
      return t("auditLogs.targetTypePost");
    case "COMMENT":
      return t("auditLogs.targetTypeComment");
    case "USER":
      return t("auditLogs.targetTypeUser");
    case "TOPIC":
      return t("auditLogs.targetTypeTopic");
    case "CONFIG":
      return t("auditLogs.targetTypeConfig");
    default:
      return type || "-";
  }
}

/** HTTP 方法 → 徽章颜色 class */
function methodClass(method?: string): string {
  const m = String(method || "").toUpperCase();
  if (m === "GET") return "method-get";
  if (m === "POST" || m === "PUT" || m === "PATCH") return "method-write";
  if (m === "DELETE") return "method-delete";
  return "method-other";
}

/** 构建查询参数（exceptionOnly 映射为后端 exception 参数） */
function buildQuery() {
  return {
    page: page.value,
    size: size.value,
    operator: filterOperator.value || undefined,
    operation: filterOperation.value || undefined,
    startDate: filterStartDate.value || undefined,
    endDate: filterEndDate.value || undefined,
    exceptionOnly: filterExceptionOnly.value,
  };
}

async function fetchLogs() {
  loading.value = true;
  error.value = "";
  const seq = ++reqSeq;
  try {
    const result: AuditLogPageView = await listAuditLogs(buildQuery());
    if (seq !== reqSeq) return; // 丢弃过期响应
    logs.value = result.content || [];
    totalElements.value = result.totalElements || 0;
    totalPages.value = result.totalPages || 0;
    page.value = result.page;
    size.value = result.size;
  } catch (err: unknown) {
    if (seq !== reqSeq) return;
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
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** 查询防抖（400ms），日期切换等高频变更合并请求 */
function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    page.value = 0;
    fetchLogs();
  }, 400);
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  // operator 为数字 ID 校验（后端 parseLong 失败会静默返回 null）
  if (filterOperator.value && !/^\d+$/.test(filterOperator.value.trim())) {
    error.value = t("auditLogs.operatorInvalid");
    return;
  }
  page.value = 0;
  fetchLogs();
}

function handleReset() {
  filterOperator.value = "";
  filterOperation.value = "";
  filterStartDate.value = "";
  filterEndDate.value = "";
  filterExceptionOnly.value = false;
  handleSearch();
}

function handlePageChange() {
  fetchLogs();
}

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});

function formatTime(s?: string): string {
  return formatTimeCompact(s);
}

/** 请求体脱敏：password/token/secret 等敏感字段打码 */
function maskSensitiveBody(raw?: string): string {
  return maskSensitiveJson(raw);
}

/** requestUrl 展示前脱敏 query 中的敏感参数 */
function maskUrl(url?: string): string {
  return maskSensitiveUrl(url);
}

function formatDurationMs(ms?: number): string {
  return formatDuration(ms);
}

function statusClass(status?: number): string {
  if (status === undefined || status === null) return "status-unknown";
  if (status >= 200 && status < 300) return "status-success";
  if (status >= 400 && status < 500) return "status-client-error";
  return "status-server-error";
}

/** CSV 导出（当前页日志，客户端生成） */
function exportCsv() {
  try {
    const rows = logs.value.map((log) => [
      log.id,
      formatTime(log.createdAt),
      log.operatorUsername,
      log.operation,
      log.targetType || "",
      log.requestMethod || "",
      log.responseStatus ?? "",
      log.durationMs ?? "",
      log.ip || "",
    ]);
    const header = [
      t("auditLogs.columnId"),
      t("auditLogs.columnTime"),
      t("auditLogs.columnOperator"),
      t("auditLogs.columnAction"),
      t("auditLogs.columnTarget"),
      t("auditLogs.columnHttp"),
      t("auditLogs.columnStatus"),
      t("auditLogs.columnDuration"),
      t("auditLogs.columnIp"),
    ];
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    error.value = "";
  } catch {
    error.value = t("auditLogs.exportFailed");
  }
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
        inputmode="numeric"
        :placeholder="t('auditLogs.filterOperatorPlaceholder')"
        @keyup.enter="handleSearch"
        @change="scheduleSearch"
      />
      <select v-model="filterOperation" class="filter-select" @change="scheduleSearch">
        <option value="">{{ t("auditLogs.filterActionAll") }}</option>
        <option v-for="op in AUDIT_OPERATIONS" :key="op.value" :value="op.value">
          {{ t(op.labelKey) }}
        </option>
      </select>
      <input v-model="filterStartDate" class="filter-input filter-date" type="date" @change="scheduleSearch" />
      <text class="filter-sep">{{ t("auditLogs.dateRangeSep") }}</text>
      <input v-model="filterEndDate" class="filter-input filter-date" type="date" @change="scheduleSearch" />
      <label class="exception-check">
        <input v-model="filterExceptionOnly" type="checkbox" @change="scheduleSearch" />
        <text>{{ t("auditLogs.filterExceptionOnly") }}</text>
      </label>
      <button class="primary-button" @click="handleSearch">{{ t("auditLogs.queryButton") }}</button>
      <button class="secondary-button" @click="handleReset">{{ t("common.reset") }}</button>
      <button class="secondary-button" :disabled="loading || logs.length === 0" @click="exportCsv">
        {{ t("auditLogs.exportButton") }}
      </button>
    </view>

    <ErrorState v-if="error" :message="error" @retry="fetchLogs" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("auditLogs.columnId") }}</th>
            <th scope="col">{{ t("auditLogs.columnOperator") }}</th>
            <th scope="col">{{ t("auditLogs.columnAction") }}</th>
            <th scope="col">目标类型</th>
            <th scope="col">目标ID</th>
            <th scope="col">{{ t("auditLogs.columnHttp") }}</th>
            <th scope="col">{{ t("auditLogs.columnStatus") }}</th>
            <th scope="col">错误信息</th>
            <th scope="col">{{ t("auditLogs.columnIp") }}</th>
            <th scope="col">{{ t("auditLogs.columnDuration") }}</th>
            <th scope="col">{{ t("auditLogs.columnTime") }}</th>
            <th scope="col">{{ t("auditLogs.columnDetail") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="12" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="logs.length === 0">
            <td colspan="12" class="empty-row">{{ t("auditLogs.noData") }}</td>
          </tr>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ log.id }}</td>
            <td>
              <text class="operator-name">{{ log.operatorUsername }}</text>
              <text class="operator-id">#{{ log.operatorId }}</text>
            </td>
            <td>
              <span class="operation-tag">
                {{ operationLabelMap[log.operation] || t("auditLogs.opUnknown") }}
              </span>
            </td>
            <td>
              <text v-if="log.targetType" class="target-text">{{ targetTypeLabel(log.targetType) }}</text>
              <text v-else class="empty-cell">-</text>
            </td>
            <td>
              <text v-if="log.targetId" class="target-text">{{ log.targetId }}</text>
              <text v-else class="empty-cell">-</text>
            </td>
            <td>
              <text class="http-method" :class="methodClass(log.requestMethod)">{{ log.requestMethod || "-" }}</text>
              <text class="http-url">{{ maskUrl(log.requestUrl) }}</text>
            </td>
            <td>
              <span class="status-badge" :class="statusClass(log.responseStatus)">
                {{ log.responseStatus ?? "-" }}
              </span>
            </td>
            <td>
              <!-- 异常日志红色高亮 -->
              <text v-if="log.errorMessage" class="error-message-cell">{{ log.errorMessage }}</text>
              <text v-else class="empty-cell">-</text>
            </td>
            <td>{{ log.ip || "-" }}</td>
            <td>{{ formatDurationMs(log.durationMs) }}</td>
            <td>{{ formatTime(log.createdAt) }}</td>
            <td class="detail-cell">
              <details v-if="log.requestBody || log.errorMessage">
                <summary>{{ t("auditLogs.detailView") }}</summary>
                <view v-if="log.errorMessage" class="error-detail">
                  <text class="detail-label">{{ t("auditLogs.detailErrorLabel") }}</text>
                  <text>{{ log.errorMessage }}</text>
                </view>
                <view v-if="log.requestBody" class="body-detail">
                  <text class="detail-label">{{ t("auditLogs.detailRequestBodyLabel") }}</text>
                  <!-- 脱敏展示：password/token 等敏感字段值打码 -->
                  <pre>{{ maskSensitiveBody(log.requestBody) }}</pre>
                </view>
              </details>
              <text v-else class="empty-cell">-</text>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- page 从 0 开始（Spring Data Page 风格），Pagination pageBase=0 适配 -->
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
@import "../../styles/admin-common.css";

.audit-page {
  max-width: 1400px;
}

.filter-date {
  min-width: 130px;
}

.exception-check {
  display: flex;
  align-items: center;
  gap: var(--admin-space-xs);
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
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

/* HTTP 方法颜色映射（GET 信息色 / 写操作警告色 / DELETE 危险色） */
.http-method.method-get {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.http-method.method-write {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.http-method.method-delete {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.http-method.method-other {
  background: var(--admin-color-bg-hover);
  color: var(--admin-color-text-tertiary);
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

/* 异常信息红色高亮（仅异常日志展示） */
.error-message-cell {
  display: block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--admin-color-danger);
  font-size: var(--admin-font-sm);
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
</style>
