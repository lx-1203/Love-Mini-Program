<script setup lang="ts">
/**
 * 帖子详情页
 * 展示完整帖子内容、评论列表和互动功能
 * 包含作者交互卡片（关注/私信）和转发功能
 */
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useVillageStore, formatRelativeTime } from "../../stores/village";
import { openAppPath } from "../../utils/navigation";

const villageStore = useVillageStore();
const { currentPost, comments, loading } = storeToRefs(villageStore);

/** 评论输入内容 */
const commentContent = ref("");
/** 是否正在提交评论 */
const isSubmitting = ref(false);
/** 转发弹窗是否显示 */
const showShareModal = ref(false);
/** 转发附加评论 */
const shareComment = ref("");
/** 是否正在转发 */
const isSharing = ref(false);

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
    await villageStore.followUser(currentPost.value.author.userId);
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
 * 私信用户 - 跳转到聊天会话页
 */
function sendMessage() {
  if (!currentPost.value) return;
  // 跳转到私信会话页（后续可携带目标用户 ID 参数）
  openAppPath("/pages/chat-session/index");
}

/**
 * 打开转发弹窗
 */
function openShareModal() {
  if (!currentPost.value) return;
  shareComment.value = "";
  showShareModal.value = true;
}

/**
 * 关闭转发弹窗
 */
function closeShareModal() {
  showShareModal.value = false;
  shareComment.value = "";
}

/**
 * 确认转发
 */
async function confirmShare() {
  if (!currentPost.value) return;

  isSharing.value = true;
  try {
    await villageStore.sharePost(currentPost.value.id, shareComment.value.trim() || undefined);
    showShareModal.value = false;
    shareComment.value = "";
    uni.showToast({ title: "转发成功", icon: "success" });
  } catch (error) {
    uni.showToast({
      title: villageStore.errorMessage || "转发失败",
      icon: "none",
    });
  } finally {
    isSharing.value = false;
  }
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
      <!-- ===== 作者交互卡片 ===== -->
      <view class="author-card">
        <!-- 作者基础信息 -->
        <view class="author-card__main">
          <view class="author-avatar">
            <image
              v-if="currentPost.author.avatar"
              class="author-avatar__img"
              :src="currentPost.author.avatar"
              mode="aspectFill"
            />
            <text v-else class="author-avatar__char">{{ currentPost.author.name[0] }}</text>
          </view>
          <view class="author-info">
            <text class="author-info__name">{{ currentPost.author.name }}</text>
            <text class="author-info__headline">{{ currentPost.author.headline }}</text>
          </view>
        </view>

        <!-- 学校标签 -->
        <view v-if="currentPost.author.campusName" class="author-card__tags">
          <view class="author-tag author-tag--campus">
            <text class="author-tag__text">{{ currentPost.author.campusName }}</text>
          </view>
        </view>

        <!-- 兴趣标签 -->
        <view v-if="currentPost.author.interests && currentPost.author.interests.length > 0" class="author-card__interests">
          <text
            v-for="interest in currentPost.author.interests"
            :key="interest"
            class="interest-chip"
          >{{ interest }}</text>
        </view>

        <!-- 操作按钮行 -->
        <view class="author-card__actions">
          <view
            class="action-btn action-btn--follow"
            :class="{ 'action-btn--follow-active': currentPost.isFollowed }"
            @tap="handleFollow"
          >
            <text class="action-btn__text">
              {{ currentPost.isFollowed ? "已关注" : "+ 关注" }}
            </text>
          </view>
          <view class="action-btn action-btn--message" @tap="sendMessage">
            <text class="action-btn__text">私信</text>
          </view>
        </view>
      </view>

      <!-- ===== 帖子正文 ===== -->
      <view class="detail-post">
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
            <text class="post-stats__item">{{ currentPost.shares }} 转发</text>
            <text class="post-stats__item">{{ currentPost.comments }} 评论</text>
            <text class="post-stats__item">{{ currentPost.likes }} 赞</text>
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
        <!-- 转发按钮 -->
        <view
          class="footer-action"
          :class="{ 'footer-action--active': currentPost.isShared }"
          @tap="openShareModal"
        >
          <text class="footer-action__icon">{{ currentPost.isShared ? "已转发" : "转发" }}</text>
          <text v-if="currentPost.shares > 0" class="footer-action__count">{{ currentPost.shares }}</text>
        </view>
        <!-- 私信按钮 -->
        <view class="footer-action" @tap="sendMessage">
          <text class="footer-action__icon">私信</text>
        </view>
        <!-- 点赞按钮 -->
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

    <!-- ===== 转发确认弹窗 ===== -->
    <view v-if="showShareModal" class="share-modal-overlay" @tap="closeShareModal">
      <view class="share-modal" @tap.stop>
        <!-- 弹窗标题 -->
        <view class="share-modal__header">
          <text class="share-modal__title">转发到我的动态</text>
          <view class="share-modal__close" @tap="closeShareModal">
            <text class="share-modal__close-icon">X</text>
          </view>
        </view>

        <!-- 附加评论输入 -->
        <view class="share-modal__body">
          <textarea
            v-model="shareComment"
            class="share-modal__textarea"
            placeholder="说点什么吧（选填）..."
            :maxlength="200"
            auto-height
          />
          <text class="share-modal__count">{{ shareComment.length }}/200</text>
        </view>

        <!-- 操作按钮 -->
        <view class="share-modal__footer">
          <view class="share-modal__btn share-modal__btn--cancel" @tap="closeShareModal">
            <text class="share-modal__btn-text">取消</text>
          </view>
          <view
            class="share-modal__btn share-modal__btn--confirm"
            :class="{ 'share-modal__btn--loading': isSharing }"
            @tap="confirmShare"
          >
            <text class="share-modal__btn-text">{{ isSharing ? "转发中..." : "确认转发" }}</text>
          </view>
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

/* ========== 帖子内容容器 ========== */
.detail-body {
  flex: 1;
}

/* ================================================================
   作者交互卡片
   ================================================================ */
.author-card {
  background: var(--td-bg-color-container);
  margin: 16rpx 24rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  box-shadow: var(--td-shadow-1, 0 2rpx 12rpx rgba(0, 0, 0, 0.04));
}

/* 作者基础信息行 */
.author-card__main {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.author-avatar {
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

.author-avatar__img {
  width: 100%;
  height: 100%;
}

.author-avatar__char {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--td-brand-color-7);
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
  flex: 1;
}

.author-info__name {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.author-info__headline {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 学校标签 */
.author-card__tags {
  margin-bottom: 16rpx;
}

.author-tag--campus {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 18rpx;
  border-radius: 999px;
  background: var(--td-brand-color-1);
}

.author-tag__text {
  font-size: 24rpx;
  color: var(--td-brand-color-7);
  font-weight: 500;
}

/* 兴趣标签 */
.author-card__interests {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.interest-chip {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
  background: var(--td-bg-app-page);
  padding: 8rpx 18rpx;
  border-radius: 999px;
  font-weight: 500;
}

/* 操作按钮行 */
.author-card__actions {
  display: flex;
  gap: 20rpx;
}

.action-btn--follow {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn--follow-active {
  background: var(--td-bg-color-surface);
  border: 1rpx solid var(--td-border-level-1-color);
}

.action-btn--message {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 999px;
  background: var(--td-bg-color-surface);
  border: 1rpx solid var(--td-border-level-1-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn__text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 500;
}

.action-btn--follow-active .action-btn__text {
  color: var(--td-text-color-placeholder);
}

.action-btn--message .action-btn__text {
  color: var(--td-text-color-primary);
}

/* ================================================================
   帖子正文卡片
   ================================================================ */
.detail-post {
  background: var(--td-bg-color-container);
  padding: 28rpx 32rpx;
  margin: 0 24rpx 16rpx;
  border-radius: 20rpx;
  box-shadow: var(--td-shadow-1, 0 2rpx 12rpx rgba(0, 0, 0, 0.04));
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
  margin: 0 24rpx;
  border-radius: 20rpx;
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
  color: var(--td-brand-color-7);
}

/* ================================================================
   转发弹窗
   ================================================================ */
.share-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.share-modal {
  width: 600rpx;
  background: var(--td-bg-color-container);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.15);
}

.share-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 20rpx;
  border-bottom: 1rpx solid var(--td-border-level-1-color);
}

.share-modal__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.share-modal__close {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: var(--td-bg-app-page);
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-modal__close-icon {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  font-weight: 600;
}

.share-modal__body {
  padding: 24rpx 32rpx;
}

.share-modal__textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: var(--td-bg-app-page);
  font-size: 28rpx;
  color: var(--td-text-color-primary);
  box-sizing: border-box;
}

.share-modal__count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  margin-top: 12rpx;
}

.share-modal__footer {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 32rpx 32rpx;
}

.share-modal__btn {
  flex: 1;
  padding: 20rpx 0;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-modal__btn--cancel {
  background: var(--td-bg-app-page);
  border: 1rpx solid var(--td-border-level-1-color);
}

.share-modal__btn--confirm {
  background: var(--td-brand-color-7);
}

.share-modal__btn--loading {
  opacity: 0.6;
  pointer-events: none;
}

.share-modal__btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--td-text-color-secondary);
}

.share-modal__btn--confirm .share-modal__btn-text {
  color: #ffffff;
}
</style>