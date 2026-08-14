<script setup lang="ts">
/**
 * 设置页
 * 分组：账号管理、通知设置、隐私安全、缓存管理、关于
 * 所有菜单项点击有 press-feedback 动画 + lightHaptic 反馈
 *
 * 功能6：通知设置分组新增「免打扰」入口，跳转到 /pages/settings/dnd
 *
 * SubTask 5.5.1：消息通知/隐私模式开关采用乐观更新模式：
 * 1. 切换时立即更新本地 ref，UI 即时反馈
 * 2. 异步持久化到本地存储（uni.setStorage）
 * 3. 持久化失败时回滚 ref 至旧值，并提示用户
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";
import { useSessionStore } from "../../stores/session";
import { STORAGE_KEYS } from "../../constants/storage-keys";
import { TOAST_DURATION } from "../../constants/limits";
import { isDev } from "../../config/env";
// 收尾轮：深色模式三态切换（auto/dark/light）
import { useThemeStore, type ThemeMode } from "../../stores/theme";
// Task 33：路由路径常量化，避免硬编码字符串
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";

/** 操作定时器集合，用于卸载时统一清理 */
const operationTimers = new Set<ReturnType<typeof setTimeout>>();

const { t } = useI18n();
const themeStore = useThemeStore();
/** 深色模式三态循环（跟随系统 → 深色 → 浅色 → 跟随系统） */
const THEME_CYCLE: ThemeMode[] = ["auto", "dark", "light"];
const themeModeText = computed(() => {
  const map: Record<ThemeMode, string> = {
    auto: t("settings.themeAuto"),
    dark: t("settings.themeDark"),
    light: t("settings.themeLight"),
  };
  return map[themeStore.mode];
});
function handleThemeTap(): void {
  const idx = THEME_CYCLE.indexOf(themeStore.mode);
  const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length] ?? "auto";
  themeStore.setMode(next);
  uni.showToast({ title: themeModeText.value, icon: "none" });
}

interface MenuItem {
  icon: string;
  bgColor: string;
  label: string;
  value?: string;
  action?: () => void;
  path?: string;
}

/** 缓存大小（R4-00064：真实读取 uni.getStorageInfo 统计） */
const cacheSize = ref("0 KB");

/** R4-00064：可安全清除的缓存 key（可重新拉取/重建；不含登录态/设置/草稿） */
const CACHE_KEYS_TO_CLEAR: string[] = [STORAGE_KEYS.USER_CACHE];

/** 格式化 storage 大小（KB → 可读文本） */
function formatSizeKB(kb: number): string {
  if (kb <= 0) return "0 KB";
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** 刷新缓存大小展示（真实读取 uni.getStorageInfo.currentSize） */
function refreshCacheSize(): void {
  try {
    uni.getStorageInfo({
      success: (info) => {
        cacheSize.value = formatSizeKB(info.currentSize ?? 0);
      },
      // 读取失败保持原值，不打断页面
      fail: () => {},
    });
  } catch (_e) {
    // 保持原值
  }
}

/**
 * R4-00066：页面挂载时刷新缓存大小统计（消息通知/隐私模式开关已移除——
 * 原开关仅存本地 storage、无任何消费方，设置项形同虚设，故移除入口）。
 */
onMounted(() => {
  // R4-00064：进入设置页时真实统计缓存大小
  refreshCacheSize();
});

/** 跳转到资料编辑 */
function goToProfileSetup() {
  lightHaptic();
  uni.navigateTo({ url: SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE } );
}

/**
 * 功能6：跳转到免打扰设置页。
 * 路径已在 pages.json 中注册：pages/settings/dnd
 */
function goToDnd() {
  lightHaptic();
  uni.navigateTo({ url: ROUTES.SETTINGS.DND });
}

/** 查看用户协议（2026-08-10 功能补齐：showModal 摘要改为跳转完整协议页） */
function viewUserAgreement() {
  lightHaptic();
  uni.navigateTo({ url: SUBPACKAGE_ROUTES.LEGAL.AGREEMENT });
}

/** 查看隐私政策（2026-08-10 功能补齐：showModal 摘要改为跳转完整隐私政策页） */
function viewPrivacyPolicy() {
  lightHaptic();
  uni.navigateTo({ url: SUBPACKAGE_ROUTES.LEGAL.PRIVACY });
}

/**
 * 清除缓存（R4-00064：接入 uni.getStorageInfo / uni.removeStorageSync 真实链路，
 * 不再用 800ms 延迟假装清零）。
 * 注意：不使用 uni.clearStorage 全量清空——登录态 token / 主题 / 语言 /
 * 开关偏好 / 草稿等用户数据必须保留，仅清除可重建的缓存 key。
 */
function clearCache() {
  lightHaptic();
  uni.showModal({
    title: t("settings.clearCacheTitle"),
    content: t("settings.clearCacheContent", { size: cacheSize.value }),
    confirmText: t("settings.clearCacheConfirm"),
    cancelText: t("common.cancel"),
    success: (res) => {
      if (!res.confirm) return;
      uni.showLoading({ title: t("settings.clearing") });
      for (const key of CACHE_KEYS_TO_CLEAR) {
        try {
          uni.removeStorageSync(key);
        } catch (_e) {
          // 单个 key 删除失败不阻塞整体清除
        }
      }
      uni.hideLoading();
      // 清除后重新统计真实大小
      refreshCacheSize();
      uni.showToast({
        title: t("settings.cacheCleared"),
        icon: "success",
        duration: TOAST_DURATION.SHORT_MS,
      });
    },
  });
}

/**
 * 检查更新（R4-00065：接入 uni.getUpdateManager 真实链路）。
 * - mp-weixin：原生更新管理器（onCheckForUpdate → onUpdateReady/onUpdateFailed → applyUpdate）；
 * - H5：无原生更新机制（部署即最新），提示当前为最新版本。
 */
function checkUpdate() {
  lightHaptic();
  uni.showLoading({ title: t("settings.checkingUpdate") });
  // #ifdef MP-WEIXIN
  const updateManager = uni.getUpdateManager();
  updateManager.onCheckForUpdate((res) => {
    if (res && res.hasUpdate) {
      // 有新版本：等待下载完成后由 onUpdateReady/onUpdateFailed 接管
      return;
    }
    uni.hideLoading();
    uni.showModal({
      title: t("settings.versionUpdateTitle"),
      content: t("settings.versionLatestContent"),
      showCancel: false,
      confirmText: t("settings.gotIt"),
    });
  });
  updateManager.onUpdateReady(() => {
    uni.hideLoading();
    uni.showModal({
      title: t("settings.versionUpdateTitle"),
      content: t("settings.versionUpdateReady"),
      showCancel: true,
      confirmText: t("settings.versionRestart"),
      cancelText: t("common.cancel"),
      success: (res) => {
        if (res.confirm) {
          updateManager.applyUpdate();
        }
      },
    });
  });
  updateManager.onUpdateFailed(() => {
    uni.hideLoading();
    uni.showModal({
      title: t("settings.versionUpdateTitle"),
      content: t("settings.versionUpdateFailed"),
      showCancel: false,
      confirmText: t("settings.gotIt"),
    });
  });
  // #endif
  // #ifndef MP-WEIXIN
  // H5 无原生更新管理器，延迟后提示当前为最新版本（部署即最新）
  const timer = setTimeout(() => {
    uni.hideLoading();
    uni.showModal({
      title: t("settings.versionUpdateTitle"),
      content: t("settings.versionLatestContent"),
      showCancel: false,
      confirmText: t("settings.gotIt"),
    });
    operationTimers.delete(timer);
  }, 800);
  operationTimers.add(timer);
  // #endif
}

/**
 * 页面卸载时清理所有操作定时器，避免内存泄漏。
 * 修复（P1 BUG）：原实现未保存 setTimeout 返回值，页面销毁后定时器仍可能触发
 * uni.hideLoading 与状态修改。
 */
onUnmounted(() => {
  operationTimers.forEach((timer) => clearTimeout(timer));
  operationTimers.clear();
});

/** 关于我们 */
function aboutUs() {
  lightHaptic();
  uni.showModal({
    title: t("settings.aboutTitle"),
    content: t("settings.aboutContent"),
    showCancel: false,
    confirmText: t("settings.gotIt"),
  });
}

/** 退出登录 */
function logout() {
  lightHaptic();
  uni.showModal({
    title: t("settings.logoutTitle"),
    content: t("settings.logoutConfirm"),
    success: (res) => {
      if (!res.confirm) return;
      // 修复（P1 BUG）：原直接置空 userSession，未通知后端、未清理本地状态。
      // 改为调用 sessionStore.logout() 统一处理：
      // 1. 调用 clientApi.logout() 清除本地 token + 异步通知后端 + 跳转登录页
      // 2. 清空 store 状态（userSession / profileBackgroundUrl 等）
      const sessionStore = useSessionStore();
      void sessionStore.logout().catch((error) => {
        if (isDev) {
          console.warn("[settings] logout 调用异常:", error);
        }
      });
    },
  });
}

/** 返回上一页 */
function goBack() {
  lightHaptic();
  uni.navigateBack({ delta: 1 });
}

/**
 * 任务 E4：跳转"反馈与帮助"（反馈历史页）。
 * 路径已在 pages.json 中注册：pages/feedback/history
 */
function goToFeedbackHelp() {
  lightHaptic();
  uni.navigateTo({ url: ROUTES.FEEDBACK_HISTORY });
}

/** 账号分组菜单项（使用 computed 以响应 locale 切换） */
const menuIcons = {
  moon: IMAGE_PATHS.ICONS_EMOJI.MOON,
  clipboard: IMAGE_PATHS.ICONS_EMOJI.CLIPBOARD,
  broom: IMAGE_PATHS.ICONS_EMOJI.BROOM,
  megaphone: IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE,
} as const;

/**
 * 2026-08-10 功能补齐：本周安排用户级开关。
 * 开启后首页展示课表区块（已报名活动 + 自编辑条目）；存储键与 home 页一致。
 */
const WEEKLY_SCHEDULE_KEY = STORAGE_KEYS.WEEKLY_SCHEDULE_ENABLED;
const weeklyScheduleEnabled = ref(false);
try {
  weeklyScheduleEnabled.value = uni.getStorageSync(WEEKLY_SCHEDULE_KEY) === "1";
} catch (_e) {
  weeklyScheduleEnabled.value = false;
}

/** 切换本周安排开关（即时生效并持久化） */
function toggleWeeklySchedule(e: Event | { detail?: { value?: boolean } }) {
  // uni-app switch change 事件：detail.value 为布尔（mp-weixin 与 H5 形态一致）
  const next = Boolean((e as { detail?: { value?: boolean } })?.detail?.value);
  weeklyScheduleEnabled.value = next;
  try {
    uni.setStorageSync(WEEKLY_SCHEDULE_KEY, next ? "1" : "0");
  } catch (_e) {
    // 存储失败不影响本次会话
  }
  uni.showToast({ title: next ? t("settings.weeklyScheduleOn") : t("settings.weeklyScheduleOff"), icon: "none" });
}

const accountMenus = computed<MenuItem[]>(() => [
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.SETTINGS,
    bgColor: "var(--c-tint-blue-soft, #E8F4FF)",
    label: t("settings.editProfile"),
    action: goToProfileSetup,
  },
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.VERIFICATION,
    bgColor: "var(--c-tint-pink-soft, #FFF0F5)",
    label: t("settings.verification"),
    path: "/pages/verification/index",
  },
]);

/** 关于分组菜单项（使用 computed 以响应 locale 切换） */
const aboutMenus = computed<MenuItem[]>(() => [
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.POSTS,
    bgColor: "var(--c-bg-page, #F4F6FA)",
    label: t("settings.userAgreement"),
    action: viewUserAgreement,
  },
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.VISITORS,
    bgColor: "var(--c-bg-page, #F4F6FA)",
    label: t("settings.privacyPolicy"),
    action: viewPrivacyPolicy,
  },
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.LAB,
    bgColor: "var(--c-bg-page, #F4F6FA)",
    label: t("settings.checkUpdate"),
    action: checkUpdate,
  },
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.INFO,
    bgColor: "var(--c-bg-page, #F4F6FA)",
    label: t("settings.aboutUs"),
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
  <view class="settings-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100">
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">{{ t('settings.navTitle') }}</text>
      <view class="nav-bar__placeholder" />
    </view>

    <!-- 顶部安全区占位 -->
    <view class="safe-top" />

    <!-- 任务 E4：反馈与帮助（一级菜单顶部入口） -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('settings.feedbackHelpSection') }}</text>
      </view>
      <view class="menu-group">
        <view
          class="menu-item press-feedback menu-item--no-border"
          hover-class="menu-item--hover"
          hover-stay-time="100"
          role="button"
          :aria-label="t('settings.feedbackHelp')"
          @tap="goToFeedbackHelp"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon settings-card--cream">
              <image class="menu-item__emoji-img" :src="menuIcons.megaphone" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ t('settings.feedbackHelp') }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 账号分组 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('settings.accountSection') }}</text>
      </view>
      <view class="menu-group">
        <view
          v-for="(item, index) in accountMenus"
          :key="index"
          class="menu-item press-feedback"
          :class="{ 'menu-item--no-border': index === accountMenus.length - 1 }"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" :style="{ background: item.bgColor }">
              <image class="menu-item__emoji-img" :src="item.icon" mode="aspectFit" alt="" />
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
        <text class="section__title-text">{{ t('settings.notificationSection') }}</text>
      </view>
      <view class="menu-group">
        <!-- 功能6：免打扰入口，点击跳转到 /pages/settings/dnd -->
        <view
          class="menu-item press-feedback"
          hover-class="menu-item--hover"
          hover-stay-time="100"
          @tap="goToDnd"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon settings-card--lavender">
              <image class="menu-item__emoji-img" :src="menuIcons.moon" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ t("dnd.title") }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
        <!-- 2026-08-10：本周安排用户级开关（开启后首页展示课表：报名活动 + 自编辑） -->
        <view class="menu-item menu-item--no-border">
          <view class="menu-item__left">
            <view class="menu-item__icon settings-card--mint">
              <image class="menu-item__emoji-img" :src="IMAGE_PATHS.ICONS_EMOJI.CALENDAR" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ t("settings.weeklySchedule") }}</text>
          </view>
          <switch
            :checked="weeklyScheduleEnabled"
            color="#3FCF8E"
            @change="toggleWeeklySchedule"
            :aria-label="t('settings.weeklySchedule')"
          />
        </view>
        <!-- 收尾轮：深色模式三态切换 -->
        <view
          class="menu-item press-feedback menu-item--no-border"
          hover-class="menu-item--hover"
          hover-stay-time="100"
          role="button"
          :aria-label="t('settings.themeAria')"
          @tap="handleThemeTap"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon settings-card--lavender">
              <image class="menu-item__emoji-img" :src="menuIcons.moon" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ t('settings.themeMode') }}</text>
          </view>
          <text class="menu-item__value">{{ themeModeText }}</text>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 隐私安全分组 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('settings.privacySection') }}</text>
      </view>
      <view class="menu-group">
        <view
          class="menu-item press-feedback menu-item--no-border"
          @tap="viewPrivacyPolicy"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon settings-card--page">
              <image class="menu-item__emoji-img" :src="menuIcons.clipboard" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ t('settings.privacyPolicy') }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 缓存管理分组 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('settings.storageSection') }}</text>
      </view>
      <view class="menu-group">
        <view
          class="menu-item press-feedback menu-item--no-border"
          @tap="clearCache"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon settings-card--lavender">
              <image class="menu-item__emoji-img" :src="menuIcons.broom" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ t('settings.clearCache') }}</text>
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
        <text class="section__title-text">{{ t('settings.aboutSection') }}</text>
      </view>
      <view class="menu-group">
        <view
          v-for="(item, index) in aboutMenus"
          :key="index"
          class="menu-item press-feedback"
          :class="{ 'menu-item--no-border': index === aboutMenus.length - 1 }"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="100"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" :style="{ background: item.bgColor }">
              <image class="menu-item__emoji-img" :src="item.icon" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ item.label }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-btn press-feedback" @tap="logout" hover-class="logout-btn--hover" hover-stay-time="100">
      <text class="logout-btn__text">{{ t('settings.logout') }}</text>
    </view>

    <!-- 底部版本信息 -->
    <view class="footer-version">
      <text class="footer-version__text">{{ t('settings.footerVersion') }}</text>
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
  background: linear-gradient(180deg, var(--c-bg-page, #f8fafc) 0%, var(--c-tint-blue-50, #eef2ff) 100%);
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
  background: var(--c-bg-container, #FFFFFF);
  box-shadow: var(--s-xs, 0 1rpx 2rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
  position: relative;
  z-index: 1;
}

.nav-bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);

  &--hover {
    background: var(--c-bg-page, #F4F6FA);
    transform: scale(0.94);
  }
}

.nav-bar__back-icon {
  font-size: var(--fs-7xl, 56rpx);
  color: var(--c-text-primary, #1F2329);
  font-weight: 300;
  line-height: 1;
}

.nav-bar__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1F2329);
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
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #5B6470);
  font-weight: 500;
}

/* ==================== 菜单分组 ==================== */
.menu-group {
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: var(--s-card-soft, 0 1rpx 2rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)), 0 4rpx 12rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid var(--c-border-light, #EEF0F4);
  transition: all var(--d-fast, 120ms) ease;

  &--no-border {
    border-bottom: none;
  }

  &--hover {
    transform: scale(0.98);
    background: var(--c-bg-surface, #FAFBFC);
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
  border-radius: var(--r-xl, 24rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 图标背景变体（替换原内联 style 硬编码色） */
.settings-card--cream {
  background: var(--c-tint-cream-50, #FFF8E7);
}

.settings-card--page {
  background: var(--c-bg-page, #F4F6FA);
}

.settings-card--lavender {
  background: var(--c-lavender-100, #EDE9FE);
}

.menu-item__emoji-img {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-primary, #1F2329);
}

.menu-item__label {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #1F2329);
  font-weight: 500;
}

.menu-item__right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.menu-item__value {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #9AA1AB);
}

.menu-item__arrow {
  font-size: var(--fs-3xl, 36rpx);
  color: var(--c-border-strong, #CBD5E1);
  font-weight: 300;
  line-height: 1;
}

/* ==================== 退出登录按钮 ==================== */
.logout-btn {
  position: relative;
  z-index: 1;
  margin: 32rpx 24rpx 0;
  padding: 28rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: var(--s-card-soft, 0 1rpx 2rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)), 0 4rpx 12rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;

  &--hover {
    transform: scale(0.98);
    background: var(--c-bg-surface, #FAFBFC);
  }
}

.logout-btn__text {
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-error, #E5454D);
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
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary, #9AA1AB);
}
</style>
