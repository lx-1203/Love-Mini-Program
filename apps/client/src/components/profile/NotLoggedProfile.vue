<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";

const emit = defineEmits<{ (e: "goLogin"): void }>();

/** 2026-08-25 P0：返回上一页（规格书 11.1） */
function goBack() {
  uni.navigateBack({ delta: 1 }).catch(() => {
    uni.switchTab({ url: "/pages/home/index" }).catch(() => {
      uni.reLaunch({ url: "/pages/home/index" });
    });
  });
}

const STATS = [
  // 修复#4（第五轮 QA）：未登录版 4 列与已登录 MyStats 对齐「关注/粉丝/获赞/匹配」，数值保持 0 占位
  { label: "关注", iconSrc: IMAGE_PATHS.ICONS_EMOJI.USER, color: "#36C99A" },
  { label: "粉丝", iconSrc: IMAGE_PATHS.ICONS_EMOJI.GROUP, color: "#4D8DFF" },
  { label: "获赞", iconSrc: IMAGE_PATHS.ICONS_EMOJI.THUMBS_UP, color: "#FF9F43" },
  { label: "匹配", iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, color: "#FF6B81" },
];

const INTERACTIONS = [
  { label: "喜欢我的人", value: 0, iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, color: "#FF6B81" },
  { label: "我的匹配", value: 0, iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE, color: "#FF9F43" },
  { label: "我喜欢的人", value: 0, iconSrc: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, color: "#A29BFE" },
  { label: "最近访客", value: 0, iconSrc: IMAGE_PATHS.ICONS_EMOJI.EYE, color: "#4D8DFF" },
];

const STORIES = ["生活日常", "旅行足迹", "我的心愿"];
</script>

<template>
  <view class="not-logged-profile">
    <!-- 2026-08-26 P0：顶部 ‹ 返回 + 应用图标 + 设置（规格书 11.1 / 11.2） -->
    <view class="nlp-topbar">
      <view
        class="nlp-topbar__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="'返回'"
        @tap="goBack"
      >
        <text class="nlp-topbar__icon">‹</text>
      </view>
      <view class="nlp-topbar__right">
        <view
          class="nlp-topbar__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="'应用中心'"
          @tap="emit('goLogin')"
        >
          <image class="nlp-topbar__icon" :src="IMAGE_PATHS.ICONS_EMOJI.MOBILE" mode="aspectFit" alt="" />
        </view>
        <view
          class="nlp-topbar__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="'设置'"
          @tap="emit('goLogin')"
        >
          <image class="nlp-topbar__icon" :src="IMAGE_PATHS.ICONS_EMOJI.SETTINGS" mode="aspectFit" alt="" />
        </view>
      </view>
    </view>

    <!-- 头部：点击登录 -->
    <view class="nlp-header" @tap="emit('goLogin')">
      <view class="nlp-header__info">
        <text class="nlp-header__title">点击登录</text>
        <text class="nlp-header__sub">登录后遇见心动的TA</text>
      </view>
      <text class="nlp-header__arrow">›</text>
    </view>

    <!-- 资料完整度 -->
    <view class="nlp-card nlp-completion">
      <view class="nlp-completion__head">
        <text class="nlp-completion__title">资料完整度</text>
        <text class="nlp-completion__percent">0%</text>
      </view>
      <view class="nlp-completion__bar">
        <view class="nlp-completion__bar-inner" />
      </view>
      <text class="nlp-completion__tip">完善资料可以获得更多曝光和匹配机会</text>
      <view class="nlp-completion__btn" @tap.stop="emit('goLogin')">
        <text class="nlp-completion__btn-text">去完善</text>
      </view>
    </view>

    <!-- 统计 -->
    <view class="nlp-card nlp-stats">
      <view v-for="s in STATS" :key="s.label" class="nlp-stats__col">
        <view class="nlp-stats__icon" :style="{ background: `${s.color}1F` }">
          <image class="nlp-stats__icon-img" :src="s.iconSrc" mode="aspectFit" alt="" />
        </view>
        <text class="nlp-stats__value">0</text>
        <text class="nlp-stats__label">{{ s.label }}</text>
      </view>
    </view>

    <!-- 我的故事 -->
    <view class="nlp-section">
      <text class="nlp-section__title">我的故事</text>
      <scroll-view scroll-x class="nlp-stories" :show-scrollbar="false">
        <view class="nlp-stories__list">
          <view v-for="name in STORIES" :key="name" class="nlp-story" @tap="emit('goLogin')">
            <view class="nlp-story__img">
              <text class="nlp-story__plus">＋</text>
            </view>
            <text class="nlp-story__name">{{ name }}</text>
          </view>
          <view class="nlp-story nlp-story--add" @tap="emit('goLogin')">
            <text class="nlp-story__plus">＋</text>
            <text class="nlp-story__name">添加故事</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 我的互动 -->
    <view class="nlp-section">
      <text class="nlp-section__title">我的互动</text>
      <view class="nlp-card nlp-interactions">
        <view
          v-for="(item, i) in INTERACTIONS"
          :key="item.label"
          class="nlp-interaction"
          :class="{ 'nlp-interaction--last': i === INTERACTIONS.length - 1 }"
          @tap="emit('goLogin')"
        >
          <view class="nlp-interaction__icon" :style="{ background: `${item.color}1F` }">
            <image class="nlp-interaction__icon-img" :src="item.iconSrc" mode="aspectFit" alt="" />
          </view>
          <text class="nlp-interaction__label">{{ item.label }}</text>
          <text class="nlp-interaction__value">{{ item.value }}</text>
          <text class="nlp-interaction__arrow">›</text>
        </view>
      </view>
    </view>

    <view class="nlp-footer-btn" @tap="emit('goLogin')">
      <text class="nlp-footer-btn__text">登录</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.not-logged-profile {
  min-height: 100vh;
  background: linear-gradient(180deg, #E8FBF3 0%, #F7FAF9 40%);
  padding: 32rpx 24rpx 140rpx;
}

/* 2026-08-26 P0：顶部 ‹ 返回 + 应用图标 + 设置（规格书 11.1 / 11.2） */
.nlp-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 8rpx 24rpx;
}

.nlp-topbar__right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.nlp-topbar__btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nlp-topbar__icon {
  font-size: 32rpx;
  line-height: 1;
  color: #36C99A;
}

.nlp-topbar__btn:nth-child(2) .nlp-topbar__icon,
.nlp-topbar__btn:nth-child(3) .nlp-topbar__icon {
  font-size: 28rpx;
  color: #6B7571;
}

.nlp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 16rpx;
}

.nlp-header__title {
  font-size: 40rpx;
  font-weight: 800;
  color: #333A37;
}

.nlp-header__sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #6B7571;
}

.nlp-header__arrow {
  font-size: 44rpx;
  color: #36C99A;
}

.nlp-card {
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.nlp-completion {
  padding: 28rpx 32rpx;
}

.nlp-completion__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nlp-completion__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.nlp-completion__percent {
  font-size: 30rpx;
  font-weight: 800;
  color: #36C99A;
}

.nlp-completion__bar {
  height: 10rpx;
  margin-top: 20rpx;
  border-radius: 999rpx;
  background: #E8FBF3;
  overflow: hidden;
}

.nlp-completion__bar-inner {
  width: 0%;
  height: 100%;
  background: #36C99A;
}

.nlp-completion__tip {
  display: block;
  margin-top: 18rpx;
  font-size: 20rpx;
  color: #9AA39F;
}

.nlp-completion__btn {
  align-self: flex-end;
  margin-top: 18rpx;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #36C99A;
  display: inline-flex;
}

.nlp-completion__btn-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
}

.nlp-stats {
  display: flex;
  /* V-05（第五轮 QA）：未登录主页 4 icon 统计间距与已登录 MyStats 对齐 */
  padding: 32rpx 8rpx;
  margin-top: 24rpx;
}

.nlp-stats__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.nlp-stats__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nlp-stats__icon-text {
  font-size: 30rpx;
  font-weight: 800;
}

.nlp-stats__icon-img {
  width: 36rpx;
  height: 36rpx;
}

.nlp-stats__value {
  font-size: 34rpx;
  font-weight: 800;
  color: #333A37;
}

.nlp-stats__label {
  font-size: 22rpx;
  color: #9AA39F;
}

.nlp-section {
  margin-top: 32rpx;
}

.nlp-section__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.nlp-stories {
  width: 100%;
}

.nlp-stories__list {
  display: inline-flex;
  gap: 16rpx;
  padding-right: 16rpx;
}

.nlp-story {
  width: 220rpx;
  flex-shrink: 0;
}

.nlp-story__img {
  height: 300rpx;
  border-radius: 24rpx;
  background: #E8FBF3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nlp-story--add .nlp-story__img {
  border: 3rpx dashed #36C99A;
  background: #ffffff;
}

.nlp-story__plus {
  font-size: 56rpx;
  color: #36C99A;
}

.nlp-story__name {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #333333;
  font-weight: 600;
  text-align: center;
}

.nlp-interactions {
  overflow: hidden;
}

.nlp-interaction {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 26rpx 32rpx;
  border-bottom: 1rpx solid #EEF1F5;
}

.nlp-interaction--last {
  border-bottom: 0;
}

.nlp-interaction__icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nlp-interaction__icon-text {
  font-size: 26rpx;
  font-weight: 800;
}

.nlp-interaction__icon-img {
  width: 32rpx;
  height: 32rpx;
}

.nlp-interaction__label {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: #333A37;
}

.nlp-interaction__value {
  font-size: 26rpx;
  color: #9AA39F;
}

.nlp-interaction__arrow {
  font-size: 32rpx;
  color: #C6CDCC;
}

.nlp-footer-btn {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  bottom: calc(112rpx + env(safe-area-inset-bottom) + 20rpx);
  height: 92rpx;
  border-radius: 999rpx;
  background: #36C99A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nlp-footer-btn__text {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
