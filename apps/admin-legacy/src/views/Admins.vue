<script setup lang="ts">
/**
 * Admin 管理员管理视图（商业模式：每个高校一个管理员）。
 *
 * 功能：
 * - 管理员列表：昵称/手机号/角色（SUPER_ADMIN 全局 / ADMIN 校区）/管辖校区/状态
 * - 创建管理员：手机号 + 初始密码 + 昵称 + 角色 + 校区名（ADMIN 必填校区）
 * - 校区/昵称筛选 + 分页 + 禁用/启用
 *
 * 数据隔离说明：校区管理员登录后，后端 listUsers 强制按管辖校区过滤，
 * 本页（SUPER_ADMIN 专属）可查看与创建全部高校管理员。
 */
import { ref, onMounted } from "vue";
import {
  listAdmins,
  createAdmin,
  disableUser,
  enableUser,
  type AdminUserSummary,
} from "../api/users";
import { ApiError } from "../api/http";
import Pagination from "../components/Pagination.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import ErrorState from "../components/ErrorState.vue";
import { useI18n } from "vue-i18n";
import { formatDateTime } from "../utils/format";
import { DEFAULT_PAGE_SIZE } from "../utils/constants";
import { useSessionStore } from "../stores/session";

const { t } = useI18n();
// 当前登录管理员（用于操作权限判定：后端禁止禁用 SUPER_ADMIN 与自身）
const sessionStore = useSessionStore();

const admins = ref<AdminUserSummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");

const nicknameQuery = ref("");
const campusQuery = ref("");

const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

// ===== 创建管理员弹窗 =====
const createVisible = ref(false);
const createPhone = ref("");
const createPassword = ref("");
const createNickname = ref("");
const createRole = ref<"ADMIN" | "SUPER_ADMIN">("ADMIN");
const createCampus = ref("");
const creating = ref(false);
const modalError = ref("");

// ===== 禁用/启用确认 =====
const confirmVisible = ref(false);
const confirmAction = ref<"disable" | "enable">("disable");
const confirmTarget = ref<AdminUserSummary | null>(null);
const confirming = ref(false);

/** 校区快速候选（演示/常用校区，可手输其他校区名） */
const campusSuggestions = ["南京大学", "东南大学", "河海大学", "南京师范大学", "南京理工大学", "杭州大学", "浙江大学"];

/** 拉取管理员列表 */
async function fetchAdmins() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const result = await listAdmins({
      nickname: nicknameQuery.value.trim() || undefined,
      campusName: campusQuery.value.trim() || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    admins.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("admins.loadFailed");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  fetchAdmins();
}

function handleReset() {
  nicknameQuery.value = "";
  campusQuery.value = "";
  page.value = 1;
  fetchAdmins();
}

function handlePageChange(next: number) {
  page.value = next;
  fetchAdmins();
}

/** 打开创建管理员弹窗（重置表单） */
function openCreate() {
  createPhone.value = "";
  createPassword.value = "";
  createNickname.value = "";
  createRole.value = "ADMIN";
  createCampus.value = "";
  modalError.value = "";
  createVisible.value = true;
}

function closeCreate() {
  if (creating.value) return;
  createVisible.value = false;
}

/** 提交创建管理员（前端校验与后端 AdminCreateAdminRequest 对齐） */
async function handleCreate() {
  if (creating.value) return;
  const phone = createPhone.value.trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    modalError.value = t("admins.createPhoneInvalid");
    return;
  }
  if (createPassword.value.length < 6 || createPassword.value.length > 64) {
    modalError.value = t("admins.createPasswordInvalid");
    return;
  }
  const nickname = createNickname.value.trim();
  if (!nickname || nickname.length > 20) {
    modalError.value = t("admins.createNicknameInvalid");
    return;
  }
  if (createRole.value === "ADMIN" && !createCampus.value.trim()) {
    modalError.value = t("admins.createCampusRequired");
    return;
  }
  creating.value = true;
  modalError.value = "";
  try {
    await createAdmin({
      phone,
      password: createPassword.value,
      nickname,
      role: createRole.value,
      campusName: createRole.value === "ADMIN" ? createCampus.value.trim() : null,
    });
    createVisible.value = false;
    await fetchAdmins();
  } catch (err) {
    modalError.value = err instanceof ApiError ? err.message : t("admins.actionFailed");
  } finally {
    creating.value = false;
  }
}

/** 打开禁用/启用确认 */
function askToggle(admin: AdminUserSummary, action: "disable" | "enable") {
  confirmAction.value = action;
  confirmTarget.value = admin;
  confirmVisible.value = true;
}

/** 执行禁用/启用 */
async function confirmToggle() {
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
    await fetchAdmins();
  } catch (err) {
    modalError.value = err instanceof ApiError ? err.message : t("admins.actionFailed");
    confirmVisible.value = false;
  } finally {
    confirming.value = false;
  }
}

/** 角色文案（SUPER_ADMIN 全局 / ADMIN 校区） */
function roleLabel(role: string, campusName: string | null): string {
  if (role === "SUPER_ADMIN") return t("admins.roleSuperAdmin");
  return campusName ? t("admins.roleCampusAdmin") : t("admins.roleAdmin");
}

/**
 * 当前管理员是否可对目标管理员执行禁用/启用。
 *
 * 与后端 toggleUserStatus 权限模型对齐：
 * - SUPER_ADMIN 目标禁止操作（后端 400）
 * - 自己的账号禁止操作（后端 400）
 * - 校区管理员（ADMIN）目标可由超级管理员操作
 */
function canToggle(admin: AdminUserSummary): boolean {
  if (admin.role === "SUPER_ADMIN") return false;
  return admin.id !== sessionStore.user?.id;
}

onMounted(() => {
  fetchAdmins();
});
</script>

<template>
  <view class="admins-page">
    <view class="page-header">
      <text class="page-title">{{ t("admins.title") }}</text>
      <text class="page-subtitle">{{ t("admins.tableSubtitle") }}</text>
    </view>

    <view class="toolbar">
      <input
        v-model="nicknameQuery"
        class="search-input"
        type="text"
        :placeholder="t('admins.searchNicknamePlaceholder')"
        @keyup.enter="handleSearch"
      />
      <input
        v-model="campusQuery"
        class="search-input"
        type="text"
        :placeholder="t('admins.searchCampusPlaceholder')"
        @keyup.enter="handleSearch"
      />
      <button class="primary-button" @click="handleSearch">{{ t("common.search") }}</button>
      <button class="ghost-button" @click="handleReset">{{ t("common.reset") }}</button>
      <button class="primary-button" @click="openCreate">{{ t("admins.actionCreateAdmin") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchAdmins" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("admins.columnId") }}</th>
            <th scope="col">{{ t("admins.columnNickname") }}</th>
            <th scope="col">{{ t("admins.columnPhone") }}</th>
            <th scope="col">{{ t("admins.columnRole") }}</th>
            <th scope="col">{{ t("admins.columnCampus") }}</th>
            <th scope="col">{{ t("admins.columnStatus") }}</th>
            <th scope="col">{{ t("admins.columnCreatedAt") }}</th>
            <th scope="col">{{ t("admins.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="8" class="table-empty">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="admins.length === 0">
            <td :colspan="8" class="table-empty">{{ t("admins.empty") }}</td>
          </tr>
          <tr v-for="admin in admins" :key="admin.id">
            <td>{{ admin.id }}</td>
            <td>{{ admin.nickname }}</td>
            <td>{{ admin.phone ?? "-" }}</td>
            <td>
              <span class="role-badge" :class="admin.role === 'SUPER_ADMIN' ? 'role-badge--super' : 'role-badge--campus'">
                {{ roleLabel(admin.role, admin.campusName) }}
              </span>
            </td>
            <td>{{ admin.campusName ?? "-" }}</td>
            <td>
              <span class="status-badge" :class="admin.status === 'active' ? 'status-badge--active' : 'status-badge--disabled'">
                {{ admin.status === "active" ? t("admins.statusActive") : t("admins.statusDisabled") }}
              </span>
            </td>
            <td>{{ formatDateTime(admin.createdAt) }}</td>
            <td>
              <button
                v-if="canToggle(admin) && admin.status === 'active'"
                class="action-button danger"
                @click="askToggle(admin, 'disable')"
              >
                {{ t("admins.actionDisable") }}
              </button>
              <button v-else-if="canToggle(admin)" class="action-button" @click="askToggle(admin, 'enable')">
                {{ t("admins.actionEnable") }}
              </button>
              <span v-else class="action-disabled">{{ t("admins.actionUnavailable") }}</span>
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

    <!-- 创建管理员弹窗 -->
    <view v-if="createVisible" class="modal-mask" @click.self="closeCreate">
      <view class="modal-card">
        <text class="modal-title">{{ t("admins.createTitle") }}</text>
        <text class="modal-subtitle">{{ t("admins.createSubtitle") }}</text>

        <view class="form-field">
          <text class="form-label">{{ t("admins.createRole") }}</text>
          <view class="role-options">
            <button
              class="role-option"
              :class="{ 'role-option--active': createRole === 'ADMIN' }"
              @click="createRole = 'ADMIN'"
            >
              {{ t("admins.roleCampusAdmin") }}
            </button>
            <button
              class="role-option"
              :class="{ 'role-option--active': createRole === 'SUPER_ADMIN' }"
              @click="createRole = 'SUPER_ADMIN'"
            >
              {{ t("admins.roleSuperAdmin") }}
            </button>
          </view>
        </view>

        <view v-if="createRole === 'ADMIN'" class="form-field">
          <text class="form-label">{{ t("admins.createCampus") }}</text>
          <input
            v-model="createCampus"
            class="form-input"
            type="text"
            :placeholder="t('admins.createCampusPlaceholder')"
            list="campus-suggestions"
          />
          <datalist id="campus-suggestions">
            <option v-for="c in campusSuggestions" :key="c" :value="c" />
          </datalist>
        </view>

        <view class="form-field">
          <text class="form-label">{{ t("admins.createPhone") }}</text>
          <input v-model="createPhone" class="form-input" type="text" :placeholder="t('admins.createPhonePlaceholder')" />
        </view>

        <view class="form-field">
          <text class="form-label">{{ t("admins.createPassword") }}</text>
          <input v-model="createPassword" class="form-input" type="password" :placeholder="t('admins.createPasswordPlaceholder')" />
        </view>

        <view class="form-field">
          <text class="form-label">{{ t("admins.createNickname") }}</text>
          <input v-model="createNickname" class="form-input" type="text" :placeholder="t('admins.createNicknamePlaceholder')" />
        </view>

        <text v-if="modalError" class="modal-error">{{ modalError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="creating" @click="closeCreate">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="creating" @click="handleCreate">
            {{ creating ? t("common.loading") : t("admins.actionCreateAdmin") }}
          </button>
        </view>
      </view>
    </view>

    <!-- 禁用/启用确认 -->
    <ConfirmDialog
      v-model:visible="confirmVisible"
      :title="confirmAction === 'disable' ? t('admins.disableTitle') : t('admins.enableTitle')"
      :message="
        confirmAction === 'disable'
          ? t('admins.disableConfirm', { nickname: confirmTarget?.nickname ?? '' })
          : t('admins.enableConfirm', { nickname: confirmTarget?.nickname ?? '' })
      "
      :confirm-text="confirmAction === 'disable' ? t('admins.actionDisable') : t('admins.actionEnable')"
      :confirming="confirming"
      @confirm="confirmToggle"
      @cancel="confirmVisible = false"
    />
  </view>
</template>

<style scoped>
.admins-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  display: block;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-secondary, #64748b);
  margin-top: 4px;
  display: block;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-input {
  width: 180px;
}

.table-container {
  background: #fff;
  border-radius: 8px;
  overflow-x: auto;
}

.role-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.role-badge--super {
  background: #fef3c7;
  color: #b45309;
}

.role-badge--campus {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.status-badge--active {
  background: #dcfce7;
  color: #15803d;
}

.status-badge--disabled {
  background: #fee2e2;
  color: #b91c1c;
}

.table-empty {
  text-align: center;
  color: var(--text-secondary, #64748b);
  padding: 32px 0;
}

.action-button {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
}

.action-button.danger {
  color: #b91c1c;
  border-color: #fecaca;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
}

.modal-subtitle {
  font-size: 12px;
  color: var(--text-secondary, #64748b);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
}

.role-options {
  display: flex;
  gap: 8px;
}

.role-option {
  flex: 1;
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}

.role-option--active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.modal-error {
  font-size: 12px;
  color: #b91c1c;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
</style>
