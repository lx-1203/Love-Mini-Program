<script setup lang="ts">
import { computed } from "vue";
import { profileSvg } from "../../../config/profile-svg";
import PhotoCard from "../common/PhotoCard.vue";

const props = withDefaults(defineProps<{
  photos: string[];
}>(), {
  photos: () => [],
});

const cells = computed(() => {
  const list: Array<{ url: string; empty: boolean }> = [];
  for (let i = 0; i < Math.max(8, props.photos.length); i += 1) {
    const url = props.photos[i] ?? "";
    list.push({ url, empty: !url });
  }
  return list;
});
</script>


<template>
  <view class="my-gallery">
    <text class="my-gallery__title">生活照片</text>
    <view class="my-gallery__grid">
      <view v-for="(cell, index) in cells" :key="index" class="my-gallery__cell">
        <PhotoCard v-if="!cell.empty" :src="cell.url" :index="index" />
        <image v-else class="my-gallery__empty" :src="profileSvg.empty.photo" mode="aspectFit" alt="" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-gallery {
  margin: 24rpx 24rpx 0;
}

.my-gallery__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #333A37;
}

.my-gallery__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.my-gallery__cell {
  aspect-ratio: 1;
  border-radius: 24rpx;
  overflow: hidden;
}

.my-gallery__empty {
  width: 100%;
  height: 100%;
}
</style>

