<script setup lang="ts">
/**
 * 兴趣圈话题列表页
 * 展示指定兴趣圈下的话题列表，支持下拉刷新和加载更多
 */
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCircleStore, formatCircleTime } from "../../stores/circle";
import { openAppPath } from "../../utils/navigation";
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

/**
 * 返回上一页
 */
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
      <!-- 空状态 -->
      <EmptyState
        v-if="currentTopics.length === 0"
        type="no-data"
        :image="chatIcon"
        :title="t('circle.topicsEmptyTitle')"
        :description="t('circle.topicsEmptyDesc')"
        :action-text="t('circle.topicsEmptyAction')"
        @action="goToPostTopic"
      />

      <!-- 话题卡片 -->
      <view
        v-for="topic in currentTopics" :key="topic.id"
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
</style>
