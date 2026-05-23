<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import BottomActionBar from "../../src/components/common/BottomActionBar.vue";
import StatusState from "../../src/components/common/StatusState.vue";
import { homePageRequirements } from "../../src/config/page-access";
import { usePageAccess } from "../../src/composables/usePageAccess";
import { clientApi } from "../../src/services/api";
import { openAppPath } from "../../src/utils/navigation";

const discussions = ref<Awaited<ReturnType<typeof clientApi.getDiscussionRecommendations>>>([]);
const loading = ref(false);

usePageAccess(homePageRequirements);

onShow(() => {
  void loadDiscussions();
});

async function loadDiscussions() {
  loading.value = true;
  try {
    discussions.value = await clientApi.getDiscussionRecommendations();
  } finally {
    loading.value = false;
  }
}

function openPath(url: string) {
  openAppPath(url);
}
</script>

<template>
  <AppShell
    title="讨论圈"
    subtitle="先看大家最近真的在聊什么，再决定从哪里开始建立联系。"
    current-tab="likes"
  >
    <SectionCard title="正在讨论" subtitle="先看大家最近真正在聊什么。">
      <view v-if="loading" class="empty-state">正在加载讨论内容...</view>
      <view v-else-if="!discussions.length" class="empty-state">暂时还没有新的讨论推荐。</view>
      <view v-else class="section-stack">
        <view v-for="item in discussions" :key="item.id" class="feed-row">
          <StatusState tone="warning" :label="item.heatLabel" />
          <text class="row-title">{{ item.title }}</text>
          <text class="row-subtitle">{{ item.summary }}</text>
        </view>
      </view>
    </SectionCard>

    <SectionCard title="下一步" subtitle="看到合适的话题后，可以直接去匹配或反馈新的讨论建议。">
      <BottomActionBar
        primary-label="去寻觅"
        secondary-label="反馈讨论建议"
        @primary="openPath('/pages/discover/index')"
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

.feed-row {
  display: grid;
  gap: 10rpx;
  padding: 22rpx 0;
  border-top: 1px solid var(--td-border-level-1-color);
}

.feed-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.row-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.row-subtitle,
.empty-state {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--td-text-color-secondary);
}
</style>
