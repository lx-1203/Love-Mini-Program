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
import { storeToRefs } from "pinia";
import { useCampusStore, CAMPUS_CATEGORY_MAP, formatCampusTime } from "../../stores/campus";

const campusStore = useCampusStore();
const { currentTopic, replies, loading } = storeToRefs(campusStore);

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
  } catch {
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
  <view class="detail-page">
    <!-- 顶部导航栏 -->
    <view class="detail-header">
      <view class="detail-header__back" @tap="goBack">
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
            class="reply-item"
          >
            <view class="reply-avatar">
              <image
                v-if="reply.author.avatar"
                class="reply-avatar__img"
                :src="reply.author.avatar"
                mode="aspectFill"
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
      <view class="empty-state__back" @tap="goBack">
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
        class="anonymous-toggle"
        :class="{ 'anonymous-toggle--active': isAnonymousReply }"
        @tap="isAnonymousReply = !isAnonymousReply"
      >
        <text class="anonymous-toggle__text">{{ isAnonymousReply ? "匿名" : "实名" }}</text>
      </view>
      <view
        class="reply-btn"
        :class="{ 'reply-btn--disabled': !replyContent.trim() || isSubmitting }"
        @tap="submitReply"
      >
        <text class="reply-btn__text">{{ isSubmitting ? "发送中" : "发送" }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
}

/* ========== 顶部导航栏 ========== */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: var(--td-bg-color-container);
  border-bottom: 1rpx solid var(--td-border-level-1-color);
  z-index: 10;
}

.detail-header__back {
  padding: 8rpx 0;
  min-width: 80rpx;
}

.back-icon {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
}

.detail-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.detail-header__spacer {
  min-width: 80rpx;
}

/* ========== 内容区 ========== */
.detail-body {
  flex: 1;
}

/* 分类标签 */
.topic-category-tag {
  padding: 16rpx 28rpx 0;
}

.category-tag {
  display: inline-block;
  padding: 8rpx 20rpx;
  border-radius: 999px;
  background: var(--td-brand-color-1);
  font-size: 22rpx;
  font-weight: 500;
  color: var(--td-brand-color-7);
}

/* 作者信息 */
.topic-author {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 28rpx;
  background: var(--td-bg-color-container);
  margin: 16rpx 24rpx 0;
  border-radius: 20rpx 20rpx 0 0;
}

.author-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--td-brand-color-2), var(--td-brand-color-3));
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
  color: var(--td-brand-color-7);
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
  color: var(--td-text-color-primary);
}

.author-info__school {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

.topic-time {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  flex-shrink: 0;
}

/* 话题正文 */
.topic-content {
  padding: 24rpx 28rpx;
  background: var(--td-bg-color-container);
  margin: 0 24rpx 16rpx;
  border-radius: 0 0 20rpx 20rpx;
}

.topic-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.topic-text {
  font-size: 28rpx;
  color: var(--td-text-color-primary);
  line-height: 1.8;
  display: block;
  white-space: pre-wrap;
}

/* ========== 评论区 ========== */
.replies-section {
  background: var(--td-bg-color-container);
  padding: 24rpx 28rpx;
  margin: 0 24rpx;
  border-radius: 20rpx;
}

.replies-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.replies-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.replies-count {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  background: var(--td-bg-app-page);
  padding: 4rpx 16rpx;
  border-radius: 999px;
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
  border: 4rpx solid var(--td-border-level-1-color);
  border-top-color: var(--td-brand-color-7);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.reply-item {
  display: flex;
  gap: 16rpx;
}

.reply-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--td-brand-color-2), var(--td-brand-color-3));
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
  color: var(--td-brand-color-7);
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.reply-author {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.reply-time {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

.reply-text {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
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
  color: var(--td-text-color-placeholder);
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
  color: var(--td-text-color-placeholder);
}

.empty-state__back {
  padding: 16rpx 40rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
}

.back-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 500;
}

/* ========== 底部回复栏 ========== */
.detail-footer {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 20rpx);
  background: var(--td-bg-color-container);
  border-top: 1rpx solid var(--td-border-level-1-color);
}

.reply-input-wrap {
  flex: 1;
}

.reply-input {
  padding: 16rpx 24rpx;
  border-radius: 999px;
  background: var(--td-bg-app-page);
  font-size: 28rpx;
  color: var(--td-text-color-primary);
}

.anonymous-toggle {
  padding: 12rpx 20rpx;
  border-radius: 999px;
  background: var(--td-bg-app-page);
  border: 1rpx solid var(--td-border-level-1-color);
  flex-shrink: 0;
}

.anonymous-toggle--active {
  background: var(--td-brand-color-1);
  border-color: var(--td-brand-color-3);
}

.anonymous-toggle__text {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  font-weight: 500;
  white-space: nowrap;
}

.anonymous-toggle--active .anonymous-toggle__text {
  color: var(--td-brand-color-7);
}

.reply-btn {
  padding: 16rpx 28rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  flex-shrink: 0;
}

.reply-btn--disabled {
  background: var(--td-bg-color-component-disabled);
  pointer-events: none;
}

.reply-btn__text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
}

.reply-btn--disabled .reply-btn__text {
  color: var(--td-text-color-disabled);
}
</style>