<!--
  全功能展示页（超级管理员展示版）
  - 仅在 VITE_SHOWCASE_MODE=true 的展示构建中作为主入口使用
  - 覆盖 pages.json 全部页面，按业务模块分组，演示者可一键跳转体验
  - TabBar 页面使用 switchTab，其余使用 navigateTo
-->
<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { isShowcaseMode } from "../../config/showcase";

// R4-00039：展示页文案全部收敛到 i18n 资源（showcase.*），标题随语言切换
const { t } = useI18n();

interface ShowcaseItem {
  /** 页面路径（switchTab 需要无前导斜杠一致性由 navigate 函数处理） */
  path: string;
  /** 展示标题 i18n key（showcase.groups.<id>.items.<key>.title） */
  titleKey: string;
  /** 副标题说明 i18n key */
  descKey: string;
  /** chip 背景色 token */
  chipBg: string;
  /** 是否为 TabBar 页面（switchTab 跳转） */
  isTab?: boolean;
}

interface ShowcaseGroup {
  id: string;
  /** 分组标题 i18n key */
  titleKey: string;
  /** 分组副标题 i18n key */
  subtitleKey: string;
  accent: string;
  items: ShowcaseItem[];
}

/** 分组：按业务模块组织全部页面（文案 key 见 i18n showcase.groups.*） */
const groups: ShowcaseGroup[] = [
  {
    id: "journey",
    titleKey: "showcase.groups.journey.title",
    subtitleKey: "showcase.groups.journey.subtitle",
    accent: "linear-gradient(135deg, #3B9DE5, #5BC0DE)",
    items: [
      { path: "/pages/login/index", titleKey: "showcase.groups.journey.items.login.title", descKey: "showcase.groups.journey.items.login.desc", chipBg: "var(--c-tint-blue-soft, #E8F4FF)", isTab: false },
      { path: "/subpackages/setup/profile/index", titleKey: "showcase.groups.journey.items.profile.title", descKey: "showcase.groups.journey.items.profile.desc", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/subpackages/setup/campus/index", titleKey: "showcase.groups.journey.items.campus.title", descKey: "showcase.groups.journey.items.campus.desc", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/subpackages/setup/recommend-pref/index", titleKey: "showcase.groups.journey.items.recommendPref.title", descKey: "showcase.groups.journey.items.recommendPref.desc", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/pages/campus/certification", titleKey: "showcase.groups.journey.items.campusCert.title", descKey: "showcase.groups.journey.items.campusCert.desc", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/pages/verification/index", titleKey: "showcase.groups.journey.items.verification.title", descKey: "showcase.groups.journey.items.verification.desc", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/subpackages/setup/schedule/index", titleKey: "showcase.groups.journey.items.schedule.title", descKey: "showcase.groups.journey.items.schedule.desc", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
    ],
  },
  {
    id: "match",
    titleKey: "showcase.groups.match.title",
    subtitleKey: "showcase.groups.match.subtitle",
    accent: "linear-gradient(135deg, #FF8C42, #FFB06A)",
    items: [
      { path: "/pages/discover/index", titleKey: "showcase.groups.match.items.discover.title", descKey: "showcase.groups.match.items.discover.desc", chipBg: "var(--c-tint-orange-50, #FFF4EC)", isTab: true },
      { path: "/pages/discover/history", titleKey: "showcase.groups.match.items.history.title", descKey: "showcase.groups.match.items.history.desc", chipBg: "var(--c-tint-orange-50, #FFF4EC)" },
      { path: "/pages/likes/index", titleKey: "showcase.groups.match.items.likes.title", descKey: "showcase.groups.match.items.likes.desc", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/heart-signals/index", titleKey: "showcase.groups.match.items.heartSignals.title", descKey: "showcase.groups.match.items.heartSignals.desc", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/love-center/nearby", titleKey: "showcase.groups.match.items.nearby.title", descKey: "showcase.groups.match.items.nearby.desc", chipBg: "var(--c-tint-orange-50, #FFF4EC)" },
    ],
  },
  {
    id: "home",
    titleKey: "showcase.groups.home.title",
    subtitleKey: "showcase.groups.home.subtitle",
    accent: "linear-gradient(135deg, #3FCF8E, #5BC0DE)",
    items: [
      { path: "/pages/home/index", titleKey: "showcase.groups.home.items.home.title", descKey: "showcase.groups.home.items.home.desc", chipBg: "var(--c-bg-brand, #E8F8F0)", isTab: true },
      { path: "/pages/daily-question/index", titleKey: "showcase.groups.home.items.dailyQuestion.title", descKey: "showcase.groups.home.items.dailyQuestion.desc", chipBg: "var(--c-bg-brand, #E8F8F0)" },
      { path: "/pages/love-center/index", titleKey: "showcase.groups.home.items.loveCenter.title", descKey: "showcase.groups.home.items.loveCenter.desc", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/love-center/consulting", titleKey: "showcase.groups.home.items.consulting.title", descKey: "showcase.groups.home.items.consulting.desc", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/love-center/mbti", titleKey: "showcase.groups.home.items.mbti.title", descKey: "showcase.groups.home.items.mbti.desc", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/subpackages/discover/activities/index", titleKey: "showcase.groups.home.items.activities.title", descKey: "showcase.groups.home.items.activities.desc", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
      { path: "/pages/activities/detail", titleKey: "showcase.groups.home.items.activityDetail.title", descKey: "showcase.groups.home.items.activityDetail.desc", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
    ],
  },
  {
    id: "chat",
    titleKey: "showcase.groups.chat.title",
    subtitleKey: "showcase.groups.chat.subtitle",
    accent: "linear-gradient(135deg, #7C6CF0, #A78BFA)",
    items: [
      { path: "/pages/messages/index", titleKey: "showcase.groups.chat.items.messages.title", descKey: "showcase.groups.chat.items.messages.desc", chipBg: "var(--c-tint-purple-soft, #F3EFFF)", isTab: true },
      { path: "/pages/chat-session/index", titleKey: "showcase.groups.chat.items.session.title", descKey: "showcase.groups.chat.items.session.desc", chipBg: "var(--c-tint-purple-soft, #F3EFFF)" },
      { path: "/pages/chat/video-call", titleKey: "showcase.groups.chat.items.videoCall.title", descKey: "showcase.groups.chat.items.videoCall.desc", chipBg: "var(--c-tint-purple-soft, #F3EFFF)" },
    ],
  },
  {
    id: "community",
    titleKey: "showcase.groups.community.title",
    subtitleKey: "showcase.groups.community.subtitle",
    accent: "linear-gradient(135deg, #10B981, #34D399)",
    items: [
      { path: "/pages/village/index", titleKey: "showcase.groups.community.items.village.title", descKey: "showcase.groups.community.items.village.desc", chipBg: "var(--c-bg-brand, #E8F8F0)", isTab: true },
      { path: "/pages/village/post", titleKey: "showcase.groups.community.items.post.title", descKey: "showcase.groups.community.items.post.desc", chipBg: "var(--c-bg-brand, #E8F8F0)" },
      { path: "/pages/village/detail", titleKey: "showcase.groups.community.items.detail.title", descKey: "showcase.groups.community.items.detail.desc", chipBg: "var(--c-bg-brand, #E8F8F0)" },
      { path: "/pages/village/tag-posts", titleKey: "showcase.groups.community.items.tagPosts.title", descKey: "showcase.groups.community.items.tagPosts.desc", chipBg: "var(--c-bg-brand, #E8F8F0)" },
      { path: "/pages/circles/index", titleKey: "showcase.groups.community.items.circles.title", descKey: "showcase.groups.community.items.circles.desc", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/circles/topics", titleKey: "showcase.groups.community.items.topics.title", descKey: "showcase.groups.community.items.topics.desc", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/circles/topic-detail", titleKey: "showcase.groups.community.items.topicDetail.title", descKey: "showcase.groups.community.items.topicDetail.desc", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/circles/post-topic", titleKey: "showcase.groups.community.items.postTopic.title", descKey: "showcase.groups.community.items.postTopic.desc", chipBg: "var(--c-tint-pink-soft, #FFF0F5)" },
      { path: "/pages/campus/index", titleKey: "showcase.groups.community.items.campus.title", descKey: "showcase.groups.community.items.campus.desc", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/pages/campus/post-topic", titleKey: "showcase.groups.community.items.campusPostTopic.title", descKey: "showcase.groups.community.items.campusPostTopic.desc", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/pages/campus/topic-detail", titleKey: "showcase.groups.community.items.campusTopicDetail.title", descKey: "showcase.groups.community.items.campusTopicDetail.desc", chipBg: "var(--c-tint-blue-soft, #E8F4FF)" },
      { path: "/subpackages/discover/discussions/index", titleKey: "showcase.groups.community.items.discussions.title", descKey: "showcase.groups.community.items.discussions.desc", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
      { path: "/pages/feedback/history", titleKey: "showcase.groups.community.items.feedbackHistory.title", descKey: "showcase.groups.community.items.feedbackHistory.desc", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
    ],
  },
  {
    id: "commerce",
    titleKey: "showcase.groups.commerce.title",
    subtitleKey: "showcase.groups.commerce.subtitle",
    accent: "linear-gradient(135deg, #F59E0B, #FBBF24)",
    items: [
      { path: "/pages/vip/index", titleKey: "showcase.groups.commerce.items.vip.title", descKey: "showcase.groups.commerce.items.vip.desc", chipBg: "var(--c-vip-bg-soft, #FEF3C7)" },
      { path: "/pages/wallet/index", titleKey: "showcase.groups.commerce.items.wallet.title", descKey: "showcase.groups.commerce.items.wallet.desc", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
      { path: "/pages/vip/promo-code", titleKey: "showcase.groups.commerce.items.promoCode.title", descKey: "showcase.groups.commerce.items.promoCode.desc", chipBg: "var(--c-vip-bg-soft, #FEF3C7)" },
      { path: "/pages/vip/bills", titleKey: "showcase.groups.commerce.items.bills.title", descKey: "showcase.groups.commerce.items.bills.desc", chipBg: "var(--c-vip-bg-soft, #FEF3C7)" },
      { path: "/pages/shop/index", titleKey: "showcase.groups.commerce.items.shop.title", descKey: "showcase.groups.commerce.items.shop.desc", chipBg: "var(--c-tint-cream-50, #FFF8E7)" },
    ],
  },
  {
    id: "profile",
    titleKey: "showcase.groups.profile.title",
    subtitleKey: "showcase.groups.profile.subtitle",
    accent: "linear-gradient(135deg, #64748B, #94A3B8)",
    items: [
      { path: "/pages/profile/index", titleKey: "showcase.groups.profile.items.profile.title", descKey: "showcase.groups.profile.items.profile.desc", chipBg: "var(--c-neutral-100, #F1F5F9)", isTab: true },
      { path: "/pages/profile/visitors", titleKey: "showcase.groups.profile.items.visitors.title", descKey: "showcase.groups.profile.items.visitors.desc", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/pages/profile/album", titleKey: "showcase.groups.profile.items.album.title", descKey: "showcase.groups.profile.items.album.desc", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/pages/profile/tasks", titleKey: "showcase.groups.profile.items.tasks.title", descKey: "showcase.groups.profile.items.tasks.desc", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/pages/profile/privacy", titleKey: "showcase.groups.profile.items.privacy.title", descKey: "showcase.groups.profile.items.privacy.desc", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/pages/settings/index", titleKey: "showcase.groups.profile.items.settings.title", descKey: "showcase.groups.profile.items.settings.desc", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/pages/settings/dnd", titleKey: "showcase.groups.profile.items.dnd.title", descKey: "showcase.groups.profile.items.dnd.desc", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/subpackages/support/feedback/index", titleKey: "showcase.groups.profile.items.feedback.title", descKey: "showcase.groups.profile.items.feedback.desc", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/subpackages/legal/privacy/index", titleKey: "showcase.groups.profile.items.legalPrivacy.title", descKey: "showcase.groups.profile.items.legalPrivacy.desc", chipBg: "var(--c-neutral-100, #F1F5F9)" },
      { path: "/subpackages/legal/agreement/index", titleKey: "showcase.groups.profile.items.agreement.title", descKey: "showcase.groups.profile.items.agreement.desc", chipBg: "var(--c-neutral-100, #F1F5F9)" },
    ],
  },
];

/** 图标 chip 字符（取翻译后标题首字，视觉占位） */
function itemChar(item: ShowcaseItem): string {
  return t(item.titleKey).charAt(0);
}

const pageVisible = ref(false);
let pageEnterTimer: ReturnType<typeof setTimeout> | null = null;

onShow(() => {
  // 非展示构建包直达本页时（如被扫码/分享）回落到发现页，保证正式包无展示痕迹
  if (!isShowcaseMode) {
    uni.switchTab({ url: "/pages/discover/index" });
    return;
  }
  pageVisible.value = false;
  if (pageEnterTimer) clearTimeout(pageEnterTimer);
  pageEnterTimer = setTimeout(() => {
    pageEnterTimer = null;
    pageVisible.value = true;
  }, 30);
});

onUnmounted(() => {
  if (pageEnterTimer) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
  }
});

/** 跳转到目标页面（Tab 用 switchTab，其余 navigateTo） */
function navigate(item: ShowcaseItem) {
  if (item.isTab) {
    uni.switchTab({ url: item.path });
  } else {
    uni.navigateTo({ url: item.path });
  }
}

/** 返回上一页 */
function goBack() {
  uni.navigateBack({
    fail: () => {
      // 无上级页面（如直达）时回首页
      uni.switchTab({ url: "/pages/discover/index" });
    },
  });
}
</script>

<template>
  <view class="sc-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部品牌栏 -->
    <view class="sc-header">
      <view
        class="sc-header__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="goBack"
      >
        <text class="sc-header__back-icon">←</text>
      </view>
      <view class="sc-header__titles">
        <text class="sc-header__title">{{ t('showcase.title') }}</text>
        <text class="sc-header__subtitle">{{ t('showcase.subtitle') }}</text>
      </view>
      <view class="sc-header__badge">
        <text class="sc-header__badge-text">SHOWCASE</text>
      </view>
    </view>

    <!-- 说明卡片 -->
    <view class="sc-notice card-stagger">
      <view class="sc-notice__dot" />
      <view class="sc-notice__body">
        <text class="sc-notice__title">{{ t('showcase.noticeTitle') }}</text>
        <text class="sc-notice__text">
          {{ t('showcase.noticeText') }}
        </text>
      </view>
    </view>

    <!-- 分组卡片 -->
    <view
      v-for="group in groups"
      :key="group.id"
      class="sc-group"
    >
      <view class="sc-group__head">
        <view class="sc-group__accent" :style="{ background: group.accent }" />
        <text class="sc-group__title">{{ t(group.titleKey) }}</text>
        <text class="sc-group__subtitle">{{ t(group.subtitleKey) }}</text>
        <text class="sc-group__count">{{ t('showcase.groupCount', { n: group.items.length }) }}</text>
      </view>

      <view class="sc-group__list" role="list">
        <view
          v-for="(item, idx) in group.items"
          :key="idx"
          class="sc-item list-item"
          :class="{ 'sc-item--tab': item.isTab }"
          hover-class="sc-item--active"
          hover-stay-time="120"
          role="listitem"
          :aria-label="t(item.titleKey)"
          @tap="navigate(item)"
        >
          <view class="sc-item__chip" :style="{ background: item.chipBg }">
            <text class="sc-item__chip-text">{{ itemChar(item) }}</text>
          </view>
          <view class="sc-item__body">
            <view class="sc-item__title-row">
              <text class="sc-item__title">{{ t(item.titleKey) }}</text>
              <text v-if="item.isTab" class="sc-item__tab-tag">{{ t('showcase.tabTag') }}</text>
            </view>
            <text class="sc-item__desc">{{ t(item.descKey) }}</text>
          </view>
          <text class="sc-item__arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 底部安全区 -->
    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
$white: var(--c-neutral-0);
$bg-page: var(--c-bg-page);
$text-primary: var(--c-text-primary);
$text-secondary: var(--c-neutral-500);
$text-tertiary: var(--c-text-tertiary);
$divider: var(--c-neutral-200);
$card-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);

.sc-page {
  min-height: 100%;
  background: $bg-page;
  padding-bottom: env(safe-area-inset-bottom);
}

/* ---------- 顶部品牌栏 ---------- */
.sc-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 28rpx;
  /* R4 审计：品牌蓝渐变 #3B9DE5/#5BC0DE/#7C6CF0 无对应 design token，保留原值 */
  background: linear-gradient(135deg, #3B9DE5 0%, #5BC0DE 55%, #7C6CF0 115%);
  border-radius: 0 0 36rpx 36rpx;
}

.sc-header__back {
  width: 68rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.28));
  flex-shrink: 0;
  transition: all var(--d-fast, 120ms) ease;
}

.sc-header__back-icon {
  font-size: var(--fs-3xl, 36rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.sc-header__titles {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.sc-header__title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
  letter-spacing: 1rpx;
}

.sc-header__subtitle {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-overlay-white-text-soft, rgba(255, 255, 255, 0.82));
}

.sc-header__badge {
  padding: 8rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.28));
  flex-shrink: 0;
}

.sc-header__badge-text {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  color: var(--c-text-inverse);
  letter-spacing: 2rpx;
}

/* ---------- 说明卡片 ---------- */
.sc-notice {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  margin: 28rpx 32rpx 0;
  padding: 24rpx;
  border-radius: var(--r-xl, 24rpx);
  background: linear-gradient(135deg, var(--c-tint-amber-50, #FFFBEB) 0%, var(--c-tint-orange-50, #FFF4EC) 100%);
  border: 2rpx solid var(--c-vip-border-light, rgba(245, 158, 11, 0.25));
  box-shadow: $card-shadow;
}

.sc-notice__dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-warning, #F59E0B);
  margin-top: 12rpx;
  flex-shrink: 0;
}

.sc-notice__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.sc-notice__title {
  font-size: var(--fs-base, 26rpx);
  font-weight: 700;
  color: var(--c-text-warning-dark, #92400e);
}

.sc-notice__text {
  font-size: var(--fs-sm, 22rpx);
  line-height: 1.6;
  color: var(--c-text-warning-dark, #92400e);
}

/* ---------- 分组 ---------- */
.sc-group {
  margin: 32rpx 32rpx 0;
}

.sc-group__head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.sc-group__accent {
  width: 10rpx;
  height: 32rpx;
  border-radius: var(--r-sm, 8rpx);
}

.sc-group__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: $text-primary;
}

.sc-group__subtitle {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  flex: 1;
}

.sc-group__count {
  font-size: var(--fs-xs, 20rpx);
  color: $text-tertiary;
  background: var(--c-neutral-100, #F1F5F9);
  padding: 4rpx 14rpx;
  border-radius: var(--r-full, 9999rpx);
}

.sc-group__list {
  border-radius: var(--r-xl, 24rpx);
  overflow: hidden;
  background: var(--c-neutral-0);
  box-shadow: $card-shadow;
}

/* ---------- 列表项 ---------- */
.sc-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-bottom: 1rpx solid $bg-page;
  transition: background var(--d-fast, 120ms) ease;
}

.sc-item:last-child {
  border-bottom: none;
}

.sc-item--active {
  background: var(--c-neutral-50, #F8FAFC);
}

.sc-item--tab {
  border-left: 6rpx solid var(--c-info-500, #3B82F6);
}

.sc-item__chip {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-lg, 20rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sc-item__chip-text {
  font-size: var(--fs-lg, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.sc-item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.sc-item__title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.sc-item__title {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: $text-primary;
}

.sc-item__tab-tag {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-info-500, #3B82F6);
  font-weight: 700;
  padding: 2rpx 10rpx;
  border-radius: var(--r-sm, 8rpx);
  background: var(--c-tint-blue-soft, #E8F4FF);
}

.sc-item__desc {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-item__arrow {
  font-size: var(--fs-2xl, 32rpx);
  color: var(--c-neutral-300, #CBD5E1);
  font-weight: 600;
  flex-shrink: 0;
}

.safe-bottom {
  height: 48rpx;
}
</style>
