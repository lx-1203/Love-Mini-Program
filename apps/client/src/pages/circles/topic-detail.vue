<script setup lang="ts">
/**
 * 话题详情页
 * 展示话题完整内容、作者信息、回复列表，底部回复输入框
 * 支持从回复直接"打招呼"跳转到私信会话
 */
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useCircleStore, formatCircleTime, type ReplyItem } from "../../stores/circle";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";

const circleStore = useCircleStore();
const sessionStore = useSessionStore();
const { currentTopic, replies, loading } = storeToRefs(circleStore);

/** 回复内容 */
const replyContent = ref("");
/** 是否正在提交回复 */
const isSubmitting = ref(false);
/** 话题 ID */
const topicId = ref("");

/** 当前登录用户 ID */
const currentUserId = computed(() => sessionStore.userSession?.userId ?? "");

/**
 * 提交回复
 */
async function submitReply() {
  if (!topicId.value || !replyContent.value.trim()) return;

  isSubmitting.value = true;
  try {
    await circleStore.replyToTopic(topicId.value, replyContent.value.trim());
    replyContent.value = "";
    uni.showToast({ title: "回复成功", icon: "success" });
  } catch {
    uni.showToast({
      title: circleStore.errorMessage || "回复失败",
      icon: "none",
    });
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * 向回复者发起"打招呼"，跳转到私信会话页并预填破冰文案
 * @param reply - 目标回复项
 */
function sayHello(reply: ReplyItem) {
  if (!currentTopic.value || !reply.author.userId) return;

  const topicTitle = currentTopic.value.title;

  // 基于话题上下文生成破冰文案
  const prefillMessage = `看到你在「${topicTitle}」下的回复，觉得很有共鸣！`;

  // 引用上下文：话题标题 + 回复内容 + 回复者名
  const quoteContext = JSON.stringify({
    topicTitle,
    topicId: topicId.value,
    replyId: reply.id,
    replyContent: reply.content,
    replyAuthorName: reply.author.name,
  });

  // 跳转到私信会话页，携带目标用户 ID、预填消息和引用上下文
  openAppPath(
    `/pages/chat-session/index?userId=${reply.author.userId}&prefillMessage=${encodeURIComponent(prefillMessage)}&quoteContext=${encodeURIComponent(quoteContext)}`
  );
}

/**
 * 返回上一页
 */
function goBack() {
  circleStore.clearCurrentTopic();
  uni.navigateBack();
}

onMounted(() => {
  // 获取页面参数
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const options = (currentPage as { options?: Record<string, string> })?.options ?? {};
  topicId.value = options.topicId || "";

  if (topicId.value) {
    void circleStore.fetchTopicDetail(topicId.value);
    void circleStore.fetchReplies(topicId.value, 1);
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
      <!-- 作者信息 -->
      <view class="topic-author">
        <view class="author-avatar">
          <image
            v-if="currentTopic.author.avatar"
            class="author-avatar__img"
            :src="currentTopic.author.avatar"
            mode="aspectFill"
          />
          <text v-else class="author-avatar__char">{{ currentTopic.author.name[0] }}</text>
        </view>
        <view class="author-info">
          <text class="author-info__name">{{ currentTopic.author.name }}</text>
          <text class="author-info__headline">{{ currentTopic.author.headline }}</text>
        </view>
        <text class="topic-time">{{ formatCircleTime(currentTopic.createdAt) }}</text>
      </view>

      <!-- 话题正文 -->
      <view class="topic-content">
        <text class="topic-title">{{ currentTopic.title }}</text>
        <text class="topic-text">{{ currentTopic.content }}</text>

        <!-- 图片展示 -->
        <view v-if="currentTopic.images.length > 0" class="topic-images">
          <image
            v-for="(img, idx) in currentTopic.images"
            :key="idx"
            class="topic-image"
            :src="img"
            mode="aspectFill"
          />
        </view>
      </view>

      <!-- 评论区 -->
      <view class="replies-section">
        <view class="replies-header">
          <text class="replies-title">回复</text>
          <text class="replies-count">{{ replies.length }}</text>
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
              <text v-else class="reply-avatar__char">{{ reply.author.name[0] }}</text>
            </view>
            <view class="reply-body">
              <view class="reply-content">
                <view class="reply-header">
                  <text class="reply-author">{{ reply.author.name }}</text>
                  <text class="reply-time">{{ formatCircleTime(reply.createdAt) }}</text>
                </view>
                <text class="reply-text">{{ reply.content }}</text>
              </view>
              <!-- 打招呼按钮：不显示在自己回复上 -->
              <view
                v-if="reply.author.userId !== currentUserId"
                class="reply-say-hello"
                @tap.stop="sayHello(reply)"
              >
                <text class="reply-say-hello__text">打个招呼</text>
              </view>
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

.author-info__headline {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  margin-bottom: 16rpx;
  white-space: pre-wrap;
}

.topic-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
}

.topic-image {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
  background: var(--td-bg-app-page);
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
  to {
    transform: rotate(360deg);
  }
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

.reply-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
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

/* ========== 打招呼按钮 ========== */
.reply-say-hello {
  align-self: flex-start;
  padding: 8rpx 20rpx;
  border-radius: 999px;
  background: var(--td-bg-app-page);
  border: 1rpx solid var(--td-border-level-1-color);
  transition: background 160ms ease;
}

.reply-say-hello:active {
  background: var(--td-brand-color-1);
  border-color: var(--td-brand-color-3);
}

.reply-say-hello__text {
  font-size: 22rpx;
  color: var(--td-brand-color-7);
  font-weight: 500;
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
  gap: 16rpx;
  padding: 20rpx 32rpx;
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

.reply-btn {
  padding: 16rpx 32rpx;
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
