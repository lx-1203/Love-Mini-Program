<script setup lang="ts">
/**
 * Admin v2 - 兴趣圈管理视图（社区论坛域）。
 *
 * 对应后端 com.campuslove.api.admin.AdminCircleController：
 * - GET    /api/v1/admin/forum/circles                 （分页列表，支持 keyword 筛选）
 * - POST   /api/v1/admin/forum/circles                 （新增）
 * - PUT    /api/v1/admin/forum/circles/{id}            （编辑，部分更新）
 * - DELETE /api/v1/admin/forum/circles/{id}            （删除；圈下存在话题时后端返回 409）
 * - GET    /api/v1/admin/forum/circles/{id}/topics     （圈内话题列表，跳转 CircleTopics 页查看）
 *
 * 交互：新增/编辑共用表单弹窗（name/icon/description/sortOrder）、
 * 删除走 ConfirmDialog（409 时展示后端提示：圈子下存在话题）、
 * 「查看话题」跳转 CircleTopics 页并携带 circleId 参数。
 */
import { onMounted, ref } from "vue";
import { useRequestRace } from "../../composables/useRequestRace";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
  listCircles,
  createCircle,
  updateCircle,
  deleteCircle,
  type CircleForm,
  type CircleView,
} from "../../api/forum";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

const { t } = useI18n();
const router = useRouter();

// ===== 列表状态 =====
const circles = ref<CircleView[]>([]);
const loading = ref(false);
const errorMsg = ref("");

// ===== 筛选与分页 =====
const keyword = ref("");
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

/** 请求竞态防护 */
const { nextSeq, isStale } = useRequestRace();

/** 分页加载兴趣圈列表 */
async function fetchCircles(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  const seq = nextSeq();
  try {
    const result = await listCircles({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
    });
    if (isStale(seq)) return;
    circles.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (isStale(seq)) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("interestCircles.loadFailed");
    circles.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (!isStale(seq)) {
      loading.value = false;
    }
  }
}

function handleSearch(): void {
  page.value = 1;
  void fetchCircles();
}

function handleResetFilters(): void {
  keyword.value = "";
  handleSearch();
}

function handlePageChange(): void {
  void fetchCircles();
}

// ===== 新增/编辑弹窗 =====
/** 表单状态（sortOrder 用字符串输入，提交时转数字） */
interface CircleFormState {
  name: string;
  icon: string;
  description: string;
  sortOrder: string;
}

const formVisible = ref(false);
/** 当前编辑的圈子 ID；null 表示新增 */
const editingId = ref<number | null>(null);
const form = ref<CircleFormState>({ name: "", icon: "", description: "", sortOrder: "0" });
const saving = ref(false);
const modalError = ref("");

/** 重置表单为初始状态 */
function resetForm(): void {
  form.value = { name: "", icon: "", description: "", sortOrder: "0" };
}

/** 打开新增弹窗 */
function openCreate(): void {
  editingId.value = null;
  resetForm();
  modalError.value = "";
  formVisible.value = true;
}

/** 打开编辑弹窗（列表项已含全部编辑字段，直接回填） */
function openEdit(circle: CircleView): void {
  editingId.value = circle.id;
  form.value = {
    name: circle.name,
    icon: circle.icon,
    description: circle.description ?? "",
    sortOrder: String(circle.sortOrder),
  };
  modalError.value = "";
  formVisible.value = true;
}

function closeForm(): void {
  if (saving.value) return;
  formVisible.value = false;
}

/** 提交新增/编辑（新增时 name 必填，与后端 AdminCircleRequest 校验对齐） */
async function handleSave(): Promise<void> {
  if (saving.value) return;
  const f = form.value;
  if (editingId.value === null && !f.name.trim()) {
    modalError.value = t("interestCircles.nameRequired");
    return;
  }
  // sortOrder 允许为空（后端缺省 0）；非空时必须为合法整数
  let sortOrder: number | undefined;
  const sortTrim = f.sortOrder.trim();
  if (sortTrim !== "") {
    const n = Number(sortTrim);
    if (!Number.isInteger(n)) {
      modalError.value = t("interestCircles.sortMustBeInteger");
      return;
    }
    sortOrder = n;
  }

  const payload: CircleForm = {
    name: f.name.trim() || undefined,
    icon: f.icon.trim() || undefined,
    description: f.description.trim() || undefined,
    sortOrder,
  };
  saving.value = true;
  modalError.value = "";
  try {
    if (editingId.value === null) {
      await createCircle(payload);
    } else {
      await updateCircle(editingId.value, payload);
    }
    formVisible.value = false;
    await fetchCircles();
  } catch (err: unknown) {
    modalError.value = err instanceof ApiError ? err.message : t("interestCircles.saveFailed");
  } finally {
    saving.value = false;
  }
}

// ===== 删除确认（圈下存在话题时后端 409） =====
const deleteVisible = ref(false);
const deleteTarget = ref<CircleView | null>(null);
const deleting = ref(false);

function askDelete(circle: CircleView): void {
  deleteTarget.value = circle;
  deleteVisible.value = true;
}

async function handleConfirmDelete(): Promise<void> {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  try {
    await deleteCircle(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    await fetchCircles();
  } catch (err: unknown) {
    deleteVisible.value = false;
    // 409：圈子下存在话题，展示后端 error 字段提示（http.ts 只透传 message，需自行读取 body）
    if (err instanceof ApiError && err.status === 409) {
      const body = err.body as { error?: string } | null;
      errorMsg.value = body?.error || t("interestCircles.circleHasTopics");
    } else {
      errorMsg.value = err instanceof ApiError ? err.message : t("interestCircles.deleteFailed");
    }
  } finally {
    deleting.value = false;
  }
}

function handleCancelDelete(): void {
  deleteTarget.value = null;
  deleting.value = false;
}

/** 跳转圈内话题管理页（携带 circleId 参数） */
function viewTopics(circle: CircleView): void {
  void router.push({ name: "CircleTopics", query: { circleId: String(circle.id) } });
}

onMounted(() => {
  void fetchCircles();
});
</script>

<template>
  <view class="interest-circles-page">
    <view class="page-header">
      <text class="page-title">{{ t("layout.navInterestCircles") }}</text>
      <text class="page-subtitle">{{ t("interestCircles.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        :placeholder="t('interestCircles.searchPlaceholder')"
        @keyup.enter="handleSearch"
      />
      <button class="ghost-button" @click="handleResetFilters">{{ t("common.reset") }}</button>
      <button class="primary-button" @click="openCreate">{{ t("interestCircles.createButton") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchCircles" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("interestCircles.columnId") }}</th>
            <th scope="col">{{ t("interestCircles.columnName") }}</th>
            <th scope="col">{{ t("interestCircles.columnIcon") }}</th>
            <th scope="col">{{ t("interestCircles.columnDescription") }}</th>
            <th scope="col">{{ t("interestCircles.columnMembers") }}</th>
            <th scope="col">{{ t("interestCircles.columnSort") }}</th>
            <th scope="col">{{ t("interestCircles.columnCreatedAt") }}</th>
            <th scope="col">{{ t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="circles.length === 0">
            <td colspan="8" class="empty-row">{{ t("interestCircles.noData") }}</td>
          </tr>
          <tr v-for="circle in circles" :key="circle.id">
            <td>{{ circle.id }}</td>
            <td>{{ circle.name }}</td>
            <td class="icon-cell">{{ circle.icon }}</td>
            <td class="desc-cell">{{ circle.description ?? "—" }}</td>
            <td>{{ circle.memberCount }}</td>
            <td>{{ circle.sortOrder }}</td>
            <td class="time-cell">{{ formatDateTime(circle.createdAt) }}</td>
            <td class="action-cell">
              <button class="action-button edit" @click="openEdit(circle)">{{ t("common.edit") }}</button>
              <button class="action-button handle" @click="viewTopics(circle)">{{ t("interestCircles.actionViewTopics") }}</button>
              <button class="action-button delete" @click="askDelete(circle)">{{ t("common.delete") }}</button>
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

    <!-- 新增/编辑兴趣圈弹窗 -->
    <view v-if="formVisible" class="modal-mask" @click.self="closeForm">
      <view class="modal circle-form-modal">
        <text class="modal-title">
          {{ editingId === null ? t("interestCircles.createTitle") : t("interestCircles.editTitle", { id: editingId }) }}
        </text>

        <view class="form-row">
          <text class="form-label">{{ t("interestCircles.nameLabel") }}</text>
          <input v-model="form.name" class="form-input" type="text" maxlength="64" :placeholder="t('interestCircles.namePlaceholder')" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("interestCircles.iconLabel") }}</text>
          <input v-model="form.icon" class="form-input" type="text" maxlength="16" :placeholder="t('interestCircles.iconPlaceholder')" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("interestCircles.descriptionLabel") }}</text>
          <textarea v-model="form.description" class="form-textarea" rows="3" maxlength="256" :placeholder="t('interestCircles.descriptionPlaceholder')" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("interestCircles.sortLabel") }}</text>
          <input v-model="form.sortOrder" class="form-input" type="number" :placeholder="t('interestCircles.sortPlaceholder')" />
        </view>

        <text v-if="modalError" class="modal-error">{{ modalError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="saving" @click="closeForm">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="saving" @click="handleSave">
            {{ saving ? t("common.saving") : t("common.save") }}
          </button>
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="t('interestCircles.deleteTitle')"
      :message="deleteTarget ? t('interestCircles.deleteConfirmMessage', { name: deleteTarget.name }) : ''"
      :danger="true"
      :confirming="deleting"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.interest-circles-page {
  max-width: 1200px;
}

.icon-cell {
  font-size: var(--admin-font-xl);
}

.desc-cell {
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

.circle-form-modal {
  width: 480px;
}

.modal-error {
  display: block;
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger);
}
</style>
