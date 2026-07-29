<script setup lang="ts">
/**
 * 反馈管理页（SubTask 1.3.1 / 1.3.3 / 3.3.2 i18n 化）。
 *
 * SubTask 1.3.1：移除 mockFeedback 假数据，改为通过 listAdminFeedback() 调用
 *   GET /api/admin/feedback 拉取真实反馈列表。
 *
 * SubTask 1.3.3：补充 loading / empty / error 三态处理：
 *  - loading：首次加载时显示骨架行，避免空白闪烁
 *  - empty：列表为空时给出明确文案，区分"无数据"与"加载失败"
 *  - error：网络或后端异常时显示错误条与"重试"按钮
 *
 * SubTask 3.3.2：标题/列头/按钮/弹窗文案全部走 i18n key（feedback.*）
 *  - 类型/状态标签通过 feedback.typeFeedback / feedback.statusSubmitted 等映射
 *  - 错误回退通过 feedback.loadFailed 表达
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  listAdminFeedback,
  replyFeedback,
  type FeedbackRecordView,
  type FeedbackTicketType,
  type SubmissionStatus,
} from "../api/feedback";
import { ApiError } from "../api/http";
// Task 3.7.3：接入共享 ConfirmDialog 组件
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const feedbacks = ref<FeedbackRecordView[]>([]);
const loading = ref(false);
const errorMsg = ref("");

const showDetailModal = ref(false);
const detailFeedback = ref<FeedbackRecordView | null>(null);

const toastMessage = ref("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(msg: string) {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
    toastTimer = null;
  }, 3000);
}

/**
 * 拉取反馈列表。
 * 失败时设置 errorMsg，清空列表，方便模板渲染 error 三态。
 */
async function fetchFeedbacks() {
  loading.value = true;
  errorMsg.value = "";
  try {
    feedbacks.value = await listAdminFeedback();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("feedback.loadFailed");
    feedbacks.value = [];
  } finally {
    loading.value = false;
  }
}

function handleView(feedback: FeedbackRecordView) {
  detailFeedback.value = feedback;
  showDetailModal.value = true;
}

/**
 * 标记反馈为已处理。
 *
 * 当前后端 listAdminFeedback 不暴露写接口（POST convert 仅用于活动提案），
 * 因此这里仅在前端展示层更新状态为 REVIEWED，待后端补齐 PUT /admin/feedback/{id} 后切换为真实调用。
 * 错误分支使用具体类型捕获，避免空 catch。
 */
// Task 3.7.3：处理确认弹窗状态
const processVisible = ref(false);
const processTarget = ref<FeedbackRecordView | null>(null);
/** Task 13：回复接口调用中状态，传给 ConfirmDialog 的 confirming prop 禁用按钮 */
const processLoading = ref(false);

/**
 * 标记反馈为已处理。
 *
 * Task 13：通过 replyFeedback() 调用 PUT /api/v1/admin/feedback/{id}/reply，
 * 将反馈状态推进至 REVIEWED。后端如未实现该端点会返回 404/405，
 * 此时弹出错误 toast，避免静默失败误导运营人员。
 *
 * Task 3.7.3：替换原生 confirm() 为 ConfirmDialog 组件。
 */
function handleProcess(feedback: FeedbackRecordView) {
  processTarget.value = feedback;
  processVisible.value = true;
}

/** Task 13：ConfirmDialog 确认回调，调用真实回复接口 */
async function handleConfirmProcess() {
  const target = processTarget.value;
  if (!target) return;
  processLoading.value = true;
  try {
    const updated = await replyFeedback(target.id, t("feedback.defaultReplyContent"));
    // 用后端返回的记录替换列表中的对应项，保证状态/回复摘要与服务端一致
    const idx = feedbacks.value.findIndex((f) => f.id === updated.id);
    if (idx >= 0) feedbacks.value[idx] = updated;
    processVisible.value = false;
    processTarget.value = null;
    showToast(t("feedback.processedToast"));
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : t("feedback.processFailed");
    showToast(msg);
  } finally {
    processLoading.value = false;
  }
}

/** Task 3.7.3：ConfirmDialog 取消回调 */
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

onMounted(() => {
  void fetchFeedbacks();
});

// SubTask 1.5.2：清理挂起的 toast 定时器，避免组件卸载后回调执行报错
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

    <view v-if="toastMessage" class="toast-message">{{ toastMessage }}</view>

    <!-- 三态：错误 -->
    <view v-if="errorMsg" class="error-banner">
      <text class="error-banner__text">{{ errorMsg }}</text>
      <button class="error-banner__retry" @click="fetchFeedbacks">{{ t("feedback.retryButton") }}</button>
    </view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("feedback.columnId") }}</th>
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
            <td colspan="7" class="empty-cell">{{ t("common.loading") }}</td>
          </tr>
          <!-- 三态：空数据 -->
          <tr v-else-if="feedbacks.length === 0">
            <td colspan="7" class="empty-cell">{{ t("feedback.noData") }}</td>
          </tr>
          <!-- 正常列表 -->
          <tr v-for="feedback in feedbacks" :key="feedback.id">
            <td>{{ feedback.id }}</td>
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
            <td>{{ feedback.latestReplySummary || "—" }}</td>
            <td>{{ feedback.submittedAt }}</td>
            <td class="action-cell">
              <button class="action-button view" @click="handleView(feedback)">{{ t("feedback.actionView") }}</button>
              <button class="action-button process" @click="handleProcess(feedback)">{{ t("feedback.actionProcess") }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 反馈详情弹窗 -->
    <view v-if="showDetailModal" class="modal-overlay" @click="showDetailModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ t("feedback.detailTitle") }}</text>
          <button class="modal-close" @click="showDetailModal = false">{{ t("feedback.closeButton") }}</button>
        </view>
        <view class="modal-body" v-if="detailFeedback">
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailId") }}：</text>
            <text>{{ detailFeedback.id }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailType") }}：</text>
            <text>{{ typeLabel(detailFeedback.type) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailLabelTitle") }}：</text>
            <text>{{ detailFeedback.title }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailLabelStatus") }}：</text>
            <text>{{ statusLabel(detailFeedback.status) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailLatestReply") }}：</text>
            <text>{{ detailFeedback.latestReplySummary || "—" }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("feedback.detailSubmittedAt") }}：</text>
            <text>{{ detailFeedback.submittedAt }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Task 3.7.3：处理确认弹窗（替代原生 confirm） -->
    <ConfirmDialog
      v-model:visible="processVisible"
      :title="t('feedback.processTitle')"
      :message="processTarget ? t('feedback.processConfirmMessage', { title: processTarget.title }) : ''"
      :confirming="processLoading"
      @confirm="handleConfirmProcess"
      @cancel="handleCancelProcess"
    />
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

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
  padding: var(--admin-space-lg);
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
  padding: var(--admin-space-xxs) var(--admin-space-md);
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
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
  background: var(--admin-color-success-soft);
  border-left: 3px solid var(--admin-color-success);
  border-radius: var(--admin-radius-sm);
  color: var(--admin-color-success);
  font-size: var(--admin-font-md);
  margin-bottom: var(--admin-space-lg);
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
</style>
