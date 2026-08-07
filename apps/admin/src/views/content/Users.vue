<script setup lang="ts">
/**
 * Admin 用户管理视图（复制自旧后台 apps/admin，适配 admin-v2 目录结构与会话 key）。
 *
 * 适配点：
 * - localStorage key：admin_user → admin_v2_user（与 admin-v2 stores/session.ts 对齐）
 * - 其余逻辑与原视图保持一致：列表/筛选/分页/编辑/禁用启用/详情/新增用户/修改密码
 */
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import {
  listUsers,
  createUser,
  disableUser,
  enableUser,
  updateUser,
  getUserDetail,
  type AdminUserSummary,
  type AdminUserDetail,
  type AdminUserListQuery,
} from "@/api/users";
import { changePassword } from "@/api/account";
import { ApiError } from "@/api/http";
import Pagination from "@/components/Pagination.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import ErrorState from "@/components/ErrorState.vue";
import { useI18n } from "vue-i18n";
import { formatDateTime } from "@/utils/format";
import { DEFAULT_PAGE_SIZE, NICKNAME_MAX_LENGTH } from "@/utils/constants";

const { t } = useI18n();

const users = ref<AdminUserSummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");

const searchQuery = ref("");
const roleFilter = ref<"" | "USER" | "ADMIN">("");
const statusFilter = ref<"" | "active" | "disabled">("");

const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

const editingUser = ref<AdminUserSummary | null>(null);
const editNickname = ref("");
const savingEdit = ref(false);

// 禁用/启用确认弹窗状态
const confirmVisible = ref(false);
const confirmAction = ref<"disable" | "enable">("disable");
const confirmTarget = ref<AdminUserSummary | null>(null);
const confirming = ref(false);

// 用户详情弹窗状态
const detailVisible = ref(false);
const detailUser = ref<AdminUserDetail | null>(null);
const detailLoading = ref(false);

// ===== 新增用户 + 修改密码弹窗状态 =====
/** 新增用户弹窗 */
const createVisible = ref(false);
const createPhone = ref("");
const createPassword = ref("");
const createNickname = ref("");
const creatingUser = ref(false);
/** 修改密码弹窗 */
const changePwdVisible = ref(false);
const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const changingPwd = ref(false);
/** 弹窗内错误提示（与列表错误 errorMsg 分离，避免互扰） */
const modalError = ref("");

// 搜索防抖 + 请求竞态防护（统一用请求序号丢弃过期响应，用 debounce 合并高频触发）
let reqSeq = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 当前登录管理员 ID（用于禁止禁用自己）。
 * 从 localStorage.admin_v2_user 读取（admin-v2 会话 key），解析失败时返回 null。
 */
const currentAdminId = computed<number | null>(() => {
  const raw = localStorage.getItem("admin_v2_user");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id?: unknown };
    return typeof parsed.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
});

/**
 * 当前登录管理员角色（大写；解析失败时返回空串）。
 * 用于对齐后端权限模型：
 * - 新增用户 / 修改密码仅 SUPER_ADMIN 可用（后端 @PreAuthorize）
 * - 仅 SUPER_ADMIN 可对 ADMIN 行执行禁用/启用；SUPER_ADMIN 行任何人不允许
 */
const currentAdminRole = computed<string>(() => {
  const raw = localStorage.getItem("admin_v2_user");
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { role?: unknown };
    return typeof parsed.role === "string" ? parsed.role.toUpperCase() : "";
  } catch {
    return "";
  }
});

/**
 * 是否可对目标用户执行禁用/启用（与后端 toggleUserStatus 权限模型对齐）。
 * - 目标为 SUPER_ADMIN：任何人不允许（后端 400）
 * - 目标为 ADMIN：仅当前登录者为 SUPER_ADMIN 时允许
 * - 自己的账号：不允许
 */
function canToggleUser(user: { id: number; role?: string }): boolean {
  if (user.id === currentAdminId.value) return false;
  const role = String(user.role ?? "").toUpperCase();
  if (role === "SUPER_ADMIN") return false;
  if (role === "ADMIN") return currentAdminRole.value === "SUPER_ADMIN";
  return true;
}

async function fetchUsers() {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const query: AdminUserListQuery = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (searchQuery.value.trim()) query.nickname = searchQuery.value.trim();
    if (roleFilter.value) query.role = roleFilter.value;
    if (statusFilter.value) query.status = statusFilter.value;

    const result = await listUsers(query);
    // 丢弃过期响应（序号小于当前请求的响应不再写入状态）
    if (seq !== reqSeq) return;
    users.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("users.loadFailed");
    users.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** 搜索输入防抖（400ms），合并高频键入/筛选变更 */
function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    page.value = 1;
    fetchUsers();
  }, 400);
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  page.value = 1;
  fetchUsers();
}

/** 重置筛选后同样回到第一页并拉取 */
function handleResetFilters() {
  searchQuery.value = "";
  roleFilter.value = "";
  statusFilter.value = "";
  handleSearch();
}

function handlePageChange(newPage: number): void {
  // Pagination 组件已通过 v-model:page 同步 page.value，此处仅触发数据加载
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
 * 保存编辑用户。
 * 调用 PUT /api/v1/admin/users/{id}，请求体只携带变更字段（nickname）。
 */
async function handleSaveEdit() {
  if (!editingUser.value) return;
  if (savingEdit.value) return; // 防重复点击

  const trimmed = editNickname.value.trim();
  if (!trimmed) {
    errorMsg.value = t("users.nicknameRequired");
    return;
  }
  // 长度校验：与输入框 maxlength 及后端校验保持一致
  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    errorMsg.value = t("users.nicknameTooLong", { n: NICKNAME_MAX_LENGTH });
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
    errorMsg.value = err instanceof ApiError ? err.message : t("users.saveFailed");
  } finally {
    savingEdit.value = false;
  }
}

async function handleDisable(user: AdminUserSummary) {
  // 自保护：禁止禁用当前登录账号自己（无法从 localStorage 获取 id 时跳过，依赖后端校验）
  if (currentAdminId.value !== null && user.id === currentAdminId.value) {
    errorMsg.value = t("users.actionFailed");
    return;
  }
  confirmAction.value = "disable";
  confirmTarget.value = user;
  confirmVisible.value = true;
}

async function handleEnable(user: AdminUserSummary) {
  confirmAction.value = "enable";
  confirmTarget.value = user;
  confirmVisible.value = true;
}

/**
 * ConfirmDialog 确认回调，执行禁用/启用操作。
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
    errorMsg.value = err instanceof ApiError ? err.message : t("users.actionFailed");
  } finally {
    confirming.value = false;
  }
}

/** ConfirmDialog 取消回调 */
function handleConfirmCancel() {
  confirmTarget.value = null;
  confirming.value = false;
}

function formatDate(iso: string): string {
  return formatDateTime(iso);
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return t("users.statusActive");
    case "disabled":
      return t("users.statusDisabled");
    default:
      return status;
  }
}

/** 头像加载失败兜底——隐藏裂图（URL 失效时不显示 broken image） */
function onAvatarError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.style.display = "none";
}

/** 认证状态文案映射（详情弹窗用） */
function verificationLabel(status: AdminUserDetail["verificationStatus"]): string {
  switch (status) {
    case "verified":
      return t("users.verified");
    case "pending":
      return t("users.verificationPending");
    case "rejected":
      return t("users.verificationRejected");
    case "draft":
      return t("users.verificationDraft");
    default:
      return t("users.unverified");
  }
}

function roleLabel(role: string): string {
  const normalized = role.toUpperCase();
  switch (normalized) {
    case "ADMIN":
      return t("users.roleAdmin");
    case "SUPER_ADMIN":
      return t("users.roleSuperAdmin");
    default:
      return t("users.roleUser");
  }
}

/** 角色徽章 class 兜底——未知角色统一回退 user 徽章样式 */
function roleBadgeClass(role: string): string {
  const normalized = role.toUpperCase();
  if (normalized === "SUPER_ADMIN") return "role-super-admin";
  if (normalized === "ADMIN") return "role-admin";
  return "role-user";
}

/**
 * 打开用户详情弹窗（消费 getUserDetail）。
 */
async function handleViewDetail(user: AdminUserSummary) {
  detailUser.value = null;
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    detailUser.value = await getUserDetail(user.id);
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("users.loadDetailFailed");
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  detailVisible.value = false;
  detailUser.value = null;
}

/** 编辑弹窗支持 Esc 关闭 */
function onEditKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && editingUser.value && !savingEdit.value) {
    handleCancelEdit();
  }
}

/** 组件卸载时清理防抖定时器 */
onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});

/** 打开新增用户弹窗（打开时重置表单与错误提示） */
function openCreateUser() {
  createPhone.value = "";
  createPassword.value = "";
  createNickname.value = "";
  modalError.value = "";
  createVisible.value = true;
}

/** 关闭新增用户弹窗（提交中禁止关闭） */
function closeCreateUser() {
  if (creatingUser.value) return;
  createVisible.value = false;
}

/**
 * 提交新增用户。
 * 前端校验（手机号格式/密码长度/昵称长度）与后端 AdminCreateUserRequest 校验对齐，
 * 成功后关闭弹窗并刷新列表。
 */
async function handleCreateUser() {
  if (creatingUser.value) return;
  const phone = createPhone.value.trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    modalError.value = t("users.createPhoneInvalid");
    return;
  }
  if (createPassword.value.length < 6 || createPassword.value.length > 64) {
    modalError.value = t("users.createPasswordInvalid");
    return;
  }
  const nickname = createNickname.value.trim();
  if (!nickname) {
    modalError.value = t("users.nicknameRequired");
    return;
  }
  if (nickname.length > NICKNAME_MAX_LENGTH) {
    modalError.value = t("users.nicknameTooLong", { n: NICKNAME_MAX_LENGTH });
    return;
  }
  creatingUser.value = true;
  modalError.value = "";
  try {
    await createUser({ phone, password: createPassword.value, nickname });
    createVisible.value = false;
    await fetchUsers();
  } catch (err) {
    modalError.value = err instanceof ApiError ? err.message : t("users.actionFailed");
  } finally {
    creatingUser.value = false;
  }
}

/** 打开修改密码弹窗（打开时重置表单与错误提示） */
function openChangePwd() {
  oldPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
  modalError.value = "";
  changePwdVisible.value = true;
}

/** 关闭修改密码弹窗（提交中禁止关闭） */
function closeChangePwd() {
  if (changingPwd.value) return;
  changePwdVisible.value = false;
}

/**
 * 提交修改密码（调用 POST /api/v1/admin/account/change-password）。
 * 前端校验（旧密码必填/新密码长度/两次输入一致）与后端 ChangePasswordRequest 校验对齐，
 * 成功后关闭弹窗；当前会话 token 不受影响，无需重新登录。
 */
async function handleChangePwd() {
  if (changingPwd.value) return;
  if (!oldPassword.value) {
    modalError.value = t("users.changePwdOldRequired");
    return;
  }
  if (newPassword.value.length < 6 || newPassword.value.length > 64) {
    modalError.value = t("users.changePwdNewTooShort");
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    modalError.value = t("users.changePwdMismatch");
    return;
  }
  changingPwd.value = true;
  modalError.value = "";
  try {
    await changePassword({ oldPassword: oldPassword.value, newPassword: newPassword.value });
    changePwdVisible.value = false;
  } catch (err) {
    modalError.value = err instanceof ApiError ? err.message : t("users.actionFailed");
  } finally {
    changingPwd.value = false;
  }
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
        @input="scheduleSearch"
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
      <!-- 新增用户 + 修改密码入口：仅超级管理员显示（后端 @PreAuthorize SUPER_ADMIN） -->
      <template v-if="currentAdminRole === 'SUPER_ADMIN'">
        <button class="primary-button" @click="openCreateUser">{{ t("users.actionCreateUser") }}</button>
        <button class="ghost-button" @click="openChangePwd">{{ t("users.actionChangePassword") }}</button>
      </template>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchUsers" />

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
          <tr v-else-if="users.length === 0">
            <td colspan="8" class="empty-cell">{{ t("users.noData") }}</td>
          </tr>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>
              <view class="user-cell">
                <img
                  v-if="user.avatarUrl"
                  :src="user.avatarUrl"
                  class="user-avatar"
                  alt=""
                  @error="onAvatarError"
                />
                <span>{{ user.nickname }}</span>
              </view>
            </td>
            <td>
              <span class="role-badge" :class="roleBadgeClass(user.role)">
                {{ roleLabel(user.role) }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="`status-${user.status}`">
                {{ statusLabel(user.status) }}
              </span>
            </td>
            <td>{{ t("users.profileCompletionValue", { n: user.profileCompletion }) }}</td>
            <td>{{ user.followingCount }} / {{ user.followersCount }}</td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td class="action-cell">
              <button class="action-button view" @click="handleViewDetail(user)">{{ t("users.actionView") }}</button>
              <button class="action-button edit" @click="handleEdit(user)">{{ t("users.actionEdit") }}</button>
              <!-- 权限对齐：SUPER_ADMIN 行禁止操作（后端 400）、自身不可操作、
                    ADMIN 行仅超级管理员可操作 -->
              <button
                v-if="user.status === 'active' && canToggleUser(user)"
                class="action-button delete"
                @click="handleDisable(user)"
              >{{ t("users.actionDisable") }}</button>
              <button
                v-else-if="user.status !== 'active' && canToggleUser(user)"
                class="action-button enable"
                @click="handleEnable(user)"
              >{{ t("users.actionEnable") }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <Pagination
      v-model:page="page"
      :total-pages="totalPages"
      :total="total"
      :disabled="loading"
      @change="handlePageChange"
    />

    <!-- 禁用/启用确认弹窗 -->
    <ConfirmDialog
      v-model:visible="confirmVisible"
      :title="confirmAction === 'disable' ? t('users.disableUserTitle') : t('users.enableUserTitle')"
      :message="confirmTarget ? (confirmAction === 'disable' ? t('users.disableConfirmMessage', { name: confirmTarget.nickname }) : t('users.enableConfirmMessage', { name: confirmTarget.nickname })) : ''"
      :danger="confirmAction === 'disable'"
      :confirming="confirming"
      @confirm="handleConfirmAction"
      @cancel="handleConfirmCancel"
    />

    <view v-if="editingUser" class="modal-mask" @click.self="handleCancelEdit" @keydown.esc="onEditKeydown">
      <view class="modal">
        <text class="modal-title">{{ t("users.editUserTitle", { name: editingUser.nickname }) }}</text>
        <view class="form-row">
          <text class="form-label">{{ t("users.nicknameLabel") }}</text>
          <input v-model="editNickname" class="form-input" type="text" :maxlength="NICKNAME_MAX_LENGTH" />
        </view>
        <view class="modal-actions">
          <button class="ghost-button" :disabled="savingEdit" @click="handleCancelEdit">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="savingEdit" @click="handleSaveEdit">
            {{ savingEdit ? t("common.saving") : t("common.save") }}
          </button>
        </view>
        <text class="modal-hint">{{ t("users.editNicknameHint") }}</text>
      </view>
    </view>

    <!-- 用户详情弹窗 -->
    <view v-if="detailVisible" class="modal-mask" @click.self="closeDetail">
      <view class="modal detail-modal">
        <text class="modal-title">{{ t("users.detailTitle") }}</text>
        <view v-if="detailLoading" class="detail-loading">{{ t("common.loading") }}</view>
        <view v-else-if="detailUser" class="detail-body">
          <view class="detail-row">
            <text class="detail-label">{{ t("users.columnId") }}:</text>
            <text>{{ detailUser.id }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("users.columnNickname") }}:</text>
            <text>{{ detailUser.nickname }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("users.columnPhone") }}:</text>
            <text>{{ detailUser.phone || t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("users.bioLabel") }}:</text>
            <text>{{ detailUser.bio || t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("users.campusLabel") }}:</text>
            <text>{{ detailUser.campusName || t("common.emptyPlaceholder") }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("users.verificationLabel") }}:</text>
            <text>{{ verificationLabel(detailUser.verificationStatus) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("users.columnProfileCompletion") }}:</text>
            <text>{{ t("users.profileCompletionValue", { n: detailUser.profileCompletion }) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("users.columnFollowing") }}:</text>
            <text>{{ t("users.followStats", { following: detailUser.followingCount, followers: detailUser.followersCount }) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">{{ t("users.columnRegisteredAt") }}:</text>
            <text>{{ formatDate(detailUser.createdAt) }}</text>
          </view>
        </view>
        <view class="modal-actions">
          <button class="ghost-button" @click="closeDetail">{{ t("common.close") }}</button>
        </view>
      </view>
    </view>

    <!-- 新增用户弹窗 -->
    <view v-if="createVisible" class="modal-mask" @click.self="closeCreateUser">
      <view class="modal">
        <text class="modal-title">{{ t("users.createUserTitle") }}</text>
        <view class="form-row">
          <text class="form-label">{{ t("users.createPhoneLabel") }}</text>
          <input v-model="createPhone" class="form-input" type="text" maxlength="11" :placeholder="t('users.createPhonePlaceholder')" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("users.createPasswordLabel") }}</text>
          <input v-model="createPassword" class="form-input" type="password" :placeholder="t('users.createPasswordPlaceholder')" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("users.createNicknameLabel") }}</text>
          <input v-model="createNickname" class="form-input" type="text" :maxlength="NICKNAME_MAX_LENGTH" :placeholder="t('users.createNicknamePlaceholder')" />
        </view>
        <text v-if="modalError" class="modal-error">{{ modalError }}</text>
        <view class="modal-actions">
          <button class="ghost-button" :disabled="creatingUser" @click="closeCreateUser">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="creatingUser" @click="handleCreateUser">
            {{ creatingUser ? t("common.saving") : t("common.save") }}
          </button>
        </view>
      </view>
    </view>

    <!-- 修改密码弹窗 -->
    <view v-if="changePwdVisible" class="modal-mask" @click.self="closeChangePwd">
      <view class="modal">
        <text class="modal-title">{{ t("users.changePwdTitle") }}</text>
        <view class="form-row">
          <text class="form-label">{{ t("users.changePwdOldLabel") }}</text>
          <input v-model="oldPassword" class="form-input" type="password" :placeholder="t('users.changePwdOldPlaceholder')" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("users.changePwdNewLabel") }}</text>
          <input v-model="newPassword" class="form-input" type="password" :placeholder="t('users.changePwdNewPlaceholder')" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("users.changePwdConfirmLabel") }}</text>
          <input v-model="confirmPassword" class="form-input" type="password" :placeholder="t('users.changePwdConfirmPlaceholder')" />
        </view>
        <text v-if="modalError" class="modal-error">{{ modalError }}</text>
        <view class="modal-actions">
          <button class="ghost-button" :disabled="changingPwd" @click="closeChangePwd">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="changingPwd" @click="handleChangePwd">
            {{ changingPwd ? t("common.saving") : t("common.save") }}
          </button>
        </view>
        <text class="modal-hint">{{ t("users.changePwdHint") }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "@/styles/admin-common.css";

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

.role-super-admin {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
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

.action-button.view {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.action-button.view:hover {
  background: var(--admin-color-info-softer);
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

.modal-error {
  display: block;
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger);
  margin-bottom: var(--admin-space-md);
}

.detail-modal {
  width: 420px;
}

.detail-loading {
  padding: var(--admin-space-xxl);
  text-align: center;
  color: var(--admin-color-text-quaternary);
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
</style>
