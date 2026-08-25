<script setup lang="ts">
import type { NearbyPersonViewModel } from "../../view-models/home-dashboard";

defineProps<{ items: NearbyPersonViewModel[] }>();
defineEmits<{ (e: "more"): void; (e: "select", userId: number): void }>();
</script>

<template>
  <view class="nearby-people">
    <view class="section-head">
      <text class="section-head__title">附近的人</text>
      <text class="section-head__more" @tap="$emit('more')">全部 ›</text>
    </view>
    <scroll-view scroll-x class="nearby-scroll" :show-scrollbar="false">
      <view class="nearby-list">
        <view v-for="item in items" :key="item.userId" class="nearby-item" @tap="$emit('select', item.userId)">
          <view class="nearby-item__avatar-wrap">
            <image class="nearby-item__avatar" :src="item.avatarUrl" mode="aspectFill" alt="" />
            <view v-if="item.online" class="nearby-item__online"></view>
          </view>
          <text class="nearby-item__name">{{ item.name }}</text>
          <text class="nearby-item__distance">{{ item.distanceText }}</text>
          <text v-if="item.commonInterests.length" class="nearby-item__common">{{ item.commonInterests.slice(0, 2).join(' · ') }}</text>
        </view>
      </view>
    </scroll-view>
    <view v-if="items.length > 0" class="nearby-people__bar" @tap="$emit('more')">
      <text class="nearby-people__bar-text">附近有 {{ Math.max(items.length, 4) }} 位值得认识的人</text>
      <text class="nearby-people__bar-arrow">›</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.nearby-people {
  padding: 8rpx 0 16rpx;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0 12rpx;
}

.section-head__title {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--c-text-primary, #1E1E1E);
}

.section-head__more {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.nearby-scroll {
  width: 100%;
}

.nearby-list {
  display: flex;
  /* V-09（第五轮 QA）：附近的人横排头像间距 16→20rpx */
  gap: 20rpx;
  padding-right: 16rpx;
}

.nearby-item {
  width: 120rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.nearby-item__avatar-wrap {
  position: relative;
}

.nearby-item__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--c-neutral-100, #F0F2F5);
}

.nearby-item__online {
  position: absolute;
  right: 2rpx;
  bottom: 2rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--c-brand, #36C99A);
  border: 2rpx solid #FFFFFF;
}

.nearby-item__name {
  font-size: 20rpx;
  color: var(--c-text-primary, #1E1E1E);
}

.nearby-item__distance {
  font-size: 18rpx;
  color: var(--c-text-secondary, #666666);
}

.nearby-item__common {
  font-size: 18rpx;
  color: var(--c-text-tertiary, #999999);
  text-align: center;
}

.nearby-people__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  border-radius: 999rpx;
  background: #E8FBF2;
}

.nearby-people__bar-text {
  font-size: 22rpx;
  color: #36C99A;
  font-weight: 600;
}

.nearby-people__bar-arrow {
  font-size: 28rpx;
  color: #36C99A;
}
</style>

