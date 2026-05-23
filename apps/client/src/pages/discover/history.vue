<script setup lang="ts">
/**
 * 历史推荐页 - 今日已看卡片列表
 * 展示今日已浏览的所有推荐卡片，支持挽回已拒绝的卡片。
 */
import { computed, onMounted } from "vue";
import { useDiscoverStore } from "../../stores/discover";

const discoverStore = useDiscoverStore();

/** 历史记录（今日已看过的所有卡片） */
const historyCards = computed(() => discoverStore.historyCards);

/** 已拒绝的卡片 */
const passedCards = computed(() => discoverStore.passedCards);

/** 今日是否已使用挽回 */
const hasRewoundToday = computed(() => discoverStore.hasRewoundToday);

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
  <view class="history-page">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="back-btn" @click="goBack">
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
        class="history-card"
      >
        <view class="card-main">
          <image
            class="card-avatar"
            :src="getCardDetail(record.cardId)?.avatar || '/static/default-avatar.png'"
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
          <button class="rewind-btn" @click="handleRewind(record.cardId)">
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
      <text class="empty-icon">📭</text>
      <text class="empty-title">还没有浏览记录</text>
      <text class="empty-subtitle">快去寻觅页发现有趣的TA吧</text>
    </view>
  </view>
</template>

<style scoped>
.history-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f4f7fb;
  padding-bottom: 40rpx;
}

/* ===== 顶部导航 ===== */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 32rpx 24rpx;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.back-icon {
  font-size: 32rpx;
  color: #334155;
}

.page-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1e293b;
}

.header-placeholder {
  width: 64rpx;
}

/* ===== 统计栏 ===== */
.stats-bar {
  display: flex;
  justify-content: space-around;
  padding: 24rpx 32rpx;
  margin: 0 32rpx 24rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 24rpx;
  color: #64748b;
  margin-top: 4rpx;
}

/* ===== 历史列表 ===== */
.history-list {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.history-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-main {
  display: flex;
  align-items: flex-start;
}

.card-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background-color: #e2e8f0;
  margin-right: 20rpx;
  flex-shrink: 0;
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
  margin-bottom: 8rpx;
}

.card-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1e293b;
}

.status-badge {
  padding: 6rpx 14rpx;
  border-radius: 16rpx;
}

.status-liked {
  background-color: #fce7f3;
}

.status-liked .status-text {
  color: #db2777;
}

.status-passed {
  background-color: #f1f5f9;
}

.status-passed .status-text {
  color: #94a3b8;
}

.status-text {
  font-size: 22rpx;
  font-weight: 500;
}

.card-headline {
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 8rpx;
}

.card-bio {
  font-size: 26rpx;
  color: #334155;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ===== 挽回操作 ===== */
.rewind-action {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f1f5f9;
}

.rewind-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 72rpx;
  background-color: #eef2ff;
  border-radius: 36rpx;
  border: none;
  padding: 0;
  margin: 0;
}

.rewind-btn::after {
  border: none;
}

.rewind-icon {
  font-size: 28rpx;
  color: #4f46e5;
  margin-right: 8rpx;
}

.rewind-label {
  font-size: 26rpx;
  color: #4f46e5;
  font-weight: 500;
}

.rewind-hint {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f1f5f9;
  text-align: center;
}

.hint-text {
  font-size: 24rpx;
  color: #94a3b8;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
  text-align: center;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12rpx;
}

.empty-subtitle {
  font-size: 26rpx;
  color: #64748b;
}
</style>
