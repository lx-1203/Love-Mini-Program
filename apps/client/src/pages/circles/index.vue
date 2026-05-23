<script setup lang="ts">
/**
 * 兴趣圈列表页
 * 展示所有兴趣圈，支持加入/退出操作，点击进入话题列表
 */
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useCircleStore } from "../../stores/circle";
import { openAppPath } from "../../utils/navigation";

const circleStore = useCircleStore();
const { circles, loading, errorMessage } = storeToRefs(circleStore);

/**
 * 点击兴趣圈，跳转到话题列表
 * @param circleId - 兴趣圈 ID
 */
function goToTopics(circleId: string) {
  openAppPath(`/pages/circles/topics?circleId=${circleId}`);
}

/**
 * 加入/退出兴趣圈
 * @param circleId - 兴趣圈 ID
 * @param isJoined - 当前是否已加入
 */
async function toggleJoin(circleId: string, isJoined: boolean) {
  try {
    if (isJoined) {
      await circleStore.leaveCircle(circleId);
    } else {
      await circleStore.joinCircle(circleId);
    }
  } catch {
    // 错误已由 store 处理
  }
}

/**
 * 格式化成员数量
 */
function formatMemberCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

/**
 * 返回上一页
 */
function goBack() {
  uni.navigateBack();
}

onMounted(() => {
  void circleStore.fetchCircles();
});
</script>

<template>
  <view class="circles-page">
    <!-- 顶部导航栏 -->
    <view class="circles-header">
      <view class="circles-header__back" @tap="goBack">
        <text class="back-icon">返回</text>
      </view>
      <text class="circles-header__title">兴趣圈</text>
      <view class="circles-header__spacer" />
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && circles.length === 0" class="circles-state">
      <view class="loading-spinner" />
      <text class="circles-state__text">正在加载...</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="errorMessage && circles.length === 0" class="circles-state">
      <text class="circles-state__icon">😥</text>
      <text class="circles-state__text">{{ errorMessage }}</text>
      <view class="circles-state__btn" @tap="circleStore.fetchCircles()">
        <text class="circles-state__btn-text">重试</text>
      </view>
    </view>

    <!-- 兴趣圈列表 -->
    <scroll-view v-else class="circles-list" scroll-y>
      <!-- 空状态 -->
      <view v-if="circles.length === 0" class="circles-empty">
        <text class="circles-empty__icon">🔍</text>
        <text class="circles-empty__title">暂无兴趣圈</text>
        <text class="circles-empty__desc">敬请期待更多兴趣圈上线</text>
      </view>

      <!-- 兴趣圈卡片 -->
      <view
        v-for="circle in circles"
        :key="circle.id"
        class="circle-card"
        @tap="goToTopics(circle.id)"
      >
        <!-- 左侧图标 -->
        <view class="circle-card__icon-wrap">
          <text class="circle-card__icon">{{ circle.icon }}</text>
        </view>

        <!-- 中间信息 -->
        <view class="circle-card__body">
          <text class="circle-card__name">{{ circle.name }}</text>
          <text class="circle-card__desc">{{ circle.description }}</text>
          <view class="circle-card__meta">
            <text class="circle-card__count">{{ formatMemberCount(circle.memberCount) }} 成员</text>
            <text class="circle-card__divider">·</text>
            <text class="circle-card__count">{{ circle.topicCount }} 话题</text>
          </view>
        </view>

        <!-- 右侧加入按钮 -->
        <view
          class="circle-card__action"
          :class="{ 'circle-card__action--joined': circle.isJoined }"
          @tap.stop="toggleJoin(circle.id, circle.isJoined)"
        >
          <text class="circle-card__action-text">
            {{ circle.isJoined ? "已加入" : "加入" }}
          </text>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="list-bottom-spacer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.circles-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
}

/* ========== 顶部导航栏 ========== */
.circles-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: var(--td-bg-color-container);
  border-bottom: 1rpx solid var(--td-border-level-1-color);
  z-index: 10;
}

.circles-header__back {
  padding: 8rpx 0;
  min-width: 80rpx;
}

.back-icon {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
}

.circles-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.circles-header__spacer {
  min-width: 80rpx;
}

/* ========== 加载/错误/空状态 ========== */
.circles-state {
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

.circles-state__icon {
  font-size: 80rpx;
}

.circles-state__text {
  font-size: 28rpx;
  color: var(--td-text-color-placeholder);
  text-align: center;
}

.circles-state__btn {
  padding: 16rpx 48rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
}

.circles-state__btn-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

.circles-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 120rpx 40rpx;
}

.circles-empty__icon {
  font-size: 88rpx;
}

.circles-empty__title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.circles-empty__desc {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 兴趣圈列表 ========== */
.circles-list {
  flex: 1;
  overflow-y: auto;
}

.circle-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 12rpx 24rpx;
  padding: 24rpx 28rpx;
  background: var(--td-bg-color-container);
  border-radius: 20rpx;
  box-shadow: var(--td-shadow-1, 0 2rpx 12rpx rgba(0, 0, 0, 0.04));
  transition: transform 120ms ease;
}

.circle-card:active {
  transform: scale(0.99);
}

/* 图标 */
.circle-card__icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: var(--td-bg-app-page);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.circle-card__icon {
  font-size: 44rpx;
  line-height: 1;
}

/* 信息区 */
.circle-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.circle-card__name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.circle-card__desc {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.circle-card__meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.circle-card__count {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

.circle-card__divider {
  font-size: 22rpx;
  color: var(--td-border-level-1-color);
}

/* 加入按钮 */
.circle-card__action {
  padding: 12rpx 28rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  flex-shrink: 0;
}

.circle-card__action--joined {
  background: var(--td-bg-color-surface);
  border: 1rpx solid var(--td-border-level-1-color);
}

.circle-card__action-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 500;
  white-space: nowrap;
}

.circle-card__action--joined .circle-card__action-text {
  color: var(--td-text-color-placeholder);
}

.list-bottom-spacer {
  height: 40rpx;
}
</style>
