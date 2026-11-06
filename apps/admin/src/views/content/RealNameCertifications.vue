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
import Pagination from "@/components/Pagination.vue";
import { formatDateTime } from "@/utils/format";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";
import { useSessionStore } from "../../stores/session";

const { t } = useI18n();
const sessionStore = useSessionStore();

/**
 * MP-R7-ADMIN-IMG（2026-09-15）：媒体鉴权代理端点要求认证，原直链
 * <a href target=_blank> 新开页不带凭据 → 401 JSON，管理员看不到身份证照片。
 * 改为 fetch → blob → objectURL 新窗口展示。
 * R14-5（audit-r14 批5，2026-11-05）：认证走 admin_session HttpOnly Cookie
 * （同站 fetch 自动携带），不再读 token / 发 Authorization 头。
 */
async function viewImage(url: string): Promise<void> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (e) {
    console.error(`${t("realNameCertifications.viewImage")}: ${(e as Error).message}`);
  }
}

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
type ReviewAction = "APPROVED" | "REJECTED";

const certifications = ref<RealNameCertificationView[]>([]);
const loading = ref(false);
const error = ref("");

/** 状态筛选（默认待审核，与后端默认值一致） */
const statusFilter = ref<StatusFilter>("PENDING");

/**
 * 分页状态：后端 AdminRealNameController 列表为 0-based page（默认 size=20，上限 200）。
 * 端点直出列表（无 total 包络）：totalPages 按 has-more 语义估算——满页返回时假定还有下一页，
 * 「共 N 条」总数无从得知，故不向 Pagination 传 total（组件自动隐藏该段）。
 */
const page = ref(0);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const totalPages = ref(1);
/** 每页大小可选项（上限对齐后端 @Max(200)） */
const pageSizeOptions = [20, 50, 100, 200];

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
    const list =
      (await listRealNameCertifications(statusFilter.value, page.value, pageSize.value)) || [];
    certifications.value = list;
    // has-more 语义：满页返回 ⇒ 假定还有下一页；不满页 ⇒ 当前即最后一页
    totalPages.value = list.length === pageSize.value ? page.value + 2 : page.value + 1;
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

/** 状态筛选变更：回到第一页并按新筛选重新加载 */
function handleFilterChange() {
  page.value = 0;
  fetchCertifications();
}

/** 页码切换（Pagination 已通过 v-model:page 同步 page，这里只负责拉数据） */
function handlePageChange() {
  fetchCertifications();
}

/** 每页大小切换：回到第一页再拉取 */
function handlePageSizeChange() {
  page.value = 0;
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
  if (!sessionStore.canWrite) return;
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
      <select
        v-model="pageSize"
        class="filter-select"
        :aria-label="t('common.pageSize', { n: pageSize })"
        @change="handlePageSizeChange"
      >
        <option v-for="n in pageSizeOptions" :key="n" :value="n">{{ n }}</option>
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
                v-if="cert.status === 'PENDING' && sessionStore.canWrite"
                class="action-button enable"
                @click="handleApproveClick(cert)"
              >{{ t("realNameCertifications.actionApprove") }}</button>
              <button
                v-if="cert.status === 'PENDING' && sessionStore.canWrite"
                class="action-button delete"
                @click="handleRejectClick(cert)"
              >{{ t("realNameCertifications.actionReject") }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <Pagination
      v-model:page="page"
      :total-pages="totalPages"
      :page-size="pageSize"
      :page-base="0"
      :disabled="loading"
      @change="handlePageChange"
    />

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
              href="#"
              class="detail-link"
              @click.prevent="viewImage(detailCert.idCardFrontUrl!)"
            >{{ t("realNameCertifications.viewImage") }}</a>
            <text v-else>{{ t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("realNameCertifications.detailIdCardBack") }}:</text>
            <a
              v-if="detailCert.idCardBackUrl"
              href="#"
              class="detail-link"
              @click.prevent="viewImage(detailCert.idCardBackUrl!)"
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
@import "../../styles/admin-common.css";

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
