<script setup lang="ts">
import type { RelationshipPersonView } from "../../services/generated/api-types-supplement";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";

defineProps<{
  items: RelationshipPersonView[];
}>();

const emit = defineEmits<{
  tapPerson: [item: RelationshipPersonView];
  tapAction: [item: RelationshipPersonView];
}>();

const onlineSrc = IMAGE_PATHS.MESSAGE_ICONS.ONLINE;
const heartSrc = IMAGE_PATHS.MESSAGE_ICONS.HEART;
</script>

<template>
  <scroll-view v-if="items.length > 0" class="warm-people" scroll-x :show-scrollbar="false">
    <view class="warm-people__list">
      <view
        v-for="item in items"
        :key="item.userId"
        class="warm-user"
        hover-class="warm-user--hover"
        @tap="emit('tapPerson', item)"
      >
        <view class="warm-user__avatar-wrap">
          <image class="warm-user__avatar" :src="resolveMediaUrl(item.avatarUrl)" mode="aspectFill" />
          <image class="warm-user__online" :src="onlineSrc" mode="aspectFit" />
        </view>
        <view class="warm-user__name-row">
          <text class="warm-user__name">{{ item.name }}</text>
          <image class="warm-user__heart" :src="heartSrc" mode="aspectFit" />
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<style scoped lang="scss">
.warm-people {
  width: 100%;
}
.warm-people__list {
  display: flex;
  gap: 40rpx;
  padding: 8rpx 32rpx 16rpx;
}
.warm-user {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  width: 120rpx;
}
.warm-user--hover {
  opacity: 0.8;
}
.warm-user__avatar-wrap {
  position: relative;
  width: 104rpx;
  height: 104rpx;
}
.warm-user__avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
}
.warm-user__online {
  position: absolute;
  right: 0;
  bottom: 2rpx;
  width: 28rpx;
  height: 28rpx;
}
.warm-user__name-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.warm-user__name {
  font-size: 24rpx;
  font-weight: 500;
  color: #222222;
}
.warm-user__heart {
  width: 28rpx;
  height: 28rpx;
}
</style>
