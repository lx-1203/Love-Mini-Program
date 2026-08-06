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
import { designTokens } from "../../theme/tokens";
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

/**
 * 消息通知开关状态
 *
 * <p>SubTask 5.5.1：初始值在 onMounted 中从本地存储读取，避免首次进入设置页时
 * 默认 true 与用户上次关闭的偏好不一致。</p>
 */
const notifyEnabled = ref(true);
/**
 * 隐私模式开关状态
 *
 * <p>SubTask 5.5.1：与 notifyEnabled 同理，初始值从本地存储恢复。</p>
 */
const privacyModeEnabled = ref(false);
/** 缓存大小（mock） */
const cacheSize = ref("23.5 MB");

/**
 * SubTask 5.5.1：从本地存储读取开关初始值。
 *
 * <p>读取失败（如首次启动无 key）时保持默认值，不阻塞页面渲染。</p>
 */
function loadTogglePreferences(): void {
  try {
    const notify = uni.getStorageSync(STORAGE_KEYS.NOTIFY_ENABLED);
    if (typeof notify === "boolean") {
      notifyEnabled.value = notify;
    }
  } catch (_e) {
    // 读取失败保持默认值，不影响页面使用
  }
  try {
    const privacy = uni.getStorageSync(STORAGE_KEYS.PRIVACY_MODE_ENABLED);
    if (typeof privacy === "boolean") {
      privacyModeEnabled.value = privacy;
    }
  } catch (_e) {
    // 读取失败保持默认值
  }
}

/**
 * SubTask 5.5.1：切换消息通知（乐观更新 + 失败回滚）。
 *
 * <p>流程：</p>
 * <ol>
 *   <li>lightHaptic 触发轻反馈</li>
 *   <li>立即更新 notifyEnabled（UI 即时反馈）</li>
 *   <li>toast 提示当前状态</li>
 *   <li>异步 uni.setStorage 持久化</li>
 *   <li>持久化失败时回滚 ref 至切换前的旧值，并提示「保存失败」</li>
 * </ol>
 */
function toggleNotify(e: Event) {
  lightHaptic();
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail;
  const newValue = !!detail?.value;
  // 保存旧值用于失败回滚
  const oldValue = notifyEnabled.value;
  // 乐观更新：立即生效
  notifyEnabled.value = newValue;
  uni.showToast({
    title: newValue ? t("settings.notifyEnabled") : t("settings.notifyDisabled"),
    icon: "none",
    duration: 1200,
  });
  // 异步持久化，失败时回滚
  uni.setStorage({
    key: STORAGE_KEYS.NOTIFY_ENABLED,
    data: newValue,
    fail: () => {
      // 持久化失败，回滚至旧值
      notifyEnabled.value = oldValue;
      uni.showToast({
        title: t("settings.saveFailed"),
        icon: "none",
        duration: 1500,
      });
    },
  });
}

/**
 * SubTask 5.5.1：切换隐私模式（乐观更新 + 失败回滚）。
 *
 * <p>与 {@link #toggleNotify} 同构，区别仅在持久化的 key 与 toast 文案。</p>
 */
function togglePrivacyMode(e: Event) {
  lightHaptic();
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail;
  const newValue = !!detail?.value;
  // 保存旧值用于失败回滚
  const oldValue = privacyModeEnabled.value;
  // 乐观更新：立即生效
  privacyModeEnabled.value = newValue;
  uni.showToast({
    title: newValue ? t("settings.privacyModeEnabled") : t("settings.privacyModeDisabled"),
    icon: "none",
    duration: 1200,
  });
  // 异步持久化，失败时回滚
  uni.setStorage({
    key: STORAGE_KEYS.PRIVACY_MODE_ENABLED,
    data: newValue,
    fail: () => {
      // 持久化失败，回滚至旧值
      privacyModeEnabled.value = oldValue;
      uni.showToast({
        title: t("settings.saveFailed"),
        icon: "none",
        duration: 1500,
      });
    },
  });
}

/**
 * SubTask 5.5.1：页面挂载时恢复开关偏好。
 *
 * <p>在 onMounted 中调用 loadTogglePreferences，确保从本地存储读取的最新值
 * 优先于 ref 的默认值，避免「用户关闭通知 → 退出应用 → 重启后开关显示打开」
 * 的不一致体验。</p>
 */
onMounted(() => {
  loadTogglePreferences();
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

/** 查看用户协议 */
function viewUserAgreement() {
  lightHaptic();
  uni.showModal({
    title: t("settings.userAgreementTitle"),
    content: t("settings.userAgreementContent"),
    showCancel: false,
    confirmText: t("settings.gotIt"),
  });
}

/** 查看隐私政策 */
function viewPrivacyPolicy() {
  lightHaptic();
  uni.showModal({
    title: t("settings.privacyPolicyTitle"),
    content: t("settings.privacyPolicyContent"),
    showCancel: false,
    confirmText: t("settings.gotIt"),
  });
}

/** 清除缓存 */
// TODO(mock): 当前为演示实现（延迟后置 0 KB）。真实链路应调用
// uni.getStorageInfo / uni.clearStorage 并统计实际大小（review #42）。
function clearCache() {
  lightHaptic();
  uni.showModal({
    title: t("settings.clearCacheTitle"),
    content: t("settings.clearCacheContent", { size: cacheSize.value }),
    confirmText: t("settings.clearCacheConfirm"),
    cancelText: t("common.cancel"),
    success: (res) => {
      if (res.confirm) {
        uni.showLoading({ title: t("settings.clearing") });
        const timer = setTimeout(() => {
          cacheSize.value = "0 KB";
          uni.hideLoading();
          uni.showToast({
            title: t("settings.cacheCleared"),
            icon: "success",
            duration: 1500,
          });
          operationTimers.delete(timer);
        }, 800);
        operationTimers.add(timer);
      }
    },
  });
}

/** 检查更新 */
// TODO(mock): 当前为演示实现（延迟后提示已是最新）。真实链路应接入
// 版本检查接口或 uni.getUpdateManager（review #43）。
function checkUpdate() {
  lightHaptic();
  uni.showLoading({ title: t("settings.checkingUpdate") });
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
        console.warn("[settings] logout 调用异常:", error);
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
  bell: IMAGE_PATHS.ICONS_EMOJI.BELL,
  moon: IMAGE_PATHS.ICONS_EMOJI.MOON,
  shield: IMAGE_PATHS.ICONS_EMOJI.SHIELD,
  clipboard: IMAGE_PATHS.ICONS_EMOJI.CLIPBOARD,
  broom: IMAGE_PATHS.ICONS_EMOJI.BROOM,
  megaphone: IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE,
} as const;

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
  <view class="settings-page page-fade-in">
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
          class="menu-item press-feedback list-item menu-item--no-border"
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
          class="menu-item press-feedback list-item"
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
        <view class="menu-item list-item">
          <view class="menu-item__left">
            <view class="menu-item__icon settings-card--cream">
              <image class="menu-item__emoji-img" :src="menuIcons.bell" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ t('settings.messageNotification') }}</text>
          </view>
          <switch
            :checked="notifyEnabled"
            :color="designTokens.color.brand[500]"
            @change="toggleNotify"
          />
        </view>
        <!-- 功能6：免打扰入口，点击跳转到 /pages/settings/dnd -->
        <view
          class="menu-item press-feedback list-item"
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
        <!-- 收尾轮：深色模式三态切换 -->
        <view
          class="menu-item list-item press-feedback"
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
        <view class="menu-item list-item menu-item--no-border">
          <view class="menu-item__left">
            <view class="menu-item__icon settings-card--brand">
              <image class="menu-item__emoji-img" :src="menuIcons.shield" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ t('settings.privacyMode') }}</text>
          </view>
          <switch
            :checked="privacyModeEnabled"
            :color="designTokens.color.brand[500]"
            @change="togglePrivacyMode"
          />
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
          class="menu-item press-feedback list-item menu-item--no-border"
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
          class="menu-item press-feedback list-item menu-item--no-border"
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
          class="menu-item press-feedback list-item"
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

.settings-card--brand {
  background: var(--c-bg-brand, #E8F8F0);
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
