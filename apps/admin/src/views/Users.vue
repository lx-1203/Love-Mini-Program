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
    // eslint-disable-next-line no-alert
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
    const msg = err instanceof ApiError ? err.message : t("users.saveFailed");
    // eslint-disable-next-line no-alert
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
    // eslint-disable-next-line no-alert
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
  return status === "active" ? t("users.statusActive") : t("users.statusDisabled");
}

function roleLabel(role: string): string {
  return role === "ADMIN" ? t("users.roleAdmin") : t("users.roleUser");
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

.search-input {
  flex: 1;
  max-width: 320px;
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
}

.search-input:focus {
  outline: none;
  border-color: var(--admin-color-primary);
}

.filter-select {
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-lg);
  font-size: var(--admin-font-lg);
  background: var(--admin-color-bg-container);
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
  transition: all 0.2s;
}

.primary-button:hover {
  background: var(--admin-color-primary-hover);
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

.user-cell {
  display: flex;
  align-items: center;
  gap: var(--admin-space-sm);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.role-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md-sm);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.role-user {
  background: var(--admin-color-accent-soft);
  color: var(--admin-color-accent);
}

.role-admin {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.status-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.status-active {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.status-disabled {
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

.action-button.edit {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.action-button.edit:hover {
  background: var(--admin-color-info-softer);
}

.action-button.delete {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.action-button.delete:hover {
  background: var(--admin-color-danger-softer);
}

.action-button.enable {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.action-button.enable:hover {
  background: var(--admin-color-success-softer);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--admin-space-lg);
  margin-top: var(--admin-space-xxl);
}

.page-button {
  padding: var(--admin-space-sm) var(--admin-space-lg);
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  cursor: pointer;
  font-size: var(--admin-font-lg);
}

.page-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.page-info {
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-tertiary);
}

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
  width: 360px;
  max-width: 90%;
}

.modal-title {
  display: block;
  font-size: var(--admin-font-xxl);
  font-weight: 600;
  margin-bottom: var(--admin-space-lg);
  color: var(--admin-color-text-primary);
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

.form-input {
  padding: var(--admin-space-md-sm) var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-lg);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--admin-space-sm);
  margin-bottom: var(--admin-space-md);
}

.modal-hint {
  display: block;
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}
</style>
