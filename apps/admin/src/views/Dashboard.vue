<script setup lang="ts">
/**
 * Admin 数据看板视图（复制自旧后台 apps/admin，适配 admin-v2；使用 @/ 别名导入）。
 *
 * - 四个统计卡片 + 匹配趋势列表
 * - 通过 getStats() 聚合接口一次性拉取三类统计，统一错误降级
 * - 引入 ErrorState 组件：errors.length > 0 时展示错误条 + 重试按钮
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  getStats,
  type UserStats,
  type ActiveStats,
  type MatchStats,
} from "@/api/stats";
import { useI18n } from "vue-i18n";
import ErrorState from "@/components/ErrorState.vue";
import { logger } from "@/utils/logger";
import { getLocale } from "@/i18n";
import { TREND_DAYS } from "@/utils/constants";

const { t } = useI18n();

interface StatCard {
  labelKey: string;
  value: number | string;
  /** 内联 SVG 图标标识（users/bolt/heart/list），不再引用 public/icons 下的静态文件 */
  icon: "users" | "bolt" | "heart" | "list";
  color: string;
}

/** 匹配趋势行（后端无独立「最近活动」接口，本区块展示每日匹配趋势，见 dashboard.matchTrend） */
interface TrendItem {
  id: number | string;
  /** 匹配对数文案（i18n 格式化） */
  message: string;
  /** 日期（yyyy-MM-dd） */
  time: string;
}

const stats = ref<StatCard[]>([
  { labelKey: "dashboard.statTotalUsers", value: 0, icon: "users", color: "var(--admin-color-stat-primary)" },
  { labelKey: "dashboard.statActiveToday", value: 0, icon: "bolt", color: "var(--admin-color-stat-pink)" },
  { labelKey: "dashboard.statTotalMatches", value: 0, icon: "heart", color: "var(--admin-color-stat-blue)" },
  { labelKey: "dashboard.statInteractionsToday", value: 0, icon: "list", color: "var(--admin-color-stat-green)" },
]);

// 子接口失败标记（失败卡片降级显示，区分真实 0 与加载失败，避免误导）
const failedStats = ref<boolean[]>([false, false, false, false]);

const trendItems = ref<TrendItem[]>([]);

const loading = ref(false);
/** 错误信息（聚合所有子接口错误，空串表示无错误）。空串时不渲染 ErrorState。 */
const errorMessage = ref("");
/** 最近一次成功刷新的时间 */
const lastUpdated = ref("");
/** 手动刷新成功提示 */
const refreshTip = ref("");
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 加载仪表盘统计数据（改用 getStats() 聚合接口）。
 * 三个子接口并行调用，任一失败记录错误但不阻塞其他。
 */
async function loadStats() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const overview = await getStats();
    const errors: string[] = [];
    // 每轮加载重置失败标记
    failedStats.value = [false, false, false, false];

    // 用户统计
    if (overview.userStats) {
      const userStats: UserStats = overview.userStats;
      stats.value[0] = { labelKey: "dashboard.statTotalUsers", value: userStats.totalUsers, icon: "users", color: "var(--admin-color-stat-primary)" };
      stats.value[1] = { labelKey: "dashboard.statActiveToday", value: userStats.activeUsersToday, icon: "bolt", color: "var(--admin-color-stat-pink)" };
    } else {
      errors.push(t("dashboard.userStatsLoadFailed"));
      failedStats.value[0] = true;
      failedStats.value[1] = true;
    }

    // 活跃度统计
    if (overview.activeStats) {
      const activeStats: ActiveStats = overview.activeStats;
      stats.value[3] = { labelKey: "dashboard.statInteractionsToday", value: activeStats.interactionsToday, icon: "list", color: "var(--admin-color-stat-green)" };
    } else {
      errors.push(t("dashboard.activeStatsLoadFailed"));
      failedStats.value[3] = true;
    }

    // 匹配统计
    if (overview.matchStats) {
      const matchStats: MatchStats = overview.matchStats;
      stats.value[2] = { labelKey: "dashboard.statTotalMatches", value: matchStats.totalMatches, icon: "heart", color: "var(--admin-color-stat-blue)" };

      // 后端暂无独立的"最近活动"接口：本区块展示每日匹配趋势（matchStats.dailyTrend，
      // 近 30 日），以表格化趋势展示，区块标题使用 dashboard.matchTrend，
      // 避免把"每天匹配 N 对"包装成活动记录造成语义误导（R4-00447）。
      trendItems.value = (matchStats.dailyTrend || [])
        .slice(-TREND_DAYS)
        .reverse()
        .map((item, idx) => ({
          id: `${item.date}-${idx}`,
          message: t("dashboard.matchCountFormat", { n: item.count }),
          time: item.date,
        }));
    } else {
      errors.push(t("dashboard.matchStatsLoadFailed"));
      failedStats.value[2] = true;
    }

    // 全部子接口成功时记录最近刷新时间
    if (errors.length === 0) {
      lastUpdated.value = new Date().toLocaleString(getLocale(), { hour12: false });
    }

    if (errors.length > 0) {
      errorMessage.value = errors.join("；");
    }
  } catch (err) {
    logger.error("[Dashboard] load stats failed", err);
    errorMessage.value = t("dashboard.loadFailed");
    // getStats 整体异常（如网络层 fetch 失败）时同样置位失败标记，
    // 避免 4 张卡片显示真实 0 误导运营
    failedStats.value = [true, true, true, true];
  } finally {
    loading.value = false;
  }
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
    <view class="page-header">
      <text class="page-title">{{ t("dashboard.title") }}</text>
      <text class="page-subtitle">{{ t("dashboard.subtitle") }}</text>
    </view>

    <!-- 手动刷新按钮 + 最近更新时间 -->
    <view class="refresh-bar">
      <button class="refresh-button" :disabled="loading" @click="handleRefresh">
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

    <view v-if="loading" class="loading-banner">
      <text>{{ t("common.loading") }}</text>
    </view>

    <view class="stats-grid">
      <view
        v-for="(stat, index) in stats"
        :key="stat.labelKey"
        class="stat-card"
        :style="{ '--stat-color': stat.color }"
        role="region"
        :aria-label="t(stat.labelKey)"
        tabindex="0"
      >
        <view class="stat-icon" :style="{ background: stat.color }">
          <!-- 内联 SVG 图标（public/icons 目录已删除，不再引用静态图标文件） -->
          <svg
            v-if="stat.icon === 'users'"
            class="stat-icon-img"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z" />
          </svg>
          <svg
            v-else-if="stat.icon === 'bolt'"
            class="stat-icon-img"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6l.5-8H13Z" />
          </svg>
          <svg
            v-else-if="stat.icon === 'heart'"
            class="stat-icon-img"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z" />
          </svg>
          <svg
            v-else
            class="stat-icon-img"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M4 6h2v2H4V6Zm4 0h12v2H8V6ZM4 11h2v2H4v-2Zm4 0h12v2H8v-2ZM4 16h2v2H4v-2Zm4 0h12v2H8v-2Z" />
          </svg>
        </view>
        <view class="stat-content">
          <!-- 失败卡片降级显示（区分真实 0 与加载失败，避免数据误导） -->
          <text class="stat-value">{{ failedStats[index] ? t("dashboard.dataUnavailable") : stat.value }}</text>
          <text class="stat-label">{{ t(stat.labelKey) }}</text>
        </view>
      </view>
    </view>

    <view class="content-section">
      <view class="section-header">
        <text class="section-title">{{ t("dashboard.matchTrend") }}</text>
        <text class="section-subtitle">{{ t("dashboard.matchTrendSubtitle") }}</text>
      </view>

      <!-- 表格化趋势展示（近 30 日每日匹配对数），避免活动流语义误导 -->
      <view class="trend-table-wrap">
        <table class="trend-table">
          <thead>
            <tr>
              <th scope="col">{{ t("dashboard.matchTrendDate") }}</th>
              <th scope="col">{{ t("dashboard.matchTrendCount") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="trendItems.length === 0">
              <td colspan="2" class="empty-cell">{{ t("common.noData") }}</td>
            </tr>
            <tr v-for="item in trendItems" :key="item.id">
              <td class="trend-date">{{ item.time }}</td>
              <td class="trend-count">{{ item.message }}</td>
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
  max-width: 1200px;
}

/* Dashboard 特有：page-header 间距比通用 24px 略大 */
.page-header {
  margin-bottom: var(--admin-space-xxxl);
}

.loading-banner {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
  padding: var(--admin-space-md) var(--admin-space-lg);
  border-radius: var(--admin-radius-lg);
  margin-bottom: var(--admin-space-lg);
  font-size: var(--admin-font-md);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--admin-space-xl);
  margin-bottom: var(--admin-space-xxxl);
}

.stat-card {
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xl);
  padding: var(--admin-space-xxl);
  display: flex;
  align-items: center;
  gap: var(--admin-space-lg);
  box-shadow: var(--admin-shadow-sm);
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--admin-shadow-lg);
}

/* 键盘导航聚焦轮廓，避免聚焦后无视觉反馈 */
.stat-card:focus-visible {
  outline: 2px solid var(--admin-color-primary);
  outline-offset: 2px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--admin-radius-xl);
  background: var(--stat-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-img {
  width: 28px;
  height: 28px;
  /* 内联 SVG 使用 currentColor 填充，置于品牌色底上（与 primary 按钮文字同惯例） */
  color: var(--admin-color-bg-container);
}

.stat-content {
  flex: 1;
}

.stat-value {
  display: block;
  font-size: var(--admin-space-xxxl);
  font-weight: 700;
  color: var(--admin-color-text-primary);
  line-height: 1;
  margin-bottom: var(--admin-space-xs);
}

.stat-label {
  display: block;
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-quaternary);
}

.content-section {
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xl);
  padding: var(--admin-space-xxl);
  box-shadow: var(--admin-shadow-sm);
}

.section-header {
  margin-bottom: var(--admin-space-xl);
}

.section-title {
  font-size: var(--admin-font-xxl);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.section-subtitle {
  display: block;
  margin-top: var(--admin-space-xs);
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}

.trend-table-wrap {
  overflow-x: auto;
}

.trend-table {
  width: 100%;
  border-collapse: collapse;
}

.trend-table th,
.trend-table td {
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
  text-align: left;
  border-bottom: 1px solid var(--admin-color-border-light);
}

.trend-table th {
  font-size: var(--admin-font-sm);
  font-weight: 600;
  color: var(--admin-color-text-tertiary);
  background: var(--admin-color-bg-subtle);
}

.trend-date {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
  white-space: nowrap;
}

.trend-count {
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-primary);
}

.empty-cell {
  padding: var(--admin-space-xxl);
  text-align: center;
  color: var(--admin-color-text-quaternary);
  font-size: var(--admin-font-md);
}

/* 刷新栏样式 */
.refresh-bar {
  display: flex;
  align-items: center;
  gap: var(--admin-space-md);
  margin-bottom: var(--admin-space-lg);
}

.refresh-button {
  padding: var(--admin-space-sm) var(--admin-space-lg);
  background: var(--admin-color-primary);
  color: var(--admin-color-bg-container);
  border: none;
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-md);
  cursor: pointer;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-tip {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-success);
}

.last-updated {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}
</style>
