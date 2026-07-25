<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import StatusState from "../../../components/common/StatusState.vue";
import { homePageRequirements } from "../../../config/page-access";
import { usePageAccess } from "../../../composables/usePageAccess";
import { clientApi } from "../../../services/api";
import { openAppPath } from "../../../utils/navigation";

const discussions = ref<Awaited<ReturnType<typeof clientApi.getDiscussionRecommendations>>>([]);
const loading = ref(false);
/** 加载失败时的错误状态，供 UI 展示重试入口 */
const error = ref<string | null>(null);

usePageAccess(homePageRequirements);

onShow(() => {
  void loadDiscussions();
});

async function loadDiscussions() {
  loading.value = true;
  error.value = null;
  try {
    discussions.value = await clientApi.getDiscussionRecommendations();
  } catch (e) {
    // 失败时设置 error 状态，UI 可据此展示重试入口
    error.value = e instanceof Error ? e.message : "加载讨论内容失败，请稍后重试";
    uni.showToast({ title: error.value, icon: "none" });
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
      <view v-else-if="error" class="empty-state">
        {{ error }}
        <text class="retry-link" @tap="loadDiscussions">点击重试</text>
      </view>
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
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.feed-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 22rpx 0;
  border-top: 1px solid var(--c-border-light);
}

.feed-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.row-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary);
}

.row-subtitle,
.empty-state {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--c-text-secondary);
}

.retry-link {
  margin-left: 12rpx;
  color: var(--c-brand-500, #3fcf8e);
  font-weight: 600;
}
</style>
