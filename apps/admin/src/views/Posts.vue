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
import { ref, onMounted } from "vue";
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
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const posts = ref<AdminPostSummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");

const auditStatusFilter = ref<"" | "pending" | "approved" | "rejected">("");
const statusFilter = ref<"" | "active" | "deleted" | "hidden">("");
const categoryFilter = ref("");

const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const totalPages = ref(1);

const auditingPost = ref<AdminPostSummary | null>(null);
const auditDecision = ref<"approved" | "rejected">("approved");
const auditRemark = ref("");

// Task 3.7.3：删除确认弹窗状态
const deleteVisible = ref(false);
const deleteTarget = ref<AdminPostSummary | null>(null);
const deleting = ref(false);

async function fetchPosts() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const query: AdminPostListQuery = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (auditStatusFilter.value) query.auditStatus = auditStatusFilter.value;
    if (statusFilter.value) query.status = statusFilter.value;
    if (categoryFilter.value) query.category = categoryFilter.value;

    const result = await listPosts(query);
    posts.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("posts.loadFailed");
    posts.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  fetchPosts();
}

function handleResetFilters() {
  auditStatusFilter.value = "";
  statusFilter.value = "";
  categoryFilter.value = "";
  page.value = 1;
  fetchPosts();
}

function handlePrevPage() {
  if (page.value > 1) {
    page.value--;
    fetchPosts();
  }
}

function handleNextPage() {
  if (page.value < totalPages.value) {
    page.value++;
    fetchPosts();
  }
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

async function handleSaveAudit() {
  if (!auditingPost.value) return;
  try {
    await auditPost(auditingPost.value.id, {
      decision: auditDecision.value,
      remark: auditRemark.value || undefined,
    });
    auditingPost.value = null;
    auditRemark.value = "";
    await fetchPosts();
  } catch (err) {
    alert(err instanceof ApiError ? err.message : t("posts.auditFailed"));
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
    alert(err instanceof ApiError ? err.message : t("posts.deleteFailed"));
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
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
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
      <select v-model="auditStatusFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("posts.filterAuditStatusAll") }}</option>
        <option value="pending">{{ t("posts.auditStatusPending") }}</option>
        <option value="approved">{{ t("posts.auditStatusApproved") }}</option>
        <option value="rejected">{{ t("posts.auditStatusRejected") }}</option>
      </select>
      <select v-model="statusFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("posts.filterPostStatusAll") }}</option>
        <option value="active">{{ t("posts.statusActive") }}</option>
        <option value="hidden">{{ t("posts.statusHidden") }}</option>
        <option value="deleted">{{ t("posts.statusDeleted") }}</option>
      </select>
      <select v-model="categoryFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("posts.filterCategoryAll") }}</option>
        <option value="all">{{ t("posts.categoryAll") }}</option>
        <option value="interest">{{ t("posts.categoryInterest") }}</option>
        <option value="sincere">{{ t("posts.categorySincere") }}</option>
        <option value="hometown">{{ t("posts.categoryHometown") }}</option>
        <option value="anonymous">{{ t("posts.categoryAnonymous") }}</option>
        <option value="latest">{{ t("posts.categoryLatest") }}</option>
        <option value="campus">{{ t("posts.categoryCampus") }}</option>
      </select>
      <button class="ghost-button" @click="handleResetFilters">{{ t("common.reset") }}</button>
    </view>

    <view v-if="errorMsg" class="error-banner">{{ errorMsg }}</view>

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
            <td>{{ post.category }}</td>
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
              <button class="action-button audit" @click="handleAudit(post)">{{ t("posts.actionAudit") }}</button>
              <button class="action-button delete" @click="handleDelete(post)">{{ t("posts.actionDelete") }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <view class="pagination">
      <button class="page-button" :disabled="page <= 1" @click="handlePrevPage">{{ t("common.prevPage") }}</button>
      <text class="page-info">{{ t("posts.paginationInfo", { page, totalPages, total }) }}</text>
      <button class="page-button" :disabled="page >= totalPages" @click="handleNextPage">{{ t("common.nextPage") }}</button>
    </view>

    <!-- Task 3.7.2：接入共享 Pagination 组件 -->
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

    <view v-if="auditingPost" class="modal-mask" @click.self="handleCancelAudit">
      <view class="modal">
        <text class="modal-title">{{ t("posts.auditTitle", { id: auditingPost.id }) }}</text>
        <view class="post-content-box">{{ auditingPost.contentPreview }}</view>
        <view class="form-row">
          <text class="form-label">{{ t("posts.auditDecisionLabel") }}</text>
          <view class="radio-group">
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="approved" />
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
          <textarea v-model="auditRemark" class="form-textarea" rows="3" />
        </view>
        <view class="modal-actions">
          <button class="ghost-button" @click="handleCancelAudit">{{ t("common.cancel") }}</button>
          <button class="primary-button" @click="handleSaveAudit">{{ t("posts.submitButton") }}</button>
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

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.ghost-button {
  padding: 10px 20px;
  background: transparent;
  color: #666;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.ghost-button:hover {
  background: #f5f5f5;
}

.primary-button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.primary-button:hover {
  background: #5568d3;
}

.error-banner {
  background: #fff1f0;
  color: #f5222d;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
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
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}

.data-table th {
  background: #f9f9f9;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.data-table tbody tr:hover {
  background: #f9f9f9;
}

.empty-cell {
  text-align: center;
  color: #999;
  padding: 40px 16px;
}

.content-cell {
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;
}

.author-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #555;
}

.status-badge,
.audit-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background: #e6f7ff;
  color: #1890ff;
}

.status-hidden {
  background: #fff7e6;
  color: #fa8c16;
}

.status-deleted {
  background: #fff1f0;
  color: #f5222d;
}

.audit-pending {
  background: #fff7e6;
  color: #fa8c16;
}

.audit-approved {
  background: #f6ffed;
  color: #52c41a;
}

.audit-rejected {
  background: #fff1f0;
  color: #f5222d;
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

.action-button.audit {
  background: #e6f7ff;
  color: #1890ff;
}

.action-button.audit:hover {
  background: #bae7ff;
}

.action-button.delete {
  background: #fff1f0;
  color: #f5222d;
}

.action-button.delete:hover {
  background: #ffccc7;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.page-button {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.page-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.page-info {
  font-size: 14px;
  color: #666;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 480px;
  max-width: 90%;
}

.modal-title {
  display: block;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.post-content-box {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #555;
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-label {
  font-size: 13px;
  color: #666;
}

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
}

.form-textarea {
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
