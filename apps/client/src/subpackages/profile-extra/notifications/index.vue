<script setup lang="ts">
/**
 * 通知中心（2026-10-28）。
 *
 * 数据源：messagesStore.notifications（GET /notifications/list）。
 * 点击：先标记已读，再按 referenceType 跳话题/帖子；喜欢/访客与匹配只有汇总入口。
 */
import { computed, ref, watch } from "vue";
import { onPullDownRefresh } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useMessagesStore, type SystemNotification, type NotificationFilterType } from "../../../stores/messages";
import { useSessionStore } from "../../../stores/session";
import { usePageAccess } from "../../../composables/usePageAccess";
import { messagesPageRequirements } from "../../../config/page-access";
import { resolveNotificationTarget } from "../../../utils/notification-target";
import { formatChatListTime, getCurrentLocale } from "../../../utils/time";
import { resolveMediaUrl } from "../../../utils/media";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import { IMAGE_PATHS } from "../../../config/images";
import EmptyState from "../../../components/common/EmptyState.vue";
import ErrorState from "../../../components/common/ErrorState.vue";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";

usePageAccess(messagesPageRequirements);

const { t } = useI18n();
const { styleVars: menuStyleVars } = useMenuButtonRect();
const messagesStore = useMessagesStore();
const sessionStore = useSessionStore();
const { notifications, loadingNotifications, filterType } = storeToRefs(messagesStore);
const { isLoggedIn } = storeToRefs(sessionStore);

const TABS: Array<{ key: NotificationFilterType; labelKey: string }> = [
  { key: "all", labelKey: "notifications.all" },
  { key: "social", labelKey: "notifications.social" },
  { key: "content", labelKey: "notifications.content" },
];

const list = computed(() => messagesStore.filteredNotifications);
const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length);
const markingAll = ref(false);

const TYPE_LABEL_KEYS: Record<string, string> = {
  mention: "notifications.type.mention",
  topic_like: "notifications.type.topicLike",
  like: "notifications.type.like",
  interaction_like: "notifications.type.like",
  comment: "notifications.type.comment",
  visitor: "notifications.type.visitor",
  match: "notifications.type.match",
  interaction_match: "notifications.type.match",
  follow: "notifications.type.follow",
  system: "notifications.type.system",
};

function typeLabel(type: SystemNotification["type"]): string {
  const key = TYPE_LABEL_KEYS[type] ?? "notifications.type.system";
  return t(key);
}

function timeText(createdAt: string): string {
  const value = Date.parse(createdAt);
  return Number.isNaN(value) ? "" : formatChatListTime(value, getCurrentLocale());
}

function avatarOf(item: SystemNotification): string {
  return resolveMediaUrl(item.sourceAvatar || IMAGE_PATHS.DEFAULT_AVATAR);
}

async function load(): Promise<void> {
  if (!isLoggedIn.value) return;
  await messagesStore.fetchNotifications();
}

async function markAll(): Promise<void> {
  if (unreadCount.value === 0 || markingAll.value) return;
  markingAll.value = true;
  try {
    await messagesStore.markAllNotificationsRead();
    uni.showToast({ title: t("notifications.markAllDone"), icon: "success" });
  } catch (_e) {
    uni.showToast({ title: t("notifications.markAllFailed"), icon: "none" });
  } finally {
    markingAll.value = false;
  }
}

function onTap(item: SystemNotification): void {
  // 先跳转再标已读：已读请求失败/超时不应阻塞用户打开通知内容
  const target = resolveNotificationTarget(item);
  if (target) {
    openAppPath(target, {
      fail: () => {
        uni.showToast({ title: t("notifications.openFailed"), icon: "none" });
      },
    });
  }
  void messagesStore.markNotificationRead(item.id);
}

async function switchTab(type: NotificationFilterType): Promise<void> {
  if (filterType.value === type) return;
  await messagesStore.setFilterType(type);
}

function goBack(): void {
  uni.navigateBack({
    fail: () => {
      openAppPath(ROUTES.TAB.HOME);
    },
  });
}

watch(
  isLoggedIn,
  (loggedIn) => {
    if (loggedIn) void load();
  },
  { immediate: true }
);

onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});
</script>

<template>
  <view class="notification-page" :style="menuStyleVars">
    <view class="notification-nav">
      <view class="notification-nav__back" role="button" :aria-label="t('common.back')" @tap="goBack">
        <text class="notification-nav__back-icon">‹</text>
      </view>
      <text class="notification-nav__title">{{ t("notifications.title") }}</text>
      <view class="notification-nav__spacer" />
    </view>

    <view class="notification-head">
      <view class="notification-tabs">
        <view
          v-for="tab in TABS"
          :key="tab.key"
          class="notification-tab"
          :class="{ 'notification-tab--active': filterType === tab.key }"
          :aria-pressed="filterType === tab.key"
          role="button"
          @tap="switchTab(tab.key)"
        >
          <text class="notification-tab__text">{{ t(tab.labelKey) }}</text>
        </view>
      </view>
      <view
        class="notification-mark-all"
        :class="{ 'notification-mark-all--disabled': unreadCount === 0 || markingAll }"
        role="button"
        :aria-disabled="unreadCount === 0 || markingAll"
        @tap="markAll"
      >
        <text class="notification-mark-all__text">{{ t("notifications.markAll") }}</text>
      </view>
    </view>

    <SkeletonBlock v-if="loadingNotifications && list.length === 0" variant="list" :rows="4" :label="t('common.loading')" />

    <ErrorState
      v-else-if="messagesStore.errorMessage && list.length === 0"
      :message="messagesStore.errorMessage"
      :description="t('notifications.loadFailed')"
      @retry="load"
    />

    <EmptyState
      v-else-if="list.length === 0"
      type="no-data"
      :title="t('notifications.empty')"
      :description="t('notifications.emptySub')"
    />

    <view v-else class="notification-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="notification-card"
        :class="{ 'notification-card--unread': !item.isRead }"
        role="button"
        @tap="onTap(item)"
      >
        <view class="notification-avatar-wrap">
          <image class="notification-avatar" :src="avatarOf(item)" mode="aspectFill" />
          <view v-if="!item.isRead" class="notification-unread-dot" />
        </view>
        <view class="notification-body">
          <view class="notification-title-row">
            <text class="notification-summary">{{ item.title }}</text>
            <text class="notification-time">{{ timeText(item.createdAt) }}</text>
          </view>
          <view class="notification-meta-row">
            <text class="notification-type">{{ typeLabel(item.type) }}</text>
            <text class="notification-arrow">›</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.notification-page {
  min-height: 100vh;
  padding: calc(var(--statusbar) + 108rpx) var(--sp-4) calc(var(--sp-8) + env(safe-area-inset-bottom));
  background: var(--c-bg-page);
}

.notification-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  padding: calc(var(--statusbar) + 8rpx) var(--sp-4) 8rpx;
  background: var(--c-bg-page);
}

.notification-nav__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--c-bg-container);
}

.notification-nav__back-icon {
  font-size: 40rpx;
  line-height: 1;
  color: var(--c-text-primary);
  margin-top: -4rpx;
}

.notification-nav__title {
  flex: 1;
  text-align: center;
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.notification-nav__spacer {
  width: 64rpx;
  height: 64rpx;
}

.notification-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
}

.notification-tabs {
  display: flex;
  gap: var(--sp-2);
  padding: 6rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
}

.notification-tab {
  padding: 12rpx 28rpx;
  border-radius: var(--r-full);
}

.notification-tab--active {
  background: var(--c-brand-600);
}

.notification-tab__text {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
}

.notification-tab--active .notification-tab__text {
  color: #ffffff;
  font-weight: 600;
}

.notification-mark-all {
  flex-shrink: 0;
  padding: 10rpx 8rpx;
}

.notification-mark-all__text {
  font-size: var(--fs-lg);
  color: var(--c-brand-700);
}

.notification-mark-all--disabled .notification-mark-all__text {
  color: var(--c-text-tertiary);
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.notification-card {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-bg-container);
}

.notification-card--unread {
  background: var(--c-brand-50);
}

.notification-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.notification-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--c-bg-page);
}

.notification-unread-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--c-error);
  border: 2rpx solid var(--c-bg-container);
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-title-row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
}

.notification-summary {
  flex: 1;
  font-size: var(--fs-lg);
  line-height: 1.5;
  color: var(--c-text-primary);
}

.notification-time {
  flex-shrink: 0;
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.notification-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10rpx;
}

.notification-type {
  font-size: var(--fs-sm);
  color: var(--c-brand-700);
  background: var(--c-bg-container);
  border-radius: var(--r-full);
  padding: 4rpx 14rpx;
}

.notification-arrow {
  font-size: 30rpx;
  color: var(--c-text-tertiary);
}
</style>
