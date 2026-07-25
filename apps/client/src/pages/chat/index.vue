<script setup lang="ts">
/**
 * 聊天页 - 会话列表
 * 连接到 useMessagesStore 获取真实会话数据，替代硬编码模拟数据
 */
import { ref, computed, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useMessagesStore } from "../../stores/messages";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import { useTabBar } from "../../composables/useTabBar";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
import LockScreen from "../../components/common/LockScreen.vue";
import AppShell from "../../components/layout/AppShell.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { messagesPageRequirements } from "../../config/page-access";

// 同步自定义 TabBar 选中状态（消息 = 索引 3）
useTabBar(3);

const { t } = useI18n();
const messagesStore = useMessagesStore();
const sessionStore = useSessionStore();

// 页面访问守卫
usePageAccess(messagesPageRequirements);

const { loading, errorMessage } = storeToRefs(messagesStore);

/** 资料是否已完善 */
const isUnlocked = computed(() => sessionStore.isProfileComplete);
const completionPercent = computed(() => sessionStore.profileCompletion);

/** SVG 图标资源路径 */
const iconSrc = {
  message: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
} as const;

/** 话题推荐 */
const topicSuggestions = computed(() => [
  t("chat.topicWeekend"),
  t("chat.topicBook"),
  t("chat.topicStudy"),
  t("chat.topicCanteen"),
]);

/** 私聊会话列表（按置顶 + 时间排序） */
const privateSessions = computed(() => {
  const items = [...messagesStore.sessions].sort((a, b) => {
    // 置顶优先
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // 再按时间倒序
    const aTime = a.lastMessageSentAt ? new Date(a.lastMessageSentAt).getTime() : 0;
    const bTime = b.lastMessageSentAt ? new Date(b.lastMessageSentAt).getTime() : 0;
    return bTime - aTime;
  });
  return items;
});

/** 格式化时间 */
function formatChatTime(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return t("common.justNow");
  if (diffMinutes < 60) return t("common.minutesAgo", { n: diffMinutes });
  if (diffHours < 24) return t("common.hoursAgo", { n: diffHours });
  if (diffDays < 7) return t("common.daysAgo", { n: diffDays });

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

function goToChat(sessionId: string) {
  openAppPath(`/pages/chat-session/index?sessionId=${encodeURIComponent(sessionId)}`);
}

/** 下拉刷新 */
async function onRefresh() {
  await messagesStore.fetchSessions();
}

/** 重试加载 */
async function handleRetry() {
  await messagesStore.fetchSessions();
}

onMounted(() => {
  if (isUnlocked.value) {
    void messagesStore.fetchSessions();
  }
});

onShow(() => {
  if (isUnlocked.value) {
    void messagesStore.fetchSessions();
  }
});
</script>

<template>
  <!-- 未完善资料：锁定页面 -->
  <LockScreen
    v-if="!isUnlocked"
    :page-name="t('chat.pageName')"
    :completion-percent="completionPercent"
  />

  <AppShell
    v-else
    variant="standard"
    bg-variant="gradient"
    :title="t('chat.title')"
    :subtitle="t('chat.sessionSubtitle')"
    :tab-bar-safe="true"
  >
    <!-- 话题推荐助手 -->
    <view class="topic-assistant">
        <view class="topic-assistant__label">
          <SafeImage :src="iconSrc.message" custom-class="topic-assistant__label-icon" mode="aspectFit" />
          <text>{{ t('chat.topicRecommend') }}</text>
        </view>
        <scroll-view scroll-x class="topic-scroll" show-scrollbar="false">
          <view class="topic-list">
            <view
              v-for="(topic, index) in topicSuggestions"
              :key="index"
              class="topic-tag press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
            >
              <text class="topic-tag__text">{{ topic }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 错误状态 -->
      <ErrorState
        v-if="errorMessage && privateSessions.length === 0"
        :message="errorMessage"
        @retry="handleRetry"
      />

      <!-- 会话列表 -->
      <scroll-view
        v-else
        scroll-y
        class="chat-scroll"
        refresher-enabled
        :refresher-triggered="false"
        @refresherrefresh="onRefresh"
      >
        <!-- 骨架屏加载 -->
        <view v-if="loading" class="conversation-list">
          <Skeleton variant="list" :count="4" />
        </view>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="privateSessions.length === 0"
          icon-kind="message"
          :title="t('chat.emptyTitle')"
          :description="t('chat.emptyDesc')"
        />

        <!-- 正常内容 -->
        <view v-else class="conversation-list card-base">
          <view
            v-for="conv in privateSessions"
            :key="conv.id"
            class="conversation-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="goToChat(conv.id)"
          >
            <view class="conversation-item__avatar-wrap">
              <image
                v-if="conv.partnerAvatar"
                class="conversation-item__avatar"
                :src="conv.partnerAvatar"
                mode="aspectFill"
                lazy-load
              />
              <view v-else class="conversation-item__avatar-placeholder">
                <text class="conversation-item__avatar-initial">{{ conv.partnerName?.charAt(0) || '?' }}</text>
              </view>
              <!-- 在线指示器（当前暂无在线状态数据，保留结构） -->
            </view>
            <view class="conversation-item__content">
              <view class="conversation-item__top">
                <view class="conversation-item__name-wrap">
                  <text class="conversation-item__name">{{ conv.partnerName }}</text>
                  <view v-if="conv.pinned" class="conversation-item__pin-icon">
                    <text>📌</text>
                  </view>
                </view>
                <text class="conversation-item__time">{{ formatChatTime(conv.lastMessageSentAt) }}</text>
              </view>
              <view class="conversation-item__bottom">
                <text class="conversation-item__message">{{ conv.lastMessagePreview }}</text>
                <view v-if="conv.unreadCount > 0" class="conversation-item__badge">
                  <text class="conversation-item__badge-text">
                    {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
                  </text>
                </view>
              </view>
            </view>
            <!-- 会话状态标签 -->
            <view v-if="conv.phase === 'closing' || conv.phase === 'closed'" class="conversation-item__status">
              <text>{{ conv.phase === 'closed' ? t('chat.closed') : t('chat.closingSoon') }}</text>
            </view>
          </view>
        </view>

      </scroll-view>
  </AppShell>
</template>

<style scoped lang="scss">
/* ========== 话题推荐助手 ========== */
.topic-assistant {
  padding: var(--sp-5) var(--sp-6);
  margin: 0 var(--sp-8) var(--sp-5);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-romance-50) 100%);
  border-radius: var(--r-xl);
  position: relative;
  z-index: 1;
}

.topic-assistant__label {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-base);
  color: var(--c-brand);
  font-weight: 600;
  margin-bottom: var(--sp-3);
}

.topic-assistant__label-icon {
  width: var(--sp-7);
  height: var(--sp-7);
  opacity: 0.7;
}

.topic-scroll {
  width: 100%;
}

.topic-list {
  display: flex;
  gap: var(--sp-3);
  padding-right: 0;
}

.topic-tag {
  flex-shrink: 0;
  padding: var(--sp-3) var(--sp-6);
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  box-shadow: var(--s-sm);
  transition: transform 0.15s ease;
}

/* #ifdef H5 */
.topic-tag:active {
  transform: scale(0.96);
}
/* #endif */

.topic-tag__text {
  font-size: var(--fs-base);
  color: var(--c-brand);
  font-weight: 500;
}

/* ========== 滚动区域 ========== */
.chat-scroll {
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* ========== 会话列表 ========== */
.conversation-list {
  display: flex;
  flex-direction: column;
  margin: 0 var(--sp-8);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-6) var(--sp-8);
  background: var(--c-bg-container);
  position: relative;
  transition: transform 0.15s ease, background 0.15s ease;
}

.conversation-item:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 140rpx;
  right: 0;
  bottom: 0;
  height: 1rpx;
  background: var(--c-divider-light);
}

/* #ifdef H5 */
.conversation-item:active {
  background: var(--c-neutral-50);
  transform: scale(0.98);
}
/* #endif */

.conversation-item__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.conversation-item__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-page);
}

.conversation-item__avatar-placeholder {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
}

.conversation-item__avatar-initial {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-brand);
}

.conversation-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.conversation-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-item__name-wrap {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.conversation-item__name {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240rpx;
}

.conversation-item__pin-icon {
  font-size: var(--fs-sm);
  flex-shrink: 0;
}

.conversation-item__time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.conversation-item__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-item__message {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: var(--sp-4);
}

.conversation-item__badge {
  min-width: var(--sp-9);
  height: var(--sp-9);
  border-radius: var(--r-full);
  background: var(--c-error);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--sp-2);
}

.conversation-item__badge-text {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  font-weight: 700;
}

.conversation-item__status {
  flex-shrink: 0;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-sm);
  background: var(--c-neutral-50);
}

.conversation-item__status text {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  font-weight: 500;
}
</style>
