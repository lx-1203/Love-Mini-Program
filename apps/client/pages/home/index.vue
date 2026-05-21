<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import StatusState from "../../src/components/common/StatusState.vue";
import { useHomeStore } from "../../src/stores/home";
import { useChatStore } from "../../src/stores/chat";
import { usePageAccess } from "../../src/composables/usePageAccess";
import { homePageRequirements } from "../../src/config/page-access";
import { openAppPath } from "../../src/utils/navigation";

const homeStore = useHomeStore();
const chatStore = useChatStore();
const creatingSessionId = ref<string | null>(null);

usePageAccess(homePageRequirements);

onShow(() => {
  void homeStore.loadDashboard();
});

function openPath(url: string) {
  openAppPath(url);
}

/** 从推荐卡片发起匹配：创建临时聊天会话 */
async function startMatchFromRecommendation(userId: string) {
  creatingSessionId.value = userId;
  try {
    const session = await chatStore.startFromRecommendation(userId);
    if (session) {
      openPath(`/pages/chat-session/index?sessionId=${session.id}`);
    }
  } finally {
    creatingSessionId.value = null;
  }
}

/** 计算评分颜色：高分为绿，中等为橙，低分为灰 */
function scoreClass(score: number): string {
  if (score >= 75) return "score-high";
  if (score >= 60) return "score-mid";
  return "score-low";
}
</script>

<template>
  <AppShell
    title="首页"
    subtitle="查看今日课表、推荐人选和活动入口。"
    current-tab="home"
  >
    <!-- 基础设置引导 -->
    <SectionCard
      v-if="homeStore.pageView?.setupTasks.length"
      title="完成基础设置"
      subtitle="登录后可先看首页，完成这些基础项后再进入聊天。"
    >
      <view v-for="task in homeStore.pageView.setupTasks" :key="task.id" class="setup-row">
        <view class="copy-block">
          <text class="row-title">{{ task.title }}</text>
          <text class="row-subtitle">{{ task.subtitle }}</text>
        </view>
        <button class="inline-action" @click="openPath(task.path)">打开</button>
      </view>
    </SectionCard>

    <!-- 课表与空闲时段 -->
    <SectionCard
      title="课表与空闲时段"
      subtitle="每条推荐都应该落在你真实可用的时间上。"
    >
      <view v-if="homeStore.loading" class="empty-state">正在加载首页内容...</view>
      <view v-else-if="homeStore.errorMessage" class="empty-state">
        {{ homeStore.errorMessage }}
      </view>
      <view v-else-if="homeStore.pageView" class="section-stack">
        <view v-for="card in homeStore.pageView.scheduleCards" :key="card.id" class="info-row">
          <StatusState :tone="card.tone" :label="card.badge" />
          <text class="row-title">{{ card.title }}</text>
          <text class="row-subtitle">{{ card.subtitle }}</text>
          <text class="row-meta">{{ card.meta }}</text>
        </view>
      </view>
    </SectionCard>

    <!-- 今日推荐人选 -->
    <SectionCard
      title="今日推荐人选"
      :subtitle="homeStore.pageView?.recommendationCards.length
        ? `已为你找到 ${homeStore.pageView.recommendationCards.length} 位匹配度较高的同学`
        : '基于你的课表和兴趣偏好智能推荐'"
    >
      <!-- 加载态 -->
      <view v-if="homeStore.loading" class="empty-state">正在加载推荐...</view>
      <!-- 错误态 -->
      <view v-else-if="homeStore.errorMessage" class="empty-state">
        {{ homeStore.errorMessage }}
      </view>
      <!-- 空态 -->
      <view
        v-else-if="!homeStore.pageView || homeStore.pageView.recommendationCards.length === 0"
        class="empty-state empty-action"
      >
        <text class="empty-text">暂无推荐人选，完善课表后获取更准确的匹配</text>
        <button class="inline-action" @click="openPath('/subpackages/setup/schedule/index')">
          去完善课表
        </button>
      </view>
      <!-- 推荐列表 -->
      <view v-else class="recommendation-list">
        <view
          v-for="rec in homeStore.pageView.recommendationCards"
          :key="rec.userId"
          class="rec-card"
        >
          <view class="rec-header">
            <view class="avatar avatar--rec">{{ rec.avatarInitials }}</view>
            <view class="rec-info">
              <text class="row-title">{{ rec.displayName }}</text>
              <text class="row-subtitle">{{ rec.headline }}</text>
            </view>
            <view class="score-badge" :class="scoreClass(rec.score)">
              <text class="score-label">匹配度</text>
              <text class="score-value">{{ rec.score }}%</text>
            </view>
          </view>
          <!-- 话题标签 -->
          <view class="topic-tags">
            <view v-for="topic in rec.matchedTopics" :key="topic" class="topic-tag">
              {{ topic }}
            </view>
          </view>
          <button
            class="block-action"
            :disabled="creatingSessionId === rec.userId"
            @click="startMatchFromRecommendation(rec.userId)"
          >
            {{ creatingSessionId === rec.userId ? "正在创建会话..." : "发起匹配" }}
          </button>
        </view>
      </view>
    </SectionCard>

    <!-- 活动入口 -->
    <SectionCard
      title="活动入口"
      subtitle="先看时间清楚、地点明确的小活动，再决定下一步。"
    >
      <view v-if="homeStore.pageView" class="section-stack">
        <view class="activity-entry">
          <text class="row-title">{{ homeStore.pageView.activityPreview.title }}</text>
          <text class="row-subtitle">{{ homeStore.pageView.activityPreview.subtitle }}</text>
          <button
            class="block-action block-action--secondary"
            @click="openPath('/pages/activities/index')"
          >
            {{ homeStore.pageView.activityPreview.actionLabel }}
          </button>
        </view>

        <view
          v-for="activity in homeStore.pageView.activityPreview.items"
          :key="activity.id"
          class="info-row"
        >
          <text class="row-title">{{ activity.title }}</text>
          <text class="row-subtitle">{{ activity.subtitle }}</text>
          <text class="row-meta">{{ activity.meta }}</text>
        </view>

        <view
          v-if="homeStore.pageView.activityPreview.pulseTitle"
          class="info-row info-row--quiet"
        >
          <text class="row-title">讨论热度</text>
          <text class="row-subtitle">{{ homeStore.pageView.activityPreview.pulseTitle }}</text>
          <text class="row-meta">{{ homeStore.pageView.activityPreview.pulseMeta }}</text>
        </view>
      </view>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.section-stack {
  display: grid;
  gap: 16rpx;
}

.setup-row,
.info-row,
.activity-entry {
  display: grid;
  gap: 10rpx;
  padding: 22rpx 0;
  border-top: 1px solid var(--td-border-level-1-color);
}

.setup-row:first-child,
.info-row:first-child,
.activity-entry:first-child {
  padding-top: 0;
  border-top: 0;
}

.copy-block {
  display: grid;
  gap: 8rpx;
}

.avatar {
  display: grid;
  place-items: center;
  width: 76rpx;
  height: 76rpx;
  border-radius: 999px;
  background: var(--td-brand-color-1);
  color: var(--td-brand-color-7);
  font-size: 24rpx;
  font-weight: 700;
}

.avatar--rec {
  width: 88rpx;
  height: 88rpx;
  font-size: 28rpx;
  flex-shrink: 0;
}

.row-title {
  font-size: 28rpx;
  font-weight: 600;
}

.row-subtitle,
.row-meta,
.empty-state {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
}

.empty-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  text-align: center;
}

.inline-action,
.block-action--secondary {
  background: #fff;
  color: var(--td-text-color-primary);
  border: 1px solid var(--td-border-level-1-color);
}

.block-action {
  border: 0;
  border-radius: 18rpx;
  font-size: 24rpx;
  font-weight: 700;
  padding: 16rpx 28rpx;
}

.inline-action,
.block-action--secondary {
  background: #fff;
  color: var(--td-text-color-primary);
  border: 1px solid var(--td-border-level-1-color);
}

.block-action {
  background: var(--td-brand-color-7);
  color: #fff;
}

.block-action--secondary {
  color: var(--td-brand-color-7);
}

.info-row--quiet {
  background: rgba(255, 255, 255, 0.56);
}

/* 推荐卡片 */
.recommendation-list {
  display: grid;
  gap: 20rpx;
}

.rec-card {
  padding: 22rpx 0;
  border-top: 1px solid var(--td-border-level-1-color);
  display: grid;
  gap: 14rpx;
}

.rec-card:first-child {
  padding-top: 0;
  border-top: 0;
}

.rec-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.rec-info {
  flex: 1;
  display: grid;
  gap: 6rpx;
  min-width: 0;
}

/* 匹配度徽章 */
.score-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10rpx 16rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
}

.score-label {
  font-size: 18rpx;
  color: inherit;
}

.score-value {
  font-size: 26rpx;
  font-weight: 800;
  color: inherit;
}

.score-high {
  background: #e6f9ee;
  color: #07a85f;
}

.score-mid {
  background: #fff7e6;
  color: #d48806;
}

.score-low {
  background: #f5f5f5;
  color: #8c8c8c;
}

/* 话题标签 */
.topic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.topic-tag {
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  background: var(--td-brand-color-1);
  color: var(--td-brand-color-7);
  font-size: 22rpx;
}
</style>