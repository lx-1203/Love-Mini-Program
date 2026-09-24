<script setup lang="ts">


import { computed, ref, watch } from "vue";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useDiscoverStore } from "../../stores/discover";
import { useSessionStore } from "../../stores/session";
import { useAppConfigStore } from "../../stores/app-config";
import { useProfileStore } from "../../stores/profile";
import { useMatchStore } from "../../stores/match";
import { ROUTES } from "../../constants/routes";
import { useTabBar } from "../../composables/useTabBar";
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import { isCacheFresh, setCachedValue, removeCache } from "../../utils/cache-ttl";
import { ensureCertified } from "../../guards/campus-gate";
import { getToken } from "../../services/http";
// 修复#7（第五轮 QA）：mock 模式无网络请求，dev-user 会话（已登录但无真实 token）也允许拉取本地匹配卡
import { useMock } from "../../stores/helpers/use-mock";
import { openAppPath, openUserProfile, setTabBarHidden } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import { toMatchCardUser } from "../../view-models/match";
import MatchCard from "../../components/match/MatchCard.vue";
import MatchActions from "../../components/match/MatchActions.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import FilterDrawer from "../../components/discover/FilterDrawer.vue";
// 2026-08-26：寻觅「附近」卡片化——本地距离筛选 + 近→远排序，复用推荐卡片视图
import { filterNearby, sortNearbyFirst } from "../../stores/discover/utils";
import type { DiscoverCard } from "../../stores/discover/types";

const DISCOVER_TTL_MS = 30_000;

const { t } = useI18n();
const discoverStore = useDiscoverStore();
const sessionStore = useSessionStore();
const appConfigStore = useAppConfigStore();
const profileStore = useProfileStore();
const matchStore = useMatchStore();
const scrollTop = ref(0);

useTabBar(2);
const { styleVars: menuStyleVars } = useMenuButtonRect();

// MP-R1-PAGES-DISCOVER-INDEX-REQ-03：remainingCount 供本页「今日剩余 N 次」前置告知使用
// （store getter 单一数据源：dailyLimit + extraQuota - viewedCards.length，签到加量自动跟随）
const { cards, loading, errorMessage, remainingCount } = storeToRefs(discoverStore);
const { isMatchOpen } = storeToRefs(appConfigStore);

/** 寻觅页分段：recommend-推荐 / nearby-附近（卡片视图） */
type DiscoverMode = "recommend" | "nearby";
const activeMode = ref<DiscoverMode>("recommend");

/**
 * 当前展示卡片列表：
 * - 推荐：保持 store 原始顺序（推荐算法权重）；
 * - 附近：复用推荐卡片样式，先按 ≤20km 过滤，再按同校→距离升序（近→远）排序。
 */
const visibleCards = computed<DiscoverCard[]>(() => {
  const list = cards.value;
  if (activeMode.value !== "nearby") return list;
  return sortNearbyFirst(filterNearby(list));
});

const currentCard = computed(() => visibleCards.value[0] ?? null);
const currentUser = computed(() =>
  currentCard.value ? toMatchCardUser(currentCard.value) : null
);

/** 空态文案：附近模式与推荐模式分开，便于用户理解为何无卡 */
const emptyMessage = computed(() =>
  errorMessage.value
    ? t("discover.loadFailedTitle")
    : discoverStore.quotaExhausted
      ? t("discover.card.quotaExhaustedTitle")
      : activeMode.value === "nearby"
        ? t("discover.card.nearbyEmptyTitle")
        : t("discover.card.emptyTitle")
);

function requireLogin(): boolean {
  if (sessionStore.isLoggedIn) return true;
  uni.showToast({ title: t("apiErrors.loginRequired"), icon: "none" });
  return false;
}

function goLogin() {
  openAppPath("/pages/login/index");
}

/**
 * 切换寻觅分段（推荐 / 附近）。
 * - 原实现「附近」直接 switchTab 跳附近页（Explore），与用户预期「同款卡片」不符；
 * - 现改为页内切换：本地即时过滤/排序（无需网络请求，响应零延迟），
 *   同时同步 store 匹配范围，使后续 fetchCards / 下拉刷新沿用附近限定（≤20km）。
 */
function switchDiscoverMode(mode: DiscoverMode) {
  activeMode.value = mode;
  // MP-R2-PAGES-DISCOVER-INDEX-006：收敛到 store 单一 action（原内联直写三字段 +
  // 手动 fetchCards 与 setNearbyScope/setMatchScope 同构双路径，任一侧调整必漂移）
  discoverStore.setDiscoverMode(mode);
}

function handleCardTap() {
  if (!currentUser.value) return;
  openUserProfile(currentUser.value.userId);
}

async function handleSwipeLeft() {
  if (!currentCard.value) return;
  try {
    await discoverStore.swipeLeft(currentCard.value.id);
  } catch (error) {
    const message = discoverStore.errorMessage || t("discover.operationFailed");
    uni.showToast({ title: message, icon: "none" });
    console.error("跳过操作失败:", error);
  }
}

function enterMatching(action: "like" | "superLike") {
  const card = currentCard.value;
  if (!card) return;
  // MP-R1-PAGES-DISCOVER-INDEX-004（2026-09-20）：今日额度用尽后不再放行喜欢/打招呼，
  // 避免操作到一半才被接口以「次数用完」拒绝
  if (discoverStore.isLimitReached) {
    uni.showToast({ title: t("discover.card.quotaExhaustedTitle"), icon: "none" });
    return;
  }
  matchStore.beginCheck(toMatchCardUser(card), card.id, action);
  const query =
    `userId=${encodeURIComponent(card.userId)}` +
    `&cardId=${encodeURIComponent(card.id)}` +
    `&action=${encodeURIComponent(action)}`;
  openAppPath(`${ROUTES.DISCOVER.MATCHING}?${query}`);
}

// 2026-08-31：筛选抽屉为全屏弹层——打开时隐藏自定义 tabbar，避免遮挡底部操作（录屏实证）
watch(
  () => discoverStore.isFilterDrawerOpen,
  (open) => setTabBarHidden(open)
);

async function handleLike() {
  if (!requireLogin()) return;
  if (!ensureCertified("realname")) return;
  enterMatching("like");
}

async function handleSuperLike() {
  if (!requireLogin()) return;
  if (!ensureCertified("realname")) return;
  // MP-R2-PAGES-DISCOVER-INDEX-005：配额门控提前——原实现先对 greet:count:* +1 写
  // storage、enterMatching 内 isLimitReached 才拦截且不回滚，配额用尽期每次点击虚耗
  // 目标额度。现先做同款配额检查，通过后才递增频控计数。
  if (discoverStore.isLimitReached) {
    uni.showToast({ title: t("discover.card.quotaExhaustedTitle"), icon: "none" });
    return;
  }
  // 2026-09-06 打招呼频控：同一目标最多 3 次（本地计数，按日失效），超出后提示等待
  // 对方回应；与实名认证门控配合，构成「合法身份 + 有限次数」的打招呼判定
  const targetId = currentCard.value?.id;
  if (targetId) {
    const key = `greet:count:${targetId}`;
    const today = new Date().toISOString().slice(0, 10);
    let record: { date?: string; count?: number } | null = null;
    try {
      const raw = uni.getStorageSync(key);
      if (raw && typeof raw === "object") record = raw as { date?: string; count?: number };
    } catch (_e) {
      /* 存储读取失败按无记录处理 */
    }
    const count = record && record.date === today ? Number(record.count ?? 0) : 0;
    if (count >= 3) {
      uni.showToast({ title: t("discover.greetLimitReached"), icon: "none" });
      return;
    }
    uni.setStorageSync(key, { date: today, count: count + 1 });
  }
  enterMatching("superLike");
}

function loadDiscoverData() {
  // 未登录时也加载mock预览数据（点击交互时再引导登录）
  // 修复#7（第五轮 QA）：原守卫 (getToken() || !isLoggedIn) 会拦截「已登录但无真实 token」的
  // dev-user mock 会话（enterDevUserDemo 不写 token），导致匹配卡/操作按钮缺失。
  // mock 模式（useMock=true）fetchCards 走 mockFixtures.getRecommendations 本地数据，无网络请求，
  // 故放行；真实模式保持原语义（游客放行 mock 预览、登录后带 token 拉真实数据）。
  if (!isCacheFresh("discover:data", DISCOVER_TTL_MS) && (getToken() || !sessionStore.isLoggedIn || useMock())) {
    void discoverStore.fetchCards().then(() => {
      // MP-R2-PAGES-DISCOVER-INDEX-003：仅成功写缓存——原实现 void 发起后同步写缓存，
      // 失败也标记新鲜 30s，切走再切回被缓存短路成「暂无推荐」空态且无重试
      if (!discoverStore.errorMessage) {
        setCachedValue("discover:data", true);
      }
    });
  }
  if (sessionStore.isLoggedIn) {
    void profileStore.load();
  }
}

/**
 * MP-R1-PAGES-DISCOVER-INDEX-002（2026-09-20）：错误横幅「重试」此前复用
 * loadDiscoverData，30s 缓存窗口内直接短路 → 点了没反应。现强制刷新：
 * 先清 discover:data 缓存再直调 fetchCards（失败回填 errorMessage、
 * 成功由 fetchCards 置空 errorMessage，均不向上抛错）。
 */
async function retryDiscover() {
  removeCache("discover:data");
  await discoverStore.fetchCards();
}

onLoad(() => {
  loadDiscoverData();
});

onShow(() => {
  discoverStore.resetDailyLimit();
  // MP-R2-PAGES-DISCOVER-INDEX-003：仅「即将重拉」（缓存不新鲜）时才清错误横幅——
  // 原实现无条件清空 + 缓存新鲜不重拉，网络失败被静默降级为「暂无推荐」空态
  if (!isCacheFresh("discover:data", DISCOVER_TTL_MS)) {
    // R5(INDEP-005)：清除上一会话残留的陈旧错误横幅（即将重拉，横幅语义已失效）
    discoverStore.errorMessage = null;
    loadDiscoverData();
  }
});

watch(
  () => sessionStore.isLoggedIn,
  () => loadDiscoverData()
);

onUnload(() => {
  discoverStore.dispose();
});
</script>

<template>
  <view class="match-page" :style="menuStyleVars">
    <!-- 顶部导航栏：寻觅♥ + 推荐/附近分段 + 筛选 -->
    <view class="discover-header">
      <view class="discover-header__top">
        <view class="discover-header__titles">
          <text class="discover-header__title">{{ t('discover.title') }}</text>
          <image class="discover-header__heart" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
        </view>
        <view
          class="discover-header__filter"
          hover-class="discover-header__filter--pressed"
          hover-stay-time="40"
          role="button"
          :aria-label="t('discover.filter')"
          @tap="discoverStore.openFilterDrawer()"
        >
          <image class="discover-header__filter-icon" :src="IMAGE_PATHS.ICONS_V2.SLIDERS" mode="aspectFit" alt="" />
        </view>
      </view>
      <view class="discover-header__tabs">
        <view
          class="discover-header__tab press-feedback"
          :class="{ 'discover-header__tab--active': activeMode === 'recommend' }"
          hover-class="press-feedback--active"
          hover-stay-time="40"
          role="tab"
          :aria-selected="activeMode === 'recommend' ? 'true' : 'false'"
          :aria-label="t('discover.recommend')"
          @tap="switchDiscoverMode('recommend')"
        >
          <text class="discover-header__tab-text" :class="{ 'discover-header__tab-text--active': activeMode === 'recommend' }">{{ t('discover.recommend') }}</text>
          <view v-if="activeMode === 'recommend'" class="discover-header__tab-line" />
        </view>
        <view
          class="discover-header__tab press-feedback"
          :class="{ 'discover-header__tab--active': activeMode === 'nearby' }"
          hover-class="press-feedback--active"
          hover-stay-time="40"
          role="tab"
          :aria-selected="activeMode === 'nearby' ? 'true' : 'false'"
          :aria-label="t('discover.nearby')"
          @tap="switchDiscoverMode('nearby')"
        >
          <text class="discover-header__tab-text" :class="{ 'discover-header__tab-text--active': activeMode === 'nearby' }">{{ t('discover.nearby') }}</text>
          <view v-if="activeMode === 'nearby'" class="discover-header__tab-line" />
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="match-scroll" :show-scrollbar="false" :scroll-top="scrollTop">
      <view v-if="errorMessage" class="match-error">
        <text class="match-error__text">{{ errorMessage }}</text>
        <text class="match-error__retry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('common.retry')" @tap="retryDiscover">
          {{ t('discover.errorRetry') }}
        </text>
      </view>

      <view v-if="!isMatchOpen" class="match-state">
        <EmptyState type="no-data" :image="IMAGE_PATHS.ICONS_COMMON.HEART" :message="t('discover.matchClosed')" />
      </view>

      <view v-else-if="loading && cards.length === 0" class="match-state">
        <Skeleton variant="card" :count="1" />
      </view>

      <view v-else-if="visibleCards.length === 0" class="match-state">
        <EmptyState
          :type="errorMessage ? 'network' : 'no-data'"
          :image="errorMessage ? '' : IMAGE_PATHS.ICONS_COMMON.HEART"
          mascot="sad"
          :message="emptyMessage"
        />
      </view>

      <template v-else>
        <!-- MP-R1-PAGES-DISCOVER-INDEX-REQ-03：前置配额告知——原实现本页任何位置不渲染
             discoverStore.remainingCount，用户只在点「喜欢/打招呼」被 Toast 拒绝后才得知
             次数用尽（exec-results DC24）。文案复用既有 i18n key discover.remainingToday
             （zh-CN.ts:947「今日剩余 {n} 次」/ en-US.ts:829），未新增键。
             超级测试账号旁路（SUPER_TEST_UNLIMITED_REMAINING=999，constants.ts:97）按实值渲染。
             游客不渲染：未登录点喜欢会被 requireLogin 拦下、viewedCards 永不增长，
             常驻数字会变成静态假配额。 -->
        <view v-if="sessionStore.isLoggedIn" class="discover-quota">
          <view class="discover-quota__pill">
            <text class="discover-quota__text">{{ t('discover.remainingToday', { n: remainingCount }) }}</text>
          </view>
        </view>

        <view class="match-card-area">
          <MatchCard
            v-if="currentUser"
            :user="currentUser"
            @card-tap="handleCardTap"
            @swipe-left="handleSwipeLeft"
            @swipe-right="handleLike"
          />
        </view>

        <MatchActions
          :busy="loading"
          @pass="handleSwipeLeft"
          @like="handleLike"
          @super-like="handleSuperLike"
        />

      </template>
    </scroll-view>

    <!-- 未登录时：底部登录提示（不拦截全屏，卡片可预览） -->
    <view v-if="!sessionStore.isLoggedIn" class="discover-login-hint press-feedback" hover-class="press-feedback--active" hover-stay-time="40" @tap="goLogin">
      <text class="discover-login-hint__text">{{ t('discover.loginHint') }}</text>
    </view>

    <FilterDrawer
      v-model:visible="discoverStore.isFilterDrawerOpen"
      :filter="discoverStore.recommendationFilter"
      @apply="discoverStore.setRecommendationFilter"
      @reset="discoverStore.resetFilter"
    />
  </view>
</template>

<style scoped lang="scss">
.match-page {
  flex-direction: column;
  display: flex;
  height: 100vh;
  /* 2026-09-06 背景统一：寻觅页改纯白，与理想图（寻觅匹配卡片页面）及他人主页一致 */
  background: var(--c-neutral-0, #ffffff);
  padding-top: calc(var(--statusbar, env(safe-area-inset-top)) + 20px);
  /* MP-R2-PAGES-DISCOVER-INDEX-002：底部避让对齐 custom-tab-bar 实高（content-box 下
     实高 184rpx + 2×safe）+ 中央「寻觅」浮岛越出量 48rpx——原 112rpx+16rpx+safe 使
     MatchActions 三键标签与「喜欢」圆钮下缘滚动到底时被 tabBar 半透明白层遮盖 */
  padding-bottom: calc(232rpx + 48rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.match-scroll {
  flex: 1;
  min-height: 0;
}

.match-error {
  margin: 0 32rpx 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：错误横幅底色走既有粉底 token（原裸写 #fff0f0） */
  background: var(--c-tag-pink-bg, #FFF0F6);
}

.match-error__text {
  flex: 1;
  font-size: 24rpx;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：正文取最接近的既有深粉 token --c-romance-700（原裸写 #c34a5f，
     与 token 值 #CC4A5F 仅 R 通道相差 9，观感一致）；同块 .match-error__retry 已走 --c-status-error */
  color: var(--c-romance-700, #CC4A5F);
}

.match-error__retry {
  font-size: 24rpx;
  color: var(--c-status-error);
  font-weight: 700;
}

.match-state {
  padding: 32rpx;
}

.discover-header {
  flex-shrink: 0;
  padding: 24rpx 32rpx 16rpx;
  background: var(--c-bg-container, #ffffff);
}

.discover-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* R20：--capsule-right 仅≈7px，需加胶囊本体宽度避免筛选按钮被胶囊叠压 */
  padding-right: calc(var(--capsule-right, 7px) + 104px);
}

.discover-header__titles {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.discover-header__title {
  font-size: 48rpx;
  font-weight: 700;
  color: var(--c-text-primary, #333A37);
  line-height: 1.1;
}

.discover-header__heart {
  width: 34rpx;
  height: 34rpx;
  margin-left: 4rpx;
  /* R1-DISCOVER-INDEX-011：此规则作用于 discover-header__heart（<image> 元素），
     爱心填色已烘焙在 heart-filled.svg 的 fill 属性中，CSS color 对图片资源不生效，
     属无效声明，故删除而非令牌化 */
}

.discover-header__filter {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--c-bg-container, #ffffff);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.discover-header__filter--pressed {
  opacity: 0.7;
}

.discover-header__filter-icon {
  width: 32rpx;
  height: 32rpx;
}

.discover-header__tabs {
  display: flex;
  gap: 48rpx;
  margin-top: 16rpx;
}

.discover-header__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 4rpx;
}

.discover-header__tab-text {
  font-size: 36rpx;
  color: var(--c-text-tertiary, #9AA39F);
  font-weight: 500;
  line-height: 1.2;
}

.discover-header__tab-line {
  width: 48rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: var(--c-romance-500);
  margin-top: 8rpx;
}

.discover-header__tab-text--active {
  color: var(--c-text-primary, #222222);
  font-weight: 700;
}

.match-card-area {
  margin: 0 40rpx;
  /* MP-R1-PAGES-DISCOVER-INDEX-REQ-04：卡高原为固定 880rpx —— 375×820 实拍上仅占视口 53.9%，
     低于理想基线「沉浸式大图卡 ≥70% 视口」。改为视口比例 + 双兜底：
     70vh 让卡高随屏放大；min-height 860rpx 兜住矮屏（与 CardSwiper .card-area 同策略，
     宿主节点被 MatchCard 以 height:100% 消费，不可用 flex:1 —— 本节点位于 scroll-view 内，
     flex 上下文不成立会塌陷为 0）；max-height 取 1400rpx（≈700px，仅防超宽/桌面 H5 端把
     卡拉成条，手机段 70vh 恒不触顶，≥70% 视口不被反向掐掉）。卡内 info/徽章均绝对定位贴底，
     增高只多露照片，不破构图。 */
  height: 70vh;
  min-height: 860rpx;
  max-height: 1400rpx;
}

/* MP-R1-PAGES-DISCOVER-INDEX-REQ-03：配额提示行（居中轻量胶囊，色板对齐 MatchCountChip） */
.discover-quota {
  display: flex;
  justify-content: center;
  margin: 0 40rpx var(--sp-3, 12rpx);
}

.discover-quota__pill {
  display: flex;
  align-items: center;
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--r-xxl);
  background: var(--c-brand-50, #E8FAF3);
  border: 1rpx solid var(--c-brand-200, #A3EBCF);
}

.discover-quota__text {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-brand-500, #36C99A);
}

.discover-login-hint {
  position: fixed;
  /* MP-R1-PAGES-DISCOVER-INDEX-003（2026-09-20）：原 bottom:120rpx 低于自定义 tabBar
     总高（--tab-bar-h=160rpx + 中央浮岛 ~180rpx + 安全区），胶囊被 tabBar 原生层完全遮挡。
     改为 tabBar(160rpx) + 浮岛越出余量(80rpx) + 安全区，真机在 tabBar 上方完整可点。 */
  /* MP-R2-PAGES-DISCOVER-INDEX-001：再抬高避开 tabBar 中央「寻觅」凸起浮岛——
     浮岛 icon-wrap 越出 bar 顶 40rpx（custom-tab-bar/index.wxss:95-114），原 80rpx
     余量与浮岛带残余重叠约 26pt（胶囊与浮岛同为绿色居中元素，观感叠置） */
  bottom: calc(var(--tab-bar-h, 160rpx) + 128rpx + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 40rpx;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：渐变第二色与阴影改走品牌绿系 token
     （原裸写 #4DD0A8 / rgba(54,201,154,.35)；--c-brand-400=#55D5A7 与 --s-float-btn
     的几何/色值与原写法同档，登录提示本就是悬浮胶囊 CTA） */
  background: linear-gradient(135deg, var(--c-brand, #36C99A), var(--c-brand-400, #55D5A7));
  border-radius: 999rpx;
  box-shadow: var(--s-float-btn, 0 8rpx 32rpx rgba(54, 201, 154, 0.32));
  z-index: 100;
}

.discover-login-hint__text {
  font-size: 28rpx;
  color: var(--c-neutral-0, #ffffff);
  font-weight: 600;
}

</style>
