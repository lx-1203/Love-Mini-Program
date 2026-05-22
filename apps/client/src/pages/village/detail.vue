<script setup lang="ts">
/**
 * 帖子详情页
 * 展示完整帖子内容、评论列表和互动功能
 */
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useVillageStore, formatRelativeTime } from "../../stores/village";

const villageStore = useVillageStore();
const { currentPost, comments, loading } = storeToRefs(villageStore);

/** 评论输入内容 */
const commentContent = ref("");
/** 是否正在提交评论 */
const isSubmitting = ref(false);

/**
 * 返回上一页
 */
function goBack() {
  uni.navigateBack();
}

/**
 * 处理点赞
 */
async function handleLike() {
  if (!currentPost.value) return;
  try {
    await villageStore.likePost(currentPost.value.id);
  } catch (error) {
    console.error("点赞失败:", error);
  }
}

/**
 * 处理关注
 */
async function handleFollow() {
  if (!currentPost.value) return;
  try {
    await villageStore.followUser(currentPost.value.id);
  } catch (error) {
    console.error("关注失败:", error);
  }
}

/**
 * 提交评论
 */
async function submitComment() {
  if (!currentPost.value || !commentContent.value.trim()) return;

  isSubmitting.value = true;
  try {
    await villageStore.commentPost(currentPost.value.id, commentContent.value.trim());
    commentContent.value = "";
    uni.showToast({ title: "评论成功", icon: "success" });
  } catch (error) {
    uni.showToast({
      title: villageStore.errorMessage || "评论失败",
      icon: "none",
    });
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * 私信用户
 */
function sendMessage() {
  if (!currentPost.value) return;
  uni.showToast({ title: "私信功能开发中", icon: "none" });
}

onMounted(() => {
  if (currentPost.value) {
    void villageStore.fetchComments(currentPost.value.id);
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
      <text class="detail-header__title">帖子详情</text>
      <view class="detail-header__spacer" />
    </view>

    <!-- 帖子内容 -->
    <scroll-view v-if="currentPost" class="detail-body" scroll-y>
      <!-- 用户信息栏 -->
      <view class="detail-post">
        <view class="post-header">
          <view class="post-header__left">
            <view class="post-avatar">
              <image
                v-if="currentPost.author.avatar"
                class="post-avatar__img"
                :src="currentPost.author.avatar"
                mode="aspectFill"
              />
              <text v-else class="post-avatar__text">{{ currentPost.author.name[0] }}</text>
            </view>
            <view class="post-user">
              <text class="post-user__name">{{ currentPost.author.name }}</text>
              <text class="post-user__headline">{{ currentPost.author.headline }}</text>
            </view>
          </view>
          <view class="post-header__right">
            <button
              class="follow-btn"
              :class="{ 'follow-btn--active': currentPost.isFollowed }"
              @tap="handleFollow"
            >
              <text class="follow-btn__text">{{ currentPost.isFollowed ? "已关注" : "关注" }}</text>
            </button>
          </view>
        </view>

        <!-- 帖子正文 -->
        <view class="post-body">
          <text class="post-content">{{ currentPost.content }}</text>

          <!-- 图片网格 -->
          <view v-if="currentPost.images.length > 0" class="post-images">
            <image
              v-for="(img, idx) in currentPost.images"
              :key="idx"
              class="post-image"
              :src="img"
              mode="aspectFill"
            />
          </view>

          <!-- 话题标签 -->
          <view v-if="currentPost.tags.length > 0" class="post-tags">
            <text v-for="(tag, idx) in currentPost.tags" :key="idx" class="post-tag">{{ tag }}</text>
          </view>
        </view>

        <!-- 时间和互动数据 -->
        <view class="post-meta">
          <text class="post-time">{{ formatRelativeTime(currentPost.createdAt) }}</text>
          <view class="post-stats">
            <text class="post-stats__item">{{ currentPost.likes }} 赞</text>
            <text class="post-stats__item">{{ currentPost.comments }} 评论</text>
          </view>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="comments-section">
        <view class="comments-header">
          <text class="comments-title">评论</text>
          <text class="comments-count">{{ comments.length }}</text>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="comments-loading">
          <view class="loading-spinner" />
          <text class="loading-text">加载评论中...</text>
        </view>

        <!-- 评论列表 -->
        <view v-else-if="comments.length > 0" class="comments-list">
          <view
            v-for="comment in comments"
            :key="comment.id"
            class="comment-item"
          >
            <view class="comment-avatar">
              <image
                v-if="comment.author.avatar"
                class="comment-avatar__img"
                :src="comment.author.avatar"
                mode="aspectFill"
              />
              <text v-else class="comment-avatar__text">{{ comment.author.name[0] }}</text>
            </view>
            <view class="comment-content">
              <view class="comment-header">
                <text class="comment-author">{{ comment.author.name }}</text>
                <text class="comment-time">{{ formatRelativeTime(comment.createdAt) }}</text>
              </view>
              <text class="comment-text">{{ comment.content }}</text>
              <view class="comment-actions">
                <view class="comment-like" :class="{ 'comment-like--active': comment.isLiked }">
                  <text class="comment-like__icon">赞</text>
                  <text v-if="comment.likes > 0" class="comment-like__count">{{ comment.likes }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else class="comments-empty">
          <text class="comments-empty__text">暂无评论，快来抢沙发吧</text>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="body-footer" />
    </scroll-view>

    <!-- 帖子不存在 -->
    <view v-else class="empty-state">
      <text class="empty-state__text">帖子不存在或已被删除</text>
      <view class="empty-state__back" @tap="goBack">
        <text class="back-text">返回广场</text>
      </view>
    </view>

    <!-- 底部互动栏 -->
    <view v-if="currentPost" class="detail-footer">
      <view class="comment-input-wrap">
        <input
          v-model="commentContent"
          class="comment-input"
          placeholder="写下你的评论..."
          confirm-type="send"
          @confirm="submitComment"
        />
      </view>
      <view class="footer-actions">
        <view class="footer-action" @tap="sendMessage">
          <text class="footer-action__icon">私信</text>
        </view>
        <view
          class="footer-action"
          :class="{ 'footer-action--active': currentPost.isLiked }"
          @tap="handleLike"
        >
          <text class="footer-action__icon">{{ currentPost.isLiked ? "已赞" : "点赞" }}</text>
          <text v-if="currentPost.likes > 0" class="footer-action__count">{{ currentPost.likes }}</text>
        </view>
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

/* ========== 帖子内容 ========== */
.detail-body {
  flex: 1;
}

.detail-post {
  background: var(--td-bg-color-container);
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
}

/* 帖子头部 */
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.post-header__left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
}

.post-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--td-brand-color-2), var(--td-brand-color-3));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.post-avatar__img {
  width: 100%;
  height: 100%;
}

.post-avatar__text {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--td-brand-color-7);
}

.post-user {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.post-user__name {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.post-user__headline {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post-header__right {
  flex-shrink: 0;
  margin-left: 16rpx;
}

.follow-btn {
  padding: 12rpx 32rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.follow-btn--active {
  background: var(--td-bg-color-surface);
}

.follow-btn__text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}

.follow-btn--active .follow-btn__text {
  color: var(--td-text-color-placeholder);
}

/* 帖子正文 */
.post-body {
  margin-bottom: 24rpx;
}

.post-content {
  font-size: 30rpx;
  color: var(--td-text-color-primary);
  line-height: 1.8;
  display: block;
  margin-bottom: 20rpx;
}

/* 图片网格 */
.post-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
  margin-bottom: 20rpx;
}

.post-image {
  width: 100%;
  height: 220rpx;
  border-radius: var(--td-radius-small);
  background: var(--td-bg-app-page);
}

/* 话题标签 */
.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.post-tag {
  font-size: 26rpx;
  color: var(--td-brand-color-7);
  background: var(--td-brand-color-1);
  padding: 8rpx 18rpx;
  border-radius: var(--td-radius-small);
}

/* 帖子元信息 */
.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20rpx;
  border-top: 1rpx solid var(--td-border-level-1-color);
}

.post-time {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

.post-stats {
  display: flex;
  gap: 24rpx;
}

.post-stats__item {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 评论区 ========== */
.comments-section {
  background: var(--td-bg-color-container);
  padding: 28rpx 32rpx;
}

.comments-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.comments-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.comments-count {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
  background: var(--td-bg-app-page);
  padding: 4rpx 16rpx;
  border-radius: 999px;
}

/* 评论加载 */
.comments-loading {
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

/* 评论列表 */
.comments-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.comment-item {
  display: flex;
  gap: 20rpx;
}

.comment-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--td-brand-color-2), var(--td-brand-color-3));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.comment-avatar__img {
  width: 100%;
  height: 100%;
}

.comment-avatar__text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-brand-color-7);
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.comment-author {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.comment-time {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

.comment-text {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
  display: block;
  margin-bottom: 12rpx;
}

.comment-actions {
  display: flex;
  align-items: center;
}

.comment-like {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.comment-like__icon {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

.comment-like__count {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

.comment-like--active .comment-like__icon,
.comment-like--active .comment-like__count {
  color: var(--td-error-color);
}

/* 评论空状态 */
.comments-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.comments-empty__text {
  font-size: 28rpx;
  color: var(--td-text-color-placeholder);
}

.body-footer {
  height: 40rpx;
}

/* ========== 帖子不存在 ========== */
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

/* ========== 底部互动栏 ========== */
.detail-footer {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 32rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 20rpx);
  background: var(--td-bg-color-container);
  border-top: 1rpx solid var(--td-border-level-1-color);
}

.comment-input-wrap {
  flex: 1;
}

.comment-input {
  padding: 16rpx 24rpx;
  border-radius: 999px;
  background: var(--td-bg-app-page);
  font-size: 28rpx;
  color: var(--td-text-color-primary);
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex-shrink: 0;
}

.footer-action {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.footer-action__icon {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
}

.footer-action__count {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

.footer-action--active .footer-action__icon,
.footer-action--active .footer-action__count {
  color: var(--td-error-color);
}
</style>
