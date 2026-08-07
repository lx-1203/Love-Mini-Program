<script setup lang="ts">
/**
 * Admin 校园认证审核视图（复制自旧后台 apps/admin，适配 admin-v2 目录结构）。
 *
 * 对应后端 com.campuslove.api.admin.AdminCertificationController：
 * - GET  /api/v1/admin/certifications?status=   （列表，支持状态筛选，全量返回无分页）
 * - POST /api/v1/admin/certifications/{id}/review（审核：通过/拒绝）
 *
 * 交互：状态筛选 + 列表；「查看」弹出详情（学校/专业/学生证图片/审核信息）；
 * 「通过 / 拒绝」经 ConfirmDialog 二次确认后调用审核接口。
 */
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  listCertifications,
  reviewCertification,
  type CertificationView,
} from "@/api/certifications";
import { ApiError } from "@/api/http";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import ErrorState from "@/components/ErrorState.vue";
import { formatDateTime } from "@/utils/format";

const { t } = useI18n();

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
type ReviewAction = "APPROVED" | "REJECTED";

const certifications = ref<CertificationView[]>([]);
const loading = ref(false);
const error = ref("");

/** 状态筛选（默认待审核，与后端默认值一致） */
const statusFilter = ref<StatusFilter>("PENDING");

/** 详情弹窗状态 */
const detailVisible = ref(false);
const detailCert = ref<CertificationView | null>(null);

/** 审核确认弹窗状态 */
const confirmVisible = ref(false);
const confirmAction = ref<ReviewAction>("APPROVED");
const confirmTarget = ref<CertificationView | null>(null);
const reviewing = ref(false);

/**
 * 加载认证列表（按当前状态筛选）。
 */
async function fetchCertifications() {
  loading.value = true;
  error.value = "";
  try {
    certifications.value = (await listCertifications(statusFilter.value)) || [];
  } catch (err: unknown) {
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error && err.message
          ? err.message
          : t("certifications.loadFailed");
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
function handleView(cert: CertificationView) {
  detailCert.value = cert;
  detailVisible.value = true;
}

function closeDetail() {
  detailVisible.value = false;
  detailCert.value = null;
}

/** 点击通过：打开确认弹窗 */
function handleApproveClick(cert: CertificationView) {
  confirmAction.value = "APPROVED";
  confirmTarget.value = cert;
  confirmVisible.value = true;
}

/** 点击拒绝：打开确认弹窗 */
function handleRejectClick(cert: CertificationView) {
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
    await reviewCertification(target.id, { status: confirmAction.value });
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
            ? t("certifications.approveFailed")
            : t("certifications.rejectFailed");
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
function statusLabel(status: CertificationView["status"]): string {
  switch (status) {
    case "PENDING":
      return t("certifications.statusPending");
    case "APPROVED":
      return t("certifications.statusApproved");
    case "REJECTED":
      return t("certifications.statusRejected");
    default:
      return status;
  }
}

/** 状态 → 徽章 class */
function statusBadgeClass(status: CertificationView["status"]): string {
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
      <text class="page-title">{{ t("certifications.title") }}</text>
      <text class="page-subtitle">{{ t("certifications.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <select v-model="statusFilter" class="filter-select" @change="handleFilterChange">
        <option value="PENDING">{{ t("certifications.filterPending") }}</option>
        <option value="ALL">{{ t("certifications.filterAll") }}</option>
        <option value="APPROVED">{{ t("certifications.filterApproved") }}</option>
        <option value="REJECTED">{{ t("certifications.filterRejected") }}</option>
      </select>
    </view>

    <ErrorState v-if="error" :message="error" @retry="fetchCertifications" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("certifications.columnId") }}</th>
            <th scope="col">{{ t("certifications.columnUserId") }}</th>
            <th scope="col">{{ t("certifications.columnSchool") }}</th>
            <th scope="col">{{ t("certifications.columnMajor") }}</th>
            <th scope="col">{{ t("certifications.columnStatus") }}</th>
            <th scope="col">{{ t("certifications.columnSubmittedAt") }}</th>
            <th scope="col">{{ t("certifications.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="certifications.length === 0">
            <td colspan="7" class="empty-row">{{ t("certifications.noData") }}</td>
          </tr>
          <tr v-for="cert in certifications" :key="cert.id">
            <td>{{ cert.id }}</td>
            <td>{{ cert.userId }}</td>
            <td>{{ cert.schoolName || t("common.emptyPlaceholder") }}</td>
            <td>{{ cert.major || t("common.emptyPlaceholder") }}</td>
            <td>
              <span class="status-badge" :class="statusBadgeClass(cert.status)">
                {{ statusLabel(cert.status) }}
              </span>
            </td>
            <td class="time-cell">{{ formatDateTime(cert.submittedAt) }}</td>
            <td class="action-cell">
              <button class="action-button view" @click="handleView(cert)">
                {{ t("certifications.actionView") }}
              </button>
              <button
                v-if="cert.status === 'PENDING'"
                class="action-button enable"
                @click="handleApproveClick(cert)"
              >{{ t("certifications.actionApprove") }}</button>
              <button
                v-if="cert.status === 'PENDING'"
                class="action-button delete"
                @click="handleRejectClick(cert)"
              >{{ t("certifications.actionReject") }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 审核确认弹窗 -->
    <ConfirmDialog
      v-model:visible="confirmVisible"
      :title="confirmAction === 'APPROVED' ? t('certifications.approveTitle') : t('certifications.rejectTitle')"
      :message="confirmTarget ? (confirmAction === 'APPROVED' ? t('certifications.approveConfirmMessage', { userId: confirmTarget.userId }) : t('certifications.rejectConfirmMessage', { userId: confirmTarget.userId })) : ''"
      :danger="confirmAction === 'REJECTED'"
      :confirming="reviewing"
      @confirm="handleConfirmReview"
      @cancel="handleCancelReview"
    />

    <!-- 认证详情弹窗 -->
    <view v-if="detailVisible" class="modal-mask" @click.self="closeDetail">
      <view class="modal detail-modal">
        <text class="modal-title">{{ t("certifications.detailTitle") }}</text>
        <view v-if="detailCert" class="detail-body">
          <view class="detail-row">
            <text class="detail-label">{{ t("certifications.detailUser") }}:</text>
            <text>{{ detailCert.userId }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("certifications.detailSchool") }}:</text>
            <text>{{ detailCert.schoolName || t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("certifications.detailMajor") }}:</text>
            <text>{{ detailCert.major || t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("certifications.detailStudentIdCard") }}:</text>
            <a
              v-if="detailCert.studentIdCardUrl"
              :href="detailCert.studentIdCardUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="detail-link"
            >{{ t("certifications.viewImage") }}</a>
            <text v-else>{{ t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("certifications.detailStatus") }}:</text>
            <text>{{ statusLabel(detailCert.status) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("certifications.detailSubmittedAt") }}:</text>
            <text>{{ formatDateTime(detailCert.submittedAt) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("certifications.detailReviewedAt") }}:</text>
            <text>{{ formatDateTime(detailCert.reviewedAt) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("certifications.detailReviewComment") }}:</text>
            <text>{{ detailCert.reviewComment || t("certifications.noReviewComment") }}</text>
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

/* 认证状态徽章（复用 .status-badge 基础样式） */
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
