<script setup lang="ts">
/**
 * 搜索页（2026-08-11，参考贴吧搜索）
 *
 * 顶部搜索框（自动聚焦）+ 热搜词/搜索历史（未输入时）+ 帖子搜索结果流
 * （复用 PostCard 卡片，含「标题命中」标识）。
 */
import { computed, onMounted, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSearchStore } from "../../../stores/search";
import { useVillageStore } from "../../../stores/village";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
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

const { t } = useI18n();
const searchStore = useSearchStore();
const villageStore = useVillageStore();

const inputFocused = ref(true);

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
}

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
    campusPeople.value = people.map((p) => mapToDiscoverCard(p)).slice(0, 5);
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
  <view class="search-page">
    <!-- 顶部搜索栏 -->
    <view class="search-header">
      <view class="search-box" role="search" :aria-label="t('search.placeholder')">
        <image class="search-icon" :src="IMAGE_PATHS.ICONS_COMMON.SEARCH" mode="aspectFit" alt="" />
        <input
          v-model="searchStore.keyword"
          class="search-input"
          :placeholder="t('search.placeholder')"
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

      <EmptyState v-if="searchStore.hotSearches.length === 0 && searchStore.history.length === 0" type="no-data" :message="t('search.emptyHint')" />
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
          <image class="user-row__avatar" :src="u.avatarUrl || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
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
          @tap="openCampusProfile(t(s.nameKey ?? s.name))"
        >
          <view class="school-row__icon">
            <image class="school-row__icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.SCHOOL" mode="aspectFit" alt="" />
          </view>
          <view class="school-row__info">
            <text class="school-row__name">{{ t(s.nameKey ?? s.name) }}</text>
            <text class="school-row__meta">{{ s.city ?? '' }}</text>
          </view>
          <text class="school-row__arrow">{{ campusExpanded === t(s.nameKey ?? s.name) ? '收起' : '校园主页' }}</text>
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
              <image class="campus-person__avatar" :src="person.avatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
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
  background: var(--bg-page, #f7f7f9);
  padding-bottom: env(safe-area-inset-bottom);
}

.search-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  height: 72rpx;
  background: var(--bg-input, #f2f3f5);
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
  flex: 1;
  font-size: 28rpx;
  color: var(--text-primary, #1f2329);
}

.search-clear-img {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.search-cancel {
  font-size: 28rpx;
  color: var(--color-primary, #ff6b81);
  flex-shrink: 0;
}

.suggest-wrap {
  padding: 24rpx;
}

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
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary, #1f2329);
}

.section-fire {
  width: 30rpx;
  height: 30rpx;
}

.section-clear {
  font-size: 24rpx;
  color: var(--text-tertiary, #8f959e);
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
  background: #fff;
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
}

.hot-rank {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-tertiary, #8f959e);
}

.hot-rank--top {
  color: var(--color-primary, #ff6b81);
}

.hot-word {
  font-size: 26rpx;
  color: var(--text-primary, #1f2329);
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
  background: #fff;
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
}

.history-clock {
  width: 24rpx;
  height: 24rpx;
}

.history-word {
  font-size: 26rpx;
  color: var(--text-secondary, #4e5969);
}

.result-wrap {
  padding: 16rpx 0;
}

.result-meta {
  padding: 8rpx 24rpx 16rpx;
}

.result-meta__text {
  font-size: 24rpx;
  color: var(--text-tertiary, #8f959e);
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
  font-size: 24rpx;
  color: var(--text-tertiary, #8f959e);
}

/* ========== v3 搜索分组 ========== */
.search-tabs {
  display: flex;
  gap: 16rpx;
  padding: 12rpx 24rpx;
  background: #ffffff;
  border-bottom: 1rpx solid var(--c-line, #EEF2F0);
}

.search-tab {
  padding: 12rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--bg-input, #F2F3F5);
}

.search-tab--active {
  background: #36C99A;
}

.search-tab__text {
  font-size: 26rpx;
  font-weight: 600;
  color: #222222;
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
  border: 1rpx solid #EEF2F0;
}

.user-row__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #F0F2F5;
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
  font-size: 28rpx;
  font-weight: 700;
  color: #222222;
}

.user-row__meta, .school-row__meta {
  font-size: 22rpx;
  color: #666666;
}

.user-row__arrow, .school-row__arrow {
  font-size: 24rpx;
  color: #666666;
  flex-shrink: 0;
}

.school-row__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: #EAF8F2;
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
  background: #F7FAF9;
  border-radius: 18rpx;
}

.campus-preview__title {
  font-size: 26rpx;
  font-weight: 700;
  color: #222222;
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
  background: #F0F2F5;
}

.campus-person__name {
  font-size: 22rpx;
  color: #222222;
}

.campus-preview__empty-text {
  font-size: 22rpx;
  color: #666666;
}

</style>

