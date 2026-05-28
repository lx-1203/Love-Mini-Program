<!-- [DEV-MODE] 开发者导航页 - 用于测试和研究所有页面，后续需整体删除 -->
<script setup lang="ts">
/**
 * [DEV-MODE] 开发者模式 - 页面导航器
 * 列出所有已注册页面，方便快速跳转测试
 * 删除时：删除此文件 + pages.json中dev路由 + profile页入口按钮
 */

interface PageItem {
  path: string;
  title: string;
  group: string;
  isTab?: boolean;
}

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
  <view class="dev-page">
    <!-- 顶部栏 -->
    <view class="dev-header">
      <view class="dev-header__back" @tap="goBack">
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
          class="dev-item"
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
.dev-page {
  min-height: 100vh;
  background: #0f172a;
  padding-bottom: env(safe-area-inset-bottom);
}

.dev-header {
  display: flex;
  align-items: center;
  padding: calc(env(safe-area-inset-top) + 16rpx) 32rpx 16rpx;
  background: #1e293b;
  gap: 16rpx;
}

.dev-header__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.08);
}

.dev-header__back:active {
  background: rgba(255, 255, 255, 0.15);
}

.dev-header__back-icon {
  font-size: 36rpx;
  color: #94a3b8;
}

.dev-header__title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 700;
  color: #f1f5f9;
}

.dev-header__badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  background: #ef4444;
}

.dev-header__badge-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}

.dev-notice {
  margin: 24rpx 32rpx 0;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: rgba(234, 179, 8, 0.12);
  border: 2rpx solid rgba(234, 179, 8, 0.3);
}

.dev-notice__text {
  font-size: 24rpx;
  color: #fbbf24;
  font-weight: 500;
}

.dev-group {
  margin: 24rpx 32rpx 0;
}

.dev-group__title {
  display: block;
  font-size: 22rpx;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 4rpx;
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}

.dev-group__list {
  border-radius: 16rpx;
  overflow: hidden;
  background: #1e293b;
}

.dev-item {
  display: flex;
  align-items: center;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.06);
  gap: 16rpx;
}

.dev-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.dev-item--tab {
  border-left: 6rpx solid #3b82f6;
}

.dev-item__left {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 200rpx;
}

.dev-item__title {
  font-size: 28rpx;
  color: #f1f5f9;
  font-weight: 500;
}

.dev-item__tab-tag {
  font-size: 18rpx;
  color: #3b82f6;
  font-weight: 700;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: rgba(59, 130, 246, 0.15);
}

.dev-item__path {
  flex: 1;
  font-size: 22rpx;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dev-item__arrow {
  font-size: 28rpx;
  color: #475569;
  font-weight: 600;
}

.safe-bottom {
  height: 32rpx;
}
</style>
