<script setup lang="ts">
/**
 * 设置页
 * 分组：账号管理、通知设置、隐私安全、缓存管理、关于
 * 所有菜单项点击有 press-feedback 动画 + lightHaptic 反馈
 */
import { ref } from "vue";
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";
import { useSessionStore } from "../../stores/session";

interface MenuItem {
  emoji: string;
  icon?: string;
  bgColor: string;
  label: string;
  value?: string;
  action?: () => void;
  path?: string;
}

/** 消息通知开关状态 */
const notifyEnabled = ref(true);
/** 隐私模式开关状态 */
const privacyModeEnabled = ref(false);
/** 缓存大小（mock） */
const cacheSize = ref("23.5 MB");

/** 切换消息通知 */
function toggleNotify(e: any) {
  lightHaptic();
  notifyEnabled.value = !!e.detail.value;
  uni.showToast({
    title: notifyEnabled.value ? "已开启消息通知" : "已关闭消息通知",
    icon: "none",
    duration: 1200,
  });
}

/** 切换隐私模式 */
function togglePrivacyMode(e: any) {
  lightHaptic();
  privacyModeEnabled.value = !!e.detail.value;
  uni.showToast({
    title: privacyModeEnabled.value ? "已开启隐私模式" : "已关闭隐私模式",
    icon: "none",
    duration: 1200,
  });
}

/** 跳转到资料编辑 */
function goToProfileSetup() {
  lightHaptic();
  uni.navigateTo({ url: "/subpackages/setup/profile/index" });
}

/** 查看用户协议 */
function viewUserAgreement() {
  lightHaptic();
  uni.showModal({
    title: "用户协议",
    content:
      "欢迎使用校园恋爱小程序。\n\n本协议是您与校园恋爱之间就使用本服务所订立的契约。\n请仔细阅读本协议，您使用本服务即表示同意本协议全部条款。",
    showCancel: false,
    confirmText: "我知道了",
  });
}

/** 查看隐私政策 */
function viewPrivacyPolicy() {
  lightHaptic();
  uni.showModal({
    title: "隐私政策",
    content:
      "我们重视您的隐私。\n\n本隐私政策说明我们如何收集、使用、存储和保护您的个人信息。\n您在使用本服务时，我们可能需要收集您的头像、昵称、学校信息等基本资料。",
    showCancel: false,
    confirmText: "我知道了",
  });
}

/** 清除缓存 */
function clearCache() {
  lightHaptic();
  uni.showModal({
    title: "清除缓存",
    content: `当前缓存大小：${cacheSize.value}\n\n清除缓存不会影响您的账号数据，但会清除本地图片缓存与临时文件。`,
    confirmText: "立即清除",
    cancelText: "取消",
    success: (res) => {
      if (res.confirm) {
        uni.showLoading({ title: "清除中..." });
        setTimeout(() => {
          cacheSize.value = "0 KB";
          uni.hideLoading();
          uni.showToast({
            title: "缓存已清除",
            icon: "success",
            duration: 1500,
          });
        }, 800);
      }
    },
  });
}

/** 检查更新 */
function checkUpdate() {
  lightHaptic();
  uni.showLoading({ title: "检查中..." });
  setTimeout(() => {
    uni.hideLoading();
    uni.showModal({
      title: "版本更新",
      content: "当前已是最新版本\n当前版本：v1.0.0",
      showCancel: false,
      confirmText: "知道了",
    });
  }, 800);
}

/** 关于我们 */
function aboutUs() {
  lightHaptic();
  uni.showModal({
    title: "关于校园恋爱",
    content:
      "校园恋爱 · 遇见你的那个TA\n\n版本：v1.0.0\n\n在这里，遇见同频的人，开启一段双向奔赴的校园故事。",
    showCancel: false,
    confirmText: "知道了",
  });
}

/** 退出登录 */
function logout() {
  lightHaptic();
  uni.showModal({
    title: "提示",
    content: "确定要退出登录吗？",
    success: (res) => {
      if (res.confirm) {
        const sessionStore = useSessionStore();
        sessionStore.userSession = null;
        uni.reLaunch({ url: "/pages/login/index" });
      }
    },
  });
}

/** 返回上一页 */
function goBack() {
  lightHaptic();
  uni.navigateBack({ delta: 1 });
}

/** 账号分组菜单项 */
const accountMenus = ref<MenuItem[]>([
  {
    emoji: "✏️",
    icon: IMAGE_PATHS.ICONS_PROFILE.SETTINGS,
    bgColor: "#E8F4FF",
    label: "编辑资料",
    action: goToProfileSetup,
  },
  {
    emoji: "🔐",
    icon: IMAGE_PATHS.ICONS_PROFILE.VERIFICATION,
    bgColor: "#FFF0F5",
    label: "恋爱认证",
    path: "/pages/verification/index",
  },
]);

/** 关于分组菜单项 */
const aboutMenus = ref<MenuItem[]>([
  {
    emoji: "📜",
    icon: IMAGE_PATHS.ICONS_PROFILE.POSTS,
    bgColor: "#F4F6FA",
    label: "用户协议",
    action: viewUserAgreement,
  },
  {
    emoji: "🔒",
    icon: IMAGE_PATHS.ICONS_PROFILE.VISITORS,
    bgColor: "#F4F6FA",
    label: "隐私政策",
    action: viewPrivacyPolicy,
  },
  {
    emoji: "🔄",
    icon: IMAGE_PATHS.ICONS_PROFILE.LAB,
    bgColor: "#F4F6FA",
    label: "检查更新",
    action: checkUpdate,
  },
  {
    emoji: "ℹ️",
    icon: IMAGE_PATHS.ICONS_PROFILE.INFO,
    bgColor: "#F4F6FA",
    label: "关于我们",
    action: aboutUs,
  },
]);

/** 点击菜单项统一处理 */
function handleMenuTap(item: MenuItem) {
  lightHaptic();
  if (item.path) {
    uni.navigateTo({ url: item.path });
  } else if (item.action) {
    item.action();
  }
}
</script>

<template>
  <view class="settings-page page-fade-in">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100">
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">设置</text>
      <view class="nav-bar__placeholder" />
    </view>

    <!-- 顶部安全区占位 -->
    <view class="safe-top" />

    <!-- 账号分组 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">账号管理</text>
      </view>
      <view class="menu-group">
        <view
          v-for="(item, index) in accountMenus"
          :key="index"
          class="menu-item press-feedback list-item"
          :class="{ 'menu-item--no-border': index === accountMenus.length - 1 }"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" :style="{ background: item.bgColor }">
              <text class="menu-item__emoji">{{ item.emoji }}</text>
            </view>
            <text class="menu-item__label">{{ item.label }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 通知设置分组 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">通知设置</text>
      </view>
      <view class="menu-group">
        <view class="menu-item list-item">
          <view class="menu-item__left">
            <view class="menu-item__icon" style="background: #FFF8E7">
              <text class="menu-item__emoji">🔔</text>
            </view>
            <text class="menu-item__label">消息通知</text>
          </view>
          <switch
            :checked="notifyEnabled"
            color="#3FCF8E"
            @change="toggleNotify"
          />
        </view>
        <view class="menu-item list-item menu-item--no-border">
          <view class="menu-item__left">
            <view class="menu-item__icon" style="background: #E8F8F0">
              <text class="menu-item__emoji">🛡️</text>
            </view>
            <text class="menu-item__label">隐私模式</text>
          </view>
          <switch
            :checked="privacyModeEnabled"
            color="#3FCF8E"
            @change="togglePrivacyMode"
          />
        </view>
      </view>
    </view>

    <!-- 隐私安全分组 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">隐私安全</text>
      </view>
      <view class="menu-group">
        <view
          class="menu-item press-feedback list-item menu-item--no-border"
          @tap="viewPrivacyPolicy"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" style="background: #F4F6FA">
              <text class="menu-item__emoji">📋</text>
            </view>
            <text class="menu-item__label">隐私政策</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 缓存管理分组 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">存储管理</text>
      </view>
      <view class="menu-group">
        <view
          class="menu-item press-feedback list-item menu-item--no-border"
          @tap="clearCache"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" style="background: #EDE9FE">
              <text class="menu-item__emoji">🧹</text>
            </view>
            <text class="menu-item__label">清除缓存</text>
          </view>
          <view class="menu-item__right">
            <text class="menu-item__value">{{ cacheSize }}</text>
            <text class="menu-item__arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 关于分组 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">关于</text>
      </view>
      <view class="menu-group">
        <view
          v-for="(item, index) in aboutMenus"
          :key="index"
          class="menu-item press-feedback list-item"
          :class="{ 'menu-item--no-border': index === aboutMenus.length - 1 }"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" :style="{ background: item.bgColor }">
              <text class="menu-item__emoji">{{ item.emoji }}</text>
            </view>
            <text class="menu-item__label">{{ item.label }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-btn press-feedback" @tap="logout" hover-class="logout-btn--hover" hover-stay-time="100">
      <text class="logout-btn__text">退出登录</text>
    </view>

    <!-- 底部版本信息 -->
    <view class="footer-version">
      <text class="footer-version__text">校园恋爱 v1.0.0</text>
    </view>

    <!-- 底部安全区占位 -->
    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.settings-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
  box-sizing: border-box;
  position: relative;
}

/* ==================== 顶部导航栏 ==================== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  background: #FFFFFF;
  box-shadow: 0 1rpx 4rpx rgba(15, 23, 42, 0.04);
  position: relative;
  z-index: 1;
}

.nav-bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &--hover {
    background: #F4F6FA;
    transform: scale(0.94);
  }
}

.nav-bar__back-icon {
  font-size: 56rpx;
  color: #1F2329;
  font-weight: 300;
  line-height: 1;
}

.nav-bar__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1F2329;
}

.nav-bar__placeholder {
  width: 64rpx;
  height: 64rpx;
}

/* ==================== 安全区占位 ==================== */
.safe-top {
  height: calc(constant(safe-area-inset-top) + 0rpx);
  height: calc(env(safe-area-inset-top) + 0rpx);
  flex-shrink: 0;
}

.safe-bottom {
  height: calc(constant(safe-area-inset-bottom) + 24rpx);
  height: calc(env(safe-area-inset-bottom) + 24rpx);
  flex-shrink: 0;
}

/* ==================== 分组 ==================== */
.section {
  position: relative;
  z-index: 1;
  margin: 24rpx 24rpx 0;
}

.section__title {
  padding: 0 12rpx 12rpx;
}

.section__title-text {
  font-size: 24rpx;
  color: #6B7280;
  font-weight: 500;
}

/* ==================== 菜单分组 ==================== */
.menu-group {
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(15, 23, 42, 0.04), 0 1rpx 4rpx rgba(15, 23, 42, 0.03);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #F4F6FA;
  transition: all 0.15s ease;

  &--no-border {
    border-bottom: none;
  }

  &--hover {
    transform: scale(0.98);
    background: #FAFBFC;
  }
}

.menu-item__left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.menu-item__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-item__emoji {
  font-size: 32rpx;
}

.menu-item__label {
  font-size: 28rpx;
  color: #1F2329;
  font-weight: 500;
}

.menu-item__right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.menu-item__value {
  font-size: 24rpx;
  color: #9AA1AB;
}

.menu-item__arrow {
  font-size: 36rpx;
  color: #CBD5E1;
  font-weight: 300;
  line-height: 1;
}

/* ==================== 退出登录按钮 ==================== */
.logout-btn {
  position: relative;
  z-index: 1;
  margin: 32rpx 24rpx 0;
  padding: 28rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(15, 23, 42, 0.04), 0 1rpx 4rpx rgba(15, 23, 42, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &--hover {
    transform: scale(0.98);
    background: #FAFBFC;
  }
}

.logout-btn__text {
  font-size: 30rpx;
  color: #E5454D;
  font-weight: 500;
}

/* ==================== 底部版本信息 ==================== */
.footer-version {
  display: flex;
  justify-content: center;
  padding: 32rpx 0 16rpx;
  position: relative;
  z-index: 1;
}

.footer-version__text {
  font-size: 22rpx;
  color: #9AA1AB;
}
</style>
