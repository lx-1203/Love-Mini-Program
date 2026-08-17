<script setup lang="ts">
withDefaults(defineProps<{
  icon: string;
  title: string;
  desc: string;
  cta: string;
  variant?: "green" | "pink";
}>(), {
  variant: "green",
});

const emit = defineEmits<{ tap: [] }>();
</script>

<template>
  <view class="quick-card" :class="`quick-card--${variant}`" hover-class="quick-card--hover" @tap="emit('tap')">
    <view class="quick-card__icon">
      <image class="quick-card__icon-img" :src="icon" mode="aspectFit" alt="" />
    </view>
    <text class="quick-card__title">{{ title }}</text>
    <text class="quick-card__desc">{{ desc }}</text>
    <view class="quick-card__cta">
      <text class="quick-card__cta-text">{{ cta }}</text>
      <text class="quick-card__cta-arrow">›</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.quick-card {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 200rpx;
  padding: 20rpx;
  border-radius: 32rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.quick-card--green {
  background: linear-gradient(180deg, #E8FAF3 0%, #D1F5E7 100%);
}

.quick-card--pink {
  background: linear-gradient(180deg, #FFECEF 0%, #FFD9DF 100%);
}

.quick-card--hover {
  opacity: 0.9;
}

.quick-card__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-card__icon-img {
  width: 32rpx;
  height: 32rpx;
}

.quick-card__title {
  margin-top: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.quick-card--green .quick-card__title {
  color: #1F8D6A;
}

.quick-card--pink .quick-card__title {
  color: #CC4A5F;
}

.quick-card__desc {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #6B7571;
}

.quick-card__cta {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.quick-card__cta-text {
  font-size: 24rpx;
  font-weight: 500;
}

.quick-card__cta-arrow {
  font-size: 24rpx;
}

.quick-card--green .quick-card__cta-text,
.quick-card--green .quick-card__cta-arrow {
  color: #36C99A;
}

.quick-card--pink .quick-card__cta-text,
.quick-card--pink .quick-card__cta-arrow {
  color: #FF6B81;
}
</style>
