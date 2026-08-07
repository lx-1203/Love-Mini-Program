<script setup lang="ts">
/**
 * Admin v2 - 校园圈话题管理视图（社区论坛域）。
 *
 * 对应后端 com.campuslove.api.admin.AdminCampusTopicController：
 * - GET    /api/v1/admin/forum/campus-topics           （分页列表，支持 keyword/status/campusName 筛选）
 * - POST   /api/v1/admin/forum/campus-topics/{id}/audit （审核：通过/拒绝，请求体 AdminPostAuditRequest）
 * - DELETE /api/v1/admin/forum/campus-topics/{id}       （软删除）
 *
 * 交互参考旧后台 Posts.vue 审核弹窗：通过/拒绝 + 拒绝备注必填；
 * 删除走 ConfirmDialog。校区管理员登录时后端按管辖校区强制过滤，
 * campusName 筛选仅对全局管理员生效。
 */
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  listCampusTopics,
  auditCampusTopic,
  deleteCampusTopic,
  type CampusTopicSummary,
} from "../../api/forum";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE, REMARK_MAX_LENGTH } from "../../utils/constants";

const { t } = useI18n();

// ===== 列表状态 =====
const topics = ref<CampusTopicSummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");

// ===== 筛选条件 =====
const statusFilter = ref<"" | "active" | "deleted" | "hidden">("");
const keyword = ref("");
const campusName = ref("");

// ===== 分页状态 =====
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

/** 请求竞态防护 */
let reqSeq = 0;

/** 分页加载校园圈话题列表 */
async function fetchTopics(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listCampusTopics({
      page: page.value,
      pageSize: pageSize.value,
      status: statusFilter.value || undefined,
      keyword: keyword.value.trim() || undefined,
      campusName: campusName.value.trim() || undefined,
    });
    if (seq !== reqSeq) return;
    topics.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : "加载校园话题失败";
    topics.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

function handleSearch(): void {
  page.value = 1;
  void fetchTopics();
}

function handleResetFilters(): void {
  statusFilter.value = "";
  keyword.value = "";
  campusName.value = "";
  handleSearch();
}

function handlePageChange(): void {
  void fetchTopics();
}

// ===== 审核弹窗 =====
const auditingTopic = ref<CampusTopicSummary | null>(null);
const auditDecision = ref<"approved" | "rejected">("approved");
const auditRemark = ref("");
const auditError = ref("");
const savingAudit = ref(false);

function openAudit(topic: CampusTopicSummary): void {
  auditingTopic.value = topic;
  auditDecision.value = "approved";
  auditRemark.value = "";
  auditError.value = "";
}

function closeAudit(): void {
  if (savingAudit.value) return;
  auditingTopic.value = null;
  auditRemark.value = "";
  auditError.value = "";
}

function onAuditKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape" && auditingTopic.value && !savingAudit.value) {
    closeAudit();
  }
}

/** 提交审核（拒绝时必须填写备注） */
async function handleSaveAudit(): Promise<void> {
  const topic = auditingTopic.value;
  if (!topic || savingAudit.value) return;
  if (auditDecision.value === "rejected" && !auditRemark.value.trim()) {
    auditError.value = "拒绝时必须填写备注（拒绝原因）";
    return;
  }
  savingAudit.value = true;
  auditError.value = "";
  try {
    await auditCampusTopic(topic.id, {
      decision: auditDecision.value,
      remark: auditRemark.value.trim() || undefined,
    });
    auditingTopic.value = null;
    auditRemark.value = "";
    await fetchTopics();
  } catch (err: unknown) {
    auditError.value = err instanceof ApiError ? err.message : "审核失败";
  } finally {
    savingAudit.value = false;
  }
}

// ===== 删除确认 =====
const deleteVisible = ref(false);
const deleteTarget = ref<CampusTopicSummary | null>(null);
const deleting = ref(false);

function askDelete(topic: CampusTopicSummary): void {
  deleteTarget.value = topic;
  deleteVisible.value = true;
}

async function handleConfirmDelete(): Promise<void> {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  try {
    await deleteCampusTopic(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    await fetchTopics();
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : "删除失败";
  } finally {
    deleting.value = false;
  }
}

function handleCancelDelete(): void {
  deleteTarget.value = null;
  deleting.value = false;
}

// ===== 展示辅助 =====
/** 作者昵称兜底展示（匿名帖直接展示匿名标识） */
function authorDisplay(topic: CampusTopicSummary): string {
  if (topic.isAnonymous) return "匿名用户";
  return topic.authorNickname || `用户#${topic.authorId}`;
}

/** 话题状态文案 */
function topicStatusLabel(status: string | null): string {
  switch (status) {
    case "active":
      return "正常";
    case "deleted":
      return "已删除";
    case "hidden":
      return "已隐藏";
    default:
      return status ?? "—";
  }
}

/** 审核状态文案 */
function auditStatusLabel(status: string | null): string {
  switch (status) {
    case "pending":
      return "待审核";
    case "approved":
      return "已通过";
    case "rejected":
      return "已拒绝";
    default:
      return status ?? "—";
  }
}

onMounted(() => {
  void fetchTopics();
});
</script>

<template>
  <view class="campus-topics-page">
    <view class="page-header">
      <text class="page-title">{{ t("layout.navCampusTopics") }}</text>
      <text class="page-subtitle">审核与管理校园圈话题，支持按学校与状态筛选</text>
    </view>

    <view class="toolbar">
      <select v-model="statusFilter" class="filter-select" @change="handleSearch">
        <option value="">全部状态</option>
        <option value="active">正常</option>
        <option value="hidden">已隐藏</option>
        <option value="deleted">已删除</option>
      </select>
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        placeholder="搜索标题 / 内容..."
        @keyup.enter="handleSearch"
      />
      <input
        v-model="campusName"
        class="filter-input"
        type="text"
        placeholder="学校名（全局管理员可用）"
        @keyup.enter="handleSearch"
      />
      <button class="ghost-button" @click="handleResetFilters">{{ t("common.reset") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchTopics" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">标题</th>
            <th scope="col">作者</th>
            <th scope="col">学校</th>
            <th scope="col">状态</th>
            <th scope="col">审核状态</th>
            <th scope="col">创建时间</th>
            <th scope="col">{{ t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="topics.length === 0">
            <td colspan="8" class="empty-row">暂无校园话题数据</td>
          </tr>
          <tr v-for="topic in topics" :key="topic.id">
            <td>{{ topic.id }}</td>
            <td class="title-cell">{{ topic.title }}</td>
            <td>{{ authorDisplay(topic) }}</td>
            <td>{{ topic.schoolName ?? "—" }}</td>
            <td>
              <span class="status-badge" :class="`status-${topic.status ?? 'none'}`">
                {{ topicStatusLabel(topic.status) }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="`audit-${topic.auditStatus ?? 'none'}`">
                {{ auditStatusLabel(topic.auditStatus) }}
              </span>
            </td>
            <td class="time-cell">{{ formatDateTime(topic.createdAt) }}</td>
            <td class="action-cell">
              <button
                v-if="topic.auditStatus === 'pending'"
                class="action-button audit"
                @click="openAudit(topic)"
              >审核</button>
              <button class="action-button delete" @click="askDelete(topic)">{{ t("common.delete") }}</button>
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

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      title="删除校园话题"
      :message="deleteTarget ? `确定要删除话题「${deleteTarget.title}」吗？（软删除，可在数据库恢复）` : ''"
      :danger="true"
      :confirming="deleting"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />

    <!-- 审核弹窗（通过/拒绝，拒绝时备注必填） -->
    <view
      v-if="auditingTopic"
      class="modal-mask"
      @click.self="closeAudit"
      @keydown.esc="onAuditKeydown"
    >
      <view class="modal">
        <text class="modal-title">审核话题 #{{ auditingTopic.id }}</text>
        <view class="post-content-box">{{ auditingTopic.title }}</view>
        <view class="form-row">
          <text class="form-label">审核决定</text>
          <view class="radio-group radio-horizontal">
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="approved" />
              <span>通过</span>
            </label>
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="rejected" />
              <span>拒绝（自动隐藏）</span>
            </label>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">审核备注（拒绝原因必填）</text>
          <textarea
            v-model="auditRemark"
            class="form-textarea"
            rows="3"
            :maxlength="REMARK_MAX_LENGTH"
            :placeholder="auditDecision === 'rejected' ? '请输入拒绝原因...' : '可填写备注（可选）'"
          />
        </view>
        <text v-if="auditError" class="audit-error">{{ auditError }}</text>
        <view class="modal-actions">
          <button class="ghost-button" :disabled="savingAudit" @click="closeAudit">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="savingAudit" @click="handleSaveAudit">
            {{ savingAudit ? t("common.saving") : "提交审核" }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.campus-topics-page {
  max-width: 1200px;
}

.title-cell {
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

/* 话题状态徽章 */
.status-active {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.status-deleted {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.status-hidden {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

/* 审核状态徽章 */
.audit-pending {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.audit-approved {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.audit-rejected {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.post-content-box {
  background: var(--admin-color-bg-subtle);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-md);
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
}

.radio-horizontal {
  flex-direction: row;
  gap: var(--admin-space-lg);
}

.audit-error {
  display: block;
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger);
}
</style>
