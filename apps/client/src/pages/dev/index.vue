<!-- [DEV-MODE] 开发者导航页 - 用于测试和研究所有页面，后续需整体删除 -->
<script setup lang="ts">
/**
 * [DEV-MODE] 开发者模式 - 页面导航器
 * 列出所有已注册页面，方便快速跳转测试
 * 删除时：删除此文件 + pages.json中dev路由 + profile页入口按钮
 */
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";

interface PageItem {
  path: string;
  title: string;
  group: string;
  isTab?: boolean;
}

const pageVisible = ref(false);
onShow(() => {
  pageVisible.value = false;
  setTimeout(() => {
    pageVisible.value = true;
  }, 30);
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
      <text class="dev-notice__text">⚠️ 开发者模式 - 仅用于测试，上线前删除</text>
    </view>

    <!-- 页面分组列表 -->
    <view
      v-for="(items, group) in grouped"
      :key="group"
      class="dev-group"
    >
      <text class="dev-group__title">{{ group }}</text>
      <view class="dev-group__list">
        <view
          v-for="(item, idx) in items"
          :key="idx"
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
</template>

<style scoped lang="scss">
$green-primary: #3FCF8E;
$green-light: #E8F8F0;
$pink-primary: #EC4899;
$pink-light: #FFF0F6;
$gold-vip: #C9A36A;
$white: #FFFFFF;
$bg-page: #F4F6FA;
$text-primary: #1F2329;
$text-secondary: #64748B;
$text-tertiary: #9AA1AB;
$divider: #E2E8F0;
$card-soft-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);

.dev-page {
  min-height: 100vh;
  background: $bg-page;
  padding-bottom: env(safe-area-inset-bottom);
}

.dev-header {
  display: flex;
  align-items: center;
  padding: calc(env(safe-area-inset-top) + 16rpx) 32rpx 24rpx;
  background: linear-gradient(135deg, $green-primary 0%, #7CD9A6 60%, #F9A8C4 100%);
  gap: 16rpx;
}

.dev-header__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  transition: all 0.15s ease;
}

.dev-header__back:active {
  transform: scale(0.92);
  background: rgba(255, 255, 255, 0.4);
}

.dev-header__back-icon {
  font-size: 36rpx;
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
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  /* mp-weixin 不支持，H5 保留毛玻璃；白字+白底场景保留低不透明度避免文字不可见 */
  // #ifdef H5
  backdrop-filter: blur(10rpx);
  // #endif
}

.dev-header__badge-text {
  font-size: 22rpx;
  font-weight: 700;
  color: $white;
  letter-spacing: 2rpx;
}

.dev-notice {
  margin: 24rpx 32rpx 0;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #FFF8E6 0%, #FFF0D6 100%);
  border: 2rpx solid rgba(201, 163, 106, 0.2);
  box-shadow: $card-soft-shadow;
}

.dev-notice__text {
  font-size: 24rpx;
  color: $gold-vip;
  font-weight: 500;
}

.dev-group {
  margin: 24rpx 32rpx 0;
}

.dev-group__title {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
  font-weight: 600;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}

.dev-group__list {
  border-radius: 24rpx;
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
  transition: all 0.15s ease;
}

.dev-item:last-child {
  border-bottom: none;
}

.dev-item:active {
  background: $bg-page;
  transform: scale(0.98);
}

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
  font-size: 28rpx;
  color: $text-primary;
  font-weight: 500;
}

.dev-item__tab-tag {
  font-size: 18rpx;
  color: $green-primary;
  font-weight: 700;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: $green-light;
}

.dev-item__path {
  flex: 1;
  font-size: 22rpx;
  color: $text-tertiary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dev-item__arrow {
  font-size: 28rpx;
  color: $text-tertiary;
  font-weight: 600;
}

.safe-bottom {
  height: 48rpx;
}
</style>
