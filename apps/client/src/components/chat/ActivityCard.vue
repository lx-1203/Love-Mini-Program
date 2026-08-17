<script setup lang="ts">
/**
 * 活动卡片消息组件（消息 V3）。
 * 支持普通私聊 activity 卡与官方号活动卡快照。
 */
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";

export interface ActivityCardData {
  title: string;
  desc: string;
  tag: string;
  targetUrl: string;
  image?: string | null;
  time?: string | null;
  distance?: string | null;
  count?: number | null;
  recommendReason?: string | null;
}

const props = withDefaults(
  defineProps<{
    card: ActivityCardData;
  }>(),
  {}
);

const emit = defineEmits<{
  tapCard: [targetUrl: string];
}>();

const { t } = useI18n();

const chevronRightSrc = IMAGE_PATHS.ICONS_COMMON.CHEVRON_RIGHT_SVG;
const placeholderSrc = IMAGE_PATHS.MESSAGE_ICONS.PHOTO_PLACEHOLDER;

function handleTap() {
  if (props.card.targetUrl) {
    emit("tapCard", props.card.targetUrl);
  }
}
</script>

<template>
  <view class="activity-card press-feedback" hover-class="press-feedback--active" @tap="handleTap">
    <image
      class="activity-card__image"
      :src="card.image ? resolveMediaUrl(card.image) : placeholderSrc"
      mode="aspectFill"
    />
    <view class="activity-card__body">
      <view class="activity-card__header">
        <text v-if="card.tag" class="activity-card__tag">{{ card.tag }}</text>
        <text class="activity-card__title">{{ card.title }}</text>
      </view>
      <text v-if="card.desc" class="activity-card__desc">{{ card.desc }}</text>
      <text v-if="card.recommendReason" class="activity-card__reason">{{ card.recommendReason }}</text>
      <view class="activity-card__meta">
        <text v-if="card.time" class="activity-card__meta-item">{{ card.time }}</text>
        <text v-if="card.distance" class="activity-card__meta-item">{{ card.distance }}</text>
        <text v-if="card.count != null" class="activity-card__meta-item">{{ card.count }}人参加</text>
      </view>
      <view class="activity-card__cta">
        <text>{{ t("chat.activityCardCta") }}</text>
        <image class="activity-card__cta-arrow" :src="chevronRightSrc" mode="aspectFit" alt="" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.activity-card {
  width: 622rpx;
  border-radius: 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8F8F1;
  overflow: hidden;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.05);
}
.activity-card__image {
  width: 100%;
  height: 220rpx;
  display: block;
}
.activity-card__body {
  padding: 20rpx 24rpx;
}
.activity-card__header {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.activity-card__tag {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  color: #FFFFFF;
  background: #FF6B81;
  flex-shrink: 0;
}
.activity-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: #222222;
}
.activity-card__desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #666666;
}
.activity-card__reason {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #36C99A;
}
.activity-card__meta {
  display: flex;
  gap: 16rpx;
  margin-top: 12rpx;
}
.activity-card__meta-item {
  font-size: 22rpx;
  color: #999999;
}
.activity-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #36C99A;
  font-weight: 600;
}
.activity-card__cta-arrow {
  width: 20rpx;
  height: 20rpx;
}
</style>

