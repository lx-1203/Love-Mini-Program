<script setup lang="ts">
/**
 * 寻觅页 - 卡片推荐 + 签到入口
 * 展示个性化用户卡片推荐，支持滑动浏览和每日签到
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
// 修复 no-duplicate-imports：合并 ../../stores/discover 的重复 import
import { useDiscoverStore, type SwipeDirection } from "../../stores/discover";
import { useActivityStore } from "../../stores/activity";
import { useCheckInStore } from "../../stores/checkin";
import { useDailyQuestionStore } from "../../stores/daily-question";
import { useSocialProgressStore } from "../../stores/social-progress";
import { openAppPath } from "../../utils/navigation";
import { useTabBar } from "../../composables/useTabBar";
import CardSwiper from "../../components/discover/CardSwiper.vue";
import FilterDrawer from "../../components/discover/FilterDrawer.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import HeartParticles from "../../components/common/HeartParticles.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import { IMAGE_PATHS } from "../../config/images";
import { lightHaptic } from "../../utils/haptic";
import { showErrorToast } from "../../utils/error-toast";
// Sentry 监控：推荐加载 / 滑动失败上报异常，页面切换记录面包屑
import { captureException, addBreadcrumb } from "../../services/sentry";
import type { RecommendationFilter } from "../../services/generated/api-types-supplement";

/** 图标资源路径 */
const icons = {
  checkin: IMAGE_PATHS.ICONS_SOCIAL.CHECKIN,
  match: IMAGE_PATHS.ICONS_SOCIAL.MATCH,
  heartSignal: IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL,
  follow: IMAGE_PATHS.ICONS_SOCIAL.FOLLOW,
  likeFilled: IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED,
  // Emoji 替换 SVG 图标
  search: IMAGE_PATHS.ICONS_EMOJI.SEARCH,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
  plus: IMAGE_PATHS.ICONS_EMOJI.PLUS,
  close: IMAGE_PATHS.ICONS_COMMON.CLOSE,
} as const;

const discoverStore = useDiscoverStore();
const { t } = useI18n();

// 同步自定义 TabBar 选中状态（匹配 = 索引 0）
useTabBar(0);
const {
  cards,
  remainingCount,
  hasMore,
  loading,
  errorMessage,
  recommendationFilter,
  isFilterDrawerOpen,
} = storeToRefs(discoverStore);

const activityStore = useActivityStore();
const checkInStore = useCheckInStore();
const dailyQuestionStore = useDailyQuestionStore();
const socialProgressStore = useSocialProgressStore();

/**
 * 匹配成功跳转锁，避免快速操作触发重复跳转
 * 1.5 秒延迟期间只允许触发一次 openAppPath
 */
let isMatchNavigating = false;

/**
 * 匹配跳转定时器引用，用于卸载时清理。
 * 修复（P1 BUG）：原实现未保存 setTimeout 返回值，页面卸载后定时器仍会触发
 * openAppPath 跳转与状态修改，可能导致已销毁页面的状态被改写。
 */
let matchNavTimer: ReturnType<typeof setTimeout> | null = null;
let matchNavReleaseTimer: ReturnType<typeof setTimeout> | null = null;

/** 是否显示匹配成功双头像碰撞动画 */
const showMatchAnimation = ref(false);

/** 匹配对方头像（用于双头像碰撞动画） */
const partnerAvatar = ref<string>("");

/** 匹配对方昵称（用于动画文案） */
const partnerName = ref<string>("");

/** 当前用户头像（用于双头像碰撞动画） */
const myAvatar = ref<string>("");

/** 是否显示签到粒子撒花动画（1.5s 后由 HeartParticles done 事件重置） */
const showParticles = ref(false);

/**
 * 签到动画锁：粒子撒花动画播放期间（1.5s）不响应新的签到点击。
 *
 * 修复（P1 BUG）：原实现仅依赖 checkInStore.checkingIn 防止重复 API 调用，
 * 但 API 返回成功后 checkingIn 立即复位，而粒子动画仍在播放（1.5s）。
 * 此期间用户若再次触发签到（如通过其他入口），会导致动画重复触发、状态错乱。
 * 现新增 isAnimating 锁，动画完成（done 事件）后才允许下一次签到。
 */
const isAnimating = ref(false);

/**
 * 触发匹配成功跳转（带防重复保护 + 双头像碰撞动画）
 * @param partner - 匹配对方信息（昵称 + 头像）
 */
function triggerMatchNavigation(partner?: { name?: string; avatar?: string }) {
  if (isMatchNavigating) return;
  isMatchNavigating = true;

  // 设置动画数据（当前用户头像暂用默认，UserSession 无 avatarUrl 字段）
  partnerName.value = partner?.name ?? t("discover.partnerDefaultName");
  partnerAvatar.value = partner?.avatar || IMAGE_PATHS.AVATARS.AVATAR_1;
  myAvatar.value = IMAGE_PATHS.AVATARS.AVATAR_2;
  showMatchAnimation.value = true;

  // 显示 toast 提示
  uni.showToast({
    title: t("discover.matchSuccess"),
    icon: "success",
    duration: 2000,
  });

  // 1.5 秒后跳转 likes 页
  if (matchNavTimer) clearTimeout(matchNavTimer);
  matchNavTimer = setTimeout(() => {
    showMatchAnimation.value = false;
    openAppPath("/pages/likes/index");
    // 跳转完成后释放锁（页面通常已切换，但保险起见延时重置）
    if (matchNavReleaseTimer) clearTimeout(matchNavReleaseTimer);
    matchNavReleaseTimer = setTimeout(() => {
      isMatchNavigating = false;
      matchNavReleaseTimer = null;
    }, 500);
    matchNavTimer = null;
  }, 1500);
}

/**
 * 页面卸载时清理匹配跳转相关定时器，避免内存泄漏。
 */
onUnmounted(() => {
  if (matchNavTimer) {
    clearTimeout(matchNavTimer);
    matchNavTimer = null;
  }
  if (matchNavReleaseTimer) {
    clearTimeout(matchNavReleaseTimer);
    matchNavReleaseTimer = null;
  }
});

/**
 * 处理滑动事件
 * @param direction - 滑动方向
 * @param cardId - 卡片 ID
 */
async function handleSwipe(direction: SwipeDirection, cardId: string) {
  try {
    if (direction === "left") {
      await discoverStore.swipeLeft(cardId);
    } else {
      // 右滑前获取卡片信息（swipeRight 后卡片会从列表移除）
      const card = discoverStore.cards.find((c) => c.id === cardId);
      await discoverStore.swipeRight(cardId);
      // 右滑喜欢后检查是否匹配成功
      const result = discoverStore.lastSwipeResult;
      if (result?.matched) {
        triggerMatchNavigation({
          name: card?.name ?? result.partnerName,
          avatar: card?.avatar,
        });
      }
    }
  } catch (error) {
    // 错误已由 store 处理并设置到 errorMessage，额外 toast 提示用户
    // 优先使用 store 中的 errorMessage（已格式化），其次按错误分类自动选择文案
    const storeMessage = discoverStore.errorMessage;
    if (storeMessage) {
      uni.showToast({ title: storeMessage, icon: "none" });
    } else {
      showErrorToast(error, t("discover.operationFailed"));
    }
    console.error("滑动操作失败:", error);
  }
}

/**
 * 处理超级喜欢事件
 * @param cardId - 卡片 ID
 */
async function handleSuperLike(cardId: string) {
  try {
    // 超级喜欢前获取卡片信息（swipeRight 后卡片会从列表移除）
    const card = discoverStore.cards.find((c) => c.id === cardId);
    await discoverStore.swipeRight(cardId, true);
    // 超级喜欢后检查是否匹配成功
    const result = discoverStore.lastSwipeResult;
    if (result?.matched) {
      // 匹配成功，跳转到 likes 页面查看匹配
      triggerMatchNavigation({
        name: card?.name ?? result.partnerName,
        avatar: card?.avatar,
      });
    }
  } catch (error) {
    // 优先使用 store 中的 errorMessage，其次按错误分类选择文案
    const storeMessage = discoverStore.errorMessage;
    if (storeMessage) {
      uni.showToast({ title: storeMessage, icon: "none" });
    } else {
      showErrorToast(error, t("discover.superLikeFailed"));
    }
    console.error("超级喜欢操作失败:", error);
  }
}

/**
 * 处理发消息事件（从 CardDetailOverlay 透传）
 * 导航到聊天页 /pages/chat-session/index?userId={userId}
 * @param userId - 目标用户 ID
 */
function handleMessage(userId: string) {
  if (!userId || userId.trim().length === 0) {
    uni.showToast({ title: t("discover.userIdInvalid"), icon: "none" });
    return;
  }
  try {
    openAppPath(`/pages/chat-session/index?userId=${encodeURIComponent(userId)}`);
  } catch (error) {
    uni.showToast({ title: t("discover.enterChatFailed"), icon: "none" });
    console.error("进入聊天失败:", error);
  }
}

/**
 * 处理视频角标点击事件（Phase D2）。
 * 跳转到全屏视频播放页，传入视频 URL 与关联卡片 ID。
 *
 * @param cardId - 关联卡片 ID（用于埋点 / 日志）
 * @param videoUrl - 视频地址
 */
function handleVideoTap(cardId: string, videoUrl: string): void {
  if (!videoUrl) return;
  lightHaptic();
  openAppPath(
    `/pages/discover/video-player?videoUrl=${encodeURIComponent(videoUrl)}&cardId=${encodeURIComponent(cardId)}`
  );
}

/**
 * 重新加载卡片
 */
async function reloadCards() {
  await discoverStore.fetchCards();
}

/* ========== 筛选栏与搜索框交互 ========== */

/** 当前选中的筛选项 ID（默认附近） */
const activeFilter = ref("nearby");

/** 搜索关键字（双向绑定到 input） */
const searchKeyword = ref("");

/**
 * 搜索输入框聚焦状态（双向控制）。
 *
 * P2 修复（搜索框自动聚焦）：
 * - 通过 :focus 绑定控制 input 的聚焦/失焦
 * - 用户点击搜索框区域（含放大镜图标）时调用 focusSearchInput 触发聚焦
 * - 失焦后 reset 为 false，便于下次再次触发（mp-weixin input focus 属性需先 false 再 true 才能重新聚焦）
 * - 不在 onShow / onMounted 自动 focus，避免 tab 页切换时键盘弹出打断主流程（卡片浏览）
 */
const searchInputFocused = ref(false);

/**
 * 聚焦搜索输入框。
 * - 调用此方法前若 searchInputFocused 已为 true，需先重置为 false 再置 true，
 *   否则 mp-weixin input 不会重新触发 focus（属性未变化）
 * - 使用 nextTick 保证状态切换生效
 */
function focusSearchInput() {
  if (searchInputFocused.value) {
    searchInputFocused.value = false;
  }
  // 简单赋值即可，Vue 响应式更新会在下个 tick 触发 input 的 focus 属性变化
  searchInputFocused.value = true;
}

/** 学历标签映射（与 FilterDrawer EDUCATION_OPTIONS 对齐，使用 computed 以响应 locale 切换） */
const EDUCATION_LABEL_MAP = computed<Record<string, string>>(() => ({
  high_school: t("discover.educationHighSchool"),
  bachelor: t("discover.educationBachelor"),
  master: t("discover.educationMaster"),
  phd: t("discover.educationPhd"),
}));

/** 感情状态标签映射（与 FilterDrawer RELATIONSHIP_OPTIONS 对齐，使用 computed 以响应 locale 切换） */
const RELATIONSHIP_LABEL_MAP = computed<Record<string, string>>(() => ({
  never: t("discover.relationshipNever"),
  married_before: t("discover.relationshipMarriedBefore"),
  divorced: t("discover.relationshipDivorced"),
  widowed: t("discover.relationshipWidowed"),
}));

/**
 * 已应用的筛选条件胶囊列表（基于 recommendationFilter 派生）。
 * 用于在筛选栏下方展示当前生效的筛选条件，每个胶囊可单独删除。
 */
const activeFilterCapsules = computed<{ key: keyof RecommendationFilter; label: string }[]>(() => {
  const filter = recommendationFilter.value;
  const capsules: { key: keyof RecommendationFilter; label: string }[] = [];

  // 身高范围
  if (filter.heightMin !== undefined || filter.heightMax !== undefined) {
    const min = filter.heightMin ?? 120;
    const max = filter.heightMax ?? 250;
    capsules.push({ key: "heightMin", label: `${min}-${max}cm` });
  }

  // 学历多选
  if (filter.educationLevel && filter.educationLevel.length > 0) {
    const labels = filter.educationLevel.map((v) => EDUCATION_LABEL_MAP.value[v] ?? v).join("/");
    capsules.push({ key: "educationLevel", label: labels });
  }

  // 感情状态
  if (filter.relationshipStatus && filter.relationshipStatus.length > 0) {
    const labels = filter.relationshipStatus.map((v) => RELATIONSHIP_LABEL_MAP.value[v] ?? v).join("/");
    capsules.push({ key: "relationshipStatus", label: labels });
  }

  // 籍贯
  if (filter.hometownProvince) {
    const citySuffix = filter.hometownCity && filter.hometownCity !== filter.hometownProvince
      ? ` ${filter.hometownCity}`
      : "";
    capsules.push({ key: "hometownProvince", label: `${filter.hometownProvince}${citySuffix}` });
  }

  // 未来城市
  if (filter.futureCity) {
    capsules.push({ key: "futureCity", label: `${t("discover.futureCityPrefix")}${filter.futureCity}` });
  }

  // 关键词
  if (filter.keyword) {
    capsules.push({ key: "keyword", label: `${t("discover.keywordPrefix")}${filter.keyword}` });
  }

  return capsules;
});

/** 是否有已应用的筛选条件 */
const hasActiveFilters = computed(() => activeFilterCapsules.value.length > 0);

/** 筛选配置：id -> 文案与图标（图标使用 SVG 路径）。
 * Phase 4.1 验收：顶部仅保留 1-2 个核心筛选 Chip，其余筛选收敛到抽屉（全部筛选）。
 */
const filterOptions = computed<{ id: string; icon: string; text: string }[]>(() => [
  { id: "nearby", icon: icons.location, text: t('discover.nearby') },
]);

/**
 * 切换筛选 chip
 * - "all-filters" 触发筛选抽屉打开（不修改 activeFilter）
 * - 其他 ID 走原 chip 高亮 + setFilter 逻辑
 * @param filterId - 筛选项 ID
 */
function onFilterChipTap(filterId: string) {
  if (filterId === "all-filters") {
    lightHaptic();
    discoverStore.openFilterDrawer();
    return;
  }
  activeFilter.value = filterId;
  // 触发 store 筛选逻辑（刷新推荐列表）
  discoverStore.setFilter(filterId);
}

/**
 * FilterDrawer 应用筛选回调。
 * 由抽屉确认按钮触发，将最终 RecommendationFilter 应用到 store 并刷新列表。
 * @param filter - 用户确认后的筛选条件对象
 */
function onApplyFilter(filter: RecommendationFilter) {
  discoverStore.setRecommendationFilter(filter);
}

/**
 * FilterDrawer 重置回调。
 * 由抽屉重置按钮触发，清空 store 中的所有筛选条件。
 */
function onResetFilter() {
  discoverStore.resetFilter();
}

/**
 * 删除单个已应用筛选胶囊。
 * 通过浅拷贝当前 filter 后删除对应字段，再回写到 store。
 * @param key - 要删除的筛选字段名
 */
function removeFilterCapsule(key: keyof RecommendationFilter) {
  lightHaptic();
  const next: RecommendationFilter = { ...recommendationFilter.value };
  if (key === "heightMin") {
    // 身高范围一并清除（避免下限被删后上限孤立）
    delete next.heightMin;
    delete next.heightMax;
  } else if (key === "hometownProvince") {
    // 籍贯省市一并清除
    delete next.hometownProvince;
    delete next.hometownCity;
  } else {
    delete next[key];
  }
  discoverStore.setRecommendationFilter(next);
}

/**
 * 清空所有已应用筛选条件。
 */
function clearAllFilters() {
  lightHaptic();
  discoverStore.resetFilter();
}

/**
 * 搜索框输入回调
 * 配合 v-model 双向绑定，input 事件触发时 searchKeyword 已同步
 */
function onSearchInput() {
  discoverStore.setSearchKeyword(searchKeyword.value);
}

/**
 * 清空搜索框
 *
 * P2 修复（搜索框自动聚焦）：清空后自动 refocus 输入框，
 * 便于用户连续输入新关键词，无需再次手动点击输入框。
 */
function clearSearch() {
  searchKeyword.value = "";
  discoverStore.setSearchKeyword("");
  focusSearchInput();
}

/**
 * 处理签到
 *
 * 修复（P1 BUG）：新增 isAnimating 锁，动画播放期间不响应新点击。
 * checkInStore.checkingIn 仅在 API 请求期间生效，请求返回后立即复位；
 * 而粒子动画持续 1.5s，此期间通过 isAnimating 锁阻止重复触发。
 */
async function handleCheckIn() {
  // 动画播放中或签到请求中时，忽略新点击
  if (isAnimating.value) return;

  try {
    await checkInStore.checkIn();
    // 签到成功后，将额外配额同步到 discover store
    if (checkInStore.extraRecommendQuota > 0) {
      discoverStore.setExtraQuota(checkInStore.extraRecommendQuota);
    }
    // 触发心形粒子撒花动画，并加锁（1.5s 后由 onParticlesDone 释放）
    showParticles.value = true;
    isAnimating.value = true;
  } catch (_e) {
    // 错误已在 checkInStore 的 errorMessage 中展示
  }
}

/**
 * 粒子动画完成回调：重置 showParticles 并释放 isAnimating 锁。
 * 由 HeartParticles 组件在 1.5s 后通过 done 事件触发。
 */
function onParticlesDone() {
  showParticles.value = false;
  isAnimating.value = false;
}

onMounted(() => {
  // 记录页面进入面包屑，便于在异常发生时回溯用户跳转路径
  addBreadcrumb("navigation", "page_enter", { url: "/pages/discover/index" });
  void discoverStore.fetchCards();
  void activityStore.fetchActivities();
  void checkInStore.fetchStatus();
  void socialProgressStore.fetchProgress();
});

/**
 * 监听推荐卡片加载错误，上报到 Sentry 便于排查接口 / 数据问题。
 *
 * 触发场景：
 * - fetchCards 接口请求失败（network / 5xx 等）；
 * - 重试耗尽后 store.errorMessage 被赋值；
 * - 此处只上报一次（errorMessage 从 null 切到非空时触发），
 *   避免重复 toast / 重试导致同一条错误被多次上报。
 */
watch(
  () => discoverStore.errorMessage,
  (newVal, oldVal) => {
    if (newVal && !oldVal) {
      captureException(new Error(newVal), { source: "discover.fetchCards" });
    }
  }
);

// 修复（严格模式 noUnusedLocals）：clearSearch 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ clearSearch });
</script>

<template>
  <view class="discover-page page-bottom-safe page-fade-in">
    <!-- 浪漫氛围背景层：模糊光斑营造若隐若现的浪漫感（mp-weixin 降级为静态色块） -->
    <view class="discover-atmosphere" aria-hidden="true">
      <view class="discover-atmosphere__blob discover-atmosphere__blob--pink" />
      <view class="discover-atmosphere__blob discover-atmosphere__blob--green" />
    </view>

    <!-- 页面头部 -->
    <view class="discover-header">
      <view class="discover-header__title-area">
        <text class="discover-header__title">{{ t('discover.title') }}</text>
        <text class="discover-header__subtitle">{{ t('discover.subtitle') }}</text>
      </view>
      <view class="discover-header__meta">
        <view class="discover-header__count-chip">
          <SafeImage :src="icons.match" custom-class="discover-header__count-icon" mode="aspectFit" />
          <text class="discover-header__count">{{ t('discover.remainingTimes', { n: remainingCount }) }}</text>
        </view>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
        <view class="filter-list" role="list">
          <view
            v-for="filter in filterOptions" :key="filter.id"
            class="filter-chip press-feedback"
            :class="{ 'filter-chip--active': activeFilter === filter.id }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="filter.text"
            :aria-pressed="activeFilter === filter.id"
            @tap="onFilterChipTap(filter.id)"
          >
            <image class="filter-chip__icon" :src="filter.icon" mode="aspectFit" alt="" />
            <text class="filter-chip__text">{{ filter.text }}</text>
          </view>
          <!-- 全部筛选 chip：点击打开筛选抽屉（H-07 + M-16） -->
          <view
            class="filter-chip filter-chip--all press-feedback"
            :class="{ 'filter-chip--has-active': hasActiveFilters }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('discover.allFilters')"
            @tap="onFilterChipTap('all-filters')"
          >
            <image class="filter-chip__icon" :src="icons.plus" mode="aspectFit" alt="" />
            <text class="filter-chip__text">{{ t('discover.allFilters') }}</text>
            <view v-if="hasActiveFilters" class="filter-chip__count-badge">
              <text class="filter-chip__count-text">{{ activeFilterCapsules.length }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 已应用的筛选条件胶囊栏（仅在存在筛选条件时展示） -->
    <view v-if="hasActiveFilters" class="active-capsules">
      <scroll-view scroll-x class="active-capsules__scroll" :show-scrollbar="false">
        <view class="active-capsules__list" role="list">
          <view
            v-for="capsule in activeFilterCapsules" :key="capsule.key"
            class="active-capsule press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="capsule.label"
            @tap="removeFilterCapsule(capsule.key)"
          >
            <text class="active-capsule__text">{{ capsule.label }}</text>
            <image class="active-capsule__close-img" :src="IMAGE_PATHS.ICONS_COMMON.CLOSE" mode="aspectFit" alt="" />
          </view>
          <view
            class="active-capsule active-capsule--clear press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('discover.clear')"
            @tap="clearAllFilters"
          >
            <text class="active-capsule__text active-capsule__text--clear">{{ t('discover.clear') }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 搜索框 -->
    <!-- P2 修复（搜索框自动聚焦）：容器 @tap 触发 focusSearchInput，扩大可点击区域；
         input 绑定 :focus 与 @blur，blur 后 reset 为 false 才能再次触发 focus -->
    <view class="search-box" role="button" :aria-label="t('discover.searchPlaceholder')" @tap="focusSearchInput">
      <image class="search-icon" :src="icons.search" mode="aspectFit" alt="" />
      <input
        class="search-input"
        :placeholder="t('discover.searchPlaceholder')"
        v-model="searchKeyword"
        :focus="searchInputFocused"
        @input="onSearchInput"
        @blur="searchInputFocused = false" :aria-label="t('discover.searchPlaceholder')"
      />
      <image v-if="searchKeyword" class="search-clear-img" :src="IMAGE_PATHS.ICONS_COMMON.CLOSE" mode="aspectFit" catchtap="clearSearch" alt="" />
    </view>

    <!-- 筛选抽屉（H-07 + M-16）：底部滑入，控制身高/学历/感情状态/籍贯/未来城市/关键词 -->
    <FilterDrawer
      :visible="isFilterDrawerOpen"
      :filter="recommendationFilter"
      @update:visible="isFilterDrawerOpen = $event"
      @apply="onApplyFilter"
      @reset="onResetFilter"
    />

    <!-- 签到卡片骨架屏：loading 时显示占位，避免页面空白 -->
    <view v-if="checkInStore.loading" class="checkin-card card-base checkin-card--skeleton">
      <view class="checkin-card__left">
        <view class="skeleton skeleton--icon" />
        <view class="checkin-card__info">
          <view class="skeleton skeleton--title" />
          <view class="skeleton skeleton--desc" />
        </view>
      </view>
      <view class="skeleton skeleton--btn" />
    </view>

    <!-- 签到卡片：今日未签到时展示（CSS 动画淡入，签到后切换更平滑） -->
    <view v-if="!checkInStore.checkedIn && !checkInStore.loading" class="checkin-card card-base animate-fade">
      <view class="checkin-card__left">
        <SafeImage :src="icons.checkin" custom-class="checkin-card__icon" mode="aspectFit" />
        <view class="checkin-card__info">
          <text class="checkin-card__title">{{ t('discover.todayCheckin') }}</text>
          <text class="checkin-card__desc">{{ t('discover.getMoreRecommend') }}</text>
        </view>
      </view>
      <button
        class="checkin-card__btn"
        :disabled="checkInStore.checkingIn || isAnimating"
        @tap="handleCheckIn"
      >
        {{ checkInStore.checkingIn ? t('discover.checkinInProgress') : (isAnimating ? t('discover.checkinSuccess') : t('discover.checkinNow')) }}
      </button>
    </view>

    <!-- 签到成功提示（CSS 动画淡入）+ 心形粒子撒花动画覆盖层 -->
    <view v-if="checkInStore.showSuccessAnimation" class="checkin-success animate-fade">
      <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.CHECK" custom-class="checkin-success__icon" mode="aspectFit" />
      <view class="checkin-success__info">
        <text class="checkin-success__title">{{ t('discover.checkinSuccess') }}</text>
        <text class="checkin-success__count">{{ checkInStore.extraRecommendationsText }}</text>
        <text v-if="checkInStore.consecutiveDaysText" class="checkin-success__streak">
          {{ checkInStore.consecutiveDaysText }}
        </text>
      </view>
      <!-- 心形粒子撒花动画：1.5s 后由 done 事件触发 onParticlesDone，重置 showParticles 并释放 isAnimating 锁 -->
      <HeartParticles :visible="showParticles" @done="onParticlesDone" />
    </view>

    <!-- 签到权益卡片：签到成功后展示权益入口（CSS 动画淡入，3 秒后由 success 切换过来更平滑） -->
    <view v-if="checkInStore.checkedIn && !checkInStore.showSuccessAnimation" class="benefits-section animate-fade card-stagger">
        <!-- 已签到徽章卡片：签到后展示「已签到」状态 -->
        <view
          class="benefit-card card-base benefit-card--quota press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
        >
          <view class="benefit-card__left">
            <SafeImage :src="icons.checkin" custom-class="benefit-card__icon" mode="aspectFit" />
            <view class="benefit-card__info">
              <text class="benefit-card__title">{{ t('discover.alreadyCheckedIn') }}</text>
              <text class="benefit-card__desc">{{ checkInStore.consecutiveDaysText || t('discover.tomorrowContinue') }}</text>
            </view>
          </view>
          <image class="benefit-card__arrow-img" :src="IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE" mode="aspectFit" alt="" />
        </view>

        <!-- 推荐配额权益 -->
        <view
          v-if="checkInStore.extraQuotaText"
          class="benefit-card card-base benefit-card--quota press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="checkInStore.extraQuotaText"
          @tap="openAppPath('/pages/likes/index')"
        >
          <view class="benefit-card__left">
            <SafeImage :src="icons.match" custom-class="benefit-card__icon" mode="aspectFit" />
            <view class="benefit-card__info">
              <text class="benefit-card__title">{{ t('discover.recommendQuotaBoost') }}</text>
              <text class="benefit-card__desc">{{ checkInStore.extraQuotaText }}</text>
            </view>
          </view>
        </view>

        <!-- 热门话题入口（可点击跳转） -->
        <view
          v-if="checkInStore.hotTopicsText"
          class="benefit-card card-base benefit-card--clickable press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('discover.hotTopics')"
          @tap="openAppPath('/pages/village/index?tab=hot')"
        >
          <view class="benefit-card__left">
            <SafeImage :src="icons.heartSignal" custom-class="benefit-card__icon" mode="aspectFit" />
            <view class="benefit-card__info">
              <text class="benefit-card__title">{{ t('discover.hotTopics') }}</text>
              <text class="benefit-card__desc">{{ checkInStore.hotTopicsText }}</text>
            </view>
          </view>
          <text class="benefit-card__arrow">&rsaquo;</text>
        </view>

        <!-- 新入圈用户入口（可点击跳转） -->
        <view
          v-if="checkInStore.newUsersText"
          class="benefit-card card-base benefit-card--clickable press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('discover.newCircleUsers')"
          @tap="openAppPath('/pages/circles/index')"
        >
          <view class="benefit-card__left">
            <SafeImage :src="icons.follow" custom-class="benefit-card__icon" mode="aspectFit" />
            <view class="benefit-card__info">
              <text class="benefit-card__title">{{ t('discover.newCircleUsers') }}</text>
              <text class="benefit-card__desc">{{ checkInStore.newUsersText }}</text>
            </view>
          </view>
          <text class="benefit-card__arrow">&rsaquo;</text>
        </view>
    </view>

    <!-- 每日一问入口：签到后展示 -->
    <view
      v-if="checkInStore.checkedIn && !checkInStore.showSuccessAnimation"
      class="daily-question-card card-base press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      @tap="openAppPath('/pages/daily-question/index')"
    >
      <view class="daily-question-card__left">
        <SafeImage :src="icons.heartSignal" custom-class="daily-question-card__icon" mode="aspectFit" />
        <view class="daily-question-card__info">
          <text class="daily-question-card__title">{{ t('discover.dailyQuestion') }}</text>
          <text class="daily-question-card__desc">{{ dailyQuestionStore.todayQuestion?.question ?? t('discover.todayQuestion') }}</text>
          <text v-if="checkInStore.consecutiveDaysText" class="daily-question-card__streak">
            {{ checkInStore.consecutiveDaysText }}
          </text>
        </view>
      </view>
      <text class="daily-question-card__arrow">&rsaquo;</text>
    </view>

    <!-- 错误提示 -->
    <view v-if="errorMessage" class="error-banner">
      <text class="error-banner__text">{{ errorMessage }}</text>
      <text class="error-banner__retry" role="button" :aria-label="t('common.retryAria')" @tap="reloadCards">{{ t('discover.errorRetry') }}</text>
    </view>

    <!-- 加载状态：使用卡片骨架屏替代简单 spinner，更好呼应卡片布局 -->
    <view v-else-if="loading" class="card-skeleton-wrap">
      <Skeleton variant="card" :count="1" />
      <view class="card-skeleton-hint">
        <text class="card-skeleton-hint__text">{{ t('discover.cardSkeletonHint') }}</text>
      </view>
    </view>

    <!-- 空状态：无可推荐卡片时引导用户调整筛选或刷新 -->
    <view v-else-if="cards.length === 0" class="card-empty-wrap">
      <EmptyState type="no-data" :message="t('discover.card.emptyTitle')">
        <view
          class="card-empty__action press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="reloadCards"
        >
          <text class="card-empty__action-text">{{ t('discover.card.refresh') }}</text>
        </view>
      </EmptyState>
    </view>

    <!-- 卡片滑动区域 -->
    <view v-else class="card-area">
      <CardSwiper
        :cards="cards"
        :remaining-count="remainingCount"
        @swipe="handleSwipe"
        @superLike="handleSuperLike"
        @videoTap="handleVideoTap"
        @message="handleMessage"
      />
    </view>

    <!-- 社交升温提示：有社交进度时展示 -->
    <view
      v-if="!loading && socialProgressStore.progress && socialProgressStore.progress.likeCount > 0"
      class="social-hint press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      role="button"
      :aria-label="t('discover.likeCountProgress', { count: socialProgressStore.progress.likeCount })"
      @tap="openAppPath('/pages/likes/index')"
    >
      <view class="social-hint__left">
        <SafeImage :src="icons.likeFilled" custom-class="social-hint__icon" mode="aspectFit" />
        <text class="social-hint__text">
          {{ t('discover.likeCountProgress', { count: socialProgressStore.progress.likeCount }) }}
        </text>
      </view>
      <text class="social-hint__arrow">&rsaquo;</text>
    </view>

    <!-- 活动推荐板块：卡片用完后展示 -->
    <view v-if="!loading && !errorMessage && cards.length === 0" class="activity-recommend">
      <view class="activity-recommend__header">
        <text class="activity-recommend__title section-title-brand">{{ t('discover.discoverActivities') }}</text>
        <text class="activity-recommend__subtitle">{{ t('discover.discoverActivitiesDesc') }}</text>
      </view>
      <view class="activity-list" role="list">
        <view
          v-for="(item, idx) in activityStore.activities.slice(0, 3)" :key="item.id"
          class="activity-card list-item animate-fade-in"
          :style="{ animationDelay: idx * 80 + 'ms' }"
          role="button"
          :aria-label="t('home.activityCardAria', { title: item.title, time: item.scheduleText, location: item.location })"
          @tap="openAppPath('/subpackages/discover/activities/index')"
        >
          <view class="activity-card__info">
            <text class="activity-card__title">{{ item.title }}</text>
            <text class="activity-card__location">{{ item.location }}</text>
            <text class="activity-card__time">{{ item.scheduleText }}</text>
          </view>
          <text class="activity-card__arrow">&rsaquo;</text>
        </view>
      </view>
      <view class="activity-recommend__more press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('discover.viewMoreActivities')" @tap="openAppPath('/subpackages/discover/activities/index')">
        <text class="activity-recommend__more-text">{{ t('discover.viewMoreActivities') }}</text>
      </view>
    </view>

    <!-- 底部提示：当卡片即将用完时显示 -->
    <view v-if="hasMore && remainingCount <= 3 && remainingCount > 0" class="limit-hint">
      <text class="limit-hint__text">{{ t('discover.remainingChances', { n: remainingCount }) }}</text>
    </view>

    <!-- 匹配成功双头像碰撞动画 overlay -->
    <view v-if="showMatchAnimation" class="match-overlay">
      <view class="match-overlay__avatars">
        <image class="match-overlay__avatar match-overlay__avatar--left" :src="myAvatar" mode="aspectFill" lazy-load alt="" />
        <image class="match-overlay__avatar match-overlay__avatar--right" :src="partnerAvatar" mode="aspectFill" lazy-load alt="" />
        <view class="match-overlay__spark">
          <image class="match-overlay__spark-icon" :src="icons.heart" mode="aspectFit" alt="" />
        </view>
      </view>
      <text class="match-overlay__title">{{ t('discover.matchSuccessTitle') }}</text>
      <text class="match-overlay__subtitle">{{ t('discover.matchWithPartner', { name: partnerName }) }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.discover-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
  /* 浪漫粉绿渐变：粉→薄荷绿→中性灰三段过渡，对齐青藤参考 */
  background: var(--c-gradient-page-romance);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 120rpx;
}

/* ========== 浪漫氛围背景层（卡片轻微高斯模糊光斑） ========== */
.discover-atmosphere {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.discover-atmosphere__blob {
  position: absolute;
  border-radius: var(--r-circle, 50%);
  opacity: 0.55;
  /* H5 端追加高斯模糊营造柔光氛围；mp-weixin 不支持 filter，保留 opacity + 渐变 fallback */
  // #ifdef H5
  filter: blur(48rpx);
  // #endif
}

.discover-atmosphere__blob--pink {
  width: 360rpx;
  height: 360rpx;
  top: 80rpx;
  left: -120rpx;
  background: radial-gradient(circle, var(--s-romance) 0%, var(--c-romance-bg-tint) 70%);
}

.discover-atmosphere__blob--green {
  width: 420rpx;
  height: 420rpx;
  top: 320rpx;
  right: -140rpx;
  background: radial-gradient(circle, var(--c-brand-shadow-tint-mid) 0%, var(--c-brand-bg-tint) 70%);
}

/* ========== 页面头部 ========== */
.discover-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: var(--sp-5) var(--sp-7) var(--sp-4);
  padding-top: calc(constant(safe-area-inset-top) + var(--sp-5));
  padding-top: calc(env(safe-area-inset-top) + var(--sp-5));
  position: relative;
  z-index: 10;
}

.discover-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-gradient-brand-overlay);
  pointer-events: none;
}

.discover-header__title-area {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  position: relative;
  z-index: 1;
}

.discover-header__title {
  font-size: var(--fs-6xl);
  font-weight: 800;
  // #ifdef H5
  background: linear-gradient(135deg, var(--c-brand-500) 0%, var(--c-romance-500) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  // #endif
  // #ifndef H5
  color: var(--c-brand);
  // #endif
  letter-spacing: 2rpx;
  line-height: 1.2;
}

.discover-header__subtitle {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  font-weight: 400;
}

.discover-header__meta {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
}

.discover-header__count-chip {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--r-xl);
  background: var(--c-bg-brand);
  border: 1rpx solid var(--c-brand-border-tint);
}

.discover-header__count-icon {
  width: 28rpx;
  height: 28rpx;
}

.discover-header__count {
  font-size: var(--fs-md);
  font-weight: 700;
  // #ifdef H5
  background: linear-gradient(135deg, var(--c-brand-500) 0%, var(--c-romance-500) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  // #endif
  // #ifndef H5
  color: var(--c-brand-500);
  // #endif
}

/* ========== 筛选栏 ========== */
.filter-bar {
  padding: 0 var(--sp-7) var(--sp-4);
  position: relative;
  z-index: 9;
}

.filter-scroll {
  width: 100%;
}

.filter-list {
  display: flex;
  gap: var(--sp-3);
  white-space: nowrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 14rpx 28rpx;
  flex-shrink: 0;
  border-radius: var(--r-full);
  background: var(--c-overlay-white-text-strong);
  /* #ifdef H5 */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  /* #endif */
  /* #ifndef H5 */
  opacity: 0.96;
  /* #endif */
  border: 1rpx solid var(--c-neutral-200);
  box-shadow: var(--s-xs);
  transition: all var(--d-normal, 200ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* #ifdef H5 */
.filter-chip:active {
  transform: scale(0.96);
}
/* #endif */

.filter-chip--active {
  background: var(--c-gradient-brand);
  border-color: transparent;
  box-shadow: var(--s-brand);
}

/* "全部筛选" chip：使用品牌色描边突出"打开抽屉"语义 */
.filter-chip--all {
  background: var(--c-bg-brand);
  border-color: var(--c-brand-200);
}

.filter-chip--all .filter-chip__text {
  color: var(--c-brand-700);
  font-weight: 600;
}

.filter-chip--all .filter-chip__icon {
  /* 使用 brand-700 让 plus 图标在浅薄荷绿底上更清晰 */
  color: var(--c-brand-700);
}

/* 有已应用筛选时，"全部筛选" chip 高亮（暖色描边 + count badge） */
.filter-chip--has-active {
  background: var(--c-romance-50);
  border-color: var(--c-romance-300);
}

.filter-chip--has-active .filter-chip__text {
  color: var(--c-romance-700);
}

.filter-chip__count-badge {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 var(--sp-2);
  border-radius: var(--r-full);
  background: var(--c-romance-500);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: var(--sp-2);
}

.filter-chip__count-text {
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--c-text-inverse);
  line-height: 1;
}

.filter-chip__icon {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}

.filter-chip__text {
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--c-text-secondary);
}

.filter-chip--active .filter-chip__text {
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== 已应用筛选条件胶囊栏 ========== */
.active-capsules {
  padding: 0 var(--sp-7) var(--sp-3);
  position: relative;
  z-index: 8;
}

.active-capsules__scroll {
  width: 100%;
}

.active-capsules__list {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  white-space: nowrap;
}

.active-capsule {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: 6rpx var(--sp-3);
  border-radius: var(--r-full);
  background: var(--c-bg-brand);
  border: 1rpx solid var(--c-brand-200);
  flex-shrink: 0;
}

.active-capsule__text {
  font-size: var(--fs-sm);
  color: var(--c-brand-700);
  font-weight: 500;
  line-height: 1.4;
}

.active-capsule__close {
  font-size: var(--fs-xs);
  color: var(--c-brand-500);
  font-weight: 600;
  margin-left: var(--sp-1);
  line-height: 1;
}

/* "清空"胶囊：暖色风格区分 */
.active-capsule--clear {
  background: var(--c-bg-surface);
  border-color: var(--c-border-default);
}

.active-capsule--clear .active-capsule__text,
.active-capsule__text--clear {
  color: var(--c-text-secondary);
  font-weight: 500;
}

/* ========== 搜索框 ========== */
.search-box {
  display: flex;
  align-items: center;
  margin: var(--sp-4) var(--sp-7);
  padding: var(--sp-3) var(--sp-5);
  background: var(--c-overlay-white-text-strong);
  /* #ifdef H5 */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  /* #endif */
  /* #ifndef H5 */
  opacity: 0.96;
  /* #endif */
  border-radius: var(--r-xl);
  border: var(--border-subtle);
  box-shadow: var(--s-xs);

  .search-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: var(--sp-3);
    color: var(--c-text-tertiary);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    font-size: var(--fs-md);
    color: var(--c-text-primary);
  }

  .search-clear {
    font-size: var(--fs-md);
    color: var(--c-text-tertiary);
    padding: var(--sp-1) var(--sp-2);
  }
}

/* ========== 签到卡片 ========== */
.checkin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 var(--sp-7) var(--sp-4);
  padding: var(--sp-6);
  border-radius: var(--r-xl);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand-lg);
  border: none;
}

.checkin-card__left {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex: 1;
  min-width: 0;
}

.checkin-card__icon {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
}

.checkin-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.checkin-card__title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.checkin-card__desc {
  font-size: var(--fs-base);
  color: var(--c-overlay-text-secondary);
}

.checkin-card__btn {
  min-width: 160rpx;
  height: 64rpx;
  padding: 0 var(--sp-6);
  border: 0;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  color: var(--c-brand-500);
  font-size: var(--fs-md);
  font-weight: 700;
  line-height: 64rpx;
  text-align: center;
  flex-shrink: 0;
  transition: opacity var(--d-fast, 120ms) ease;
  box-shadow: 0 4rpx 12rpx var(--c-black-shadow-md);
}

/* #ifdef H5 */
.checkin-card__btn:active {
  opacity: 0.85;
}
/* #endif */

.checkin-card__btn:disabled {
  background: var(--c-bg-surface);
  color: var(--c-text-tertiary);
}

/* ========== 签到卡片骨架屏（loading 占位） ========== */
.checkin-card--skeleton {
  pointer-events: none;
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--c-black-shadow-sm) 25%,
    var(--c-black-shadow-md) 37%,
    var(--c-black-shadow-sm) 63%
  );
  background-size: 400% 100%;
  animation: skeleton-loading var(--d-loop, 1400ms) ease infinite;
  border-radius: var(--r-sm);
}

@keyframes skeleton-loading {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

.skeleton--icon {
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.skeleton--title {
  width: 140rpx;
  height: 28rpx;
  margin-bottom: var(--sp-2);
}

.skeleton--desc {
  width: 200rpx;
  height: 22rpx;
}

.skeleton--btn {
  width: 160rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
}

/* ========== 通用 fade 过渡（签到卡片、签到成功、权益卡片切换） ========== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--d-fade, 300ms) ease, transform var(--d-fade, 300ms) ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10rpx);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10rpx);
}

/* ========== list 过渡（活动列表 transition-group） ========== */
.list-enter-active,
.list-leave-active {
  transition: opacity var(--d-bounce, 400ms) ease, transform var(--d-bounce, 400ms) ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(20rpx);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(-30rpx);
}

.list-move {
  transition: transform var(--d-bounce, 400ms) ease;
}

/* ========== 签到成功提示（缩放+渐变动画） ========== */
.checkin-success {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin: 0 var(--sp-7) var(--sp-4);
  padding: var(--sp-6);
  border-radius: var(--r-lg);
  background: var(--c-success-bg-tint);
  border: 1rpx solid var(--c-success-border-tint);
  animation: checkin-success-pop var(--d-slower, 350ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes checkin-success-pop {
  0% {
    opacity: 0;
    transform: scale(0.85);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.checkin-success__icon {
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
  animation: checkin-success-bounce var(--d-slowest, 600ms) ease 0.1s both;
}

@keyframes checkin-success-bounce {
  0% {
    transform: scale(0);
  }
  60% {
    transform: scale(1.25);
  }
  100% {
    transform: scale(1);
  }
}

.checkin-success__info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.checkin-success__title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-success);
}

.checkin-success__count {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  font-weight: 600;
}

.checkin-success__streak {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* ========== 签到权益卡片区域 ========== */
.benefits-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: 0 var(--sp-7) var(--sp-4);
}

.benefit-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-5) var(--sp-6);
  border-radius: var(--r-lg);
  background: var(--c-bg-container);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  position: relative;
  overflow: hidden;
  transition: transform var(--d-fast, 150ms) ease;
}

.benefit-card--clickable {
  transition: transform var(--d-fast, 150ms) ease;
}

/* #ifdef H5 */
.benefit-card--clickable:active {
  transform: scale(0.98);
}
/* #endif */

.benefit-card--quota {
  background: var(--c-bg-brand);
  border: var(--c-border-card-brand);
}

.benefit-card--quota::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4rpx;
  background: var(--c-brand);
}

.benefit-card__left {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex: 1;
  min-width: 0;
  padding-left: var(--sp-2);
}

.benefit-card__icon {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.benefit-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.benefit-card__title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.benefit-card__desc {
  font-size: var(--fs-base);
  color: var(--c-brand-500);
  font-weight: 600;
}

.benefit-card__arrow {
  font-size: var(--fs-2xl);
  color: var(--c-text-tertiary);
  font-weight: 300;
  flex-shrink: 0;
}

/* ========== 每日一问入口卡片 ========== */
.daily-question-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 var(--sp-7) var(--sp-4);
  padding: var(--sp-6);
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--c-romance-50) 0%, var(--c-romance-50) 100%);
  box-shadow: 0 4rpx 16rpx var(--c-romance-bg-tint);
  border: 1rpx solid var(--c-romance-border-tint);
  transition: transform var(--d-fast, 150ms) ease;
}

/* #ifdef H5 */
.daily-question-card:active {
  transform: scale(0.98);
}
/* #endif */

.daily-question-card__left {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex: 1;
  min-width: 0;
}

.daily-question-card__icon {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
}

.daily-question-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.daily-question-card__title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-pink-500);
}

.daily-question-card__desc {
  font-size: var(--fs-base);
  color: var(--c-romance-600);
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.daily-question-card__streak {
  font-size: var(--fs-sm);
  color: var(--c-romance-500);
  font-weight: 500;
  margin-top: var(--sp-1);
}

.daily-question-card__arrow {
  font-size: var(--fs-3xl);
  color: var(--c-romance-500);
  opacity: 0.6;
  font-weight: 300;
  flex-shrink: 0;
}

/* ========== 卡片区域（沉浸式全屏） ========== */
.card-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* ========== 错误提示 ========== */
.error-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  margin: var(--sp-6) var(--sp-7);
  padding: var(--sp-5) var(--sp-6);
  background: var(--c-red-bg-tint);
  border-radius: var(--r-md);
}

.error-banner__text {
  font-size: var(--fs-md);
  color: var(--c-error);
}

.error-banner__retry {
  font-size: var(--fs-md);
  color: var(--c-brand-700);
  font-weight: 600;
}

/* ========== 加载状态 ========== */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
}

.loading-state__spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid var(--c-border-default);
  border-top-color: var(--c-brand-700);
  border-radius: var(--r-full);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

/* ========== 卡片骨架屏（替代简单 spinner，呼应卡片布局） ========== */
.card-skeleton-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: var(--sp-6) var(--sp-5);
}

.card-skeleton-hint {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-skeleton-hint__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  letter-spacing: 1rpx;
}

/* ========== 推荐卡片空状态 ========== */
.card-empty-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-8) var(--sp-5);
}

.card-empty__action {
  margin-top: var(--sp-5);
  padding: var(--sp-3) var(--sp-6);
  border-radius: var(--r-full);
  background: var(--c-brand);
}

.card-empty__action-text {
  font-size: var(--fs-md);
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== 社交升温提示 ========== */
.social-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: var(--sp-4) var(--sp-7);
  padding: var(--sp-5) var(--sp-6);
  background: linear-gradient(135deg, var(--c-romance-bg-tint) 0%, var(--c-brand-bg-tint) 100%);
  border-radius: var(--r-lg);
  border: 1rpx solid var(--c-romance-border-tint);
}

.social-hint__left {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex: 1;
  min-width: 0;
}

.social-hint__icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.social-hint__text {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  line-height: 1.4;
}

.social-hint__arrow {
  font-size: var(--fs-xl);
  color: var(--c-romance-500);
  flex-shrink: 0;
}

/* ========== 活动推荐板块 ========== */
.activity-recommend {
  margin: var(--sp-6) var(--sp-7);
  padding: var(--sp-7);
  background-color: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.activity-recommend__header {
  margin-bottom: var(--sp-6);
}

.activity-recommend__title {
  display: block;
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
  margin-bottom: var(--sp-2);
}

.activity-recommend__subtitle {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.activity-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-5) 0;
  border-bottom: 1rpx solid var(--c-border-light);

  &:last-child {
    border-bottom: none;
  }

  /* #ifdef H5 */
  &:active {
    transform: scale(0.98);
    transition: transform var(--d-fast, 120ms) ease;
  }
  /* #endif */
}

.activity-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  flex: 1;
}

.activity-card__title {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.activity-card__location,
.activity-card__time {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.activity-card__arrow {
  font-size: var(--fs-3xl);
  color: var(--c-text-tertiary);
  margin-left: var(--sp-4);
  font-weight: 300;
}

.activity-recommend__more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-5) 0 var(--sp-2);
}

.activity-recommend__more-text {
  font-size: var(--fs-md);
  color: var(--c-brand);
  font-weight: 600;
}

/* ========== 次数提示 ========== */
.limit-hint {
  position: absolute;
  bottom: 200rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--sp-3) var(--sp-6);
  background: var(--c-gradient-mask-strong);
  border-radius: var(--r-full);
  z-index: 10;
}

.limit-hint__text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
}

/* ========== 匹配成功双头像碰撞动画 ========== */
.match-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-overlay-stronger);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-8);
  z-index: 9999;
  animation: match-overlay-fade var(--d-fade, 300ms) ease both;
}

@keyframes match-overlay-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.match-overlay__avatars {
  position: relative;
  width: 480rpx;
  height: 240rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.match-overlay__avatar {
  position: absolute;
  top: 50%;
  width: 200rpx;
  height: 200rpx;
  border-radius: var(--r-full);
  border: 6rpx solid var(--c-bg-container);
  box-shadow: 0 8rpx 32rpx var(--c-text-shadow-overlay);
  transform: translateY(-50%);
}

.match-overlay__avatar--left {
  left: 0;
  animation: match-avatar-left var(--d-loop, 1200ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.match-overlay__avatar--right {
  right: 0;
  animation: match-avatar-right var(--d-loop, 1200ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes match-avatar-left {
  0% {
    transform: translateY(-50%) translateX(-300rpx) scale(0.5);
    opacity: 0;
  }
  50% {
    transform: translateY(-50%) translateX(60rpx) scale(1.1);
    opacity: 1;
  }
  70% {
    transform: translateY(-50%) translateX(40rpx) scale(0.95);
  }
  100% {
    transform: translateY(-50%) translateX(50rpx) scale(1);
    opacity: 1;
  }
}

@keyframes match-avatar-right {
  0% {
    transform: translateY(-50%) translateX(300rpx) scale(0.5);
    opacity: 0;
  }
  50% {
    transform: translateY(-50%) translateX(-60rpx) scale(1.1);
    opacity: 1;
  }
  70% {
    transform: translateY(-50%) translateX(-40rpx) scale(0.95);
  }
  100% {
    transform: translateY(-50%) translateX(-50rpx) scale(1);
    opacity: 1;
  }
}

.match-overlay__spark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  z-index: 2;
  animation: match-spark var(--d-loop, 1200ms) ease 0.5s both;
}

@keyframes match-spark {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(0deg);
    opacity: 0;
  }
  40% {
    transform: translate(-50%, -50%) scale(1.5) rotate(15deg);
    opacity: 1;
  }
  70% {
    transform: translate(-50%, -50%) scale(1.2) rotate(-10deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 1;
  }
}

.match-overlay__spark-icon {
  width: 80rpx;
  height: 80rpx;
  color: var(--c-romance-500);
}

.match-overlay__title {
  font-size: var(--fs-6xl);
  font-weight: 800;
  color: var(--c-text-inverse);
  text-shadow: 0 4rpx 16rpx var(--c-shadow-romance-tint-stronger);
  animation: match-text-pop var(--d-slowest, 600ms) cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s both;
}

.match-overlay__subtitle {
  font-size: var(--fs-lg);
  color: var(--c-overlay-bg-solid);
  animation: match-text-pop var(--d-slowest, 600ms) cubic-bezier(0.34, 1.56, 0.64, 1) 0.9s both;
}

@keyframes match-text-pop {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>