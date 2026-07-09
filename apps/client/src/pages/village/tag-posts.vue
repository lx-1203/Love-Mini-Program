<script setup lang="ts">
/**
 * 标签聚合页
 * 展示指定话题标签下的所有帖子，支持下拉刷新和上拉加载更多
 */
import { ref, computed, onMounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { openAppPath } from "../../utils/navigation";
import { request } from "../../services/http";
import { appEnv } from "../../services/env";
import { useVillageStore, formatRelativeTime } from "../../stores/village";
import type { PostItem, PostAuthor } from "../../stores/village";

const villageStore = useVillageStore();

const pageVisible = ref(false);
onShow(() => {
  pageVisible.value = false;
  setTimeout(() => {
    pageVisible.value = true;
  }, 30);
});

/** 当前标签名称 */
const tagName = ref("");
/** 帖子列表 */
const posts = ref<PostItem[]>([]);
/** 加载状态 */
const loading = ref(false);
/** 是否正在刷新 */
const isRefreshing = ref(false);
/** 是否正在加载更多 */
const isLoadingMore = ref(false);
/** 当前页码 */
const page = ref(0);
/** 是否还有更多 */
const hasMore = ref(true);
/** 错误信息 */
const errorMessage = ref("");

/** 每页数量 */
const PAGE_SIZE = 20;

/**
 * 加载标签下的帖子列表
 * @param reset - 是否重置列表
 */
async function loadPosts(reset = true) {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";

  const currentPageNum = reset ? 0 : page.value + 1;

  try {
    if (appEnv.apiMode === "mock") {
      // Mock 模式：模拟标签帖子数据
      await new Promise((r) => setTimeout(r, 600));
      const mockTagPosts = getMockTagPosts(tagName.value);
      const from = currentPageNum * PAGE_SIZE;
      const to = Math.min(from + PAGE_SIZE, mockTagPosts.length);
      const pageItems = from < mockTagPosts.length ? mockTagPosts.slice(from, to) : [];
      posts.value = reset ? pageItems : [...posts.value, ...pageItems];
      hasMore.value = to < mockTagPosts.length;
      page.value = currentPageNum;
      return;
    }

    // Real 模式：调用后端 API GET /api/post-tags/posts
    const data = await request<Array<{
      id: number; title: string; summary: string;
      author: { userId: number; nickname: string; avatarUrl: string; campusName: string };
      category: string; tags: string[];
      likeCount: number; commentCount: number; shareCount: number;
      createdAt: string; isHot: boolean; isAlumni: boolean;
    }>>({
      url: `/post-tags/posts?tagName=${encodeURIComponent(tagName.value)}&page=${currentPageNum}&size=${PAGE_SIZE}`,
      method: "GET",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newPosts = (data as any[]).map((raw: any): PostItem => ({
      id: String(raw.id),
      author: {
        userId: String(raw.author.userId),
        name: raw.author.nickname,
        avatar: raw.author.avatarUrl || "",
        headline: raw.author.campusName || "",
        campusName: raw.author.campusName,
      },
      categoryId: raw.category,
      title: raw.title,
      content: raw.summary,
      images: [],
      tags: raw.tags,
      likes: raw.likeCount,
      comments: raw.commentCount,
      shares: raw.shareCount,
      isLiked: false,
      isFollowed: false,
      isShared: false,
      isAlumni: false,
      createdAt: raw.createdAt,
    }));

    posts.value = reset ? newPosts : [...posts.value, ...newPosts];
    hasMore.value = data.length >= PAGE_SIZE;
    page.value = currentPageNum;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "加载帖子失败";
  } finally {
    loading.value = false;
    isRefreshing.value = false;
    isLoadingMore.value = false;
  }
}

/**
 * 下拉刷新
 */
function onRefresh() {
  isRefreshing.value = true;
  loadPosts(true);
}

/**
 * 上拉加载更多
 */
function onLoadMore() {
  if (isLoadingMore.value || loading.value || !hasMore.value) return;
  isLoadingMore.value = true;
  loadPosts(false);
}

/**
 * Mock 标签帖子数据
 */
function getMockTagPosts(tag: string): PostItem[] {
  const allMockPosts: PostItem[] = [
    {
      id: "mock-tag-post-1",
      author: { userId: "1001", name: "星野", avatar: "", headline: "北京·985硕士", campusName: "北京大学" },
      categoryId: "sincere", title: "", content: "今天在图书馆遇到一个认真学习的女生，感觉好有气质！",
      images: [], tags: ["#校园日常", "#表白墙"], likes: 32, comments: 8, shares: 3,
      isLiked: false, isFollowed: false, isShared: false, isAlumni: false, createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "mock-tag-post-2",
      author: { userId: "1002", name: "阿泽", avatar: "", headline: "上海·互联网大厂", campusName: "复旦大学" },
      categoryId: "interest", title: "", content: "有没有一起打羽毛球的？周末约起来！求搭子！",
      images: [], tags: ["#找搭子", "#兴趣分享"], likes: 18, comments: 12, shares: 4,
      isLiked: true, isFollowed: false, isShared: false, isAlumni: false, createdAt: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: "mock-tag-post-3",
      author: { userId: "1003", name: "橙子", avatar: "", headline: "杭州·设计师", campusName: "浙江大学" },
      categoryId: "activity", title: "", content: "急！计算机组成原理期末怎么复习？求大佬带带",
      images: [], tags: ["#求助", "#技术交流"], likes: 45, comments: 23, shares: 6,
      isLiked: false, isFollowed: true, isShared: false, isAlumni: false, createdAt: new Date(Date.now() - 18000000).toISOString(),
    },
    {
      id: "mock-tag-post-4",
      author: { userId: "1004", name: "北岛", avatar: "", headline: "成都·创业者", campusName: "四川大学" },
      categoryId: "sincere", title: "", content: "毕业5年了，想问问学弟学妹们学校现在变化大吗？",
      images: [], tags: ["#校友动态", "#生活记录"], likes: 67, comments: 19, shares: 10,
      isLiked: false, isFollowed: false, isShared: true, isAlumni: false, createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "mock-tag-post-5",
      author: { userId: "1005", name: "南风", avatar: "", headline: "深圳·产品经理", campusName: "北京大学" },
      categoryId: "life", title: "", content: "记录一下今天在食堂吃到的好吃的！麻辣香锅绝了",
      images: [], tags: ["#生活记录", "#校园日常"], likes: 23, comments: 5, shares: 2,
      isLiked: false, isFollowed: false, isShared: false, isAlumni: false, createdAt: new Date(Date.now() - 90000000).toISOString(),
    },
    {
      id: "mock-tag-post-6",
      author: { userId: "1006", name: "小鹿", avatar: "", headline: "北京·Java开发", campusName: "清华大学" },
      categoryId: "interest", title: "", content: "想找个一起刷 LeetCode 的队友，每天互相监督",
      images: [], tags: ["#技术交流", "#找搭子"], likes: 15, comments: 7, shares: 3,
      isLiked: false, isFollowed: false, isShared: false, isAlumni: false, createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  // 过滤匹配的帖子
  return allMockPosts.filter((p) =>
    p.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

/**
 * 点击帖子进入详情
 */
function goToDetail(postId: string) {
  villageStore.setCurrentPost(postId);
  openAppPath("/pages/village/detail");
}

/**
 * 返回上一页
 */
function goBack() {
  uni.navigateBack();
}

onLoad((query) => {
  const raw = query?.tagName;
  if (raw && typeof raw === "string") {
    tagName.value = decodeURIComponent(raw);
  }
  loadPosts(true);
});
</script>

<template>
  <view class="tag-posts-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航栏 -->
    <view class="tag-header">
      <view class="tag-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">返回</text>
      </view>
      <text class="tag-header__title">#{{ tagName }}</text>
      <view class="tag-header__spacer" />
    </view>

    <!-- 帖子列表 -->
    <scroll-view
      class="post-feed"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- 加载状态 -->
      <view v-if="loading && posts.length === 0" class="feed-state">
        <view class="loading-spinner" />
        <text class="feed-state__text">正在加载帖子...</text>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="errorMessage && posts.length === 0" class="feed-state">
        <text class="feed-state__icon">&#x1F614;</text>
        <text class="feed-state__text">{{ errorMessage }}</text>
        <view class="feed-state__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="onRefresh">
          <text class="feed-state__btn-text">重试</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading && posts.length === 0" class="feed-state">
        <text class="feed-empty__icon">&#x1F4ED;</text>
        <text class="feed-empty__title">暂无帖子</text>
        <text class="feed-empty__desc">该标签下还没有内容</text>
      </view>

      <!-- 帖子卡片列表 -->
      <view
        v-for="post in posts"
        :key="post.id"
        class="post-card list-item"
        @tap="goToDetail(post.id)"
      >
        <!-- 作者信息行 -->
        <view class="post-card__header">
          <view class="post-card__user">
            <view class="user-avatar">
              <image
                v-if="post.author.avatar"
                class="user-avatar__img"
                :src="post.author.avatar"
                mode="aspectFill"
        lazy-load
              />
              <text v-else class="user-avatar__char">{{ post.author.name[0] }}</text>
            </view>
            <view class="user-info">
              <view class="user-info__name-row">
                <text class="user-info__name">{{ post.author.name }}</text>
              </view>
              <text class="user-info__headline">{{ post.author.headline }}</text>
            </view>
          </view>
        </view>

        <!-- 正文内容 -->
        <view class="post-card__body">
          <text class="post-card__content">{{ post.content }}</text>
        </view>

        <!-- 标签 -->
        <view v-if="post.tags.length > 0" class="post-card__tags">
          <text
            v-for="tag in post.tags"
            :key="tag"
            class="post-card__tag"
          >{{ tag }}</text>
        </view>

        <!-- 底部互动栏 -->
        <view class="post-card__footer">
          <text class="post-card__time">{{ formatRelativeTime(post.createdAt) }}</text>
          <view class="post-card__actions">
            <view class="action-btn">
              <text class="action-btn__icon">&#x1F4AC;</text>
              <text v-if="post.comments > 0" class="action-btn__count">{{ post.comments }}</text>
            </view>
            <view class="action-btn">
              <text class="action-btn__icon">&#x2764;</text>
              <text v-if="post.likes > 0" class="action-btn__count">{{ post.likes }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多提示 -->
      <view v-if="isLoadingMore" class="load-more">
        <view class="loading-spinner" />
        <text class="load-more__text">加载中...</text>
      </view>
      <view v-else-if="!hasMore && posts.length > 0" class="load-more">
        <text class="load-more__text">-- 没有更多了 --</text>
      </view>

      <!-- 底部留白 -->
      <view class="feed-bottom-spacer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: #3FCF8E;
$green-light: #E8F9F4;
$pink-primary: #EC4899;
$pink-light: #FFF0F5;
$bg-page: #F4F6FA;
$text-primary: #1A1A2E;
$text-secondary: #8E8E9E;
$text-tertiary: #B8B8C8;
$divider: #EEF0F5;
$white: #FFFFFF;
$red-badge: #FF4757;

.tag-posts-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: $bg-page;
  overflow: hidden;
}

/* ========== 顶部导航栏 ========== */
.tag-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: linear-gradient(135deg, $green-primary 0%, #7CD9A6 50%, #F9A8C4 100%);
}

.tag-header__back {
  padding: 8rpx 0;
  min-width: 80rpx;
}

.back-icon {
  font-size: 28rpx;
  color: rgba(255,255,255,0.9);
  font-weight: 500;
}

.tag-header__title {
  font-size: 36rpx;
  font-weight: 700;
  color: $white;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}

.tag-header__spacer {
  min-width: 80rpx;
}

/* ========== 帖子列表容器 ========== */
.post-feed {
  flex: 1;
  overflow-y: auto;
}

/* ========== 状态提示 ========== */
.feed-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 120rpx 40rpx;
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid $divider;
  border-top-color: $green-primary;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.feed-state__icon {
  font-size: 80rpx;
}

.feed-state__text {
  font-size: 28rpx;
  color: $text-tertiary;
  text-align: center;
  line-height: 1.6;
}

.feed-state__btn {
  padding: 18rpx 48rpx;
  border-radius: 999px;
  background: linear-gradient(135deg, $green-primary 0%, #2DB87A 100%);
  box-shadow: 0 4rpx 12rpx rgba(63, 207, 142, 0.3);
  transition: transform 0.15s ease;
}

.feed-state__btn:active {
  transform: scale(0.96);
}

.feed-state__btn-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

.feed-empty__icon {
  font-size: 88rpx;
}

.feed-empty__title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}

.feed-empty__desc {
  font-size: 26rpx;
  color: $text-tertiary;
}

/* ========== 帖子卡片 ========== */
.post-card {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin: 16rpx 24rpx;
  padding: 28rpx;
  background: $white;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
  transition: transform 0.15s ease;
}

.post-card:active {
  transform: scale(0.98);
}

/* --- 作者信息行 --- */
.post-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.post-card__user {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, $green-light, $green-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar__img {
  width: 100%;
  height: 100%;
}

.user-avatar__char {
  font-size: 32rpx;
  font-weight: 700;
  color: $white;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.user-info__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.user-info__name {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-primary;
  line-height: 1.2;
}

.user-info__headline {
  font-size: 22rpx;
  color: $text-tertiary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- 正文内容 --- */
.post-card__body {
  padding: 0 4rpx;
}

.post-card__content {
  font-size: 30rpx;
  color: $text-primary;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

/* --- 标签 --- */
.post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.post-card__tag {
  font-size: 24rpx;
  color: $green-primary;
  background: $green-light;
  padding: 8rpx 18rpx;
  border-radius: 999px;
  font-weight: 500;
}

/* --- 底部互动栏 --- */
.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid $divider;
}

.post-card__time {
  font-size: 24rpx;
  color: $text-tertiary;
}

.post-card__actions {
  display: flex;
  align-items: center;
  gap: 28rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 0;
  transition: transform 0.15s ease;
}

.action-btn:active {
  transform: scale(0.9);
}

.action-btn__icon {
  font-size: 28rpx;
  line-height: 1;
  color: $text-tertiary;
}

.action-btn__count {
  font-size: 24rpx;
  color: $text-tertiary;
  font-weight: 500;
}

/* ========== 加载更多 & 底部留白 ========== */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 32rpx 0;
}

.load-more__text {
  font-size: 24rpx;
  color: $text-tertiary;
}

.feed-bottom-spacer {
  height: 100rpx;
}
</style>