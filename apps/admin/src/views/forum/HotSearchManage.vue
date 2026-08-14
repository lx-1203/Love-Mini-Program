<script setup lang="ts">
/**
 * Admin v2 - 热搜词管理视图（2026-08-11）。
 *
 * 对应后端 AdminHotSearchController：
 * - GET  /api/v1/admin/search/hot                    （热搜词列表）
 * - POST /api/v1/admin/search/hot/{keyword}/remove   （下架）
 * - POST /api/v1/admin/search/hot/{keyword}/restore  （恢复）
 *
 * 运营操纵：下架/恢复热搜词（软删，防运营事故）。
 */
import { onMounted, ref } from "vue";
import { useRequestRace } from "../../composables/useRequestRace";
import { useI18n } from "vue-i18n";
import {
  listHotSearches,
  removeHotSearch,
  restoreHotSearch,
  type HotSearchAdminView,
} from "../../api/forum";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ErrorState from "../../components/ErrorState.vue";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

const { t } = useI18n();

const items = ref<HotSearchAdminView[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const total = ref(0);
const totalPages = ref(1);

const { nextSeq, isStale } = useRequestRace();

async function fetchItems(): Promise<void> {
  loading.value = true;
  errorMsg.value = "";
  const seq = nextSeq();
  try {
    const result = await listHotSearches({ page: page.value, pageSize: pageSize.value });
    if (isStale(seq)) return;
    items.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err: unknown) {
    if (isStale(seq)) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("hotSearchManage.loadFailed");
    items.value = [];
  } finally {
    if (!isStale(seq)) loading.value = false;
  }
}

function handlePageChange(): void {
  void fetchItems();
}

/** 下架/恢复热搜词（行内操作） */
const opKey = ref("");
const opLoading = ref(false);

async function toggleRemove(item: HotSearchAdminView): Promise<void> {
  if (opLoading.value) return;
  opKey.value = item.keyword;
  opLoading.value = true;
  errorMsg.value = "";
  try {
    if (item.isRemoved) {
      await restoreHotSearch(item.keyword);
    } else {
      await removeHotSearch(item.keyword);
    }
    await fetchItems();
  } catch (err: unknown) {
    errorMsg.value = err instanceof ApiError ? err.message : t("hotSearchManage.opFailed");
  } finally {
    opKey.value = "";
    opLoading.value = false;
  }
}

onMounted(() => {
  void fetchItems();
});
</script>

<template>
  <view class="hot-search-page">
    <view class="page-header">
      <text class="page-title">{{ t("layout.navHotSearchManage") }}</text>
      <text class="page-subtitle">{{ t("hotSearchManage.subtitle") }}</text>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchItems" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("hotSearchManage.columnRank") }}</th>
            <th scope="col">{{ t("hotSearchManage.columnKeyword") }}</th>
            <th scope="col">{{ t("hotSearchManage.columnCount") }}</th>
            <th scope="col">{{ t("hotSearchManage.columnStatus") }}</th>
            <th scope="col">{{ t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="5" class="empty-row">{{ t("hotSearchManage.noData") }}</td>
          </tr>
          <tr v-for="(item, idx) in items" :key="item.keyword">
            <td>{{ (page - 1) * pageSize + idx + 1 }}</td>
            <td class="keyword-cell">
              <text class="keyword-text">{{ item.keyword }}</text>
              <text v-if="idx < 3 && !item.isRemoved" class="top-tag">{{ t("hotSearchManage.topTag") }}</text>
            </td>
            <td>{{ item.searchCount }}</td>
            <td>
              <span class="status-badge" :class="item.isRemoved ? 'status-hidden' : 'status-active'">
                {{ item.isRemoved ? t("hotSearchManage.statusRemoved") : t("hotSearchManage.statusNormal") }}
              </span>
            </td>
            <td class="action-cell">
              <button
                class="action-button"
                :class="item.isRemoved ? 'pin' : 'delete'"
                :disabled="opLoading"
                @click="toggleRemove(item)"
              >
                {{ item.isRemoved ? t("hotSearchManage.actionRestore") : t("hotSearchManage.actionRemove") }}
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
  </view>
</template>

<style scoped>
.hot-search-page {
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

.keyword-text {
  font-weight: 600;
}

.top-tag {
  display: inline-block;
  margin-left: 6px;
  background: #fef3e2;
  color: #f59e0b;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 12px;
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

.action-cell {
  white-space: nowrap;
}

.action-button {
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

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-row {
  text-align: center;
  color: #909399;
  padding: 24px;
}
</style>
