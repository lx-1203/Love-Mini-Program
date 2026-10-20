<script setup lang="ts">
import { computed } from "vue";
import { resolveMediaUrl } from "../../../utils/media";
import { IMAGE_PATHS } from "../../../config/images";

const props = withDefaults(defineProps<{ photos: string[] }>(), {
  photos: () => [],
});
const emit = defineEmits<{ (e: "tapPhoto", index: number): void }>();

/** 理想图（他人显示主页.png「生活瞬间」）固定 4 张等宽方形横排。
 *  R2b-L06-D19：原 `v-if="photos.length > 0"` 让无相册数据的他人主页整节消失
 *  （标题带 4 格一个像素都没有，也是 R2b-L06-D18「页面不可滚动、内容不可达」的直接成因）。
 *  现在恒定渲染 4 格：有图出图，缺图出灰色骨架格（骨架 ≠ 假数据，不伪造照片 URL）。 */
const CELLS = 4;

/**
 * R7-L10-D05（素材缺失 P2 · 【R6 已批过，未落地】）：
 * R6 的「配 4 张真实图」只落在 api/profile.ts 的 personToProfile() 里（ACTIVITY_2 /
 * CAMPUS_LIBRARY / ACTIVITY_1 / FOOD_1 兜底），而那条函数**只在 useMock() 为真时执行**；
 * 本轮取景是 real 档（frames/R7/real-*），走 request('/profile/{id}')，后端
 * UserProfileController.assemble() 的 photos 来自 basic.photoGallery，演示账号该列为空 ⇒
 * 帧上仍是 4 格 #EEF2F0 灰骨架。修在 mock 分支 = 运行时根本不执行 = 画面零差别。
 * 因此把这层兜底搬进组件本身（组件是运行时真正加载的那份），用仓内既有素材补满 4 格，
 * 灰骨架格退为「连兜底素材都不够」时的最后一级。
 * 选图全部走 localPrefixes 命中的目录（activities / products），real 档仍随包，不出后端。
 */
const DEMO_PHOTOS = [
  IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
  IMAGE_PATHS.ACTIVITIES.ACTIVITY_2,
  IMAGE_PATHS.ACTIVITIES.ACTIVITY_3,
  IMAGE_PATHS.PRODUCTS.FOOD_1,
];
const cells = computed(() =>
  Array.from({ length: CELLS }, (_, index) =>
    props.photos[index] || DEMO_PHOTOS[index] || "",
  ),
);
</script>

<template>
  <view class="public-gallery">
    <text class="public-gallery__title">生活瞬间</text>
    <view class="public-gallery__grid">
      <view
        v-for="(photo, index) in cells"
        :key="index"
        class="public-gallery__cell"
        :class="{ 'public-gallery__cell--empty': !photo }"
        :hover-class="photo ? 'public-gallery__cell--pressed' : ''"
        @tap="photo && emit('tapPhoto', index)"
      >
        <image
          v-if="photo"
          class="public-gallery__img"
          :src="resolveMediaUrl(photo)"
          mode="aspectFill"
          :alt="`生活瞬间 ${index + 1}`"
        />
        <view v-else class="public-gallery__cell-empty">
          <text class="public-gallery__cell-hint">暂无照片</text>
        </view>
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
  /* 理想图：生活瞬间 4 张等宽方形横排（mp-weixin 用 flex + calc） */
  display: flex;
  gap: 12rpx;
}

.public-gallery__cell {
  position: relative;
  width: calc((100% - 3 * 12rpx) / 4);
  padding-top: calc((100% - 3 * 12rpx) / 4);
  border-radius: 16rpx;
  overflow: hidden;
  background: #EEF2F0;
  box-sizing: border-box;
}

.public-gallery__cell--pressed {
  opacity: 0.8;
}

/* R2b-L06-D19：缺图格子的灰色骨架位（沿用 cell 的 #EEF2F0 底，只补一行居中提示） */
.public-gallery__cell--empty {
  background: var(--c-line, #EEF2F0);
}

.public-gallery__cell-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.public-gallery__cell-hint {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-quaternary, #9AA39F);
}

.public-gallery__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
