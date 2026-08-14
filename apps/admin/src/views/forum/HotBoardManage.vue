<script setup lang="ts">
/**
 * Admin v2 - 热度榜管理视图（2026-08-11）。
 *
 * 对应后端 AdminVillagePostController 热度端点：
 * - POST /api/v1/admin/forum/village-posts/{id}/hot-boost   （热度倍率）
 * - POST /api/v1/admin/forum/village-posts/{id}/hot-ban     （禁止上榜）
 * - POST /api/v1/admin/forum/village-posts/{id}/hot-recalc  （立即重算）
 *
 * 运营操纵：单帖「热度加倍」弹窗（0=压榜 / 0.5 半量 / 1.5 加成 / 2.5 强推）、
 * 「禁止上榜 / 恢复上榜」行内操作。热度公式权重在「配置管理 → 全局配置」页调整。
 */
import { onMounted, ref } from "vue";
import { useRequestRace } from "../../composables/useRequestRace";
import { useI18n } from "vue-i18n";
import {
  listVillagePosts,
  setPostHotBoost,
  setPostHotBan,
  recalcPostHot,
  type VillagePostSummary,
} from "../../api/forum";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

const { t } = useI18n();

// ===== 列表状态 =====
const posts = ref<VillagePostSummary[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const keyword = ref("");

// ===== 分页状态 =====
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

/** 请求竞态防护 */
const { nextSeq, isStale } = useRequestRace();

/** 分页加载帖子列表（热度榜管理视角：只看 active 帖，便于操纵） */
async function fetchPosts(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  const seq = nextSeq();
  try {
    const result = await listVillagePosts({
      page: page.value,
      pageSize: pageSize.value,
      status: "active",
      keyword: keyword.value.trim() || undefined,
    });
    if (isStale(seq)) return;
    posts.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (isStale(seq)) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("hotBoardManage.loadFailed");
    posts.value = [];
  } finally {
    if (!isStale(seq)) loading.value = false;
  }
}

function handleSearch(): void {
  page.value = 1;
  void fetchPosts();
}

function handlePageChange(): void {
  void fetchPosts();
}

// ===== 热度倍率弹窗 =====
const boostTarget = ref<VillagePostSummary | null>(null);
const boostValue = ref(1);
const savingBoost = ref(false);
const boostError = ref("");

const BOOST_PRESETS = [0, 0.5, 1, 1.5, 2.5, 5] as const;

function openBoost(post: VillagePostSummary): void {
  boostTarget.value = post;
  boostValue.value = post.hotBoost ?? 1;
  boostError.value = "";
}

function closeBoost(): void {
  if (savingBoost.value) return;
  boostTarget.value = null;
  boostError.value = "";
}

async function handleSaveBoost(): Promise<void> {
  const target = boostTarget.value;
  if (!target || savingBoost.value) return;
  const v = Number(boostValue.value);
  if (Number.isNaN(v) || v < 0 || v > 100) {
    boostError.value = t("hotBoardManage.boostInvalid");
    return;
  }
  savingBoost.value = true;
  boostError.value = "";
  try {
    await setPostHotBoost(target.id, v);
    boostTarget.value = null;
    await fetchPosts();
  } catch (err: unknown) {
    boostError.value = err instanceof ApiError ? err.message : t("hotBoardManage.opFailed");
  } finally {
    savingBoost.value = false;
  }
}

// ===== 禁止上榜 / 恢复 =====
const banningId = ref<number | null>(null);

async function toggleBan(post: VillagePostSummary): Promise<void> {
  if (banningId.value !== null) return;
  banningId.value = post.id;
  errorMsg.value = "";
  try {
    await setPostHotBan(post.id, !post.hotBanned);
    await fetchPosts();
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : t("hotBoardManage.opFailed");
  } finally {
    banningId.value = null;
  }
}

// ===== 立即重算 =====
const recalcId = ref<number | null>(null);

async function handleRecalc(post: VillagePostSummary): Promise<void> {
  if (recalcId.value !== null) return;
  recalcId.value = post.id;
  errorMsg.value = "";
  try {
    await recalcPostHot(post.id);
    await fetchPosts();
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : t("hotBoardManage.opFailed");
  } finally {
    recalcId.value = null;
  }
}

/** 热度分展示（保留 1 位小数） */
function formatScore(score: number | null | undefined): string {
  if (score == null) return "—";
  return score.toFixed(1);
}

onMounted(() => {
  void fetchPosts();
});
</script>

<template>
  <view class="hot-board-page">
    <view class="page-header">
      <text class="page-title">{{ t("layout.navHotBoardManage") }}</text>
      <text class="page-subtitle">{{ t("hotBoardManage.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <input
        v-model="keyword"
        class="search-input"
        type="text"
        :placeholder="t('villagePosts.searchPlaceholder')"
        @keyup.enter="handleSearch"
      />
      <button class="ghost-button" @click="keyword = ''; handleSearch()">{{ t("common.reset") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchPosts" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("villagePosts.columnId") }}</th>
            <th scope="col">{{ t("villagePosts.columnContent") }}</th>
            <th scope="col">{{ t("villagePosts.columnAuthor") }}</th>
            <th scope="col">{{ t("hotBoardManage.columnHotScore") }}</th>
            <th scope="col">{{ t("hotBoardManage.columnHotBoost") }}</th>
            <th scope="col">{{ t("hotBoardManage.columnHotStatus") }}</th>
            <th scope="col">{{ t("villagePosts.columnCreatedAt") }}</th>
            <th scope="col">{{ t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="posts.length === 0">
            <td colspan="8" class="empty-row">{{ t("hotBoardManage.noData") }}</td>
          </tr>
          <tr v-for="post in posts" :key="post.id">
            <td>{{ post.id }}</td>
            <td class="content-cell">
              <text>{{ post.contentPreview }}</text>
              <text v-if="post.hotBanned" class="banned-tag">{{ t("hotBoardManage.bannedTag") }}</text>
            </td>
            <td>{{ post.authorNickname ?? t("villagePosts.authorFallback", { id: post.authorId }) }}</td>
            <td class="score-cell">{{ formatScore(post.hotScore) }}</td>
            <td>{{ post.hotBoost ?? 1 }}</td>
            <td>
              <span class="status-badge" :class="post.hotBanned ? 'status-hidden' : 'status-active'">
                {{ post.hotBanned ? t("hotBoardManage.statusBanned") : t("hotBoardManage.statusNormal") }}
              </span>
            </td>
            <td class="time-cell">{{ formatDateTime(post.createdAt) }}</td>
            <td class="action-cell">
              <button class="action-button handle" @click="openBoost(post)">{{ t("hotBoardManage.actionBoost") }}</button>
              <button
                class="action-button"
                :class="post.hotBanned ? 'pin' : 'delete'"
                :disabled="banningId !== null"
                @click="toggleBan(post)"
              >
                {{ post.hotBanned ? t("hotBoardManage.actionUnban") : t("hotBoardManage.actionBan") }}
              </button>
              <button class="action-button handle" :disabled="recalcId !== null" @click="handleRecalc(post)">
                {{ t("hotBoardManage.actionRecalc") }}
              </button>
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

    <!-- 热度倍率弹窗 -->
    <view v-if="boostTarget" class="modal-mask" @click.self="closeBoost">
      <view class="modal">
        <text class="modal-title">{{ t("hotBoardManage.boostTitle", { id: boostTarget.id }) }}</text>
        <view class="post-content-box">{{ boostTarget.contentPreview }}</view>
        <view class="form-row">
          <text class="form-label">{{ t("hotBoardManage.boostLabel") }}</text>
          <input v-model.number="boostValue" class="form-input" type="number" min="0" max="100" step="0.5" />
        </view>
        <view class="preset-row">
          <button
            v-for="p in BOOST_PRESETS"
            :key="p"
            class="preset-button"
            :class="{ active: boostValue === p }"
            @click="boostValue = p"
          >
            {{ p === 0 ? t("hotBoardManage.boostPresetZero") : `${p}x` }}
          </button>
        </view>
        <text class="boost-hint">{{ t("hotBoardManage.boostHint") }}</text>
        <text v-if="boostError" class="audit-error">{{ boostError }}</text>
        <view class="modal-actions">
          <button class="ghost-button" :disabled="savingBoost" @click="closeBoost">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="savingBoost" @click="handleSaveBoost">
            {{ savingBoost ? t("common.saving") : t("common.confirm") }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.hot-board-page {
  padding: 16px;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  display: block;
}

.page-subtitle {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
  display: block;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
  max-width: 320px;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 13px;
}

.ghost-button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.table-container {
  background: #fff;
  border-radius: 6px;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  background: #f5f7fa;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
}

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.content-cell {
  max-width: 320px;
}

.content-cell text {
  display: block;
}

.banned-tag {
  display: inline-block;
  margin-top: 4px;
  background: #fef0f0;
  color: #f56c6c;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 12px;
}

.score-cell {
  font-weight: 600;
  color: #f59e0b;
}

.status-badge {
  display: inline-block;
  border-radius: 3px;
  padding: 1px 8px;
  font-size: 12px;
}

.status-active {
  background: #f0f9eb;
  color: #67c23a;
}

.status-hidden {
  background: #fef0f0;
  color: #f56c6c;
}

.time-cell {
  white-space: nowrap;
}

.action-cell {
  white-space: nowrap;
}

.action-cell .action-button {
  margin-right: 4px;
  height: 26px;
  padding: 0 8px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
}

.action-button.pin {
  color: #409eff;
  border-color: #409eff;
}

.action-button.delete {
  color: #f56c6c;
  border-color: #f56c6c;
}

.empty-row {
  text-align: center;
  color: #909399;
  padding: 24px;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  width: 420px;
  max-width: 92vw;
  max-height: 80vh;
  overflow: auto;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  display: block;
  margin-bottom: 10px;
}

.post-content-box {
  background: #f7f8fa;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 12px;
  max-height: 80px;
  overflow: auto;
}

.form-row {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-label {
  font-size: 13px;
  color: #606266;
  min-width: 90px;
}

.form-input {
  flex: 1;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0 8px;
}

.preset-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.preset-button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.preset-button.active {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
}

.boost-hint {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 8px;
}

.audit-error {
  color: #f56c6c;
  font-size: 12px;
  display: block;
  margin-bottom: 8px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.primary-button {
  height: 32px;
  padding: 0 16px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
