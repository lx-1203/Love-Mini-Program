<script setup lang="ts">
/**
 * 消息页（2026-08-07 对标微信重构）。
 *
 * 页面结构（从上到下）：
 * 1. 顶部导航栏：左侧加粗「消息」大标题 + 右侧搜索图标（点击展开搜索，按昵称/预览过滤会话）
 * 2. 快捷功能入口（仅一行两个轻量卡片）：「匿名匹配聊天」/「喜欢与访客」（独立二级页）
 * 3. 会话列表（页面主体）：
 *    - 排序：置顶会话固定最前，其余按最后一条消息时间倒序（微信同款）
 *    - 单条会话：圆形头像（用户头像 / 官方号专属图标头像 / 匿名蒙面头像）+ 昵称（官方号带「官方」角标）
 *      + 最后一条消息预览 + 时间 + 未读数字红点（超过 99 显示 99+）；免打扰会话显示静音角标
 *    - 左滑会话：露出「免打扰」「删除」操作，操作后即时生效
 *    - 长按会话：操作菜单（置顶/取消置顶、标为未读/标为已读、删除会话）
 *    - 点击会话：官方号 → 官方号会话页；其余 → 聊天详情页（进入后未读红点消除，返回同步更新）
 *
 * 移除（消息页纯聊天属性）：分类 Tab（私信/系统通知）、通知列表、心动信号 Banner、
 * 社交升温入口、内嵌喜欢/访客入口栏、全局发帖 FAB——系统通知由「产品助手号」官方会话承载。
 */
import { computed, reactive, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
import { useMessagesStore, type MessageSession } from "../../stores/messages";
import { usePageAccess } from "../../composables/usePageAccess";
import { messagesPageRequirements } from "../../config/page-access";
import { useTabBar } from "../../composables/useTabBar";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";
import { designTokens } from "../../theme/tokens";
import { OFFICIAL_ACCOUNT_CODES } from "../../config/official-accounts";

// 2026-08-07 消息页重构收尾：新版消息页挂上 tabBar 后需同步选中态（tab 顺序：首页0/匹配1/圈子2/消息3/我的4）
useTabBar(3);
import LockScreen from "../../components/common/LockScreen.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import PageStateContainer from "../../components/common/PageStateContainer.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();
const sessionStore = useSessionStore();
const messagesStore = useMessagesStore();

// Phase 4 任务 20：接入页面访问守卫（资料未完善时展示 LockScreen 引导）
usePageAccess(messagesPageRequirements);

/** 图标资源 */
const iconSrc = {
  search: IMAGE_PATHS.ICONS_EMOJI.SEARCH,
  close: IMAGE_PATHS.ICONS_COMMON.CLOSE,
  mute: IMAGE_PATHS.ICONS_EMOJI.PROHIBITED,
  match: IMAGE_PATHS.ICONS_SOCIAL.MATCH,
  visitor: IMAGE_PATHS.ICONS_SOCIAL.VISITOR,
  officialAssistant: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED,
  officialPromoter: IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE,
} as const;

/** 资料是否已完善 */
const isUnlocked = computed(() => sessionStore.isProfileComplete);
/** 完善度百分比 */
const completionPercent = computed(() => sessionStore.profileCompletion);

/* ==================== 搜索 ==================== */

/** 搜索是否展开 */
const searchActive = ref(false);
/** 搜索关键词（按昵称 / 最后一条消息预览过滤） */
const searchKeyword = ref("");

function toggleSearch() {
  searchActive.value = !searchActive.value;
  if (!searchActive.value) searchKeyword.value = "";
}

function clearSearch() {
  searchKeyword.value = "";
}

/* ==================== 会话列表 ==================== */

/**
 * 会话列表（合并普通私信 / 匿名匹配 / 官方号）：
 * 置顶会话固定最前，其余按最后一条消息时间倒序（对标微信）。
 */
const sessionList = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  const base = keyword
    ? messagesStore.sessions.filter(
        (s) =>
          // 修复（P2-06）：partnerName 可能为空（后端 otherUserName 空值），
          // toLowerCase 前统一兜底，避免空值崩溃
          (s.partnerName || "").toLowerCase().includes(keyword) ||
          (s.lastMessagePreview || "").toLowerCase().includes(keyword),
      )
    : messagesStore.sessions;
  return [...base].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const aTime = a.lastMessageSentAt ? Date.parse(a.lastMessageSentAt) : 0;
    const bTime = b.lastMessageSentAt ? Date.parse(b.lastMessageSentAt) : 0;
    return bTime - aTime;
  });
});

/** 搜索无结果提示 */
const showNoSearchResult = computed(
  () => searchActive.value && searchKeyword.value.trim().length > 0 && sessionList.value.length === 0,
);

/** 页面统一状态：loading / error / empty / content */
const pageState = computed<"loading" | "error" | "empty" | "content">(() => {
  if (messagesStore.loading && messagesStore.sessions.length === 0) return "loading";
  if (messagesStore.errorMessage && messagesStore.sessions.length === 0) return "error";
  if (messagesStore.sessions.length === 0) return "empty";
  return "content";
});

const errorText = computed(() => messagesStore.errorMessage || t("messages.loadFailed"));

function handleRetry() {
  void messagesStore.fetchSessions();
}

/* ==================== 左滑操作（免打扰 / 删除） ==================== */

/** 当前展开左滑操作的会话 ID（同一时间仅一个） */
const openId = ref<string | null>(null);

/** 触摸起点与滑动位移（用于区分点击与左滑） */
const touch = reactive<{
  id: string;
  startX: number;
  startY: number;
  deltaX: number;
  moved: boolean;
}>({ id: "", startX: 0, startY: 0, deltaX: 0, moved: false });

/** 触摸事件类型（mp-weixin 的 touches 为 TouchList） */
type TouchEventLike = { touches?: TouchList };

function onRowTouchStart(e: TouchEventLike, sessionId: string) {
  const p = e.touches?.[0];
  if (!p) return;
  touch.id = sessionId;
  touch.startX = p.clientX;
  touch.startY = p.clientY;
  touch.deltaX = 0;
  touch.moved = false;
}

function onRowTouchMove(e: TouchEventLike, sessionId: string) {
  if (touch.id !== sessionId) return;
  const p = e.touches?.[0];
  if (!p) return;
  const dx = p.clientX - touch.startX;
  const dy = p.clientY - touch.startY;
  touch.deltaX = dx;
  // 仅当水平位移占主导时判定为左滑手势（避免纵向滚动误触）
  if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.2) {
    touch.moved = true;
  }
}

function onRowTouchEnd(_e: unknown, sessionId: string) {
  if (touch.id !== sessionId) return;
  if (touch.moved) {
    // 左滑展开 / 右滑收起
    if (touch.deltaX < -40) {
      openId.value = sessionId;
    } else if (openId.value === sessionId) {
      openId.value = null;
    }
  }
}

function closeActions() {
  openId.value = null;
}

/** 会话行位移样式（左滑展开操作层） */
function rowStyle(sessionId: string) {
  return {
    transform: openId.value === sessionId ? "translateX(-200rpx)" : "translateX(0)",
  };
}

/** 切换免打扰（左滑操作，即时生效） */
function toggleMute(session: MessageSession) {
  const next = !session.muted;
  messagesStore.setSessionMuted(session.id, next);
  uni.showToast({
    title: next ? t("messages.sessionMuted") : t("messages.sessionUnmuted"),
    icon: "none",
  });
  closeActions();
}

/** 删除会话（左滑操作，确认后删除） */
function confirmDeleteSession(sessionId: string) {
  closeActions();
  uni.showModal({
    title: t("common.delete"),
    content: t("messages.deleteSessionConfirm"),
    confirmColor: designTokens.color.error,
    success: (res) => {
      if (!res.confirm) return;
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
    },
  });
}

/* ==================== 长按菜单（置顶 / 标为未读 / 删除） ==================== */

function handleSessionLongPress(session: MessageSession) {
  closeActions();
  const itemList = [
    session.pinned ? t("messages.unpinSession") : t("messages.pinSession"),
    session.unreadCount > 0 ? t("messages.markAsRead") : t("messages.markAsUnread"),
    t("common.delete"),
  ];
  uni.showActionSheet({
    itemList,
    itemColor: "#333333" /* ≈ --c-text-primary（与 token 值一致，保留字面量） */,
    success: (res) => {
      if (res.tapIndex === 0) {
        messagesStore.toggleSessionPin(session.id);
        uni.showToast({
          title: session.pinned ? t("messages.unpinned") : t("messages.pinned"),
          icon: "none",
        });
        return;
      }
      if (res.tapIndex === 1) {
        if (session.unreadCount > 0) {
          messagesStore.markSessionRead(session.id);
          uni.showToast({ title: t("messages.markedRead"), icon: "none" });
        } else {
          messagesStore.markSessionUnread(session.id);
          uni.showToast({ title: t("messages.markedUnread"), icon: "none" });
        }
        return;
      }
      if (res.tapIndex === 2) {
        confirmDeleteSession(session.id);
      }
    },
  });
}

/* ==================== 跳转 ==================== */

/** 点击会话：官方号 → 官方号会话页；其余 → 聊天详情页（未读红点进入后消除） */
function openSession(session: MessageSession) {
  if (openId.value === session.id) {
    closeActions();
    return;
  }
  if (session.isOfficial && session.officialAccountId) {
    openAppPath(`${ROUTES.MESSAGES.OFFICIAL_CHAT}?accountId=${encodeURIComponent(session.officialAccountId)}`);
    return;
  }
  openAppPath(`${ROUTES.CHAT.SESSION}?sessionId=${encodeURIComponent(session.id)}`);
}

/** 快捷入口：匿名匹配聊天（原心动信号匹配池） */
function goMatchPool() {
  openAppPath(ROUTES.HEART_SIGNALS);
}

/** 快捷入口：喜欢与访客（独立二级页） */
function goLikesVisitors() {
  openAppPath(ROUTES.LIKES.VISITORS_LIKES);
}

/* ==================== 展示辅助 ==================== */

/** 官方号头像图标（按 accountId 区分） */
function officialIcon(accountId?: string): string {
  return accountId === "official-promoter" ? iconSrc.officialPromoter : iconSrc.officialAssistant;
}

/** 时间格式化（对标微信）：今天 → HH:mm；昨天 → 「昨天」；更早 → M/D */
function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = date.getTime();
  if (time >= todayStart) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  if (time >= todayStart - 24 * 60 * 60 * 1000) {
    return t("messages.yesterday");
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/* ==================== 生命周期 ==================== */

/**
 * 兼容旧深链 ?tab=notification（原通知 Tab 已移除）：
 * 系统通知现由「产品助手号」官方会话承载，直接进入该会话。
 */
onLoad((query) => {
  if (query && query.tab === "notification") {
    // R4-00081：官方号 code 收敛到常量，避免散落硬编码
    openAppPath(`${ROUTES.MESSAGES.OFFICIAL_CHAT}?accountId=${encodeURIComponent(OFFICIAL_ACCOUNT_CODES.ASSISTANT)}`);
  }
});

onShow(() => {
  if (isUnlocked.value) {
    void messagesStore.bootstrap();
  }
});
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

      <!-- 顶部导航栏：加粗「消息」标题 + 右侧搜索图标 -->
      <view class="messages-header">
        <text class="messages-header__title">{{ t('messages.title') }}</text>
        <view class="messages-header__actions">
          <view
            class="messages-header__search-btn press-feedback"
            :class="{ 'messages-header__search-btn--active': searchActive }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('messages.search')"
            @tap="toggleSearch"
          >
            <image class="messages-header__search-icon" :src="iconSrc.search" mode="aspectFit" alt="" />
          </view>
        </view>
      </view>

      <!-- 搜索输入框（展开态，按昵称/聊天记录过滤会话） -->
      <view v-if="searchActive" class="search-bar">
        <image class="search-bar__icon" :src="iconSrc.search" mode="aspectFit" alt="" />
        <input
          v-model="searchKeyword"
          class="search-bar__input"
          :placeholder="t('messages.searchPlaceholder')"
          confirm-type="search"
          :aria-label="t('messages.searchPlaceholder')"
        />
        <view v-if="searchKeyword" class="search-bar__clear" role="button" :aria-label="t('common.clear')" @tap="clearSearch">
          <image class="search-bar__clear-icon" :src="iconSrc.close" mode="aspectFit" alt="" />
        </view>
      </view>

      <!-- 快捷功能入口（仅一行两个轻量卡片，不混入会话列表） -->
      <view class="quick-entries">
        <view
          class="quick-card press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('messages.anonymousMatch')"
          @tap="goMatchPool"
        >
          <view class="quick-card__icon quick-card__icon--match">
            <image class="quick-card__icon-img" :src="iconSrc.match" mode="aspectFit" alt="" />
          </view>
          <view class="quick-card__body">
            <text class="quick-card__title">{{ t('messages.anonymousMatch') }}</text>
            <text class="quick-card__desc">{{ t('messages.anonymousMatchDesc') }}</text>
          </view>
        </view>
        <view
          class="quick-card press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('messages.likesVisitorsEntry')"
          @tap="goLikesVisitors"
        >
          <view class="quick-card__icon quick-card__icon--visitors">
            <image class="quick-card__icon-img" :src="iconSrc.visitor" mode="aspectFit" alt="" />
          </view>
          <view class="quick-card__body">
            <text class="quick-card__title">{{ t('messages.likesVisitorsEntry') }}</text>
            <text class="quick-card__desc">{{ t('messages.likesVisitorsDesc') }}</text>
          </view>
        </view>
      </view>

      <!-- 统一页面状态容器：loading / error / empty / content -->
      <PageStateContainer :state="pageState" :error-text="errorText" @retry="handleRetry">
        <template #loading>
          <view class="messages-loading">
            <Skeleton variant="list" :count="5" />
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
          <!-- 会话列表 -->
          <view class="session-list" role="list" @tap="closeActions">
            <!-- 搜索无结果提示 -->
            <view v-if="showNoSearchResult" class="session-list__no-result">
              <text class="session-list__no-result-text">{{ t('messages.noSearchResult') }}</text>
            </view>

            <view
              v-for="session in sessionList" :key="session.id"
              class="session-wrap"
            >
              <!-- 左滑操作层（免打扰 / 删除） -->
              <view class="session-wrap__actions">
                <view
                  class="session-wrap__action session-wrap__action--mute"
                  role="button"
                  :aria-label="session.muted ? t('messages.unmuteSession') : t('messages.muteSession')"
                  @tap="toggleMute(session)"
                >
                  <image class="session-wrap__action-icon" :src="iconSrc.mute" mode="aspectFit" alt="" />
                  <text class="session-wrap__action-text">
                    {{ session.muted ? t('messages.unmuteSession') : t('messages.muteSession') }}
                  </text>
                </view>
                <view
                  class="session-wrap__action session-wrap__action--delete"
                  role="button"
                  :aria-label="t('common.delete')"
                  @tap="confirmDeleteSession(session.id)"
                >
                  <text class="session-wrap__action-text">{{ t('common.delete') }}</text>
                </view>
              </view>

              <!-- 会话行 -->
              <view
                class="session-row"
                :class="{ 'session-row--open': openId === session.id }"
                :style="rowStyle(session.id)"
                hover-class="session-row--hover"
                @tap="openSession(session)"
                @longpress="handleSessionLongPress(session)"
                @touchstart="onRowTouchStart($event, session.id)"
                @touchmove="onRowTouchMove($event, session.id)"
                @touchend="onRowTouchEnd($event, session.id)"
              >
                <!-- 头像：用户头像 / 官方号专属图标 / 匿名蒙面头像 -->
                <view class="session-row__avatar-wrap">
                  <view
                    v-if="session.isOfficial"
                    class="session-row__avatar session-row__avatar--official"
                  >
                    <image class="session-row__avatar-official-icon" :src="officialIcon(session.officialAccountId)" mode="aspectFit" alt="" />
                  </view>
                  <view
                    v-else-if="session.sessionType === 'temp_anonymous'"
                    class="session-row__avatar session-row__avatar--temp"
                  >
                    <text class="session-row__avatar-text">?</text>
                  </view>
                  <view v-else class="session-row__avatar">
                    <text v-if="!session.partnerAvatar" class="session-row__avatar-text">
                      {{ session.partnerName.charAt(0) }}
                    </text>
                    <SafeImage v-else :src="session.partnerAvatar" custom-class="session-row__avatar-img" mode="aspectFill" :lazy-load="true" />
                  </view>
                  <!-- 未读红点（数字居中，99+） -->
                  <view v-if="session.unreadCount > 0" class="session-row__unread">
                    <text class="session-row__unread-text">
                      {{ session.unreadCount > 99 ? "99+" : session.unreadCount }}
                    </text>
                  </view>
                </view>

                <!-- 中间文字区：昵称行 + 预览行 -->
                <view class="session-row__content">
                  <view class="session-row__top">
                    <text class="session-row__name">{{ session.partnerName }}</text>
                    <!-- 官方号灰色角标 -->
                    <text v-if="session.isOfficial" class="session-row__official-badge">{{ t('messages.officialBadge') }}</text>
                    <!-- 免打扰静音角标 -->
                    <image v-if="session.muted" class="session-row__muted-icon" :src="iconSrc.mute" mode="aspectFit" alt="" />
                  </view>
                  <view class="session-row__bottom">
                    <text class="session-row__preview">{{ session.lastMessagePreview || t('messages.noPreview') }}</text>
                  </view>
                </view>

                <!-- 右侧状态区：时间 + 置顶标记 -->
                <view class="session-row__right">
                  <text class="session-row__time">{{ formatTime(session.lastMessageSentAt) }}</text>
                  <text v-if="session.pinned" class="session-row__pin">{{ t('messages.pinned') }}</text>
                </view>
              </view>
            </view>
          </view>
        </template>
      </PageStateContainer>
    </template>
  </view>
</template>

<style scoped lang="scss">
.messages-page {
  display: flex;
  flex-direction: column;
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

/* ========== 顶部导航栏 ========== */
.messages-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.messages-header__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.messages-header__search-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
  display: flex;
  align-items: center;
  justify-content: center;

  &--active {
    background: var(--c-bg-brand);
    border-color: var(--c-brand-300);
  }
}

.messages-header__search-icon {
  width: 40rpx;
  height: 40rpx;
}

/* ========== 搜索输入框 ========== */
.search-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin: 0 var(--sp-8) var(--sp-4);
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  position: relative;
  z-index: 1;
}

.search-bar__icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  opacity: 0.5;
}

.search-bar__input {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
}

.search-bar__clear {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.search-bar__clear-icon {
  width: 32rpx;
  height: 32rpx;
  opacity: 0.6;
}

/* ========== 快捷功能入口（一行两个轻量卡片） ========== */
.quick-entries {
  display: flex;
  gap: var(--sp-4);
  margin: 0 var(--sp-8) var(--sp-6);
  position: relative;
  z-index: 1;
}

.quick-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
  min-width: 0;
}

.quick-card__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--match {
    background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  }

  &--visitors {
    background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
  }
}

.quick-card__icon-img {
  width: 36rpx;
  height: 36rpx;
}

.quick-card__body {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.quick-card__title {
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-card__desc {
  font-size: 20rpx;
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== 加载 / 错误 / 空状态 ========== */
.messages-loading,
.messages-error {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-10) var(--sp-10);
  position: relative;
  z-index: 1;
}

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

.session-list__no-result {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-10) var(--sp-8);
}

.session-list__no-result-text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

/* 会话包裹层：操作层固定在行下方，行左滑露出 */
.session-wrap {
  position: relative;
  overflow: hidden;
}

.session-wrap__actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: stretch;
}

.session-wrap__action {
  width: 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;

  &--mute {
    background: var(--c-neutral-400);
  }

  &--delete {
    background: var(--c-error);
  }
}

.session-wrap__action-icon {
  width: 32rpx;
  height: 32rpx;
}

.session-wrap__action-text {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--c-text-inverse);
  line-height: 1.3;
}

/* 会话行（左滑时位移露出操作层） */
.session-row {
  display: flex;
  align-items: center;
  gap: var(--sp-6);
  padding: var(--sp-6) var(--sp-8);
  background: var(--c-bg-container);
  position: relative;
  z-index: 1;
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease;
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
}

/* 头像区 */
.session-row__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.session-row__avatar {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand));
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 官方号：品牌色圆角方形专属头像 */
.session-row__avatar--official {
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
}

.session-row__avatar-official-icon {
  width: 44rpx;
  height: 44rpx;
}

/* 匿名匹配：深灰蒙面头像 */
.session-row__avatar--temp {
  background: linear-gradient(135deg, var(--c-neutral-300), var(--c-neutral-400));
}

.session-row__avatar-img {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  border: var(--sp-1) solid var(--c-bg-container);
  box-sizing: border-box;
}

.session-row__avatar-text {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.session-row__avatar--temp .session-row__avatar-text {
  color: var(--c-text-secondary);
}

/* 未读红点（数字居中，99+） */
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
  z-index: 2;
  box-sizing: border-box;
}

.session-row__unread-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
}

/* 中间文字区 */
.session-row__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.session-row__top {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.session-row__name {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 官方号灰色角标 */
.session-row__official-badge {
  font-size: 18rpx;
  font-weight: 600;
  color: var(--c-text-secondary);
  border: 1rpx solid var(--c-border-default);
  background: var(--c-neutral-50);
  padding: 2rpx 10rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
}

/* 免打扰静音角标 */
.session-row__muted-icon {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
  opacity: 0.7;
}

.session-row__bottom {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
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

/* 右侧状态区 */
.session-row__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--sp-2);
  flex-shrink: 0;
}

.session-row__time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.session-row__pin {
  font-size: 18rpx;
  font-weight: 600;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-sm);
  background: var(--c-bg-brand);
  color: var(--c-brand);
  flex-shrink: 0;
}
</style>
