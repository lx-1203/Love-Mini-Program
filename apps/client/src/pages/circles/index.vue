<script setup lang="ts">
/**
 * 兴趣圈列表页
 * 展示所有兴趣圈，支持加入/退出操作，点击进入话题列表
 */
import { ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useCircleStore } from "../../stores/circle";
import { openAppPath } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";

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
 * 跳转到"附近的人"（寻觅页）快捷入口
 * Task F1 (M-08)：从圈子页快捷发现匹配
 */
function goToDiscover() {
  openAppPath("/pages/discover/index");
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
  } catch (_e) {
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
  <view class="circles-page page-fade-in">
    <!-- 顶部导航栏 -->
    <view class="circles-header">
      <view class="circles-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">‹</text>
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
      <image class="error-icon" :src="IMAGE_PATHS.ICONS_EMOJI.SMILE" mode="aspectFit" />
      <text class="circles-state__text">{{ errorMessage }}</text>
      <view class="circles-state__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="circleStore.fetchCircles()">
        <text class="circles-state__btn-text">重试</text>
      </view>
    </view>

    <!-- 兴趣圈列表 -->
    <scroll-view v-else class="circles-list" scroll-y>
      <!-- 附近的人快捷入口（Task F1 / M-08） -->
      <view class="discover-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goToDiscover">
        <view class="discover-entry__left">
          <view class="discover-entry__icon-wrap">
            <image class="discover-entry__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" />
          </view>
          <view class="discover-entry__text-wrap">
            <text class="discover-entry__title">附近的人</text>
            <text class="discover-entry__desc">发现同频的TA，开启心动匹配</text>
          </view>
        </view>
        <text class="discover-entry__arrow">›</text>
      </view>

      <!-- 推荐提示 -->
      <view class="circles-banner">
        <image class="circles-banner__emoji" :src="IMAGE_PATHS.ICONS_EMOJI.SPARKLES" mode="aspectFit" />
        <view class="circles-banner__text-wrap">
          <text class="circles-banner__title">发现有趣的圈子</text>
          <text class="circles-banner__desc">加入兴趣圈，结识志同道合的小伙伴</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="circles.length === 0" class="circles-empty">
        <image class="circles-empty__icon" :src="IMAGE_PATHS.ICONS_EMOJI.SEARCH" mode="aspectFit" />
        <text class="circles-empty__title">暂无兴趣圈</text>
        <text class="circles-empty__desc">敬请期待更多兴趣圈上线</text>
      </view>

      <!-- 兴趣圈卡片 -->
      <view class="circles-card-list">
        <view
          v-for="(circle, index) in circles"
          :key="circle.id"
          class="circle-card list-item"
          :style="{ animationDelay: index * 60 + 'ms' }"
          @tap="goToTopics(circle.id)"
        >
          <view class="circle-card__icon-wrap">
            <image class="circle-card__icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" />
          </view>

          <view class="circle-card__body">
            <text class="circle-card__name">{{ circle.name }}</text>
            <text class="circle-card__desc">{{ circle.description }}</text>
            <view class="circle-card__meta">
              <image class="circle-card__meta-icon" :src="IMAGE_PATHS.ICONS_EMOJI.GROUP" mode="aspectFit" />
              <text class="circle-card__count">{{ formatMemberCount(circle.memberCount) }} 成员</text>
              <text class="circle-card__divider">·</text>
              <image class="circle-card__meta-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" />
              <text class="circle-card__count">{{ circle.topicCount }} 话题</text>
            </view>
          </view>

          <view
            class="circle-card__action"
            :class="{ 'circle-card__action--joined': circle.isJoined }"
            @tap.stop="toggleJoin(circle.id, circle.isJoined)"
          >
            <text class="circle-card__action-text">
              {{ circle.isJoined ? "已加入" : "+ 加入" }}
            </text>
          </view>
        </view>
      </view>

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
  background: linear-gradient(180deg, var(--c-neutral-50) 0%, var(--c-bg-surface) 100%);
}

/* ========== 顶部导航栏 ========== */
.circles-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + var(--sp-4)) var(--sp-8) var(--sp-5);
  background: linear-gradient(180deg, var(--c-neutral-0) 0%, rgba(255, 255, 255, 0.98) 100%);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--s-sm);
}

.circles-header__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--c-neutral-50);
}

.back-icon {
  font-size: var(--fs-4xl);
  color: var(--c-text-primary);
  font-weight: 300;
  line-height: 1;
  margin-top: -4rpx;
}

.circles-header__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.circles-header__spacer {
  width: 64rpx;
}

/* ========== 加载/错误/空状态 ========== */
.circles-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
  padding: 80rpx 40rpx;
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid var(--c-border-default);
  border-top-color: var(--c-brand-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: var(--fs-3xl);
  opacity: 0.6;
  color: var(--c-text-tertiary);
}

.circles-state__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
  text-align: center;
}

.circles-state__btn {
  padding: var(--sp-4) 48rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  box-shadow: var(--s-brand-md);
}

.circles-state__btn-text {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 600;
}

.circles-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: 120rpx 40rpx;
}

.circles-empty__icon {
  width: 88rpx;
  height: 88rpx;
  opacity: 0.6;
  color: var(--c-text-tertiary);
}

.circles-empty__title {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.circles-empty__desc {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

/* ========== 附近的人快捷入口（Task F1 / M-08 · F1.4 补充样式） ========== */
.discover-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: var(--sp-5) var(--sp-6) 0;
  padding: var(--sp-5) var(--sp-6);
  background: var(--c-gradient-brand);
  border-radius: var(--r-xl);
  box-shadow: var(--s-brand);
  animation: card-slide-up 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.discover-entry__left {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex: 1;
  min-width: 0;
}

.discover-entry__icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.discover-entry__icon {
  width: 48rpx;
  height: 48rpx;
  color: var(--c-neutral-0);
}

.discover-entry__text-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  flex: 1;
  min-width: 0;
}

.discover-entry__title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-neutral-0);
}

.discover-entry__desc {
  font-size: var(--fs-sm);
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discover-entry__arrow {
  font-size: var(--fs-4xl);
  color: var(--c-neutral-0);
  font-weight: 300;
  line-height: 1;
  flex-shrink: 0;
  margin-left: var(--sp-2);
}

/* ========== 推荐 Banner ========== */
.circles-banner {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  margin: var(--sp-6) var(--sp-6) 0;
  padding: var(--sp-7);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  border-radius: var(--r-lg);
  animation: card-slide-up 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.circles-banner__emoji {
  width: 56rpx;
  height: 56rpx;
  color: var(--c-brand-500);
  flex-shrink: 0;
}

.circles-banner__text-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.circles-banner__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.circles-banner__desc {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== 兴趣圈列表 ========== */
.circles-list {
  flex: 1;
  overflow-y: auto;
}

.circles-card-list {
  padding: var(--sp-5) var(--sp-6) 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

@keyframes card-slide-up {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.circle-card {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-6) var(--sp-7);
  background: var(--c-neutral-0);
  border-radius: var(--r-lg);
  box-shadow: var(--s-card-soft);
  animation: card-slide-up 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transition: transform 200ms ease;
}

.circle-card:active {
  transform: scale(0.98);
}

.circle-card__icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-md);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.circle-card__icon {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-brand-500);
}

.circle-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.circle-card__name {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.circle-card__desc {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.circle-card__meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.circle-card__meta-icon {
  width: 24rpx;
  height: 24rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.circle-card__count {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.circle-card__divider {
  font-size: var(--fs-sm);
  color: var(--c-border-default);
}

.circle-card__action {
  padding: var(--sp-3) var(--sp-7);
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  flex-shrink: 0;
  box-shadow: var(--s-brand-md);
  transition: all 200ms ease;
}

.circle-card__action:active {
  transform: scale(0.95);
}

.circle-card__action--joined {
  background: var(--c-neutral-50);
  box-shadow: none;
  border: 2rpx solid var(--c-border-default);
}

.circle-card__action-text {
  font-size: var(--fs-md);
  color: var(--c-neutral-0);
  font-weight: 600;
  white-space: nowrap;
}

.circle-card__action--joined .circle-card__action-text {
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.list-bottom-spacer {
  height: 60rpx;
}
</style>
