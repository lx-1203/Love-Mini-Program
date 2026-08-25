<script setup lang="ts">
import type { UserProfileStory } from "../../../types/profile";
import { IMAGE_PATHS } from "../../../config/images";

const props = withDefaults(defineProps<{
  photos: string[];
  videos: string[];
  stories?: UserProfileStory[];
}>(), {
  photos: () => [],
  videos: () => [],
  stories: () => [],
});

const emit = defineEmits<{
  (e: "tapPhoto", index: number): void;
  (e: "tapVideo"): void;
  (e: "addStory"): void;
}>();
</script>

<template>
  <view class="my-story">
    <text class="my-story__title">我的故事</text>

    <scroll-view scroll-x class="my-story__scroll" :show-scrollbar="false">
      <view class="my-story__list">
        <view
          v-for="story in props.stories"
          :key="story.id"
          class="story-card"
          @tap="emit('tapPhoto', 0)"
        >
          <image v-if="story.cover" class="story-card__img" :src="story.cover" mode="aspectFill" alt="" />
          <view v-else class="story-card__img story-card__img--placeholder" />
          <view class="story-card__mask" />
          <view class="story-card__info">
            <text class="story-card__name">{{ story.title || '我的故事' }}</text>
            <text v-if="story.dateText" class="story-card__count">{{ story.dateText }}</text>
          </view>
        </view>

        <view
          v-for="(photo, index) in props.photos"
          :key="`photo-${index}`"
          class="story-card"
          @tap="emit('tapPhoto', index)"
        >
          <image class="story-card__img" :src="photo" mode="aspectFill" alt="" />
          <view class="story-card__mask" />
          <view class="story-card__info">
            <text class="story-card__name">生活瞬间 {{ index + 1 }}</text>
            <text class="story-card__count">1 篇</text>
          </view>
        </view>

        <view v-if="props.videos.length > 0" class="story-card" @tap="emit('tapVideo')">
          <view class="story-card__video">
            <image class="story-card__video-icon" :src="IMAGE_PATHS.ICONS_EMOJI.PLAY" mode="aspectFit" alt="" />
          </view>
          <view class="story-card__mask" />
          <view class="story-card__info">
            <text class="story-card__name">视频故事</text>
            <text class="story-card__count">{{ props.videos.length }} 个</text>
          </view>
        </view>

        <view class="story-card story-card--add" hover-class="story-card--add-pressed" @tap="emit('addStory')">
          <text class="story-card__add-plus">＋</text>
          <text class="story-card__add-text">添加故事</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.my-story {
  margin: 24rpx 24rpx 0;
}

.my-story__title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.my-story__scroll {
  width: 100%;
}

.my-story__list {
  display: inline-flex;
  gap: 16rpx;
  align-items: flex-start;
  padding-right: 16rpx;
}

.story-card {
  position: relative;
  width: 168rpx;
  height: 224rpx;
  flex-shrink: 0;
  border-radius: 24rpx;
  overflow: hidden;
  background: #E8FBF3;
}

.story-card__img {
  width: 100%;
  height: 100%;
}

.story-card__video {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #EEF3FF;
}

.story-card__img--placeholder {
  background: linear-gradient(180deg, #E8FBF3 0%, #C8EEDF 100%);
}

.story-card__video-icon {
  width: 64rpx;
  height: 64rpx;
  color: #4D8DFF;
}

.story-card__mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 120rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.7) 100%);
  pointer-events: none;
}

.story-card__info {
  position: absolute;
  left: 16rpx;
  right: 16rpx;
  bottom: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.story-card__name {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}

.story-card__count {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
}

.story-card--add {
  border: 3rpx dashed #36C99A;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.story-card--add-pressed {
  opacity: 0.75;
}

.story-card__add-plus {
  font-size: 56rpx;
  color: #36C99A;
  line-height: 1;
}

.story-card__add-text {
  font-size: 22rpx;
  color: #36C99A;
  font-weight: 600;
}
</style>
