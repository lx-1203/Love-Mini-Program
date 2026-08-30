<script setup lang="ts">


/**
 * 附近首页（v3 Nearby 冻结 · 01_nearby_home）
 * 分区顺序严格冻结：附近的人（含同城）→ 热门兴趣圈 → 校园圈 → 活动 → 附近动态。
 * 附近 = Explore：不出现速配入口、不使用滑动卡片核心交互。
 */
import { ref, computed, watch, onUnmounted } from "vue";
import { resolveMediaUrl } from "@/utils/media";
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
// 第五轮：校园圈卡片统一浅绿背景 + 名字（coverUrl 上传后显示图片），不再使用渐变底色
import { useTabBar } from "../../composables/useTabBar";
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import { IMAGE_PATHS } from "../../config/images";
// 2026-08-26：圈子图标 emoji→SVG 解析（业务组件图标禁用 emoji 字符）
import { resolveCircleIcon } from "../../config/circle-icons";
// 2026-08-15：未登录时不发受保护请求，避免冷启动 401 雪崩
import { getToken } from "../../services/http";

import { fetchCurrentLocation, buildLocationText } from "../../utils/location";
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

// 第五轮 QA（补做）：校园圈入口卡片统一浅绿背景 + 学校名字（移除 school-main.png 封面插图、
// 渐变底色与首字徽标）。coverUrl 数据模型保留：非空 → 显示图片；空 → 浅绿背景 + 名字。

/** 热门兴趣圈（8 个标准圈） */
const { circles: circleList } = storeToRefs(circleStore);
const hotCircles = computed(() => circleList.value.slice(0, 8));

/** 附近动态（2026-08-26 R2：独立维度数据源 villageStore.nearbyPosts，不复用全局 posts） */
const circlePosts = computed<PostItem[]>(() => villageStore.nearbyPosts.slice(0, 6));

/** 当前城市（fetchNearbyPosts 城市过滤用；来自定位，定位失败则空） */
const currentCity = ref("");

/** 首页子标题：北京大学 · 3km */

const homeSubtitle = ref(buildLocationText("", sessionStore.userSession?.campusName));

async function initLocation() {
  const loc = await fetchCurrentLocation();
  if (loc) {
    homeSubtitle.value = buildLocationText(loc.city, sessionStore.userSession?.campusName);
    // 2026-08-27 修复：定位成功后用真实城市刷新附近动态（不再仅登录态）
    if (loc.city && loc.city !== currentCity.value) {
      currentCity.value = loc.city;
      void loadCirclePosts();
    }
  }
}

onLoad(() => {
  loadNearbyData();
  // 2026-08-27 修复：兴趣圈列表在 onLoad 直接触发（不再依赖登录态），
  // 热门兴趣圈横滑区按理想图始终可见
  void circleStore.fetchCircles().catch(() => {});
  // 2026-08-27 修复：附近动态也直接在 onLoad 拉取（mock 默认就返回数据）
  void loadCirclePosts();
  void initLocation();
});

onShow(() => {
  // 未登录时也加载预览数据，展示附近推荐
  if (peoplePreview.value.length === 0 && !peopleLoading.value) {
    // 2026-08-26 R4：失败重试退避——距上次失败 < 2s 不自动重试，
    // 避免 onLoad/onShow 双入口在失败场景下连发请求
    if (Date.now() - lastPeopleLoadFailedAt > 2000) {
      void loadPeoplePreview();
    }
  }
});

onPullDownRefresh(() => {
  void loadPeoplePreview().finally(() => uni.stopPullDownRefresh());
});

onUnmounted(() => {
  // 页面共享 store，无需清理
});

/**
 * 加载附近预览数据（未登录时也加载，点击交互时引导登录）。
 * 2026-08-26 R2：附近动态独立维度——登录后按城市加载 nearbyPosts。
 */
function loadNearbyData(): void {
  void loadPeoplePreview();
  // 受保护的数据源仅登录后加载
  if (getToken()) {
    void loadActivities();
    void loadCirclePosts();
  }
}

// 2026-08-15：登录态变化后自动补拉（登录成功即刷新数据）
watch(
  () => sessionStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      loadActivities();
      void loadCirclePosts();
    }
  }
);

/** 2026-08-26 R4：附近的人预览最近一次加载失败时间戳（失败重试退避用，0=未失败） */
let lastPeopleLoadFailedAt = 0;

/** 附近的人预览（distanceMax 过滤，真实链路；2026-08-26 R4：in-flight 防抖 + 失败退避） */
async function loadPeoplePreview() {
  if (peopleLoading.value) return; // 2026-08-26 R4：in-flight 防抖（onLoad/onShow 双入口去重）
  peopleLoading.value = true;
  peopleError.value = "";
  try {
    const people = await clientApi.getRecommendations({
      distanceMax: NEARBY_MAX_DISTANCE_KM,
    });
    peoplePreview.value = people.map((person) => mapToDiscoverCard(person));
    lastPeopleLoadFailedAt = 0;
  } catch (error) {
    lastPeopleLoadFailedAt = Date.now();
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

/** 拉取附近动态（2026-08-26 R2：独立维度 fetchNearbyPosts，按当前城市过滤；空态由页面登录引导承接） */
async function loadCirclePosts() {
  if (villageStore.nearbyPosts.length === 0 && !villageStore.loadingNearbyPosts) {
    await villageStore.fetchNearbyPosts(currentCity.value || undefined);
  }
}

/** 未登录引导：跳登录页（文案复用 apiErrors.loginRequired） */
function goLogin() {
  openAppPath(ROUTES.LOGIN);
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
  openAppPath(`/subpackages/village/village/detail?id=${encodeURIComponent(postId)}`);
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
  openAppPath(`/subpackages/village/village/tag-posts?tagName=${encodeURIComponent(tagName)}`);
}
function onPostActivity(activityId: number | string) {
  openAppPath(`/subpackages/tools/activities/detail?id=${encodeURIComponent(String(activityId))}`);
}

/** 发帖（动态/找搭子/活动 三段式入口） */
function goToPublishPost() {
  openAppPath("/subpackages/village/village/post");
}

/** 查看全部动态 */
function goAllPosts() {
  openAppPath("/subpackages/village/village/index");
}

/** 2026-08-21：兴趣圈封面照片（复用兴趣圈页素材，按名称匹配）
 * 第五轮 QA 一致性收敛：游戏/阅读/宠物三圈原 Style B 宽幅场景大图（与 ideal 方形缩略风格不一致）
 * 改为本地 AI 生成 Style A 方形居中场景图，与 config/images.ts CIRCLE_COVERS 同步 */
const CIRCLE_COVER = {
  photo: resolveMediaUrl("/static/assets/images/covers/circle-photo.png"),
  travel: resolveMediaUrl("/static/assets/images/covers/circle-travel.png"),
  music: resolveMediaUrl("/static/assets/images/covers/circle-music.png"),
  sports: resolveMediaUrl("/static/assets/images/covers/circle-sports.png"),
  food: resolveMediaUrl("/static/assets/images/covers/circle-food.png"),
  sky: resolveMediaUrl("/static/assets/images/covers/circle-sky.png"),
  // 第五轮 QA：游戏/阅读/宠物改用 Style A AI 生成图（与理想图风格一致）
  game: resolveMediaUrl("/static/assets/images/covers/Cozy_flat_lay_of_video_game_co_2026-08-21T03-34-01.png"),
  reading: resolveMediaUrl("/static/assets/images/covers/A_person_reading_a_book_in_a_c_2026-08-21T03-35-17.png"),
  pet: resolveMediaUrl("/static/assets/images/covers/A_cute_golden_retriever_dog_lo_2026-08-21T03-36-28.png"),
  // 非标准 8 圈（仅真实模式可能存在）：保留 Style B 原图，渲染后由真实圈名触发
  cutepets: resolveMediaUrl("/static/assets/images/covers/circle-cutepets.png"),
  basketball: resolveMediaUrl("/static/assets/images/covers/circle-basketball.png"),
  boardgame: resolveMediaUrl("/static/assets/images/covers/circle-boardgame.png"),
  postgraduate: resolveMediaUrl("/static/assets/images/covers/circle-postgraduate.png"),
  studybuddy: resolveMediaUrl("/static/assets/images/covers/circle-studybuddy.png"),
} as const;

function circleCover(circle: { name: string }): string {
  const n = circle.name || "";
  if (n.includes("摄影")) return CIRCLE_COVER.photo;
  if (n.includes("旅行")) return CIRCLE_COVER.travel;
  if (n.includes("音乐")) return CIRCLE_COVER.music;
  if (n.includes("运动") || n.includes("篮球") || n.includes("健身")) return CIRCLE_COVER.sports;
  if (n.includes("美食") || n.includes("食")) return CIRCLE_COVER.food;
  if (n.includes("天文") || n.includes("星空")) return CIRCLE_COVER.sky;
  if (n.includes("游戏")) return CIRCLE_COVER.game;
  if (n.includes("阅读")) return CIRCLE_COVER.reading;
  if (n.includes("宠物")) return CIRCLE_COVER.pet;
  if (n.includes("萌宠")) return CIRCLE_COVER.cutepets;
  if (n.includes("篮球")) return CIRCLE_COVER.basketball;
  if (n.includes("桌游")) return CIRCLE_COVER.boardgame;
  if (n.includes("考研")) return CIRCLE_COVER.postgraduate;
  if (n.includes("学习搭子") || n.includes("学习")) return CIRCLE_COVER.studybuddy;
  return "";
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
    <scroll-view scroll-y class="nearby-home__scroll" :show-scrollbar="false">
      <!-- 顶部：附近 + 子标题 + 发帖 -->
      <view class="nearby-home__header">
        <view class="nearby-home__title-row">
          <text class="nearby-home__title">{{ t('nearby.title') }}</text>
          <image class="nearby-home__search" :src="IMAGE_PATHS.ICONS_COMMON.SEARCH" mode="aspectFit" role="button" :aria-label="t('nearby.searchPlaceholder')" @tap="goSearch" alt="" />
          <view class="nearby-home__publish press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.publishToday')" @tap="goToPublishPost">
            <text class="nearby-home__publish-text">{{ t('nearby.publishToday') }}</text>
          </view>
        </view>
        <text class="nearby-home__subtitle">{{ homeSubtitle }}</text>
      </view>

      <!-- 功能入口：5 圆形图标（参考图对齐） -->
      <view class="nearby-entries">
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.peopleTitle')" @tap="goPeople('nearby')">
          <view class="nearby-entry__icon nearby-entry__icon--people">
            <image class="nearby-entry__img" :src="IMAGE_PATHS.NEARBY_ICONS.PEOPLE" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.peopleTitle') }}</text>
        </view>
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.hotCircles')" @tap="goCircleList">
          <view class="nearby-entry__icon nearby-entry__icon--circle">
            <image class="nearby-entry__img" :src="IMAGE_PATHS.NEARBY_ICONS.CIRCLE" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.hotCircles') }}</text>
        </view>
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.campusCircles')" @tap="goCampusHub()">
          <view class="nearby-entry__icon nearby-entry__icon--campus">
            <image class="nearby-entry__img" :src="IMAGE_PATHS.NEARBY_ICONS.CAMPUS" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.campusCircles') }}</text>
        </view>
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.activitiesTitle')" @tap="goActivityList">
          <view class="nearby-entry__icon nearby-entry__icon--activity">
            <image class="nearby-entry__img" :src="IMAGE_PATHS.NEARBY_ICONS.ACTIVITY" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.activitiesTitle') }}</text>
        </view>
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.myConnections')" @tap="goAllPosts">
          <!-- 2026-08-25 P0：第 5 项改为"我的人脉"，icon 用素材库 r10_c02（人物+加号），规格书 4.4 -->
          <view class="nearby-entry__icon nearby-entry__icon--dynamic">
            <image class="nearby-entry__img" :src="IMAGE_PATHS.LOGIN_SPLIT['r10_c02']" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.myConnections') }}</text>
        </view>
      </view>

      <!-- ① 附近的人（含同城） -->
      <NearbySection :title="t('nearby.peopleTitle')">
        <view class="people-entry-list">
          <view class="people-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.peopleNearby')" @tap="goPeople('nearby')">
            <view class="people-entry__icon-wrap">
              <image class="people-entry__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
            </view>
            <view class="people-entry__body">
              <text class="people-entry__title">{{ t('nearby.peopleNearby') }}</text>
              <text class="people-entry__desc">{{ t('nearby.peopleNearbyDesc') }}</text>
            </view>
            <text class="people-entry__arrow">›</text>
          </view>
          <view class="people-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.peopleCity')" @tap="goPeople('city')">
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
      <NearbySection :title="t('nearby.hotCircles')" :more-text="t('nearby.viewAll')" @more="goCircleList">
        <scroll-view scroll-x class="circle-scroll" :show-scrollbar="false">
          <view class="circle-scroll__list">
            <view
              v-for="circle in hotCircles"
              :key="circle.id"
              class="circle-mini press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="40"
              role="button"
              :aria-label="circle.name"
              @tap="goCircleDetail(circle.id)"
            >
              <image v-if="circleCover(circle)" class="circle-mini__cover" :src="circleCover(circle)" mode="aspectFill" alt="" />
              <!-- 2026-08-26：图标优先 SVG（封面缺失时也不再用 emoji 字符） -->
              <image
                v-else-if="resolveCircleIcon(circle.icon)"
                class="circle-mini__icon"
                :src="resolveCircleIcon(circle.icon)"
                mode="aspectFit"
                alt=""
              />
              <text v-else class="circle-mini__emoji">{{ circle.name.slice(0, 1) }}</text>
              <view class="circle-mini__overlay" />
              <view class="circle-mini__info">
                <text class="circle-mini__name">{{ circle.name }}</text>
                <text class="circle-mini__count">{{ formatMemberCount(circle.memberCount) }} 人加入</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </NearbySection>

      <!-- ③ 校园圈（公开可看、认证进私域） -->
      <NearbySection :title="t('nearby.campusCircles')" :more-text="t('nearby.viewAll')" @more="goCampusHub()">
        <view
          v-for="school in schoolEntries"
          :key="school.id"
          class="campus-entry press-feedback"
          :class="{ 'campus-entry--img': school.coverUrl }"
          hover-class="press-feedback--active"
          hover-stay-time="40"
          role="button"
          :aria-label="school.name"
          @tap="goCampusHub(school.name)"
        >
          <!-- 第五轮 QA（补做）：统一浅绿背景 + 名字；coverUrl 上传后显示图片（保留上传能力） -->
          <image v-if="school.coverUrl" class="campus-entry__cover-img" :src="school.coverUrl" mode="aspectFill" alt="" />
          <view v-else class="campus-entry__badge">
            <text class="campus-entry__badge-text">{{ school.name }}</text>
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
      <NearbySection :title="t('nearby.activitiesTitle')" :more-text="t('nearby.viewAll')" @more="goActivityList">
        <view
          v-for="activity in activityStore.activities.slice(0, 3)"
          :key="activity.id"
          class="activity-entry press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="40"
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

      <!-- ⑤ 附近动态（2026-08-26 R2：独立维度 nearbyPosts；最多 1 个显式「认识 TA」） -->
      <NearbySection :title="t('nearby.nearbyPosts')" :more-text="t('nearby.viewAll')" @more="goAllPosts">
        <!-- 未登录：登录引导卡片（文案复用 apiErrors.loginRequired） -->
        <view v-if="!sessionStore.isLoggedIn" class="nearby-login-guide">
          <text class="nearby-login-guide__text">{{ t('apiErrors.loginRequired') }}</text>
          <view
            class="nearby-login-guide__btn press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('discover.card.goLogin')"
            @tap="goLogin"
          >
            <text class="nearby-login-guide__btn-text">{{ t('discover.card.goLogin') }}</text>
          </view>
        </view>
        <view v-else-if="circlePosts.length === 0 && villageStore.loadingNearbyPosts" class="nearby-home__empty">
          <text class="nearby-home__empty-text">{{ t('common.loading') }}</text>
        </view>
        <view v-else-if="circlePosts.length === 0" class="nearby-home__empty">
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
            hover-stay-time="40"
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
  </view>
</template>

<style scoped lang="scss">
.nearby-home {
  min-height: 100%;
  background: var(--c-bg-page, #F7FAF9);
  padding: calc(calc(env(safe-area-inset-top) + 20px) + 24rpx) 32rpx 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.nearby-home__scroll {
  flex: 1;
  min-height: 0;
}

/* 修复图片过大问题：全局约束附近页所有图片容器 */
.nearby-home image {
  max-width: 100%;
  max-height: 400rpx;
}

.nearby-home__header {
  margin-bottom: 8rpx;
  /* 右侧避让微信胶囊（--capsule-right 由 useMenuButtonRect 注入） */
  padding-right: calc(var(--capsule-right, 96px) + 8px);
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
  color: var(--c-text-inverse, #FFFFFF);
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
  border: 1rpx solid var(--c-line, #EEF2F0);
  box-shadow: var(--c-shadow-card, 0 4px 16px rgba(30, 80, 65, 0.08));
}

.people-entry__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-brand-50, #E8FAF3);
  flex-shrink: 0;
}

.people-entry__icon-wrap--city {
  background: var(--c-romance-100, #FFD9DF);
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
  gap: 12rpx;
  padding-right: 16rpx;
}

.circle-mini {
  /* 第五轮 R5：对齐理想图《附近的首页》——竖版 3:4 小海报卡
   * （750rpx 屏宽下 4 张可见：4×166 + 3×12 gap ≈ 满宽），圆角 16px 级 */
  position: relative;
  width: 166rpx;
  height: 222rpx;
  flex-shrink: 0;
  border-radius: 32rpx;
  overflow: hidden;
  background: var(--c-line, #EEF2F0);
}

.circle-mini__cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.circle-mini__emoji {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 88rpx;
}

/* 2026-08-26：圈子图标 SVG（替代 emoji 字符，视觉尺寸与原 emoji 一致） */
.circle-mini__icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 88rpx;
  height: 88rpx;
}

.circle-mini__overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%);
}

.circle-mini__info {
  position: absolute;
  left: 16rpx;
  right: 16rpx;
  bottom: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  z-index: 2;
}

.circle-mini__name {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.circle-mini__count {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
}

/* 校园圈（第五轮 QA 补做：统一浅绿背景 + 学校名字；coverUrl 上传后显示图片） */
.campus-entry {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  /* 统一浅绿背景（不再每校一色渐变） */
  background: #E6F6EF;
  border: 1rpx solid #D3EDE0;
  margin-bottom: 16rpx;
  overflow: hidden;
}

.campus-entry--img {
  background: var(--c-neutral-100, #F2F4F3);
}

.campus-entry__cover-img {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}

/* 浅绿底圆角方块展示学校名字（替代原首字徽标） */
.campus-entry__badge {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  flex-shrink: 0;
  overflow: hidden;
}

.campus-entry__badge-text {
  font-size: 18rpx;
  font-weight: 700;
  color: #1F9A75;
  line-height: 1.3;
  text-align: center;
  padding: 0 4rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.campus-entry__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

/* 第五轮 QA（补做）：浅绿底上文字用深绿系，保证可读性 */
.campus-entry__name {
  font-size: 28rpx;
  font-weight: 700;
  color: #1F9A75;
}

.campus-entry__desc {
  font-size: 22rpx;
  color: #2E8B6A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.campus-entry__status {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  /* 第五轮 QA（补做）：浅绿底上状态胶囊用白底 + 深绿字 */
  background: #FFFFFF;
  align-self: center;
}

.campus-entry__status-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #1F9A75;
}

.campus-entry__arrow {
  font-size: 30rpx;
  color: #1F9A75;
  opacity: 0.85;
  font-weight: 600;
  align-self: center;
}

.activity-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  color: var(--c-text-inverse, #FFFFFF);
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  margin-bottom: 16rpx;
}
.activity-entry__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  background: var(--c-apricot-100, #FFEDD5);
  flex-shrink: 0;
}
.activity-entry__icon {
  width: 40rpx;
  height: 40rpx;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
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

.activity-entry__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
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
  color: var(--c-text-inverse, #FFFFFF);
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

/* 2026-08-26 R2：未登录「附近动态」登录引导卡片 */
.nearby-login-guide {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  box-shadow: var(--c-shadow-card, 0 4px 16px rgba(30, 80, 65, 0.08));
}

.nearby-login-guide__text {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: var(--c-text-secondary, #666666);
  line-height: 1.5;
}

.nearby-login-guide__btn {
  flex-shrink: 0;
  padding: 12rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #36C99A 0%, #36C99A 100%);
}

.nearby-login-guide__btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
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
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.nearby-tabs__item--active {
  background: var(--c-bg-brand, #E8F8F1);
  border-color: var(--c-brand, #36C99A);
}


.nearby-tabs__icon {
  width: 30rpx;
  height: 30rpx;
  flex-shrink: 0;
}

.nearby-tabs__text {
  font-size: 24rpx;
  color: var(--c-text-primary, #222222);
}

.nearby-tabs__item--active .nearby-tabs__text {
  color: var(--c-brand, #36C99A);
  font-weight: 700;
}

.nearby-home__footer-space {
  height: 48rpx;
}
.nearby-entries {
  display: flex;
  justify-content: space-between;
  gap: 8rpx;
  margin: 8rpx 0 24rpx;
  padding: 24rpx 12rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.nearby-entry {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}

.nearby-entry__icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* V-08（第五轮 QA）：5 功能入口 icon 底色五色系对齐（粉/绿/蓝/橙/紫），
   原 people/circle 同为绿色系易混淆，people 改暖粉珊瑚色 */
.nearby-entry__icon--people { background: #FFF0F3; }
.nearby-entry__icon--circle { background: var(--c-bg-brand, #E8F5E4); }
.nearby-entry__icon--campus { background: #EEF3FF; }
.nearby-entry__icon--activity { background: #FFF5E6; }
.nearby-entry__icon--dynamic { background: #F0EEFF; }

.nearby-entry__img {
  width: 44rpx;
  height: 44rpx;
}

.nearby-entry__label {
  font-size: 22rpx;
  color: var(--c-text-secondary, #4A524E);
  text-align: center;
  white-space: nowrap;
}

</style>