<script setup lang="ts">
import InterestTag from "../common/InterestTag.vue";

defineProps<{ tags: string[] }>();
</script>

<template>
  <view v-if="tags.length > 0" class="public-interest">
    <text class="public-interest__title">兴趣标签</text>
    <scroll-view scroll-x class="public-interest__scroll" :show-scrollbar="false">
      <view class="public-interest__tags">
        <InterestTag v-for="tag in tags" :key="tag" :label="tag" />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.public-interest {
  margin: 24rpx 24rpx 0;
  padding: 28rpx 32rpx;
  border-radius: 40rpx;
  background: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.public-interest__title {
  display: block;
  margin-bottom: 18rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #222222;
}

.public-interest__scroll {
  white-space: nowrap;
}

.public-interest__tags {
  display: inline-flex;
  gap: 16rpx;
  padding-bottom: 4rpx;
}
</style>
