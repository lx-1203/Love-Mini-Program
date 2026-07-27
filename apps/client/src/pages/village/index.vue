<script setup lang="ts">
/**
 * 村口页 - UGC社区（六分类版）
 * 用户生成内容社区，展示帖子动态、支持六分类筛选、点赞关注等互动功能
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { onLoad, onHide, onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useVillageStore, formatRelativeTime } from "../../stores/village";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import { useTabBar } from "../../composables/useTabBar";
import LockScreen from "../../components/common/LockScreen.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { villagePageRequirements } from "../../config/page-access";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import { IMAGE_PATHS } from "../../config/images";
// SubTask 5.5.2：列表页图片 @error 占位图通用方案
import { useImageFallback } from "../../composables/useImageFallback";
import type { PostItem, PostFilters } from "../../stores/village";
import BaseTabs from "../../components/common/BaseTabs.vue";
import { showErrorToast } from "../../utils/error-toast";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../utils/media";

/* ========== Stores ========== */
const { t } = useI18n();
const villageStore = useVillageStore();
const sessionStore = useSessionStore();

// Phase 4 任务 20：接入页面访问守卫
usePageAccess(villagePageRequirements);
// 修复（严格模式 noUnusedLocals）：categories 从 storeToRefs 解构后未引用（页面使用 BaseTabs 的 items 而非 store categories），已移除。
const { loading, errorMessage } = storeToRefs(villageStore);

// 同步自定义 TabBar 选中状态（圈子 = 索引 1）
useTabBar(1);

// SubTask 5.5.2：列表页图片 @error 占位图 —— 失败 key 集合与判断函数
// 注意：使用对象引用而非解构，避免 vue-tsc 在某些场景下误报 "All destructured elements are unused"
const imageFallback = useImageFallback();
const onImageError = imageFallback.onImageError;
const isImageFailed = imageFallback.isImageFailed;

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

/** 六分类常量定义 - 扩展为更多社交分类（name 通过 i18n 动态渲染） */
const CATEGORY_CONFIG = computed<VillageCategory[]>(() => [
  { id: "cat-all", name: t("village.categoryAll"), icon: "fire", backendKey: "all", defaultSort: "hot" },
  { id: "cat-following", name: t("village.categoryFollowing"), icon: "heart", backendKey: "following", defaultSort: "latest" },
  { id: "cat-interest", name: t("village.categoryInterest"), icon: "star", backendKey: "interest", defaultSort: "latest" },
  { id: "cat-sincere", name: t("village.categorySincere"), icon: "building", backendKey: "sincere", defaultSort: "latest" },
  { id: "cat-campus", name: t("village.categoryCampus"), icon: "graduation", backendKey: "campus", requireCampus: true, defaultSort: "latest" },
  { id: "cat-love", name: t("village.categoryLove"), icon: "heart", backendKey: "love", defaultSort: "latest" },
  { id: "cat-treehole", name: t("village.categoryTreehole"), icon: "new-badge", backendKey: "treehole", defaultSort: "latest" },
  { id: "cat-latest", name: t("village.categoryLatest"), icon: "new-badge", backendKey: "latest", defaultSort: "latest" },
]);

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
  return CATEGORY_CONFIG.value.filter((cat) => {
    if (cat.requireCampus) return isCampusVerified.value;
    return true;
  });
});

/** 从 localStorage 读取上次选择的分类，默认 "推荐" */
function getLastCategory(): string {
  try {
    const saved = uni.getStorageSync(LAST_CATEGORY_KEY);
    if (saved && typeof saved === "string") {
      const visibleIds = displayCategories.value.map((c) => c.id);
      if (visibleIds.includes(saved)) return saved;
    }
  } catch (_e) {
  }
  return "cat-all";
}

/** 保存分类到 localStorage */
function saveLastCategory(catId: string) {
  try {
    uni.setStorageSync(LAST_CATEGORY_KEY, catId);
  } catch (_e) {
  }
}

/* ========== 当前选中的分类 ========== */
const selectedCategory = ref<string>(getLastCategory());

/** 当前分类配置 */
const currentCategoryConfig = computed<VillageCategory | undefined>(() => {
  return CATEGORY_CONFIG.value.find((c) => c.id === selectedCategory.value);
});

/* ========== 筛选条件 ========== */
const currentFilters = computed<PostFilters>(() => {
  const config = currentCategoryConfig.value;
  return {
    categoryId: selectedCategory.value,
    sortBy: config?.defaultSort ?? "latest",
    userId: selectedCategory.value === "cat-campus" ? currentUserId.value : undefined,
  };
});

/* ========== BaseTabs 数据 ========== */
/** 将分类配置映射为 BaseTabs 所需的 { key, label } 结构 */
const villageTabs = computed(() =>
  displayCategories.value.map((c) => ({ key: c.id, label: c.name }))
);

/* ========== 分类切换 ========== */
/**
 * BaseTabs change 事件回调
 * 注：BaseTabs 已通过 v-model 更新 selectedCategory 并处理重复点击，此处仅触发 localStorage 持久化 + store 异步副作用
 */
function selectCategory(catId: string) {
  saveLastCategory(catId);
  void villageStore.fetchPosts(currentFilters.value);
}

/** BaseTabs @change 回调入口 */
function onCategoryChange(catId: string) {
  // P2 修复：切换 tab 前保存当前滚动位置，切回时恢复
  handleTabChangeWithMemory(catId);
  selectCategory(catId);
}

/* ========== 筛选后的帖子 ========== */
const displayPosts = computed<PostItem[]>(() => {
  return villageStore.filteredPosts(currentFilters.value);
});

/* ========== 点赞动画状态 ========== */
const likeAnimatingPosts = ref<Set<string>>(new Set());

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
    hasMore.value = false;
  } finally {
    isLoadingMore.value = false;
  }
}

/* ========== 点赞（带缩放动画） ========== */
/**
 * SubTask 1.5.2：点赞动画定时器集合，用于卸载时统一清理。
 *
 * <p>原实现 {@code setTimeout(..., 300)} 未保存返回值，用户在 300ms 动画期间
 * 快速返回上一页时，定时器仍会触发并修改已销毁页面的 Set 状态。</p>
 */
const likeAnimTimers = new Set<ReturnType<typeof setTimeout>>();

async function handleLike(postId: string) {
  const post = displayPosts.value.find(p => p.id === postId);
  const wasLiked = post?.isLiked ?? false;

  if (!wasLiked) {
    likeAnimatingPosts.value.add(postId);
    // SubTask 1.5.2：保存定时器引用，卸载时统一清理
    const timer = setTimeout(() => {
      likeAnimTimers.delete(timer);
      likeAnimatingPosts.value.delete(postId);
    }, 300);
    likeAnimTimers.add(timer);
  }

  try {
    await villageStore.likePost(postId);
  } catch (error) {
    // 点赞失败：按错误分类给出友好提示（网络/权限/业务）
    showErrorToast(error, t("village.likeFailed"));
    console.error("点赞失败:", error);
  }
}

/* ========== 收藏状态（本地状态） ========== */
const collectedPosts = ref<Set<string>>(new Set());

function toggleCollect(postId: string) {
  if (collectedPosts.value.has(postId)) {
    collectedPosts.value.delete(postId);
  } else {
    collectedPosts.value.add(postId);
  }
}

/* ========== 关注 ========== */
async function handleFollow(userId: string) {
  try {
    await villageStore.followUser(userId);
  } catch (error) {
    // 关注失败：按错误分类给出友好提示（网络/权限/业务）
    showErrorToast(error, t("village.followFailed"));
    console.error("关注失败:", error);
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

/* ========== 去认识新朋友（匹配页入口） ========== */
function goToDiscover() {
  openAppPath("/pages/discover/index");
}

/* ========== 跳转作者个人主页（M-08） ========== */
/**
 * 点击帖子作者头像，跳转到对方个人主页
 * 通过 userId 查询参数区分自己 / 对方 profile
 * @param authorId - 作者 userId
 */
function goToAuthorProfile(authorId: string) {
  if (!authorId) return;
  openAppPath(`/pages/profile/index?userId=${encodeURIComponent(authorId)}`);
}

/* ========== 跳转标签聚合页 ========== */
function goToTagPosts(tagName: string) {
  const cleanTag = tagName.startsWith("#") ? tagName.slice(1) : tagName;
  openAppPath(`/pages/village/tag-posts?tagName=${encodeURIComponent(cleanTag)}`);
}

/* ========== 页面参数处理 ========== */
onLoad((query) => {
  if (query?.tab === "hot") {
    selectedCategory.value = "cat-latest";
    saveLastCategory("cat-latest");
  }
});

/* ========== 滚动到顶部按钮 + tab 切换记忆位置（P2 修复） ==========
 * - 监听 scroll-view 的 @scroll 事件，记录当前 scrollTop
 * - 当 scrollTop > 一屏（按 600rpx 估算）时显示"回到顶部"按钮
 * - 点击按钮通过 :scroll-top 重置 scroll-view 到顶部
 * - 切换 tab / 离开页面时保存 scrollTop；onShow 时恢复
 */
const SCROLL_TOP_THRESHOLD = 600;
/** scroll-view 当前 scrollTop（双向绑定到 :scroll-top，用于主动滚回顶部） */
const scrollTopValue = ref(0);
/** 是否显示"回到顶部"按钮 */
const showBackToTop = ref(false);
/** tab 切换时缓存的滚动位置（key: category id, value: scrollTop） */
const savedScrollPositions: Record<string, number> = {};
/** 上次激活的 category，用于切换时保存旧位置 */
let lastActiveCategory = "";

/** scroll-view 滚动事件：节流更新 scrollTopValue，超过阈值显示回到顶部按钮 */
function handleScroll(e: { detail: { scrollTop: number } }) {
  const top = e.detail?.scrollTop ?? 0;
  // 仅当变化超过 4rpx 时更新，避免频繁触发响应式更新
  if (Math.abs(top - scrollTopValue.value) > 4) {
    scrollTopValue.value = top;
  }
  showBackToTop.value = top > SCROLL_TOP_THRESHOLD;
}

/** 点击"回到顶部"按钮：将 scroll-view 滚回顶部 */
function handleBackToTop() {
  // 通过临时改值再回 0 触发 scroll-view 的 scroll-top 变化
  // uni-app scroll-view 监听 :scroll-top 变化执行滚动
  scrollTopValue.value = 0;
  showBackToTop.value = false;
}

/**
 * BaseTabs change 事件处理：在切换前保存当前 tab 的滚动位置。
 * 与原 onTabChange 区分，作为 P2 滚动位置记忆的补充钩子。
 */
function handleTabChangeWithMemory(key: string) {
  if (lastActiveCategory && lastActiveCategory !== key) {
    savedScrollPositions[lastActiveCategory] = scrollTopValue.value;
  }
  lastActiveCategory = key;
  // 恢复目标 tab 的滚动位置
  const saved = savedScrollPositions[key];
  scrollTopValue.value = saved ?? 0;
}

/* ========== 生命周期：页面隐藏时保存滚动位置（P2 tab 切换记忆位置） ========== */
onHide(() => {
  // 页面隐藏（如跳转子页）时保存当前滚动位置，便于 onShow 恢复
  if (lastActiveCategory) {
    savedScrollPositions[lastActiveCategory] = scrollTopValue.value;
  } else {
    savedScrollPositions[selectedCategory.value] = scrollTopValue.value;
  }
});

/** SubTask 1.5.2：滚动位置恢复定时器引用，用于卸载时清理 */
let scrollTopRestoreTimer: ReturnType<typeof setTimeout> | null = null;

onShow(() => {
  // 页面恢复时回滚到上次位置（仅 scroll-view 内的滚动，不影响页面级滚动）
  const key = lastActiveCategory || selectedCategory.value;
  const saved = savedScrollPositions[key] ?? 0;
  if (saved > 0) {
    // 通过 nextTick 确保 DOM 渲染后再设置 scroll-top
    // SubTask 1.5.2：保存定时器引用，卸载时统一清理
    if (scrollTopRestoreTimer) clearTimeout(scrollTopRestoreTimer);
    scrollTopRestoreTimer = setTimeout(() => {
      scrollTopRestoreTimer = null;
      scrollTopValue.value = saved;
    }, 50);
  }
});

/* ========== 初始化 ========== */
onMounted(() => {
  if (isUnlocked.value) {
    void villageStore.fetchPosts(currentFilters.value);
  }
});

/**
 * SubTask 1.5.2：页面卸载时清理所有未触发的定时器，避免在已销毁页面上修改响应式状态。
 */
onUnmounted(() => {
  likeAnimTimers.forEach((timer) => clearTimeout(timer));
  likeAnimTimers.clear();
  if (scrollTopRestoreTimer) {
    clearTimeout(scrollTopRestoreTimer);
    scrollTopRestoreTimer = null;
  }
});
</script>

<template>
  <view class="village-page page-bottom-safe page-fade-in">
    <!-- 未完善资料：显示锁定页面 -->
    <LockScreen
      v-if="!isUnlocked"
      :page-name="t('village.title')"
      :completion-percent="completionPercent"
    />

    <!-- 已完善资料：显示完整社区 -->
    <template v-else>
      <!-- ===== 页面头部 ===== -->
      <view class="village-header">
        <view class="village-header__top">
          <view class="village-header__title-wrap">
            <text class="village-header__title section-title-brand">{{ t('village.title') }}</text>
            <text class="village-header__subtitle">{{ t('village.subtitle') }}</text>
          </view>
          <view class="village-header__publish press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goToPost">
            <text class="village-header__publish-text">{{ t('village.publishPost') }}</text>
          </view>
        </view>

        <!-- ===== 分类横向滚动 Tab（胶囊风格，BaseTabs） ===== -->
        <BaseTabs
          v-model="selectedCategory"
          :tabs="villageTabs"
          variant="pill"
          :scrollable="true"
          :equal-split="false"
          @change="onCategoryChange"
        />
      </view>

      <!-- ===== 附近的人入口卡片（M-08） ===== -->
      <view class="discover-banner press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goToDiscover">
        <view class="discover-banner__content">
          <view class="discover-banner__left">
            <image class="discover-banner__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
            <view class="discover-banner__text-wrap">
              <text class="discover-banner__title">{{ t('home.nearbyPeople') }}</text>
              <text class="discover-banner__subtitle">{{ t('village.discoverBannerSubtitle') }}</text>
            </view>
          </view>
          <text class="discover-banner__arrow">›</text>
        </view>
      </view>

      <!-- ===== 加载状态（骨架屏） ===== -->
      <view v-if="loading && displayPosts.length === 0" class="village-state">
        <Skeleton variant="list" :count="4" />
      </view>

      <!-- ===== 错误状态 ===== -->
      <view v-else-if="errorMessage && displayPosts.length === 0" class="village-state">
        <ErrorState type="network" @retry="onRefresh" />
      </view>

      <!-- ===== 帖子列表 =====
           P2 修复：
           - :scroll-top 双向绑定到 scrollTopValue，点击回到顶部按钮可主动滚回顶部
           - @scroll 监听滚动位置，超过一屏显示回到顶部按钮
      -->
      <scroll-view
        v-else
        class="post-feed"
        scroll-y
        :scroll-top="scrollTopValue"
        :refresher-enabled="true"
        :refresher-triggered="isRefreshing"
        :enhanced="true"
        :bounces="true"
        :show-scrollbar="false"
        @refresherrefresh="onRefresh"
        @scrolltolower="onLoadMore"
        @scroll="handleScroll"
      >
        <!-- 空状态 -->
        <view v-if="displayPosts.length === 0" class="village-empty">
          <EmptyState type="no-data" :message="t('village.emptyPosts')">
            <view class="village-empty__action press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/pages/village/post')">
              <text class="village-empty__action-text">{{ t('village.publishPost') }}</text>
            </view>
          </EmptyState>
        </view>

        <!-- 帖子卡片列表 -->
        <view class="post-feed__list card-stagger" role="list">
        <view
          v-for="post in displayPosts"
          :key="post.id"
          class="post-card clickable"
          hover-class="post-card--pressed"
          :hover-stay-time="100"
          @tap="goToDetail(post.id)"
        >
          <!-- 作者信息行 -->
          <view class="post-card__header">
            <view class="post-card__user clickable" hover-class="post-card__user--pressed" :hover-stay-time="100" @tap.stop="goToAuthorProfile(post.author.userId)">
              <view class="user-avatar">
                <image
                  v-if="post.author.avatar && !isImageFailed(`avatar-${post.id}`)"
                  class="user-avatar__img"
                  :src="resolveMediaUrl(post.author.avatar)"
                  mode="aspectFill"
                  lazy-load alt=""
                  @error="onImageError(`avatar-${post.id}`)"
                />
                <text v-else class="user-avatar__char">{{ post.author.name[0] }}</text>
                <!-- Phase D1: 头像左上角身份徽章（校友） -->
                <view
                  v-if="post.author.campusName && post.author.campusName === currentCampusName"
                  class="user-avatar__badge"
                >
                  <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="user-avatar__badge-icon" mode="aspectFit" />
                </view>
              </view>
              <view class="user-info">
                <view class="user-info__name-row">
                  <text class="user-info__name">{{ post.author.name }}</text>
                  <text
                    v-if="post.author.campusName && post.author.campusName === currentCampusName"
                    class="user-info__campus-badge"
                  >{{ t('village.alumni') }}</text>
                </view>
                <text class="user-info__headline">{{ post.author.headline || t('village.recentlyActive') }}</text>
              </view>
            </view>
            <view
              class="follow-chip"
              :class="{ 'follow-chip--active': post.isFollowed }"
              @tap.stop="handleFollow(post.author.userId)"
            >
              <text class="follow-chip__text">
                {{ post.isFollowed ? t('village.followed') : t('village.follow') }}
              </text>
            </view>
          </view>

          <!-- 正文内容 -->
          <view class="post-card__body">
            <text class="post-card__content">{{ post.content }}</text>
          </view>

          <!-- 图片展示 -->
          <view v-if="post.images.length > 0" class="post-card__images" :class="'post-card__images--' + Math.min(post.images.length, 9)" @tap.stop>
            <view
              v-for="(img, idx) in post.images.slice(0, 9)"
              :key="idx"
              class="post-card__image-wrap"
              :class="{ 'post-card__image-wrap--single': post.images.length === 1 }"
            >
              <image
                class="post-card__image img-rounded"
                :src="img"
                mode="aspectFill"
                lazy-load alt=""
              />
            </view>
            <view v-if="post.images.length > 9" class="post-card__image-more">
              <text class="post-card__image-more-text">+{{ post.images.length - 9 }}</text>
            </view>
          </view>

          <!-- 标签 -->
          <view v-if="post.tags.length > 0" class="post-card__tags">
            <text
              v-for="(tag, tagIdx) in post.tags"
              :key="tag"
              class="post-card__tag"
              :class="tagIdx % 2 === 0 ? 'post-card__tag--green' : 'post-card__tag--pink'"
              @tap.stop="goToTagPosts(tag)"
            >{{ tag.startsWith('#') ? tag : '#' + tag }}</text>
          </view>

          <!-- 底部互动栏 -->
          <view class="post-card__footer">
            <text class="post-card__time">{{ formatRelativeTime(post.createdAt) }}</text>
            <view class="post-card__actions">
              <!-- 评论 -->
              <view class="action-btn" @tap.stop="goToDetail(post.id)">
                <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" alt="" />
                <text v-if="post.comments > 0" class="action-btn__count">{{ post.comments }}</text>
              </view>
              <!-- 点赞 -->
              <view
                class="action-btn"
                :class="{ 'action-btn--liked': post.isLiked, 'action-btn--animating': likeAnimatingPosts.has(post.id) }"
                @tap.stop="handleLike(post.id)"
              >
                <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART" mode="aspectFit" alt="" />
                <text v-if="post.likes > 0" class="action-btn__count" :class="{ 'action-btn__count--liked': post.isLiked }">{{ post.likes }}</text>
              </view>
              <!-- 分享 -->
              <view class="action-btn" @tap.stop>
                <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.SPARKLES" mode="aspectFit" alt="" />
              </view>
              <!-- 收藏 -->
              <view
                class="action-btn"
                :class="{ 'action-btn--collected': collectedPosts.has(post.id) }"
                @tap.stop="toggleCollect(post.id)"
              >
                <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.BOOKMARK" mode="aspectFit" alt="" />
              </view>
            </view>
          </view>
        </view>
        </view>

        <!-- 加载更多提示 -->
        <view v-if="isLoadingMore" class="load-more" role="status" aria-live="polite">
          <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('common.loading')" />
          <text class="load-more__text">{{ t('common.loading') }}</text>
        </view>
        <view v-else-if="!hasMore && displayPosts.length > 0" class="load-more">
          <text class="load-more__text">{{ t('village.noMorePosts') }}</text>
        </view>

        <!-- 底部留白 -->
        <view class="feed-bottom-spacer" />
      </scroll-view>

      <!-- ===== 浮动发帖按钮 (FAB) ===== -->
      <view class="fab press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goToPost">
        <image class="fab__icon" :src="IMAGE_PATHS.ICONS_EMOJI.PLUS" mode="aspectFit" alt="" />
      </view>

      <!-- ===== 回到顶部按钮（P2 修复：滚动超过一屏后显示） ===== -->
      <view
        v-if="showBackToTop"
        class="back-to-top press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="handleBackToTop"
      >
        <text class="back-to-top__icon">↑</text>
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
  height: 100%;
  background: var(--c-gradient-page);
  overflow: hidden;
}

/* ================================================================
   页面头部
   ================================================================ */
.village-header {
  background: var(--c-bg-container);
  padding-top: calc(constant(safe-area-inset-top) + var(--sp-4));
  padding-top: calc(env(safe-area-inset-top) + var(--sp-4));
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--s-sm);
}

.village-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-7) var(--sp-5);
}

.village-header__title-wrap {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
}

.village-header__title {
  font-size: var(--fs-5xl);
  font-weight: 800;
  color: var(--c-text-primary);
  letter-spacing: var(--sp-1);
}

.village-header__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.village-header__publish {
  padding: var(--sp-3) var(--sp-7);
  background: var(--c-gradient-brand);
  border-radius: var(--r-full);
  box-shadow: var(--s-brand);
}

/* #ifdef H5 */
.village-header__publish:active {
  transform: scale(0.95);
  opacity: 0.9;
}
/* #endif */

.village-header__publish-text {
  font-size: var(--fs-md);
  color: var(--c-neutral-0);
  font-weight: 600;
}

/* ================================================================
   去认识新朋友入口卡片（M-08）
   ================================================================ */
.discover-banner {
  margin: 0 var(--sp-7) var(--sp-6);
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-romance-400) 100%);
  border-radius: var(--r-xl);
  box-shadow: var(--s-brand);
  overflow: hidden;
  position: relative;
}

.discover-banner__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-5) var(--sp-6);
}

.discover-banner__left {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.discover-banner__icon {
  width: 56rpx;
  height: 56rpx;
  color: var(--c-neutral-0);
}

.discover-banner__text-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.discover-banner__title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-neutral-0);
}

.discover-banner__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-overlay-text-secondary, var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85)));
}

.discover-banner__arrow {
  font-size: var(--fs-4xl);
  color: var(--c-neutral-0);
  font-weight: 300;
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
  gap: var(--sp-6);
  padding: var(--sp-10) var(--sp-8);
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid var(--c-neutral-200);
  border-top-color: var(--c-brand-400);
  border-radius: var(--r-full);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.village-state__icon {
  width: 80rpx;
  height: 80rpx;
  opacity: 0.4;
}

.village-state__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
  text-align: center;
  line-height: 1.6;
}

.village-state__btn {
  padding: var(--sp-4) var(--sp-10);
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
}

.village-state__btn-text {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
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
  gap: var(--sp-5);
  padding: var(--sp-14) var(--sp-8);
}

.village-empty__icon {
  width: 88rpx;
  height: 88rpx;
  opacity: 0.35;
}

.village-empty__title {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.village-empty__desc {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  text-align: center;
}

.village-empty__action {
  margin-top: var(--sp-2);
  padding: var(--sp-4) var(--sp-10);
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
}

.village-empty__action-text {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 600;
}

/* ================================================================
   帖子卡片
   ================================================================ */
.post-feed__list {
  padding: var(--sp-6) var(--sp-6) 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.post-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  padding: var(--sp-7);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  animation: village-card-slide-up var(--d-bounce, 400ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes village-card-slide-up {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* #ifdef H5 */
.post-card:active {
  transform: scale(0.995);
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
  gap: var(--sp-4);
  flex: 1;
  min-width: 0;
}

.user-avatar {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  overflow: visible;
  background: linear-gradient(135deg, var(--c-brand-50) 0%, var(--c-romance-50) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2rpx solid var(--c-brand-shadow-tint, var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.15)));
  box-shadow: 0 0 0 3rpx var(--c-brand-50),
              0 0 0 6rpx var(--c-brand-100);
}

.user-avatar__img {
  width: 100%;
  height: 100%;
  border-radius: var(--r-full);
  overflow: hidden;
  object-fit: cover;
}

.user-avatar__char {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-brand-400);
}

.user-avatar__badge {
  position: absolute;
  top: -4rpx;
  left: -4rpx;
  width: 26rpx;
  height: 26rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  border: 2rpx solid var(--c-neutral-0);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-brand-sm);
  z-index: 2;
}

.user-avatar__badge-icon {
  width: 16rpx;
  height: 16rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.user-info__name-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.user-info__name {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
  line-height: 1.2;
  /* 修复（P1 BUG）：原实现缺少文本裁剪，长昵称会推动校友徽章换行 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
  min-width: 0;
}

.user-info__campus-badge {
  font-size: var(--fs-xs);
  color: var(--c-neutral-0);
  background: var(--c-gradient-brand);
  padding: 2rpx var(--sp-3);
  border-radius: var(--r-full);
  font-weight: 600;
  line-height: 1.6;
  flex-shrink: 0;
}

.user-info__headline {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- 关注按钮 --- */
.follow-chip {
  padding: var(--sp-2) var(--sp-6);
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  flex-shrink: 0;
  margin-left: var(--sp-4);
}

/* #ifdef H5 */
.follow-chip:active {
  transform: scale(0.95);
}
/* #endif */

.follow-chip--active {
  background: var(--c-neutral-50);
  border: 2rpx solid var(--c-neutral-200);
}

.follow-chip__text {
  font-size: var(--fs-base);
  color: var(--c-neutral-0);
  font-weight: 600;
  white-space: nowrap;
}

.follow-chip--active .follow-chip__text {
  color: var(--c-text-tertiary);
  font-weight: 500;
}

/* --- 正文内容 --- */
.post-card__body {
  padding: 0;
}

.post-card__content {
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  overflow: hidden;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 8em;
  /* #endif */
}

/* --- 图片展示 --- */
/* mp-weixin 不支持 display:grid，改用 Flexbox + 子元素 width: calc 实现自适应列布局 */
.post-card__images {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  border-radius: var(--r-md);
  overflow: hidden;
}

.post-card__images--1 .post-card__image-wrap {
  /* 1 列：100% 宽度，4:3 比例 */
  width: 100%;
  max-width: 480rpx;
  /* 4:3 比例 → padding-top: 75% */
  padding-top: 75%;
  max-height: 360rpx;
  border-radius: var(--r-md);
}

.post-card__images--2 .post-card__image-wrap,
.post-card__images--4 .post-card__image-wrap {
  /* 2 列：width = calc((100% - gap) / 2) */
  width: calc((100% - var(--sp-2)) / 2);
}

.post-card__images--3 .post-card__image-wrap,
.post-card__images--5 .post-card__image-wrap,
.post-card__images--6 .post-card__image-wrap,
.post-card__images--7 .post-card__image-wrap,
.post-card__images--8 .post-card__image-wrap,
.post-card__images--9 .post-card__image-wrap {
  /* 3 列：width = calc((100% - 2*gap) / 3) */
  width: calc((100% - 2 * var(--sp-2)) / 3);
}

.post-card__image-wrap {
  position: relative;
  /* mp-weixin 不支持 aspect-ratio，改用 padding-top 百分比（1:1 → 100%） */
  padding-top: 100%;
  border-radius: var(--r-md);
  background: var(--c-neutral-50);
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
  width: 100%;
  /* mp-weixin 不支持 aspect-ratio，改用 padding-top 百分比（1:1 → 100%） */
  padding-top: 100%;
  border-radius: var(--r-md);
  background: var(--c-bg-overlay);
  overflow: hidden;
}

.post-card__image-more-text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-2xl);
  color: var(--c-neutral-0);
  font-weight: 600;
}

/* --- 标签 --- */
.post-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.post-card__tag {
  font-size: var(--fs-base);
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--r-full);
  font-weight: 500;
}

.post-card__tag--green {
  color: var(--c-brand-500);
  background: var(--c-brand-50);
}

.post-card__tag--pink {
  color: var(--c-romance-500);
  background: var(--c-romance-50);
}

/* --- 底部互动栏 --- */
.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--sp-4);
  border-top: 1rpx solid var(--c-neutral-50);
}

.post-card__time {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.post-card__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-7);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  /* 修复 P2（触摸目标过小）：min-height/min-width ≥88rpx（44px @2x），满足 iOS HIG / Material Design 标准 */
  min-width: 88rpx;
  min-height: 88rpx;
  padding: var(--sp-2) var(--sp-3);
  justify-content: center;
}

/* #ifdef H5 */
.action-btn:active {
  transform: scale(0.9);
}
/* #endif */

.action-btn--animating {
  animation: like-bounce var(--d-fade, 300ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes like-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

.action-btn__icon {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-tertiary);
}

.action-btn__count {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.action-btn--liked .action-btn__count,
.action-btn__count--liked {
  color: var(--c-error);
}

/* 已点赞 / 已收藏的图标颜色（应用 currentColor 主题色） */
.action-btn--liked .action-btn__icon {
  color: var(--c-error);
}

.action-btn--collected .action-btn__icon {
  color: var(--c-brand-500);
}

/* ================================================================
   加载更多 & 底部留白
   ================================================================ */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-7) 0;
}

.load-more__text {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

.feed-bottom-spacer {
  height: 180rpx;
}

/* ================================================================
   浮动发帖按钮 (FAB)
   ================================================================ */
.fab {
  position: fixed;
  right: var(--sp-7);
  bottom: calc(env(safe-area-inset-bottom) + var(--sp-14));
  width: 104rpx;
  height: 104rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-float-btn);
  z-index: 99;
}

/* #ifdef H5 */
.fab:active {
  transform: scale(0.9);
}
/* #endif */

.fab__icon {
  width: 56rpx;
  height: 56rpx;
  color: var(--c-neutral-0);
}

/* ================================================================
   回到顶部按钮（P2 修复 · 滚动到顶部按钮）
   - 位于 FAB 上方，避免遮挡
   - 触摸目标 88rpx × 88rpx（44px @2x），满足 iOS HIG / Material Design
   ================================================================ */
.back-to-top {
  position: fixed;
  right: var(--sp-7);
  bottom: calc(env(safe-area-inset-bottom) + 220rpx);
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-md);
  z-index: 98;
  animation: back-to-top-fade-in var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes back-to-top-fade-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.back-to-top__icon {
  font-size: 36rpx;
  color: var(--c-brand);
  font-weight: 700;
}
</style>
