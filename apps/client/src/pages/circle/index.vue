<script setup lang="ts">
/**
 * 圈子页 - 校园墙帖子浏览与发布
 */
import { ref } from "vue";
import { openAppPath } from "../../utils/navigation";

// Tab 切换
const activeTab = ref<"latest" | "following">("latest");

// 帖子数据（模拟）
const posts = ref([
  {
    id: "1",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
    nickname: "小明",
    school: "北京大学",
    grade: "大三",
    content: "今天在图书馆看到一本好书，推荐给大家！《百年孤独》真的太震撼了",
    images: ["https://picsum.photos/300/300?random=1"],
    location: "图书馆",
    topic: "读书分享",
    likes: 23,
    comments: 5,
    isLiked: false,
    isFollowing: false,
  },
  {
    id: "2",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
    nickname: "小红",
    school: "清华大学",
    grade: "大二",
    content: "有人一起上晚自习吗？求组队！可以互相监督，提高效率",
    images: [],
    location: "教学楼",
    topic: "学习组队",
    likes: 15,
    comments: 8,
    isLiked: true,
    isFollowing: true,
  },
  {
    id: "3",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
    nickname: "阿杰",
    school: "复旦大学",
    grade: "大四",
    content: "毕业季了，整理了一些考研资料，有需要的同学可以联系我",
    images: ["https://picsum.photos/300/300?random=2", "https://picsum.photos/300/300?random=3"],
    location: "宿舍",
    topic: "考研资料",
    likes: 56,
    comments: 12,
    isLiked: false,
    isFollowing: false,
  },
]);

function toggleLike(postId: string) {
  const post = posts.value.find((p) => p.id === postId);
  if (post) {
    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
  }
}

function toggleFollow(postId: string) {
  const post = posts.value.find((p) => p.id === postId);
  if (post) {
    post.isFollowing = !post.isFollowing;
  }
}

function goToPost() {
  openAppPath("/subpackages/circle/post/index");
}
</script>

<template>
  <view class="circle-page">
    <!-- 顶部 Tab -->
    <view class="circle-header">
      <view class="circle-tabs">
        <view
          class="circle-tab"
          :class="{ 'circle-tab--active': activeTab === 'latest' }"
          @click="activeTab = 'latest'"
        >
          <text class="circle-tab__text">最新</text>
          <view v-if="activeTab === 'latest'" class="circle-tab__indicator" />
        </view>
        <view
          class="circle-tab"
          :class="{ 'circle-tab--active': activeTab === 'following' }"
          @click="activeTab = 'following'"
        >
          <text class="circle-tab__text">关注</text>
          <view v-if="activeTab === 'following'" class="circle-tab__indicator" />
        </view>
      </view>
    </view>

    <!-- 帖子列表 -->
    <scroll-view scroll-y class="circle-scroll">
      <view class="post-list">
        <view v-for="post in posts" :key="post.id" class="post-card">
          <view class="post-card__header">
            <view class="post-card__user">
              <image class="post-card__avatar" :src="post.avatar" mode="aspectFill" />
              <view class="post-card__meta">
                <text class="post-card__nickname">{{ post.nickname }}</text>
                <text class="post-card__school">{{ post.school }} · {{ post.grade }}</text>
              </view>
            </view>
            <view
              class="post-card__follow"
              :class="{ 'post-card__follow--active': post.isFollowing }"
              @click="toggleFollow(post.id)"
            >
              <text>{{ post.isFollowing ? '已关注' : '+ 关注' }}</text>
            </view>
          </view>

          <text class="post-card__content">{{ post.content }}</text>

          <view v-if="post.images.length > 0" class="post-card__images">
            <image
              v-for="(img, idx) in post.images"
              :key="idx"
              class="post-card__image"
              :src="img"
              mode="aspectFill"
            />
          </view>

          <view class="post-card__topic">
            <text class="post-card__topic-tag">#{{ post.topic }}</text>
          </view>

          <view class="post-card__footer">
            <text class="post-card__location">📍 {{ post.location }}</text>
            <view class="post-card__actions">
              <view class="post-card__action" @click="toggleLike(post.id)">
                <text :class="post.isLiked ? 'post-card__action--active' : ''">
                  {{ post.isLiked ? '❤️' : '🤍' }} {{ post.likes }}
                </text>
              </view>
              <view class="post-card__action">
                <text>💬 {{ post.comments }}</text>
              </view>
              <view class="post-card__action">
                <text>↗️</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="circle-footer" />
    </scroll-view>

    <!-- 悬浮发帖按钮 -->
    <view class="fab-post" @click="goToPost">
      <text class="fab-post__icon">+</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.circle-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
}

/* ========== 顶部 Tab ========== */
.circle-header {
  padding: 24rpx 32rpx;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
  background: linear-gradient(to bottom, var(--td-bg-app-page), transparent);
  z-index: 10;
}

.circle-tabs {
  display: flex;
  gap: 32rpx;
}

.circle-tab {
  position: relative;
  padding: 8rpx 0;
}

.circle-tab__text {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-secondary);
}

.circle-tab--active .circle-tab__text {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.circle-tab__indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32rpx;
  height: 6rpx;
  background: linear-gradient(135deg, var(--td-brand-color-6), var(--td-brand-color-7));
  border-radius: 999px;
}

/* ========== 滚动区域 ========== */
.circle-scroll {
  flex: 1;
  overflow: hidden;
}

/* ========== 帖子列表 ========== */
.post-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 0 32rpx;
}

.post-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: var(--td-shadow-1);
  border: 1px solid var(--td-border-level-1-color);
}

.post-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.post-card__user {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.post-card__avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--td-bg-color-surface);
}

.post-card__meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.post-card__nickname {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.post-card__school {
  font-size: 22rpx;
  color: var(--td-text-color-secondary);
}

.post-card__follow {
  padding: 8rpx 20rpx;
  border-radius: 999px;
  background: var(--td-brand-color-1);
  border: 1px solid var(--td-brand-color-3);
}

.post-card__follow text {
  font-size: 24rpx;
  color: var(--td-brand-color-6);
  font-weight: 600;
}

.post-card__follow--active {
  background: var(--td-bg-color-surface);
  border: 1px solid var(--td-border-level-1-color);
}

.post-card__follow--active text {
  color: var(--td-text-color-placeholder);
}

.post-card__content {
  font-size: 28rpx;
  color: var(--td-text-color-primary);
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.post-card__images {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
}

.post-card__image {
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
  background: var(--td-bg-color-surface);
}

.post-card__topic {
  margin-bottom: 16rpx;
}

.post-card__topic-tag {
  font-size: 24rpx;
  color: var(--td-brand-color-6);
  background: var(--td-brand-color-1);
  padding: 6rpx 16rpx;
  border-radius: 999px;
}

.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.post-card__location {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

.post-card__actions {
  display: flex;
  gap: 24rpx;
}

.post-card__action {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.post-card__action--active {
  color: #ef4444;
}

/* ========== 底部留白 ========== */
.circle-footer {
  height: 120rpx;
}

/* ========== 悬浮发帖按钮 ========== */
.fab-post {
  position: fixed;
  right: 32rpx;
  bottom: calc(env(safe-area-inset-bottom) + 140rpx);
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--td-brand-color-6), var(--td-brand-color-7));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.35);
  z-index: 100;
}

.fab-post__icon {
  font-size: 48rpx;
  color: #ffffff;
  font-weight: 300;
}
</style>
