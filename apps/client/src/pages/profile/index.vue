<script setup lang="ts">
/**
 * 个人中心 - 我的
 * 展示用户头像、昵称、学校、数据统计、资料完善度、社交升温进度、功能菜单入口
 * 资料未完善时展示 LockScreen 锁定页面
 */
import { computed, onMounted } from "vue";
import { useSessionStore } from "../../stores/session";
import { useProfileStore } from "../../stores/profile";
import { useSocialProgressStore } from "../../stores/social-progress";
import { openAppPath } from "../../utils/navigation";
import LockScreen from "../../components/common/LockScreen.vue";
import SocialProgressIndicator from "../../components/social/SocialProgressIndicator.vue";

const sessionStore = useSessionStore();
const profileStore = useProfileStore();
const socialProgressStore = useSocialProgressStore();

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

/** 个人简介（从 basicProfile 获取 bio 字段） */
const bio = computed(() => {
  const profileBio = profileStore.basicProfile?.bio;
  if (profileBio && profileBio.trim().length > 0) {
    return profileBio;
  }
  return "这个人很懒，什么都没写";
});

/**
 * 数据统计项（从 profileStats 获取真实数据）
 */
interface StatItem {
  label: string;
  value: number | string;
}

const stats = computed<StatItem[]>(() => {
  const s = profileStore.profileStats;
  return [
    { label: "关注", value: s?.followingCount ?? 0 },
    { label: "粉丝", value: s?.followersCount ?? 0 },
    { label: "获赞", value: s?.likesCount ?? 0 },
  ];
});

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
    icon: "📝",
    label: "我的动态",
    path: "/subpackages/profile/posts/index",
  },
  {
    icon: "🎯",
    label: "情感实验室",
    path: "/subpackages/profile/lab/index",
  },
  {
    icon: "🎁",
    label: "推荐给好友",
    action: () => {
      uni.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"],
      });
    },
  },
  {
    icon: "⚙️",
    label: "设置",
    path: "/subpackages/profile/settings/index",
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

/** 应用版本号 */
const appVersion = import.meta.env.VITE_APP_VERSION ?? "v1.0.0";

/** 是否为开发环境（Vite 编译期替换，避免在模板中直接使用 import.meta） */
const isDev = import.meta.env.DEV;

/** 页面加载时获取统计数据 */
onMounted(() => {
  profileStore.loadStats();
  socialProgressStore.fetchProgress();
});
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

      <!-- 高级会员卡片 -->
      <view class="vip-card" @tap="openAppPath('/subpackages/vip/index')">
        <view class="vip-card__left">
          <text class="vip-card__title">⭐ 高级会员</text>
          <text class="vip-card__subtitle">解锁空档查看 · 优先推荐 · 隐身浏览</text>
        </view>
        <view class="vip-card__btn">
          <text>立即开通</text>
        </view>
      </view>

      <!-- 社交升温进度追踪 -->
      <view class="social-progress-section">
        <SocialProgressIndicator />
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

      <!-- [DEV-MODE] 开发者模式入口按钮 - 生产构建时移除 -->
      <view v-if="isDev" class="dev-entry" @tap="openAppPath('/pages/dev/index')">
        <text class="dev-entry__text">DEV</text>
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
  background-color: var(--td-bg-app-page);
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
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 24rpx;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
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
  background: linear-gradient(135deg, var(--td-brand-color-6) 0%, var(--td-brand-color-7) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.2);
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
  background: #10b981;
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
  color: var(--td-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-card__campus {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-card__bio {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
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
  background: var(--td-brand-color-1);
  border: 1px solid var(--td-brand-color-3);
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
  color: var(--td-brand-color-6);
  font-weight: 500;
}

/* ==================== 数据统计行 ==================== */
.stats-row {
  display: flex;
  margin: 0 32rpx 24rpx;
  padding: 32rpx 0;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
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
    background: var(--td-border-level-1-color);
  }
}

.stats-row__value {
  font-size: 40rpx;
  font-weight: 800;
  color: var(--td-text-color-primary);
  line-height: 1;
}

.stats-row__label {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

/* ==================== 会员卡片 ==================== */
.vip-card {
  margin: 0 32rpx 24rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-radius: 24rpx;
  box-shadow: var(--td-shadow-2);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vip-card__left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.vip-card__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fbbf24;
}

.vip-card__subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.vip-card__btn {
  padding: 12rpx 28rpx;
  border-radius: 999px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}

.vip-card__btn text {
  font-size: 26rpx;
  color: #1e293b;
  font-weight: 600;
}

/* ==================== 社交升温进度区块 ==================== */
.social-progress-section {
  margin: 0 32rpx 24rpx;
}

/* ==================== 资料完善度卡片 ==================== */
.completion-card {
  margin: 0 32rpx 24rpx;
  padding: 28rpx 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
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
  color: var(--td-text-color-primary);
}

.completion-card__percent {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--td-brand-color-6);
}

.completion-card__bar-wrap {
  margin-bottom: 24rpx;
}

.completion-card__bar-track {
  width: 100%;
  height: 12rpx;
  border-radius: 6rpx;
  background: var(--td-bg-color-surface);
  overflow: hidden;
}

.completion-card__bar-fill {
  height: 100%;
  border-radius: 6rpx;
  background: linear-gradient(90deg, var(--td-brand-color-6) 0%, var(--td-brand-color-7) 100%);
  transition: width 0.4s ease;
}

.completion-card__action {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: var(--td-brand-color-1);
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
  color: var(--td-brand-color-6);
  font-weight: 500;
}

.completion-card__action-arrow {
  font-size: 28rpx;
  color: var(--td-brand-color-6);
  font-weight: 600;
}

.completion-card__done {
  padding: 16rpx 20rpx;
  text-align: center;
}

.completion-card__done-text {
  font-size: 26rpx;
  color: var(--td-success-color);
  font-weight: 500;
}

/* ==================== 功能菜单列表 ==================== */
.menu-section {
  margin: 0 32rpx 24rpx;
}

.menu-section__title {
  display: block;
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  font-weight: 500;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.menu-list {
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
  overflow: hidden;
}

.menu-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--td-border-level-1-color);

  &:active {
    background: var(--td-bg-color-surface);
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
  color: var(--td-text-color-primary);
  font-weight: 500;
}

.menu-list__arrow {
  font-size: 36rpx;
  color: var(--td-text-color-placeholder);
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
  color: var(--td-text-color-placeholder);
}

/* ==================== [DEV-MODE] 开发者入口 - 删除时移除此块 ==================== */
.dev-entry {
  display: flex;
  justify-content: center;
  padding: 24rpx 0;
}

.dev-entry:active {
  opacity: 0.6;
}

.dev-entry__text {
  font-size: 24rpx;
  font-weight: 800;
  color: #ffffff;
  background: #ef4444;
  padding: 10rpx 32rpx;
  border-radius: 12rpx;
  letter-spacing: 4rpx;
}
</style>