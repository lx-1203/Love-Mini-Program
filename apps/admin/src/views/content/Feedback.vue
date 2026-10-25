<script setup lang="ts">
/**
 * 反馈管理页。
 *
 * - 列表：走「分页工单」端点 GET /api/v1/admin/feedback/tickets（listFeedbackTickets），
 *   支持分页 + 状态/类型筛选 + 按提交人所属校区隔离（校区管理员/有校区的 AUDITOR 只能看本校区）。
 *   ⚠ 该端点返回**直出** AdminPageView {items,total,page,pageSize,totalPages}，
 *     没有 {code,message,data} 信封，http 层的 get() 也不解包，故直接按分页对象取字段。
 * - 处理：走 POST /api/v1/admin/feedback/tickets/{id}/handle（handleFeedbackTicket），
 *   后端带 @Auditable(HANDLE_FEEDBACK) 审计 + 提交人校区越权校验（越权 403）。
 * - 只读角色 AUDITOR：后台 URL 层对 POST /api/v1/admin/** 只放 ADMIN/SUPER_ADMIN，
 *   故此处用 sessionStore.canWrite 隐藏「处理」按钮（绕过去后端也会 403）。
 * - loading / empty / error 三态处理 + 请求竞态防护。
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  listFeedbackTickets,
  handleFeedbackTicket,
  FEEDBACK_TICKET_STATUSES,
  FEEDBACK_TICKET_TYPES,
  type FeedbackTicketView,
  type FeedbackTicketType,
  type SubmissionStatus,
} from "@/api/feedback";
import { ApiError } from "@/api/http";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Pagination from "@/components/Pagination.vue";
import { useSessionStore } from "@/stores/session";
import { useRequestRace } from "../../composables/useRequestRace";
import { useI18n } from "vue-i18n";
import { formatDateTime } from "@/utils/format";
import { TOAST_DURATION_MS, REMARK_MAX_LENGTH, DEFAULT_PAGE_SIZE } from "@/utils/constants";

const { t } = useI18n();
const sessionStore = useSessionStore();

const feedbacks = ref<FeedbackTicketView[]>([]);
const loading = ref(false);
const errorMsg = ref("");

/** 状态筛选，空串表示不限制（后端宽松解析：空值/非法值均视为不筛选） */
const statusFilter = ref<SubmissionStatus | "">("");
/** 类型筛选，空串表示不限制 */
const typeFilter = ref<FeedbackTicketType | "">("");

/** 当前页码（1-based，与后端 page 参数一致） */
const page = ref(1);
/** 每页大小（后端收敛到 [1,100]） */
const pageSize = ref(DEFAULT_PAGE_SIZE);
/** 总记录数 */
const total = ref(0);
/** 总页数 */
const totalPages = ref(1);

const showDetailModal = ref(false);
const detailFeedback = ref<FeedbackTicketView | null>(null);

const toastMessage = ref("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// 请求竞态防护（快速刷新/切换时旧响应不覆盖新数据）
const { nextSeq, isStale } = useRequestRace();

function showToast(msg: string) {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
    toastTimer = null;
  }, TOAST_DURATION_MS);
}

/** toast 手动关闭 */
function closeToast() {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  toastMessage.value = "";
}

/**
 * 拉取反馈工单分页列表。
 * 失败时设置 errorMsg，清空列表与分页元信息，方便模板渲染 error 三态。
 */
async function fetchTickets() {
  loading.value = true;
  errorMsg.value = "";
  const seq = nextSeq();
  try {
    const result = await listFeedbackTickets({
      status: statusFilter.value,
      type: typeFilter.value,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (isStale(seq)) return; // 丢弃过期响应
    feedbacks.value = result.items ?? [];
    total.value = result.total;
    totalPages.value = result.totalPages ?? 1;
  } catch (err) {
    if (isStale(seq)) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("feedback.loadFailed");
    feedbacks.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (!isStale(seq)) {
      loading.value = false;
    }
  }
}

/** 筛选条件变更：回到第一页再拉取 */
function handleSearch() {
  page.value = 1;
  void fetchTickets();
}

/** 重置筛选条件 */
function handleResetFilters() {
  statusFilter.value = "";
  typeFilter.value = "";
  handleSearch();
}

/** 翻页（Pagination 组件已更新 page，这里只负责发请求） */
function handlePageChange() {
  void fetchTickets();
}

function handleView(feedback: FeedbackTicketView) {
  detailFeedback.value = feedback;
  showDetailModal.value = true;
}

/** 处理确认弹窗状态 */
const processVisible = ref(false);
const processTarget = ref<FeedbackTicketView | null>(null);
/** 处理接口调用中状态，传给 ConfirmDialog 的 confirming prop 禁用按钮 */
const processLoading = ref(false);
/** 自定义回复内容（空时使用默认回复文案） */
const replyContent = ref("");

function handleProcess(feedback: FeedbackTicketView) {
  processTarget.value = feedback;
  replyContent.value = ""; // 每次打开弹窗重置自定义回复
  processVisible.value = true;
}

/** ConfirmDialog 确认回调，调用工单处理接口（状态推进为 REVIEWED，支持自定义回复摘要） */
async function handleConfirmProcess() {
  if (!sessionStore.canWrite) return;
  const target = processTarget.value;
  if (!target) return;
  processLoading.value = true;
  try {
    // 后端 POST /v1/admin/feedback/tickets/{id}/handle 接收 { status, replySummary }：
    // status 必填（@NotNull），此处「标记为已处理」→ REVIEWED；
    // replySummary 留空时回退到默认回复文案。
    // 注意：handle 端点不做截断（latest_reply_summary 列长 512），
    // 这里按 REMARK_MAX_LENGTH 兜底裁剪，避免超长文本触发后端 500。
    const reply = replyContent.value.trim() || t("feedback.defaultReplyContent");
    const updated = await handleFeedbackTicket(target.id, {
      status: "REVIEWED",
      replySummary: reply.slice(0, REMARK_MAX_LENGTH),
    });
    // 用后端返回的工单替换列表中的对应项，保证状态/回复摘要与服务端一致
    const idx = feedbacks.value.findIndex((f) => f.id === updated.id);
    if (idx >= 0) feedbacks.value[idx] = updated;
    processVisible.value = false;
    processTarget.value = null;
    replyContent.value = "";
    showToast(t("feedback.processedToast"));
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : t("feedback.processFailed");
    showToast(msg);
  } finally {
    processLoading.value = false;
  }
}

/** ConfirmDialog 取消回调 */
function handleCancelProcess() {
  processTarget.value = null;
}

/** 类型标签文案映射 */
function typeLabel(type: FeedbackTicketType): string {
  switch (type) {
    case "FEEDBACK":
      return t("feedback.typeFeedback");
    case "SUGGESTION":
      return t("feedback.typeSuggestion");
    case "ACTIVITY_PROPOSAL":
      return t("feedback.typeActivityProposal");
    default:
      return type;
  }
}

/** 状态标签文案映射 */
function statusLabel(status: SubmissionStatus): string {
  switch (status) {
    case "SUBMITTED":
      return t("feedback.statusSubmitted");
    case "PROCESSING":
      return t("feedback.statusProcessing");
    case "REVIEWED":
      return t("feedback.statusReviewed");
    case "PLANNED":
      return t("feedback.statusPlanned");
    case "CONVERTED":
      return t("feedback.statusConverted");
    default:
      return status;
  }
}

/** 状态徽章 CSS class 后缀（用于颜色区分） */
function statusClass(status: SubmissionStatus): string {
  // 已处理/已转换 → success 色；处理中/已规划 → warning 色；已提交 → info 色
  if (status === "REVIEWED" || status === "CONVERTED") return "reviewed";
  if (status === "PROCESSING" || status === "PLANNED") return "processing";
  return "submitted";
}

/**
 * 格式化提交时间（统一走公共工具，跟随当前 i18n locale）。
 */
function formatDate(iso: string): string {
  return formatDateTime(iso);
}

onMounted(() => {
  void fetchTickets();
});

// 清理挂起的 toast 定时器，避免组件卸载后回调执行报错
onBeforeUnmount(() => {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
});
</script>

<template>
  <view class="feedback-page">
    <view class="page-header">
      <text class="page-title">{{ t("feedback.pageTitle") }}</text>
      <text class="page-subtitle">{{ t("feedback.subtitle") }}</text>
    </view>

    <!-- toast 增加 role=status aria-live 与手动关闭按钮 -->
    <view v-if="toastMessage" class="toast-message" role="status" aria-live="polite">
      <text>{{ toastMessage }}</text>
      <button class="toast-close" type="button" aria-label="Close" @click="closeToast">×</button>
    </view>

    <!-- 三态：错误 -->
    <view v-if="errorMsg" class="error-banner">
      <text class="error-banner__text">{{ errorMsg }}</text>
      <button class="error-banner__retry" @click="fetchTickets">{{ t("feedback.retryButton") }}</button>
    </view>

    <!-- 筛选工具栏（状态 / 类型；后端对空值视为不限制） -->
    <view class="toolbar">
      <label class="filter-label">
        <text class="filter-label__text">{{ t("feedback.filterStatus") }}</text>
        <select v-model="statusFilter" class="filter-select" @change="handleSearch">
          <option value="">{{ t("feedback.filterStatusAll") }}</option>
          <option
            v-for="opt in FEEDBACK_TICKET_STATUSES"
            :key="opt.value"
            :value="opt.value"
          >{{ t(opt.labelKey) }}</option>
        </select>
      </label>
      <label class="filter-label">
        <text class="filter-label__text">{{ t("common.all") }}</text>
        <select v-model="typeFilter" class="filter-select" @change="handleSearch">
          <option value="">{{ t("feedback.filterStatusAll") }}</option>
          <option
            v-for="opt in FEEDBACK_TICKET_TYPES"
            :key="opt.value"
            :value="opt.value"
          >{{ t(opt.labelKey) }}</option>
        </select>
      </label>
      <button class="ghost-button" @click="handleResetFilters">{{ t("common.reset") }}</button>
    </view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("feedback.columnId") }}</th>
            <th scope="col">{{ t("feedback.columnUser") }}</th>
            <th scope="col">{{ t("feedback.columnType") }}</th>
            <th scope="col">{{ t("feedback.columnTitle") }}</th>
            <th scope="col">{{ t("feedback.columnStatus") }}</th>
            <th scope="col">{{ t("feedback.columnLatestReply") }}</th>
            <th scope="col">{{ t("feedback.columnCreatedAt") }}</th>
            <th scope="col">{{ t("feedback.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <!-- 三态：加载中 -->
          <tr v-if="loading">
            <td colspan="8" class="empty-cell">{{ t("common.loading") }}</td>
          </tr>
          <!-- 三态：空数据 -->
          <tr v-else-if="feedbacks.length === 0">
            <td colspan="8" class="empty-cell">{{ t("feedback.noData") }}</td>
          </tr>
          <!-- 正常列表 -->
          <tr v-for="feedback in feedbacks" :key="feedback.id">
            <td>{{ feedback.id }}</td>
            <td>{{ feedback.userId }}</td>
            <td>
              <span class="type-badge" :class="`type-${feedback.type}`">
                {{ typeLabel(feedback.type) }}
              </span>
            </td>
            <td>{{ feedback.title }}</td>
            <td>
              <span class="status-badge" :class="`status-${statusClass(feedback.status)}`">
                {{ statusLabel(feedback.status) }}
              </span>
            </td>
            <td>{{ feedback.latestReplySummary || t("common.emptyPlaceholder") }}</td>
            <td>{{ t("feedback.submittedAt", { time: formatDate(feedback.submittedAt) }) }}</td>
            <td class="action-cell">
              <button class="action-button view" @click="handleView(feedback)">{{ t("feedback.actionView") }}</button>
              <!-- 只读角色 AUDITOR 隐藏写按钮（后端 POST /api/v1/admin/** 仅 ADMIN/SUPER_ADMIN） -->
              <button v-if="sessionStore.canWrite" class="action-button process" @click="handleProcess(feedback)">{{ t("feedback.actionProcess") }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <Pagination
      v-model:page="page"
      :total-pages="totalPages"
      :total="total"
      :page-size="pageSize"
      :disabled="loading"
      @change="handlePageChange"
    />

    <!-- 反馈详情弹窗 -->
    <view v-if="showDetailModal" class="modal-overlay" @click="showDetailModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ t("feedback.detailTitle") }}</text>
          <button class="modal-close" @click="showDetailModal = false">{{ t("feedback.closeButton") }}</button>
        </view>
        <view class="modal-body" v-if="detailFeedback">
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailId") }}</text>
            <text>{{ detailFeedback.id }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.columnUser") }}</text>
            <text>{{ detailFeedback.userId }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailType") }}</text>
            <text>{{ typeLabel(detailFeedback.type) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailLabelTitle") }}</text>
            <text>{{ detailFeedback.title }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailLabelStatus") }}</text>
            <text>{{ statusLabel(detailFeedback.status) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailLatestReply") }}</text>
            <text>{{ detailFeedback.latestReplySummary || "—" }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailSubmittedAt") }}</text>
            <text>{{ formatDate(detailFeedback.submittedAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 处理确认弹窗（支持自定义回复内容） -->
    <ConfirmDialog
      v-model:visible="processVisible"
      :title="t('feedback.processTitle')"
      :confirming="processLoading"
      @confirm="handleConfirmProcess"
      @cancel="handleCancelProcess"
    >
      <template #message>
        <text>{{ processTarget ? t('feedback.processConfirmMessage', { title: processTarget.title }) : '' }}</text>
        <view class="form-row">
          <text class="form-label">{{ t("feedback.replyLabel") }}</text>
          <textarea
            v-model="replyContent"
            class="form-textarea"
            rows="3"
            :maxlength="REMARK_MAX_LENGTH"
            :placeholder="t('feedback.replyPlaceholder')"
          />
        </view>
      </template>
    </ConfirmDialog>
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.feedback-page {
  max-width: 1200px;
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

.table-container {
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xl);
  overflow: hidden;
  box-shadow: var(--admin-shadow-sm);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  text-align: left;
  border-bottom: 1px solid var(--admin-color-border-light);
}

.data-table th {
  background: var(--admin-color-bg-subtle);
  font-size: var(--admin-font-md);
  font-weight: 600;
  color: var(--admin-color-text-tertiary);
  text-transform: uppercase;
}

.type-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.type-FEEDBACK {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.type-SUGGESTION {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.type-ACTIVITY_PROPOSAL {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.status-processing {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.status-reviewed {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-submitted {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.empty-cell {
  text-align: center;
  color: var(--admin-color-text-quaternary);
  padding: var(--admin-space-section) var(--admin-space-lg);
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--admin-space-md);
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
  padding: var(--admin-space-md) var(--admin-space-lg);
  border-radius: var(--admin-radius-lg);
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-lg);
}

.error-banner__retry {
  padding: var(--admin-space-xxs) var(--admin-space-md-lg);
  background: var(--admin-color-danger);
  color: var(--admin-color-bg-container);
  border: none;
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-md);
  cursor: pointer;
}

.action-cell {
  display: flex;
  gap: var(--admin-space-sm);
}

.action-button {
  border: none;
  border-radius: var(--admin-radius-sm);
  font-size: var(--admin-font-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.action-button.view {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.action-button.view:hover {
  background: var(--admin-color-info-softer);
}

.action-button.process {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.action-button.process:hover {
  background: var(--admin-color-success-softer);
}

.toast-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--admin-space-md);
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
  background: var(--admin-color-success-soft);
  border-left: 3px solid var(--admin-color-success);
  border-radius: var(--admin-radius-sm);
  color: var(--admin-color-success);
  font-size: var(--admin-font-md);
  margin-bottom: var(--admin-space-lg);
}

.toast-close {
  border: none;
  background: transparent;
  color: var(--admin-color-success);
  font-size: var(--admin-font-lg);
  line-height: 1;
  cursor: pointer;
  padding: var(--admin-space-xxs);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--admin-color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xl);
  padding: var(--admin-space-xxl);
  min-width: 420px;
  max-width: 90vw;
  box-shadow: var(--admin-shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--admin-space-xl);
  padding-bottom: var(--admin-space-md);
  border-bottom: 1px solid var(--admin-color-border-light);
}

.modal-title {
  font-size: var(--admin-font-xxl);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.modal-close {
  padding: var(--admin-space-xxs) var(--admin-space-md-lg);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-color-bg-container);
  color: var(--admin-color-text-tertiary);
  font-size: var(--admin-font-md);
  cursor: pointer;
}

.modal-close:hover {
  background: var(--admin-color-bg-hover);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-md);
}

.detail-row {
  display: flex;
  gap: var(--admin-space-sm);
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-primary);
}

.detail-label {
  font-weight: 600;
  color: var(--admin-color-text-tertiary);
  min-width: 80px;
}

/* 筛选栏内的字段标签（工具栏容器 .toolbar / .filter-select / .ghost-button 复用 admin-common.css） */
.filter-label {
  display: flex;
  align-items: center;
  gap: var(--admin-space-sm);
}

.filter-label__text {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-tertiary);
}

/* 处理弹窗内的自定义回复输入 */
.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-xxs);
  margin-top: var(--admin-space-md);
}

.form-label {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-tertiary);
}

.form-textarea {
  padding: var(--admin-space-md-sm) var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-lg);
  resize: vertical;
  font-family: inherit;
}
</style>
