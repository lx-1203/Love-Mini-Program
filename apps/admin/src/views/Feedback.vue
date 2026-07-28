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

/**
 * 标记反馈为已处理。
 *
 * 当前后端 listAdminFeedback 不暴露写接口（POST convert 仅用于活动提案），
 * 因此这里仅在前端展示层更新状态为 REVIEWED，待后端补齐 PUT /admin/feedback/{id} 后切换为真实调用。
 * 错误分支使用具体类型捕获，避免空 catch。
 *
 * Task 3.7.3：替换原生 confirm() 为 ConfirmDialog 组件。
 */
function handleProcess(feedback: FeedbackRecordView) {
  processTarget.value = feedback;
  processVisible.value = true;
}

/** Task 3.7.3：ConfirmDialog 确认回调，执行标记已处理操作 */
function handleConfirmProcess() {
  const target = processTarget.value;
  if (!target) return;
  target.status = "REVIEWED";
  processVisible.value = false;
  processTarget.value = null;
  showToast(t("feedback.processedToast"));
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
      :confirming="false"
      @confirm="handleConfirmProcess"
      @cancel="handleCancelProcess"
    />
  </view>
</template>

<style scoped>
.feedback-page {
  max-width: 1200px;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.page-subtitle {
  display: block;
  font-size: 14px;
  color: #999;
}

.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.data-table th {
  background: #f9f9f9;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.type-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.type-FEEDBACK {
  background: #fff7e6;
  color: #fa8c16;
}

.type-SUGGESTION {
  background: #e6f7ff;
  color: #1890ff;
}

.type-ACTIVITY_PROPOSAL {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-processing {
  background: #fff7e6;
  color: #fa8c16;
}

.status-reviewed {
  background: #f6ffed;
  color: #52c41a;
}

.status-submitted {
  background: #e6f7ff;
  color: #1890ff;
}

.empty-cell {
  text-align: center;
  color: #999;
  padding: 40px 16px;
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fff1f0;
  color: #f5222d;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.error-banner__retry {
  padding: 6px 14px;
  background: #f5222d;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.action-cell {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button.view {
  background: #e6f7ff;
  color: #1890ff;
}

.action-button.view:hover {
  background: #bae7ff;
}

.action-button.process {
  background: #f6ffed;
  color: #52c41a;
}

.action-button.process:hover {
  background: #d9f7be;
}

.toast-message {
  padding: 10px 16px;
  background: #f6ffed;
  border-left: 3px solid #52c41a;
  border-radius: 4px;
  color: #52c41a;
  font-size: 13px;
  margin-bottom: 16px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  min-width: 420px;
  max-width: 90vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  padding: 6px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #666;
  font-size: 13px;
  cursor: pointer;
}

.modal-close:hover {
  background: #f5f5f5;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  gap: 8px;
  font-size: 14px;
  color: #333;
}

.detail-label {
  font-weight: 600;
  color: #666;
  min-width: 80px;
}
</style>
