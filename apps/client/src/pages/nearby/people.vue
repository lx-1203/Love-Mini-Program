<script setup lang="ts">
/**
 * 附近的人 / 同城的人（v3 Nearby 冻结 · 单页双态）
 * ?scope=nearby|city
 * - nearby：距离 → 活跃度
 * - city：活跃度 → 推荐度
 * 整行点击进他人主页；页面不出现喜欢/悄悄话/匹配按钮，不使用滑动卡片。
 */
import { ref, computed } from "vue";
import { onLoad, onPullDownRefresh } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../services/api";
import { mapToDiscoverCard, NEARBY_MAX_DISTANCE_KM } from "../../stores/discover/utils";
import type { DiscoverCard } from "../../stores/discover/types";
import { openUserProfile } from "../../utils/navigation";
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();
const { styleVars: menuStyleVars } = useMenuButtonRect();

const scope = ref<"nearby" | "city">("nearby");
const list = ref<DiscoverCard[]>([]);
const loading = ref(false);
const errorMessage = ref("");

const title = computed(() =>
  scope.value === "city" ? t("nearby.peopleCity") : t("nearby.peopleNearby")
);

onLoad((query) => {
  scope.value = query?.scope === "city" ? "city" : "nearby";
  void load();
});

onPullDownRefresh(() => {
  void load().finally(() => uni.stopPullDownRefresh());
});

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const people = await clientApi.getRecommendations(
      scope.value === "nearby" ? { distanceMax: NEARBY_MAX_DISTANCE_KM } : {}
    );
    const cards = people.map((p) => mapToDiscoverCard(p));
    // nearby：距离 → 活跃度；city：活跃度 → 推荐度
    if (scope.value === "nearby") {
      cards.sort((a, b) => {
        const active = rank(a.activeStatusText) - rank(b.activeStatusText);
        if (active !== 0) return active;
        return (parseFloat(a.distanceText || "99") || 99) - (parseFloat(b.distanceText || "99") || 99);
      });
    } else {
      cards.sort((a, b) => {
        const active = rank(a.activeStatusText) - rank(b.activeStatusText);
        if (active !== 0) return active;
        return (b.commonCircleCount ?? 0) - (a.commonCircleCount ?? 0);
      });
    }
    list.value = cards;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("nearby.loadFailed");
  } finally {
    loading.value = false;
  }
}

/** 活跃度排序：just_now=0 / today=1 / 其余=2 */
function rank(status?: string): number {
  if (status === "just_now") return 0;
  if (status === "today") return 1;
  return 2;
}


/**
 * 距离文案：纯数值拼 km 单位，含单位/自定义文案直接展示。
 */
function formatDistance(raw?: string): string {
  if (!raw) return "";
  return /^\d+(\.\d+)?$/.test(raw) ? `${raw}km` : raw;
}

/** 在线识别：online / just_now 均视为在线 */
function isOnline(status?: string): boolean {
  return status === "online" || status === "just_now";
}
function openProfile(userId: string) {
  openUserProfile(userId);
}

function goBack() {
  uni.navigateBack();
}

/** 附近 / 同城 切换 */
function switchScope(next: "nearby" | "city") {
  if (next === scope.value) return;
  scope.value = next;
  void load();
}
</script>

<template>
  <view class="people-page" :style="menuStyleVars">
    <view class="people-header">
      <view class="people-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.back')" @tap="goBack">
        <text class="people-header__back-text">‹</text>
      </view>
      <text class="people-header__title">{{ title }}</text>
      <view class="people-header__spacer" />
    </view>

    <!-- 附近 / 同城 切换 -->
    <view class="people-tabs" role="tablist" :aria-label="t('nearby.peopleTabsAria')">
      <view
        class="people-tab"
        :class="{ 'people-tab--active': scope === 'nearby' }"
        role="tab"
        :aria-selected="scope === 'nearby' ? 'true' : 'false'"
        @tap="switchScope('nearby')"
      >
        <text class="people-tab__text">{{ t('nearby.peopleNearby') }}</text>
      </view>
      <view
        class="people-tab"
        :class="{ 'people-tab--active': scope === 'city' }"
        role="tab"
        :aria-selected="scope === 'city' ? 'true' : 'false'"
        @tap="switchScope('city')"
      >
        <text class="people-tab__text">{{ t('nearby.peopleCity') }}</text>
      </view>
    </view>

    <!-- 状态区 -->
    <view v-if="loading" class="people-state">
      <text class="people-state__text">{{ t('nearby.loading') }}</text>
    </view>
    <view v-else-if="errorMessage" class="people-state">
      <text class="people-state__text">{{ errorMessage }}</text>
      <view class="people-state__retry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.retry')" @tap="load">
        <text class="people-state__retry-text">{{ t('common.retry') }}</text>
      </view>
    </view>
    <view v-else-if="list.length === 0" class="people-state">
      <text class="people-state__text">{{ t('nearby.peopleEmpty') }}</text>
      <text class="people-state__hint">{{ t('nearby.peopleEmptyHint') }}</text>
    </view>

    <!-- 列表（纯列表，无操作按钮） -->
    <scroll-view v-else scroll-y class="people-list" :show-scrollbar="false">
      <view
        v-for="item in list"
        :key="item.id"
        class="people-row press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="item.name"
        @tap="openProfile(item.userId)"
      >
        <image class="people-row__avatar" :src="item.avatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
        <view class="people-row__info">
          <view class="people-row__name-row">
            <text class="people-row__name">{{ item.name }}</text>
            <text v-if="item.age" class="people-row__age">{{ item.age }}</text>
            <text v-if="isOnline(item.activeStatusText)" class="people-row__online-wrap">
              <image class="people-row__online-dot" :src="IMAGE_PATHS.ICONS_EMOJI.STATUS_ONLINE" mode="aspectFit" alt="" />
              <text class="people-row__online">{{ t('cardDetail.onlineLabel') }}</text>
            </text>
          </view>
          <text class="people-row__meta">{{ item.campusName || '' }}{{ item.campusName && item.distanceText ? ' · ' : '' }}{{ formatDistance(item.distanceText) }}</text>
          <view v-if="item.tags && item.tags.length" class="people-row__tags">
            <text v-for="tag in item.tags.slice(0, 3)" :key="tag" class="people-row__tag">{{ tag }}</text>
          </view>
        </view>
        <text class="people-row__arrow">›</text>
      </view>
      <view class="people-list__footer" />
    </scroll-view>
  </view>
</template>


<style scoped lang="scss">
.people-page {
  min-height: 100%;
  background: var(--c-bg-page, #F7FAF9);
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.people-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.people-header__back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
}

.people-header__back-text {
  font-size: 40rpx;
  color: var(--c-text-primary, #222222);
  line-height: 1;
}

.people-header__title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.people-header__spacer {
  width: 64rpx;
}

.people-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.people-tab {
  flex: 1;
  padding: 18rpx 0;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #FFFFFF);
  border: 2rpx solid var(--c-line, #EEF2F0);
}

.people-tab--active {
  border-color: var(--c-brand-500, #36C99A);
  background: var(--c-brand-50, #E8FAF3);
}

.people-tab__text {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-text-secondary, #666666);
}

.people-tab--active .people-tab__text {
  color: var(--c-brand-600, #36C99A);
}

.people-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 80rpx 40rpx;
}

.people-state__text {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #666666);
  text-align: center;
}

.people-state__hint {
  font-size: 22rpx;
  color: var(--c-text-quaternary, #C8CFCD);
  text-align: center;
}

.people-state__retry {
  margin-top: 8rpx;
  padding: 14rpx 48rpx;
  border-radius: var(--r-full, 9999rpx);
  border: 2rpx solid var(--c-line-strong, #DCE5E2);
}

.people-state__retry-text {
  font-size: 24rpx;
  color: var(--c-text-secondary, #666666);
}

.people-list {
  flex: 1;
  min-height: 0;
}

.people-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 16rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 20rpx;
  border: 1rpx solid var(--c-line, #EEF2F0);
}

.people-row__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--c-neutral-100, #F0F2F5);
  flex-shrink: 0;
}

.people-row__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.people-row__name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.people-row__name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.people-row__age {
  font-size: 26rpx;
  color: var(--c-text-secondary, #666666);
}

.people-row__online-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.people-row__online-dot {
  width: 16rpx;
  height: 16rpx;
  flex-shrink: 0;
}

.people-row__online {
  font-size: 20rpx;
  color: var(--c-brand-600, #36C99A);
}

.people-row__meta {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.people-row__tags {
  display: flex;
  gap: 10rpx;
}

.people-row__tag {
  padding: 6rpx 16rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-tag-green-bg, #EAF8F2);
  color: var(--c-tag-green-text, #279B70);
  font-size: 20rpx;
}

.people-row__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}

.people-list__footer {
  height: 48rpx;
}
</style>



