<script setup lang="ts">
/**
 * 心动信号页 — 双向心动通知列表
 * 展示所有待处理/已接受/已过期的心动信号，支持接受/拒绝操作及倒计时
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useLikesStore } from "../../stores/likes";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import LockScreen from "../../components/common/LockScreen.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { likesPageRequirements } from "../../config/page-access";
import { IMAGE_PATHS } from "../../config/images";

const likesStore = useLikesStore();
const sessionStore = useSessionStore();

usePageAccess(likesPageRequirements);
const { heartSignals, loading } = storeToRefs(likesStore);

const isUnlocked = computed(() => sessionStore.isProfileComplete);
const completionPercent = computed(() => sessionStore.profileCompletion);

/** 按状态分组 */
const pendingSignals = computed(() =>
  heartSignals.value.filter((s) => s.status === "pending")
);
const acceptedSignals = computed(() =>
  heartSignals.value.filter((s) => s.status === "accepted")
);
const expiredSignals = computed(() =>
  heartSignals.value.filter((s) => s.status === "expired")
);

const activeTab = ref<"pending" | "accepted" | "expired">("pending");

/** 倒计时显示 */
const countdownMap = ref<Record<string, string>>({});
let countdownTimer: ReturnType<typeof setInterval> | null = null;

function updateCountdowns() {
  const now = Date.now();
  const map: Record<string, string> = {};
  for (const s of pendingSignals.value) {
    const expiresAt = new Date(s.expiresAt).getTime();
    const diff = expiresAt - now;
    if (diff <= 0) {
      map[s.id] = "已过期";
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      map[s.id] = `${hours}小时${minutes}分钟`;
    }
  }
  countdownMap.value = map;
}

onMounted(() => {
  if (isUnlocked.value) {
    void likesStore.fetchHeartSignals();
  }
  updateCountdowns();
  countdownTimer = setInterval(updateCountdowns, 30000);
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
    uni.showToast({ title: "已接受心动信号，去聊天吧", icon: "success" });
    void likesStore.fetchHeartSignals();
  } catch (e) {
    uni.showToast({ title: "操作失败，请稍后重试", icon: "none" });
  }
}

async function handleDecline(signalId: string) {
  try {
    await likesStore.declineHeartSignal(signalId);
    uni.showToast({ title: "已拒绝", icon: "none" });
    void likesStore.fetchHeartSignals();
  } catch (e) {
    uni.showToast({ title: "操作失败，请稍后重试", icon: "none" });
  }
}

function goToUserProfile(userId: string) {
  if (!userId) return;
  openAppPath(`/pages/profile/index?userId=${encodeURIComponent(userId)}`);
}

function getCountdown(signalId: string): string {
  return countdownMap.value[signalId] ?? "计算中...";
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending": return "待处理";
    case "accepted": return "已接受";
    case "expired": return "已过期";
    default: return status;
  }
}
</script>

<template>
  <view class="heart-signals-page page-fade-in">
    <!-- 未完善资料：锁定页 -->
    <LockScreen
      v-if="!isUnlocked"
      page-name="心动信号"
      :completion-percent="completionPercent"
    />

    <template v-else>
      <!-- 顶部渐变 -->
      <view class="page-header-overlay" />

      <!-- 页面头部 -->
      <view class="page-header">
        <text class="page-header__title">心动信号</text>
        <text class="page-header__subtitle">双向心动，从这里开始</text>
      </view>

      <!-- 状态筛选 Tab -->
      <view class="signal-tabs">
        <view
          class="signal-tabs__item press-feedback"
          :class="{ 'signal-tabs__item--active': activeTab === 'pending' }"
          @tap="activeTab = 'pending'"
        >
          <text class="signal-tabs__text">待处理</text>
          <view v-if="pendingSignals.length > 0" class="signal-tabs__badge">
            <text class="signal-tabs__badge-text">{{ pendingSignals.length }}</text>
          </view>
        </view>
        <view
          class="signal-tabs__item press-feedback"
          :class="{ 'signal-tabs__item--active': activeTab === 'accepted' }"
          @tap="activeTab = 'accepted'"
        >
          <text class="signal-tabs__text">已接受</text>
        </view>
        <view
          class="signal-tabs__item press-feedback"
          :class="{ 'signal-tabs__item--active': activeTab === 'expired' }"
          @tap="activeTab = 'expired'"
        >
          <text class="signal-tabs__text">已过期</text>
        </view>
      </view>

      <!-- 加载 -->
      <view v-if="loading" class="loading-state">
        <view class="loading-state__spinner" />
        <text class="loading-state__text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="activeTab === 'pending' && pendingSignals.length === 0"
        icon-kind="heart"
        title="暂无心动信号"
        description="多去看看推荐的人，双向喜欢后会收到心动信号"
      />
      <EmptyState
        v-else-if="activeTab === 'accepted' && acceptedSignals.length === 0"
        icon-kind="heart"
        title="暂无已接受的心动信号"
        description="接受心动信号后，双方可以开始聊天"
      />
      <EmptyState
        v-else-if="activeTab === 'expired' && expiredSignals.length === 0"
        icon-kind="heart"
        title="暂无过期的心动信号"
        description="心动信号有效期为24小时"
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
              :src="signal.fromUserAvatar"
              mode="aspectFill"
            />
            <view v-else class="signal-card__avatar-placeholder">
              <text class="signal-card__avatar-initial">{{ signal.fromUserName?.charAt(0) || '?' }}</text>
            </view>
            <view class="signal-card__user-info">
              <text class="signal-card__name">{{ signal.fromUserName }}</text>
              <text class="signal-card__time">{{ getCountdown(signal.id) }}后过期</text>
            </view>
          </view>
          <view class="signal-card__body">
            <text class="signal-card__desc">TA 也对你心动了！双向心动后即可开始聊天</text>
          </view>
          <view class="signal-card__actions">
            <view class="signal-card__btn signal-card__btn--decline press-feedback" @tap="handleDecline(signal.id)">
              <text class="signal-card__btn-text">拒绝</text>
            </view>
            <view class="signal-card__btn signal-card__btn--accept press-feedback" @tap="handleAccept(signal.id)">
              <text class="signal-card__btn-text">接受</text>
            </view>
          </view>
          <!-- 过期倒计时进度条 -->
          <view class="signal-card__countdown-bar">
            <view class="signal-card__countdown-fill" />
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
          v-for="signal in (activeTab === 'accepted' ? acceptedSignals : expiredSignals)"
          :key="signal.id"
          class="signal-card signal-card--done animate-fade-in"
        >
          <view class="signal-card__done-header" @tap="goToUserProfile(signal.fromUserId)">
            <image
              v-if="signal.fromUserAvatar"
              class="signal-card__avatar signal-card__avatar--small"
              :src="signal.fromUserAvatar"
              mode="aspectFill"
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
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.heart-signals-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
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
  transition: all 0.25s ease;
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
  animation: spin 1s linear infinite;
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

.signal-card__btn {
  flex: 1;
  padding: var(--sp-4) 0;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.signal-card__btn:active {
  transform: scale(0.96);
}

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
  border-radius: 2rpx;
  background: var(--c-neutral-100);
  overflow: hidden;
}

.signal-card__countdown-fill {
  height: 100%;
  width: 50%;
  background: var(--c-gradient-brand);
  animation: countdown-shrink 24h linear forwards;
}

@keyframes countdown-shrink {
  from { width: 100%; }
  to { width: 0%; }
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

.signal-card__status-tag--accepted .signal-card__status-text {
  color: var(--c-brand);
  font-size: var(--fs-sm);
  font-weight: 600;
}

.signal-card__status-tag--expired .signal-card__status-text {
  color: var(--c-text-tertiary);
  font-size: var(--fs-sm);
  font-weight: 500;
}

/* ========== 动画 ========== */
.animate-fade-in {
  animation: fadeIn 0.35s ease both;
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
