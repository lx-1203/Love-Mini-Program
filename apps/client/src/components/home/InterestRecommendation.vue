<script setup lang="ts">
import type { InterestCircleViewModel } from "../../view-models/home-dashboard";

defineProps<{ items: InterestCircleViewModel[] }>();
defineEmits<{ (e: "more"): void; (e: "join", id: number): void; (e: "select", id: number): void }>();
</script>

<template>
  <view class="interest-recommend">
    <view class="section-head">
      <text class="section-head__title">兴趣推荐</text>
      <text class="section-head__more" @tap="$emit('more')">查看更多 ›</text>
    </view>
    <scroll-view scroll-x class="interest-scroll" :show-scrollbar="false">
      <view class="interest-list">
        <view v-for="item in items" :key="item.id" class="interest-card" @tap="$emit('select', item.id)">
          <text class="interest-card__icon">{{ item.icon }}</text>
          <text class="interest-card__name">{{ item.name }}</text>
          <text class="interest-card__count">{{ item.memberCount }} 人加入</text>
          <view class="interest-card__join" @tap.stop="$emit('join', item.id)">
            {{ item.joined ? '已加入' : '加入' }}
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.interest-recommend {
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

.interest-scroll {
  width: 100%;
}

.interest-list {
  display: flex;
  gap: 16rpx;
  padding-right: 16rpx;
}

.interest-card {
  width: 210rpx;
  flex-shrink: 0;
  padding: 20rpx;
  border-radius: 16rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #ECEFF2);
}

.interest-card__icon {
  font-size: 40rpx;
}

.interest-card__name {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1E1E1E);
}

.interest-card__count {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: var(--c-text-secondary, #666666);
}

.interest-card__join {
  margin-top: 12rpx;
  text-align: center;
  padding: 10rpx 0;
  border-radius: 999rpx;
  background: var(--c-brand-light, #E8FBF2);
  color: var(--c-brand-dark, #168B65);
  font-size: 20rpx;
  font-weight: 700;
}
</style>
