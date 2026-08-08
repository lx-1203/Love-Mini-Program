<script setup lang="ts">
/**
 * Admin v2 高校管理视图（eladmin 风格「系统管理 → 学校管理」）。
 *
 * 功能：
 * - 高校列表：name / code / status / sortOrder / createdAt
 * - 关键词搜索（名称/编码）+ 状态筛选 + 分页
 * - 新增/编辑高校（name / code / sortOrder）
 * - 启用/停用切换（toggleSchoolStatus）+ 删除（存在关联管理员时后端 409 透出提示）
 *
 * 说明：停用高校后该校管理员将无法登录后台（页面顶部展示提示文案）。
 */
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  listSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  toggleSchoolStatus,
  type SchoolView,
  type SchoolStatus,
  type SchoolUpsertRequest,
} from "../../api/system";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

const { t } = useI18n();

// ===== 列表数据 =====
const schools = ref<SchoolView[]>([]);
const loading = ref(false);
const errorMsg = ref("");

const keyword = ref("");
const statusFilter = ref<"" | SchoolStatus>("");

const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

async function fetchSchools() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const result = await listSchools({
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    schools.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages || 1;
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("schools.loadFailed");
    schools.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  fetchSchools();
}

function handleReset() {
  keyword.value = "";
  statusFilter.value = "";
  page.value = 1;
  fetchSchools();
}

function handlePageChange(next: number) {
  page.value = next;
  fetchSchools();
}

// ===== 新增/编辑弹窗 =====
interface SchoolForm {
  name: string;
  code: string;
  sortOrder: number;
}

const formVisible = ref(false);
const formMode = ref<"create" | "edit">("create");
const editingId = ref<number | null>(null);
const saving = ref(false);
const formError = ref("");

const form = ref<SchoolForm>({ name: "", code: "", sortOrder: 0 });

function openCreate() {
  form.value = { name: "", code: "", sortOrder: 0 };
  formMode.value = "create";
  editingId.value = null;
  formError.value = "";
  formVisible.value = true;
}

function openEdit(school: SchoolView) {
  form.value = { name: school.name, code: school.code, sortOrder: school.sortOrder };
  formMode.value = "edit";
  editingId.value = school.id;
  formError.value = "";
  formVisible.value = true;
}

function closeForm() {
  if (saving.value) return;
  formVisible.value = false;
}

async function handleSubmit() {
  if (saving.value) return;
  if (!form.value.name.trim()) {
    formError.value = t("schools.nameRequired");
    return;
  }
  if (!form.value.code.trim()) {
    formError.value = t("schools.codeRequired");
    return;
  }

  const payload: SchoolUpsertRequest = {
    name: form.value.name.trim(),
    code: form.value.code.trim(),
    sortOrder: form.value.sortOrder,
  };

  saving.value = true;
  formError.value = "";
  try {
    if (formMode.value === "create") {
      await createSchool(payload);
    } else if (editingId.value !== null) {
      await updateSchool(editingId.value, payload);
    }
    formVisible.value = false;
    await fetchSchools();
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t("schools.saveFailed");
  } finally {
    saving.value = false;
  }
}

// ===== 启用/停用确认 =====
const toggleVisible = ref(false);
const toggleTarget = ref<SchoolView | null>(null);
/** 目标状态（切换后到达的状态） */
const toggleTo = ref<SchoolStatus>("disabled");
const toggling = ref(false);

function askToggle(school: SchoolView) {
  toggleTarget.value = school;
  toggleTo.value = school.status === "enabled" ? "disabled" : "enabled";
  toggleVisible.value = true;
}

async function confirmToggle() {
  const target = toggleTarget.value;
  if (!target || toggling.value) return;
  toggling.value = true;
  try {
    await toggleSchoolStatus(target.id, toggleTo.value);
    toggleVisible.value = false;
    toggleTarget.value = null;
    await fetchSchools();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("schools.toggleFailed");
    toggleVisible.value = false;
  } finally {
    toggling.value = false;
  }
}

// ===== 删除确认 =====
const deleteVisible = ref(false);
const deleteTarget = ref<SchoolView | null>(null);
const deleting = ref(false);

function askDelete(school: SchoolView) {
  deleteTarget.value = school;
  deleteVisible.value = true;
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  try {
    await deleteSchool(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    await fetchSchools();
  } catch (err) {
    // 存在关联管理员时后端返回 409，透出后端错误信息
    errorMsg.value = err instanceof ApiError ? err.message : t("schools.deleteFailed");
    deleteVisible.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  fetchSchools();
});
</script>

<template>
  <view class="schools-page">
    <view class="page-header">
      <text class="page-title">{{ t("schools.title") }}</text>
      <text class="page-subtitle">{{ t("schools.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        :placeholder="t('schools.searchPlaceholder')"
        @keyup.enter="handleSearch"
      />
      <select v-model="statusFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("schools.filterStatusAll") }}</option>
        <option value="enabled">{{ t("schools.statusEnabled") }}</option>
        <option value="disabled">{{ t("schools.statusDisabled") }}</option>
      </select>
      <button class="primary-button" @click="handleSearch">{{ t("common.search") }}</button>
      <button class="secondary-button" @click="handleReset">{{ t("common.reset") }}</button>
      <button class="primary-button" @click="openCreate">{{ t("schools.createTitle") }}</button>
    </view>

    <!-- 停用说明文案：停用高校后该校管理员无法登录 -->
    <view class="notice-banner">{{ t("schools.noticeBanner") }}</view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchSchools" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("schools.columnId") }}</th>
            <th scope="col">{{ t("schools.columnName") }}</th>
            <th scope="col">{{ t("schools.columnCode") }}</th>
            <th scope="col">{{ t("schools.columnStatus") }}</th>
            <th scope="col">{{ t("schools.columnSort") }}</th>
            <th scope="col">{{ t("schools.columnCreatedAt") }}</th>
            <th scope="col">{{ t("schools.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="schools.length === 0">
            <td colspan="7" class="empty-row">{{ t("schools.noData") }}</td>
          </tr>
          <tr v-for="school in schools" :key="school.id">
            <td>{{ school.id }}</td>
            <td>{{ school.name }}</td>
            <td class="text-mono">{{ school.code }}</td>
            <td>
              <span class="status-badge" :class="school.status === 'enabled' ? 'status-active' : 'status-disabled'">
                {{ school.status === "enabled" ? t("schools.statusEnabled") : t("schools.statusDisabled") }}
              </span>
            </td>
            <td>{{ school.sortOrder }}</td>
            <td>{{ formatDateTime(school.createdAt) }}</td>
            <td>
              <view class="action-cell">
                <button class="action-button edit" @click="openEdit(school)">{{ t("schools.actionEdit") }}</button>
                <button
                  class="action-button"
                  :class="school.status === 'enabled' ? 'delete' : 'enable'"
                  @click="askToggle(school)"
                >
                  {{ school.status === "enabled" ? t("schools.actionDisable") : t("schools.actionEnable") }}
                </button>
                <button class="action-button delete" @click="askDelete(school)">{{ t("schools.actionDelete") }}</button>
              </view>
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

    <!-- 新增/编辑高校弹窗 -->
    <view v-if="formVisible" class="modal-mask" @click.self="closeForm">
      <view class="modal">
        <text class="modal-title">{{ formMode === "create" ? t("schools.createTitle") : t("schools.editTitle") }}</text>

        <view class="form-row">
          <text class="form-label">{{ t("schools.nameLabel") }} <text class="required">*</text></text>
          <input v-model="form.name" class="form-input" type="text" :placeholder="t('schools.namePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("schools.codeLabel") }} <text class="required">*</text></text>
          <input v-model="form.code" class="form-input" type="text" :placeholder="t('schools.codePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("schools.sortLabel") }}</text>
          <input v-model.number="form.sortOrder" class="form-input" type="number" :placeholder="t('schools.sortPlaceholder')" />
        </view>

        <text v-if="formError" class="modal-error">{{ formError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="saving" @click="closeForm">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="saving" @click="handleSubmit">
            {{ saving ? t("schools.saving") : t("common.save") }}
          </button>
        </view>
      </view>
    </view>

    <!-- 启用/停用确认 -->
    <ConfirmDialog
      v-model:visible="toggleVisible"
      :title="toggleTo === 'disabled' ? t('schools.disableTitle') : t('schools.enableTitle')"
      :message="
        toggleTo === 'disabled'
          ? t('schools.disableConfirm', { name: toggleTarget?.name ?? '' })
          : t('schools.enableConfirm', { name: toggleTarget?.name ?? '' })
      "
      :danger="toggleTo === 'disabled'"
      :confirming="toggling"
      :confirm-text="toggleTo === 'disabled' ? t('schools.actionDisable') : t('schools.actionEnable')"
      @confirm="confirmToggle"
      @cancel="toggleVisible = false"
    />

    <!-- 删除确认 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="t('schools.deleteTitle')"
      :message="t('schools.deleteMessage', { name: deleteTarget?.name ?? '' })"
      :danger="true"
      :confirming="deleting"
      :confirm-text="t('schools.deleteButton')"
      @confirm="confirmDelete"
      @cancel="deleteVisible = false"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.schools-page {
  max-width: 1100px;
}

.required {
  color: var(--admin-color-danger);
}

.notice-banner {
  padding: var(--admin-space-md) var(--admin-space-lg);
  background: var(--admin-color-warning-soft);
  border-left: 3px solid var(--admin-color-warning);
  border-radius: var(--admin-radius-sm);
  color: var(--admin-color-warning);
  font-size: var(--admin-font-md);
  margin-bottom: var(--admin-space-lg);
}

.modal-error {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-danger);
}
</style>
