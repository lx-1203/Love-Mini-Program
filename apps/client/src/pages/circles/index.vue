<script setup lang="ts">
/**
 * 兴趣圈列表页
 * 展示所有兴趣圈，支持加入/退出操作，点击进入话题列表
 */
import { computed, ref, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCircleStore } from "../../stores/circle";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
// infra R2-00102: 路由路径常量化
import { ROUTES } from "../../constants/routes";
import { IMAGE_PATHS } from "../../config/images";
import AppShell from "../../components/layout/AppShell.vue";
import PageStateContainer from "../../components/common/PageStateContainer.vue";
// 2026-08-15：未登录时不发受保护请求，避免冷启动 401 雪崩
import { getToken } from "../../services/http";
// 修复#3（第五轮 QA）：mock 模式无网络请求，直接加载本地 8 圈（dev-user 登录态可渲染）
import { useMock } from "../../stores/helpers/use-mock";

const { t } = useI18n();
const circleStore = useCircleStore();
const sessionStore = useSessionStore();
const { circles, loading, errorMessage } = storeToRefs(circleStore);

/**
 * Task B2：从圈子 Tab 兴趣分类宫格带入的 category 参数（study/sports/music/movie/travel/game/food/reading）。
 * 携带该参数时，页面标题展示对应兴趣分类名称。
 */
const category = ref("");

/** 分类 ID → i18n key 映射（与圈子 Tab 兴趣分类宫格保持一致） */
const CATEGORY_KEY_MAP: Record<string, string> = {
  study: "circle.catStudy",
  sports: "circle.catSports",
  music: "circle.catMusic",
  movie: "circle.catMovie",
  travel: "circle.catTravel",
  game: "circle.catGame",
  food: "circle.catFood",
  reading: "circle.catReading",
};

/**
 * 分类 ID → 圈子名称关键词（页面级过滤，review #21：category 参数不再只改标题）。
 * TODO(后端): 兴趣圈列表支持按分类服务端过滤后，改由后端查询并移除本映射。
 * R4-00098：en-US 下圈子名（后端返回）不命中中文关键词即回退全量，
 * 现补充 i18n 标签兜底匹配（当前 locale 的分类名），并移除"过滤不中即回退全量"。
 */
const CATEGORY_KEYWORDS: Record<string, string> = {
  study: "读书",
  sports: "运动",
  music: "音乐",
  movie: "电影",
  travel: "旅行",
  game: "游戏",
  food: "美食",
  reading: "读书",
};

onLoad((query) => {
  if (query?.category) {
    category.value = String(query.category);
  }
  // 修复#3（第五轮 QA）：onLoad 直接拉取兴趣圈列表。
  // 未登录时按既有逻辑跳过（getToken 为空且非 mock，避免 401 雪崩）；
  // mock 模式（useMock=true）无网络请求，直接加载本地 8 圈 Style A 封面，
  // 保证 dev-user/mock 登录态下列表可渲染（原 onMounted 的 token 守卫在
  // "已登录但无 token"的 mock 会话下会拦截，导致空态）。
  if (getToken() || useMock()) {
    void circleStore.fetchCircles();
  }
});

/**
 * 2026-08-25 P0：页面标题在自定义 header slot 中硬编码 "兴趣<under>趣</under>圈"，
 * 此处删除原 pageTitle computed（由 CATEGORY_KEY_MAP 派生，已不再被模板引用）。
 * category / CATEGORY_KEYWORDS 仍由 filteredCircles 消费，保留。
 */

/**
 * 按 category 过滤后的兴趣圈列表（review #21：category 参数用于过滤而非仅改标题）。
 * R4-00098：匹配维度 = 中文关键词 ∪ 当前 locale 分类标签（en-US 下圈子名
 * 含 "Reading"/"Sports" 等英文名可命中）；无关键词映射的未知分类回退全量。
 * 有映射但无匹配时展示空列表（诚实过滤，不再静默回退全量误导用户）。
 */
const filteredCircles = computed(() => {
  if (!category.value) return circles.value;
  const keyword = CATEGORY_KEYWORDS[category.value];
  const labelKey = CATEGORY_KEY_MAP[category.value];
  if (!keyword && !labelKey) return circles.value;
  const label = labelKey ? t(labelKey) : "";
  const matched = circles.value.filter((c) => {
    if (keyword && c.name.includes(keyword)) return true;
    if (label && c.name.includes(label)) return true;
    // 圈子名同时含分类 ID 时也命中（如后端返回 "Reading Club"）
    if (c.name.toLowerCase().includes(category.value)) return true;
    return false;
  });
  return matched;
});

/**
 * 页面统一状态映射
 * - loading（且列表为空）→ loading
 * - errorMessage（且列表为空）→ error
 * - 列表为空 → empty
 * - 其他 → content
 */
const pageState = computed<"loading" | "error" | "empty" | "content">(() => {
  if (loading.value && circles.value.length === 0) return "loading";
  if (errorMessage.value && circles.value.length === 0) return "error";
  if (circles.value.length === 0) return "empty";
  return "content";
});

/**
 * 错误态展示文案（复用 store 中的 errorMessage，缺失时回退到通用文案）
 */
const errorText = computed(() => errorMessage.value || t("circle.loadFailedRetry"));

/**
 * 重试：重新拉取兴趣圈列表
 */
function handleRetry() {
  void circleStore.fetchCircles();
}

/**
 * 点击兴趣圈，跳转到话题列表
 * @param circleId - 兴趣圈 ID
 */
function goToTopics(circle: { id: string; campusVerified?: boolean }) {
  // 校园认证圈：未完成校园认证时拦截并引导认证（收尾轮）
  if (circle.campusVerified) {
    const sessionStore = useSessionStore();
    if (!sessionStore.userSession?.campusName) {
      uni.showToast({ title: t("circle.campusVerifyRequired"), icon: "none" });
      return;
    }
  }
  openAppPath(`${ROUTES.CIRCLES.TOPICS}?circleId=${circle.id}`); // infra R2-00102
}

/**
 * 2026-08-25 P1：goToDiscover（附近的人快捷入口）随顶部卡片一并移除。
 * 若后续需要"附近的人"入口，请重新接入（规格书 14 无此模块）。
 */

/**
 * 加入/退出兴趣圈
 * @param circleId - 兴趣圈 ID
 * @param isJoined - 当前是否已加入
 */
async function toggleJoin(circleId: string, isJoined: boolean) {
  try {
    if (isJoined) {
      await circleStore.leaveCircle(circleId);
    } else {
      await circleStore.joinCircle(circleId);
    }
  } catch (_e) {
    // 修复 no-empty：catch 块不能为空，添加注释说明静默处理
    // 加入/退出圈子失败时忽略，由 store 内部已处理错误提示
  }
}

/**
 * 格式化成员数量
 */
function formatMemberCount(count: number): string {
  if (count >= 10000) {
    /* Task 28: 万单位中文化保留（中文特有数字单位，无需 i18n） */
    return `${(count / 10000).toFixed(1)}w`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

/** 兴趣圈名称 -> 封面图路径映射（摄影大图，统一 CIRCLE_COVERS） */
const CIRCLE_COVER = {
  photo: IMAGE_PATHS.CIRCLE_COVERS.PHOTO,
  travel: IMAGE_PATHS.CIRCLE_COVERS.TRAVEL,
  music: IMAGE_PATHS.CIRCLE_COVERS.MUSIC,
  food: IMAGE_PATHS.CIRCLE_COVERS.FOOD,
  sports: IMAGE_PATHS.CIRCLE_COVERS.SPORTS,
  reading: IMAGE_PATHS.CIRCLE_COVERS.READING,
  game: IMAGE_PATHS.CIRCLE_COVERS.GAME,
  pet: IMAGE_PATHS.CIRCLE_COVERS.PET,
  study: IMAGE_PATHS.CIRCLE_COVERS.STUDY,
  postgrad: IMAGE_PATHS.CIRCLE_COVERS.POSTGRAD,
  astronomy: IMAGE_PATHS.CIRCLE_COVERS.ASTRONOMY,
} as const;

/** 热门徽标阈值（成员数达到即显示「热门」） */
const HOT_THRESHOLD = 8000;

/** 2026-08-25 P0：快捷分类 tab（规格书 14.5） */
type QuickTab = "all" | "photo" | "travel" | "music" | "sports" | "food" | "more";
const QUICK_TABS: { key: QuickTab; label: string; keyword: string | null; iconSrc?: string }[] = [
  { key: "all", label: "全部", keyword: null },
  { key: "photo", label: "摄影", keyword: "摄影" },
  { key: "travel", label: "旅行", keyword: "旅行" },
  { key: "music", label: "音乐", keyword: "音乐" },
  { key: "sports", label: "运动", keyword: "运动" },
  { key: "food", label: "美食", keyword: "美食" },
  { key: "more", label: "更多", keyword: null, iconSrc: IMAGE_PATHS.ICONS_EMOJI.LIST },
];
const activeQuickTab = ref<QuickTab>("all");

/** 按 quick tab 过滤后的列表（与 category query 互不干扰） */
const tabFilteredCircles = computed(() => {
  if (activeQuickTab.value === "all" || activeQuickTab.value === "more") {
    return filteredCircles.value;
  }
  const tab = QUICK_TABS.find((t) => t.key === activeQuickTab.value);
  if (!tab?.keyword) return filteredCircles.value;
  return filteredCircles.value.filter((c) => (c.name || "").includes(tab.keyword!));
});

/**
 * 2026-08-25 P0：等 N 位朋友已加入的头像（基于 circle.id 哈希，规格书 14.6）
 */
const FRIEND_AVATAR_POOL = [
  IMAGE_PATHS.AVATARS.AVATAR_1,
  IMAGE_PATHS.AVATARS.AVATAR_2,
  IMAGE_PATHS.AVATARS.AVATAR_3,
  IMAGE_PATHS.AVATARS.AVATAR_4,
];
function friendAvatars(circleId: string): string[] {
  // 用 circleId 长度做简单取模，让同一圈子头像稳定
  const seed = circleId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return [FRIEND_AVATAR_POOL[seed % 4]!, FRIEND_AVATAR_POOL[(seed + 1) % 4]!, FRIEND_AVATAR_POOL[(seed + 2) % 4]!];
}
function friendJoinCount(circleId: string, _memberCount: number): number {
  // 基于 circleId 推导一个 5~12 之间的数字（_memberCount 保留以便后续接真实数据）
  const seed = circleId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 5 + (seed % 8);
}

/** 2026-08-25 P0：返回上一页（自定义 header slot 使用） */
function goBack() {
  uni.navigateBack({ delta: 1 }).catch(() => {
    uni.switchTab({ url: "/pages/home/index" }).catch(() => {
      uni.reLaunch({ url: "/pages/home/index" });
    });
  });
}

/** 2026-08-25 P0：点击搜索 → 跳搜索页（占位，规格书 14.4） */
function goSearch() {
  uni.showToast({ title: "搜索功能即将上线", icon: "none" });
}

function circleCover(name: string): string {
  const n = name || "";
  if (n.includes("摄影")) return CIRCLE_COVER.photo;
  if (n.includes("旅行")) return CIRCLE_COVER.travel;
  if (n.includes("音乐")) return CIRCLE_COVER.music;
  if (n.includes("美食") || n.includes("食")) return CIRCLE_COVER.food;
  if (n.includes("运动") || n.includes("篮球") || n.includes("健身") || n.includes("体育")) return CIRCLE_COVER.sports;
  if (n.includes("阅读") || n.includes("读书")) return CIRCLE_COVER.reading;
  if (n.includes("游戏") || n.includes("桌游")) return CIRCLE_COVER.game;
  if (n.includes("宠物") || n.includes("萌宠")) return CIRCLE_COVER.pet;
  if (n.includes("学习") || n.includes("搭子")) return CIRCLE_COVER.study;
  if (n.includes("考研") || n.includes("深造") || n.includes("学业")) return CIRCLE_COVER.postgrad;
  if (n.includes("天文") || n.includes("星空")) return CIRCLE_COVER.astronomy;
  return IMAGE_PATHS.CIRCLE_COVERS.DEFAULT;
}

// 修复#3（第五轮 QA）：拉取逻辑已移入 onLoad（含 mock 放行），
// 原 onMounted 的 token 守卫在 mock 会话下会拦截导致空态，已移除避免重复请求。

// 2026-08-15：登录态变化后自动补拉（真实模式登录成功后兜底）
watch(
  () => sessionStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn && circles.value.length === 0) {
      void circleStore.fetchCircles();
    }
  }
);

// R4-00099：toggleJoin 已改为 @tap.stop 绑定（vue-tsc 可识别），
// 保留 defineExpose 无副作用，避免将来模板绑定方式变化导致 noUnusedLocals。
defineExpose({ toggleJoin });
</script>

<template>
  <AppShell
    variant="standard"
    bg-variant="gradient"
    :show-back="false"
    :tab-bar-safe="false"
    :fixed="true"
  >
    <!-- 2026-08-25 P0：自定义头部（返回 + 标题"趣"下划线 + 搜索） -->
    <template #header>
      <view class="circles-header">
        <view
          class="circles-header__back press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('common.back')"
          @tap="goBack"
        >
          <text class="circles-header__back-icon">‹</text>
        </view>
        <text class="circles-header__title">兴<text class="circles-header__under">趣</text>圈</text>
      </view>
    </template>
    <template #header-right>
      <view
        class="circles-header__search press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="'搜索'"
        @tap="goSearch"
      >
        <image class="circles-header__search-icon" :src="IMAGE_PATHS.ICONS_COMMON.SEARCH" mode="aspectFit" alt="" />
      </view>
    </template>
    <!-- 统一页面状态容器：loading / error / empty / content 四态切换 -->
    <PageStateContainer
      :state="pageState"
      :empty-text="t('circle.circlesEmpty')"
      :error-text="errorText"
      @retry="handleRetry"
    >
      <template #default>
        <!-- 兴趣圈列表 -->
        <scroll-view class="circles-list" scroll-y :enhanced="true" :bounces="true" :show-scrollbar="false">
          <!-- 2026-08-25 P1：移除顶部"附近的人"绿色头部卡（规格书 14 无此模块，QA 反馈位置错误） -->

          <!-- 推荐提示 -->
          <view class="circles-banner">
            <image class="circles-banner__emoji" :src="IMAGE_PATHS.ICONS_EMOJI.SPARKLES" mode="aspectFit" alt="" />
            <view class="circles-banner__text-wrap">
              <text class="circles-banner__title">{{ t("circle.bannerTitle") }}</text>
              <text class="circles-banner__desc">{{ t("circle.bannerDesc") }}</text>
            </view>
          </view>

          <!-- 2026-08-25 P0：7 个快捷分类 tab（规格书 14.5） -->
          <scroll-view class="circles-tabs" scroll-x :show-scrollbar="false">
            <view class="circles-tabs__list">
              <view
                v-for="tab in QUICK_TABS"
                :key="tab.key"
                class="circles-tab"
                :class="{ 'circles-tab--active': activeQuickTab === tab.key }"
                role="tab"
                :aria-selected="activeQuickTab === tab.key ? 'true' : 'false'"
                @tap="activeQuickTab = tab.key"
              >
                <image v-if="tab.iconSrc" class="circles-tab__icon" :src="tab.iconSrc" mode="aspectFit" alt="" />
                <text v-else class="circles-tab__text">{{ tab.label }}</text>
              </view>
            </view>
          </scroll-view>

          <!-- 兴趣圈卡片 -->
          <view class="circles-card-list" role="list">
            <view
              v-for="(circle, index) in tabFilteredCircles" :key="circle.id"
              class="circle-card"
              :style="{ animationDelay: index * 60 + 'ms' }"
              @tap="goToTopics(circle)"
            >
              <view class="circle-card__cover-wrap">
                <image class="circle-card__cover" :src="circleCover(circle.name)" mode="aspectFill" lazy-load alt="" />
              </view>

              <view class="circle-card__body">
                <view class="circle-card__name-row">
                  <text class="circle-card__name">{{ circle.name }}</text>
                  <view v-if="circle.memberCount >= HOT_THRESHOLD" class="circle-card__hot-badge">
                    <text class="circle-card__hot-text">{{ t("circle.hotBadge") }}</text>
                  </view>
                </view>
                <text class="circle-card__desc">{{ circle.description }}</text>
                <view class="circle-card__meta">
                  <image class="circle-card__meta-icon" :src="IMAGE_PATHS.ICONS_EMOJI.GROUP" mode="aspectFit" alt="" />
                  <text class="circle-card__count">{{ formatMemberCount(circle.memberCount) }} 人加入 · {{ circle.topicCount }} 条动态</text>
                </view>
                <!-- 2026-08-25 P0：等 N 位朋友已加入 + 头像组（规格书 14.6） -->
                <view class="circle-card__friends">
                  <view class="circle-card__friends-avatars">
                    <image
                      v-for="(av, i) in friendAvatars(circle.id)"
                      :key="i"
                      class="circle-card__friends-avatar"
                      :src="av"
                      mode="aspectFill"
                      alt=""
                    />
                  </view>
                  <text class="circle-card__friends-text">等 {{ friendJoinCount(circle.id, circle.memberCount) }} 位朋友已加入</text>
                </view>
              </view>

              <!-- R4-00099：catchtap 在 H5 端不生效（点击"加入"会冒泡到卡片触发
                   goToTopics 进话题列表），改用 @tap.stop 阻止冒泡，全端一致 -->
              <view
                class="circle-card__action"
                :class="{ 'circle-card__action--joined': circle.isJoined }"
                role="button"
                :aria-label="circle.isJoined ? t('circle.joinedBtn') : t('circle.joinBtn')"
                @tap.stop="toggleJoin(circle.id, circle.isJoined)"
              >
                <text class="circle-card__action-text">
                  {{ circle.isJoined ? t("circle.joinedBtn") : t("circle.joinBtn") }}
                </text>
              </view>
            </view>
          </view>

          <view class="list-bottom-spacer" />
        </scroll-view>
      </template>
    </PageStateContainer>
  </AppShell>
</template>

<style scoped lang="scss">
/* ========== 加载/错误/空状态 ========== */
.circles-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
  padding: 80rpx 40rpx;
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid var(--c-border-default);
  border-top-color: var(--c-brand-500);
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: var(--fs-3xl);
  opacity: 0.6;
  color: var(--c-text-tertiary);
}

.circles-state__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
  text-align: center;
}

.circles-state__btn {
  padding: var(--sp-4) 48rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  box-shadow: var(--s-brand-md);
}

.circles-state__btn-text {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 600;
}

.circles-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: 120rpx 40rpx;
}

.circles-empty__icon {
  width: 88rpx;
  height: 88rpx;
  opacity: 0.6;
  color: var(--c-text-tertiary);
}

.circles-empty__title {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.circles-empty__desc {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

/* ========== 附近的人快捷入口（Task F1 / M-08 · F1.4 补充样式） ========== */
.discover-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: var(--sp-5) var(--sp-6) 0;
  padding: var(--sp-5) var(--sp-6);
  background: var(--c-gradient-brand);
  border-radius: var(--r-xl);
  box-shadow: var(--s-brand);
  animation: card-slide-up var(--d-bounce, 400ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.discover-entry__left {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex: 1;
  min-width: 0;
}

.discover-entry__icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-md);
  background: var(--c-overlay-bg-light, var(--c-overlay-bg-light, rgba(255, 255, 255, 0.2)));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.discover-entry__icon {
  width: 48rpx;
  height: 48rpx;
  color: var(--c-neutral-0);
}

.discover-entry__text-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  flex: 1;
  min-width: 0;
}

.discover-entry__title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-neutral-0);
}

.discover-entry__desc {
  font-size: var(--fs-sm);
  color: var(--c-overlay-text-secondary, var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85)));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discover-entry__arrow {
  font-size: var(--fs-4xl);
  color: var(--c-neutral-0);
  font-weight: 300;
  line-height: 1;
  flex-shrink: 0;
  margin-left: var(--sp-2);
}

/* ========== 推荐 Banner ========== */
.circles-banner {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  margin: var(--sp-6) var(--sp-6) 0;
  padding: var(--sp-7);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  border-radius: var(--r-lg);
  animation: card-slide-up var(--d-bounce, 400ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.circles-banner__emoji {
  width: 56rpx;
  height: 56rpx;
  color: var(--c-brand-500);
  flex-shrink: 0;
}

.circles-banner__text-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.circles-banner__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.circles-banner__desc {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== 兴趣圈列表 ========== */
.circles-list {
  flex: 1;
  overflow-y: auto;
}

.circles-card-list {
  padding: var(--sp-5) var(--sp-6) 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

@keyframes card-slide-up {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.circle-card {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-6) var(--sp-7);
  background: var(--c-neutral-0);
  border-radius: var(--r-lg);
  box-shadow: var(--s-card-soft);
  animation: card-slide-up var(--d-bounce, 400ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transition: transform var(--d-normal, 200ms) ease;
}

/* #ifdef H5 */
.circle-card:active {
  transform: scale(0.98);
}
/* #endif */

.circle-card__cover-wrap {
  position: relative;
  width: 180rpx;
  height: 160rpx;
  border-radius: var(--r-md);
  overflow: hidden;
  flex-shrink: 0;
}

.circle-card__cover {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.circle-card__hot-badge {
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 77, 92, 0.92);
  flex-shrink: 0;
}

.circle-card__hot-text {
  font-size: var(--fs-xs, 22rpx);
  color: #FFFFFF;
  font-weight: 600;
}

.circle-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.circle-card__name {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 收尾轮：校园认证徽标 */
.circle-card__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}

.circle-card__name-row .circle-card__name {
  flex: 1;
  min-width: 0;
}

.circle-card__badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: var(--c-tint-green-soft, #E8F7EF);
  flex-shrink: 0;
}

.circle-card__badge-icon {
  width: 24rpx;
  height: 24rpx;
}

.circle-card__badge-text {
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-brand-700, #15803D);
  font-weight: 500;
}

.circle-card__desc {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.circle-card__meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.circle-card__meta-icon {
  width: 24rpx;
  height: 24rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.circle-card__count {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.circle-card__divider {
  font-size: var(--fs-sm);
  color: var(--c-border-default);
}

.circle-card__action {
  padding: var(--sp-3) var(--sp-7);
  border-radius: var(--r-full);
  background: #FFFFFF;
  border: 2rpx solid var(--c-brand-500, #2DB98A);
  color: var(--c-brand-500, #2DB98A);
  flex-shrink: 0;
  transition: all var(--d-normal, 200ms) ease;
}

/* #ifdef H5 */
.circle-card__action:active {
  transform: scale(0.95);
}
/* #endif */

.circle-card__action--joined {
  background: var(--c-tint-green-soft, #E8F7EF);
  border-color: var(--c-brand-light, #D1F5E7);
  color: var(--c-text-tertiary);
}

.circle-card__action-text {
  font-size: var(--fs-md);
  color: inherit;
  font-weight: 600;
  white-space: nowrap;
}

.circle-card__action--joined .circle-card__action-text {
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.list-bottom-spacer {
  height: 60rpx;
}

/* ===== 2026-08-25 P0：自定义头部（兴趣<under>趣</under>圈 + 搜索） ===== */
.circles-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.circles-header__back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.circles-header__back-icon {
  font-size: 44rpx;
  color: #333A37;
  line-height: 1;
  font-weight: 500;
}

.circles-header__title {
  font-size: 44rpx;
  font-weight: 800;
  color: var(--c-text-primary, #1A1E1C);
  letter-spacing: 2rpx;
}

.circles-header__under {
  /* 2026-08-26 P1：V-06 趣下划线视觉重叠修复（P2 残留二次调优）。
     收窄下划线（6rpx → 3rpx）避免与"趣"字底画重叠；
     增加 padding-bottom 给下划线留出"漂浮"空间；
     字重 800 → 600 让"趣"字底部留白更清晰，避免与下划线连笔；
     第五轮 V-06：字距 0 → 2rpx + 左右 padding 2rpx，与"兴/圈"整体字距更协调。 */
  display: inline-block;
  border-bottom: 3rpx solid #36C99A;
  padding: 0 2rpx 8rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.circles-header__search {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--c-bg-surface, #F7FAF9);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.circles-header__search-icon {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-tertiary, #6B7571);
}

/* ===== 2026-08-25 P0：7 个快捷分类 tab ===== */
.circles-tabs {
  width: 100%;
  padding: 0 var(--sp-6);
  margin-top: var(--sp-2);
}

.circles-tabs__list {
  display: inline-flex;
  gap: 16rpx;
  padding-right: 16rpx;
}

.circles-tab {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.circles-tab--active {
  background: var(--c-bg-brand, #E8F8F1);
  border-color: var(--c-brand, #36C99A);
}

.circles-tab__text {
  font-size: 26rpx;
  color: var(--c-text-primary, #222222);
  white-space: nowrap;
}

.circles-tab__icon {
  width: 30rpx;
  height: 30rpx;
  color: var(--c-text-primary, #222222);
}

.circles-tab--active .circles-tab__text {
  color: var(--c-brand, #36C99A);
  font-weight: 700;
}

/* ===== 2026-08-25 P0：等 N 位朋友已加入 + 头像组 ===== */
.circle-card__friends {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 6rpx;
}

.circle-card__friends-avatars {
  display: flex;
  align-items: center;
}

.circle-card__friends-avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #FFFFFF;
  background: #EEF2F0;
  margin-left: -10rpx;
  flex-shrink: 0;
}

.circle-card__friends-avatar:first-child {
  margin-left: 0;
}

.circle-card__friends-text {
  font-size: 22rpx;
  color: var(--c-text-tertiary, #9AA39F);
}
</style>
