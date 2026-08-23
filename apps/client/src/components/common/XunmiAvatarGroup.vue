<script setup lang="ts">
/**
 * XunmiAvatarGroup — 头像组组件
 * 用于关系动态、互动列表右侧的堆叠头像展示
 */
withDefaults(defineProps<{
  avatars?: string[];
  max?: number;
  size?: number;
  gap?: number;
}>(), {
  avatars: () => [],
  max: 3,
  size: 32,
  gap: -8,
});
</script>

<template>
  <view class="avatar-group">
    <view
      v-for="(src, i) in avatars.slice(0, max)"
      :key="i"
      class="avatar-group__item"
      :style="{
        width: size + 'rpx',
        height: size + 'rpx',
        zIndex: max - i,
        marginLeft: i > 0 ? gap + 'rpx' : '0',
      }"
    >
      <image
        v-if="src"
        class="avatar-group__img"
        :src="src"
        mode="aspectFill"
      />
      <view v-else class="avatar-group__placeholder" />
    </view>
    <view
      v-if="avatars.length > max"
      class="avatar-group__more"
      :style="{
        width: size + 'rpx',
        height: size + 'rpx',
        marginLeft: gap + 'rpx',
      }"
    >
      <text class="avatar-group__more-text">+{{ avatars.length - max }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.avatar-group {
  display: flex;
  align-items: center;
}

.avatar-group__item {
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  overflow: hidden;
  position: relative;
}

.avatar-group__img {
  width: 100%;
  height: 100%;
}

.avatar-group__placeholder {
  width: 100%;
  height: 100%;
  background: #EEF2F0;
}

.avatar-group__more {
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  background: #EEF2F0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-group__more-text {
  font-size: 20rpx;
  color: #6B7571;
  font-weight: 500;
}
</style>
