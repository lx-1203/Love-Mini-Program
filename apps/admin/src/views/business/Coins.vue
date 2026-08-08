<script setup lang="ts">
/**
 * Admin v2 金币（签到积分）流水视图（商业模式「商业运营」域）。
 *
 * 功能：
 * - 分页列表：流水 ID / 用户 ID / 来源类型（NORMAL 签到 / MAKE_UP 补签）/ 奖励积分 /
 *   连续签到天数 / 签到日期 / 签到时间
 * - 筛选：用户 ID + 来源类型下拉 + 签到日期范围（dateFrom/dateTo）+ 分页
 *
 * 对应后端 com.campuslove.api.admin.AdminCoinController：
 *   - GET /api/v1/admin/business/coins
 *
 * 数据说明：当前系统无独立积分流水实体，签到积分流水以 check_ins 表为数据源，
 * 每次签到即一笔积分流水；签到奖励固定为 1 积分/次（后端未存储奖励积分数，
 * 前端按固定规则展示，实际以客户端签到配置为准）。
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import {
  listCoinTransactions,
  type CoinTransactionView,
} from "../../api/business";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

const { t } = useI18n();

/** 积分流水列表数据 */
const flows = ref<CoinTransactionView[]>([]);
/** 加载中标志 */
const loading = ref(false);
/** 错误信息 */
const errorMsg = ref("");

/** 用户 ID 筛选（空串=全部） */
const userIdQuery = ref("");
/** 来源类型筛选（空串=全部） */
const typeFilter = ref("");
/** 签到起始日期（yyyy-MM-dd） */
const dateFrom = ref("");
/** 签到结束日期（yyyy-MM-dd） */
const dateTo = ref("");

/** 当前页码（1-based） */
const page = ref(1);
/** 每页大小 */
const pageSize = ref(DEFAULT_PAGE_SIZE);
/** 总记录数 */
const total = ref(0);
/** 总页数 */
const totalPages = ref(1);

// 请求竞态防护
let reqSeq = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** 来源类型选项 */
const SOURCE_OPTIONS = [
  { value: "NORMAL", labelKey: "coins.sourceNormal" },
  { value: "MAKE_UP", labelKey: "coins.sourceMakeup" },
];

/** 来源类型文案 */
function sourceLabel(source: string): string {
  return source === "MAKE_UP" ? t("coins.sourceMakeup") : t("coins.sourceNormal");
}

function sourceClass(source: string): string {
  return source === "MAKE_UP" ? "source-makeup" : "source-normal";
}

/** 奖励积分展示：签到固定奖励 1 积分（后端未存奖励值，见文件头说明） */
function rewardLabel(_flow: CoinTransactionView): string {
  return "1";
}

/**
 * 拉取积分流水列表。
 */
async function fetchFlows() {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listCoinTransactions({
      userId: userIdQuery.value.trim() ? Number(userIdQuery.value.trim()) : undefined,
      type: typeFilter.value || undefined,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (seq !== reqSeq) return;
    flows.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : t("coins.loadFailed");
    flows.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** 查询（防抖合并筛选变更） */
function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    page.value = 1;
    fetchFlows();
  }, 400);
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  page.value = 1;
  fetchFlows();
}

/** 重置筛选并刷新 */
function handleReset() {
  userIdQuery.value = "";
  typeFilter.value = "";
  dateFrom.value = "";
  dateTo.value = "";
  handleSearch();
}

function handlePageChange() {
  fetchFlows();
}

onMounted(() => {
  fetchFlows();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});
</script>

<template>
  <view class="coins-page">
    <view class="page-header">
      <text class="page-title">{{ t("coins.title") }}</text>
      <text class="page-subtitle">{{ t("coins.subtitle") }}</text>
    </view>

    <!-- 筛选工具栏 -->
    <view class="toolbar">
      <input
        v-model="userIdQuery"
        class="search-input"
        type="number"
        min="1"
        :placeholder="t('coins.userIdPlaceholder')"
        @keyup.enter="handleSearch"
      />
      <select v-model="typeFilter" class="filter-select" @change="scheduleSearch">
        <option value="">{{ t("coins.allSources") }}</option>
        <option v-for="o in SOURCE_OPTIONS" :key="o.value" :value="o.value">{{ t(o.labelKey) }}</option>
      </select>
      <input v-model="dateFrom" class="search-input date-input" type="date" @change="scheduleSearch" />
      <text class="range-sep">{{ t("coins.rangeSep") }}</text>
      <input v-model="dateTo" class="search-input date-input" type="date" @change="scheduleSearch" />
      <button class="primary-button" @click="handleSearch">{{ t("common.search") }}</button>
      <button class="ghost-button" @click="handleReset">{{ t("common.reset") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchFlows" />

    <!-- 流水列表 -->
    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("coins.columnFlowId") }}</th>
            <th scope="col">{{ t("coins.columnUserId") }}</th>
            <th scope="col">{{ t("coins.columnSource") }}</th>
            <th scope="col">{{ t("coins.columnReward") }}</th>
            <th scope="col">{{ t("coins.columnConsecutiveDays") }}</th>
            <th scope="col">{{ t("coins.columnCheckInDate") }}</th>
            <th scope="col">{{ t("coins.columnCheckInTime") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty-cell">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="flows.length === 0">
            <td colspan="7" class="empty-cell">{{ t("coins.noData") }}</td>
          </tr>
          <tr v-for="flow in flows" :key="flow.id">
            <td>{{ flow.id }}</td>
            <td>{{ flow.userId }}</td>
            <td>
              <span class="source-badge" :class="sourceClass(flow.source)">
                {{ sourceLabel(flow.source) }}
              </span>
            </td>
            <td class="reward-cell">{{ rewardLabel(flow) }}</td>
            <td>{{ flow.consecutiveDays }}</td>
            <td class="time-cell">{{ flow.checkInDate }}</td>
            <td class="time-cell">{{ formatDateTime(flow.createdAt) }}</td>
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
@import "../../styles/admin-common.css";

.coins-page {
  max-width: 1400px;
}

.date-input {
  width: 140px;
}

.range-sep {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-quaternary);
}

.reward-cell {
  font-weight: 600;
  color: var(--admin-color-primary);
  white-space: nowrap;
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

.source-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.source-normal {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.source-makeup {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}
</style>
