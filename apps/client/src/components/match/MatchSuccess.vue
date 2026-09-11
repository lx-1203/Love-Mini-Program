<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import type { MatchReason } from "../../types/match";

const props = withDefaults(
  defineProps<{
    myAvatar: string;
    partnerAvatar: string;
    partnerName: string;
    reasons: MatchReason[];
  }>(),
  {
    myAvatar: "",
    partnerAvatar: "",
    partnerName: "",
    reasons: () => [],
  }
);

const emit = defineEmits<{
  (e: "chat"): void;
  (e: "explore"): void;
  (e: "share"): void;
}>();

const { t } = useI18n();

const scoreIcons = [IMAGE_PATHS.ICONS_EMOJI.RUN, IMAGE_PATHS.ICONS_EMOJI.MUSIC, IMAGE_PATHS.ICONS_EMOJI.BOOK, IMAGE_PATHS.ICONS_EMOJI.FOOD];
// 2026-08-25 P0：默认匹配度与参考图对齐（90/85/80/79），最后一项"生活方式 79%"而非 95%
const defaultScores = [90, 85, 80, 79];

/** 2026-08-25 P1：始终展示 4 行匹配度（规格书 7.8）。
 *  后端 reasons 可能只有 1~2 项（如 mock 只返"同校"+"共同兴趣"），
 *  缺项用默认标签补全，保证 旅行/音乐/电影/生活方式 四行都可见。 */
const DEFAULT_REASON_LABELS = ["旅行爱好", "音乐品味", "电影偏好", "生活方式"];
const displayReasons = computed<MatchReason[]>(() => {
  const result: MatchReason[] = [];
  for (let i = 0; i < 4; i++) {
    const src = props.reasons[i];
    result.push({
      type: (src?.type ?? `default-${i}`) as MatchReason["type"],
      text: src?.text ?? DEFAULT_REASON_LABELS[i] ?? "共同点",
    });
  }
  return result;
});

function getScorePercent(index: number): number {
  return defaultScores[index % defaultScores.length] ?? 0;
}

function getScoreIcon(index: number): string {
  return scoreIcons[index % scoreIcons.length] ?? '';
}
</script>

<template>
  <view class="match-success">
    <view class="match-success__hero">
      <!-- 漂浮爱心装饰（参考图对齐，SVG 复用 heart-filled，颜色由 class 控制） -->
      <image class="match-success__float-heart match-success__float-heart--1" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <image class="match-success__float-heart match-success__float-heart--2" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <image class="match-success__float-heart match-success__float-heart--3" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <image class="match-success__float-heart match-success__float-heart--4" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <image class="match-success__float-heart match-success__float-heart--5" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      <view class="match-success__title-row">
        <image class="match-success__title-heart match-success__title-heart--left" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
        <text class="match-success__title">{{ t('matchSuccess.title') }}</text>
        <image class="match-success__title-heart match-success__title-heart--right" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
      </view>
      <text class="match-success__subtitle">
        {{ t('matchSuccess.matchedWith', { name: partnerName || t('discover.partnerDefaultName') }) }}
      </text>
      <text class="match-success__subtitle match-success__subtitle--hint">
        {{ t('matchSuccess.matchedHint') }}
      </text>

      <view class="match-success__avatars">
        <view class="match-success__avatar-wrap">
          <view class="match-success__ripple match-success__ripple--1"></view>
          <view class="match-success__ripple match-success__ripple--2"></view>
          <image class="match-success__avatar" :src="myAvatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
        </view>
        <view class="match-success__heart">
          <view class="match-success__heart-circle">
            <image class="match-success__heart-circle-icon" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
          </view>
        </view>
        <view class="match-success__avatar-wrap">
          <view class="match-success__ripple match-success__ripple--1"></view>
          <view class="match-success__ripple match-success__ripple--2"></view>
          <image class="match-success__avatar" :src="partnerAvatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
        </view>
      </view>

      <!-- 2026-08-25 P1：始终展示 4 行（displayReasons 已补全缺项） -->
      <view v-if="displayReasons.length > 0" class="match-success__score-card">
        <text class="match-success__score-title">{{ t('matchSuccess.scoreTitle') }}</text>
        <view class="match-success__score-list">
          <view
            v-for="(reason, index) in displayReasons"
            :key="`${reason.type}-${index}`"
            class="match-success__score-item"
          >
            <view class="match-success__score-row">
              <image class="match-success__score-icon" :src="getScoreIcon(index)" mode="aspectFit" alt="" />
              <text class="match-success__score-label">{{ reason.text }}</text>
              <text class="match-success__score-percent">匹配度 {{ getScorePercent(index) }}%</text>
            </view>
            <view class="match-success__score-track">
              <view class="match-success__score-fill" :style="{ width: getScorePercent(index) + '%' }"></view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="match-success__actions">
      <view
        class="match-success__primary press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        role="button"
        :aria-label="t('matchSuccess.sayHi')"
        @tap="emit('chat')"
      >
        <text class="match-success__primary-text">{{ t('matchSuccess.sayHi') }}</text>
      </view>
      <view
        class="match-success__secondary press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        role="button"
        :aria-label="t('matchSuccess.explore')"
        @tap="emit('explore')"
      >
        <text class="match-success__secondary-text">{{ t('matchSuccess.explore') }}</text>
      </view>
      <view class="match-success__share" hover-class="match-success__share--pressed" @tap="emit('share')">
        <text class="match-success__share-icon">⤴</text><text class="match-success__share-text">分享喜悦</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.match-success {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  /* R4：110rpx 起排使标题行与微信胶囊（状态栏下 47-83px real 带）叠压，下移至胶囊带以下 */
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 120rpx) 48rpx 80rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #E8FBF2 0%, #F0FFF5 60%);
}

.match-success__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.match-success__title {
  font-size: 72rpx;
  font-weight: 700;
  color: #36C99A;
}

.match-success__title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.match-success__title-heart {
  width: 40rpx;
  height: 40rpx;
  color: #FF9DB5;
}

.match-success__title-heart--left {
  color: #FF9DB5;
}

.match-success__title-heart--right {
  color: #36C99A;
}

.match-success__subtitle {
  margin-top: 12rpx;
  font-size: 32rpx;
  color: #999999;
  line-height: 1.5;
  text-align: center;
  max-width: 560rpx;
}

.match-success__subtitle--hint {
  margin-top: 4rpx;
  font-size: 28rpx;
  color: #36C99A;
  font-weight: 500;
}

.match-success__avatars {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 64rpx;
  position: relative;
}

.match-success__avatar-wrap {
  position: relative;
  /* R3（MSUCCESS-004）：160→192rpx，主视觉加权对齐理想图（庆祝时刻头像过弱） */
  width: 192rpx;
  height: 192rpx;
}

.match-success__avatar {
  width: 192rpx;
  height: 192rpx;
  border-radius: 50%;
  border: 6rpx solid #ffffff;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.12);
  background: #f0f2f5;
  position: relative;
  z-index: 2;
}

.match-success__ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2rpx solid rgba(54, 201, 154, 0.25);
  z-index: 1;
  animation: ripple-expand 2.4s ease-out infinite;
}

.match-success__ripple--1 {
  width: 200rpx;
  height: 200rpx;
  animation-delay: 0s;
}

.match-success__ripple--2 {
  width: 240rpx;
  height: 240rpx;
  animation-delay: 1.2s;
}

.match-success__heart {
  /* R3（MSUCCESS-004）：100→136rpx，连接心形与头像比例对齐理想图 */
  width: 136rpx;
  height: 136rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  flex-shrink: 0;
}

.match-success__heart-circle {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B81 0%, #FF4D6D 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(255, 77, 109, 0.35);
  animation: heart-pulse 1.6s ease-in-out infinite;
}

.match-success__heart-circle-icon {
  width: 44rpx;
  height: 44rpx;
  color: #ffffff;
}

.match-success__score-card {
  margin-top: 40rpx;
  width: 100%;
  padding: 32rpx;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(54, 201, 154, 0.10);
}

.match-success__score-title {
  font-size: 26rpx;
  color: #5f6f6b;
  text-align: center;
  margin-bottom: 24rpx;
  font-weight: 500;
}

.match-success__score-list {
  display: flex;
  flex-direction: column;
  /* V-02（第五轮 QA）：4 行匹配度行距加宽，避免进度条视觉粘连 */
  gap: 24rpx;
}

.match-success__score-item {
  display: flex;
  flex-direction: column;
  /* V-02：标签行与进度条间距 8 → 10rpx，进度条更透气 */
  gap: 10rpx;
}

.match-success__score-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.match-success__score-icon {
  width: 36rpx;
  height: 36rpx;
  text-align: center;
}

.match-success__score-label {
  flex: 1;
  font-size: 26rpx;
  color: #3a4a44;
  font-weight: 500;
}

.match-success__score-percent {
  font-size: 26rpx;
  color: #36C99A;
  font-weight: 700;
  min-width: 72rpx;
  text-align: right;
}

.match-success__score-track {
  width: 100%;
  height: 12rpx;
  background: #F0F0F0;
  border-radius: 999rpx;
  overflow: hidden;
}

.match-success__score-fill {
  height: 100%;
  background: linear-gradient(90deg, #36C99A 0%, #22a976 100%);
  border-radius: 999rpx;
  transition: width 0.8s ease-out;
}

.match-success__actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.match-success__primary {
  padding: 24rpx 0;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #36C99A 0%, #22a976 100%);
  text-align: center;
}

.match-success__primary-text {
  font-size: 30rpx;
  font-weight: 800;
  color: #ffffff;
}

.match-success__secondary {
  padding: 22rpx 0;
  border-radius: 999rpx;
  border: 2rpx solid #dce5e2;
  text-align: center;
}

.match-success__secondary-text {
  font-size: 28rpx;
  color: #8a9694;
}

.match-success__share {
  padding: 14rpx 0;
  text-align: center;
}

.match-success__share--pressed {
  opacity: 0.7;
}

.match-success__share-text {
  font-size: 26rpx;
  color: #36C99A;
  font-weight: 600;
}

@keyframes ripple-expand {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.4);
    opacity: 0;
  }
}

@keyframes heart-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
.match-success__float-heart {
  position: absolute;
  width: 40rpx;
  height: 40rpx;
  color: #FF6B81;
  opacity: 0.7;
  animation: match-float 3.2s ease-in-out infinite;
}

/* V-02（第五轮 QA）：漂浮爱心装饰位置微调，避免遮挡标题/头像/匹配卡 */
.match-success__float-heart--1 { top: 120rpx; left: 40rpx; animation-delay: 0s; }
.match-success__float-heart--2 { top: 180rpx; right: 48rpx; animation-delay: 0.6s; width: 32rpx; height: 32rpx; }
.match-success__float-heart--3 { top: 300rpx; left: 24rpx; animation-delay: 1.2s; width: 30rpx; height: 30rpx; opacity: 0.5; }
.match-success__float-heart--4 { top: 460rpx; right: 32rpx; animation-delay: 1.8s; width: 44rpx; height: 44rpx; opacity: 0.6; }
.match-success__float-heart--5 { top: 560rpx; left: 64rpx; animation-delay: 2.4s; width: 28rpx; height: 28rpx; opacity: 0.4; }

@keyframes match-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-24rpx); }
}

</style>
