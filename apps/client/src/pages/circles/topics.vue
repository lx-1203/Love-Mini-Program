<script setup lang="ts">
/**
 * 兴趣圈话题列表页
 * 展示指定兴趣圈下的话题列表，支持下拉刷新和加载更多
 */
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useCircleStore, formatCircleTime } from "../../stores/circle";
import { openAppPath } from "../../utils/navigation";

const circleStore = useCircleStore();
const { currentTopics, loading, errorMessage, topicHasMore } = storeToRefs(circleStore);

/** 当前兴趣圈 ID（从页面参数获取） */
const circleId = ref("");
/** 当前兴趣圈名称 */
const circleName = ref("");
/** 下拉刷新中 */
const isRefreshing = ref(false);
/** 加载更多中 */
const isLoadingMore = ref(false);

/**
 * 页面加载时获取参数
 */
function onLoad(query: Record<string, string>) {
  circleId.value = query.circleId || "";
  circleName.value = decodeURIComponent(query.circleName || "");
}

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

onMounted(() => {
  // uni-app 页面通过 onLoad 获取参数，这里用兼容方式
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as { options?: Record<string, string> })?.options ?? {};
  onLoad(options);

  if (circleId.value) {
    // 从兴趣圈列表中获取名称
    const circle = circleStore.circles.find((c) => c.id === circleId.value);
    if (circle) {
      circleName.value = circle.name;
    }
    void circleStore.fetchTopics(circleId.value, 1);
  }
});
</script>

<template>
  <view class="topics-page">
    <!-- 顶部导航栏 -->
    <view class="topics-header">
      <view class="topics-header__back" @tap="goBack">
        <text class="back-icon">返回</text>
      </view>
      <text class="topics-header__title">{{ circleName || '话题列表' }}</text>
      <view class="topics-header__spacer" />
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && currentTopics.length === 0" class="topics-state">
      <view class="loading-spinner" />
      <text class="topics-state__text">正在加载话题...</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="errorMessage && currentTopics.length === 0" class="topics-state">
      <text class="topics-state__icon">😥</text>
      <text class="topics-state__text">{{ errorMessage }}</text>
      <view class="topics-state__btn" @tap="onRefresh">
        <text class="topics-state__btn-text">重试</text>
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
      <view v-if="currentTopics.length === 0" class="topics-empty">
        <text class="topics-empty__icon">📝</text>
        <text class="topics-empty__title">暂无话题</text>
        <text class="topics-empty__desc">来发第一个话题吧</text>
      </view>

      <!-- 话题卡片 -->
      <view
        v-for="topic in currentTopics"
        :key="topic.id"
        class="topic-card"
        @tap="goToDetail(topic.id)"
      >
        <!-- 话题标题 -->
        <text class="topic-card__title">{{ topic.title }}</text>

        <!-- 话题内容预览 -->
        <text class="topic-card__content">{{ topic.content }}</text>

        <!-- 底部信息 -->
        <view class="topic-card__footer">
          <view class="topic-card__author">
            <view class="topic-card__avatar">
              <image
                v-if="topic.author.avatar"
                class="topic-card__avatar-img"
                :src="topic.author.avatar"
                mode="aspectFill"
              />
              <text v-else class="topic-card__avatar-char">{{ topic.author.name[0] }}</text>
            </view>
            <text class="topic-card__name">{{ topic.author.name }}</text>
          </view>
          <view class="topic-card__meta">
            <text class="topic-card__replies">💬 {{ topic.replyCount }}</text>
            <text class="topic-card__time">{{ formatCircleTime(topic.createdAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="isLoadingMore" class="load-more">
        <view class="loading-spinner" />
        <text class="load-more__text">加载中...</text>
      </view>
      <view v-else-if="!topicHasMore && currentTopics.length > 0" class="load-more">
        <text class="load-more__text">— 没有更多了 —</text>
      </view>

      <!-- 底部留白 -->
      <view class="feed-bottom-spacer" />
    </scroll-view>

    <!-- 浮动发帖按钮 (FAB) -->
    <view class="fab" @tap="goToPostTopic">
      <text class="fab__icon">+</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.topics-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
  overflow: hidden;
}

/* ========== 顶部导航栏 ========== */
.topics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: var(--td-bg-color-container);
  border-bottom: 1rpx solid var(--td-border-level-1-color);
  z-index: 10;
}

.topics-header__back {
  padding: 8rpx 0;
  min-width: 80rpx;
}

.back-icon {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
}

.topics-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
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
  gap: 24rpx;
  padding: 80rpx 40rpx;
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid var(--td-border-level-1-color);
  border-top-color: var(--td-brand-color-7);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.topics-state__icon {
  font-size: 80rpx;
}

.topics-state__text {
  font-size: 28rpx;
  color: var(--td-text-color-placeholder);
  text-align: center;
}

.topics-state__btn {
  padding: 16rpx 48rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
}

.topics-state__btn-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

.topics-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 120rpx 40rpx;
}

.topics-empty__icon {
  font-size: 88rpx;
}

.topics-empty__title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.topics-empty__desc {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 话题列表 ========== */
.topics-list {
  flex: 1;
  overflow-y: auto;
}

.topic-card {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin: 12rpx 24rpx;
  padding: 24rpx 28rpx;
  background: var(--td-bg-color-container);
  border-radius: 20rpx;
  box-shadow: var(--td-shadow-1, 0 2rpx 12rpx rgba(0, 0, 0, 0.04));
  transition: transform 120ms ease;
}

.topic-card:active {
  transform: scale(0.99);
}

.topic-card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-card__content {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.topic-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--td-border-level-1-color);
}

.topic-card__author {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.topic-card__avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--td-brand-color-2), var(--td-brand-color-3));
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
  font-size: 20rpx;
  font-weight: 600;
  color: var(--td-brand-color-7);
}

.topic-card__name {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
  font-weight: 500;
}

.topic-card__meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.topic-card__replies {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

.topic-card__time {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 加载更多 ========== */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 32rpx 0;
}

.load-more__text {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

.feed-bottom-spacer {
  height: 180rpx;
}

/* ========== 浮动发帖按钮 ========== */
.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(env(safe-area-inset-bottom) + 120rpx);
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--td-brand-color-7), var(--td-brand-color-5));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 28rpx rgba(29, 78, 216, 0.35);
  z-index: 99;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.fab:active {
  transform: scale(0.92);
  box-shadow: 0 4rpx 16rpx rgba(29, 78, 216, 0.25);
}

.fab__icon {
  font-size: 52rpx;
  color: #ffffff;
  font-weight: 300;
  line-height: 1;
  margin-top: -2rpx;
}
</style>
