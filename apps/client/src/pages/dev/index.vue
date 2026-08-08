<!-- [DEV-MODE] 开发者导航页 - 用于测试和研究所有页面，后续需整体删除 -->
<script setup lang="ts">
/**
 * [DEV-MODE] 开发者模式 - 页面导航器
 * 列出所有已注册页面，方便快速跳转测试
 * 删除时：删除此文件 + pages.json中dev路由 + profile页入口按钮
 */
import { ref, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { isDev } from "../../config/env";
import { IMAGE_PATHS } from "../../config/images";
// 2026-08-07 超级测试账号体系：dev 页一键登录 / 会员身份切换
import { loginWithPhone } from "../../services/auth";
import { useSessionStore } from "../../stores/session";
import { replaceAppPath } from "../../utils/navigation";

const sessionStore = useSessionStore();

/**
 * 超级测试账号手机号（与后端种子 V2026.08.07.0004 一致：userId=100000）。
 * R4 凭据清理：不再硬编码真实手机号，改从构建环境变量 VITE_SUPER_TEST_PHONE 读取
 * （未配置时一键登录不可用，与下方密码读取方式一致）。
 */
const SUPER_ACCOUNT_PHONE = readSuperTestPhone();
/**
 * 超级测试账号密码。
 * 修复（R4-00040）：不再在源码中硬编码明文密码，改为从构建环境变量
 * VITE_SUPER_TEST_PASSWORD 读取（未配置时一键登录不可用）。
 */
const SUPER_ACCOUNT_PASSWORD = readSuperTestPassword();

/**
 * 读取超级测试账号手机号（构建环境变量 VITE_SUPER_TEST_PHONE）。
 * 读取方式与 readSuperTestPassword 保持一致。
 */
function readSuperTestPhone(): string {
  try {
    const viteEnv = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    const val = viteEnv?.VITE_SUPER_TEST_PHONE;
    if (typeof val === "string" && val.length > 0) return val;
  } catch (_e) {
    // ignore
  }
  try {
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
    const val = proc?.env?.VITE_SUPER_TEST_PHONE;
    if (typeof val === "string" && val.length > 0) return val;
  } catch (_e) {
    // ignore
  }
  return "";
}

/**
 * 读取超级测试账号密码（构建环境变量 VITE_SUPER_TEST_PASSWORD）。
 * 优先 import.meta.env（H5），回退 process.env（mp-weixin define 注入），
 * 与 config/env.ts 的读取方式保持一致；未配置时返回空串。
 */
function readSuperTestPassword(): string {
  try {
    const viteEnv = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    const val = viteEnv?.VITE_SUPER_TEST_PASSWORD;
    if (typeof val === "string" && val.length > 0) return val;
  } catch (_e) {
    // ignore
  }
  try {
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
    const val = proc?.env?.VITE_SUPER_TEST_PASSWORD;
    if (typeof val === "string" && val.length > 0) return val;
  } catch (_e) {
    // ignore
  }
  return "";
}

/** 超级账号登录中 */
const superLoginBusy = ref(false);

/** R4-00041：登录成功跳转定时器引用，卸载时清理（防止页面卸载后仍触发跳转） */
let superLoginNavTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 一键登录超级测试账号（手机号 + 密码）。
 * 登录成功跳转寻觅页；登录态恢复由 session guard 完成。
 *
 * 修复（R4-00040）：登录后门逻辑以运行时 isDev 守卫包裹，生产环境即使
 * 页面被编译进产物也直接拒绝执行；明文密码不再硬编码（见 SUPER_ACCOUNT_PASSWORD）。
 */
async function loginSuperAccount() {
  if (!isDev) {
    uni.showToast({ title: "超级账号登录仅限开发环境", icon: "none" });
    return;
  }
  if (superLoginBusy.value) return;
  // R4-00040：未注入构建环境变量时禁用一键登录（不再回退到明文硬编码密码）
  if (!SUPER_ACCOUNT_PASSWORD) {
    uni.showToast({ title: "未配置 VITE_SUPER_TEST_PASSWORD", icon: "none" });
    return;
  }
  superLoginBusy.value = true;
  try {
    await loginWithPhone(SUPER_ACCOUNT_PHONE, SUPER_ACCOUNT_PASSWORD);
    uni.showToast({ title: "超级账号登录成功", icon: "success" });
    if (superLoginNavTimer) clearTimeout(superLoginNavTimer);
    superLoginNavTimer = setTimeout(() => {
      replaceAppPath("/pages/discover/index");
      superLoginNavTimer = null;
    }, 800);
  } catch (error) {
    const message = error instanceof Error ? error.message : "登录失败";
    uni.showToast({ title: message, icon: "none" });
  } finally {
    superLoginBusy.value = false;
  }
}

/** 会员身份模拟开关（dev 页切换，vip store 读取） */
const devVipSim = ref(false);
const VIP_SIM_KEY = "campus-love:dev-vip-sim";

/**
 * 读取当前会员模拟状态。
 * 修复（R4-00173）：dev-vip-sim 存储键读写均加 isDev 守卫，非开发环境不读写存储。
 */
function loadVipSim() {
  if (!isDev) return;
  try {
    devVipSim.value = uni.getStorageSync(VIP_SIM_KEY) === "1";
  } catch (_e) {
    devVipSim.value = false;
  }
}

/**
 * 切换会员身份模拟（即时生效）。
 * 修复（R4-00173）：非开发环境拒绝切换，防止模拟标记污染生产存储。
 */
function toggleVipSim() {
  if (!isDev) {
    uni.showToast({ title: "会员模拟仅限开发环境", icon: "none" });
    return;
  }
  devVipSim.value = !devVipSim.value;
  try {
    uni.setStorageSync(VIP_SIM_KEY, devVipSim.value ? "1" : "0");
  } catch (_e) {
    // 存储失败不影响本次会话
  }
  uni.showToast({
    title: devVipSim.value ? "已模拟会员身份（解锁全开）" : "已恢复普通用户身份",
    icon: "none",
  });
}

/** 是否为超级测试账号（当前会话） */
const isSuperLoggedIn = ref(false);
/** onShow 中调用刷新登录态与会员模拟状态（R4-00042：移除无意义的 void 引用表达式） */
function refreshSuperState() {
  isSuperLoggedIn.value = sessionStore.isSuperTestAccount;
  loadVipSim();
}

interface PageItem {
  path: string;
  title: string;
  group: string;
  isTab?: boolean;
}

const pageVisible = ref(false);
/** SubTask 1.5.2：页面进入淡入定时器引用，用于卸载时清理 */
let pageEnterTimer: ReturnType<typeof setTimeout> | null = null;

onShow(() => {
  pageVisible.value = false;
  // 2026-08-07 超级测试账号：刷新登录态与会员模拟状态
  refreshSuperState();
  if (pageEnterTimer) clearTimeout(pageEnterTimer);
  pageEnterTimer = setTimeout(() => {
    pageEnterTimer = null;
    pageVisible.value = true;
  }, 30);
});

/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 * R4-00041：同时清理超级账号登录跳转定时器。
 */
onUnmounted(() => {
  if (pageEnterTimer) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
  }
  if (superLoginNavTimer) {
    clearTimeout(superLoginNavTimer);
    superLoginNavTimer = null;
  }
});

/** 全部已注册页面 */
const pages: PageItem[] = [
  // 主包页面
  { path: "/pages/login/index", title: "登录页", group: "主包" },
  { path: "/pages/discover/index", title: "寻觅", group: "主包", isTab: true },
  { path: "/pages/discover/history", title: "今日已看", group: "主包" },
  { path: "/pages/likes/index", title: "喜欢", group: "主包", isTab: true },
  { path: "/pages/village/index", title: "村口", group: "主包", isTab: true },
  { path: "/pages/village/post", title: "发布帖子", group: "主包" },
  { path: "/pages/village/detail", title: "帖子详情", group: "主包" },
  { path: "/pages/messages/index", title: "消息", group: "主包", isTab: true },
  { path: "/pages/profile/index", title: "我的", group: "主包", isTab: true },
  { path: "/pages/circles/index", title: "兴趣圈", group: "主包" },
  { path: "/pages/circles/topics", title: "话题列表", group: "主包" },
  { path: "/pages/circles/topic-detail", title: "话题详情", group: "主包" },
  { path: "/pages/circles/post-topic", title: "发布话题", group: "主包" },
  { path: "/pages/daily-question/index", title: "每日一问", group: "主包" },
  { path: "/pages/chat-session/index", title: "会话", group: "主包" },
  // 子包页面
  { path: "/subpackages/setup/profile/index", title: "基础资料", group: "设置子包" },
  { path: "/subpackages/setup/campus/index", title: "学校信息", group: "设置子包" },
  { path: "/subpackages/setup/schedule/index", title: "时间安排", group: "设置子包" },
  { path: "/subpackages/setup/recommend-pref/index", title: "推荐计划", group: "设置子包" },
  { path: "/subpackages/support/feedback/index", title: "反馈中心", group: "支持子包" },
  { path: "/subpackages/discover/discussions/index", title: "讨论圈", group: "发现子包" },
  { path: "/subpackages/discover/activities/index", title: "活动", group: "发现子包" },
];

/** 按分组归类 */
const grouped = pages.reduce<Record<string, PageItem[]>>((acc, p) => {
  (acc[p.group] ??= []).push(p);
  return acc;
}, {});

/** 导航到指定页面 */
function navigateTo(item: PageItem) {
  if (item.isTab) {
    uni.switchTab({ url: item.path });
  } else {
    uni.navigateTo({ url: item.path });
  }
}

/** 返回上一页 */
function goBack() {
  uni.navigateBack();
}
</script>

<template>
  <!-- #ifdef DEV -->
  <view class="dev-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部栏 -->
    <view class="dev-header">
      <view class="dev-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="dev-header__back-icon">←</text>
      </view>
      <text class="dev-header__title">DEV 开发者导航</text>
      <view class="dev-header__badge">
        <text class="dev-header__badge-text">TEST</text>
      </view>
    </view>

    <!-- 提示 -->
    <view class="dev-notice">
      <view class="dev-notice__row">
        <image class="dev-notice__icon" :src="IMAGE_PATHS.ICONS_EMOJI.WARNING" mode="aspectFit" alt="" />
        <text class="dev-notice__text">开发者模式 - 仅用于测试，上线前删除</text>
      </view>
    </view>

    <!-- 2026-08-07 超级测试账号体系：一键登录 / 会员身份切换 -->
    <view class="dev-group">
      <text class="dev-group__title">超级测试账号</text>
      <view class="dev-group__list" role="list">
        <view
          class="dev-item list-item"
          role="button"
          @tap="loginSuperAccount"
        >
          <view class="dev-item__left">
            <text class="dev-item__title">{{ isSuperLoggedIn ? '已登录超级账号' : '一键登录超级测试账号' }}</text>
            <text class="dev-item__path">{{ SUPER_ACCOUNT_PHONE }}（密码取自 VITE_SUPER_TEST_PASSWORD）</text>
          </view>
          <text class="dev-item__arrow">{{ superLoginBusy ? '…' : '→' }}</text>
        </view>
        <view
          class="dev-item list-item"
          role="button"
          @tap="toggleVipSim"
        >
          <view class="dev-item__left">
            <text class="dev-item__title">{{ devVipSim ? '当前：会员身份（解锁全开）' : '当前：普通用户身份' }}</text>
            <text class="dev-item__path">点击切换 会员/普通 身份（模拟前端展示效果）</text>
          </view>
          <text class="dev-item__arrow">→</text>
        </view>
      </view>
    </view>

    <!-- 页面分组列表 -->
    <view
      v-for="(items, group) in grouped" :key="group"
      class="dev-group"
    >
      <text class="dev-group__title">{{ group }}</text>
      <view class="dev-group__list" role="list">
        <view
          v-for="(item, idx) in items" :key="idx"
          class="dev-item list-item"
          :class="{ 'dev-item--tab': item.isTab }"
          @tap="navigateTo(item)"
        >
          <view class="dev-item__left">
            <text class="dev-item__title">{{ item.title }}</text>
            <text v-if="item.isTab" class="dev-item__tab-tag">Tab</text>
          </view>
          <text class="dev-item__path">{{ item.path }}</text>
          <text class="dev-item__arrow">→</text>
        </view>
      </view>
    </view>

    <!-- 底部安全区 -->
    <view class="safe-bottom" />
  </view>
  <!-- #endif -->
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand);
$green-light: var(--c-brand-50);
$pink-primary: var(--c-romance-500);
$pink-light: var(--c-tint-pink-soft);
$gold-vip: var(--c-vip-from);
$white: var(--c-neutral-0);
$bg-page: var(--c-bg-page);
$text-primary: var(--c-text-primary);
$text-secondary: var(--c-neutral-500);
$text-tertiary: var(--c-text-tertiary);
$divider: var(--c-neutral-200);
$card-soft-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);

.dev-page {
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
  background: $bg-page;
  padding-bottom: env(safe-area-inset-bottom);
}

.dev-header {
  display: flex;
  align-items: center;
  padding: calc(env(safe-area-inset-top) + 16rpx) 32rpx 24rpx;
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-300) 60%, var(--c-romance-300) 100%);
  gap: 16rpx;
}

.dev-header__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-mid-strong);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.dev-header__back:active {
  transform: scale(0.92);
  background: var(--c-overlay-white-bg-stronger);
}
/* #endif */

.dev-header__back-icon {
  font-size: var(--fs-3xl, 36rpx);
  /* R4-02528：品牌渐变底上的反色文字改用 --c-text-inverse（深色模式自动适配） */
  color: var(--c-text-inverse);
  font-weight: 600;
}

.dev-header__title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 700;
  /* R4-02528：品牌渐变底上的反色文字改用 --c-text-inverse（深色模式自动适配） */
  color: var(--c-text-inverse);
}

.dev-header__badge {
  padding: 8rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-white-bg-mid-strong);
  /* mp-weixin 不支持，H5 保留毛玻璃；白字+白底场景保留低不透明度避免文字不可见 */
  /* #ifdef H5 */
  backdrop-filter: blur(10rpx);
  /* #endif */
  /* #ifndef H5 */
  opacity: 0.96;
  /* #endif */
}

.dev-header__badge-text {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 700;
  /* R4-02528：品牌渐变底上的反色文字改用 --c-text-inverse（深色模式自动适配） */
  color: var(--c-text-inverse);
  letter-spacing: 2rpx;
}

.dev-notice {
  margin: 24rpx 32rpx 0;
  padding: 20rpx 24rpx;
  border-radius: var(--r-lg, 20rpx);
  background: linear-gradient(135deg, var(--c-tint-amber-50) 0%, var(--c-tint-orange-50) 100%);
  border: 2rpx solid var(--c-vip-border-light);
  box-shadow: $card-soft-shadow;
}

.dev-notice__row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.dev-notice__icon {
  width: 32rpx;
  height: 32rpx;
  color: $gold-vip;
  flex-shrink: 0;
}

.dev-notice__text {
  font-size: var(--fs-base, 24rpx);
  color: $gold-vip;
  font-weight: 500;
}

.dev-group {
  margin: 24rpx 32rpx 0;
}

.dev-group__title {
  display: block;
  font-size: var(--fs-base, 24rpx);
  color: $text-secondary;
  font-weight: 600;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}

.dev-group__list {
  border-radius: var(--r-xl, 24rpx);
  overflow: hidden;
  /* R4-02528：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  box-shadow: $card-soft-shadow;
}

.dev-item {
  display: flex;
  align-items: center;
  padding: 28rpx;
  border-bottom: 1rpx solid $bg-page;
  gap: 16rpx;
  transition: all var(--d-fast, 120ms) ease;
}

.dev-item:last-child {
  border-bottom: none;
}

/* #ifdef H5 */
.dev-item:active {
  background: $bg-page;
  transform: scale(0.98);
}
/* #endif */

.dev-item--tab {
  border-left: 6rpx solid $green-primary;
  /* R4-02528：渐变浅色端改用 --c-bg-container（深色模式自动适配） */
  background: linear-gradient(90deg, $green-light 0%, var(--c-bg-container) 30%);
}

.dev-item__left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 200rpx;
}

.dev-item__title {
  font-size: var(--fs-lg, 28rpx);
  color: $text-primary;
  font-weight: 500;
}

.dev-item__tab-tag {
  font-size: 18rpx;
  color: $green-primary;
  font-weight: 700;
  padding: 4rpx 12rpx;
  border-radius: var(--r-sm, 8rpx);
  background: $green-light;
}

.dev-item__path {
  flex: 1;
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dev-item__arrow {
  font-size: var(--fs-lg, 28rpx);
  color: $text-tertiary;
  font-weight: 600;
}

.safe-bottom {
  height: 48rpx;
}
</style>
