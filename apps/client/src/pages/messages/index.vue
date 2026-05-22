<script setup lang="ts">
/**
 * 消息页 - 私信+心动信号+系统通知
 * 展示私信聊天列表、心动信号通知和系统通知
 */
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useSessionStore } from "../../stores/session";
import { useMessagesStore } from "../../stores/messages";
import { openAppPath } from "../../utils/navigation";
import LockScreen from "../../components/common/LockScreen.vue";

const sessionStore = useSessionStore();
const messagesStore = useMessagesStore();

/** 资料是否已完善 */
const isUnlocked = computed(() => sessionStore.isProfileComplete);
/** 完善度百分比 */
const completionPercent = computed(() => sessionStore.profileCompletion);

/** 当前选中的标签页：private | notifications */
const activeTab = ref<"private" | "notifications">("private");

/** 倒计时显示文本映射 */
const countdownMap = ref<Record<string, string>>({});

/** 是否有待处理的心动信号 */
const hasPendingHeartSignal = computed(() => messagesStore.pendingHeartSignals.length > 0);

/** 私信列表（按置顶+时间排序） */
const privateSessionList = computed(() => {
  const list = messagesStore.sessions.filter((s) => s.sessionType === "private");
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const aTime = a.lastMessageSentAt ? Date.parse(a.lastMessageSentAt) : 0;
    const bTime = b.lastMessageSentAt ? Date.parse(b.lastMessageSentAt) : 0;
    return bTime - aTime;
  });
});

/** 临时匿名会话列表 */
const tempSessionList = computed(() => {
  return messagesStore.sessions.filter((s) => s.sessionType === "temp_anonymous");
});

/** 系统通知列表 */
const notificationList = computed(() => messagesStore.notifications);

/** 是否显示空状态 */
const showEmptyState = computed(() => {
  if (activeTab.value === "private") {
    return privateSessionList.value.length === 0 && tempSessionList.value.length === 0;
  }
  return notificationList.value.length === 0;
});

/** 页面加载时获取数据 */
onShow(() => {
  if (isUnlocked.value) {
    void messagesStore.bootstrap();
    startCountdownTimers();
  }
});

/**
 * 启动心动信号倒计时定时器
 */
let countdownInterval: ReturnType<typeof setInterval> | null = null;

function startCountdownTimers() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  updateCountdowns();
  countdownInterval = setInterval(updateCountdowns, 1000);
}

function updateCountdowns() {
  const now = Date.now();
  messagesStore.pendingHeartSignals.forEach((signal) => {
    const expiresAt = Date.parse(signal.expiresAt);
    const diff = expiresAt - now;

    if (diff <= 0) {
      countdownMap.value[signal.id] = "已过期";
      signal.status = "expired";
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      countdownMap.value[signal.id] = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
  });
}

/**
 * 跳转到聊天详情页
 */
function openSession(sessionId: string) {
  openAppPath(`/pages/chat-session/index?sessionId=${sessionId}`);
}

/**
 * 处理心动信号「直接开聊」
 */
async function handleHeartSignalChat(signalId: string) {
  try {
    const session = await messagesStore.acceptHeartSignal(signalId);
    if (session) {
      openSession(session.id);
    }
  } catch {
    // 错误已在 store 中记录，可在此处展示 toast
    uni.showToast({ title: messagesStore.errorMessage || "操作失败", icon: "none" });
  }
}

/**
 * 格式化时间显示
 */
function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 获取通知类型图标
 */
function getNotificationIcon(type: string): string {
  switch (type) {
    case "match":
      return "💕";
    case "like":
      return "❤️";
    case "activity":
      return "🎉";
    default:
      return "📢";
  }
}
</script>

<template>
  <view class="messages-page">
    <!-- 未完善资料：显示锁定页面 -->
    <LockScreen
      v-if="!isUnlocked"
      page-name="消息"
      :completion-percent="completionPercent"
    />

    <!-- 已完善资料：显示正常内容 -->
    <template v-else>
      <!-- 页面标题 -->
      <view class="messages-header">
        <text class="messages-header__title">消息</text>
        <view v-if="messagesStore.totalUnreadCount > 0" class="messages-header__badge">
          <text class="messages-header__badge-text">
            {{ messagesStore.totalUnreadCount > 99 ? "99+" : messagesStore.totalUnreadCount }}
          </text>
        </view>
      </view>

      <!-- 心动信号 Banner -->
      <view v-if="hasPendingHeartSignal" class="heart-signal-banner">
        <view
          v-for="signal in messagesStore.pendingHeartSignals"
          :key="signal.id"
          class="heart-signal-card"
        >
          <view class="heart-signal-card__left">
            <view class="heart-signal-card__avatar">
              <text v-if="!signal.fromUserAvatar" class="heart-signal-card__avatar-text">
                {{ signal.fromUserName.charAt(0) }}
              </text>
              <image v-else class="heart-signal-card__avatar-img" :src="signal.fromUserAvatar" mode="aspectFill" />
            </view>
            <view class="heart-signal-card__info">
              <text class="heart-signal-card__name">{{ signal.fromUserName }}</text>
              <text class="heart-signal-card__meta">
                {{ signal.school }} · {{ signal.age }}岁 · {{ signal.city }}
              </text>
              <text class="heart-signal-card__highlight">{{ signal.bioHighlight }}</text>
            </view>
          </view>
          <view class="heart-signal-card__right">
            <text class="heart-signal-card__countdown">{{ countdownMap[signal.id] || "--:--:--" }}</text>
            <button
              class="heart-signal-card__btn"
              :disabled="signal.status === 'expired' || countdownMap[signal.id] === '已过期'"
              @click="handleHeartSignalChat(signal.id)"
            >
              {{ countdownMap[signal.id] === "已过期" ? "已过期" : "直接开聊" }}
            </button>
          </view>
        </view>
      </view>

      <!-- 分类标签 -->
      <view class="messages-tabs">
        <view
          class="messages-tabs__item"
          :class="{ 'messages-tabs__item--active': activeTab === 'private' }"
          @click="activeTab = 'private'"
        >
          <text class="messages-tabs__text">私信</text>
          <view v-if="messagesStore.totalUnreadCount > 0" class="messages-tabs__dot">
            <text class="messages-tabs__dot-text">
              {{ messagesStore.totalUnreadCount > 99 ? "99+" : messagesStore.totalUnreadCount }}
            </text>
          </view>
        </view>
        <view
          class="messages-tabs__item"
          :class="{ 'messages-tabs__item--active': activeTab === 'notifications' }"
          @click="activeTab = 'notifications'"
        >
          <text class="messages-tabs__text">系统通知</text>
          <view v-if="messagesStore.unreadNotificationCount > 0" class="messages-tabs__dot">
            <text class="messages-tabs__dot-text">
              {{ messagesStore.unreadNotificationCount > 99 ? "99+" : messagesStore.unreadNotificationCount }}
            </text>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="messagesStore.loading" class="messages-loading">
        <text class="messages-loading__text">加载中...</text>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="messagesStore.errorMessage" class="messages-error">
        <text class="messages-error__text">{{ messagesStore.errorMessage }}</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="showEmptyState" class="messages-empty">
        <view class="messages-empty__icon">💬</view>
        <text class="messages-empty__title">暂无消息</text>
        <text class="messages-empty__subtitle">去寻觅页匹配，开始聊天吧</text>
      </view>

      <!-- 私信列表 -->
      <view v-else-if="activeTab === 'private'" class="session-list">
        <!-- 私信会话 -->
        <view
          v-for="session in privateSessionList"
          :key="session.id"
          class="session-row"
          @click="openSession(session.id)"
        >
          <view class="session-row__avatar">
            <text v-if="!session.partnerAvatar" class="session-row__avatar-text">
              {{ session.partnerName.charAt(0) }}
            </text>
            <image v-else class="session-row__avatar-img" :src="session.partnerAvatar" mode="aspectFill" />
            <view v-if="session.unreadCount > 0" class="session-row__unread">
              <text class="session-row__unread-text">
                {{ session.unreadCount > 99 ? "99+" : session.unreadCount }}
              </text>
            </view>
          </view>
          <view class="session-row__content">
            <view class="session-row__top">
              <text class="session-row__name">{{ session.partnerName }}</text>
              <text class="session-row__time">{{ formatTime(session.lastMessageSentAt) }}</text>
            </view>
            <view class="session-row__bottom">
              <text class="session-row__preview">{{ session.lastMessagePreview }}</text>
              <text v-if="session.pinned" class="session-row__pin">置顶</text>
            </view>
          </view>
        </view>

        <!-- 临时匿名会话 -->
        <view
          v-for="session in tempSessionList"
          :key="session.id"
          class="session-row session-row--temp"
          @click="openSession(session.id)"
        >
          <view class="session-row__avatar session-row__avatar--temp">
            <text class="session-row__avatar-text">?</text>
            <view v-if="session.unreadCount > 0" class="session-row__unread">
              <text class="session-row__unread-text">
                {{ session.unreadCount > 99 ? "99+" : session.unreadCount }}
              </text>
            </view>
          </view>
          <view class="session-row__content">
            <view class="session-row__top">
              <text class="session-row__name">{{ session.partnerName }}</text>
              <text class="session-row__time">{{ formatTime(session.lastMessageSentAt) }}</text>
            </view>
            <view class="session-row__bottom">
              <text class="session-row__preview">{{ session.lastMessagePreview }}</text>
              <text class="session-row__temp-tag">临时</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 系统通知列表 -->
      <view v-else-if="activeTab === 'notifications'" class="notification-list">
        <view
          v-for="notification in notificationList"
          :key="notification.id"
          class="notification-row"
          :class="{ 'notification-row--unread': !notification.isRead }"
          @click="messagesStore.markNotificationRead(notification.id); notification.actionUrl && openAppPath(notification.actionUrl)"
        >
          <view class="notification-row__icon">{{ getNotificationIcon(notification.type) }}</view>
          <view class="notification-row__content">
            <view class="notification-row__top">
              <text class="notification-row__title">{{ notification.title }}</text>
              <text class="notification-row__time">{{ formatTime(notification.createdAt) }}</text>
            </view>
            <text class="notification-row__body">{{ notification.content }}</text>
          </view>
          <view v-if="!notification.isRead" class="notification-row__dot" />
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.messages-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--td-bg-app-page);
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  box-sizing: border-box;
}

/* ========== 页面标题 ========== */
.messages-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.messages-header__title {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.messages-header__badge {
  min-width: 40rpx;
  height: 40rpx;
  padding: 0 12rpx;
  border-radius: 999px;
  background: var(--td-error-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.messages-header__badge-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}

/* ========== 心动信号 Banner ========== */
.heart-signal-banner {
  display: grid;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.heart-signal-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #fef3f2 0%, #fff1f2 100%);
  border: 1px solid rgba(244, 63, 94, 0.12);
}

.heart-signal-card__left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
}

.heart-signal-card__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--td-brand-color-3), var(--td-brand-color-5));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.heart-signal-card__avatar-text {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--td-brand-color-7);
}

.heart-signal-card__avatar-img {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
}

.heart-signal-card__info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.heart-signal-card__name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.heart-signal-card__meta {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.heart-signal-card__highlight {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  line-height: 1.4;
}

.heart-signal-card__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
  flex-shrink: 0;
}

.heart-signal-card__countdown {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--td-error-color);
  font-variant-numeric: tabular-nums;
}

.heart-signal-card__btn {
  min-width: 160rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--td-brand-color-7), var(--td-brand-color-6));
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 64rpx;
  text-align: center;
}

.heart-signal-card__btn:disabled {
  background: var(--td-bg-color-component-disabled);
  color: var(--td-text-color-disabled);
}

/* ========== 分类标签 ========== */
.messages-tabs {
  display: flex;
  gap: 32rpx;
  margin-bottom: 24rpx;
  border-bottom: 1px solid var(--td-border-level-1-color);
}

.messages-tabs__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-bottom: 16rpx;
  cursor: pointer;
}

.messages-tabs__text {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--td-text-color-secondary);
}

.messages-tabs__item--active .messages-tabs__text {
  color: var(--td-text-color-primary);
}

.messages-tabs__item--active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 4rpx;
  border-radius: 2rpx;
  background: var(--td-brand-color-7);
}

.messages-tabs__dot {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 999px;
  background: var(--td-error-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.messages-tabs__dot-text {
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
}

/* ========== 加载与错误状态 ========== */
.messages-loading,
.messages-error {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}

.messages-loading__text,
.messages-error__text {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
}

/* ========== 空状态 ========== */
.messages-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 160rpx 40rpx;
}

.messages-empty__icon {
  font-size: 96rpx;
  margin-bottom: 16rpx;
}

.messages-empty__title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.messages-empty__subtitle {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
  text-align: center;
}

/* ========== 会话列表 ========== */
.session-list {
  display: grid;
  gap: 2rpx;
  background: var(--td-bg-color-container);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: var(--td-shadow-1);
}

.session-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: var(--td-bg-color-container);
  transition: background 0.2s ease;
}

.session-row:active {
  background: var(--td-bg-color-secondarycontainer);
}

.session-row__avatar {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--td-brand-color-3), var(--td-brand-color-5));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.session-row__avatar--temp {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
}

.session-row__avatar-text {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--td-brand-color-7);
}

.session-row__avatar--temp .session-row__avatar-text {
  color: #64748b;
}

.session-row__avatar-img {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
}

.session-row__unread {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 8rpx;
  border-radius: 999px;
  background: var(--td-error-color);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #fff;
}

.session-row__unread-text {
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
}

.session-row__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
}

.session-row__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.session-row__name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.session-row__time {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  flex-shrink: 0;
}

.session-row__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.session-row__preview {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.session-row__pin,
.session-row__temp-tag {
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.session-row__pin {
  background: var(--td-brand-color-1);
  color: var(--td-brand-color-7);
}

.session-row__temp-tag {
  background: #f1f5f9;
  color: #64748b;
}

/* ========== 通知列表 ========== */
.notification-list {
  display: grid;
  gap: 2rpx;
  background: var(--td-bg-color-container);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: var(--td-shadow-1);
}

.notification-row {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 24rpx;
  background: var(--td-bg-color-container);
  transition: background 0.2s ease;
}

.notification-row:active {
  background: var(--td-bg-color-secondarycontainer);
}

.notification-row--unread {
  background: rgba(29, 78, 216, 0.02);
}

.notification-row__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--td-bg-color-secondarycontainer);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}

.notification-row__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.notification-row__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.notification-row__title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.notification-row__time {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  flex-shrink: 0;
}

.notification-row__body {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.5;
}

.notification-row__dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--td-error-color);
  flex-shrink: 0;
  margin-top: 8rpx;
}
</style>
