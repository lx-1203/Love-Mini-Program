<script setup lang="ts">
/**
 * Admin 用户管理视图（SubTask 3.3.2 i18n 化）。
 *
 * 改造点：
 * - 标题/副标题/搜索占位符/列头/按钮/状态文案全部走 i18n key
 * - ConfirmDialog 的 title/message 通过 users.disableConfirmMessage 等插值生成
 * - 错误回退通过 users.loadFailed / users.saveFailed / users.actionFailed 表达
 */
import { ref, onMounted, computed } from "vue";
import {
  listUsers,
  disableUser,
  enableUser,
  updateUser,
  type AdminUserSummary,
  type AdminUserListQuery,
} from "../api/users";
import { ApiError } from "../api/http";
// Task 3.7.2 / 3.7.3：接入共享 Pagination 与 ConfirmDialog 组件
import Pagination from "../components/Pagination.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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
// SubTask 1.3.2：编辑保存过程中的 loading 状态，防止重复点击与并发提交
const savingEdit = ref(false);

// Task 3.7.3：禁用/启用确认弹窗状态
const confirmVisible = ref(false);
const confirmAction = ref<"disable" | "enable">("disable");
const confirmTarget = ref<AdminUserSummary | null>(null);
const confirming = ref(false);

/** 通用 computed：filteredUsers 保留兼容旧模板 */
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
    errorMsg.value = err instanceof ApiError ? err.message : t("users.loadFailed");
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

/**
 * Task 3.7.2：分页变更回调（由 Pagination 组件触发）。
 * 直接复用 fetchUsers，page 已通过 v-model 同步。
 */
function handlePageChange(newPage: number): void {
  // Pagination 组件已通过 v-model:page 同步 page.value，
  // 此处仅触发数据加载
  void newPage;
  fetchUsers();
}

function handleEdit(user: AdminUserSummary) {
  editingUser.value = user;
  editNickname.value = user.nickname;
  errorMsg.value = "";
}

function handleCancelEdit() {
  editingUser.value = null;
  editNickname.value = "";
  savingEdit.value = false;
}

/**
 * SubTask 1.3.2：保存编辑用户。
 *
 * 调用 PUT /api/admin/users/{id}，请求体只携带变更字段（nickname）。
 * 保存过程中禁用按钮（savingEdit=true），防止重复点击产生并发更新。
 * 成功后刷新列表以同步显示最新昵称；失败时通过 alert 提示并保留弹窗，便于用户重试。
 */
async function handleSaveEdit() {
  if (!editingUser.value) return;
  if (savingEdit.value) return; // 防重复点击

  const trimmed = editNickname.value.trim();
  if (!trimmed) {
    alert(t("users.nicknameRequired"));
    return;
  }

  const userId = editingUser.value.id;
  savingEdit.value = true;
  try {
    await updateUser(userId, { nickname: trimmed });
    editingUser.value = null;
    editNickname.value = "";
    // 刷新列表以同步最新昵称
    await fetchUsers();
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : "保存失败";
    alert(msg);
  } finally {
    savingEdit.value = false;
  }
}

async function handleDisable(user: AdminUserSummary) {
  // Task 3.7.3：替换原生 confirm() 为 ConfirmDialog 组件
  confirmAction.value = "disable";
  confirmTarget.value = user;
  confirmVisible.value = true;
}

async function handleEnable(user: AdminUserSummary) {
  // Task 3.7.3：替换原生 confirm() 为 ConfirmDialog 组件
  confirmAction.value = "enable";
  confirmTarget.value = user;
  confirmVisible.value = true;
}

/**
 * Task 3.7.3：ConfirmDialog 确认回调，执行禁用/启用操作。
 */
async function handleConfirmAction() {
  const target = confirmTarget.value;
  if (!target || confirming.value) return;

  confirming.value = true;
  try {
    if (confirmAction.value === "disable") {
      await disableUser(target.id);
    } else {
      await enableUser(target.id);
    }
    confirmVisible.value = false;
    confirmTarget.value = null;
    await fetchUsers();
  } catch (err) {
    alert(err instanceof ApiError ? err.message : t("users.actionFailed"));
  } finally {
    confirming.value = false;
  }
}

/** Task 3.7.3：ConfirmDialog 取消回调 */
function handleConfirmCancel() {
  confirmTarget.value = null;
  confirming.value = false;
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
      <text class="page-title">{{ t("users.title") }}</text>
      <text class="page-subtitle">{{ t("users.tableSubtitle") }}</text>
    </view>

    <view class="toolbar">
      <input
        v-model="searchQuery"
        class="search-input"
        type="text"
        :placeholder="t('users.searchNicknamePlaceholder')"
        @keyup.enter="handleSearch"
      />
      <select v-model="roleFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("users.filterRoleAll") }}</option>
        <option value="USER">{{ t("users.filterRoleUser") }}</option>
        <option value="ADMIN">{{ t("users.filterRoleAdmin") }}</option>
      </select>
      <select v-model="statusFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("users.filterStatusAllShort") }}</option>
        <option value="active">{{ t("users.filterStatusActiveShort") }}</option>
        <option value="disabled">{{ t("users.filterStatusDisabledShort") }}</option>
      </select>
      <button class="primary-button" @click="handleSearch">{{ t("common.search") }}</button>
      <button class="ghost-button" @click="handleResetFilters">{{ t("common.reset") }}</button>
    </view>

    <view v-if="errorMsg" class="error-banner">{{ errorMsg }}</view>

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("users.columnId") }}</th>
            <th scope="col">{{ t("users.columnNickname") }}</th>
            <th scope="col">{{ t("users.columnRole") }}</th>
            <th scope="col">{{ t("users.columnStatus") }}</th>
            <th scope="col">{{ t("users.columnProfileCompletion") }}</th>
            <th scope="col">{{ t("users.columnFollowing") }}</th>
            <th scope="col">{{ t("users.columnRegisteredAt") }}</th>
            <th scope="col">{{ t("users.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="empty-cell">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="filteredUsers.length === 0">
            <td colspan="8" class="empty-cell">{{ t("users.noData") }}</td>
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
              <button class="action-button edit" @click="handleEdit(user)">{{ t("users.actionEdit") }}</button>
              <button
                v-if="user.status === 'active'"
                class="action-button delete"
                @click="handleDisable(user)"
              >{{ t("users.actionDisable") }}</button>
              <button
                v-else
                class="action-button enable"
                @click="handleEnable(user)"
              >{{ t("users.actionEnable") }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <view class="pagination">
      <button class="page-button" :disabled="page <= 1" @click="handlePrevPage">{{ t("common.prevPage") }}</button>
      <text class="page-info">{{ t("common.page", { page, totalPages }) }}（{{ t("common.total", { n: total }) }}）</text>
      <button class="page-button" :disabled="page >= totalPages" @click="handleNextPage">{{ t("common.nextPage") }}</button>
    </view>

    <!-- Task 3.7.2：接入共享 Pagination 组件（替代上方手写分页） -->
    <Pagination
      v-model:page="page"
      :total-pages="totalPages"
      :total="total"
      :disabled="loading"
      @change="handlePageChange"
    />

    <!-- Task 3.7.3：禁用/启用确认弹窗 -->
    <ConfirmDialog
      v-model:visible="confirmVisible"
      :title="confirmAction === 'disable' ? t('users.disableUserTitle') : t('users.enableUserTitle')"
      :message="confirmTarget ? (confirmAction === 'disable' ? t('users.disableConfirmMessage', { name: confirmTarget.nickname }) : t('users.enableConfirmMessage', { name: confirmTarget.nickname })) : ''"
      :danger="confirmAction === 'disable'"
      :confirming="confirming"
      @confirm="handleConfirmAction"
      @cancel="handleConfirmCancel"
    />

    <view v-if="editingUser" class="modal-mask" @click.self="handleCancelEdit">
      <view class="modal">
        <text class="modal-title">{{ t("users.editUserTitle", { name: editingUser.nickname }) }}</text>
        <view class="form-row">
          <text class="form-label">{{ t("users.nicknameLabel") }}</text>
          <input v-model="editNickname" class="form-input" type="text" />
        </view>
        <view class="modal-actions">
          <button class="ghost-button" :disabled="savingEdit" @click="handleCancelEdit">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="savingEdit" @click="handleSaveEdit">
            {{ savingEdit ? t("common.saving") : t("common.save") }}
          </button>
        </view>
        <text class="modal-hint">{{ t("users.modalHint") }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

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
