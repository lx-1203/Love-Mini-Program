<script setup lang="ts">
/**
 * 寻觅页 - 卡片推荐 + 签到入口
 * 展示个性化用户卡片推荐，支持滑动浏览和每日签到
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { onShow, onLoad } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useDiscoverStore, type SwipeDirection, type MatchScope, type SortBy } from "../../stores/discover";
import { useCheckInStore } from "../../stores/checkin";
// P2.7 修复：预注册懒加载组件引用的 store。
// 本页组件链（CardSwiper→CardDetailOverlay）在页面 script 之后加载并 require
// stores/vip，而 mp-weixin dev 模式按文件懒加载执行——若 vip 模块未被页面
// script 依赖树先执行注册，组件加载时报 "module 'stores/vip.js' is not defined"。
import { useVipStore } from "../../stores/vip";
import { useSessionStore } from "../../stores/session";
// R4-00009：匹配动画需要当前用户真实头像（UserSession 无 avatarUrl，改从 profileStore 读取）
import { useProfileStore } from "../../stores/profile";
import { resolveMediaUrl } from "../../utils/media";
import { openAppPath } from "../../utils/navigation";
import { useTabBar } from "../../composables/useTabBar";
// 2026-08-08 重构：小程序右上角胶囊安全距离（顶部标题/筛选栏不被遮挡）
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import CardSwiper from "../../components/discover/CardSwiper.vue";
import CheckinPopup from "../../components/discover/CheckinPopup.vue";
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
  checkin: IMAGE_PATHS.ICONS_SOCIAL.CHECKIN,
  // Emoji 替换 SVG 图标
  search: IMAGE_PATHS.ICONS_EMOJI.SEARCH,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
} as const;

const sessionStore = useSessionStore();
const discoverStore = useDiscoverStore();
const profileStore = useProfileStore();
const { t } = useI18n();

// 同步自定义 TabBar 选中状态（tab 顺序：首页0/匹配1/圈子2/消息3/我的4）
useTabBar(1);

// 小程序右上角胶囊安全距离（H5 恒为 0，样式自动回退设计原值）
// 注意：解构出顶层 ref 以便模板自动解包（嵌套在对象内的 ComputedRef 不会解包）
const { styleVars: menuStyleVars } = useMenuButtonRect();
const {
  cards,
  remainingCount,
  loading,
  errorMessage,
} = storeToRefs(discoverStore);

const checkInStore = useCheckInStore();

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

/** 签到弹窗显隐（2026-08-08 重构：积分/签到收敛为搜索栏右侧入口，弹窗内完成签到） */
const checkinVisible = ref(false);

/**
 * 触发匹配成功跳转（带防重复保护 + 双头像碰撞动画）
 * @param partner - 匹配对方信息（昵称 + 头像）
 */
function triggerMatchNavigation(partner?: { name?: string; avatar?: string }) {
  if (isMatchNavigating) return;
  isMatchNavigating = true;

  // 设置动画数据（R4-00009：头像改用真实数据——对方取卡片头像，本人从 profileStore 读取）
  partnerName.value = partner?.name ?? t("discover.partnerDefaultName");
  partnerAvatar.value = partner?.avatar ? resolveMediaUrl(partner.avatar) : IMAGE_PATHS.AVATARS.AVATAR_1;
  myAvatar.value = profileStore.avatarUrl
    ? resolveMediaUrl(profileStore.avatarUrl)
    : IMAGE_PATHS.AVATARS.AVATAR_2;
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

/* ========== [AUTOSHOT] 仅测试钩子：automator 走查驱动弹窗/详情打开 ==========
 * 用法：reLaunch 到 /pages/discover/index?shot=detail&anchor=panel-quick 等。
 * 正常用户路径不带 shot 参数，以下逻辑零影响。 */

/** [AUTOSHOT] 是否自动打开详情弹层 */
const autoOpenDetail = ref(false);
/** [AUTOSHOT] 详情弹层滚动目标面板 id */
const detailAnchor = ref("");

onLoad((options) => {
  const shot = options?.shot;
  if (!shot) return;
  if (shot === "detail") {
    autoOpenDetail.value = true;
    detailAnchor.value = options?.anchor ?? "";
  } else if (shot === "checkin") {
    // 等页面数据就绪后打开签到弹窗（AUTOSHOT：弹窗内状态由 CheckinPopup 自加载）
    setTimeout(() => {
      checkinVisible.value = true;
    }, 1200);
  } else if (shot === "filter") {
    setTimeout(() => {
      quickFilterVisible.value = true;
    }, 1200);
  }
});

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

/** D1 修复：集中发现页数据请求，登录态守卫下统一调用 */
function loadDiscoverData() {
  void discoverStore.fetchCards();
  void checkInStore.fetchStatus();
  // R4-00009：预加载个人资料，保证匹配成功动画能展示用户真实头像
  void profileStore.load();
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
  <view class="discover-page page-bottom-safe page-fade-in" :style="menuStyleVars">
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

    <!-- 搜索框 + 签到入口（2026-08-08 重构：搜索框占 80% + 右侧轻量签到入口，释放纵向空间给卡片区） -->
    <view class="top-row">
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

      <!-- 轻量签到入口：图标 + 小字；已签到态文字置灰；点击打开签到弹窗 -->
      <view
        class="checkin-entry press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="checkInStore.checkedIn ? t('discover.alreadyCheckedIn') : t('discover.todayCheckin')"
        @tap="checkinVisible = true"
      >
        <image class="checkin-entry__icon" :src="icons.checkin" mode="aspectFit" alt="" />
        <text class="checkin-entry__text" :class="{ 'checkin-entry__text--done': checkInStore.checkedIn }">
          {{ checkInStore.checkedIn ? t('discover.alreadyCheckedIn') : t('discover.todayCheckin') }}
        </text>
      </view>
    </view>

    <!-- 签到弹窗（2026-08-08 重构：积分/连续天数/商城引导收敛到弹窗内） -->
    <CheckinPopup :visible="checkinVisible" @close="checkinVisible = false" />

    <!-- 错误横幅：独立渲染（不占分支链首位），接口失败时浮于空态/卡片区上方 -->
    <view v-if="errorMessage" class="error-banner">
      <text class="error-banner__text">{{ errorMessage }}</text>
      <text class="error-banner__retry" role="button" :aria-label="t('common.retryAria')" @tap="reloadCards">{{ t('discover.errorRetry') }}</text>
    </view>

    <!-- 加载状态：使用卡片骨架屏替代简单 spinner，更好呼应卡片布局 -->
    <view v-if="loading" class="card-skeleton-wrap">
      <Skeleton variant="card" :count="1" />
      <view class="card-skeleton-hint">
        <text class="card-skeleton-hint__text">{{ t('discover.cardSkeletonHint') }}</text>
      </view>
    </view>

    <!-- 空状态：错误/未登录/配额耗尽/空列表统一收纳，主体始终有居中的说明与可点击动作（杜绝大面积空白） -->
    <view v-else-if="cards.length === 0" class="card-empty-wrap">
      <EmptyState
        :type="errorMessage ? 'network' : 'no-data'"
        :message="
          errorMessage
            ? t('discover.loadFailedTitle')
            : !sessionStore.isLoggedIn
              ? t('discover.card.loginTitle')
              : discoverStore.quotaExhausted
                ? t('discover.card.quotaExhaustedTitle')
                : t('discover.card.emptyTitle')
        "
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
          <text class="card-empty__action-text">
            {{ errorMessage ? t('discover.errorRetry') : t('discover.card.refresh') }}
          </text>
        </view>
      </EmptyState>
    </view>

    <!-- 核心匹配卡片区（页面主体核心）：占据页面中间 60%-70% 纵向空间 -->
    <view v-else class="card-area">
      <!-- 2026-08-08 P0 修复：mp-weixin 中自定义组件宿主节点（<card-swiper> 标签本身）
           是 .card-area（flex column）的 flex 子项，但默认 flex:0 0 auto 高度只由内容决定，
           导致内部 .card-swiper 的 height:100% 塌缩为 0 → 卡片不可见。
           通过 host-class 将 flex:1 样式传入宿主节点，撑满 .card-area。 -->
      <CardSwiper
        class="card-swiper-host"
        :cards="cards"
        :remaining-count="remainingCount"
        :auto-open-detail="autoOpenDetail"
        :detail-anchor="detailAnchor"
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
  /* 2026-08-08 P0 修复：mp-weixin 中 page 元素本身就是滚动容器，
   * 内部容器加 overflow-y:auto 会使 flex 高度变为 indefinite（内容自适应），
   * 导致子元素 flex:1 无法继承高度 → 整条高度链断裂 → 卡片区域塌缩为 0。
   * 小程序端移除 overflow-y:auto，由 page 原生滚动接管。 */
  // #ifdef H5
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  // #endif
  /* 顶部状态栏安全距离 + 底部底导航留白（含 FAB 与底导航高度） */
  padding-top: env(safe-area-inset-top);
  padding-bottom: 180rpx;
}

/* ========== 标题行（2026-08-07 设计稿：寻觅 + 发现心动的人 + 今日剩余次数） ========== */
/* 2026-08-08 重构：合并历史重复定义；右侧预留小程序胶囊安全距离（--capsule-right 由 useMenuButtonRect 注入） */
.discover-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-8) var(--sp-3);
  padding-right: calc(var(--capsule-right, 0px) + var(--sp-8));
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
/* 2026-08-08 重构：右侧预留胶囊安全距离，滚动到最右端的「全部筛选」chip 不被右上角胶囊遮挡 */
.filter-bar {
  padding: 0 var(--sp-7) var(--sp-4);
  padding-right: calc(var(--capsule-right, 0px) + var(--sp-7));
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

/* ========== 搜索框 + 签到入口行（2026-08-08 重构：搜索框 80% + 签到入口 20%，压缩纵向空间） ========== */
.top-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 0 var(--sp-5);
  margin-bottom: var(--sp-4);
}

.search-box {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  /* 高度压缩至 ~72rpx（约 36px），最大限度减少纵向占用 */
  padding: var(--sp-2) var(--sp-4);
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

/* 轻量签到入口：图标 + 小字；已签到态文字置灰 */
.checkin-entry {
  flex-shrink: 0;
  width: 128rpx;
  height: 72rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-border-light);
  box-shadow: var(--s-xs);
}

.checkin-entry__icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.checkin-entry__text {
  font-size: var(--fs-xs);
  color: var(--c-brand-600);
  font-weight: 600;
  line-height: 1.2;
}

.checkin-entry__text--done {
  color: var(--c-text-tertiary);
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
     2026-08-08 重构：顶部模块压缩（双卡+每日一问约 300rpx → 0）后，
     1050rpx 的 min-height 在小屏（可视 ~1194rpx）会强制撑出滚动条；
     下调至 860rpx ≈ 小屏可视高度 65-70%，大屏由 flex:1 自然扩展 */
  min-height: 860rpx;
  // #endif
}

/* ========== CardSwiper 组件宿主节点（小程序端高度链修复） ========== */
/* 2026-08-08 P0：mp-weixin 中自定义组件宿主节点是 .card-area 的 flex 子项，
 * 但默认 flex:0 0 auto，高度只由内容决定（组件内部根节点 height:100% 塌缩）。
 * 给 <CardSwiper> 标签传入该 class，让宿主节点 flex:1 撑满 .card-area，
 * 再配合组件内部 flex 高度链（.card-swiper flex:1 → .card-stack flex:1）恢复卡片高度。
 * H5 端 uni-app 组件宿主即组件根节点，已有 height:100% 链，无需该样式。 */
// #ifndef H5
.card-swiper-host {
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
}
// #endif

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
  // #ifdef H5
  min-height: 60vh;
  // #endif
  // #ifndef H5
  /* 2026-08-08 重构：与卡片区同一 min-height 策略，保证加载期下半部有占位内容 */
  min-height: 860rpx;
  // #endif
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
  // #ifdef H5
  min-height: 60vh;
  // #endif
  // #ifndef H5
  /* 2026-08-08 重构：与卡片区同一 min-height 策略，空态也撑满下半部避免空白 */
  min-height: 860rpx;
  // #endif
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