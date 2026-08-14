<script setup lang="ts">
/**
 * Admin v2 - 媒体图片审核视图（用户与内容域，2026-08-09）。
 *
 * 对应后端 com.campuslove.api.admin.AdminMediaAssetController：
 * - GET  /api/v1/admin/media-assets                     （分页列表，默认 pending，支持 auditStatus/userId/campusName 筛选）
 * - GET  /api/v1/admin/media-assets/{id}                 （详情，弹窗展示大图 + 元信息）
 * - POST /api/v1/admin/media-assets/{id}/audit           （审核：通过/拒绝，拒绝时 remark 必填）
 *
 * 交互参考 VillagePosts.vue：审核弹窗（通过/拒绝 + 拒绝备注必填）、
 * 成功后自动加载下一条（连续审核），点击缩略图打开大图预览弹窗。
 */
import { onMounted, ref } from "vue";
import { useRequestRace } from "../../composables/useRequestRace";
import { useI18n } from "vue-i18n";
import {
  listMediaAssets,
  auditMediaAsset,
  type MediaAssetSummary,
} from "../../api/media";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE, REMARK_MAX_LENGTH } from "../../utils/constants";

const { t } = useI18n();

// ===== 列表状态 =====
const assets = ref<MediaAssetSummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");

// ===== 筛选条件 =====
const auditStatusFilter = ref<"" | "pending" | "approved" | "rejected">("pending");
const typeFilter = ref<"" | "avatar" | "image" | "video" | "background" | "app_asset">("");
const userIdFilter = ref("");
const campusFilter = ref("");

// ===== 分页状态 =====
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

/** 请求竞态防护 */
const { nextSeq, isStale } = useRequestRace();

/** 分页加载媒体图片列表 */
async function fetchAssets(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  const seq = nextSeq();
  try {
    const result = await listMediaAssets({
      page: page.value,
      pageSize: pageSize.value,
      auditStatus: auditStatusFilter.value || undefined,
      type: typeFilter.value || undefined,
      userId: userIdFilter.value.trim() ? Number(userIdFilter.value.trim()) : undefined,
      campusName: campusFilter.value.trim() || undefined,
    });
    if (isStale(seq)) return;
    assets.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (isStale(seq)) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("mediaAssets.loadFailed");
    assets.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (!isStale(seq)) {
      loading.value = false;
    }
  }
}

/** 搜索：回到第一页再查询 */
function handleSearch(): void {
  page.value = 1;
  void fetchAssets();
}

/** 重置全部筛选条件 */
function handleResetFilters(): void {
  auditStatusFilter.value = "pending";
  typeFilter.value = "";
  userIdFilter.value = "";
  campusFilter.value = "";
  handleSearch();
}

/** 分页变更回调 */
function handlePageChange(): void {
  void fetchAssets();
}

// ===== 图片预览弹窗 =====
const previewVisible = ref(false);
const previewUrl = ref("");
const previewAsset = ref<MediaAssetSummary | null>(null);

/** 打开大图预览（缩略图点击触发） */
function openPreview(item: MediaAssetSummary): void {
  previewAsset.value = item;
  previewUrl.value = item.url;
  previewVisible.value = true;
}

function closePreview(): void {
  previewVisible.value = false;
  previewAsset.value = null;
}

/** 缩略图加载失败兜底（非受管 URL 或静态资源不可达时显示占位） */
function onImageError(e: Event): void {
  const img = e.target as HTMLImageElement;
  img.style.visibility = "hidden";
  img.dataset.failed = "1";
}

// ===== 审核弹窗 =====
const auditingAsset = ref<MediaAssetSummary | null>(null);
const auditDecision = ref<"approved" | "rejected">("approved");
const auditRemark = ref("");
const auditError = ref("");
const savingAudit = ref(false);

/** 打开审核弹窗（默认通过；支持审核后自动加载下一条连续审核） */
function openAudit(item: MediaAssetSummary): void {
  auditingAsset.value = item;
  auditDecision.value = "approved";
  auditRemark.value = "";
  auditError.value = "";
}

/** 关闭审核弹窗 */
function closeAudit(): void {
  if (savingAudit.value) return;
  auditingAsset.value = null;
  auditRemark.value = "";
  auditError.value = "";
}

/** 审核弹窗 Esc 关闭 */
function onAuditKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape" && auditingAsset.value && !savingAudit.value) {
    closeAudit();
  }
}

/** 提交审核（拒绝时必须填写备注，供留痕与客户端提示） */
async function handleSaveAudit(): Promise<void> {
  const asset = auditingAsset.value;
  if (!asset || savingAudit.value) return;
  if (auditDecision.value === "rejected" && !auditRemark.value.trim()) {
    auditError.value = t("mediaAssets.rejectRemarkRequired");
    return;
  }
  savingAudit.value = true;
  auditError.value = "";
  try {
    await auditMediaAsset(asset.id, {
      decision: auditDecision.value,
      remark: auditRemark.value.trim() || undefined,
    });
    // 连续审核：保留弹窗，自动切到下一条 pending 记录
    const nextPending = assets.value.find(
      (a) => a.id !== asset.id && a.auditStatus === "pending"
    );
    if (nextPending) {
      auditingAsset.value = nextPending;
      auditDecision.value = "approved";
      auditRemark.value = "";
    } else {
      auditingAsset.value = null;
      auditRemark.value = "";
    }
    await fetchAssets();
  } catch (err: unknown) {
    auditError.value = err instanceof ApiError ? err.message : t("mediaAssets.auditFailed");
  } finally {
    savingAudit.value = false;
  }
}

// ===== 展示辅助 =====
/** 类型文案 */
function typeLabel(type: string | null): string {
  switch (type) {
    case "avatar":
      return t("mediaAssets.typeAvatar");
    case "image":
      return t("mediaAssets.typeImage");
    case "background":
      return t("mediaAssets.typeBackground");
    case "video":
      return t("mediaAssets.typeVideo");
    case "app_asset":
      return t("mediaAssets.typeAppAsset");
    default:
      return type ?? "—";
  }
}

/** 审核状态文案 */
function auditStatusLabel(status: string | null): string {
  switch (status) {
    case "pending":
      return t("mediaAssets.statusPending");
    case "approved":
      return t("mediaAssets.statusApproved");
    case "rejected":
      return t("mediaAssets.statusRejected");
    default:
      return status ?? "—";
  }
}

/** 文件大小格式化（字节 → KB/MB） */
function formatSize(size: number | null): string {
  if (size == null) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

onMounted(() => {
  void fetchAssets();
});
</script>

<template>
  <view class="media-assets-page">
    <view class="page-header">
      <text class="page-title">{{ t("layout.navMediaAssets") }}</text>
      <text class="page-subtitle">{{ t("mediaAssets.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <select v-model="auditStatusFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("mediaAssets.filterAuditStatusAll") }}</option>
        <option value="pending">{{ t("mediaAssets.statusPending") }}</option>
        <option value="approved">{{ t("mediaAssets.statusApproved") }}</option>
        <option value="rejected">{{ t("mediaAssets.statusRejected") }}</option>
      </select>
      <select v-model="typeFilter" class="filter-select" @change="handleSearch">
        <option value="">{{ t("mediaAssets.filterTypeAll") }}</option>
        <option value="avatar">{{ t("mediaAssets.typeAvatar") }}</option>
        <option value="image">{{ t("mediaAssets.typeImage") }}</option>
        <option value="video">{{ t("mediaAssets.typeVideo") }}</option>
        <option value="background">{{ t("mediaAssets.typeBackground") }}</option>
        <option value="app_asset">{{ t("mediaAssets.typeAppAsset") }}</option>
      </select>
      <input
        v-model="userIdFilter"
        class="filter-input"
        type="number"
        :placeholder="t('mediaAssets.filterUserIdPlaceholder')"
        @keyup.enter="handleSearch"
      />
      <input
        v-model="campusFilter"
        class="filter-input"
        type="text"
        :placeholder="t('mediaAssets.filterCampusPlaceholder')"
        @keyup.enter="handleSearch"
      />
      <button class="ghost-button" @click="handleResetFilters">{{ t("common.reset") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchAssets" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("mediaAssets.columnPreview") }}</th>
            <th scope="col">{{ t("mediaAssets.columnId") }}</th>
            <th scope="col">{{ t("mediaAssets.columnUser") }}</th>
            <th scope="col">{{ t("mediaAssets.columnType") }}</th>
            <th scope="col">{{ t("mediaAssets.columnMeta") }}</th>
            <th scope="col">{{ t("mediaAssets.columnAuditStatus") }}</th>
            <th scope="col">{{ t("mediaAssets.columnCampus") }}</th>
            <th scope="col">{{ t("mediaAssets.columnCreatedAt") }}</th>
            <th scope="col">{{ t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="assets.length === 0">
            <td colspan="9" class="empty-row">{{ t("mediaAssets.noData") }}</td>
          </tr>
          <tr v-for="item in assets" :key="item.id">
            <td>
              <view class="thumb-cell">
                <img
                  :src="item.url"
                  class="thumb"
                  alt=""
                  loading="lazy"
                  @click="openPreview(item)"
                  @error="onImageError"
                />
              </view>
            </td>
            <td>{{ item.id }}</td>
            <td class="user-cell">
              <img
                v-if="item.userAvatar"
                :src="item.userAvatar"
                class="user-avatar"
                alt=""
                @error="onImageError"
              />
              <span>{{
                item.type === "app_asset"
                  ? t("mediaAssets.userSystem")
                  : item.userNickname || t("mediaAssets.userFallback", { id: item.userId })
              }}</span>
            </td>
            <td>
              <span class="type-badge" :class="`type-${item.type ?? 'none'}`">
                {{ typeLabel(item.type) }}
              </span>
            </td>
            <td class="meta-cell">
              <span class="meta-item">{{ formatSize(item.size) }}</span>
              <span v-if="item.width && item.height" class="meta-item">{{ item.width }}×{{ item.height }}</span>
              <span v-if="item.originalName" class="meta-item name-ellipsis" :title="item.originalName">{{ item.originalName }}</span>
            </td>
            <td>
              <span class="status-badge" :class="`audit-${item.auditStatus ?? 'none'}`">
                {{ auditStatusLabel(item.auditStatus) }}
              </span>
              <text v-if="item.auditRemark" class="remark-tag" :title="item.auditRemark">
                {{ item.auditRemark }}
              </text>
            </td>
            <td>{{ item.campusName || "—" }}</td>
            <td class="time-cell">{{ formatDateTime(item.createdAt) }}</td>
            <td class="action-cell">
              <button class="action-button audit" @click="openPreview(item)">{{ t("mediaAssets.actionPreview") }}</button>
              <button
                v-if="item.auditStatus === 'pending'"
                class="action-button audit"
                @click="openAudit(item)"
              >{{ t("mediaAssets.actionAudit") }}</button>
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

    <!-- 大图预览弹窗（含完整元信息） -->
    <view v-if="previewVisible" class="modal-mask" @click.self="closePreview">
      <view class="modal preview-modal">
        <text class="modal-title">{{ t("mediaAssets.previewTitle", { id: previewAsset?.id }) }}</text>
        <view class="preview-body">
          <img
            :src="previewUrl"
            class="preview-img"
            alt=""
            @error="onImageError"
          />
          <view class="preview-meta" v-if="previewAsset">
            <text class="meta-line">{{ t("mediaAssets.previewUser", { name: previewAsset.userNickname || previewAsset.userId }) }}</text>
            <text class="meta-line">{{ t("mediaAssets.previewType", { type: typeLabel(previewAsset.type) }) }}</text>
            <text class="meta-line">{{ t("mediaAssets.previewSize", { size: formatSize(previewAsset.size) }) }}</text>
            <text v-if="previewAsset.width && previewAsset.height" class="meta-line">
              {{ t("mediaAssets.previewDimension", { w: previewAsset.width, h: previewAsset.height }) }}
            </text>
            <text v-if="previewAsset.originalName" class="meta-line">{{ t("mediaAssets.previewName", { name: previewAsset.originalName }) }}</text>
            <text class="meta-line">{{ t("mediaAssets.previewTime", { time: formatDateTime(previewAsset.createdAt) }) }}</text>
            <text v-if="previewAsset.auditRemark" class="meta-line remark-line">
              {{ t("mediaAssets.previewRemark", { remark: previewAsset.auditRemark }) }}
            </text>
          </view>
        </view>
        <view class="modal-actions">
          <button class="ghost-button" @click="closePreview">{{ t("common.close") }}</button>
        </view>
      </view>
    </view>

    <!-- 审核弹窗（通过/拒绝，拒绝时备注必填） -->
    <view
      v-if="auditingAsset"
      class="modal-mask"
      @click.self="closeAudit"
      @keydown.esc="onAuditKeydown"
    >
      <view class="modal">
        <text class="modal-title">{{ t("mediaAssets.auditTitle", { id: auditingAsset.id }) }}</text>
        <view class="audit-preview-row">
          <img
            :src="auditingAsset.url"
            class="audit-preview-img"
            alt=""
            @error="onImageError"
          />
          <view class="audit-preview-info">
            <text class="meta-line">{{ t("mediaAssets.previewUser", { name: auditingAsset.userNickname || auditingAsset.userId }) }}</text>
            <text class="meta-line">{{ t("mediaAssets.previewType", { type: typeLabel(auditingAsset.type) }) }}</text>
            <text class="meta-line">{{ t("mediaAssets.previewSize", { size: formatSize(auditingAsset.size) }) }}</text>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("mediaAssets.auditDecisionLabel") }}</text>
          <view class="radio-group radio-horizontal">
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="approved" />
              <span>{{ t("mediaAssets.auditApprovedOption") }}</span>
            </label>
            <label class="radio-item">
              <input v-model="auditDecision" type="radio" value="rejected" />
              <span>{{ t("mediaAssets.auditRejectedOption") }}</span>
            </label>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">{{ t("mediaAssets.auditRemarkLabel") }}</text>
          <textarea
            v-model="auditRemark"
            class="form-textarea"
            rows="3"
            :maxlength="REMARK_MAX_LENGTH"
            :placeholder="auditDecision === 'rejected' ? t('mediaAssets.rejectReasonPlaceholder') : t('mediaAssets.remarkPlaceholder')"
          />
        </view>
        <text v-if="auditError" class="audit-error">{{ auditError }}</text>
        <view class="modal-actions">
          <button class="ghost-button" :disabled="savingAudit" @click="closeAudit">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="savingAudit" @click="handleSaveAudit">
            {{ savingAudit ? t("common.saving") : t("mediaAssets.submitAudit") }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 复用 VillagePosts 同款布局类（toolbar/data-table/modal 等来自全局样式 + 局部补充） */
.media-assets-page {
  padding: var(--admin-space-lg);
}

.filter-input {
  width: 120px;
  height: var(--admin-input-height);
  padding: 0 var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-sm);
  background: var(--admin-color-bg);
}

.thumb-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: var(--admin-radius-md);
  border: 1px solid var(--admin-color-border-light);
  background: var(--admin-color-bg-tertiary);
  cursor: pointer;
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--admin-radius-full);
  font-size: var(--admin-font-xs);
  background: var(--admin-color-bg-tertiary);
  color: var(--admin-color-text-secondary);
}

.type-avatar {
  background: #e8f4ff;
  color: #1d6fb8;
}

.type-image {
  background: #f0fdf9;
  color: #0d9488;
}

.meta-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-secondary);
}

.meta-item {
  display: block;
}

.name-ellipsis {
  max-width: var(--admin-text-ellipsis-width);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remark-tag {
  display: block;
  max-width: var(--admin-text-ellipsis-width);
  margin-top: 4px;
  font-size: var(--admin-font-xs);
  color: var(--admin-color-danger);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 预览弹窗 */
.preview-modal {
  width: var(--admin-dialog-width);
  max-width: 92vw;
}

.preview-body {
  display: flex;
  gap: var(--admin-space-lg);
  max-height: 55vh;
  overflow-y: auto;
  margin-bottom: var(--admin-space-lg);
}

.preview-img {
  max-width: 260px;
  max-height: 320px;
  object-fit: contain;
  border-radius: var(--admin-radius-lg);
  border: 1px solid var(--admin-color-border-light);
  background: var(--admin-color-bg-tertiary);
}

.preview-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.meta-line {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-secondary);
  word-break: break-all;
}

.remark-line {
  color: var(--admin-color-danger);
}

/* 审核弹窗 */
.audit-preview-row {
  display: flex;
  gap: var(--admin-space-lg);
  margin-bottom: var(--admin-space-lg);
  padding: var(--admin-space-md);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
}

.audit-preview-img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: var(--admin-radius-md);
  border: 1px solid var(--admin-color-border-light);
  background: var(--admin-color-bg-tertiary);
  flex-shrink: 0;
}

.audit-preview-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.audit-error {
  display: block;
  margin-bottom: var(--admin-space-md);
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger);
}
</style>
