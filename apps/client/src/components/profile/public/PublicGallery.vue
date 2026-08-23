<script setup lang="ts">
defineProps<{ photos: string[] }>();
const emit = defineEmits<{ (e: "tapPhoto", index: number): void }>();
</script>

<template>
  <view v-if="photos.length > 0" class="public-gallery">
    <text class="public-gallery__title">生活瞬间</text>
    <view class="public-gallery__grid">
      <view
        v-for="(photo, index) in photos.slice(0, 8)"
        :key="`${photo}-${index}`"
        class="public-gallery__cell"
        hover-class="public-gallery__cell--pressed"
        @tap="emit('tapPhoto', index)"
      >
        <image class="public-gallery__img" :src="photo" mode="aspectFill" alt="" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.public-gallery {
  margin: 24rpx 24rpx 0;
  padding: 28rpx 28rpx;
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.public-gallery__title {
  display: block;
  margin-bottom: 18rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.public-gallery__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.public-gallery__cell {
  position: relative;
  width: 150rpx;
  height: 150rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #EEF2F0;
}

.public-gallery__cell--pressed {
  opacity: 0.8;
}

.public-gallery__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
