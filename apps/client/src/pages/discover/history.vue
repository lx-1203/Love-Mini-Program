<script setup lang="ts">
/**
 * 历史推荐页 - 今日已看卡片列表
 * 展示今日已浏览的所有推荐卡片，支持挽回已拒绝的卡片。
 */
import { ref, computed, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useDiscoverStore } from "../../stores/discover";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";

const discoverStore = useDiscoverStore();

/** 历史记录（今日已看过的所有卡片） */
const historyCards = computed(() => discoverStore.historyCards);

/** 已拒绝的卡片 */
const passedCards = computed(() => discoverStore.passedCards);

/** 今日是否已使用挽回 */
const hasRewoundToday = computed(() => discoverStore.hasRewoundToday);

const pageVisible = ref(false);
onShow(() => {
  pageVisible.value = false;
  setTimeout(() => {
    pageVisible.value = true;
  }, 30);
});

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

  // 从 viewedCards 中查找 userId，构建简略信息
  const viewedRecord = discoverStore.viewedCards.find((v) => v.cardId === cardId);
  if (viewedRecord) {
    return {
      id: viewedRecord.cardId,
      userId: viewedRecord.userId,
      name: "用户",
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
      title: "挽回成功",
      icon: "success",
    });
    // 返回寻觅页
    uni.navigateBack();
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : "挽回失败",
      icon: "none",
    });
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
</script>

<template>
  <view class="history-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="back-btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="page-title">今日已看</text>
      <view class="header-placeholder" />
    </view>

    <!-- 统计信息 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-num">{{ historyCards.length }}</text>
        <text class="stat-label">已浏览</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ historyCards.filter((c) => c.direction === "right").length }}</text>
        <text class="stat-label">已喜欢</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ passedCards.length }}</text>
        <text class="stat-label">已跳过</text>
      </view>
    </view>

    <!-- 历史列表 -->
    <view class="history-list">
      <view
        v-for="record in historyCards"
        :key="record.cardId"
        class="history-card list-item"
      >
        <view class="card-main">
          <SafeImage
            :src="getCardDetail(record.cardId)?.avatar || '/static/default-avatar.png'"
            custom-class="card-avatar"
            mode="aspectFill"
          />
          <view class="card-info">
            <view class="card-header-row">
              <text class="card-name">{{ getCardDetail(record.cardId)?.name || "未知用户" }}</text>
              <view
                class="status-badge"
                :class="record.direction === 'right' ? 'status-liked' : 'status-passed'"
              >
                <text class="status-text">
                  {{ record.direction === "right" ? "已喜欢" : "已跳过" }}
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
            <text class="rewind-label">挽回（每日限1次）</text>
          </button>
        </view>

        <!-- 已使用挽回提示 -->
        <view
          v-else-if="record.direction === 'left' && isLastPassedCard(record.cardId) && hasRewoundToday"
          class="rewind-hint"
        >
          <text class="hint-text">今日挽回次数已用完</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="historyCards.length === 0" class="empty-state">
      <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.NOTIFICATION" custom-class="empty-icon" mode="aspectFit" />
      <text class="empty-title">还没有浏览记录</text>
      <text class="empty-subtitle">快去寻觅页发现有趣的TA吧</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: #3FCF8E;
$green-light: #E8F9F1;
$pink-primary: #EC4899;
$pink-light: #FCE7F3;
$white: #FFFFFF;
$bg-page: #F4F6FA;
$text-primary: #1F2937;
$text-secondary: #6B7280;
$text-tertiary: #9CA3AF;
$border-light: #F3F4F6;
$card-soft-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);

.history-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, #F0FDF8 0%, $bg-page 50%);
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
  border-radius: 50%;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  transition: all 0.15s ease;
}

.back-btn:active {
  transform: scale(0.92);
}

.back-icon {
  font-size: 36rpx;
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
  color: #3FCF8E; // mp-weixin 降级：使用纯色（取渐变中间色）
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
  border-radius: 24rpx;
  box-shadow: $card-soft-shadow;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-num {
  font-size: 44rpx;
  font-weight: 800;
  // #ifdef H5
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  // #endif
  // #ifndef H5
  color: #3FCF8E; // mp-weixin 降级：使用纯色（取渐变中间色）
  // #endif
}

.stat-label {
  font-size: 24rpx;
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
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: $card-soft-shadow;
  transition: all 0.15s ease;
}

.history-card:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.card-main {
  display: flex;
  align-items: flex-start;
}

.card-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
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
  font-size: 32rpx;
  font-weight: 700;
  color: $text-primary;
}

.status-badge {
  padding: 8rpx 18rpx;
  border-radius: 999px;
}

.status-liked {
  background: linear-gradient(135deg, $pink-light, #FBCFE8);
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
  font-size: 22rpx;
  font-weight: 600;
}

.card-headline {
  font-size: 24rpx;
  color: $text-tertiary;
  margin-bottom: 8rpx;
}

.card-bio {
  font-size: 26rpx;
  color: $text-secondary;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
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
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  border-radius: 999px;
  border: none;
  padding: 0;
  margin: 0;
  box-shadow: 0 4rpx 16rpx rgba(63, 207, 142, 0.35);
  transition: all 0.15s ease;
}

.rewind-btn:active {
  transform: scale(0.96);
}

.rewind-btn::after {
  border: none;
}

.rewind-icon {
  font-size: 32rpx;
  color: $white;
  margin-right: 10rpx;
}

.rewind-label {
  font-size: 28rpx;
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
  font-size: 24rpx;
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
  font-size: 26rpx;
  color: $text-tertiary;
  line-height: 1.6;
}
</style>
