<script setup lang="ts">
/**
 * 消息页 - 私信+心动信号+系统通知
 * 展示私信聊天列表、心动信号通知和系统通知
 * Phase 3 新增：社交信号/内容信号分类筛选
 */
import { computed, ref, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
import { useMessagesStore, type SystemNotification } from "../../stores/messages";
import { useLikesStore } from "../../stores/likes";
import { useProfileStore } from "../../stores/profile";
import { useSocialProgressStore } from "../../stores/social-progress";
import { openAppPath } from "../../utils/navigation";
import LockScreen from "../../components/common/LockScreen.vue";
import GlobalPublishFab from "../../components/common/GlobalPublishFab.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { messagesPageRequirements } from "../../config/page-access";
import { featureFlags } from "../../config/feature-flags";
import MatchGuideOverlay from "../../components/social/MatchGuideOverlay.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import PageStateContainer from "../../components/common/PageStateContainer.vue";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
import BaseTabs, { type BaseTab } from "../../components/common/BaseTabs.vue";
import { showErrorToast } from "../../utils/error-toast";

/** Emoji 替换 SVG 图标路径 */
const emojiIcons = {
  search: IMAGE_PATHS.ICONS_EMOJI.SEARCH,
  group: IMAGE_PATHS.ICONS_EMOJI.GROUP,
  smile: IMAGE_PATHS.ICONS_EMOJI.SMILE,
  notification: IMAGE_PATHS.ICONS_COMMON.NOTIFICATION_SVG,
  gift: IMAGE_PATHS.ICONS_EMOJI.GIFT,
  heartFilled: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED,
  eye: IMAGE_PATHS.ICONS_EMOJI.EYE,
  lock: IMAGE_PATHS.ICONS_EMOJI.LOCK,
  megaphone: IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE,
} as const;

const { t } = useI18n();
const sessionStore = useSessionStore();

// Phase 4 任务 20：接入页面访问守卫，触发 UnlockGuideModal 引导（替代静默重定向）
usePageAccess(messagesPageRequirements);
const messagesStore = useMessagesStore();
const socialProgressStore = useSocialProgressStore();

/** Phase 4.3 验收 · 喜欢我的人数量（未解锁也展示，点击走解锁提示） */
const likedMeCount = computed(() => {
  try {
    const likesStore = useLikesStore();
    return likesStore.likedBy.length;
  } catch (_e) {
    return 0;
  }
});

/** Phase 4.3 验收 · 访客数量 */
const visitorsCount = computed(() => {
  try {
    const profileStore = useProfileStore();
    return profileStore.profileStats?.visitorsCount ?? 0;
  } catch (_e) {
    return 0;
  }
});

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

/**
 * 功能5：通知分类筛选类型
 * - all: 全部通知
 * - interaction: 互动类（like/comment/follow/visitor/interaction_like）
 * - system: 系统类（system/activity）
 * - chat: 聊天类（match/interaction_match，匹配后通常会发起聊天）
 */
type NotificationCategory = "all" | "interaction" | "system" | "chat";

/** 功能5：当前选中的通知分类 */
const categoryFilter = ref<NotificationCategory>("all");

/** 主分类标签配置：私信 / 系统通知，徽章显示未读数 */
const mainTabs = computed(() => [
  { key: "private", label: t("messages.private"), badge: messagesStore.totalUnreadCount || undefined },
  { key: "notifications", label: t("messages.systemNotifications"), badge: messagesStore.unreadNotificationCount || undefined },
]);

/**
 * 功能5：通知分类标签配置：全部 / 互动 / 系统 / 聊天
 * 替代原 signalTabs，提供更直观的业务分类入口
 */
const categoryTabs = computed<BaseTab[]>(() => [
  { key: "all", label: t("messages.categoryAll") },
  { key: "interaction", label: t("messages.categoryInteraction") },
  { key: "system", label: t("messages.categorySystem") },
  { key: "chat", label: t("messages.categoryChat") },
]);

/**
 * 功能5：通知类型分组常量。
 *
 * 性能优化（P1）：原实现将三个 Set 声明在 computed 内部，每次 computed 重新求值都会重建 Set，
 * 在通知列表较大或频繁切换 categoryFilter 时会产生不必要的 GC 压力。
 * 现将常量 Set 提到 computed 外部，仅初始化一次，computed 内部直接复用引用。
 */
const INTERACTION_TYPES = new Set(["like", "comment", "follow", "visitor", "interaction_like"]);
const SYSTEM_TYPES = new Set(["system", "activity"]);
const CHAT_TYPES = new Set(["match", "interaction_match"]);

/**
 * 功能5：根据 categoryFilter 过滤后的通知列表
 * - all: 返回全部通知
 * - interaction: like/comment/follow/visitor/interaction_like 类通知
 * - system: system/activity 类通知
 * - chat: match/interaction_match 类通知（匹配后通常发起聊天）
 */
const categorizedNotifications = computed(() => {
  const list = messagesStore.filteredNotifications;
  if (categoryFilter.value === "all") return list;
  if (categoryFilter.value === "interaction") {
    return list.filter((n) => INTERACTION_TYPES.has(n.type));
  }
  if (categoryFilter.value === "system") {
    return list.filter((n) => SYSTEM_TYPES.has(n.type));
  }
  // chat
  return list.filter((n) => CHAT_TYPES.has(n.type));
});

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
 * 功能5：使用 categorizedNotifications，根据 categoryFilter 过滤
 * Phase 3：原 filteredNotifications 仍作为底层数据源
 */
const notificationList = computed(() => categorizedNotifications.value);

/** 是否显示空状态 */
const showEmptyState = computed(() => {
  if (activeTab.value === "private") {
    return privateSessionList.value.length === 0 && tempSessionList.value.length === 0;
  }
  return notificationList.value.length === 0;
});

/**
 * 统一页面状态映射
 * - loading → loading
 * - errorMessage → error
 * - showEmptyState → empty
 * - 其他 → content（私信列表 / 系统通知列表）
 */
const pageState = computed<"loading" | "error" | "empty" | "content">(() => {
  if (messagesStore.loading) return "loading";
  if (messagesStore.errorMessage) return "error";
  if (showEmptyState.value) return "empty";
  return "content";
});

/**
 * 错误态展示文案（复用 store 中的 errorMessage，缺失时回退到通用文案）
 */
const errorText = computed(() => messagesStore.errorMessage || t("messages.loadFailed"));

/**
 * 重试：重新拉取会话列表
 */
function handleRetry() {
  void messagesStore.fetchSessions();
}

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
      countdownMap.value[signal.id] = t("messages.expired");
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
 * 接受信号后展示匹配引导弹窗
 */
async function handleHeartSignalChat(signalId: string) {
  try {
    const session = await messagesStore.acceptHeartSignal(signalId);
    if (session) {
      // 获取匹配对象信息
      const signal = messagesStore.pendingHeartSignals.find(s => s.id === signalId);
      matchGuideData.value = {
        partnerName: signal?.fromUserName ?? t("messages.partner"),
        partnerAvatar: signal?.fromUserAvatar ?? "",
        icebreakers: [
          t("messages.icebreaker1"),
          t("messages.icebreaker2"),
          t("messages.icebreaker3"),
        ],
        commonCircles: [],
        activities: [],
        sessionId: session.id,
      };
      showMatchGuide.value = true;
    }
  } catch (error) {
    // 优先使用 store 中已格式化的 errorMessage，其次按错误分类选择文案
    const storeMessage = messagesStore.errorMessage;
    if (storeMessage) {
      uni.showToast({ title: storeMessage, icon: "none" });
    } else {
      showErrorToast(error, t("messages.operationFailed"));
    }
    console.error("接受心动信号失败:", error);
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
  return notification.signalType === "SOCIAL" ? t("messages.socialSignal") : t("messages.contentSignal");
}

/**
 * Phase 3：获取通知操作按钮文本
 * 社交信号 → "立即查看"（红色强调）
 * 内容信号 → "查看详情"（蓝色）
 */
function getActionLabel(notification: SystemNotification): string {
  return notification.signalType === "SOCIAL" ? t("messages.viewNow") : t("messages.viewDetail");
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
    case "liked-me":
      // Phase Feedback3：喜欢你的需解锁（会员/交友币/道具）。会员未上线，提示解锁方式。
      handleUnlockTap("likedMe");
      break;
    case "visitors":
      // Phase Feedback3：访客需解锁
      handleUnlockTap("visitors");
      break;
    case "notification":
      activeTab.value = "notifications";
      break;
  }
}

/** Phase Feedback3：解锁提示（会员未上线 → 交友币/道具） */
function handleUnlockTap(kind: "likedMe" | "visitors") {
  const title =
    kind === "likedMe"
      ? t("messages.unlockLikedMe")
      : t("messages.unlockVisitors");
  uni.showModal({
    title,
    content: t("messages.unlockByCoin"),
    showCancel: false,
    confirmText: t("common.ok"),
  });
}

/** Phase Feedback3：官方号会话列表（助手 + 活动推送） */
const officialAccounts = [
  {
    id: "official-assistant",
    nameKey: "messages.officialAssistant",
    descKey: "messages.officialAssistantDesc",
    icon: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED,
  },
  {
    id: "official-promoter",
    nameKey: "messages.officialPromoter",
    descKey: "messages.officialPromoterDesc",
    icon: IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE,
  },
] as const;

/** 点击官方号：当前为占位提示（后续接入官方号会话页） */
function handleOfficialTap(accountId: string) {
  const account = officialAccounts.find((a) => a.id === accountId);
  uni.showToast({
    title: account ? t(account.nameKey) : "",
    icon: "none",
  });
}

/** 收尾轮：全局 FAB publish 事件 → 发帖编辑页 */
function goToPublishTopic() {
  openAppPath("/pages/circles/post-topic");
}

/** Phase Feedback3：心动信号改名"缘分速配"（随机匹配 + 消息解锁规则） */
const fateMatchRuleHints = [
  "messages.heartSignalRule3",
  "messages.heartSignalRule2",
  "messages.heartSignalRule1",
] as const;

/** 搜索框点击 */
function handleSearchClick() {
  uni.showToast({ title: t("messages.searchWip"), icon: "none" });
}

/**
 * 长按私信会话触发删除流程。
 *
 * 流程：
 * 1. 弹出确认 Modal，避免误触删除重要会话
 * 2. 用户确认后调用 messagesStore.deleteSession
 * 3. 成功 toast 提示，失败 toast 提示错误信息
 *
 * @param sessionId 待删除的会话 ID
 */
function handleSessionLongPress(sessionId: string) {
  const session = messagesStore.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const wasPinned = session.pinned;
  const pinLabel = wasPinned ? t("messages.unpinSession") : t("messages.pinSession");
  uni.showActionSheet({
    itemList: [pinLabel, t("common.delete")],
    itemColor: "#333333",
    success: (res) => {
      if (res.tapIndex === 0) {
        messagesStore.toggleSessionPin(sessionId);
        uni.showToast({
          title: wasPinned ? t("messages.unpinned") : t("messages.pinned"),
          icon: "none",
        });
        return;
      }
      if (res.tapIndex === 1) {
        // 调用 store 删除会话，失败时由 store 设置 errorMessage
        void messagesStore
          .deleteSession(sessionId)
          .then(() => {
            uni.showToast({ title: t("messages.deleted"), icon: "success" });
          })
          .catch(() => {
            uni.showToast({
              title: messagesStore.errorMessage || t("messages.deleteFailed"),
              icon: "none",
            });
          });
      }
    },
  });
}

/**
 * 一键标记所有通知为已读。
 *
 * 调用 messagesStore.markAllNotificationsRead，成功后 toast 提示；
 * 失败时 store 会保留未读状态，此处 toast 提示用户重试。
 */
async function handleMarkAllNotificationsRead() {
  try {
    await messagesStore.markAllNotificationsRead();
    uni.showToast({ title: t("messages.markAllReadSuccess"), icon: "success" });
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : t("messages.markAllReadFailed"),
      icon: "none",
    });
  }
}
</script>

<template>
  <view class="messages-page page-fade-in">
    <!-- 未完善资料：显示锁定页面 -->
    <LockScreen
      v-if="!isUnlocked"
      :page-name="t('messages.pageName')"
      :completion-percent="completionPercent"
    />

    <!-- 已完善资料：显示正常内容 -->
    <template v-else>
      <!-- 页面顶部渐变氛围 -->
      <view class="messages-header-overlay" />
      
      <!-- 页面标题 -->
      <view class="messages-header">
        <text class="messages-header__title">{{ t('messages.title') }}</text>
        <view v-if="messagesStore.totalUnreadCount > 0" class="messages-header__badge">
          <text class="messages-header__badge-text">
            {{ messagesStore.totalUnreadCount > 99 ? "99+" : messagesStore.totalUnreadCount }}
          </text>
        </view>
      </view>

      <!-- 搜索框 -->
      <view class="search-bar press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('messages.search')" @tap="handleSearchClick">
        <view class="search-bar__icon">
          <image :src="emojiIcons.search" mode="aspectFit" alt="" />
        </view>
        <text class="search-bar__placeholder">{{ t('messages.search') }}</text>
      </view>

      <!-- 功能入口区（Phase Feedback3：新增喜欢你的/访客，移除群聊；官方号独立区块） -->
      <view class="entry-section" role="list">
        <view class="entry-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('messages.newFriends')" @tap="handleEntryClick('new-friend')">
          <view class="entry-item__icon entry-item__icon--green">
            <image class="entry-item__emoji" :src="emojiIcons.smile" mode="aspectFit" alt="" />
          </view>
          <text class="entry-item__text">{{ t('messages.newFriends') }}</text>
          <view v-if="messagesStore.pendingHeartSignals.length > 0" class="entry-item__badge">
            <text class="entry-item__badge-text">{{ messagesStore.pendingHeartSignals.length }}</text>
          </view>
        </view>
        <!-- Phase Feedback3 · 喜欢你的（需解锁） -->
        <view class="entry-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('messages.likedMe')" @tap="handleEntryClick('liked-me')">
          <view class="entry-item__icon entry-item__icon--red">
            <image class="entry-item__emoji" :src="emojiIcons.heartFilled" mode="aspectFit" alt="" />
          </view>
          <text class="entry-item__text">{{ t('messages.likedMe') }}</text>
          <view v-if="likedMeCount > 0" class="entry-item__badge entry-item__badge--locked">
            <text class="entry-item__badge-text">{{ likedMeCount > 99 ? "99+" : likedMeCount }}</text>
          </view>
          <image class="entry-item__lock" :src="emojiIcons.lock" mode="aspectFit" alt="" />
        </view>
        <!-- Phase Feedback3 · 访客（需解锁） -->
        <view class="entry-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('messages.visitorsEntry')" @tap="handleEntryClick('visitors')">
          <view class="entry-item__icon entry-item__icon--blue">
            <image class="entry-item__emoji" :src="emojiIcons.eye" mode="aspectFit" alt="" />
          </view>
          <text class="entry-item__text">{{ t('messages.visitorsEntry') }}</text>
          <view v-if="visitorsCount > 0" class="entry-item__badge entry-item__badge--locked">
            <text class="entry-item__badge-text">{{ visitorsCount > 99 ? "99+" : visitorsCount }}</text>
          </view>
          <image class="entry-item__lock" :src="emojiIcons.lock" mode="aspectFit" alt="" />
        </view>
        <view class="entry-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('messages.notice')" @tap="handleEntryClick('notification')">
          <view class="entry-item__icon entry-item__icon--orange">
            <image class="entry-item__emoji" :src="emojiIcons.notification" mode="aspectFit" alt="" />
          </view>
          <text class="entry-item__text">{{ t('messages.notice') }}</text>
          <view v-if="messagesStore.unreadNotificationCount > 0" class="entry-item__badge">
            <text class="entry-item__badge-text">
              {{ messagesStore.unreadNotificationCount > 99 ? "99+" : messagesStore.unreadNotificationCount }}
            </text>
          </view>
        </view>
      </view>

      <!-- Phase Feedback3 · 官方号区块（助手 + 活动推送） -->
      <view class="official-section" role="list">
        <view
          v-for="account in officialAccounts"
          :key="account.id"
          class="official-item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t(account.nameKey)"
          @tap="handleOfficialTap(account.id)"
        >
          <view class="official-item__avatar">
            <image class="official-item__avatar-emoji" :src="account.icon" mode="aspectFit" alt="" />
          </view>
          <view class="official-item__info">
            <view class="official-item__name-row">
              <text class="official-item__name">{{ t(account.nameKey) }}</text>
              <text class="official-item__badge">{{ t('messages.officialBadge') }}</text>
            </view>
            <text class="official-item__desc">{{ t(account.descKey) }}</text>
          </view>
          <text class="official-item__arrow">›</text>
        </view>
      </view>

      <!-- 心动信号 Banner（Phase Feedback3：改名"缘分速配"，展示解锁规则） -->
      <view v-if="featureFlags.heartSignalEnabled && hasPendingHeartSignal" class="heart-signal-banner">
        <view class="heart-signal-banner__header">
          <text class="heart-signal-banner__title">{{ t('messages.heartSignalNewName') }}</text>
          <text class="heart-signal-banner__subtitle">{{ t('messages.heartSignalNewNameDesc') }}</text>
        </view>
        <view class="heart-signal-banner__rules">
          <text
            v-for="(rule, idx) in fateMatchRuleHints"
            :key="idx"
            class="heart-signal-banner__rule"
          >• {{ t(rule) }}</text>
        </view>
        <view
          v-for="signal in messagesStore.pendingHeartSignals" :key="signal.id"
          class="heart-signal-card list-item"
          :class="{ 'heart-signal-card--expiring': isSignalExpiringSoon(signal) }"
        >
          <view class="heart-signal-card__left">
            <view class="heart-signal-card__avatar">
              <text v-if="!signal.fromUserAvatar" class="heart-signal-card__avatar-text">
                {{ signal.fromUserName.charAt(0) }}
              </text>
              <SafeImage v-else :src="signal.fromUserAvatar" custom-class="heart-signal-card__avatar-img" mode="aspectFill" :lazy-load="true" />
            </view>
            <view class="heart-signal-card__info">
              <text class="heart-signal-card__name">{{ signal.fromUserName }}</text>
              <text class="heart-signal-card__meta">
                {{ t('messages.heartSignalInitialInfo') }}
              </text>
              <text class="heart-signal-card__highlight">{{ signal.bioHighlight }}</text>
            </view>
          </view>
          <view class="heart-signal-card__right">
            <text class="heart-signal-card__countdown">{{ countdownMap[signal.id] || "--:--:--" }}</text>
            <button
              class="heart-signal-card__btn"
              :disabled="signal.status === 'expired' || countdownMap[signal.id] === t('messages.expired')"
              @tap="handleHeartSignalChat(signal.id)"
            >
              {{ countdownMap[signal.id] === t("messages.expired") ? t("messages.expired") : t("messages.startChatNow") }}
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
        role="button"
        :aria-label="t('messages.socialWarming')"
        @tap="openAppPath('/pages/profile/index')"
      >
        <SafeImage :src="iconSrc.heartSignal" custom-class="social-warming-hint__icon" mode="aspectFit" />
        <text class="social-warming-hint__text">
          {{ t('messages.socialWarming') }} {{ socialProgressStore.progress.progressPercentage ?? 0 }}%
        </text>
        <text class="social-warming-hint__action">{{ t('messages.viewDetailArrow') }}</text>
      </view>

      <!-- 主分类标签：私信 / 系统通知 -->
      <BaseTabs
        v-model="activeTab"
        :tabs="mainTabs"
        variant="underline"
        :equal-split="false"
        badge-color="var(--c-error, #E5454D)"
      />

      <!-- 功能5：通知分类筛选 Tab（全部 / 互动 / 系统 / 聊天） -->
      <BaseTabs
        v-if="activeTab === 'notifications'"
        v-model="categoryFilter"
        :tabs="categoryTabs"
        variant="pill"
        :equal-split="false"
      />

      <!-- 一键标记所有通知为已读（仅在通知 Tab 且存在未读时显示） -->
      <view
        v-if="activeTab === 'notifications' && messagesStore.unreadNotificationCount > 0"
        class="mark-all-read-btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('messages.markAllRead')"
        @tap="handleMarkAllNotificationsRead"
      >
        <text class="mark-all-read-btn__text">{{ t('messages.markAllRead') }}</text>
      </view>

      <!-- 统一页面状态容器：loading / error / empty / content 四态切换 -->
      <PageStateContainer :state="pageState" :error-text="errorText" @retry="handleRetry">
        <template #loading>
          <view class="messages-loading">
            <Skeleton variant="list" :count="4" />
          </view>
        </template>
        <template #error>
          <view class="messages-error" role="alert">
            <ErrorState type="network" @retry="handleRetry" />
          </view>
        </template>
        <template #empty>
          <view class="messages-empty">
            <EmptyState type="no-chat" :message="t('messages.emptyTitle')" />
          </view>
        </template>
        <template #default>
          <!-- 私信列表 -->
          <view v-if="activeTab === 'private'" class="session-list" role="list">
        <view
          v-for="(session, index) in privateSessionList" :key="session.id"
          class="session-row list-item"
          :class="{ 'session-row--pinned': session.pinned, 'session-row--last': index === privateSessionList.length - 1 && tempSessionList.length === 0 }"
          hover-class="session-row--hover"
          @tap="openSession(session.id)"
          @longpress="handleSessionLongPress(session.id)"
        >
          <view class="session-row__avatar-wrap">
            <view class="session-row__avatar">
              <text v-if="!session.partnerAvatar" class="session-row__avatar-text">
                {{ session.partnerName.charAt(0) }}
              </text>
              <SafeImage v-else :src="session.partnerAvatar" custom-class="session-row__avatar-img" mode="aspectFill" :lazy-load="true" />
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
              <text class="session-row__preview">{{ session.lastMessagePreview || t('messages.emptyTitle') }}</text>
              <text v-if="session.pinned" class="session-row__pin">{{ t('messages.pinned') }}</text>
            </view>
          </view>
        </view>

        <!-- 临时匿名会话 -->
        <view
          v-for="(session, index) in tempSessionList" :key="session.id"
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
              <text class="session-row__preview">{{ session.lastMessagePreview || t('messages.emptyTitle') }}</text>
              <text class="session-row__temp-tag">{{ t('messages.temp') }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Phase 3：系统通知列表（含信号分类样式） -->
      <view v-else-if="activeTab === 'notifications'" class="notification-list" role="list">
        <view
          v-for="(notification, index) in notificationList" :key="notification.id"
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
      </PageStateContainer>
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

  <!-- 收尾轮：全局发帖 FAB（消息页补齐，publish → 发帖编辑页） -->
  <GlobalPublishFab @publish="goToPublishTopic" />
</template>

<style scoped lang="scss">
.messages-page {
  display: flex;
  flex-direction: column;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
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

/* ========== 一键标记所有通知为已读按钮 ========== */
.mark-all-read-btn {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin: 0 var(--sp-8) var(--sp-3);
  padding: var(--sp-2) var(--sp-4);
}

.mark-all-read-btn__text {
  font-size: var(--fs-sm);
  color: var(--c-brand-500);
  font-weight: 500;
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
  transition: transform var(--d-normal, 200ms) ease;
}

/* #ifdef H5 */
.entry-item:active .entry-item__icon {
  transform: scale(0.95);
}
/* #endif */

.entry-item__icon--green {
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
}

.entry-item__icon--blue {
  background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
  box-shadow: 0 var(--sp-2) var(--sp-5) var(--s-action-super);
}

.entry-item__icon--orange {
  background: linear-gradient(135deg, var(--c-apricot-100) 0%, var(--c-accent-400) 100%);
  box-shadow: 0 var(--sp-2) var(--sp-5) var(--c-tag-match-to);
}

.entry-item__icon--pink {
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  box-shadow: var(--s-romance);
}

/* Phase Feedback3 · 入口 emoji 文字与锁标识 */
.entry-item__icon--red {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  box-shadow: 0 var(--sp-2) var(--sp-5) rgba(225, 29, 72, 0.25);
}

.entry-item__badge--locked {
  margin-right: 8rpx;
}

.entry-item__lock {
  position: absolute;
  top: var(--sp-1);
  right: var(--sp-1);
  width: 28rpx;
  height: 28rpx;
  opacity: 0.85;
}

.entry-item__emoji {
  width: 48rpx;
  height: 48rpx;
  color: var(--c-neutral-0);
  flex-shrink: 0;
}

.entry-item__text {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.entry-item__badge {
  position: absolute;
  top: calc(-1 * var(--sp-2));
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

/* ========== 官方号区块（Phase Feedback3） ========== */
.official-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: 0 var(--sp-8) var(--sp-5);
  padding: var(--sp-4);
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: var(--s-card-soft, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.official-item {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-2);
  border-radius: var(--r-lg, 20rpx);
}

.official-item__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-lg, 20rpx);
  background: linear-gradient(135deg, var(--c-brand-400, #6fe0b0) 0%, var(--c-brand-500, #3fcf8e) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.official-item__avatar-emoji {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-brand-500);
}

.official-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.official-item__name-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.official-item__name {
  font-size: var(--fs-base, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.official-item__badge {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--c-brand-500, #3fcf8e);
  border: 1rpx solid var(--c-brand-300, #9be8c8);
  background: var(--c-brand-bg-tint, #e6f9f0);
  padding: 2rpx 10rpx;
  border-radius: var(--r-full, 999rpx);
}

.official-item__desc {
  font-size: var(--fs-xs, 24rpx);
  color: var(--c-text-tertiary, #9ca3af);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.official-item__arrow {
  font-size: var(--fs-2xl, 36rpx);
  color: var(--c-text-tertiary, #9ca3af);
}

/* ========== 心动信号 Banner（Phase Feedback3：缘分速配） ========== */
.heart-signal-banner {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  margin: 0 var(--sp-8) var(--sp-5);
  position: relative;
  z-index: 1;
}

.heart-signal-banner__header {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.heart-signal-banner__title {
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.heart-signal-banner__subtitle {
  font-size: var(--fs-xs, 24rpx);
  color: var(--c-text-tertiary, #9ca3af);
}

.heart-signal-banner__rules {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: var(--sp-3) var(--sp-4);
  background: var(--c-romance-bg-tint, #fdf2f8);
  border-radius: var(--r-lg, 20rpx);
}

.heart-signal-banner__rule {
  font-size: var(--fs-xs, 24rpx);
  color: var(--c-romance-500, #ec4899);
  line-height: 1.5;
}

.heart-signal-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-6);
  border-radius: var(--r-xl);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-romance-50) 100%);
  border: 1rpx solid var(--c-brand-shadow-tint);
}

.heart-signal-card--expiring {
  border-color: var(--c-error);
  border-width: 2rpx;
  animation: heart-signal-blink var(--d-particle, 1500ms) ease-in-out infinite;
}

@keyframes heart-signal-blink {
  0%, 100% {
    border-color: var(--c-error);
    box-shadow: 0 0 0 0 var(--c-error-bg-tint);
  }
  50% {
    border-color: var(--c-shadow-romance-tint-stronger);
    box-shadow: 0 0 var(--sp-5) var(--s-romance);
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
  /* 修复（P1 BUG）：原实现缺少文本裁剪，长昵称会推动布局错乱 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
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
  transition: transform var(--d-fast, 120ms) ease, background 0.15s ease;
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
  transition: transform var(--d-fast, 120ms) ease, background 0.15s ease;
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
  background: var(--c-gradient-card-atmosphere);
}

/* 社交信号未读行高亮 */
.notification-row--unread.signal-social {
  background: var(--c-romance-bg-tint);
}

/* 内容信号未读行高亮 */
.notification-row--unread.signal-content {
  background: var(--c-brand-bg-tint);
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
  transition: all var(--d-normal, 200ms) ease;
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
