<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  listUsers,
  disableUser,
  enableUser,
  type AdminUserSummary,
  type AdminUserListQuery,
} from "../api/users";
import { ApiError } from "../api/http";

const users = ref<AdminUserSummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");

const searchQuery = ref("");
const roleFilter = ref<"" | "USER" | "ADMIN">("");
const statusFilter = ref<"" | "active" | "disabled">("");

const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const totalPages = ref(1);

const editingUser = ref<AdminUserSummary | null>(null);
const editNickname = ref("");

const filteredUsers = computed(() => users.value);

async function fetchUsers() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const query: AdminUserListQuery = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (searchQuery.value.trim()) query.nickname = searchQuery.value.trim();
    if (roleFilter.value) query.role = roleFilter.value;
    if (statusFilter.value) query.status = statusFilter.value;

    const result = await listUsers(query);
    users.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : "加载用户列表失败";
    users.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  fetchUsers();
}

function handleResetFilters() {
  searchQuery.value = "";
  roleFilter.value = "";
  statusFilter.value = "";
  page.value = 1;
  fetchUsers();
}

function handlePrevPage() {
  if (page.value > 1) {
    page.value--;
    fetchUsers();
  }
}

function handleNextPage() {
  if (page.value < totalPages.value) {
    page.value++;
    fetchUsers();
  }
}

function handleEdit(user: AdminUserSummary) {
  editingUser.value = user;
  editNickname.value = user.nickname;
}

function handleCancelEdit() {
  editingUser.value = null;
  editNickname.value = "";
}

async function handleSaveEdit() {
  if (!editingUser.value) return;
  // 当前任务未要求编辑接口在前端联调，仅做禁用/启用切换
  // 编辑接口已在后端实现，前端表单扩展可后续迭代
  editingUser.value = null;
  editNickname.value = "";
}

async function handleDisable(user: AdminUserSummary) {
  if (!confirm(`确定要禁用用户 ${user.nickname} 吗？`)) return;
  try {
    await disableUser(user.id);
    await fetchUsers();
  } catch (err) {
    alert(err instanceof ApiError ? err.message : "禁用失败");
  }
}

async function handleEnable(user: AdminUserSummary) {
  if (!confirm(`确定要启用用户 ${user.nickname} 吗？`)) return;
  try {
    await enableUser(user.id);
    await fetchUsers();
  } catch (err) {
    alert(err instanceof ApiError ? err.message : "启用失败");
  }
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

function statusLabel(status: string): string {
  return status === "active" ? "正常" : "禁用";
}

function roleLabel(role: string): string {
  return role === "ADMIN" ? "管理员" : "普通用户";
}

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <view class="users-page">
    <view class="page-header">
      <text class="page-title">用户管理</text>
      <text class="page-subtitle">管理系统用户与权限</text>
    </view>

    <view class="toolbar">
      <input
        v-model="searchQuery"
        class="search-input"
        type="text"
        placeholder="搜索昵称..."
        @keyup.enter="handleSearch"
      />
      <select v-model="roleFilter" class="filter-select" @change="handleSearch">
        <option value="">全部角色</option>
        <option value="USER">普通用户</option>
        <option value="ADMIN">管理员</option>
      </select>
      <select v-model="statusFilter" class="filter-select" @change="handleSearch">
        <option value="">全部状态</option>
        <option value="active">正常</option>
        <option value="disabled">禁用</option>
      </select>
      <button class="primary-button" @click="handleSearch">搜索</button>
      <button class="ghost-button" @click="handleResetFilters">重置</button>
    </view>

    <view v-if="errorMsg" class="error-banner">{{ errorMsg }}</view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>昵称</th>
            <th>角色</th>
            <th>状态</th>
            <th>资料完善度</th>
            <th>关注/粉丝</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="empty-cell">加载中...</td>
          </tr>
          <tr v-else-if="filteredUsers.length === 0">
            <td colspan="8" class="empty-cell">暂无用户数据</td>
          </tr>
          <tr v-for="user in filteredUsers" :key="user.id">
            <td>{{ user.id }}</td>
            <td>
              <view class="user-cell">
                <img v-if="user.avatarUrl" :src="user.avatarUrl" class="user-avatar" alt="" />
                <span>{{ user.nickname }}</span>
              </view>
            </td>
            <td>
              <span class="role-badge" :class="`role-${user.role.toLowerCase()}`">
                {{ roleLabel(user.role) }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="`status-${user.status}`">
                {{ statusLabel(user.status) }}
              </span>
            </td>
            <td>{{ user.profileCompletion }}%</td>
            <td>{{ user.followingCount }} / {{ user.followersCount }}</td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td class="action-cell">
              <button class="action-button edit" @click="handleEdit(user)">编辑</button>
              <button
                v-if="user.status === 'active'"
                class="action-button delete"
                @click="handleDisable(user)"
              >禁用</button>
              <button
                v-else
                class="action-button enable"
                @click="handleEnable(user)"
              >启用</button>
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

    <view v-if="editingUser" class="modal-mask" @click.self="handleCancelEdit">
      <view class="modal">
        <text class="modal-title">编辑用户 - {{ editingUser.nickname }}</text>
        <view class="form-row">
          <text class="form-label">昵称</text>
          <input v-model="editNickname" class="form-input" type="text" />
        </view>
        <view class="modal-actions">
          <button class="ghost-button" @click="handleCancelEdit">取消</button>
          <button class="primary-button" @click="handleSaveEdit">保存</button>
        </view>
        <text class="modal-hint">提示：状态切换请使用列表中的"禁用/启用"按钮。</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.users-page {
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

.search-input {
  flex: 1;
  max-width: 320px;
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
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
  transition: all 0.2s;
}

.primary-button:hover {
  background: #5568d3;
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

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.role-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.role-user {
  background: #f0f5ff;
  color: #2f54eb;
}

.role-admin {
  background: #fff7e6;
  color: #fa8c16;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background: #e6f7ff;
  color: #1890ff;
}

.status-disabled {
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

.action-button.edit {
  background: #e6f7ff;
  color: #1890ff;
}

.action-button.edit:hover {
  background: #bae7ff;
}

.action-button.delete {
  background: #fff1f0;
  color: #f5222d;
}

.action-button.delete:hover {
  background: #ffccc7;
}

.action-button.enable {
  background: #f6ffed;
  color: #52c41a;
}

.action-button.enable:hover {
  background: #d9f7be;
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
  width: 360px;
  max-width: 90%;
}

.modal-title {
  display: block;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
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

.form-input {
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}

.modal-hint {
  display: block;
  font-size: 12px;
  color: #999;
}
</style>
