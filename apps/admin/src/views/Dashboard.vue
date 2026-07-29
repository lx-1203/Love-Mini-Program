<script setup lang="ts">
/**
 * Admin 数据看板视图（SubTask 3.3.2 i18n 化 / Task 13 真实数据 + 错误降级）。
 *
 * 改造点：
 * - 标题/副标题/统计卡片 label/加载中文案全部走 i18n key
 * - 三个统计接口的失败提示通过 dashboard.userStatsLoadFailed 等回退
 * - "最近活动"列表文案改走 dashboard.recentActivities 与 common.noData
 *
 * Task 13 改造点：
 * - 通过 getStats() 聚合接口一次性拉取三类统计，统一错误降级
 * - 引入 ErrorState 组件：当 errors.length > 0 时展示错误条 + 重试按钮，
 *   重试回调重新触发 loadStats()，避免运营人员面对白屏
 * - 移除所有 Mock 引用（本视图本无 Mock，仅做错误降级增强）
 */
import { ref, onMounted } from "vue";
import {
  getStats,
  type UserStats,
  type ActiveStats,
  type MatchStats,
} from "@/api/stats";
import { useI18n } from "vue-i18n";
// Task 13：接入共享 ErrorState 组件，统一错误降级 UI
import ErrorState from "@/components/ErrorState.vue";
// Task 45：统一日志入口
import { logger } from "@/utils/logger";

const { t } = useI18n();

interface StatCard {
  labelKey: string;
  value: number | string;
  icon: string;
  color: string;
}

interface ActivityItem {
  id: number | string;
  type: string;
  message: string;
  time: string;
}

const stats = ref<StatCard[]>([
  { labelKey: "dashboard.statTotalUsers", value: 0, icon: "/icons/user.svg", color: "var(--admin-color-stat-primary)" },
  { labelKey: "dashboard.statActiveToday", value: 0, icon: "/icons/bolt.svg", color: "var(--admin-color-stat-pink)" },
  { labelKey: "dashboard.statTotalMatches", value: 0, icon: "/icons/heart-filled.svg", color: "var(--admin-color-stat-blue)" },
  { labelKey: "dashboard.statInteractionsToday", value: 0, icon: "/icons/list.svg", color: "var(--admin-color-stat-green)" },
]);

const recentActivities = ref<ActivityItem[]>([]);

const loading = ref(false);
/** 错误信息（聚合所有子接口错误，空串表示无错误）。空串时不渲染 ErrorState。 */
const errorMessage = ref("");

/**
 * 加载仪表盘统计数据（Task 13：改用 getStats() 聚合接口）。
 *
 * 三个子接口并行调用，任一失败记录错误但不阻塞其他。
 * 全部失败或部分失败时，errorMessage 非空，触发 ErrorState 降级展示与重试入口。
 *
 * Task 46：包裹 try/catch + finally，确保网络异常时 loading 状态被正确重置，
 * 避免页面卡在"加载中"骨架；异常通过 logger 记录便于线上问题定位。
 */
async function loadStats() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const overview = await getStats();
    const errors: string[] = [];

    // 用户统计
    if (overview.userStats) {
      const userStats: UserStats = overview.userStats;
      stats.value[0] = { labelKey: "dashboard.statTotalUsers", value: userStats.totalUsers, icon: "/icons/user.svg", color: "var(--admin-color-stat-primary)" };
      stats.value[1] = { labelKey: "dashboard.statActiveToday", value: userStats.activeUsersToday, icon: "/icons/bolt.svg", color: "var(--admin-color-stat-pink)" };
    } else {
      errors.push(t("dashboard.userStatsLoadFailed"));
    }

    // 活跃度统计
    if (overview.activeStats) {
      const activeStats: ActiveStats = overview.activeStats;
      stats.value[3] = { labelKey: "dashboard.statInteractionsToday", value: activeStats.interactionsToday, icon: "/icons/list.svg", color: "var(--admin-color-stat-green)" };
    } else {
      errors.push(t("dashboard.activeStatsLoadFailed"));
    }

    // 匹配统计
    if (overview.matchStats) {
      const matchStats: MatchStats = overview.matchStats;
      stats.value[2] = { labelKey: "dashboard.statTotalMatches", value: matchStats.totalMatches, icon: "/icons/heart-filled.svg", color: "var(--admin-color-stat-blue)" };

      // 用每日匹配趋势填充"最近活动"列表（最多 5 条）
      recentActivities.value = (matchStats.dailyTrend || [])
        .slice(-5)
        .reverse()
        .map((item, idx) => ({
          id: `${item.date}-${idx}`,
          type: "match",
          message: t("dashboard.matchCountFormat", { n: item.count }),
          time: item.date,
        }));
    } else {
      errors.push(t("dashboard.matchStatsLoadFailed"));
    }

    if (errors.length > 0) {
      errorMessage.value = errors.join("；");
    }
  } catch (err) {
    // Task 45：异常通过 logger 记录，便于线上问题定位
    logger.error("[Dashboard] load stats failed", err);
    errorMessage.value = t("dashboard.loadFailed");
  } finally {
    // Task 46：finally 确保无论成功/失败都重置 loading 状态
    loading.value = false;
  }
}

onMounted(() => {
  loadStats().catch((err) => {
    logger.error("[Dashboard] load stats failed", err);
    loading.value = false;
    errorMessage.value = t("dashboard.loadFailed");
  });
});
</script>

<template>
  <view class="dashboard">
    <view class="page-header">
      <text class="page-title">{{ t("dashboard.title") }}</text>
      <text class="page-subtitle">{{ t("dashboard.subtitle") }}</text>
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
        v-for="stat in stats"
        :key="stat.labelKey"
        class="stat-card"
        :style="{ '--stat-color': stat.color }"
        role="region"
        :aria-label="t(stat.labelKey)"
        tabindex="0"
      >
        <view class="stat-icon" :style="{ background: stat.color }">
          <image class="stat-icon-img" :src="stat.icon" mode="aspectFit" alt="" aria-hidden="true" />
        </view>
        <view class="stat-content">
          <text class="stat-value">{{ stat.value }}</text>
          <text class="stat-label">{{ t(stat.labelKey) }}</text>
        </view>
      </view>
    </view>

    <view class="content-section">
      <view class="section-header">
        <text class="section-title">{{ t("dashboard.recentActivities") }}</text>
      </view>

      <view
        class="activity-list"
        role="img"
        :aria-label="t('dashboard.recentActivities')"
        tabindex="0"
      >
        <view
          v-for="activity in recentActivities"
          :key="activity.id"
          class="activity-item"
        >
          <view class="activity-dot" />
          <view class="activity-content">
            <text class="activity-message">{{ activity.message }}</text>
            <text class="activity-time">{{ activity.time }}</text>
          </view>
        </view>
        <view v-if="recentActivities.length === 0" class="empty-tip">
          <text>{{ t("common.noData") }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* Task 3.7.1：接入共享样式表，复用 page-header / page-title / page-subtitle / error-banner */
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

/* Task 21：键盘导航聚焦轮廓，避免聚焦后无视觉反馈 */
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
  filter: brightness(0) invert(1);
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

.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-lg);
}

/* Task 21：键盘导航聚焦轮廓 */
.activity-list:focus-visible {
  outline: 2px solid var(--admin-color-primary);
  outline-offset: 2px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: var(--admin-space-md);
  padding: var(--admin-space-md);
  border-radius: var(--admin-radius-lg);
  transition: background 0.2s;
}

.activity-item:hover {
  background: var(--admin-color-bg-subtle);
}

.activity-dot {
  width: var(--admin-space-sm);
  height: var(--admin-space-sm);
  border-radius: 50%;
  background: var(--admin-color-primary);
  margin-top: var(--admin-space-xxs);
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-message {
  display: block;
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-primary);
  margin-bottom: var(--admin-space-xs);
}

.activity-time {
  display: block;
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}

.empty-tip {
  padding: var(--admin-space-xxl);
  text-align: center;
  color: var(--admin-color-text-quaternary);
  font-size: var(--admin-font-md);
}
</style>
