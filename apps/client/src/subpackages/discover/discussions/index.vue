<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import StatusState from "../../../components/common/StatusState.vue";
import EmptyState from "../../../components/common/EmptyState.vue";
import { discoverPageRequirements } from "../../../config/page-access";
import { usePageAccess } from "../../../composables/usePageAccess";
import { clientApi } from "../../../services/api";
import { openAppPath } from "../../../utils/navigation";
import { lightHaptic } from "../../../utils/haptic";
// R4-batch2: 页面文案 i18n 化
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const discussions = ref<Awaited<ReturnType<typeof clientApi.getDiscussionRecommendations>>>([]);
const loading = ref(false);
/** 加载失败时的错误状态，供 UI 展示重试入口 */
const error = ref<string | null>(null);

usePageAccess(discoverPageRequirements);

onShow(() => {
  void loadDiscussions();
});

async function loadDiscussions() {
  loading.value = true;
  error.value = null;
  try {
    discussions.value = await clientApi.getDiscussionRecommendations();
  } catch (e) {
    // 失败时设置 error 状态，UI 可据此展示重试入口（R4-00052：文案走 i18n）
    error.value = e instanceof Error ? e.message : t("discussions.loadFailed");
    uni.showToast({ title: error.value, icon: "none" });
  } finally {
    loading.value = false;
  }
}

function openPath(url: string) {
  openAppPath(url);
}

/**
 * R4-00053：讨论推荐条目点击消费路径。
 * 推荐条目无独立详情页（契约仅 id/title/summary/heatLabel），
 * 点击后展示详情弹窗，确认后进入寻觅页继续体验真实内容。
 */
function openDiscussion(item: Awaited<ReturnType<typeof clientApi.getDiscussionRecommendations>>[number]) {
  lightHaptic();
  uni.showModal({
    title: item.title,
    content: `${item.summary}\n\n${item.heatLabel}`,
    confirmText: t("discussions.goExplore"),
    cancelText: t("common.cancel"),
    success: (res) => {
      if (res.confirm) {
        openPath("/pages/discover/index");
      }
    },
  });
}
</script>

<template>
  <AppShell
    :title="t('discussions.title')"
    :subtitle="t('discussions.subtitle')"
    current-tab="likes"
  >
    <SectionCard :title="t('discussions.hotSectionTitle')" :subtitle="t('discussions.hotSectionSubtitle')">
      <view v-if="loading" class="empty-state">{{ t('discussions.loadingContent') }}</view>
      <view v-else-if="error" class="empty-state">
        {{ error }}
        <text class="retry-link" @tap="loadDiscussions">{{ t('discussions.retry') }}</text>
      </view>
      <EmptyState
        v-else-if="!discussions.length"
        :title="t('discussions.empty')"
        type="no-data"
      />
      <view v-else class="section-stack">
        <view
          v-for="item in discussions" :key="item.id"
          class="feed-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="`${item.title}：${item.summary}`"
          @tap="openDiscussion(item)"
        >
          <StatusState tone="warning" :label="item.heatLabel" />
          <text class="row-title">{{ item.title }}</text>
          <text class="row-subtitle">{{ item.summary }}</text>
        </view>
      </view>
    </SectionCard>

    <SectionCard :title="t('discussions.nextTitle')" :subtitle="t('discussions.nextSubtitle')">
      <BottomActionBar
        :primary-label="t('discussions.goExplore')"
        :secondary-label="t('discussions.feedbackSuggestion')"
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
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.row-subtitle,
.empty-state {
  font-size: var(--fs-base, 24rpx);
  line-height: 1.6;
  color: var(--c-text-secondary);
}

.retry-link {
  margin-left: 12rpx;
  color: var(--c-brand-500, #3fcf8e);
  font-weight: 600;
}
</style>
