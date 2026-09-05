<script setup lang="ts">
/**
 * Admin 数据看板（design Frame 02「数据概览」还原实现）。
 *
 * 结构（自上而下）：
 *   - 实时总览：4 张 KPI 卡（白卡 + 1px 边框，标签 13px 次级灰 +
 *     数字 28px/600 + 可选同比文案），数据源 getStats() 聚合接口；
 *   - 核心指标趋势（近 30 天）：CSS 柱状图（cobalt 单系列，网格线 #f1f4f7，
 *     坐标轴文字 #8595a4），数据源 matchStats.dailyTrend；
 *   - 近期注册用户：5 行表格（表头 40px / 行高 44px），数据源 listUsers()
 *     按 createdAt 倒序取前 5。
 *
 * 降级：任一子接口失败展示 ErrorState + 重试，失败卡片显示「数据不可用」，
 * 不以真实 0 误导运营。
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  getStats,
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

const { t } = useI18n();

interface KpiCard {
  labelKey: string;
  value: number;
  /** 数字色（待处理审核 = 警告色，其余 ink） */
  tone: "ink" | "warning";
}

const kpiCards = ref<KpiCard[]>([
  { labelKey: "dashboard.statTotalUsers", value: 0, tone: "ink" },
  { labelKey: "dashboard.statNewToday", value: 0, tone: "ink" },
  { labelKey: "dashboard.statActiveToday", value: 0, tone: "ink" },
  { labelKey: "dashboard.statReportsPending", value: 0, tone: "warning" },
]);

const failedStats = ref<boolean[]>([false, false, false, false]);

/** 每日匹配趋势（近 30 日，ECharts 柱状图数据源） */
const trend = ref<{ date: string; count: number }[]>([]);
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
 * 加载看板数据：统计聚合 + 待处理举报计数 + 近期注册用户并行拉取。
 */
async function loadStats() {
  loading.value = true;
  errorMessage.value = "";

  const errors: string[] = [];
  failedStats.value = [false, false, false, false];

  // 待处理举报（KPI 4）：pageSize=1 仅取 total
  const pendingReports = listReports({ status: "PENDING", page: 1, pageSize: 1 })
    .then((page) => {
      kpiCards.value[3]!.value = page.total;
    })
    .catch(() => {
      errors.push(t("dashboard.reportsLoadFailed"));
      failedStats.value[3] = true;
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
    const overview = await getStats();

    if (overview.userStats) {
      const userStats: UserStats = overview.userStats;
      kpiCards.value[0]!.value = userStats.totalUsers;
      kpiCards.value[1]!.value = userStats.newUsersToday;
    } else {
      errors.push(t("dashboard.userStatsLoadFailed"));
      failedStats.value[0] = true;
      failedStats.value[1] = true;
    }

    if (overview.activeStats) {
      const activeStats: ActiveStats = overview.activeStats;
      kpiCards.value[2]!.value = activeStats.dau || 0;
    } else {
      errors.push(t("dashboard.activeStatsLoadFailed"));
      failedStats.value[2] = true;
    }

    if (overview.matchStats) {
      const matchStats: MatchStats = overview.matchStats;
      trend.value = (matchStats.dailyTrend || []).slice(-TREND_DAYS);
    } else {
      errors.push(t("dashboard.matchStatsLoadFailed"));
    }
  } catch (err) {
    logger.error("[Dashboard] load stats failed", err);
    errorMessage.value = t("dashboard.loadFailed");
    failedStats.value = [true, true, true, true];
  }

  await Promise.allSettled([pendingReports, recent]);

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

    <!-- 实时总览：4 KPI 卡 -->
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
