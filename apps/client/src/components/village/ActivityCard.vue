<script setup lang="ts">
/**
 * 活动卡片（ActivityCard）
 *
 * 2026-08-08 频道化重构：活动链接帖的活动卡 + 活动频道列表项。
 * - compact：帖子内嵌（标题/时间/地点/报名数/报名按钮），点击跳活动详情
 * - full：活动频道列表（+封面图/状态标签/展开描述）
 *
 * 使用方式：
 * <ActivityCard :activity="post.activity" :compact="true" @open-detail="..." />
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { ActivitySummaryView } from "../../stores/village";
import { IMAGE_PATHS } from "../../config/images";

/** 活动卡数据（兼容帖子内嵌 ActivitySummaryView 与活动频道 ActivityItem） */
export interface ActivityCardData {
  id: number | string;
  title: string;
  location: string;
  scheduleText: string;
  status?: string;
  enrollmentCount?: number;
  coverImage?: string;
  description?: string;
}

const props = defineProps<{
  activity: ActivityCardData | ActivitySummaryView;
  /** true = 帖子内嵌紧凑模式（默认），false = 活动频道完整卡片 */
  compact?: boolean;
  /** 当前用户是否已报名（full 模式显示） */
  enrolled?: boolean;
}>();

const emit = defineEmits<{
  (e: "open-detail", id: number | string): void;
  (e: "enroll", id: number | string): void;
}>();

const { t } = useI18n();

/** 状态标签文案（无状态标签时不显示） */
const statusText = computed(() => {
  switch (props.activity.status) {
    case "ongoing":
      return t("village.activityOngoing");
    case "ended":
      return t("village.activityEnded");
    case "upcoming":
      return t("village.activityUpcoming");
    default:
      return "";
  }
});

function openDetail() {
  emit("open-detail", props.activity.id);
}

function enroll(e: { stopPropagation?: () => void }) {
  e?.stopPropagation?.();
  emit("enroll", props.activity.id);
}
</script>

<template>
  <view
    class="activity-card press-feedback"
    hover-class="activity-card--pressed"
    hover-stay-time="100"
    role="button"
    :aria-label="t('village.activityCardAria', { title: activity.title })"
    @tap="openDetail"
  >
    <!-- 封面（full 模式） -->
    <image
      v-if="!compact && activity.coverImage"
      class="activity-card__cover"
      :src="activity.coverImage"
      mode="aspectFill"
      lazy-load
      alt=""
    />

    <view class="activity-card__body">
      <view class="activity-card__title-row">
        <view class="activity-card__title-wrap">
          <image class="activity-card__pin" :src="IMAGE_PATHS.ICONS_EMOJI.CALENDAR" mode="aspectFit" alt="" />
          <text class="activity-card__title">{{ activity.title }}</text>
        </view>
        <text v-if="statusText" class="activity-card__status">{{ statusText }}</text>
      </view>

      <view class="activity-card__meta">
        <view class="activity-card__meta-item">
          <image class="activity-card__meta-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CLOCK" mode="aspectFit" alt="" />
          <text class="activity-card__meta-text">{{ activity.scheduleText }}</text>
        </view>
        <view class="activity-card__meta-item">
          <image class="activity-card__meta-icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
          <text class="activity-card__meta-text">{{ activity.location }}</text>
        </view>
        <view class="activity-card__meta-item">
          <image class="activity-card__meta-icon" :src="IMAGE_PATHS.ICONS_EMOJI.USER" mode="aspectFit" alt="" />
          <text class="activity-card__meta-text">{{ t("village.activityEnrolledCount", { n: activity.enrollmentCount }) }}</text>
        </view>
      </view>

      <!-- full 模式：展开描述 -->
      <text v-if="!compact" class="activity-card__desc">
        {{ activity.description }}
      </text>
    </view>

    <!-- 报名按钮（compact 内嵌在帖子内；已报名显示"已报名"态） -->
    <view
      class="activity-card__enroll press-feedback"
      hover-class="activity-card__enroll--pressed"
      hover-stay-time="100"
      :class="{ 'activity-card__enroll--done': enrolled }"
      role="button"
      :aria-label="enrolled ? t('village.activityEnrolled') : t('village.activityEnroll')"
      @tap="enroll"
    >
      <text class="activity-card__enroll-text">{{ enrolled ? t("village.activityEnrolled") : t("village.activityEnroll") }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   ActivityCard - 活动卡片（紧凑内嵌 / 完整列表）
   ================================================================ */
.activity-card {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-bg-brand-soft, #f0fdf9);
  border: 1rpx solid var(--c-brand-100, #ccfbef);
}

.activity-card--pressed {
  transform: scale(0.99);
}

.activity-card__cover {
  width: 160rpx;
  height: 120rpx;
  border-radius: var(--r-md);
  flex-shrink: 0;
  background: var(--c-neutral-50);
}

.activity-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.activity-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.activity-card__title-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-width: 0;
}

.activity-card__pin {
  width: 30rpx;
  height: 30rpx;
  flex-shrink: 0;
}

.activity-card__title {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-card__status {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: var(--r-full);
  font-size: 20rpx;
  color: var(--c-brand-500, #3fcf8e);
  background: var(--c-bg-brand-soft, #f0fdf9);
  border: 1rpx solid var(--c-brand-100, #ccfbef);
}

.activity-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0 16rpx;
}

.activity-card__meta-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.activity-card__meta-icon {
  width: 24rpx;
  height: 24rpx;
}

.activity-card__meta-text {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}

.activity-card__desc {
  font-size: 24rpx;
  color: var(--c-text-secondary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.activity-card__enroll {
  flex-shrink: 0;
  padding: 10rpx 22rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-card__enroll--pressed {
  opacity: 0.8;
  transform: scale(0.96);
}

.activity-card__enroll--done {
  background: var(--c-neutral-100, #eef1f6);
}

.activity-card__enroll-text {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--c-neutral-0);
}

.activity-card__enroll--done .activity-card__enroll-text {
  color: var(--c-text-tertiary);
}
</style>
