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
import { storeToRefs } from "pinia";
import { useCampusStore, CAMPUS_CATEGORY_MAP, formatCampusTime } from "../../stores/campus";
import type { CampusTopicCategory } from "../../stores/campus";
import { openAppPath } from "../../utils/navigation";

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
  { key: "course_exchange", label: CAMPUS_CATEGORY_MAP.course_exchange, icon: "📖" },
  { key: "club_recruitment", label: CAMPUS_CATEGORY_MAP.club_recruitment, icon: "🎯" },
  { key: "campus_activity", label: CAMPUS_CATEGORY_MAP.campus_activity, icon: "🎉" },
  { key: "study_help", label: CAMPUS_CATEGORY_MAP.study_help, icon: "💡" },
  { key: "life_service", label: CAMPUS_CATEGORY_MAP.life_service, icon: "🛒" },
  { key: "alumni_news", label: CAMPUS_CATEGORY_MAP.alumni_news, icon: "📢" },
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
  <view class="campus-page">
    <!-- 顶部学校信息栏 + 认证状态 -->
    <view class="campus-header">
      <view class="header-top">
        <view class="header-school">
          <text class="school-icon">🏫</text>
          <text class="school-name">{{ certificationInfo?.schoolName || "广州大学" }}</text>
          <view class="cert-badge" :class="certStatusClass(certificationStatus)">
            <text class="cert-badge__text">{{ certStatusText(certificationStatus) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 未认证用户引导卡片 -->
    <view v-if="!isVerified" class="cert-guide-card">
      <view class="cert-guide-card__icon">🎓</view>
      <view class="cert-guide-card__body">
        <text class="cert-guide-card__title">完成学生认证，解锁校园专区</text>
        <text class="cert-guide-card__desc">上传学生证即可认证，与同校同学畅聊校园话题</text>
      </view>
      <view class="cert-guide-card__btn" @tap="goToCertification">
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
          <text class="category-tab__icon">{{ tab.icon }}</text>
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
        <text class="campus-state__icon">😥</text>
        <text class="campus-state__text">{{ errorMessage }}</text>
        <view class="campus-state__btn" @tap="campusStore.fetchCampusTopics()">
          <text class="campus-state__btn-text">重试</text>
        </view>
      </view>

      <!-- 话题列表 -->
      <scroll-view v-else class="topics-list" scroll-y @scrolltolower="campusStore.fetchCampusTopics(activeCategory, campusStore.topicPage + 1)">
        <!-- 空状态 -->
        <view v-if="topics.length === 0" class="topics-empty">
          <text class="topics-empty__icon">💬</text>
          <text class="topics-empty__title">暂无话题</text>
          <text class="topics-empty__desc">快来发布第一个话题吧</text>
        </view>

        <!-- 话题卡片 -->
        <view
          v-for="topic in topics"
          :key="topic.id"
          class="topic-card"
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
                <text class="replies-icon">💬</text>
                <text class="replies-count">{{ topic.replyCount }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="loading && topics.length > 0" class="loading-more">
          <view class="loading-spinner--small" />
          <text class="loading-more__text">加载中...</text>
        </view>

        <!-- 没有更多 -->
        <view v-else-if="!campusStore.topicHasMore && topics.length > 0" class="no-more">
          <text class="no-more__text">-- 没有更多了 --</text>
        </view>

        <!-- 底部留白（为FAB预留空间） -->
        <view class="list-bottom-spacer" />
      </scroll-view>
    </template>

    <!-- 未认证用户仍可浏览基本内容 -->
    <template v-if="!isVerified">
      <view class="campus-locked">
        <text class="locked-icon">🔒</text>
        <text class="locked-title">认证后可查看校园话题</text>
        <text class="locked-desc">完成学生认证后，即可参与校园话题讨论</text>
      </view>
    </template>

    <!-- 底部悬浮FAB - 发布话题 -->
    <view v-if="isVerified" class="fab-btn" @tap="goToPostTopic">
      <text class="fab-btn__icon">+</text>
      <text class="fab-btn__text">发布话题</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.campus-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
}

/* ========== 顶部学校信息栏 ========== */
.campus-header {
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 20rpx;
  background: linear-gradient(135deg, var(--td-brand-color-7), var(--td-brand-color-5));
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
  font-size: 36rpx;
}

.school-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.cert-badge {
  padding: 4rpx 18rpx;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
}

.cert-badge--verified {
  background: rgba(34, 197, 94, 0.3);
}

.cert-badge--pending {
  background: rgba(251, 191, 36, 0.35);
}

.cert-badge--rejected {
  background: rgba(239, 68, 68, 0.3);
}

.cert-badge--unverified {
  background: rgba(255, 255, 255, 0.2);
}

.cert-badge__text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 500;
}

/* ========== 认证引导卡片 ========== */
.cert-guide-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 20rpx 24rpx;
  padding: 28rpx 28rpx;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-radius: 20rpx;
  border: 1rpx solid rgba(37, 99, 235, 0.15);
}

.cert-guide-card__icon {
  font-size: 56rpx;
  flex-shrink: 0;
}

.cert-guide-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.cert-guide-card__title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.cert-guide-card__desc {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.5;
}

.cert-guide-card__btn {
  padding: 14rpx 28rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  flex-shrink: 0;
}

.cert-guide-card__btn-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
}

/* ========== 未认证锁定状态 ========== */
.campus-locked {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 80rpx 40rpx;
}

.locked-icon {
  font-size: 88rpx;
}

.locked-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.locked-desc {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
  text-align: center;
}

/* ========== 话题分类Tab ========== */
.category-tabs {
  display: flex;
  white-space: nowrap;
  padding: 20rpx 24rpx 16rpx;
  background: var(--td-bg-color-container);
  border-bottom: 1rpx solid var(--td-border-level-1-color);
}

.category-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  margin-right: 12rpx;
  transition: all 150ms ease;
  flex-shrink: 0;
  background: var(--td-bg-app-page);
}

.category-tab--active {
  background: var(--td-brand-color-1);
}

.category-tab__icon {
  font-size: 32rpx;
}

.category-tab__label {
  font-size: 24rpx;
  font-weight: 500;
  color: var(--td-text-color-secondary);
}

.category-tab--active .category-tab__label {
  color: var(--td-brand-color-7);
  font-weight: 600;
}

/* ========== 加载/错误/空状态 ========== */
.campus-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 80rpx 40rpx;
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid var(--td-border-level-1-color);
  border-top-color: var(--td-brand-color-7);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.campus-state__icon {
  font-size: 80rpx;
}

.campus-state__text {
  font-size: 28rpx;
  color: var(--td-text-color-placeholder);
  text-align: center;
}

.campus-state__btn {
  padding: 16rpx 48rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
}

.campus-state__btn-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

/* ========== 话题列表 ========== */
.topics-list {
  flex: 1;
  overflow-y: auto;
}

.topics-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 120rpx 40rpx;
}

.topics-empty__icon {
  font-size: 88rpx;
}

.topics-empty__title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.topics-empty__desc {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
}

.topic-card {
  margin: 12rpx 24rpx;
  padding: 24rpx 28rpx;
  background: var(--td-bg-color-container);
  border-radius: 20rpx;
  box-shadow: var(--td-shadow-1, 0 2rpx 12rpx rgba(0, 0, 0, 0.04));
  transition: transform 120ms ease;
}

.topic-card:active {
  transform: scale(0.99);
}

.topic-card__body {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.topic-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.topic-card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-card__time {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  flex-shrink: 0;
}

.topic-card__preview {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
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
}

.topic-card__author {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

.topic-card__replies {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.replies-icon {
  font-size: 22rpx;
}

.replies-count {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 加载更多 ========== */
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 30rpx 0;
}

.loading-spinner--small {
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid var(--td-border-level-1-color);
  border-top-color: var(--td-brand-color-7);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-more__text {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

.no-more {
  display: flex;
  justify-content: center;
  padding: 30rpx 0;
}

.no-more__text {
  font-size: 24rpx;
  color: var(--td-text-color-disabled);
}

/* ========== 底部留白 ========== */
.list-bottom-spacer {
  height: 120rpx;
}

/* ========== 底部悬浮FAB ========== */
.fab-btn {
  position: fixed;
  right: 32rpx;
  bottom: calc(env(safe-area-inset-bottom) + 120rpx);
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 20rpx 32rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.35);
  z-index: 20;
  transition: transform 120ms ease;
}

.fab-btn:active {
  transform: scale(0.95);
}

.fab-btn__icon {
  font-size: 36rpx;
  color: #ffffff;
  font-weight: 300;
  line-height: 1;
}

.fab-btn__text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}
</style>