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
           实测墨迹 y=507..516），不走规范 §1.5 的空态组件形态（插画+主文案），比同页结果空态(:345)弱一档
           ⇒ 两个分支合并为同一枚 EmptyState（type=no-data + hide-sub），热搜为空一律给组件形态。 -->
      <EmptyState v-if="searchStore.hotSearches.length === 0" type="no-data" :message="t('search.emptyHint')" hide-sub />
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
     = 80px，正好贴胶囊左缘），22px 全部并入 .search-box（flex:1）⇒ 文本可用宽 145px→167px。 */
  padding: var(--sp-4) calc(var(--capsule-right, 7px) + 73px) var(--sp-4) var(--sp-6);
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
  height: 72rpx;
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
}

.suggest-wrap {
  /* R6-L09-D20：未搜索态撑满头部/分组 tab 之外的剩余视口，内容垂直居中 */
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24rpx;
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

.section-fire {
  width: 30rpx;
  height: 30rpx;
}

.section-clear {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #8f959e);
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
}

.hot-rank {
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: var(--c-text-tertiary, #8f959e);
}

.hot-rank--top {
  color: var(--color-primary, #ff6b81);
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
}

.history-clock {
  width: 24rpx;
  height: 24rpx;
}

.history-word {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-secondary, #4e5969);
}

.result-wrap {
  padding: 16rpx 0;
}

.result-meta {
  padding: 8rpx 24rpx 16rpx;
}

.result-meta__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #8f959e);
}

.skeleton-wrap {
  padding: 0 24rpx;
}

.post-list {
  padding: 0 24rpx;
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
  padding: 12rpx 24rpx;
  background: #ffffff;
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
  background: var(--c-bg-container, #F2F3F5);
}

.search-tab--active {
  background: var(--c-brand, #36C99A);
}

.search-tab__text {
  font-size: var(--fs-md, 26rpx);
  font-weight: 600;
  color: var(--c-text-primary, #222222);
}

.search-tab--active .search-tab__text {
  color: #ffffff;
}

.group-list {
  padding: 16rpx 24rpx;
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
  background: var(--c-brand-50, #EAF8F2);
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

