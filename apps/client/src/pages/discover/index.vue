<script setup lang="ts">
/**
 * 寻觅页 - 卡片推荐
 * 展示个性化用户卡片推荐，支持滑动浏览
 */
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useDiscoverStore } from "../../stores/discover";
import { useActivityStore } from "../../stores/activity";
import { openAppPath } from "../../utils/navigation";
import CardSwiper from "../../components/discover/CardSwiper.vue";
import type { SwipeDirection } from "../../stores/discover";

const discoverStore = useDiscoverStore();
const { cards, remainingCount, hasMore, loading, errorMessage } = storeToRefs(discoverStore);

const activityStore = useActivityStore();

/**
 * 处理滑动事件
 * @param direction - 滑动方向
 * @param cardId - 卡片 ID
 */
async function handleSwipe(direction: SwipeDirection, cardId: string) {
  try {
    if (direction === "left") {
      await discoverStore.swipeLeft(cardId);
    } else {
      await discoverStore.swipeRight(cardId);
    }
  } catch (error) {
    // 错误已由 store 处理并设置到 errorMessage
    console.error("滑动操作失败:", error);
  }
}

/**
 * 重新加载卡片
 */
async function reloadCards() {
  await discoverStore.fetchCards();
}

onMounted(() => {
  void discoverStore.fetchCards();
  void activityStore.fetchActivities();
});
</script>

<template>
  <view class="discover-page">
    <!-- 页面头部 -->
    <view class="discover-header">
      <text class="discover-header__title">寻觅</text>
      <view class="discover-header__meta">
        <text class="discover-header__count">今日剩余 {{ remainingCount }} 次</text>
      </view>
    </view>

    <!-- 错误提示 -->
    <view v-if="errorMessage" class="error-banner">
      <text class="error-banner__text">{{ errorMessage }}</text>
      <text class="error-banner__retry" @tap="reloadCards">重试</text>
    </view>

    <!-- 加载状态 -->
    <view v-else-if="loading" class="loading-state">
      <view class="loading-state__spinner" />
      <text class="loading-state__text">正在加载推荐...</text>
    </view>

    <!-- 卡片滑动区域 -->
    <CardSwiper
      v-else
      :cards="cards"
      :remaining-count="remainingCount"
      @swipe="handleSwipe"
    />

    <!-- 活动推荐板块：卡片用完后展示 -->
    <view v-if="!loading && !errorMessage && cards.length === 0" class="activity-recommend">
      <view class="activity-recommend__header">
        <text class="activity-recommend__title">发现活动</text>
        <text class="activity-recommend__subtitle">从线下活动开始，轻松认识新朋友</text>
      </view>
      <view class="activity-list">
        <view v-for="item in activityStore.activities.slice(0, 3)" :key="item.id" class="activity-card" @tap="openAppPath('/pages/activities/index')">
          <view class="activity-card__info">
            <text class="activity-card__title">{{ item.title }}</text>
            <text class="activity-card__location">📍 {{ item.location }}</text>
            <text class="activity-card__time">🕐 {{ item.scheduleText }}</text>
          </view>
          <view class="activity-card__arrow">›</view>
        </view>
      </view>
      <view class="activity-recommend__more" @tap="openAppPath('/pages/activities/index')">
        <text class="activity-recommend__more-text">查看更多活动</text>
      </view>
    </view>

    <!-- 底部提示：当卡片即将用完时显示 -->
    <view v-if="hasMore && remainingCount <= 3 && remainingCount > 0" class="limit-hint">
      <text class="limit-hint__text">还剩 {{ remainingCount }} 次机会</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.discover-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
  overflow: hidden;
}

/* ========== 页面头部 ========== */
.discover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  background: linear-gradient(to bottom, var(--td-bg-app-page), transparent);
  z-index: 10;
}

.discover-header__title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.discover-header__meta {
  display: flex;
  align-items: center;
}

.discover-header__count {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  background: var(--td-bg-color-container);
  padding: 8rpx 20rpx;
  border-radius: 999px;
  box-shadow: var(--td-shadow-1);
}

/* ========== 错误提示 ========== */
.error-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin: 24rpx 32rpx;
  padding: 20rpx 24rpx;
  background: rgba(190, 18, 60, 0.08);
  border-radius: var(--td-radius-medium);
}

.error-banner__text {
  font-size: 26rpx;
  color: var(--td-error-color);
}

.error-banner__retry {
  font-size: 26rpx;
  color: var(--td-brand-color-7);
  font-weight: 600;
}

/* ========== 加载状态 ========== */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.loading-state__spinner {
  width: 48rpx;
  height: 48rpx;
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

.loading-state__text {
  font-size: 28rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 活动推荐板块 ========== */
.activity-recommend {
  margin: 24rpx 32rpx;
  padding: 32rpx;
  background-color: var(--td-bg-color-container);
  border-radius: var(--td-radius-large);
  box-shadow: var(--td-shadow-1);
}

.activity-recommend__header {
  margin-bottom: 24rpx;
}

.activity-recommend__title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
  margin-bottom: 8rpx;
}

.activity-recommend__subtitle {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.activity-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--td-border-level-1-color);

  &:last-child {
    border-bottom: none;
  }

  &:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }
}

.activity-card__info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
}

.activity-card__title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.activity-card__location,
.activity-card__time {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.activity-card__arrow {
  font-size: 40rpx;
  color: var(--td-text-color-placeholder);
  margin-left: 16rpx;
  font-weight: 300;
}

.activity-recommend__more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0 8rpx;
}

.activity-recommend__more-text {
  font-size: 26rpx;
  color: var(--td-brand-color-7);
  font-weight: 600;
}

/* ========== 次数提示 ========== */
.limit-hint {
  position: absolute;
  bottom: 200rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 12rpx 24rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 999px;
  z-index: 10;
}

.limit-hint__text {
  font-size: 22rpx;
  color: #ffffff;
}
</style>