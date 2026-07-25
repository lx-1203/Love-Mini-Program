<script setup lang="ts">
/**
 * 喜欢页 - 双向喜欢 / 访客
 * 展示「喜欢我的」用户列表和「访客」记录，支持切换标签页
 *
 * 功能1：批量操作 - 顶部"管理"按钮进入批量模式，每项显示 checkbox，
 *        底部批量操作栏：全选、批量喜欢、批量跳过、批量取消
 * 功能2：搜索 - 顶部搜索输入框（300ms 防抖），按昵称、学校、城市筛选
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useLikesStore } from "../../stores/likes";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import LockScreen from "../../components/common/LockScreen.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import VerificationBadge from "../../components/common/VerificationBadge.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { likesPageRequirements } from "../../config/page-access";
import { IMAGE_PATHS } from "../../config/images";
import BaseTabs from "../../components/common/BaseTabs.vue";
import { lightHaptic, successHaptic, errorHaptic } from "../../utils/haptic";
import type { BatchActionType } from "../../stores/likes";

type TabType = "likedBy" | "myLikes" | "visitors";

const { t } = useI18n();
const likesStore = useLikesStore();
const sessionStore = useSessionStore();

// Phase 4 任务 20：接入页面访问守卫，触发 UnlockGuideModal 引导（替代静默重定向）
usePageAccess(likesPageRequirements);
const {
  likedBy,
  likes,
  visitors,
  loading,
  heartSignals,
  batchMode,
  selectedIds,
  batchProcessing,
  searchQuery,
} = storeToRefs(likesStore);

/* ========== 功能2：搜索后的列表（直接从 store getter 派生） ========== */
/**
 * 当前可见的「喜欢我的」列表（按搜索关键词过滤）
 * 模板中 v-for 使用此计算属性，而非直接使用 likedBy
 */
const displayLikedBy = computed(() => likesStore.filteredLikedBy);
/** 当前可见的「我发出的喜欢」列表（按搜索关键词过滤） */
const displayLikes = computed(() => likesStore.filteredLikes);
/** 当前可见的访客列表（按搜索关键词过滤） */
const displayVisitors = computed(() => likesStore.filteredVisitors);

/** 搜索后是否无匹配结果（用于展示空态文案区分） */
const isSearchEmpty = computed(() => {
  if (!searchQuery.value.trim()) return false;
  if (activeTab.value === "likedBy") return displayLikedBy.value.length === 0;
  if (activeTab.value === "myLikes") return displayLikes.value.length === 0;
  return displayVisitors.value.length === 0;
});

/* ========== 功能2：搜索相关状态 ========== */
/** 搜索输入框临时值（与 store.searchQuery 解耦，用于 300ms 防抖） */
const searchInput = ref("");
/** 防抖定时器引用 */
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 搜索输入事件处理（功能2核心）
 * 300ms 防抖：用户停止输入 300ms 后才真正写入 store 触发过滤
 * 避免每个字符都触发 computed 重算，提升 mp-weixin 端输入流畅度
 * @param e - 输入事件对象
 */
function handleSearchInput(e: Event): void {
  const detail = (e as unknown as { detail?: { value?: string } }).detail;
  const value = detail?.value ?? "";
  searchInput.value = value;
  // 清除上一次防抖定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  // 300ms 后写入 store，触发 filteredLikedBy/filteredLikes/filteredVisitors 重算
  searchDebounceTimer = setTimeout(() => {
    likesStore.setSearchQuery(value);
    searchDebounceTimer = null;
  }, 300);
}

/**
 * 清空搜索关键词
 * 立即同步 store 与输入框，无需防抖
 */
function handleClearSearch(): void {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
  searchInput.value = "";
  likesStore.setSearchQuery("");
}

/** 当前激活的标签页（提前声明，便于 visibleUserIds / watch 引用） */
const activeTab = ref<TabType>("likedBy");

/* ========== 功能1：批量操作相关状态 ========== */
/**
 * 当前可见列表的用户 ID 数组（用于"全选"操作）
 * 根据 activeTab 切换返回对应过滤后的列表
 */
const visibleUserIds = computed<string[]>(() => {
  if (activeTab.value === "likedBy") {
    return likesStore.filteredLikedBy.map((item) => item.userId);
  }
  if (activeTab.value === "myLikes") {
    return likesStore.filteredLikes.map((item) => item.userId);
  }
  return likesStore.filteredVisitors.map((item) => item.userId);
});

/** 当前选中数量（用于底部操作栏展示） */
const selectedCount = computed(() => selectedIds.value.length);

/** 是否全选（当前可见列表全部已选中） */
const isAllSelected = computed(() => {
  if (visibleUserIds.value.length === 0) return false;
  return visibleUserIds.value.every((id) => selectedIds.value.includes(id));
});

/**
 * 进入/退出批量模式
 * 进入时清空已选列表，退出时同样清空，避免残留状态
 */
function toggleBatchMode(): void {
  lightHaptic();
  likesStore.setBatchMode(!batchMode.value);
}

/**
 * 切换某项的选中状态
 * @param userId - 用户 ID
 */
function handleToggleSelect(userId: string): void {
  lightHaptic();
  likesStore.toggleSelected(userId);
}

/**
 * 全选/取消全选当前可见列表
 */
function handleSelectAll(): void {
  lightHaptic();
  if (isAllSelected.value) {
    // 已全部选中 → 取消全选（仅取消当前可见列表中的选中项）
    const visibleSet = new Set(visibleUserIds.value);
    likesStore.selectedIds = likesStore.selectedIds.filter((id) => !visibleSet.has(id));
  } else {
    // 未全选 → 全选当前可见列表
    likesStore.selectAll(visibleUserIds.value);
  }
}

/**
 * 执行批量操作（功能1核心）
 * 错误处理：
 * - 选中为空时 toast 提示并返回
 * - 操作进行中禁用按钮（batchProcessing 锁）
 * - 部分失败时 toast 提示失败数量
 * - 全部成功时 toast 提示并退出批量模式
 *
 * @param action - 操作类型：like / skip / cancel
 */
async function handleBatchAction(action: BatchActionType): Promise<void> {
  // 参数校验：选中不能为空
  if (selectedIds.value.length === 0) {
    uni.showToast({ title: t("likes.batchEmpty"), icon: "none" });
    return;
  }
  // 防重复提交
  if (batchProcessing.value) return;

  lightHaptic();
  try {
    await likesStore.batchActions(action, [...selectedIds.value]);
    successHaptic();
    uni.showToast({ title: t("likes.batchSuccess"), icon: "success" });
    // 操作完成后退出批量模式
    likesStore.setBatchMode(false);
  } catch (error) {
    errorHaptic();
    const msg = error instanceof Error ? error.message : t("likes.batchFailed");
    uni.showToast({ title: msg, icon: "none" });
  }
}

/**
 * 切换 Tab 时清空搜索与批量状态
 * 避免上一个 Tab 的搜索关键词/选中项残留影响下一个 Tab
 */
watch(activeTab, () => {
  handleClearSearch();
  if (batchMode.value) {
    likesStore.setBatchMode(false);
  }
});

/**
 * 页面卸载时清理防抖定时器，避免内存泄漏
 */
onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
});

/** 资料是否已完善 */
const isUnlocked = computed(() => sessionStore.isProfileComplete);

/** 完善度百分比 */
const completionPercent = computed(() => sessionStore.profileCompletion);

/** 是否有心动信号 */
const hasHeartSignal = computed(() => heartSignals.value.length > 0);

/**
 * 格式化时间显示
 * @param isoString - ISO 时间字符串
 * @returns 友好时间文本
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return t("common.justNow");
  if (diffMinutes < 60) return t("common.minutesAgo", { n: diffMinutes });
  if (diffHours < 24) return t("common.hoursAgo", { n: diffHours });
  if (diffDays < 7) return t("common.daysAgo", { n: diffDays });
  return t("likes.monthDay", { m: date.getMonth() + 1, d: date.getDate() });
}

/**
 * 切换标签页
 * @param tab - 目标标签页
 */
function switchTab(tab: TabType) {
  activeTab.value = tab;
  if (tab === "visitors" && visitors.value.length === 0) {
    void likesStore.fetchVisitors();
  }
}

/* ========== BaseTabs 数据 ========== */
/** 将三个标签页映射为 BaseTabs 所需的 { key, label, badge } 结构，badge 为对应列表长度（0 时隐藏） */
const likesTabs = computed(() => [
  { key: "likedBy", label: t("likes.likedBy"), badge: likedBy.value.length || undefined },
  { key: "myLikes", label: t("likes.myLikes"), badge: likes.value.length || undefined },
  { key: "visitors", label: t("likes.visitors"), badge: visitors.value.length || undefined },
]);

/**
 * BaseTabs change 事件回调
 * 调用 switchTab 触发访客列表懒加载等副作用
 */
function onLikesTabChange(key: string) {
  switchTab(key as TabType);
}

/**
 * 跳转到聊天页
 * @param userId - 用户 ID
 */
function goToChat(userId: string) {
  if (!userId) return;
  openAppPath(`/pages/chat-session/index?userId=${encodeURIComponent(userId)}`);
}

/**
 * 判断是否与指定用户互相喜欢（匹配）
 * @param userId - 用户 ID
 */
function isMutualMatch(userId: string): boolean {
  return likesStore.mutualLikes.some((item) => item.userId === userId);
}

/**
 * 点击喜欢列表项：匹配成功则进入聊天，否则进入用户详情页
 * @param userId - 用户 ID
 */
function handleItemClick(userId: string) {
  if (!userId) return;
  if (isMutualMatch(userId)) {
    goToChat(userId);
  } else {
    openAppPath(`/pages/profile/index?userId=${encodeURIComponent(userId)}`);
  }
}

/**
 * 跳转到心动信号页
 */
function goToHeartSignals() {
  openAppPath("/pages/heart-signals/index");
}

onMounted(() => {
  if (isUnlocked.value) {
    void likesStore.fetchLikes();
    void likesStore.fetchHeartSignals();
  }
  // 修复：添加全局网络状态监听，断网时提示"网络已断开"（原实现无网络监听）
  registerNetworkListener();
});

/**
 * 网络状态变化回调引用。
 * 保存引用便于 onUnmounted 时反注册，避免内存泄漏与重复提示。
 */
let networkStatusCallback: ((res: { isConnected: boolean }) => void) | null = null;

/**
 * 注册全局网络状态监听。
 * 仅在已注册时跳过，避免重复绑定。
 */
function registerNetworkListener() {
  if (networkStatusCallback) return;
  networkStatusCallback = (res) => {
    if (!res.isConnected) {
      uni.showToast({ title: t("common.networkDisconnected"), icon: "none" });
    }
  };
  uni.onNetworkStatusChange(networkStatusCallback);
}

/**
 * 反注册网络状态监听，避免页面卸载后仍触发 toast。
 */
function unregisterNetworkListener() {
  if (networkStatusCallback) {
    uni.offNetworkStatusChange(networkStatusCallback);
    networkStatusCallback = null;
  }
}

onUnmounted(() => {
  unregisterNetworkListener();
});

/**
 * 监听解锁状态变化：sessionStore 异步加载完成后 isUnlocked 由 false 变 true，
 * 此时若列表为空则自动加载，避免从 discover 跳转过来时内容为空白。
 */
watch(
  isUnlocked,
  (newVal, oldVal) => {
    if (newVal && !oldVal && likedBy.value.length === 0) {
      void likesStore.fetchLikes();
      void likesStore.fetchHeartSignals();
    }
  }
);

/**
 * 页面再次显示时（如从 discover 匹配成功跳转过来）：
 * 已解锁且列表为空则补加载，确保数据可见。
 */
onShow(() => {
  if (isUnlocked.value && likedBy.value.length === 0 && !loading.value) {
    void likesStore.fetchLikes();
    void likesStore.fetchHeartSignals();
  }
});
</script>

<template>
  <view class="likes-page page-fade-in">
    <!-- 未完善资料：显示锁定页面 -->
    <LockScreen
      v-if="!isUnlocked"
      :page-name="t('likes.pageName')"
      :completion-percent="completionPercent"
    />

    <!-- 已完善资料：显示正常内容 -->
    <template v-else>
      <!-- 页面顶部渐变氛围 -->
      <view class="likes-header-overlay" />
      
      <!-- 页面头部 -->
      <view class="likes-header">
        <text class="likes-header__title">{{ t('likes.title') }}</text>
        <view class="likes-header__actions">
          <!-- 心动信号入口 -->
          <view
            v-if="hasHeartSignal"
            class="likes-header__signal press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="goToHeartSignals"
          >
            <SafeImage :src="IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL" custom-class="likes-header__signal-icon" mode="aspectFit" />
            <text class="likes-header__signal-text">{{ t('likes.heartSignal') }}</text>
            <view class="likes-header__signal-badge" />
          </view>
          <!-- 功能1：批量管理切换按钮 -->
          <view
            class="likes-header__manage press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="toggleBatchMode"
          >
            <text class="likes-header__manage-text">
              {{ batchMode ? t('likes.finish') : t('likes.manage') }}
            </text>
          </view>
        </view>
      </view>

      <!-- 功能2：搜索输入框（300ms 防抖） -->
      <view class="likes-search">
        <view class="likes-search__box">
          <text class="likes-search__icon">🔍</text>
          <input
            class="likes-search__input"
            type="text"
            :value="searchInput"
            :placeholder="t('likes.searchPlaceholder')"
            confirm-type="search"
            @input="handleSearchInput"
          />
          <view
            v-if="searchInput"
            class="likes-search__clear"
            @tap="handleClearSearch"
          >
            <text class="likes-search__clear-icon">×</text>
          </view>
        </view>
      </view>

      <!-- 标签页切换 -->
      <view class="likes-tabs-card">
        <BaseTabs
          v-model="activeTab"
          :tabs="likesTabs"
          variant="pill"
          :equal-split="true"
          @change="onLikesTabChange"
        />
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="likes-loading">
        <view class="likes-loading__spinner" />
        <text class="likes-loading__text">{{ t('common.loading') }}</text>
      </view>

      <!-- 喜欢我的列表 -->
      <template v-else-if="activeTab === 'likedBy'">
        <view v-if="displayLikedBy.length === 0" class="likes-empty card-base">
          <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.HEART" custom-class="likes-empty__icon" mode="aspectFit" />
          <text class="likes-empty__title">
            {{ isSearchEmpty ? t('likes.searchEmpty') : t('likes.emptyLikedBy') }}
          </text>
          <text class="likes-empty__subtitle">{{ t('likes.emptyLikedByDesc') }}</text>
        </view>

        <view v-else class="likes-list">
          <view
            v-for="(item, idx) in displayLikedBy"
            :key="item.id"
            class="likes-card list-item animate-fade-in press-feedback"
            :class="{
              'likes-card--mutual': isMutualMatch(item.userId),
              'likes-card--batch': batchMode,
              'likes-card--selected': batchMode && selectedIds.includes(item.userId),
            }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            :style="{ animationDelay: idx * 60 + 'ms' }"
            @tap="batchMode ? handleToggleSelect(item.userId) : handleItemClick(item.userId)"
          >
            <!-- 功能1：批量模式下的 checkbox -->
            <view
              v-if="batchMode"
              class="likes-card__checkbox"
              :class="{ 'likes-card__checkbox--checked': selectedIds.includes(item.userId) }"
            >
              <text v-if="selectedIds.includes(item.userId)" class="likes-card__check-icon">✓</text>
            </view>
            <view class="likes-card__avatar-wrap">
              <image
                v-if="item.avatar"
                class="likes-card__avatar"
                :src="item.avatar"
                mode="aspectFill"
                lazy-load
              />
              <view v-else class="likes-card__avatar-placeholder">
                <text class="likes-card__avatar-initial">{{ item.name.charAt(0) }}</text>
              </view>
            </view>
            <view class="likes-card__info">
              <view class="likes-card__row">
                <view class="likes-card__name-wrap">
                  <text class="likes-card__name">{{ item.name }}</text>
                  <VerificationBadge
                    v-if="item.verificationBadgeLevel && item.verificationBadgeLevel !== 'none'"
                    :level="(item.verificationBadgeLevel as 'school' | 'email' | 'idcard')"
                    size="sm"
                    :show-cta-when-none="false"
                  />
                </view>
                <text class="likes-card__time">{{ formatTime(item.likedAt) }}</text>
              </view>
              <text class="likes-card__headline">{{ item.headline }}</text>
            </view>
            <view v-if="!batchMode" class="likes-card__arrow">
              <text class="likes-card__arrow-icon">›</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 我发出的喜欢列表 -->
      <template v-else-if="activeTab === 'myLikes'">
        <view v-if="displayLikes.length === 0" class="likes-empty card-base">
          <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.HEART" custom-class="likes-empty__icon" mode="aspectFit" />
          <text class="likes-empty__title">
            {{ isSearchEmpty ? t('likes.searchEmpty') : t('likes.emptyMyLikes') }}
          </text>
          <text class="likes-empty__subtitle">{{ t('likes.emptyMyLikesDesc') }}</text>
        </view>

        <view v-else class="likes-list">
          <view
            v-for="(item, idx) in displayLikes"
            :key="item.id"
            class="likes-card list-item animate-fade-in press-feedback"
            :class="{
              'likes-card--mutual': isMutualMatch(item.userId),
              'likes-card--batch': batchMode,
              'likes-card--selected': batchMode && selectedIds.includes(item.userId),
            }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            :style="{ animationDelay: idx * 60 + 'ms' }"
            @tap="batchMode ? handleToggleSelect(item.userId) : handleItemClick(item.userId)"
          >
            <!-- 功能1：批量模式下的 checkbox -->
            <view
              v-if="batchMode"
              class="likes-card__checkbox"
              :class="{ 'likes-card__checkbox--checked': selectedIds.includes(item.userId) }"
            >
              <text v-if="selectedIds.includes(item.userId)" class="likes-card__check-icon">✓</text>
            </view>
            <view class="likes-card__avatar-wrap">
              <image
                v-if="item.avatar"
                class="likes-card__avatar"
                :src="item.avatar"
                mode="aspectFill"
                lazy-load
              />
              <view v-else class="likes-card__avatar-placeholder">
                <text class="likes-card__avatar-initial">{{ item.name.charAt(0) }}</text>
              </view>
            </view>
            <view class="likes-card__info">
              <view class="likes-card__row">
                <view class="likes-card__name-wrap">
                  <text class="likes-card__name">{{ item.name }}</text>
                  <VerificationBadge
                    v-if="item.verificationBadgeLevel && item.verificationBadgeLevel !== 'none'"
                    :level="(item.verificationBadgeLevel as 'school' | 'email' | 'idcard')"
                    size="sm"
                    :show-cta-when-none="false"
                  />
                </view>
                <text class="likes-card__time">{{ formatTime(item.likedAt) }}</text>
              </view>
              <text class="likes-card__headline">{{ item.headline }}</text>
            </view>
            <view v-if="!batchMode" class="likes-card__arrow">
              <text class="likes-card__arrow-icon">›</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 访客列表 -->
      <template v-else-if="activeTab === 'visitors'">
        <view v-if="displayVisitors.length === 0" class="likes-empty card-base">
          <SafeImage :src="IMAGE_PATHS.ICONS_SOCIAL.VISITOR" custom-class="likes-empty__icon" mode="aspectFit" />
          <text class="likes-empty__title">
            {{ isSearchEmpty ? t('likes.searchEmpty') : t('likes.emptyVisitors') }}
          </text>
          <text class="likes-empty__subtitle">{{ t('likes.emptyVisitorsDesc') }}</text>
        </view>

        <view v-else class="likes-list">
          <view
            v-for="(item, idx) in displayVisitors"
            :key="item.id"
            class="likes-card list-item animate-fade-in press-feedback"
            :class="{
              'likes-card--batch': batchMode,
              'likes-card--selected': batchMode && selectedIds.includes(item.userId),
            }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            :style="{ animationDelay: idx * 60 + 'ms' }"
            @tap="batchMode ? handleToggleSelect(item.userId) : handleItemClick(item.userId)"
          >
            <!-- 功能1：批量模式下的 checkbox -->
            <view
              v-if="batchMode"
              class="likes-card__checkbox"
              :class="{ 'likes-card__checkbox--checked': selectedIds.includes(item.userId) }"
            >
              <text v-if="selectedIds.includes(item.userId)" class="likes-card__check-icon">✓</text>
            </view>
            <view class="likes-card__avatar-wrap">
              <image
                v-if="item.avatar"
                class="likes-card__avatar"
                :src="item.avatar"
                mode="aspectFill"
                lazy-load
              />
              <view v-else class="likes-card__avatar-placeholder">
                <text class="likes-card__avatar-initial">{{ item.name.charAt(0) }}</text>
              </view>
              <!-- 新访客标记 -->
              <view v-if="item.isNew" class="likes-card__new-dot" />
            </view>
            <view class="likes-card__info">
              <view class="likes-card__row">
                <view class="likes-card__name-wrap">
                  <text class="likes-card__name">{{ item.name }}</text>
                  <VerificationBadge
                    v-if="item.verificationBadgeLevel && item.verificationBadgeLevel !== 'none'"
                    :level="(item.verificationBadgeLevel as 'school' | 'email' | 'idcard')"
                    size="sm"
                    :show-cta-when-none="false"
                  />
                </view>
                <text class="likes-card__time">{{ formatTime(item.visitedAt) }}</text>
              </view>
              <text class="likes-card__headline">{{ item.headline }}</text>
            </view>
            <view v-if="!batchMode" class="likes-card__arrow">
              <text class="likes-card__arrow-icon">›</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 功能1：批量操作底部操作栏 -->
      <view
        v-if="batchMode"
        class="likes-batch-bar"
      >
        <view class="likes-batch-bar__left" @tap="handleSelectAll">
          <view
            class="likes-batch-bar__checkbox"
            :class="{ 'likes-batch-bar__checkbox--checked': isAllSelected }"
          >
            <text v-if="isAllSelected" class="likes-batch-bar__check-icon">✓</text>
          </view>
          <text class="likes-batch-bar__select-text">
            {{ isAllSelected ? t('common.cancel') : t('likes.selectAll') }}
          </text>
        </view>
        <view class="likes-batch-bar__right">
          <!-- 批量喜欢（仅 likedBy Tab 显示） -->
          <view
            v-if="activeTab === 'likedBy'"
            class="likes-batch-bar__btn likes-batch-bar__btn--like"
            :class="{ 'likes-batch-bar__btn--disabled': batchProcessing }"
            @tap="handleBatchAction('like')"
          >
            <text class="likes-batch-bar__btn-text">
              {{ batchProcessing ? t('likes.batchProcessing') : t('likes.batchLike') }}
            </text>
          </view>
          <!-- 批量跳过（仅 likedBy Tab 显示） -->
          <view
            v-if="activeTab === 'likedBy'"
            class="likes-batch-bar__btn likes-batch-bar__btn--skip"
            :class="{ 'likes-batch-bar__btn--disabled': batchProcessing }"
            @tap="handleBatchAction('skip')"
          >
            <text class="likes-batch-bar__btn-text">
              {{ batchProcessing ? t('likes.batchProcessing') : t('likes.batchSkip') }}
            </text>
          </view>
          <!-- 批量取消喜欢（仅 myLikes Tab 显示） -->
          <view
            v-if="activeTab === 'myLikes'"
            class="likes-batch-bar__btn likes-batch-bar__btn--cancel"
            :class="{ 'likes-batch-bar__btn--disabled': batchProcessing }"
            @tap="handleBatchAction('cancel')"
          >
            <text class="likes-batch-bar__btn-text">
              {{ batchProcessing ? t('likes.batchProcessing') : t('likes.batchCancel') }}
            </text>
          </view>
        </view>
      </view>

      <!-- 功能1：批量模式下底部已选数量提示 -->
      <view v-if="batchMode" class="likes-batch-count">
        <text class="likes-batch-count__text">
          {{ t('likes.selectedCount', { n: selectedCount }) }}
        </text>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.likes-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--c-gradient-page);
  padding: var(--sp-6) var(--sp-8);
  padding-top: calc(env(safe-area-inset-top) + var(--sp-6));
  padding-bottom: calc(env(safe-area-inset-bottom) + 160rpx);
  box-sizing: border-box;
  position: relative;
}

.likes-header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 300rpx;
  background: var(--c-gradient-brand-overlay);
  pointer-events: none;
  z-index: 0;
}

/* ========== 页面头部 ========== */
.likes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--section-gap);
  position: relative;
  z-index: 1;
}

.likes-header__title {
  font-size: var(--fs-5xl);
  font-weight: 700;
  color: var(--c-text-primary);
  // #ifdef H5
  background: linear-gradient(135deg, var(--c-brand), var(--c-romance-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  // #endif
  // #ifndef H5
  color: var(--c-brand);
  // #endif
}

.likes-header__signal {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-6);
  background: linear-gradient(135deg, var(--c-romance-50), var(--c-romance-100));
  border-radius: var(--r-full);
  transition: all 0.15s ease;
  box-shadow: var(--s-romance);
}

/* #ifdef H5 */
.likes-header__signal:active {
  transform: scale(0.96);
}
/* #endif */

.likes-header__signal-icon {
  width: var(--sp-8);
  height: var(--sp-8);
}

.likes-header__signal-text {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-romance-500);
}

.likes-header__signal-badge {
  width: var(--sp-4);
  height: var(--sp-4);
  border-radius: var(--r-full);
  background: var(--c-romance-500);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}

/* ========== 标签页卡片容器（包裹 BaseTabs） ========== */
.likes-tabs-card {
  margin-bottom: var(--section-gap);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  padding: var(--sp-2);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  position: relative;
  z-index: 1;
}

/* ========== 加载状态 ========== */
.likes-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
  padding: var(--sp-10) 0;
  position: relative;
  z-index: 1;
}

.likes-loading__spinner {
  width: var(--sp-10);
  height: var(--sp-10);
  border: var(--sp-1) solid var(--c-neutral-100);
  border-top-color: var(--c-brand);
  border-radius: var(--r-full);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.likes-loading__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

/* ========== 空状态 ========== */
.likes-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: var(--sp-10) var(--sp-10);
  margin-top: var(--sp-5);
  position: relative;
  z-index: 1;
}

.likes-empty__icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: var(--sp-5);
  opacity: 0.5;
}

.likes-empty__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.likes-empty__subtitle {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  text-align: center;
  line-height: 1.6;
}

/* ========== 列表 ========== */
.likes-list {
  display: flex;
  flex-direction: column;
  gap: var(--section-gap);
  position: relative;
  z-index: 1;
}

/* ========== 列表过渡动画 ========== */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(var(--sp-5));
}
.list-move {
  transition: transform 0.3s ease;
}

/* ========== 卡片 ========== */
.likes-card {
  display: flex;
  align-items: center;
  gap: var(--sp-6);
  padding: var(--sp-7);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
  transition: all 0.15s ease;
}

/* #ifdef H5 */
.likes-card:active {
  transform: scale(0.98);
  box-shadow: var(--card-shadow-active);
}
/* #endif */

/* 互相喜欢（匹配）项高亮，提示用户可点击进入聊天 */
.likes-card--mutual {
  border-color: var(--c-romance-300);
  background: linear-gradient(135deg, var(--c-romance-50) 0%, var(--c-bg-container) 100%);
}

.likes-card--mutual .likes-card__arrow {
  background: linear-gradient(135deg, var(--c-romance-200) 0%, var(--c-romance-100) 100%);
}

.likes-card__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.likes-card__avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-page);
  border: var(--sp-1) solid var(--c-bg-brand);
}

.likes-card__avatar-placeholder {
  width: 104rpx;
  height: 104rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--sp-1) solid var(--c-bg-brand);
}

.likes-card__avatar-initial {
  font-size: var(--fs-4xl);
  font-weight: 700;
  color: var(--c-brand);
}

.likes-card__new-dot {
  position: absolute;
  top: var(--sp-1);
  right: var(--sp-1);
  width: var(--sp-6);
  height: var(--sp-6);
  border-radius: var(--r-full);
  background: var(--c-romance-500);
  border: var(--sp-1) solid var(--c-bg-container);
  box-shadow: var(--s-romance);
}

.likes-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.likes-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
}

/* 昵称 + 认证徽章包裹（Phase D3） */
.likes-card__name-wrap {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  flex: 1;
}

.likes-card__name {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
}

.likes-card__time {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
  background: var(--c-neutral-50);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
}

.likes-card__headline {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.likes-card__arrow {
  flex-shrink: 0;
  padding-left: var(--sp-2);
  width: var(--sp-10);
  height: var(--sp-10);
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-shadow-tint, var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.15))));
  display: flex;
  align-items: center;
  justify-content: center;
}

.likes-card__arrow-icon {
  font-size: var(--fs-3xl);
  color: var(--c-brand);
  font-weight: 600;
}

/* ========== 功能1：批量模式卡片样式 ========== */
/* 批量模式下卡片允许选中高亮 */
.likes-card--batch {
  padding-left: var(--sp-4);
}

.likes-card--selected {
  border-color: var(--c-brand);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-container) 100%);
}

/* 卡片左侧 checkbox */
.likes-card__checkbox {
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--r-full);
  border: 2rpx solid var(--c-border);
  background: var(--c-bg-container);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.likes-card__checkbox--checked {
  background: var(--c-brand);
  border-color: var(--c-brand);
}

.likes-card__check-icon {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 700;
}

/* ========== 功能2：搜索框样式 ========== */
.likes-search {
  margin-bottom: var(--section-gap);
  position: relative;
  z-index: 1;
}

.likes-search__box {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-5);
  background: var(--c-bg-container);
  border-radius: var(--r-full);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.likes-search__icon {
  font-size: 32rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.likes-search__input {
  flex: 1;
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  background: transparent;
}

.likes-search__clear {
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-full);
  background: var(--c-neutral-100);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.likes-search__clear-icon {
  font-size: 28rpx;
  color: var(--c-text-tertiary);
  font-weight: 700;
}

/* ========== 功能1：底部批量操作栏 ========== */
.likes-batch-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  /* 兼容 iPhone X+ 底部安全区 */
  bottom: calc(env(safe-area-inset-bottom) + 0rpx);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-6);
  padding-bottom: calc(var(--sp-4) + env(safe-area-inset-bottom));
  background: var(--c-bg-container);
  border-top: 1rpx solid var(--c-border-light);
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.06);
  z-index: 100;
}

.likes-batch-bar__left {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-shrink: 0;
}

.likes-batch-bar__checkbox {
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--r-full);
  border: 2rpx solid var(--c-border);
  background: var(--c-bg-container);
  display: flex;
  align-items: center;
  justify-content: center;
}

.likes-batch-bar__checkbox--checked {
  background: var(--c-brand);
  border-color: var(--c-brand);
}

.likes-batch-bar__check-icon {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 700;
}

.likes-batch-bar__select-text {
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  font-weight: 600;
}

.likes-batch-bar__right {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex: 1;
  justify-content: flex-end;
}

.likes-batch-bar__btn {
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.likes-batch-bar__btn--like {
  background: linear-gradient(135deg, var(--c-brand), var(--c-brand-700));
}

.likes-batch-bar__btn--like .likes-batch-bar__btn-text {
  color: #ffffff;
}

.likes-batch-bar__btn--skip {
  background: var(--c-neutral-100);
}

.likes-batch-bar__btn--skip .likes-batch-bar__btn-text {
  color: var(--c-text-primary);
}

.likes-batch-bar__btn--cancel {
  background: linear-gradient(135deg, var(--c-romance-500), var(--c-romance-700));
}

.likes-batch-bar__btn--cancel .likes-batch-bar__btn-text {
  color: #ffffff;
}

.likes-batch-bar__btn--disabled {
  opacity: 0.5;
}

.likes-batch-bar__btn-text {
  font-size: var(--fs-md);
  font-weight: 600;
}

/* 批量模式下底部已选数量提示（浮于操作栏上方） */
.likes-batch-count {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(env(safe-area-inset-bottom) + 120rpx);
  padding: var(--sp-2) var(--sp-5);
  background: rgba(0, 0, 0, 0.7);
  border-radius: var(--r-full);
  z-index: 101;
}

.likes-batch-count__text {
  font-size: var(--fs-sm);
  color: #ffffff;
}

/* 头部操作区（管理按钮 + 心动信号） */
.likes-header__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.likes-header__manage {
  padding: var(--sp-3) var(--sp-5);
  background: var(--c-bg-container);
  border-radius: var(--r-full);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.likes-header__manage-text {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-brand);
}
</style>
