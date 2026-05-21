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

async function handleRecommendation(personId: string, target: string, mode: "complete-setup" | "go-chat") {
  if (mode === "complete-setup") {
    openPath(target);
    return;
  }

  creatingSessionId.value = personId;

  try {
    const session = await chatStore.startFromRecommendation(personId);
    if (session) {
      openPath(`/pages/chat-session/index?sessionId=${session.id}`);
    }
  } finally {
    creatingSessionId.value = null;
  }
}
</script>

<template>
  <AppShell
    title="首页"
    subtitle="查看今日时间、推荐对象和活动入口。"
    current-tab="home"
  >
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

    <SectionCard
      title="课表与今日安排"
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

    <SectionCard
      title="推荐的人"
      :subtitle="homeStore.pageView?.peopleLead || '把推荐位作为进入聊天的主入口。'"
    >
      <view v-if="homeStore.pageView" class="section-stack">
        <view
          v-for="person in homeStore.pageView.recommendedPeople"
          :key="person.id"
          class="person-row"
        >
          <view class="person-head">
            <view class="avatar">{{ person.initials }}</view>
            <view class="copy-block">
              <text class="row-title">{{ person.name }}</text>
              <text class="row-subtitle">{{ person.headline }}</text>
            </view>
          </view>
          <text class="row-meta">{{ person.commonGround }}</text>
          <text class="row-meta">{{ person.availability }}</text>
          <button
            class="block-action"
            :disabled="creatingSessionId === person.id"
            @click="handleRecommendation(person.id, person.action.target, person.action.mode)"
          >
            {{ creatingSessionId === person.id ? "正在创建会话..." : person.action.label }}
          </button>
        </view>
      </view>
    </SectionCard>

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
.person-row,
.activity-entry {
  display: grid;
  gap: 10rpx;
  padding: 22rpx 0;
  border-top: 1px solid var(--td-border-level-1-color);
}

.setup-row:first-child,
.info-row:first-child,
.person-row:first-child,
.activity-entry:first-child {
  padding-top: 0;
  border-top: 0;
}

.person-head {
  display: grid;
  grid-template-columns: 76rpx minmax(0, 1fr);
  gap: 16rpx;
  align-items: center;
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

.inline-action,
.block-action {
  height: 80rpx;
  border: 0;
  border-radius: 18rpx;
  font-size: 24rpx;
  font-weight: 700;
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
</style>
