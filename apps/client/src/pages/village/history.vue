<script setup lang="ts">
/**
 * 浏览记录页（2026-08-08 论坛互动真实化）
 *
 * 展示当前用户的帖子浏览历史（按最近浏览时间倒序）：
 * - 数据源：villageStore.fetchPostHistory（real 走 GET /api/v1/posts/history，mock 走内置数据）
 * - 交互：下拉刷新 / 上拉加载更多 / 清空记录（确认弹窗）/ 点击卡片进详情 / 点头像进主页
 */
import { ref, onUnmounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { openAppPath } from "../../utils/navigation";
import { resolveMediaUrl } from "../../utils/media";
import {
  useVillageStore,
  formatRelativeTime,
  type PostHistoryItem,
} from "../../stores/village";
import EmptyState from "../../components/common/EmptyState.vue";

const villageStore = useVillageStore();
const { t } = useI18n();
const { historyPosts, loadingHistory } = storeToRefs(villageStore);

/**
 * R4-00090：昵称首字符兜底（author.name 为空/null 时返回占位符，
 * 避免 name[0] 抛 TypeError 崩溃渲染）。
 */
function initialOf(name?: string | null): string {
  return name && name.length > 0 ? name.charAt(0) : "?";
}

/** 上拉加载中 */
const isLoadingMore = ref(false);
/** 是否还有更多（浏览记录无分页计数，按当前列表与总览近似判断） */
const hasMore = ref(true);
/** 清空确认弹窗 */
const showClearDialog = ref(false);
const clearing = ref(false);

/** 图片加载失败 key 集合 */
const failedImageKeys = ref<Set<string>>(new Set());

function isImageFailed(key: string): boolean {
  return failedImageKeys.value.has(key);
}

function onImageError(key: string): void {
  const next = new Set(failedImageKeys.value);
  next.add(key);
  failedImageKeys.value = next;
}

/** 首次加载 / 下拉刷新 */
async function loadHistory(reset = true): Promise<void> {
  await villageStore.fetchPostHistory(reset);
}

function onRefresh(): void {
  void loadHistory(true);
}

/** 上拉加载更多（加载下一页追加） */
async function onLoadMore(): Promise<void> {
  if (isLoadingMore.value || loadingHistory.value || !hasMore.value) return;
  isLoadingMore.value = true;
  try {
    const before = historyPosts.value.length;
    await villageStore.fetchPostHistory(false);
    hasMore.value = historyPosts.value.length > before;
  } catch (_e) {
    hasMore.value = false;
  } finally {
    isLoadingMore.value = false;
  }
}

/** 清空记录（确认后调用后端 DELETE /api/v1/posts/history） */
async function handleClear(): Promise<void> {
  if (clearing.value) return;
  clearing.value = true;
  try {
    await villageStore.clearPostHistory();
    showClearDialog.value = false;
    uni.showToast({ title: t("village.history.cleared"), icon: "none" });
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : t("village.history.clearFailed"),
      icon: "none",
    });
  } finally {
    clearing.value = false;
  }
}

/** 点击卡片进入帖子详情 */
function goToDetail(item: PostHistoryItem): void {
  villageStore.setCurrentPost(item.post.id);
  openAppPath("/pages/village/detail");
}

/** 点击头像进入用户主页 */
function goToUserProfile(userId: string | undefined): void {
  if (!userId) return;
  openAppPath(`/pages/profile/index?userId=${userId}`);
}

onLoad(() => {
  void loadHistory(true);
});

onShow(() => {
  // 从详情页返回时浏览记录可能已新增（详情页浏览埋点），静默刷新列表
  void loadHistory(true);
});

onUnmounted(() => {
  villageStore.dispose();
});
</script>

<template>
  <view class="history-page">
    <!-- 顶部操作栏 -->
    <view v-if="historyPosts.length > 0" class="history-toolbar">
      <text class="history-count">{{ t("village.history.count", { n: historyPosts.length }) }}</text>
      <view
        class="history-clear press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('village.history.clear')"
        @tap="showClearDialog = true"
      >
        <text class="history-clear__text">{{ t("village.history.clear") }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loadingHistory && historyPosts.length === 0" class="history-loading" role="status" aria-live="polite">
      <view class="loading-spinner" />
      <text class="history-loading__text">{{ t("common.loading") }}</text>
    </view>

    <!-- 浏览记录列表 -->
    <scroll-view
      v-else-if="historyPosts.length > 0"
      class="history-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="false"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view
        v-for="item in historyPosts" :key="item.post.id"
        class="history-item list-item press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="goToDetail(item)"
      >
        <!-- 作者头像（点击进主页） -->
        <view
          class="history-item__avatar"
          @tap.stop="goToUserProfile(item.post.author.userId)"
        >
          <image
            v-if="item.post.author.avatar && !isImageFailed(item.post.id)"
            class="history-item__avatar-img"
            :src="resolveMediaUrl(item.post.author.avatar)"
            mode="aspectFill" lazy-load alt=""
            @error="onImageError(item.post.id)"
          />
          <text v-else class="history-item__avatar-text">{{ initialOf(item.post.author.name) }}</text>
        </view>

        <!-- 帖子摘要 -->
        <view class="history-item__body">
          <view class="history-item__header">
            <text class="history-item__author">{{ item.post.author.name }}</text>
            <text class="history-item__time">{{ formatRelativeTime(item.viewedAt) }}</text>
          </view>
          <text class="history-item__title">{{ item.post.title || t("village.history.untitled") }}</text>
          <text class="history-item__summary">{{ item.post.content }}</text>
          <view class="history-item__stats">
            <text class="history-item__stat">{{ t("village.history.likes", { n: item.post.likes }) }}</text>
            <text class="history-item__stat">{{ t("village.history.favorites", { n: item.post.favorites }) }}</text>
            <text class="history-item__stat">{{ t("village.history.views", { n: item.post.views }) }}</text>
            <text v-if="item.post.comments > 0" class="history-item__stat">{{ t("village.history.comments", { n: item.post.comments }) }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="isLoadingMore" class="history-load-more">
        <view class="loading-spinner" />
        <text class="history-load-more__text">{{ t("common.loading") }}</text>
      </view>
      <view v-else-if="!hasMore" class="history-load-more">
        <text class="history-load-more__text">{{ t("village.noMorePosts") }}</text>
      </view>
      <view class="history-bottom-spacer" />
    </scroll-view>

    <!-- 空状态 -->
    <EmptyState
      v-else
      :title="t('village.history.empty')"
      :action-text="t('village.history.backToVillage')"
      type="no-data"
      @action="openAppPath('/pages/village/index')"
    />

    <!-- 清空确认弹窗 -->
    <view v-if="showClearDialog" class="clear-dialog-mask" @tap.self="showClearDialog = false">
      <view class="clear-dialog">
        <text class="clear-dialog__title">{{ t("village.history.clearTitle") }}</text>
        <text class="clear-dialog__desc">{{ t("village.history.clearDesc") }}</text>
        <view class="clear-dialog__actions">
          <view
            class="clear-dialog__btn clear-dialog__btn--cancel press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="showClearDialog = false"
          >
            <text>{{ t("common.cancel") }}</text>
          </view>
          <view
            class="clear-dialog__btn clear-dialog__btn--confirm press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('village.history.clear')"
            @tap="handleClear"
          >
            <text>{{ clearing ? t("common.loading") : t("village.history.clear") }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.history-page {
  min-height: 100vh;
  background: var(--page-bg, #f5f6fa);
}

/* 顶部操作栏 */
.history-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: var(--c-bg-container);
}

.history-count {
  font-size: 24rpx;
  color: var(--c-text-secondary);
}

.history-clear {
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
  background: var(--c-romance-bg-tint);
}

.history-clear__text {
  font-size: 24rpx;
  color: var(--c-romance-500);
}

/* 加载状态 */
.history-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 240rpx;
}

.history-loading__text {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: var(--c-text-secondary);
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid var(--c-neutral-100);
  border-top-color: var(--c-romance-500);
  border-radius: 50%;
  animation: history-spin 0.8s linear infinite;
}

@keyframes history-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 列表 */
.history-list {
  height: calc(100vh - 88rpx);
}

.history-item {
  display: flex;
  gap: 20rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
  background: var(--c-bg-container);
}

.history-item__avatar {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  overflow: hidden;
  background: var(--c-bg-surface);
}

.history-item__avatar-img {
  width: 100%;
  height: 100%;
}

.history-item__avatar-text {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 36rpx;
  color: var(--c-text-inverse);
  background: linear-gradient(135deg, #ff9a9e, #ff4d6d);
}

.history-item__body {
  flex: 1;
  min-width: 0;
}

.history-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-item__author {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--c-text-primary);
}

.history-item__time {
  font-size: 22rpx;
  color: var(--c-text-secondary);
}

.history-item__title {
  display: block;
  margin-top: 8rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-text-primary);
}

.history-item__summary {
  display: -webkit-box;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--c-text-secondary);
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.history-item__stats {
  display: flex;
  gap: 24rpx;
  margin-top: 12rpx;
}

.history-item__stat {
  font-size: 22rpx;
  color: var(--text-tertiary, #bbb);
}

/* 加载更多 */
.history-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
}

.history-load-more__text {
  font-size: 24rpx;
  color: var(--text-tertiary, #bbb);
}

.history-bottom-spacer {
  height: 40rpx;
}

/* 清空确认弹窗 */
.clear-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-overlay);
}

.clear-dialog {
  width: 560rpx;
  padding: 40rpx 36rpx;
  border-radius: 24rpx;
  background: var(--c-bg-container);
}

.clear-dialog__title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  color: var(--c-text-primary);
}

.clear-dialog__desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  text-align: center;
  color: var(--c-text-secondary);
}

.clear-dialog__actions {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}

.clear-dialog__btn {
  flex: 1;
  padding: 20rpx 0;
  border-radius: 16rpx;
  text-align: center;
  font-size: 28rpx;
}

.clear-dialog__btn--cancel {
  background: var(--c-bg-surface);
  color: var(--c-text-secondary);
}

.clear-dialog__btn--confirm {
  background: var(--c-romance-500);
  color: var(--c-text-inverse);
}
</style>
