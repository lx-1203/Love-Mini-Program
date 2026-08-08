<script setup lang="ts">
/**
 * 心动信号页 — 双向心动通知列表
 * 展示所有待处理/已接受/已过期的心动信号，支持接受/拒绝操作及倒计时
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useLikesStore } from "../../stores/likes";
import { useSessionStore } from "../../stores/session";
import { useChatStore } from "../../stores/chat";
import { openAppPath } from "../../utils/navigation";
// R4-00023：用户上传头像 URL 需经 resolveMediaUrl 重写鉴权代理路径（否则真实模式 403/404）
import { resolveMediaUrl } from "../../utils/media";
import LockScreen from "../../components/common/LockScreen.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { likesPageRequirements } from "../../config/page-access";
import { showErrorToast } from "../../utils/error-toast";
// 修复（严格模式 noUnusedLocals）：IMAGE_PATHS 导入后未使用，已移除。

const { t } = useI18n();
const likesStore = useLikesStore();
const sessionStore = useSessionStore();
const chatStore = useChatStore();

usePageAccess(likesPageRequirements);
const { heartSignals, loading } = storeToRefs(likesStore);

const isUnlocked = computed(() => sessionStore.isProfileComplete);
const completionPercent = computed(() => sessionStore.profileCompletion);

/**
 * R4-00024：按状态分组（对齐契约 likes.yaml status enum=[pending,accepted,declined]）。
 * - 原分组 [pending,accepted,expired]：expired 契约中不存在（后端按契约返回时恒空），
 *   declined 信号无任何展示分支被静默丢弃；
 * - 现补 declined 分组（expired 仅作历史数据兜底，与 declined 合并展示）。
 */
const pendingSignals = computed(() =>
  heartSignals.value.filter((s) => s.status === "pending")
);
const acceptedSignals = computed(() =>
  heartSignals.value.filter((s) => s.status === "accepted")
);
const declinedSignals = computed(() =>
  // String() 归一化：store 类型 HeartSignalStatus 未包含 declined，
  // 但契约（likes.yaml status enum）含 declined，运行时按字符串比较
  heartSignals.value.filter((s) => String(s.status) === "declined" || s.status === "expired")
);

const activeTab = ref<"pending" | "accepted" | "declined">("pending");

/** 倒计时刷新周期（毫秒）：每 30 秒重算一次倒计时文案 */
const COUNTDOWN_REFRESH_MS = 30000;

/** 倒计时显示 */
const countdownMap = ref<Record<string, string>>({});
let countdownTimer: ReturnType<typeof setInterval> | null = null;

function updateCountdowns() {
  const now = Date.now();
  const map: Record<string, string> = {};
  for (const s of pendingSignals.value) {
    // P2-02：expiresAt 无效（空/非法日期）时直接显示"已过期"，
    // 避免 NaN 小时 NaN 分的倒计时文案
    const expiresAt = new Date(s.expiresAt).getTime();
    const diff = Number.isNaN(expiresAt) ? 0 : expiresAt - now;
    if (diff <= 0) {
      map[s.id] = t("heartSignals.expiredLabel");
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      map[s.id] = t("heartSignals.countdownHM", { hours, minutes });
    }
  }
  countdownMap.value = map;
}

onMounted(() => {
  if (isUnlocked.value) {
    void likesStore.fetchHeartSignals();
  }
  updateCountdowns();
  countdownTimer = setInterval(updateCountdowns, COUNTDOWN_REFRESH_MS);
});

onShow(() => {
  if (isUnlocked.value) {
    void likesStore.fetchHeartSignals();
  }
});

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
});

async function handleAccept(signalId: string) {
  try {
    await likesStore.acceptHeartSignal(signalId);
    uni.showToast({ title: t("heartSignals.acceptSuccess"), icon: "success" });
    void likesStore.fetchHeartSignals();
  } catch (error) {
    // 接受失败：按错误分类给出友好提示（网络/权限/业务）
    showErrorToast(error, t("heartSignals.acceptFailed"));
    console.error("接受心动信号失败:", error);
  }
}

async function handleDecline(signalId: string) {
  try {
    await likesStore.declineHeartSignal(signalId);
    uni.showToast({ title: t("heartSignals.rejectSuccess"), icon: "none" });
    void likesStore.fetchHeartSignals();
  } catch (error) {
    // 拒绝失败：按错误分类给出友好提示（网络/权限/业务）
    showErrorToast(error, t("heartSignals.rejectFailed"));
    console.error("拒绝心动信号失败:", error);
  }
}

/**
 * 已接受信号 → 匿名聊天「开聊」（2026-08-08 走查 P0-3）。
 * 经 chat store 创建临时会话（real 模式后端校验信号归属与状态），
 * 携带 fromSignal=1 进入聊天页激活渐进解锁面板（每 5 条解锁一项信息、20 条解锁主页）。
 */
async function handleChat(signalId: string) {
  try {
    const session = await chatStore.startFromSignal(signalId);
    if (!session?.id) {
      throw new Error("session id missing");
    }
    openAppPath(
      `/pages/chat-session/index?fromSignal=1&sessionId=${encodeURIComponent(session.id)}`
    );
  } catch (error) {
    showErrorToast(error, t("heartSignals.chatFailed"));
    console.error("心动信号开聊失败:", error);
  }
}

function goToUserProfile(userId: string) {
  if (!userId) return;
  openAppPath(`/pages/profile/index?userId=${encodeURIComponent(userId)}`);
}

function getCountdown(signalId: string): string {
  return countdownMap.value[signalId] ?? t("heartSignals.countdownCalculating");
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending": return t("heartSignals.statusPending");
    case "accepted": return t("heartSignals.statusAccepted");
    case "declined": return t("heartSignals.statusDeclined");
    case "expired": return t("heartSignals.statusExpired");
    default: return status;
  }
}

/**
 * R4-00025：倒计时进度条宽度按信号实际 expiresAt 动态计算（不再硬编码 24h 动画）。
 * 剩余比例 = (expiresAt - now) / (expiresAt - createdAt)，无 createdAt 时按 24h 兜底。
 * @returns 0-100 的百分比宽度
 */
function countdownWidth(signal: { expiresAt: string; createdAt?: string }): number {
  const expiresAt = new Date(signal.expiresAt).getTime();
  // 无效时间按无剩余处理（宽度 0，配合倒计时文案显示"已过期"）
  if (Number.isNaN(expiresAt)) return 0;
  const createdAt = signal.createdAt ? new Date(signal.createdAt).getTime() : NaN;
  const total = Number.isNaN(createdAt)
    ? 24 * 60 * 60 * 1000 // 契约 24h 有效期兜底
    : Math.max(expiresAt - createdAt, 1);
  const remaining = expiresAt - Date.now();
  const ratio = Math.min(1, Math.max(0, remaining / total));
  return Math.round(ratio * 100);
}
</script>

<template>
  <view class="heart-signals-page page-fade-in">
    <!-- 未完善资料：锁定页 -->
    <LockScreen
      v-if="!isUnlocked"
      :page-name="$t('heartSignals.pageName')"
      :completion-percent="completionPercent"
    />

    <template v-else>
      <!-- 顶部渐变 -->
      <view class="page-header-overlay" />

      <!-- 页面头部 -->
      <view class="page-header">
        <text class="page-header__title">{{ $t("heartSignals.navTitle") }}</text>
        <text class="page-header__subtitle">{{ $t("heartSignals.navSubtitle") }}</text>
      </view>

      <!-- 状态筛选 Tab -->
      <view class="signal-tabs">
        <view
          class="signal-tabs__item press-feedback"
          :class="{ 'signal-tabs__item--active': activeTab === 'pending' }"
          @tap="activeTab = 'pending'"
        >
          <text class="signal-tabs__text">{{ $t("heartSignals.tabPending") }}</text>
          <view v-if="pendingSignals.length > 0" class="signal-tabs__badge">
            <text class="signal-tabs__badge-text">{{ pendingSignals.length }}</text>
          </view>
        </view>
        <view
          class="signal-tabs__item press-feedback"
          :class="{ 'signal-tabs__item--active': activeTab === 'accepted' }"
          @tap="activeTab = 'accepted'"
        >
          <text class="signal-tabs__text">{{ $t("heartSignals.tabAccepted") }}</text>
        </view>
        <view
          class="signal-tabs__item press-feedback"
          :class="{ 'signal-tabs__item--active': activeTab === 'declined' }"
          @tap="activeTab = 'declined'"
        >
          <text class="signal-tabs__text">{{ $t("heartSignals.tabDeclined") }}</text>
        </view>
      </view>

      <!-- 加载 -->
      <view v-if="loading" class="loading-state" role="status" aria-live="polite">
        <view class="loading-state__spinner" />
        <text class="loading-state__text">{{ $t("heartSignals.loadingText") }}</text>
      </view>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="activeTab === 'pending' && pendingSignals.length === 0"
        type="no-data"
        :title="$t('heartSignals.emptyPendingTitle')"
        :description="$t('heartSignals.emptyPendingDesc')"
      />
      <EmptyState
        v-else-if="activeTab === 'accepted' && acceptedSignals.length === 0"
        type="no-data"
        :title="$t('heartSignals.emptyAcceptedTitle')"
        :description="$t('heartSignals.emptyAcceptedDesc')"
      />
      <EmptyState
        v-else-if="activeTab === 'declined' && declinedSignals.length === 0"
        type="no-data"
        :title="$t('heartSignals.emptyDeclinedTitle')"
        :description="$t('heartSignals.emptyDeclinedDesc')"
      />

      <!-- 待处理信号列表 -->
      <scroll-view
        v-else-if="activeTab === 'pending'"
        scroll-y
        class="signal-list"
      >
        <view
          v-for="signal in pendingSignals"
          :key="signal.id"
          class="signal-card animate-fade-in"
        >
          <view class="signal-card__header" @tap="goToUserProfile(signal.fromUserId)">
            <image
              v-if="signal.fromUserAvatar"
              class="signal-card__avatar"
              :src="resolveMediaUrl(signal.fromUserAvatar)"
              mode="aspectFill" lazy-load alt=""
            />
            <view v-else class="signal-card__avatar-placeholder">
              <text class="signal-card__avatar-initial">{{ signal.fromUserName?.charAt(0) || '?' }}</text>
            </view>
            <view class="signal-card__user-info">
              <text class="signal-card__name">{{ signal.fromUserName }}</text>
              <text class="signal-card__time">{{ getCountdown(signal.id) }}{{ $t("heartSignals.cardExpireSuffix") }}</text>
            </view>
          </view>
          <view class="signal-card__body">
            <text class="signal-card__desc">{{ $t("heartSignals.cardDesc") }}</text>
          </view>
          <view class="signal-card__actions">
            <view class="signal-card__btn signal-card__btn--decline press-feedback" @tap="handleDecline(signal.id)">
              <text class="signal-card__btn-text">{{ $t("heartSignals.rejectBtn") }}</text>
            </view>
            <view class="signal-card__btn signal-card__btn--accept press-feedback" @tap="handleAccept(signal.id)">
              <text class="signal-card__btn-text">{{ $t("heartSignals.acceptBtn") }}</text>
            </view>
          </view>
          <!-- 过期倒计时进度条（R4-00025：宽度按实际 expiresAt 动态计算） -->
          <view class="signal-card__countdown-bar">
            <view
              class="signal-card__countdown-fill"
              :style="{ width: countdownWidth(signal) + '%' }"
            />
          </view>
        </view>
      </scroll-view>

      <!-- 已接受 / 已过期列表 -->
      <scroll-view
        v-else
        scroll-y
        class="signal-list"
      >
        <view
          v-for="signal in (activeTab === 'accepted' ? acceptedSignals : declinedSignals)"
          :key="signal.id"
          class="signal-card signal-card--done animate-fade-in"
        >
          <view class="signal-card__done-header" @tap="goToUserProfile(signal.fromUserId)">
            <image
              v-if="signal.fromUserAvatar"
              class="signal-card__avatar signal-card__avatar--small"
              :src="resolveMediaUrl(signal.fromUserAvatar)"
              mode="aspectFill" lazy-load alt=""
            />
            <view v-else class="signal-card__avatar-placeholder signal-card__avatar-placeholder--small">
              <text class="signal-card__avatar-initial">{{ signal.fromUserName?.charAt(0) || '?' }}</text>
            </view>
            <view class="signal-card__user-info">
              <text class="signal-card__name">{{ signal.fromUserName }}</text>
            </view>
            <view class="signal-card__status-tag" :class="'signal-card__status-tag--' + signal.status">
              <text class="signal-card__status-text">{{ getStatusLabel(signal.status) }}</text>
            </view>
          </view>
          <!-- 2026-08-08 走查 P0-3：已接受信号「开聊」按钮（过期信号不展示） -->
          <view v-if="activeTab === 'accepted'" class="signal-card__done-actions">
            <view class="signal-card__btn signal-card__btn--accept press-feedback" @tap="handleChat(signal.id)">
              <text class="signal-card__btn-text">{{ $t("heartSignals.chatBtn") }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.heart-signals-page {
  display: flex;
  flex-direction: column;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
  background: var(--c-gradient-page);
  padding: var(--sp-6) var(--sp-8);
  padding-top: calc(env(safe-area-inset-top) + var(--sp-6));
  box-sizing: border-box;
  position: relative;
}

.page-header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 280rpx;
  background: linear-gradient(135deg, var(--c-romance-100) 0%, var(--c-bg-brand) 100%);
  pointer-events: none;
  z-index: 0;
}

/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  margin-bottom: var(--section-gap);
  position: relative;
  z-index: 1;
}

.page-header__title {
  font-size: var(--fs-5xl);
  font-weight: 800;
  color: var(--c-romance-600);
}

.page-header__subtitle {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

/* ========== 状态 Tab ========== */
.signal-tabs {
  display: flex;
  margin-bottom: var(--section-gap);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  padding: var(--sp-2);
  box-shadow: var(--s-card-soft);
  position: relative;
  z-index: 1;
}

.signal-tabs__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: var(--sp-4) 0;
  border-radius: var(--r-lg);
  transition: all var(--d-slow, 250ms) ease;
}

.signal-tabs__item--active {
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
}

.signal-tabs__text {
  font-size: var(--fs-lg);
  font-weight: 500;
  color: var(--c-text-secondary);
}

.signal-tabs__item--active .signal-tabs__text {
  color: var(--c-text-inverse);
  font-weight: 600;
}

.signal-tabs__badge {
  min-width: var(--sp-8);
  height: var(--sp-8);
  padding: 0 var(--sp-2);
  border-radius: var(--r-full);
  background: var(--c-romance-500);
  display: flex;
  align-items: center;
  justify-content: center;
}

.signal-tabs__badge-text {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-text-inverse);
}

/* ========== 加载 ========== */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
}

.loading-state__spinner {
  width: var(--sp-10);
  height: var(--sp-10);
  border: var(--sp-1) solid var(--c-neutral-100);
  border-top-color: var(--c-brand);
  border-radius: var(--r-full);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

/* ========== 列表 ========== */
.signal-list {
  flex: 1;
  position: relative;
  z-index: 1;
}

.signal-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  padding: var(--sp-7);
  margin-bottom: var(--sp-5);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  overflow: hidden;
}

.signal-card__header {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  margin-bottom: var(--sp-5);
}

.signal-card__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-full);
  border: var(--sp-1) solid var(--c-romance-200);
  flex-shrink: 0;
}

.signal-card__avatar--small {
  width: 72rpx;
  height: 72rpx;
}

.signal-card__avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-romance-100), var(--c-romance-200));
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--sp-1) solid var(--c-romance-200);
  flex-shrink: 0;
}

.signal-card__avatar-placeholder--small {
  width: 72rpx;
  height: 72rpx;
}

.signal-card__avatar-initial {
  font-size: var(--fs-4xl);
  font-weight: 700;
  color: var(--c-romance-500);
}

.signal-card__user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.signal-card__name {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.signal-card__time {
  font-size: var(--fs-sm);
  color: var(--c-romance-500);
  font-weight: 500;
}

.signal-card__body {
  margin-bottom: var(--sp-5);
  padding: var(--sp-4) var(--sp-5);
  background: var(--c-romance-50);
  border-radius: var(--r-md);
}

.signal-card__desc {
  font-size: var(--fs-md);
  color: var(--c-romance-600);
  line-height: 1.6;
}

.signal-card__actions {
  display: flex;
  gap: var(--sp-4);
}

/* 2026-08-08 走查 P0-3：已接受信号「开聊」按钮行 */
.signal-card__done-actions {
  display: flex;
  gap: var(--sp-4);
  margin-top: var(--sp-4);
}

.signal-card__done-actions .signal-card__btn {
  flex: 0 1 240rpx;
}

.signal-card__btn {
  flex: 1;
  padding: var(--sp-4) 0;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* #ifdef H5 */
.signal-card__btn:active {
  transform: scale(0.96);
}
/* #endif */

.signal-card__btn--decline {
  background: var(--c-neutral-100);
}

.signal-card__btn--accept {
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
}

.signal-card__btn-text {
  font-size: var(--fs-lg);
  font-weight: 600;
}

.signal-card__btn--decline .signal-card__btn-text {
  color: var(--c-text-secondary);
}

.signal-card__btn--accept .signal-card__btn-text {
  color: var(--c-text-inverse);
}

.signal-card__countdown-bar {
  margin-top: var(--sp-5);
  height: 4rpx;
  border-radius: var(--r-xs, 2rpx);
  background: var(--c-neutral-100);
  overflow: hidden;
}

/* R4-00025：宽度由 countdownWidth() 内联样式动态设置，移除硬编码 24h 动画 */
.signal-card__countdown-fill {
  height: 100%;
  width: 0;
  background: var(--c-gradient-brand);
  transition: width var(--d-normal, 200ms) linear;
}

/* ========== 已完成信号 ========== */
.signal-card--done {
  padding: var(--sp-5) var(--sp-7);
}

.signal-card__done-header {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.signal-card__status-tag {
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.signal-card__status-tag--accepted {
  background: var(--c-bg-brand);
}

.signal-card__status-tag--expired {
  background: var(--c-neutral-100);
}

/* R4-00024：契约新增 declined 状态标签样式（对齐 expired 的灰底中性展示） */
.signal-card__status-tag--declined {
  background: var(--c-neutral-100);
}

.signal-card__status-tag--accepted .signal-card__status-text {
  color: var(--c-brand);
  font-size: var(--fs-sm);
  font-weight: 600;
}

.signal-card__status-tag--expired .signal-card__status-text,
.signal-card__status-tag--declined .signal-card__status-text {
  color: var(--c-text-tertiary);
  font-size: var(--fs-sm);
  font-weight: 500;
}

/* ========== 动画 ========== */
.animate-fade-in {
  animation: fadeIn var(--d-slower, 350ms) ease both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
