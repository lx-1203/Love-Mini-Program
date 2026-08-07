<script setup lang="ts">
/**
 * Admin 帖子管理视图（SubTask 3.3.2 i18n 化）。
 *
 * 改造点：
 * - 标题/副标题/列头/筛选下拉/按钮/弹窗文案全部走 i18n key（posts.*）
 * - ConfirmDialog 的 title/message 通过 posts.deleteTitle / posts.deleteConfirmMessage 插值生成
 * - 状态/审核状态标签通过 posts.statusActive / posts.auditStatusPending 等映射
 * - 错误回退通过 posts.loadFailed / posts.auditFailed / posts.deleteFailed 表达
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  listPosts,
  auditPost,
  deletePost,
  type AdminPostSummary,
  type AdminPostListQuery,
} from "../api/posts";
import { ApiError } from "../api/http";
// Task 3.7.2 / 3.7.3：接入共享 Pagination 与 ConfirmDialog 组件
import Pagination from "../components/Pagination.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
// infra R2-00404：错误态接入共享 ErrorState 组件（原无重试入口）
import ErrorState from "../components/ErrorState.vue";
import { useI18n } from "vue-i18n";
// Task 45：统一日志入口
import { logger } from "../utils/logger";
import { formatDateTime } from "../utils/format";
import { DEFAULT_PAGE_SIZE, REMARK_MAX_LENGTH } from "../utils/constants";

const { t } = useI18n();

const posts = ref<AdminPostSummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");

const auditStatusFilter = ref<"" | "pending" | "approved" | "rejected">("");
const statusFilter = ref<"" | "active" | "deleted" | "hidden">("");
const categoryFilter = ref("");

const page = ref(1);
// infra R2-00405：pageSize 魔法数字收敛为公共常量
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

const auditingPost = ref<AdminPostSummary | null>(null);
const auditDecision = ref<"approved" | "rejected">("approved");
const auditRemark = ref("");
// 防重复提交：审核提交中状态
const savingAudit = ref(false);

// Task 3.7.3：删除确认弹窗状态
const deleteVisible = ref(false);
const deleteTarget = ref<AdminPostSummary | null>(null);
const deleting = ref(false);

// infra R2-00406：搜索/筛选防抖 + 请求竞态防护（同 Users.vue 方案）
let reqSeq = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function fetchPosts() {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const query: AdminPostListQuery = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (auditStatusFilter.value) query.auditStatus = auditStatusFilter.value;
    if (statusFilter.value) query.status = statusFilter.value;
    if (categoryFilter.value) query.category = categoryFilter.value;

    const result = await listPosts(query);
    if (seq !== reqSeq) return; // 丢弃过期响应
    posts.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("posts.loadFailed");
    posts.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** infra R2-00406：筛选变更防抖（400ms） */
function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    page.value = 1;
    fetchPosts();
  }, 400);
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  page.value = 1;
  fetchPosts();
}

// infra R2-00407：handleResetFilters 与 handleSearch 合并（原重复实现）
function handleResetFilters() {
  auditStatusFilter.value = "";
  statusFilter.value = "";
  categoryFilter.value = "";
  handleSearch();
}

function handleAudit(post: AdminPostSummary) {
  auditingPost.value = post;
  auditDecision.value = "approved";
  auditRemark.value = "";
}

function handleCancelAudit() {
  auditingPost.value = null;
  auditRemark.value = "";
}

/** infra R2-00410：审核弹窗 Esc 关闭（键盘流操作） */
function onAuditKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && auditingPost.value && !savingAudit.value) {
    handleCancelAudit();
  }
}

/** infra R2-00406：组件卸载时清理防抖定时器 */
onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});

async function handleSaveAudit() {
  if (!auditingPost.value || savingAudit.value) return; // 防重复提交
  savingAudit.value = true;
  try {
    await auditPost(auditingPost.value.id, {
      decision: auditDecision.value,
      remark: auditRemark.value || undefined,
    });
    auditingPost.value = null;
    auditRemark.value = "";
    await fetchPosts();
  } catch (err) {
    // Task 45：异常通过 logger 记录，便于线上问题定位
    logger.error("[Posts] audit post failed", err);
    errorMsg.value = err instanceof ApiError ? err.message : t("posts.auditFailed");
  } finally {
    savingAudit.value = false;
  }
}

async function handleDelete(post: AdminPostSummary) {
  // Task 3.7.3：替换原生 confirm() 为 ConfirmDialog 组件
  deleteTarget.value = post;
  deleteVisible.value = true;
}

/**
 * Task 3.7.3：ConfirmDialog 确认回调，执行删除操作。
 */
async function handleConfirmDelete() {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;

  deleting.value = true;
  try {
    await deletePost(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    await fetchPosts();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("posts.deleteFailed");
  } finally {
    deleting.value = false;
  }
}

/** Task 3.7.3：ConfirmDialog 取消回调 */
function handleCancelDelete() {
  deleteTarget.value = null;
  deleting.value = false;
}

/**
 * Task 3.7.2：分页变更回调（由 Pagination 组件触发）。
 */
function handlePageChange() {
  fetchPosts();
}

function formatDate(iso: string | null): string {
  // infra R2-00408：统一走 utils/format 公共工具
  return formatDateTime(iso);
}

function auditStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return t("posts.auditStatusPending");
    case "approved":
      return t("posts.auditStatusApproved");
    case "rejected":
      return t("posts.auditStatusRejected");
    default:
      return status;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return t("posts.statusActive");
    case "deleted":
      return t("posts.statusDeleted");
    case "hidden":
      return t("posts.statusHidden");
    default:
      return status;
  }
}

/** 分类 i18n 映射（参照 auditStatusLabel/statusLabel 的映射方式） */
function categoryLabel(category: string): string {
  switch (category) {
    case "interest":
      return t("posts.categoryInterest");
    case "sincere":
      return t("posts.categorySincere");
    case "hometown":
      return t("posts.categoryHometown");
    case "anonymous":
      return t("posts.categoryAnonymous");
    case "campus":
      return t("posts.categoryCampus");
    case "latest":
      return t("posts.categoryLatest");
    default:
      // infra R2-00409：白名单外分类回退 i18n 文案（原直接显示英文原值）
      return t("posts.categoryUnknown");
  }
}

function authorDisplay(post: AdminPostSummary): string {
  return post.authorNickname || t("posts.authorFallback", { id: post.authorId });
}

onMounted(() => {
  fetchPosts();
});
</script>

<template>
  <view class="posts-page">
    <view class="page-header">
      <text class="page-title">{{ t("posts.title") }}</text>
      <text class="page-subtitle">{{ t("posts.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <select v-model="auditStatusFilter" class="filter-select" @change="scheduleSearch">
        <option value="">{{ t("posts.filterAuditStatusAll") }}</option>
        <option value="pending">{{ t("posts.auditStatusPending") }}</option>
        <option value="approved">{{ t("posts.auditStatusApproved") }}</option>
        <option value="rejected">{{ t("posts.auditStatusRejected") }}</option>
      </select>
      <select v-model="statusFilter" class="filter-select" @change="scheduleSearch">
        <option value="">{{ t("posts.filterPostStatusAll") }}</option>
        <option value="active">{{ t("posts.statusActive") }}</option>
        <option value="hidden">{{ t("posts.statusHidden") }}</option>
        <option value="deleted">{{ t("posts.statusDeleted") }}</option>
      </select>
      <select v-model="categoryFilter" class="filter-select" @change="scheduleSearch">
        <option value="">{{ t("posts.filterCategoryAll") }}</option>
        <!-- all 为后端枚举的"全部"占位，前端用空值对应；latest 为真实分类（PostCategory 枚举含 latest） -->
        <option value="interest">{{ t("posts.categoryInterest") }}</option>
        <option value="sincere">{{ t("posts.categorySincere") }}</option>
        <option value="hometown">{{ t("posts.categoryHometown") }}</option>
        <option value="anonymous">{{ t("posts.categoryAnonymous") }}</option>
        <option value="latest">{{ t("posts.categoryLatest") }}</option>
        <option value="campus">{{ t("posts.categoryCampus") }}</option>
      </select>
      <button class="ghost-button" @click="handleResetFilters">{{ t("common.reset") }}</button>
    </view>

    <!-- infra R2-00404：错误态接入 ErrorState 组件（含重试按钮） -->
    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchPosts" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("posts.columnId") }}</th>
            <th scope="col">{{ t("posts.columnContentPreview") }}</th>
            <th scope="col">{{ t("posts.columnAuthor") }}</th>
            <th scope="col">{{ t("posts.columnCategory") }}</th>
            <th scope="col">{{ t("posts.columnPostStatus") }}</th>
            <th scope="col">{{ t("posts.columnAuditStatus") }}</th>
            <th scope="col">{{ t("posts.columnStats") }}</th>
            <th scope="col">{{ t("posts.columnCreatedAt") }}</th>
            <th scope="col">{{ t("posts.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="empty-cell">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="posts.length === 0">
            <td colspan="9" class="empty-cell">{{ t("posts.noData") }}</td>
          </tr>
          <tr v-for="post in posts" :key="post.id">
            <td>{{ post.id }}</td>
            <td class="content-cell">{{ post.contentPreview }}</td>
            <td>
              <view class="author-cell">
                <text>{{ authorDisplay(post) }}</text>
              </view>
            </td>
            <td>{{ categoryLabel(post.category) }}</td>
            <td>
              <span class="status-badge" :class="`status-${post.status}`">
                {{ statusLabel(post.status) }}
              </span>
            </td>
            <td>
              <span class="audit-badge" :class="`audit-${post.auditStatus}`">
                {{ auditStatusLabel(post.auditStatus) }}
              </span>
            </td>
            <td>{{ post.likesCount }} / {{ post.commentsCount }} / {{ post.shareCount }}</td>
            <td>{{ formatDate(post.createdAt) }}</td>
            <td class="action-cell">
              <!-- 已审核帖子不再显示审核按钮，避免重复审核 -->
              <button
                v-if="post.auditStatus === 'pending'"
                class="action-button audit"
                @click="handleAudit(post)"
              >{{ t("posts.actionAudit") }}</button>
              <button class="action-button delete" @click="handleDelete(post)">{{ t("posts.actionDelete") }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- Task 3.7.2：接入共享 Pagination 组件（修复双分页：删除上方手写分页） -->
    <Pagination
      v-model:page="page"
      :total-pages="totalPages"
      :total="total"
      :disabled="loading"
      @change="handlePageChange"
    />

    <!-- Task 3.7.3：删除确认弹窗 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="t('posts.deleteTitle')"
      :message="deleteTarget ? t('posts.deleteConfirmMessage', { id: deleteTarget.id }) : ''"
      :danger="true"
      :confirming="deleting"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />

    <view v-if="auditingPost" class="modal-mask" @click.self="handleCancelAudit" @keydown.esc="onAuditKeydown">
      <view class="modal">
        <text class="modal-title">{{ t("posts.auditTitle", { id: auditingPost.id }) }}</text>
        <view class="post-content-box">{{ auditingPost.contentPreview }}</view>
        <view class="form-row">
          <text class="form-label">{{ t("posts.auditDecisionLabel") }}</text>
          <view class="radio-group">
            <!-- infra R2-00410：默认聚焦通过选项，键盘可直接操作 -->
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="approved" autofocus />
              <span>{{ t("posts.auditApprovedOption") }}</span>
            </label>
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="rejected" />
              <span>{{ t("posts.auditRejectedOption") }}</span>
            </label>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("posts.auditRemarkLabel") }}</text>
          <!-- infra R2-00410：remark 增加 maxlength（原无长度限制） -->
          <textarea v-model="auditRemark" class="form-textarea" rows="3" :maxlength="REMARK_MAX_LENGTH" />
        </view>
        <view class="modal-actions">
          <button class="ghost-button" :disabled="savingAudit" @click="handleCancelAudit">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="savingAudit" @click="handleSaveAudit">
            {{ savingAudit ? t("common.saving") : t("posts.submitButton") }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

.posts-page {
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

.toolbar {
  display: flex;
  gap: var(--admin-space-md);
  margin-bottom: var(--admin-space-xxl);
  flex-wrap: wrap;
  align-items: center;
}

.filter-select {
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
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
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: var(--admin-space-md-lg) var(--admin-space-lg);
  text-align: left;
  border-bottom: 1px solid var(--admin-color-border-light);
  vertical-align: middle;
}

.data-table th {
  background: var(--admin-color-bg-subtle);
  font-size: var(--admin-font-md);
  font-weight: 600;
  color: var(--admin-color-text-tertiary);
  text-transform: uppercase;
}

.data-table tbody tr:hover {
  background: var(--admin-color-bg-subtle);
}

.empty-cell {
  text-align: center;
  color: var(--admin-color-text-quaternary);
  padding: var(--admin-space-section) var(--admin-space-lg);
}

.content-cell {
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--admin-color-text-primary);
}

.author-cell {
  display: flex;
  align-items: center;
  gap: var(--admin-space-xxs);
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
}

.status-badge,
.audit-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md-sm);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.status-active {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.status-hidden {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.status-deleted {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.audit-pending {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.audit-approved {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.audit-rejected {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
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

.action-button.audit {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.action-button.audit:hover {
  background: var(--admin-color-info-softer);
}

.action-button.delete {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.action-button.delete:hover {
  background: var(--admin-color-danger-softer);
}

/* infra R2-00411：删除死样式 .pagination/.page-button/.page-info——
   模板已改用共享 Pagination 组件 */

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

.post-content-box {
  background: var(--admin-color-bg-subtle);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-md);
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
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
}

.radio-item {
  display: flex;
  align-items: center;
  gap: var(--admin-space-xxs);
  font-size: var(--admin-font-lg);
  cursor: pointer;
}

.form-textarea {
  padding: var(--admin-space-md-sm) var(--admin-space-sm);
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
