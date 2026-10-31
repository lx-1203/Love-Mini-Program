<script setup lang="ts">
/**
 * 设置页
 * 分组：账号管理、通知设置、隐私安全、缓存管理、关于
 * 所有菜单项点击有 press-feedback 动画 + lightHaptic 反馈
 *
 * 功能6：通知设置分组新增「免打扰」入口，跳转到 /subpackages/profile-extra/settings/dnd
 *
 * SubTask 5.5.1：消息通知/隐私模式开关采用乐观更新模式：
 * 1. 切换时立即更新本地 ref，UI 即时反馈
 * 2. 异步持久化到本地存储（uni.setStorage）
 * 3. 持久化失败时回滚 ref 至旧值，并提示用户
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { lightHaptic } from "../../../utils/haptic";
import { IMAGE_PATHS } from "../../../config/images";
import { useSessionStore } from "../../../stores/session";
import { STORAGE_KEYS, REBUILDABLE_CACHE_KEYS } from "../../../constants/storage-keys";
import { TOAST_DURATION } from "../../../constants/limits";
import { isDev } from "../../../config/env";
// P2 修复（2026-10-31）：清除缓存需覆盖运行时内存态缓存（TTL + 媒体签名 URL）
import { clearAllCaches } from "../../../utils/cache-ttl";
import { clearMediaSignCache } from "../../../utils/media-sign-cache";
// 收尾轮：深色模式三态切换（auto/dark/light）
import { useThemeStore } from "../../../stores/theme";
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
// Task 33：路由路径常量化，避免硬编码字符串
import { ROUTES, SUBPACKAGE_ROUTES } from "../../../constants/routes";
import { switchTabWithQuery } from "../../../utils/navigation";
// 批次 A5：商业化封存开关
import { useAppConfigStore } from "../../../stores/app-config";

/** 操作定时器集合，用于卸载时统一清理 */
const operationTimers = new Set<ReturnType<typeof setTimeout>>();

const { t } = useI18n();
// R3 补正：模板绑定了 menuStyleVars 但此前漏了实例化，--statusbar 恒未定义导致 nav-bar 顶进状态栏
const { styleVars: menuStyleVars } = useMenuButtonRect();
const themeStore = useThemeStore();
const appConfig = useAppConfigStore();

/** Switch 开关切换深色/浅色模式 */
function handleThemeSwitch(): void {
  themeStore.toggleTheme();
  uni.showToast({ title: themeStore.isDark ? t("settings.themeDark") : t("settings.themeLight"), icon: "none" });
}

interface MenuItem {
  icon: string;
  bgColor: string;
  label: string;
  value?: string;
  action?: () => void;
  path?: string;
  /** TabBar 页面传参（switchTab 不支持 query，走 storage 桥接） */
  tabQuery?: Record<string, string>;
}

/** 缓存大小（R4-00064：真实读取 uni.getStorageInfo 统计） */
const cacheSize = ref("0 KB");

/**
 * 可清除的缓存键。
 *
 * P2 修复（2026-10-31）：原硬编码 `[STORAGE_KEYS.USER_CACHE]`，而 USER_CACHE
 * 在全仓**没有任何写入方**（grep 确认：仅本行与常量表自身出现）⇒ 点「清除缓存」
 * 实际只删了一个从不存在的键，却照样 toast「已清除」，等于骗用户。
 * 现改为 storage-keys.ts 登记的 REBUILDABLE_CACHE_KEYS——每一项都有真实写入方
 * 且可从后端/重算恢复（不含登录态/偏好/草稿，草稿属登出清理范围）。
 */
const CACHE_KEYS_TO_CLEAR: readonly string[] = REBUILDABLE_CACHE_KEYS;

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
  // MP-R7-EDITPAGE：设置页「编辑资料」与我的页/任务页入口同语义——必须带
  // entry=edit 进编辑模式。原裸路径进向导模式：卡片显示「第 n/4 步」进度条、
  // 按钮为「保存并继续」，保存后被 redirectTo 进注册向导下一步（校园认证/
  // 时间安排），编辑资料的用户被误投递进注册流程，流程断裂。
  uni.navigateTo({ url: `${SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE}?entry=edit` });
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
 *
 * P2 修复（2026-10-31）：除本地存储里的可重建缓存键外，一并清掉两个运行时内存缓存
 * （utils/cache-ttl 的 stale-while-revalidate 结果、media-sign-cache 的签名 URL）——
 * 它们才是这个 app 切 tab 时占内存/占请求的大头，且不在 getStorageInfo 的统计里。
 * 这样「已清除」的 toast 不再挂在一次 no-op 上。
 *
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
      let removedKeyCount = 0;
      for (const key of CACHE_KEYS_TO_CLEAR) {
        try {
          const existing = uni.getStorageSync(key);
          if (existing !== "" && existing !== null && existing !== undefined) {
            removedKeyCount += 1;
          }
          uni.removeStorageSync(key);
        } catch (_e) {
          // 单个 key 删除失败不阻塞整体清除
        }
      }
      // 运行时内存缓存（与登出/切账号同一批清理入口，本页不依赖网络重拉）
      try {
        clearAllCaches();
        clearMediaSignCache();
      } catch (_e) {
        // 内存缓存清理失败不影响存储键已清除的事实
      }
      uni.hideLoading();
      // 清除后重新统计真实大小
      refreshCacheSize();
      if (isDev) {
        console.warn("[settings] 清除缓存完成，移除存储键数:", removedKeyCount);
      }
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

/** 返回上一页（MP-R1-SETTINGS-002：深链直达栈=1 时 navigateBack 无反应，兜底回「我的」Tab） */
function goBack() {
  lightHaptic();
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: "/pages/profile/index" });
  }
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
    path: "/subpackages/profile-extra/verification/index",
  },
]);

/** 社交资产分组菜单项（2026-08-14：从主页收敛到设置页；批次 A5：钱包入口受商业化开关控制） */
const socialMenus = computed<MenuItem[]>(() => {
  // 2026-09-06 产品收敛：任务中心 / 我的圈子 / 情感实验室 暂不对外展示（需求方要求隐藏）
  const items: MenuItem[] = [];
  // 批次 A5：虚拟货币钱包仅在 commerce.coin 开关开启时展示
  if (appConfig.isCommerceOn("coin")) {
    items.push({
      icon: IMAGE_PATHS.ICONS_PROFILE.PHOTO_WALL,
      bgColor: "var(--c-tint-cream-50, #FFF8E7)",
      label: t("profile.coinBalance"),
      path: ROUTES.WALLET,
    });
  }
  items.push(
    // MP-R1-SETTINGS-003：「我的动态」改跳本人主页（switchTab 桥接）——原跳
    // village/index?tab=mine，但村口频道体系（today/interest/school/activity/hot）无 mine，
    // tab 参数被 onLoad 完全忽略，落到无过滤的今日广场，入口语义丢失。
    // 本人主页（我的 Tab）承载「我的帖子」列表（MyStory 区块），为语义正确的落点。
    {
      icon: IMAGE_PATHS.ICONS_PROFILE.POSTS,
      bgColor: "var(--c-tint-pink-soft, #FFF0F5)",
      label: t("profile.myPosts"),
      path: ROUTES.TAB.PROFILE,
      tabQuery: { source: "my-posts" },
    },
    { icon: IMAGE_PATHS.ICONS_PROFILE.VISITORS, bgColor: "var(--c-bg-brand, #E8FAF3)", label: t("profile.visitors"), path: "/subpackages/profile-extra/profile/visitors" },
    { icon: IMAGE_PATHS.ICONS_PROFILE.CLOCK, bgColor: "var(--c-tint-blue-soft, #E8F4FF)", label: t("profile.browseHistory"), path: ROUTES.VILLAGE.HISTORY },
    { icon: IMAGE_PATHS.ICONS_PROFILE.ALBUM, bgColor: "var(--c-tint-pink-soft, #FFF0F5)", label: t("profile.albumTitle"), path: "/subpackages/profile-extra/profile/album" },
    { icon: IMAGE_PATHS.ICONS_PROFILE.SETTINGS, bgColor: "var(--c-tint-cream-50, #FFF8E7)", label: t("profile.scheduleSetting"), path: "/subpackages/setup/schedule/index" },
  );
  return items;
});

/** 隐私安全分组菜单项（2026-08-14：从主页收敛到设置页） */
const privacyMenus = computed<MenuItem[]>(() => [
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.SETTINGS,
    bgColor: "var(--c-lavender-100, #EDE9FE)",
    label: t("profile.privacyPermission"),
    path: ROUTES.PROFILE.PRIVACY,
  },
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.LAB,
    bgColor: "var(--c-tint-pink-50, #FCE4EC)",
    label: t("profile.safetyCenter"),
    path: ROUTES.SECURITY,
  },
]);

/** 推荐给好友（2026-08-14：从主页菜单迁入；复用微信分享菜单） */
function shareFriend(): void {
  lightHaptic();
  uni.showShareMenu({
    withShareTicket: true,
    menus: ["shareAppMessage", "shareTimeline"],
  });
}

/** 关于分组菜单项（使用 computed 以响应 locale 切换） */
const aboutMenus = computed<MenuItem[]>(() => [
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.POSTS,
    bgColor: "var(--c-bg-page, #EEF7F2)",
    label: t("settings.userAgreement"),
    action: viewUserAgreement,
  },
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.VISITORS,
    bgColor: "var(--c-bg-page, #EEF7F2)",
    label: t("settings.privacyPolicy"),
    action: viewPrivacyPolicy,
  },
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.LAB,
    bgColor: "var(--c-bg-page, #EEF7F2)",
    label: t("settings.checkUpdate"),
    action: checkUpdate,
  },
  {
    icon: IMAGE_PATHS.ICONS_PROFILE.INFO,
    bgColor: "var(--c-bg-page, #EEF7F2)",
    label: t("settings.aboutUs"),
    action: aboutUs,
  },
]);

/** 点击菜单项统一处理 */
function handleMenuTap(item: MenuItem) {
  lightHaptic();
  if (item.path) {
    if (item.tabQuery && Object.keys(item.tabQuery).length > 0) {
      // TabBar 页面传参（switchTab 不支持 query，走 storage 桥接）
      switchTabWithQuery(item.path, item.tabQuery);
    } else {
      uni.navigateTo({ url: item.path });
    }
  } else if (item.action) {
    item.action();
  }
}
</script>

<template>
  <view class="settings-page" :style="menuStyleVars">
    <!-- R8-L09-D10 / R8-L09-D11（层级遮挡 P1）：整块头部常驻吸顶。
         原 nav-bar 是 position:relative ⇒ 自然流滚动到底帧整条白底导航随文档移出（顶帧实测
         y=46-87），列表内容直接顶进系统状态栏带（「免打扰」墨迹 y=10-36 与时钟 x=0-32/y=17-28
         叠印、页标题「设置」滚失），且「本周安排」行开关（实测 x=287-370 / y=49-99）被固定胶囊
         （实测 x=265-369 / y=25-94）压住 82×45px。现把「状态栏带 + 88rpx 导航」包进
         position:sticky 的 .page-header（不透明底承接滚动内容）——头部下缘即 statusbar+44px
         = 胶囊底沿，两帧都不再有节点进入胶囊带（safe-top 本身保持全站 `+ 0rpx` 口径，见 :780）。 -->
    <view class="page-header">
      <!-- 顶部安全区占位（必须先于 nav-bar：navigationStyle=custom 下导航栏若顶到 y=0
           会与系统时间/刘海叠印，返回键看似"消失"） -->
      <view class="safe-top" />

      <!-- 顶部导航栏 -->
      <view class="nav-bar">
        <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="40">
          <text class="nav-bar__back-icon">‹</text>
        </view>
        <text class="nav-bar__title">{{ t('settings.navTitle') }}</text>
        <view class="nav-bar__placeholder" />
      </view>
    </view>

    <!-- 任务 E4：反馈与帮助（一级菜单顶部入口） -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('settings.feedbackHelpSection') }}</text>
      </view>
      <view class="menu-group">
        <view
          class="menu-item press-feedback"
          hover-class="menu-item--hover"
          hover-stay-time="40"
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
        <!-- 2026-08-14：推荐给好友（从主页菜单迁入） -->
        <view
          class="menu-item press-feedback menu-item--no-border"
          hover-class="menu-item--hover"
          hover-stay-time="40"
          role="button"
          :aria-label="t('profile.shareFriend')"
          @tap="shareFriend"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon settings-card--cream">
              <image class="menu-item__emoji-img" :src="IMAGE_PATHS.ICONS_PROFILE.SHARE" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ t('profile.shareFriend') }}</text>
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
          hover-stay-time="40"
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

    <!-- 社交资产分组（2026-08-14：主页功能入口收敛到设置页） -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">{{ t('settings.socialAssetsSection') }}</text>
      </view>
      <view class="menu-group">
        <view
          v-for="(item, index) in socialMenus"
          :key="index"
          class="menu-item press-feedback"
          :class="{ 'menu-item--no-border': index === socialMenus.length - 1 }"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="40"
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
        <!-- 功能6：免打扰入口，点击跳转到 /subpackages/profile-extra/settings/dnd -->
        <view
          class="menu-item press-feedback"
          hover-class="menu-item--hover"
          hover-stay-time="40"
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
            class="menu-item__switch menu-item__switch--weekly"
            :checked="weeklyScheduleEnabled"
            color="#36C99A"
            @change="toggleWeeklySchedule"
            :aria-label="t('settings.weeklySchedule')"
          />
        </view>
        <!-- 深色模式开关 -->
        <view
          class="menu-item menu-item--no-border"
          :aria-label="t('settings.themeAria')"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon settings-card--lavender">
              <image class="menu-item__emoji-img" :src="menuIcons.moon" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ t('settings.themeMode') }}</text>
          </view>
          <switch
            class="menu-item__switch menu-item__switch--theme"
            :checked="themeStore.isDark"
            color="#36C99A"
            @change="handleThemeSwitch"
            :aria-label="t('settings.themeAria')"
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
          v-for="(item, index) in privacyMenus"
          :key="index"
          class="menu-item press-feedback"
          @tap="handleMenuTap(item)"
          hover-class="menu-item--hover"
          hover-stay-time="40"
        >
          <view class="menu-item__left">
            <view class="menu-item__icon" :style="{ background: item.bgColor }">
              <image class="menu-item__emoji-img" :src="item.icon" mode="aspectFit" alt="" />
            </view>
            <text class="menu-item__label">{{ item.label }}</text>
          </view>
          <text class="menu-item__arrow">›</text>
        </view>
        <!-- MP-R2-SETTINGS-001：重复的「隐私政策」入口已删（关于分组已有同款，两处独立维护易漂移） -->
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
          hover-stay-time="40"
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
          hover-stay-time="40"
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
    <view class="logout-btn press-feedback" @tap="logout" hover-class="logout-btn--hover" hover-stay-time="40">
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
  /* R8-L09-D07（颜色 token P2）：原写 linear-gradient(180deg, --c-bg-page, --c-tint-blue-50)，
     同帧左缘实测 y=150 → #EAF3F1（浅绿）、y=700 → #E9F5F7（b 比 r 高 14）——一屏之内从规范浅绿
     漂到蓝底，正是 §1.1 原则1 禁止的页面间断层。收成单色 var(--c-bg-page)（#EEF7F2）。 */
  background: var(--c-bg-page, #EEF7F2);
  box-sizing: border-box;
  position: relative;
}

/* ==================== 顶部导航栏 ==================== */
/* R8-L09-D10/D11：状态栏带 + 导航整块吸顶，不透明底承接滚动内容 */
.page-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--c-bg-container, #FFFFFF);
  flex-shrink: 0;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* R8-L09-D09 收尾：同页 gutter 三套口径里的第二套——.nav-bar 原裸写 24rpx(12px)，
     而 .section 已收到 --page-padding(32rpx=16px)，返回钮会比下方卡片左缘再外突 4px。
     统一取同一令牌，页头与分组卡左缘对齐（.menu-item 的 28rpx 是卡内文气，不属 gutter，不动）。 */
  padding: 0 var(--page-padding, 32rpx);
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
    background: var(--c-bg-page, #EEF7F2);
    transform: scale(0.94);
  }
}

.nav-bar__back-icon {
  font-size: var(--fs-7xl, 56rpx);
  color: var(--c-text-primary, #222222);
  font-weight: 300;
  line-height: 1;
}

.nav-bar__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.nav-bar__placeholder {
  width: 64rpx;
  height: 64rpx;
}

/* ==================== 安全区占位 ==================== */
.safe-top {
  /* --statusbar 兜底：开发者工具 var(--statusbar, env(safe-area-inset-top)) 恒 0，仅 env 会叠印状态栏
     R8-L09-D10/D11：胶囊避让由「吸顶头部整块常驻」兑现，不靠把 safe-top 抬高。
     头部总高 = statusbar + .nav-bar 88rpx(=44px)，微信胶囊（32px 高、居中于 44px 导航带）
     底沿 = statusbar + 44px ⇒ 头部下缘正好压在胶囊底沿上，滚动内容一律从胶囊下方经过。
     此处若再补 88rpx（上一发改动），导航标题会落到 y=statusbar+44..88、比胶囊低 44px
     且头部白带翻倍——与全站口径冲突（verification/index.vue:805、real-name.vue:654、
     vip/index.vue:771、market/detail/index.vue:465 一律 `+ 0rpx`），故收回到 0rpx。 */
  height: calc(var(--statusbar, env(safe-area-inset-top)) + 0rpx);
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
  /* R8-L09-D09（间距 P2）：水平外边距原为裸 24rpx ⇒ 分组卡实测左缘 x=13 / 右缘 x=365，
     比全站 --page-padding（32rpx=16px，design-variables.scss:575）少 4px，与同页 .nav-bar
     的 24rpx、.menu-item 的 28rpx 凑成三套 gutter。按建议改法收到 --page-padding。 */
  margin: 24rpx var(--page-padding, 32rpx) 0;
}

.section__title {
  padding: 0 12rpx 12rpx;
}

.section__title-text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #666666);
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
  border-bottom: 1rpx solid var(--c-border-light, #EEF2F0);
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
  background: var(--c-bg-page, #EEF7F2);
}

.settings-card--lavender {
  background: var(--c-lavender-100, #EDE9FE);
}

/* R17（样式断引用）：:578「本周安排」图标格用的就是这个类，但全仓（本页 scoped 块 +
   styles/ + theme/ + uni.scss）`--mint` 定义 0 处 ⇒ 芯片实测无底色，同组其余芯片
   （cream / lavender）都有底，唯独这一格是裸图标。
   处置=补规则而非删类名：删类名等于承认「这格不该有底」，与同组设计相反，且类名本身
   已表达清楚 mint 档语义。底色取登记处已有的绿底令牌 --c-schedule-mint
   （theme/design-variables.scss:629 = $schedule-mint #DCEFE2，深色档由 styles/tokens.scss:339
   翻成 #1B2E24 自动跟随）——名实相符，且本行正是「本周安排」课表开关，色语义对得上；
   未写任何私有色值。 */
.settings-card--mint {
  background: var(--c-schedule-mint, #DCEFE2);
}

.menu-item__emoji-img {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-primary, #222222);
}

.menu-item__label {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #222222);
  font-weight: 500;
}

.menu-item__right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.menu-item__value {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #6B7571);
}

.menu-item__arrow {
  font-size: var(--fs-3xl, 36rpx);
  /* R8-L09-D08（可达性 P2）：原取 var(--c-border-strong, #C2CAC6) —— 一个描边令牌被当文字色用，
     18px 细体描出来实测最深像素 #D5DBD8，落在白卡上只有 1.4:1，「可进入」提示整页几乎不可见。
     按建议改法升到文字档 --c-text-tertiary（#6B7571，对 #FFFFFF 卡底计算值 4.76:1 ≥ 4.5:1）。 */
  color: var(--c-text-tertiary, #6B7571);
  font-weight: 300;
  line-height: 1;
}

/* ==================== 退出登录按钮 ==================== */
.logout-btn {
  position: relative;
  z-index: 1;
  margin: 32rpx var(--page-padding, 32rpx) 0;
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
  color: var(--c-text-tertiary, #6B7571);
}
</style>



