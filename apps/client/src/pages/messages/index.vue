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
import { useSocialProgressStore } from "../../stores/social-progress";
import { openAppPath } from "../../utils/navigation";
import LockScreen from "../../components/common/LockScreen.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { messagesPageRequirements } from "../../config/page-access";
import MatchGuideOverlay from "../../components/social/MatchGuideOverlay.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";

/** Emoji 替换 SVG 图标路径 */
const emojiIcons = {
  search: IMAGE_PATHS.ICONS_EMOJI.SEARCH,
  group: IMAGE_PATHS.ICONS_EMOJI.GROUP,
  smile: IMAGE_PATHS.ICONS_EMOJI.SMILE,
  notification: IMAGE_PATHS.ICONS_COMMON.NOTIFICATION_SVG,
  gift: IMAGE_PATHS.ICONS_EMOJI.GIFT,
} as const;

const sessionStore = useSessionStore();

// Phase 4 任务 20：接入页面访问守卫，触发 UnlockGuideModal 引导（替代静默重定向）
usePageAccess(messagesPageRequirements);
const messagesStore = useMessagesStore();
const socialProgressStore = useSocialProgressStore();

/** SVG 图标资源路径 */
const iconSrc = {
  likeFilled: IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED,
  like: IMAGE_PATHS.ICONS_SOCIAL.LIKE,
  heartSignal: IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL,
  visitor: IMAGE_PATHS.ICONS_SOCIAL.VISITOR,
  comment: IMAGE_PATHS.ICONS_SOCIAL.COMMENT,
  follow: IMAGE_PATHS.ICONS_SOCIAL.FOLLOW,
  match: IMAGE_PATHS.ICONS_SOCIAL.MATCH,
  message: IMAGE_PATHS.ICONS_SOCIAL.MESSAGE,
} as const;

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

/** 匹配引导弹窗状态 */
const showMatchGuide = ref(false);
const matchGuideData = ref({
  partnerName: "",
  partnerAvatar: "",
  icebreakers: [] as string[],
  commonCircles: [] as Array<{ id: string; name: string; icon: string }>,
  activities: [] as Array<{ id: string; title: string; scheduleText: string }>,
  sessionId: "",
});

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
    void socialProgressStore.fetchProgress();
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
 * 接受信号后展示匹配引导弹窗
 */
async function handleHeartSignalChat(signalId: string) {
  try {
    const session = await messagesStore.acceptHeartSignal(signalId);
    if (session) {
      // 获取匹配对象信息
      const signal = messagesStore.pendingHeartSignals.find(s => s.id === signalId);
      matchGuideData.value = {
        partnerName: signal?.fromUserName ?? "对方",
        partnerAvatar: signal?.fromUserAvatar ?? "",
        icebreakers: [
          "你好呀，很高兴认识你！",
          "你也喜欢看电影吗？",
          "你平时喜欢做什么？",
        ],
        commonCircles: [],
        activities: [],
        sessionId: session.id,
      };
      showMatchGuide.value = true;
    }
  } catch (_e) {
    uni.showToast({ title: messagesStore.errorMessage || "操作失败", icon: "none" });
  }
}

/** 匹配引导：开始聊天 */
function handleMatchGuideStartChat() {
  if (matchGuideData.value.sessionId) {
    openSession(matchGuideData.value.sessionId);
  }
  showMatchGuide.value = false;
}

/** 匹配引导：选择破冰话题 */
function handleMatchGuideIcebreaker(topic: string) {
  if (matchGuideData.value.sessionId) {
    // 跳转到聊天页并预填破冰话题
    openAppPath(`/pages/chat-session/index?sessionId=${matchGuideData.value.sessionId}&icebreaker=${encodeURIComponent(topic)}`);
  }
  showMatchGuide.value = false;
}

/** 匹配引导：关闭 */
function handleMatchGuideClose() {
  showMatchGuide.value = false;
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
 * Phase 3：根据 signalType 获取通知图标 SVG 路径
 * 社交信号：红心/火焰等温暖图标
 * 内容信号：评论/点赞等中性图标
 */
function getNotificationIcon(notification: SystemNotification): string {
  // 优先按 signalType 分类
  if (notification.signalType === "SOCIAL") {
    switch (notification.type) {
      case "match":
      case "interaction_match":
        return iconSrc.match;
      case "like":
        return iconSrc.likeFilled;
      case "visitor":
        return iconSrc.visitor;
      default:
        return iconSrc.likeFilled;
    }
  }
  // CONTENT 信号
  switch (notification.type) {
    case "comment":
      return iconSrc.comment;
    case "follow":
      return iconSrc.follow;
    case "interaction_like":
      return iconSrc.like;
    default:
      return iconSrc.comment;
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
      openAppPath("/pages/profile/index?userId=" + notification.triggerUserId);
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

/** 功能入口点击 */
function handleEntryClick(type: string) {
  switch (type) {
    case "new-friend":
      openAppPath("/pages/likes/index");
      break;
    case "group-chat":
      uni.showToast({ title: "群聊功能开发中", icon: "none" });
      break;
    case "notification":
      activeTab.value = "notifications";
      break;
    case "assistant":
      uni.showToast({ title: "恋爱助手开发中", icon: "none" });
      break;
  }
}

/** 搜索框点击 */
function handleSearchClick() {
  uni.showToast({ title: "搜索功能开发中", icon: "none" });
}
</script>

<template>
  <view class="messages-page page-fade-in">
    <!-- 未完善资料：显示锁定页面 -->
    <LockScreen
      v-if="!isUnlocked"
      page-name="消息"
      :completion-percent="completionPercent"
    />

    <!-- 已完善资料：显示正常内容 -->
    <template v-else>
      <!-- 页面顶部渐变氛围 -->
      <view class="messages-header-overlay" />
      
      <!-- 页面标题 -->
      <view class="messages-header">
        <text class="messages-header__title">消息</text>
        <view v-if="messagesStore.totalUnreadCount > 0" class="messages-header__badge">
          <text class="messages-header__badge-text">
            {{ messagesStore.totalUnreadCount > 99 ? "99+" : messagesStore.totalUnreadCount }}
          </text>
        </view>
      </view>

      <!-- 搜索框 -->
      <view class="search-bar press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="handleSearchClick">
        <view class="search-bar__icon">
          <image :src="emojiIcons.search" mode="aspectFit" />
        </view>
        <text class="search-bar__placeholder">搜索</text>
      </view>

      <!-- 功能入口区 -->
      <view class="entry-section">
        <view class="entry-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="handleEntryClick('new-friend')">
          <view class="entry-item__icon entry-item__icon--green">
            <image class="entry-item__emoji" :src="emojiIcons.smile" mode="aspectFit" />
          </view>
          <text class="entry-item__text">新朋友</text>
          <view v-if="messagesStore.pendingHeartSignals.length > 0" class="entry-item__badge">
            <text class="entry-item__badge-text">{{ messagesStore.pendingHeartSignals.length }}</text>
          </view>
        </view>
        <view class="entry-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="handleEntryClick('group-chat')">
          <view class="entry-item__icon entry-item__icon--blue">
            <image class="entry-item__emoji" :src="emojiIcons.group" mode="aspectFit" />
          </view>
          <text class="entry-item__text">群聊</text>
        </view>
        <view class="entry-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="handleEntryClick('notification')">
          <view class="entry-item__icon entry-item__icon--orange">
            <image class="entry-item__emoji" :src="emojiIcons.notification" mode="aspectFit" />
          </view>
          <text class="entry-item__text">通知</text>
          <view v-if="messagesStore.unreadNotificationCount > 0" class="entry-item__badge">
            <text class="entry-item__badge-text">
              {{ messagesStore.unreadNotificationCount > 99 ? "99+" : messagesStore.unreadNotificationCount }}
            </text>
          </view>
        </view>
        <view class="entry-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="handleEntryClick('assistant')">
          <view class="entry-item__icon entry-item__icon--pink">
            <image class="entry-item__emoji" :src="emojiIcons.gift" mode="aspectFit" />
          </view>
          <text class="entry-item__text">助手</text>
        </view>
      </view>

      <!-- 心动信号 Banner -->
      <view v-if="hasPendingHeartSignal" class="heart-signal-banner">
        <view
          v-for="signal in messagesStore.pendingHeartSignals"
          :key="signal.id"
          class="heart-signal-card list-item"
          :class="{ 'heart-signal-card--expiring': isSignalExpiringSoon(signal) }"
        >
          <view class="heart-signal-card__left">
            <view class="heart-signal-card__avatar">
              <text v-if="!signal.fromUserAvatar" class="heart-signal-card__avatar-text">
                {{ signal.fromUserName.charAt(0) }}
              </text>
              <SafeImage v-else :src="signal.fromUserAvatar" custom-class="heart-signal-card__avatar-img" mode="aspectFill" />
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
              @tap="handleHeartSignalChat(signal.id)"
            >
              {{ countdownMap[signal.id] === "已过期" ? "已过期" : "直接开聊" }}
            </button>
          </view>
        </view>
      </view>

      <!-- 社交升温迷你入口 -->
      <view
        v-if="socialProgressStore.progress && socialProgressStore.progress.currentTier !== 'L6_SCENE'"
        class="social-warming-hint press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="openAppPath('/pages/profile/index')"
      >
        <SafeImage :src="iconSrc.heartSignal" custom-class="social-warming-hint__icon" mode="aspectFit" />
        <text class="social-warming-hint__text">
          社交升温 {{ socialProgressStore.progress.progressPercentage ?? 0 }}%
        </text>
        <text class="social-warming-hint__action">查看详情 &rsaquo;</text>
      </view>

      <!-- 主分类标签：私信 / 系统通知 -->
      <view class="messages-tabs">
        <view
          class="messages-tabs__item press-feedback"
          :class="{ 'messages-tabs__item--active': activeTab === 'private' }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="activeTab = 'private'"
        >
          <text class="messages-tabs__text">私信</text>
          <view v-if="messagesStore.totalUnreadCount > 0" class="messages-tabs__dot">
            <text class="messages-tabs__dot-text">
              {{ messagesStore.totalUnreadCount > 99 ? "99+" : messagesStore.totalUnreadCount }}
            </text>
          </view>
        </view>
        <view
          class="messages-tabs__item press-feedback"
          :class="{ 'messages-tabs__item--active': activeTab === 'notifications' }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="activeTab = 'notifications'"
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
          class="signal-filter-tabs__item press-feedback"
          :class="{ 'signal-filter-tabs__item--active': signalFilter === 'all' }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="switchSignalFilter('all')"
        >
          <text class="signal-filter-tabs__text">全部</text>
        </view>
        <view
          class="signal-filter-tabs__item signal-filter-tabs__item--social press-feedback"
          :class="{ 'signal-filter-tabs__item--active': signalFilter === 'social' }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="switchSignalFilter('social')"
        >
          <text class="signal-filter-tabs__text">社交信号</text>
        </view>
        <view
          class="signal-filter-tabs__item signal-filter-tabs__item--content press-feedback"
          :class="{ 'signal-filter-tabs__item--active': signalFilter === 'content' }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="switchSignalFilter('content')"
        >
          <text class="signal-filter-tabs__text">内容信号</text>
        </view>
      </view>

      <!-- 加载状态（骨架屏） -->
      <view v-if="messagesStore.loading" class="messages-loading">
        <Skeleton variant="list" :count="4" />
      </view>

      <!-- 错误状态 -->
      <view v-else-if="messagesStore.errorMessage" class="messages-error">
        <ErrorState type="network" @retry="messagesStore.fetchSessions()" />
      </view>

      <!-- 空状态 -->
      <view v-else-if="showEmptyState" class="messages-empty">
        <EmptyState type="no-chat" message="暂无消息" />
      </view>

      <!-- 私信列表 -->
      <view v-else-if="activeTab === 'private'" class="session-list">
        <view
          v-for="(session, index) in privateSessionList"
          :key="session.id"
          class="session-row list-item"
          :class="{ 'session-row--pinned': session.pinned, 'session-row--last': index === privateSessionList.length - 1 && tempSessionList.length === 0 }"
          hover-class="session-row--hover"
          @tap="openSession(session.id)"
        >
          <view class="session-row__avatar-wrap">
            <view class="session-row__avatar" :class="{ 'session-row__avatar--vip': true }">
              <text v-if="!session.partnerAvatar" class="session-row__avatar-text">
                {{ session.partnerName.charAt(0) }}
              </text>
              <SafeImage v-else :src="session.partnerAvatar" custom-class="session-row__avatar-img" mode="aspectFill" />
              <view class="session-row__online-dot"></view>
            </view>
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
              <text class="session-row__preview">{{ session.lastMessagePreview || "暂无消息" }}</text>
              <text v-if="session.pinned" class="session-row__pin">置顶</text>
            </view>
          </view>
        </view>

        <!-- 临时匿名会话 -->
        <view
          v-for="(session, index) in tempSessionList"
          :key="session.id"
          class="session-row list-item session-row--temp"
          :class="{ 'session-row--last': index === tempSessionList.length - 1 }"
          hover-class="session-row--hover"
          @tap="openSession(session.id)"
        >
          <view class="session-row__avatar-wrap">
            <view class="session-row__avatar session-row__avatar--temp">
              <text class="session-row__avatar-text">?</text>
            </view>
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
              <text class="session-row__preview">{{ session.lastMessagePreview || "暂无消息" }}</text>
              <text class="session-row__temp-tag">临时</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Phase 3：系统通知列表（含信号分类样式） -->
      <view v-else-if="activeTab === 'notifications'" class="notification-list">
        <view
          v-for="(notification, index) in notificationList"
          :key="notification.id"
          class="notification-row list-item"
          :class="[
            { 'notification-row--unread': !notification.isRead, 'notification-row--last': index === notificationList.length - 1 },
            getSignalClass(notification)
          ]"
          hover-class="notification-row--hover"
          @tap="handleNotificationClick(notification)"
        >
          <!-- 信号类型图标 -->
          <view
            class="notification-row__icon"
            :class="`notification-row__icon--${notification.signalType === 'SOCIAL' ? 'social' : 'content'}`"
          >
            <SafeImage
              :src="getNotificationIcon(notification)"
              custom-class="notification-row__icon-img"
              mode="aspectFit"
            />
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

  <!-- 匹配成功引导弹窗 -->
  <MatchGuideOverlay
    v-if="showMatchGuide"
    :partner-name="matchGuideData.partnerName"
    :partner-avatar="matchGuideData.partnerAvatar"
    :icebreakers="matchGuideData.icebreakers"
    :common-circles="matchGuideData.commonCircles"
    :activities="matchGuideData.activities"
    :session-id="matchGuideData.sessionId"
    @close="handleMatchGuideClose"
    @start-chat="handleMatchGuideStartChat"
    @select-icebreaker="handleMatchGuideIcebreaker"
  />
</template>

<style scoped lang="scss">
.messages-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--c-gradient-page);
  padding: 0;
  padding-top: env(safe-area-inset-top);
  box-sizing: border-box;
  position: relative;
}

.messages-header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300rpx;
  background: var(--c-gradient-brand-overlay);
  pointer-events: none;
  z-index: 0;
}

/* ========== 页面标题 ========== */
.messages-header {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-6) var(--sp-8) var(--sp-4);
  position: relative;
  z-index: 1;
}

.messages-header__title {
  font-size: var(--fs-6xl);
  font-weight: 800;
  color: var(--c-text-primary);
  letter-spacing: 1rpx;
}

.messages-header__badge {
  min-width: var(--sp-9);
  height: var(--sp-9);
  padding: 0 var(--sp-2);
  border-radius: var(--r-full);
  background: var(--c-error);
  display: flex;
  align-items: center;
  justify-content: center;
}

.messages-header__badge-text {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-text-inverse);
}

/* ========== 搜索框 ========== */
.search-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin: 0 var(--sp-8) var(--sp-6);
  padding: var(--sp-5) var(--sp-7);
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  position: relative;
  z-index: 1;
}

.search-bar__icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: var(--sp-2);
  opacity: 0.5;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.search-bar__icon image {
  width: 100%;
  height: 100%;
}

.search-bar__placeholder {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

/* ========== 功能入口区 ========== */
.entry-section {
  display: flex;
  justify-content: space-around;
  padding: var(--sp-2) var(--sp-8) var(--sp-8);
  position: relative;
  z-index: 1;
}

.entry-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
}

.entry-item__icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.entry-item:active .entry-item__icon {
  transform: scale(0.95);
}

.entry-item__icon--green {
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
}

.entry-item__icon--blue {
  background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
  box-shadow: 0 var(--sp-2) var(--sp-5) rgba(59, 130, 246, 0.3);
}

.entry-item__icon--orange {
  background: linear-gradient(135deg, var(--c-apricot-100) 0%, var(--c-accent-400) 100%);
  box-shadow: 0 var(--sp-2) var(--sp-5) rgba(249, 115, 22, 0.3);
}

.entry-item__icon--pink {
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  box-shadow: var(--s-romance);
}

.entry-item__emoji {
  width: 48rpx;
  height: 48rpx;
  color: #ffffff;
  flex-shrink: 0;
}

.entry-item__text {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.entry-item__badge {
  position: absolute;
  top: -var(--sp-2);
  right: var(--sp-2);
  min-width: var(--sp-8);
  height: var(--sp-8);
  padding: 0 var(--sp-2);
  border-radius: var(--r-full);
  background: var(--c-error);
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--sp-1) solid var(--c-bg-page);
}

.entry-item__badge-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
}

/* ========== 心动信号 Banner ========== */
.heart-signal-banner {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  margin: 0 var(--sp-8) var(--sp-5);
  position: relative;
  z-index: 1;
}

.heart-signal-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-6);
  border-radius: var(--r-xl);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-romance-50) 100%);
  border: 1rpx solid rgba(63, 207, 142, 0.15);
}

.heart-signal-card--expiring {
  border-color: var(--c-error);
  border-width: 2rpx;
  animation: heart-signal-blink 1.5s ease-in-out infinite;
}

@keyframes heart-signal-blink {
  0%, 100% {
    border-color: var(--c-error);
    box-shadow: 0 0 0 0 rgba(229, 69, 77, 0);
  }
  50% {
    border-color: rgba(236, 72, 153, 0.5);
    box-shadow: 0 0 var(--sp-5) rgba(236, 72, 153, 0.3);
  }
}

.heart-signal-card__left {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  flex: 1;
  min-width: 0;
}

.heart-signal-card__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-brand), var(--c-romance-500));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--s-brand-sm);
}

.heart-signal-card__avatar-text {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.heart-signal-card__avatar-img {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
}

.heart-signal-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.heart-signal-card__name {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-primary);
}

.heart-signal-card__meta {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
}

.heart-signal-card__highlight {
  font-size: var(--fs-sm);
  color: var(--c-brand);
  line-height: 1.4;
  font-weight: 500;
}

.heart-signal-card__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--sp-2);
  flex-shrink: 0;
}

.heart-signal-card__countdown {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-error);
  font-variant-numeric: tabular-nums;
}

.heart-signal-card__btn {
  min-width: 140rpx;
  height: 56rpx;
  padding: 0 var(--sp-5);
  border: 0;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-brand) 0%, var(--c-romance-500) 100%);
  color: var(--c-text-inverse);
  font-size: var(--fs-base);
  font-weight: 700;
  line-height: 56rpx;
  text-align: center;
  box-shadow: var(--s-brand);
}

.heart-signal-card__btn::after {
  border: none;
}

.heart-signal-card__btn:disabled {
  background: var(--c-neutral-100);
  color: var(--c-text-tertiary);
  box-shadow: none;
}

/* ========== 社交升温迷你入口 ========== */
.social-warming-hint {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-6);
  margin: 0 var(--sp-8) var(--sp-4);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-romance-50));
  border-radius: var(--r-lg);
  position: relative;
  z-index: 1;
}

.social-warming-hint__icon {
  width: var(--sp-7);
  height: var(--sp-7);
  flex-shrink: 0;
}

.social-warming-hint__text {
  flex: 1;
  font-size: var(--fs-base);
  color: var(--c-brand);
  font-weight: 600;
}

.social-warming-hint__action {
  font-size: var(--fs-sm);
  color: var(--c-romance-500);
  font-weight: 500;
}

/* ========== 主分类标签 ========== */
.messages-tabs {
  display: flex;
  gap: var(--sp-10);
  padding: 0 var(--sp-8);
  margin-bottom: var(--sp-2);
  position: relative;
  z-index: 1;
}

.messages-tabs__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding-bottom: var(--sp-5);
}

.messages-tabs__text {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-tertiary);
  transition: all 0.2s ease;
}

.messages-tabs__item--active .messages-tabs__text {
  color: var(--c-text-primary);
  font-size: var(--fs-2xl);
  font-weight: 700;
}

.messages-tabs__item--active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: var(--sp-10);
  height: 6rpx;
  border-radius: var(--r-sm);
  background: linear-gradient(90deg, var(--c-brand), var(--c-romance-500));
}

.messages-tabs__dot {
  min-width: var(--sp-7);
  height: var(--sp-7);
  padding: 0 var(--sp-1);
  border-radius: var(--r-full);
  background: var(--c-error);
  display: flex;
  align-items: center;
  justify-content: center;
}

.messages-tabs__dot-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
}

/* ========== Phase 3：信号分类筛选 Tab ========== */
.signal-filter-tabs {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-8) var(--sp-5);
  position: relative;
  z-index: 1;
}

.signal-filter-tabs__item {
  position: relative;
  padding: var(--sp-3) var(--sp-7);
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  transition: all 0.2s ease;
}

.signal-filter-tabs__text {
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--c-text-secondary);
  transition: color 0.2s ease;
}

.signal-filter-tabs__item--active {
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
}

.signal-filter-tabs__item--active .signal-filter-tabs__text {
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== 加载与错误状态 ========== */
.messages-loading,
.messages-error {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-10) var(--sp-10);
  position: relative;
  z-index: 1;
}

/* ========== 空状态 ========== */
.messages-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: var(--sp-10) var(--sp-10);
  position: relative;
  z-index: 1;
}

/* ========== 会话列表 ========== */
.session-list {
  margin: 0 var(--sp-8);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  position: relative;
  z-index: 1;
}

.session-row {
  display: flex;
  align-items: center;
  gap: var(--sp-6);
  padding: var(--sp-6) var(--sp-8);
  background: var(--c-bg-container);
  position: relative;
  transition: transform 0.15s ease, background 0.15s ease;
}

.session-row:not(.session-row--last)::after {
  content: "";
  position: absolute;
  left: 136rpx;
  right: 0;
  bottom: 0;
  height: 1rpx;
  background: var(--c-divider-light);
}

.session-row--hover {
  background: var(--c-neutral-50);
  transform: scale(0.98);
}

.session-row__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.session-row__avatar {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand));
  display: flex;
  align-items: center;
  justify-content: center;
}

.session-row__avatar--vip {
  padding: var(--sp-1);
  background: linear-gradient(135deg, var(--c-brand) 0%, var(--c-romance-500) 50%, var(--c-vip-to) 100%);
}

.session-row__avatar-img {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-full);
  border: var(--sp-1) solid var(--c-bg-container);
  box-sizing: border-box;
}

.session-row__avatar--temp {
  background: linear-gradient(135deg, var(--c-neutral-100), var(--c-neutral-200));
  padding: 0;
}

.session-row__avatar-text {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.session-row__avatar--temp .session-row__avatar-text {
  color: var(--c-text-secondary);
}

.session-row__online-dot {
  position: absolute;
  right: var(--sp-1);
  bottom: var(--sp-1);
  width: 18rpx;
  height: 18rpx;
  border-radius: var(--r-full);
  background: var(--c-success);
  border: var(--sp-1) solid var(--c-bg-container);
}

.session-row__unread {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  min-width: var(--sp-8);
  height: var(--sp-8);
  padding: 0 var(--sp-2);
  border-radius: var(--r-full);
  background: var(--c-error);
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--sp-1) solid var(--c-bg-container);
  z-index: 1;
}

.session-row__unread-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
}

.session-row__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.session-row__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sp-4);
}

.session-row__name {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.session-row__time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.session-row__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sp-3);
}

.session-row__preview {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.session-row__pin,
.session-row__temp-tag {
  font-size: 18rpx;
  font-weight: 600;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-sm);
  flex-shrink: 0;
}

.session-row__pin {
  background: var(--c-bg-brand);
  color: var(--c-brand);
}

.session-row__temp-tag {
  background: var(--c-romance-50);
  color: var(--c-romance-500);
}

/* ========== Phase 3：通知列表 ========== */
.notification-list {
  margin: 0 var(--sp-8);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  position: relative;
  z-index: 1;
}

.notification-row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-6);
  padding: var(--sp-6) var(--sp-8);
  background: var(--c-bg-container);
  position: relative;
  transition: transform 0.15s ease, background 0.15s ease;
}

.notification-row:not(.notification-row--last)::after {
  content: "";
  position: absolute;
  left: 136rpx;
  right: 0;
  bottom: 0;
  height: 1rpx;
  background: var(--c-divider-light);
}

.notification-row--hover {
  background: var(--c-neutral-50);
  transform: scale(0.98);
}

.notification-row--unread {
  background: rgba(63, 207, 142, 0.02);
}

/* 社交信号未读行高亮 */
.notification-row--unread.signal-social {
  background: rgba(236, 72, 153, 0.03);
}

/* 内容信号未读行高亮 */
.notification-row--unread.signal-content {
  background: rgba(63, 207, 142, 0.03);
}

/* ===== 通知图标 ===== */
.notification-row__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification-row__icon-img {
  width: 34rpx;
  height: 34rpx;
}

.notification-row__icon--social {
  background: linear-gradient(135deg, var(--c-romance-50), var(--c-romance-100));
}

.notification-row__icon--content {
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-100));
}

/* ===== 通知内容区 ===== */
.notification-row__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.notification-row__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sp-4);
}

.notification-row__title-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex: 1;
  min-width: 0;
}

/* 信号类型标签 */
.notification-row__signal-tag {
  font-size: 18rpx;
  font-weight: 600;
  padding: 2rpx var(--sp-2);
  border-radius: var(--r-xs);
  flex-shrink: 0;
  line-height: 1.6;
}

.notification-row__signal-tag--social {
  background: var(--c-romance-50);
  color: var(--c-romance-500);
}

.notification-row__signal-tag--content {
  background: var(--c-bg-brand);
  color: var(--c-brand);
}

.notification-row__title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-row__time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.notification-row__body {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

/* 操作按钮区域 */
.notification-row__action {
  display: flex;
  margin-top: var(--sp-2);
}

.notification-row__action-btn {
  font-size: var(--fs-sm);
  font-weight: 600;
  padding: var(--sp-2) var(--sp-6);
  border-radius: var(--r-full);
  line-height: 1.4;
  transition: all 0.2s ease;
}

/* 社交信号按钮：粉色 */
.notification-row__action-btn--social {
  background: var(--c-romance-50);
  color: var(--c-romance-500);
}

/* 内容信号按钮：绿色 */
.notification-row__action-btn--content {
  background: var(--c-bg-brand);
  color: var(--c-brand);
}

/* 未读标记点 */
.notification-row__dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
  margin-top: var(--sp-2);
}

.notification-row__dot--social {
  background: var(--c-romance-500);
}

.notification-row__dot--content {
  background: var(--c-brand);
}
</style>
