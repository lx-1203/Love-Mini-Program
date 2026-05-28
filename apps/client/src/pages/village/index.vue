<script setup lang="ts">
/**
 * 村口页 - UGC社区（六分类版）
 * 用户生成内容社区，展示帖子动态、支持六分类筛选、点赞关注等互动功能
 */
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useVillageStore, formatRelativeTime } from "../../stores/village";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import LockScreen from "../../components/common/LockScreen.vue";
import type { PostItem, PostFilters } from "../../stores/village";

/* ========== Stores ========== */
const villageStore = useVillageStore();
const sessionStore = useSessionStore();
const { loading, errorMessage, categories } = storeToRefs(villageStore);

/* ========== 锁定状态 ========== */
const isUnlocked = computed(() => sessionStore.isProfileComplete);
const completionPercent = computed(() => sessionStore.profileCompletion);

/* ========== localStorage 键名 ========== */
const LAST_CATEGORY_KEY = "village_last_category";

/* ========== 六分类数据结构 ========== */
interface VillageCategory {
  id: string;
  name: string;
  icon: string;
  backendKey: string;
  /** 是否需要校园认证才能显示 */
  requireCampus?: boolean;
  /** 默认排序方式 */
  defaultSort?: "latest" | "hot";
}

/** 六分类常量定义 */
const CATEGORY_CONFIG: VillageCategory[] = [
  { id: "cat-all", name: "全部", icon: "🔥", backendKey: "all", defaultSort: "hot" },
  { id: "cat-interest", name: "兴趣圈", icon: "💝", backendKey: "interest", defaultSort: "latest" },
  { id: "cat-sincere", name: "诚意帖", icon: "⭐", backendKey: "sincere", defaultSort: "latest" },
  { id: "cat-hometown", name: "同乡", icon: "🏠", backendKey: "hometown", defaultSort: "latest" },
  { id: "cat-campus", name: "校园", icon: "🎓", backendKey: "campus", requireCampus: true, defaultSort: "latest" },
  { id: "cat-latest", name: "最新", icon: "🆕", backendKey: "latest", defaultSort: "latest" },
];

/** 判断用户是否已完成校园认证 */
const isCampusVerified = computed(() => {
  return sessionStore.userSession?.campusVerified ?? false;
});

/** 当前用户 campusName */
const currentCampusName = computed(() => {
  return sessionStore.userSession?.campusName ?? "";
});

/** 当前用户 userId */
const currentUserId = computed(() => {
  return sessionStore.userSession?.userId ?? "";
});

/** 根据校园认证状态过滤可见分类 */
const displayCategories = computed<VillageCategory[]>(() => {
  return CATEGORY_CONFIG.filter((cat) => {
    if (cat.requireCampus) return isCampusVerified.value;
    return true;
  });
});

/** 从 localStorage 读取上次选择的分类，默认 "全部" */
function getLastCategory(): string {
  try {
    const saved = uni.getStorageSync(LAST_CATEGORY_KEY);
    if (saved && typeof saved === "string") {
      // 验证是否在可见分类中
      const visibleIds = displayCategories.value.map((c) => c.id);
      if (visibleIds.includes(saved)) return saved;
    }
  } catch {
    // 读取失败时忽略
  }
  return "cat-all";
}

/** 保存分类到 localStorage */
function saveLastCategory(catId: string) {
  try {
    uni.setStorageSync(LAST_CATEGORY_KEY, catId);
  } catch {
    // 保存失败时忽略
  }
}

/* ========== 当前选中的分类 ========== */
const selectedCategory = ref<string>(getLastCategory());

/** 当前分类配置 */
const currentCategoryConfig = computed<VillageCategory | undefined>(() => {
  return CATEGORY_CONFIG.find((c) => c.id === selectedCategory.value);
});

/* ========== 筛选条件 ========== */
const currentFilters = computed<PostFilters>(() => {
  const config = currentCategoryConfig.value;
  return {
    categoryId: selectedCategory.value,
    sortBy: config?.defaultSort ?? "latest",
    // 校园分类需要传 userId
    userId: selectedCategory.value === "cat-campus" ? currentUserId.value : undefined,
  };
});

/* ========== 分类切换 ========== */
function selectCategory(catId: string) {
  if (selectedCategory.value === catId) return;
  selectedCategory.value = catId;
  saveLastCategory(catId);
  void villageStore.fetchPosts(currentFilters.value);
}

/* ========== 筛选后的帖子 ========== */
const displayPosts = computed<PostItem[]>(() => {
  return villageStore.filteredPosts(currentFilters.value);
});

/* ========== 下拉刷新 / 加载更多 ========== */
const isRefreshing = ref(false);
const isLoadingMore = ref(false);
const hasMore = ref(true);

async function onRefresh() {
  isRefreshing.value = true;
  try {
    await villageStore.fetchPosts(currentFilters.value);
  } finally {
    isRefreshing.value = false;
    uni.stopPullDownRefresh();
  }
}

async function onLoadMore() {
  if (isLoadingMore.value || loading.value || !hasMore.value) return;
  isLoadingMore.value = true;
  try {
    // TODO: 分页加载 - 当前 mock 数据没有分页，直接标记没有更多
    hasMore.value = false;
  } finally {
    isLoadingMore.value = false;
  }
}

/* ========== 点赞 ========== */
async function handleLike(postId: string) {
  try {
    await villageStore.likePost(postId);
  } catch {
    // 错误已由 store 设置
  }
}

/* ========== 关注 ========== */
async function handleFollow(userId: string) {
  try {
    await villageStore.followUser(userId);
  } catch {
    // 错误已由 store 设置
  }
}

/* ========== 点击帖子进入详情 ========== */
function goToDetail(postId: string) {
  villageStore.setCurrentPost(postId);
  openAppPath("/pages/village/detail");
}

/* ========== 发帖 ========== */
function goToPost() {
  openAppPath("/pages/village/post");
}

/* ========== 跳转标签聚合页 ========== */
function goToTagPosts(tagName: string) {
  // 去掉 # 前缀，传递原始标签名
  const cleanTag = tagName.startsWith("#") ? tagName.slice(1) : tagName;
  openAppPath(`/pages/village/tag-posts?tagName=${encodeURIComponent(cleanTag)}`);
}

/* ========== 初始化 ========== */
onMounted(() => {
  if (isUnlocked.value) {
    void villageStore.fetchPosts(currentFilters.value);
  }
});
</script>

<template>
  <view class="village-page">
    <!-- 未完善资料：显示锁定页面 -->
    <LockScreen
      v-if="!isUnlocked"
      page-name="村口"
      :completion-percent="completionPercent"
    />

    <!-- 已完善资料：显示完整社区 -->
    <template v-else>
      <!-- ===== 页面头部 ===== -->
      <view class="village-header">
        <text class="village-header__title">村口</text>
        <text class="village-header__subtitle">校园恋爱社区</text>
      </view>

      <!-- ===== 六分类横向滚动 Tab ===== -->
      <scroll-view class="category-tab-bar" scroll-x :show-scrollbar="false" :enhanced="true">
        <view class="category-tab-bar__inner">
          <view
            v-for="cat in displayCategories"
            :key="cat.id"
            class="category-tab"
            :class="{ 'category-tab--active': selectedCategory === cat.id }"
            @tap="selectCategory(cat.id)"
          >
            <text class="category-tab__icon">{{ cat.icon }}</text>
            <text class="category-tab__name">{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- ===== 加载状态 ===== -->
      <view v-if="loading && displayPosts.length === 0" class="village-state">
        <view class="loading-spinner" />
        <text class="village-state__text">正在加载帖子...</text>
      </view>

      <!-- ===== 错误状态 ===== -->
      <view v-else-if="errorMessage && displayPosts.length === 0" class="village-state">
        <text class="village-state__icon">😥</text>
        <text class="village-state__text">{{ errorMessage }}</text>
        <view class="village-state__btn" @tap="onRefresh">
          <text class="village-state__btn-text">重试</text>
        </view>
      </view>

      <!-- ===== 帖子列表 ===== -->
      <scroll-view
        v-else
        class="post-feed"
        scroll-y
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
        @scrolltolower="onLoadMore"
      >
        <!-- 空状态 -->
        <view v-if="displayPosts.length === 0" class="village-empty">
          <text class="village-empty__icon">📭</text>
          <text class="village-empty__title">暂无帖子</text>
          <text class="village-empty__desc">当前分类下还没有内容，来发第一帖吧</text>
        </view>

        <!-- 帖子卡片列表 -->
        <view
          v-for="post in displayPosts"
          :key="post.id"
          class="post-card"
          @tap="goToDetail(post.id)"
        >
          <!-- 作者信息行 -->
          <view class="post-card__header">
            <view class="post-card__user" @tap.stop>
              <!-- 头像占位 -->
              <view class="user-avatar">
                <image
                  v-if="post.author.avatar"
                  class="user-avatar__img"
                  :src="post.author.avatar"
                  mode="aspectFill"
                />
                <text v-else class="user-avatar__char">{{ post.author.name[0] }}</text>
              </view>
              <view class="user-info">
                <view class="user-info__name-row">
                  <text class="user-info__name">{{ post.author.name }}</text>
                  <!-- 同校校友标签 -->
                  <text
                    v-if="post.author.campusName && post.author.campusName === currentCampusName"
                    class="user-info__campus-badge"
                  >校友</text>
                </view>
                <text class="user-info__headline">{{ post.author.headline }}</text>
              </view>
            </view>
            <!-- 关注按钮 -->
            <view
              class="follow-chip"
              :class="{ 'follow-chip--active': post.isFollowed }"
              @tap.stop="handleFollow(post.author.userId)"
            >
              <text class="follow-chip__text">
                {{ post.isFollowed ? "已关注" : "+ 关注" }}
              </text>
            </view>
          </view>

          <!-- 正文内容 -->
          <view class="post-card__body">
            <text class="post-card__content">{{ post.content }}</text>
          </view>

          <!-- 图片展示 -->
          <view v-if="post.images.length > 0" class="post-card__images" @tap.stop>
            <image
              v-for="(img, idx) in post.images"
              :key="idx"
              class="post-card__image"
              :class="{ 'post-card__image--single': post.images.length === 1 }"
              :src="img"
              mode="aspectFill"
            />
          </view>

          <!-- 标签 -->
          <view v-if="post.tags.length > 0" class="post-card__tags">
            <text
              v-for="tag in post.tags"
              :key="tag"
              class="post-card__tag"
              @tap.stop="goToTagPosts(tag)"
            >{{ tag }}</text>
          </view>

          <!-- 底部互动栏 -->
          <view class="post-card__footer">
            <text class="post-card__time">{{ formatRelativeTime(post.createdAt) }}</text>
            <view class="post-card__actions">
              <!-- 评论 -->
              <view class="action-btn" @tap.stop="goToDetail(post.id)">
                <text class="action-btn__icon">💬</text>
                <text v-if="post.comments > 0" class="action-btn__count">{{ post.comments }}</text>
              </view>
              <!-- 点赞 -->
              <view
                class="action-btn"
                :class="{ 'action-btn--liked': post.isLiked }"
                @tap.stop="handleLike(post.id)"
              >
                <text class="action-btn__icon">
                  {{ post.isLiked ? "❤️" : "🤍" }}
                </text>
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
        <view v-else-if="!hasMore && displayPosts.length > 0" class="load-more">
          <text class="load-more__text">— 没有更多了 —</text>
        </view>

        <!-- 底部留白（让 FAB 不遮挡内容） -->
        <view class="feed-bottom-spacer" />
      </scroll-view>

      <!-- ===== 浮动发帖按钮 (FAB) ===== -->
      <view class="fab" @tap="goToPost">
        <text class="fab__icon">+</text>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   村口页 - 整体布局
   ================================================================ */
.village-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
  overflow: hidden;
}

/* ================================================================
   页面头部
   ================================================================ */
.village-header {
  padding: 28rpx 32rpx 16rpx;
  padding-top: calc(env(safe-area-inset-top) + 28rpx);
  background: var(--td-bg-color-container);
}

.village-header__title {
  display: block;
  font-size: 44rpx;
  font-weight: 800;
  color: var(--td-text-color-primary);
  letter-spacing: 2rpx;
  margin-bottom: 6rpx;
}

.village-header__subtitle {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

/* ================================================================
   六分类横向滚动 Tab 栏
   ================================================================ */
.category-tab-bar {
  background: var(--td-bg-color-container);
  border-bottom: 1rpx solid var(--td-border-level-1-color);
  white-space: nowrap;
}

.category-tab-bar__inner {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 32rpx;
}

.category-tab {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 28rpx;
  border-radius: 999px;
  background: var(--td-bg-app-page);
  border: 2rpx solid transparent;
  transition: all 200ms ease;
  flex-shrink: 0;
}

.category-tab--active {
  background: var(--td-brand-color-1);
  border-color: var(--td-brand-color-7);
  box-shadow: 0 2rpx 8rpx rgba(29, 78, 216, 0.12);
}

.category-tab__icon {
  font-size: 26rpx;
  line-height: 1;
}

.category-tab__name {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.category-tab--active .category-tab__name {
  color: var(--td-brand-color-7);
  font-weight: 700;
}

/* ================================================================
   空状态 / 加载 / 错误
   ================================================================ */
.village-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 80rpx 40rpx;
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
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

.village-state__icon {
  font-size: 80rpx;
}

.village-state__text {
  font-size: 28rpx;
  color: var(--td-text-color-placeholder);
  text-align: center;
  line-height: 1.6;
}

.village-state__btn {
  padding: 16rpx 48rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
}

.village-state__btn-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}

/* ================================================================
   帖子列表容器
   ================================================================ */
.post-feed {
  flex: 1;
  overflow-y: auto;
}

.village-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 120rpx 40rpx;
}

.village-empty__icon {
  font-size: 88rpx;
}

.village-empty__title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.village-empty__desc {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
  text-align: center;
}

/* ================================================================
   帖子卡片
   ================================================================ */
.post-card {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin: 16rpx 24rpx;
  padding: 28rpx;
  background: var(--td-bg-color-container);
  border-radius: 20rpx;
  box-shadow: var(--td-shadow-1, 0 2rpx 12rpx rgba(0, 0, 0, 0.04));
  transition: transform 120ms ease;
}

.post-card:active {
  transform: scale(0.99);
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
  background: linear-gradient(135deg, var(--td-brand-color-2), var(--td-brand-color-3));
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
  color: var(--td-brand-color-7);
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
  font-weight: 600;
  color: var(--td-text-color-primary);
  line-height: 1.2;
}

/* 同校校友标签 */
.user-info__campus-badge {
  font-size: 20rpx;
  color: #ffffff;
  background: var(--td-brand-color-7);
  padding: 2rpx 12rpx;
  border-radius: 999px;
  font-weight: 600;
  line-height: 1.6;
  flex-shrink: 0;
}

.user-info__headline {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- 关注按钮 --- */
.follow-chip {
  padding: 10rpx 24rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  flex-shrink: 0;
  margin-left: 12rpx;
}

.follow-chip--active {
  background: var(--td-bg-color-surface);
  border: 1rpx solid var(--td-border-level-1-color);
}

.follow-chip__text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 500;
  white-space: nowrap;
}

.follow-chip--active .follow-chip__text {
  color: var(--td-text-color-placeholder);
}

/* --- 正文内容 --- */
.post-card__body {
  padding: 0 4rpx;
}

.post-card__content {
  font-size: 30rpx;
  color: var(--td-text-color-primary);
  line-height: 1.7;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

/* --- 图片展示 --- */
.post-card__images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
}

.post-card__image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12rpx;
  background: var(--td-bg-app-page);
  overflow: hidden;
}

.post-card__image--single {
  grid-column: 1 / 3;
  aspect-ratio: 16 / 9;
  max-height: 360rpx;
}

/* --- 标签 --- */
.post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.post-card__tag {
  font-size: 24rpx;
  color: var(--td-brand-color-7);
  background: var(--td-brand-color-1);
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
  border-top: 1rpx solid var(--td-border-level-1-color);
}

.post-card__time {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
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
}

.action-btn__icon {
  font-size: 26rpx;
  line-height: 1;
}

.action-btn__count {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  font-weight: 500;
}

.action-btn--liked .action-btn__count {
  color: var(--td-error-color);
}

/* ================================================================
   加载更多 & 底部留白
   ================================================================ */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 32rpx 0;
}

.load-more__text {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

.feed-bottom-spacer {
  height: 180rpx;
}

/* ================================================================
   浮动发帖按钮 (FAB)
   ================================================================ */
.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(env(safe-area-inset-bottom) + 120rpx);
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--td-brand-color-7), var(--td-brand-color-5));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 28rpx rgba(29, 78, 216, 0.35);
  z-index: 99;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.fab:active {
  transform: scale(0.92);
  box-shadow: 0 4rpx 16rpx rgba(29, 78, 216, 0.25);
}

.fab__icon {
  font-size: 52rpx;
  color: #ffffff;
  font-weight: 300;
  line-height: 1;
  margin-top: -2rpx;
}
</style>