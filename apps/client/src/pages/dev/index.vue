<!-- [DEV-MODE] 开发者导航页 - 用于测试和研究所有页面，后续需整体删除 -->
<script setup lang="ts">
/**
 * [DEV-MODE] 开发者模式 - 页面导航器
 * 列出所有已注册页面，方便快速跳转测试
 * 删除时：删除此文件 + pages.json中dev路由 + profile页入口按钮
 */
import { ref, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { IMAGE_PATHS } from "../../config/images";

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
  if (pageEnterTimer) clearTimeout(pageEnterTimer);
  pageEnterTimer = setTimeout(() => {
    pageEnterTimer = null;
    pageVisible.value = true;
  }, 30);
});

/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 */
onUnmounted(() => {
  if (pageEnterTimer) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
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
  { path: "/pages/chat/index", title: "聊天", group: "主包" },
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
  color: $white;
  font-weight: 600;
}

.dev-header__title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 700;
  color: $white;
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
  color: $white;
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
  background: $white;
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
  background: linear-gradient(90deg, $green-light 0%, $white 30%);
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
