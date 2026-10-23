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

/* R2b-L01-D04（需新建 P2）：页头右侧第二行「收藏」入口——理想图《寻觅匹配卡片页面》
   在漏斗筛选键正下方另有一枚描边心形收藏入口（上下两列）。目标功能为「已喜欢列表」，
   复用既有 ROUTES.PROFILE.FAVORITES（constants/routes.ts:124，页面 subpackages/profile-extra/
   profile/favorites.vue 已存在），描边心形图标取 IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE
   （static/assets/icons/heart.svg，已确认落盘）。 */
function goFavorites() {
  openAppPath(ROUTES.PROFILE.FAVORITES);
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
        <!-- R14-B18（R14-L01-D05）：筛选是全页唯一筛选出口（FilterDrawer 只由本钮 :263
             openFilterDrawer 打开，页内无其它筛选入口），属"必点控件"，热区须 ≥88rpx。
             原实体圆钮 72×72rpx（=36px）低于口径。修法沿用 register/index.vue .agree__hit
             的热区口径：外层 .discover-header__filter-hit 补 padding 8rpx 使热区达
             72+8+8=88rpx，等值负 margin 回拉保证可见圆钮像素位置不变；tap/hover/aria
             移到热区层。视觉 72rpx 圆钮（背景/阴影/圆角/图标）保持原样。 -->
        <view
          class="discover-header__filter-hit"
          hover-class="discover-header__filter--pressed"
          hover-stay-time="40"
          role="button"
          :aria-label="t('discover.filter')"
          @tap="discoverStore.openFilterDrawer()"
        >
          <view class="discover-header__filter">
            <image class="discover-header__filter-icon" :src="IMAGE_PATHS.ICONS_V2.SLIDERS" mode="aspectFit" alt="" />
          </view>
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
        <!-- R2b-L01-D04：右侧第二行收藏入口（描边心形），margin-left:auto 推到行末，
             与第一行漏斗筛选键上下成列 -->
        <view
          class="discover-header__fav"
          hover-class="discover-header__fav--pressed"
          hover-stay-time="40"
          role="button"
          :aria-label="t('discover.collect')"
          @tap="goFavorites"
        >
          <image class="discover-header__fav-icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_OUTLINE" mode="aspectFit" alt="" />
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
      </template>
    </scroll-view>

    <!-- R1-B23（R1-L01-D01，P0 主 CTA 不可见）：三键整行从 scroll-view 内移到页面级停靠层。
         原结构下 .match-card-area 的 70vh（实拍 606px）已超出 scroll 视口实高（≈500px），
         MatchActions（128rpx 圆钮 + 标签 + 32rpx 上内边距 ≈105px）整行落在 scroll 内容末尾，
         滚到底也只剩卡片下缘与 tabBar 之间约 17px，跳过/打个招呼/喜欢 三键不可见也不可点。
         停靠后与理想图一致：三键恒定居于卡片与 tabBar 之间，不随卡片滚动。
         v-if 与原 scroll-view 内 v-else 分支等价（loading 且 cards 为空时
         visibleCards.length 必为 0，故无需再判 loading），事件与 props 一字未改。 -->
    <view v-if="isMatchOpen && visibleCards.length > 0" class="match-actions-dock">
      <MatchActions
        :busy="loading"
        @pass="handleSwipeLeft"
        @like="handleLike"
        @super-like="handleSuperLike"
      />
    </view>

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
     MatchActions 三键标签与「喜欢」圆钮下缘滚动到底时被 tabBar 半透明白层遮盖。
     MP-R2-PAGES-DISCOVER-INDEX-014：把"实高"换成 token，别再靠手算——
     原写法 232rpx+48rpx+safe 把浮岛越出量数了两遍（232 里已含 48），而安全区只让了一遍，
     净结果是比真实遮挡少 20rpx（按 safe=34px≈68rpx 计），总高与两倍安全区都由
     --tab-bar-total-h 单点定义（theme/design-variables.scss，源头是 custom-tab-bar/index.wxss:14-19） */
  padding-bottom: calc(var(--tab-bar-total-h, 184rpx + env(safe-area-inset-bottom) + env(safe-area-inset-bottom)) + 48rpx);
  box-sizing: border-box;
}

.match-scroll {
  flex: 1;
  min-height: 0;
}

/* R1-B23（R1-L01-D01）：三键停靠层——列向 flex 的固定尾节点，
   与 .match-page 的 padding-bottom（--tab-bar-total-h + 48rpx 浮岛越出量）之间不再被 tabBar 原生层压住 */
.match-actions-dock {
  flex-shrink: 0;
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
  /* R1-B23（R1-L01-D08）：左基线单点化——页头原裸写 32rpx，卡片区/配额行裸写 40rpx，
     同列上下错位 8rpx（≈4px）。三处一并收敛到 var(--page-padding)（design-variables.scss:546 = 32rpx）。 */
  padding: 24rpx var(--page-padding, 32rpx) 16rpx;
  background: var(--c-bg-container, #ffffff);
}

.discover-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* R1-B23（R1-L01-D05）：删掉整行的 padding-right: calc(var(--capsule-right) + 104px)。
     该避让量把标题行整体左推约一个按钮宽，筛选钮中心落在 x≈250/400（屏宽 62%）、
     距右缘约 150px，与理想图「筛选钮贴屏幕右缘、与标题同一水平线」不符。
     胶囊避让改由 .discover-header__filter 自身的 margin-right 承担（见下）。 */
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

/* R14-B18（R14-L01-D05）：透明热区层。padding 8rpx ⇒ 热区 88×88rpx（72+8+8），
   满足"必点控件 ≥88rpx"最小可点件口径；四向等值负 margin 把 padding 撑出的 16rpx
   回拉，故 flex 行内圆钮占位、可见圆钮像素位置与改前完全一致。
   胶囊避让量（原写在 .discover-header__filter 的 margin-right）改由本层承担，
   并扣掉 padding 的 8rpx（calc(--capsule-right - 8rpx)），
   使热区 padding-box 右缘 = 原圆钮右缘 + 8rpx、圆钮右缘回落原值 ⇒ 逐像素不变。
   hover-class 的 opacity 压在本层，整棵子树（含圆钮）随按淡化，观感与原实现一致。 */
.discover-header__filter-hit {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 8rpx;
  margin: -8rpx calc(var(--capsule-right, 7px) - 8rpx) -8rpx -8rpx;
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
  /* R1-B23（R1-L01-D05）：胶囊避让量原落在此钮 margin-right。R14-L01-D05 把热区
     外包到 .discover-header__filter-hit 后，避让量随之上移到热区层（见上），本钮
     只保留 72rpx 视觉圆（背景/阴影/圆角/居中图标），不再自持 margin-right。
     残余 3px 上缘交叠说明仍适用：落点在圆钮顶部弧带，图标与点击中心不受影响。 */
}

.discover-header__filter--pressed {
  opacity: 0.7;
}

.discover-header__filter-icon {
  width: 32rpx;
  height: 32rpx;
}

/* R2b-L01-D04：右侧第二行收藏入口（描边心形）。margin-left:auto 推到 tabs 行末，
   margin-right 与第一行筛选键同用 --capsule-right 使两枚上下成列、右缘对齐；
   描边心形走既有 --c-text-secondary（heart.svg 为 currentColor 线性描边，非烘焙填充） */
.discover-header__fav {
  margin-left: auto;
  margin-right: var(--capsule-right, 7px);
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--c-bg-container, #ffffff);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.discover-header__fav--pressed {
  opacity: 0.7;
}

.discover-header__fav-icon {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-secondary, #4A524E);
}

.discover-header__tabs {
  display: flex;
  /* R2b-L01-D04：加入右侧收藏按钮（72rpx 高于 tab 文本）后需显式纵向居中，避免 stretch 拉高 tab */
  align-items: center;
  /* R2b-L01-D03（间距 P2）：原 gap:48rpx 使「推荐/附近」紧贴成左端一小簇（中心≈12%/32%），
     右侧 2/3 空白，与理想图两标签中心≈18%/47% 的分栏节奏不符。按卡建议提到 150rpx。 */
  gap: 150rpx;
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
  /* R1-B23（R1-L01-D07，可达性）：未选中态原取 --c-text-tertiary，兜底字面量 #9AA39F
     与 --c-text-quaternary 同值，压白底实测对比度 ≈2.6:1（36rpx/500 非大字号，低于 WCAG AA 4.5:1），
     真机上「附近」发虚。改用 --c-text-secondary（#4A524E，≈8:1；即便变量未注入，
     兜底字面量本身也已过 AA），选中层级差继续由 font-weight（500 → 700）与下划线承担。 */
  color: var(--c-text-secondary, #4A524E);
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
  /* R1-B23（R1-L01-D08）：40rpx → var(--page-padding)，与页头/配额行同一条左基线 */
  margin: 0 var(--page-padding, 32rpx);
  /* R2b-L01-D05（尺寸比例 P0）：卡高按 scroll 视口实高反推。
     上一轮（R1-B23）把 MatchActions 移出 scroll-view 成页面级 .match-actions-dock 后，
     scroll 视口被 dock + tabBar 让出约 254rpx，而卡高仍是「70vh + min-height:860rpx」——
     实拍 top/bottom 帧逐像素相同（页面滚不动），卡在 y≈513 处被平切、只露人脸上半部，
     .match-card__info 与 92% 匹配度环（MatchCard.vue 绝对定位贴底）整块落在视口外永不可见。
     改为 100vh 减去本页全部固定占位：状态栏 + 页头 padding-top(20px) + 页头(≈170rpx)
     + 三键 dock(≈206rpx) + 配额行预留(≈64rpx) + tabBar(--tab-bar-total-h) + 越出余量(48rpx)，
     并删掉 860rpx min-height（正是它把卡顶到超出视口）。max-height 仅防超宽端把卡拉长。
     结果卡高≈视口实高，info 区与匹配度环在首屏可见。 */
  height: calc(
    100vh
    - var(--statusbar, env(safe-area-inset-top))
    - 20px
    - 170rpx
    - 206rpx
    - 64rpx
    - var(--tab-bar-total-h, 184rpx + env(safe-area-inset-bottom) + env(safe-area-inset-bottom))
    - 48rpx
  );
  max-height: 1400rpx;
}

/* MP-R1-PAGES-DISCOVER-INDEX-REQ-03：配额提示行（居中轻量胶囊，色板对齐 MatchCountChip） */
.discover-quota {
  display: flex;
  justify-content: center;
  /* R1-B23（R1-L01-D08）：40rpx → var(--page-padding)，与页头/卡片区同一条左基线 */
  margin: 0 var(--page-padding, 32rpx) var(--sp-3, 12rpx);
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
  /* R2b-L01-D01（层级遮挡 P1）：上一轮把 MatchActions 移到页面级 .match-actions-dock 后，
     本胶囊（原 bottom:tab-bar-h+128rpx）正好落在三键行正中，压住中间白色圆钮下半部并完全盖掉
     其下方「打个招呼」标签（实拍只剩左右两键有标签）。再让出整条 MatchActions 行高（≈210rpx：
     32rpx 上内距 + 128rpx 钮 + 12rpx 间距 + 28rpx 标签 + 8rpx 下内距），使提示条落在三键停靠层之上。 */
  bottom: calc(var(--tab-bar-h, 160rpx) + 128rpx + 210rpx + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 40rpx;
  /* MP-R1-PAGES-DISCOVER-INDEX-011：渐变第二色与阴影改走品牌绿系 token
     （原裸写 #4DD0A8 / rgba(54,201,154,.35)；--s-float-btn 的几何/色值与原写法同档，
     登录提示本就是悬浮胶囊 CTA） */
  /* R11-L01-D13（可达性 P1）：这条胶囊是游客在本页唯一的登录召唤，28rpx 白字压
     --c-brand→--c-brand-400 渐变，两端按 design-variables.scss 真值（$brand-500 #36C99A /
     $brand-400 #55D5A7）实算 2.11:1 与 1.83:1 ⇒ 字与底同明度档、五个字发糊。
     底收 --c-brand-800（$brand-800 #156B51，白字 6.45:1，任务书 §2 表里唯一"采用"档），
     与 login/index.vue .btn-primary(R10-L01-D02 已落同档)、register/success.vue 主 CTA 一致。
     本件是 discover 页局部提示胶囊、非 BottomActionBar 共享主 CTA ⇒ 不触 §11.3「共享渐变勿翻实色」。 */
  background: var(--c-brand-800, #156b51);
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
