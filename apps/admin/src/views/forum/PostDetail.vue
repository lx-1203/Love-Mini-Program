<script setup lang="ts">
/**
 * Admin v2 - 村落动态详情页（社区论坛域）。
 *
 * 对应后端 com.campuslove.api.admin.AdminVillagePostController：
 * - GET    /api/v1/admin/forum/village-posts/{id}            （详情，含正文/图片/标签/审核信息）
 * - POST   /api/v1/admin/forum/village-posts/{id}/audit      （审核：通过/拒绝 + 备注）
 * - POST   /api/v1/admin/forum/village-posts/{id}/pin|unpin  （置顶）
 * - DELETE /api/v1/admin/forum/village-posts/{id}            （软删除）
 * - GET    /api/v1/admin/forum/village-posts/{id}/comments   （评论分页）
 * - GET    /api/v1/admin/forum/village-posts/{id}/views      （浏览记录分页）
 *
 * 本页只做审核与运营动作，不修改帖子正文与配图（内容修改归发帖人）。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  auditVillagePost,
  deleteVillagePost,
  getVillagePost,
  listPostComments,
  listPostViewers,
  pinVillagePost,
  unpinVillagePost,
  type PostCommentView,
  type PostViewer,
  type VillagePostDetail,
} from "../../api/forum";
import { ApiError } from "../../api/http";
import { withMediaToken } from "../../api/media";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import Pagination from "../../components/Pagination.vue";
import { findFirstMenuPath, useMenuStore } from "../../stores/menu";
import { useSessionStore } from "../../stores/session";
import { DEFAULT_PAGE_SIZE, REMARK_MAX_LENGTH } from "../../utils/constants";
import { formatDateTime } from "../../utils/format";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const menuStore = useMenuStore();
const sessionStore = useSessionStore();

/** 路由参数 id → 数字；非法（非正整数）返回 null，不发请求 */
const postId = computed<number | null>(() => {
  const raw = route.params.id;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
});

// ===== 详情状态 =====
const detail = ref<VillagePostDetail | null>(null);
const loading = ref(false);
const errorMsg = ref("");

/**
 * 后端把 posts.images / posts.tags 以 JSON 文本列直出（视图字段类型为 string），
 * 但历史数据里也存在空串与非法 JSON；解析失败一律降级为空数组而不是抛错。
 */
function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

const imageUrls = computed<string[]>(() => parseJsonArray(detail.value?.images));
const imageSrcs = computed<string[]>(() => imageUrls.value.map((url) => withMediaToken(url)));
const tagList = computed<string[]>(() => parseJsonArray(detail.value?.tags));

/** 九宫格只铺前 9 张（与小程序论坛配图同口径），多余张数以 +N 汇总；大图预览仍可左右翻到全部 */
const GRID_MAX = 9;
const gridImages = computed<string[]>(() => imageSrcs.value.slice(0, GRID_MAX));
const gridMoreCount = computed<number>(() => Math.max(0, imageSrcs.value.length - GRID_MAX));

async function fetchDetail(): Promise<void> {
  const id = postId.value;
  if (id === null) {
    errorMsg.value = t("postDetail.invalidId");
    detail.value = null;
    return;
  }
  loading.value = true;
  errorMsg.value = "";
  try {
    detail.value = await getVillagePost(id);
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : t("postDetail.loadFailed");
    detail.value = null;
  } finally {
    loading.value = false;
  }
}

// ===== 大图预览（九宫格点击后左右切换） =====
const previewIndex = ref(0);
const previewVisible = ref(false);
const previewSrc = computed<string>(() => imageSrcs.value[previewIndex.value] ?? "");
const hasMultipleImages = computed<boolean>(() => imageSrcs.value.length > 1);

function openPreview(index: number): void {
  previewIndex.value = index;
  previewVisible.value = true;
}

function closePreview(): void {
  previewVisible.value = false;
}

function stepPreview(step: number): void {
  const count = imageSrcs.value.length;
  if (count === 0) return;
  previewIndex.value = (previewIndex.value + step + count) % count;
}

/** 预览打开时支持 Esc 关闭与左右键切换 */
function onPreviewKeydown(e: KeyboardEvent): void {
  if (!previewVisible.value) return;
  if (e.key === "Escape") closePreview();
  else if (e.key === "ArrowRight") stepPreview(1);
  else if (e.key === "ArrowLeft") stepPreview(-1);
}

/** 图片加载失败兜底：隐藏裂图，避免出现破图标 */
function onImageError(e: Event): void {
  const img = e.target as HTMLImageElement;
  img.style.visibility = "hidden";
}

// ===== 审核 =====
const auditDecision = ref<"approved" | "rejected">("approved");
const auditRemark = ref("");
const auditError = ref("");
const savingAudit = ref(false);
const canAudit = computed<boolean>(() => detail.value?.auditStatus === "pending");

async function submitAudit(): Promise<void> {
  if (!sessionStore.canWrite) return;
  const id = postId.value;
  if (id === null) return;
  const remark = auditRemark.value.trim();
  // 与列表页一致：拒绝必须写原因，否则运营无法反馈发帖人
  if (auditDecision.value === "rejected" && remark === "") {
    auditError.value = t("postDetail.remarkRequired");
    return;
  }
  auditError.value = "";
  savingAudit.value = true;
  try {
    await auditVillagePost(id, { decision: auditDecision.value, remark: remark || undefined });
    await fetchDetail();
  } catch (err: unknown) {
    auditError.value = err instanceof ApiError ? err.message : t("postDetail.auditFailed");
  } finally {
    savingAudit.value = false;
  }
}

// ===== 置顶 / 删除 =====
const pinning = ref(false);
const pinError = ref("");
const deleteVisible = ref(false);
const deleting = ref(false);

async function togglePin(): Promise<void> {
  if (!sessionStore.canWrite) return;
  const id = postId.value;
  const post = detail.value;
  if (id === null || !post) return;
  pinning.value = true;
  pinError.value = "";
  try {
    if (post.isPinned) await unpinVillagePost(id);
    else await pinVillagePost(id);
    await fetchDetail();
  } catch (err: unknown) {
    pinError.value = err instanceof ApiError ? err.message : t("postDetail.pinFailed");
  } finally {
    pinning.value = false;
  }
}

async function handleConfirmDelete(): Promise<void> {
  if (!sessionStore.canWrite) return;
  const id = postId.value;
  if (id === null) return;
  deleting.value = true;
  try {
    await deleteVillagePost(id);
    deleteVisible.value = false;
    await fetchDetail();
  } catch {
    // 失败时保持弹窗打开，由用户重试
  } finally {
    deleting.value = false;
  }
}

// ===== 评论区 =====
const comments = ref<PostCommentView[]>([]);
const commentPage = ref(1);
const commentTotalPages = ref(1);
const commentTotal = ref(0);
const commentLoading = ref(false);
const commentError = ref("");

async function fetchComments(): Promise<void> {
  const id = postId.value;
  if (id === null) return;
  commentLoading.value = true;
  commentError.value = "";
  try {
    const result = await listPostComments(id, { page: commentPage.value, pageSize: DEFAULT_PAGE_SIZE });
    comments.value = result.items ?? [];
    commentTotal.value = result.total ?? 0;
    commentTotalPages.value = result.totalPages ?? 1;
  } catch (err: unknown) {
    commentError.value = err instanceof ApiError ? err.message : t("postDetail.commentsLoadFailed");
    comments.value = [];
  } finally {
    commentLoading.value = false;
  }
}

// ===== 浏览记录 =====
const viewers = ref<PostViewer[]>([]);
const viewerPage = ref(1);
const viewerTotalPages = ref(1);
const viewerTotal = ref(0);
const viewerLoading = ref(false);
const viewerError = ref("");

async function fetchViewers(): Promise<void> {
  const id = postId.value;
  if (id === null) return;
  viewerLoading.value = true;
  viewerError.value = "";
  try {
    const result = await listPostViewers(id, { page: viewerPage.value, pageSize: DEFAULT_PAGE_SIZE });
    viewers.value = result.items ?? [];
    viewerTotal.value = result.total ?? 0;
    viewerTotalPages.value = result.totalPages ?? 1;
  } catch (err: unknown) {
    viewerError.value = err instanceof ApiError ? err.message : t("postDetail.viewersLoadFailed");
    viewers.value = [];
  } finally {
    viewerLoading.value = false;
  }
}

// ===== 文案映射 =====
function auditStatusLabel(status: VillagePostDetail["auditStatus"]): string {
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

function postStatusLabel(status: VillagePostDetail["status"]): string {
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

const CATEGORY_KEYS: Record<string, string> = {
  interest: "villagePosts.categoryInterest",
  sincere: "villagePosts.categorySincere",
  hometown: "villagePosts.categoryHometown",
  anonymous: "villagePosts.categoryAnonymous",
  campus: "villagePosts.categoryCampus",
  latest: "villagePosts.categoryLatest",
  all: "villagePosts.categoryAll",
};

function categoryLabel(category: string | null): string {
  if (!category) return "—";
  const key = CATEGORY_KEYS[category];
  return key ? t(key) : category;
}

/** 返回列表：有历史则回退，深链直达时落到第一个可跳转菜单 */
function goBack(): void {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  const fallback = findFirstMenuPath(menuStore.menuTree);
  if (fallback) router.push(fallback);
  else router.push("/");
}

/** 切换帖子（从列表按 ID 直达时可能停留在本页，需要重载全部区块） */
function loadAll(): void {
  commentPage.value = 1;
  viewerPage.value = 1;
  void fetchDetail();
  void fetchComments();
  void fetchViewers();
}

watch(postId, (id) => {
  if (id !== null) loadAll();
});

onMounted(() => {
  loadAll();
  window.addEventListener("keydown", onPreviewKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onPreviewKeydown);
});
</script>

<template>
  <div class="post-detail-page">
    <div class="page-header">
      <div class="header-left">
        <span class="page-title">{{ t("postDetail.title") }}</span>
        <span class="page-subtitle">{{ t("postDetail.subtitle") }}</span>
      </div>
      <button class="ghost-button" @click="goBack">{{ t("common.back") }}</button>
    </div>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchDetail" />

    <div v-else-if="loading" class="loading-hint">{{ t("common.loading") }}</div>

    <div v-else-if="detail" class="detail-body">
      <div class="columns">
        <!-- 左：配图九宫格 + 正文 -->
        <div class="col-main">
          <div class="card">
            <div v-if="imageUrls.length > 0" class="image-grid" :data-count="gridImages.length">
              <div
                v-for="(url, index) in gridImages"
                :key="index"
                class="image-cell"
                role="button"
                tabindex="0"
                @click="openPreview(index)"
                @keydown.enter="openPreview(index)"
              >
                <img :src="url" class="image-thumb" alt="" loading="lazy" @error="onImageError" />
                <span v-if="index === gridImages.length - 1 && gridMoreCount > 0" class="image-more">
                  +{{ gridMoreCount }}
                </span>
              </div>
            </div>
            <div v-else class="no-image">{{ t("postDetail.noImages") }}</div>
          </div>

          <div class="card">
            <h3 v-if="detail.title" class="post-title">{{ detail.title }}</h3>
            <p class="post-content">{{ detail.content }}</p>
            <div v-if="tagList.length > 0" class="tag-row">
              <span v-for="tag in tagList" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>

          <div class="card section">
            <div class="section-head">
              <span class="section-title">{{ t("postDetail.commentsSection", { n: commentTotal }) }}</span>
              <button class="ghost-button" :disabled="commentLoading" @click="fetchComments">
                {{ t("common.refresh") }}
              </button>
            </div>
            <div v-if="commentError" class="error-message">{{ commentError }}</div>
            <div v-else-if="commentLoading" class="loading-hint">{{ t("common.loading") }}</div>
            <div v-else-if="comments.length === 0" class="empty-hint">{{ t("postDetail.noComments") }}</div>
            <div v-else class="comment-list">
              <div v-for="item in comments" :key="item.id" class="comment-item">
                <div class="comment-meta">
                  <span class="comment-author">
                    {{ item.authorNickname || t("villagePosts.authorFallback", { id: item.authorId }) }}
                  </span>
                  <span class="text-secondary">{{ formatDateTime(item.createdAt) }}</span>
                </div>
                <div class="comment-content">{{ item.content }}</div>
              </div>
            </div>
            <Pagination
              v-model:page="commentPage"
              :total-pages="commentTotalPages"
              :total="commentTotal"
              :disabled="commentLoading"
              @change="fetchComments"
            />
          </div>

          <div class="card section">
            <div class="section-head">
              <span class="section-title">{{ t("postDetail.viewersSection", { n: viewerTotal }) }}</span>
              <button class="ghost-button" :disabled="viewerLoading" @click="fetchViewers">
                {{ t("common.refresh") }}
              </button>
            </div>
            <div v-if="viewerError" class="error-message">{{ viewerError }}</div>
            <div v-else-if="viewerLoading" class="loading-hint">{{ t("common.loading") }}</div>
            <div v-else-if="viewers.length === 0" class="empty-hint">{{ t("postDetail.noViewers") }}</div>
            <div v-else class="viewer-list">
              <div v-for="item in viewers" :key="`${item.userId}-${item.viewedAt}`" class="viewer-item">
                <img
                  v-if="item.avatarUrl"
                  :src="withMediaToken(item.avatarUrl)"
                  class="viewer-avatar"
                  alt=""
                  @error="onImageError"
                />
                <span class="viewer-name">{{ item.nickname || t("villagePosts.authorFallback", { id: item.userId }) }}</span>
                <span class="text-secondary">{{ formatDateTime(item.viewedAt) }}</span>
              </div>
            </div>
            <Pagination
              v-model:page="viewerPage"
              :total-pages="viewerTotalPages"
              :total="viewerTotal"
              :disabled="viewerLoading"
              @change="fetchViewers"
            />
          </div>
        </div>

        <!-- 右：元信息 + 动作 -->
        <div class="col-side">
          <div class="card">
            <div class="meta-row">
              <span class="meta-key">{{ t("postDetail.columnId") }}</span>
              <span class="meta-val text-mono">{{ detail.id }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">{{ t("villagePosts.columnAuthor") }}</span>
              <span class="meta-val">
                {{ detail.authorNickname || t("villagePosts.authorFallback", { id: detail.authorId }) }}
                <span class="text-secondary">#{{ detail.authorId }}</span>
              </span>
            </div>
            <div class="meta-row">
              <span class="meta-key">{{ t("villagePosts.columnCategory") }}</span>
              <span class="meta-val">{{ categoryLabel(detail.category) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">{{ t("postDetail.columnVisibilityState") }}</span>
              <span class="meta-val">
                <span class="status-badge" :class="`status-${detail.status ?? 'none'}`">
                  {{ postStatusLabel(detail.status) }}
                </span>
              </span>
            </div>
            <div class="meta-row">
              <span class="meta-key">{{ t("villagePosts.columnAuditStatus") }}</span>
              <span class="meta-val">
                <span class="status-badge" :class="`audit-${detail.auditStatus ?? 'none'}`">
                  {{ auditStatusLabel(detail.auditStatus) }}
                </span>
              </span>
            </div>
            <div v-if="detail.auditedAt" class="meta-row">
              <span class="meta-key">{{ t("postDetail.auditedAt") }}</span>
              <span class="meta-val">{{ formatDateTime(detail.auditedAt) }}</span>
            </div>
            <div v-if="detail.auditRemark" class="meta-row">
              <span class="meta-key">{{ t("postDetail.auditRemarkLabel") }}</span>
              <span class="meta-val">{{ detail.auditRemark }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">{{ t("villagePosts.columnCreatedAt") }}</span>
              <span class="meta-val">{{ formatDateTime(detail.createdAt) }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-key">{{ t("postDetail.updatedAt") }}</span>
              <span class="meta-val">{{ formatDateTime(detail.updatedAt) }}</span>
            </div>
            <div class="stat-grid">
              <span>{{ t("villagePosts.statsLikes", { n: detail.likesCount ?? 0 }) }}</span>
              <span>{{ t("villagePosts.statsComments", { n: detail.commentsCount ?? 0 }) }}</span>
              <span>{{ t("villagePosts.statsFavorites", { n: detail.favoriteCount ?? 0 }) }}</span>
              <span>{{ t("villagePosts.statsViews", { n: detail.viewCount ?? 0 }) }}</span>
            </div>
          </div>

          <div v-if="canAudit && sessionStore.canWrite" class="card">
            <div class="section-title">{{ t("postDetail.auditTitle") }}</div>
            <div class="radio-group">
              <label class="radio-item">
                <input v-model="auditDecision" type="radio" value="approved" />
                <span>{{ t("villagePosts.auditApprovedOption") }}</span>
              </label>
              <label class="radio-item">
                <input v-model="auditDecision" type="radio" value="rejected" />
                <span>{{ t("villagePosts.auditRejectedOption") }}</span>
              </label>
            </div>
            <textarea
              v-model="auditRemark"
              class="form-textarea"
              :maxlength="REMARK_MAX_LENGTH"
              :placeholder="t('postDetail.remarkPlaceholder')"
              rows="3"
            />
            <div v-if="auditError" class="error-message">{{ auditError }}</div>
            <div class="modal-actions">
              <button class="primary-button" :disabled="savingAudit" @click="submitAudit">
                {{ savingAudit ? t("common.saving") : t("postDetail.submitAudit") }}
              </button>
            </div>
          </div>

          <div class="card">
            <div class="section-title">{{ t("common.actions") }}</div>
            <div v-if="pinError" class="error-message">{{ pinError }}</div>
            <div class="action-row">
              <button v-if="sessionStore.canWrite" class="secondary-button" :disabled="pinning" @click="togglePin">
                {{ detail.isPinned ? t("villagePosts.actionUnpin") : t("villagePosts.actionPin") }}
              </button>
              <button v-if="sessionStore.canWrite" class="danger-button" @click="deleteVisible = true">{{ t("common.delete") }}</button>
            </div>
            <p class="modal-hint">{{ t("postDetail.contentLockedHint") }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 大图预览 -->
    <div v-if="previewVisible" class="modal-mask preview-mask" @click.self="closePreview">
      <div class="preview-stage">
        <img v-if="previewSrc" :src="previewSrc" class="preview-img" alt="" @error="onImageError" />
        <div class="preview-bar">
          <button v-if="hasMultipleImages" class="ghost-button" @click="stepPreview(-1)">‹</button>
          <span class="preview-counter">{{ previewIndex + 1 }} / {{ imageSrcs.length }}</span>
          <button v-if="hasMultipleImages" class="ghost-button" @click="stepPreview(1)">›</button>
          <button class="ghost-button" @click="closePreview">{{ t("common.cancel") }}</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="t('postDetail.deleteTitle')"
      :message="detail ? t('villagePosts.deleteConfirmMessage', { id: detail.id }) : ''"
      :danger="true"
      :confirming="deleting"
      @confirm="handleConfirmDelete"
      @cancel="deleteVisible = false"
    />
  </div>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.post-detail-page {
  padding: 24px;
}
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.header-left {
  display: flex;
  flex-direction: column;
}
.loading-hint,
.empty-hint {
  color: var(--admin-color-text-tertiary);
  padding: 16px 0;
  font-size: 13px;
}

.columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}
.col-main,
.col-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card {
  background: #fff;
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
  padding: 16px;
}

/* 九宫格：单格恒 1:1，与小程序口径一致 */
.image-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);
  max-width: 540px;
}
.image-grid[data-count="1"] {
  grid-template-columns: minmax(0, 260px);
}
.image-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: var(--admin-radius-md);
  background: var(--admin-color-bg-tertiary);
  cursor: zoom-in;
}
.image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.image-more {
  position: absolute;
  right: 4px;
  bottom: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 12px;
}
.no-image {
  color: var(--admin-color-text-tertiary);
  font-size: 13px;
}

.post-title {
  margin: 0 0 8px;
  font-size: 17px;
}
.post-content {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
  font-size: 14px;
  word-break: break-word;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.tag {
  background: var(--admin-color-bg-tertiary);
  color: var(--admin-color-text-secondary);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
}
.comment-item {
  border-top: 1px solid var(--admin-color-border-light);
  padding: 10px 0;
}
.comment-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  margin-bottom: 4px;
}
.comment-author {
  color: var(--admin-color-text-primary);
  font-weight: 600;
}
.comment-content {
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}
.viewer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  border-top: 1px solid var(--admin-color-border-light);
}
.viewer-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
.viewer-name {
  flex: 1;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
}
.meta-key {
  color: var(--admin-color-text-tertiary);
  flex-shrink: 0;
}
.meta-val {
  text-align: right;
  word-break: break-word;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--admin-color-border-light);
  font-size: 12px;
  color: var(--admin-color-text-secondary);
}

.action-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.preview-mask {
  background: rgba(0, 0, 0, 0.72);
  align-items: center;
  justify-content: center;
}
.preview-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 86vw;
}
.preview-img {
  max-width: 86vw;
  max-height: 78vh;
  object-fit: contain;
  border-radius: var(--admin-radius-md);
  background: #fff;
}
.preview-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.preview-counter {
  color: #fff;
  font-size: 13px;
}

@media (max-width: 1080px) {
  .columns {
    grid-template-columns: 1fr;
  }
}
</style>
