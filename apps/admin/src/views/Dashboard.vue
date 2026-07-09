<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  getUserStats,
  getActiveStats,
  getMatchStats,
  type UserStats,
  type ActiveStats,
  type MatchStats,
} from "@/api/stats";

interface StatCard {
  label: string;
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
  { label: "总用户数", value: 0, icon: "👥", color: "#667eea" },
  { label: "今日活跃", value: 0, icon: "🔥", color: "#f093fb" },
  { label: "匹配总数", value: 0, icon: "💕", color: "#4facfe" },
  { label: "今日互动", value: 0, icon: "💬", color: "#43e97b" },
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
    stats.value[0] = { label: "总用户数", value: userStats.totalUsers, icon: "👥", color: "#667eea" };
    stats.value[1] = { label: "今日活跃", value: userStats.activeUsersToday, icon: "🔥", color: "#f093fb" };
  } else {
    errors.push("用户统计加载失败");
  }

  // 活跃度统计
  if (results[1].status === "fulfilled") {
    const activeStats: ActiveStats = results[1].value;
    stats.value[3] = { label: "今日互动", value: activeStats.interactionsToday, icon: "💬", color: "#43e97b" };
  } else {
    errors.push("活跃度统计加载失败");
  }

  // 匹配统计
  if (results[2].status === "fulfilled") {
    const matchStats: MatchStats = results[2].value;
    stats.value[2] = { label: "匹配总数", value: matchStats.totalMatches, icon: "💕", color: "#4facfe" };

    // 用每日匹配趋势填充"最近活动"列表（最多 5 条）
    recentActivities.value = (matchStats.dailyTrend || [])
      .slice(-5)
      .reverse()
      .map((item, idx) => ({
        id: `${item.date}-${idx}`,
        type: "match",
        message: `匹配 ${item.count} 对`,
        time: item.date,
      }));
  } else {
    errors.push("匹配统计加载失败");
  }

  if (errors.length > 0) {
    errorMessage.value = errors.join("；");
  }

  loading.value = false;
}

onMounted(() => {
  loadDashboard().catch((err) => {
    console.error("[Dashboard] 加载统计数据失败", err);
    loading.value = false;
    errorMessage.value = "加载统计数据失败，请检查网络或登录状态";
  });
});
</script>

<template>
  <view class="dashboard">
    <view class="page-header">
      <text class="page-title">仪表盘</text>
      <text class="page-subtitle">系统概览与统计数据</text>
    </view>

    <view v-if="errorMessage" class="error-banner">
      <text>{{ errorMessage }}</text>
    </view>

    <view v-if="loading" class="loading-banner">
      <text>加载中...</text>
    </view>

    <view class="stats-grid">
      <view
        v-for="stat in stats"
        :key="stat.label"
        class="stat-card"
        :style="{ '--stat-color': stat.color }"
      >
        <view class="stat-icon">{{ stat.icon }}</view>
        <view class="stat-content">
          <text class="stat-value">{{ stat.value }}</text>
          <text class="stat-label">{{ stat.label }}</text>
        </view>
      </view>
    </view>

    <view class="content-section">
      <view class="section-header">
        <text class="section-title">最近活动</text>
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
          <text>暂无活动数据</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.page-subtitle {
  display: block;
  font-size: 14px;
  color: #999;
}

.error-banner {
  background: #fff1f0;
  color: #f5222d;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
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
  font-size: 28px;
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
