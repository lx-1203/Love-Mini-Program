<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  listPosts,
  auditPost,
  deletePost,
  type AdminPostSummary,
  type AdminPostListQuery,
} from "../api/posts";
import { ApiError } from "../api/http";

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
    errorMsg.value = err instanceof ApiError ? err.message : "加载帖子列表失败";
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
    alert(err instanceof ApiError ? err.message : "审核失败");
  }
}

async function handleDelete(post: AdminPostSummary) {
  if (!confirm(`确定要删除帖子 #${post.id} 吗？（软删除，可在数据库恢复）`)) return;
  try {
    await deletePost(post.id);
    await fetchPosts();
  } catch (err) {
    alert(err instanceof ApiError ? err.message : "删除失败");
  }
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
      return "待审核";
    case "approved":
      return "已通过";
    case "rejected":
      return "已拒绝";
    default:
      return status;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "正常";
    case "deleted":
      return "已删除";
    case "hidden":
      return "已隐藏";
    default:
      return status;
  }
}

onMounted(() => {
  fetchPosts();
});
</script>

<template>
  <view class="posts-page">
    <view class="page-header">
      <text class="page-title">帖子管理</text>
      <text class="page-subtitle">管理社区帖子与审核</text>
    </view>

    <view class="toolbar">
      <select v-model="auditStatusFilter" class="filter-select" @change="handleSearch">
        <option value="">全部审核状态</option>
        <option value="pending">待审核</option>
        <option value="approved">已通过</option>
        <option value="rejected">已拒绝</option>
      </select>
      <select v-model="statusFilter" class="filter-select" @change="handleSearch">
        <option value="">全部帖子状态</option>
        <option value="active">正常</option>
        <option value="hidden">已隐藏</option>
        <option value="deleted">已删除</option>
      </select>
      <select v-model="categoryFilter" class="filter-select" @change="handleSearch">
        <option value="">全部分类</option>
        <option value="all">全部</option>
        <option value="interest">兴趣</option>
        <option value="sincere">真诚</option>
        <option value="hometown">家乡</option>
        <option value="anonymous">匿名</option>
        <option value="latest">最新</option>
        <option value="campus">校园</option>
      </select>
      <button class="ghost-button" @click="handleResetFilters">重置</button>
    </view>

    <view v-if="errorMsg" class="error-banner">{{ errorMsg }}</view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>内容预览</th>
            <th>作者</th>
            <th>分类</th>
            <th>帖子状态</th>
            <th>审核状态</th>
            <th>点赞/评论/转发</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="empty-cell">加载中...</td>
          </tr>
          <tr v-else-if="posts.length === 0">
            <td colspan="9" class="empty-cell">暂无帖子数据</td>
          </tr>
          <tr v-for="post in posts" :key="post.id">
            <td>{{ post.id }}</td>
            <td class="content-cell">{{ post.contentPreview }}</td>
            <td>
              <view class="author-cell">
                <text>{{ post.authorNickname || `用户#${post.authorId}` }}</text>
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
              <button class="action-button audit" @click="handleAudit(post)">审核</button>
              <button class="action-button delete" @click="handleDelete(post)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <view class="pagination">
      <button class="page-button" :disabled="page <= 1" @click="handlePrevPage">上一页</button>
      <text class="page-info">第 {{ page }} / {{ totalPages }} 页（共 {{ total }} 条）</text>
      <button class="page-button" :disabled="page >= totalPages" @click="handleNextPage">下一页</button>
    </view>

    <view v-if="auditingPost" class="modal-mask" @click.self="handleCancelAudit">
      <view class="modal">
        <text class="modal-title">审核帖子 #{{ auditingPost.id }}</text>
        <view class="post-content-box">{{ auditingPost.contentPreview }}</view>
        <view class="form-row">
          <text class="form-label">审核决定</text>
          <view class="radio-group">
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="approved" />
              <span>通过</span>
            </label>
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="rejected" />
              <span>拒绝（自动隐藏）</span>
            </label>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">审核备注（拒绝原因等）</text>
          <textarea v-model="auditRemark" class="form-textarea" rows="3" />
        </view>
        <view class="modal-actions">
          <button class="ghost-button" @click="handleCancelAudit">取消</button>
          <button class="primary-button" @click="handleSaveAudit">提交</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
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
