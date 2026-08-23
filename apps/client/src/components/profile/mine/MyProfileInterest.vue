<script setup lang="ts">
import { profileSvg } from "../../../config/profile-svg";

const props = withDefaults(defineProps<{
  tags: string[];
}>(), {
  tags: () => [],
});

function iconFor(tag: string): string {
  const map: Record<string, string> = {
    摄影: profileSvg.interest.camera,
    旅行: profileSvg.interest.travel,
    音乐: profileSvg.interest.music,
    阅读: profileSvg.interest.book,
    运动: profileSvg.interest.sport,
  };
  return map[tag] ?? "";
}
</script>

<template>
  <view class="my-interest">
    <text class="my-interest__title">兴趣爱好</text>
    <view class="my-interest__tags">
      <view v-for="tag in props.tags" :key="tag" class="my-interest__tag">
        <image v-if="iconFor(tag)" class="my-interest__icon" :src="iconFor(tag)" mode="aspectFit" alt="" />
        <text class="my-interest__text">{{ tag }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-interest {
  margin: 24rpx 24rpx 0;
}

.my-interest__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #333A37;
}

.my-interest__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.my-interest__tag {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 28rpx;
  background: #E8FBF3;
}

.my-interest__icon {
  width: 32rpx;
  height: 32rpx;
}

.my-interest__text {
  font-size: 24rpx;
  font-weight: 500;
  color: #333A37;
}
</style>

