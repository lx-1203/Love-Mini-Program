<script setup lang="ts">
import { computed } from "vue";
import { IMAGE_PATHS } from "../../../config/images";

const props = withDefaults(
  defineProps<{
    liked?: boolean;
    matched?: boolean;
    blocked?: boolean;
    loading?: boolean;
  }>(),
  { liked: false, matched: false, blocked: false, loading: false }
);

const emit = defineEmits<{
  (e: "like"): void;
  (e: "message"): void;
  (e: "follow"): void;
}>();

const likeLabel = computed(() => {
  if (props.blocked) return "已屏蔽";
  if (props.liked) return "已喜欢";
  return "喜欢";
});
</script>

<template>
  <view class="relationship-cta">
    <view class="relationship-cta__bar">
      <view
        class="relationship-cta__btn relationship-cta__btn--like"
        :class="{ 'relationship-cta__btn--disabled': blocked || loading }"
        hover-class="relationship-cta__btn--pressed"
        @tap="emit('like')"
      >
        <image class="relationship-cta__heart" :src="IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED" mode="aspectFit" alt="" />
        <text class="relationship-cta__text relationship-cta__text--like">{{ likeLabel }}</text>
      </view>

      <view class="relationship-cta__btn relationship-cta__btn--hello" hover-class="relationship-cta__btn--pressed" @tap="emit('message')">
        <image class="relationship-cta__bubble" :src="IMAGE_PATHS.ICONS_EMOJI.COMMENT" mode="aspectFit" alt="" />
        <text class="relationship-cta__text">打招呼</text>
      </view>

      <view class="relationship-cta__btn relationship-cta__btn--follow" hover-class="relationship-cta__btn--pressed" @tap="emit('follow')">
        <image class="relationship-cta__star" :src="IMAGE_PATHS.ICONS_EMOJI.STAR" mode="aspectFit" alt="" />
        <text class="relationship-cta__text relationship-cta__text--follow">关注</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.relationship-cta {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.97);
  border-top: 1rpx solid #EEF1F5;
  box-shadow: 0 -8rpx 30rpx rgba(0, 0, 0, 0.05);
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom) + 20rpx);
}

.relationship-cta__bar {
  display: flex;
  gap: 16rpx;
}

.relationship-cta__btn {
  height: 92rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.relationship-cta__btn--pressed {
  opacity: 0.85;
}

.relationship-cta__btn--like {
  flex: 1.1;
  background: #FFF0F6;
  border: 2rpx solid #FFD3E0;
}

.relationship-cta__btn--hello {
  flex: 1.5;
  background: #36C99A;
  box-shadow: 0 8rpx 20rpx rgba(54, 201, 154, 0.3);
}

.relationship-cta__btn--follow {
  flex: 1.1;
  background: #ffffff;
  border: 2rpx solid #36C99A;
}

.relationship-cta__btn--disabled {
  opacity: 0.55;
}

.relationship-cta__heart {
  width: 30rpx;
  height: 30rpx;
  color: #FF6B81;
}

.relationship-cta__bubble {
  width: 28rpx;
  height: 28rpx;
  color: #ffffff;
}

.relationship-cta__star {
  width: 30rpx;
  height: 30rpx;
  color: #36C99A;
}

.relationship-cta__text {
  font-size: 28rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.relationship-cta__text--like {
  color: #FF6B81;
}

.relationship-cta__text--follow {
  color: #36C99A;
}
</style>
