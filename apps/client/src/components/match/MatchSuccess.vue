<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import type { MatchReason } from "../../types/match";

withDefaults(
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
const heartSrc = IMAGE_PATHS.ICONS_MATCH_V1.HEART_MATCH;
</script>

<template>
  <view class="match-success">
    <view class="match-success__hero">
      <view class="match-success__title-row">
        <text class="match-success__title-heart">💗</text>
        <text class="match-success__title">{{ t('matchSuccess.title') }}</text>
        <text class="match-success__title-heart">💗</text>
      </view>
      <text class="match-success__subtitle">
        {{ t('matchSuccess.matchedWith', { name: partnerName || t('discover.partnerDefaultName') }) }}
      </text>

      <view class="match-success__avatars">
        <image class="match-success__avatar" :src="myAvatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
        <view class="match-success__heart">
          <image class="match-success__heart-icon" :src="heartSrc" mode="aspectFit" alt="" />
        </view>
        <image class="match-success__avatar" :src="partnerAvatar || IMAGE_PATHS.DEFAULT_AVATAR" mode="aspectFill" alt="" />
      </view>

      <view v-if="reasons.length > 0" class="match-success__reasons">
        <text class="match-success__reasons-lead">{{ t('matchSuccess.reasonLabel') }}</text>
        <view class="match-success__reasons-list">
          <text
            v-for="reason in reasons"
            :key="`${reason.type}-${reason.text}`"
            class="match-success__reason-chip"
          >{{ reason.text }}</text>
        </view>
        <text class="match-success__reasons-end">{{ t('matchSuccess.reasonEnd') }}</text>
      </view>
    </view>

    <view class="match-success__actions">
      <view
        class="match-success__primary press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('matchSuccess.sayHi')"
        @tap="emit('chat')"
      >
        <text class="match-success__primary-text">{{ t('matchSuccess.sayHi') }}</text>
      </view>
      <view
        class="match-success__secondary press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('matchSuccess.explore')"
        @tap="emit('explore')"
      >
        <text class="match-success__secondary-text">{{ t('matchSuccess.explore') }}</text>
      </view>
      <view class="match-success__share" hover-class="match-success__share--pressed" @tap="emit('share')">
        <text class="match-success__share-text">分享喜讯</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.match-success {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 110rpx 48rpx 80rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fff0f6 0%, #f7faf9 60%);
}

.match-success__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.match-success__title {
  font-size: 48rpx;
  font-weight: 800;
  color: #36C99A;
}

.match-success__title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.match-success__title-heart {
  font-size: 40rpx;
  color: #FF6B81;
}

.match-success__subtitle {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #8a9694;
}

.match-success__avatars {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin-top: 64rpx;
}

.match-success__avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 6rpx solid #ffffff;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.12);
  background: #f0f2f5;
}

.match-success__heart {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.match-success__heart-icon {
  width: 88rpx;
  height: 88rpx;
}

.match-success__reasons {
  margin-top: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.match-success__reasons-lead,
.match-success__reasons-end {
  font-size: 26rpx;
  color: #5f6f6b;
}

.match-success__reasons-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12rpx;
}

.match-success__reason-chip {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: #fff0f6;
  color: #e94d87;
  font-size: 26rpx;
  font-weight: 700;
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
  color: #168B65;
  font-weight: 600;
}
</style>