<template>
  <view class="favorites-page">
    <view class="favorites-header">
      <view
        class="favorites-header__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.back')"
        @tap="goBack"
      >
        <image class="favorites-header__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
      </view>
      <text class="favorites-header__title">{{ t('profile.favoritesTitle', { n: favorites.length }) }}</text>
    </view>

    <view v-if="loading" class="favorites-state">
      <text class="favorites-state__text">{{ t('common.loading') }}</text>
    </view>

    <view v-else-if="favorites.length === 0" class="favorites-empty card-base">
      <image class="favorites-empty__icon" :src="IMAGE_PATHS.ICONS_EMOJI.BOOKMARK" mode="aspectFit" alt="" />
      <text class="favorites-empty__title">{{ t('profile.favoritesEmpty') }}</text>
      <text class="favorites-empty__desc">{{ t('profile.favoritesEmptyDesc') }}</text>
    </view>

    <scroll-view v-else scroll-y class="favorites-list">
      <view
        v-for="post in favorites"
        :key="post.id"
        class="favorite-card card-base"
        @tap="openPost(post.id)"
      >
        <view v-if="post.images && post.images.length > 0" class="favorite-card__cover">
          <SafeImage :src="resolveMediaUrl(post.images[0])" custom-class="favorite-card__cover-img" mode="aspectFill" />
        </view>
        <view class="favorite-card__body">
          <view class="favorite-card__author">
            <image class="favorite-card__avatar" :src="resolveMediaUrl(post.author.avatar)" mode="aspectFill" alt="" />
            <text class="favorite-card__name">{{ post.author.name }}</text>
            <text class="favorite-card__campus" v-if="post.author.campusName">{{ post.author.campusName }}</text>
          </view>
          <text class="favorite-card__title">{{ post.title }}</text>
          <text class="favorite-card__content">{{ post.content }}</text>
          <view class="favorite-card__meta">
            <text class="favorite-card__count">{{ t('profile.favoritesCount', { n: post.favorites }) }}</text>
            <view class="favorite-card__unfav press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap.stop="unfavorite(post.id)">
              <text class="favorite-card__unfav-text">{{ t('profile.unfavorite') }}</text>
            </view>
          </view>
        </view>
      </view>
      <view class="list-bottom-spacer" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useVillageStore } from "../../../stores/village";
import { IMAGE_PATHS } from "../../../config/images";
import SafeImage from "../../../components/common/SafeImage.vue";
import { resolveMediaUrl } from "../../../utils/media";

const { t } = useI18n();
const villageStore = useVillageStore();
const { posts, loading } = storeToRefs(villageStore);

const favorites = computed(() => posts.value.filter((p) => p.isFavorite));

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: "/pages/profile/index" }) });
}

function openPost(id: string) {
  villageStore.setCurrentPost(id);
  uni.navigateTo({ url: `/subpackages/village/village/detail?id=${id}` });
}

async function unfavorite(id: string) {
  await villageStore.toggleFavorite(id);
  uni.showToast({ title: t("profile.unfavoriteDone"), icon: "none" });
}

onShow(() => {
  // 登录态需要 token；未登录时由 mock/回退数据提供
  void villageStore.fetchPosts({}, true).catch(() => {
    /* mock/回退数据兜底 */
  });
});
</script>

<style scoped lang="scss">
.favorites-page {
  min-height: 100vh;
  background: var(--c-bg-page, #F7FAF9);
  padding: 0 var(--sp-6, 24rpx);
}

.favorites-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: calc(env(safe-area-inset-top) + 16rpx) 0 24rpx;
}

.favorites-header__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-container, #FFFFFF);
}

.favorites-header__back-icon { width: 36rpx; height: 36rpx; }
.favorites-header__title {
  font-size: var(--fs-xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1E1E1E);
}

.favorites-state { padding: 120rpx 0; text-align: center; }
.favorites-state__text { color: var(--c-text-secondary, #666666); font-size: 26rpx; }

.favorites-empty { margin-top: 40rpx; padding: 80rpx 40rpx; text-align: center; }
.favorites-empty__icon { width: 80rpx; height: 80rpx; margin-bottom: 16rpx; }
.favorites-empty__title { font-size: 30rpx; font-weight: 600; color: var(--c-text-primary, #1E1E1E); display: block; }
.favorites-empty__desc { font-size: 24rpx; color: var(--c-text-secondary, #666666); margin-top: 8rpx; }

.favorites-list { height: calc(100vh - 120rpx); }
.favorite-card {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  margin-top: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-lg, 20rpx);
  box-shadow: var(--s-card-soft);
}
.favorite-card__cover {
  width: 160rpx;
  height: 160rpx;
  border-radius: var(--r-md, 16rpx);
  overflow: hidden;
  flex-shrink: 0;
}
.favorite-card__cover-img { width: 100%; height: 100%; }
.favorite-card__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.favorite-card__author { display: flex; align-items: center; gap: 8rpx; }
.favorite-card__avatar { width: 40rpx; height: 40rpx; border-radius: 50%; }
.favorite-card__name { font-size: 24rpx; font-weight: 600; color: var(--c-text-primary, #1E1E1E); }
.favorite-card__campus { font-size: 20rpx; color: var(--c-text-tertiary, #999999); }
.favorite-card__title { font-size: 28rpx; font-weight: 700; color: var(--c-text-primary, #1E1E1E); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.favorite-card__content {
  font-size: 24rpx; color: var(--c-text-secondary, #666666);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.favorite-card__meta { display: flex; align-items: center; justify-content: space-between; margin-top: 4rpx; }
.favorite-card__count { font-size: 22rpx; color: var(--c-text-tertiary, #999999); }
.favorite-card__unfav {
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  border: 2rpx solid var(--c-brand-500, #2DB98A);
  color: var(--c-brand-500, #2DB98A);
  font-size: 22rpx;
}
.favorite-card__unfav-text { color: inherit; }
.list-bottom-spacer { height: 60rpx; }
</style>