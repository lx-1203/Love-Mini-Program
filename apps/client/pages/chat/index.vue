<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import StatusState from "../../src/components/common/StatusState.vue";
import { useChatStore } from "../../src/stores/chat";
import { usePageAccess } from "../../src/composables/usePageAccess";
import { chatPageRequirements } from "../../src/config/page-access";
import { openAppPath } from "../../src/utils/navigation";
import { filterChatSessions } from "../../src/view-models/chat";

const chatStore = useChatStore();
const creatingSessionId = ref<string | null>(null);
const pinningSessionId = ref<string | null>(null);
const searchKeyword = ref("");

const hasSessions = computed(() => (chatStore.overviewView?.sessions.length ?? 0) > 0);
const hasSearchQuery = computed(() => searchKeyword.value.trim().length > 0);
const filteredSessions = computed(() =>
  filterChatSessions(chatStore.overviewView?.sessions ?? [], searchKeyword.value)
);

usePageAccess(chatPageRequirements);

onShow(() => {
  void chatStore.loadOverview();
});

function openSession(sessionId: string) {
  openAppPath(`/pages/chat-session/index?sessionId=${sessionId}`);
}

async function toggleSessionPin(sessionId: string, pinned: boolean) {
  pinningSessionId.value = sessionId;

  try {
    await chatStore.setSessionPinned(sessionId, pinned);
  } finally {
    pinningSessionId.value = null;
  }
}

async function handleRecommendation(
  personId: string,
  mode: "complete-setup" | "go-chat",
  target: string
) {
  if (mode === "complete-setup") {
    openAppPath(target);
    return;
  }

  creatingSessionId.value = personId;

  try {
    const session = await chatStore.startFromRecommendation(personId);
    if (session) {
      openSession(session.id);
    }
  } finally {
    creatingSessionId.value = null;
  }
}
</script>

<template>
  <AppShell
    title="聊天"
    subtitle="已建立的临时会话会出现在这里，没有会话时继续从推荐的人进入。"
    current-tab="chat"
  >
    <SectionCard title="会话列表" subtitle="24 小时倒计时和交换状态都收敛在会话卡片里。">
      <view v-if="chatStore.loadingOverview" class="empty-state">正在加载聊天列表...</view>
      <view v-else-if="chatStore.errorMessage" class="empty-state">{{ chatStore.errorMessage }}</view>
      <view v-else-if="chatStore.overviewView" class="content-stack">
        <view class="search-box">
          <input
            v-model="searchKeyword"
            class="search-input"
            :disabled="!hasSessions"
            maxlength="40"
            confirm-type="search"
            :placeholder="hasSessions ? '搜索会话、最近消息或状态' : '建立会话后可在这里搜索'"
          />
          <text v-if="hasSessions" class="search-meta">
            {{ hasSearchQuery ? `匹配 ${filteredSessions.length} 个会话` : `共 ${chatStore.overviewView?.sessions.length ?? 0} 个会话` }}
          </text>
        </view>
        <view v-if="hasSessions && filteredSessions.length" class="session-list">
          <view
            v-for="session in filteredSessions"
            :key="session.id"
            class="session-row"
            @click="openSession(session.id)"
          >
            <view class="session-row__top">
              <view class="copy-block">
                <text class="row-title">{{ session.partnerName }}</text>
                <text class="row-subtitle">{{ session.partnerHeadline }}</text>
              </view>
              <view class="session-row__side">
                <StatusState tone="brand" :label="session.statusLabel" />
                <button
                  class="row-action"
                  :disabled="pinningSessionId === session.id"
                  @click.stop="toggleSessionPin(session.id, !session.pinned)"
                >
                  {{ pinningSessionId === session.id ? "处理中..." : session.pinned ? "取消置顶" : "置顶" }}
                </button>
              </view>
            </view>
            <view class="session-row__meta">
              <text class="row-meta">{{ session.availabilityHint }}</text>
              <text v-if="session.unreadCount > 0" class="unread-badge">
                {{ session.unreadCount > 99 ? "99+" : session.unreadCount }}
              </text>
            </view>
            <text class="row-subtitle">{{ session.lastMessagePreview }}</text>
          </view>
        </view>
        <view v-else-if="hasSessions && hasSearchQuery" class="empty-stack">
          <text class="empty-state">没有匹配的会话，试试更短的关键词。</text>
        </view>
        <view v-else class="empty-stack">
          <text class="empty-state">{{ chatStore.overviewView.emptyStateLead }}</text>
          <view
            v-for="person in chatStore.overviewView.recommendedPeople"
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
              @click.stop="handleRecommendation(person.id, person.action.mode, person.action.target)"
            >
              {{ creatingSessionId === person.id ? "正在创建会话..." : person.action.label }}
            </button>
          </view>
        </view>
      </view>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.content-stack,
.session-list,
.empty-stack {
  display: grid;
  gap: 16rpx;
}

.search-box {
  display: grid;
  gap: 10rpx;
}

.search-input {
  width: 100%;
  height: 84rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: var(--td-bg-app-page);
  font-size: 24rpx;
  color: var(--td-text-color-primary);
}

.search-meta {
  font-size: 22rpx;
  color: var(--td-text-color-secondary);
}

.session-row,
.person-row {
  display: grid;
  gap: 10rpx;
  padding: 22rpx 0;
  border-top: 1px solid var(--td-border-level-1-color);
}

.session-row:first-child,
.person-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.session-row__top {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  align-items: flex-start;
}

.session-row__side {
  display: grid;
  justify-items: end;
  gap: 10rpx;
}

.session-row__meta {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16rpx;
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
  min-width: 0;
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

.row-action {
  min-width: 140rpx;
  height: 60rpx;
  padding: 0 18rpx;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 999px;
  background: #fff;
  color: var(--td-text-color-secondary);
  font-size: 22rpx;
  line-height: 60rpx;
}

.unread-badge {
  min-width: 48rpx;
  height: 48rpx;
  padding: 0 14rpx;
  border-radius: 999px;
  background: var(--td-error-color);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 48rpx;
  text-align: center;
}

.row-subtitle,
.row-meta,
.empty-state {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
}

.block-action {
  height: 80rpx;
  border: 0;
  border-radius: 18rpx;
  background: var(--td-brand-color-7);
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
