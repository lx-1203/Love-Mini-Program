<script setup lang="ts">
/**
 * 寻觅页 - 卡片推荐 + 签到入口
 * 展示个性化用户卡片推荐，支持滑动浏览和每日签到
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useDiscoverStore, type SwipeDirection, type MatchScope, type SortBy } from "../../stores/discover";
import { useCheckInStore } from "../../stores/checkin";
import { useDailyQuestionStore } from "../../stores/daily-question";
// P2.7 修复：预注册懒加载组件引用的 store。
// 本页组件链（CardSwiper→CardDetailOverlay）在页面 script 之后加载并 require
// stores/vip，而 mp-weixin dev 模式按文件懒加载执行——若 vip 模块未被页面
// script 依赖树先执行注册，组件加载时报 "module 'stores/vip.js' is not defined"。
import { useVipStore } from "../../stores/vip";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import { useTabBar } from "../../composables/useTabBar";
import CardSwiper from "../../components/discover/CardSwiper.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import HeartParticles from "../../components/common/HeartParticles.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
// 2026-08-07 设计稿：顶部筛选标签行接线（组件已备好，此前仅挂 Storybook）
import QuickFilterSheet from "../../components/discover/QuickFilterSheet.vue";
import FilterDrawer from "../../components/discover/FilterDrawer.vue";
// Task F：全局发帖悬浮按钮组件
import GlobalPublishFab from "../../components/common/GlobalPublishFab.vue";
import { IMAGE_PATHS } from "../../config/images";
import { lightHaptic } from "../../utils/haptic";
import { showErrorToast } from "../../utils/error-toast";
// Sentry 监控：推荐加载 / 滑动失败上报异常，页面切换记录面包屑
import { captureException, addBreadcrumb } from "../../services/sentry";

/** 图标资源路径（仅保留本页模板实际引用的图标） */
const icons = {
  heartSignal: IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL,
  // Emoji 替换 SVG 图标
  search: IMAGE_PATHS.ICONS_EMOJI.SEARCH,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
} as const;

const sessionStore = useSessionStore();
const discoverStore = useDiscoverStore();
const { t } = useI18n();

// 同步自定义 TabBar 选中状态（tab 顺序：首页0/匹配1/圈子2/消息3/我的4）
useTabBar(1);
const {
  cards,
  remainingCount,
  loading,
  errorMessage,
} = storeToRefs(discoverStore);

const checkInStore = useCheckInStore();
const dailyQuestionStore = useDailyQuestionStore();

/** Task F：全局发帖 FAB publish 事件 → 发帖编辑页 */
function goToPublishTopic() {
  openAppPath('/pages/circles/post-topic');
}

/** D1 修复：未登录空状态「去登录」→ 登录页 */
function goLogin() {
  openAppPath('/pages/login/index');
}

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

/* ========== 筛选区交互（2026-08-07 设计稿：顶部筛选标签行 + 快捷筛选 + 高级筛选抽屉） ========== */

/** 快捷筛选弹窗（范围/年龄/排序）显隐 */
const quickFilterVisible = ref(false);

/** 快捷筛选确认回调：一次性应用范围+年龄+排序并刷新卡片 */
function onQuickFilterApply(payload: {
  matchScope: MatchScope;
  sortBy: SortBy;
  ageMin: number;
  ageMax: number;
}): void {
  discoverStore.applyQuickFilter(payload);
  lightHaptic();
}

/** 附近 chip：切换附近范围（P2-04：合并为一次请求，避免重复 fetchCards） */
function onNearbyChip(): void {
  discoverStore.setNearbyScope();
  lightHaptic();
}

/** 当前生效的匹配范围（用于 chip 文案与高亮） */
const activeMatchScope = computed(() => discoverStore.matchScope);

/** 当前生效的排序规则 */
const activeSortBy = computed(() => discoverStore.sortBy);

/** 当前生效的年龄区间（缺省 18-35） */
const activeAgeMin = computed(() => discoverStore.recommendationFilter.ageMin ?? 18);
const activeAgeMax = computed(() => discoverStore.recommendationFilter.ageMax ?? 35);

/** 范围 chip 文案（不限/附近；同城/同校为后续枚举扩展，见 MatchScope 注释） */
const scopeChipLabel = computed(() =>
  activeMatchScope.value === "nearby" ? t("discover.nearby") : t("discover.unlimited"),
);

/** 年龄 chip 文案（如 "18-35岁"） */
const ageChipLabel = computed(() => `${activeAgeMin.value}-${activeAgeMax.value}${t("discover.ageUnit")}`);

/** 排序 chip 文案（匹配度优先/最新注册/最活跃） */
const sortChipLabel = computed(() => {
  if (activeSortBy.value === "latest") return t("discover.sortLatest");
  if (activeSortBy.value === "active") return t("discover.sortActive");
  return t("discover.matchPriority");
});

/** 高级筛选是否已应用（用于「全部筛选」chip 高亮 + 计数角标） */
const hasAdvancedFilter = computed(() => {
  const f = discoverStore.recommendationFilter;
  return Boolean(
    f.heightMin ||
      f.heightMax ||
      f.educationLevel?.length ||
      f.relationshipStatus?.length ||
      f.hometownProvince ||
      f.hometownCity ||
      f.futureCity ||
      f.keyword ||
      f.gender ||
      f.schools?.length ||
      f.interests?.length ||
      f.onlineOnly
  );
});

/* ========== 搜索框交互（2026-08-07 设计稿：顶部常驻通栏搜索框） ========== */

/** 搜索关键字（双向绑定到 input） */
const searchKeyword = ref("");

/**
 * 搜索输入框聚焦状态（双向控制）。
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

/** 搜索框失焦：仅重置聚焦状态 */
function onSearchBlur() {
  searchInputFocused.value = false;
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
 * 清空后自动 refocus 输入框，便于用户连续输入新关键词
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

/**
 * 跳转商城页（Task D：签到积分入口 / 积分兑换提示）。
 * 使用 catchtap 绑定（避免冒泡），点击前触发轻振动反馈。
 */
function goShop() {
  try {
    lightHaptic();
  } catch (_e) {
    // 振动反馈失败时静默降级
  }
  openAppPath("/pages/shop/index");
}

onMounted(() => {
  // P2.7：预注册懒加载组件引用的 store。
  // 组件链（CardDetailOverlay）会 require stores/vip，mp-weixin dev 按文件懒加载，
  // 模块未被页面依赖树执行注册则报 "module 'stores/vip.js' is not defined"。
  // 真实调用（读取 isVip）确保 import 不被 tree-shake（void 引用会被摇掉）。
  const vipStore = useVipStore();
  void vipStore.isVip;
  // 记录页面进入面包屑，便于在异常发生时回溯用户跳转路径
  addBreadcrumb("navigation", "page_enter", { url: "/pages/discover/index" });
  // D1 修复：未登录时禁止发鉴权请求（否则冷启动 → 401 洪水）。
  // 已登录直接拉取；登录态变化后（如从登录页返回）自动补发。
  if (sessionStore.isLoggedIn) {
    loadDiscoverData();
  }
});

// D1 修复：登录成功后补发发现页数据（解决「登录回来数据不加载」）
watch(
  () => sessionStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      loadDiscoverData();
    }
  }
);

/**
 * P1-06：每日限额跨天重置。
 *
 * onShow 时调用 store 的 resetDailyLimit：其内部对比本地存储的日期与当前日期，
 * 跨天时才清空 viewedCards / hasRewoundToday 等状态（同日调用为空操作）。
 * 跨天重置会更新 lastRefreshTime，据此判断是否需要补拉卡片。
 */
onShow(() => {
  const lastRefreshBefore = discoverStore.lastRefreshTime;
  discoverStore.resetDailyLimit();
  if (
    discoverStore.lastRefreshTime !== lastRefreshBefore &&
    sessionStore.isLoggedIn
  ) {
    loadDiscoverData();
  }
});

/** D1 修复：集中发现页三个数据请求，登录态守卫下统一调用 */
function loadDiscoverData() {
  void discoverStore.fetchCards();
  void checkInStore.fetchStatus();
  void dailyQuestionStore.fetchTodayQuestion();
}

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
  <!-- 寻觅/匹配页：浅青绿色背景，纵向排布，核心匹配卡片区占据主视觉 -->
  <view class="discover-page page-bottom-safe page-fade-in">
    <!-- 标题行（2026-08-07 设计稿）：左「寻觅 发现心动的人」，右「今日剩余 X 次」 -->
    <view class="discover-header">
      <view class="discover-header__titles">
        <text class="discover-header__title">{{ t('discover.title') }}</text>
        <text class="discover-header__subtitle">{{ t('discover.subtitle') }}</text>
      </view>
      <text class="discover-header__count">{{ t('discover.remainingToday', { n: remainingCount }) }}</text>
    </view>

    <!-- 筛选标签行（2026-08-07 设计稿）：附近[定位] / 范围 / 年龄 / 排序 + 全部筛选 -->
    <view class="filter-bar">
      <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
        <view class="filter-list">
          <!-- 附近（定位）：点击切换附近范围 -->
          <view
            class="filter-chip"
            :class="{ 'filter-chip--active': activeMatchScope === 'nearby' }"
            role="button"
            :aria-label="t('discover.filterNearby')"
            @tap="onNearbyChip"
          >
            <image class="filter-chip__icon" :src="icons.location" mode="aspectFit" alt="" />
            <text class="filter-chip__text">{{ t('discover.filterNearby') }}</text>
          </view>
          <!-- 范围：打开快捷筛选 -->
          <view
            class="filter-chip filter-chip--quick"
            role="button"
            :aria-label="t('discover.scopeTitle')"
            @tap="quickFilterVisible = true"
          >
            <text class="filter-chip__text filter-chip__text--summary">{{ scopeChipLabel }}</text>
            <text class="filter-chip__chevron">▾</text>
          </view>
          <!-- 年龄：打开快捷筛选 -->
          <view
            class="filter-chip filter-chip--quick"
            role="button"
            :aria-label="t('discover.ageRangeTitle')"
            @tap="quickFilterVisible = true"
          >
            <text class="filter-chip__text filter-chip__text--summary">{{ ageChipLabel }}</text>
            <text class="filter-chip__chevron">▾</text>
          </view>
          <!-- 排序：打开快捷筛选 -->
          <view
            class="filter-chip filter-chip--quick"
            role="button"
            :aria-label="t('discover.sortTitle')"
            @tap="quickFilterVisible = true"
          >
            <text class="filter-chip__text filter-chip__text--summary">{{ sortChipLabel }}</text>
            <text class="filter-chip__chevron">▾</text>
          </view>
          <!-- 全部筛选：打开高级筛选抽屉（有已应用筛选时暖色高亮 + 计数角标） -->
          <view
            class="filter-chip filter-chip--all"
            :class="{ 'filter-chip--has-active': hasAdvancedFilter }"
            role="button"
            :aria-label="t('discover.allFilters')"
            @tap="discoverStore.openFilterDrawer()"
          >
            <text class="filter-chip__text">{{ t('discover.allFilters') }}</text>
            <view v-if="hasAdvancedFilter" class="filter-chip__count-badge">
              <text class="filter-chip__count-text">•</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 顶部搜索栏：状态栏下方通栏排布，白色圆角矩形，左侧放大镜图标 -->
    <view
      class="search-box"
      role="search"
      :aria-label="t('discover.searchPlaceholder')"
      @tap="focusSearchInput"
    >
      <image class="search-icon" :src="icons.search" mode="aspectFit" alt="" />
      <input
        class="search-input"
        :placeholder="t('discover.searchPlaceholder')"
        v-model="searchKeyword"
        :focus="searchInputFocused"
        @input="onSearchInput"
        @blur="onSearchBlur"
        :aria-label="t('discover.searchPlaceholder')"
      />
      <image
        v-if="searchKeyword"
        class="search-clear-img"
        :src="IMAGE_PATHS.ICONS_COMMON.CLOSE"
        mode="aspectFit"
        catchtap="clearSearch"
        alt=""
      />
    </view>

    <!-- 运营功能卡片组：搜索栏下方左右并排两张等高圆角卡片 -->
    <!-- 加载态：双卡骨架屏占位 -->
    <view v-if="checkInStore.loading" class="top-cards">
      <view class="top-card top-card--points top-card--skeleton">
        <view class="top-card__side top-card__side--gold" />
        <view class="top-card__body">
          <view class="skeleton skeleton--title" />
          <view class="skeleton skeleton--desc" />
        </view>
      </view>
      <view class="top-card top-card--checkin top-card--skeleton">
        <view class="top-card__side top-card__side--green" />
        <view class="top-card__body">
          <view class="skeleton skeleton--title" />
          <view class="skeleton skeleton--desc" />
        </view>
      </view>
    </view>

    <!-- 已加载：积分卡 + 签到卡 -->
    <view v-else class="top-cards">
      <!-- 左侧积分卡：浅黄底 + 黄色装饰竖边，点击跳转积分商城 -->
      <view
        class="top-card top-card--points press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('discover.myPointsAria', { n: checkInStore.pointsBalance })"
        @tap="goShop"
      >
        <view class="top-card__side top-card__side--gold" />
        <view class="top-card__body">
          <text class="top-card__title">{{ t('discover.myPoints', { n: checkInStore.pointsBalance }) }}</text>
          <text class="top-card__desc top-card__desc--gold">{{ t('discover.pointsHint') }}</text>
        </view>
        <text class="top-card__arrow">&rsaquo;</text>
      </view>

      <!-- 右侧签到卡：浅绿底 + 绿色装饰竖边；未签到=立即签到，已签到=已签到+连续天数 -->
      <view
        class="top-card top-card--checkin press-feedback"
        :class="{ 'top-card--done': checkInStore.checkedIn }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="checkInStore.checkedIn ? t('discover.alreadyCheckedIn') : t('discover.todayCheckin')"
        @tap="handleCheckIn"
      >
        <view class="top-card__side top-card__side--green" />
        <view class="top-card__body">
          <text class="top-card__title">
            {{ checkInStore.checkedIn ? t('discover.alreadyCheckedIn') : t('discover.todayCheckin') }}
          </text>
          <text class="top-card__desc top-card__desc--green">
            {{ checkInStore.checkedIn ? (checkInStore.consecutiveDaysText || t('discover.tomorrowContinue')) : t('discover.getMoreRecommend') }}
          </text>
        </view>
      </view>
    </view>

    <!-- 签到成功提示（CSS 动画淡入）+ 心形粒子撒花动画覆盖层 -->
    <view v-if="checkInStore.showSuccessAnimation" class="checkin-success animate-fade">
      <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.CHECK" custom-class="checkin-success__icon" mode="aspectFit" />
      <view class="checkin-success__info">
        <text class="checkin-success__title">{{ t('discover.checkinSuccess') }}</text>
        <text class="checkin-success__count">{{ t('discover.checkinPointsEarned', { n: checkInStore.pointsEarned }) }}</text>
        <text v-if="checkInStore.consecutiveDaysText" class="checkin-success__streak">
          {{ checkInStore.consecutiveDaysText }}
        </text>
      </view>
      <!-- 心形粒子撒花动画：1.5s 后由 done 事件触发 onParticlesDone -->
      <HeartParticles :visible="showParticles" @done="onParticlesDone" />
    </view>

    <!-- 每日一问轻量入口：通栏浅粉色圆角卡片，点击进入话题详情页 -->
    <view
      v-if="!checkInStore.showSuccessAnimation"
      class="daily-question-card card-base press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      role="button"
      :aria-label="t('discover.dailyQuestion')"
      @tap="openAppPath('/pages/daily-question/index')"
    >
      <view class="daily-question-card__left">
        <SafeImage :src="icons.heartSignal" custom-class="daily-question-card__icon" mode="aspectFit" />
        <view class="daily-question-card__info">
          <text class="daily-question-card__title">{{ t('discover.dailyQuestion') }}</text>
          <text class="daily-question-card__desc">{{ dailyQuestionStore.todayQuestion?.question ?? t('discover.todayQuestion') }}</text>
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

    <!-- 空状态：未登录时引导登录（D1 修复）；已登录无可推荐卡片时引导刷新 -->
    <view v-else-if="cards.length === 0" class="card-empty-wrap">
      <EmptyState
        type="no-data"
        :message="sessionStore.isLoggedIn ? t('discover.card.emptyTitle') : t('discover.card.loginTitle')"
      >
        <view
          v-if="!sessionStore.isLoggedIn"
          class="card-empty__action press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="goLogin"
        >
          <text class="card-empty__action-text">{{ t('discover.card.goLogin') }}</text>
        </view>
        <view
          v-else
          class="card-empty__action press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="reloadCards"
        >
          <text class="card-empty__action-text">{{ t('discover.card.refresh') }}</text>
        </view>
      </EmptyState>
    </view>

    <!-- 核心匹配卡片区（页面主体核心）：占据页面中间 60%-70% 纵向空间 -->
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

    <!-- 悬浮发布按钮：页面右下角，悬浮在所有内容之上 -->
    <GlobalPublishFab @publish="goToPublishTopic" />

    <!-- 快捷筛选底部弹窗（范围/年龄/排序） -->
    <QuickFilterSheet
      v-model:visible="quickFilterVisible"
      :match-scope="activeMatchScope"
      :sort-by="activeSortBy"
      :age-min="activeAgeMin"
      :age-max="activeAgeMax"
      @apply="onQuickFilterApply"
    />

    <!-- 高级筛选抽屉（身高/学历/感情状态/籍贯/关键词 + 性别/年龄/学校/距离/兴趣/在线状态） -->
    <FilterDrawer
      v-model:visible="discoverStore.isFilterDrawerOpen"
      :filter="discoverStore.recommendationFilter"
      @apply="discoverStore.setRecommendationFilter"
      @reset="discoverStore.resetFilter"
    />
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
  /* 2026-08-07 设计稿：页面背景统一为浅青绿色（实色，非渐变） */
  background: var(--c-bg-brand);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 顶部状态栏安全距离 + 底部底导航留白（含 FAB 与底导航高度） */
  padding-top: env(safe-area-inset-top);
  padding-bottom: 180rpx;
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
  gap: var(--sp-3);
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

:deep(.discover-header__count-icon) {
  width: 28rpx;
  height: 28rpx;
}

/* 任务 E4：设置入口（齿轮按钮） */
.discover-header__settings {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-border-light);
}

:deep(.discover-header__settings-icon) {
  width: 28rpx;
  height: 28rpx;
  color: var(--c-text-secondary);
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

/* ========== 标题行（2026-08-07 设计稿：寻觅 + 发现心动的人 + 今日剩余次数） ========== */
.discover-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-8) var(--sp-3);
}

.discover-header__titles {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.discover-header__title {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1.2;
}

.discover-header__subtitle {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

.discover-header__count {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  padding-bottom: 6rpx;
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

/* 快速筛选 chip（设计需求：左侧筛选下拉按钮，展示当前生效的筛选摘要） */
.filter-chip--quick {
  max-width: 420rpx;
}

.filter-chip__text--summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260rpx;
}

.filter-chip__chevron {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
  opacity: 0.7;
}

.filter-chip--active .filter-chip__chevron {
  filter: brightness(0) invert(1);
}

/* 搜索图标按钮（设计需求：收起态为图标，点击展开搜索框） */
.search-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  margin: 0 var(--sp-7) var(--sp-3) auto;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-neutral-200);
  box-shadow: var(--s-xs);
}

.search-toggle__icon {
  width: 36rpx;
  height: 36rpx;
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

/* ========== 搜索框（2026-08-07 设计稿：顶部通栏，状态栏下方） ========== */
.search-box {
  display: flex;
  align-items: center;
  /* 通栏排布：左右留 20rpx 边距，顶部紧贴状态栏下方 */
  margin: var(--sp-3) var(--sp-5) 0;
  padding: var(--sp-3) var(--sp-5);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  border: 1rpx solid var(--c-border-light);
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

  /* 清空按钮图标（替换原 search-clear 文字版本） */
  .search-clear-img {
    width: 32rpx;
    height: 32rpx;
    margin-left: var(--sp-2);
    flex-shrink: 0;
  }
}

/* ========== 2026-08-07 精简：签到权益轻量横条 ========== */
.benefits-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin: 0 var(--sp-5) var(--sp-3);
}

.benefit-pill {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx var(--sp-3);
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
}

.benefit-pill__icon {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}

.benefit-pill__text {
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
  font-weight: 500;
}

/* ========== 2026-08-07 设计稿落地：顶部运营双卡（积分 + 签到，并排固定） ========== */
.top-cards {
  display: flex;
  gap: var(--sp-3);
  margin: 0 var(--sp-5) var(--sp-3);
}

.top-card {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--r-lg);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.top-card--points {
  background: #fffbe9;
}

.top-card--checkin {
  background: #eefaf3;
}

.top-card__side {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
}

.top-card__side--gold {
  background: linear-gradient(180deg, #f0c96a 0%, #d4af37 100%);
}

.top-card__side--green {
  background: linear-gradient(180deg, var(--c-brand-400) 0%, var(--c-brand-600) 100%);
}

.top-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding-left: var(--sp-2);
}

.top-card__title {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-card__desc {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-card__desc--gold {
  color: #b8860b;
}

.top-card__desc--green {
  color: var(--c-brand-600);
}

.top-card__arrow {
  font-size: var(--fs-xl);
  color: var(--c-text-tertiary);
  line-height: 1;
  flex-shrink: 0;
}

/* ========== 签到卡片（紧凑横条：高度 ≤ 96rpx，减少垂直占用让位卡片区） ========== */
.checkin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 var(--sp-7) var(--sp-3);
  /* 紧凑横条：padding 收缩保证整体高度 ≤ 96rpx */
  padding: 12rpx 24rpx;
  border-radius: var(--r-xl);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand-lg);
  border: none;
  flex-shrink: 0;
}

.checkin-card__left {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex: 1;
  min-width: 0;
}

:deep(.checkin-card__icon) {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.checkin-card__info {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.checkin-card__title {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text-inverse);
  flex-shrink: 0;
  line-height: 1.2;
}

.checkin-card__desc {
  font-size: var(--fs-xs);
  color: var(--c-overlay-text-secondary);
  line-height: 1.2;
  /* 单行文案：超长省略，避免换行挤压 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.checkin-card__btn {
  min-width: 132rpx;
  height: 56rpx;
  padding: 0 var(--sp-4);
  border: 0;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  color: var(--c-brand-500);
  font-size: var(--fs-sm);
  font-weight: 700;
  line-height: 56rpx;
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
  width: 36rpx;
  height: 36rpx;
  border-radius: var(--r-full);
  flex-shrink: 0;
}

.skeleton--title {
  width: 120rpx;
  height: 24rpx;
  margin-bottom: var(--sp-2);
}

.skeleton--desc {
  width: 160rpx;
  height: 20rpx;
}

.skeleton--btn {
  width: 132rpx;
  height: 56rpx;
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

:deep(.checkin-success__icon) {
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

/* ========== 签到成功卡片下方：积分兑换提示条（Task D） ========== */
.checkin-points-hint {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0 var(--sp-7) var(--sp-4);
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-gold-bg-tint, rgba(251, 217, 141, 0.35)) 0%, var(--c-vip-border-light, rgba(201, 163, 106, 0.3)) 100%);
  border: 1rpx solid var(--c-vip-border-tint, rgba(201, 163, 106, 0.35));
  transition: transform var(--d-fast, 150ms) ease;
}

/* #ifdef H5 */
.checkin-points-hint:active {
  transform: scale(0.98);
}
/* #endif */

.checkin-points-hint__icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  color: var(--c-gold, #d4af37);
}

.checkin-points-hint__text {
  flex: 1;
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-text-primary);
  line-height: 1.4;
}

.checkin-points-hint__arrow {
  font-size: var(--fs-2xl);
  color: var(--c-gold, #d4af37);
  font-weight: 300;
  flex-shrink: 0;
}

/* ========== 签到权益卡片区域 ========== */
.benefits-section {
  margin: 0 var(--sp-7) var(--sp-4);
}

/* 收尾轮：权益卡横向单行滚动，紧凑入口（高度 ≤ 150rpx），释放卡片区垂直空间 */
.benefits-scroll {
  width: 100%;
  white-space: nowrap;
}

.benefits-row {
  display: flex;
  flex-direction: row;
  gap: var(--sp-3);
  padding-bottom: 8rpx;
}

.benefit-card {
  display: flex;
  flex: 0 0 auto;
  width: 430rpx;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5);
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

/* Task D：我的积分入口卡片（金色渐变区分） */
.benefit-card--points {
  background: linear-gradient(135deg, var(--c-gold-bg-tint, rgba(251, 217, 141, 0.4)) 0%, var(--c-vip-border-light, rgba(201, 163, 106, 0.25)) 100%);
  border: 1rpx solid var(--c-vip-border-tint, rgba(201, 163, 106, 0.35));
}

.benefit-card--points::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4rpx;
  background: var(--c-gold, #d4af37);
}

.benefit-card--points .benefit-card__title {
  color: var(--c-text-primary);
}

.benefit-card--points .benefit-card__desc {
  color: var(--c-gold, #d4af37);
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

:deep(.benefit-card__icon) {
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

/* 2026-08-07 修复：已签到卡右侧对勾图标无尺寸约束，
   按 SVG 原始像素渲染成大图覆盖文字（截图"大号环形对勾图标遮挡"），
   统一为 32rpx 小图标并与左侧信息垂直居中对齐 */
.benefit-card__arrow-img {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
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
  /* 2026-08-07 设计稿：核心匹配卡片区占据页面中间 60%-70% 纵向空间 */
  // #ifdef H5
  min-height: 65vh;
  // #endif
  // #ifndef H5
  /* mp-weixin 不支持 100vh，用 rpx 兜底。
     普通手机可视区约 1300-1624rpx，65% ≈ 850-1050rpx；
     设为 1050rpx 保证卡片区稳定占据主视觉空间 */
  min-height: 1050rpx;
  // #endif
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
  /* 2026-08-07 修复：加载期撑满剩余高度（mp-weixin 端 flex:1 在内容少时可能塌缩，
     导致页面下半部分大面积空白、视觉上"头重脚轻"） */
  min-height: 60vh;
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