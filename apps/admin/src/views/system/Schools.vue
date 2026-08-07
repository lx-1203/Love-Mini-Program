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
    errorMsg.value = err instanceof ApiError ? err.message : "加载高校列表失败";
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
    formError.value = "高校名称不能为空";
    return;
  }
  if (!form.value.code.trim()) {
    formError.value = "高校编码不能为空";
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
    formError.value = err instanceof ApiError ? err.message : "保存失败，请重试";
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
    errorMsg.value = err instanceof ApiError ? err.message : "状态切换失败";
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
    errorMsg.value = err instanceof ApiError ? err.message : "删除失败，请重试";
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
      <text class="page-title">学校管理</text>
      <text class="page-subtitle">维护接入平台的高校列表，为每个高校创建校区管理员</text>
    </view>

    <view class="toolbar">
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        placeholder="搜索高校名称 / 编码"
        @keyup.enter="handleSearch"
      />
      <select v-model="statusFilter" class="filter-select" @change="handleSearch">
        <option value="">全部状态</option>
        <option value="enabled">已启用</option>
        <option value="disabled">已停用</option>
      </select>
      <button class="primary-button" @click="handleSearch">搜索</button>
      <button class="secondary-button" @click="handleReset">重置</button>
      <button class="primary-button" @click="openCreate">新增高校</button>
    </view>

    <!-- 停用说明文案：停用高校后该校管理员无法登录 -->
    <view class="notice-banner">停用高校后，该校管理员将无法登录后台；启用后恢复登录。</view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchSchools" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">高校名称</th>
            <th scope="col">编码</th>
            <th scope="col">状态</th>
            <th scope="col">排序</th>
            <th scope="col">创建时间</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty-row">加载中...</td>
          </tr>
          <tr v-else-if="schools.length === 0">
            <td colspan="7" class="empty-row">暂无高校，点击「新增高校」创建</td>
          </tr>
          <tr v-for="school in schools" :key="school.id">
            <td>{{ school.id }}</td>
            <td>{{ school.name }}</td>
            <td class="text-mono">{{ school.code }}</td>
            <td>
              <span class="status-badge" :class="school.status === 'enabled' ? 'status-active' : 'status-disabled'">
                {{ school.status === "enabled" ? "已启用" : "已停用" }}
              </span>
            </td>
            <td>{{ school.sortOrder }}</td>
            <td>{{ formatDateTime(school.createdAt) }}</td>
            <td>
              <view class="action-cell">
                <button class="action-button edit" @click="openEdit(school)">编辑</button>
                <button
                  class="action-button"
                  :class="school.status === 'enabled' ? 'delete' : 'enable'"
                  @click="askToggle(school)"
                >
                  {{ school.status === "enabled" ? "停用" : "启用" }}
                </button>
                <button class="action-button delete" @click="askDelete(school)">删除</button>
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
        <text class="modal-title">{{ formMode === "create" ? "新增高校" : "编辑高校" }}</text>

        <view class="form-row">
          <text class="form-label">高校名称 <text class="required">*</text></text>
          <input v-model="form.name" class="form-input" type="text" placeholder="如：南京大学" />
        </view>

        <view class="form-row">
          <text class="form-label">高校编码 <text class="required">*</text></text>
          <input v-model="form.code" class="form-input" type="text" placeholder="如：nju（唯一，建议英文小写）" />
        </view>

        <view class="form-row">
          <text class="form-label">排序号</text>
          <input v-model.number="form.sortOrder" class="form-input" type="number" placeholder="0（越小越靠前）" />
        </view>

        <text v-if="formError" class="modal-error">{{ formError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="saving" @click="closeForm">取消</button>
          <button class="primary-button" :disabled="saving" @click="handleSubmit">
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </view>
      </view>
    </view>

    <!-- 启用/停用确认 -->
    <ConfirmDialog
      v-model:visible="toggleVisible"
      :title="toggleTo === 'disabled' ? '停用高校' : '启用高校'"
      :message="
        toggleTo === 'disabled'
          ? `确定要停用「${toggleTarget?.name ?? ''}」吗？停用后该校管理员将无法登录后台。`
          : `确定要启用「${toggleTarget?.name ?? ''}」吗？`
      "
      :danger="toggleTo === 'disabled'"
      :confirming="toggling"
      :confirm-text="toggleTo === 'disabled' ? '停用' : '启用'"
      @confirm="confirmToggle"
      @cancel="toggleVisible = false"
    />

    <!-- 删除确认 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      title="删除高校"
      :message="`确定要删除「${deleteTarget?.name ?? ''}」吗？存在关联管理员时后端将拒绝删除。`"
      :danger="true"
      :confirming="deleting"
      confirm-text="删除"
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
