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
import { useI18n } from "vue-i18n";
// 修复 no-duplicate-imports：合并 ../../stores/campus 的重复 import
import { useCampusStore, CAMPUS_CATEGORY_MAP, formatCampusTime, type CampusTopicCategory } from "../../stores/campus";
import { openAppPath } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";

const campusStore = useCampusStore();
const { t } = useI18n();
const {
  activeCategory,
  topics,
  loading,
  errorMessage,
  certificationStatus,
  certificationInfo,
  isVerified,
  topicHasMore,
} = storeToRefs(campusStore);

/** 6个话题分类Tab（R4-00109：模板不使用 icon 字段，删除死字段） */
const categoryTabs: { key: CampusTopicCategory; label: string }[] = [
  { key: "course_exchange", label: CAMPUS_CATEGORY_MAP.course_exchange },
  { key: "club_recruitment", label: CAMPUS_CATEGORY_MAP.club_recruitment },
  { key: "campus_activity", label: CAMPUS_CATEGORY_MAP.campus_activity },
  { key: "study_help", label: CAMPUS_CATEGORY_MAP.study_help },
  { key: "life_service", label: CAMPUS_CATEGORY_MAP.life_service },
  { key: "alumni_news", label: CAMPUS_CATEGORY_MAP.alumni_news },
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
      return t("campus.index.statusVerified");
    case "pending":
      return t("campus.index.statusPending");
    case "rejected":
      return t("campus.index.statusRejected");
    default:
      return t("campus.index.statusUnverified");
  }
}

/**
 * 话题列表滚动到底：加载下一页（真实请求，page 由 store 维护）
 * infra R2-00077: 增加 in-flight 防抖，避免快速滚动触发重复请求
 */
let topicLoadMoreInFlight = false;
function onLoadMoreTopic() {
  if (campusStore.loading || !topicHasMore.value || topicLoadMoreInFlight) return;
  topicLoadMoreInFlight = true;
  void campusStore.fetchCampusTopics(activeCategory.value, campusStore.topicPage + 1).finally(() => {
    topicLoadMoreInFlight = false;
  });
}

onMounted(async () => {
  // 修复（review）：两个请求聚合等待，避免任一请求 reject 产生未处理 Promise
  await Promise.allSettled([
    campusStore.fetchCertificationStatus(),
    campusStore.fetchCampusTopics(activeCategory.value, 1),
  ]);
});
</script>

<template>
  <view class="campus-page page-fade-in">
    <!-- 顶部学校信息栏 + 认证状态 -->
    <view class="campus-header">
      <view class="header-top">
        <view class="header-school">
          <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="school-icon" mode="aspectFit" />
          <text class="school-name">{{ certificationInfo?.schoolName || t('campus.index.defaultSchool') }}</text>
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
        <text class="cert-guide-card__title">{{ t('campus.index.certGuideTitle') }}</text>
        <text class="cert-guide-card__desc">{{ t('campus.index.certGuideDesc') }}</text>
      </view>
      <view class="cert-guide-card__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goToCertification">
        <text class="cert-guide-card__btn-text">{{ t('campus.index.certGuideBtn') }}</text>
      </view>
    </view>

    <!-- 已认证用户内容区 -->
    <template v-if="isVerified">
      <!-- 话题分类Tab -->
      <scroll-view class="category-tabs" scroll-x :scroll-left="scrollLeft" :show-scrollbar="false">
        <view
          v-for="tab in categoryTabs" :key="tab.key"
          class="category-tab"
          :class="{ 'category-tab--active': activeCategory === tab.key }"
          @tap="switchCategory(tab.key)"
        >
          <text class="category-tab__label">{{ tab.label }}</text>
        </view>
      </scroll-view>

      <!-- 加载状态 -->
      <view v-if="loading && topics.length === 0" class="campus-state" role="status" aria-live="polite">
        <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('campus.index.loadingAria')" />
        <text class="campus-state__text">{{ t('campus.index.loadingTopics') }}</text>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="errorMessage && topics.length === 0" class="campus-state" role="status" aria-live="polite">
        <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.CLOSE" custom-class="campus-state__icon" mode="aspectFit" />
        <text class="campus-state__text">{{ errorMessage }}</text>
        <view class="campus-state__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="campusStore.fetchCampusTopics()">
          <text class="campus-state__btn-text">{{ t('campus.index.retry') }}</text>
        </view>
      </view>

      <!-- R4-00108：空态（无加载/错误时的空列表提示） -->
      <view v-else-if="topics.length === 0" class="campus-state" role="status" aria-live="polite">
        <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.NOTIFICATION" custom-class="campus-state__icon" mode="aspectFit" />
        <text class="campus-state__text">{{ t('campus.index.emptyTopics') }}</text>
      </view>

      <!-- 话题列表（@scrolltolower 触发真实分页加载） -->
      <scroll-view v-else class="topic-scroll" scroll-y :enhanced="true" :bounces="true" :show-scrollbar="false" @scrolltolower="onLoadMoreTopic">
        <view
          v-for="topic in topics" :key="topic.id"
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
                {{ topic.isAnonymous ? t('campus.index.anonymousAuthor') : topic.author.name }}
              </text>
              <view class="topic-card__replies">
                <SafeImage :src="IMAGE_PATHS.ICONS_SOCIAL.COMMENT" custom-class="replies-icon" mode="aspectFit" />
                <text class="replies-count">{{ topic.replyCount }}</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="loading && topics.length > 0" class="loading-more">
          <view class="loading-spinner--small" role="status" aria-live="polite" :aria-label="t('campus.index.loadingAria')" />
          <text class="loading-more__text">{{ t('campus.index.loadingMore') }}</text>
        </view>
        <view v-else-if="!campusStore.topicHasMore && topics.length > 0" class="no-more">
          <text class="no-more__text">{{ t('campus.index.noMore') }}</text>
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
$green-primary: var(--c-brand);
$green-light: var(--c-brand-50);
$pink-primary: var(--c-romance-500);
/* ui-ux 修复：粉色调统一使用品牌粉 token（village/post.vue 的 $pink-light 同步收敛） */
$pink-light: var(--c-romance-100);
$white: var(--c-neutral-0);
$bg-page: var(--c-bg-page);
$text-primary: var(--c-text-primary);
/* ui-ux 修复：$text-secondary 语义应为文本次要色，不再映射到 neutral-500 */
$text-secondary: var(--c-text-secondary);
$text-tertiary: var(--c-text-tertiary);
/* ui-ux 修复：$border-light 统一为 border 系列 token */
$border-light: var(--c-border-light);
$card-soft-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);

.campus-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: $bg-page;
}

/* ========== 顶部学校信息栏 ========== */
.campus-header {
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 28rpx;
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-300) 50%, var(--c-romance-300) 100%);
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
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.cert-badge {
  padding: 6rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-white-bg-mid-strong);
}

.cert-badge--verified {
  background: var(--c-overlay-white-bg-strong-mid);
}

.cert-badge--pending {
  background: var(--c-state-ongoing-bg);
}

.cert-badge--rejected {
  background: var(--c-red-border-tint);
}

.cert-badge--unverified {
  background: var(--c-overlay-bg-light);
}

.cert-badge__text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== 认证引导卡片 ========== */
.cert-guide-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 20rpx 24rpx;
  padding: 28rpx;
  background: linear-gradient(135deg, $green-light, var(--c-tint-green-50));
  border-radius: var(--r-xl, 24rpx);
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
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: $text-primary;
}

.cert-guide-card__desc {
  font-size: var(--fs-base, 24rpx);
  color: $text-secondary;
  line-height: 1.5;
}

.cert-guide-card__btn {
  padding: 16rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.cert-guide-card__btn:active {
  transform: scale(0.96);
}
/* #endif */

.cert-guide-card__btn-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
  white-space: nowrap;
}

/* ========== 话题分类Tab ========== */
.category-tabs {
  display: flex;
  white-space: nowrap;
  padding: 24rpx 24rpx 20rpx;
  /* R4-02523：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  box-shadow: $card-soft-shadow;
}

.category-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 28rpx;
  border-radius: var(--r-lg, 20rpx);
  margin-right: 16rpx;
  transition: all var(--d-normal, 200ms) ease;
  flex-shrink: 0;
  background: $bg-page;
}

/* #ifdef H5 */
.category-tab:active {
  transform: scale(0.96);
}
/* #endif */

.category-tab--active {
  background: linear-gradient(135deg, $green-light, var(--c-tint-green-50));
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint);
}

.category-tab__label {
  font-size: var(--fs-md, 26rpx);
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
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-loop, 1000ms) linear infinite;
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
  font-size: var(--fs-lg, 28rpx);
  color: $text-tertiary;
  text-align: center;
  line-height: 1.6;
}

.campus-state__btn {
  padding: 20rpx 56rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  box-shadow: 0 4rpx 16rpx var(--c-brand-border-tint-stronger);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.campus-state__btn:active {
  transform: scale(0.96);
}
/* #endif */

.campus-state__btn-text {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== 话题列表 ========== */
.topic-scroll {
  flex: 1;
}

.topic-card {
  margin: 16rpx 24rpx;
  padding: 28rpx;
  /* R4-02523：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: $card-soft-shadow;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.topic-card:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 20rpx var(--c-black-shadow-sm);
}
/* #endif */

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
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: $text-primary;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-card__time {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  flex-shrink: 0;
  background: $bg-page;
  padding: 4rpx 12rpx;
  border-radius: var(--r-full, 9999rpx);
}

.topic-card__preview {
  font-size: var(--fs-md, 26rpx);
  color: $text-secondary;
  line-height: 1.7;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 3.4em;
  /* #endif */
}

.topic-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12rpx;
  border-top: 1rpx solid $border-light;
}

.topic-card__author {
  font-size: var(--fs-base, 24rpx);
  color: $pink-primary;
  font-weight: 500;
}

.topic-card__replies {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: $green-light;
  border-radius: var(--r-full, 9999rpx);
}

.replies-icon {
  width: 24rpx;
  height: 24rpx;
}

.replies-count {
  font-size: var(--fs-base, 24rpx);
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
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

.loading-more__text {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.no-more {
  display: flex;
  justify-content: center;
  padding: 36rpx 0;
}

.no-more__text {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
  background: $bg-page;
  padding: 8rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
}

/* ========== 底部留白 ========== */
.list-bottom-spacer {
  height: 160rpx;
}

/* ========== 底部悬浮FAB ========== */
.campus-fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(env(safe-area-inset-bottom) + 150rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  border-radius: var(--r-circle, 50%);
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  box-shadow: 0 8rpx 28rpx var(--c-brand-border-tint-stronger);
  z-index: 20;
  transition: all var(--d-normal, 200ms) ease;
}

/* #ifdef H5 */
.campus-fab:active {
  transform: scale(0.9);
}
/* #endif */

.campus-fab__icon {
  width: 44rpx;
  height: 44rpx;
}
</style>