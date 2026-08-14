<script setup lang="ts">
/**
 * 校园话题详情页
 *
 * 功能：
 * - 展示话题标题和内容
 * - 作者信息（头像+昵称+学校，匿名时显示"匿名校友"）
 * - 发布时间
 * - 回复列表
 * - 底部回复输入框
 */
import { ref } from "vue";
import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCampusStore, CAMPUS_CATEGORY_MAP, formatCampusTime } from "../../stores/campus";
import { ROUTES } from "../../constants/routes";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../utils/media";
import EmptyState from "../../components/common/EmptyState.vue";

const campusStore = useCampusStore();
const { t } = useI18n();
const { currentTopic, replies, loading, errorMessage } = storeToRefs(campusStore);


/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器，避免在已销毁页面上修改响应式状态。
 */
/** 回复内容 */
const replyContent = ref("");
/** 是否正在提交回复 */
const isSubmitting = ref(false);
/** 话题 ID */
const topicId = ref("");
/** 是否匿名回复 */
const isAnonymousReply = ref(false);

/**
 * 提交回复
 */
async function submitReply() {
  if (!topicId.value || !replyContent.value.trim()) return;

  isSubmitting.value = true;
  try {
    await campusStore.replyToCampusTopic(
      topicId.value,
      replyContent.value.trim(),
      isAnonymousReply.value,
    );
    replyContent.value = "";
    uni.showToast({ title: t("campus.topicDetail.replySuccess"), icon: "success" });
  } catch (_e) {
    uni.showToast({
      title: campusStore.errorMessage || t("campus.topicDetail.replyFailed"),
      icon: "none",
    });
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * 返回上一页
 */
function goBack() {
  campusStore.clearCurrentTopic();
  uni.navigateBack();
}

/**
 * 获取作者显示名称（R4-00110：name 为空/null 时兜底占位，
 * 避免模板 getDisplayName(...)[0] 对空串/undefined 取首字符异常）。
 */
function getDisplayName(isAnonymous: boolean, name?: string | null): string {
  if (isAnonymous) return t("campus.topicDetail.anonymousAuthor");
  return name && name.length > 0 ? name : "?";
}

/** 回复分页页码（从 1 开始，页面本地维护） */
const replyPage = ref(1);
/** 是否还有更多回复（本地估算：下一页无新增时置 false） */
const repliesHasMore = ref(true);

onLoad((query) => {
  // 修复（review #17）：改用 onLoad(query) 取参，替代 getCurrentPages().options
  topicId.value = query?.topicId ?? "";

  if (topicId.value) {
    void campusStore.fetchCampusTopicDetail(topicId.value);
    void campusStore.fetchCampusReplies(topicId.value, 1);
  } else {
    // infra R2-00076: topicId 缺失时给出错误态提示，避免直开链接白屏
    uni.showToast({ title: t("storeErrors.campus.topicIdInvalid"), icon: "none" });
  }
});

/** 回复列表滚动到底：加载下一页（review #17：回复分页） */
function onLoadMoreReplies() {
  if (loading.value || !repliesHasMore.value || !topicId.value) return;
  const nextPage = replyPage.value + 1;
  const prevCount = campusStore.replies.length;
  void campusStore.fetchCampusReplies(topicId.value, nextPage).then(() => {
    replyPage.value = nextPage;
    // 下一页未返回新数据 → 没有更多
    if (campusStore.replies.length <= prevCount) {
      repliesHasMore.value = false;
    }
  });
}

/** 加载失败重试（review #18：错误态区分于"话题不存在"） */
function retryLoad() {
  if (!topicId.value) return;
  void campusStore.fetchCampusTopicDetail(topicId.value);
  void campusStore.fetchCampusReplies(topicId.value, 1);
}

/**
 * 校园话题分享（2026-08-10 A3 补齐）：分享卡片指向话题详情，
 * 标题取话题标题（无标题时用通用文案）。
 */
onShareAppMessage(() => {
  const title = currentTopic.value?.title?.trim() || "";
  return {
    title: title ? t("share.shareCampusTopic", { title }) : t("share.shareVillage"),
    path: `${ROUTES.CAMPUS.TOPIC_DETAIL}?topicId=${encodeURIComponent(topicId.value)}`,
  };
});
</script>

<template>
  <view class="detail-page">
    <!-- 顶部导航栏 -->
    <view class="detail-header">
      <view class="detail-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="back-icon">{{ t('campus.topicDetail.back') }}</text>
      </view>
      <text class="detail-header__title">{{ t('campus.topicDetail.navTitle') }}</text>
      <view class="detail-header__spacer" />
    </view>

    <!-- 话题内容（@scrolltolower 触发回复分页加载，review #17） -->
    <scroll-view v-if="currentTopic" class="detail-body" scroll-y @scrolltolower="onLoadMoreReplies">
      <!-- 话题分类标签 -->
      <view class="topic-category-tag">
        <text class="category-tag">{{ CAMPUS_CATEGORY_MAP[currentTopic.category] }}</text>
      </view>

      <!-- 作者信息 -->
      <view class="topic-author">
        <view class="author-avatar">
          <image
            v-if="currentTopic.author.avatar"
            class="author-avatar__img"
            :src="resolveMediaUrl(currentTopic.author.avatar)"
            mode="aspectFill" lazy-load alt=""
          />
          <text v-else class="author-avatar__char">
            {{ getDisplayName(currentTopic.isAnonymous, currentTopic.author.name)[0] }}
          </text>
        </view>
        <view class="author-info">
          <text class="author-info__name">
            {{ getDisplayName(currentTopic.isAnonymous, currentTopic.author.name) }}
          </text>
          <text v-if="currentTopic.author.school" class="author-info__school">
            {{ currentTopic.author.school }}
          </text>
        </view>
        <text class="topic-time">{{ formatCampusTime(currentTopic.createdAt) }}</text>
      </view>

      <!-- 话题正文 -->
      <view class="topic-content">
        <text class="topic-title">{{ currentTopic.title }}</text>
        <text class="topic-text">{{ currentTopic.content }}</text>
      </view>

      <!-- 评论区 -->
      <view class="replies-section">
        <view class="replies-header">
          <text class="replies-title">{{ t('campus.topicDetail.repliesTitle') }}</text>
          <text class="replies-count">{{ currentTopic.replyCount }}</text>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="replies-loading">
          <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('campus.topicDetail.loadingAria')" />
          <text class="loading-text">{{ t('campus.topicDetail.loadingReplies') }}</text>
        </view>

        <!-- 回复列表 -->
        <view v-else-if="replies.length > 0" class="replies-list" role="list">
          <view
            v-for="reply in replies" :key="reply.id"
            class="reply-item list-item"
          >
            <view class="reply-avatar">
              <image
                v-if="reply.author.avatar"
                class="reply-avatar__img"
                :src="resolveMediaUrl(reply.author.avatar)"
                mode="aspectFill"
                lazy-load alt=""
              />
              <text v-else class="reply-avatar__char">
                {{ getDisplayName(reply.isAnonymous, reply.author.name)[0] }}
              </text>
            </view>
            <view class="reply-content">
              <view class="reply-header">
                <text class="reply-author">
                  {{ getDisplayName(reply.isAnonymous, reply.author.name) }}
                </text>
                <text class="reply-time">{{ formatCampusTime(reply.createdAt) }}</text>
              </view>
              <text class="reply-text">{{ reply.content }}</text>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <EmptyState
          v-else
          type="no-data"
          :title="t('campus.topicDetail.emptyTitle')"
          :description="t('campus.topicDetail.emptyDesc')"
        />
      </view>

      <!-- 底部留白 -->
      <view class="body-footer" />
    </scroll-view>

    <!-- 加载失败错误态（review #18：与"话题不存在"区分，提供重试） -->
    <EmptyState
      v-else-if="!loading && errorMessage"
      type="network"
      :title="t('storeErrors.campus.loadTopicDetailFailed')"
      :action-text="t('common.retry')"
      @action="retryLoad"
    />

    <!-- 话题不存在 -->
    <EmptyState
      v-else-if="!loading"
      :title="t('campus.topicDetail.notExistText')"
      :action-text="t('campus.topicDetail.backText')"
      type="no-data"
      @action="goBack"
    />

    <!-- 底部回复栏 -->
    <view v-if="currentTopic" class="detail-footer">
      <view class="reply-input-wrap">
        <input
          v-model="replyContent"
          class="reply-input"
          :placeholder="t('campus.topicDetail.replyPlaceholder')"
          confirm-type="send"
          @confirm="submitReply" :aria-label="t('campus.topicDetail.replyPlaceholder')"
        />
      </view>
      <view
        class="anonymous-toggle press-feedback"
        :class="{ 'anonymous-toggle--active': isAnonymousReply }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="isAnonymousReply = !isAnonymousReply"
      >
        <text class="anonymous-toggle__text">{{ isAnonymousReply ? t('campus.topicDetail.anonymousToggleOn') : t('campus.topicDetail.anonymousToggleOff') }}</text>
      </view>
      <view
        class="reply-btn press-feedback"
        :class="{ 'reply-btn--disabled': !replyContent.trim() || isSubmitting }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="submitReply"
      >
        <text class="reply-btn__text">{{ isSubmitting ? t('campus.topicDetail.sendSending') : t('campus.topicDetail.sendSend') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand);
$green-light: var(--c-brand-50);
$pink-primary: var(--c-romance-500);
$pink-light: var(--c-romance-50);
$white: var(--c-neutral-0);
$bg-page: var(--c-bg-page);
$text-primary: var(--c-text-primary);
$text-secondary: var(--c-neutral-500);
$text-tertiary: var(--c-text-tertiary);
$border-light: var(--c-neutral-200);
$card-soft-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);

.detail-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: linear-gradient(180deg, var(--c-bg-brand) 0%, var(--c-bg-page) 20%);
}

/* ========== 顶部导航栏 ========== */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-300) 60%, var(--c-romance-300) 100%);
  z-index: 10;
}

.detail-header__back {
  padding: 12rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-white-bg-mid-strong);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.detail-header__back:active {
  transform: scale(0.96);
  background: var(--c-overlay-white-bg-stronger);
}
/* #endif */

.back-icon {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse);
  font-weight: 500;
}

.detail-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
}

.detail-header__spacer {
  min-width: 80rpx;
}

/* ========== 内容区 ========== */
.detail-body {
  flex: 1;
  padding: 24rpx;
}

/* 分类标签 */
.topic-category-tag {
  margin-bottom: 20rpx;
}

.category-tag {
  display: inline-block;
  padding: 10rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $green-light, $pink-light);
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: $green-primary;
}

/* 作者信息 */
.topic-author {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx;
  /* R4-02525：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx) var(--r-xl, 24rpx) 0 0;
  box-shadow: $card-soft-shadow;
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.topic-author:active {
  transform: scale(0.98);
}
/* #endif */

.author-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, $green-light, $pink-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.author-avatar__img {
  width: 100%;
  height: 100%;
}

.author-avatar__char {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: $green-primary;
}

.author-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.author-info__name {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: $text-primary;
}

.author-info__school {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

.topic-time {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  flex-shrink: 0;
}

/* 话题正文 */
.topic-content {
  padding: 28rpx;
  /* R4-02525：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: 0 0 var(--r-xl, 24rpx) var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.topic-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: $text-primary;
  line-height: 1.5;
  margin-bottom: 20rpx;
}

.topic-text {
  font-size: var(--fs-lg, 28rpx);
  color: $text-secondary;
  line-height: 1.8;
  display: block;
  white-space: pre-wrap;
}

/* ========== 评论区 ========== */
.replies-section {
  /* R4-02525：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  padding: 28rpx;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: $card-soft-shadow;
}

.replies-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.replies-title {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: $text-primary;
}

.replies-count {
  font-size: var(--fs-base, 24rpx);
  color: $green-primary;
  background: $green-light;
  padding: 6rpx 18rpx;
  border-radius: var(--r-full, 9999rpx);
  font-weight: 600;
}

.replies-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx 0;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid $border-light;
  border-top-color: $green-primary;
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: var(--fs-md, 26rpx);
  color: $text-tertiary;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.reply-item {
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
  background: $bg-page;
  border-radius: var(--r-lg, 20rpx);
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.reply-item:active {
  transform: scale(0.98);
}
/* #endif */

.reply-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, $green-light, $pink-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reply-avatar__img {
  width: 100%;
  height: 100%;
}

.reply-avatar__char {
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: $green-primary;
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.reply-author {
  font-size: var(--fs-md, 26rpx);
  font-weight: 600;
  color: $text-primary;
}

.reply-time {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

.reply-text {
  font-size: var(--fs-md, 26rpx);
  color: $text-secondary;
  line-height: 1.6;
}

.replies-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.replies-empty__text {
  font-size: var(--fs-md, 26rpx);
  color: $text-tertiary;
}

.body-footer {
  height: 40rpx;
}

/* ========== 空状态 ========== */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.empty-state__text {
  font-size: var(--fs-xl, 30rpx);
  color: $text-tertiary;
}

.empty-state__back {
  padding: 18rpx 48rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  box-shadow: 0 8rpx 24rpx var(--c-brand-shadow-tint-strong);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.empty-state__back:active {
  transform: scale(0.96);
}
/* #endif */

.back-text {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== 底部回复栏 ========== */
.detail-footer {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 20rpx);
  /* R4-02525：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  box-shadow: 0 -4rpx 16rpx var(--c-black-shadow-xs);
}

.reply-input-wrap {
  flex: 1;
}

.reply-input {
  padding: 20rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  background: $bg-page;
  font-size: var(--fs-lg, 28rpx);
  color: $text-primary;
  border: 2rpx solid transparent;
  transition: all var(--d-normal, 200ms) ease;
}

.reply-input:focus {
  border-color: $green-primary;
  /* R4-02525：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
}

.anonymous-toggle {
  padding: 14rpx 22rpx;
  border-radius: var(--r-full, 9999rpx);
  background: $bg-page;
  border: 2rpx solid $border-light;
  flex-shrink: 0;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.anonymous-toggle:active {
  transform: scale(0.96);
}
/* #endif */

.anonymous-toggle--active {
  background: $green-light;
  border-color: $green-primary;
}

.anonymous-toggle__text {
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
  font-weight: 500;
  white-space: nowrap;
}

.anonymous-toggle--active .anonymous-toggle__text {
  color: $green-primary;
  font-weight: 600;
}

.reply-btn {
  padding: 18rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  flex-shrink: 0;
  box-shadow: 0 6rpx 16rpx var(--c-brand-border-tint-stronger);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.reply-btn:active {
  transform: scale(0.96);
}
/* #endif */

.reply-btn--disabled {
  background: $border-light;
  box-shadow: none;
  pointer-events: none;
}

.reply-btn__text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
  white-space: nowrap;
}

.reply-btn--disabled .reply-btn__text {
  color: $text-tertiary;
}
</style>
