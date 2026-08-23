<script setup lang="ts">
/**
 * 兴趣圈话题列表页
 * 展示指定兴趣圈下的话题列表，支持下拉刷新和加载更多
 */
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCircleStore, formatCircleTime, type TopicAuthor } from "../../stores/circle";
import { useActivityStore } from "../../stores/activity";
import { openAppPath, openUserProfile } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import EmptyState from "../../components/common/EmptyState.vue";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../utils/media";
// SubTask 5.5.2：列表页图片 @error 占位图通用方案
import { useImageFallback } from "../../composables/useImageFallback";

/** Emoji 替换 SVG 图标路径 */
const chatIcon = IMAGE_PATHS.ICONS_EMOJI.CHAT;

const { t } = useI18n();
const circleStore = useCircleStore();
const { currentTopics, loading, errorMessage, topicHasMore } = storeToRefs(circleStore);

// SubTask 5.5.2：列表页图片 @error 占位图 —— 失败 key 集合与判断函数
const { onImageError, isImageFailed } = useImageFallback();

/** 当前兴趣圈 ID（从页面参数获取） */
const circleId = ref("");
/** 当前兴趣圈名称 */
const circleName = ref("");

/**
 * R4-00101：昵称首字符兜底（author.name 为空/null 时返回占位符，
 * 避免 name[0] 抛 TypeError 崩溃渲染）。
 */
function initialOf(name?: string | null): string {
  return name && name.length > 0 ? name.charAt(0) : "?";
}
/** 下拉刷新中 */
const isRefreshing = ref(false);
/** 加载更多中 */
const isLoadingMore = ref(false);


/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 */
/**
 * 刷新话题列表
 */
async function onRefresh() {
  isRefreshing.value = true;
  try {
    await circleStore.fetchTopics(circleId.value, 1);
  } finally {
    isRefreshing.value = false;
    uni.stopPullDownRefresh();
  }
}

/**
 * 加载更多
 */
async function onLoadMore() {
  if (isLoadingMore.value || loading.value || !topicHasMore.value) return;
  isLoadingMore.value = true;
  try {
    await circleStore.fetchTopics(circleId.value, circleStore.topicPage + 1);
  } finally {
    isLoadingMore.value = false;
  }
}

/**
 * 点击话题，跳转到详情
 * @param topicId - 话题 ID
 */
function goToDetail(topicId: string) {
  openAppPath(`/pages/circles/topic-detail?topicId=${topicId}&circleId=${circleId.value}`);
}

/**
 * 跳转到话题作者的个人主页（F1.3）
 * 头像点击事件使用 catchtap 阻止冒泡，避免触发话题卡片整体的 goToDetail
 * @param authorId - 作者 userId
 */
function goToAuthorProfile(authorId: string) {
  if (!authorId) return;
  openAppPath(`/pages/profile/index?userId=${encodeURIComponent(authorId)}`);
}

/**
 * 发布新话题
 */
function goToPostTopic() {
  openAppPath(`/pages/circles/post-topic?circleId=${circleId.value}`);
}

/** 兴趣圈详情 Tab（v3 Nearby 冻结）：动态 / 精选 / 成员 / 活动 */
const detailTab = ref<"feed" | "hot" | "members" | "activities">("feed");

/** 当前圈子（列表数据中查找，用于头部成员数/加入态） */
const circle = computed(() => circleStore.circles.find((c) => c.id === circleId.value) ?? null);

/** 2026-08-21：圈子封面（复用兴趣圈页素材） */
const CIRCLE_COVER = {
  photo: "/static/assets/images/covers/circle-photo.png",
  travel: "/static/assets/images/covers/circle-travel.png",
  music: "/static/assets/images/covers/circle-music.png",
  sports: "/static/assets/images/covers/circle-sports.png",
  food: "/static/assets/images/covers/circle-food.png",
  sky: "/static/assets/images/covers/circle-sky.png",
  game: "/static/assets/images/covers/circle-game.png",
  reading: "/static/assets/images/covers/circle-reading.png",
  pet: "/static/assets/images/covers/circle-pet.png",
  cutepets: "/static/assets/images/covers/circle-cutepets.png",
  basketball: "/static/assets/images/covers/circle-basketball.png",
  boardgame: "/static/assets/images/covers/circle-boardgame.png",
  postgraduate: "/static/assets/images/covers/circle-postgraduate.png",
  studybuddy: "/static/assets/images/covers/circle-studybuddy.png",
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

/** 精选 = 仅对当前已拉取话题按回复数排序（likes 字段缺失，score 用回复数） */
const displayTopics = computed(() =>
  detailTab.value === "hot"
    ? [...currentTopics.value].sort((a, b) => b.replyCount - a.replyCount)
    : currentTopics.value
);

/** 成员 Tab：成员数 + 圈内活跃作者头像（取帖子作者，无新成员列表接口） */
const memberAvatars = computed(() => {
  const map = new Map<string, TopicAuthor>();
  for (const tp of currentTopics.value) {
    if (tp.author.userId && !map.has(tp.author.userId)) map.set(tp.author.userId, tp.author);
  }
  return [...map.values()];
});

/** 加入/退出兴趣圈（开放圈，无需校园认证） */
async function toggleJoin() {
  const c = circle.value;
  if (!c) return;
  try {
    if (c.isJoined) await circleStore.leaveCircle(c.id);
    else await circleStore.joinCircle(c.id);
  } catch (_e) {
    // store 内部已提示错误
  }
}

/** v3 冻结：认识 TA → 他人主页（不直接 like/建聊天） */
function meetAuthor(userId: string) {
  openUserProfile(userId);
}

/** 活动 Tab：复用活动列表 */
const activityStore = useActivityStore();
function goToActivityDetail(activityId: string | number) {
  openAppPath(`/pages/activities/detail?id=${encodeURIComponent(String(activityId))}`);
}
function switchTab(tab: "feed" | "hot" | "members" | "activities") {
  detailTab.value = tab;
  if (tab === "activities" && activityStore.activities.length === 0) {
    void activityStore.fetchActivities().catch(() => {});
  }
}

/**
 * 返回上一页
 */
function goCircleDetail(_id: string) {
  uni.navigateBack();
}

function goBack() {
  uni.navigateBack();
}

onLoad((query) => {
  const q = query || {};
  circleId.value = q.circleId || "";
  // R4-00100：decodeURIComponent 遇 URL 中非法 % 序列会抛 URIError 中断页面渲染，
  // 包 try-catch 兜底（解码失败按原始字符串展示，后续若命中本地圈子再覆盖为真实名称）
  try {
    circleName.value = decodeURIComponent(q.circleName || "");
  } catch (_e) {
    circleName.value = q.circleName || "";
  }

  if (circleId.value) {
    void circleStore.fetchCircles().catch(() => {});
    const circle = circleStore.circles.find((c) => c.id === circleId.value);
    if (circle) {
      circleName.value = circle.name;
    }
    void circleStore.fetchTopics(circleId.value, 1);
  } else {
    // infra R2-00075: circleId 缺失时给出错误态提示，避免直开链接白屏
    uni.showToast({ title: t("storeErrors.circle.circleIdInvalid"), icon: "none" });
  }
});

// 修复（严格模式 noUnusedLocals）：goToAuthorProfile 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ goToAuthorProfile });
</script>

<template>
  <view class="topics-page">
    <!-- 顶部导航栏 -->
    <view class="topics-header">
      <view class="topics-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">{{ t("circle.topicDetailBack") }}</text>
      </view>
      <text class="topics-header__title">{{ circleName || t("circle.topicsListTitle") }}</text>
      <view class="topics-header__spacer" />
    </view>

    <!-- 兴趣圈详情头部（v3 Nearby 冻结） -->
    <view v-if="circle" class="circle-hero">
      <image v-if="circleCover(circle)" class="circle-hero__bg" :src="circleCover(circle)" mode="aspectFill" alt="" />
      <view class="circle-hero__bg-mask" />
      <view class="circle-hero__icon"><text class="circle-hero__emoji">{{ circle.icon }}</text></view>
      <view class="circle-hero__body">
        <view class="circle-hero__name-row">
          <text class="circle-hero__name">{{ circle.name }}</text>
          <text v-if="circle.memberCount >= 7000" class="circle-hero__hot">热门</text>
        </view>
        <text class="circle-hero__meta">{{ circle.memberCount }} 成员 · {{ circle.topicCount }} 条动态</text>
        <text class="circle-hero__desc">{{ circle.description }}</text>
      </view>
      <view
        class="circle-hero__join"
        :class="{ 'circle-hero__join--joined': circle.isJoined }"
        role="button"
        :aria-label="circle.isJoined ? t('circle.joinedBtn') : t('circle.joinBtn')"
        @tap.stop="toggleJoin"
      >
        <text class="circle-hero__join-text">{{ circle.isJoined ? t('circle.joinedBtn') : t('circle.joinBtn') }}</text>
      </view>
    </view>

    <!-- 详情 Tab：动态 / 精选 / 成员 / 活动 -->
    <view class="circle-tabs" role="tablist" :aria-label="t('circle.detailTabsAria')">
      <view v-for="tab in [{key:'feed',label:t('circle.detailFeed')},{key:'hot',label:t('circle.detailHot')},{key:'members',label:t('circle.detailMembersTab')},{key:'activities',label:t('circle.detailActivitiesTab')}]" :key="tab.key"
        class="circle-tab"
        :class="{ 'circle-tab--active': detailTab === tab.key }"
        role="tab"
        :aria-selected="detailTab === tab.key ? 'true' : 'false'"
        @tap="switchTab(tab.key as 'feed' | 'hot' | 'members' | 'activities')"
      >
        <text class="circle-tab__text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && currentTopics.length === 0" class="topics-state">
      <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('circle.topicsLoadingAria')" />
      <text class="topics-state__text">{{ t("circle.topicsLoadingText") }}</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="errorMessage && currentTopics.length === 0" class="topics-state">
      <view class="error-icon">
        <image class="error-icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.WARNING" mode="aspectFit" alt="" />
      </view>
      <text class="topics-state__text">{{ errorMessage }}</text>
      <view class="topics-state__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="onRefresh">
        <text class="topics-state__btn-text">{{ t("circle.topicsRetryBtn") }}</text>
      </view>
    </view>

    <!-- 话题列表 -->
    <scroll-view
      v-else
      class="topics-list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- 2026-08-21：置顶规则条（参考图对齐） -->
      <view v-if="detailTab === 'feed' || detailTab === 'hot'" class="topic-rule" @tap="goCircleDetail(circleId)">
        <text class="topic-rule__pin">置顶</text>
        <text class="topic-rule__text">【圈规】文明发言，友善交流，共同维护圈子氛围</text>
        <text class="topic-rule__arrow">›</text>
      </view>

      <!-- 空状态 -->
      <EmptyState
        v-if="(detailTab === 'feed' || detailTab === 'hot') && displayTopics.length === 0"
        type="no-data"
        :image="chatIcon"
        :title="t('circle.topicsEmptyTitle')"
        :description="t('circle.topicsEmptyDesc')"
        :action-text="t('circle.topicsEmptyAction')"
        @action="goToPostTopic"
      />

      <!-- 话题卡片 -->
      <view
        v-for="topic in displayTopics" :key="topic.id"
        class="topic-card list-item"
        @tap="goToDetail(topic.id)"
      >
        <!-- 话题标题 -->
        <text class="topic-card__title">{{ topic.title }}</text>

        <!-- 话题内容预览 -->
        <text class="topic-card__content">{{ topic.content }}</text>

        <!-- 底部信息 -->
        <view class="topic-card__footer">
          <view class="topic-card__author">
            <view
              class="topic-card__avatar"
  @tap.stop="goToAuthorProfile(topic.author.userId)"
            >
              <image
                v-if="topic.author.avatar && !isImageFailed(`avatar-${topic.id}`)"
                class="topic-card__avatar-img"
                :src="resolveMediaUrl(topic.author.avatar)"
                mode="aspectFill"
                lazy-load alt=""
                @error="onImageError(`avatar-${topic.id}`)"
              />
              <text v-else class="topic-card__avatar-char">{{ initialOf(topic.author.name) }}</text>
            </view>
            <text class="topic-card__name">{{ topic.author.name }}</text>
          </view>
          <view class="topic-card__meta">
            <image class="topic-card__reply-icon" :src="chatIcon" mode="aspectFit" alt="" />
            <text class="topic-card__replies">{{ topic.replyCount }}</text>
            <text class="topic-card__time">{{ formatCircleTime(topic.createdAt) }}</text>
          </view>
        </view>
        <view class="topic-card__meet press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('circle.meetAuthor')" @tap.stop="meetAuthor(topic.author.userId)">
          <text class="topic-card__meet-text">{{ t('circle.meetAuthor') }}</text>
        </view>
      </view>

      <!-- 成员 Tab（v3 Nearby 冻结：成员数 + 圈内活跃作者，无成员列表接口） -->
      <view v-if="detailTab === 'members'" class="detail-members">
        <text class="detail-members__count">{{ t('circle.detailMembers', { n: circle?.memberCount ?? 0 }) }}</text>
        <view class="detail-members__avatars">
          <view v-for="author in memberAvatars" :key="author.userId" class="detail-members__avatar">
            <text class="detail-members__avatar-char">{{ initialOf(author.name) }}</text>
            <text class="detail-members__avatar-name">{{ author.name }}</text>
          </view>
          <view v-if="memberAvatars.length === 0" class="detail-members__empty">
            <text class="detail-members__empty-text">{{ t('circle.detailMembersEmpty') }}</text>
          </view>
        </view>
      </view>

      <!-- 活动 Tab（v3 Nearby 冻结：复用活动列表） -->
      <view v-if="detailTab === 'activities'" class="detail-activities">
        <view v-for="act in activityStore.activities.slice(0, 5)" :key="act.id" class="detail-activity press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="act.title" @tap="goToActivityDetail(act.id)">
          <text class="detail-activity__title">{{ act.title }}</text>
          <text class="detail-activity__meta">{{ act.location || act.scheduleText }}</text>
          <text class="detail-activity__arrow">›</text>
        </view>
        <view v-if="activityStore.activities.length === 0" class="detail-activities__empty">
          <text class="detail-activities__empty-text">{{ t('circle.detailActivitiesEmpty') }}</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="isLoadingMore" class="load-more" role="status" aria-live="polite">
<!-- 加载更多 -->
        <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('circle.topicsLoadingAria')" />
        <text class="load-more__text">{{ t("circle.topicsLoadMoreLoading") }}</text>
      </view>
      <view v-else-if="!topicHasMore && currentTopics.length > 0" class="load-more">
        <text class="load-more__text">{{ t("circle.topicsLoadMoreEnd") }}</text>
      </view>

      <!-- 底部留白 -->
      <view class="feed-bottom-spacer" />
    </scroll-view>

    <!-- 浮动发帖按钮 (FAB) -->
    <view class="fab press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goToPostTopic">
      <text class="fab__icon">+</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.topics-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: linear-gradient(180deg, var(--c-bg-brand) 0%, var(--c-bg-page) 20%);
  overflow: hidden;
}

/* ========== 顶部导航栏 ========== */
.topics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + var(--sp-6)) var(--sp-8) var(--sp-6);
  background: var(--c-gradient-brand);
  z-index: 10;
}

.topics-header__back {
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-full);
  background: var(--c-overlay-white-bg-mid-strong, var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.25)));
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.topics-header__back:active {
  transform: scale(0.96);
  background: var(--c-overlay-white-bg-stronger, var(--c-overlay-white-bg-stronger, rgba(255, 255, 255, 0.4)));
}
/* #endif */

.back-icon {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 500;
}

.topics-header__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-neutral-0);
}

.topics-header__spacer {
  min-width: 80rpx;
}

/* ===== 2026-08-21 置顶规则条 ===== */
.topic-rule {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 20rpx;
  border-radius: 16rpx;
  background: var(--c-bg-brand, #E8FAF3);
  border: 1rpx solid #B8EDDA;
}

.topic-rule__pin {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: var(--c-brand, #36C99A);
  color: var(--c-text-inverse, #FFFFFF);
  font-size: 20rpx;
  font-weight: 700;
}

.topic-rule__text {
  flex: 1;
  font-size: 24rpx;
  color: var(--c-brand-700, #1F8D6A);
  min-width: 0;
}

.topic-rule__arrow {
  font-size: 30rpx;
  color: var(--c-brand, #36C99A);
  flex-shrink: 0;
}

/* ========== 加载/错误/空状态 ========== */
.topics-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
  padding: 80rpx 40rpx;
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid var(--c-border-default);
  border-top-color: var(--c-brand-500);
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: var(--fs-3xl);
  opacity: 0.6;
  color: var(--c-text-tertiary);
}

.topics-state__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
  text-align: center;
}

.topics-state__btn {
  padding: 18rpx 48rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  box-shadow: var(--s-brand);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.topics-state__btn:active {
  transform: scale(0.96);
}
/* #endif */

.topics-state__btn-text {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 600;
}

.topics-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: 120rpx 40rpx;
}

.topics-empty__icon {
  width: 88rpx;
  height: 88rpx;
  opacity: 0.6;
  color: var(--c-text-tertiary);
}

.topics-empty__title {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.topics-empty__desc {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

/* ========== 话题列表 ========== */
.topics-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-5) 0;
}

.topic-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  margin: var(--sp-3) var(--sp-6);
  padding: var(--sp-7);
  background: var(--c-neutral-0);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.topic-card:active {
  transform: scale(0.98);
  box-shadow: var(--s-md);
}
/* #endif */

.topic-card__title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-card__content {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 3.2em;
  /* #endif */
}

.topic-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--sp-4);
  border-top: 1rpx solid var(--c-border-default);
}

.topic-card__author {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.topic-card__avatar {
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.topic-card__avatar-img {
  width: 100%;
  height: 100%;
}

.topic-card__avatar-char {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-brand-500);
}

.topic-card__name {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.topic-card__meta {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.topic-card__reply-icon {
  width: 24rpx;
  height: 24rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.topic-card__replies {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.topic-card__time {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* ========== 加载更多 ========== */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-8) 0;
}

.load-more__text {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

.feed-bottom-spacer {
  height: 180rpx;
}

/* ========== 浮动发帖按钮 ========== */
.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(env(safe-area-inset-bottom) + 150rpx);
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-gradient-float-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-float-btn);
  z-index: 99;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.fab:active {
  transform: scale(0.92);
  box-shadow: var(--s-brand-md);
}
/* #endif */

.fab__icon {
  font-size: var(--fs-6xl);
  color: var(--c-neutral-0);
  font-weight: 300;
  line-height: 1;
  margin-top: -4rpx;
}

/* ========== v3 Nearby 冻结：兴趣圈详情头部 + 四 Tab ========== */
.circle-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 32rpx 24rpx;
  margin: 0 0 20rpx;
  border-radius: 20rpx;
  overflow: hidden;
  background: var(--c-text-primary, #2A3A34);
}

.circle-hero__bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  filter: blur(2rpx);
  opacity: 0.55;
}

.circle-hero__bg-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(20,30,26,0.35) 0%, rgba(20,30,26,0.75) 100%);
}

.circle-hero__icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.22);
  flex-shrink: 0;
  position: relative;
}

.circle-hero__emoji {
  font-size: 48rpx;
}

.circle-hero__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.circle-hero__name {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--c-text-inverse, #FFFFFF);
}

.circle-hero__meta {
  font-size: 22rpx;
  color: rgba(255,255,255,0.85);
}

.circle-hero__desc {
  font-size: 22rpx;
  color: rgba(255,255,255,0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.circle-hero__join {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #36C99A 0%, #36C99A 100%);
}

.circle-hero__join--joined {
  background: var(--c-bg-container, #FFFFFF);
  border: 2rpx solid var(--c-line-strong, #DCE5E2);
}

.circle-hero__join-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

.circle-hero__join--joined .circle-hero__join-text {
  color: var(--c-text-secondary, #666666);
}

.circle-tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.circle-tab {
  position: relative;
  flex: 1;
  padding: 14rpx 0 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-tab--active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: var(--c-brand-500, #36C99A);
}

.circle-tab__text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-secondary, #666666);
}

.circle-tab--active .circle-tab__text {
  color: var(--c-brand-600, #36C99A);
}

.topic-card__meet {
  display: inline-flex;
  margin-top: 14rpx;
  padding: 10rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #FF8DB7 0%, #FF6B81 100%);
}

.topic-card__meet-text {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

.detail-members {
  padding: 8rpx 4rpx;
}

.detail-members__count {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
  margin-bottom: 20rpx;
}

.detail-members__avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.detail-members__avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  width: 120rpx;
}

.detail-members__avatar-char {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-brand-100, #D1F5E7);
  color: var(--c-brand-700, #2AAE83);
  font-size: 32rpx;
  font-weight: 800;
}

.detail-members__avatar-name {
  font-size: 20rpx;
  color: var(--c-text-secondary, #666666);
}

.detail-members__empty {
  padding: 40rpx 0;
}

.detail-members__empty-text,
.detail-activities__empty-text {
  font-size: 24rpx;
  color: var(--c-text-tertiary, #666666);
}

.detail-activities {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.detail-activity {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
}

.detail-activity__title {
  flex: 1;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-activity__meta {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.detail-activity__arrow {
  font-size: 28rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}
.circle-hero__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.circle-hero__hot {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #FF6B81 0%, #FF9F43 100%);
  color: var(--c-text-inverse, #FFFFFF);
  font-size: 20rpx;
  font-weight: 700;
  line-height: 1.5;
  flex-shrink: 0;
}

</style>





