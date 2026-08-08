<script setup lang="ts">
/**
 * 历史推荐页 - 今日已看卡片列表
 * 展示今日已浏览的所有推荐卡片，支持挽回已拒绝的卡片。
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useDiscoverStore } from "../../stores/discover";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
import EmptyState from "../../components/common/EmptyState.vue";
// infra R2-00069: 统一错误分类 toast
import { showErrorToast } from "../../utils/error-toast";

const { t } = useI18n();
const discoverStore = useDiscoverStore();

/** 历史记录（今日已看过的所有卡片） */
const historyCards = computed(() => discoverStore.historyCards);

/** 已拒绝的卡片 */
const passedCards = computed(() => discoverStore.passedCards);

/** 今日是否已使用挽回 */
const hasRewoundToday = computed(() => discoverStore.hasRewoundToday);

const pageVisible = ref(false);
/** 页面进入动画定时器引用，用于卸载时清理 */
let pageEnterTimer: ReturnType<typeof setTimeout> | null = null;
onShow(() => {
  pageVisible.value = false;
  if (pageEnterTimer) clearTimeout(pageEnterTimer);
  pageEnterTimer = setTimeout(() => {
    pageVisible.value = true;
    pageEnterTimer = null;
  }, 30);
});

/**
 * 重试加载：清空 errorMessage 后重新拉取推荐卡片。
 * 修复（P1 BUG）：原实现无重试入口，用户在网络错误后只能手动刷新页面。
 */
function handleRetry() {
  void discoverStore.fetchCards();
}

/**
 * 获取卡片详情。
 * 从 discover store 的 cards 列表和 viewedCards 记录中查找对应的卡片信息。
 */
function getCardDetail(cardId: string) {
  // 优先从当前卡片列表中查找
  const currentCard = discoverStore.cards.find((c) => c.id === cardId);
  if (currentCard) {
    return currentCard;
  }

  // 从 viewedCards 中查找记录
  const viewedRecord = discoverStore.viewedCards.find((v) => v.cardId === cardId);
  if (viewedRecord) {
    // 修复（R4-00012）：swipe 时已持久化完整卡片快照（昵称/头像/简介等），
    // 优先返回快照，避免历史记录页展示"默认昵称"+空头像的占位数据；
    // 仅快照缺失（旧版本数据或外部写入）时回退到占位对象。
    if (viewedRecord.card) {
      return viewedRecord.card;
    }
    return {
      id: viewedRecord.cardId,
      userId: viewedRecord.userId,
      name: t("discoverHistory.defaultUserName"),
      avatar: "",
      headline: "",
      bio: "",
      tags: [] as string[],
      commonGround: "",
      availability: "",
      images: [] as string[],
    };
  }

  return null;
}

/** 判断是否为最后一张已拒绝卡片（只有最后一张可挽回） */
function isLastPassedCard(cardId: string): boolean {
  const lastPassed = passedCards.value[passedCards.value.length - 1];
  return lastPassed?.cardId === cardId;
}

/** 挽回卡片 */
async function handleRewind(cardId: string) {
  try {
    await discoverStore.rewindCard(cardId);
    uni.showToast({
      title: t("discoverHistory.rewindSuccess"),
      icon: "success",
    });
    // P1-36：页面栈深度为 1（直开链接进入本页）时无法 navigateBack，
    // 改用 switchTab 返回寻觅页；否则正常返回上一页
    if (getCurrentPages().length <= 1) {
      uni.switchTab({ url: "/pages/discover/index" });
    } else {
      uni.navigateBack();
    }
  } catch (error) {
    // infra R2-00069: 不直接展示 store 原始 message（可能含技术细节），按错误分类映射友好文案
    showErrorToast(error, t("discoverHistory.rewindFailed"));
  }
}

/** 返回上一页 */
function goBack() {
  uni.navigateBack();
}

onMounted(() => {
  // 确保历史记录已同步
  discoverStore.syncHistoryCards();
});

/**
 * 页面卸载时清理页面进入动画定时器，避免内存泄漏。
 */
onUnmounted(() => {
  if (pageEnterTimer) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
  }
});
</script>

<template>
  <view class="history-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="back-btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="page-title">{{ $t("discoverHistory.navTitle") }}</text>
      <view class="header-placeholder" />
    </view>

    <!-- 统计信息 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-num">{{ historyCards.length }}</text>
        <text class="stat-label">{{ $t("discoverHistory.statViewed") }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ historyCards.filter((c) => c.direction === "right").length }}</text>
        <text class="stat-label">{{ $t("discoverHistory.statLiked") }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ passedCards.length }}</text>
        <text class="stat-label">{{ $t("discoverHistory.statSkipped") }}</text>
      </view>
    </view>

    <!-- 历史列表 -->
    <view class="history-list" role="list">
      <!-- 加载状态：discover store 正在拉取推荐时展示骨架屏 -->
      <view v-if="discoverStore.loading && historyCards.length === 0" class="history-loading" role="status" aria-live="polite">
        <text class="history-loading__text">{{ $t("discoverHistory.loadingText") }}</text>
      </view>

      <!-- 错误状态：拉取失败时展示错误提示与重试按钮 -->
      <view v-else-if="discoverStore.errorMessage && historyCards.length === 0" class="history-error" role="alert">
        <text class="history-error__text">{{ discoverStore.errorMessage }}</text>
        <view class="history-error__retry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="handleRetry">
          <text class="history-error__retry-text">{{ $t("discoverHistory.retryText") }}</text>
        </view>
      </view>

      <!-- 历史卡片列表（仅在非加载/错误状态展示） -->
      <template v-else>
      <view
        v-for="record in historyCards" :key="record.cardId"
        class="history-card list-item"
      >
        <view class="card-main">
          <SafeImage
            :src="getCardDetail(record.cardId)?.avatar || IMAGE_PATHS.DEFAULT_AVATAR"
            custom-class="card-avatar"
            mode="aspectFill"
            :lazy-load="true"
          />
          <view class="card-info">
            <view class="card-header-row">
              <text class="card-name">{{ getCardDetail(record.cardId)?.name || $t("discoverHistory.unknownUser") }}</text>
              <view
                class="status-badge"
                :class="record.direction === 'right' ? 'status-liked' : 'status-passed'"
              >
                <text class="status-text">
                  {{ record.direction === "right" ? $t("discoverHistory.directionLiked") : $t("discoverHistory.directionSkipped") }}
                </text>
              </view>
            </view>
            <text class="card-headline">{{ getCardDetail(record.cardId)?.headline || "" }}</text>
            <text class="card-bio">{{ getCardDetail(record.cardId)?.bio || "" }}</text>
          </view>
        </view>

        <!-- 挽回按钮：仅对已拒绝的最后一张卡片显示 -->
        <view
          v-if="record.direction === 'left' && isLastPassedCard(record.cardId) && !hasRewoundToday"
          class="rewind-action"
        >
          <button class="rewind-btn" @tap="handleRewind(record.cardId)">
            <text class="rewind-icon">↩</text>
            <text class="rewind-label">{{ $t("discoverHistory.rewindLabel") }}</text>
          </button>
        </view>

        <!-- 已使用挽回提示 -->
        <view
          v-else-if="record.direction === 'left' && isLastPassedCard(record.cardId) && hasRewoundToday"
          class="rewind-hint"
        >
          <text class="hint-text">{{ $t("discoverHistory.rewindUsedUp") }}</text>
        </view>
      </view>
      </template>
    </view>

    <!-- 空状态 -->
    <EmptyState
      v-if="historyCards.length === 0 && !discoverStore.loading && !discoverStore.errorMessage"
      type="no-data"
      :image="IMAGE_PATHS.ICONS_COMMON.NOTIFICATION"
      :title="$t('discoverHistory.emptyTitle')"
      :description="$t('discoverHistory.emptyDesc')"
    />
  </view>
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand);
$green-light: var(--c-brand-50);
$pink-primary: var(--c-romance-500);
$pink-light: var(--c-romance-100);
$white: var(--c-neutral-0);
$bg-page: var(--c-bg-page);
$text-primary: var(--c-text-primary);
$text-secondary: var(--c-neutral-500);
$text-tertiary: var(--c-neutral-400);
$border-light: var(--c-tint-gray-50);
$card-soft-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);

.history-page {
  display: flex;
  flex-direction: column;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
  background: linear-gradient(180deg, var(--c-tint-green-50) 0%, $bg-page 50%);
  padding-bottom: 40rpx;
}

/* ===== 顶部导航 ===== */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 28rpx;
  background: transparent;
}

.back-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $white;
  border-radius: var(--r-circle, 50%);
  box-shadow: 0 4rpx 16rpx var(--c-black-shadow-sm);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.back-btn:active {
  transform: scale(0.92);
}
/* #endif */

.back-icon {
  font-size: var(--fs-3xl, 36rpx);
  color: $green-primary;
  font-weight: 600;
}

.page-title {
  font-size: 38rpx;
  font-weight: 700;
  color: $text-primary;
  // #ifdef H5
  background: linear-gradient(135deg, $green-primary, $pink-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  // #endif
  // #ifndef H5
  color: var(--c-brand); // mp-weixin 降级：使用纯色（取渐变中间色）
  // #endif
}

.header-placeholder {
  width: 72rpx;
}

/* ===== 统计栏 ===== */
.stats-bar {
  display: flex;
  justify-content: space-around;
  padding: 28rpx 32rpx;
  margin: 0 24rpx 28rpx;
  background-color: $white;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: $card-soft-shadow;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-num {
  font-size: var(--fs-5xl, 44rpx);
  font-weight: 800;
  // #ifdef H5
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  // #endif
  // #ifndef H5
  color: var(--c-brand); // mp-weixin 降级：使用纯色（取渐变中间色）
  // #endif
}

.stat-label {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
  font-weight: 500;
}

/* ===== 历史列表 ===== */
.history-list {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.history-card {
  background-color: $white;
  border-radius: var(--r-xl, 24rpx);
  padding: 28rpx;
  box-shadow: $card-soft-shadow;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.history-card:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 20rpx var(--c-black-shadow-sm);
}
/* #endif */

.card-main {
  display: flex;
  align-items: flex-start;
}

.card-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-circle, 50%);
  background-color: $bg-page;
  margin-right: 20rpx;
  flex-shrink: 0;
  border: 4rpx solid $green-light;
}

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.card-name {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: $text-primary;
}

.status-badge {
  padding: 8rpx 18rpx;
  border-radius: var(--r-full, 9999rpx);
}

.status-liked {
  background: linear-gradient(135deg, $pink-light, var(--c-romance-200));
}

.status-liked .status-text {
  color: $pink-primary;
}

.status-passed {
  background-color: $bg-page;
}

.status-passed .status-text {
  color: $text-tertiary;
}

.status-text {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 600;
}

.card-headline {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
  margin-bottom: 8rpx;
}

.card-bio {
  font-size: var(--fs-md, 26rpx);
  color: $text-secondary;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 3.2em;
  /* #endif */
}

/* ===== 挽回操作 ===== */
.rewind-action {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid $border-light;
}

.rewind-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 80rpx;
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  border-radius: var(--r-full, 9999rpx);
  border: none;
  padding: 0;
  margin: 0;
  box-shadow: 0 4rpx 16rpx var(--c-brand-shadow-tint-strong);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.rewind-btn:active {
  transform: scale(0.96);
}
/* #endif */

.rewind-btn::after {
  border: none;
}

.rewind-icon {
  font-size: var(--fs-2xl, 32rpx);
  color: $white;
  margin-right: 10rpx;
}

.rewind-label {
  font-size: var(--fs-lg, 28rpx);
  color: $white;
  font-weight: 600;
}

.rewind-hint {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid $border-light;
  text-align: center;
}

.hint-text {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 140rpx 32rpx;
  text-align: center;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 28rpx;
  opacity: 0.4;
}

.empty-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 12rpx;
}

.empty-subtitle {
  font-size: var(--fs-md, 26rpx);
  color: $text-tertiary;
  line-height: 1.6;
}
</style>
