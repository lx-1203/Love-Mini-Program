<script setup lang="ts">
/**
 * 喜欢与访客（2026-08-07 消息页重构独立二级页）。
 *
 * 从消息页「喜欢与访客」入口进入，与普通会话列表完全隔离：
 * - 双 Tab：「喜欢我的」/「我的访客」，选中态下划线高亮
 * - 数据概览栏：总浏览量 / 今日访客 / 今日浏览量
 * - 未解锁态：头像模糊 + 锁标识，昵称隐藏，仅展示少量基础标签
 * - 底部固定「解锁全部」按钮：VIP 免费放行，非 VIP 消耗交友币（幂等扣费）
 * - 顶部轻量「提升曝光」入口（不弹窗、不打断浏览，跳转 VIP 页）
 */
import { computed, ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useLikesStore, type LikeRecord, type VisitorRecord } from "../../stores/likes";
import { useProfileStore } from "../../stores/profile";
import { useCoinsStore, UNLOCK_COST_YUAN } from "../../stores/coins";
import { useVipStore } from "../../stores/vip";
// P1-08：会员功能开关（关闭时 VIP 页/解锁免费放行全部降级）
import { featureFlags } from "../../config/feature-flags";
import { usePageAccess } from "../../composables/usePageAccess";
import { likesPageRequirements } from "../../config/page-access";
import { openAppPath } from "../../utils/navigation";
// 2026-08-09：路由常量化（他人主页 / 聊天会话）
import { ROUTES } from "../../constants/routes";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";
// 2026-08-09 免踢登录：未登录切换进本页不跳登录页，由 LockScreen（未登录版）引导
import { useSessionStore } from "../../stores/session";
import LockScreen from "../../components/common/LockScreen.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import ErrorState from "../../components/common/ErrorState.vue";

const { t } = useI18n();
const likesStore = useLikesStore();
const profileStore = useProfileStore();
const coinsStore = useCoinsStore();
const vipStore = useVipStore();
const sessionStore = useSessionStore();

usePageAccess(likesPageRequirements);

/** 是否解锁：未登录 → 展示 LockScreen（未登录版）引导，不渲染列表、不发鉴权请求 */
const isUnlocked = computed(() => sessionStore.isLoggedIn);
/** 完善度（已登录未完善时 LockScreen 展示进度） */
const completionPercent = computed(() => sessionStore.profileCompletion);

const { likedBy, visitors, loading } = storeToRefs(likesStore);

const DEFAULT_AVATAR = IMAGE_PATHS.DEFAULT_AVATAR;

/** 当前 Tab：likedMe（喜欢我的）/ visitors（我的访客） */
const activeTab = ref<"likedMe" | "visitors">("likedMe");

const errorMessage = computed(() => likesStore.errorMessage);

/** Tab 配置（下划线高亮，badge 展示新访客数） */
const tabItems = computed(() => [
  { key: "likedMe" as const, label: t("likesVisitors.tabLikedMe"), badge: likedBy.value.length || undefined },
  { key: "visitors" as const, label: t("likesVisitors.tabVisitors"), badge: visitors.value.filter((v) => v.isNew).length || undefined },
]);

/**
 * P0-17：当前 Tab 是否仍有未解锁项（驱动底部「解锁全部」按钮显隐）。
 * 解锁状态以服务端 unlocked 字段为准，不再依赖本地 storage。
 */
const hasLockedItems = computed(() => currentList.value.some((item) => item.unlocked !== true));

/** 当前 Tab 解锁单价（元，仅用于文案展示；实际扣费由服务端 /wallet/unlock 定价） */
const unlockCost = computed(() =>
  UNLOCK_COST_YUAN[activeTab.value === "likedMe" ? "LIKES" : "VISITORS"],
);

/** 数据概览（总浏览量 / 今日访客 / 今日浏览量；P1-07：删除假数字兜底，数据为空显示 0） */
const overview = computed(() => {
  const stats = profileStore.profileStats;
  return {
    totalViews: stats?.visitorsCount ?? 0,
    todayVisitors: visitors.value.filter((v) => v.isNew).length,
    todayViews: likedBy.value.length,
  };
});

/** 当前 Tab 列表数据 */
const currentList = computed(() =>
  activeTab.value === "likedMe" ? likedBy.value : visitors.value,
);

/** 头像地址（上传目录鉴权改造后需 resolveMediaUrl 重写） */
function avatarOf(item: { avatar?: string; avatarUrl?: string }): string {
  const raw = item.avatarUrl || item.avatar || "";
  return raw ? resolveMediaUrl(raw) : DEFAULT_AVATAR;
}

onMounted(() => {
  void profileStore.load();
});

onShow(() => {
  // 2026-08-09 免踢登录：未登录展示 LockScreen 引导，不发起鉴权请求（避免 401 被全局处理强拉登录页）
  if (!isUnlocked.value) return;
  // R4-00020 修复：原条件反置（loading 时重复请求、加载完成后永不刷新）。
  // 改为仅在未加载中时补拉，避免重复请求。
  if (!profileStore.loading) {
    void profileStore.load();
  }
  // 修复（2026-08-09）：fetchLikes/fetchVisitors 失败会向上 throw（P1 BUG 设计），
  // 页面侧必须接 catch，否则成为 unhandledRejection（页面异常刷屏 + 主线程卡顿）。
  // 失败由页面内错误态展示（errorMessage 已写入 store），无需额外处理。
  void likesStore.fetchLikes().catch(() => {
    /* store 已记录 errorMessage，页面错误态展示 */
  });
  void likesStore.fetchVisitors().catch(() => {
    /* 同上 */
  });
});

function switchTab(key: string) {
  activeTab.value = key as "likedMe" | "visitors";
}

/** 单条记录是否已解锁（服务端 unlocked 字段；缺失按未解锁处理） */
function isItemUnlocked(item: LikeRecord | VisitorRecord): boolean {
  return item.unlocked === true;
}

/**
 * P0-17：解锁当前 Tab 全部未解锁记录。
 *
 * 逐条调用 POST /api/v1/wallet/unlock（服务端幂等：已解锁不重复扣费），
 * 成功后更新对应记录的 unlocked=true 并刷新余额显示；余额不足时展示后端错误信息。
 *
 * P1-08：会员功能启用且当前用户为 VIP 时免费放行（不发起扣费请求）。
 */
async function handleUnlock() {
  const lockedItems = currentList.value.filter((item) => item.unlocked !== true);
  if (lockedItems.length === 0) return;

  const targetType = activeTab.value === "likedMe" ? "LIKED_ME" : "VISITOR";

  // VIP 免费放行（R4-00021 修复）：仅当会员功能启用时生效（featureFlags.membershipEnabled 控制）。
  // 仍逐条调用服务端 /wallet/unlock（幂等，已解锁不重复扣费）持久化解锁状态，
  // 避免仅本地置位导致刷新后锁状态回退；服务端放行失败时降级为本地解锁兜底。
  if (featureFlags.membershipEnabled && vipStore.isVip) {
    try {
      for (const item of lockedItems) {
        const result = await likesStore.unlockUser(targetType, item.userId);
        void result;
        item.unlocked = true;
      }
    } catch (_e) {
      // 服务端 VIP 免费放行未生效（如余额不足）时降级为本地解锁，保证 VIP 体验不中断
      markAllUnlocked(true);
    }
    uni.showToast({ title: t("likesVisitors.unlockVipFree"), icon: "success" });
    return;
  }

  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: t("likesVisitors.unlockTitle"),
      content: t("likesVisitors.unlockConfirm", { coins: unlockCost.value, count: lockedItems.length }),
      confirmText: t("likesVisitors.unlockConfirmBtn"),
      cancelText: t("common.cancel"),
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) return;

  // P0-17：服务端解锁——targetType 按当前 Tab（喜欢我的→LIKED_ME / 访客→VISITOR），targetId=对方用户 id
  let lastBalance = 0;
  try {
    for (const item of lockedItems) {
      const result = await likesStore.unlockUser(targetType, item.userId);
      lastBalance = result.balance ?? lastBalance;
      item.unlocked = true;
    }
    // 解锁成功后刷新余额显示（wallet 页余额与 unlock 返回余额同源）
    void coinsStore.fetchBalance(true).catch(() => {
      // 余额刷新失败不阻塞（下次进入钱包页自动重取）
    });
    uni.showToast({ title: t("likesVisitors.unlockSuccess"), icon: "success" });
  } catch (error) {
    // 余额不足或扣费失败：展示后端错误信息（不解锁）
    uni.showToast({
      title: error instanceof Error ? error.message : t("likesVisitors.unlockFail"),
      icon: "none",
    });
  }
}

/** 标记当前 Tab 全部记录为已解锁（VIP 免费放行路径） */
function markAllUnlocked(unlocked: boolean): void {
  for (const item of currentList.value) {
    item.unlocked = unlocked;
  }
}

/**
 * 点击用户：已解锁时进入主页；互相喜欢 → 直接去聊天（2026-08-09 闭环完善）。
 * 进入他人主页页（pages/profile/other），展示完整公开资料并支持喜欢/悄悄话。
 */
function goToUserProfile(userId: string) {
  if (!userId) return;
  const isMutual = likesStore.mutualLikes.some((m) => m.userId === userId);
  if (isMutual) {
    openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(userId)}`);
    return;
  }
  openAppPath(`${ROUTES.PROFILE.OTHER}?userId=${encodeURIComponent(userId)}`);
}

/**
 * 返回上一页（自定义导航栏返回键）。
 * 无上一页时（如从 reLaunch/直达进入）回退到首页 tab。
 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: "/pages/home/index" });
  }
}

/**
 * R4-00022：点击未解锁列表项时弹出解锁引导。
 * 复用底部「解锁全部」同一流程（VIP 免费 / 非 VIP 弹确认框），
 * 避免点击无任何反馈导致用户不知道如何解锁。
 */
function handleLockedItemTap(): void {
  void handleUnlock();
}

/** 提升曝光入口 → VIP 页（P1-08：会员功能未启用时提示并返回） */
function goToExposure() {
  if (!featureFlags.membershipEnabled) {
    uni.showToast({ title: t("likesVisitors.membershipDisabled"), icon: "none" });
    return;
  }
  openAppPath("/pages/vip/index");
}

/**
 * 列表项时间展示（R4-00019 修复，对齐 likes/index.vue P2-01 同类修复）。
 * 契约（likes.yaml）visitedAt 为 "yyyy-MM-dd HH:mm:ss"，
 * iOS/Safari 直接 new Date() 解析为 Invalid Date → 显示 NaN/NaN；
 * 先做 "yyyy-MM-dd HH:mm:ss" → ISO 格式转换，再加 isNaN 校验兜底。
 */
function formatTime(isoString?: string): string {
  if (!isoString) return "";
  // 兼容 "yyyy-MM-dd HH:mm:ss"：空格替换为 "T" 生成 ISO 时间串
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(isoString)
    ? isoString.replace(" ", "T")
    : isoString;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** 取列表项时间（喜欢记录用 likedAt，访客记录用 visitedAt） */
function timeOf(item: LikeRecord | VisitorRecord): string | undefined {
  return "likedAt" in item ? item.likedAt : item.visitedAt;
}
</script>

<template>
  <view class="likes-visitors-page page-fade-in">
    <!-- 2026-08-09 免踢登录：未登录切换进本页展示引导页，点击按钮才跳登录 -->
    <LockScreen v-if="!isUnlocked" :completion-percent="completionPercent" />
    <template v-else>
    <!-- 顶部标题栏（2026-08-09：左侧补返回键，navigationStyle: custom 无系统返回栏） -->
    <view class="page-header">
      <view class="page-header__top">
        <view
          class="page-header__back press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('common.back')"
          @tap="goBack"
        >
          <image class="page-header__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
        </view>
        <text class="page-header__title">{{ t('likesVisitors.pageTitle') }}</text>
      </view>
      <text class="page-header__subtitle">{{ t('likesVisitors.pageSubtitle') }}</text>
    </view>

    <!-- 轻量「提升曝光」入口（不弹窗、不打断浏览；2026-08-08 走查 P1：会员未启用时整条隐藏） -->
    <view v-if="featureFlags.membershipEnabled" class="exposure-bar press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('likesVisitors.exposure')" @tap="goToExposure">
      <image class="exposure-bar__icon" :src="IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE" mode="aspectFit" alt="" />
      <text class="exposure-bar__text">{{ t('likesVisitors.exposure') }}</text>
      <text class="exposure-bar__arrow">›</text>
    </view>

    <!-- 数据概览栏 -->
    <view class="overview">
      <view class="overview__item">
        <text class="overview__value">{{ overview.totalViews }}</text>
        <text class="overview__label">{{ t('likesVisitors.overviewTotalViews') }}</text>
      </view>
      <view class="overview__item">
        <text class="overview__value">{{ overview.todayVisitors }}</text>
        <text class="overview__label">{{ t('likesVisitors.overviewTodayVisitors') }}</text>
      </view>
      <view class="overview__item">
        <text class="overview__value">{{ overview.todayViews }}</text>
        <text class="overview__label">{{ t('likesVisitors.overviewTodayViews') }}</text>
      </view>
    </view>

    <!-- Tab 切换（主色下划线，选中态高亮） -->
    <view class="tabs" role="list">
      <view
        v-for="tab in tabItems" :key="tab.key"
        class="tabs__item"
        :class="{ 'tabs__item--active': activeTab === tab.key }"
        role="button"
        :aria-pressed="activeTab === tab.key"
        @tap="switchTab(tab.key)"
      >
        <text class="tabs__text">{{ tab.label }}</text>
        <view v-if="tab.badge" class="tabs__badge">
          <text class="tabs__badge-text">{{ tab.badge > 99 ? '99+' : tab.badge }}</text>
        </view>
      </view>
    </view>

    <!-- 错误态 -->
    <ErrorState v-if="errorMessage && currentList.length === 0" :message="errorMessage" />

    <!-- 加载中 -->
    <view v-else-if="loading" class="list">
      <Skeleton variant="list" :count="3" />
    </view>

    <!-- 空态 -->
    <EmptyState
      v-else-if="currentList.length === 0"
      type="no-data"
      :title="activeTab === 'likedMe' ? t('likesVisitors.emptyLikedMe') : t('likesVisitors.emptyVisitors')"
    />

    <!-- 用户列表（P0-17：逐条按服务端 unlocked 字段打码，未解锁：头像模糊 + 昵称隐藏） -->
    <view v-else class="list" role="list">
      <view
        v-for="item in currentList" :key="item.userId || item.id"
        class="list__item"
        role="button"
        :aria-label="isItemUnlocked(item) ? item.name : t('likesVisitors.nameHidden')"
        @tap="isItemUnlocked(item) ? goToUserProfile(item.userId) : handleLockedItemTap()"
      >
        <!-- 头像（未解锁时模糊 + 锁标识） -->
        <view class="list__avatar-wrap">
          <view class="list__avatar" :class="{ 'list__avatar--blur': !isItemUnlocked(item) }">
            <SafeImage :src="avatarOf(item)" :fallback="DEFAULT_AVATAR" mode="aspectFill" :lazy-load="true" :alt="item.name || ''" />
          </view>
          <view v-if="!isItemUnlocked(item)" class="list__lock">
            <image class="list__lock-icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCK" mode="aspectFit" alt="" />
          </view>
        </view>

        <!-- 信息区 -->
        <view class="list__info">
          <text v-if="isItemUnlocked(item)" class="list__name">{{ item.name || '—' }}</text>
          <text v-else class="list__name list__name--hidden">{{ t('likesVisitors.nameHidden') }}</text>
          <text v-if="isItemUnlocked(item)" class="list__meta">{{ item.headline || '' }}</text>
          <!-- 未解锁：仅展示少量基础标签 -->
          <view v-else class="list__tags">
            <text class="list__tag">{{ t('likesVisitors.tagAge') }}</text>
            <text class="list__tag">{{ t('likesVisitors.tagSameCity') }}</text>
            <text class="list__tag list__tag--coin">{{ t('likesVisitors.tagUnlockHint', { coins: unlockCost }) }}</text>
          </view>
        </view>

        <!-- 时间 -->
        <text v-if="isItemUnlocked(item)" class="list__time">{{ formatTime(timeOf(item)) }}</text>
      </view>
    </view>

    <!-- 底部固定「解锁全部」按钮（当前 Tab 存在未解锁项时显示） -->
    <view v-if="hasLockedItems" class="unlock-bar">
      <button class="unlock-bar__btn" :aria-label="t('likesVisitors.unlockBtn', { coins: unlockCost })" @tap="handleUnlock">
        <text class="unlock-bar__btn-text">{{ t('likesVisitors.unlockBtn', { coins: unlockCost }) }}</text>
      </button>
      <text class="unlock-bar__hint">{{ t('likesVisitors.unlockHint') }}</text>
    </view>

    <!-- 底部安全区占位（避免内容被固定按钮遮挡） -->
    <view v-if="hasLockedItems" class="unlock-bar-spacer" />
    </template>
  </view>
</template>

<style scoped lang="scss">
.likes-visitors-page {
  min-height: 100vh;
  background: var(--c-gradient-page);
  padding: calc(env(safe-area-inset-top) + var(--sp-6)) var(--sp-7) calc(env(safe-area-inset-bottom) + var(--sp-8));
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  box-sizing: border-box;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

/* 2026-08-09：返回键 + 标题（同一行） */
.page-header__top {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.page-header__back {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-header__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.page-header__title {
  font-size: var(--fs-4xl);
  font-weight: 800;
  color: var(--c-text-primary);
}

.page-header__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* ========== 提升曝光入口 ========== */
.exposure-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-6);
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-romance-50));
  border: 1rpx solid var(--c-brand-200);
}

.exposure-bar__icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.exposure-bar__text {
  flex: 1;
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-brand-700);
}

.exposure-bar__arrow {
  font-size: var(--fs-2xl);
  color: var(--c-brand-700);
  line-height: 1;
}

/* ========== 数据概览栏 ========== */
.overview {
  display: flex;
  padding: var(--sp-5) var(--sp-3);
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
}

.overview__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
}

.overview__value {
  font-size: var(--fs-3xl);
  font-weight: 800;
  color: var(--c-text-primary);
  font-variant-numeric: tabular-nums;
}

.overview__label {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* ========== Tab 切换（主色下划线） ========== */
.tabs {
  display: flex;
  gap: var(--sp-8);
  border-bottom: 1rpx solid var(--c-divider-light);
}

.tabs__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-2);
}

.tabs__text {
  font-size: var(--fs-lg);
  color: var(--c-text-secondary);
}

.tabs__item--active .tabs__text {
  color: var(--c-text-primary);
  font-weight: 600;
}

.tabs__item--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  border-radius: var(--r-xs);
  background: var(--c-brand, #3FCF8E);
}

.tabs__badge {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 var(--sp-1);
  border-radius: var(--r-full);
  background: var(--c-error);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tabs__badge-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
}

/* ========== 列表 ========== */
.list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.list__item {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
}

.list__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.list__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  overflow: hidden;
  background: var(--c-bg-page);
}

.list__avatar--blur {
  filter: blur(14rpx);
}

/* 未解锁锁标识（覆盖在模糊头像上） */
.list__lock {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* R4-02530：白色叠层改用 token（深色模式自动适配） */
  background: var(--c-overlay-white-bg-strong-mid, rgba(255, 255, 255, 0.35));
  border-radius: var(--r-full);
}

.list__lock-icon {
  width: 40rpx;
  height: 40rpx;
}

.list__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.list__name {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &--hidden {
    color: var(--c-text-tertiary);
    font-weight: 500;
  }
}

.list__meta {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 未解锁基础标签 */
.list__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.list__tag {
  font-size: 20rpx;
  font-weight: 500;
  padding: 2rpx 12rpx;
  border-radius: var(--r-sm);
  background: var(--c-bg-page);
  color: var(--c-text-secondary);

  &--coin {
    background: var(--c-bg-brand);
    color: var(--c-brand-700);
  }
}

.list__time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
  align-self: flex-start;
}

/* ========== 底部固定解锁按钮 ========== */
.unlock-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-8);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-4));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, var(--c-bg-container) 30%);
}

.unlock-bar__btn {
  width: 100%;
  height: 88rpx;
  border: 0;
  border-radius: var(--r-xl);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
  line-height: 88rpx;
  text-align: center;
}

.unlock-bar__btn::after {
  border: none;
}

.unlock-bar__btn-text {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.unlock-bar__hint {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* 固定按钮占位（防止遮挡列表末尾） */
.unlock-bar-spacer {
  height: 240rpx;
  flex-shrink: 0;
}
</style>
