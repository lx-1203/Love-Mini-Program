<script setup lang="ts">
/**
 * 细分发现页（v3.1 契约 01 发现 → 快捷入口）
 * ?type=online|sameSchool|sameInterest|nearby|newcomer|highMatch
 */
import { ref, computed } from "vue";
import { onLoad, onPullDownRefresh } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../../services/api";
import { mapToDiscoverCard } from "../../../stores/discover/utils";
import type { DiscoverCard } from "../../../stores/discover/types";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
import { openAppPath } from "../../../utils/navigation";
import { IMAGE_PATHS } from "../../../config/images";
import { showErrorToast } from "../../../utils/error-toast";

const { t } = useI18n();

const segType = ref("online");
const list = ref<DiscoverCard[]>([]);
const loading = ref(false);
const errorMessage = ref("");

const TYPE_LABEL_KEY: Record<string, string> = {
  online: "home.segmentOnline",
  sameSchool: "home.segmentSameSchool",
  sameInterest: "home.segmentSameInterest",
  nearby: "home.segmentNearby",
  newcomer: "home.segmentNewcomer",
  highMatch: "home.segmentHighMatch",
};

const title = computed(() => `${t("home.segmentTitle")} · ${t(TYPE_LABEL_KEY[segType.value] ?? "home.segmentOnline")}`);

onLoad((query) => {
  const type = query?.type;
  if (type && typeof type === "string" && TYPE_LABEL_KEY[type]) {
    segType.value = type;
  }
  void load();
});

onPullDownRefresh(() => {
  void load().finally(() => uni.stopPullDownRefresh());
});

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const people = await clientApi.getRecommendations(buildFilter());
    list.value = people.map((p) => mapToDiscoverCard(p));
    if (segType.value !== "online" && segType.value !== "nearby") {
      list.value = list.value.filter(predicate).slice(0, 50);
    }
  } catch (error) {
    showErrorToast(error, t("nearby.loadFailed"));
    errorMessage.value = error instanceof Error ? error.message : t("nearby.loadFailed");
  } finally {
    loading.value = false;
  }
}

function buildFilter() {
  if (segType.value === "online") return { onlineOnly: true };
  if (segType.value === "nearby") return { distanceMax: 5 };
  return {};
}

function predicate(card: DiscoverCard): boolean {
  switch (segType.value) {
    case "sameSchool":
      return card.isSameSchool === true;
    case "sameInterest":
      return (card.commonCircleCount ?? 0) > 0;
    case "newcomer":
      return true;
    case "highMatch":
      return (card.commonCircleCount ?? 0) >= 3;
    default:
      return true;
  }
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
  openAppPath(`/subpackages/profile-extra/profile/other?userId=${encodeURIComponent(userId)}`);
}
</script>

<template>
  <view class="segment-page">
    <view class="segment-header">
      <text class="segment-header__title">{{ title }}</text>
    </view>

    <view v-if="loading" class="segment-state">
      <SkeletonBlock variant="list" :rows="4" :label="t('common.loading')" />
    </view>
    <view v-else-if="errorMessage" class="segment-state">
      <text class="segment-state__text">{{ errorMessage }}</text>
      <view class="segment-retry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.retry')" @tap="load">
        <text class="segment-retry__text">{{ t('common.retry') }}</text>
      </view>
    </view>
    <view v-else-if="list.length === 0" class="segment-state">
      <text class="segment-state__text">{{ t('home.segmentEmpty') }}</text>
    </view>
    <view v-else class="segment-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="segment-row press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="item.name"
        @tap="openProfile(item.userId)"
      >
        <image class="segment-row__avatar" :src="item.avatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
        <view class="segment-row__info">
          <view class="segment-row__name-row">
            <text class="segment-row__name">{{ item.name }}</text>
            <text v-if="isOnline(item.activeStatusText)" class="segment-row__online-wrap">
              <image class="segment-row__online-dot" :src="IMAGE_PATHS.ICONS_EMOJI.STATUS_ONLINE" mode="aspectFit" alt="" />
              <text class="segment-row__online">{{ t('cardDetail.onlineLabel') }}</text>
            </text>
          </view>
          <text class="segment-row__meta">{{ item.campusName || '' }}{{ item.campusName && item.distanceText ? ' · ' : '' }}{{ formatDistance(item.distanceText) }}</text>
        </view>
        <text class="segment-row__arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.segment-page {
  min-height: 100%;
  background: var(--c-bg-page, #EEF7F2);
  padding: 24rpx 32rpx 64rpx;
  box-sizing: border-box;
}

.segment-header {
  padding: 16rpx 0 24rpx;
}

.segment-header__title {
  font-size: 44rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.segment-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 120rpx 0;
}

.segment-state__text {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #666666);
}

.segment-retry {
  padding: 14rpx 40rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand, #36C99A);
}

.segment-retry__text {
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
}

.segment-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.segment-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: var(--c-bg-container, #ffffff);
  border-radius: 18rpx;
  border: 1rpx solid var(--c-line, #EEF2F0);
}

.segment-row__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--c-neutral-100, #F0F2F5);
  flex-shrink: 0;
}

.segment-row__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.segment-row__name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.segment-row__name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.segment-row__online-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.segment-row__online-dot {
  width: 16rpx;
  height: 16rpx;
  flex-shrink: 0;
}

.segment-row__online {
  font-size: 20rpx;
  color: var(--c-brand-600, #36C99A);
}

.segment-row__meta {
  font-size: 22rpx;
  color: var(--c-text-tertiary, #666666);
}

.segment-row__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}
</style>



