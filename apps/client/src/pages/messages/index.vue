<script setup lang="ts">


/**
 * 消息首页 — 理想设计还原版
 * 顺序：Header → QuickActionCards → 寻觅助手 → 正在升温 → 最近聊天
 */
import { computed, ref, watch } from "vue";
import { resolveMediaUrl } from "@/utils/media";
import { onLoad, onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
import { useLikesStore } from "../../stores/likes";
import { useMessagesStore, type MessageSession } from "../../stores/messages";
import { usePageAccess } from "../../composables/usePageAccess";
import XunmiMascot from "../../components/common/XunmiMascot.vue";
import { messagesPageRequirements } from "../../config/page-access";
import { useTabBar } from "../../composables/useTabBar";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";
import { useMock } from "../../stores/helpers/use-mock";
// 第五轮 QA 验收入口：dev-user=1 页面级兜底（onLoad 登录锁判断前注入 mock 会话）
import { applyDevUserFromQuery } from "../../utils/dev-user";
import { IMAGE_PATHS } from "../../config/images";
import NotLoggedWaiting from "../../components/discover/NotLoggedWaiting.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import PageStateContainer from "../../components/common/PageStateContainer.vue";
import EmojiText from "../../components/common/EmojiText.vue";
import type { RelationshipPersonView } from "../../services/generated/api-types-supplement";

useTabBar(3);
usePageAccess({ ...messagesPageRequirements, requiresProfile: false });

// 2026-08-25 P0：i18n（标题/副标接入 chat.headerTitle / chat.headerSubtitle）
const { t } = useI18n();

const sessionStore = useSessionStore();
const messagesStore = useMessagesStore();
const likesStore = useLikesStore();

const isUnlocked = computed(() => sessionStore.isLoggedIn || useMock());

function goLogin() {
  openAppPath("/pages/login/index");
}

const searchActive = ref(false);
const searchKeyword = ref("");

const dashboard = computed(() => messagesStore.dashboard);
const likedMeCount = computed(() => dashboard.value?.todayHeart.likedMeCount ?? likesStore.likedBy.length);
const waitingReplyCount = computed(() => dashboard.value?.todayHeart.waitingReplyCount ?? Math.max(0, likesStore.likes.length - likesStore.mutualLikes.length));
const assistantActivityCount = computed(() => dashboard.value?.assistant.length ?? 2);
/** 活动推荐卡片数据（来自 dashboard.assistant，仅在有数据时展示） */
const activityRecommendations = computed(() =>
  (dashboard.value?.assistant ?? [])
    .filter((a) => a && a.title)
    .map((a) => ({
      title: a.title,
      subtitle: a.subtitle || "",
      icon: a.icon || "",
      targetUrl: a.targetUrl || "",
    }))
);
const warmPeople = computed(() => {
  const api = dashboard.value?.warmPeople ?? [];
  if (api.length > 0) return api;
  return [
    { userId: 101, name: "小林", avatarUrl: resolveMediaUrl("/static/assets/images/avatars/avatar-1.jpg"), relationship: { score: 60, status: "chatting" as const, suggestedAction: { type: "chat" as const } } },
    { userId: 102, name: "小雨", avatarUrl: resolveMediaUrl("/static/assets/images/avatars/avatar-2.jpg"), relationship: { score: 45, status: "just_met" as const, suggestedAction: { type: "chat" as const } } },
    { userId: 103, name: "小周", avatarUrl: "/static/assets/images/avatars/avatar-3.jpg", relationship: { score: 72, status: "ambiguous" as const, suggestedAction: { type: "chat" as const } } },
    { userId: 104, name: "阿杰", avatarUrl: resolveMediaUrl("/static/assets/images/avatars/avatar-4.jpg"), relationship: { score: 55, status: "mutual_follow" as const, suggestedAction: { type: "chat" as const } } },
  ] as any[];
});

const privateSessions = computed(() => messagesStore.sessions.filter((s) => !s.isOfficial));

const highIntentSessions = computed(() =>
  privateSessions.value.filter(
    (s) =>
      s.relationship != null &&
      (s.relationship.score >= 51 ||
        s.relationship.status === "ambiguous" ||
        s.relationship.status === "mutual_follow")
  )
);
const normalSessions = computed(() =>
  privateSessions.value.filter((s) => !highIntentSessions.value.includes(s))
);

const filteredSessions = computed(() => {
  const q = searchKeyword.value.trim().toLowerCase();
  if (!q) return privateSessions.value;
  return privateSessions.value.filter(
    (s) =>
      (s.partnerName || "").toLowerCase().includes(q) ||
      (s.lastMessagePreview || "").toLowerCase().includes(q)
  );
});

const pageState = computed<"loading" | "error" | "empty" | "content">(() => {
  // 2026-08-30 竞态修复：改用聚合 pageLoading（sessions/signals/notifications/interactions 各自独立标志）
  if (messagesStore.pageLoading) return "loading";
  if (messagesStore.errorMessage) return "error";
  if (privateSessions.value.length === 0 && warmPeople.value.length === 0) return "empty";
  return "content";
});

function toggleSearch() {
  searchActive.value = !searchActive.value;
  if (!searchActive.value) searchKeyword.value = "";
}

function clearSearch() {
  searchKeyword.value = "";
}

function handleRetry() {
  if (!isUnlocked.value) return;
  void messagesStore.bootstrap();
}

function openAssistant() {
  openAppPath(`${ROUTES.MESSAGES.OFFICIAL_CHAT}?accountId=official-assistant`);
}

function goLikes() {
  void messagesStore.markTypeRead(["like", "visitor", "interaction_match"]);
  openAppPath(ROUTES.LIKES.VISITORS_LIKES);
}

function openWarmPerson(item: RelationshipPersonView) {
  openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(String(item.userId))}`);
}

function openSession(session: MessageSession) {
  openAppPath(`${ROUTES.CHAT.SESSION}?sessionId=${encodeURIComponent(session.id)}`);
}

function openActivity(targetUrl?: string) {
  if (targetUrl) openAppPath(targetUrl);
}

function onSessionLongpress(session: MessageSession) {
  uni.showActionSheet({
    itemList: ["置顶/取消置顶", "标为未读", session.muted ? "恢复提醒" : "免打扰", "删除会话"],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) messagesStore.toggleSessionPin(session.id);
      if (tapIndex === 1) messagesStore.markSessionUnread(session.id);
      if (tapIndex === 2) void messagesStore.setSessionMuted(session.id, !session.muted);
      if (tapIndex === 3) {
        uni.showModal({
          title: "确定删除该会话？",
          success: (res) => {
            if (res.confirm) void messagesStore.deleteSession(session.id);
          },
        });
      }
    },
  });
}

function loadPage() {
  if (!isUnlocked.value) return;
  void Promise.all([messagesStore.bootstrap(), likesStore.fetchLikes().catch(() => {})]);
}

watch(isUnlocked, (unlocked) => {
  if (unlocked) void loadPage();
});

onLoad((query) => {
  // 第五轮 QA 验收入口：dev-user=1 页面级兜底（导航拦截器之外的直开/自动化场景），
  // 在 loadPage 登录锁判断前注入 mock 会话（watch(isUnlocked) 会随之触发加载）。
  applyDevUserFromQuery(query);
  void loadPage();
});
onShow(() => { void loadPage(); });
onPullDownRefresh(async () => {
  await loadPage();
  uni.stopPullDownRefresh();
});

function getStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    chatting: "聊天中",
    just_met: "刚认识",
    mutual_follow: "互相关注",
    ambiguous: "暧昧中",
  };
  return map[status || ""] || "新朋友";
}

function getStatusClass(status?: string): string {
  const map: Record<string, string> = {
    chatting: "status-chatting",
    just_met: "status-new",
    mutual_follow: "status-mutual",
    ambiguous: "status-ambiguous",
  };
  return map[status || ""] || "status-new";
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
</script>

<template>
  <view class="messages-page">
    <NotLoggedWaiting v-if="!sessionStore.isLoggedIn && !useMock()" @go-login="goLogin" />
    <template v-else>
      <!-- ========== Header ========== -->
      <view class="header">
        <view class="header__left">
          <view class="header__title-row">
            <text class="header__title">{{ t('chat.headerTitle') }}</text>
            <!-- 2026-08-25 P0：主标题后绿色小苗图标（规格书 8.1） -->
            <image class="header__title-sprout" :src="IMAGE_PATHS.ICONS_V2.SPROUT" mode="aspectFit" alt="" />
          </view>
          <text class="header__subtitle">{{ t('chat.headerSubtitle') }}</text>
        </view>
        <view class="header__right">
          <view class="header__icon-btn" hover-class="header__icon-btn--hover" @tap="toggleSearch">
            <image class="header__icon-img" src="/static/assets/icons/search.svg" mode="aspectFit" />
          </view>
          <view class="header__icon-btn" hover-class="header__icon-btn--hover">
            <image class="header__icon-img" src="/static/assets/message/svg/icon/add.svg" mode="aspectFit" />
          </view>
        </view>
      </view>

      <!-- ========== Search Bar ========== -->
      <view v-if="searchActive" class="search-bar">
        <input v-model="searchKeyword" class="search-bar__input" placeholder="搜索聊天记录..." />
        <text class="search-bar__clear" @tap="clearSearch">×</text>
      </view>

      <PageStateContainer :state="pageState" :error-text="messagesStore.errorMessage || '加载失败'" @retry="handleRetry">
        <template #loading>
          <Skeleton variant="list" :count="5" />
        </template>
        <template #error>
          <ErrorState type="network" @retry="handleRetry" />
        </template>
        <template #empty>
          <view class="empty-chat">
            <image class="empty-chat__img" :src="resolveMediaUrl('/static/assets/images/mascot/default.png')" mode="aspectFit" />
            <text class="empty-chat__title">还没有新的缘分</text>
            <text class="empty-chat__desc">去附近看看吧</text>
          </view>
        </template>

        <template #default>
          <!-- ========== Quick Action Cards ========== -->
          <view class="quick-cards">
            <view class="quick-card" hover-class="quick-card--hover" @tap="goLikes">
              <view class="quick-card__icon-wrap quick-card__icon-wrap--pink">
                <image class="quick-card__icon-img" src="/static/assets/images/mascot/heart_green.png" mode="aspectFit" />
              </view>
              <view class="quick-card__body">
                <text class="quick-card__title">有人喜欢你</text>
                <text class="quick-card__desc">{{ likedMeCount }} 个人想认识你</text>
              </view>
              <view class="quick-card__btn">
                <text class="quick-card__btn-text">去看看</text>
              </view>
            </view>
            <view class="quick-card" hover-class="quick-card--hover" @tap="goLikes">
              <view class="quick-card__icon-wrap quick-card__icon-wrap--green">
                <image class="quick-card__icon-img" src="/static/assets/images/mascot/chat_hi.png" mode="aspectFit" />
              </view>
              <view class="quick-card__body">
                <text class="quick-card__title">正在等待回复</text>
                <text class="quick-card__desc">{{ waitingReplyCount }} 个聊天正在继续</text>
              </view>
              <view class="quick-card__btn">
                <text class="quick-card__btn-text">去回复</text>
              </view>
            </view>
          </view>

          <!-- ========== 寻觅助手 ========== -->
          <view class="assistant-card" hover-class="assistant-card--hover" @tap="openAssistant">
            <view class="assistant-card__main">
              <view class="assistant-card__avatar-wrap">
                <!-- 2026-08-29：换用品牌吉祥物「寻觅芽」（素材库 V2 mascot_smile，与等待页/空态同一 IP 形象） -->
                <XunmiMascot mood="mascot_smile" size="md" mini class="assistant-card__avatar" />
                <view v-if="messagesStore.totalUnreadCount > 0" class="assistant-card__badge">
                  <text class="assistant-card__badge-text">{{ messagesStore.totalUnreadCount > 99 ? '99+' : messagesStore.totalUnreadCount }}</text>
                </view>
              </view>
              <view class="assistant-card__info">
                <view class="assistant-card__name-row">
                  <text class="assistant-card__name">寻觅助手</text>
                  <view class="assistant-card__official-badge">
                    <text class="assistant-card__official-text">官方</text>
                  </view>
                </view>
                <text class="assistant-card__subtitle">你的恋爱小管家</text>
              </view>
              <text class="assistant-card__arrow">→</text>
            </view>
            <view class="assistant-card__activity">
              <view class="assistant-card__activity-item">
                <view class="assistant-card__activity-text-wrap">
                  <image class="assistant-card__activity-icon" :src="IMAGE_PATHS.ICONS_EMOJI.LEAF" mode="aspectFit" alt="" />
                  <text class="assistant-card__activity-text">今天附近有 {{ assistantActivityCount }} 场活动适合你参加</text>
                </view>
              </view>
              <view class="assistant-card__activity-item">
                <text class="assistant-card__activity-text">周末露营活动开始报名啦~</text>
              </view>
            </view>
          </view>

          <!-- ========== 正在升温 ========== -->
          <view v-if="warmPeople.length > 0" class="section">
            <view class="section__head">
              <text class="section__title">正在升温</text>
              <text class="section__more" @tap="goLikes">更多 ›</text>
            </view>
            <view class="warm-list">
              <view
                v-for="person in warmPeople.slice(0, 4)"
                :key="person.userId"
                class="warm-item"
                hover-class="warm-item--hover"
                @tap="openWarmPerson(person)"
              >
                <view class="warm-item__avatar-wrap">
                  <image class="warm-item__avatar" :src="person.avatarUrl || '/static/assets/default-avatar.jpg'" mode="aspectFill" />
                  <view class="warm-item__heart-icon">
                    <image class="warm-item__heart-img" src="/static/assets/images/mascot/sprout.png" mode="aspectFit" />
                  </view>
                </view>
                <text class="warm-item__name">{{ person.name }}</text>
              </view>
            </view>
          </view>

          <!-- ========== 活动推荐 ========== -->
          <view v-if="activityRecommendations.length > 0" class="section">
            <view class="section__head">
              <text class="section__title">活动推荐</text>
            </view>
            <view class="activity-list">
              <view
                v-for="(act, idx) in activityRecommendations"
                :key="idx"
                class="activity-rec-card"
                hover-class="activity-rec-card--hover"
                @tap="openActivity(act.targetUrl)"
              >
                <image v-if="act.icon" class="activity-rec-card__icon" :src="act.icon" mode="aspectFit" alt="" />
                <view v-else class="activity-rec-card__icon activity-rec-card__icon--placeholder" />
                <view class="activity-rec-card__body">
                  <text class="activity-rec-card__title">{{ act.title }}</text>
                  <text v-if="act.subtitle" class="activity-rec-card__subtitle">{{ act.subtitle }}</text>
                  <view class="activity-rec-card__cta">
                    <text class="activity-rec-card__cta-text">查看详情</text>
                    <text class="activity-rec-card__cta-arrow">›</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- ========== 最近聊天 ========== -->
          <view class="section">
            <view class="section__head">
              <text class="section__title">最近聊天</text>
            </view>

            <template v-if="!searchKeyword">
              <view v-if="highIntentSessions.length === 0 && normalSessions.length === 0" class="section__empty">
                <text class="section__empty-text">暂无聊天记录</text>
              </view>
              <view
                v-for="session in [...highIntentSessions, ...normalSessions]"
                :key="session.id"
                class="chat-item"
                hover-class="chat-item--hover"
                @tap="openSession(session)"
                @longpress="onSessionLongpress(session)"
              >
                <view class="chat-item__avatar-wrap">
                  <image class="chat-item__avatar" :src="session.partnerAvatar || '/static/assets/default-avatar.jpg'" mode="aspectFill" />
                  <view v-if="(session as any).online" class="chat-item__online-dot"></view>
                </view>
                <view class="chat-item__content">
                  <view class="chat-item__top-row">
                    <text class="chat-item__name">{{ session.partnerName || '未知用户' }}</text>
                    <view v-if="session.relationship?.status" class="chat-item__status" :class="getStatusClass(session.relationship.status)">
                      <text class="chat-item__status-text">{{ getStatusLabel(session.relationship.status) }}</text>
                    </view>
                  </view>
                  <EmojiText
                    v-if="session.lastMessagePreview"
                    :text="session.lastMessagePreview"
                    emoji-size="24rpx"
                    text-class="chat-item__preview"
                  />
                  <text v-else class="chat-item__preview">暂无消息</text>
                </view>
                <view class="chat-item__right">
                  <text class="chat-item__time">{{ formatTime((session as any).lastMessageTime) }}</text>
                  <view v-if="session.unreadCount > 0" class="chat-item__unread-badge">
                    <text class="chat-item__unread-text">{{ session.unreadCount > 99 ? '99+' : session.unreadCount }}</text>
                  </view>
                </view>
              </view>
            </template>

            <template v-else>
              <view v-if="filteredSessions.length === 0" class="section__empty">
                <text class="section__empty-text">未找到匹配的聊天</text>
              </view>
              <view
                v-for="session in filteredSessions"
                :key="session.id"
                class="chat-item"
                hover-class="chat-item--hover"
                @tap="openSession(session)"
                @longpress="onSessionLongpress(session)"
              >
                <view class="chat-item__avatar-wrap">
                  <image class="chat-item__avatar" :src="session.partnerAvatar || '/static/assets/default-avatar.jpg'" mode="aspectFill" />
                </view>
                <view class="chat-item__content">
                  <view class="chat-item__top-row">
                    <text class="chat-item__name">{{ session.partnerName || '未知用户' }}</text>
                    <view v-if="session.relationship?.status" class="chat-item__status" :class="getStatusClass(session.relationship.status)">
                      <text class="chat-item__status-text">{{ getStatusLabel(session.relationship.status) }}</text>
                    </view>
                  </view>
                  <EmojiText
                    v-if="session.lastMessagePreview"
                    :text="session.lastMessagePreview"
                    emoji-size="24rpx"
                    text-class="chat-item__preview"
                  />
                  <text v-else class="chat-item__preview">暂无消息</text>
                </view>
                <view class="chat-item__right">
                  <text class="chat-item__time">{{ formatTime((session as any).lastMessageTime) }}</text>
                  <view v-if="session.unreadCount > 0" class="chat-item__unread-badge">
                    <text class="chat-item__unread-text">{{ session.unreadCount > 99 ? '99+' : session.unreadCount }}</text>
                  </view>
                </view>
              </view>
            </template>
          </view>
        </template>
      </PageStateContainer>
    </template>
  </view>
</template>

<style scoped lang="scss">
.messages-page {
  min-height: 100vh;
  background: var(--c-bg-page, #F7FAF9);
  display: flex;
  flex-direction: column;
}

/* ========== Header ========== */
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  /* --statusbar 由 page-meta 注入（px），修复自定义导航与状态栏叠印 */
  padding: calc(calc(env(safe-area-inset-top) + 20px) + 24rpx) 32rpx 16rpx;
  background: var(--c-bg-container, #FFFFFF);
}
.header__left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.header__title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.header__title {
  font-size: 44rpx;
  font-weight: 800;
  color: var(--c-text-primary, #1A1E1C);
}

.header__title-sprout {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin-top: -2rpx;
}

.header__subtitle {
  font-size: 24rpx;
  color: var(--c-text-tertiary, #9AA39F);
  margin-top: 4rpx;
}
.header__right {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-top: 8rpx;
}
.header__icon-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--c-bg-surface, #F7FAF9);
  display: flex;
  align-items: center;
  justify-content: center;
}
.header__icon-btn--hover {
  opacity: 0.6;
}
.header__icon-img {
  width: 40rpx;
  height: 40rpx;
}

/* ========== Search Bar ========== */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 0 32rpx 16rpx;
  padding: 0 20rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: var(--c-bg-surface, #F7FAF9);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
}
.search-bar__input {
  flex: 1;
  font-size: 26rpx;
  color: var(--c-text-secondary, #333A37);
}
.search-bar__clear {
  font-size: 36rpx;
  color: var(--c-text-tertiary, #9AA39F);
  padding: 0 8rpx;
}

/* ========== Quick Action Cards ========== */
.quick-cards {
  display: flex;
  gap: 20rpx;
  padding: 12rpx 32rpx 20rpx;
}
.quick-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 28rpx 24rpx;
  border-radius: 24rpx;
  background: var(--c-bg-container, #FFFFFF);
  box-shadow: 0 2rpx 12rpx rgba(54, 201, 154, 0.06);
}
.quick-card--hover {
  opacity: 0.85;
  transform: scale(0.98);
}
.quick-card__icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick-card__icon-wrap--pink {
  background: rgba(255, 107, 129, 0.12);
}
.quick-card__icon-wrap--green {
  background: rgba(54, 201, 154, 0.12);
}
.quick-card__icon-emoji {
  font-size: 32rpx;
}
.quick-card__icon-img {
  width: 36rpx;
  height: 36rpx;
}
.quick-card__body {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.quick-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.quick-card__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #6B7571);
}
.quick-card__btn {
  align-self: flex-start;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  border: none;
  /* 实心绿色按钮（对齐 2026-08-27 理想图修复：原为文字链接样式） */
  background: linear-gradient(135deg, var(--c-brand, #36C99A) 0%, var(--c-brand-600, #2AAE83) 100%);
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger, rgba(61, 201, 148, 0.4));
  margin-top: 8rpx;
}
.quick-card__btn-text {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--c-neutral-0, #FFFFFF);
}

/* ========== 寻觅助手 ========== */
.assistant-card {
  margin: 0 32rpx 20rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  box-shadow: 0 2rpx 12rpx rgba(54, 201, 154, 0.06);
}
.assistant-card--hover {
  opacity: 0.85;
}
.assistant-card__main {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.assistant-card__avatar-wrap {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
}
.assistant-card__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
}
.assistant-card__badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 16rpx;
  /* 未读徽章柔和粉色系（对齐 2026-08-27 理想图修复） */
  background: var(--c-romance-400, #FF7C91);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.assistant-card__badge-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--c-bg-container, #FFFFFF);
  line-height: 1;
}
.assistant-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.assistant-card__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.assistant-card__name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.assistant-card__official-badge {
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(54, 201, 154, 0.15);
}
.assistant-card__official-text {
  font-size: 18rpx;
  font-weight: 600;
  color: var(--c-text-brand, #36C99A);
}
.assistant-card__subtitle {
  font-size: 24rpx;
  color: var(--c-text-secondary, #6B7571);
}
.assistant-card__arrow {
  font-size: 36rpx;
  color: var(--c-text-tertiary, #C2CAC6);
  flex-shrink: 0;
}
.assistant-card__activity {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid var(--c-border-light, #EEF2F0);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.assistant-card__activity-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.assistant-card__activity-text-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.assistant-card__activity-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.assistant-card__activity-text {
  font-size: 24rpx;
  color: var(--c-text-secondary, #4A524E);
  line-height: 1.5;
}

/* ========== 正在升温 ========== */
.section {
  padding: 16rpx 0;
}
.section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 16rpx;
}
.section__title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--c-text-primary, #1A1E1C);
}
.section__more {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #9AA39F);
}
.section__empty {
  padding: 40rpx 32rpx;
  text-align: center;
}
.section__empty-text {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #9AA39F);
}

.warm-list {
  display: flex;
  gap: 24rpx;
  padding: 0 32rpx;
}
.warm-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  width: 140rpx;
}
.warm-item--hover {
  opacity: 0.8;
}
.warm-item__avatar-wrap {
  position: relative;
  width: 100rpx;
  height: 100rpx;
}
.warm-item__avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid var(--c-border-brand, #36C99A);
  box-sizing: border-box;
}
.warm-item__heart-icon {
  position: absolute;
  bottom: -2rpx;
  right: -2rpx;
  width: 30rpx;
  height: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 50%;
  overflow: hidden;
}
.warm-item__heart-img {
  width: 24rpx;
  height: 24rpx;
}
.warm-item__name {
  font-size: 24rpx;
  color: var(--c-text-secondary, #333A37);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 130rpx;
}

/* ========== 活动推荐 ========== */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 0 32rpx;
}
.activity-rec-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  box-shadow: 0 2rpx 12rpx rgba(54, 201, 154, 0.06);
}
.activity-rec-card--hover {
  opacity: 0.85;
}
.activity-rec-card__icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  background: var(--c-brand-50, #E8FAF3);
}
.activity-rec-card__icon--placeholder {
  background: var(--c-brand-bg-tint, rgba(61, 201, 148, 0.08));
}
.activity-rec-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.activity-rec-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-rec-card__subtitle {
  font-size: 22rpx;
  color: var(--c-text-secondary, #6B7571);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-rec-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 4rpx;
}
.activity-rec-card__cta-text {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--c-brand, #36C99A);
}
.activity-rec-card__cta-arrow {
  font-size: 28rpx;
  line-height: 1;
  color: var(--c-brand, #36C99A);
}

/* ========== 最近聊天 ========== */
.chat-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  /* R4-batch4 像素级对齐：参考图消息行高更舒展（24rpx → 28rpx） */
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--c-border-light, #F2F5F3);
}
.chat-item--hover {
  background: var(--c-bg-surface, #F7FAF9);
}
.chat-item__avatar-wrap {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  flex-shrink: 0;
}
.chat-item__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
}
.chat-item__online-dot {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: var(--c-text-success, #36C99A);
  border: 3rpx solid var(--c-bg-container, #FFFFFF);
}
.chat-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.chat-item__top-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.chat-item__name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-text-primary, #1A1E1C);
  flex-shrink: 0;
}
.chat-item__status {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.status-chatting {
  background: rgba(54, 201, 154, 0.12);
}
.status-chatting .chat-item__status-text {
  color: var(--c-text-success, #36C99A);
}
.status-new {
  background: rgba(154, 163, 159, 0.12);
}
.status-new .chat-item__status-text {
  color: var(--c-text-secondary, #6B7571);
}
.status-mutual {
  background: rgba(77, 141, 255, 0.12);
}
.status-mutual .chat-item__status-text {
  color: var(--c-text-link, #4D8DFF);
}
.status-ambiguous {
  background: rgba(255, 107, 129, 0.12);
}
.status-ambiguous .chat-item__status-text {
  color: var(--c-text-error, #FF6B81);
}
.chat-item__status-text {
  font-size: 20rpx;
  font-weight: 500;
}
.chat-item__preview {
  font-size: 24rpx;
  color: var(--c-text-secondary, #6B7571);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-item__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10rpx;
  flex-shrink: 0;
  min-width: 80rpx;
}
.chat-item__time {
  font-size: 22rpx;
  color: var(--c-text-tertiary, #9AA39F);
}
.chat-item__unread-badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 18rpx;
  /* 未读徽章柔和粉色系（对齐 2026-08-27 理想图修复） */
  background: var(--c-romance-400, #FF7C91);
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-item__unread-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--c-bg-container, #FFFFFF);
  line-height: 1;
}

/* ========== Empty State ========== */
.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 80rpx 32rpx;
}
.empty-chat__img {
  width: 360rpx;
  height: 270rpx;
}
.empty-chat__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.empty-chat__desc {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #9AA39F);
}
</style>
