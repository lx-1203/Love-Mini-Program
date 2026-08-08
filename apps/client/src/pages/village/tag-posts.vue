<script setup lang="ts">
/**
 * 标签聚合页
 * 展示指定话题标签下的所有帖子，支持下拉刷新和上拉加载更多
 */
import { ref, onUnmounted } from "vue";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { openAppPath } from "../../utils/navigation";
import { request } from "../../services/http";
import { appEnv } from "../../services/env";
import { IMAGE_PATHS } from "../../config/images";
import { TOAST_DURATION } from "../../constants/limits";
// 修复 no-duplicate-imports：合并 ../../stores/village 的重复 import
import { useVillageStore, formatRelativeTime, type PostItem } from "../../stores/village";
// R4-batch2: mock 标签帖子数据源（仅 apiMode === "mock" 分支使用，real 模式不读取）
import { mockTagPosts } from "../../stores/village/mock-data";

/** 状态/互动图标（emoji 实体替换为 SVG） */
const stateIcons = {
  error: IMAGE_PATHS.ICONS_EMOJI.WARNING,
  empty: IMAGE_PATHS.ICONS_EMOJI.BOOKMARK,
  comment: IMAGE_PATHS.ICONS_EMOJI.CHAT,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  heartFilled: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED,
  share: IMAGE_PATHS.ICONS_COMMON.SHARE_ICON_SVG,
} as const;

/** Phase 4.4 验收 · 帖子点赞（2026-08-08 论坛互动真实化：接入 villageStore.likePost，后端为准） */
async function toggleLike(post: PostItem): Promise<void> {
  try {
    await villageStore.likePost(post.id);
    // R4-00092：store 的乐观更新仅作用于 store 内部列表，本页为独立本地列表，
    // 需在服务端 toggle 成功后同步本地点赞态/计数，避免"点赞状态不回显"。
    post.isLiked = !post.isLiked;
    post.likes = Math.max(0, post.likes + (post.isLiked ? 1 : -1));
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : t("village.likeFailed"),
      icon: "none",
    });
    console.error("点赞失败:", error);
  }
}

/** Phase 4.4 验收 · 帖子分享（引导使用微信转发菜单，H5 提示说明） */
function handleSharePost(post: PostItem): void {
  // mp-weixin：开启转发菜单；H5：提示说明（浏览器环境无原生分享）
  try {
    uni.showShareMenu({
      withShareTicket: true,
      menus: ["shareAppMessage", "shareTimeline"],
    });
  } catch (_e) {
    // H5 端 showShareMenu 不支持时静默降级
  }
  uni.showToast({
    title: t("village.tagPosts.shareHint", { author: post.author.name }),
    icon: "none",
    duration: TOAST_DURATION.NORMAL_MS,
  });
}
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../utils/media";

const villageStore = useVillageStore();
const { t } = useI18n();

const pageVisible = ref(false);
/** SubTask 1.5.2：页面进入淡入定时器引用，用于卸载时清理 */
let pageEnterTimer: ReturnType<typeof setTimeout> | null = null;

onShow(() => {
  pageVisible.value = false;
  if (pageEnterTimer) clearTimeout(pageEnterTimer);
  pageEnterTimer = setTimeout(() => {
    pageEnterTimer = null;
    pageVisible.value = true;
  }, 30);
});

/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 */
onUnmounted(() => {
  if (pageEnterTimer) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
  }
});

// R4-00159：页面卸载时清理 village store 定时器/请求资源
onUnload(() => {
  villageStore.dispose();
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
/**
 * 当前页码（R4-00093：改为 1 基分页，与 /posts 契约分页口径一致；
 * 此前 0 基导致与契约约定漂移，联调易出错）
 */
const page = ref(1);
/** 是否还有更多 */
const hasMore = ref(true);
/** 错误信息 */
const errorMessage = ref("");

/** 每页数量 */
const PAGE_SIZE = 20;
/** Mock 模式模拟网络延迟（R4-batch4：魔法数字提取） */
const MOCK_LOAD_DELAY_MS = 600;
/** 缺失 tagName 参数时提示后返回的延时（R4-batch4：魔法数字提取） */
const MISSING_PARAM_NAV_DELAY_MS = 600;

/**
 * 加载标签下的帖子列表
 * @param reset - 是否重置列表
 */
async function loadPosts(reset = true) {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";

  // R4-00093：1 基分页（首页=1），与 /posts 契约一致
  const currentPageNum = reset ? 1 : page.value + 1;

  try {
    if (appEnv.apiMode === "mock") {
      // Mock 模式：模拟标签帖子数据
      await new Promise((r) => setTimeout(r, MOCK_LOAD_DELAY_MS));
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
    // R4-00092：响应类型补充可选互动字段（后端返回时直接映射回显，
    // 缺失时兜底 false，保证「点赞/收藏/置顶回显」真实化）
    const data = await request<Array<{
      id: number; title: string; summary: string;
      author: { userId: number; nickname: string; avatarUrl: string; campusName: string };
      category: string; tags: string[];
      likeCount: number; commentCount: number; shareCount: number;
      favoriteCount?: number; viewCount?: number;
      createdAt: string; isHot: boolean; isAlumni: boolean;
      isLiked?: boolean; isFollowed?: boolean; isShared?: boolean; isFavorite?: boolean;
    }>>({
      url: `/post-tags/posts?tagName=${encodeURIComponent(tagName.value)}&page=${currentPageNum}&size=${PAGE_SIZE}`,
      method: "GET",
    });

    const newPosts: PostItem[] = data.map((raw) => ({
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
      isLiked: raw.isLiked ?? false,
      isFollowed: raw.isFollowed ?? false,
      isShared: raw.isShared ?? false,
      isAlumni: raw.isAlumni ?? false,
      // 2026-08-08 论坛互动真实化：收藏/浏览量透传（标签页后端可能缺失，兜底）
      favorites: raw.favoriteCount ?? 0,
      isFavorite: raw.isFavorite ?? false,
      views: raw.viewCount ?? 0,
      createdAt: raw.createdAt,
    }));

    posts.value = reset ? newPosts : [...posts.value, ...newPosts];
    hasMore.value = data.length >= PAGE_SIZE;
    page.value = currentPageNum;
  } catch (error) {
    // R4-00094：兜底文案走 i18n
    errorMessage.value = error instanceof Error ? error.message : t("village.tagPosts.loadFailed");
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
 *
 * R4-batch2：mock 作者 ID（1001-1006）与帖子数据已移入
 * stores/village/mock-data.ts 的 mockTagPosts（mock-only 数据源），
 * 本函数仅在 appEnv.apiMode === "mock" 分支被调用。
 */
function getMockTagPosts(tag: string): PostItem[] {
  // 过滤匹配的帖子
  return mockTagPosts.filter((p) =>
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
  if (raw && typeof raw === "string" && raw.trim().length > 0) {
    tagName.value = decodeURIComponent(raw);
    loadPosts(true);
    return;
  }
  // P1-36：无 tagName 参数时提示并返回，不再发空请求
  uni.showToast({ title: t("village.tagPostsMissingParam"), icon: "none" });
  setTimeout(() => {
    if (getCurrentPages().length > 1) {
      uni.navigateBack();
    } else {
      uni.switchTab({ url: "/pages/village/index" });
    }
  }, MISSING_PARAM_NAV_DELAY_MS);
});
</script>

<template>
  <view class="tag-posts-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航栏 -->
    <view class="tag-header">
      <view class="tag-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="back-icon">{{ t("common.back") }}</text>
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
        <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('common.loading')" />
        <text class="feed-state__text">{{ t("village.tagPosts.loadingPosts") }}</text>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="errorMessage && posts.length === 0" class="feed-state">
        <image class="feed-state__icon" :src="stateIcons.error" mode="aspectFit" alt="" />
        <text class="feed-state__text">{{ errorMessage }}</text>
        <view class="feed-state__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="onRefresh">
          <text class="feed-state__btn-text">{{ t("common.retry") }}</text>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!loading && posts.length === 0" class="feed-state">
        <image class="feed-empty__icon" :src="stateIcons.empty" mode="aspectFit" alt="" />
        <text class="feed-empty__title">{{ t("village.emptyPosts") }}</text>
        <text class="feed-empty__desc">{{ t("village.tagPosts.emptyDesc") }}</text>
      </view>

      <!-- 帖子卡片列表 -->
      <view
        v-for="post in posts" :key="post.id"
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
                :src="resolveMediaUrl(post.author.avatar)"
                mode="aspectFill"
                lazy-load alt=""
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
            v-for="tag in post.tags" :key="tag"
            class="post-card__tag"
          >{{ tag }}</text>
        </view>

        <!-- 底部互动栏 -->
        <view class="post-card__footer">
          <text class="post-card__time">{{ formatRelativeTime(post.createdAt) }}</text>
          <view class="post-card__actions">
            <view
              class="action-btn press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('village.tagPosts.commentAria')"
              @tap.stop="goToDetail(post.id)"
            >
              <image class="action-btn__icon" :src="stateIcons.comment" mode="aspectFit" alt="" />
              <text v-if="post.comments > 0" class="action-btn__count">{{ post.comments }}</text>
            </view>
            <view
              class="action-btn press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('village.tagPosts.likeAria')"
              :aria-pressed="post.isLiked"
              @tap.stop="toggleLike(post)"
            >
              <image class="action-btn__icon" :src="post.isLiked ? stateIcons.heartFilled : stateIcons.heart" mode="aspectFit" alt="" />
              <text v-if="post.likes > 0" class="action-btn__count">{{ post.likes }}</text>
            </view>
            <view
              class="action-btn press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('village.tagPosts.shareAria')"
              @tap.stop="handleSharePost(post)"
            >
              <image class="action-btn__icon" :src="stateIcons.share" mode="aspectFit" alt="" />
              <text v-if="post.shares > 0" class="action-btn__count">{{ post.shares }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多提示 -->
      <view v-if="isLoadingMore" class="load-more" role="status" aria-live="polite">
        <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('common.loading')" />
        <text class="load-more__text">{{ t("village.tagPosts.loadMore") }}</text>
      </view>
      <view v-else-if="!hasMore && posts.length > 0" class="load-more">
        <text class="load-more__text">{{ t("village.tagPosts.noMore") }}</text>
      </view>

      <!-- 底部留白 -->
      <view class="feed-bottom-spacer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand, #3FCF8E);
$green-light: var(--c-tint-green-50, #E8F9F4);
$pink-primary: var(--c-romance-500, #EC4899);
$pink-light: var(--c-tint-pink-soft, #FFF0F5);
$bg-page: var(--c-bg-page, #F4F6FA);
/* ui-ux 修复：$text-primary 统一为文本次要色 token（原 --c-neutral-800 语义漂移） */
$text-primary: var(--c-text-primary, #1F2329);
/* ui-ux 修复：$text-secondary 语义应为文本次要色（原映射到 tertiary） */
$text-secondary: var(--c-text-secondary, #5B6470);
$text-tertiary: var(--c-text-quaternary, #B8B8C8);
$divider: var(--c-neutral-100, #EEF0F5);
$white: var(--c-neutral-0, #FFFFFF);
$red-badge: var(--c-error, #FF4757);

.tag-posts-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: $bg-page;
  overflow: hidden;
}

/* ========== 顶部导航栏 ========== */
.tag-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-300, #7CD9A6) 50%, var(--c-romance-300, #F9A8C4) 100%);
}

.tag-header__back {
  padding: 8rpx 0;
  min-width: 80rpx;
}

.back-icon {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-overlay-bg-solid, var(--c-overlay-bg-solid, rgba(255,255,255,0.9)));
  font-weight: 500;
}

.tag-header__title {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  /* R4-02540：品牌渐变底上的反色文字改用 --c-text-inverse（深色模式自动适配） */
  color: var(--c-text-inverse);
  text-shadow: 0 2rpx 8rpx var(--c-black-shadow-md, var(--c-black-shadow-md, rgba(0,0,0,0.1)));
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
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-slowest, 600ms) linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.feed-state__icon {
  width: 80rpx;
  height: 80rpx;
  color: var(--c-text-tertiary);
}

.feed-state__text {
  font-size: var(--fs-lg, 28rpx);
  color: $text-tertiary;
  text-align: center;
  line-height: 1.6;
}

.feed-state__btn {
  padding: 18rpx 48rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-400, #2DB97A) 100%);
  box-shadow: var(--s-brand-md, 0 4rpx 16rpx var(--c-brand-shadow-tint-mid, rgba(63, 207, 142, 0.20)));
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.feed-state__btn:active {
  transform: scale(0.96);
}
/* #endif */

.feed-state__btn-text {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-neutral-0, #ffffff);
  font-weight: 600;
}

.feed-empty__icon {
  width: 88rpx;
  height: 88rpx;
  color: var(--c-text-tertiary);
}

.feed-empty__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 600;
  color: $text-primary;
}

.feed-empty__desc {
  font-size: var(--fs-md, 26rpx);
  color: $text-tertiary;
}

/* ========== 帖子卡片 ========== */
.post-card {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin: 16rpx 24rpx;
  padding: 28rpx;
  /* R4-02540：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: var(--s-card-soft, 0 1rpx 2rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)), 0 4rpx 12rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.post-card:active {
  transform: scale(0.98);
}
/* #endif */

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
  border-radius: var(--r-circle, 50%);
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
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  /* R4-02540：品牌色底上的头像占位字改用 --c-text-inverse（深色模式自动适配） */
  color: var(--c-text-inverse);
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
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: $text-primary;
  line-height: 1.2;
}

.user-info__headline {
  font-size: var(--fs-sm, 22rpx);
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
  font-size: var(--fs-xl, 30rpx);
  color: $text-primary;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 6.8em;
  /* #endif */
}

/* --- 标签 --- */
.post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.post-card__tag {
  font-size: var(--fs-base, 24rpx);
  color: $green-primary;
  background: $green-light;
  padding: 8rpx 18rpx;
  border-radius: var(--r-full, 9999rpx);
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
  font-size: var(--fs-base, 24rpx);
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
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.action-btn:active {
  transform: scale(0.9);
}
/* #endif */

.action-btn__icon {
  width: 28rpx;
  height: 28rpx;
  color: $text-tertiary;
}

.action-btn__count {
  font-size: var(--fs-base, 24rpx);
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
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.feed-bottom-spacer {
  height: 100rpx;
}
</style>