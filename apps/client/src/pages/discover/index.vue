<script setup lang="ts">
/**
 * 寻觅页 - 卡片推荐 + 签到入口
 * 展示个性化用户卡片推荐，支持滑动浏览和每日签到
 */
import { ref, computed, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useDiscoverStore } from "../../stores/discover";
import { useActivityStore } from "../../stores/activity";
import { useCheckInStore } from "../../stores/checkin";
import { useDailyQuestionStore } from "../../stores/daily-question";
import { useSocialProgressStore } from "../../stores/social-progress";
import { openAppPath } from "../../utils/navigation";
import CardSwiper from "../../components/discover/CardSwiper.vue";
import FilterDrawer from "../../components/discover/FilterDrawer.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import HeartParticles from "../../components/common/HeartParticles.vue";
import { IMAGE_PATHS } from "../../config/images";
import { lightHaptic } from "../../utils/haptic";
import type { SwipeDirection } from "../../stores/discover";
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
  group: IMAGE_PATHS.ICONS_EMOJI.GROUP,
  cake: IMAGE_PATHS.ICONS_EMOJI.CAKE,
  sparkles: IMAGE_PATHS.ICONS_EMOJI.SPARKLES,
  plus: IMAGE_PATHS.ICONS_EMOJI.PLUS,
  close: IMAGE_PATHS.ICONS_COMMON.CLOSE,
} as const;

const discoverStore = useDiscoverStore();
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
 * 触发匹配成功跳转（带防重复保护 + 双头像碰撞动画）
 * @param partner - 匹配对方信息（昵称 + 头像）
 */
function triggerMatchNavigation(partner?: { name?: string; avatar?: string }) {
  if (isMatchNavigating) return;
  isMatchNavigating = true;

  // 设置动画数据（当前用户头像暂用默认，UserSession 无 avatarUrl 字段）
  partnerName.value = partner?.name ?? "TA";
  partnerAvatar.value = partner?.avatar || IMAGE_PATHS.AVATARS.AVATAR_1;
  myAvatar.value = IMAGE_PATHS.AVATARS.AVATAR_2;
  showMatchAnimation.value = true;

  // 显示 toast 提示
  uni.showToast({
    title: "匹配成功！",
    icon: "success",
    duration: 2000,
  });

  // 1.5 秒后跳转 likes 页
  setTimeout(() => {
    showMatchAnimation.value = false;
    openAppPath("/pages/likes/index");
    // 跳转完成后释放锁（页面通常已切换，但保险起见延时重置）
    setTimeout(() => {
      isMatchNavigating = false;
    }, 500);
  }, 1500);
}

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
    // 错误已由 store 处理并设置到 errorMessage
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
    console.error("超级喜欢操作失败:", error);
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

/** 学历标签映射（与 FilterDrawer EDUCATION_OPTIONS 对齐） */
const EDUCATION_LABEL_MAP: Record<string, string> = {
  high_school: "高中",
  bachelor: "本科",
  master: "硕士",
  phd: "博士",
};

/** 感情状态标签映射（与 FilterDrawer RELATIONSHIP_OPTIONS 对齐） */
const RELATIONSHIP_LABEL_MAP: Record<string, string> = {
  never: "未婚",
  married_before: "曾婚",
  divorced: "离异",
  widowed: "丧偶",
};

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
    const labels = filter.educationLevel.map((v) => EDUCATION_LABEL_MAP[v] ?? v).join("/");
    capsules.push({ key: "educationLevel", label: labels });
  }

  // 感情状态
  if (filter.relationshipStatus && filter.relationshipStatus.length > 0) {
    const labels = filter.relationshipStatus.map((v) => RELATIONSHIP_LABEL_MAP[v] ?? v).join("/");
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
    capsules.push({ key: "futureCity", label: `未来: ${filter.futureCity}` });
  }

  // 关键词
  if (filter.keyword) {
    capsules.push({ key: "keyword", label: `关键词: ${filter.keyword}` });
  }

  return capsules;
});

/** 是否有已应用的筛选条件 */
const hasActiveFilters = computed(() => activeFilterCapsules.value.length > 0);

/** 筛选配置：id -> 文案与图标（图标使用 SVG 路径，与模板顺序一致） */
const filterOptions: { id: string; icon: string; text: string }[] = [
  { id: "nearby", icon: icons.location, text: "附近" },
  { id: "all", icon: icons.group, text: "不限" },
  { id: "age18-25", icon: icons.cake, text: "18-25岁" },
  { id: "match-priority", icon: icons.sparkles, text: "匹配度优先" },
];

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
 */
function clearSearch() {
  searchKeyword.value = "";
  discoverStore.setSearchKeyword("");
}

/**
 * 处理签到
 */
async function handleCheckIn() {
  try {
    await checkInStore.checkIn();
    // 签到成功后，将额外配额同步到 discover store
    if (checkInStore.extraRecommendQuota > 0) {
      discoverStore.setExtraQuota(checkInStore.extraRecommendQuota);
    }
    // 触发心形粒子撒花动画（1.5s 后由 HeartParticles done 事件重置）
    showParticles.value = true;
  } catch (_e) {
    // 错误已在 checkInStore 的 errorMessage 中展示
  }
}

onMounted(() => {
  void discoverStore.fetchCards();
  void activityStore.fetchActivities();
  void checkInStore.fetchStatus();
  void socialProgressStore.fetchProgress();
});
</script>

<template>
  <view class="discover-page page-bottom-safe page-fade-in">
    <!-- 浪漫氛围背景层：模糊光斑营造若隐若现的浪漫感（mp-weixin 降级为静态色块） -->
    <view class="discover-atmosphere" aria-hidden="true">
      <view class="discover-atmosphere__blob discover-atmosphere__blob--pink" />
      <view class="discover-atmosphere__blob discover-atmosphere__blob--green" />
      <view class="discover-atmosphere__blob discover-atmosphere__blob--cream" />
    </view>

    <!-- 页面头部 -->
    <view class="discover-header">
      <view class="discover-header__title-area">
        <text class="discover-header__title">寻觅</text>
        <text class="discover-header__subtitle">发现心动的人</text>
      </view>
      <view class="discover-header__meta">
        <view class="discover-header__count-chip">
          <SafeImage :src="icons.match" custom-class="discover-header__count-icon" mode="aspectFit" />
          <text class="discover-header__count">{{ remainingCount }} 次</text>
        </view>
      </view>
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
        <view class="filter-list">
          <view
            v-for="filter in filterOptions"
            :key="filter.id"
            class="filter-chip press-feedback"
            :class="{ 'filter-chip--active': activeFilter === filter.id }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="onFilterChipTap(filter.id)"
          >
            <image class="filter-chip__icon" :src="filter.icon" mode="aspectFit" />
            <text class="filter-chip__text">{{ filter.text }}</text>
          </view>
          <!-- 全部筛选 chip：点击打开筛选抽屉（H-07 + M-16） -->
          <view
            class="filter-chip filter-chip--all press-feedback"
            :class="{ 'filter-chip--has-active': hasActiveFilters }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="onFilterChipTap('all-filters')"
          >
            <image class="filter-chip__icon" :src="icons.plus" mode="aspectFit" />
            <text class="filter-chip__text">全部筛选</text>
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
        <view class="active-capsules__list">
          <view
            v-for="capsule in activeFilterCapsules"
            :key="capsule.key"
            class="active-capsule press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="removeFilterCapsule(capsule.key)"
          >
            <text class="active-capsule__text">{{ capsule.label }}</text>
            <text class="active-capsule__close">✕</text>
          </view>
          <view
            class="active-capsule active-capsule--clear press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="clearAllFilters"
          >
            <text class="active-capsule__text active-capsule__text--clear">清空</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 搜索框 -->
    <view class="search-box">
      <image class="search-icon" :src="icons.search" mode="aspectFit" />
      <input
        class="search-input"
        placeholder="搜索用户/标签/学校"
        v-model="searchKeyword"
        @input="onSearchInput"
      />
      <text v-if="searchKeyword" class="search-clear" @tap="clearSearch">✕</text>
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
          <text class="checkin-card__title">今日签到</text>
          <text class="checkin-card__desc">获取更多推荐机会</text>
        </view>
      </view>
      <button
        class="checkin-card__btn"
        :disabled="checkInStore.checkingIn"
        @tap="handleCheckIn"
      >
        {{ checkInStore.checkingIn ? "签到中..." : "立即签到" }}
      </button>
    </view>

    <!-- 签到成功提示（CSS 动画淡入）+ 心形粒子撒花动画覆盖层 -->
    <view v-if="checkInStore.showSuccessAnimation" class="checkin-success animate-fade">
      <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.CHECK" custom-class="checkin-success__icon" mode="aspectFit" />
      <view class="checkin-success__info">
        <text class="checkin-success__title">签到成功</text>
        <text class="checkin-success__count">{{ checkInStore.extraRecommendationsText }}</text>
        <text v-if="checkInStore.consecutiveDaysText" class="checkin-success__streak">
          {{ checkInStore.consecutiveDaysText }}
        </text>
      </view>
      <!-- 心形粒子撒花动画：1.5s 后由 done 事件自动重置 showParticles -->
      <HeartParticles :visible="showParticles" @done="showParticles = false" />
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
              <text class="benefit-card__title">已签到</text>
              <text class="benefit-card__desc">{{ checkInStore.consecutiveDaysText || "明日继续来签到吧" }}</text>
            </view>
          </view>
          <text class="benefit-card__arrow">✓</text>
        </view>

        <!-- 推荐配额权益 -->
        <view
          v-if="checkInStore.extraQuotaText"
          class="benefit-card card-base benefit-card--quota press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="openAppPath('/pages/likes/index')"
        >
          <view class="benefit-card__left">
            <SafeImage :src="icons.match" custom-class="benefit-card__icon" mode="aspectFit" />
            <view class="benefit-card__info">
              <text class="benefit-card__title">推荐配额提升</text>
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
          @tap="openAppPath('/pages/village/index?tab=hot')"
        >
          <view class="benefit-card__left">
            <SafeImage :src="icons.heartSignal" custom-class="benefit-card__icon" mode="aspectFit" />
            <view class="benefit-card__info">
              <text class="benefit-card__title">热门话题</text>
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
          @tap="openAppPath('/pages/circles/index')"
        >
          <view class="benefit-card__left">
            <SafeImage :src="icons.follow" custom-class="benefit-card__icon" mode="aspectFit" />
            <view class="benefit-card__info">
              <text class="benefit-card__title">新入圈用户</text>
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
          <text class="daily-question-card__title">每日一问</text>
          <text class="daily-question-card__desc">{{ dailyQuestionStore.todayQuestion?.question ?? "今日话题：你理想中的第一次约会是什么样？" }}</text>
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
      <text class="error-banner__retry" @tap="reloadCards">重试</text>
    </view>

    <!-- 加载状态 -->
    <view v-else-if="loading" class="loading-state">
      <view class="loading-state__spinner" />
      <text class="loading-state__text">正在加载推荐...</text>
    </view>

    <!-- 卡片滑动区域 -->
    <view v-else class="card-area">
      <CardSwiper
        :cards="cards"
        :remaining-count="remainingCount"
        @swipe="handleSwipe"
        @superLike="handleSuperLike"
        @videoTap="handleVideoTap"
      />
    </view>

    <!-- 社交升温提示：有社交进度时展示 -->
    <view
      v-if="!loading && socialProgressStore.progress && socialProgressStore.progress.likeCount > 0"
      class="social-hint press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      @tap="openAppPath('/pages/likes/index')"
    >
      <view class="social-hint__left">
        <SafeImage :src="icons.likeFilled" custom-class="social-hint__icon" mode="aspectFit" />
        <text class="social-hint__text">
          你已表达 {{ socialProgressStore.progress.likeCount }} 次喜欢，
          快去看看谁也喜欢了你
        </text>
      </view>
      <text class="social-hint__arrow">&rsaquo;</text>
    </view>

    <!-- 活动推荐板块：卡片用完后展示 -->
    <view v-if="!loading && !errorMessage && cards.length === 0" class="activity-recommend">
      <view class="activity-recommend__header">
        <text class="activity-recommend__title section-title-brand">发现活动</text>
        <text class="activity-recommend__subtitle">从线下活动开始，轻松认识新朋友</text>
      </view>
      <view class="activity-list">
        <view
          v-for="(item, idx) in activityStore.activities.slice(0, 3)"
          :key="item.id"
          class="activity-card list-item animate-fade-in"
          :style="{ animationDelay: idx * 80 + 'ms' }"
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
      <view class="activity-recommend__more press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openAppPath('/subpackages/discover/activities/index')">
        <text class="activity-recommend__more-text">查看更多活动</text>
      </view>
    </view>

    <!-- 底部提示：当卡片即将用完时显示 -->
    <view v-if="hasMore && remainingCount <= 3 && remainingCount > 0" class="limit-hint">
      <text class="limit-hint__text">还剩 {{ remainingCount }} 次机会</text>
    </view>

    <!-- 匹配成功双头像碰撞动画 overlay -->
    <view v-if="showMatchAnimation" class="match-overlay">
      <view class="match-overlay__avatars">
        <image class="match-overlay__avatar match-overlay__avatar--left" :src="myAvatar" mode="aspectFill" />
        <image class="match-overlay__avatar match-overlay__avatar--right" :src="partnerAvatar" mode="aspectFill" />
        <view class="match-overlay__spark">
          <image class="match-overlay__spark-icon" :src="icons.heart" mode="aspectFit" />
        </view>
      </view>
      <text class="match-overlay__title">匹配成功</text>
      <text class="match-overlay__subtitle">与 {{ partnerName }} 互相喜欢</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.discover-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
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
  border-radius: 50%;
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
  background: radial-gradient(circle, rgba(236, 72, 153, 0.32) 0%, rgba(236, 72, 153, 0) 70%);
}

.discover-atmosphere__blob--green {
  width: 420rpx;
  height: 420rpx;
  top: 320rpx;
  right: -140rpx;
  background: radial-gradient(circle, rgba(63, 207, 142, 0.28) 0%, rgba(63, 207, 142, 0) 70%);
}

.discover-atmosphere__blob--cream {
  width: 320rpx;
  height: 320rpx;
  bottom: 200rpx;
  left: 30%;
  background: radial-gradient(circle, rgba(255, 212, 121, 0.22) 0%, rgba(255, 212, 121, 0) 70%);
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
  border: 1rpx solid rgba(63, 207, 142, 0.2);
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
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.8);
  // #ifdef H5
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  // #endif
  border: 1rpx solid rgba(226, 232, 240, 0.8);
  box-shadow: var(--s-xs);
  transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-chip:active {
  transform: scale(0.96);
}

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
  background: rgba(255, 255, 255, 0.8);
  // #ifdef H5
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  // #endif
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
  color: rgba(255, 255, 255, 0.85);
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
  transition: opacity 150ms ease;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.checkin-card__btn:active {
  opacity: 0.85;
}

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
    rgba(0, 0, 0, 0.06) 25%,
    rgba(0, 0, 0, 0.1) 37%,
    rgba(0, 0, 0, 0.06) 63%
  );
  background-size: 400% 100%;
  animation: skeleton-loading 1.4s ease infinite;
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
  transition: opacity 280ms ease, transform 280ms ease;
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
  transition: opacity 320ms ease, transform 320ms ease;
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
  transition: transform 320ms ease;
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
  background: rgba(16, 185, 129, 0.08);
  border: 1rpx solid rgba(16, 185, 129, 0.18);
  animation: checkin-success-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
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
  font-size: var(--fs-4xl);
  flex-shrink: 0;
  animation: checkin-success-bounce 0.6s ease 0.1s both;
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
  transition: transform 150ms ease;
}

.benefit-card--clickable {
  transition: transform 150ms ease;
}

.benefit-card--clickable:active {
  transform: scale(0.98);
}

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
  background: linear-gradient(135deg, var(--c-romance-50) 0%, #FDF2F8 100%);
  box-shadow: 0 4rpx 16rpx rgba(236, 72, 153, 0.08);
  border: 1rpx solid rgba(236, 72, 153, 0.12);
  transition: transform 150ms ease;
}

.daily-question-card:active {
  transform: scale(0.98);
}

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
  background: rgba(239, 68, 68, 0.08);
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
  animation: spin 1s linear infinite;
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

/* ========== 社交升温提示 ========== */
.social-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: var(--sp-4) var(--sp-7);
  padding: var(--sp-5) var(--sp-6);
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(63, 207, 142, 0.08) 100%);
  border-radius: var(--r-lg);
  border: 1rpx solid rgba(236, 72, 153, 0.12);
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

  &:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }
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
  background: rgba(0, 0, 0, 0.6);
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
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-8);
  z-index: 9999;
  animation: match-overlay-fade 300ms ease both;
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
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3);
  transform: translateY(-50%);
}

.match-overlay__avatar--left {
  left: 0;
  animation: match-avatar-left 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.match-overlay__avatar--right {
  right: 0;
  animation: match-avatar-right 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
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
  animation: match-spark 1.2s ease 0.5s both;
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
  color: #ec4899;
}

.match-overlay__title {
  font-size: var(--fs-6xl);
  font-weight: 800;
  color: var(--c-text-inverse);
  text-shadow: 0 4rpx 16rpx rgba(236, 72, 153, 0.5);
  animation: match-text-pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s both;
}

.match-overlay__subtitle {
  font-size: var(--fs-lg);
  color: rgba(255, 255, 255, 0.9);
  animation: match-text-pop 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 0.9s both;
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