<script setup lang="ts">
/**
 * 附近首页（v3 Nearby 冻结 · 01_nearby_home）
 * 分区顺序严格冻结：附近的人（含同城）→ 热门兴趣圈 → 校园圈 → 活动 → 附近动态。
 * 附近 = Explore：不出现速配入口、不使用滑动卡片核心交互。
 */
import { ref, computed, watch, onUnmounted } from "vue";
import { onLoad, onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import PostCard from "../../components/village/PostCard.vue";
import NearbySection from "../../components/nearby/NearbySection.vue";
import { useVillageStore, type PostItem } from "../../stores/village";
import { useCircleStore } from "../../stores/circle";
import { useSessionStore } from "../../stores/session";
import { useActivityStore } from "../../stores/activity";
import { clientApi } from "../../services/api";
import { mapToDiscoverCard, NEARBY_MAX_DISTANCE_KM } from "../../stores/discover/utils";
import type { DiscoverCard } from "../../stores/discover/types";
import { openAppPath, openUserProfile } from "../../utils/navigation";
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";
import { SCHOOLS } from "../../config/schools";
import { useTabBar } from "../../composables/useTabBar";
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import { IMAGE_PATHS } from "../../config/images";
// 2026-08-15：未登录时不发受保护请求，避免冷启动 401 雪崩
import { getToken } from "../../services/http";
import LockScreen from "../../components/common/LockScreen.vue";

// 同步自定义 TabBar 选中状态（tab 顺序：首页0/附近1/匹配2/消息3/我的4）
useTabBar(1);

const { t } = useI18n();
const sessionStore = useSessionStore();
const activityStore = useActivityStore();
const circleStore = useCircleStore();
const villageStore = useVillageStore();
const { styleVars: menuStyleVars } = useMenuButtonRect();

/** 附近的人预览（取前 3，仅展示，点击进 people 列表） */
const peoplePreview = ref<DiscoverCard[]>([]);
const peopleLoading = ref(false);
const peopleError = ref("");

/** 校园入口（前 4 所） */
const schoolEntries = SCHOOLS.slice(0, 4);

/** 热门兴趣圈（8 个标准圈） */
const { circles: circleList } = storeToRefs(circleStore);
const hotCircles = computed(() => circleList.value.slice(0, 8));

/** 附近动态（复用 village 帖子流，不新建数据源） */
const circlePosts = computed<PostItem[]>(() => villageStore.posts.slice(0, 6));

/** 首页子标题：北京大学 · 3km */
const activeTab = ref<"people" | "circles" | "campus" | "activities" | "posts">("people");
const nearbyTabs = [
  { key: "people" as const, label: t("nearby.peopleTitle") },
  { key: "circles" as const, label: t("nearby.hotCircles") },
  { key: "campus" as const, label: t("nearby.campusCircles") },
  { key: "activities" as const, label: t("nearby.activitiesTitle") },
  { key: "posts" as const, label: t("nearby.nearbyPosts") },
];

const homeSubtitle = computed(() => {
  const school = sessionStore.userSession?.campusName || t("nearby.defaultSchool");
  return t("nearby.homeSubtitle", { school, dist: t("nearby.defaultDist") });
});

onLoad(() => {
  loadNearbyData();
});

onShow(() => {
  if (!getToken()) return;
  if (peoplePreview.value.length === 0 && !peopleLoading.value) {
    void loadPeoplePreview();
  }
});

onPullDownRefresh(() => {
  if (!getToken()) {
    uni.stopPullDownRefresh();
    return;
  }
  void loadPeoplePreview().finally(() => uni.stopPullDownRefresh());
});

onUnmounted(() => {
  // 页面共享 store，无需清理
});

/**
 * 2026-08-15：未登录时不发受保护请求（冷启动无 token 时 onLoad/onShow 会拉取
 * people/circles/activities/posts → 401 雪崩）。登录后 watch(isLoggedIn) 自动补拉。
 */
function loadNearbyData(): void {
  if (!getToken()) return;
  void loadPeoplePreview();
  void loadActivities();
  void loadCirclePosts();
  void circleStore.fetchCircles().catch(() => {});
}

// 2026-08-15：登录态变化后自动补拉（未登录时已跳过，登录成功即刷新数据）
watch(
  () => sessionStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      loadNearbyData();
    }
  }
);

/** 附近的人预览（distanceMax 过滤，真实链路） */
async function loadPeoplePreview() {
  peopleLoading.value = true;
  peopleError.value = "";
  try {
    const people = await clientApi.getRecommendations({
      distanceMax: NEARBY_MAX_DISTANCE_KM,
    });
    peoplePreview.value = people.map((person) => mapToDiscoverCard(person));
  } catch (error) {
    peopleError.value = error instanceof Error ? error.message : t("nearby.loadFailed");
  } finally {
    peopleLoading.value = false;
  }
}

/** 拉取附近活动（复用 activity store） */
async function loadActivities() {
  if (activityStore.activities.length === 0) {
    await activityStore.fetchActivities();
  }
}

/** 拉取附近动态（复用 village store 帖子流） */
async function loadCirclePosts() {
  if (villageStore.posts.length === 0) {
    await villageStore.fetchPosts({}, true);
  }
}

/** 搜索（附近内容） */
function goSearch() {
  openAppPath(ROUTES.SEARCH);
}

/** 附近的人 / 同城的人 */
function goPeople(scope: "nearby" | "city") {
  openAppPath(`${ROUTES.NEARBY.PEOPLE}?scope=${scope}`);
}

/** 兴趣圈 */
function goCircleDetail(circleId: string) {
  openAppPath(`${ROUTES.CIRCLES.TOPICS}?circleId=${encodeURIComponent(circleId)}`);
}
function goCircleList() {
  openAppPath(ROUTES.CIRCLES.INDEX);
}
function toggleJoinCircle(circleId: string, isJoined: boolean) {
  if (!requireLogin()) return;
  if (isJoined) {
    void circleStore.leaveCircle(circleId).catch(() => {});
  } else {
    void circleStore.joinCircle(circleId).catch(() => {});
  }
}

/** 校园圈 */
function goCampusHub(school?: string) {
  openAppPath(school ? `${ROUTES.CAMPUS.HUB}?school=${encodeURIComponent(school)}` : ROUTES.CAMPUS.HUB);
}

/** 活动 */
function goActivityList() {
  openAppPath(SUBPACKAGE_ROUTES.DISCOVER_FEED.ACTIVITIES);
}
function goActivityDetail(id: string) {
  openAppPath(`${ROUTES.ACTIVITY_DETAIL}?id=${encodeURIComponent(id)}`);
}

/** 帖子详情 / 作者 */
function onPostDetail(postId: string) {
  openAppPath(`/pages/village/detail?id=${encodeURIComponent(postId)}`);
}
function onPostAuthor(userId: string) {
  openUserProfile(userId);
}

/** v3 冻结：认识 TA → 他人主页（不直接 like/建聊天） */
function meetAuthor(userId: string) {
  if (!requireLogin()) return;
  openUserProfile(userId);
}

/** 帖子标签/关联活动 */
function onPostTag(tagName: string) {
  openAppPath(`/pages/village/tag-posts?tagName=${encodeURIComponent(tagName)}`);
}
function onPostActivity(activityId: number | string) {
  openAppPath(`/pages/activities/detail?id=${encodeURIComponent(String(activityId))}`);
}

/** 发帖（动态/找搭子/活动 三段式入口） */
function goToPublishPost() {
  openAppPath("/pages/village/post");
}

/** 查看全部动态 */
function goAllPosts() {
  openAppPath("/pages/village/index");
}

/** 成员数格式化 */
function formatMemberCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

/** 交互登录守卫：未登录仅提示不跳转 */
function requireLogin(): boolean {
  if (sessionStore.isLoggedIn) return true;
  uni.showToast({ title: t("apiErrors.loginRequired"), icon: "none" });
  return false;
}
</script>

<template>
  <view class="nearby-home page-bottom-safe" :style="menuStyleVars">
    <!-- 2026-08-15：未登录时不发受保护请求，展示 LockScreen 登录引导 -->
    <LockScreen v-if="!sessionStore.isLoggedIn" />
    <template v-else>
    <scroll-view scroll-y class="nearby-home__scroll" :show-scrollbar="false">
      <!-- 顶部：附近 + 子标题 + 发帖 -->
      <view class="nearby-home__header">
        <view class="nearby-home__title-row">
          <text class="nearby-home__title">{{ t('nearby.title') }}</text>
          <image class="nearby-home__search" :src="IMAGE_PATHS.ICONS_EMOJI.SEARCH" mode="aspectFit" role="button" :aria-label="t('nearby.searchPlaceholder')" @tap="goSearch" alt="" />
          <view class="nearby-home__publish press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('nearby.publishToday')" @tap="goToPublishPost">
            <text class="nearby-home__publish-text">{{ t('nearby.publishToday') }}</text>
          </view>
        </view>
        <text class="nearby-home__subtitle">{{ homeSubtitle }}</text>
      </view>

      <view class="nearby-tabs">
        <view
          v-for="tab in nearbyTabs"
          :key="tab.key"
          class="nearby-tabs__item"
          :class="{ 'nearby-tabs__item--active': activeTab === tab.key }"
          role="button"
          :aria-label="tab.label"
          @tap="activeTab = tab.key"
        >
          <text class="nearby-tabs__text">{{ tab.label }}</text>
        </view>
      </view>

      <!-- ① 附近的人（含同城） -->
      <NearbySection v-if="activeTab === 'people'" :title="t('nearby.peopleTitle')">
        <view class="people-entry-list">
          <view class="people-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('nearby.peopleNearby')" @tap="goPeople('nearby')">
            <view class="people-entry__icon-wrap">
              <image class="people-entry__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
            </view>
            <view class="people-entry__body">
              <text class="people-entry__title">{{ t('nearby.peopleNearby') }}</text>
              <text class="people-entry__desc">{{ t('nearby.peopleNearbyDesc') }}</text>
            </view>
            <text class="people-entry__arrow">›</text>
          </view>
          <view class="people-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('nearby.peopleCity')" @tap="goPeople('city')">
            <view class="people-entry__icon-wrap people-entry__icon-wrap--city">
              <image class="people-entry__icon" :src="IMAGE_PATHS.ICONS_EMOJI.GROUP" mode="aspectFit" alt="" />
            </view>
            <view class="people-entry__body">
              <text class="people-entry__title">{{ t('nearby.peopleCity') }}</text>
              <text class="people-entry__desc">{{ t('nearby.peopleCityDesc') }}</text>
            </view>
            <text class="people-entry__arrow">›</text>
          </view>
        </view>
      </NearbySection>

      <!-- ② 热门兴趣圈（开放加入，无需校园认证） -->
      <NearbySection v-if="activeTab === 'circles'" :title="t('nearby.hotCircles')" :more-text="t('nearby.viewAll')" @more="goCircleList">
        <scroll-view scroll-x class="circle-scroll" :show-scrollbar="false">
          <view class="circle-scroll__list">
            <view
              v-for="circle in hotCircles"
              :key="circle.id"
              class="circle-mini press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="circle.name"
              @tap="goCircleDetail(circle.id)"
            >
              <view class="circle-mini__icon">
                <text class="circle-mini__emoji">{{ circle.icon }}</text>
              </view>
              <text class="circle-mini__name">{{ circle.name }}</text>
              <text class="circle-mini__count">{{ formatMemberCount(circle.memberCount) }} 人加入</text>
              <view
                class="circle-mini__join"
                :class="{ 'circle-mini__join--joined': circle.isJoined }"
                role="button"
                :aria-label="circle.isJoined ? t('circle.joinedBtn') : t('circle.joinBtn')"
                @tap.stop="toggleJoinCircle(circle.id, circle.isJoined)"
              >
                <text class="circle-mini__join-text">{{ circle.isJoined ? t('circle.joinedBtn') : t('circle.joinBtn') }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </NearbySection>

      <!-- ③ 校园圈（公开可看、认证进私域） -->
      <NearbySection v-if="activeTab === 'campus'" :title="t('nearby.campusCircles')" :more-text="t('nearby.viewAll')" @more="goCampusHub()">
        <view
          v-for="school in schoolEntries"
          :key="school.id"
          class="campus-entry press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="school.name"
          @tap="goCampusHub(school.name)"
        >
          <view class="campus-entry__icon-wrap">
            <image class="campus-entry__icon" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFit" alt="" />
          </view>
          <view class="campus-entry__body">
            <text class="campus-entry__name">{{ school.name }}</text>
            <text class="campus-entry__desc">{{ t('nearby.campusPublicHint') }}</text>
          </view>
          <view class="campus-entry__status">
            <text class="campus-entry__status-text">{{ t('nearby.campusBrowse') }}</text>
          </view>
          <text class="campus-entry__arrow">›</text>
        </view>
      </NearbySection>

      <!-- ④ 活动（复用现有活动体系） -->
      <NearbySection v-if="activeTab === 'activities'" :title="t('nearby.activitiesTitle')" :more-text="t('nearby.viewAll')" @more="goActivityList">
        <view
          v-for="activity in activityStore.activities.slice(0, 3)"
          :key="activity.id"
          class="activity-entry press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="activity.title"
          @tap="goActivityDetail(String(activity.id))"
        >
          <view class="activity-entry__icon-wrap">
            <image class="activity-entry__icon" :src="IMAGE_PATHS.ICONS_EMOJI.FIRE" mode="aspectFit" alt="" />
          </view>
          <view class="activity-entry__body">
            <text class="activity-entry__title">{{ activity.title }}</text>
            <text class="activity-entry__desc">{{ activity.location || activity.scheduleText }}</text>
          </view>
          <text class="activity-entry__arrow">›</text>
        </view>
        <view v-if="activityStore.activities.length === 0 && !activityStore.loading" class="nearby-home__empty">
          <text class="nearby-home__empty-text">{{ t('nearby.activitiesEmpty') }}</text>
        </view>
      </NearbySection>

      <!-- ⑤ 附近动态（复用 village 帖子流；最多 1 个显式「认识 TA」） -->
      <NearbySection v-if="activeTab === 'posts'" :title="t('nearby.nearbyPosts')" :more-text="t('nearby.viewAll')" @more="goAllPosts">
        <view v-if="circlePosts.length === 0 && !villageStore.loading" class="nearby-home__empty">
          <text class="nearby-home__empty-text">{{ t('nearby.postsEmpty') }}</text>
        </view>
        <view v-for="(post, idx) in circlePosts.slice(0, 3)" :key="post.id" class="nearby-post-item">
          <PostCard
            :post="post"
            @open-detail="onPostDetail"
            @open-author="onPostAuthor"
            @open-tag="onPostTag"
            @open-activity="onPostActivity"
          />
          <view
            v-if="idx === 0"
            class="nearby-meet press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('nearby.meetAuthor')"
            @tap.stop="meetAuthor(post.author.userId)"
          >
            <text class="nearby-meet__text">{{ t('nearby.meetAuthor') }}</text>
          </view>
        </view>
      </NearbySection>

      <view class="nearby-home__footer-space" />
    </scroll-view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.nearby-home {
  min-height: 100%;
  background: var(--c-bg-page, #F7FAF9);
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.nearby-home__scroll {
  flex: 1;
  min-height: 0;
}

.nearby-home__header {
  margin-bottom: 8rpx;
}

.nearby-home__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nearby-home__title {
  font-size: 48rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.nearby-home__search {
  width: 40rpx;
  height: 40rpx;
  margin-right: 12rpx;
  color: var(--c-text-tertiary, #999999);
  flex-shrink: 0;
}

.nearby-home__publish {
  padding: 12rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #36C99A 0%, #36C99A 100%);
}

.nearby-home__publish-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.nearby-home__subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--c-text-secondary, #666666);
}

/* 附近的人 */
.people-entry-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.people-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #ECEFF2);
  box-shadow: var(--c-shadow-card, 0 4px 16px rgba(30, 80, 65, 0.08));
}

.people-entry__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-brand-50, #E6F8F1);
  flex-shrink: 0;
}

.people-entry__icon-wrap--city {
  background: var(--c-romance-100, #FFE4E9);
}

.people-entry__icon {
  width: 40rpx;
  height: 40rpx;
}

.people-entry__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.people-entry__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.people-entry__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.people-entry__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}

/* 热门兴趣圈 */
.circle-scroll {
  width: 100%;
}

.circle-scroll__list {
  display: flex;
  gap: 16rpx;
  padding-right: 16rpx;
}

.circle-mini {
  width: 220rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8rpx;
  padding: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 20rpx;
  border: 1rpx solid var(--c-line, #ECEFF2);
}

.circle-mini__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-surface, #F7FAF9);
}

.circle-mini__emoji {
  font-size: 36rpx;
}

.circle-mini__name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.circle-mini__count {
  font-size: 20rpx;
  color: var(--c-text-tertiary, #666666);
}

.circle-mini__join {
  margin-top: 4rpx;
  padding: 8rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #36C99A 0%, #36C99A 100%);
}

.circle-mini__join--joined {
  background: var(--c-bg-container, #FFFFFF);
  border: 2rpx solid var(--c-line-strong, #DCE5E2);
}

.circle-mini__join-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.circle-mini__join--joined .circle-mini__join-text {
  color: var(--c-text-secondary, #666666);
}

/* 校园圈 */
.campus-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #ECEFF2);
  margin-bottom: 16rpx;
}

.campus-entry__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-blue-light, #EEF3FF);
  flex-shrink: 0;
}

.campus-entry__icon {
  width: 40rpx;
  height: 40rpx;
}

.campus-entry__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.campus-entry__name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.campus-entry__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.campus-entry__status {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-surface, #F7FAF9);
}

.campus-entry__status-text {
  font-size: 20rpx;
  color: var(--c-text-tertiary, #666666);
}

.campus-entry__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}

/* 活动 */
.activity-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #ECEFF2);
  margin-bottom: 16rpx;
}

.activity-entry__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-apricot-100, #FFEDD5);
  flex-shrink: 0;
}

.activity-entry__icon {
  width: 40rpx;
  height: 40rpx;
}

.activity-entry__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.activity-entry__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.activity-entry__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.activity-entry__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}

/* 附近动态 */
.nearby-post-item {
  margin-bottom: 16rpx;
}

.nearby-meet {
  margin-top: 12rpx;
  display: inline-flex;
  padding: 12rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #FF8DB7 0%, #FF6B81 100%);
}

.nearby-meet__text {
  font-size: 24rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.nearby-home__empty {
  padding: 40rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nearby-home__empty-text {
  font-size: 24rpx;
  color: var(--c-text-tertiary, #666666);
}

.nearby-tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 8rpx;
  overflow-x: auto;
  white-space: nowrap;
}

.nearby-tabs__item {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid #ECEFF2;
}

.nearby-tabs__item--active {
  background: #E8F8F1;
  border-color: #36C99A;
}

.nearby-tabs__text {
  font-size: 24rpx;
  color: #222222;
}

.nearby-tabs__item--active .nearby-tabs__text {
  color: #36C99A;
  font-weight: 700;
}

.nearby-home__footer-space {
  height: 48rpx;
}
</style>
