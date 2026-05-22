<script setup lang="ts">
/**
 * 个人中心 - 我的
 * 展示用户头像、昵称、学校、数据统计、资料完善度、功能菜单入口
 * 资料未完善时展示 LockScreen 锁定页面
 */
import { computed } from "vue";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import LockScreen from "../../components/common/LockScreen.vue";

const sessionStore = useSessionStore();

/** 资料是否已完善（三个硬门槛全部完成） */
const isUnlocked = computed(() => sessionStore.isProfileComplete);

/** 完善度百分比（0-100） */
const completionPercent = computed(() => sessionStore.profileCompletion);

/** 用户会话信息 */
const userInfo = computed(() => sessionStore.userSession);

/** 头像首字符 */
const avatarInitial = computed(() => {
  const name = userInfo.value?.displayName;
  return name ? name.charAt(0).toUpperCase() : "?";
});

/** 个人简介（暂无后端字段，使用占位文案） */
const bio = computed(() => {
  const session = userInfo.value;
  if (!session) return "这个人很懒，什么都没写";
  // 实际项目中应由后端返回 bio 字段
  return session.displayName ? "保持热爱，奔赴山海" : "这个人很懒，什么都没写";
});

/**
 * 数据统计项（当前使用硬编码占位，后续对接后端统计数据）
 */
interface StatItem {
  label: string;
  value: number | string;
}

const stats = computed<StatItem[]>(() => [
  { label: "关注", value: 28 },
  { label: "粉丝", value: 16 },
  { label: "获赞", value: 104 },
]);

/**
 * 功能菜单项配置
 */
interface MenuItem {
  icon: string;
  label: string;
  path?: string;
  action?: () => void;
}

const menuItems = computed<MenuItem[]>(() => [
  {
    icon: "🎯",
    label: "推荐计划设置",
    path: "/subpackages/setup/recommend-pref/index",
  },
  {
    icon: "🏫",
    label: "学校认证",
    path: "/subpackages/setup/campus/index",
  },
  {
    icon: "📅",
    label: "时间安排",
    path: "/subpackages/setup/schedule/index",
  },
  {
    icon: "💬",
    label: "反馈中心",
    path: "/subpackages/support/feedback/index",
  },
  {
    icon: "ℹ️",
    label: "关于我们",
    action: () => {
      uni.showToast({
        title: "校园恋爱 · 遇见你的那个TA",
        icon: "none",
        duration: 2000,
      });
    },
  },
]);

/**
 * 点击菜单项处理
 * @param item - 菜单项
 */
function handleMenuTap(item: MenuItem) {
  if (item.path) {
    openAppPath(item.path);
  } else if (item.action) {
    item.action();
  }
}

/**
 * 跳转到资料编辑页
 */
function goToProfileSetup() {
  openAppPath("/subpackages/setup/profile/index");
}

/** 应用版本号（当前硬编码，后续可从配置文件读取） */
const appVersion = "v1.0.0";
</script>

<template>
  <view class="profile-page">
    <!-- ==================== 未完善资料：锁定页面 ==================== -->
    <LockScreen
      v-if="!isUnlocked"
      page-name="我的"
      :completion-percent="completionPercent"
    />

    <!-- ==================== 已完善资料：完整个人中心 ==================== -->
    <template v-else>
      <!-- 页面顶部安全区占位 -->
      <view class="safe-top" />

      <!-- 个人资料头部卡片 -->
      <view class="profile-card">
        <!-- 头像区域 -->
        <view class="profile-card__avatar-wrap">
          <view class="profile-card__avatar">
            <text class="profile-card__avatar-text">{{ avatarInitial }}</text>
          </view>
          <view class="profile-card__online-dot" />
        </view>

        <!-- 用户信息 -->
        <view class="profile-card__body">
          <text class="profile-card__name">{{ userInfo?.displayName || "未设置昵称" }}</text>
          <text
            v-if="userInfo?.campusName"
            class="profile-card__campus"
          >
            🏫 {{ userInfo.campusName }}
          </text>
          <text class="profile-card__bio">{{ bio }}</text>
        </view>

        <!-- 编辑资料按钮 -->
        <view class="profile-card__edit-btn" @tap="goToProfileSetup">
          <text class="profile-card__edit-icon">✏️</text>
          <text class="profile-card__edit-text">编辑</text>
        </view>
      </view>

      <!-- 数据统计行 -->
      <view class="stats-row">
        <view
          v-for="(stat, index) in stats"
          :key="index"
          class="stats-row__item"
        >
          <text class="stats-row__value">{{ stat.value }}</text>
          <text class="stats-row__label">{{ stat.label }}</text>
        </view>
      </view>

      <!-- 资料完善度卡片 -->
      <view class="completion-card">
        <view class="completion-card__header">
          <text class="completion-card__title">资料完善度</text>
          <text class="completion-card__percent">{{ completionPercent }}%</text>
        </view>

        <!-- 进度条 -->
        <view class="completion-card__bar-wrap">
          <view class="completion-card__bar-track">
            <view
              class="completion-card__bar-fill"
              :style="{ width: completionPercent + '%' }"
            />
          </view>
        </view>

        <!-- 完善资料按钮（未达100%时展示） -->
        <view
          v-if="completionPercent < 100"
          class="completion-card__action"
          @tap="goToProfileSetup"
        >
          <text class="completion-card__action-icon">✨</text>
          <text class="completion-card__action-text">完善资料，提升匹配精准度</text>
          <text class="completion-card__action-arrow">→</text>
        </view>

        <!-- 已完善的提示 -->
        <view v-else class="completion-card__done">
          <text class="completion-card__done-text">🎉 资料已完善，快去探索吧！</text>
        </view>
      </view>

      <!-- 功能菜单列表 -->
      <view class="menu-section">
        <text class="menu-section__title">功能设置</text>

        <view class="menu-list">
          <view
            v-for="(item, index) in menuItems"
            :key="index"
            class="menu-list__item"
            :class="{ 'menu-list__item--last': index === menuItems.length - 1 }"
            @tap="handleMenuTap(item)"
          >
            <view class="menu-list__left">
              <text class="menu-list__icon">{{ item.icon }}</text>
              <text class="menu-list__label">{{ item.label }}</text>
            </view>
            <text class="menu-list__arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 底部版本信息 -->
      <view class="footer-version">
        <text class="footer-version__text">{{ appVersion }}</text>
      </view>

      <!-- 底部安全区占位 -->
      <view class="safe-bottom" />
    </template>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.profile-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--td-bg-color-page, #f5f6fa);
  box-sizing: border-box;
}

/* ==================== 安全区占位 ==================== */
.safe-top {
  height: calc(env(safe-area-inset-top) + 24rpx);
  flex-shrink: 0;
}

.safe-bottom {
  height: calc(env(safe-area-inset-bottom) + 24rpx);
  flex-shrink: 0;
}

/* ==================== 个人资料头部卡片 ==================== */
.profile-card {
  display: flex;
  align-items: center;
  margin: 0 32rpx 24rpx;
  padding: 36rpx 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
  position: relative;
}

.profile-card__avatar-wrap {
  position: relative;
  flex-shrink: 0;
  margin-right: 24rpx;
}

.profile-card__avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-card__avatar-text {
  font-size: 56rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.profile-card__online-dot {
  position: absolute;
  bottom: 6rpx;
  right: 6rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: #22c55e;
  border: 4rpx solid #ffffff;
}

.profile-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.profile-card__name {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--td-text-color-primary, #1a1a2e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-card__campus {
  font-size: 26rpx;
  color: var(--td-text-color-secondary, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-card__bio {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder, #9ca3af);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-card__edit-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 24rpx;
  border-radius: 32rpx;
  background: var(--td-bg-color-container, #f3f4f6);
  margin-left: 16rpx;
}

.profile-card__edit-btn:active {
  opacity: 0.7;
}

.profile-card__edit-icon {
  font-size: 24rpx;
}

.profile-card__edit-text {
  font-size: 26rpx;
  color: var(--td-text-color-secondary, #6b7280);
  font-weight: 500;
}

/* ==================== 数据统计行 ==================== */
.stats-row {
  display: flex;
  margin: 0 32rpx 24rpx;
  padding: 32rpx 0;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.stats-row__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  position: relative;

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    right: 0;
    top: 20%;
    height: 60%;
    width: 2rpx;
    background: var(--td-border-level-2-color, #f3f4f6);
  }
}

.stats-row__value {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--td-text-color-primary, #1a1a2e);
  line-height: 1;
}

.stats-row__label {
  font-size: 24rpx;
  color: var(--td-text-color-secondary, #6b7280);
}

/* ==================== 资料完善度卡片 ==================== */
.completion-card {
  margin: 0 32rpx 24rpx;
  padding: 28rpx 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.completion-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.completion-card__title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary, #1a1a2e);
}

.completion-card__percent {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--td-brand-color, #667eea);
}

.completion-card__bar-wrap {
  margin-bottom: 24rpx;
}

.completion-card__bar-track {
  width: 100%;
  height: 12rpx;
  border-radius: 6rpx;
  background: var(--td-bg-color-component, #e5e7eb);
  overflow: hidden;
}

.completion-card__bar-fill {
  height: 100%;
  border-radius: 6rpx;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.4s ease;
}

.completion-card__action {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
}

.completion-card__action:active {
  opacity: 0.7;
}

.completion-card__action-icon {
  font-size: 28rpx;
}

.completion-card__action-text {
  flex: 1;
  font-size: 26rpx;
  color: var(--td-brand-color, #667eea);
  font-weight: 500;
}

.completion-card__action-arrow {
  font-size: 28rpx;
  color: var(--td-brand-color, #667eea);
  font-weight: 600;
}

.completion-card__done {
  padding: 16rpx 20rpx;
  text-align: center;
}

.completion-card__done-text {
  font-size: 26rpx;
  color: var(--td-success-color, #22c55e);
  font-weight: 500;
}

/* ==================== 功能菜单列表 ==================== */
.menu-section {
  margin: 0 32rpx 24rpx;
}

.menu-section__title {
  display: block;
  font-size: 24rpx;
  color: var(--td-text-color-placeholder, #9ca3af);
  font-weight: 500;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.menu-list {
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.menu-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--td-border-level-1-color, #f3f4f6);

  &:active {
    background: var(--td-bg-color-container-active, #f9fafb);
  }

  &--last {
    border-bottom: none;
  }
}

.menu-list__left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.menu-list__icon {
  font-size: 36rpx;
  width: 44rpx;
  text-align: center;
}

.menu-list__label {
  font-size: 28rpx;
  color: var(--td-text-color-primary, #1a1a2e);
  font-weight: 500;
}

.menu-list__arrow {
  font-size: 36rpx;
  color: var(--td-text-color-placeholder, #c5c5c5);
  font-weight: 300;
}

/* ==================== 底部版本信息 ==================== */
.footer-version {
  display: flex;
  justify-content: center;
  padding: 32rpx 0;
}

.footer-version__text {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder, #c5c5c5);
}
</style>