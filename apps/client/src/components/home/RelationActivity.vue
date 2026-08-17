<script setup lang="ts">
import type { RelationActivityViewModel } from "../../view-models/home-dashboard";

defineProps<{ data: RelationActivityViewModel }>();
defineEmits<{ (e: "all"): void }>();
</script>

<template>
  <view class="relation-activity">
    <view class="relation-activity__head">
      <text class="relation-activity__title">关系动态</text>
      <text class="relation-activity__all" @tap="$emit('all')">全部 ›</text>
    </view>
    <view class="relation-activity__grid">
      <view class="relation-cell">
        <view class="relation-cell__icon relation-cell__icon--pink">
          <text class="relation-cell__icon-text">♥</text>
        </view>
        <text class="relation-cell__value">{{ data.likesReceived }}</text>
        <text class="relation-cell__label">人喜欢了你</text>
      </view>
      <view class="relation-cell">
        <view class="relation-cell__icon relation-cell__icon--green">
          <text class="relation-cell__icon-text">💬</text>
        </view>
        <text class="relation-cell__value">{{ data.whispers }}</text>
        <text class="relation-cell__label">条悄悄话</text>
      </view>
      <view class="relation-cell">
        <view class="relation-cell__icon relation-cell__icon--purple">
          <text class="relation-cell__icon-text">👁</text>
        </view>
        <text class="relation-cell__value">{{ data.visitors }}</text>
        <text class="relation-cell__label">人看过你</text>
      </view>
      <view class="relation-cell">
        <view class="relation-cell__icon relation-cell__icon--orange">
          <text class="relation-cell__icon-text">♡</text>
        </view>
        <text class="relation-cell__value">{{ data.newMatches }}</text>
        <text class="relation-cell__label">个新匹配</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.relation-activity {
  margin: 0 32rpx 16rpx;
}

.relation-activity__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0 16rpx;
}

.relation-activity__title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333A37;
}

.relation-activity__all {
  font-size: 28rpx;
  color: #9AA39F;
}

.relation-activity__grid {
  display: flex;
  gap: 12rpx;
}

.relation-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 6rpx;
  border-radius: 24rpx;
  background: #F7FAF9;
}

.relation-cell__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.relation-cell__icon--pink { background: #FFF0F6; }
.relation-cell__icon--green { background: #E8FBF2; }
.relation-cell__icon--purple { background: #EEF3FF; }
.relation-cell__icon--orange { background: #FFF1E8; }

.relation-cell__icon-text {
  font-size: 26rpx;
  font-weight: 800;
}

.relation-cell__icon--pink .relation-cell__icon-text { color: #FF6B81; }
.relation-cell__icon--green .relation-cell__icon-text { color: #36C99A; }
.relation-cell__icon--purple .relation-cell__icon-text { color: #8D7BFF; }
.relation-cell__icon--orange .relation-cell__icon-text { color: #FF9A57; }

.relation-cell__value {
  font-size: 30rpx;
  font-weight: 800;
  color: #222222;
}

.relation-cell__label {
  font-size: 18rpx;
  color: #999999;
  text-align: center;
}
</style>
