<script setup lang="ts">
/**
 * Admin 数据看板（design Frame 02「数据概览」还原实现）。
 *
 * 结构（自上而下）：
 *   - 待办清单：现在就需要处理的事项，每行 = 一项计数 + 跳转处理页，
 *     count 为 0 的行直接隐藏（不显示 0），数据源 getCommunityOverview()；
 *   - 实时总览：8 张 KPI 卡（白卡 + 1px 边框，标签 13px 次级灰 +
 *     数字 28px/600），前 4 张来自 getStats() 聚合接口，
 *     后 4 张来自 getCommunityOverview()（动态总数/近 7 日发帖/普通用户/游客账号）；
 *   - 核心指标趋势（近 30 天）：ECharts 柱状图，数据源 matchStats.dailyTrend；
 *   - 近 7 天发帖趋势 + 按分类分布：复用同一 TrendChart 组件；
 *   - 近期注册用户：5 行表格（表头 40px / 行高 44px），数据源 listUsers()
 *     按 createdAt 倒序取前 5。
 *
 * 降级：任一子接口失败展示 ErrorState + 重试，失败卡片显示「数据不可用」，
 * 不以真实 0 误导运营；待办清单接口失败时仅隐藏该卡并计入错误聚合。
 *
 * 文案 i18n：本页新增 dashboard.todo* / statTotalPosts / statPosts7d /
 * statNormalUsers / statGuestAccounts / chartPosts* / legendPosts /
 * categoryActivity / todoLoadFailed 等 key（locales/*.ts 由文案负责人补充）。
 */
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import {
  getStats,
  getCommunityOverview,
  type CommunityOverview,
  type UserStats,
  type ActiveStats,
  type MatchStats,
} from "@/api/stats";
import { listUsers, type AdminUserSummary } from "@/api/users";
import { listReports } from "@/api/reports";
import { useI18n } from "vue-i18n";
import ErrorState from "@/components/ErrorState.vue";
import TrendChart from "@/components/TrendChart.vue";
import { logger } from "@/utils/logger";
import { getLocale } from "@/i18n";
import { TREND_DAYS } from "@/utils/constants";

const { t, te } = useI18n();
const router = useRouter();

interface KpiCard {
  labelKey: string;
  value: number;
  /** 数字色（待处理审核 = 警告色，其余 ink） */
  tone: "ink" | "warning";
}

/**
 * 待办清单行。
 *
 * <p>path 为后端菜单种子数据登记的列表页路径（路由由菜单动态注册，
 * 故按 path 跳转而非路由 name，name 缺失会让 vue-router 直接抛错）。</p>
 */
interface TodoRow {
  key: string;
  labelKey: string;
  count: number;
  path: string;
  /** 需要立刻处理 = warning（橙红），查看类 = ink */
  tone: "warning" | "ink";
}

const kpiCards = ref<KpiCard[]>([
  { labelKey: "dashboard.statTotalUsers", value: 0, tone: "ink" },
  { labelKey: "dashboard.statNewToday", value: 0, tone: "ink" },
  { labelKey: "dashboard.statActiveToday", value: 0, tone: "ink" },
  { labelKey: "dashboard.statReportsPending", value: 0, tone: "warning" },
  { labelKey: "dashboard.statTotalPosts", value: 0, tone: "ink" },
  { labelKey: "dashboard.statPosts7d", value: 0, tone: "ink" },
  { labelKey: "dashboard.statNormalUsers", value: 0, tone: "ink" },
  { labelKey: "dashboard.statGuestAccounts", value: 0, tone: "ink" },
]);

const failedStats = ref<boolean[]>([
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
]);

/** 社区运营总览原始数据（null 表示尚未成功加载） */
const overview = ref<CommunityOverview | null>(null);

/** 每日匹配趋势（近 30 日，ECharts 柱状图数据源） */
const trend = ref<{ date: string; count: number }[]>([]);
/** 近 7 天发帖趋势（ECharts 柱状图数据源，后端已按业务时区补 0） */
const postTrend = ref<{ date: string; count: number }[]>([]);
/**
 * 帖子分类分布（复用 TrendChart 的「标签-计数」柱状图数据源）。
 *
 * TrendChart 的 X 轴固定执行 {@code date.slice(5)}（原为 YYYY-MM-DD 取 MM-DD），
 * 因此这里给分类名加恰好 5 个字符的前缀占位，切片后剩下的正是分类名本身；
 * 若 TrendChart 取消该切片逻辑，删掉前缀常量即可。
 */
const categoryTrend = ref<{ date: string; count: number }[]>([]);
/** 近期注册用户（前 5） */
const recentUsers = ref<AdminUserSummary[]>([]);

const loading = ref(false);
/** 错误信息（聚合所有子接口错误，空串表示无错误）。空串时不渲染 ErrorState。 */
const errorMessage = ref("");
/** 最近一次成功刷新的时间 */
const lastUpdated = ref("");
/** 手动刷新成功提示 */
const refreshTip = ref("");
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** TrendChart 分类分布用前缀（恰好 5 字符，抵消组件内 date.slice(5)） */
const CATEGORY_PREFIX = "cat: ";

/**
 * 帖子分类 → 既有 i18n key（villagePosts 段已登记 7 个分类文案）。
 * activity 无既有 key，落到本页新增的 dashboard.categoryActivity。
 */
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  all: "villagePosts.categoryAll",
  interest: "villagePosts.categoryInterest",
  sincere: "villagePosts.categorySincere",
  hometown: "villagePosts.categoryHometown",
  anonymous: "villagePosts.categoryAnonymous",
  campus: "villagePosts.categoryCampus",
  latest: "villagePosts.categoryLatest",
  activity: "dashboard.categoryActivity",
};

/**
 * 分类名本地化：key 已登记才翻译，缺失时退回原始枚举名
 * （避免 locales 尚未补 key 时页面显示 "dashboard.categoryActivity" 这类 raw key）。
 */
function categoryLabel(category: string): string {
  const key = CATEGORY_LABEL_KEYS[category];
  return key && te(key) ? t(key) : category;
}

/**
 * 待办清单：仅保留 count > 0 的行（已处理完的事项直接隐藏，不显示「0」）。
 * 社区总览接口未成功返回时为空数组 → 整卡不渲染。
 */
const todoRows = computed<TodoRow[]>(() => {
  const data = overview.value;
  if (!data) return [];
  const rows: TodoRow[] = [
    {
      key: "pendingPosts",
      labelKey: "dashboard.todoPostsPending",
      count: data.pendingPostCount,
      path: "/forum/village-posts",
      tone: "warning",
    },
    {
      key: "pendingMedia",
      labelKey: "dashboard.todoMediaPending",
      count: data.pendingMediaCount,
      path: "/content/media-assets",
      tone: "warning",
    },
    {
      key: "openReports",
      labelKey: "dashboard.todoReportsOpen",
      count: data.openReportCount,
      path: "/content/reports",
      tone: "warning",
    },
    {
      key: "circleUnassigned",
      labelKey: "dashboard.todoCircleUnassigned",
      count: data.unassignedCirclePostCount,
      path: "/forum/village-posts",
      tone: "ink",
    },
    {
      key: "accountsDisabled",
      labelKey: "dashboard.todoAccountsDisabled",
      count: data.disabledOfficialAccountCount,
      path: "/configs/official-accounts",
      tone: "ink",
    },
    {
      key: "pinnedPosts",
      labelKey: "dashboard.todoPinnedPosts",
      count: data.pinnedPostCount,
      path: "/forum/village-posts",
      tone: "ink",
    },
  ];
  return rows.filter((row) => row.count > 0);
});

/** 跳转待办处理页（各列表页自带筛选入口，这里只做深链） */
function openTodoTarget(path: string): void {
  router.push(path).catch(() => {
    logger.warn(`[Dashboard] 待办跳转失败：${path}`);
  });
}

/** 更新 KPI 卡数值（索引越界时静默忽略，避免 noUncheckedIndexedAccess 断言） */
function setCardValue(index: number, value: number): void {
  const card = kpiCards.value[index];
  if (card) card.value = value;
}

/**
 * 社区总览落到视图：近 7 天发帖趋势 + 分类分布两张图 + 4 张社区 KPI。
 */
function applyCommunityOverview(data: CommunityOverview): void {
  postTrend.value = [...(data.postsLast7Days || [])].map((item) => ({
    date: item.date,
    count: item.count,
  }));
  categoryTrend.value = Object.entries(data.postsByCategory || {})
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      date: CATEGORY_PREFIX + categoryLabel(category),
      count,
    }));
  const posts7d = (data.postsLast7Days || []).reduce((acc, item) => acc + item.count, 0);
  const roleCounts = data.userCountsByRole || {};
  setCardValue(4, data.totalPostCount);
  setCardValue(5, posts7d);
  setCardValue(6, roleCounts.USER ?? 0);
  setCardValue(7, roleCounts.GUEST ?? 0);
}

/** 用户状态徽章类（status → 浅底同色字 pill） */
function userStatusClass(status: AdminUserSummary["status"]): string {
  return status === "active" ? "status-badge status-active" : "status-badge status-disabled";
}

function userStatusLabel(status: AdminUserSummary["status"]): string {
  return status === "active" ? t("users.statusActive") : t("users.statusDisabled");
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 加载看板数据：统计聚合 + 社区运营总览（待办清单）+ 待处理举报计数 +
 * 近期注册用户，四路并行拉取（Promise 并行，互不阻塞）。
 */
async function loadStats() {
  loading.value = true;
  errorMessage.value = "";

  const errors: string[] = [];
  failedStats.value = [false, false, false, false, false, false, false, false];

  // 待处理举报（KPI 4）：pageSize=1 仅取 total
  const pendingReports = listReports({ status: "PENDING", page: 1, pageSize: 1 })
    .then((page) => {
      kpiCards.value[3]!.value = page.total;
    })
    .catch(() => {
      errors.push(t("dashboard.reportsLoadFailed"));
      failedStats.value[3] = true;
    });

  // 社区运营总览（待办清单 + 帖子/角色 KPI + 两张新图）：单次聚合请求
  const community = getCommunityOverview()
    .then((data) => {
      overview.value = data;
      applyCommunityOverview(data);
    })
    .catch(() => {
      errors.push(t("dashboard.overviewLoadFailed"));
      overview.value = null;
      postTrend.value = [];
      categoryTrend.value = [];
      for (let i = 4; i <= 7; i += 1) failedStats.value[i] = true;
    });

  // 近期注册用户：取第 1 页按 createdAt 倒序前 5
  const recent = listUsers({ page: 1, pageSize: 20 })
    .then((page) => {
      recentUsers.value = [...page.items]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 5);
    })
    .catch(() => {
      logger.warn("[Dashboard] recent users load failed");
    });

  try {
    const statsOverview = await getStats();

    if (statsOverview.userStats) {
      const userStats: UserStats = statsOverview.userStats;
      kpiCards.value[0]!.value = userStats.totalUsers;
      kpiCards.value[1]!.value = userStats.newUsersToday;
    } else {
      errors.push(t("dashboard.userStatsLoadFailed"));
      failedStats.value[0] = true;
      failedStats.value[1] = true;
    }

    if (statsOverview.activeStats) {
      const activeStats: ActiveStats = statsOverview.activeStats;
      kpiCards.value[2]!.value = activeStats.dau || 0;
    } else {
      errors.push(t("dashboard.activeStatsLoadFailed"));
      failedStats.value[2] = true;
    }

    if (statsOverview.matchStats) {
      const matchStats: MatchStats = statsOverview.matchStats;
      trend.value = (matchStats.dailyTrend || []).slice(-TREND_DAYS);
    } else {
      errors.push(t("dashboard.matchStatsLoadFailed"));
    }
  } catch (err) {
    logger.error("[Dashboard] load stats failed", err);
    errorMessage.value = t("dashboard.loadFailed");
    failedStats.value = [true, true, true, true, true, true, true, true];
  }

  await Promise.allSettled([pendingReports, community, recent]);

  if (errors.length > 0) {
    errorMessage.value = errors.join("；");
  } else {
    lastUpdated.value = new Date().toLocaleString(getLocale(), { hour12: false });
  }
  loading.value = false;
}

/**
 * 手动刷新回调。
 */
async function handleRefresh() {
  await loadStats();
  if (!errorMessage.value) {
    refreshTip.value = t("dashboard.refreshSuccess");
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTip.value = "";
      refreshTimer = null;
    }, 3000);
  }
}

onMounted(() => {
  void loadStats();
});

// 组件卸载时清理刷新提示定时器
onBeforeUnmount(() => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
});
</script>

<template>
  <view class="dashboard">
    <!-- 手动刷新 + 最近更新时间 -->
    <view class="refresh-bar">
      <button class="secondary-button refresh-button" :disabled="loading" @click="handleRefresh">
        {{ loading ? t("common.loading") : t("dashboard.refreshButton") }}
      </button>
      <text v-if="refreshTip" class="refresh-tip" role="status" aria-live="polite">{{ refreshTip }}</text>
      <text v-if="lastUpdated" class="last-updated">{{ t("dashboard.lastUpdated", { time: lastUpdated }) }}</text>
    </view>

    <ErrorState
      v-if="errorMessage"
      :message="errorMessage"
      @retry="loadStats"
    />

    <!-- 待办清单：现在就需要处理的事项。count 为 0 的行不渲染（全为 0 时整卡隐藏） -->
    <view v-if="todoRows.length > 0" class="todo-card">
      <view class="todo-head">
        <text class="card-title">{{ t("dashboard.todoTitle") }}</text>
        <text class="todo-hint">{{ t("dashboard.todoHint") }}</text>
      </view>
      <view class="todo-list">
        <button
          v-for="row in todoRows"
          :key="row.key"
          class="todo-row"
          :class="{ 'todo-row--warning': row.tone === 'warning' }"
          type="button"
          :aria-label="t(row.labelKey)"
          @click="openTodoTarget(row.path)"
        >
          <span class="todo-dot" aria-hidden="true" />
          <text class="todo-label">{{ t(row.labelKey) }}</text>
          <text class="todo-count">{{ row.count.toLocaleString() }}</text>
          <text class="todo-action">{{ t("dashboard.todoAction") }}</text>
        </button>
      </view>
    </view>

    <!-- 实时总览：8 KPI 卡（4 张用户/活跃/举报 + 4 张社区总览） -->
    <text class="section-heading">{{ t("dashboard.sectionOverview") }}</text>
    <view class="stats-grid">
      <view
        v-for="(stat, index) in kpiCards"
        :key="stat.labelKey"
        class="stat-card"
        role="region"
        :aria-label="t(stat.labelKey)"
        tabindex="0"
      >
        <text class="stat-label">{{ t(stat.labelKey) }}</text>
        <text
          class="stat-value"
          :class="{ 'stat-value--warning': stat.tone === 'warning' }"
        >{{ failedStats[index] ? t("dashboard.dataUnavailable") : stat.value.toLocaleString() }}</text>
      </view>
    </view>

    <!-- 核心指标趋势（近 30 天）：ECharts 柱状图（W2 图表库决策） -->
    <view class="chart-card">
      <view class="chart-header">
        <text class="chart-title">{{ t("dashboard.chartTitle") }}</text>
        <view class="chart-legend">
          <span class="chart-legend-dot" />
          <text class="chart-legend-text">{{ t("dashboard.legendMatches") }}</text>
        </view>
      </view>
      <view v-if="trend.length === 0" class="chart-empty">{{ t("common.noData") }}</view>
      <TrendChart
        v-else
        :data="trend"
        :aria-label="t('dashboard.chartTitle')"
      />
    </view>

    <!-- 近 7 天发帖趋势（复用 TrendChart，数据源 community-overview.postsLast7Days） -->
    <view class="chart-card">
      <view class="chart-header">
        <text class="chart-title">{{ t("dashboard.chartPostsTrend") }}</text>
        <view class="chart-legend">
          <span class="chart-legend-dot" />
          <text class="chart-legend-text">{{ t("dashboard.legendPosts") }}</text>
        </view>
      </view>
      <view v-if="postTrend.length === 0" class="chart-empty">{{ t("common.noData") }}</view>
      <TrendChart
        v-else
        :data="postTrend"
        :aria-label="t('dashboard.chartPostsTrend')"
      />
    </view>

    <!-- 帖子按分类分布（同一 TrendChart，x 轴为分类名，见 CATEGORY_PREFIX 说明） -->
    <view class="chart-card">
      <view class="chart-header">
        <text class="chart-title">{{ t("dashboard.chartPostsByCategory") }}</text>
        <view class="chart-legend">
          <span class="chart-legend-dot" />
          <text class="chart-legend-text">{{ t("dashboard.legendCategory") }}</text>
        </view>
      </view>
      <view v-if="categoryTrend.length === 0" class="chart-empty">{{ t("common.noData") }}</view>
      <TrendChart
        v-else
        :data="categoryTrend"
        :aria-label="t('dashboard.chartPostsByCategory')"
      />
    </view>

    <!-- 近期注册用户 -->
    <view class="table-card">
      <text class="card-title">{{ t("dashboard.recentUsers") }}</text>
      <view class="table-container table-flush">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">{{ t("dashboard.colUserId") }}</th>
              <th scope="col">{{ t("dashboard.colNickname") }}</th>
              <th scope="col">{{ t("dashboard.colStatus") }}</th>
              <th scope="col">{{ t("dashboard.colCreatedAt") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="recentUsers.length === 0">
              <td colspan="4" class="empty-cell">{{ t("common.noData") }}</td>
            </tr>
            <tr v-for="user in recentUsers" :key="user.id">
              <td class="text-mono">{{ user.id }}</td>
              <td>{{ user.nickname }}</td>
              <td>
                <span :class="userStatusClass(user.status)">{{ userStatusLabel(user.status) }}</span>
              </td>
              <td class="cell-secondary">{{ formatDateTime(user.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "../styles/admin-common.css";

.dashboard {
  max-width: var(--admin-page-max-width);
}

.refresh-bar {
  display: flex;
  align-items: center;
  gap: var(--admin-space-md);
  margin-bottom: var(--admin-space-lg);
}

.refresh-button {
  height: var(--admin-control-height-sm);
  padding: 0 var(--admin-space-md);
  font-size: var(--admin-font-md);
}

.refresh-tip {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-success);
}

.last-updated {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-tertiary);
}

/* 区块标题（20px/600，Frame 02「实时总览」） */
.section-heading {
  display: block;
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
  color: var(--admin-color-text-primary);
  margin-bottom: var(--admin-space-lg);
}

/* ===== KPI 卡（白卡 + 1px 边框 + 圆角 8，label 上 / 数字 28/600 下） ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--admin-space-xxl);
  margin-bottom: var(--admin-space-xxl);
}

.stat-card {
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-lg) var(--admin-space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-sm);
  box-shadow: none;
}

.stat-card:focus-visible {
  outline: 2px solid var(--admin-color-primary);
  outline-offset: var(--admin-focus-ring-offset);
}

.stat-label {
  font-size: var(--admin-font-md);
  line-height: 20px;
  color: var(--admin-color-text-secondary);
}

.stat-value {
  font-size: 28px;
  line-height: 36px;
  font-weight: 600;
  color: var(--admin-color-text-primary);
  font-variant-numeric: tabular-nums;
}

.stat-value--warning {
  color: var(--admin-color-warning-text);
}

/* ===== 趋势图卡（白卡 + 1px 边框，网格 #f1f4f7，柱 #0064e0） ===== */
.chart-card {
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-lg) var(--admin-space-xl) var(--admin-space-md);
  margin-bottom: var(--admin-space-xxl);
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--admin-space-lg);
}

.chart-title {
  font-size: var(--admin-font-lg);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.chart-legend {
  display: inline-flex;
  align-items: center;
  gap: var(--admin-space-xs);
}

.chart-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: var(--admin-color-primary);
}

.chart-legend-text {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-secondary);
}

.chart-empty {
  padding: var(--admin-space-xxl) 0;
  text-align: center;
  color: var(--admin-color-text-tertiary);
  font-size: var(--admin-font-lg);
}

/* ===== 待办清单卡（工作队列：行 = 事项 + 计数 + 「去处理」） ===== */
.todo-card {
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-lg) var(--admin-space-xl);
  margin-bottom: var(--admin-space-xxl);
}

.todo-head {
  display: flex;
  align-items: baseline;
  gap: var(--admin-space-md);
  margin-bottom: var(--admin-space-sm);
}

/* 卡内标题自带下边距，此处交由 .todo-head 统一控制 */
.todo-head .card-title {
  margin-bottom: 0;
}

.todo-hint {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-tertiary);
}

.todo-list {
  display: flex;
  flex-direction: column;
}

.todo-row {
  display: flex;
  align-items: center;
  gap: var(--admin-space-md);
  width: 100%;
  padding: var(--admin-space-md) 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--admin-color-border-light);
  /* button 默认字体/颜色与正文不一致，显式继承以保持 44px 行高节奏 */
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.todo-row:last-child {
  border-bottom: none;
}

.todo-row:focus-visible {
  outline: 2px solid var(--admin-color-primary);
  outline-offset: var(--admin-focus-ring-offset);
}

.todo-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--admin-color-text-tertiary);
}

.todo-row--warning .todo-dot {
  background: var(--admin-color-warning);
}

.todo-label {
  flex: 1;
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-primary);
}

.todo-count {
  font-size: var(--admin-font-lg);
  font-weight: 600;
  color: var(--admin-color-text-primary);
  font-variant-numeric: tabular-nums;
}

.todo-row--warning .todo-count {
  color: var(--admin-color-warning-text);
}

.todo-action {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-primary);
}

/* ===== 近期注册用户表卡 ===== */
.table-card {
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-lg) var(--admin-space-xl) var(--admin-space-md);
}

.card-title {
  display: block;
  font-size: var(--admin-font-lg);
  font-weight: 600;
  color: var(--admin-color-text-primary);
  margin-bottom: var(--admin-space-md);
}

/* 表卡内嵌表格：去掉容器外框（卡片已有边框） */
.table-flush {
  border: none;
  border-radius: 0;
}

.text-mono {
  font-family: var(--admin-font-family-mono);
  font-size: var(--admin-font-md);
}

.cell-secondary {
  color: var(--admin-color-text-secondary);
}
</style>
