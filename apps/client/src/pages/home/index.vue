<script setup lang="ts">
/**
 * 首页 V3：今日恋爱首页（Explore Today）
 * 页面只负责拉取 homeFeed 并编排组件，不直接请求多个业务接口。
 * 禁止使用 CardSwiper；连续人物浏览属于「寻觅」Tab。
 */
import { computed, ref } from "vue";
import { onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useHomeStore } from "../../stores/home";
import { useCircleStore } from "../../stores/circle";
import { useSessionStore } from "../../stores/session";
import { clientApi } from "../../services/api";
import { openAppPath, openUserProfile, switchTabWithQuery } from "../../utils/navigation";
import { useTabBar } from "../../composables/useTabBar";
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import { ROUTES } from "../../constants/routes";
import { toHomeViewModel, type HomeViewModel } from "../../view-models/home-dashboard";
import HomeHeader from "../../components/home/HomeHeader.vue";
import TodayRecommendationCard from "../../components/home/TodayRecommendationCard.vue";
import TodayLoveProgress from "../../components/home/TodayLoveProgress.vue";
import RelationActivity from "../../components/home/RelationActivity.vue";
import InterestRecommendation from "../../components/home/InterestRecommendation.vue";
import NearbyPeople from "../../components/home/NearbyPeople.vue";
import CommunityFeed from "../../components/home/CommunityFeed.vue";
import InviteBanner from "../../components/home/InviteBanner.vue";

useTabBar(0);

const { t } = useI18n();
const homeStore = useHomeStore();
const circleStore = useCircleStore();
const sessionStore = useSessionStore();
const { styleVars: menuStyleVars } = useMenuButtonRect();
const { homeFeed, loading } = storeToRefs(homeStore);

const viewModel = computed<HomeViewModel>(() => toHomeViewModel(homeFeed.value));
const likeLoading = ref(false);
const likeSent = ref(false);

onShow(() => {
  if (!sessionStore.isLoggedIn) {
    homeStore.homeFeed = null;
    return;
  }
  if (!homeFeed.value) {
    void homeStore.fetchDashboard();
  }
});

onPullDownRefresh(() => {
  void homeStore.fetchDashboard().finally(() => uni.stopPullDownRefresh());
});

function requireLogin(): boolean {
  if (sessionStore.isLoggedIn) return true;
  uni.showToast({ title: t("apiErrors.loginRequired"), icon: "none" });
  return false;
}

function goMessages() {
  uni.switchTab({ url: ROUTES.TAB.CHAT });
}

function goTodayProfile() {
  const item = viewModel.value.todayRecommendation;
  if (item) openUserProfile(item.userId);
}

async function likeToday() {
  const item = viewModel.value.todayRecommendation;
  if (!item) return;
  if (!requireLogin()) return;
  if (likeLoading.value) return;
  likeLoading.value = true;
  try {
    await clientApi.likeUser(String(item.userId));
    likeSent.value = true;
    uni.showToast({ title: t("discover.likeSent"), icon: "success" });
  } catch (error) {
    uni.showToast({ title: t("apiErrors.operationFailed"), icon: "none" });
  } finally {
    likeLoading.value = false;
  }
}

async function rotateToday() {
  if (!requireLogin()) return;
  likeSent.value = false;
  const next = await homeStore.rotateTodayRecommendation();
  if (!next) {
    uni.showToast({ title: t("home.noMoreRecommendation"), icon: "none" });
  }
}

function handleLoveStep(action: string) {
  if (action === "profile") uni.switchTab({ url: ROUTES.PROFILE.INDEX });
  else if (action === "discover") uni.switchTab({ url: ROUTES.TAB.DISCOVER });
  else if (action === "messages") uni.switchTab({ url: ROUTES.TAB.CHAT });
  else if (action === "nearby") uni.switchTab({ url: ROUTES.TAB.NEARBY });
}

function openCircle(circleId: number) {
  openAppPath(`${ROUTES.CIRCLES.TOPICS}?circleId=${encodeURIComponent(circleId)}`);
}

async function joinCircle(circleId: number) {
  if (!requireLogin()) return;
  await circleStore.joinCircle(String(circleId)).catch(() => {});
}

function openNearbyList() {
  openAppPath(ROUTES.NEARBY.PEOPLE);
}

function openPost(postId: number) {
  openAppPath(`/pages/village/detail?id=${encodeURIComponent(postId)}`);
}

function openCommunity() {
  openAppPath("/pages/village/index");
}

function openInvite() {
  switchTabWithQuery(ROUTES.PROFILE.INDEX, { invite: "1" });
}
</script>

<template>
  <view class="home-page page-bottom-safe" :style="menuStyleVars">
    <scroll-view scroll-y class="home-scroll" :show-scrollbar="false">
      <HomeHeader
        :location-text="sessionStore.userSession?.campusName ? `${sessionStore.userSession.campusName} · 3km` : '北京大学 · 3km'"
        @schoolTap="openNearbyList"
        @searchTap="openNearbyList"
        @notifyTap="goMessages"
      />

      <TodayRecommendationCard
        :item="viewModel.todayRecommendation"
        :loading="loading"
        :like-loading="likeLoading"
        @view="goTodayProfile"
        @like="likeToday"
        @rotate="rotateToday"
      />

      <TodayLoveProgress
        :completed="viewModel.loveProgress.completed"
        :total="viewModel.loveProgress.total"
        :steps="viewModel.loveProgress.steps"
        @step="handleLoveStep"
      />

      <RelationActivity
        :data="viewModel.relationActivity"
        @all="goMessages"
      />

      <view class="home-duo">
        <InterestRecommendation
          class="home-duo__half"
          :items="viewModel.interestRecommendations"
          @more="openAppPath(ROUTES.CIRCLES.INDEX)"
          @select="openCircle"
          @join="joinCircle"
        />
        <NearbyPeople
          class="home-duo__half"
          :items="viewModel.nearbyPeople"
          @more="openNearbyList"
          @select="openUserProfile"
        />
      </view>

      <CommunityFeed
        :items="viewModel.communityPosts"
        @more="openCommunity"
        @select="openPost"
      />

      <InviteBanner @invite="openInvite" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.home-page {
  min-height: 100%;
  background: var(--c-bg-page, #F7FAF9);
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(112rpx + env(safe-area-inset-bottom) + 16rpx);
}

.home-scroll {
  height: 100%;
}

.home-duo {
  display: flex;
  gap: 24rpx;
  margin: 0 32rpx 8rpx;
}

.home-duo__half {
  flex: 1;
  min-width: 0;
}
</style>
