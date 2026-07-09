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
import { ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useCampusStore, CAMPUS_CATEGORY_MAP, formatCampusTime } from "../../stores/campus";

const campusStore = useCampusStore();
const { currentTopic, replies, loading } = storeToRefs(campusStore);

const pageVisible = ref(false);
onShow(() => {
  pageVisible.value = false;
  setTimeout(() => {
    pageVisible.value = true;
  }, 30);
});

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
    uni.showToast({ title: "回复成功", icon: "success" });
  } catch (_e) {
    uni.showToast({
      title: campusStore.errorMessage || "回复失败",
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
 * 获取作者显示名称
 */
function getDisplayName(isAnonymous: boolean, name: string): string {
  return isAnonymous ? "匿名校友" : name;
}

onMounted(() => {
  // 获取页面参数
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as { options?: Record<string, string> })?.options ?? {};
  topicId.value = options.topicId || "";

  if (topicId.value) {
    void campusStore.fetchCampusTopicDetail(topicId.value);
    void campusStore.fetchCampusReplies(topicId.value, 1);
  }
});
</script>

<template>
  <view class="detail-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航栏 -->
    <view class="detail-header">
      <view class="detail-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">返回</text>
      </view>
      <text class="detail-header__title">话题详情</text>
      <view class="detail-header__spacer" />
    </view>

    <!-- 话题内容 -->
    <scroll-view v-if="currentTopic" class="detail-body" scroll-y>
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
            :src="currentTopic.author.avatar"
            mode="aspectFill"
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
          <text class="replies-title">回复</text>
          <text class="replies-count">{{ currentTopic.replyCount }}</text>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="replies-loading">
          <view class="loading-spinner" />
          <text class="loading-text">加载回复中...</text>
        </view>

        <!-- 回复列表 -->
        <view v-else-if="replies.length > 0" class="replies-list">
          <view
            v-for="reply in replies"
            :key="reply.id"
            class="reply-item list-item"
          >
            <view class="reply-avatar">
              <image
                v-if="reply.author.avatar"
                class="reply-avatar__img"
                :src="reply.author.avatar"
                mode="aspectFill"
        lazy-load
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
        <view v-else class="replies-empty">
          <text class="replies-empty__text">暂无回复，快来抢沙发吧</text>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="body-footer" />
    </scroll-view>

    <!-- 话题不存在 -->
    <view v-else-if="!loading" class="empty-state">
      <text class="empty-state__text">话题不存在或已被删除</text>
      <view class="empty-state__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-text">返回</text>
      </view>
    </view>

    <!-- 底部回复栏 -->
    <view v-if="currentTopic" class="detail-footer">
      <view class="reply-input-wrap">
        <input
          v-model="replyContent"
          class="reply-input"
          placeholder="写下你的回复..."
          confirm-type="send"
          @confirm="submitReply"
        />
      </view>
      <view
        class="anonymous-toggle press-feedback"
        :class="{ 'anonymous-toggle--active': isAnonymousReply }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="isAnonymousReply = !isAnonymousReply"
      >
        <text class="anonymous-toggle__text">{{ isAnonymousReply ? "匿名" : "实名" }}</text>
      </view>
      <view
        class="reply-btn press-feedback"
        :class="{ 'reply-btn--disabled': !replyContent.trim() || isSubmitting }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="submitReply"
      >
        <text class="reply-btn__text">{{ isSubmitting ? "发送中" : "发送" }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: #3FCF8E;
$green-light: #E8F8F0;
$pink-primary: #EC4899;
$pink-light: #FFF5F7;
$white: #FFFFFF;
$bg-page: #F4F6FA;
$text-primary: #1F2329;
$text-secondary: #64748B;
$text-tertiary: #9AA1AB;
$border-light: #E2E8F0;
$card-soft-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);

.detail-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(180deg, #E8F8F0 0%, #F4F6FA 20%);
}

/* ========== 顶部导航栏 ========== */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: linear-gradient(135deg, $green-primary 0%, #7CD9A6 60%, #F9A8C4 100%);
  z-index: 10;
}

.detail-header__back {
  padding: 12rpx 20rpx;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  transition: all 0.15s ease;
}

.detail-header__back:active {
  transform: scale(0.96);
  background: rgba(255, 255, 255, 0.4);
}

.back-icon {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.detail-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: #FFFFFF;
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
  border-radius: 999px;
  background: linear-gradient(135deg, $green-light, $pink-light);
  font-size: 24rpx;
  font-weight: 600;
  color: $green-primary;
}

/* 作者信息 */
.topic-author {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx;
  background: $white;
  border-radius: 24rpx 24rpx 0 0;
  box-shadow: $card-soft-shadow;
  transition: transform 0.15s ease;
}

.topic-author:active {
  transform: scale(0.98);
}

.author-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
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
  font-size: 30rpx;
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
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
}

.author-info__school {
  font-size: 22rpx;
  color: $text-tertiary;
}

.topic-time {
  font-size: 22rpx;
  color: $text-tertiary;
  flex-shrink: 0;
}

/* 话题正文 */
.topic-content {
  padding: 28rpx;
  background: $white;
  border-radius: 0 0 24rpx 24rpx;
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
  font-size: 28rpx;
  color: $text-secondary;
  line-height: 1.8;
  display: block;
  white-space: pre-wrap;
}

/* ========== 评论区 ========== */
.replies-section {
  background: $white;
  padding: 28rpx;
  border-radius: 24rpx;
  box-shadow: $card-soft-shadow;
}

.replies-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.replies-title {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-primary;
}

.replies-count {
  font-size: 24rpx;
  color: $green-primary;
  background: $green-light;
  padding: 6rpx 18rpx;
  border-radius: 999px;
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
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 26rpx;
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
  border-radius: 20rpx;
  transition: transform 0.15s ease;
}

.reply-item:active {
  transform: scale(0.98);
}

.reply-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
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
  font-size: 24rpx;
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
  font-size: 26rpx;
  font-weight: 600;
  color: $text-primary;
}

.reply-time {
  font-size: 22rpx;
  color: $text-tertiary;
}

.reply-text {
  font-size: 26rpx;
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
  font-size: 26rpx;
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
  font-size: 30rpx;
  color: $text-tertiary;
}

.empty-state__back {
  padding: 18rpx 48rpx;
  border-radius: 999px;
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  box-shadow: 0 8rpx 24rpx rgba(63, 207, 142, 0.35);
  transition: all 0.15s ease;
}

.empty-state__back:active {
  transform: scale(0.96);
}

.back-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

/* ========== 底部回复栏 ========== */
.detail-footer {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 20rpx);
  background: $white;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.reply-input-wrap {
  flex: 1;
}

.reply-input {
  padding: 20rpx 28rpx;
  border-radius: 999px;
  background: $bg-page;
  font-size: 28rpx;
  color: $text-primary;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}

.reply-input:focus {
  border-color: $green-primary;
  background: $white;
}

.anonymous-toggle {
  padding: 14rpx 22rpx;
  border-radius: 999px;
  background: $bg-page;
  border: 2rpx solid $border-light;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.anonymous-toggle:active {
  transform: scale(0.96);
}

.anonymous-toggle--active {
  background: $green-light;
  border-color: $green-primary;
}

.anonymous-toggle__text {
  font-size: 24rpx;
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
  border-radius: 999px;
  background: linear-gradient(135deg, $green-primary, #5ADBA0);
  flex-shrink: 0;
  box-shadow: 0 6rpx 16rpx rgba(63, 207, 142, 0.3);
  transition: all 0.15s ease;
}

.reply-btn:active {
  transform: scale(0.96);
}

.reply-btn--disabled {
  background: $border-light;
  box-shadow: none;
  pointer-events: none;
}

.reply-btn__text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
}

.reply-btn--disabled .reply-btn__text {
  color: $text-tertiary;
}
</style>
