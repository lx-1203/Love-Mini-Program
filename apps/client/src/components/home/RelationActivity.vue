<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";
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
          <image class="relation-cell__icon-img" :src="IMAGE_PATHS.HOME_ICONS.STAT_HEART" mode="aspectFit" />
        </view>
        <text class="relation-cell__value">{{ data.likesReceived }}</text>
        <text class="relation-cell__label">人喜欢了你</text>
        <view v-if="(data.likesAvatars ?? []).length" class="relation-cell__avatars">
          <image v-for="(av, i) in (data.likesAvatars ?? []).slice(0, 3)" :key="i" class="relation-cell__avatar" :src="av" mode="aspectFill" />
        </view>
      </view>
      <view class="relation-cell">
        <view class="relation-cell__icon relation-cell__icon--green">
          <image class="relation-cell__icon-img" :src="IMAGE_PATHS.HOME_ICONS.STAT_MESSAGE" mode="aspectFit" />
        </view>
        <text class="relation-cell__value">{{ data.whispers }}</text>
        <text class="relation-cell__label">条悄悄话</text>
        <view v-if="(data.whisperAvatars ?? []).length" class="relation-cell__avatars">
          <image v-for="(av, i) in (data.whisperAvatars ?? []).slice(0, 3)" :key="i" class="relation-cell__avatar" :src="av" mode="aspectFill" />
        </view>
      </view>
      <view class="relation-cell">
        <view class="relation-cell__icon relation-cell__icon--purple">
          <image class="relation-cell__icon-img" :src="IMAGE_PATHS.HOME_ICONS.STAT_VISITOR" mode="aspectFit" />
        </view>
        <text class="relation-cell__value">{{ data.visitors }}</text>
        <text class="relation-cell__label">人看过你</text>
        <view v-if="(data.visitorAvatars ?? []).length" class="relation-cell__avatars">
          <image v-for="(av, i) in (data.visitorAvatars ?? []).slice(0, 3)" :key="i" class="relation-cell__avatar" :src="av" mode="aspectFill" />
        </view>
      </view>
      <view class="relation-cell">
        <view class="relation-cell__icon relation-cell__icon--orange">
          <image class="relation-cell__icon-img" :src="IMAGE_PATHS.HOME_ICONS.STAT_MATCH" mode="aspectFit" />
        </view>
        <text class="relation-cell__value">{{ data.newMatches }}</text>
        <text class="relation-cell__label">个新匹配</text>
        <view v-if="(data.matchAvatars ?? []).length" class="relation-cell__avatars">
          <image v-for="(av, i) in (data.matchAvatars ?? []).slice(0, 3)" :key="i" class="relation-cell__avatar" :src="av" mode="aspectFill" />
        </view>
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
.relation-cell__icon--purple { background: #F0EEFF; }
.relation-cell__icon--orange { background: #FFF5E6; }

.relation-cell__icon-text {
  font-size: 26rpx;
  font-weight: 800;

.relation-cell__icon-img {
  width: 36rpx;
  height: 36rpx;
}
}

.relation-cell__icon--pink .relation-cell__icon-text { color: #FF6B81; }
.relation-cell__icon--green .relation-cell__icon-text { color: #36C99A; }
.relation-cell__icon--purple .relation-cell__icon-text { color: #A29BFE; }
.relation-cell__icon--orange .relation-cell__icon-text { color: #FF9F43; }

.relation-cell__avatars {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 4rpx;
}

.relation-cell__avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ffffff;
  background: #EEF2F0;
  flex-shrink: 0;
}

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
