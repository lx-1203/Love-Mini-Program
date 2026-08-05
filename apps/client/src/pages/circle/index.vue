<script setup lang="ts">
/**
 * 圈子页 - 校园墙帖子浏览与发布
 */
import { ref, computed, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { openAppPath } from "../../utils/navigation";
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
import BaseTabs from "../../components/common/BaseTabs.vue";

/** Task 28：i18n 文案 */
const { t } = useI18n();

/** 点赞动画定时器集合，用于卸载时统一清理 */
const likeAnimTimers = new Set<ReturnType<typeof setTimeout>>();

/** Emoji 替换 SVG 图标路径 */
const emojiIcons = {
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  chat: IMAGE_PATHS.ICONS_EMOJI.CHAT,
  share: IMAGE_PATHS.ICONS_SOCIAL.SHARE,
  star: IMAGE_PATHS.ICONS_COMMON.STAR_SVG,
} as const;

// Tab 切换 - 扩展为更多分类（Task 28：label 通过 i18n 计算属性动态切换）
const tabs = computed(() => [
  { key: "recommend", label: t("circle.tabRecommend") },
  { key: "following", label: t("circle.tabFollowing") },
  { key: "campus", label: t("circle.tabCampus") },
  { key: "love", label: t("circle.tabLove") },
  { key: "treehole", label: t("circle.tabTreehole") },
]);
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
    content: "有人一起上晚自习吗？求组队！可以互相监督，提高效率～期末复习ing，一个人真的太容易摸鱼了。",
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
    content: "毕业季了，整理了一些考研资料，有需要的同学可以联系我。祝大家都能上岸！",
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
    content: "今天的晚霞真的太美了！和喜欢的人一起看晚霞是世界上最幸福的事吧～",
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
      const timer = setTimeout(() => {
        post.likeAnimating = false;
        likeAnimTimers.delete(timer);
      }, 300);
      likeAnimTimers.add(timer);
    }
  }
}

/**
 * 页面卸载时清理所有点赞动画定时器，避免内存泄漏。
 * 修复（P1 BUG）：原实现未保存 setTimeout 返回值，页面销毁后定时器仍可能触发
 * 修改已销毁组件的响应式状态 post.likeAnimating。
 */
onUnmounted(() => {
  likeAnimTimers.forEach((timer) => clearTimeout(timer));
  likeAnimTimers.clear();
});

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
  openAppPath("/pages/circles/post-topic");
}

/** 帖子卡片点击（收尾轮：跳转村口对应帖子详情，不再 toast 占位；detail 页消费 query.id） */
function handleCardTap(postId: string) {
  lightHaptic();
  openAppPath(`/pages/village/detail?id=${encodeURIComponent(postId)}`);
}

/** 分享按钮处理 */
function handleShare() {
  try {
    uni.showShareMenu({
      withShareTicket: true,
      menus: ["shareAppMessage", "shareTimeline"],
    });
  } catch (_e) {
    uni.showToast({ title: t("circle.shareDeveloping"), icon: "none" });
  }
}

// 修复（严格模式 noUnusedLocals）：toggleLike/toggleFollow/toggleCollect/handleShare 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ toggleLike, toggleFollow, toggleCollect, handleShare });
</script>

<template>
  <view class="circle-page">
    <!-- 顶部导航 -->
    <view class="circle-header">
      <view class="circle-header__top">
        <text class="circle-header__title">{{ $t("circle.navTitle") }}</text>
        <view class="circle-header__publish" @tap="goToPost">
          <text class="circle-header__publish-text">{{ $t("circle.publishBtn") }}</text>
        </view>
      </view>
      <!-- 分类标签栏 -->
      <BaseTabs
        v-model="activeTab"
        :tabs="tabs"
        variant="pill"
        :scrollable="true"
        :equalSplit="false"
      />
    </view>

    <!-- 帖子列表 -->
    <scroll-view scroll-y class="circle-scroll">
      <view class="post-list" role="list">
        <view v-for="(post, index) in posts" :key="post.id" class="post-card" :style="{ animationDelay: index * 80 + 'ms' }" @tap="handleCardTap(post.id)" role="listitem">
          <!-- 用户信息头部 -->
          <view class="post-card__header">
            <view class="post-card__user">
              <SafeImage :src="post.avatar" custom-class="post-card__avatar" mode="aspectFill" :lazy-load="true" />
              <view class="post-card__meta">
                <view class="post-card__name-row">
                  <text class="post-card__nickname">{{ post.nickname }}</text>
                  <view class="post-card__gender-badge post-card__gender-badge--male">
                    <image class="post-card__gender-badge-img" :src="IMAGE_PATHS.ICONS_EMOJI.USER" mode="aspectFit" alt="" />
                  </view>
                </view>
                <text class="post-card__school">{{ post.school }} · {{ post.grade }}</text>
              </view>
            </view>
            <view
              class="post-card__follow"
              :class="{ 'post-card__follow--active': post.isFollowing }"
  @tap.stop="toggleFollow(post.id)"
            >
              <text class="post-card__follow-text">{{ post.isFollowing ? $t('circle.followedBtn') : $t('circle.followBtn') }}</text>
            </view>
          </view>

          <!-- 正文内容 -->
          <text class="post-card__content">{{ post.content }}</text>

          <!-- 图片区域 -->
          <view v-if="post.images.length > 0" class="post-card__images" :class="'post-card__images--' + post.images.length">
            <view
              v-for="(img, idx) in post.images.slice(0, 9)" :key="idx"
              class="post-card__image-wrap"
            >
              <SafeImage
                custom-class="post-card__image"
                :src="img"
                mode="aspectFill"
                :lazy-load="true"
              />
            </view>
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
              <view class="post-card__action" :class="{ 'post-card__action--liked': post.isLiked, 'post-card__action--animating': post.likeAnimating }" catchtap="toggleLike(post.id)">
                <image class="post-card__action-icon" :src="emojiIcons.heart" mode="aspectFit" alt="" />
                <text class="post-card__action-count" :class="{ 'post-card__action-count--liked': post.isLiked }">{{ post.likes }}</text>
              </view>
              <!-- 评论 -->
              <view class="post-card__action">
                <image class="post-card__action-icon" :src="emojiIcons.chat" mode="aspectFit" alt="" />
                <text class="post-card__action-count">{{ post.comments }}</text>
              </view>
              <!-- 分享 -->
              <view class="post-card__action" catchtap="handleShare">
                <image class="post-card__action-icon" :src="emojiIcons.share" mode="aspectFit" alt="" />
                <text v-if="post.shares > 0" class="post-card__action-count">{{ post.shares }}</text>
              </view>
              <!-- 收藏 -->
              <view class="post-card__action" :class="{ 'post-card__action--collected': post.isCollected }" catchtap="toggleCollect(post.id)">
                <image class="post-card__action-icon" :src="emojiIcons.star" mode="aspectFit" alt="" />
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
      <text class="fab-post__icon-text">+</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.circle-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: var(--c-bg-page);
}

/* ========== 顶部导航 ========== */
.circle-header {
  background: var(--c-bg-container);
  padding-top: calc(env(safe-area-inset-top) + 16rpx);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs);
}

.circle-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 20rpx;
}

.circle-header__title {
  font-size: var(--fs-4xl, 40rpx);
  font-weight: 800;
  color: var(--c-text-primary);
  letter-spacing: 1rpx;
}

.circle-header__publish {
  padding: 12rpx 28rpx;
  background: linear-gradient(135deg, var(--c-brand) 0%, var(--c-brand-400) 100%);
  border-radius: var(--r-full, 9999rpx);
  box-shadow: 0 4rpx 12rpx var(--c-brand-shadow-tint-strong);
}

/* #ifdef H5 */
.circle-header__publish:active {
  transform: scale(0.95);
  opacity: 0.9;
}
/* #endif */

.circle-header__publish-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
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
  background: var(--c-bg-container);
  border-radius: var(--r-lg, 16rpx);
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx var(--c-neutral-shadow-xs), 0 1rpx 3rpx var(--c-neutral-shadow-xs);
  animation: card-slide-up var(--d-bounce, 400ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* #ifdef H5 */
.post-card:active {
  transform: scale(0.995);
}
/* #endif */

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
  border-radius: var(--r-circle, 50%);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  border: 2rpx solid var(--c-brand-border-tint);
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
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
}

.post-card__gender-badge {
  width: 32rpx;
  height: 32rpx;
  border-radius: var(--r-circle, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-xs, 20rpx);
  font-weight: bold;
}

.post-card__gender-badge--male {
  background: var(--c-tint-blue-soft);
  color: var(--c-info-500);
}

.post-card__gender-badge--female {
  background: var(--c-tint-pink-soft);
  color: var(--c-romance-500);
}

.post-card__school {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
}

/* --- 关注按钮 --- */
.post-card__follow {
  padding: 10rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, var(--c-brand) 0%, var(--c-brand-400) 100%);
  border: none;
  transition: all var(--d-normal, 200ms) ease;
  flex-shrink: 0;
  margin-left: 16rpx;
}

/* #ifdef H5 */
.post-card__follow:active {
  transform: scale(0.95);
}
/* #endif */

.post-card__follow--active {
  background: var(--c-bg-page);
  border: 2rpx solid var(--c-border-default);
}

.post-card__follow-text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.post-card__follow--active .post-card__follow-text {
  color: var(--c-text-tertiary);
  font-weight: 500;
}

/* --- 正文内容 --- */
.post-card__content {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-primary);
  line-height: 1.6;
  margin-bottom: 20rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  overflow: hidden;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 8em;
  /* #endif */
}

/* --- 图片区域 --- */
/* mp-weixin 不支持 display:grid，改用 Flexbox + 子元素 width: calc 实现自适应列布局 */
.post-card__images {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
  border-radius: var(--r-md, 12rpx);
  overflow: hidden;
}

.post-card__images--1 .post-card__image-wrap {
  /* 1 列：100% 宽度，4:3 比例 */
  width: 100%;
  max-width: 480rpx;
  /* 4:3 比例 → padding-top: 75% */
  padding-top: 75%;
  max-height: 360rpx;
  border-radius: var(--r-md, 12rpx);
}

.post-card__images--2 .post-card__image-wrap,
.post-card__images--4 .post-card__image-wrap {
  /* 2 列：width = calc((100% - 8rpx) / 2) */
  width: calc((100% - 8rpx) / 2);
}

.post-card__images--3 .post-card__image-wrap,
.post-card__images--5 .post-card__image-wrap,
.post-card__images--6 .post-card__image-wrap,
.post-card__images--7 .post-card__image-wrap,
.post-card__images--8 .post-card__image-wrap,
.post-card__images--9 .post-card__image-wrap {
  /* 3 列：width = calc((100% - 16rpx) / 3) */
  width: calc((100% - 16rpx) / 3);
}

.post-card__image-wrap {
  position: relative;
  /* mp-weixin 不支持 aspect-ratio，改用 padding-top 百分比（1:1 → 100%） */
  padding-top: 100%;
  border-radius: var(--r-md, 12rpx);
  background: var(--c-bg-page);
  overflow: hidden;
  box-sizing: border-box;
}

.post-card__image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.post-card__image-more {
  position: relative;
  /* 当超过 9 张时显示 +N 遮罩，按 3 列布局尺寸对齐 */
  width: calc((100% - 16rpx) / 3);
  /* mp-weixin 不支持 aspect-ratio，改用 padding-top 百分比（1:1 → 100%） */
  padding-top: calc((100% - 16rpx) / 3);
  border-radius: var(--r-md, 12rpx);
  background: var(--c-overlay-mid-strong);
  overflow: hidden;
  box-sizing: border-box;
}

.post-card__image-more text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-2xl, 32rpx);
  color: var(--c-text-inverse);
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
  font-size: var(--fs-base, 24rpx);
  padding: 8rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  font-weight: 500;
}

.post-card__topic-tag--green {
  color: var(--c-brand-400);
  background: var(--c-bg-brand);
}

.post-card__topic-tag--pink {
  color: var(--c-romance-500);
  background: var(--c-bg-romance);
}

/* --- 底部互动栏 --- */
.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--c-border-light);
}

.post-card__time {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
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
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* #ifdef H5 */
.post-card__action:active {
  transform: scale(0.9);
}
/* #endif */

.post-card__action--animating {
  animation: like-bounce var(--d-fade, 300ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes like-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

.post-card__action-icon {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.post-card__action--liked .post-card__action-icon {
  color: var(--c-error);
}

.post-card__action-count {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.post-card__action--liked .post-card__action-count,
.post-card__action-count--liked {
  color: var(--c-error);
}

.post-card__action--collected .post-card__action-icon {
  color: var(--c-warning);
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
  bottom: calc(env(safe-area-inset-bottom) + 150rpx);
  width: 104rpx;
  height: 104rpx;
  border-radius: var(--r-circle, 50%);
  background: linear-gradient(135deg, var(--c-brand) 0%, var(--c-brand-400) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx var(--c-brand-border-tint-stronger);
  z-index: 100;
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* #ifdef H5 */
.fab-post:active {
  transform: scale(0.9);
}
/* #endif */

.fab-post__icon {
  font-size: var(--fs-5xl, 44rpx);
}
</style>
