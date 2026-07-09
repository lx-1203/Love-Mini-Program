<script setup lang="ts">
/**
 * 校园社交专区首页
 *
 * 功能：
 * - 顶部展示用户学校信息和认证状态
 * - 未认证用户展示认证引导卡片（上传学生证入口）
 * - 已认证用户展示6个话题分类Tab + 话题列表
 * - 底部悬浮"发布话题"按钮（FAB样式）
 */
import { ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useCampusStore, CAMPUS_CATEGORY_MAP, formatCampusTime } from "../../stores/campus";
import type { CampusTopicCategory } from "../../stores/campus";
import { openAppPath } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";

const campusStore = useCampusStore();
const {
  activeCategory,
  topics,
  loading,
  errorMessage,
  certificationStatus,
  certificationInfo,
  isVerified,
} = storeToRefs(campusStore);

/** 6个话题分类Tab */
const categoryTabs: { key: CampusTopicCategory; label: string; icon: string }[] = [
  { key: "course_exchange", label: CAMPUS_CATEGORY_MAP.course_exchange, icon: IMAGE_PATHS.ICONS_COMMON.SCHOOL },
  { key: "club_recruitment", label: CAMPUS_CATEGORY_MAP.club_recruitment, icon: IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL },
  { key: "campus_activity", label: CAMPUS_CATEGORY_MAP.campus_activity, icon: IMAGE_PATHS.ICONS_COMMON.CELEBRATION },
  { key: "study_help", label: CAMPUS_CATEGORY_MAP.study_help, icon: "" },
  { key: "life_service", label: CAMPUS_CATEGORY_MAP.life_service, icon: IMAGE_PATHS.ICONS_COMMON.SHOP },
  { key: "alumni_news", label: CAMPUS_CATEGORY_MAP.alumni_news, icon: IMAGE_PATHS.ICONS_COMMON.NOTIFICATION },
];

/** 当前Tab滚动位置 */
const scrollLeft = ref(0);

/**
 * 切换话题分类Tab
 * @param category - 话题分类
 */
function switchCategory(category: CampusTopicCategory) {
  campusStore.setActiveCategory(category);
}

/**
 * 点击话题进入详情
 * @param topicId - 话题 ID
 */
function goToTopicDetail(topicId: string) {
  openAppPath(`/pages/campus/topic-detail?topicId=${topicId}`);
}

/**
 * 跳转到发布话题页面
 */
function goToPostTopic() {
  openAppPath("/pages/campus/post-topic");
}

/**
 * 跳转到学生证认证页面
 */
function goToCertification() {
  openAppPath("/pages/campus/certification");
}

/**
 * 获取认证状态对应的样式类
 */
function certStatusClass(status: string): string {
  switch (status) {
    case "verified":
      return "cert-badge--verified";
    case "pending":
      return "cert-badge--pending";
    case "rejected":
      return "cert-badge--rejected";
    default:
      return "cert-badge--unverified";
  }
}

/**
 * 获取认证状态描述
 */
function certStatusText(status: string): string {
  switch (status) {
    case "verified":
      return "已认证";
    case "pending":
      return "审核中";
    case "rejected":
      return "未通过";
    default:
      return "未认证";
  }
}

onMounted(() => {
  void campusStore.fetchCertificationStatus();
  void campusStore.fetchCampusTopics(activeCategory.value, 1);
});
</script>

<template>
  <view class="campus-page page-fade-in">
    <!-- 顶部学校信息栏 + 认证状态 -->
    <view class="campus-header">
      <view class="header-top">
        <view class="header-school">
          <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="school-icon" mode="aspectFit" />
          <text class="school-name">{{ certificationInfo?.schoolName || "广州大学" }}</text>
          <view class="cert-badge" :class="certStatusClass(certificationStatus)">
            <text class="cert-badge__text">{{ certStatusText(certificationStatus) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 未认证用户引导卡片 -->
    <view v-if="!isVerified" class="cert-guide-card card-base">
      <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="cert-guide-card__icon" mode="aspectFit" />
      <view class="cert-guide-card__body">
        <text class="cert-guide-card__title">完成学生认证，解锁校园专区</text>
        <text class="cert-guide-card__desc">上传学生证即可认证，与同校同学畅聊校园话题</text>
      </view>
      <view class="cert-guide-card__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goToCertification">
        <text class="cert-guide-card__btn-text">去认证</text>
      </view>
    </view>

    <!-- 已认证用户内容区 -->
    <template v-if="isVerified">
      <!-- 话题分类Tab -->
      <scroll-view class="category-tabs" scroll-x :scroll-left="scrollLeft" :show-scrollbar="false">
        <view
          v-for="tab in categoryTabs"
          :key="tab.key"
          class="category-tab"
          :class="{ 'category-tab--active': activeCategory === tab.key }"
          @tap="switchCategory(tab.key)"
        >
          <text class="category-tab__label">{{ tab.label }}</text>
        </view>
      </scroll-view>

      <!-- 加载状态 -->
      <view v-if="loading && topics.length === 0" class="campus-state">
        <view class="loading-spinner" />
        <text class="campus-state__text">正在加载话题...</text>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="errorMessage && topics.length === 0" class="campus-state">
        <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.CLOSE" custom-class="campus-state__icon" mode="aspectFit" />
        <text class="campus-state__text">{{ errorMessage }}</text>
        <view class="campus-state__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="campusStore.fetchCampusTopics()">
          <text class="campus-state__btn-text">重试</text>
        </view>
      </view>

      <!-- 话题列表 -->
      <scroll-view v-else class="topic-scroll" scroll-y>
        <view
          v-for="topic in topics"
          :key="topic.id"
          class="topic-card list-item"
          @tap="goToTopicDetail(topic.id)"
        >
          <view class="topic-card__body">
            <view class="topic-card__header">
              <text class="topic-card__title">{{ topic.title }}</text>
              <text class="topic-card__time">{{ formatCampusTime(topic.createdAt) }}</text>
            </view>
            <text class="topic-card__preview">{{ topic.contentPreview }}</text>
            <view class="topic-card__footer">
              <text class="topic-card__author">
                {{ topic.isAnonymous ? "匿名校友" : topic.author.name }}
              </text>
              <view class="topic-card__replies">
                <SafeImage :src="IMAGE_PATHS.ICONS_SOCIAL.COMMENT" custom-class="replies-icon" mode="aspectFit" />
                <text class="replies-count">{{ topic.replyCount }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="loading && topics.length > 0" class="loading-more">
          <view class="loading-spinner--small" />
          <text class="loading-more__text">加载中...</text>
        </view>
        <view v-else-if="!campusStore.topicHasMore && topics.length > 0" class="no-more">
          <text class="no-more__text">没有更多了</text>
        </view>
        <view class="list-bottom-spacer" />
      </scroll-view>
    </template>

    <!-- 底部FAB -->
    <view v-if="isVerified" class="campus-fab press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goToPostTopic">
      <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.EDIT" custom-class="campus-fab__icon" mode="aspectFit" />
    </view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: #3FCF8E;
$green-light: #E8F9F1;
$pink-primary: #EC4899;
$pink-light: #FCE7F3;
$white: #FFFFFF;
$bg-page: #F4F6FA;
$text-primary: #1F2937;
$text-secondary: #6B7280;
$text-tertiary: #9CA3AF;
$border-light: #F3F4F6;
$card-soft-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);

.campus-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: $bg-page;
}

/* ========== 顶部学校信息栏 ========== */
.campus-header {
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 28rpx;
  background: linear-gradient(135deg, $green-primary 0%, #7CD9A6 50%, #F9A8C4 100%);
}

.header-top {
  display: flex;
  align-items: center;
}

.header-school {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.school-icon {
  width: 40rpx;
  height: 40rpx;
}

.school-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
}

.cert-badge {
  padding: 6rpx 20rpx;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
}

.cert-badge--verified {
  background: rgba(255, 255, 255, 0.35);
}

.cert-badge--pending {
  background: rgba(251, 191, 36, 0.4);
}

.cert-badge--rejected {
  background: rgba(239, 68, 68, 0.4);
}

.cert-badge--unverified {
  background: rgba(255, 255, 255, 0.2);
}

.cert-badge__text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 600;
}

/* ========== 认证引导卡片 ========== */
.cert-guide-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 20rpx 24rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, $green-light, #F0FDF8);
  border-radius: 24rpx;
  border: none;
  box-shadow: $card-soft-shadow;
}

.cert-guide-card__icon {
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
}

.cert-guide-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.cert-guide-card__title {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-primary;
}

.cert-guide-card__desc {
  font-size: 24rpx;
  color: $text-secondary;
  line-height: 1.5;
}

.cert-guide-card__btn {
  padding: 16rpx 32rpx;
  border-radius: 999px;
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(63, 207, 142, 0.3);
  transition: all 0.15s ease;
}

.cert-guide-card__btn:active {
  transform: scale(0.96);
}

.cert-guide-card__btn-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
}

/* ========== 话题分类Tab ========== */
.category-tabs {
  display: flex;
  white-space: nowrap;
  padding: 24rpx 24rpx 20rpx;
  background: $white;
  box-shadow: $card-soft-shadow;
}

.category-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 28rpx;
  border-radius: 20rpx;
  margin-right: 16rpx;
  transition: all 200ms ease;
  flex-shrink: 0;
  background: $bg-page;
}

.category-tab:active {
  transform: scale(0.96);
}

.category-tab--active {
  background: linear-gradient(135deg, $green-light, #F0FDF8);
  box-shadow: 0 4rpx 12rpx rgba(63, 207, 142, 0.2);
}

.category-tab__label {
  font-size: 26rpx;
  font-weight: 500;
  color: $text-secondary;
}

.category-tab--active .category-tab__label {
  color: $green-primary;
  font-weight: 700;
}

/* ========== 加载/错误/空状态 ========== */
.campus-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28rpx;
  padding: 100rpx 40rpx;
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid $border-light;
  border-top-color: $green-primary;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.campus-state__icon {
  width: 100rpx;
  height: 100rpx;
  opacity: 0.5;
}

.campus-state__text {
  font-size: 28rpx;
  color: $text-tertiary;
  text-align: center;
  line-height: 1.6;
}

.campus-state__btn {
  padding: 20rpx 56rpx;
  border-radius: 999px;
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  box-shadow: 0 4rpx 16rpx rgba(63, 207, 142, 0.3);
  transition: all 0.15s ease;
}

.campus-state__btn:active {
  transform: scale(0.96);
}

.campus-state__btn-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

/* ========== 话题列表 ========== */
.topic-scroll {
  flex: 1;
}

.topic-card {
  margin: 16rpx 24rpx;
  padding: 28rpx;
  background: $white;
  border-radius: 24rpx;
  box-shadow: $card-soft-shadow;
  transition: all 150ms ease;
}

.topic-card:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.topic-card__body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.topic-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.topic-card__title {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-primary;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-card__time {
  font-size: 22rpx;
  color: $text-tertiary;
  flex-shrink: 0;
  background: $bg-page;
  padding: 4rpx 12rpx;
  border-radius: 999px;
}

.topic-card__preview {
  font-size: 26rpx;
  color: $text-secondary;
  line-height: 1.7;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.topic-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12rpx;
  border-top: 1rpx solid $border-light;
}

.topic-card__author {
  font-size: 24rpx;
  color: $pink-primary;
  font-weight: 500;
}

.topic-card__replies {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: $green-light;
  border-radius: 999px;
}

.replies-icon {
  width: 24rpx;
  height: 24rpx;
}

.replies-count {
  font-size: 24rpx;
  color: $green-primary;
  font-weight: 600;
}

/* ========== 加载更多 ========== */
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 36rpx 0;
}

.loading-spinner--small {
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid $border-light;
  border-top-color: $green-primary;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-more__text {
  font-size: 24rpx;
  color: $text-tertiary;
}

.no-more {
  display: flex;
  justify-content: center;
  padding: 36rpx 0;
}

.no-more__text {
  font-size: 24rpx;
  color: $text-tertiary;
  background: $bg-page;
  padding: 8rpx 24rpx;
  border-radius: 999px;
}

/* ========== 底部留白 ========== */
.list-bottom-spacer {
  height: 160rpx;
}

/* ========== 底部悬浮FAB ========== */
.campus-fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(env(safe-area-inset-bottom) + 140rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  box-shadow: 0 8rpx 28rpx rgba(63, 207, 142, 0.4);
  z-index: 20;
  transition: all 200ms ease;
}

.campus-fab:active {
  transform: scale(0.9);
}

.campus-fab__icon {
  width: 44rpx;
  height: 44rpx;
}
</style>