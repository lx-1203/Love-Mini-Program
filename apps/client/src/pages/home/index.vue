<script setup lang="ts">


/**
 * 首页 V3：今日恋爱首页（Explore Today）
 * 页面只负责拉取 homeFeed 并编排组件，不直接请求多个业务接口。
 * 禁止使用 CardSwiper；连续人物浏览属于「寻觅」Tab。
 */
import { computed, ref, watch } from "vue";
import { onShow, onPullDownRefresh, onPageScroll } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useHomeStore } from "../../stores/home";
import { useMessagesStore } from "../../stores/messages";
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
import BottomSheet from "../../components/common/BottomSheet.vue";
import { fetchCurrentLocation, buildLocationText, reportLocation } from "../../utils/location";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";

useTabBar(0);

const { t } = useI18n();
const homeStore = useHomeStore();
// 2026-09-03 遗留差异清零：首页通知角标接真实未读数（messages bootstrap 有 30s 新鲜度缓存，幂等低成本）
const messagesStore = useMessagesStore();
const circleStore = useCircleStore();
const sessionStore = useSessionStore();
const { styleVars: menuStyleVars } = useMenuButtonRect();
const { homeFeed, loading } = storeToRefs(homeStore);

const viewModel = computed<HomeViewModel>(() => toHomeViewModel(homeFeed.value));
const likeLoading = ref(false);

// R3（MP-R3-HOME-006）：滚动时统计区会滑入状态栏/刘海与系统时间叠印——
// 滚过阈值后在顶部显示遮罩（R4：加高至状态栏+28px 渐变，让数字随滚动淡出而非硬裁切）
const statusBarPx = Number(uni.getSystemInfoSync().statusBarHeight ?? 0);
const pageScrolled = ref(false);
const topScrimStyle = computed(() => ({
  height: `${statusBarPx + 28}px`,
  opacity: pageScrolled.value ? "1" : "0",
}));
onPageScroll((e) => {
  const next = (e.scrollTop ?? 0) > 10;
  if (next !== pageScrolled.value) pageScrolled.value = next;
});

// 地理位置：尝试获取真实定位，失败时使用默认值
const locationText = ref(buildLocationText("", sessionStore.userSession?.campusName));
async function initLocation() {
  const loc = await fetchCurrentLocation();
  if (loc) {
    locationText.value = buildLocationText(loc.city, sessionStore.userSession?.campusName);
    // LBS Phase 2：上报坐标到后端（内部节流 5 分钟）
    void reportLocation(loc.latitude, loc.longitude);
  }
}
const likeSent = ref(false);

// 2026-09-02 R12（需求①）：论坛图片/首页数据更新不及时——
// 此前 onShow 仅在「无数据/有错」时重拉，发新帖或换头像后回到首页永远看不到更新。
// 增加 30s 陈旧阈值：超过即静默重拉（保留 loading 防重入），下拉刷新/登录补拉共用同一时间戳。
const HOME_FEED_STALE_MS = 30_000;
let lastFeedFetchTs = 0;

function refreshHomeFeed() {
  if (loading.value) return;
  lastFeedFetchTs = Date.now();
  void homeStore.fetchDashboard();
}

onShow(() => {
  // 未登录也能加载预览数据（点击交互时再跳登录）
  const stale = Date.now() - lastFeedFetchTs > HOME_FEED_STALE_MS;
  if (!homeFeed.value || homeStore.errorMessage || stale) {
    refreshHomeFeed();
  }
  // 修复：initLocation 在 if 外面，始终执行定位
  void initLocation();
  // 2026-09-03 遗留差异清零：拉取通知未读数驱动首页角标（未登录时 bootstrap 内部自行短路）
  if (sessionStore.isLoggedIn) {
    void messagesStore.bootstrap();
  }
});

// 2026-08-21 修复：bootstrap 异步完成后 isLoggedIn 才为 true，onShow 可能已跳过加载；
// 登录态变化后自动补拉首页 Feed，保证登录后进入即有完整数据
watch(
  () => sessionStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn && !homeFeed.value) {
      refreshHomeFeed();
    }
  }
);

onPullDownRefresh(() => {
  lastFeedFetchTs = Date.now();
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

let todayNavLock = false;
/** 2026-09-02 R8：今日推荐整卡点击防抖（连续点 / 点住拖动不再重复 navigateTo 卡顿） */
function goTodayProfile() {
  const item = viewModel.value.todayRecommendation;
  if (!item) return;
  if (todayNavLock) return;
  todayNavLock = true;
  // 解锁窗口 800ms，覆盖 navigateTo 动画期
  setTimeout(() => { todayNavLock = false; }, 800);
  openUserProfile(item.userId);
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
  // 2026-09-12：入口改跳理想图版圈子主页 circle-home（与附近页热门兴趣圈同口径）
  openAppPath(`${ROUTES.CIRCLES.HOME}?circleId=${encodeURIComponent(String(circleId))}`);
}

async function joinCircle(circleId: number) {
  if (!requireLogin()) return;
  await circleStore.joinCircle(String(circleId)).catch(() => {});
}

/**
 * 2026-09-02 R5：需求 9——顶部定位按钮点击 → 弹出底部 BottomSheet「我的位置」
 * （参考 t00012/13/14 弹窗样式：顶部绿色面板 + 位置信息列表 + 底部绿色按钮）
 */
const locationSheetVisible = ref(false);
const locating = ref(false);
async function openLocationSheet() {
  locationSheetVisible.value = true;
  // 弹起时主动拉一次定位，保证信息新鲜
  await refetchLocation();
}
async function refetchLocation() {
  locating.value = true;
  try {
    const loc = await fetchCurrentLocation();
    if (loc) {
      locationText.value = buildLocationText(loc.city, sessionStore.userSession?.campusName);
      void reportLocation(loc.latitude, loc.longitude);
    }
  } finally {
    locating.value = false;
  }
}
function closeLocationSheet() {
  locationSheetVisible.value = false;
}

/**
 * 2026-09-02 R12（需求⑨）：弹窗内提供「位置主页」跳转——
 * 进入个人主页中专门的位置定位页（subpackages/profile-extra/profile/location）。
 */
function openLocationPage() {
  locationSheetVisible.value = false;
  openAppPath(ROUTES.PROFILE.LOCATION);
}

function openNearbyList() {
  // NearbyPeople 的「更多」「全部」按钮 → 跳附近列表页
  // 2026-09-04 问题4修复：补 fail 回调消除"无响应"静默失败（目标页已在 pages.json 注册，
  // 但运行时仍可能被拦截/栈满；失败时给用户可见 toast）
  openAppPath(ROUTES.NEARBY.PEOPLE, {
    fail: () => uni.showToast({ title: "页面打开失败，请重试", icon: "none" }),
  });
}

// 2026-09-04 问题6修复：关系动态 4 格跳转从内联箭头函数改为独立 handler，
// 统一走 openAppPath(url, { fail }) —— 跳转静默失败时给用户可见 toast。
// whispers 目标 ROUTES.MESSAGES.INDEX（= /pages/messages/index，即 TAB.CHAT）是 tab 页，
// openAppPath 自动 switchTab，无需特殊处理。
function openRelationLikedBy() {
  openAppPath(ROUTES.LIKES.VISITORS_LIKES, {
    fail: () => uni.showToast({ title: "页面打开失败，请重试", icon: "none" }),
  });
}
function openRelationWhispers() {
  openAppPath(ROUTES.MESSAGES.INDEX, {
    fail: () => uni.showToast({ title: "页面打开失败，请重试", icon: "none" }),
  });
}
function openRelationVisitors() {
  openAppPath(ROUTES.PROFILE.VISITORS, {
    fail: () => uni.showToast({ title: "页面打开失败，请重试", icon: "none" }),
  });
}
function openRelationMatches() {
  openAppPath(ROUTES.LIKES.INDEX, {
    fail: () => uni.showToast({ title: "页面打开失败，请重试", icon: "none" }),
  });
}

function openPost(postId: number) {
  openAppPath(`/subpackages/village/village/detail?id=${encodeURIComponent(postId)}`);
}

/** 2026-08-31：社区动态作者头像/昵称点击 → 他人大主页（无 authorId 时降级不跳转） */
function onCommunityAuthorTap(post: { authorId?: number | null }) {
  if (post?.authorId != null) openUserProfile(post.authorId);
}

function openCommunity() {
  // R21（2026-09-09）：社区动态「查看更多」→ 村口动态流列表页（原误跳发帖页）
  openAppPath("/subpackages/village/village/index");
}

function openInvite() {
  switchTabWithQuery(ROUTES.PROFILE.INDEX, { invite: "1" });
}
</script>

<template>
  <view class="home-page page-bottom-safe" :style="menuStyleVars">
    <!-- R3：滚动状态栏遮罩（渐变过渡，滚过阈值淡入） -->
    <view class="home-page__top-scrim" :style="topScrimStyle" />
    <!-- 2026-09-03 背景随页面滚动（用户反馈①）：scroll-view 改整页自然滚动，
         背景与内容同动、无固定底图；下拉刷新走页面级 onPullDownRefresh -->
      <HomeHeader
        :location-text="locationText"
        @schoolTap="openLocationSheet"
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

      <!-- 2026-09-04 问题6修复：4 格改用独立 handler（带 fail toast），替代内联箭头函数 -->
      <RelationActivity
        :data="viewModel.relationActivity"
        :loading="loading"
        @all="goMessages"
        @liked-by="openRelationLikedBy"
        @whispers="openRelationWhispers"
        @visitors="openRelationVisitors"
        @matches="openRelationMatches"
      />

      <InterestRecommendation
        :items="viewModel.interestRecommendations"
        :loading="loading"
        @more="openAppPath(ROUTES.CIRCLES.INDEX)"
        @select="openCircle"
        @join="joinCircle"
      />

      <NearbyPeople
        :items="viewModel.nearbyPeople"
        :loading="loading"
        @more="openNearbyList"
        @select="openUserProfile"
      />

      <CommunityFeed
        :items="viewModel.communityPosts"
        :loading="loading"
        :error="homeStore.errorMessage"
        @retry="() => homeStore.fetchDashboard()"
        @more="openCommunity"
        @select="openPost"
        @open-author="onCommunityAuthorTap"
      />

      <!-- 2026-09-04 问题5修复：home-section-gap（tabBar 净空区）从 InviteBanner 之前
           移到之后。原顺序 banner 是页面最后一个元素，恰好落进 tabBar 浮岛遮挡区
           只露上半；现在 gap 兜底在最后撑开净空，banner 完整露出。 -->
      <InviteBanner @invite="openInvite" />

      <view class="home-section-gap"></view>

    <!-- 2026-09-02 R5：顶部定位点击弹出的底部 BottomSheet（参考 t00012 弹窗样式：绿色顶部 + 位置信息 + 绿色按钮） -->
    <BottomSheet
      :visible="locationSheetVisible"
      :title="'我的位置'"
      :show-handle="true"
      :max-height-ratio="0.88"
      @close="closeLocationSheet"
    >
      <view class="location-sheet">
        <!-- 2026-09-02 R12（需求⑨）：整块 hero 可点 → 跳转专门的「位置主页」定位页 -->
        <view
          class="location-sheet__hero press-feedback"
          hover-class="press-feedback--active"
          role="button"
          aria-label="进入位置主页"
          @tap="openLocationPage"
        >
          <view class="location-sheet__hero-icon">
            <image class="location-sheet__hero-icon-img" :src="resolveMediaUrl(IMAGE_PATHS.HOME_ICONS.LOCATION_PIN)" mode="aspectFit" alt="" />
          </view>
          <view class="location-sheet__hero-info">
            <text class="location-sheet__hero-title">当前位置</text>
            <text class="location-sheet__hero-value">{{ locationText }}</text>
            <text v-if="sessionStore.userSession?.campusName" class="location-sheet__hero-campus">
              所属校区 · {{ sessionStore.userSession.campusName }}
            </text>
            <text class="location-sheet__hero-link">进入位置主页 ›</text>
          </view>
        </view>

        <view class="location-sheet__divider" />

        <view class="location-sheet__items">
          <view class="location-sheet__item">
            <view class="location-sheet__item-icon location-sheet__item-icon--green">
              <text class="location-sheet__item-emoji">📍</text>
            </view>
            <view class="location-sheet__item-info">
              <text class="location-sheet__item-name">城市定位</text>
              <text class="location-sheet__item-desc">{{ locationText }}</text>
            </view>
            <text class="location-sheet__item-value">已开启</text>
          </view>

          <view class="location-sheet__item">
            <view class="location-sheet__item-icon location-sheet__item-icon--blue">
              <text class="location-sheet__item-emoji">🏫</text>
            </view>
            <view class="location-sheet__item-info">
              <text class="location-sheet__item-name">校区</text>
              <text class="location-sheet__item-desc">{{ sessionStore.userSession?.campusName || '未认证' }}</text>
            </view>
            <text class="location-sheet__item-value">{{ sessionStore.userSession?.campusVerified ? '已认证' : '未认证' }}</text>
          </view>

          <view class="location-sheet__item">
            <view class="location-sheet__item-icon location-sheet__item-icon--orange">
              <text class="location-sheet__item-emoji">🔄</text>
            </view>
            <view class="location-sheet__item-info">
              <text class="location-sheet__item-name">定位精度</text>
              <text class="location-sheet__item-desc">自动获取当前坐标</text>
            </view>
            <text class="location-sheet__item-value">高精度</text>
          </view>
        </view>
      </view>

      <!-- 2026-09-02 R11：按钮移入 BottomSheet footer（固定在底部，不随内容滚动 → 始终可见可点） -->
      <template #footer>
        <view
          class="location-sheet__btn location-sheet__btn--primary press-feedback"
          hover-class="press-feedback--active"
          role="button"
          :aria-label="locating ? '重新定位中' : '重新定位'"
          @tap="refetchLocation"
        >
          <text class="location-sheet__btn-text">{{ locating ? '定位中...' : '重新定位' }}</text>
        </view>
        <view
          class="location-sheet__btn press-feedback"
          hover-class="press-feedback--active"
          role="button"
          aria-label="我知道了"
          @tap="closeLocationSheet"
        >
          <text class="location-sheet__btn-text location-sheet__btn-text--secondary">我知道了</text>
        </view>
      </template>
    </BottomSheet>
  </view>
</template>

<style>
/* 2026-09-03（需求①）整页自然滚动：全局 page{height:100%} 会把 page 元素
   锁定为视口高度，页内更长的内容不产生页面级滚动。首页改为随内容增长。 */
page {
  height: auto;
  min-height: 100%;
}
</style>
<style scoped lang="scss">
.home-page {
  /* 2026-09-03 背景随页面滚动（用户反馈①）：整页自然滚动。
     弃用 flex 列布局（scroll-view 时代的遗产）：实测 flex 根容器会被
     框架页体压回 min-height=视口高（809px），子内容溢出但不计入页面
     scrollHeight → 整页无法滚动（scrollHeight 恒 810）。改为 block 流，
     容器随内容生长，页面恢复自然滚动（与村口列表页同机制）。 */
  display: block;
  /* 关键：作为框架 flex 页体的子项，必须禁止收缩，否则容器被压回
     min-height=视口高，子内容溢出且不计入页面 scrollHeight（无法滚动） */
  flex: none;
  min-height: 100vh;
  background: var(--c-bg-page, #EEF7F2);
  /* R3：env 兜底改为 --statusbar（开发者工具 env 恒 0，头部会叠印系统时间） */
  padding-top: calc(var(--statusbar, env(safe-area-inset-top)) + 20px);
  /* 底部避开自定义 tabbar（--tabbar-height = 112rpx + 安全区） */
  padding-bottom: calc(112rpx + env(safe-area-inset-bottom));
}

.home-page__top-scrim {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9;
  background: linear-gradient(180deg, var(--c-bg-page, #EEF7F2) 82%, rgba(238, 247, 242, 0));
  pointer-events: none;
  transition: opacity 160ms ease-out;
}

.home-section-gap {
  /* 2026-09-03 R11 终极修 + 2026-09-03 收尾：custom-tabBar 恒在页面之上 + 中央浮岛圆形按钮 z-index 高，
     底部 InviteBanner 必须留出净高让内容完整露出。统一收敛到设计 token
     --tab-bar-clear-zone（= 360rpx + env(safe-area-inset-bottom)，见 theme/design-variables.scss），
     页面级共用工具类：.base-tabbar-clear-zone（styles/_components.scss）。 */
  display: block;
  width: 100%;
  flex-shrink: 0;
  height: var(--tab-bar-clear-zone, calc(360rpx + env(safe-area-inset-bottom)));
}

/* ========== 2026-09-02 R5：定位 BottomSheet 弹窗样式 ========== */
.location-sheet {
  padding: 8rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
}

.location-sheet__hero {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 4rpx 24rpx;
}

.location-sheet__hero-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #E8FBF2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.location-sheet__hero-icon-img {
  width: 48rpx;
  height: 48rpx;
}

.location-sheet__hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.location-sheet__hero-title {
  font-size: 24rpx;
  color: #9AA39F;
}

.location-sheet__hero-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #1A1E1C;
}

.location-sheet__hero-campus {
  font-size: 22rpx;
  color: #94A39F;
}

/* 2026-09-02 R12（需求⑨）：位置主页跳转链接提示 */
.location-sheet__hero-link {
  margin-top: 4rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #36C99A;
}

.location-sheet__divider {
  height: 1rpx;
  background: #EEF2F0;
  margin: 8rpx 0 16rpx;
}

.location-sheet__items {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.location-sheet__item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 16rpx;
  border-radius: 16rpx;
  background: #F8FAF9;
}

.location-sheet__item-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 28rpx;
}

.location-sheet__item-icon--green {
  background: #E8FBF2;
}
.location-sheet__item-icon--blue {
  background: #EAF3FF;
}
.location-sheet__item-icon--orange {
  background: #FFF5E6;
}

.location-sheet__item-emoji {
  font-size: 28rpx;
}

.location-sheet__item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.location-sheet__item-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #1A1E1C;
}

.location-sheet__item-desc {
  font-size: 22rpx;
  color: #94A39F;
}

.location-sheet__item-value {
  font-size: 24rpx;
  font-weight: 600;
  color: #36C99A;
  flex-shrink: 0;
}

.location-sheet__btn {
  height: 88rpx;
  border-radius: 999rpx;
  background: #F4F6F4;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12rpx;
}

.location-sheet__btn--primary {
  background: #36C99A;
}

.location-sheet__btn-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}

.location-sheet__btn-text--secondary {
  color: #1A1E1C;
}
</style>
