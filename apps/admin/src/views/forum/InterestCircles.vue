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
  listCircleAnnouncements,
  createCircleAnnouncement,
  updateCircleAnnouncement,
  publishCircleAnnouncement,
  offlineCircleAnnouncement,
  pinCircleAnnouncement,
  unpinCircleAnnouncement,
  deleteCircleAnnouncement,
  type CircleForm,
  type CircleView,
  type CircleAnnouncementView,
} from "../../api/forum";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";
import { useSessionStore } from "../../stores/session";

const { t } = useI18n();
const router = useRouter();
const sessionStore = useSessionStore();

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
  tags: string;
}

const formVisible = ref(false);
/** 当前编辑的圈子 ID；null 表示新增 */
const editingId = ref<number | null>(null);
const form = ref<CircleFormState>({ name: "", icon: "", description: "", sortOrder: "0", tags: "" });
const saving = ref(false);
const modalError = ref("");

/** 重置表单为初始状态 */
function resetForm(): void {
  form.value = { name: "", icon: "", description: "", sortOrder: "0", tags: "" };
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
    tags: circle.tags ?? "",
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
  if (!sessionStore.canWrite) return;
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
    tags: f.tags.trim(),
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

// ===== 圈子公告（2026-10-28 表化） =====
const announcementDrawerVisible = ref(false);
const announcementCircle = ref<CircleView | null>(null);
const announcements = ref<CircleAnnouncementView[]>([]);
const announcementsLoading = ref(false);
const announcementError = ref("");
const announcementFormVisible = ref(false);
const announcementEditingId = ref<number | null>(null);
const announcementForm = ref({ title: "", content: "" });
const announcementSaving = ref(false);

async function openAnnouncements(circle: CircleView): Promise<void> {
  announcementCircle.value = circle;
  announcementDrawerVisible.value = true;
  announcementFormVisible.value = false;
  announcementEditingId.value = null;
  await loadAnnouncements();
}

function closeAnnouncements(): void {
  announcementDrawerVisible.value = false;
  announcementCircle.value = null;
  announcements.value = [];
  announcementError.value = "";
}

async function loadAnnouncements(): Promise<void> {
  const circle = announcementCircle.value;
  if (!circle) return;
  announcementsLoading.value = true;
  announcementError.value = "";
  try {
    const result = await listCircleAnnouncements(circle.id, 1, 100);
    announcements.value = result.items;
  } catch (err: unknown) {
    announcementError.value = err instanceof ApiError
      ? err.message
      : t("interestCircles.announcementLoadFailed");
    announcements.value = [];
  } finally {
    announcementsLoading.value = false;
  }
}

function openAnnouncementCreate(): void {
  announcementEditingId.value = null;
  announcementForm.value = { title: "", content: "" };
  announcementFormVisible.value = true;
}

function openAnnouncementEdit(item: CircleAnnouncementView): void {
  announcementEditingId.value = item.id;
  announcementForm.value = { title: item.title ?? "", content: item.content };
  announcementFormVisible.value = true;
}

function closeAnnouncementForm(): void {
  if (announcementSaving.value) return;
  announcementFormVisible.value = false;
}

async function saveAnnouncement(): Promise<void> {
  const circle = announcementCircle.value;
  if (!circle || !sessionStore.canWrite || announcementSaving.value) return;
  if (!announcementForm.value.content.trim()) {
    announcementError.value = t("interestCircles.announcementContentRequired");
    return;
  }
  announcementSaving.value = true;
  announcementError.value = "";
  try {
    const payload = {
      title: announcementForm.value.title.trim() || undefined,
      content: announcementForm.value.content.trim(),
    };
    if (announcementEditingId.value === null) {
      await createCircleAnnouncement(circle.id, payload);
    } else {
      await updateCircleAnnouncement(circle.id, announcementEditingId.value, payload);
    }
    announcementFormVisible.value = false;
    await loadAnnouncements();
  } catch (err: unknown) {
    announcementError.value = err instanceof ApiError
      ? err.message
      : t("interestCircles.announcementSaveFailed");
  } finally {
    announcementSaving.value = false;
  }
}

async function runAnnouncementAction(action: () => Promise<unknown>): Promise<void> {
  announcementError.value = "";
  try {
    await action();
    await loadAnnouncements();
  } catch (err: unknown) {
    announcementError.value = err instanceof ApiError
      ? err.message
      : t("interestCircles.announcementActionFailed");
  }
}

function announcementStatusLabel(status: CircleAnnouncementView["status"]): string {
  if (status === "published") return t("interestCircles.announcementStatusPublished");
  if (status === "offline") return t("interestCircles.announcementStatusOffline");
  return t("interestCircles.announcementStatusDraft");
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
  if (!sessionStore.canWrite) return;
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
      <button v-if="sessionStore.canWrite" class="primary-button" @click="openCreate">{{ t("interestCircles.createButton") }}</button>
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
              <button v-if="sessionStore.canWrite" class="action-button edit" @click="openEdit(circle)">{{ t("common.edit") }}</button>
              <button class="action-button handle" @click="openAnnouncements(circle)">{{ t("interestCircles.actionAnnouncements") }}</button>
              <button class="action-button handle" @click="viewTopics(circle)">{{ t("interestCircles.actionViewTopics") }}</button>
              <button v-if="sessionStore.canWrite" class="action-button delete" @click="askDelete(circle)">{{ t("common.delete") }}</button>
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
          <text class="form-label">{{ t("interestCircles.tagsLabel") }}</text>
          <input v-model="form.tags" class="form-input" type="text" maxlength="255" :placeholder="t('interestCircles.tagsPlaceholder')" />
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

    <!-- 圈子公告抽屉（2026-10-28 表化；同圈 published 至多一条置顶） -->
    <view v-if="announcementDrawerVisible" class="modal-mask" @click.self="closeAnnouncements">
      <view class="modal announcement-modal">
        <text class="modal-title">
          {{ t("interestCircles.announcementTitle") }}{{ announcementCircle ? ` · ${announcementCircle.name}` : "" }}
        </text>
        <text class="announcement-subtitle">{{ t("interestCircles.announcementSubtitle") }}</text>

        <view class="announcement-toolbar">
          <button v-if="sessionStore.canWrite" class="primary-button" :disabled="announcementSaving" @click="openAnnouncementCreate">
            {{ t("interestCircles.announcementNew") }}
          </button>
          <button class="ghost-button" :disabled="announcementsLoading" @click="loadAnnouncements">
            {{ t("common.refresh") }}
          </button>
        </view>

        <text v-if="announcementError" class="modal-error">{{ announcementError }}</text>
        <text v-if="announcementsLoading" class="announcement-empty">{{ t("common.loading") }}</text>
        <text v-else-if="announcements.length === 0" class="announcement-empty">{{ t("interestCircles.announcementEmpty") }}</text>

        <view v-else class="announcement-list">
          <view v-for="item in announcements" :key="item.id" class="announcement-row">
            <view class="announcement-row__main">
              <view class="announcement-row__meta">
                <text v-if="item.isPinned" class="announcement-pill announcement-pill--pin">{{ t("interestCircles.announcementPinnedBadge") }}</text>
                <text class="announcement-pill">{{ announcementStatusLabel(item.status) }}</text>
                <text v-if="item.title" class="announcement-row__title">{{ item.title }}</text>
              </view>
              <text class="announcement-row__content">{{ item.content }}</text>
              <text class="announcement-row__time">{{ formatDateTime(item.publishedAt || item.createdAt) }}</text>
            </view>
            <view v-if="sessionStore.canWrite" class="announcement-row__actions">
              <button class="action-button edit" @click="openAnnouncementEdit(item)">{{ t("interestCircles.announcementEdit") }}</button>
              <button v-if="item.status !== 'published'" class="action-button handle" @click="runAnnouncementAction(() => publishCircleAnnouncement(announcementCircle!.id, item.id))">{{ t("interestCircles.announcementPublish") }}</button>
              <button v-else class="action-button delete" @click="runAnnouncementAction(() => offlineCircleAnnouncement(announcementCircle!.id, item.id))">{{ t("interestCircles.announcementOffline") }}</button>
              <button v-if="item.status === 'published' && !item.isPinned" class="action-button handle" @click="runAnnouncementAction(() => pinCircleAnnouncement(announcementCircle!.id, item.id))">{{ t("interestCircles.announcementPin") }}</button>
              <button v-if="item.isPinned" class="action-button handle" @click="runAnnouncementAction(() => unpinCircleAnnouncement(announcementCircle!.id, item.id))">{{ t("interestCircles.announcementUnpin") }}</button>
              <button class="action-button delete" @click="runAnnouncementAction(() => deleteCircleAnnouncement(announcementCircle!.id, item.id))">{{ t("common.delete") }}</button>
            </view>
          </view>
        </view>

        <view v-if="announcementFormVisible" class="announcement-form">
          <view class="form-row">
            <text class="form-label">{{ t("interestCircles.announcementTitleLabel") }}</text>
            <input v-model="announcementForm.title" class="form-input" type="text" maxlength="80" />
          </view>
          <view class="form-row">
            <text class="form-label">{{ t("interestCircles.announcementContentLabel") }}</text>
            <textarea v-model="announcementForm.content" class="form-textarea" rows="4" maxlength="1000" />
          </view>
          <view class="modal-actions">
            <button class="ghost-button" :disabled="announcementSaving" @click="closeAnnouncementForm">{{ t("common.cancel") }}</button>
            <button class="primary-button" :disabled="announcementSaving" @click="saveAnnouncement">
              {{ announcementSaving ? t("common.saving") : t("common.save") }}
            </button>
          </view>
        </view>

        <view class="modal-actions">
          <button class="ghost-button" @click="closeAnnouncements">{{ t("common.close") }}</button>
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

.announcement-modal {
  width: 720px;
  max-height: 86vh;
  overflow-y: auto;
}

.announcement-subtitle {
  display: block;
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-tertiary);
}

.announcement-toolbar {
  display: flex;
  gap: var(--admin-space-md);
  margin-bottom: var(--admin-space-lg);
}

.announcement-empty {
  display: block;
  padding: var(--admin-space-xl) 0;
  text-align: center;
  color: var(--admin-color-text-tertiary);
}

.announcement-list {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-md);
  margin-bottom: var(--admin-space-lg);
}

.announcement-row {
  display: flex;
  gap: var(--admin-space-lg);
  justify-content: space-between;
  padding: var(--admin-space-lg);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-md);
}

.announcement-row__main {
  flex: 1;
  min-width: 0;
}

.announcement-row__meta {
  display: flex;
  align-items: center;
  gap: var(--admin-space-sm);
  margin-bottom: 6px;
}

.announcement-pill {
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--admin-color-bg-page);
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-tertiary);
}

.announcement-pill--pin {
  background: var(--admin-color-primary-soft);
  color: var(--admin-color-primary);
}

.announcement-row__title {
  font-weight: 600;
}

.announcement-row__content {
  display: block;
  white-space: pre-wrap;
  line-height: 1.6;
}

.announcement-row__time {
  display: block;
  margin-top: 6px;
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-quaternary);
}

.announcement-row__actions {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: var(--admin-space-sm);
  width: 220px;
  flex-shrink: 0;
}

.announcement-form {
  padding: var(--admin-space-lg);
  border-radius: var(--admin-radius-md);
  background: var(--admin-color-bg-page);
  margin-bottom: var(--admin-space-lg);
}
</style>
