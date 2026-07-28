<script setup lang="ts">
/**
 * Admin 数据看板视图（SubTask 3.3.2 i18n 化）。
 *
 * 改造点：
 * - 标题/副标题/统计卡片 label/加载中文案全部走 i18n key
 * - 三个统计接口的失败提示通过 dashboard.userStatsLoadFailed 等回退
 * - "最近活动"列表文案改走 dashboard.recentActivities 与 common.noData
 */
import { ref, onMounted } from "vue";
import {
  getUserStats,
  getActiveStats,
  getMatchStats,
  type UserStats,
  type ActiveStats,
  type MatchStats,
} from "@/api/stats";
import { useI18n } from "vue-i18n";

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
  { labelKey: "dashboard.statTotalUsers", value: 0, icon: "/icons/user.svg", color: "#667eea" },
  { labelKey: "dashboard.statActiveToday", value: 0, icon: "/icons/bolt.svg", color: "#f093fb" },
  { labelKey: "dashboard.statTotalMatches", value: 0, icon: "/icons/heart-filled.svg", color: "#4facfe" },
  { labelKey: "dashboard.statInteractionsToday", value: 0, icon: "/icons/list.svg", color: "#43e97b" },
]);

const recentActivities = ref<ActivityItem[]>([]);

const loading = ref(false);
const errorMessage = ref("");

/**
 * 加载仪表盘统计数据。
 * 并行调用三个统计接口，任一接口失败时记录错误但不阻塞其他接口。
 */
async function loadDashboard() {
  loading.value = true;
  errorMessage.value = "";

  // 并行发起三个请求，使用 allSettled 保证单个失败不影响其他
  const results = await Promise.allSettled([
    getUserStats(),
    getActiveStats(),
    getMatchStats(),
  ]);

  const errors: string[] = [];

  // 用户统计
  if (results[0].status === "fulfilled") {
    const userStats: UserStats = results[0].value;
    stats.value[0] = { labelKey: "dashboard.statTotalUsers", value: userStats.totalUsers, icon: "/icons/user.svg", color: "#667eea" };
    stats.value[1] = { labelKey: "dashboard.statActiveToday", value: userStats.activeUsersToday, icon: "/icons/bolt.svg", color: "#f093fb" };
  } else {
    errors.push(t("dashboard.userStatsLoadFailed"));
  }

  // 活跃度统计
  if (results[1].status === "fulfilled") {
    const activeStats: ActiveStats = results[1].value;
    stats.value[3] = { labelKey: "dashboard.statInteractionsToday", value: activeStats.interactionsToday, icon: "/icons/list.svg", color: "#43e97b" };
  } else {
    errors.push(t("dashboard.activeStatsLoadFailed"));
  }

  // 匹配统计
  if (results[2].status === "fulfilled") {
    const matchStats: MatchStats = results[2].value;
    stats.value[2] = { labelKey: "dashboard.statTotalMatches", value: matchStats.totalMatches, icon: "/icons/heart-filled.svg", color: "#4facfe" };

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

  loading.value = false;
}

onMounted(() => {
  loadDashboard().catch((err) => {
    console.error("[Dashboard] load stats failed", err);
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

    <view v-if="errorMessage" class="error-banner">
      <text>{{ errorMessage }}</text>
    </view>

    <view v-if="loading" class="loading-banner">
      <text>{{ t("common.loading") }}</text>
    </view>

    <view class="stats-grid">
      <view
        v-for="stat in stats"
        :key="stat.labelKey"
        class="stat-card"
        :style="{ '--stat-color': stat.color }"
      >
        <view class="stat-icon" :style="{ background: stat.color }">
          <image class="stat-icon-img" :src="stat.icon" mode="aspectFit" />
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

      <view class="activity-list">
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
  margin-bottom: 32px;
}

.loading-banner {
  background: #e6f7ff;
  color: #1890ff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
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
  font-size: 32px;
  font-weight: 700;
  color: #333;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  display: block;
  font-size: 14px;
  color: #999;
}

.content-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-header {
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.activity-item:hover {
  background: #f9f9f9;
}

.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  margin-top: 6px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-message {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.activity-time {
  display: block;
  font-size: 12px;
  color: #999;
}

.empty-tip {
  padding: 24px;
  text-align: center;
  color: #999;
  font-size: 13px;
}
</style>
