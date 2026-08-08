<script setup lang="ts">
/**
 * Admin v2 - 活动管理视图（活动运营域）。
 *
 * 对应后端 com.campuslove.api.admin.AdminActivityController：
 * - GET    /api/v1/admin/activities                （分页列表，支持 keyword/status/published/campusName 筛选）
 * - GET    /api/v1/admin/activities/{id}           （详情，编辑弹窗回填用）
 * - POST   /api/v1/admin/activities                 （新增）
 * - PUT    /api/v1/admin/activities/{id}            （编辑）
 * - POST   /api/v1/admin/activities/{id}/publish    （上架）
 * - POST   /api/v1/admin/activities/{id}/unpublish  （下架）
 * - DELETE /api/v1/admin/activities/{id}            （删除，报名记录一并清除）
 *
 * 交互参考旧后台 Admins.vue（表格+筛选+分页+弹窗）与 Posts.vue（ConfirmDialog 二次确认）：
 * - 新增/编辑共用表单弹窗（title/location/scheduleText/description/cityName/campusName/activityDate/status）；
 * - 上架/下架、删除走 ConfirmDialog 确认；上架状态由列表行内按钮切换；
 * - 「查看报名」跳转 Enrollments 页并携带 activityId 参数。
 *
 * 注意：活动状态 status（upcoming/ongoing/ended）与上架状态 published 是两套独立维度。
 */
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
  listActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  publishActivity,
  unpublishActivity,
  type ActivityForm,
  type ActivityStatus,
  type ActivitySummary,
} from "../../api/activities";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

const { t } = useI18n();
const router = useRouter();

// ===== 列表状态 =====
const activities = ref<ActivitySummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");

// ===== 筛选条件 =====
const keyword = ref("");
const statusFilter = ref<"" | ActivityStatus>("");
const publishedFilter = ref<"" | "true" | "false">("");

// ===== 分页状态 =====
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

/** 请求竞态防护：快速翻页/搜索时旧响应不覆盖新数据 */
let reqSeq = 0;

/** 分页加载活动列表 */
async function fetchActivities(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listActivities({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value || undefined,
      published: publishedFilter.value === "" ? undefined : publishedFilter.value === "true",
    });
    if (seq !== reqSeq) return; // 丢弃过期响应
    activities.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("activities.loadFailed");
    activities.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** 搜索/重置：回到第一页再查询 */
function handleSearch(): void {
  page.value = 1;
  void fetchActivities();
}

/** 重置全部筛选条件 */
function handleResetFilters(): void {
  keyword.value = "";
  statusFilter.value = "";
  publishedFilter.value = "";
  handleSearch();
}

/** 分页变更回调（Pagination 组件触发） */
function handlePageChange(): void {
  void fetchActivities();
}

// ===== 新增/编辑弹窗 =====
/** 表单状态（与后端 AdminActivityRequest 对齐） */
interface ActivityFormState {
  title: string;
  location: string;
  scheduleText: string;
  description: string;
  cityName: string;
  campusName: string;
  activityDate: string;
  status: ActivityStatus;
}

const formVisible = ref(false);
/** 当前编辑的活动 ID；null 表示新增 */
const editingId = ref<number | null>(null);
const form = ref<ActivityFormState>({
  title: "",
  location: "",
  scheduleText: "",
  description: "",
  cityName: "",
  campusName: "",
  activityDate: "",
  status: "upcoming",
});
const saving = ref(false);
const modalError = ref("");

/** 重置表单为初始状态 */
function resetForm(): void {
  form.value = {
    title: "",
    location: "",
    scheduleText: "",
    description: "",
    cityName: "",
    campusName: "",
    activityDate: "",
    status: "upcoming",
  };
}

/** 打开新增弹窗 */
function openCreate(): void {
  editingId.value = null;
  resetForm();
  modalError.value = "";
  formVisible.value = true;
}

/** 打开编辑弹窗（先拉详情回填，列表摘要不含 description） */
async function openEdit(activity: ActivitySummary): Promise<void> {
  errorMsg.value = "";
  try {
    const detail = await getActivity(activity.id);
    form.value = {
      title: detail.title,
      location: detail.location,
      scheduleText: detail.scheduleText,
      description: detail.description,
      cityName: detail.cityName ?? "",
      campusName: detail.campusName ?? "",
      activityDate: detail.activityDate ?? "",
      status: detail.status ?? "upcoming",
    };
    editingId.value = activity.id;
    modalError.value = "";
    formVisible.value = true;
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : t("activities.detailLoadFailed");
  }
}

/** 关闭弹窗（保存中禁止关闭，防重复提交） */
function closeForm(): void {
  if (saving.value) return;
  formVisible.value = false;
}

/** 提交新增/编辑（必填校验与后端 AdminActivityRequest 对齐） */
async function handleSave(): Promise<void> {
  if (saving.value) return;
  const f = form.value;
  // 必填字段前端预校验（title/location/scheduleText/description）
  if (!f.title.trim()) {
    modalError.value = t("activities.titleRequired");
    return;
  }
  if (!f.location.trim()) {
    modalError.value = t("activities.locationRequired");
    return;
  }
  if (!f.scheduleText.trim()) {
    modalError.value = t("activities.scheduleTextRequired");
    return;
  }
  if (!f.description.trim()) {
    modalError.value = t("activities.descriptionRequired");
    return;
  }
  const payload: ActivityForm = {
    title: f.title.trim(),
    location: f.location.trim(),
    scheduleText: f.scheduleText.trim(),
    description: f.description.trim(),
    cityName: f.cityName.trim() || undefined,
    campusName: f.campusName.trim() || undefined,
    activityDate: f.activityDate || undefined,
    status: f.status,
  };
  saving.value = true;
  modalError.value = "";
  try {
    if (editingId.value === null) {
      await createActivity(payload);
    } else {
      await updateActivity(editingId.value, payload);
    }
    formVisible.value = false;
    await fetchActivities();
  } catch (err: unknown) {
    modalError.value = err instanceof ApiError ? err.message : t("activities.saveFailed");
  } finally {
    saving.value = false;
  }
}

// ===== 上架/下架/删除确认（共用 ConfirmDialog） =====
type ConfirmAction = "publish" | "unpublish" | "delete";
const confirmVisible = ref(false);
const confirmAction = ref<ConfirmAction>("publish");
const confirmTarget = ref<ActivitySummary | null>(null);
const confirming = ref(false);

/** 弹窗标题与正文：按 action 生成 */
const confirmTitle = () =>
  confirmAction.value === "publish"
    ? t("activities.publishTitle")
    : confirmAction.value === "unpublish"
      ? t("activities.unpublishTitle")
      : t("activities.deleteTitle");

const confirmMessage = () => {
  const target = confirmTarget.value;
  if (!target) return "";
  if (confirmAction.value === "delete") {
    return t("activities.deleteConfirmMessage", { title: target.title });
  }
  return confirmAction.value === "publish"
    ? t("activities.publishConfirm", { title: target.title })
    : t("activities.unpublishConfirm", { title: target.title });
};

/** 打开确认弹窗（上架/下架/删除共用） */
function askConfirm(action: ConfirmAction, activity: ActivitySummary): void {
  confirmAction.value = action;
  confirmTarget.value = activity;
  confirmVisible.value = true;
}

/** ConfirmDialog 确认回调：按 action 执行对应操作 */
async function handleConfirm(): Promise<void> {
  const target = confirmTarget.value;
  if (!target || confirming.value) return;
  confirming.value = true;
  try {
    if (confirmAction.value === "publish") {
      await publishActivity(target.id);
    } else if (confirmAction.value === "unpublish") {
      await unpublishActivity(target.id);
    } else {
      await deleteActivity(target.id);
    }
    confirmVisible.value = false;
    confirmTarget.value = null;
    await fetchActivities();
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : t("activities.actionFailed");
    confirmVisible.value = false;
  } finally {
    confirming.value = false;
  }
}

/** ConfirmDialog 取消回调 */
function handleCancelConfirm(): void {
  confirmTarget.value = null;
  confirming.value = false;
}

/** 跳转报名管理页（携带 activityId 参数） */
function viewEnrollments(activity: ActivitySummary): void {
  void router.push({ name: "Enrollments", query: { activityId: String(activity.id) } });
}

// ===== 展示辅助 =====
/** 活动状态文案 */
function statusLabel(status: string | null): string {
  switch (status) {
    case "upcoming":
      return t("activities.statusUpcoming");
    case "ongoing":
      return t("activities.statusOngoing");
    case "ended":
      return t("activities.statusEnded");
    default:
      return status ?? "—";
  }
}

onMounted(() => {
  void fetchActivities();
});
</script>

<template>
  <view class="activities-page">
    <view class="page-header">
      <text class="page-title">{{ t("layout.navActivities") }}</text>
      <text class="page-subtitle">{{ t("activities.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        :placeholder="t('activities.searchPlaceholder')"
        @keyup.enter="handleSearch"
      />
      <select v-model="statusFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("activities.filterStatusAll") }}</option>
        <option value="upcoming">{{ t("activities.statusUpcoming") }}</option>
        <option value="ongoing">{{ t("activities.statusOngoing") }}</option>
        <option value="ended">{{ t("activities.statusEnded") }}</option>
      </select>
      <select v-model="publishedFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("activities.filterPublishedAll") }}</option>
        <option value="true">{{ t("activities.published") }}</option>
        <option value="false">{{ t("activities.unpublished") }}</option>
      </select>
      <button class="ghost-button" @click="handleResetFilters">{{ t("common.reset") }}</button>
      <button class="primary-button" @click="openCreate">{{ t("activities.createButton") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchActivities" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("activities.columnId") }}</th>
            <th scope="col">{{ t("activities.columnTitle") }}</th>
            <th scope="col">{{ t("activities.columnLocation") }}</th>
            <th scope="col">{{ t("activities.columnCampus") }}</th>
            <th scope="col">{{ t("activities.columnStatus") }}</th>
            <th scope="col">{{ t("activities.columnPublished") }}</th>
            <th scope="col">{{ t("activities.columnEnrollments") }}</th>
            <th scope="col">{{ t("activities.columnDate") }}</th>
            <th scope="col">{{ t("activities.columnCreatedAt") }}</th>
            <th scope="col">{{ t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="activities.length === 0">
            <td colspan="10" class="empty-row">{{ t("activities.noData") }}</td>
          </tr>
          <tr v-for="activity in activities" :key="activity.id">
            <td>{{ activity.id }}</td>
            <td class="title-cell">{{ activity.title }}</td>
            <td>{{ activity.location }}</td>
            <td>{{ activity.campusName ?? "—" }}</td>
            <td>
              <span class="status-badge" :class="`status-${activity.status ?? 'none'}`">
                {{ statusLabel(activity.status) }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="activity.published ? 'badge-published' : 'badge-unpublished'">
                {{ activity.published ? t("activities.published") : t("activities.unpublished") }}
              </span>
            </td>
            <td>{{ activity.enrollmentCount }}</td>
            <td>{{ activity.activityDate ?? "—" }}</td>
            <td class="time-cell">{{ formatDateTime(activity.createdAt) }}</td>
            <td class="action-cell">
              <button class="action-button edit" @click="openEdit(activity)">{{ t("common.edit") }}</button>
              <button
                v-if="activity.published"
                class="action-button delete"
                @click="askConfirm('unpublish', activity)"
              >{{ t("activities.actionUnpublish") }}</button>
              <button v-else class="action-button enable" @click="askConfirm('publish', activity)">{{ t("activities.actionPublish") }}</button>
              <button class="action-button handle" @click="viewEnrollments(activity)">{{ t("activities.actionViewEnrollments") }}</button>
              <button class="action-button delete" @click="askConfirm('delete', activity)">{{ t("common.delete") }}</button>
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

    <!-- 新增/编辑活动弹窗 -->
    <view v-if="formVisible" class="modal-mask" @click.self="closeForm">
      <view class="modal activity-form-modal">
        <text class="modal-title">
          {{ editingId === null ? t("activities.createTitle") : t("activities.editTitle", { id: editingId }) }}
        </text>

        <view class="form-row">
          <text class="form-label">{{ t("activities.titleLabel") }}</text>
          <input v-model="form.title" class="form-input" type="text" maxlength="128" :placeholder="t('activities.titlePlaceholder')" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("activities.locationLabel") }}</text>
          <input v-model="form.location" class="form-input" type="text" maxlength="256" :placeholder="t('activities.locationPlaceholder')" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("activities.scheduleTextLabel") }}</text>
          <input v-model="form.scheduleText" class="form-input" type="text" maxlength="128" :placeholder="t('activities.scheduleTextPlaceholder')" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("activities.descriptionLabel") }}</text>
          <textarea v-model="form.description" class="form-textarea" rows="3" :placeholder="t('activities.descriptionPlaceholder')" />
        </view>
        <view class="form-row form-row-inline">
          <view class="form-col">
            <text class="form-label">{{ t("activities.cityLabel") }}</text>
            <input v-model="form.cityName" class="form-input" type="text" maxlength="64" :placeholder="t('activities.cityPlaceholder')" />
          </view>
          <view class="form-col">
            <text class="form-label">{{ t("activities.campusLabel") }}</text>
            <input v-model="form.campusName" class="form-input" type="text" maxlength="128" :placeholder="t('activities.campusPlaceholder')" />
          </view>
        </view>
        <view class="form-row form-row-inline">
          <view class="form-col">
            <text class="form-label">{{ t("activities.dateLabel") }}</text>
            <input v-model="form.activityDate" class="form-input" type="date" />
          </view>
          <view class="form-col">
            <text class="form-label">{{ t("activities.statusLabel") }}</text>
            <select v-model="form.status" class="form-input">
              <option value="upcoming">{{ t("activities.statusUpcoming") }}</option>
              <option value="ongoing">{{ t("activities.statusOngoing") }}</option>
              <option value="ended">{{ t("activities.statusEnded") }}</option>
            </select>
          </view>
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

    <!-- 上架/下架/删除确认 -->
    <ConfirmDialog
      v-model:visible="confirmVisible"
      :title="confirmTitle()"
      :message="confirmMessage()"
      :danger="confirmAction === 'delete'"
      :confirm-text="
        confirmAction === 'delete'
          ? t('common.delete')
          : confirmAction === 'publish'
            ? t('activities.actionPublish')
            : t('activities.actionUnpublish')
      "
      :confirming="confirming"
      @confirm="handleConfirm"
      @cancel="handleCancelConfirm"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.activities-page {
  max-width: 1400px;
}

.title-cell {
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

/* 活动状态徽章配色 */
.status-upcoming {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.status-ongoing {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-ended {
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-quaternary);
}

/* 上架状态徽章配色 */
.badge-published {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.badge-unpublished {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

/* 表单弹窗：字段较多，加宽到 560px */
.activity-form-modal {
  width: 560px;
}

.form-row-inline {
  flex-direction: row;
  gap: var(--admin-space-lg);
}

.form-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-xxs);
}

.modal-error {
  display: block;
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger);
}
</style>
