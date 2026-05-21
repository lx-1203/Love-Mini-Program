<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import BottomActionBar from "../../src/components/common/BottomActionBar.vue";
import { homePageRequirements } from "../../src/config/page-access";
import { usePageAccess } from "../../src/composables/usePageAccess";
import { useHomeStore } from "../../src/stores/home";
import { openAppPath } from "../../src/utils/navigation";

const homeStore = useHomeStore();

usePageAccess(homePageRequirements);

const activities = computed(() => homeStore.pageView?.activityPreview.items ?? []);

onShow(() => {
  void homeStore.loadDashboard();
});

function openPath(url: string) {
  openAppPath(url);
}
</script>

<template>
  <AppShell
    title="活动"
    subtitle="从时间清晰、地点明确的小活动开始，把线下见面的压力降下来。"
    :show-tab-bar="false"
  >
    <SectionCard title="近期活动" subtitle="先从时间清晰、地点明确的小活动开始。">
      <view v-if="homeStore.loading" class="empty-state">正在加载活动内容...</view>
      <view v-else-if="!activities.length" class="empty-state">暂时还没有新的活动推荐。</view>
      <view v-else class="section-stack">
        <view v-for="item in activities" :key="item.id" class="activity-row">
          <text class="row-title">{{ item.title }}</text>
          <text class="row-subtitle">{{ item.subtitle }}</text>
          <text class="row-meta">{{ item.meta }}</text>
        </view>
      </view>
    </SectionCard>

    <SectionCard title="下一步" subtitle="看到合适活动后，可以继续去匹配，也可以提交新的活动提案。">
      <BottomActionBar
        primary-label="去匹配"
        secondary-label="提交活动提案"
        @primary="openPath('/pages/match/index')"
        @secondary="openPath('/subpackages/support/feedback/index')"
      />
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.section-stack {
  display: grid;
  gap: 16rpx;
}

.activity-row {
  display: grid;
  gap: 8rpx;
  padding: 22rpx 0;
  border-top: 1px solid var(--td-border-level-1-color);
}

.activity-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.row-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.row-subtitle,
.row-meta,
.empty-state {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--td-text-color-secondary);
}
</style>
