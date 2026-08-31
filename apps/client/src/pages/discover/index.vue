<script setup lang="ts">


import { computed, ref, watch } from "vue";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useDiscoverStore } from "../../stores/discover";
import { useSessionStore } from "../../stores/session";
import { useAppConfigStore } from "../../stores/app-config";
import { useProfileStore } from "../../stores/profile";
import { useMatchStore } from "../../stores/match";
import { ROUTES } from "../../constants/routes";
import { useTabBar } from "../../composables/useTabBar";
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import { isCacheFresh, setCachedValue } from "../../utils/cache-ttl";
import { ensureCertified } from "../../guards/campus-gate";
import { getToken } from "../../services/http";
// 修复#7（第五轮 QA）：mock 模式无网络请求，dev-user 会话（已登录但无真实 token）也允许拉取本地匹配卡
import { useMock } from "../../stores/helpers/use-mock";
import { openAppPath, openUserProfile } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import { toMatchCardUser } from "../../view-models/match";
import MatchCard from "../../components/match/MatchCard.vue";
import MatchActions from "../../components/match/MatchActions.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import FilterDrawer from "../../components/discover/FilterDrawer.vue";
// 2026-08-26：寻觅「附近」卡片化——本地距离筛选 + 近→远排序，复用推荐卡片视图
import { filterNearby, sortNearbyFirst, NEARBY_MAX_DISTANCE_KM } from "../../stores/discover/utils";
import type { DiscoverCard } from "../../stores/discover/types";

const DISCOVER_TTL_MS = 30_000;

const { t } = useI18n();
const discoverStore = useDiscoverStore();
const sessionStore = useSessionStore();
const appConfigStore = useAppConfigStore();
const profileStore = useProfileStore();
const matchStore = useMatchStore();
const scrollTop = ref(0);

useTabBar(2);
const { styleVars: menuStyleVars } = useMenuButtonRect();

const { cards, loading, errorMessage } = storeToRefs(discoverStore);
const { isMatchOpen } = storeToRefs(appConfigStore);

/** 寻觅页分段：recommend-推荐 / nearby-附近（卡片视图） */
type DiscoverMode = "recommend" | "nearby";
const activeMode = ref<DiscoverMode>("recommend");

/**
 * 当前展示卡片列表：
 * - 推荐：保持 store 原始顺序（推荐算法权重）；
 * - 附近：复用推荐卡片样式，先按 ≤20km 过滤，再按同校→距离升序（近→远）排序。
 */
const visibleCards = computed<DiscoverCard[]>(() => {
  const list = cards.value;
  if (activeMode.value !== "nearby") return list;
  return sortNearbyFirst(filterNearby(list));
});

const currentCard = computed(() => visibleCards.value[0] ?? null);
const currentUser = computed(() =>
  currentCard.value ? toMatchCardUser(currentCard.value) : null
);

/** 空态文案：附近模式与推荐模式分开，便于用户理解为何无卡 */
const emptyMessage = computed(() =>
  errorMessage.value
    ? t("discover.loadFailedTitle")
    : discoverStore.quotaExhausted
      ? t("discover.card.quotaExhaustedTitle")
      : activeMode.value === "nearby"
        ? t("discover.card.nearbyEmptyTitle")
        : t("discover.card.emptyTitle")
);

function requireLogin(): boolean {
  if (sessionStore.isLoggedIn) return true;
  uni.showToast({ title: t("apiErrors.loginRequired"), icon: "none" });
  return false;
}

function goLogin() {
  openAppPath("/pages/login/index");
}

/**
 * 切换寻觅分段（推荐 / 附近）。
 * - 原实现「附近」直接 switchTab 跳附近页（Explore），与用户预期「同款卡片」不符；
 * - 现改为页内切换：本地即时过滤/排序（无需网络请求，响应零延迟），
 *   同时同步 store 匹配范围，使后续 fetchCards / 下拉刷新沿用附近限定（≤20km）。
 */
function switchDiscoverMode(mode: DiscoverMode) {
  activeMode.value = mode;
  discoverStore.activeFilter = mode === "nearby" ? "nearby" : "all";
  discoverStore.matchScope = mode === "nearby" ? "nearby" : "all";
  // 同步透传参数：附近限定 distanceMax=20，真实接口下轮拉取同样按距离过滤
  discoverStore.recommendationFilter = {
    ...discoverStore.recommendationFilter,
    distanceMax: mode === "nearby" ? NEARBY_MAX_DISTANCE_KM : undefined,
  };
}

function handleCardTap() {
  if (!currentUser.value) return;
  openUserProfile(currentUser.value.userId);
}

async function handleSwipeLeft() {
  if (!currentCard.value) return;
  try {
    await discoverStore.swipeLeft(currentCard.value.id);
  } catch (error) {
    const message = discoverStore.errorMessage || t("discover.operationFailed");
    uni.showToast({ title: message, icon: "none" });
    console.error("跳过操作失败:", error);
  }
}

function enterMatching(action: "like" | "superLike") {
  const card = currentCard.value;
  if (!card) return;
  matchStore.beginCheck(toMatchCardUser(card), card.id, action);
  const query =
    `userId=${encodeURIComponent(card.userId)}` +
    `&cardId=${encodeURIComponent(card.id)}` +
    `&action=${encodeURIComponent(action)}`;
  openAppPath(`${ROUTES.DISCOVER.MATCHING}?${query}`);
}

// 2026-08-31：筛选抽屉为全屏弹层——打开时隐藏自定义 tabbar，避免遮挡底部操作（录屏实证）
watch(
  () => discoverStore.isFilterDrawerOpen,
  (open) => setTabBarHidden(open)
);

async function handleLike() {
  if (!requireLogin()) return;
  if (!ensureCertified("realname")) return;
  enterMatching("like");
}

async function handleSuperLike() {
  if (!requireLogin()) return;
  if (!ensureCertified("realname")) return;
  enterMatching("superLike");
}

function loadDiscoverData() {
  // 未登录时也加载mock预览数据（点击交互时再引导登录）
  // 修复#7（第五轮 QA）：原守卫 (getToken() || !isLoggedIn) 会拦截「已登录但无真实 token」的
  // dev-user mock 会话（enterDevUserDemo 不写 token），导致匹配卡/操作按钮缺失。
  // mock 模式（useMock=true）fetchCards 走 mockFixtures.getRecommendations 本地数据，无网络请求，
  // 故放行；真实模式保持原语义（游客放行 mock 预览、登录后带 token 拉真实数据）。
  if (!isCacheFresh("discover:data", DISCOVER_TTL_MS) && (getToken() || !sessionStore.isLoggedIn || useMock())) {
    void discoverStore.fetchCards();
    setCachedValue("discover:data", true);
  }
  if (sessionStore.isLoggedIn) {
    void profileStore.load();
  }
}

onLoad(() => {
  loadDiscoverData();
});

onShow(() => {
  discoverStore.resetDailyLimit();
  if (!isCacheFresh("discover:data", DISCOVER_TTL_MS)) {
    loadDiscoverData();
  }
});

watch(
  () => sessionStore.isLoggedIn,
  () => loadDiscoverData()
);

onUnload(() => {
  discoverStore.dispose();
});
</script>

<template>
  <view class="match-page" :style="menuStyleVars">
    <!-- 顶部导航栏：寻觅♥ + 推荐/附近分段 + 筛选 -->
    <view class="discover-header">
      <view class="discover-header__top">
        <view class="discover-header__titles">
          <text class="discover-header__title">寻觅</text>
          <image class="discover-header__heart" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
        </view>
        <view
          class="discover-header__filter"
          hover-class="discover-header__filter--pressed"
          hover-stay-time="40"
          role="button"
          :aria-label="'筛选'"
          @tap="discoverStore.isFilterDrawerOpen = true"
        >
          <image class="discover-header__filter-icon" :src="IMAGE_PATHS.ICONS_V2.SLIDERS" mode="aspectFit" alt="" />
        </view>
      </view>
      <view class="discover-header__tabs">
        <view
          class="discover-header__tab"
          :class="{ 'discover-header__tab--active': activeMode === 'recommend' }"
          role="tab"
          :aria-selected="activeMode === 'recommend' ? 'true' : 'false'"
          :aria-label="'推荐'"
          @tap="switchDiscoverMode('recommend')"
        >
          <text class="discover-header__tab-text" :class="{ 'discover-header__tab-text--active': activeMode === 'recommend' }">推荐</text>
          <view v-if="activeMode === 'recommend'" class="discover-header__tab-line" />
        </view>
        <view
          class="discover-header__tab"
          :class="{ 'discover-header__tab--active': activeMode === 'nearby' }"
          role="tab"
          :aria-selected="activeMode === 'nearby' ? 'true' : 'false'"
          :aria-label="'附近'"
          @tap="switchDiscoverMode('nearby')"
        >
          <text class="discover-header__tab-text" :class="{ 'discover-header__tab-text--active': activeMode === 'nearby' }">附近</text>
          <view v-if="activeMode === 'nearby'" class="discover-header__tab-line" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="match-scroll" :show-scrollbar="false" :scroll-top="scrollTop">
      <view v-if="errorMessage" class="match-error">
        <text class="match-error__text">{{ errorMessage }}</text>
        <text class="match-error__retry" role="button" :aria-label="t('common.retry')" @tap="loadDiscoverData">
          {{ t('discover.errorRetry') }}
        </text>
      </view>

      <view v-if="!isMatchOpen" class="match-state">
        <EmptyState type="no-data" :image="IMAGE_PATHS.ICONS_COMMON.HEART" :message="t('discover.matchClosed')" />
      </view>

      <view v-else-if="loading && cards.length === 0" class="match-state">
        <Skeleton variant="card" :count="1" />
      </view>

      <view v-else-if="visibleCards.length === 0" class="match-state">
        <EmptyState
          :type="errorMessage ? 'network' : 'no-data'"
          :image="errorMessage ? '' : IMAGE_PATHS.ICONS_COMMON.HEART"
          mascot="sad"
          :message="emptyMessage"
        />
      </view>

      <template v-else>
        <view class="match-card-area">
          <MatchCard
            v-if="currentUser"
            :user="currentUser"
            @tap="handleCardTap"
            @swipe-left="handleSwipeLeft"
            @swipe-right="handleLike"
          />
        </view>

        <MatchActions
          :busy="loading"
          @pass="handleSwipeLeft"
          @like="handleLike"
          @super-like="handleSuperLike"
        />

      </template>
    </scroll-view>

    <!-- 未登录时：底部登录提示（不拦截全屏，卡片可预览） -->
    <view v-if="!sessionStore.isLoggedIn" class="discover-login-hint" @tap="goLogin">
      <text class="discover-login-hint__text">登录后可与 TA 互动</text>
    </view>

    <FilterDrawer
      v-model:visible="discoverStore.isFilterDrawerOpen"
      :filter="discoverStore.recommendationFilter"
      @apply="discoverStore.setRecommendationFilter"
      @reset="discoverStore.resetFilter"
    />
  </view>
</template>

<style scoped lang="scss">
.match-page {
  flex-direction: column;
  display: flex;
  height: 100vh;
  background: var(--c-bg-page, #F7FAF9);
  padding-top: calc(env(safe-area-inset-top) + 20px);
  padding-bottom: calc(112rpx + env(safe-area-inset-bottom) + 16rpx);
  box-sizing: border-box;
}

.match-scroll {
  flex: 1;
  min-height: 0;
}

.match-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 24rpx 32rpx 16rpx;
}

.match-header__titles {
  display: flex;
  gap: 6rpx;
}

.match-header__title {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.match-header__subtitle {
  font-size: 24rpx;
  color: #8a9694;
}

.match-header__count {
  font-size: 22rpx;
  color: #5f6f6b;
  padding-bottom: 6rpx;
}

.match-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 16rpx;
}

.match-toolbar__icons {
  display: flex;
  gap: 24rpx;
}

.match-toolbar__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #ffffff);
  box-shadow: 0 6rpx 16rpx rgba(30, 80, 65, 0.08);
}

.match-toolbar__icon-img {
  width: 32rpx;
  height: 32rpx;
}

.match-error {
  margin: 0 32rpx 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: #fff0f0;
}

.match-error__text {
  flex: 1;
  font-size: 24rpx;
  color: #c34a5f;
}

.match-error__retry {
  font-size: 24rpx;
  color: #e94d87;
  font-weight: 700;
}

.match-state {
  padding: 32rpx;
}

.match-state__action {
  margin-top: 24rpx;
  padding: 16rpx 40rpx;
  border-radius: 999rpx;
  background: #36C99A;
}

.match-state__action-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 700;
}

.discover-header {
  flex-shrink: 0;
  padding: 24rpx 32rpx 16rpx;
  background: var(--c-bg-container, #ffffff);
}

.discover-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: calc(var(--capsule-right, 0px) + 24px);
}

.discover-header__titles {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.discover-header__title {
  font-size: 48rpx;
  font-weight: 700;
  color: #333A37;
  line-height: 1.1;
}

.discover-header__heart {
  width: 34rpx;
  height: 34rpx;
  margin-left: 4rpx;
  color: #FF6B81;
}

.discover-header__filter {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--c-bg-container, #ffffff);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.discover-header__filter--pressed {
  opacity: 0.7;
}

.discover-header__filter-icon {
  width: 32rpx;
  height: 32rpx;
}

.discover-header__tabs {
  display: flex;
  gap: 48rpx;
  margin-top: 16rpx;
}

.discover-header__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 4rpx;
}

.discover-header__tab-text {
  font-size: 36rpx;
  color: #9AA39F;
  font-weight: 500;
  line-height: 1.2;
}

.discover-header__tab-line {
  width: 48rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: #FF6B81;
  margin-top: 8rpx;
}

.discover-header__tab-text--active {
  color: var(--c-text-primary, #222222);
  font-weight: 700;
}

.match-card-area {
  margin: 0 40rpx;
  height: 880rpx;
}

.discover-login-hint {
  position: fixed;
  bottom: 120rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 40rpx;
  background: linear-gradient(135deg, #36C99A, #4DD0A8);
  border-radius: 999rpx;
  box-shadow: 0 8rpx 32rpx rgba(54, 201, 154, 0.35);
  z-index: 100;
}

.discover-login-hint__text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

.more-recommend {
  padding: 24rpx 0 8rpx;
}

.more-recommend__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 16rpx;
}

.more-recommend__title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.more-recommend__all {
  font-size: 24rpx;
  color: #36C99A;
}

.more-recommend__scroll {
  width: 100%;
}

.more-recommend__list {
  display: flex;
  gap: 20rpx;
  padding: 0 32rpx;
}

.more-recommend__item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  width: 112rpx;
}

.more-recommend__avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: #eef3f1;
}

.more-recommend__name {
  font-size: 22rpx;
  color: #5f6f6b;
}
</style>
