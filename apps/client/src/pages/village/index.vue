<script setup lang="ts">
/**
 * 村口页 - UGC社区（Phase Feedback4：三 Tab 版 关注/同城/发现）
 * 用户生成内容社区，支持三 Tab 筛选、城市切换、点赞关注等互动功能
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { onLoad, onHide, onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
// 修复 no-duplicate-imports：合并 ../../stores/village 的重复 import
import { useVillageStore, formatRelativeTime, type PostItem, type PostFilters } from "../../stores/village";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import { useTabBar } from "../../composables/useTabBar";
import LockScreen from "../../components/common/LockScreen.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { villagePageRequirements } from "../../config/page-access";
// Phase Feedback4：同城 Tab 功能开关（false 时隐藏城市选择器，退化为全量同城流）
import { featureFlags } from "../../config/feature-flags";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import { IMAGE_PATHS } from "../../config/images";
// SubTask 5.5.2：列表页图片 @error 占位图通用方案
import { useImageFallback } from "../../composables/useImageFallback";
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

/* ========== 三 Tab 数据结构（Phase Feedback4） ========== */
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

/**
 * Phase Feedback4：圈子页收敛为三 Tab —— 关注 / 同城 / 发现。
 * - 关注：匹配中点喜欢的人的动态（backendKey=following）
 * - 同城：同 IP 城市的动态，自动标注城市名（如"南京"），可手动切换
 * - 发现：二级子标签（全部/校友/老乡/搭子圈）
 */
const CATEGORY_CONFIG = computed<VillageCategory[]>(() => [
  { id: "cat-following", name: t("village.tabFollowing"), icon: "heart", backendKey: "following", defaultSort: "latest" },
  { id: "cat-samecity", name: t("village.tabSameCity"), icon: "location", backendKey: "samecity", defaultSort: "latest" },
  { id: "cat-discover", name: t("village.tabDiscover"), icon: "star", backendKey: "discover", defaultSort: "latest" },
]);

/**
 * Phase Feedback4：发现 Tab 二级子标签。
 * - 全部：不过滤
 * - 校友：同校帖子（isAlumni / campusName 匹配）
 * - 老乡：同乡标签（hometown 标签）
 * - 搭子圈：基于个人标签相似度（buddy 标签）
 */
const DISCOVER_SUB_TABS = computed(() => [
  { id: "discover-all", name: t("village.discoverAll"), backendKey: "all" },
  { id: "discover-alumni", name: t("village.discoverAlumni"), backendKey: "alumni" },
  { id: "discover-hometown", name: t("village.discoverHometown"), backendKey: "hometown" },
  { id: "discover-buddy", name: t("village.discoverBuddy"), backendKey: "buddy" },
]);

/** 当前发现 Tab 选中的子标签（默认全部） */
const selectedDiscoverSubTab = ref<string>("discover-all");

/** Phase Feedback4：同城 Tab 当前城市（默认从 session 校区城市推断，可手动切换） */
const sameCityName = ref<string>("");

/**
 * 可切换的城市列表。
 * 与 mock 帖子 city 字段保持一致（南京/杭州/上海/成都），避免切换后空列表；
 * 真实环境接入 IP 定位 + 城市服务后扩展。
 */
const SAME_CITY_OPTIONS = ["南京", "杭州", "上海", "成都"];

/** 是否显示城市切换器 */
const showCityPicker = ref(false);

/**
 * 初始化同城城市：当前 mock 阶段默认"南京"；
 * 真实环境接入 IP 定位（如 uni.getLocation 反查城市）后替换此处。
 */
function initSameCity() {
  if (sameCityName.value) return;
  sameCityName.value = "南京";
}

/** 选择城市 */
function selectSameCity(city: string) {
  sameCityName.value = city;
  showCityPicker.value = false;
  void villageStore.fetchPosts(currentFilters.value);
}

/** Phase Feedback4：选择发现 Tab 二级子标签 */
function selectDiscoverSubTab(subId: string) {
  if (selectedDiscoverSubTab.value === subId) return;
  selectedDiscoverSubTab.value = subId;
  void villageStore.fetchPosts(currentFilters.value);
}

/** 判断用户是否已完成校园认证 */
const isCampusVerified = computed(() => {
  return sessionStore.userSession?.campusVerified ?? false;
});

/** 当前用户 campusName */
const currentCampusName = computed(() => {
  return sessionStore.userSession?.campusName ?? "";
});

/** 根据校园认证状态过滤可见分类（三 Tab 均无需认证，保留钩子） */
const displayCategories = computed<VillageCategory[]>(() => {
  return CATEGORY_CONFIG.value.filter((cat) => {
    if (cat.requireCampus) return isCampusVerified.value;
    return true;
  });
});

/** 从 localStorage 读取上次选择的分类，默认 "关注" */
function getLastCategory(): string {
  try {
    const saved = uni.getStorageSync(LAST_CATEGORY_KEY);
    if (saved && typeof saved === "string") {
      const visibleIds = displayCategories.value.map((c) => c.id);
      if (visibleIds.includes(saved)) return saved;
    }
  } catch (_e) {
    // 修复 no-empty：catch 块不能为空，添加注释说明静默处理
    // 读取失败时回退到默认分类，不阻塞页面渲染
  }
  return "cat-following";
}

/** 保存分类到 localStorage */
function saveLastCategory(catId: string) {
  try {
    uni.setStorageSync(LAST_CATEGORY_KEY, catId);
  } catch (_e) {
    // 修复 no-empty：catch 块不能为空，添加注释说明静默处理
    // 持久化失败时忽略，不影响用户当前选择
  }
}

/** 空状态文案（按当前 Tab 区分，Phase Feedback4） */
const emptyStateMessage = computed(() => {
  switch (selectedCategory.value) {
    case "cat-following":
      return t("village.followingEmpty");
    case "cat-samecity":
      return t("village.sameCityEmpty");
    case "cat-discover":
      return t("village.discoverEmpty");
    default:
      return t("village.emptyPosts");
  }
});

/** 空状态操作按钮文案（关注 Tab 显示"去寻觅"引导） */
const emptyStateActionLabel = computed(() => {
  return selectedCategory.value === "cat-following"
    ? t("village.goMatch")
    : t("village.publishPost");
});

/** 空状态操作（关注 Tab → 寻觅页；其余 → 发帖） */
function handleEmptyAction() {
  if (selectedCategory.value === "cat-following") {
    openAppPath("/pages/discover/index");
    return;
  }
  openAppPath("/pages/village/post");
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
  const filters: PostFilters = {
    categoryId: selectedCategory.value,
    sortBy: config?.defaultSort ?? "latest",
  };
  // 发现 Tab：透传二级子标签（all/alumni/hometown/buddy），由 store filteredPosts 消费
  if (selectedCategory.value === "cat-discover") {
    const sub = DISCOVER_SUB_TABS.value.find((s) => s.id === selectedDiscoverSubTab.value);
    filters.discoverSub = sub && sub.backendKey !== "all" ? sub.backendKey : "all";
  }
  // 同城 Tab：透传城市名
  if (selectedCategory.value === "cat-samecity") {
    filters.city = sameCityName.value || undefined;
  }
  return filters;
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

/* ========== 空操作占位（catchtap 占位 handler，mp-weixin 要求 catchtap 必须绑定 handler） ========== */
function noop() {}

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
  initSameCity();
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

// 修复（严格模式 noUnusedLocals）：handleLike/toggleCollect/handleFollow/noop/goToAuthorProfile/goToTagPosts
// 通过 catchtap 绑定到模板，vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ handleLike, toggleCollect, handleFollow, noop, goToAuthorProfile, goToTagPosts });
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
          <view class="village-header__publish press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('village.publishPostAria')" @tap="goToPost">
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

      <!-- ===== Phase Feedback4：同城 Tab 城市选择器（自动标注城市 + 可手动切换） ===== -->
      <view v-if="selectedCategory === 'cat-samecity' && featureFlags.villageSameCityEnabled" class="same-city-bar">
        <view class="same-city-bar__label">
          <image class="same-city-bar__icon" :src="IMAGE_PATHS.ICONS_EMOJI.PIN" mode="aspectFit" alt="" />
          <text class="same-city-bar__text">{{ t('village.sameCityLabel', { city: sameCityName }) }}</text>
        </view>
        <view
          class="same-city-bar__switch press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('village.sameCityChange')"
          @tap="showCityPicker = true"
        >
          <text class="same-city-bar__switch-text">{{ t('village.sameCityChange') }}</text>
        </view>
      </view>

      <!-- ===== Phase Feedback4：城市选择弹层 ===== -->
      <view v-if="showCityPicker" class="city-picker" role="button" :aria-label="t('common.closeAria')" @tap="showCityPicker = false">
        <view class="city-picker__content" catchtap="noop">
          <view class="city-picker__header">
            <text class="city-picker__title">{{ t('village.cityPickerTitle') }}</text>
            <text class="city-picker__close" role="button" :aria-label="t('common.closeAria')" @tap="showCityPicker = false">✕</text>
          </view>
          <scroll-view scroll-y class="city-picker__list" :show-scrollbar="false">
            <view
              v-for="city in SAME_CITY_OPTIONS"
              :key="city"
              class="city-picker__item press-feedback"
              :class="{ 'city-picker__item--active': city === sameCityName }"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="city"
              @tap="selectSameCity(city)"
            >
              <text class="city-picker__item-name">{{ city }}</text>
              <text v-if="city === sameCityName" class="city-picker__item-check">✓</text>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- ===== Phase Feedback4：发现 Tab 二级子标签（全部/校友/老乡/搭子圈） ===== -->
      <view v-if="selectedCategory === 'cat-discover'" class="discover-sub-tabs">
        <view
          v-for="sub in DISCOVER_SUB_TABS"
          :key="sub.id"
          class="discover-sub-tab press-feedback"
          :class="{ 'discover-sub-tab--active': sub.id === selectedDiscoverSubTab }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="sub.name"
          :aria-pressed="sub.id === selectedDiscoverSubTab"
          @tap="selectDiscoverSubTab(sub.id)"
        >
          <text class="discover-sub-tab__text">{{ sub.name }}</text>
        </view>
      </view>

      <!-- ===== 附近的人入口卡片（M-08） ===== -->
      <view class="discover-banner press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('village.goToDiscoverAria')" @tap="goToDiscover">
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
        <!-- 空状态（按 Tab 区分文案，Phase Feedback4） -->
        <view v-if="displayPosts.length === 0" class="village-empty">
          <EmptyState type="no-data" :message="emptyStateMessage">
            <view class="village-empty__action press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="emptyStateActionLabel" @tap="handleEmptyAction">
              <text class="village-empty__action-text">{{ emptyStateActionLabel }}</text>
            </view>
          </EmptyState>
        </view>

        <!-- 帖子卡片列表 -->
        <view class="post-feed__list card-stagger" role="list">
        <view
          v-for="post in displayPosts" :key="post.id"
          class="post-card clickable"
          hover-class="post-card--pressed"
          :hover-stay-time="100"
          role="button"
          :aria-label="t('village.postItemAria', { title: post.title || post.content })"
          @tap="goToDetail(post.id)"
        >
          <!-- 作者信息行 -->
          <view class="post-card__header">
            <view class="post-card__user clickable" hover-class="post-card__user--pressed" :hover-stay-time="100" catchtap="goToAuthorProfile(post.author.userId)">
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
              catchtap="handleFollow(post.author.userId)"
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
          <view v-if="post.images.length > 0" class="post-card__images" :class="'post-card__images--' + Math.min(post.images.length, 9)" catchtap="noop">
            <view
              v-for="(img, idx) in post.images.slice(0, 9)" :key="idx"
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
              v-for="(tag, tagIdx) in post.tags" :key="tag"
              class="post-card__tag"
              :class="tagIdx % 2 === 0 ? 'post-card__tag--green' : 'post-card__tag--pink'"
              catchtap="goToTagPosts(tag)"
            >{{ tag.startsWith('#') ? tag : '#' + tag }}</text>
          </view>

          <!-- 底部互动栏 -->
          <view class="post-card__footer">
            <text class="post-card__time">{{ formatRelativeTime(post.createdAt) }}</text>
            <view class="post-card__actions">
              <!-- 评论 -->
              <view class="action-btn" catchtap="goToDetail(post.id)">
                <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" alt="" />
                <text v-if="post.comments > 0" class="action-btn__count">{{ post.comments }}</text>
              </view>
              <!-- 点赞 -->
              <view
                class="action-btn"
                :class="{ 'action-btn--liked': post.isLiked, 'action-btn--animating': likeAnimatingPosts.has(post.id) }"
                catchtap="handleLike(post.id)"
              >
                <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART" mode="aspectFit" alt="" />
                <text v-if="post.likes > 0" class="action-btn__count" :class="{ 'action-btn__count--liked': post.isLiked }">{{ post.likes }}</text>
              </view>
              <!-- 分享 -->
              <view class="action-btn" catchtap="noop">
                <image class="action-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.SPARKLES" mode="aspectFit" alt="" />
              </view>
              <!-- 收藏 -->
              <view
                class="action-btn"
                :class="{ 'action-btn--collected': collectedPosts.has(post.id) }"
                catchtap="toggleCollect(post.id)"
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
      <view class="fab press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('village.publishPostAria')" @tap="goToPost">
        <image class="fab__icon" :src="IMAGE_PATHS.ICONS_EMOJI.PLUS" mode="aspectFit" alt="" />
      </view>

      <!-- ===== 回到顶部按钮（P2 修复：滚动超过一屏后显示） ===== -->
      <view
        v-if="showBackToTop"
        class="back-to-top press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('village.backToTopAria')"
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
/* ========== Phase Feedback4：同城城市选择条 ========== */
.same-city-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 var(--sp-8) var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  background: var(--c-brand-bg-tint, #e6f9f0);
  border-radius: var(--r-lg, 20rpx);
  border: 1rpx solid var(--c-brand-border-tint, #b7ecd8);
}

.same-city-bar__label {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.same-city-bar__icon {
  width: 32rpx;
  height: 32rpx;
}

.same-city-bar__text {
  font-size: var(--fs-base, 28rpx);
  font-weight: 700;
  color: var(--c-brand-600, #2db97a);
}

.same-city-bar__switch {
  padding: 6rpx 16rpx;
  border-radius: var(--r-full, 999rpx);
  background: var(--c-bg-container, #ffffff);
}

.same-city-bar__switch-text {
  font-size: var(--fs-xs, 24rpx);
  color: var(--c-brand-500, #3fcf8e);
  font-weight: 600;
}

/* ========== Phase Feedback4：城市选择弹层 ========== */
.city-picker {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 1000);
  background: var(--c-overlay-bg, rgba(0, 0, 0, 0.45));
  display: flex;
  align-items: center;
  justify-content: center;
}

.city-picker__content {
  width: 600rpx;
  max-height: 70vh;
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--r-xl, 24rpx);
  padding: var(--sp-5);
  display: flex;
  flex-direction: column;
}

.city-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--sp-4);
  border-bottom: 1rpx solid var(--c-divider-light, #f0f0f0);
}

.city-picker__title {
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.city-picker__close {
  font-size: var(--fs-2xl, 36rpx);
  color: var(--c-text-tertiary, #9ca3af);
  padding: 4rpx 12rpx;
}

.city-picker__list {
  margin-top: var(--sp-4);
  max-height: 50vh;
}

.city-picker__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--r-lg, 20rpx);
}

.city-picker__item--active {
  background: var(--c-brand-bg-tint, #e6f9f0);
}

.city-picker__item-name {
  font-size: var(--fs-base, 28rpx);
  color: var(--c-text-primary, #1f2937);
}

.city-picker__item--active .city-picker__item-name {
  color: var(--c-brand-600, #2db97a);
  font-weight: 700;
}

.city-picker__item-check {
  color: var(--c-brand-500, #3fcf8e);
  font-weight: 700;
}

/* ========== Phase Feedback4：发现 Tab 二级子标签 ========== */
.discover-sub-tabs {
  display: flex;
  gap: var(--sp-3);
  margin: 0 var(--sp-8) var(--sp-4);
  overflow-x: auto;
}

.discover-sub-tab {
  flex-shrink: 0;
  padding: 8rpx 24rpx;
  border-radius: var(--r-full, 999rpx);
  background: var(--c-bg-container, #ffffff);
  border: 1rpx solid var(--c-divider-light, #f0f0f0);
}

.discover-sub-tab--active {
  background: var(--c-gradient-brand, linear-gradient(135deg, #6fe0b0 0%, #3fcf8e 100%));
  border-color: transparent;
}

.discover-sub-tab__text {
  font-size: var(--fs-sm, 26rpx);
  color: var(--c-text-secondary, #6b7280);
  font-weight: 500;
}

.discover-sub-tab--active .discover-sub-tab__text {
  color: var(--c-text-inverse, #ffffff);
  font-weight: 600;
}

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
  animation: spin var(--d-loop, 1000ms) linear infinite;
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
