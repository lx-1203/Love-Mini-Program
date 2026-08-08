<script setup lang="ts">
/**
 * Admin v2 - 村落动态管理视图（社区论坛域）。
 *
 * 对应后端 com.campuslove.api.admin.AdminVillagePostController：
 * - GET    /api/v1/admin/forum/village-posts                     （分页列表，支持 auditStatus/status/keyword 筛选）
 * - POST   /api/v1/admin/forum/village-posts/{id}/audit          （审核：通过/拒绝，请求体 AdminPostAuditRequest）
 * - POST   /api/v1/admin/forum/village-posts/{id}/pin            （置顶）
 * - POST   /api/v1/admin/forum/village-posts/{id}/unpin          （取消置顶）
 * - DELETE /api/v1/admin/forum/village-posts/{id}                （软删除）
 * - GET    /api/v1/admin/forum/village-posts/{id}/comments       （帖子评论分页，弹窗展示）
 *
 * 交互参考旧后台 Posts.vue：审核弹窗（通过/拒绝 + 拒绝备注必填）、
 * 置顶/取消置顶行内操作、删除走 ConfirmDialog、「查看评论」弹窗分页展示。
 */
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  listVillagePosts,
  auditVillagePost,
  pinVillagePost,
  unpinVillagePost,
  deleteVillagePost,
  listPostComments,
  listPostViewers,
  type PostCommentView,
  type PostViewer,
  type VillagePostSummary,
} from "../../api/forum";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE, REMARK_MAX_LENGTH } from "../../utils/constants";

const { t } = useI18n();

// ===== 列表状态 =====
const posts = ref<VillagePostSummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");

// ===== 筛选条件 =====
const auditStatusFilter = ref<"" | "pending" | "approved" | "rejected">("");
const statusFilter = ref<"" | "active" | "deleted" | "hidden">("");
const keyword = ref("");

// ===== 分页状态 =====
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

/** 请求竞态防护 */
let reqSeq = 0;

/** 分页加载村落动态列表 */
async function fetchPosts(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listVillagePosts({
      page: page.value,
      pageSize: pageSize.value,
      auditStatus: auditStatusFilter.value || undefined,
      status: statusFilter.value || undefined,
      keyword: keyword.value.trim() || undefined,
    });
    if (seq !== reqSeq) return;
    posts.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("villagePosts.loadFailed");
    posts.value = [];
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
  void fetchPosts();
}

/** 重置全部筛选条件 */
function handleResetFilters(): void {
  auditStatusFilter.value = "";
  statusFilter.value = "";
  keyword.value = "";
  handleSearch();
}

/** 分页变更回调 */
function handlePageChange(): void {
  void fetchPosts();
}

// ===== 审核弹窗 =====
const auditingPost = ref<VillagePostSummary | null>(null);
const auditDecision = ref<"approved" | "rejected">("approved");
const auditRemark = ref("");
const auditError = ref("");
const savingAudit = ref(false);

/** 打开审核弹窗（默认通过） */
function openAudit(post: VillagePostSummary): void {
  auditingPost.value = post;
  auditDecision.value = "approved";
  auditRemark.value = "";
  auditError.value = "";
}

/** 关闭审核弹窗（Esc 或取消按钮） */
function closeAudit(): void {
  if (savingAudit.value) return;
  auditingPost.value = null;
  auditRemark.value = "";
  auditError.value = "";
}

/** 审核弹窗 Esc 关闭（键盘流操作） */
function onAuditKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape" && auditingPost.value && !savingAudit.value) {
    closeAudit();
  }
}

/** 提交审核（拒绝时必须填写备注，供留痕与客户端提示） */
async function handleSaveAudit(): Promise<void> {
  const post = auditingPost.value;
  if (!post || savingAudit.value) return;
  if (auditDecision.value === "rejected" && !auditRemark.value.trim()) {
    auditError.value = t("villagePosts.rejectRemarkRequired");
    return;
  }
  savingAudit.value = true;
  auditError.value = "";
  try {
    await auditVillagePost(post.id, {
      decision: auditDecision.value,
      remark: auditRemark.value.trim() || undefined,
    });
    auditingPost.value = null;
    auditRemark.value = "";
    await fetchPosts();
  } catch (err: unknown) {
    auditError.value = err instanceof ApiError ? err.message : t("villagePosts.auditFailed");
  } finally {
    savingAudit.value = false;
  }
}

// ===== 置顶/取消置顶（行内操作，可逆无需二次确认） =====
const pinningId = ref<number | null>(null);

async function togglePin(post: VillagePostSummary): Promise<void> {
  if (pinningId.value !== null) return; // 防并发重复操作
  pinningId.value = post.id;
  errorMsg.value = "";
  try {
    if (post.isPinned) {
      await unpinVillagePost(post.id);
    } else {
      await pinVillagePost(post.id);
    }
    await fetchPosts();
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : t("villagePosts.pinFailed");
  } finally {
    pinningId.value = null;
  }
}

// ===== 删除确认 =====
const deleteVisible = ref(false);
const deleteTarget = ref<VillagePostSummary | null>(null);
const deleting = ref(false);

function askDelete(post: VillagePostSummary): void {
  deleteTarget.value = post;
  deleteVisible.value = true;
}

async function handleConfirmDelete(): Promise<void> {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  try {
    await deleteVillagePost(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    await fetchPosts();
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : t("villagePosts.deleteFailed");
  } finally {
    deleting.value = false;
  }
}

function handleCancelDelete(): void {
  deleteTarget.value = null;
  deleting.value = false;
}

// ===== 查看评论弹窗（listPostComments 分页） =====
const commentsVisible = ref(false);
const commentsPost = ref<VillagePostSummary | null>(null);
const comments = ref<PostCommentView[]>([]);
const commentsLoading = ref(false);
const commentsError = ref("");
const cPage = ref(1);
const cTotal = ref(0);
const cTotalPages = ref(1);

/** 评论请求竞态防护 */
let commentsReqSeq = 0;

/** 打开评论弹窗并加载第一页 */
async function openComments(post: VillagePostSummary): Promise<void> {
  commentsPost.value = post;
  comments.value = [];
  cPage.value = 1;
  cTotal.value = 0;
  cTotalPages.value = 1;
  commentsError.value = "";
  commentsVisible.value = true;
  await fetchComments();
}

/** 加载当前帖子的评论分页 */
async function fetchComments(): Promise<void> {
  const post = commentsPost.value;
  if (!post) return;
  commentsLoading.value = true;
  commentsError.value = "";
  const seq = ++commentsReqSeq;
  try {
    const result = await listPostComments(post.id, { page: cPage.value, pageSize: pageSize.value });
    if (seq !== commentsReqSeq) return;
    comments.value = result.items;
    cTotal.value = result.total;
    cTotalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (seq !== commentsReqSeq) return;
    commentsError.value = err instanceof ApiError ? err.message : t("villagePosts.commentsLoadFailed");
  } finally {
    if (seq === commentsReqSeq) {
      commentsLoading.value = false;
    }
  }
}

function handleCommentsPageChange(): void {
  void fetchComments();
}

/** 关闭评论弹窗并清理状态 */
function closeComments(): void {
  commentsVisible.value = false;
  commentsPost.value = null;
  comments.value = [];
}

// ===== 浏览记录弹窗（listPostViewers 分页，2026-08-08 论坛互动真实化） =====
const viewersVisible = ref(false);
const viewersPost = ref<VillagePostSummary | null>(null);
const viewers = ref<PostViewer[]>([]);
const viewersLoading = ref(false);
const viewersError = ref("");
const vPage = ref(1);
const vTotal = ref(0);
const vTotalPages = ref(1);

/** 浏览记录请求竞态防护 */
let viewersReqSeq = 0;

/** 打开浏览记录弹窗并加载第一页 */
async function openViewers(post: VillagePostSummary): Promise<void> {
  viewersPost.value = post;
  viewers.value = [];
  vPage.value = 1;
  vTotal.value = 0;
  vTotalPages.value = 1;
  viewersError.value = "";
  viewersVisible.value = true;
  await fetchViewers();
}

/** 加载当前帖子的浏览记录分页 */
async function fetchViewers(): Promise<void> {
  const post = viewersPost.value;
  if (!post) return;
  viewersLoading.value = true;
  viewersError.value = "";
  const seq = ++viewersReqSeq;
  try {
    const result = await listPostViewers(post.id, { page: vPage.value, pageSize: pageSize.value });
    if (seq !== viewersReqSeq) return;
    viewers.value = result.items;
    vTotal.value = result.total;
    vTotalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (seq !== viewersReqSeq) return;
    viewersError.value = err instanceof ApiError ? err.message : t("villagePosts.viewersLoadFailed");
  } finally {
    if (seq === viewersReqSeq) {
      viewersLoading.value = false;
    }
  }
}

function handleViewersPageChange(): void {
  void fetchViewers();
}

/** 关闭浏览记录弹窗并清理状态 */
function closeViewers(): void {
  viewersVisible.value = false;
  viewersPost.value = null;
  viewers.value = [];
}

// ===== 展示辅助 =====
/** 作者昵称兜底展示 */
function authorDisplay(post: VillagePostSummary): string {
  return post.authorNickname || t("villagePosts.authorFallback", { id: post.authorId });
}

/** 分类文案（对应 PostCategory 枚举） */
function categoryLabel(category: string | null): string {
  switch (category) {
    case "interest":
      return t("villagePosts.categoryInterest");
    case "sincere":
      return t("villagePosts.categorySincere");
    case "hometown":
      return t("villagePosts.categoryHometown");
    case "anonymous":
      return t("villagePosts.categoryAnonymous");
    case "campus":
      return t("villagePosts.categoryCampus");
    case "latest":
      return t("villagePosts.categoryLatest");
    case "all":
      return t("villagePosts.categoryAll");
    default:
      return category ?? "—";
  }
}

/** 审核状态文案 */
function auditStatusLabel(status: string | null): string {
  switch (status) {
    case "pending":
      return t("villagePosts.statusPending");
    case "approved":
      return t("villagePosts.statusApproved");
    case "rejected":
      return t("villagePosts.statusRejected");
    default:
      return status ?? "—";
  }
}

/** 帖子状态文案 */
function postStatusLabel(status: string | null): string {
  switch (status) {
    case "active":
      return t("villagePosts.statusActive");
    case "deleted":
      return t("villagePosts.statusDeleted");
    case "hidden":
      return t("villagePosts.statusHidden");
    default:
      return status ?? "—";
  }
}

onMounted(() => {
  void fetchPosts();
});
</script>

<template>
  <view class="village-posts-page">
    <view class="page-header">
      <text class="page-title">{{ t("layout.navVillagePosts") }}</text>
      <text class="page-subtitle">{{ t("villagePosts.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <select v-model="auditStatusFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("villagePosts.filterAuditStatusAll") }}</option>
        <option value="pending">{{ t("villagePosts.statusPending") }}</option>
        <option value="approved">{{ t("villagePosts.statusApproved") }}</option>
        <option value="rejected">{{ t("villagePosts.statusRejected") }}</option>
      </select>
      <select v-model="statusFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("villagePosts.filterPostStatusAll") }}</option>
        <option value="active">{{ t("villagePosts.statusActive") }}</option>
        <option value="hidden">{{ t("villagePosts.statusHidden") }}</option>
        <option value="deleted">{{ t("villagePosts.statusDeleted") }}</option>
      </select>
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        :placeholder="t('villagePosts.searchPlaceholder')"
        @keyup.enter="handleSearch"
      />
      <button class="ghost-button" @click="handleResetFilters">{{ t("common.reset") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchPosts" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("villagePosts.columnId") }}</th>
            <th scope="col">{{ t("villagePosts.columnContent") }}</th>
            <th scope="col">{{ t("villagePosts.columnAuthor") }}</th>
            <th scope="col">{{ t("villagePosts.columnCategory") }}</th>
            <th scope="col">{{ t("villagePosts.columnStats") }}</th>
            <th scope="col">{{ t("villagePosts.columnAuditStatus") }}</th>
            <th scope="col">{{ t("villagePosts.columnPostStatus") }}</th>
            <th scope="col">{{ t("villagePosts.columnCreatedAt") }}</th>
            <th scope="col">{{ t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="posts.length === 0">
            <td colspan="9" class="empty-row">{{ t("villagePosts.noData") }}</td>
          </tr>
          <tr v-for="post in posts" :key="post.id">
            <td>{{ post.id }}</td>
            <td class="content-cell">
              <text>{{ post.contentPreview }}</text>
              <text v-if="post.isPinned" class="pin-tag">{{ t("villagePosts.pinnedTag") }}</text>
            </td>
            <td>{{ authorDisplay(post) }}</td>
            <td>{{ categoryLabel(post.category) }}</td>
            <td class="stats-cell">
              <span class="stats-item">{{ t("villagePosts.statsLikes", { n: post.likesCount ?? 0 }) }}</span>
              <span class="stats-item">{{ t("villagePosts.statsFavorites", { n: post.favoriteCount ?? 0 }) }}</span>
              <span class="stats-item">{{ t("villagePosts.statsViews", { n: post.viewCount ?? 0 }) }}</span>
            </td>
            <td>
              <span class="status-badge" :class="`audit-${post.auditStatus ?? 'none'}`">
                {{ auditStatusLabel(post.auditStatus) }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="`status-${post.status ?? 'none'}`">
                {{ postStatusLabel(post.status) }}
              </span>
            </td>
            <td class="time-cell">{{ formatDateTime(post.createdAt) }}</td>
            <td class="action-cell">
              <button
                v-if="post.auditStatus === 'pending'"
                class="action-button audit"
                @click="openAudit(post)"
              >{{ t("villagePosts.actionAudit") }}</button>
              <button
                class="action-button pin"
                :disabled="pinningId !== null"
                @click="togglePin(post)"
              >{{ post.isPinned ? t("villagePosts.actionUnpin") : t("villagePosts.actionPin") }}</button>
              <button class="action-button handle" @click="openComments(post)">{{ t("villagePosts.actionComments") }}</button>
              <button class="action-button handle" @click="openViewers(post)">{{ t("villagePosts.actionViewers") }}</button>
              <button class="action-button delete" @click="askDelete(post)">{{ t("common.delete") }}</button>
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
      :title="t('villagePosts.deleteTitle')"
      :message="deleteTarget ? t('villagePosts.deleteConfirmMessage', { id: deleteTarget.id }) : ''"
      :danger="true"
      :confirming="deleting"
      @confirm="handleConfirmDelete"
      @cancel="handleCancelDelete"
    />

    <!-- 审核弹窗（通过/拒绝，拒绝时备注必填） -->
    <view
      v-if="auditingPost"
      class="modal-mask"
      @click.self="closeAudit"
      @keydown.esc="onAuditKeydown"
    >
      <view class="modal">
        <text class="modal-title">{{ t("villagePosts.auditTitle", { id: auditingPost.id }) }}</text>
        <view class="post-content-box">{{ auditingPost.contentPreview }}</view>
        <view class="form-row">
          <text class="form-label">{{ t("villagePosts.auditDecisionLabel") }}</text>
          <view class="radio-group radio-horizontal">
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="approved" />
              <span>{{ t("villagePosts.auditApprovedOption") }}</span>
            </label>
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="rejected" />
              <span>{{ t("villagePosts.auditRejectedOption") }}</span>
            </label>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("villagePosts.auditRemarkLabel") }}</text>
          <textarea
            v-model="auditRemark"
            class="form-textarea"
            rows="3"
            :maxlength="REMARK_MAX_LENGTH"
            :placeholder="auditDecision === 'rejected' ? t('villagePosts.rejectReasonPlaceholder') : t('villagePosts.remarkPlaceholder')"
          />
        </view>
        <text v-if="auditError" class="audit-error">{{ auditError }}</text>
        <view class="modal-actions">
          <button class="ghost-button" :disabled="savingAudit" @click="closeAudit">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="savingAudit" @click="handleSaveAudit">
            {{ savingAudit ? t("common.saving") : t("villagePosts.submitAudit") }}
          </button>
        </view>
      </view>
    </view>

    <!-- 帖子评论弹窗（分页展示） -->
    <view v-if="commentsVisible" class="modal-mask" @click.self="closeComments">
      <view class="modal comments-modal">
        <text class="modal-title">{{ t("villagePosts.commentsTitle", { id: commentsPost?.id }) }}</text>
        <text class="comments-subtitle">{{ commentsPost?.contentPreview }}</text>

        <view class="comments-body">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">{{ t("villagePosts.columnCommentId") }}</th>
                <th scope="col">{{ t("villagePosts.columnCommentAuthor") }}</th>
                <th scope="col">{{ t("villagePosts.columnCommentContent") }}</th>
                <th scope="col">{{ t("villagePosts.columnCommentTime") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="commentsLoading">
                <td colspan="4" class="empty-row">{{ t("common.loading") }}</td>
              </tr>
              <tr v-else-if="comments.length === 0">
                <td colspan="4" class="empty-row">{{ t("villagePosts.noComments") }}</td>
              </tr>
              <tr v-for="c in comments" :key="c.id">
                <td>{{ c.id }}</td>
                <td>{{ c.authorNickname || t("villagePosts.authorFallback", { id: c.authorId }) }}</td>
                <td class="comment-content-cell">{{ c.content }}</td>
                <td class="time-cell">{{ formatDateTime(c.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
          <text v-if="commentsError" class="comments-error">{{ commentsError }}</text>
        </view>

        <Pagination
          v-model:page="cPage"
          :total-pages="cTotalPages"
          :total="cTotal"
          :disabled="commentsLoading"
          @change="handleCommentsPageChange"
        />

        <view class="modal-actions">
          <button class="ghost-button" @click="closeComments">{{ t("common.close") }}</button>
        </view>
      </view>
    </view>

    <!-- 浏览记录弹窗（分页展示浏览者，2026-08-08 论坛互动真实化） -->
    <view v-if="viewersVisible" class="modal-mask" @click.self="closeViewers">
      <view class="modal comments-modal">
        <text class="modal-title">{{ t("villagePosts.viewersTitle", { id: viewersPost?.id }) }}</text>
        <text class="comments-subtitle">{{ viewersPost?.contentPreview }}</text>

        <view class="comments-body">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">{{ t("villagePosts.columnViewerId") }}</th>
                <th scope="col">{{ t("villagePosts.columnViewerNickname") }}</th>
                <th scope="col">{{ t("villagePosts.columnViewedAt") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="viewersLoading">
                <td colspan="3" class="empty-row">{{ t("common.loading") }}</td>
              </tr>
              <tr v-else-if="viewers.length === 0">
                <td colspan="3" class="empty-row">{{ t("villagePosts.noViewers") }}</td>
              </tr>
              <tr v-for="v in viewers" :key="v.userId">
                <td>{{ v.userId }}</td>
                <td>{{ v.nickname || t("villagePosts.authorFallback", { id: v.userId }) }}</td>
                <td class="time-cell">{{ formatDateTime(v.viewedAt) }}</td>
              </tr>
            </tbody>
          </table>
          <text v-if="viewersError" class="comments-error">{{ viewersError }}</text>
        </view>

        <Pagination
          v-model:page="vPage"
          :total-pages="vTotalPages"
          :total="vTotal"
          :disabled="viewersLoading"
          @change="handleViewersPageChange"
        />

        <view class="modal-actions">
          <button class="ghost-button" @click="closeViewers">{{ t("common.close") }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.village-posts-page {
  max-width: 1400px;
}

.content-cell {
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pin-tag {
  margin-left: var(--admin-space-sm);
  padding: 1px var(--admin-space-sm);
  border-radius: var(--admin-space-md);
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
  font-size: var(--admin-font-xs);
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

/* 互动统计列（赞/藏/看） */
.stats-cell {
  white-space: nowrap;
}

.stats-item {
  margin-right: var(--admin-space-sm);
  color: var(--admin-color-text-secondary);
  font-size: var(--admin-font-xs);
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

/* 帖子状态徽章（覆盖 admin-common 默认色） */
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

/* 置顶按钮 */
.action-button.pin {
  background: var(--admin-color-accent-soft);
  color: var(--admin-color-accent);
}

.action-button.pin:hover {
  background: var(--admin-color-bg-hover);
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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

/* 评论弹窗 */
.comments-modal {
  width: 720px;
  max-width: 92vw;
}

.comments-subtitle {
  display: block;
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comments-body {
  max-height: 50vh;
  overflow-y: auto;
  margin-bottom: var(--admin-space-lg);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
}

.comment-content-cell {
  max-width: 320px;
  word-break: break-all;
}

.comments-error {
  display: block;
  padding: var(--admin-space-md);
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger);
}
</style>
