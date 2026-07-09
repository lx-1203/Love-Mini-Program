<script setup lang="ts">
/**
 * 喜欢页 - 双向喜欢 / 访客
 * 展示「喜欢我的」用户列表和「访客」记录，支持切换标签页
 */
import { ref, computed, onMounted, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useLikesStore } from "../../stores/likes";
import { useSessionStore } from "../../stores/session";
import LockScreen from "../../components/common/LockScreen.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import VerificationBadge from "../../components/common/VerificationBadge.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { likesPageRequirements } from "../../config/page-access";
import { IMAGE_PATHS } from "../../config/images";

type TabType = "likedBy" | "visitors";

const likesStore = useLikesStore();
const sessionStore = useSessionStore();

// Phase 4 任务 20：接入页面访问守卫，触发 UnlockGuideModal 引导（替代静默重定向）
usePageAccess(likesPageRequirements);
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
 * 跳转到用户详情页（功能开发中）
 * @param userId - 用户 ID
 */
function goToUserDetail(userId: string) {
  uni.showToast({
    title: "用户详情功能开发中",
    icon: "none",
  });
}

/**
 * 跳转到心动信号页（功能开发中）
 */
function goToHeartSignals() {
  uni.showToast({
    title: "心动信号功能开发中",
    icon: "none",
  });
}

onMounted(() => {
  if (isUnlocked.value) {
    void likesStore.fetchLikes();
    void likesStore.fetchHeartSignals();
  }
});

/**
 * 监听解锁状态变化：sessionStore 异步加载完成后 isUnlocked 由 false 变 true，
 * 此时若列表为空则自动加载，避免从 discover 跳转过来时内容为空白。
 */
watch(
  isUnlocked,
  (newVal, oldVal) => {
    if (newVal && !oldVal && likedBy.value.length === 0) {
      void likesStore.fetchLikes();
      void likesStore.fetchHeartSignals();
    }
  }
);

/**
 * 页面再次显示时（如从 discover 匹配成功跳转过来）：
 * 已解锁且列表为空则补加载，确保数据可见。
 */
onShow(() => {
  if (isUnlocked.value && likedBy.value.length === 0 && !loading.value) {
    void likesStore.fetchLikes();
    void likesStore.fetchHeartSignals();
  }
});
</script>

<template>
  <view class="likes-page page-fade-in">
    <!-- 未完善资料：显示锁定页面 -->
    <LockScreen
      v-if="!isUnlocked"
      page-name="喜欢"
      :completion-percent="completionPercent"
    />

    <!-- 已完善资料：显示正常内容 -->
    <template v-else>
      <!-- 页面顶部渐变氛围 -->
      <view class="likes-header-overlay" />
      
      <!-- 页面头部 -->
      <view class="likes-header">
        <text class="likes-header__title">喜欢</text>
        <!-- 心动信号入口 -->
        <view
          v-if="hasHeartSignal"
          class="likes-header__signal press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="goToHeartSignals"
        >
          <SafeImage :src="IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL" custom-class="likes-header__signal-icon" mode="aspectFit" />
          <text class="likes-header__signal-text">心动信号</text>
          <view class="likes-header__signal-badge" />
        </view>
      </view>

      <!-- 标签页切换 -->
      <view class="likes-tabs">
        <view
          class="likes-tabs__item press-feedback"
          :class="{ 'likes-tabs__item--active': activeTab === 'likedBy' }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="switchTab('likedBy')"
        >
          <text class="likes-tabs__text">喜欢我的</text>
          <view v-if="likedBy.length > 0" class="likes-tabs__badge">
            <text class="likes-tabs__badge-text">{{ likedBy.length }}</text>
          </view>
        </view>
        <view
          class="likes-tabs__item press-feedback"
          :class="{ 'likes-tabs__item--active': activeTab === 'visitors' }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="switchTab('visitors')"
        >
          <text class="likes-tabs__text">访客</text>
          <view v-if="visitors.length > 0" class="likes-tabs__badge">
            <text class="likes-tabs__badge-text">{{ visitors.length }}</text>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="likes-loading">
        <view class="likes-loading__spinner" />
        <text class="likes-loading__text">加载中...</text>
      </view>

      <!-- 喜欢我的列表 -->
      <template v-else-if="activeTab === 'likedBy'">
        <view v-if="likedBy.length === 0" class="likes-empty card-base">
          <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.HEART" custom-class="likes-empty__icon" mode="aspectFit" />
          <text class="likes-empty__title">还没有人喜欢我</text>
          <text class="likes-empty__subtitle">多去看看推荐的人，增加曝光机会吧</text>
        </view>

        <view v-else class="likes-list">
          <view
            v-for="(item, idx) in likedBy"
            :key="item.id"
            class="likes-card list-item animate-fade-in press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            :style="{ animationDelay: idx * 60 + 'ms' }"
            @tap="goToUserDetail(item.userId)"
          >
            <view class="likes-card__avatar-wrap">
              <image
                v-if="item.avatar"
                class="likes-card__avatar"
                :src="item.avatar"
                mode="aspectFill"
                lazy-load
              />
              <view v-else class="likes-card__avatar-placeholder">
                <text class="likes-card__avatar-initial">{{ item.name.charAt(0) }}</text>
              </view>
            </view>
            <view class="likes-card__info">
              <view class="likes-card__row">
                <view class="likes-card__name-wrap">
                  <text class="likes-card__name">{{ item.name }}</text>
                  <VerificationBadge
                    v-if="item.verificationBadgeLevel && item.verificationBadgeLevel !== 'none'"
                    :level="(item.verificationBadgeLevel as 'school' | 'email' | 'idcard')"
                    size="sm"
                    :show-cta-when-none="false"
                  />
                </view>
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
        <view v-if="visitors.length === 0" class="likes-empty card-base">
          <SafeImage :src="IMAGE_PATHS.ICONS_SOCIAL.VISITOR" custom-class="likes-empty__icon" mode="aspectFit" />
          <text class="likes-empty__title">暂无访客</text>
          <text class="likes-empty__subtitle">完善资料，让更多人发现你</text>
        </view>

        <view v-else class="likes-list">
          <view
            v-for="(item, idx) in visitors"
            :key="item.id"
            class="likes-card list-item animate-fade-in press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            :style="{ animationDelay: idx * 60 + 'ms' }"
            @tap="goToUserDetail(item.userId)"
          >
            <view class="likes-card__avatar-wrap">
              <image
                v-if="item.avatar"
                class="likes-card__avatar"
                :src="item.avatar"
                mode="aspectFill"
                lazy-load
              />
              <view v-else class="likes-card__avatar-placeholder">
                <text class="likes-card__avatar-initial">{{ item.name.charAt(0) }}</text>
              </view>
              <!-- 新访客标记 -->
              <view v-if="item.isNew" class="likes-card__new-dot" />
            </view>
            <view class="likes-card__info">
              <view class="likes-card__row">
                <view class="likes-card__name-wrap">
                  <text class="likes-card__name">{{ item.name }}</text>
                  <VerificationBadge
                    v-if="item.verificationBadgeLevel && item.verificationBadgeLevel !== 'none'"
                    :level="(item.verificationBadgeLevel as 'school' | 'email' | 'idcard')"
                    size="sm"
                    :show-cta-when-none="false"
                  />
                </view>
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
  background: var(--c-gradient-page);
  padding: var(--sp-6) var(--sp-8);
  padding-top: calc(env(safe-area-inset-top) + var(--sp-6));
  box-sizing: border-box;
  position: relative;
}

.likes-header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300rpx;
  background: var(--c-gradient-brand-overlay);
  pointer-events: none;
  z-index: 0;
}

/* ========== 页面头部 ========== */
.likes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--section-gap);
  position: relative;
  z-index: 1;
}

.likes-header__title {
  font-size: var(--fs-5xl);
  font-weight: 700;
  color: var(--c-text-primary);
  // #ifdef H5
  background: linear-gradient(135deg, var(--c-brand), var(--c-romance-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  // #endif
  // #ifndef H5
  color: var(--c-brand);
  // #endif
}

.likes-header__signal {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-6);
  background: linear-gradient(135deg, var(--c-romance-50), var(--c-romance-100));
  border-radius: var(--r-full);
  transition: all 0.15s ease;
  box-shadow: var(--s-romance);
}

.likes-header__signal:active {
  transform: scale(0.96);
}

.likes-header__signal-icon {
  width: var(--sp-8);
  height: var(--sp-8);
}

.likes-header__signal-text {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-romance-500);
}

.likes-header__signal-badge {
  width: var(--sp-4);
  height: var(--sp-4);
  border-radius: var(--r-full);
  background: var(--c-romance-500);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

/* ========== 标签页 ========== */
.likes-tabs {
  position: relative;
  display: flex;
  margin-bottom: var(--section-gap);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  padding: var(--sp-2);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  position: relative;
  z-index: 1;
}

.likes-tabs__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-5) 0;
  position: relative;
  border-radius: var(--r-lg);
  transition: all 0.25s ease;
}

.likes-tabs__item:active {
  transform: scale(0.98);
}

.likes-tabs__text {
  font-size: var(--fs-xl);
  font-weight: 500;
  color: var(--c-text-secondary);
  transition: color 0.2s ease;
}

.likes-tabs__item--active {
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
}

.likes-tabs__item--active .likes-tabs__text {
  color: var(--c-text-inverse);
  font-weight: 600;
}

.likes-tabs__badge {
  min-width: var(--sp-9);
  height: var(--sp-9);
  padding: 0 var(--sp-2);
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.likes-tabs__item:not(.likes-tabs__item--active) .likes-tabs__badge {
  background: var(--c-romance-50);
}

.likes-tabs__badge-text {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text-inverse);
}

.likes-tabs__item:not(.likes-tabs__item--active) .likes-tabs__badge-text {
  color: var(--c-romance-500);
}

/* ========== 加载状态 ========== */
.likes-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
  padding: var(--sp-10) 0;
  position: relative;
  z-index: 1;
}

.likes-loading__spinner {
  width: var(--sp-10);
  height: var(--sp-10);
  border: var(--sp-1) solid var(--c-neutral-100);
  border-top-color: var(--c-brand);
  border-radius: var(--r-full);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.likes-loading__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

/* ========== 空状态 ========== */
.likes-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: var(--sp-10) var(--sp-10);
  margin-top: var(--sp-5);
  position: relative;
  z-index: 1;
}

.likes-empty__icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: var(--sp-5);
  opacity: 0.5;
}

.likes-empty__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.likes-empty__subtitle {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  text-align: center;
  line-height: 1.6;
}

/* ========== 列表 ========== */
.likes-list {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
  position: relative;
  z-index: 1;
}

/* ========== 列表过渡动画 ========== */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(var(--sp-5));
}
.list-move {
  transition: transform 0.3s ease;
}

/* ========== 卡片 ========== */
.likes-card {
  display: flex;
  align-items: center;
  gap: var(--sp-6);
  padding: var(--sp-7);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
  transition: all 0.15s ease;
}

.likes-card:active {
  transform: scale(0.98);
  box-shadow: var(--card-shadow-active);
}

.likes-card__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.likes-card__avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-page);
  border: var(--sp-1) solid var(--c-bg-brand);
}

.likes-card__avatar-placeholder {
  width: 104rpx;
  height: 104rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--sp-1) solid var(--c-bg-brand);
}

.likes-card__avatar-initial {
  font-size: var(--fs-4xl);
  font-weight: 700;
  color: var(--c-brand);
}

.likes-card__new-dot {
  position: absolute;
  top: var(--sp-1);
  right: var(--sp-1);
  width: var(--sp-6);
  height: var(--sp-6);
  border-radius: var(--r-full);
  background: var(--c-romance-500);
  border: var(--sp-1) solid var(--c-bg-container);
  box-shadow: var(--s-romance);
}

.likes-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.likes-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
}

/* 昵称 + 认证徽章包裹（Phase D3） */
.likes-card__name-wrap {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  flex: 1;
}

.likes-card__name {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
}

.likes-card__time {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
  background: var(--c-neutral-50);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
}

.likes-card__headline {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.likes-card__arrow {
  flex-shrink: 0;
  padding-left: var(--sp-2);
  width: var(--sp-10);
  height: var(--sp-10);
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand), rgba(63, 207, 142, 0.15));
  display: flex;
  align-items: center;
  justify-content: center;
}

.likes-card__arrow-icon {
  font-size: var(--fs-3xl);
  color: var(--c-brand);
  font-weight: 600;
}
</style>
