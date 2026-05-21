<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import StatusState from "../../src/components/common/StatusState.vue";
import { homePageRequirements } from "../../src/config/page-access";
import { usePageAccess } from "../../src/composables/usePageAccess";
import { useMatchStore } from "../../src/stores/match";
import { useChatStore } from "../../src/stores/chat";
import { openAppPath } from "../../src/utils/navigation";

usePageAccess(homePageRequirements);

const matchStore = useMatchStore();
const chatStore = useChatStore();
const loadingQuickMatch = ref<number | null>(null);
const enteringChatMatchId = ref<string | null>(null);
const lastQuickMatchDuration = ref<number | null>(null);

const quickActions = [15, 30, 45];
const firstSection = computed(() => matchStore.formConfig?.sections[0] ?? null);
const secondSection = computed(() => matchStore.formConfig?.sections[1] ?? null);
const activeMatch = computed(() => matchStore.activeMatch);
const activeMatchPrimaryLabel = computed(() => {
  if (!activeMatch.value) {
    return "";
  }

  if (activeMatch.value.queueStatus === "queued") {
    return matchStore.loadingMatchResult ? "刷新中..." : "刷新结果";
  }

  if (activeMatch.value.queueStatus === "expired") {
    return loadingQuickMatch.value !== null ? "重新匹配中..." : "按上次时长再试";
  }

  return enteringChatMatchId.value === activeMatch.value.id ? "进入中..." : "进入聊天";
});
const activeMatchSecondaryLabel = computed(() =>
  activeMatch.value?.queueStatus === "connected" ? "聊天列表" : "回首页"
);

onShow(() => {
  if (!matchStore.formConfig) {
    void matchStore.loadFormConfig();
  }
});

async function openChatFromMatch(matchId: string) {
  enteringChatMatchId.value = matchId;

  try {
    const session = await chatStore.startFromMatch(matchId);
    if (session) {
      openAppPath(`/pages/chat-session/index?sessionId=${session.id}`);
    }
  } finally {
    enteringChatMatchId.value = null;
  }
}

async function runQuickMatch(durationMinutes: number) {
  loadingQuickMatch.value = durationMinutes;
  lastQuickMatchDuration.value = durationMinutes;

  try {
    const result = await matchStore.quickMatch(durationMinutes);
    if (result.canOpenChat) {
      await openChatFromMatch(result.id);
    }
  } finally {
    loadingQuickMatch.value = null;
  }
}

async function refreshActiveMatch() {
  const result = await matchStore.refreshActiveMatch();
  if (result?.canOpenChat) {
    await openChatFromMatch(result.id);
  }
}

async function retryLastQuickMatch() {
  if (lastQuickMatchDuration.value === null) {
    return;
  }

  await runQuickMatch(lastQuickMatchDuration.value);
}

async function handleActiveMatchPrimary() {
  if (!activeMatch.value) {
    return;
  }

  if (activeMatch.value.queueStatus === "queued") {
    await refreshActiveMatch();
    return;
  }

  if (activeMatch.value.queueStatus === "expired") {
    await retryLastQuickMatch();
    return;
  }

  await openChatFromMatch(activeMatch.value.id);
}

function handleActiveMatchSecondary() {
  if (!activeMatch.value) {
    return;
  }

  openAppPath(
    activeMatch.value.queueStatus === "connected" ? "/pages/chat/index" : "/pages/home/index"
  );
}

function fieldSummary(field: NonNullable<typeof secondSection.value>["fields"][number]) {
  if (field.kind === "stepper") {
    return `${field.min ?? 0}-${field.max ?? 0} 分钟`;
  }

  return field.options.map((option) => option.label).join(" / ");
}
</script>

<template>
  <AppShell
    title="匹配"
    subtitle="这里是主发起入口，确认节奏后直接进入临时聊天。"
    current-tab="match"
  >
    <SectionCard title="快速开始" subtitle="先定聊天时长，系统会按当前偏好帮你接上合适的人。">
      <view class="quick-grid">
        <button
          v-for="minutes in quickActions"
          :key="minutes"
          class="quick-action"
          :disabled="loadingQuickMatch === minutes"
          @click="runQuickMatch(minutes)"
        >
          {{ loadingQuickMatch === minutes ? "连接中..." : `${minutes} 分钟快速匹配` }}
        </button>
      </view>
      <text v-if="matchStore.errorMessage" class="row-subtitle">{{ matchStore.errorMessage }}</text>
    </SectionCard>

    <SectionCard
      v-if="firstSection"
      :title="firstSection.title"
      subtitle="最终版把匹配留在主按钮位，这里直接展示当前可选方向。"
    >
      <view v-for="field in firstSection.fields" :key="field.id" class="field-block">
        <text class="row-title">{{ field.label }}</text>
        <view class="option-row">
          <text v-for="option in field.options" :key="option.id" class="option-pill">
            {{ option.label }}
          </text>
        </view>
      </view>
    </SectionCard>

    <SectionCard
      v-if="secondSection"
      :title="secondSection.title"
      subtitle="这些筛选项会继续保留在匹配页，而不是塞回首页。"
    >
      <view v-for="field in secondSection.fields" :key="field.id" class="field-block">
        <text class="row-title">{{ field.label }}</text>
        <text class="row-subtitle">{{ fieldSummary(field) }}</text>
      </view>
    </SectionCard>
    <SectionCard v-else-if="matchStore.loadingFormConfig" title="匹配配置" subtitle="正在同步当前可用的匹配条件。">
      <text class="row-subtitle">正在加载匹配配置...</text>
    </SectionCard>

    <SectionCard
      v-if="activeMatch"
      title="当前连接结果"
      :subtitle="activeMatch.resultLead"
    >
      <view class="copy-stack">
        <view class="match-row">
          <text class="row-title">{{ activeMatch.topicLabel }}</text>
          <StatusState :tone="activeMatch.statusTone" :label="activeMatch.statusCopy" />
        </view>
        <text class="row-subtitle">{{ activeMatch.partnerHeadline }}</text>
        <text class="row-subtitle">{{ activeMatch.recommendedPrompt }}</text>
        <text class="row-subtitle">
          {{
            activeMatch.queueStatus === "expired"
              ? "本次窗口已结束。"
              : `当前窗口：${activeMatch.countdownMinutes} 分钟`
          }}
        </text>
      </view>
      <view class="result-actions">
        <button class="action-button action-button--secondary" @click="handleActiveMatchSecondary">
          {{ activeMatchSecondaryLabel }}
        </button>
        <button
          class="action-button"
          :disabled="enteringChatMatchId === activeMatch.id || matchStore.loadingMatchResult"
          @click="handleActiveMatchPrimary"
        >
          {{ activeMatchPrimaryLabel }}
        </button>
      </view>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.quick-grid,
.copy-stack {
  display: grid;
  gap: 10rpx;
}

.quick-grid {
  gap: 14rpx;
}

.quick-action {
  height: 88rpx;
  border: 1px solid rgba(29, 78, 216, 0.16);
  border-radius: 20rpx;
  background: rgba(239, 246, 255, 0.92);
  color: var(--td-brand-color-7);
  font-size: 26rpx;
  font-weight: 700;
}

.field-block {
  display: grid;
  gap: 12rpx;
  padding: 18rpx 0;
  border-top: 1px solid var(--td-border-level-1-color);
}

.field-block:first-child {
  padding-top: 0;
  border-top: 0;
}

.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.option-pill {
  padding: 12rpx 18rpx;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 999px;
  background: #fff;
  color: var(--td-text-color-secondary);
  font-size: 22rpx;
  line-height: 1;
}

.match-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  align-items: center;
}

.row-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.row-subtitle {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--td-text-color-secondary);
}

.result-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 18rpx;
}

.action-button {
  height: 88rpx;
  border: 0;
  border-radius: 18rpx;
  background: var(--td-brand-color-7);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}

.action-button--secondary {
  background: #fff;
  color: var(--td-text-color-primary);
  border: 1px solid var(--td-border-level-1-color);
}
</style>
