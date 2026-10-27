<script setup lang="ts">
/**
 * 搜索页（2026-08-11，参考贴吧搜索）
 *
 * 顶部搜索框（自动聚焦）+ 热搜词/搜索历史（未输入时）+ 帖子搜索结果流
 * （复用 PostCard 卡片，含「标题命中」标识）。
 */
import { computed, onMounted, onUnmounted, ref } from "vue";
import { onLoad, onReachBottom } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSearchStore } from "../../../stores/search";
import { useVillageStore } from "../../../stores/village";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
import { resolveMediaUrl } from "../../../utils/media";
import PostCard from "../../../components/village/PostCard.vue";
import { SCHOOLS } from "../../../config/schools";
import { clientApi } from "../../../services/api";
import { mapToDiscoverCard } from "../../../stores/discover/utils";
import type { UserSearchView } from "../../../services/generated/api-types-supplement";
import type { DiscoverCard } from "../../../stores/discover/types";
import EmptyState from "../../../components/common/EmptyState.vue";
import ErrorState from "../../../components/common/ErrorState.vue";
import Skeleton from "../../../components/common/Skeleton.vue";
import { showErrorToast } from "../../../utils/error-toast";
// 2026-09-04 视觉验收：statusBarHeight 注入，var(--statusbar, env(safe-area-inset-top)) 模拟器为 0 会压刘海
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";
// R12-IND-SEARCH-001：注入 --capsule-right（输入条胶囊避让依赖该变量）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();
const statusBarHeightPx = useStatusBarHeight();
const searchStore = useSearchStore();
const villageStore = useVillageStore();

const inputFocused = ref(true);

/* R8-L08-D01（尺寸比例 P1）：输入框可见占位串改由本页已有的三个分组键拼出。
   search.placeholder「搜索感兴趣的人、标签和学校」13 字 × 实测 13.1px/字 ≈ 170px，
   而合并避让后（R7-L08-D01/D03）文本区只有 145px ⇒ 整句在 x=231 被啃掉末两字，
   以连词「和」收尾（第三个检索对象「学校」整体丢失）。i18n 文案文件不在本车道可改清单内，
   故不新增键、不动 zh-CN.ts:2878，只用既有键（zh-CN.ts:2879-2881）拼出
   「用户/标签/学校」（en-US.ts:2721-2723 → "Users/Tags/Schools"）≈ 93px，
   在 169px（本次回收 22px 后）文本区内完整可见；长句仍保留给 aria-label 与下方 emptyHint。 */
const searchPlaceholderHint = computed(() =>
  [t("search.tabUsers"), t("search.tabTags"), t("search.tabSchools")].join("/"),
);

// MP-R2-SEARCH-002：触底加载下一页（store 已实现 loadMore/hasMore，页面此前无触发器，
// 第 2 页永远无法到达）
onReachBottom(() => {
  void searchStore.loadMore();
});

onLoad((options) => {
  const keyword = options?.keyword;
  if (keyword && typeof keyword === "string") {
    void searchStore.searchByTerm(keyword);
  } else {
    void searchStore.init();
  }
});

onMounted(() => {
  void searchStore.init();
});

/** 输入回调（防抖搜索） */
function onSearchInput() {
  searchStore.setKeyword(searchStore.keyword);
  // MP-R1-SEARCH-01：用户 Tab 防抖自动搜索——store.setKeyword 的防抖到期只调
  // /search/posts（搜帖子），用户 Tab 的 searchUsers 仅由回车/热搜词/切 Tab 触发，
  // 输入过程中用户列表恒为空。按当前 Tab 分发：users 走本地 300ms 防抖 searchUsers；
  // tags 维持 store 防抖搜帖子；schools 为 computed 即时过滤无需处理。
  if (userSearchTimer) clearTimeout(userSearchTimer);
  if (activeTab.value === "users" && searchStore.keyword.trim().length > 0) {
    userSearchTimer = setTimeout(() => {
      userSearchTimer = null;
      void runTabSearch();
    }, SEARCH_USERS_DEBOUNCE_MS);
  }
}
const SEARCH_USERS_DEBOUNCE_MS = 300;
let userSearchTimer: ReturnType<typeof setTimeout> | null = null;
onUnmounted(() => {
  if (userSearchTimer) {
    clearTimeout(userSearchTimer);
    userSearchTimer = null;
  }
});

/** 回车立即搜索 */
function onConfirm() {
  if (searchStore.keyword.trim()) {
    void runTabSearch();
  }
}

/** v3 搜索分组：用户 / 标签 / 学校 */
const activeTab = ref<"users" | "tags" | "schools">("users");
const users = ref<UserSearchView[]>([]);
const campusPeople = ref<DiscoverCard[]>([]);
const campusExpanded = ref("");
const usersLoading = ref(false);

function onTabChange(tab: "users" | "tags" | "schools") {
  activeTab.value = tab;
  if (searchStore.keyword.trim()) {
    void runTabSearch();
  }
}

async function runTabSearch() {
  const kw = searchStore.keyword.trim();
  if (!kw) return;
  if (activeTab.value === "users") {
    usersLoading.value = true;
    try {
      users.value = await clientApi.searchUsers(kw);
    } catch (_e) {
      users.value = [];
    } finally {
      usersLoading.value = false;
    }
  } else if (activeTab.value === "tags") {
    await searchStore.search(true);
  }
}

/** 学校结果（按名称/城市过滤） */
const schoolResults = computed(() => {
  const kw = searchStore.keyword.trim().toLowerCase();
  if (!kw) return [];
  return SCHOOLS.filter((s) => (t(s.nameKey ?? s.name) || s.name).toLowerCase().includes(kw)).slice(0, 20);
});

/* R11-L08-D04（空态文案 P1）：预检索态给一条**不带承诺**的检索起点。
   卡上建议「热搜为空时用分组默认词（用户/标签/学校各取既有键）兜底成热搜列表」——那是把三枚
   分组标签当检索词、再套 .hot-rank 那套 1..n 名次号，等于给「热搜」这个承诺造一份没有真相源的榜单，
   正命中任务书 §12.4 禁止的第三种形态（换一组新常量 / 挪写死表造数 ⇒ 假修），故**不照卡执行**。
   改成只消费本页既有的名录：config/schools.ts 的 SCHOOLS 静态校园目录——同页「学校」分组的结果集
   （schoolResults 上面那条）就是它（本页从不调 loadSchools()，那条也只是 return 一份新数组、
   不改写 SCHOOLS，故这里如实按「仓内既有静态目录」算，不冒充后端同步数据）。
   标题走既有键 search.tabSchools（「学校」），不写名次、不写「热搜」、不承诺热度。
   热搜条目本身仍是后端 /api/v1/search/hot 返回空 ⇒ 属数据缺口，见交件 NEEDS-DATA 登记。 */
const PRE_SEARCH_ENTRY_COUNT = 8;
const preSearchSchoolEntries = computed(() => SCHOOLS.slice(0, PRE_SEARCH_ENTRY_COUNT));
/** 热搜与历史各自为空才需要名录兜底；任一有真数据即让位给真数据 */
const showPreSearchEntries = computed(
  () => searchStore.hotSearches.length === 0 && searchStore.history.length === 0,
);

/** 点学校名：切到「学校」分组并按该校名过滤（schoolResults 为本地 computed，即时出结果） */
function onTapSchoolEntry(schoolName: string) {
  activeTab.value = "schools";
  searchStore.setKeyword(schoolName);
}

/** 打开校园主页：展开内联预览（认证/活跃/活动/兴趣圈 + 推荐用户） */
async function openCampusProfile(schoolName: string) {
  if (campusExpanded.value === schoolName) {
    campusExpanded.value = "";
    campusPeople.value = [];
    return;
  }
  campusExpanded.value = schoolName;
  campusPeople.value = [];
  try {
    const people = await clientApi.getRecommendations({ schools: [schoolName] });
    // MP-R1-SEARCH-101：客户端按学校过滤——buildRecommendationsQuery 无 schools 序列化、
    // 后端 /recommendations 无 schools 入参、mock fixtures 也不消费，预览实为未过滤全量推荐；
    // 以 DiscoverCard.campusName（服务端回传的归属学校）匹配过滤，保证预览与校名一致
    const mapped = people.map((p) => mapToDiscoverCard(p));
    campusPeople.value = mapped
      .filter((card) => (card.campusName ?? "") === schoolName)
      .slice(0, 5);
  } catch (_e) {
    campusPeople.value = [];
  }
}

/** 用户结果 → 他人主页 */
function goUserProfile(user: UserSearchView) {
  openAppPath(`/subpackages/profile-extra/profile/other?userId=${encodeURIComponent(String(user.userId))}`);
}

/** 清空输入 */
function clearSearch() {
  searchStore.clear();
  inputFocused.value = false;
  // 触发重新聚焦
  setTimeout(() => {
    inputFocused.value = true;
  }, 100);
}

/** 返回上一页 */
function goBack() {
  uni.navigateBack({
    fail: () => {
      uni.switchTab({ url: ROUTES.TAB.DISCOVER });
    },
  });
}

/** 点击热搜词/历史词 */
function onTapTerm(term: string) {
  searchStore.setKeyword(term);
  void runTabSearch();
}

/** 清除历史 */
function clearHistory() {
  searchStore.clearHistory();
}

/** 帖子详情跳转 */
function goToDetail(postId: string) {
  villageStore.setCurrentPost(postId);
  openAppPath(ROUTES.VILLAGE.DETAIL);
}

/** 点赞（委托 village store） */
async function handleLike(postId: string) {
  try {
    await villageStore.likePost(postId);
  } catch (error) {
    showErrorToast(error, t("village.likeFailed"));
  }
}

/** 收藏 */
async function handleFavorite(postId: string) {
  try {
    await villageStore.toggleFavorite(postId);
  } catch (error) {
    showErrorToast(error, t("village.favoriteFailed"));
  }
}

/** 关注作者 */
async function handleFollow(userId: string) {
  try {
    await villageStore.followUser(userId);
  } catch (error) {
    showErrorToast(error, t("village.followFailed"));
  }
}

function goToAuthor(userId: string) {
  openAppPath(`${ROUTES.PROFILE.OTHER}?userId=${encodeURIComponent(userId)}`);
}

function goToTag(tagName: string) {
  openAppPath(`${ROUTES.VILLAGE.TAG_POSTS}?tagName=${encodeURIComponent(tagName)}`);
}

function goToActivity(activityId: number) {
  openAppPath(`${ROUTES.ACTIVITY_DETAIL}?id=${encodeURIComponent(String(activityId))}`);
}
</script>

<template>
  <view class="search-page" :style="menuStyleVars">
    <!-- 顶部搜索栏（statusBarHeight 注入，避免模拟器 env()=0 压刘海） -->
    <view class="search-header" :style="{ paddingTop: `calc(${statusBarHeightPx}px + 16rpx)` }">
      <!-- R10-P2-008：补返回入口（此前仅靠手势返回） -->
      <view class="search-back press-feedback" hover-class="press-feedback--active" role="button" :aria-label="t('common.back')" @tap="goBack">
        <!-- R8-L08-D02（可达性 P2）：字形改吃仓内既有深色变体 icons/v2/back.png（stroke #333333）。
             原 icons/common/back.png 的描边是 #94A3B8 蓝灰，压在 #EEF7F2 圆底上只有 2.35:1
             （帧上实测最暗墨迹 #9BA9BC 更低，2.19:1），低于非文本控件 3:1 线，4×9px 淡弧像噪点。
             #333333 对圆底 #EEF7F2 = 11.6:1、对白底 #FFFFFF = 12.6:1，两份都在同页色板内。
             素材三棵树（src/static、static-local-backup、api/uploads/app-assets）md5 一致，未新增素材。 -->
        <image class="search-back__icon" :src="IMAGE_PATHS.ICONS_V2.BACK" mode="aspectFit" alt="" />
      </view>
      <view class="search-box" role="search" :aria-label="t('search.placeholder')">
        <image class="search-icon" :src="IMAGE_PATHS.ICONS_COMMON.SEARCH" mode="aspectFit" alt="" />
        <input
  cursor-spacing="20"
          v-model="searchStore.keyword"
          class="search-input"
          :placeholder="searchPlaceholderHint"
          :focus="inputFocused"
          :confirm-type="'search'"
          @input="onSearchInput"
          @confirm="onConfirm"
          :aria-label="t('search.placeholder')"
        />
        <image
          v-if="searchStore.keyword"
          class="search-clear-img"
          :src="IMAGE_PATHS.ICONS_COMMON.CLOSE"
          mode="aspectFit"
          @tap="clearSearch"
          alt=""
        />
      </view>
      <text class="search-cancel" role="button" :aria-label="t('common.cancel')" @tap="goBack">
        {{ t("common.cancel") }}
      </text>
    </view>

    <!-- v3 搜索分组：用户 / 标签 / 学校 -->
    <view class="search-tabs">
      <view
        v-for="tab in ([{ key: 'users', label: t('search.tabUsers') }, { key: 'tags', label: t('search.tabTags') }, { key: 'schools', label: t('search.tabSchools') }] as const)"
        :key="tab.key"
        class="search-tab"
        :class="{ 'search-tab--active': activeTab === tab.key }"
        role="tab"
        :aria-selected="activeTab === tab.key ? 'true' : 'false'"
        @tap="onTabChange(tab.key)"
      >
        <text class="search-tab__text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 未搜索：热搜 + 历史 -->
    <view v-if="!searchStore.isSearching && searchStore.posts.length === 0" class="suggest-wrap">
      <!-- 热搜词（贴吧式） -->
      <view v-if="searchStore.hotSearches.length > 0" class="section">
        <view class="section-head">
          <text class="section-title">{{ t("search.hotSearches") }}</text>
          <image class="section-fire" :src="IMAGE_PATHS.ICONS_EMOJI.FIRE" mode="aspectFit" alt="" />
        </view>
        <view class="hot-list">
          <view
            v-for="(item, idx) in searchStore.hotSearches"
            :key="item.keyword"
            class="hot-item press-feedback"
            role="button"
            :aria-label="item.keyword"
            @tap="onTapTerm(item.keyword)"
          >
            <text class="hot-rank" :class="{ 'hot-rank--top': idx < 3 }">{{ idx + 1 }}</text>
            <text class="hot-word">{{ item.keyword }}</text>
          </view>
        </view>
      </view>

      <!-- 搜索历史 -->
      <view v-if="searchStore.history.length > 0" class="section">
        <view class="section-head">
          <text class="section-title">{{ t("search.history") }}</text>
          <text class="section-clear" role="button" :aria-label="t('search.clearHistory')" @tap="clearHistory">
            {{ t("search.clearHistory") }}
          </text>
        </view>
        <view class="history-list">
          <view
            v-for="term in searchStore.history"
            :key="term"
            class="history-item press-feedback"
            role="button"
            :aria-label="term"
            @tap="onTapTerm(term)"
          >
            <image class="history-clock" :src="IMAGE_PATHS.ICONS_COMMON.SCHEDULE" mode="aspectFit" alt="" />
            <text class="history-word">{{ term }}</text>
          </view>
        </view>
      </view>

      <!-- R6-L09-D21（空态文案 P2）：原门槛「热搜与历史同时为 0 才显示空态」在 real 档永远不成立
           （后端 /api/v1/search/hot 无数据 ⇒ 热搜 0 条，取景残留 1 条历史 chip 就把空态挡死了）
           ⇒ 按区块各自兜底。热搜条目本身（卡建议的「热搜 10 条」）属后端数据缺口，见交件报告 NEEDS-DATA。
           R7-L08-D04（空态文案 P3）：「仅热搜为空」的分支原来是一行裸 text.suggest-hint 灰字（13px，
           实测墨迹 y=507..516），不走规范 §1.5 的空态组件形态（插画+主文案），比同页结果空态弱一档
           ⇒ 两个分支合并为同一枚 EmptyState（type=no-data + hide-sub），热搜为空一律给组件形态。 -->
      <!-- R11-L08-D04（空态文案 P1）：热搜与历史都为空时，用既有校园名录给一条可点的检索起点
           （详见 script 内同 id 注释：不照卡用「分组默认词造热搜」，那条撞 §12.4 假修线）。
           标题只写分组本名「学校」，不冒充热搜、不排名次。上两条在册裁定不动：空态组件照旧渲染。 -->
      <view v-if="showPreSearchEntries" class="section">
        <view class="section-head">
          <text class="section-title">{{ t("search.tabSchools") }}</text>
        </view>
        <!-- R14-L07-D20（文案 P2）：分组条（用户/标签/学校）承诺「切换内容区」，但本块 :152 的
             showPreSearchEntries 判据与 activeTab 无关、只兜一份 SCHOOLS 静态名录 ⇒ 帧上选中
             「用户」时内容区标题写「学校」+8 枚学校 chip，两枚 tab 一切换画面一字不变。
             按卡上第二条改法（不动判据、不造用户/标签名录 = 二者皆无客户端名录真相源，属 §12.4 禁线）：
             在标题下补一行说明，把「这块是与所选分组无关的通用检索起点」如实讲出来，让分组条
             承诺与内容区语义对齐。文案是页面自身状态描述（非承诺/非数据）；本页 :462 已有
             「校园主页/收起」两枚同型 inline 中文（未接 i18n 的在册口径），本行沿用同一惯例。 -->
        <text class="section-note">预检索起点，与所选分组无关</text>
        <view class="entry-list">
          <view
            v-for="s in preSearchSchoolEntries"
            :key="s.id"
            class="entry-item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t(s.nameKey ?? s.name)"
            @tap="onTapSchoolEntry(t(s.nameKey ?? s.name))"
          >
            <text class="entry-word">{{ t(s.nameKey ?? s.name) }}</text>
          </view>
        </view>
      </view>

      <!-- R11-L08-D03（素材缺失 P2）：引导态配图与结果空态分离。
           卡建议「给 EmptyState 增/接 type="search-empty"」——EmptyState.vue 不在本车道可改清单内
           （只许改本页），而组件已开 `image` prop（EmptyState.vue:23「显式图标 URL（优先级最高）」，
           :82 props.image 排在 presetIconMap 之前）⇒ 用宿主页传图这条既有合法接口，等价落地。
           素材取仓内既有 icons/v2/search.png（同目录 v2/search.svg 描边 #333333，src/static 与
           apps/api/uploads/app-assets 两棵树都在盘；同页返回键用的 IMAGE_PATHS.ICONS_V2.BACK
           即同目录同口径，本帧已证明它在 real 档出图），
           未新增/未下载/未生成素材；EmptyState 内部一律过 resolveMediaUrl ⇒ real 档不空槽。
           同页三处结果空态（用户 / 学校 / 标签分组）继续吃 type="no-data" 的空箱，
           两态配图自此可区分。 -->
      <!-- R15-L08-D03（间距 P2）：EmptyState 原是本页 flex 列的直接子节点，而 EmptyState.vue:165 的
           `flex:1 0 auto` 写在组件内部根节点 .empty 上，管不到 mp-weixin 的自定义组件宿主节点
           （宿主是 <empty-state>，页面 scoped 选择器）⇒ 空态块高度退化成内容高，R14-L07-D19 把
           .suggest-wrap 顶成 flex-start 后余量整段落到底部（帧上空态文案止于 y=375，其下 425px 无主空带）。
           给空态包一层宿主页自己的 view，让它吃满剩余高度并在其中居中：宿主节点是普通 view，
           flex:1 能落地；组件根节点高度仍旧等于内容高，不会把 80rpx 内衬拉成大白块。 -->
      <view class="suggest-empty">
        <EmptyState
          v-if="searchStore.hotSearches.length === 0"
          type="no-data"
          :image="IMAGE_PATHS.ICONS_V2.SEARCH"
          :message="t('search.emptyHint')"
          hide-sub
        />
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-else class="result-wrap">
      <!-- v3 分组：用户 -->
      <view v-if="activeTab === 'users'" class="group-list">
        <view v-if="usersLoading" class="skeleton-wrap">
          <Skeleton variant="list" :count="3" />
        </view>
        <EmptyState v-else-if="users.length === 0 && !usersLoading" type="no-data" :message="t('search.noResult')" />
        <view
          v-for="u in users"
          :key="u.userId"
          class="user-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="u.nickname"
          @tap="goUserProfile(u)"
        >
          <image class="user-row__avatar" :src="resolveMediaUrl(u.avatarUrl) || resolveMediaUrl(IMAGE_PATHS.DEFAULT_AVATAR)" mode="aspectFill" alt="" />
          <view class="user-row__info">
            <text class="user-row__name">{{ u.nickname }}</text>
            <text class="user-row__meta">{{ u.campusName || '' }}{{ u.campusName && u.bio ? ' · ' : '' }}{{ u.bio || '' }}</text>
          </view>
          <text class="user-row__arrow">›</text>
        </view>
      </view>

      <!-- v3 分组：学校（校园主页内联预览） -->
      <view v-else-if="activeTab === 'schools'" class="group-list">
        <EmptyState v-if="schoolResults.length === 0" type="no-data" :message="t('search.noResult')" />
        <view
          v-for="s in schoolResults"
          :key="s.id"
          class="school-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t(s.nameKey ?? s.name)"
          @tap="openCampusProfile(s.name)"
        >
          <view class="school-row__icon">
            <image class="school-row__icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.SCHOOL" mode="aspectFit" alt="" />
          </view>
          <view class="school-row__info">
            <text class="school-row__name">{{ t(s.nameKey ?? s.name) }}</text>
            <text class="school-row__meta">{{ s.city ?? '' }}</text>
          </view>
          <text class="school-row__arrow">{{ campusExpanded === s.name ? '收起' : '校园主页' }}</text>
        </view>
        <view v-if="campusExpanded" class="campus-preview">
          <text class="campus-preview__title">{{ t('search.campusProfile') }}</text>
          <view v-if="campusPeople.length > 0" class="campus-preview__users">
            <view
              v-for="person in campusPeople"
              :key="person.id"
              class="campus-person press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="person.name"
              @tap="openAppPath(`/subpackages/profile-extra/profile/other?userId=${encodeURIComponent(person.userId)}`)"
            >
              <image class="campus-person__avatar" :src="resolveMediaUrl(person.avatar) || resolveMediaUrl(IMAGE_PATHS.DEFAULT_AVATAR)" mode="aspectFill" alt="" />
              <text class="campus-person__name">{{ person.name }}</text>
            </view>
          </view>
          <view v-else class="campus-preview__empty">
            <text class="campus-preview__empty-text">{{ t('search.campusNoUsers') }}</text>
          </view>
        </view>
      </view>

      <!-- v3 分组：标签（帖子结果） -->
      <template v-else>
      <view class="result-meta">
        <text class="result-meta__text">{{ t("search.resultCount", { n: searchStore.posts.length }) }}</text>
      </view>

      <ErrorState v-if="searchStore.errorMessage" :message="searchStore.errorMessage" @retry="searchStore.search(true)" />

      <view v-if="searchStore.loading && searchStore.posts.length === 0" class="skeleton-wrap">
        <Skeleton variant="card" :count="2" />
      </view>

      <EmptyState v-else-if="!searchStore.loading && searchStore.posts.length === 0 && !searchStore.errorMessage" type="no-data" :message="t('search.noResult')" />

      <view v-else class="post-list">
        <PostCard
          v-for="post in searchStore.posts"
          :key="post.id"
          :post="post"
          @like="handleLike"
          @favorite="handleFavorite"
          @follow="handleFollow"
          @open-detail="goToDetail"
          @open-author="goToAuthor"
          @open-tag="goToTag"
          @open-activity="goToActivity"
        />
        <view v-if="searchStore.loading" class="load-more">
          <text class="load-more__text">{{ t("common.loading") }}</text>
        </view>
        <view v-if="!searchStore.hasMore && searchStore.posts.length > 0" class="load-more">
          <text class="load-more__text">{{ t("search.noMore") }}</text>
        </view>
      </view>
      </template>
    </view>
  </view>
</template>

<style scoped lang="scss">
.search-page {
  min-height: 100vh;
  /* R6-L09-D20（可达性 P1）：改纵向 flex —— 未搜索态的 suggest 区（.suggest-wrap）此前只有
     padding: 24rpx 的自然高，实测内容止于 y=198、下方 616px（≈1230rpx）全是 #EEF7F2 空底，
     bottom 帧与 top 帧逐字节同图。suggest 区改为吃满剩余视口并垂直居中
     （与仓内既有裁定同口径：LockScreen「内容堆在屏幕上半区、下半屏空白」定性为缺陷）。
     注：热搜条目 0 条属后端数据缺口，见交件报告 NEEDS-DATA —— 本改动只消掉「空底」，不伪造内容。 */
  display: flex;
  flex-direction: column;
  background: var(--c-bg-page);
  padding-bottom: env(safe-area-inset-bottom);
}

.search-back {
  /* R10-P2-008：返回按钮（与全站圆角返回键一致） */
  flex-shrink: 0;
  /* R8-L08-D02（可达性 P2）：本页自陈触控下限是 88rpx（.search-tab:699 同口径，
     AppShell.vue:334「min-height: 88rpx(44px)」），而返回键只有 64rpx：
     帧上实测圆底 32px(64rpx) vs 下方「用户」选中胶囊 42px(83rpx)，同一页两个并排顶级
     导航控件差 10px ⇒ 返回键比同页 Tab 小一档。按同一口径补到 88rpx（min-* 兜住下限），
     圆底与热区一起长，头部行高由 72rpx 的输入胶囊抬到 88rpx，画面必然移动。 */
  width: 88rpx;
  height: 88rpx;
  min-width: 88rpx;
  min-height: 88rpx;
  border-radius: var(--r-full, 999rpx);
  background: var(--c-bg-page, #EEF7F2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-back__icon {
  /* R8-L08-D02：圆底从 64rpx 长到 88rpx 后，36rpx 的淡弧在帧上只有 4×9px，
     与圆底同步放大到 40rpx，配合深色描边变体才看得出是个返回键 */
  width: 40rpx;
  height: 40rpx;
}

.search-header {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--sp-3);
  /* R7-L08-D01/D03（尺寸比例 P1）：微信胶囊右避让在整行只计一次。
     此前 .search-box(:494) 与 .search-cancel(:545) 各挂了一份 calc(--capsule-right + 96px)=103px
     的 margin-right ⇒ 同一份避让叠加两遍吃掉 ~206px，输入框实测只剩 x=54..131（宽 ~77px），
     14 字 placeholder 在 x=121 被切断只显示「搜索感」，框右缘与「取消」之间 ~108px 纯白死区。
     避让改由头部行右内边距统一承担（行内所有子节点整体落在胶囊左侧），
     两个子节点的 margin-right 全部删除，把 ~107px 还给输入框。
     R8-L08-D01（尺寸比例 P1）：合并后仍按 96px 常量预留 = 实测 103px，而本帧系统胶囊墨迹
     实起于 x=298（屏宽 378 ⇒ 胶囊占位 378-298 = 80px），「取消」止于 x=276 ⇒ 行尾 22px(44rpx)
     是纯白死区，没还给输入框。常量按实测胶囊几何改 73px（73px + --capsule-right 兜底 7px
     = 80px，正好贴胶囊左缘），22px 全部并入 .search-box（flex:1）⇒ 文本可用宽 145px→167px。
     R11-L08-D01（层级遮挡 P2）：73px 那一发按的是 R8 帧的胶囊左缘 x=298，R11 同页帧胶囊左缘
     实测在 x=293 ⇒ 占位 85px，80px 的预留短 5px：「取消」墨迹 x=274..301 的末字右半约 9px
     落进胶囊白底（帧上「消」只剩左半）。常量按本轮实测提到 85px（85 + --capsule-right 兜底 7px
     = 92px ⇒ 内容右缘落在 x=286，胶囊左缘 x=293，留 7px 呼吸），12px 由 .search-box（flex:1）
     承担 ⇒ 输入文本可用宽 167px→155px，仍容得下 R8-L08-D01 拼出的 ~93px 占位串（用户/标签/学校）。
     不改成全站那发 calc(--capsule-right + 104px)：本帧要 111px，比胶囊实占 85px 多 26px 死区，
     等于把 R8-L08-D01 刚消掉的行尾白洞再挖一遍（§4「同一份避让不要计两遍」同族）。 */
  padding: var(--sp-4) calc(var(--capsule-right, 7px) + 85px) var(--sp-4) var(--page-padding);
  background: var(--c-bg-container, #ffffff);
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-box {
  /* R7-L08-D01/D03：胶囊避让（原 R12-IND-SEARCH-001 的 margin-right）已上移到 .search-header
     的右内边距，整行只计一次；此处只负责吃满返回键与「取消」之间的剩余宽度 */
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  /* R15-L08-D01（可达性 P1）：定高由 72rpx 提到 88rpx —— 帧上输入胶囊 y=57..92 只有 36px(72rpx)，
     比同帧「用户」选中胶囊（y=112..152，41px）矮一档、也低于 AppShell.vue:334 的 88rpx(44px) 下限，
     而它是本页唯一输入入口。这里保留「定高」而不只写 min-height：72rpx 是声明式的 height，
     实测渲染就是 72rpx，没有任何 flex 拉伸参与，故换成 88rpx 直接决定盒高；
     min-height 同值兜底，box-sizing: border-box 由 global.scss 的 view{border-box} 保证，
     1rpx 描边与 0 纵向内衬不会把 44px 撑破。
     头部行高不变（左侧 .search-back 已是 88rpx），只让胶囊在行内长高 8px —— 画面必然动，
     且分组条/历史区左缘与 y 坐标不受影响。 */
  height: 88rpx;
  min-height: 88rpx;
  /* R6-L09-D17（颜色token P2）：原引卡片令牌 --c-bg-container（真值 #FFFFFF）压在同样白底的
     sticky 头部上 ⇒ 输入区与头部同色、圆角容器边界 0 像素。规范 §1.2「输入底 --c-bg-surface
     #F3FAF6：输入框·浅底块」才是这里的语义令牌；再加一条浅描边保证深色主题下也浮得出来。
     （原兜底 #F2F3F5 与 --c-bg-container 真值不符，是第二笔兜底债，一并归正。） */
  background: var(--c-bg-surface, #F3FAF6);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  border-radius: 36rpx;
  padding: 0 24rpx;
  gap: 12rpx;
}

.search-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.search-input {
  /* R6-L09-D16（尺寸比例 P1）：mp-weixin 的原生 <input> 不靠 `flex: 1` 撑开——
     实测渲染宽度只有 ~66px，14 字的 placeholder「搜索感兴趣的人、标签和学校」
     （zh-CN.ts:2877）在 x=119 处被切齐，右边 120px 全白。
     补齐 mp-weixin 需要的三件套：显式宽度 + flex-basis:0 + min-width:0，
     让输入框吃满 .search-box 的可用宽度（父级也已补 min-width:0）。 */
  flex: 1;
  flex-basis: 0;
  min-width: 0;
  width: 100%;
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #1f2329);
  /* R8-L08-D01：占位/关键词超出可用宽时按省略号收口，不再出现以连词「和」结尾的半截句
     （en-US.ts:2720 "Search post title, content or topic" 35 字符同样需要这个收口） */
  text-overflow: ellipsis;
}

.search-clear-img {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.search-cancel {
  font-size: var(--fs-lg, 28rpx);
  /* R7-L08-D02（颜色token P3）：原引 `var(--color-primary, #ff6b81)`——
     ①--color-primary 是 tokens.scss:38 的 legacy 别名，不在规范 §1.2 令牌表内；
     ②兜底值 #ff6b81 与心动粉 --c-romance-500 同值，legacy 变量一失效「取消」就翻成粉色操作字，
       违反 §1.1「绿=行动、粉=喜欢，两色禁混用」与 §1.2 粉色禁用于操作态。
     「取消」是返回行的次要操作（与左侧返回键同一动作），按规范 §1.2 次文本档改走
     --c-text-secondary，并删掉粉色兜底。 */
  color: var(--c-text-secondary);
  flex-shrink: 0;
  /* R7-L08-D01/D03：MP-R1-SEARCH-301 的胶囊避让改由 .search-header 右内边距统一计一次，
     此处不再叠加第二份 margin-right（原第二份 103px 是输入框被挤到 77px 的直接原因） */
  /* R11-L08-D01（层级遮挡 P2）第二半：本节点 flex-shrink:0 + CJK 逐字可折行，一旦某档语言把
     common.cancel 撑长（en-US "Cancel" 14px 档 ≈44px），墨迹就会爬进行右内边距那条胶囊带。
     给墨迹一个上限并让它整体落在胶囊左侧：5em(=70px @ --fs-lg 28rpx) 容得下中英两档现值，
     超出部分按省略号收口（同 .search-input 的 R8-L08-D01 已批口径），不再靠行尾内边距兜底。 */
  max-width: 5em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggest-wrap {
  /* R6-L09-D20：未搜索态撑满头部/分组 tab 之外的剩余视口 */
  flex: 1;
  display: flex;
  flex-direction: column;
  /* R14-L07-D19（间距 P2）：原 justify-content:center 把内容块顶到视口中线 ⇒ 帧上内容块只占
     y=314..589（275px）、可用区 y≈153..799（646px）⇒ 分组 tab 下缘到「学校」标题之间 161px
     纯页面底空带（--section-gap 的 13 倍）、空态文案下方另留 210px。
     改 justify-content:flex-start 让内容贴着分组条上缘起排，把居中留给空态组件自身
     （EmptyState 内部 flex:1，剩余高度由它吸收），顶部留白走 --sp-6(24rpx=12px) 一档标准内衬。 */
  justify-content: flex-start;
  /* R11-L08-D05（间距 P2）：横向内衬 24rpx 是裸值，比规范 §1.4 页边距 --page-padding(32rpx)
     少 8rpx ⇒ 与同页其余内容容器各写一档。纵向 24rpx 有 --sp-6 可引，一并归令牌。 */
  padding: var(--sp-6) var(--page-padding);
}

/* R15-L08-D03（间距 P2）：空态槽 —— 吃满「历史/名录区块之后」的剩余高度，并把空态块在其中垂直居中
   （模板同 id 注释：EmptyState 的 flex:1 写在组件内部根节点，跨不过 mp-weixin 的组件宿主边界，
   这里改由宿主页自己的 view 承担 flex:1 与居中两侧；flex-basis:0 让剩余高度只按可用空间分配，
   min-height:0 防内容反向撑开）。画面落点：空态插画+文案整体下移，底部无主空带由 425px 收到
   「剩余区高度 - 空态内容高」的一半。 */
.suggest-empty {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* R11-L08-D04（空态文案 P1）：预检索兜底条目（校园名录 chip）。
   配方与同页 .hot-item/.history-item 同一档（白底胶囊 + 12/24rpx 内衬），只多一条描边，
   因为它是本页在 real 档唯一可点的预检索入口，需要在 #EEF7F2 页底上读得出「可点」。 */
.entry-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.entry-item {
  display: flex;
  align-items: center;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-default, #DDE3E0);
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
  /* R15-L08-D04（可达性 P2）：原名录 chip 只有 12rpx 纵向内衬 + 26rpx 文字 ⇒ 实测 52rpx 高，
     与同页「用户」分组胶囊（88rpx）差一档；点 chip = 复跑该词的最短路径。三处同配方补 88rpx 定高
     （.hot-item / .history-item 同改，模板里三处都是 flex 列/行包裹的普通 view ⇒ min-height 直接生效），
     文字由 align-items:center 居中，胶囊形由 30rpx 圆角维持。 */
  min-height: 88rpx;
  box-sizing: border-box;
}

.entry-word {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-primary, #1A1E1C);
}

/* R7-L08-D04：原 `.suggest-hint`（13px 一行灰字）的裸文案已由 EmptyState 组件形态承接，规则删除 */

.section {
  margin-bottom: 40rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-title {
  /* R6-L09-D19（字号 P2）：原裸值 30rpx（实测落画 13px），既不走令牌也比规范 §1.3
     区块标题 18-20px 小 5-7px，与条目正文（--fs-md 26rpx）只差 4rpx、层级不分。
     同页其余 15 处裸 rpx 字号一并换成 --fs-* 令牌。 */
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 600;
  color: var(--c-text-primary, #1f2329);
}

/* R14-L07-D20（文案 P2）：预检索块下方的一行说明（详见模板同 id 注释）。
   字号走 §1.3 说明档下限 --fs-lg（28rpx=14px），与本页 R11-L07-D24 已把 :285 三条说明行
   升到 --fs-lg 的口径一致；色走 --c-text-secondary #4A524E（design-variables.scss:122
   真值）压 --c-bg-page #EEF7F2 实算 0.9608/0.13202 = 7.28:1 ≥4.5:1。 */
.section-note {
  display: block;
  margin-bottom: 16rpx;
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-secondary, #4A524E);
}

.section-fire {
  width: 30rpx;
  height: 30rpx;
}

.section-clear {
  font-size: var(--fs-base, 24rpx);
  /* R15-L08-D02（颜色token P2）：「清除」是本页唯一带清除动作的文字控件，原取 --c-text-tertiary
     （真值 #6B7571，design-variables.scss:125 —— 兜底 #8f959e 是过期字面量）压页底 --c-bg-page
     #EEF7F2 实算 4.36:1 <4.5:1（帧上墨迹最暗采样 rgb(108,118,114)≈#6C7672 与此一致），12px 不享豁免
     ⇒ 提到 --c-text-secondary #4A524E（design-variables.scss:122），压 #EEF7F2 实算 7.37:1。
     字号按卡要求保持 24rpx，不借「加深即算过大字号」蒙混。 */
  color: var(--c-text-secondary, #4A524E);
}

.hot-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.hot-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: var(--c-bg-container, #ffffff);
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
  /* R15-L08-D04：同 .entry-item —— 12rpx 纵内衬 + 26rpx 文字 = 52rpx 热区，补到 88rpx 下限 */
  min-height: 88rpx;
  box-sizing: border-box;
}

.hot-rank {
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: var(--c-text-tertiary, #8f959e);
}

.hot-rank--top {
  color: var(--color-primary, #36C99A);
}

.hot-word {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-primary, #1f2329);
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: var(--c-bg-container, #ffffff);
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
  /* R15-L08-D04：帧上历史 chip 实测 81×26px（x=17..97、y=205..231），高向只有 52rpx ⇒ 补 88rpx 下限 */
  min-height: 88rpx;
  box-sizing: border-box;
}

.history-clock {
  width: 24rpx;
  height: 24rpx;
}

.history-word {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-secondary, #4A524E);
}

.result-wrap {
  /* R11-L08-D05（间距 P2）：本页横向内衬改由「每棵子树的最外层容器」单点承担，
     此前 .result-wrap(0) / .result-meta(24) / .skeleton-wrap(24) / .post-list(24) /
     .group-list(24) 各写一档，且 .group-list>.skeleton-wrap 那一发是 24+24 双份内衬
     （骨架行与出数据后的行左缘对不上）。现在结果子树只有本节点写一次 --page-padding(32rpx)，
     四个子节点的横向归零 ⇒ 与 .suggest-wrap / .search-tabs / .search-header 同一根左缘线。
     纵向 16rpx 保持原档（页边距令牌只管横向）。 */
  padding: 16rpx var(--page-padding);
}

.result-meta {
  /* R11-L08-D05：横向内衬上移到 .result-wrap，此处归零，避免同一侧计两遍 */
  padding: 8rpx 0 16rpx;
}

.result-meta__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #8f959e);
}

.skeleton-wrap {
  /* R11-L08-D05：同上，横向归零（本节点同时挂在 .group-list 与 .result-wrap 两种深度下，
     归零后两处的左缘都只由最外层给一次，不再一个 32rpx 一个 64rpx） */
  padding: 0;
}

.post-list {
  /* R11-L08-D05：横向内衬上移到 .result-wrap，此处归零 */
  padding: 0;
}

.load-more {
  text-align: center;
  padding: 24rpx 0 40rpx;
}

.load-more__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #8f959e);
}

/* ========== v3 搜索分组 ========== */
.search-tabs {
  /* R6-L09-D20：.search-page 改纵向 flex 后，头部与分组条按内容高，不参与伸缩 */
  flex-shrink: 0;
  display: flex;
  gap: 16rpx;
  /* R11-L08-D05（间距 P2）：横向内衬 24rpx → 页边距令牌，与头部行/正文区左缘对齐 */
  padding: 12rpx var(--page-padding);
  /* R11-L08-D02（颜色token P2）第一半：裸值 #ffffff → 令牌。真值同为 #FFFFFF
     （design-variables.scss:128 $bg-container），这一发本身零像素，是把「非令牌裸值」归位；
     真正让分组控件读出来的是下面 .search-tab 那一发（未选中档此前也吃 --c-bg-container，
     与容器同色 ⇒ 边界 0 像素）。 */
  background: var(--c-bg-container);
  border-bottom: 1rpx solid var(--c-line, #EEF2F0);
}

.search-tab {
  /* R6-L09-D18（可达性 P2）：切「标签/学校」是本页主路径，实测热区只有 56×31px（62rpx），
     低于仓内自陈触控下限 AppShell.vue:334「min-height: 88rpx(44px)」⇒ 与返回键同口径补 min-height，
     视觉 pill 尺寸不变（文字改由 flex 居中） */
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  /* R11-L08-D02（颜色token P2）第二半：未选中档原引 --c-bg-container（真值 #FFFFFF，
     兜底字面量 #F2F3F5 是第二笔过期债）⇒ 与刚改的分组条底色同色，帧上两枚未选中 Tab
     只剩黑字、没有胶囊，与左侧实心选中项并置后读成「一个按钮 + 两段说明文字」。
     按同页 .search-box（R6-L09-D17 已批口径：输入/浅底块走 --c-bg-surface + 浅描边）
     同一配方归位：--c-bg-surface #F3FAF6（:129）+ --c-border-default #DDE3E0（:190）。
     描边取 --c-border-default 而非卡建议的 --c-border-light #EEF2F0：后者对白只有 1.13:1，
     前者 1.30:1，同页 .user-row/.school-row 的描边也是这一档；两档都达不到非文本 3:1
     （浅色系令牌里没有任何一档对白能到 3:1，最深档 --c-border-strong #C2CAC6 只有 1.67:1），
     故这一发的判点是「控件边界从 0 像素变成看得见」，不是 3:1 达标，3:1 那一列留待令牌侧。
     前景未动：--c-text-primary #1A1E1C 压 #F3FAF6 = 15.9:1，远高于 4.5:1。 */
  background: var(--c-bg-surface, #F3FAF6);
  border: 1rpx solid var(--c-border-default, #DDE3E0);
}

.search-tab--active {
  /* R14-L07-D18（可达性 P1）：选中分组「用户」= 白字压实心主色胶囊，帧上底采样 (32,195,143)≈#36C99A
     与令牌 --c-brand 逐字对上，白字对它的对比度 2.10:1（§2 已实测），既不达 4.5:1 也不达 3:1；
     标签 .search-tab__text 是 --fs-md 26rpx(13px)/600，不享 WCAG 大字号豁免 ⇒ 当前选中哪一个
     分组是靠「绿底」而非「读得出字」表达的。与 daily-question:518（R9 同口径）一致，
     选中档底色降到 --c-brand-800 #156B51（design-variables.scss:18）：
       L(#156B51)=0.2126*0.00750+0.7152*0.14712+0.0722*0.08227=0.11269
       ⇒ 纯白 1.05/0.16269=6.45:1 ≥4.5:1（13px 白字达标）。 */
  background: var(--c-brand-800, #156B51);
  /* R11-L08-D02：选中档继承上面的描边会在实心胶囊外圈留一圈灰边，与「实心」读法冲突 ⇒ 收掉，
     透明描边保留占位，几何逐像素不变（同 .search-tab 的 88rpx 下限） */
  border-color: transparent;
}

.search-tab__text {
  font-size: var(--fs-md, 26rpx);
  font-weight: 600;
  color: var(--c-text-primary, #222222);
}

.search-tab--active .search-tab__text {
  /* R14-L07-D21（颜色token P3）：反白字色原写裸字面量 #ffffff，本页其余文字节点一律走 var(--c-text-*)，
     同仓已有反白令牌 --c-text-inverse（daily-question:530 同场景即用）⇒ 换成令牌，主题翻色时跟随。
     兜底 #ffffff 与 --c-text-overlay-text-primary 合成档一致（design-variables.scss:369→:749）。 */
  color: var(--c-text-inverse, #ffffff);
}

.group-list {
  /* R11-L08-D05：横向内衬上移到 .result-wrap，此处只留纵向档（用户/学校两分组的行容器） */
  padding: 16rpx 0;
}

.user-row, .school-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
  background: #ffffff;
  border-radius: 18rpx;
  border: 1rpx solid var(--c-line, #EEF2F0);
}

.user-row__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--c-bg-page, #F0F2F5);
  flex-shrink: 0;
}

.user-row__info, .school-row__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.user-row__name, .school-row__name {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.user-row__meta, .school-row__meta {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-secondary, #666666);
}

.user-row__arrow, .school-row__arrow {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #666666);
  flex-shrink: 0;
}

.school-row__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: var(--c-brand-50, #E8FAF3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.school-row__icon-img {
  width: 36rpx;
  height: 36rpx;
}

.campus-preview {
  margin: 0 0 24rpx;
  padding: 20rpx 24rpx;
  background: var(--c-bg-page, #EEF7F2);
  border-radius: 18rpx;
}

.campus-preview__title {
  font-size: var(--fs-md, 26rpx);
  font-weight: 700;
  color: var(--c-text-primary, #222222);
  display: block;
  margin-bottom: 16rpx;
}

.campus-preview__users {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.campus-person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  width: 120rpx;
}

.campus-person__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--c-bg-page, #F0F2F5);
}

.campus-person__name {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-primary, #222222);
}

.campus-preview__empty-text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-secondary, #666666);
}

</style>

