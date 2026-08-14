<script setup lang="ts">
/**
 * 搜索页（2026-08-11，参考贴吧搜索）
 *
 * 顶部搜索框（自动聚焦）+ 热搜词/搜索历史（未输入时）+ 帖子搜索结果流
 * （复用 PostCard 卡片，含「标题命中」标识）。
 */
import { onMounted, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSearchStore } from "../../stores/search";
import { useVillageStore } from "../../stores/village";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";
import { IMAGE_PATHS } from "../../config/images";
import PostCard from "../../components/village/PostCard.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import Skeleton from "../../components/common/Skeleton.vue";
import { showErrorToast } from "../../utils/error-toast";

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
    void searchStore.search(true);
  }
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
  void searchStore.searchByTerm(term);
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
</style>
