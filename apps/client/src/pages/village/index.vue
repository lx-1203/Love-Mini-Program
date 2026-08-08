<script setup lang="ts">
/**
 * 圈子页（2026-08-08 频道化重构：参考 QQ 频道手机版）
 *
 * 顶部横向频道 Tab：今日广场 / 兴趣圈 / 学校圈 / 活动。
 * - 今日广场：置顶折叠条 + 帖子卡片流（最新 2 条评论预览）
 * - 兴趣圈：兴趣分类宫格 + 热门话题 + 精选话题
 * - 学校圈：认证门（未认证）｜每日一问 + 附近的人 + 校园帖流（已认证）
 * - 活动：活动卡片列表 + 关联活动的帖子流
 * - 底部固定发帖输入条（QQ 频道风格）
 */
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { onLoad, onHide, onShow, onUnload } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useVillageStore, type PostItem, type PostFilters } from "../../stores/village";
import { useSessionStore } from "../../stores/session";
import { useCircleStore } from "../../stores/circle";
import { useActivityStore } from "../../stores/activity";
import { useDailyQuestionStore } from "../../stores/daily-question";
import { openAppPath, consumeTabQuery } from "../../utils/navigation";
import { useTabBar } from "../../composables/useTabBar";
// R4-00084：页面跳转路径统一走 ROUTES 常量
import { ROUTES } from "../../constants/routes";
import LockScreen from "../../components/common/LockScreen.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { villagePageRequirements } from "../../config/page-access";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import { IMAGE_PATHS } from "../../config/images";
import HotTopicsSection from "../../components/village/HotTopicsSection.vue";
import ChannelTabs from "../../components/village/ChannelTabs.vue";
import PostCard from "../../components/village/PostCard.vue";
import PinnedPostsBar from "../../components/village/PinnedPostsBar.vue";
import ActivityCard from "../../components/village/ActivityCard.vue";
import ChannelComposerBar from "../../components/village/ChannelComposerBar.vue";
import SchoolCircleGate from "../../components/village/SchoolCircleGate.vue";
import { showErrorToast } from "../../utils/error-toast";
import {
  CHANNEL_CONFIGS,
  getChannelConfig,
  LAST_CHANNEL_KEY,
  type ChannelId,
} from "../../config/channels";

/* ========== Stores ========== */
const { t } = useI18n();
const villageStore = useVillageStore();
const sessionStore = useSessionStore();
const circleStore = useCircleStore();
const activityStore = useActivityStore();
const dailyQuestionStore = useDailyQuestionStore();

// Phase 4 任务 20：接入页面访问守卫
usePageAccess(villagePageRequirements);
const { loading, errorMessage, hasMore } = storeToRefs(villageStore);
const { currentTopics } = storeToRefs(circleStore);
const { activities } = storeToRefs(activityStore);

// 同步自定义 TabBar 选中状态（圈子 = 索引 2）
useTabBar(2);

/* ========== 锁定状态 ========== */
const isUnlocked = computed(() => sessionStore.isProfileComplete);
const completionPercent = computed(() => sessionStore.profileCompletion);

/* ========== 频道状态 ========== */

/** 当前频道（localStorage 持久化，仿 village_last_category 模式） */
const currentChannelId = ref<ChannelId>(getLastChannel());

function getLastChannel(): ChannelId {
  try {
    const saved = uni.getStorageSync(LAST_CHANNEL_KEY);
    if (saved && typeof saved === "string") {
      const exists = CHANNEL_CONFIGS.some((c) => c.id === saved);
      if (exists) return saved as ChannelId;
    }
  } catch (_e) {
    // 读取失败回退默认频道，不阻塞页面渲染
  }
  return "today";
}

function saveLastChannel(id: string) {
  try {
    uni.setStorageSync(LAST_CHANNEL_KEY, id);
  } catch (_e) {
    // 持久化失败时忽略，不影响用户当前选择
  }
}

/** 当前频道配置 */
const currentChannel = computed(() => getChannelConfig(currentChannelId.value) ?? CHANNEL_CONFIGS[0]);

/** 是否学校圈频道 */
const isSchoolChannel = computed(() => currentChannelId.value === "school");
/** 是否活动频道 */
const isActivityChannel = computed(() => currentChannelId.value === "activity");
/** 是否今日广场频道（置顶折叠条） */
const isTodayChannel = computed(() => currentChannelId.value === "today");
/** 是否兴趣圈频道（宫格 + 话题） */
const isInterestChannel = computed(() => currentChannelId.value === "interest");

/** 用户是否已完成校园认证 */
const isCampusVerified = computed(() => sessionStore.isCampusVerified);

/** 频道 Tab 锁定集合（学校圈未认证 → 小锁标） */
const channelLockedIds = computed(() => (isCampusVerified.value ? [] : ["school"]));

/* ========== 筛选条件（帖子频道） ========== */
const currentFilters = computed<PostFilters>(() => {
  // 修复（TS18048）：currentChannel.value 可能为 undefined（noUncheckedIndexedAccess）
  const channel = currentChannel.value;
  if (!channel || channel.dataSource === "interest-hub") return {};
  return {
    categoryId: `cat-${channel.postCategory}`,
    sortBy: channel.defaultSort ?? "latest",
  };
});

/** 帖子频道列表（今日广场/学校圈/活动帖） */
const displayPosts = computed<PostItem[]>(() => {
  // 修复（TS18048）：currentChannel.value 可能为 undefined
  const channel = currentChannel.value;
  if (!channel || channel.dataSource === "interest-hub") return [];
  return villageStore.filteredPosts(currentFilters.value);
});

/** 置顶帖（今日广场折叠条） */
const pinnedPosts = computed<PostItem[]>(() =>
  displayPosts.value.filter((p) => p.isPinned)
);

/** 非置顶帖子流 */
const feedPosts = computed<PostItem[]>(() =>
  displayPosts.value.filter((p) => !p.isPinned)
);

/* ========== 频道切换 ========== */
let lastActiveChannel = "";

function selectChannel(id: ChannelId) {
  if (currentChannelId.value === id) return;
  // 保存旧频道滚动位置
  if (lastActiveChannel) {
    savedScrollPositions[lastActiveChannel] = scrollTopValue.value;
  }
  lastActiveChannel = id;
  currentChannelId.value = id;
  saveLastChannel(id);
  // 恢复目标频道滚动位置
  const saved = savedScrollPositions[id];
  scrollTopValue.value = saved ?? 0;
  void loadChannelData(id);
}

function onChannelChange(id: string) {
  selectChannel(id as ChannelId);
}

/** 拉取当前频道数据 */
async function loadChannelData(id: string = currentChannelId.value) {
  const channel = getChannelConfig(id);
  if (!channel) return;
  if (channel.dataSource === "interest-hub") {
    void circleStore.fetchFeaturedTopics(1);
    return;
  }
  void villageStore.fetchPosts(currentFilters.value);
  if (channel.dataSource === "activity-feed" && activities.value.length === 0) {
    void activityStore.fetchActivities();
  }
}

/** 发帖返回刷新（post-topic 成功时 uni.$emit('village:post-created')） */
function onPostCreated() {
  void loadChannelData();
}

/* ========== 兴趣圈频道内容 ========== */
interface InterestCategory {
  id: string;
  name: string;
  icon: string;
}

const INTEREST_CATEGORIES = computed<InterestCategory[]>(() => [
  { id: "study", name: t("circle.catStudy"), icon: IMAGE_PATHS.ICONS_EMOJI.BOOK },
  { id: "sports", name: t("circle.catSports"), icon: IMAGE_PATHS.ICONS_COMMON.HIKING_SVG },
  { id: "music", name: t("circle.catMusic"), icon: IMAGE_PATHS.ICONS_EMOJI.MUSIC },
  { id: "movie", name: t("circle.catMovie"), icon: IMAGE_PATHS.ICONS_EMOJI.CLAPPER },
  { id: "travel", name: t("circle.catTravel"), icon: IMAGE_PATHS.ICONS_EMOJI.PLANE },
  { id: "game", name: t("circle.catGame"), icon: IMAGE_PATHS.ICONS_EMOJI.GAMEPAD },
  { id: "food", name: t("circle.catFood"), icon: IMAGE_PATHS.ICONS_EMOJI.FOOD },
  { id: "reading", name: t("circle.catReading"), icon: IMAGE_PATHS.ICONS_COMMON.OPEN_BOOK_SVG },
]);

function goToInterestCircle(catId: string) {
  openAppPath(`${ROUTES.CIRCLES.INDEX}?category=${encodeURIComponent(catId)}`);
}

function goToTopicDetail(topic: { id: string; circleId: string }) {
  openAppPath(`${ROUTES.CIRCLES.TOPIC_DETAIL}?topicId=${topic.id}&circleId=${topic.circleId}`);
}

/* ========== 学校圈认证门 ========== */
function goToCampusCertification() {
  openAppPath(ROUTES.CAMPUS.CERTIFICATION);
}

/** 模拟认证一键通过（演示）：调后端 simulate 接口，成功后刷新 session */
async function simulateVerify() {
  try {
    // 延迟 import 避免循环依赖（school-gate 与 session 无直接关联）
    const { request } = await import("../../services/http");
    await request<unknown, unknown>({
      url: "/campus/certification/simulate",
      method: "POST",
    });
    // 修复（TS2551）：store 实际方法名为 refreshSession（refreshUserSession 不存在，运行时会抛错）
    await sessionStore.refreshSession();
    uni.showToast({ title: t("village.schoolGateSimulateSuccess"), icon: "success" });
  } catch (error) {
    showErrorToast(error, t("village.schoolGateSimulateFailed"));
    console.error("模拟认证失败:", error);
  }
}

/* ========== 活动频道 ========== */
function openActivityDetail(activityId: number | string) {
  openAppPath(`${ROUTES.ACTIVITY_DETAIL}?id=${encodeURIComponent(String(activityId))}`);
}

async function handleEnrollActivity(activityId: number | string) {
  try {
    const ok = await activityStore.enrollActivity(String(activityId));
    uni.showToast({
      title: ok ? t("activities.enrolledToast") : t("activities.unenrolledToast"),
      icon: "none",
    });
  } catch (error) {
    showErrorToast(error, t("activities.enrollFailedToast"));
    console.error("活动报名失败:", error);
  }
}

/* ========== 帖子互动（转发至 store） ========== */
async function handleLike(postId: string) {
  try {
    await villageStore.likePost(postId);
  } catch (error) {
    showErrorToast(error, t("village.likeFailed"));
    console.error("点赞失败:", error);
  }
}

async function handleFavorite(postId: string) {
  try {
    await villageStore.toggleFavorite(postId);
  } catch (error) {
    showErrorToast(error, t("village.favoriteFailed"));
    console.error("收藏失败:", error);
  }
}

async function handleFollow(userId: string) {
  try {
    await villageStore.followUser(userId);
  } catch (error) {
    showErrorToast(error, t("village.followFailed"));
    console.error("关注失败:", error);
  }
}

/* ========== 跳转 ========== */
function goToDetail(postId: string) {
  villageStore.setCurrentPost(postId);
  openAppPath(ROUTES.VILLAGE.DETAIL);
}

function goToAuthorProfile(authorId: string) {
  if (!authorId) return;
  openAppPath(`${ROUTES.PROFILE.INDEX}?userId=${encodeURIComponent(authorId)}`);
}

function goToTagPosts(tagName: string) {
  const cleanTag = tagName.startsWith("#") ? tagName.slice(1) : tagName;
  openAppPath(`${ROUTES.VILLAGE.TAG_POSTS}?tagName=${encodeURIComponent(cleanTag)}`);
}

function openActivityFromPost(activityId: number) {
  openActivityDetail(activityId);
}

/* ========== 发帖（底部输入条 → 发帖页，携带当前频道） ========== */
function handlePublish() {
  const channelId = currentChannelId.value;
  openAppPath(`${ROUTES.CIRCLES.POST_TOPIC}?channel=${channelId}`);
}

/** 学校圈未认证：底部输入条锁定，点击引导认证 */
function handleComposerUnlock() {
  goToCampusCertification();
}

/** 底部输入条占位文案（随频道变化） */
const composerPlaceholder = computed(() => {
  if (isSchoolChannel.value && !isCampusVerified.value) {
    return t("village.composerSchoolLocked");
  }
  switch (currentChannelId.value) {
    case "interest":
      return t("village.composerInterest");
    case "school":
      return t("village.composerSchool");
    case "activity":
      return t("village.composerActivity");
    default:
      return t("village.composerToday");
  }
});

/** 去认识新朋友（学校圈附近的人 banner） */
function goToDiscover() {
  openAppPath(ROUTES.TAB.DISCOVER);
}

/* ========== 下拉刷新 / 加载更多 ========== */
const isRefreshing = ref(false);
const isLoadingMore = ref(false);

async function onRefresh() {
  isRefreshing.value = true;
  try {
    await loadChannelData();
  } finally {
    isRefreshing.value = false;
    uni.stopPullDownRefresh();
  }
}

async function onLoadMore() {
  if (isLoadingMore.value || loading.value || !hasMore.value) return;
  if (isInterestChannel.value) return;
  isLoadingMore.value = true;
  try {
    await villageStore.loadMore(currentFilters.value);
  } finally {
    isLoadingMore.value = false;
  }
}

/* ========== 滚动到顶部 + 频道切换记忆位置 ========== */
const SCROLL_TOP_THRESHOLD = 600;
const scrollTopValue = ref(0);
const showBackToTop = ref(false);
const savedScrollPositions: Record<string, number> = {};

function handleScroll(e: { detail: { scrollTop: number } }) {
  const top = e.detail?.scrollTop ?? 0;
  if (Math.abs(top - scrollTopValue.value) > 4) {
    scrollTopValue.value = top;
  }
  showBackToTop.value = top > SCROLL_TOP_THRESHOLD;
}

function handleBackToTop() {
  scrollTopValue.value = 0;
  showBackToTop.value = false;
}

/* ========== 空状态 ========== */
const emptyStateMessage = computed(() => {
  switch (currentChannelId.value) {
    case "school":
      return t("village.schoolChannelEmpty");
    case "activity":
      return t("village.activityChannelEmpty");
    default:
      return t("village.emptyPosts");
  }
});

function handleEmptyAction() {
  handlePublish();
}

/* ========== 生命周期 ========== */
onLoad((query) => {
  // 频道直达（如发帖页返回链路 / 其他入口）
  if (query?.channel && CHANNEL_CONFIGS.some((c) => c.id === query.channel)) {
    currentChannelId.value = query.channel as ChannelId;
    saveLastChannel(query.channel);
  }
});

let scrollTopRestoreTimer: ReturnType<typeof setTimeout> | null = null;

onShow(() => {
  // 消费 Tab 桥接参数（hot/mine 已随频道化移除，映射到今日广场防残留）
  const bridged = consumeTabQuery();
  if (bridged.tab === "hot" || bridged.tab === "mine") {
    currentChannelId.value = "today";
    saveLastChannel("today");
  }

  // 页面恢复时回滚到上次位置
  const key = lastActiveChannel || currentChannelId.value;
  const saved = savedScrollPositions[key] ?? 0;
  if (saved > 0) {
    if (scrollTopRestoreTimer) clearTimeout(scrollTopRestoreTimer);
    scrollTopRestoreTimer = setTimeout(() => {
      scrollTopRestoreTimer = null;
      scrollTopValue.value = saved;
    }, 50);
  }

  // 每日一问（学校圈已认证时展示）
  if (sessionStore.isLoggedIn) {
    void dailyQuestionStore.fetchTodayQuestion();
  }
  // 发帖返回后刷新当前频道（post-topic 成功时触发）
  void loadChannelData();
});

onHide(() => {
  if (lastActiveChannel) {
    savedScrollPositions[lastActiveChannel] = scrollTopValue.value;
  } else {
    savedScrollPositions[currentChannelId.value] = scrollTopValue.value;
  }
});

onMounted(() => {
  if (isUnlocked.value) {
    void loadChannelData();
  }
});

// session 异步恢复时补拉数据
watch(isUnlocked, (unlocked) => {
  if (unlocked) {
    void loadChannelData();
  }
});

// 校园认证状态变化：通过后拉取校园帖子流
watch(isCampusVerified, (verified) => {
  if (verified && currentChannelId.value === "school") {
    void villageStore.fetchPosts(currentFilters.value);
  }
});

onUnmounted(() => {
  if (scrollTopRestoreTimer) {
    clearTimeout(scrollTopRestoreTimer);
    scrollTopRestoreTimer = null;
  }
  uni.$off("village:post-created", onPostCreated);
});

// R4-00159：页面卸载时清理 village store 定时器/请求资源（评论防抖、点赞 in-flight 等）
onUnload(() => {
  villageStore.dispose();
});

// 发帖返回刷新事件（组件挂载后注册，卸载时清理）
uni.$on("village:post-created", onPostCreated);
</script>

<template>
  <view class="village-page page-bottom-safe page-fade-in">
    <!-- 未完善资料：显示锁定页面 -->
    <LockScreen
      v-if="!isUnlocked"
      :page-name="t('village.title')"
      :completion-percent="completionPercent"
    />

    <!-- 已完善资料：显示完整社区 -->
    <template v-else>
      <!-- ===== 页面头部（标题 + 频道 Tab） ===== -->
      <view class="village-header">
        <view class="village-header__top">
          <view class="village-header__title-wrap">
            <text class="village-header__title section-title-brand">{{ t('village.title') }}</text>
            <text class="village-header__subtitle">{{ t('village.subtitle') }}</text>
          </view>
        </view>
        <!-- 频道 Tab（QQ 频道风格横向滑动） -->
        <ChannelTabs
          v-model="currentChannelId"
          :configs="CHANNEL_CONFIGS"
          :locked-ids="channelLockedIds"
          @change="onChannelChange"
        />
      </view>

      <!-- ===== 频道内容区（scroll-view 统一滚动 + 记忆位置） ===== -->
      <scroll-view
        class="channel-feed"
        scroll-y
        :scroll-top="scrollTopValue"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        :enhanced="true"
        :bounces="true"
        :show-scrollbar="false"
        @refresherrefresh="onRefresh"
        @scrolltolower="onLoadMore"
        @scroll="handleScroll"
      >
        <!-- ===== 学校圈：未认证 → 认证门 ===== -->
        <SchoolCircleGate
          v-if="isSchoolChannel && !isCampusVerified"
          @go-certification="goToCampusCertification"
          @simulate-verify="simulateVerify"
        />

        <template v-else>
          <!-- ===== 学校圈（已认证）：每日一问 + 附近的人 + 校园帖流 ===== -->
          <template v-if="isSchoolChannel">
            <view
              class="village-daily-entry press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('village.dailyQuestion')"
              @tap="openAppPath(ROUTES.DAILY_QUESTION)"
            >
              <image class="village-daily-entry__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL" mode="aspectFit" alt="" />
              <view class="village-daily-entry__info">
                <view class="village-daily-entry__title-row">
                  <text class="village-daily-entry__title">{{ t('village.dailyQuestion') }}</text>
                  <text
                    v-if="dailyQuestionStore.todayQuestion?.hasAnswered"
                    class="village-daily-entry__answered"
                  >{{ t('village.dailyQuestionAnswered') }}</text>
                </view>
                <text class="village-daily-entry__desc">
                  {{ dailyQuestionStore.todayQuestion?.question ?? t('village.dailyQuestionDesc') }}
                </text>
              </view>
              <text class="village-daily-entry__arrow">&rsaquo;</text>
            </view>

            <view
              class="discover-banner press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('village.goToDiscoverAria')"
              @tap="goToDiscover"
            >
              <view class="discover-banner__content">
                <view class="discover-banner__left">
                  <image class="discover-banner__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
                  <view class="discover-banner__text-wrap">
                    <text class="discover-banner__title">{{ t('home.nearbyPeople') }}</text>
                    <text class="discover-banner__subtitle">{{ t('village.discoverBannerSubtitle') }}</text>
                  </view>
                </view>
                <text class="discover-banner__arrow">&rsaquo;</text>
              </view>
            </view>
          </template>

          <!-- ===== 活动频道：活动卡片列表 ===== -->
          <template v-if="isActivityChannel">
            <view class="channel-section">
              <view class="channel-section__header">
                <text class="channel-section__title">{{ t('village.activityChannelTitle') }}</text>
                <text class="channel-section__sub">{{ t('village.activityChannelSub') }}</text>
              </view>
              <view class="activity-list">
                <ActivityCard
                  v-for="act in activities"
                  :key="act.id"
                  :activity="act"
                  :enrolled="act.isEnrolled"
                  @open-detail="openActivityDetail"
                  @enroll="handleEnrollActivity"
                />
              </view>
            </view>
          </template>

          <!-- ===== 兴趣圈频道：宫格 + 热门话题 + 精选话题 ===== -->
          <template v-if="isInterestChannel">
            <view class="interest-grid" role="list">
              <view
                v-for="cat in INTEREST_CATEGORIES"
                :key="cat.id"
                class="interest-grid__item press-feedback"
                hover-class="press-feedback--active"
                hover-stay-time="120"
                role="button"
                :aria-label="t('village.interestGridAria', { name: cat.name })"
                @tap="goToInterestCircle(cat.id)"
              >
                <view class="interest-grid__icon-wrap">
                  <image class="interest-grid__icon" :src="cat.icon" mode="aspectFit" lazy-load alt="" />
                </view>
                <text class="interest-grid__name">{{ cat.name }}</text>
              </view>
            </view>

            <HotTopicsSection />

            <view v-if="currentTopics.length > 0" class="channel-section">
              <view class="channel-section__header">
                <text class="channel-section__title">{{ t('village.channelInterestFeatured') }}</text>
              </view>
              <view class="topic-list">
                <view
                  v-for="topic in currentTopics"
                  :key="topic.id"
                  class="topic-item press-feedback"
                  hover-class="press-feedback--active"
                  hover-stay-time="100"
                  role="button"
                  :aria-label="topic.title"
                  @tap="goToTopicDetail(topic)"
                >
                  <view class="topic-item__body">
                    <text class="topic-item__title">{{ topic.title }}</text>
                    <text class="topic-item__summary">{{ topic.content }}</text>
                  </view>
                  <view class="topic-item__meta">
                    <view class="topic-item__author">
                      <image
                        v-if="topic.author.avatar"
                        class="topic-item__avatar"
                        :src="topic.author.avatar"
                        mode="aspectFill"
                        lazy-load
                        alt=""
                      />
                      <text v-else class="topic-item__avatar topic-item__avatar--char">{{ topic.author.name[0] }}</text>
                      <text class="topic-item__author-name">{{ topic.author.name }}</text>
                    </view>
                    <view class="topic-item__stats">
                      <image class="topic-item__stats-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" alt="" />
                      <text class="topic-item__stats-count">{{ topic.replyCount }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </template>

          <!-- ===== 帖子频道（今日广场/学校圈已认证/活动帖）：置顶折叠 + 帖子流 ===== -->
          <template v-if="!isInterestChannel">
            <!-- 加载状态 -->
            <view v-if="loading && displayPosts.length === 0" class="village-state">
              <Skeleton variant="list" :count="4" />
            </view>

            <!-- 错误状态 -->
            <view v-else-if="errorMessage && displayPosts.length === 0" class="village-state">
              <ErrorState type="network" @retry="onRefresh" />
            </view>

            <template v-else>
              <!-- 置顶折叠条（今日广场；QQ 频道风格） -->
              <PinnedPostsBar
                v-if="isTodayChannel && pinnedPosts.length > 0"
                :posts="pinnedPosts"
                @open="goToDetail"
              />

              <!-- 空状态 -->
              <view v-if="displayPosts.length === 0" class="village-empty">
                <EmptyState type="no-data" :message="emptyStateMessage">
                  <view
                    class="village-empty__action press-feedback"
                    hover-class="press-feedback--active"
                    hover-stay-time="120"
                    role="button"
                    :aria-label="t('village.publishPost')"
                    @tap="handleEmptyAction"
                  >
                    <text class="village-empty__action-text">{{ t('village.publishPost') }}</text>
                  </view>
                </EmptyState>
              </view>

              <!-- 帖子卡片列表 -->
              <view v-else class="post-feed__list card-stagger" role="list">
                <PostCard
                  v-for="post in feedPosts"
                  :key="post.id"
                  :post="post"
                  @like="handleLike"
                  @favorite="handleFavorite"
                  @follow="handleFollow"
                  @open-detail="goToDetail"
                  @open-author="goToAuthorProfile"
                  @open-tag="goToTagPosts"
                  @open-activity="openActivityFromPost"
                />
              </view>

              <!-- 加载更多提示 -->
              <view v-if="isLoadingMore" class="load-more" role="status" aria-live="polite">
                <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('common.loading')" />
                <text class="load-more__text">{{ t('common.loading') }}</text>
              </view>
              <view v-else-if="!hasMore && displayPosts.length > 0" class="load-more">
                <text class="load-more__text">{{ t('village.noMorePosts') }}</text>
              </view>
            </template>
          </template>
        </template>

        <!-- 底部留白（输入条遮挡） -->
        <view class="feed-bottom-spacer" />
      </scroll-view>

      <!-- ===== 底部发帖输入条（QQ 频道风格；学校圈未认证 → 锁定引导认证） ===== -->
      <ChannelComposerBar
        :placeholder="composerPlaceholder"
        :locked="isSchoolChannel && !isCampusVerified"
        @publish="handlePublish"
        @unlock="handleComposerUnlock"
      />

      <!-- ===== 回到顶部按钮 ===== -->
      <view
        v-if="showBackToTop"
        class="back-to-top press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('village.backToTopAria')"
        @tap="handleBackToTop"
      >
        <text class="back-to-top__icon">&uarr;</text>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   圈子页 - 整体布局（2026-08-08 频道化重构）
   ================================================================ */
.village-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--c-gradient-page);
  overflow: hidden;
}

/* ================================================================
   页面头部
   ================================================================ */
.village-header {
  background: var(--c-bg-container);
  padding-top: calc(constant(safe-area-inset-top) + var(--sp-4));
  padding-top: calc(env(safe-area-inset-top) + var(--sp-4));
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--s-sm);
}

.village-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-7) var(--sp-5);
}

.village-header__title-wrap {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
}

.village-header__title {
  font-size: var(--fs-5xl);
  font-weight: 800;
  color: var(--c-text-primary);
  letter-spacing: var(--sp-1);
}

.village-header__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* ================================================================
   频道内容区（统一 scroll-view）
   ================================================================ */
.channel-feed {
  flex: 1;
  overflow-y: auto;
}

/* ================================================================
   频道分区标题
   ================================================================ */
.channel-section {
  margin: var(--sp-6) var(--sp-6) 0;
}

.channel-section__header {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
}

.channel-section__title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-primary);
}

.channel-section__sub {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* ================================================================
   活动频道：活动卡列表
   ================================================================ */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

/* ================================================================
   兴趣圈频道：分类宫格（保留 Task B2 原样式）
   ================================================================ */
.interest-grid {
  display: flex;
  flex-wrap: wrap;
  padding: var(--sp-8) var(--sp-5);
  gap: var(--sp-4);
}

.interest-grid__item {
  width: calc((100% - var(--sp-4) * 3) / 4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-6) 0;
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.interest-grid__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

.interest-grid__icon {
  width: 40rpx;
  height: 40rpx;
}

.interest-grid__name {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text-secondary);
}

/* ================================================================
   兴趣圈频道：精选话题列表
   ================================================================ */
.topic-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.topic-item {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-5) var(--sp-6);
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.topic-item__title {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-item__summary {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.topic-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--sp-1);
}

.topic-item__author {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.topic-item__avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: var(--c-brand-500);
}

.topic-item__avatar--char {
  color: var(--c-brand-500);
}

.topic-item__author-name {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.topic-item__stats {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.topic-item__stats-icon {
  width: 28rpx;
  height: 28rpx;
}

.topic-item__stats-count {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* ================================================================
   每日一问（学校圈频道顶部；原样式保留）
   ================================================================ */
.village-daily-entry {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin: var(--sp-6) var(--sp-7) var(--sp-5);
  padding: var(--sp-4) var(--sp-5);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  border: 1rpx solid var(--c-border-light);
  box-shadow: var(--s-card-soft);
  transition: transform var(--d-fast, 150ms) ease;
}

/* #ifdef H5 */
.village-daily-entry:active {
  transform: scale(0.98);
}
/* #endif */

.village-daily-entry__icon {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
  color: var(--c-brand-500);
}

.village-daily-entry__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.village-daily-entry__title-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.village-daily-entry__title {
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-text-primary);
}

.village-daily-entry__answered {
  font-size: var(--fs-xs);
  color: var(--c-brand-500);
  font-weight: 600;
  padding: 2rpx 12rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-brand);
}

.village-daily-entry__desc {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.village-daily-entry__arrow {
  font-size: var(--fs-3xl);
  color: var(--c-text-tertiary);
  font-weight: 300;
  flex-shrink: 0;
}

/* ================================================================
   附近的人 banner（学校圈频道；原样式保留）
   ================================================================ */
.discover-banner {
  margin: 0 var(--sp-7) var(--sp-6);
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-romance-400) 100%);
  border-radius: var(--r-xl);
  box-shadow: var(--s-brand);
  overflow: hidden;
  position: relative;
}

.discover-banner__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-5) var(--sp-6);
}

.discover-banner__left {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.discover-banner__icon {
  width: 56rpx;
  height: 56rpx;
  color: var(--c-neutral-0);
}

.discover-banner__text-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.discover-banner__title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-neutral-0);
}

.discover-banner__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85));
}

.discover-banner__arrow {
  font-size: var(--fs-4xl);
  color: var(--c-neutral-0);
  font-weight: 300;
}

/* ================================================================
   空状态 / 加载 / 错误
   ================================================================ */
.village-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
  padding: var(--sp-10) var(--sp-8);
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid var(--c-neutral-200);
  border-top-color: var(--c-brand-400);
  border-radius: var(--r-full);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.village-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: var(--sp-14) var(--sp-8);
}

.village-empty__action {
  margin-top: var(--sp-2);
  padding: var(--sp-4) var(--sp-10);
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
}

.village-empty__action-text {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 600;
}

/* ================================================================
   帖子列表容器
   ================================================================ */
.post-feed__list {
  padding: var(--sp-6) var(--sp-6) 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-7) 0;
}

.load-more__text {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

.feed-bottom-spacer {
  /* 底部输入条遮挡留白 ≥ 220rpx */
  height: 220rpx;
}

/* ================================================================
   回到顶部
   ================================================================ */
.back-to-top {
  position: fixed;
  right: var(--sp-7);
  bottom: calc(env(safe-area-inset-bottom) + 220rpx);
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-md);
  z-index: 98;
  animation: back-to-top-fade-in var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes back-to-top-fade-in {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.back-to-top__icon {
  font-size: 36rpx;
  color: var(--c-text-secondary);
}
</style>
