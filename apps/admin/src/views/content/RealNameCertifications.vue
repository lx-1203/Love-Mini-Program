<script setup lang="ts">
/**
 * Admin 实名认证审核视图（B1-2）。
 *
 * 对应后端 com.campuslove.api.admin.AdminRealNameController：
 * - GET  /api/v1/admin/real-name-certifications?status=&page=&size=（列表，支持状态筛选 + 分页）
 * - POST /api/v1/admin/real-name-certifications/{id}/review（审核：通过/拒绝）
 *
 * 交互：状态筛选 + 列表；「查看」弹出详情（姓名/脱敏身份证号/正反面图片/审核信息）；
 * 「通过 / 拒绝」经 ConfirmDialog 二次确认后调用审核接口。
 */
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  listRealNameCertifications,
  reviewRealNameCertification,
  type RealNameCertificationView,
} from "@/api/real-name-certifications";
import { ApiError } from "@/api/http";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import ErrorState from "@/components/ErrorState.vue";
import { formatDateTime } from "@/utils/format";

const { t } = useI18n();

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
type ReviewAction = "APPROVED" | "REJECTED";

const certifications = ref<RealNameCertificationView[]>([]);
const loading = ref(false);
const error = ref("");

/** 状态筛选（默认待审核，与后端默认值一致） */
const statusFilter = ref<StatusFilter>("PENDING");

/** 详情弹窗状态 */
const detailVisible = ref(false);
const detailCert = ref<RealNameCertificationView | null>(null);

/** 审核确认弹窗状态 */
const confirmVisible = ref(false);
const confirmAction = ref<ReviewAction>("APPROVED");
const confirmTarget = ref<RealNameCertificationView | null>(null);
const reviewing = ref(false);

/**
 * 加载实名认证列表（按当前状态筛选）。
 */
async function fetchCertifications() {
  loading.value = true;
  error.value = "";
  try {
    certifications.value =
      (await listRealNameCertifications(statusFilter.value)) || [];
  } catch (err: unknown) {
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("realNameCertifications.loadFailed");
    certifications.value = [];
  } finally {
    loading.value = false;
  }
}

/** 状态筛选变更：重置筛选条件并重新加载 */
function handleFilterChange() {
  fetchCertifications();
}

/** 打开详情弹窗 */
function handleView(cert: RealNameCertificationView) {
  detailCert.value = cert;
  detailVisible.value = true;
}

function closeDetail() {
  detailVisible.value = false;
  detailCert.value = null;
}

/** 点击通过：打开确认弹窗 */
function handleApproveClick(cert: RealNameCertificationView) {
  confirmAction.value = "APPROVED";
  confirmTarget.value = cert;
  confirmVisible.value = true;
}

/** 点击拒绝：打开确认弹窗 */
function handleRejectClick(cert: RealNameCertificationView) {
  confirmAction.value = "REJECTED";
  confirmTarget.value = cert;
  confirmVisible.value = true;
}

/** ConfirmDialog 确认回调：执行通过/拒绝审核 */
async function handleConfirmReview() {
  const target = confirmTarget.value;
  if (!target || reviewing.value) return;
  reviewing.value = true;
  error.value = "";
  try {
    await reviewRealNameCertification(target.id, { status: confirmAction.value });
    confirmVisible.value = false;
    confirmTarget.value = null;
    await fetchCertifications();
  } catch (err: unknown) {
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : confirmAction.value === "APPROVED"
            ? t("realNameCertifications.approveFailed")
            : t("realNameCertifications.rejectFailed");
  } finally {
    reviewing.value = false;
  }
}

/** ConfirmDialog 取消回调 */
function handleCancelReview() {
  confirmTarget.value = null;
  reviewing.value = false;
}

/** 状态 → i18n 文案 */
function statusLabel(status: RealNameCertificationView["status"]): string {
  switch (status) {
    case "PENDING":
      return t("realNameCertifications.statusPending");
    case "APPROVED":
      return t("realNameCertifications.statusApproved");
    case "REJECTED":
      return t("realNameCertifications.statusRejected");
    default:
      return status;
  }
}

/** 状态 → 徽章 class */
function statusBadgeClass(status: RealNameCertificationView["status"]): string {
  switch (status) {
    case "APPROVED":
      return "status-approved";
    case "REJECTED":
      return "status-rejected";
    default:
      return "status-pending";
  }
}

onMounted(() => {
  fetchCertifications();
});
</script>

<template>
  <view class="cert-page">
    <view class="page-header">
      <text class="page-title">{{ t("realNameCertifications.title") }}</text>
      <text class="page-subtitle">{{ t("realNameCertifications.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <select v-model="statusFilter" class="filter-select" @change="handleFilterChange">
        <option value="PENDING">{{ t("realNameCertifications.filterPending") }}</option>
        <option value="ALL">{{ t("realNameCertifications.filterAll") }}</option>
        <option value="APPROVED">{{ t("realNameCertifications.filterApproved") }}</option>
        <option value="REJECTED">{{ t("realNameCertifications.filterRejected") }}</option>
      </select>
    </view>

    <ErrorState v-if="error" :message="error" @retry="fetchCertifications" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("realNameCertifications.columnId") }}</th>
            <th scope="col">{{ t("realNameCertifications.columnUserId") }}</th>
            <th scope="col">{{ t("realNameCertifications.columnName") }}</th>
            <th scope="col">{{ t("realNameCertifications.columnStatus") }}</th>
            <th scope="col">{{ t("realNameCertifications.columnSubmittedAt") }}</th>
            <th scope="col">{{ t("realNameCertifications.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="certifications.length === 0">
            <td colspan="6" class="empty-row">{{ t("realNameCertifications.noData") }}</td>
          </tr>
          <tr v-for="cert in certifications" :key="cert.id">
            <td>{{ cert.id }}</td>
            <td>{{ cert.userId }}</td>
            <td>{{ cert.userName || t("common.emptyPlaceholder") }}</td>
            <td>
              <span class="status-badge" :class="statusBadgeClass(cert.status)">
                {{ statusLabel(cert.status) }}
              </span>
            </td>
            <td class="time-cell">{{ formatDateTime(cert.submittedAt) }}</td>
            <td class="action-cell">
              <button class="action-button view" @click="handleView(cert)">
                {{ t("realNameCertifications.actionView") }}
              </button>
              <button
                v-if="cert.status === 'PENDING'"
                class="action-button enable"
                @click="handleApproveClick(cert)"
              >{{ t("realNameCertifications.actionApprove") }}</button>
              <button
                v-if="cert.status === 'PENDING'"
                class="action-button delete"
                @click="handleRejectClick(cert)"
              >{{ t("realNameCertifications.actionReject") }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 审核确认弹窗 -->
    <ConfirmDialog
      v-model:visible="confirmVisible"
      :title="confirmAction === 'APPROVED' ? t('realNameCertifications.approveTitle') : t('realNameCertifications.rejectTitle')"
      :message="confirmTarget ? (confirmAction === 'APPROVED' ? t('realNameCertifications.approveConfirmMessage', { userName: confirmTarget.userName }) : t('realNameCertifications.rejectConfirmMessage', { userName: confirmTarget.userName })) : ''"
      :danger="confirmAction === 'REJECTED'"
      :confirming="reviewing"
      @confirm="handleConfirmReview"
      @cancel="handleCancelReview"
    />

    <!-- 实名认证详情弹窗 -->
    <view v-if="detailVisible" class="modal-mask" @click.self="closeDetail">
      <view class="modal detail-modal">
        <text class="modal-title">{{ t("realNameCertifications.detailTitle") }}</text>
        <view v-if="detailCert" class="detail-body">
          <view class="detail-row">
            <text class="detail-label">{{ t("realNameCertifications.detailUser") }}:</text>
            <text>{{ detailCert.userId }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("realNameCertifications.detailName") }}:</text>
            <text>{{ detailCert.userName || t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("realNameCertifications.detailIdCard") }}:</text>
            <text>{{ detailCert.idCardNo || t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("realNameCertifications.detailIdCardFront") }}:</text>
            <a
              v-if="detailCert.idCardFrontUrl"
              :href="detailCert.idCardFrontUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-link"
            >{{ t("realNameCertifications.viewImage") }}</a>
            <text v-else>{{ t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("realNameCertifications.detailIdCardBack") }}:</text>
            <a
              v-if="detailCert.idCardBackUrl"
              :href="detailCert.idCardBackUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-link"
            >{{ t("realNameCertifications.viewImage") }}</a>
            <text v-else>{{ t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("realNameCertifications.detailStatus") }}:</text>
            <text>{{ statusLabel(detailCert.status) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("realNameCertifications.detailSubmittedAt") }}:</text>
            <text>{{ formatDateTime(detailCert.submittedAt) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("realNameCertifications.detailReviewedAt") }}:</text>
            <text>{{ formatDateTime(detailCert.reviewedAt) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("realNameCertifications.detailReviewComment") }}:</text>
            <text>{{ detailCert.reviewComment || t("realNameCertifications.noReviewComment") }}</text>
          </view>
        </view>
        <view class="modal-actions">
          <button class="ghost-button" @click="closeDetail">{{ t("common.close") }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "@/styles/admin-common.css";

.cert-page {
  max-width: 1400px;
}

.action-button.view {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.action-button.view:hover {
  background: var(--admin-color-info-softer);
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

/* 实名认证状态徽章（复用 .status-badge 基础样式） */
.status-pending {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.status-approved {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-rejected {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.detail-modal {
  width: 440px;
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

.detail-link {
  color: var(--admin-color-info);
  text-decoration: none;
}

.detail-link:hover {
  text-decoration: underline;
}
</style>
