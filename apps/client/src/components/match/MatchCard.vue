<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import SwipeContainer from "../common/swipe/SwipeContainer.vue";
import SafeImage from "../common/SafeImage.vue";
import MatchInfo from "./MatchInfo.vue";
import { IMAGE_PATHS } from "../../config/images";
import type { MatchCardUser } from "../../types/match";

const props = withDefaults(
  defineProps<{
    user: MatchCardUser;
    disabled?: boolean;
  }>(),
  { disabled: false }
);

const emit = defineEmits<{
  (e: "tap"): void;
  (e: "swipe-left"): void;
  (e: "swipe-right"): void;
}>();

const { t } = useI18n();

const photo = computed(() => props.user.photo || props.user.avatar || IMAGE_PATHS.DEFAULT_AVATAR);

const onlineText = computed(() => {
  if (props.user.onlineStatus === "online" || props.user.activeStatusText === "online" || props.user.activeStatusText === "just_now") return "在线";
  return "";
});

const distanceText = computed(() => {
  const raw = props.user.distanceText;
  if (raw && raw.trim().length > 0) {
    const value = raw.trim();
    // 纯数字（如 "1.2"）：自动补 km 单位 → "1.2km"
    if (/^\d+(\.\d+)?$/.test(value)) return `${value}km`;
    // 已带单位（"km" / "米"）或 "同校" 等非数值文案：原样保留
    return value;
  }
  if (props.user.isSameSchool) return "同校";
  return "";
});

const isOnline = computed(() => props.user.onlineStatus === "online" || props.user.activeStatusText === "online" || props.user.activeStatusText === "just_now");

/** 匹配度圆环角度（0-360） */
const scoreAngle = computed(() => Math.max(0, Math.min(100, props.user.matchScore)) * 3.6);

</script>

<template>
  <SwipeContainer
    class="match-card-swipe"
    :disabled="disabled"
    @tap="emit('tap')"
    @swipe-left="emit('swipe-left')"
    @swipe-right="emit('swipe-right')"
  >
    <view class="match-card">
      <slot name="photo">
        <SafeImage
          class="match-card__photo"
          :src="photo"
          :fallback="IMAGE_PATHS.DEFAULT_AVATAR"
          mode="aspectFill"
          root-class="match-card__photo-root"
          custom-class="match-card__photo-img"
          :lazy-load="false"
          alt=""
        />
      </slot>

      <view class="match-card__overlay" />

      <!-- 距离标签：左上角粉色胶囊 + 白字 -->
      <view v-if="distanceText" class="match-card__distance">
        <text class="match-card__distance-text">{{ distanceText }}</text>
      </view>

      <!-- 在线状态：右上角绿色胶囊 + 白字 -->
      <slot name="online-badge">
        <view v-if="onlineText" class="match-card__online">
          <text class="match-card__online-dot" :class="{ 'match-card__online-dot--away': !isOnline }" />
          <text class="match-card__online-text">{{ onlineText }}</text>
        </view>
      </slot>

      <!-- 匹配度徽章：右下角绿色圆环进度 + 文字 -->
      <slot name="match-score">
        <view class="match-card__score">
          <view
            class="match-card__score-ring"
            :style="{ background: `conic-gradient(#36C99A 0deg, #55D5A7 ${scoreAngle}deg, rgba(255,255,255,0.45) ${scoreAngle}deg 360deg)` }"
          >
            <view class="match-card__score-ring-inner">
              <text class="match-card__score-value">{{ user.matchScore }}%</text>
            </view>
          </view>
          <text class="match-card__score-label">{{ t('matchV1.matchScore') }}</text>
        </view>
      </slot>

      <slot name="info">
        <view class="match-card__info">
          <MatchInfo :user="user" />
        </view>
      </slot>

      <slot name="extra" />
    </view>
  </SwipeContainer>
</template>

<style scoped lang="scss">
.match-card-swipe {
  width: 100%;
  height: 100%;
}

.match-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 48rpx;
  overflow: hidden;
  background: #eef3f1;
  box-shadow: 0 16rpx 40rpx rgba(26, 55, 48, 0.16);
}

.match-card__photo-root {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.match-card__photo-img {
  width: 100%;
  height: 100%;
  display: block;
}

.match-card__overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 62%;
  background: linear-gradient(
    180deg,
    rgba(13, 19, 19, 0) 0%,
    rgba(13, 19, 19, 0.25) 42%,
    rgba(10, 14, 14, 0.7) 100%
  );
  pointer-events: none;
}

.match-card__distance {
  position: absolute;
  top: 28rpx;
  left: 28rpx;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 107, 129, 0.9);
  box-shadow: 0 6rpx 16rpx rgba(255, 107, 129, 0.35);
  /* 距离文字不换行、不截断，保证胶囊完整展示 */
  white-space: nowrap;
}

.match-card__distance-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
}

.match-card__online {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: #36C99A;
  box-shadow: 0 6rpx 16rpx rgba(61, 201, 148, 0.35);
}

.match-card__online-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #ffffff;
}

.match-card__online-dot--away {
  background: #ffffff;
  background: rgba(54, 201, 154, 0.9);
  box-shadow: 0 6rpx 16rpx rgba(54, 201, 154, 0.35);
}

.match-card__online-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
}

.match-card__score {
  position: absolute;
  right: 28rpx;
  bottom: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.match-card__score-ring {
  position: relative;
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.match-card__score-ring-inner {
  position: absolute;
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: rgba(10, 20, 16, 0.55);
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  justify-content: center;
}

.match-card__score-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.15);
}

.match-card__score-label {
  font-size: 20rpx;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
}

.match-card__info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 40rpx 32rpx 170rpx;
}

.match-card :deep(.match-info) {
  width: 100%;
}
</style>





