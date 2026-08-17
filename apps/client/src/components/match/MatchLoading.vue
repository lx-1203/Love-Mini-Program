<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { IMAGE_PATHS } from "../../config/images";

withDefaults(
  defineProps<{
    myAvatar: string;
    partnerAvatar: string;
    partnerName: string;
  }>(),
  { myAvatar: "", partnerAvatar: "", partnerName: "" }
);

const emit = defineEmits<{
  (e: "finished"): void;
  (e: "skip"): void;
}>();

let finished = false;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

function finish() {
  if (finished) return;
  finished = true;
  if (fallbackTimer) clearTimeout(fallbackTimer);
  emit("finished");
}

function onHeartAnimationEnd() {
  finish();
}

onMounted(() => {
  fallbackTimer = setTimeout(() => finish(), 2600);
});

onUnmounted(() => {
  if (fallbackTimer) clearTimeout(fallbackTimer);
});

const heartSrc = IMAGE_PATHS.ICONS_MATCH_V1.HEART_MATCH;
/** 匹配度进度（参考图：旅行/音乐/电影/生活方式 四项 + 总进度） */
const PROGRESS = [
  { label: "旅行爱好", percent: 90 },
  { label: "音乐品味", percent: 85 },
  { label: "电影偏好", percent: 80 },
  { label: "生活方式", percent: 79 },
];

/** 底部总进度（参考图：缘分匹配中... 89%） */
const totalPercent = Math.round(PROGRESS.reduce((sum, p) => sum + p.percent, 0) / PROGRESS.length) + 5;

const ringSrc = IMAGE_PATHS.ICONS_MATCH_V1.LOADING_RING;

</script>

<template>
  <view class="match-loading">
    <!-- 粉色爱心装饰 -->
    <text class="match-loading__deco match-loading__deco--1">💗</text>
    <text class="match-loading__deco match-loading__deco--2">💕</text>
    <text class="match-loading__deco match-loading__deco--3">💗</text>

    <!-- 右上角跳过 -->
    <view class="match-loading__skip" hover-class="match-loading__skip--pressed" @tap="emit('skip')">
      <text class="match-loading__skip-text">跳过</text>
    </view>

    <view class="match-loading__avatars">
      <image class="match-loading__avatar" :src="myAvatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
      <view class="match-loading__heart" @animationend="onHeartAnimationEnd">
        <image class="match-loading__heart-icon" :src="heartSrc" mode="aspectFit" alt="" />
      </view>
      <image class="match-loading__avatar" :src="partnerAvatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
    </view>

    <image class="match-loading__ring" :src="ringSrc" mode="aspectFit" alt="" />

    <text class="match-loading__title">正在寻找有缘的Ta...</text>
    <text class="match-loading__subtitle">分析彼此兴趣，缘分匹配中</text>

    <!-- 匹配度进度（参考图对齐） -->
    <view class="match-loading__progress">
      <view v-for="p in PROGRESS" :key="p.label" class="match-loading__row">
        <text class="match-loading__row-label">{{ p.label }}</text>
        <view class="match-loading__row-bar">
          <view class="match-loading__row-bar-inner" :style="{ width: p.percent + '%' }" />
        </view>
        <text class="match-loading__row-percent">{{ p.percent }}%</text>
      </view>
      <view class="match-loading__total">
        <text class="match-loading__total-text">缘分匹配中... {{ totalPercent }}%</text>
        <view class="match-loading__total-bar">
          <view class="match-loading__total-bar-inner" :style="{ width: totalPercent + '%' }" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.match-loading {
  position: relative;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #E8FAF3 0%, #F7FAF9 70%);
  padding: 80rpx 48rpx;
  box-sizing: border-box;
  overflow: hidden;
}

.match-loading__deco {
  position: absolute;
  font-size: 64rpx;
  opacity: 0.5;
}

.match-loading__deco--1 { left: 48rpx; top: 160rpx; }
.match-loading__deco--2 { right: 48rpx; top: 260rpx; }
.match-loading__deco--3 { left: 96rpx; bottom: 200rpx; }

.match-loading__skip {
  position: absolute;
  top: 48rpx;
  right: 40rpx;
  padding: 14rpx 30rpx;
  border-radius: 999rpx;
  background: #36C99A;
}

.match-loading__skip--pressed {
  opacity: 0.85;
}

.match-loading__skip-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

.match-loading__avatars {
  display: flex;
  align-items: center;
  gap: 28rpx;
}

.match-loading__avatar {
  width: 168rpx;
  height: 168rpx;
  border-radius: 50%;
  border: 8rpx solid #ffffff;
  box-shadow: 0 14rpx 36rpx rgba(30, 80, 65, 0.16);
  background: #eaf3ef;
}

.match-loading__heart {
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: match-loading-heart 1200ms ease-out both;
}

.match-loading__heart-icon {
  width: 96rpx;
  height: 96rpx;
}

.match-loading__ring {
  width: 280rpx;
  height: 280rpx;
  margin-top: 40rpx;
  animation: match-loading-ring 1400ms linear infinite;
}

.match-loading__title {
  margin-top: 24rpx;
  font-size: 34rpx;
  font-weight: 800;
  color: #222222;
}

.match-loading__subtitle {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #8a9694;
}

.match-loading__progress {
  width: 100%;
  margin-top: 40rpx;
  padding: 24rpx 28rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
}

.match-loading__row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 10rpx 0;
}

.match-loading__row-label {
  width: 140rpx;
  font-size: 24rpx;
  color: #333333;
}

.match-loading__row-bar {
  flex: 1;
  height: 12rpx;
  border-radius: 999rpx;
  background: #E6F5EF;
  overflow: hidden;
}

.match-loading__row-bar-inner {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #36C99A 0%, #7BD8B4 100%);
}

.match-loading__row-percent {
  width: 64rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #168B65;
  text-align: right;
}

@keyframes match-loading-heart {
  0% { transform: scale(0); opacity: 0; }
  55% { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes match-loading-ring {
  0% { transform: scale(0.8) rotate(0deg); opacity: 0.5; }
  100% { transform: scale(1.12) rotate(360deg); opacity: 0; }
}

.match-loading__total {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-top: 24rpx;
}

.match-loading__total-text {
  font-size: 36rpx;
  font-weight: 700;
  color: #36C99A;
}

.match-loading__total-bar {
  width: 400rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: rgba(54, 201, 154, 0.2);
  overflow: hidden;
}

.match-loading__total-bar-inner {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #36C99A 0%, #55D5A7 100%);
}
.match-loading__dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-top: 48rpx;
}

.match-loading__dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #36C99A;
  opacity: 0.35;
  animation: matchDot 1.2s ease-in-out infinite;
}

.match-loading__dot--2 {
  animation-delay: 0.2s;
}

.match-loading__dot--3 {
  animation-delay: 0.4s;
}

@keyframes matchDot {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.25); }
}

</style>
