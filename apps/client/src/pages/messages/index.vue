<script setup lang="ts">
/**
 * 消息首页（寻觅消息系统 V3）。
 * 顺序：寻觅助手 → 新喜欢 → 高意向聊天 → 普通聊天。
 */
import { computed, ref, watch } from "vue";
import { onLoad, onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
import { useLikesStore } from "../../stores/likes";
import { useMessagesStore, type MessageSession } from "../../stores/messages";
import { usePageAccess } from "../../composables/usePageAccess";
import { messagesPageRequirements } from "../../config/page-access";
import { useTabBar } from "../../composables/useTabBar";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";
import LockScreen from "../../components/common/LockScreen.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import PageStateContainer from "../../components/common/PageStateContainer.vue";
import MessageHeader from "../../components/message/MessageHeader.vue";
import QuickEntryCard from "../../components/message/QuickEntryCard.vue";
import AssistantCard from "../../components/message/AssistantCard.vue";
import WarmPeopleCarousel from "../../components/message/WarmPeopleCarousel.vue";
import ConversationItem from "../../components/message/ConversationItem.vue";
import type { RelationshipPersonView } from "../../services/generated/api-types-supplement";

useTabBar(3);
usePageAccess(messagesPageRequirements);

const { t } = useI18n();
const sessionStore = useSessionStore();
const messagesStore = useMessagesStore();
const likesStore = useLikesStore();

const isUnlocked = computed(() => sessionStore.isProfileComplete);
const completionPercent = computed(() => sessionStore.profileCompletion);

const searchActive = ref(false);
const searchKeyword = ref("");

const dashboard = computed(() => messagesStore.dashboard);
const likedMeCount = computed(() => dashboard.value?.todayHeart.likedMeCount ?? likesStore.likedBy.length);
const waitingReplyCount = computed(() => dashboard.value?.todayHeart.waitingReplyCount ?? Math.max(0, likesStore.likes.length - likesStore.mutualLikes.length));
const assistantActivityCount = computed(() => dashboard.value?.assistant.length ?? 2);
const warmPeople = computed(() => dashboard.value?.warmPeople ?? []);

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
  if (messagesStore.loading) return "loading";
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
  // 2026-08-16：未解锁（LockScreen 态）时不发受保护请求
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

function openWarmAction(item: RelationshipPersonView) {
  const action = item.relationship.suggestedAction;
  if (action.targetUrl) {
    openAppPath(action.targetUrl);
  } else {
    openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(String(item.userId))}`);
  }
}

function openSession(session: MessageSession) {
  openAppPath(`${ROUTES.CHAT.SESSION}?sessionId=${encodeURIComponent(session.id)}`);
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
          title: t("messages.deleteSessionConfirm"),
          success: (res) => {
            if (res.confirm) void messagesStore.deleteSession(session.id);
          },
        });
      }
    },
  });
}

function goNearby() {
  openAppPath(ROUTES.TAB.NEARBY);
}

function loadPage() {
  // 2026-08-16：未解锁（未登录/资料未完善，LockScreen 态）时不发受保护请求，
  // 避免冷启动/过期 token 时 bootstrap + fetchLikes 401 雪崩；登录后 watch(isUnlocked) 自动补拉。
  if (!isUnlocked.value) return;
  void Promise.all([messagesStore.bootstrap(), likesStore.fetchLikes().catch(() => {})]);
}

// 2026-08-16：解锁（登录 + 资料完善）后自动补拉消息页数据
watch(isUnlocked, (unlocked) => {
  if (unlocked) {
    void loadPage();
  }
});

onLoad(() => {
  void loadPage();
});

onShow(() => {
  void loadPage();
});

onPullDownRefresh(async () => {
  await loadPage();
  uni.stopPullDownRefresh();
});
</script>

<template>
  <view class="messages-page">
    <LockScreen v-if="!isUnlocked" :completion-percent="completionPercent" />
    <template v-else>
      <MessageHeader
        :title="t('messages.title')"
        :subtitle="t('messages.todayHeartSubtitle')"
        :search-active="searchActive"
        @search-tap="toggleSearch"
        @close-search="clearSearch"
      />

      <view v-if="searchActive" class="search-bar">
        <input v-model="searchKeyword" class="search-bar__input" :placeholder="t('messages.searchPlaceholder')" />
        <text class="search-bar__clear" @tap="clearSearch">×</text>
      </view>

      <PageStateContainer :state="pageState" :error-text="messagesStore.errorMessage || t('messages.loadFailed')" @retry="handleRetry">
        <template #loading>
          <Skeleton variant="list" :count="5" />
        </template>
        <template #error>
          <ErrorState type="network" @retry="handleRetry" />
        </template>
        <template #empty>
          <view class="empty-chat">
            <XunmiMascot mood="default" size="lg" animated />
            <text class="empty-chat__title">还没有新的缘分</text>
            <text class="empty-chat__desc">去附近看看吧</text>
            <view class="empty-chat__btn" @tap="goNearby">
              <text class="empty-chat__btn-text">发现新朋友</text>
            </view>
          </view>
        </template>
        <template #default>
          <view class="quick-grid">
            <QuickEntryCard
              variant="green"
              icon="/static/assets/message/svg/icon/heart.svg"
              title="有人喜欢你"
              :desc="likedMeCount + '个人想认识你'"
              cta="去看看"
              @tap="goLikes"
            />
            <QuickEntryCard
              variant="pink"
              icon="/static/assets/message/svg/message.svg"
              title="正在等待回复"
              :desc="waitingReplyCount + '个聊天正在继续'"
              cta="去回复"
              @tap="goLikes"
            />
          </view>

          <view v-if="warmPeople.length > 0" class="section">
            <view class="section__head">
              <text class="section__title">正在升温</text>
              <text class="section__more" @tap="goLikes">更多 ›</text>
            </view>
            <WarmPeopleCarousel :items="warmPeople" @tap-person="openWarmPerson" @tap-action="openWarmAction" />
          </view>

          <AssistantCard :badge="messagesStore.totalUnreadCount" :activity-count="assistantActivityCount" @tap="openAssistant" />

          <view class="section">
            <text class="section__title">最近聊天</text>
            <template v-if="!searchKeyword">
              <ConversationItem
                v-for="session in highIntentSessions"
                :key="session.id"
                :session="session"
                @tap="openSession"
                @longpress="onSessionLongpress"
              />
              <ConversationItem
                v-for="session in normalSessions"
                :key="session.id"
                :session="session"
                @tap="openSession"
                @longpress="onSessionLongpress"
              />
            </template>
            <template v-else>
              <view v-if="filteredSessions.length === 0" class="section__empty">
                <text class="section__empty-text">{{ t('messages.noSearchResult') }}</text>
              </view>
              <ConversationItem
                v-for="session in filteredSessions"
                :key="session.id"
                :session="session"
                @tap="openSession"
                @longpress="onSessionLongpress"
              />
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
  background: #F7FAF9;
  padding-bottom: 140rpx;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 0 32rpx 16rpx;
  padding: 0 20rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: #FFFFFF;
  border: 1rpx solid #ECEFF2;
}
.search-bar__input {
  flex: 1;
  font-size: 26rpx;
  color: #222222;
}
.search-bar__clear {
  font-size: 36rpx;
  color: #999999;
  padding: 0 8rpx;
}
.quick-grid {
  display: flex;
  gap: 22rpx;
  padding: 12rpx 32rpx;
}
.section {
  padding: 16rpx 0;
}
.section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 32rpx;
}
.section__more {
  font-size: 26rpx;
  color: #86928C;
}
.section__title {
  display: block;
  padding: 0 32rpx 12rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #222222;
}
.section__empty {
  padding: 24rpx 32rpx;
  text-align: center;
}
.section__empty-text {
  font-size: 26rpx;
  color: #999999;
}
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
  color: #222222;
}
.empty-chat__desc {
  font-size: 26rpx;
  color: #999999;
}
.empty-chat__btn {
  margin-top: 12rpx;
  padding: 20rpx 64rpx;
  border-radius: 44rpx;
  background: #36C99A;
}
.empty-chat__btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>


