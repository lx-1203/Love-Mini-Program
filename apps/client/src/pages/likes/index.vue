<script setup lang="ts">
/**
 * 喜欢页 - 双向喜欢 / 访客
 * 展示「喜欢我的」用户列表和「访客」记录，支持切换标签页
 */
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useLikesStore } from "../../stores/likes";
import { useSessionStore } from "../../stores/session";
import LockScreen from "../../components/common/LockScreen.vue";

type TabType = "likedBy" | "visitors";

const likesStore = useLikesStore();
const sessionStore = useSessionStore();
const { likedBy, visitors, loading, heartSignals } = storeToRefs(likesStore);

/** 当前激活的标签页 */
const activeTab = ref<TabType>("likedBy");

/** 资料是否已完善 */
const isUnlocked = computed(() => sessionStore.isProfileComplete);

/** 完善度百分比 */
const completionPercent = computed(() => sessionStore.profileCompletion);

/** 是否有心动信号 */
const hasHeartSignal = computed(() => heartSignals.value.length > 0);

/**
 * 格式化时间显示
 * @param isoString - ISO 时间字符串
 * @returns 友好时间文本
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 切换标签页
 * @param tab - 目标标签页
 */
function switchTab(tab: TabType) {
  activeTab.value = tab;
  if (tab === "visitors" && visitors.value.length === 0) {
    void likesStore.fetchVisitors();
  }
}

/**
 * 跳转到用户详情页
 * @param userId - 用户 ID
 */
function goToUserDetail(userId: string) {
  uni.navigateTo({
    url: `/pages/user-detail/index?userId=${userId}`,
  });
}

/**
 * 跳转到心动信号页
 */
function goToHeartSignals() {
  uni.navigateTo({
    url: "/pages/heart-signals/index",
  });
}

onMounted(() => {
  if (isUnlocked.value) {
    void likesStore.fetchLikes();
    void likesStore.fetchHeartSignals();
  }
});
</script>

<template>
  <view class="likes-page">
    <!-- 未完善资料：显示锁定页面 -->
    <LockScreen
      v-if="!isUnlocked"
      page-name="喜欢"
      :completion-percent="completionPercent"
    />

    <!-- 已完善资料：显示正常内容 -->
    <template v-else>
      <!-- 页面头部 -->
      <view class="likes-header">
        <text class="likes-header__title">喜欢</text>
        <!-- 心动信号入口 -->
        <view
          v-if="hasHeartSignal"
          class="likes-header__signal"
          @tap="goToHeartSignals"
        >
          <text class="likes-header__signal-icon">💖</text>
          <text class="likes-header__signal-text">心动信号</text>
          <view class="likes-header__signal-badge" />
        </view>
      </view>

      <!-- 标签页切换 -->
      <view class="likes-tabs">
        <view
          class="likes-tabs__item"
          :class="{ 'likes-tabs__item--active': activeTab === 'likedBy' }"
          @tap="switchTab('likedBy')"
        >
          <text class="likes-tabs__text">喜欢我的</text>
          <view v-if="likedBy.length > 0" class="likes-tabs__badge">
            <text class="likes-tabs__badge-text">{{ likedBy.length }}</text>
          </view>
        </view>
        <view
          class="likes-tabs__item"
          :class="{ 'likes-tabs__item--active': activeTab === 'visitors' }"
          @tap="switchTab('visitors')"
        >
          <text class="likes-tabs__text">访客</text>
          <view v-if="visitors.length > 0" class="likes-tabs__badge">
            <text class="likes-tabs__badge-text">{{ visitors.length }}</text>
          </view>
        </view>
        <!-- 底部指示条 -->
        <view
          class="likes-tabs__indicator"
          :class="{
            'likes-tabs__indicator--left': activeTab === 'likedBy',
            'likes-tabs__indicator--right': activeTab === 'visitors',
          }"
        />
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="likes-loading">
        <view class="likes-loading__spinner" />
        <text class="likes-loading__text">加载中...</text>
      </view>

      <!-- 喜欢我的列表 -->
      <template v-else-if="activeTab === 'likedBy'">
        <view v-if="likedBy.length === 0" class="likes-empty">
          <view class="likes-empty__icon">💌</view>
          <text class="likes-empty__title">还没有人喜欢我</text>
          <text class="likes-empty__subtitle">多去看看推荐的人，增加曝光机会吧</text>
        </view>

        <view v-else class="likes-list">
          <view
            v-for="item in likedBy"
            :key="item.id"
            class="likes-card"
            @tap="goToUserDetail(item.userId)"
          >
            <view class="likes-card__avatar-wrap">
              <image
                v-if="item.avatar"
                class="likes-card__avatar"
                :src="item.avatar"
                mode="aspectFill"
              />
              <view v-else class="likes-card__avatar-placeholder">
                <text class="likes-card__avatar-initial">{{ item.name.charAt(0) }}</text>
              </view>
            </view>
            <view class="likes-card__info">
              <view class="likes-card__row">
                <text class="likes-card__name">{{ item.name }}</text>
                <text class="likes-card__time">{{ formatTime(item.likedAt) }}</text>
              </view>
              <text class="likes-card__headline">{{ item.headline }}</text>
            </view>
            <view class="likes-card__arrow">
              <text class="likes-card__arrow-icon">›</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 访客列表 -->
      <template v-else-if="activeTab === 'visitors'">
        <view v-if="visitors.length === 0" class="likes-empty">
          <view class="likes-empty__icon">👀</view>
          <text class="likes-empty__title">暂无访客</text>
          <text class="likes-empty__subtitle">完善资料，让更多人发现你</text>
        </view>

        <view v-else class="likes-list">
          <view
            v-for="item in visitors"
            :key="item.id"
            class="likes-card"
            @tap="goToUserDetail(item.userId)"
          >
            <view class="likes-card__avatar-wrap">
              <image
                v-if="item.avatar"
                class="likes-card__avatar"
                :src="item.avatar"
                mode="aspectFill"
              />
              <view v-else class="likes-card__avatar-placeholder">
                <text class="likes-card__avatar-initial">{{ item.name.charAt(0) }}</text>
              </view>
              <!-- 新访客标记 -->
              <view v-if="item.isNew" class="likes-card__new-dot" />
            </view>
            <view class="likes-card__info">
              <view class="likes-card__row">
                <text class="likes-card__name">{{ item.name }}</text>
                <text class="likes-card__time">{{ formatTime(item.visitedAt) }}</text>
              </view>
              <text class="likes-card__headline">{{ item.headline }}</text>
            </view>
            <view class="likes-card__arrow">
              <text class="likes-card__arrow-icon">›</text>
            </view>
          </view>
        </view>
      </template>
    </template>
  </view>
</template>

<style scoped lang="scss">
.likes-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--td-bg-app-page);
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  box-sizing: border-box;
}

/* ========== 页面头部 ========== */
.likes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.likes-header__title {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.likes-header__signal {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: linear-gradient(135deg, #fce7f3, #fbcfe8);
  border-radius: 999px;
}

.likes-header__signal-icon {
  font-size: 28rpx;
}

.likes-header__signal-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #be185d;
}

.likes-header__signal-badge {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ef4444;
}

/* ========== 标签页 ========== */
.likes-tabs {
  position: relative;
  display: flex;
  margin-bottom: 24rpx;
  border-bottom: 2rpx solid var(--td-border-level-1-color);
}

.likes-tabs__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx 0;
  position: relative;
  cursor: pointer;
}

.likes-tabs__text {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--td-text-color-secondary);
  transition: color 0.2s ease;
}

.likes-tabs__item--active .likes-tabs__text {
  color: var(--td-text-color-primary);
  font-weight: 600;
}

.likes-tabs__badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.likes-tabs__badge-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #ffffff;
}

.likes-tabs__indicator {
  position: absolute;
  bottom: -2rpx;
  width: 60rpx;
  height: 4rpx;
  border-radius: 4rpx;
  background: var(--td-brand-color-7);
  transition: left 0.3s ease;
}

.likes-tabs__indicator--left {
  left: calc(25% - 30rpx);
}

.likes-tabs__indicator--right {
  left: calc(75% - 30rpx);
}

/* ========== 加载状态 ========== */
.likes-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 120rpx 0;
}

.likes-loading__spinner {
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

.likes-loading__text {
  font-size: 28rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 空状态 ========== */
.likes-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 160rpx 40rpx;
}

.likes-empty__icon {
  font-size: 96rpx;
  margin-bottom: 16rpx;
}

.likes-empty__title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.likes-empty__subtitle {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
  text-align: center;
}

/* ========== 列表 ========== */
.likes-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* ========== 卡片 ========== */
.likes-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: #ffffff;
  border-radius: var(--td-radius-large);
  box-shadow: var(--td-shadow-1);
  transition: transform 0.15s ease;
}

.likes-card:active {
  transform: scale(0.99);
}

.likes-card__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.likes-card__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--td-bg-color-secondarycontainer);
}

.likes-card__avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--td-brand-color-3), var(--td-brand-color-5));
  display: flex;
  align-items: center;
  justify-content: center;
}

.likes-card__avatar-initial {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--td-brand-color-7);
}

.likes-card__new-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #ef4444;
  border: 4rpx solid #ffffff;
}

.likes-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.likes-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.likes-card__name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.likes-card__time {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  flex-shrink: 0;
}

.likes-card__headline {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.likes-card__arrow {
  flex-shrink: 0;
  padding-left: 8rpx;
}

.likes-card__arrow-icon {
  font-size: 36rpx;
  color: var(--td-text-color-placeholder);
}
</style>
