```vue
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
import { openAppPath, openUserProfile } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import { toMatchCardUser } from "../../view-models/match";
import MatchCard from "../../components/match/MatchCard.vue";
import MatchActions from "../../components/match/MatchActions.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import FilterDrawer from "../../components/discover/FilterDrawer.vue";

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

const currentCard = computed(() => cards.value[0] ?? null);
const currentUser = computed(() =>
  currentCard.value ? toMatchCardUser(currentCard.value) : null
);

function requireLogin(): boolean {
  if (sessionStore.isLoggedIn) return true;
  uni.showToast({ title: t("apiErrors.loginRequired"), icon: "none" });
  return false;
}

function goLogin() {
  openAppPath("/pages/login/index");
}

function goNearby() {
  uni.switchTab({ url: ROUTES.TAB.NEARBY });
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
  if (!isCacheFresh("discover:data", DISCOVER_TTL_MS) && (getToken() || !sessionStore.isLoggedIn)) {
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
          <text class="discover-header__heart">♥</text>
        </view>
        <view
          class="discover-header__filter"
          hover-class="discover-header__filter--pressed"
          hover-stay-time="120"
          role="button"
          :aria-label="'筛选'"
          @tap="discoverStore.isFilterDrawerOpen = true"
        >
          <image class="discover-header__filter-icon" :src="IMAGE_PATHS.ICONS_V2.SLIDERS" mode="aspectFit" alt="" />
          <image class="discover-header__filter-icon" :src="IMAGE_PATHS.ICONS_V2.DIAMOND_FILTER" mode="aspectFit" alt="" />
        </view>
      </view>
      <view class="discover-header__tabs">
        <view class="discover-header__tab discover-header__tab--active">
          <text class="discover-header__tab-text discover-header__tab-text--active">推荐</text>
          <view class="discover-header__tab-line" />
        </view>
        <view class="discover-header__tab" @tap="goNearby">
          <text class="discover-header__tab-text">附近</text>
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

      <view v-else-if="cards.length === 0" class="match-state">
        <EmptyState
          :type="errorMessage ? 'network' : 'no-data'"
          :image="errorMessage ? '' : IMAGE_PATHS.ICONS_COMMON.HEART"
          mascot="sad"
          :message="
            errorMessage
              ? t('discover.loadFailedTitle')
              : discoverStore.quotaExhausted
                ? t('discover.card.quotaExhaustedTitle')
                : t('discover.card.emptyTitle')
          "
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
  background: var(--c-bg-page, #f4fbf8);
  padding-top: env(safe-area-inset-top);
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
  font-size: 34rpx;
  color: #FF6B81;
  line-height: 1;
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
```

