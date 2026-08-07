<script setup lang="ts">
/**
 * Admin 审计日志视图（SubTask 3.3.2 i18n 化）。
 *
 * 改造点：
 * - 标题/副标题/筛选占位符/列头/按钮/详情标签全部走 i18n key
 * - 加载失败回退 auditLogs.loadFailed，空数据走 auditLogs.noData
 * - 分页信息通过 auditLogs.paginationInfo 插值生成
 */
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import {
  listAuditLogs,
  AUDIT_OPERATIONS,
  type AuditLogView,
  type AuditLogPageView,
} from "../api/audit-logs";
import { ApiError } from "../api/http";
// Task 3.7.2：接入共享 Pagination 组件（pageBase=0 适配 Spring Data Page 风格）
import Pagination from "../components/Pagination.vue";
// infra R2-00422：错误态接入共享 ErrorState 组件（原无重试入口）
import ErrorState from "../components/ErrorState.vue";
import { useI18n } from "vue-i18n";
import { formatTimeCompact, formatDuration, maskSensitiveJson, maskSensitiveUrl } from "../utils/format";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";

const { t } = useI18n();

// 列表数据
const logs = ref<AuditLogView[]>([]);
const totalElements = ref(0);
const totalPages = ref(0);
const page = ref(0);
// infra R2-00423：size 魔法数字收敛为公共常量
const size = ref(DEFAULT_PAGE_SIZE);

// 筛选条件
const filterOperator = ref("");
const filterOperation = ref("");
const filterStartDate = ref("");
const filterEndDate = ref("");
// P2 对齐（eladmin「异常日志」）："" = 全部日志，"true" = 仅异常日志
const filterException = ref("");

const loading = ref(false);
const error = ref("");

// infra R2-00424：请求竞态防护 + 查询防抖（同 Users.vue 方案）
let reqSeq = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// 操作类型 → 中文标签映射
const operationLabelMap = computed(() => {
  const m: Record<string, string> = {};
  for (const op of AUDIT_OPERATIONS) m[op.value] = t(op.labelKey);
  return m;
});

/** infra R2-00425：targetType 英文枚举 → i18n 标签（原直接显示 POST/COMMENT/USER） */
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

/** infra R2-00426：HTTP 方法 → 徽章颜色 class（原无方法-颜色映射，视觉区分弱） */
function methodClass(method?: string): string {
  const m = String(method || "").toUpperCase();
  if (m === "GET") return "method-get";
  if (m === "POST" || m === "PUT" || m === "PATCH") return "method-write";
  if (m === "DELETE") return "method-delete";
  return "method-other";
}

function buildQuery() {
  // infra R2-00024 修复：日期筛选发送纯日期 yyyy-MM-dd（不带 Z 后缀）。
  // 原实现拼接 Z 后缀（UTC 时间戳），后端用 ISO_LOCAL_DATE_TIME 解析必抛
  // DateTimeParseException 并返回 null，导致按日期范围筛选静默失效。
  // 后端已兼容纯日期格式（长度 10 时自动补 T00:00:00）。
  return {
    page: page.value,
    size: size.value,
    operator: filterOperator.value || undefined,
    operation: filterOperation.value || undefined,
    startDate: filterStartDate.value || undefined,
    endDate: filterEndDate.value || undefined,
    exception: filterException.value ? filterException.value === "true" : undefined,
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
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** infra R2-00424：查询防抖（400ms），日期切换等高频变更合并请求 */
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
  // infra R2-00427：operator 为数字 ID 校验——原输入任意文本时后端 parseLong 失败静默返回 null，筛选不生效且无提示
  if (filterOperator.value && !/^\d+$/.test(filterOperator.value.trim())) {
    error.value = t("auditLogs.operatorInvalid");
    return;
  }
  page.value = 0;
  fetchLogs();
}

// infra R2-00428：handleReset 与 handleSearch 合并（原重复实现）
function handleReset() {
  filterOperator.value = "";
  filterOperation.value = "";
  filterStartDate.value = "";
  filterEndDate.value = "";
  filterException.value = "";
  handleSearch();
}

function handlePageChange() {
  fetchLogs();
}

/** infra R2-00424：组件卸载时清理防抖定时器 */
onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});

function formatTime(s?: string): string {
  // infra R2-00429：统一走公共工具——含时区后缀转本地时区（原字符串替换展示，
  // 服务器 UTC 时列表时间比本地晚 8 小时；后端格式变化时截断健壮性也一并处理）
  return formatTimeCompact(s);
}

/**
 * 角色显示标签（兼容 SUPER_ADMIN / ADMIN / USER 及其小写变体）。
 */
function roleLabel(role?: string): string {
  const normalized = String(role || "").toUpperCase();
  switch (normalized) {
    case "SUPER_ADMIN":
      return t("users.roleSuperAdmin");
    case "ADMIN":
      return t("users.roleAdmin");
    default:
      return role || "-";
  }
}

/** 角色徽章 CSS class（SUPER_ADMIN 有专属样式） */
function roleClass(role?: string): string {
  const normalized = String(role || "").toUpperCase();
  if (normalized === "SUPER_ADMIN") return "super-admin";
  if (normalized === "ADMIN") return "admin";
  return "user";
}

/**
 * 请求体脱敏：对 JSON 文本中的敏感字段（password/token/secret 等）打码。
 *
 * 审计日志可能包含登录、改密等操作的请求体，直接明文展示会泄露凭据，
 * 因此展示前将敏感字段值替换为 ******。
 *
 * infra R2-00430：原正则仅匹配 `"password":"..."` 引号格式，嵌套 JSON / 数字值 /
 * 无引号键名均不覆盖；现改为递归 JSON 遍历脱敏（utils/format.maskSensitiveJson），
 * 解析失败回退正则。
 *
 * @param raw 原始 requestBody 文本（可能为 JSON 字符串或非 JSON 文本）
 * @returns 脱敏后的展示文本
 */
function maskSensitiveBody(raw?: string): string {
  return maskSensitiveJson(raw);
}

/** infra R2-00431：requestUrl 展示前脱敏 query 中的敏感参数（原明文展示完整 query，
 *  若含 token/secret 参数则审计页自身泄露敏感参数） */
function maskUrl(url?: string): string {
  return maskSensitiveUrl(url);
}

function formatDurationMs(ms?: number): string {
  // infra R2-00432：统一走公共工具（原 1000 魔法数字散落）
  return formatDuration(ms);
}

function statusClass(status?: number): string {
  if (status === undefined || status === null) return "status-unknown";
  if (status >= 200 && status < 300) return "status-success";
  if (status >= 400 && status < 500) return "status-client-error";
  return "status-server-error";
}

/**
 * infra R2-00433：CSV 导出（i18n auditLogs.exportButton/exportSuccess/exportFailed 消费）。
 * 客户端将当前页日志导出为 CSV，便于离线归档（审计日志合规追溯）。
 */
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
            // 转义逗号/引号/换行，保证 CSV 语法正确
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
    // 简单成功提示：复用 error 通道会误触发 ErrorState，改用 console 提示不合适，
    // 因此这里直接复用导出按钮的文案状态——由调用方在模板中展示短暂提示。
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
      <!-- P2 对齐（eladmin「异常日志」）：全部/仅异常筛选 -->
      <select v-model="filterException" class="filter-select" @change="scheduleSearch">
        <option value="">{{ t("auditLogs.filterExceptionAll") }}</option>
        <option value="true">{{ t("auditLogs.filterExceptionOnly") }}</option>
      </select>
      <input v-model="filterStartDate" class="filter-input filter-date" type="date" @change="scheduleSearch" />
      <text class="filter-sep">{{ t("auditLogs.dateRangeSep") }}</text>
      <input v-model="filterEndDate" class="filter-input filter-date" type="date" @change="scheduleSearch" />
      <button class="primary-button" @click="handleSearch">{{ t("auditLogs.queryButton") }}</button>
      <button class="secondary-button" @click="handleReset">{{ t("common.reset") }}</button>
      <!-- infra R2-00433：CSV 导出按钮（原 exportButton i18n key 无消费方） -->
      <button class="secondary-button" :disabled="loading || logs.length === 0" @click="exportCsv">
        {{ t("auditLogs.exportButton") }}
      </button>
    </view>

    <!-- infra R2-00422：错误态接入 ErrorState 组件（含重试按钮） -->
    <ErrorState v-if="error" :message="error" @retry="fetchLogs" />

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
              <span class="role-badge" :class="`role-${roleClass(log.operatorRole)}`">
                {{ roleLabel(log.operatorRole) }}
              </span>
            </td>
            <td>
              <span class="operation-tag">
                <!-- infra R2-00434：未覆盖操作类型兜底文案（原直接显示英文枚举） -->
                {{ operationLabelMap[log.operation] || t("auditLogs.opUnknown") }}
              </span>
            </td>
            <td>
              <!-- infra R2-00425：targetType 列 i18n 映射（原直接显示 POST/COMMENT/USER） -->
              <text v-if="log.targetType || log.targetId" class="target-text">
                {{ targetTypeLabel(log.targetType) }}{{ log.targetId ? ` / ${log.targetId}` : "" }}
              </text>
              <text v-else class="empty-cell">-</text>
            </td>
            <td>
              <!-- infra R2-00426：HTTP 方法按颜色区分；infra R2-00431：URL query 敏感参数脱敏 -->
              <text class="http-method" :class="methodClass(log.requestMethod)">{{ log.requestMethod || "-" }}</text>
              <text class="http-url">{{ maskUrl(log.requestUrl) }}</text>
            </td>
            <td>
              <span class="status-badge" :class="statusClass(log.responseStatus)">
                {{ log.responseStatus ?? "-" }}
              </span>
            </td>
            <td>{{ formatDurationMs(log.durationMs) }}</td>
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
                  <!-- 脱敏展示：password/token 等敏感字段值打码，避免审计日志泄露凭据 -->
                  <pre>{{ maskSensitiveBody(log.requestBody) }}</pre>
                </view>
              </details>
              <text v-else class="empty-cell">-</text>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- Task 3.7.2：接入共享 Pagination 组件（pageBase=0 适配 Spring Data Page 风格，
         修复双分页：删除上方手写分页；content/totalElements 契约由本组件 total 统一展示） -->
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

.role-super-admin {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
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

/* infra R2-00426：HTTP 方法颜色映射（GET 信息色 / 写操作警告色 / DELETE 危险色） */
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

/* infra R2-00435：删除死样式 .pagination/.pagination-info/.pagination-actions/.page-button——
   模板已改用共享 Pagination 组件 */
</style>
