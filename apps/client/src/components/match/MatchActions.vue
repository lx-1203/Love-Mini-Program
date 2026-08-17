<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";

withDefaults(
  defineProps<{
    disabled?: boolean;
    busy?: boolean;
  }>(),
  { disabled: false, busy: false }
);

const emit = defineEmits<{
  (e: "pass"): void;
  (e: "like"): void;
  (e: "superLike"): void;
}>();

const { t } = useI18n();

const icons = {
  pass: IMAGE_PATHS.ICONS_V2.X_GRAY,
  like: IMAGE_PATHS.ICONS_V2.HEART_WHITE,
  superLike: IMAGE_PATHS.ICONS_V2.CHAT_WHITE,
} as const;
</script>

<template>
  <view class="match-actions" :class="{ 'match-actions--disabled': disabled || busy }">
    <view
      class="match-actions__item"
      hover-class="match-actions__item--pressed"
      hover-stay-time="120"
      role="button"
      :aria-label="t('discover.skip')"
      @tap="!disabled && !busy && emit('pass')"
    >
      <view class="match-actions__btn match-actions__btn--pass">
        <image class="match-actions__icon" :src="icons.pass" mode="aspectFit" alt="" />
      </view>
      <text class="match-actions__label">{{ t('discover.skip') }}</text>
    </view>

    <view
      class="match-actions__item"
      hover-class="match-actions__item--pressed"
      hover-stay-time="120"
      role="button"
      :aria-label="t('discover.superLike')"
      @tap="!disabled && !busy && emit('superLike')"
    >
      <view class="match-actions__btn match-actions__btn--super">
        <image class="match-actions__icon" :src="icons.superLike" mode="aspectFit" alt="" />
      </view>
      <text class="match-actions__label">打招呼</text>
    </view>

    <view
      class="match-actions__item"
      hover-class="match-actions__item--pressed"
      hover-stay-time="120"
      role="button"
      :aria-label="t('discover.like')"
      @tap="!disabled && !busy && emit('like')"
    >
      <view class="match-actions__btn match-actions__btn--like">
        <image class="match-actions__icon" :src="icons.like" mode="aspectFit" alt="" />
      </view>
      <text class="match-actions__label">{{ t('discover.like') }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.match-actions {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 76rpx;
  padding: 24rpx 0 8rpx;
}

.match-actions--disabled {
  opacity: 0.55;
}

.match-actions__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.match-actions__item--pressed {
  transform: scale(0.92);
}

.match-actions__btn {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(30, 80, 65, 0.12);
}

.match-actions__btn--pass {
  width: 128rpx;
  height: 128rpx;
  background: #ffffff;
  border: 2rpx solid #EDF0F0;
}

.match-actions__btn--super {
  width: 144rpx;
  height: 144rpx;
  background: #FF6B81;
}

.match-actions__btn--like {
  width: 128rpx;
  height: 128rpx;
  background: #FF4D6A;
}

.match-actions__icon {
  width: 56rpx;
  height: 56rpx;
}

.match-actions__label {
  font-size: 22rpx;
  color: #6B7280;
}
</style>
