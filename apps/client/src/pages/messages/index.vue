<script setup lang="ts">
/**
 * 消息页 - 私信+心动信号+系统通知
 * 展示私信聊天列表、心动信号通知和系统通知
 * Phase 3 新增：社交信号/内容信号分类筛选
 */
import { computed, ref, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useSessionStore } from "../../stores/session";
import { useMessagesStore, type NotificationFilterType, type SystemNotification } from "../../stores/messages";
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

/** 通知信号筛选类型：all | social | content */
const signalFilter = ref<NotificationFilterType>("all");

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

/**
 * 系统通知列表
 * Phase 3：使用 filteredNotifications getter，自动根据 filterType 过滤
 */
const notificationList = computed(() => messagesStore.filteredNotifications);

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

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
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
 * 切换通知信号筛选类型
 */
function switchSignalFilter(type: NotificationFilterType) {
  if (signalFilter.value === type) return;
  signalFilter.value = type;
  void messagesStore.setFilterType(type);
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
 * Phase 3：根据 signalType 获取通知图标
 * 社交信号：红心/火焰等温暖图标
 * 内容信号：评论/点赞等中性图标
 */
function getNotificationIcon(notification: SystemNotification): string {
  // 优先按 signalType 分类
  if (notification.signalType === "SOCIAL") {
    switch (notification.type) {
      case "match":
      case "interaction_match":
        return "💝";
      case "like":
        return "🔥";
      case "visitor":
        return "👀";
      default:
        return "❤️";
    }
  }
  // CONTENT 信号
  switch (notification.type) {
    case "comment":
      return "💬";
    case "follow":
      return "👤";
    case "interaction_like":
      return "👍";
    default:
      return "📝";
  }
}

/**
 * Phase 3：获取通知信号类型对应的 CSS class
 */
function getSignalClass(notification: SystemNotification): string {
  return notification.signalType === "SOCIAL" ? "signal-social" : "signal-content";
}

/**
 * Phase 3：获取信号类型标签文本
 */
function getSignalLabel(notification: SystemNotification): string {
  return notification.signalType === "SOCIAL" ? "社交信号" : "内容信号";
}

/**
 * Phase 3：获取通知操作按钮文本
 * 社交信号 → "立即查看"（红色强调）
 * 内容信号 → "查看详情"（蓝色）
 */
function getActionLabel(notification: SystemNotification): string {
  return notification.signalType === "SOCIAL" ? "立即查看" : "查看详情";
}

/**
 * 处理通知点击，根据类型跳转到不同页面
 */
async function handleNotificationClick(notification: SystemNotification) {
  // 标记已读
  await messagesStore.markNotificationRead(notification.id);

  const type = notification.type;
  if (type === "follow" || type === "visitor") {
    if (type === "visitor") {
      openAppPath("/pages/likes/index");
    } else {
      openAppPath("/pages/messages/index");
    }
    return;
  }

  if (type === "interaction_like" || type === "comment" || type === "like") {
    const postId = notification.resourceId;
    if (postId) {
      openAppPath(`/pages/village/detail?id=${postId}`);
    }
    return;
  }

  if (type === "interaction_match" || type === "match") {
    openAppPath("/pages/messages/index");
    return;
  }

  if (notification.actionUrl) {
    openAppPath(notification.actionUrl);
  }
}

/** 判断心动信号是否即将过期（<2小时） */
function isSignalExpiringSoon(signal: { expiresAt: string; status: string }): boolean {
  if (signal.status === "expired") return false;
  const expiresAt = Date.parse(signal.expiresAt);
  const now = Date.now();
  const remainingMs = expiresAt - now;
  return remainingMs > 0 && remainingMs < 2 * 60 * 60 * 1000;
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
          :class="{ 'heart-signal-card--expiring': isSignalExpiringSoon(signal) }"
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

      <!-- 主分类标签：私信 / 系统通知 -->
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

      <!-- Phase 3：通知信号分类筛选 Tab -->
      <view v-if="activeTab === 'notifications'" class="signal-filter-tabs">
        <view
          class="signal-filter-tabs__item"
          :class="{ 'signal-filter-tabs__item--active': signalFilter === 'all' }"
          @click="switchSignalFilter('all')"
        >
          <text class="signal-filter-tabs__text">全部</text>
        </view>
        <view
          class="signal-filter-tabs__item signal-filter-tabs__item--social"
          :class="{ 'signal-filter-tabs__item--active': signalFilter === 'social' }"
          @click="switchSignalFilter('social')"
        >
          <text class="signal-filter-tabs__text">社交信号</text>
        </view>
        <view
          class="signal-filter-tabs__item signal-filter-tabs__item--content"
          :class="{ 'signal-filter-tabs__item--active': signalFilter === 'content' }"
          @click="switchSignalFilter('content')"
        >
          <text class="signal-filter-tabs__text">内容信号</text>
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

      <!-- Phase 3：系统通知列表（含信号分类样式） -->
      <view v-else-if="activeTab === 'notifications'" class="notification-list">
        <view
          v-for="notification in notificationList"
          :key="notification.id"
          class="notification-row"
          :class="[
            { 'notification-row--unread': !notification.isRead },
            getSignalClass(notification)
          ]"
          @click="handleNotificationClick(notification)"
        >
          <!-- 信号类型图标 -->
          <view
            class="notification-row__icon"
            :class="`notification-row__icon--${notification.signalType === 'SOCIAL' ? 'social' : 'content'}`"
          >
            {{ getNotificationIcon(notification) }}
          </view>

          <!-- 通知内容区 -->
          <view class="notification-row__content">
            <view class="notification-row__top">
              <!-- 信号类型标签 + 标题 -->
              <view class="notification-row__title-row">
                <text
                  class="notification-row__signal-tag"
                  :class="`notification-row__signal-tag--${notification.signalType === 'SOCIAL' ? 'social' : 'content'}`"
                >
                  {{ getSignalLabel(notification) }}
                </text>
                <text class="notification-row__title">{{ notification.title }}</text>
              </view>
              <text class="notification-row__time">{{ formatTime(notification.createdAt) }}</text>
            </view>
            <text class="notification-row__body">{{ notification.content }}</text>

            <!-- Phase 3：差异化操作按钮 -->
            <view class="notification-row__action">
              <text
                class="notification-row__action-btn"
                :class="`notification-row__action-btn--${notification.signalType === 'SOCIAL' ? 'social' : 'content'}`"
              >
                {{ getActionLabel(notification) }}
              </text>
            </view>
          </view>

          <!-- 未读标记点（根据信号类型显示不同颜色） -->
          <view
            v-if="!notification.isRead"
            class="notification-row__dot"
            :class="`notification-row__dot--${notification.signalType === 'SOCIAL' ? 'social' : 'content'}`"
          />
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

.heart-signal-card--expiring {
  border-color: var(--td-error-color);
  border-width: 2px;
  animation: heart-signal-blink 1.5s ease-in-out infinite;
}

@keyframes heart-signal-blink {
  0%, 100% {
    border-color: var(--td-error-color);
    box-shadow: 0 0 0 rpx rgba(244, 63, 94, 0);
  }
  50% {
    border-color: rgba(244, 63, 94, 0.3);
    box-shadow: 0 0 16rpx rgba(244, 63, 94, 0.25);
  }
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

/* ========== 主分类标签 ========== */
.messages-tabs {
  display: flex;
  gap: 32rpx;
  margin-bottom: 16rpx;
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

/* ========== Phase 3：信号分类筛选 Tab ========== */
.signal-filter-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
  padding: 4rpx 0;
}

.signal-filter-tabs__item {
  position: relative;
  padding: 10rpx 24rpx;
  border-radius: 999px;
  background: var(--td-bg-color-secondarycontainer);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.signal-filter-tabs__text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--td-text-color-secondary);
  transition: color 0.2s ease;
}

.signal-filter-tabs__item--active {
  background: var(--td-brand-color-7);
}

.signal-filter-tabs__item--active .signal-filter-tabs__text {
  color: #fff;
}

/* 社交信号 active 态：红色主题 */
.signal-filter-tabs__item--social.signal-filter-tabs__item--active {
  background: linear-gradient(135deg, #f43f5e, #e11d48);
}

/* 内容信号 active 态：蓝色主题 */
.signal-filter-tabs__item--content.signal-filter-tabs__item--active {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
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

/* ========== Phase 3：通知列表 ========== */
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

/* 社交信号未读行高亮 */
.notification-row--unread.signal-social {
  background: rgba(244, 63, 94, 0.03);
}

/* 内容信号未读行高亮 */
.notification-row--unread.signal-content {
  background: rgba(59, 130, 246, 0.03);
}

/* ===== 通知图标（Phase 3：按信号类型区分背景色） ===== */
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

.notification-row__icon--social {
  background: linear-gradient(135deg, #fef3f2, #fff1f2);
  border: 1px solid rgba(244, 63, 94, 0.12);
}

.notification-row__icon--content {
  background: linear-gradient(135deg, #eff6ff, #eef2ff);
  border: 1px solid rgba(59, 130, 246, 0.12);
}

/* ===== 通知内容区 ===== */
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
  align-items: flex-start;
  gap: 16rpx;
}

.notification-row__title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 1;
  min-width: 0;
}

/* Phase 3：信号类型标签 */
.notification-row__signal-tag {
  font-size: 20rpx;
  font-weight: 600;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  line-height: 1.6;
}

.notification-row__signal-tag--social {
  background: rgba(244, 63, 94, 0.1);
  color: #e11d48;
}

.notification-row__signal-tag--content {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.notification-row__title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* Phase 3：操作按钮区域 */
.notification-row__action {
  display: flex;
  margin-top: 6rpx;
}

.notification-row__action-btn {
  font-size: 24rpx;
  font-weight: 600;
  padding: 8rpx 20rpx;
  border-radius: 999px;
  line-height: 1.4;
  transition: opacity 0.2s ease;
}

/* 社交信号按钮：红色强调 */
.notification-row__action-btn--social {
  background: rgba(244, 63, 94, 0.1);
  color: #e11d48;
  border: 1px solid rgba(244, 63, 94, 0.25);
}

.notification-row__action-btn--social:active {
  background: rgba(244, 63, 94, 0.2);
}

/* 内容信号按钮：蓝色 */
.notification-row__action-btn--content {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.notification-row__action-btn--content:active {
  background: rgba(59, 130, 246, 0.2);
}

/* Phase 3：未读标记点（按信号类型区分颜色） */
.notification-row__dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 8rpx;
}

.notification-row__dot--social {
  background: #e11d48;
}

.notification-row__dot--content {
  background: #2563eb;
}
</style>