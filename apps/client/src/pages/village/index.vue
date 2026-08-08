<script setup lang="ts">
/**
 * 村口页 - UGC社区（Phase Feedback4：三 Tab 版 关注/同城/发现）
 * 用户生成内容社区，支持三 Tab 筛选、城市切换、点赞关注等互动功能
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { onLoad, onHide, onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
// 修复 no-duplicate-imports：合并 ../../stores/village 的重复 import
import { useVillageStore, MINE_CATEGORY_ID, formatRelativeTime, type PostItem, type PostFilters, type PostAuthor } from "../../stores/village";
import { useSessionStore } from "../../stores/session";
import { useDailyQuestionStore } from "../../stores/daily-question";
import { openAppPath, consumeTabQuery } from "../../utils/navigation";
import { useTabBar } from "../../composables/useTabBar";
import LockScreen from "../../components/common/LockScreen.vue";
import { usePageAccess } from "../../composables/usePageAccess";
import { villagePageRequirements } from "../../config/page-access";
// Phase Feedback4：同城 Tab 功能开关（false 时隐藏城市选择器，退化为全量同城流）
import Skeleton from "../../components/common/Skeleton.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import SafeImage from "../../components/common/SafeImage.vue";
import { IMAGE_PATHS } from "../../config/images";
// SubTask 5.5.2：列表页图片 @error 占位图通用方案
import { useImageFallback } from "../../composables/useImageFallback";
import BaseTabs from "../../components/common/BaseTabs.vue";
import GlobalPublishFab from "../../components/common/GlobalPublishFab.vue";
// 2026-08-07 设计稿：发现 Tab「热门话题」模块（主话题大卡 + 四宫格）
import HotTopicsSection from "../../components/village/HotTopicsSection.vue";
import { showErrorToast } from "../../utils/error-toast";
// Phase Feedback3 P2.5：同城 Tab IP 定位（后端 /api/v1/location/ip-city）
import { request } from "../../services/http";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../utils/media";

/* ========== Stores ========== */
const { t } = useI18n();
const villageStore = useVillageStore();
const sessionStore = useSessionStore();
// 2026-08-08：每日一问入口自寻觅页迁入圈子页（社区话题场景），文案轻量展示
const dailyQuestionStore = useDailyQuestionStore();

// Phase 4 任务 20：接入页面访问守卫
usePageAccess(villagePageRequirements);
// 修复（严格模式 noUnusedLocals）：categories 从 storeToRefs 解构后未引用（页面使用 BaseTabs 的 items 而非 store categories），已移除。
const { loading, errorMessage, hasMore } = storeToRefs(villageStore);

// 同步自定义 TabBar 选中状态（圈子 = 索引 1）
useTabBar(2);

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
 * Phase Feedback4：发现 Tab 二级子标签（设计需求：校友/老乡/搭子圈，默认选中「校友」）。
 * - 校友：同校帖子（isAlumni / campusName 匹配），默认优先
 * - 老乡：同乡标签（hometown 标签）
 * - 搭子圈：基于个人标签相似度（buddy 标签）
 */
const DISCOVER_SUB_TABS = computed(() => [
  { id: "discover-alumni", name: t("village.discoverAlumni"), backendKey: "alumni" },
  { id: "discover-hometown", name: t("village.discoverHometown"), backendKey: "hometown" },
  { id: "discover-buddy", name: t("village.discoverBuddy"), backendKey: "buddy" },
]);

/** 当前发现 Tab 选中的子标签（设计需求：默认选中「校友」） */
const selectedDiscoverSubTab = ref<string>("discover-alumni");

/** Phase Feedback4：同城 Tab 当前城市（默认从 session 校区城市推断，可手动切换） */
const sameCityName = ref<string>("");

/**
 * 可切换的城市列表（基础池）。
 * 与 mock 帖子 city 字段保持一致（南京/杭州/上海/成都），避免切换后空列表；
 * Phase Feedback3 P2.5：接入 IP 定位后，检测到的城市会动态并入选项。
 */
const SAME_CITY_OPTIONS_BASE = ["南京", "杭州", "上海", "成都"];

/**
 * Phase Feedback3 P2.5：动态城市选项 = 基础池 ∪ 当前定位城市（去重）。
 * 避免 IP 定位到池外城市时切换器选不到当前城市。
 */
const SAME_CITY_OPTIONS = computed(() => {
  if (sameCityName.value && !SAME_CITY_OPTIONS_BASE.includes(sameCityName.value)) {
    return [...SAME_CITY_OPTIONS_BASE, sameCityName.value];
  }
  return SAME_CITY_OPTIONS_BASE;
});

/** 是否显示城市切换器 */
const showCityPicker = ref(false);

/** infra R2-00071: 单帖最大图片数（与 stores/village/constants.ts 的 MAX_IMAGES_COUNT 保持一致） */
const MAX_POST_IMAGES = 9;

/**
 * Phase Feedback3 P2.5：初始化同城城市。
 *
 * 优先级（P2.7 增强：定位权限）：
 * 1. 手机定位（uni.getLocation，需用户授权，精确到城市）→ 城市名；
 *    用户拒绝授权时静默回退，不弹强提醒（可在城市选择器手动改）
 * 2. 后端 IP 归属定位（/api/v1/location/ip-city）→ 城市名
 * 3. session 校区城市 → 默认"南京"
 *
 * 定位/IP 失败均静默回退，不阻塞页面渲染；用户仍可通过城市选择器手动切换。
 */
async function initSameCity() {
  if (sameCityName.value) return;
  let detected = "";
  // 1) 手机定位（优先）：经纬度 → 城市名（精确，需定位权限）
  detected = await detectCityByLocation();
  // 2) IP 定位兜底：手机定位不可用/被拒绝时按 IP 归属
  if (!detected) {
    try {
      const res = await request<{ city: string }, unknown>({
        url: "/v1/location/ip-city",
        method: "GET",
      });
      detected = res?.city ?? "";
    } catch (_e) {
      // IP 定位失败 → 回退校区/默认城市
    }
  }
  const campusCity = sessionStore.userSession?.campusName ?? "";
  // 优先匹配城市池内同名城市，避免切换后空列表；否则采用定位/校区城市
  const matched =
    SAME_CITY_OPTIONS.value.find((c) => c === detected)
    ?? SAME_CITY_OPTIONS.value.find((c) => c === campusCity);
  sameCityName.value = matched ?? detected ?? "南京";
}

/**
 * P2.7：手机定位获取城市（uni.getLocation，需用户授权）。
 *
 * 仅 mp-weixin/H5 支持；用户拒绝授权或定位失败时返回空串（静默回退 IP 定位）。
 * 注意：不调用 ensurePrivacyAuthorized 强弹授权框 —— 同城 Tab 属非关键功能，
 * 用户可在城市选择器中手动切换，避免首屏强授权打断体验。
 */
function detectCityByLocation(): Promise<string> {
  return new Promise((resolve) => {
    try {
      uni.getLocation({
        type: "gcj02",
        success: (res) => {
          // 经纬度 → 城市：优先取城市池内最近城市（简化），
          // 生产环境应接入逆地理编码服务（如微信内置 / 后端 /api/v1/location/reverse）
          const city = reverseGeocodeCity(res.latitude, res.longitude);
          resolve(city);
        },
        fail: () => resolve(""),
      });
    } catch (_e) {
      resolve("");
    }
  });
}

/**
 * P2.7：经纬度简化逆地理编码 —— 按城市池中心点距离最近匹配。
 *
 * 城市池固定（南京/杭州/上海/成都），按球面距离选最近城市；
 * 不在池内范围时返回空串（回退 IP 定位）。生产环境应替换为真实逆地理服务。
 */
function reverseGeocodeCity(latitude: number, longitude: number): string {
  // 城市池中心点 [lat, lng]（近似）
  const CITY_CENTERS: Array<{ city: string; lat: number; lng: number }> = [
    { city: "南京", lat: 32.0603, lng: 118.7969 },
    { city: "杭州", lat: 30.2741, lng: 120.1551 },
    { city: "上海", lat: 31.2304, lng: 121.4737 },
    { city: "成都", lat: 30.5728, lng: 104.0668 },
  ];
  let best = "";
  let bestKm = 300; // 阈值：距最近城市中心 >300km 视为池外，回退 IP 定位
  for (const c of CITY_CENTERS) {
    const km = haversineKm(latitude, longitude, c.lat, c.lng);
    if (km < bestKm) {
      bestKm = km;
      best = c.city;
    }
  }
  return best;
}

/** 球面距离（Haversine，单位 km） */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

/** 判断用户是否已完成校园认证（Task B2：接入 session store 的 isCampusVerified getter） */
const isCampusVerified = computed(() => sessionStore.isCampusVerified);

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
  // review should-fix：发帖入口统一到 /pages/circles/post-topic（原跳旧页 /pages/village/post）
  openAppPath("/pages/circles/post-topic");
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

/* ========== Task B2：圈子分区（校园圈/兴趣圈） ========== */
/** 分区切换：campus = 校园圈（认证后展示同校帖子），interest = 兴趣圈（分类宫格） */
const circleMode = ref<"campus" | "interest">("campus");

/** 分区切换 BaseTabs 数据（校园圈/兴趣圈） */
const circleModeTabs = computed(() => [
  { key: "campus", label: t("village.circleModeCampus") },
  { key: "interest", label: t("village.circleModeInterest") },
]);

/** 兴趣分类定义（学习/运动/音乐/电影/旅行/游戏/美食/阅读，复用 IMAGE_PATHS 已有 SVG 图标） */
interface InterestCategory {
  id: string;
  name: string;
  icon: string;
}

const INTEREST_CATEGORIES = computed<InterestCategory[]>(() => [
  { id: "study", name: t("circle.catStudy"), icon: IMAGE_PATHS.ICONS_EMOJI.BOOK },
  { id: "sports", name: t("circle.catSports"), icon: IMAGE_PATHS.ICONS_COMMON.HIKING_SVG },
  { id: "music", name: t("circle.catMusic"), icon: IMAGE_PATHS.ICONS_EMOJI.MUSIC },
  { id: "movie", name: t("circle.catMovie"), icon: IMAGE_PATHS.ICONS_EMOJI.CLAPPER },
  { id: "travel", name: t("circle.catTravel"), icon: IMAGE_PATHS.ICONS_EMOJI.PLANE },
  { id: "game", name: t("circle.catGame"), icon: IMAGE_PATHS.ICONS_EMOJI.GAMEPAD },
  { id: "food", name: t("circle.catFood"), icon: IMAGE_PATHS.ICONS_EMOJI.FOOD },
  { id: "reading", name: t("circle.catReading"), icon: IMAGE_PATHS.ICONS_COMMON.OPEN_BOOK_SVG },
]);

/** 校园圈模式帖子：复用现有帖子数据源并按 campusName / isAlumni 过滤 */
const campusCirclePosts = computed<PostItem[]>(() => {
  const myCampus = currentCampusName.value;
  return displayPosts.value.filter(
    (post) => post.isAlumni || Boolean(myCampus && post.author.campusName === myCampus)
  );
});

/* ========== P1-16：帖子头部作者信息（年龄 · 城市 · 学历） ========== */

/**
 * 组装作者信息段文案："{age}岁 · {city} · {education}"。
 * 任一字段缺失时跳过对应段；全部缺失返回空串（模板隐藏该段）。
 */
function authorMetaText(author: PostAuthor): string {
  const parts: string[] = [];
  if (typeof author.age === "number" && !Number.isNaN(author.age) && author.age > 0) {
    parts.push(`${author.age}${t("village.authorAgeUnit")}`);
  }
  if (author.city) {
    parts.push(author.city);
  }
  if (author.education) {
    const label = t(`village.educationLabels.${author.education}`);
    if (label && !label.startsWith("village.")) {
      parts.push(label);
    }
  }
  return parts.join(" · ");
}

/** 点击兴趣分类 → 进入兴趣圈子页（携带 category 参数，Task B2） */
function goToInterestCircle(catId: string) {
  openAppPath(`/pages/circles/index?category=${encodeURIComponent(catId)}`);
}

/** 校园圈未认证引导卡片 → 校园认证页（Task B2） */
function goToCampusCertification() {
  openAppPath("/pages/campus/certification");
}

/* ========== 点赞动画状态 ========== */
const likeAnimatingPosts = ref<Set<string>>(new Set());

/* ========== 下拉刷新 / 加载更多 ========== */
const isRefreshing = ref(false);
const isLoadingMore = ref(false);

async function onRefresh() {
  isRefreshing.value = true;
  try {
    await villageStore.fetchPosts(currentFilters.value);
  } finally {
    isRefreshing.value = false;
    uni.stopPullDownRefresh();
  }
}

/** 加载更多：真实请求下一页（走 village store 的 loadMore，含失败回退 page） */
async function onLoadMore() {
  if (isLoadingMore.value || loading.value || !hasMore.value) return;
  isLoadingMore.value = true;
  try {
    await villageStore.loadMore(currentFilters.value);
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

/* ========== 收藏状态（本地状态，review 修复：storage 持久化跨会话保持） ========== */
const collectedPosts = ref<Set<string>>(new Set());

/** village 收藏持久化 key（与 discover 卡片收藏独立） */
const VILLAGE_COLLECTED_KEY = "campus-love:village-collected-post-ids";

/** 初始化：从本地存储恢复收藏集合 */
try {
  const raw = uni.getStorageSync(VILLAGE_COLLECTED_KEY) as unknown;
  if (Array.isArray(raw)) {
    collectedPosts.value = new Set(raw.filter((id): id is string => typeof id === "string"));
  }
} catch (_e) {
  // 读取失败按空集合
}

/** 持久化收藏集合 */
function persistVillageCollected(): void {
  try {
    uni.setStorageSync(VILLAGE_COLLECTED_KEY, Array.from(collectedPosts.value));
  } catch (_e) {
    // 写入失败静默（仅影响下次启动恢复）
  }
}

function toggleCollect(postId: string) {
  if (collectedPosts.value.has(postId)) {
    collectedPosts.value.delete(postId);
  } else {
    collectedPosts.value.add(postId);
  }
  persistVillageCollected();
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

/* ========== 发帖（Task B4：GlobalPublishFab publish 事件 → 发帖编辑页） ========== */
function handlePublish() {
  openAppPath("/pages/circles/post-topic");
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
// infra R2-00070: onLoad 直读 query 仅覆盖 H5 带参冷启动场景；
// Tab 间切换的主路径由 onShow + consumeTabQuery（storage 桥接，见 utils/navigation.ts）统一消费
onLoad((query) => {
  // 修复：原值 cat-latest 在三 Tab 结构中不存在，hot 统一落到"发现"Tab（全量内容）
  if (query?.tab === "hot") {
    selectedCategory.value = "cat-discover";
    saveLastCategory("cat-discover");
  }
});

// 收尾轮 review 修复：switchTab 不支持 query，改从 storage 桥接读取（hot/mine）。
// 消费逻辑放 onShow：switchTab 到已挂载的 Tab 页只触发 onShow 不触发 onLoad，
// 消费即删天然防止残留被下次冷启动误消费。
onShow(() => {
  const bridged = consumeTabQuery();
  if (bridged.tab === "hot") {
    // 修复：cat-latest 已不存在，hot 落到"发现"Tab
    selectedCategory.value = "cat-discover";
    saveLastCategory("cat-discover");
  } else if (bridged.tab === "mine") {
    selectedCategory.value = MINE_CATEGORY_ID;
    saveLastCategory(MINE_CATEGORY_ID);
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
  // 2026-08-08：每日一问轻量入口文案（失败静默，入口显示兜底文案）
  if (sessionStore.isLoggedIn) {
    void dailyQuestionStore.fetchTodayQuestion();
  }
});

/* ========== 初始化 ========== */
onMounted(() => {
  initSameCity();
  if (isUnlocked.value) {
    void villageStore.fetchPosts(currentFilters.value);
  }
});

// Phase 4.4 修复：session 异步恢复时 isUnlocked 可能从 false→true（onMounted 已错过），
// 此时补拉帖子，避免论坛列表永远为空
watch(isUnlocked, (unlocked) => {
  if (unlocked) {
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
        <!-- 顶部功能栏（设计需求）：左定位城市名（加粗，可点击修改）| 中社区名 | 右发帖按钮（主色填充） -->
        <view class="village-header__top">
          <view
            v-if="circleMode === 'campus'"
            class="village-header__location press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('village.sameCityChange')"
            @tap="showCityPicker = true"
          >
            <image class="village-header__location-icon" :src="IMAGE_PATHS.ICONS_EMOJI.PIN" mode="aspectFit" alt="" />
            <text class="village-header__location-city">{{ sameCityName || t('village.sameCityDefault') }}</text>
            <image class="village-header__location-chevron" :src="IMAGE_PATHS.ICONS_COMMON.CHEVRON_DOWN_SVG" mode="aspectFit" alt="" />
          </view>
          <view v-else class="village-header__location-spacer" />
          <view class="village-header__title-wrap">
            <text class="village-header__title section-title-brand">{{ t('village.title') }}</text>
            <text class="village-header__subtitle">{{ t('village.subtitle') }}</text>
          </view>
          <view
            class="village-header__publish press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('village.publish')"
            @tap="handlePublish"
          >
            <text class="village-header__publish-text">{{ t('village.publish') }}</text>
          </view>
        </view>

        <!-- ===== 校园圈 / 兴趣圈 分区切换（Task B2） ===== -->
        <BaseTabs
          v-model="circleMode"
          :tabs="circleModeTabs"
          variant="pill"
          :scrollable="false"
          :equal-split="true"
        />

        <!-- ===== 关注 / 同城 / 发现（仅校园圈模式显示，Task B2；设计需求：选中态主色下划线+文字加粗） ===== -->
        <BaseTabs
          v-if="circleMode === 'campus'"
          v-model="selectedCategory"
          :tabs="villageTabs"
          variant="underline"
          :scrollable="true"
          :equal-split="false"
          @change="onCategoryChange"
        />
      </view>

      <!-- 城市选择已并入顶部功能栏（左侧城市名，点击修改）；城市选择弹层见下 -->

      <!-- ===== 2026-08-08 重构：每日一问轻量入口（自寻觅页迁入，社区话题场景；仅校园圈模式，全 tab 展示） ===== -->
      <view
        v-if="circleMode === 'campus'"
        class="village-daily-entry press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('village.dailyQuestion')"
        @tap="openAppPath('/pages/daily-question/index')"
      >
        <image class="village-daily-entry__icon" :src="IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL" mode="aspectFit" alt="" />
        <view class="village-daily-entry__info">
          <view class="village-daily-entry__title-row">
            <text class="village-daily-entry__title">{{ t('village.dailyQuestion') }}</text>
            <text
              v-if="dailyQuestionStore.todayQuestion?.hasAnswered"
              class="village-daily-entry__answered"
            >{{ t('village.dailyQuestionAnswered') }}</text>
          </view>
          <text class="village-daily-entry__desc">
            {{ dailyQuestionStore.todayQuestion?.question ?? t('village.dailyQuestionDesc') }}
          </text>
        </view>
        <text class="village-daily-entry__arrow">&rsaquo;</text>
      </view>

      <!-- ===== Phase Feedback4：城市选择弹层（仅校园圈模式） ===== -->
      <view v-if="circleMode === 'campus' && showCityPicker" class="city-picker" role="button" :aria-label="t('common.closeAria')" @tap="showCityPicker = false">
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

      <!-- ===== Phase Feedback4：发现 Tab 二级子标签（全部/校友/老乡/搭子圈；仅校园圈模式） ===== -->
      <view v-if="circleMode === 'campus' && selectedCategory === 'cat-discover'" class="discover-sub-tabs">
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

      <!-- ===== 2026-08-07 设计稿：发现 Tab 热门话题区（主话题大卡 + 四宫格；仅发现 Tab 显示，关注/同城不显示） ===== -->
      <HotTopicsSection v-if="circleMode === 'campus' && selectedCategory === 'cat-discover'" />

      <!-- ===== 附近的人入口卡片（M-08；仅校园圈模式） ===== -->
      <view v-if="circleMode === 'campus'" class="discover-banner press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('village.goToDiscoverAria')" @tap="goToDiscover">
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

      <!-- ===== 校园圈模式：未认证引导卡片（Task B2） ===== -->
      <view v-if="circleMode === 'campus' && !isCampusVerified" class="circle-mode-body">
        <view class="campus-auth-card">
          <image class="campus-auth-card__icon" :src="IMAGE_PATHS.ICONS_EMOJI.GRAD_CAP" mode="aspectFit" lazy-load alt="" />
          <text class="campus-auth-card__title">{{ t('village.campusAuthTitle') }}</text>
          <text class="campus-auth-card__desc">{{ t('village.campusAuthDesc') }}</text>
          <view
            class="campus-auth-card__btn press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('village.campusAuthBtn')"
            @tap="goToCampusCertification"
          >
            <text class="campus-auth-card__btn-text">{{ t('village.campusAuthBtn') }}</text>
          </view>
        </view>
      </view>

      <!-- ===== 兴趣圈模式：兴趣分类宫格（Task B2） ===== -->
      <view v-if="circleMode === 'interest'" class="circle-mode-body">
        <view class="interest-grid" role="list">
          <view
            v-for="cat in INTEREST_CATEGORIES" :key="cat.id"
            class="interest-grid__item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('village.interestGridAria', { name: cat.name })"
            @tap="goToInterestCircle(cat.id)"
          >
            <view class="interest-grid__icon-wrap">
              <image class="interest-grid__icon" :src="cat.icon" mode="aspectFit" lazy-load alt="" />
            </view>
            <text class="interest-grid__name">{{ cat.name }}</text>
          </view>
        </view>
      </view>

      <!-- ===== 加载状态（骨架屏；仅校园圈模式 + 已认证） ===== -->
      <view v-if="circleMode === 'campus' && isCampusVerified && loading && campusCirclePosts.length === 0" class="village-state">
        <Skeleton variant="list" :count="4" />
      </view>

      <!-- ===== 错误状态（仅校园圈模式 + 已认证） ===== -->
      <view v-else-if="circleMode === 'campus' && isCampusVerified && errorMessage && campusCirclePosts.length === 0" class="village-state">
        <ErrorState type="network" @retry="onRefresh" />
      </view>

      <!-- ===== 帖子列表 =====
           P2 修复：
           - :scroll-top 双向绑定到 scrollTopValue，点击回到顶部按钮可主动滚回顶部
           - @scroll 监听滚动位置，超过一屏显示回到顶部按钮
      -->
      <scroll-view
        v-else-if="circleMode === 'campus' && isCampusVerified"
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
        <view v-if="campusCirclePosts.length === 0" class="village-empty">
          <EmptyState type="no-data" :message="emptyStateMessage">
            <view class="village-empty__action press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="emptyStateActionLabel" @tap="handleEmptyAction">
              <text class="village-empty__action-text">{{ emptyStateActionLabel }}</text>
            </view>
          </EmptyState>
        </view>

        <!-- 帖子卡片列表（校园圈模式：campusCirclePosts 按 campusName 过滤） -->
        <view class="post-feed__list card-stagger" role="list">
        <view
          v-for="post in campusCirclePosts" :key="post.id"
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
                <!-- P1-16：作者年龄 · 城市 · 学历（无值则隐藏该段） -->
                <text v-if="authorMetaText(post.author)" class="user-info__meta">
                  {{ authorMetaText(post.author) }}
                </text>
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

          <!-- 图片展示（infra R2-00071: 单帖最大图片数 9 具名化） -->
          <view v-if="post.images.length > 0" class="post-card__images" :class="'post-card__images--' + Math.min(post.images.length, MAX_POST_IMAGES)" catchtap="noop">
            <view
              v-for="(img, idx) in post.images.slice(0, MAX_POST_IMAGES)" :key="idx"
              class="post-card__image-wrap"
              :class="{ 'post-card__image-wrap--single': post.images.length === 1 }"
            >
              <image
                class="post-card__image img-rounded"
                :src="resolveMediaUrl(img)"
                mode="aspectFill"
                lazy-load alt=""
              />
            </view>
            <view v-if="post.images.length > MAX_POST_IMAGES" class="post-card__image-more">
              <text class="post-card__image-more-text">+{{ post.images.length - MAX_POST_IMAGES }}</text>
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

      <!-- ===== 全局发帖 FAB（Task B4：GlobalPublishFab，publish → 发帖编辑页） ===== -->
      <GlobalPublishFab @publish="handlePublish" />

      <!-- ===== 回到顶部按钮（P2 修复：滚动超过一屏后显示；仅校园圈模式） ===== -->
      <view
        v-if="showBackToTop && circleMode === 'campus'"
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

/* 顶部功能栏：左定位城市名（设计需求，加粗可点击） */
.village-header__location {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-brand, #f0fdf9);
  border: 1rpx solid var(--c-brand-100, #ccfbef);
  max-width: 240rpx;
}

.village-header__location-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.village-header__location-city {
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-brand-700, #0f766e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.village-header__location-chevron {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
  opacity: 0.7;
}

.village-header__location-spacer {
  width: 200rpx;
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

/* 顶部功能栏：右发帖按钮（设计需求，品牌主色填充） */
.village-header__publish {
  padding: 10rpx 28rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-brand-400) 0%, var(--c-brand-500) 100%);
  box-shadow: var(--s-brand-soft, 0 4rpx 16rpx rgba(63, 207, 142, 0.25));
}

.village-header__publish-text {
  font-size: var(--fs-base);
  font-weight: 700;
  color: #ffffff;
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
  color: var(--c-text-primary, #1F2329);
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
  color: var(--c-text-primary, #1F2329);
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
  background: var(--c-gradient-brand, linear-gradient(135deg, #3FCF8E 0%, #7CD9A6 100%));
  border-color: transparent;
}

.discover-sub-tab__text {
  font-size: var(--fs-sm, 26rpx);
  color: var(--c-text-secondary, #5B6470);
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
   2026-08-08 重构：每日一问轻量入口（自寻觅页迁入，白底圆角横卡，主题色系）
   ================================================================ */
.village-daily-entry {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin: 0 var(--sp-7) var(--sp-5);
  padding: var(--sp-4) var(--sp-5);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  border: 1rpx solid var(--c-border-light);
  box-shadow: var(--s-card-soft);
  transition: transform var(--d-fast, 150ms) ease;
}

/* #ifdef H5 */
.village-daily-entry:active {
  transform: scale(0.98);
}
/* #endif */

.village-daily-entry__icon {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
  color: var(--c-brand-500);
}

.village-daily-entry__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.village-daily-entry__title-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.village-daily-entry__title {
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-text-primary);
}

.village-daily-entry__answered {
  font-size: var(--fs-xs);
  color: var(--c-brand-500);
  font-weight: 600;
  padding: 2rpx 12rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-brand);
}

.village-daily-entry__desc {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.village-daily-entry__arrow {
  font-size: var(--fs-3xl);
  color: var(--c-text-tertiary);
  font-weight: 300;
  flex-shrink: 0;
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
  /* 2026-08-07：认证徽章金色凸显 */
  background: linear-gradient(135deg, #ffe9b8 0%, #f0c96a 100%);
  border: 2rpx solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 6rpx rgba(232, 195, 106, 0.55);
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

/* 2026-08-07：认证成就标签金色凸显（贴吧式：名字下方小标签） */
.user-info__campus-badge {
  font-size: var(--fs-xs);
  color: #8a5a00;
  background: linear-gradient(135deg, #ffe9b8 0%, #f7d488 100%);
  border: 1rpx solid #e8c36a;
  padding: 2rpx var(--sp-3);
  border-radius: var(--r-full);
  font-weight: 600;
  line-height: 1.6;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
}

/* P1-16：作者信息段（年龄 · 城市 · 学历） */
.user-info__meta {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  /* Task B4：FAB 底部留白 ≥ 220rpx，避免最后一个帖子被 FAB 遮挡 */
  height: 220rpx;
}

/* ================================================================
   Task B2：圈子分区内容容器（认证引导卡片 / 兴趣分类宫格）
   ================================================================ */
.circle-mode-body {
  flex: 1;
  overflow-y: auto;
}

.campus-auth-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  margin: var(--sp-10) var(--sp-8);
  padding: var(--sp-10) var(--sp-8);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.campus-auth-card__icon {
  width: 88rpx;
  height: 88rpx;
  color: var(--c-brand-500);
}

.campus-auth-card__title {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
}

.campus-auth-card__desc {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  text-align: center;
  line-height: 1.6;
}

.campus-auth-card__btn {
  margin-top: var(--sp-3);
  padding: var(--sp-4) var(--sp-10);
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
}

.campus-auth-card__btn-text {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 600;
}

.interest-grid {
  display: flex;
  flex-wrap: wrap;
  padding: var(--sp-8) var(--sp-5);
  gap: var(--sp-4);
}

.interest-grid__item {
  width: calc((100% - var(--sp-4) * 3) / 4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-6) 0;
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.interest-grid__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.interest-grid__icon {
  width: 40rpx;
  height: 40rpx;
  color: var(--c-brand-500);
}

.interest-grid__name {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

/* ================================================================
   浮动发帖按钮 (FAB) —— 已迁移至全局组件 GlobalPublishFab（Task B4）
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
