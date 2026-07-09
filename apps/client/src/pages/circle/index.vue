<script setup lang="ts">
/**
 * 圈子页 - 校园墙帖子浏览与发布
 */
import { ref } from "vue";
import { openAppPath } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";

/** Emoji 替换 SVG 图标路径 */
const emojiIcons = {
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  chat: IMAGE_PATHS.ICONS_EMOJI.CHAT,
  share: IMAGE_PATHS.ICONS_SOCIAL.SHARE,
  star: IMAGE_PATHS.ICONS_COMMON.STAR_SVG,
} as const;

// Tab 切换 - 扩展为更多分类
const tabs = [
  { key: "recommend", name: "推荐" },
  { key: "following", name: "关注" },
  { key: "campus", name: "校园" },
  { key: "love", name: "恋爱" },
  { key: "treehole", name: "树洞" },
];
const activeTab = ref<string>("recommend");

// 帖子数据（模拟）- 增加时间、收藏状态
const posts = ref([
  {
    id: "1",
    avatar: "/static/default-avatar.png",
    nickname: "小明",
    school: "北京大学",
    grade: "大三",
    content: "今天在图书馆看到一本好书，推荐给大家！《百年孤独》真的太震撼了，加西亚·马尔克斯的文字真的有魔力，那种孤独感被描写得淋漓尽致。有人一起讨论吗？",
    images: [IMAGE_PATHS.POSTS.POST_PLACEHOLDER],
    location: "图书馆",
    topic: "读书分享",
    topicColor: "green",
    time: "2分钟前",
    likes: 23,
    comments: 5,
    shares: 3,
    isLiked: false,
    isFollowing: false,
    isCollected: false,
    likeAnimating: false,
  },
  {
    id: "2",
    avatar: "/static/default-avatar.png",
    nickname: "小红",
    school: "清华大学",
    grade: "大二",
    content: "有人一起上晚自习吗？求组队！可以互相监督，提高效率～期末复习ing，一个人真的太容易摸鱼了😭",
    images: [],
    location: "教学楼",
    topic: "学习组队",
    topicColor: "pink",
    time: "15分钟前",
    likes: 15,
    comments: 8,
    shares: 0,
    isLiked: true,
    isFollowing: true,
    isCollected: false,
    likeAnimating: false,
  },
  {
    id: "3",
    avatar: "/static/default-avatar.png",
    nickname: "阿杰",
    school: "复旦大学",
    grade: "大四",
    content: "毕业季了，整理了一些考研资料，有需要的同学可以联系我。祝大家都能上岸！💪",
    images: [IMAGE_PATHS.POSTS.POST_PLACEHOLDER, IMAGE_PATHS.POSTS.POST_PLACEHOLDER, IMAGE_PATHS.POSTS.POST_PLACEHOLDER],
    location: "宿舍",
    topic: "考研资料",
    topicColor: "green",
    time: "1小时前",
    likes: 56,
    comments: 12,
    shares: 8,
    isLiked: false,
    isFollowing: false,
    isCollected: true,
    likeAnimating: false,
  },
  {
    id: "4",
    avatar: "/static/default-avatar.png",
    nickname: "小甜甜",
    school: "浙江大学",
    grade: "大一",
    content: "今天的晚霞真的太美了！和喜欢的人一起看晚霞是世界上最幸福的事吧～🌅",
    images: [IMAGE_PATHS.POSTS.POST_PLACEHOLDER, IMAGE_PATHS.POSTS.POST_PLACEHOLDER, IMAGE_PATHS.POSTS.POST_PLACEHOLDER, IMAGE_PATHS.POSTS.POST_PLACEHOLDER],
    location: "西湖边",
    topic: "恋爱日常",
    topicColor: "pink",
    time: "3小时前",
    likes: 128,
    comments: 24,
    shares: 15,
    isLiked: false,
    isFollowing: false,
    isCollected: false,
    likeAnimating: false,
  },
]);

function toggleLike(postId: string) {
  const post = posts.value.find((p) => p.id === postId);
  if (post) {
    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
    if (post.isLiked) {
      post.likeAnimating = true;
      setTimeout(() => {
        post.likeAnimating = false;
      }, 300);
    }
  }
}

function toggleFollow(postId: string) {
  const post = posts.value.find((p) => p.id === postId);
  if (post) {
    post.isFollowing = !post.isFollowing;
  }
}

function toggleCollect(postId: string) {
  const post = posts.value.find((p) => p.id === postId);
  if (post) {
    post.isCollected = !post.isCollected;
  }
}

function goToPost() {
  openAppPath("/subpackages/circle/post/index");
}
</script>

<template>
  <view class="circle-page">
    <!-- 顶部导航 -->
    <view class="circle-header">
      <view class="circle-header__top">
        <text class="circle-header__title">圈子</text>
        <view class="circle-header__publish" @tap="goToPost">
          <text class="circle-header__publish-text">发布</text>
        </view>
      </view>
      <!-- 分类标签栏 -->
      <scroll-view class="circle-tabs-scroll" scroll-x :show-scrollbar="false" :enhanced="true">
        <view class="circle-tabs">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            class="circle-tab"
            :class="{ 'circle-tab--active': activeTab === tab.key }"
            @tap="activeTab = tab.key"
          >
            <text class="circle-tab__text">{{ tab.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 帖子列表 -->
    <scroll-view scroll-y class="circle-scroll">
      <view class="post-list">
        <view v-for="(post, index) in posts" :key="post.id" class="post-card" :style="{ animationDelay: index * 80 + 'ms' }">
          <!-- 用户信息头部 -->
          <view class="post-card__header">
            <view class="post-card__user">
              <SafeImage :src="post.avatar" custom-class="post-card__avatar" mode="aspectFill" />
              <view class="post-card__meta">
                <view class="post-card__name-row">
                  <text class="post-card__nickname">{{ post.nickname }}</text>
                  <view class="post-card__gender-badge post-card__gender-badge--male">♂</view>
                </view>
                <text class="post-card__school">{{ post.school }} · {{ post.grade }}</text>
              </view>
            </view>
            <view
              class="post-card__follow"
              :class="{ 'post-card__follow--active': post.isFollowing }"
              @tap.stop="toggleFollow(post.id)"
            >
              <text class="post-card__follow-text">{{ post.isFollowing ? '已关注' : '+ 关注' }}</text>
            </view>
          </view>

          <!-- 正文内容 -->
          <text class="post-card__content">{{ post.content }}</text>

          <!-- 图片区域 -->
          <view v-if="post.images.length > 0" class="post-card__images" :class="'post-card__images--' + post.images.length">
            <SafeImage
              v-for="(img, idx) in post.images.slice(0, 9)"
              :key="idx"
              custom-class="post-card__image"
              :src="img"
              mode="aspectFill"
            />
            <view v-if="post.images.length > 9" class="post-card__image-more">
              <text>+{{ post.images.length - 9 }}</text>
            </view>
          </view>

          <!-- 话题标签 -->
          <view class="post-card__topics">
            <text
              class="post-card__topic-tag"
              :class="'post-card__topic-tag--' + post.topicColor"
            >#{{ post.topic }}</text>
          </view>

          <!-- 底部互动栏 -->
          <view class="post-card__footer">
            <text class="post-card__time">{{ post.time }}</text>
            <view class="post-card__actions">
              <!-- 点赞 -->
              <view class="post-card__action" :class="{ 'post-card__action--liked': post.isLiked, 'post-card__action--animating': post.likeAnimating }" @tap.stop="toggleLike(post.id)">
                <image class="post-card__action-icon" :src="emojiIcons.heart" mode="aspectFit" />
                <text class="post-card__action-count" :class="{ 'post-card__action-count--liked': post.isLiked }">{{ post.likes }}</text>
              </view>
              <!-- 评论 -->
              <view class="post-card__action">
                <image class="post-card__action-icon" :src="emojiIcons.chat" mode="aspectFit" />
                <text class="post-card__action-count">{{ post.comments }}</text>
              </view>
              <!-- 分享 -->
              <view class="post-card__action" @tap.stop>
                <image class="post-card__action-icon" :src="emojiIcons.share" mode="aspectFit" />
                <text v-if="post.shares > 0" class="post-card__action-count">{{ post.shares }}</text>
              </view>
              <!-- 收藏 -->
              <view class="post-card__action" :class="{ 'post-card__action--collected': post.isCollected }" @tap.stop="toggleCollect(post.id)">
                <image class="post-card__action-icon" :src="emojiIcons.star" mode="aspectFit" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="circle-footer" />
    </scroll-view>

    <!-- 悬浮发帖按钮 FAB -->
    <view class="fab-post" @tap="goToPost">
      <text class="fab-post__icon">✏️</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.circle-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(180deg, #F4F6FA 0%, #EEF2F7 100%);
}

/* ========== 顶部导航 ========== */
.circle-header {
  background: linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.95) 100%);
  padding-top: calc(env(safe-area-inset-top) + 16rpx);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2rpx 16rpx rgba(15, 23, 42, 0.04);
}

.circle-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 20rpx;
}

.circle-header__title {
  font-size: 40rpx;
  font-weight: 800;
  color: #1F2329;
  letter-spacing: 1rpx;
}

.circle-header__publish {
  padding: 12rpx 28rpx;
  background: linear-gradient(135deg, #3FCF8E 0%, #2DB97A 100%);
  border-radius: 999rpx;
  box-shadow: 0 4rpx 12rpx rgba(63, 207, 142, 0.35);
}

.circle-header__publish:active {
  transform: scale(0.95);
  opacity: 0.9;
}

.circle-header__publish-text {
  font-size: 26rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* ========== 分类标签栏 ========== */
.circle-tabs-scroll {
  white-space: nowrap;
}

.circle-tabs {
  display: flex;
  gap: 8rpx;
  padding: 0 24rpx 20rpx;
}

.circle-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: transparent;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.circle-tab--active {
  background: linear-gradient(135deg, #3FCF8E 0%, #2DB97A 100%);
  box-shadow: 0 4rpx 12rpx rgba(63, 207, 142, 0.3);
}

.circle-tab__text {
  font-size: 28rpx;
  font-weight: 500;
  color: #64748B;
  transition: color 250ms ease;
}

.circle-tab--active .circle-tab__text {
  color: #FFFFFF;
  font-weight: 700;
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
  padding: 24rpx 24rpx 0;
}

.post-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(15, 23, 42, 0.04), 0 1rpx 3rpx rgba(15, 23, 42, 0.03);
  animation: card-slide-up 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.post-card:active {
  transform: scale(0.995);
}

@keyframes card-slide-up {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* --- 用户信息头部 --- */
.post-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.post-card__user {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.post-card__avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #E8F8F0 0%, #FFF5F7 100%);
  border: 2rpx solid rgba(63, 207, 142, 0.2);
  flex-shrink: 0;
}

.post-card__meta {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.post-card__name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.post-card__nickname {
  font-size: 28rpx;
  font-weight: 600;
  color: #1F2329;
}

.post-card__gender-badge {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: bold;
}

.post-card__gender-badge--male {
  background: #E8F4FD;
  color: #3B82F6;
}

.post-card__gender-badge--female {
  background: #FFF0F5;
  color: #EC4899;
}

.post-card__school {
  font-size: 22rpx;
  color: #9AA1AB;
}

/* --- 关注按钮 --- */
.post-card__follow {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #3FCF8E 0%, #2DB97A 100%);
  border: none;
  transition: all 200ms ease;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.post-card__follow:active {
  transform: scale(0.95);
}

.post-card__follow--active {
  background: #F4F6FA;
  border: 2rpx solid #E2E8F0;
}

.post-card__follow-text {
  font-size: 24rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.post-card__follow--active .post-card__follow-text {
  color: #9AA1AB;
  font-weight: 500;
}

/* --- 正文内容 --- */
.post-card__content {
  font-size: 26rpx;
  color: #1F2329;
  line-height: 1.6;
  margin-bottom: 20rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  overflow: hidden;
}

/* --- 图片区域 --- */
.post-card__images {
  display: grid;
  gap: 8rpx;
  margin-bottom: 16rpx;
  border-radius: 12rpx;
  overflow: hidden;
}

.post-card__images--1 {
  grid-template-columns: 1fr;
  max-width: 480rpx;
}

.post-card__images--2,
.post-card__images--4 {
  grid-template-columns: repeat(2, 1fr);
}

.post-card__images--3,
.post-card__images--5,
.post-card__images--6,
.post-card__images--7,
.post-card__images--8,
.post-card__images--9 {
  grid-template-columns: repeat(3, 1fr);
}

.post-card__image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12rpx;
  background: #F4F6FA;
}

.post-card__images--1 .post-card__image {
  aspect-ratio: 4/3;
  max-height: 360rpx;
  border-radius: 12rpx;
}

.post-card__image-more {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12rpx;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.post-card__image-more text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 600;
}

/* --- 话题标签 --- */
.post-card__topics {
  margin-bottom: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.post-card__topic-tag {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-weight: 500;
}

.post-card__topic-tag--green {
  color: #2DB97A;
  background: #E8F8F0;
}

.post-card__topic-tag--pink {
  color: #EC4899;
  background: #FFF5F7;
}

/* --- 底部互动栏 --- */
.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #F4F6FA;
}

.post-card__time {
  font-size: 22rpx;
  color: #9AA1AB;
}

.post-card__actions {
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.post-card__action {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 4rpx;
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.post-card__action:active {
  transform: scale(0.9);
}

.post-card__action--animating {
  animation: like-bounce 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes like-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

.post-card__action-icon {
  width: 36rpx;
  height: 36rpx;
  color: #9AA1AB;
  flex-shrink: 0;
}

.post-card__action--liked .post-card__action-icon {
  color: #E5454D;
}

.post-card__action-count {
  font-size: 24rpx;
  color: #9AA1AB;
  font-weight: 500;
}

.post-card__action--liked .post-card__action-count,
.post-card__action-count--liked {
  color: #E5454D;
}

.post-card__action--collected .post-card__action-icon {
  color: #F59E0B;
}

/* 已删除：旧的 emoji 颜色样式 */

/* ========== 底部留白 ========== */
.circle-footer {
  height: 180rpx;
}

/* ========== 悬浮发帖按钮 ========== */
.fab-post {
  position: fixed;
  right: 32rpx;
  bottom: calc(env(safe-area-inset-bottom) + 160rpx);
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #3FCF8E 0%, #2DB97A 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(63, 207, 142, 0.4);
  z-index: 100;
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fab-post:active {
  transform: scale(0.9);
}

.fab-post__icon {
  font-size: 44rpx;
}
</style>
