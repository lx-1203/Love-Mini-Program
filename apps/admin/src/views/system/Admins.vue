<script setup lang="ts">
/**
 * Admin v2 管理员管理视图（参考旧后台 apps/admin/src/views/Admins.vue 复制并增强）。
 *
 * 增强点：
 * - 「新增管理员」弹窗的校区改为下拉选择：从 listSchoolOptions() 加载启用中的
 *   高校列表（不再手输校区名）；
 * - 其余沿用：角色（ADMIN=校区管理员 / SUPER_ADMIN=全局超级管理员）切换、
 *   手机号 / 初始密码 / 昵称表单、列表禁用/启用。
 *
 * 数据隔离说明：校区管理员登录后，后端 listAdmins 强制按管辖校区过滤，
 * 本页（SUPER_ADMIN 专属）可查看与创建全部高校管理员。
 */
import { ref, onMounted } from "vue";
import {
  listAdmins,
  createAdmin,
  disableAdmin,
  enableAdmin,
  listSchoolOptions,
  type AdminUserSummary,
  type AdminCreateRequest,
  type SchoolView,
} from "../../api/system";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { useI18n } from "vue-i18n";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";
import { useSessionStore } from "../../stores/session";

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
/** 管辖校区名（从 listSchoolOptions() 下拉选择） */
const createCampus = ref("");
const creating = ref(false);
const modalError = ref("");

/** 启用中的高校下拉数据（懒加载一次） */
const schoolOptions = ref<SchoolView[]>([]);
const schoolOptionsLoading = ref(false);

/** 打开创建弹窗时加载校区下拉（仅加载一次，失败可重试） */
async function loadSchoolOptions() {
  if (schoolOptionsLoading.value) return;
  schoolOptionsLoading.value = true;
  try {
    schoolOptions.value = await listSchoolOptions();
  } catch (err) {
    modalError.value = err instanceof ApiError ? err.message : t("admins.actionFailed");
  } finally {
    schoolOptionsLoading.value = false;
  }
}

// ===== 禁用/启用确认 =====
const confirmVisible = ref(false);
const confirmAction = ref<"disable" | "enable">("disable");
const confirmTarget = ref<AdminUserSummary | null>(null);
const confirming = ref(false);

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

/** 打开创建管理员弹窗（重置表单并加载校区下拉） */
function openCreate() {
  createPhone.value = "";
  createPassword.value = "";
  createNickname.value = "";
  createRole.value = "ADMIN";
  createCampus.value = "";
  modalError.value = "";
  createVisible.value = true;
  loadSchoolOptions();
}

function closeCreate() {
  if (creating.value) return;
  createVisible.value = false;
}

/** 角色切换：SUPER_ADMIN 不需要校区，切回 ADMIN 时清空旧选择 */
function switchRole(role: "ADMIN" | "SUPER_ADMIN") {
  createRole.value = role;
  if (role === "SUPER_ADMIN") {
    createCampus.value = "";
  }
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
    const payload: AdminCreateRequest = {
      phone,
      password: createPassword.value,
      nickname,
      role: createRole.value,
      campusName: createRole.value === "ADMIN" ? createCampus.value.trim() : null,
    };
    await createAdmin(payload);
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
      await disableAdmin(target.id);
    } else {
      await enableAdmin(target.id);
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
 * 与后端 toggleUserStatus 权限模型对齐：SUPER_ADMIN 目标禁止操作、自己的账号禁止操作。
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
      <button class="secondary-button" @click="handleReset">{{ t("common.reset") }}</button>
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
            <td :colspan="8" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="admins.length === 0">
            <td :colspan="8" class="empty-row">{{ t("admins.empty") }}</td>
          </tr>
          <tr v-for="admin in admins" :key="admin.id">
            <td>{{ admin.id }}</td>
            <td>{{ admin.nickname }}</td>
            <td>{{ admin.phone ?? "-" }}</td>
            <td>
              <span
                class="role-badge"
                :class="admin.role === 'SUPER_ADMIN' ? 'role-badge--super' : 'role-badge--campus'"
              >
                {{ roleLabel(admin.role, admin.campusName) }}
              </span>
            </td>
            <td>{{ admin.campusName ?? "-" }}</td>
            <td>
              <span
                class="status-badge"
                :class="admin.status === 'active' ? 'status-active' : 'status-disabled'"
              >
                {{ admin.status === "active" ? t("admins.statusActive") : t("admins.statusDisabled") }}
              </span>
            </td>
            <td>{{ formatDateTime(admin.createdAt) }}</td>
            <td>
              <button
                v-if="canToggle(admin) && admin.status === 'active'"
                class="action-button delete"
                @click="askToggle(admin, 'disable')"
              >
                {{ t("admins.actionDisable") }}
              </button>
              <button v-else-if="canToggle(admin)" class="action-button enable" @click="askToggle(admin, 'enable')">
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
      <view class="modal">
        <text class="modal-title">{{ t("admins.createTitle") }}</text>
        <text class="modal-subtitle">{{ t("admins.createSubtitle") }}</text>

        <view class="form-row">
          <text class="form-label">{{ t("admins.createRole") }}</text>
          <view class="role-options">
            <button
              class="role-option"
              :class="{ 'role-option--active': createRole === 'ADMIN' }"
              @click="switchRole('ADMIN')"
            >
              {{ t("admins.roleCampusAdmin") }}
            </button>
            <button
              class="role-option"
              :class="{ 'role-option--active': createRole === 'SUPER_ADMIN' }"
              @click="switchRole('SUPER_ADMIN')"
            >
              {{ t("admins.roleSuperAdmin") }}
            </button>
          </view>
        </view>

        <view v-if="createRole === 'ADMIN'" class="form-row">
          <text class="form-label">{{ t("admins.createCampus") }} <text class="required">*</text></text>
          <select v-model="createCampus" class="filter-select form-select" :disabled="schoolOptionsLoading">
            <option value="" disabled>
              {{ schoolOptionsLoading ? t("admins.createCampusLoading") : t("admins.createCampusSelectPlaceholder") }}
            </option>
            <option v-for="school in schoolOptions" :key="school.id" :value="school.name">
              {{ school.name }}
            </option>
          </select>
          <text v-if="schoolOptions.length === 0 && !schoolOptionsLoading" class="modal-hint">
            {{ t("admins.createCampusEmpty") }}
          </text>
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("admins.createPhone") }} <text class="required">*</text></text>
          <input v-model="createPhone" class="form-input" type="text" :placeholder="t('admins.createPhonePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("admins.createPassword") }} <text class="required">*</text></text>
          <input v-model="createPassword" class="form-input" type="password" :placeholder="t('admins.createPasswordPlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("admins.createNickname") }} <text class="required">*</text></text>
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
      :danger="confirmAction === 'disable'"
      :confirming="confirming"
      :confirm-text="confirmAction === 'disable' ? t('admins.actionDisable') : t('admins.actionEnable')"
      @confirm="confirmToggle"
      @cancel="confirmVisible = false"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.admins-page {
  max-width: 1200px;
}

.required {
  color: var(--admin-color-danger);
}

.modal-subtitle {
  display: block;
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
  margin-bottom: var(--admin-space-lg);
}

.form-select {
  width: 100%;
  min-width: 0;
}

.role-options {
  display: flex;
  gap: var(--admin-space-sm);
}

.role-option {
  flex: 1;
  height: 36px;
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-color-bg-container);
  cursor: pointer;
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-primary);
}

.role-option--active {
  border-color: var(--admin-color-primary);
  background: var(--admin-color-primary-soft);
  color: var(--admin-color-primary);
  font-weight: 600;
}

.role-badge--super {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.role-badge--campus {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.action-disabled {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-placeholder);
}

.modal-error {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-danger);
}
</style>
