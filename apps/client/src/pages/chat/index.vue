<script setup lang="ts">
/**
 * 聊天页 - 会话列表
 * 连接到 useMessagesStore 获取真实会话数据，替代硬编码模拟数据
 *
 * P1-09：无业务入口，仅保留。
 * tabBar「消息」已指向 /pages/messages/index（新版消息列表页），本页不再注册于
 * pages.json（2026-08-08 移除注册），仅保留源文件以防深链/旧缓存访问时兜底。
 * 相关引用已同步清理：pages/dev/index、pages/showcase/index 的入口条目与
 * constants/routes.ts 的 ROUTES.TAB.CHAT（改指 /pages/messages/index）。
 */
import { computed, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useMessagesStore } from "../../stores/messages";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
// infra R2-00082: 路由路径常量化
import { ROUTES } from "../../constants/routes";
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
import GlobalPublishFab from "../../components/common/GlobalPublishFab.vue";
// 谁喜欢我 / 我的访客：付费解锁（与 messages 页共用同一套交友币逻辑）
import { useCoinsStore, UNLOCK_COST_YUAN } from "../../stores/coins";
import { useVipStore } from "../../stores/vip";

// 同步自定义 TabBar 选中状态（tab 顺序：首页0/匹配1/圈子2/消息3/我的4）
useTabBar(3);

const { t } = useI18n();
const messagesStore = useMessagesStore();
const sessionStore = useSessionStore();
const coinsStore = useCoinsStore();
const vipStore = useVipStore();

// 页面访问守卫
usePageAccess(messagesPageRequirements);

const { loading, errorMessage } = storeToRefs(messagesStore);

/** 资料是否已完善 */
const isUnlocked = computed(() => sessionStore.isProfileComplete);
const completionPercent = computed(() => sessionStore.profileCompletion);

/** 默认头像（会话头像加载失败/为空时的兜底） */
const DEFAULT_AVATAR = IMAGE_PATHS.DEFAULT_AVATAR;

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
  openAppPath(`${ROUTES.CHAT.SESSION}?sessionId=${encodeURIComponent(sessionId)}`);
}

/** Task F：全局发帖 FAB publish 事件 → 发帖编辑页 */
function goToPublishTopic() {
  openAppPath(ROUTES.CIRCLES.POST_TOPIC);
}

/**
 * 点击"产品助手"系统会话卡片
 * 当前为占位提示，后续接入官方消息中心页
 */
function handleOfficialTap() {
  uni.showToast({ title: t("chat.officialWip"), icon: "none" });
}

/**
 * 点击"活动官"系统会话卡片
 * 当前为占位提示，后续接入活动推送会话
 */
function handleAssistantTap() {
  uni.showToast({ title: t("chat.assistantWip"), icon: "none" });
}

/**
 * 快捷入口：匿名匹配聊天（随机匹配陌生人）。
 * 入口卡片，进入心动信号页。
 */
function handleAnonymousMatch() {
  openAppPath(ROUTES.HEART_SIGNALS);
}

/**
 * 快捷入口：谁喜欢我 / 我的访客（付费解锁）。
 * 会员直接放行；其余弹确认扣交友币（UNLOCK_COST_YUAN.LIKES / VISITORS）后进入列表页。
 * @param type - 入口类型：liked=谁喜欢我，visitors=我的访客
 */
function handlePaidEntry(type: "liked" | "visitors") {
  const target = type === "liked" ? ROUTES.LIKES.INDEX : ROUTES.PROFILE.VISITORS;
  const cost = type === "liked" ? UNLOCK_COST_YUAN.LIKES : UNLOCK_COST_YUAN.VISITORS;
  if (vipStore.isVip) {
    openAppPath(target);
    return;
  }
  uni.showModal({
    title: t("chat.unlockAllTitle"),
    content: t("chat.unlockAllHint", { coins: cost }),
    confirmText: t("common.confirm"),
    cancelText: t("common.cancel"),
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await coinsStore.spend(type === "liked" ? "LIKES" : "VISITORS", "");
        uni.showToast({ title: t("discover.unlockSuccess"), icon: "success" });
        setTimeout(() => openAppPath(target), 400);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        uni.showModal({
          title: t("discover.unlockFailTitle"),
          content: message,
          confirmText: t("common.gotIt"),
          showCancel: false,
        });
      }
    },
  });
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

// 修复（严格模式 noUnusedLocals）：handleAnonymousMatch/handlePaidEntry 通过 @tap
// 绑定在模板（v-if 条件块内），vue-tsc 无法识别该场景，故通过 defineExpose 标记为已使用。
defineExpose({ handleAnonymousMatch, handlePaidEntry });
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
      <!-- 快捷功能入口区（设计需求）：匿名匹配聊天 / 谁喜欢我 / 我的访客 -->
      <view class="quick-entries" role="list">
        <view
          class="quick-entry press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('chat.anonymousMatch')"
          @tap="handleAnonymousMatch"
        >
          <view class="quick-entry__icon quick-entry__icon--signal">
            <image class="quick-entry__img" :src="IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL" mode="aspectFit" alt="" />
          </view>
          <text class="quick-entry__title">{{ t('chat.anonymousMatch') }}</text>
          <text class="quick-entry__desc">{{ t('chat.anonymousMatchDesc') }}</text>
        </view>
        <view
          class="quick-entry press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('chat.likedMe')"
          @tap="handlePaidEntry('liked')"
        >
          <view class="quick-entry__icon quick-entry__icon--like">
            <image class="quick-entry__img" :src="IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED" mode="aspectFit" alt="" />
          </view>
          <text class="quick-entry__title">{{ t('chat.likedMe') }}</text>
          <text class="quick-entry__desc">{{ t('chat.likedMeDesc') }}</text>
          <!-- 小锁标识（右下角，付费解锁） -->
          <view class="quick-entry__lock">
            <text class="quick-entry__lock-text">🔒</text>
          </view>
        </view>
        <view
          class="quick-entry press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('chat.myVisitors')"
          @tap="handlePaidEntry('visitors')"
        >
          <view class="quick-entry__icon quick-entry__icon--visitors">
            <image class="quick-entry__img" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
          </view>
          <text class="quick-entry__title">{{ t('chat.myVisitors') }}</text>
          <text class="quick-entry__desc">{{ t('chat.myVisitorsDesc') }}</text>
          <!-- 小锁标识（右下角，付费解锁） -->
          <view class="quick-entry__lock">
            <text class="quick-entry__lock-text">🔒</text>
          </view>
        </view>
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
        :enhanced="true"
        :bounces="true"
        :show-scrollbar="false"
        @refresherrefresh="onRefresh"
      >
        <!-- 骨架屏加载 -->
        <view v-if="loading" class="conversation-list" role="list">
          <Skeleton variant="list" :count="4" />
        </view>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="privateSessions.length === 0"
          type="no-chat"
          :title="t('chat.emptyTitle')"
          :description="t('chat.emptyDesc')"
        />

        <!-- 正常内容 -->
        <view v-else class="conversation-list card-base" role="list">
          <!-- 官方消息（系统固定卡片，不依赖 store 数据） -->
          <view
            class="conversation-item system-conversation-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('chat.officialAria')"
            @tap="handleOfficialTap"
          >
            <view class="conversation-item__avatar-wrap">
              <view class="system-avatar">
                <image class="system-avatar__img" :src="IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE" mode="aspectFit" alt="" />
              </view>
            </view>
            <view class="conversation-item__content">
              <view class="conversation-item__top">
                <view class="conversation-item__name-wrap">
                  <text class="conversation-item__name">{{ t('chat.officialTitle') }}</text>
                  <view class="conversation-item__pin-icon">
                    <image class="conversation-item__pin-img" :src="IMAGE_PATHS.ICONS_EMOJI.PIN" mode="aspectFit" alt="" />
                  </view>
                </view>
              </view>
              <view class="conversation-item__bottom">
                <text class="conversation-item__message">{{ t('chat.officialSubtitle') }}</text>
              </view>
            </view>
          </view>

          <!-- 小助手（系统固定卡片，不依赖 store 数据） -->
          <view
            class="conversation-item system-conversation-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('chat.assistantAria')"
            @tap="handleAssistantTap"
          >
            <view class="conversation-item__avatar-wrap">
              <view class="system-avatar">
                <image class="system-avatar__img" :src="IMAGE_PATHS.ICONS_EMOJI.SPARKLES" mode="aspectFit" lazy-load alt="" />
              </view>
            </view>
            <view class="conversation-item__content">
              <view class="conversation-item__top">
                <view class="conversation-item__name-wrap">
                  <text class="conversation-item__name">{{ t('chat.assistantTitle') }}</text>
                  <view class="conversation-item__pin-icon">
                    <image class="conversation-item__pin-img" :src="IMAGE_PATHS.ICONS_EMOJI.PIN" mode="aspectFit" alt="" />
                  </view>
                </view>
              </view>
              <view class="conversation-item__bottom">
                <text class="conversation-item__message">{{ t('chat.assistantSubtitle') }}</text>
              </view>
            </view>
          </view>

          <view
            v-for="conv in privateSessions" :key="conv.id"
            class="conversation-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="goToChat(conv.id)"
          >
            <view class="conversation-item__avatar-wrap">
              <view class="conversation-item__avatar">
                <SafeImage
                  :src="conv.partnerAvatar"
                  :fallback="DEFAULT_AVATAR"
                  mode="aspectFill"
                  :lazy-load="true"
                  :alt="conv.partnerName || ''"
                />
              </view>
              <!-- 在线指示器（当前暂无在线状态数据，保留结构） -->
            </view>
            <view class="conversation-item__content">
              <view class="conversation-item__top">
                <view class="conversation-item__name-wrap">
                  <text class="conversation-item__name">{{ conv.partnerName }}</text>
                  <view v-if="conv.pinned" class="conversation-item__pin-icon">
                    <image class="conversation-item__pin-img" :src="IMAGE_PATHS.ICONS_EMOJI.PIN" mode="aspectFit" alt="" />
                  </view>
                </view>
                <text class="conversation-item__time">{{ formatChatTime(conv.lastMessageSentAt) }}</text>
              </view>
              <view class="conversation-item__bottom">
                <text
                  class="conversation-item__message"
                  :class="{ 'conversation-item__message--read': conv.unreadCount === 0 }"
                >{{ conv.lastMessagePreview }}</text>
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

  <!-- Task F：全局发帖悬浮按钮（仅已解锁时显示，publish → 发帖编辑页） -->
  <GlobalPublishFab v-if="isUnlocked" @publish="goToPublishTopic" />
</template>

<style scoped lang="scss">
/* ========== 快捷功能入口区（设计需求：3 个均等宽度浅底圆角卡片） ========== */
.quick-entries {
  display: flex;
  gap: 16rpx;
  margin: 0 var(--sp-8) var(--sp-5);
}

.quick-entry {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 24rpx 12rpx 20rpx;
  border-radius: var(--r-xl);
  background: var(--c-bg-brand, #f0fdf9);
  border: 1rpx solid var(--c-brand-100, #ccfbef);
}

.quick-entry__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4rpx;
}

.quick-entry__icon--signal {
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
}

.quick-entry__icon--like {
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
}

.quick-entry__icon--visitors {
  background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
}

.quick-entry__img {
  width: 36rpx;
  height: 36rpx;
  filter: brightness(0) invert(1);
}

.quick-entry__title {
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
}

.quick-entry__desc {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  text-align: center;
  line-height: 1.4;
}

/* 小锁标识：右下角（设计需求，付费解锁功能） */
.quick-entry__lock {
  position: absolute;
  right: 10rpx;
  bottom: 10rpx;
  width: 34rpx;
  height: 34rpx;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.12);
}

.quick-entry__lock-text {
  font-size: var(--fs-sm);
  line-height: 1;
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
  transition: transform var(--d-fast, 120ms) ease, background 0.15s ease;
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
  overflow: hidden;
  background: var(--c-bg-page);
  flex-shrink: 0;
}

/* 系统固定会话卡片（官方消息 / 小助手）图标头像 */
.system-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.system-avatar__img {
  width: 44rpx;
  height: 44rpx;
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

.conversation-item__pin-img {
  width: 28rpx;
  height: 28rpx;
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

/* 已读会话弱化（设计需求：已读文字浅灰，视觉突出未读会话） */
.conversation-item__message--read {
  color: var(--c-text-tertiary);
  font-weight: 400;
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
