<script setup lang="ts">
/**
 * XunmiStoryCard — 故事卡片组件
 * 用于个人主页"我的故事"横向滚动区域
 */
withDefaults(defineProps<{
  cover?: string;
  title?: string;
  avatar?: string;
  viewCount?: number;
  isAdd?: boolean;
}>(), {
  cover: '',
  title: '',
  avatar: '',
  viewCount: 0,
  isAdd: false,
});
</script>

<template>
  <!-- 添加故事按钮 -->
  <view v-if="isAdd" class="story-card story-card--add">
    <text class="story-card__add-icon">+</text>
    <text class="story-card__add-text">添加故事</text>
  </view>

  <!-- 故事卡片 -->
  <view v-else class="story-card">
    <image class="story-card__cover" :src="cover" mode="aspectFill" />
    <view class="story-card__overlay" />
    <view class="story-card__bottom">
      <view v-if="avatar" class="story-card__avatar-wrap">
        <image class="story-card__avatar" :src="avatar" mode="aspectFill" />
      </view>
      <text class="story-card__title">{{ title }}</text>
      <text v-if="viewCount" class="story-card__views">{{ viewCount }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.story-card {
  width: 168rpx;
  height: 224rpx;
  border-radius: 24rpx;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

.story-card--add {
  background: #FFFFFF;
  border: 3rpx dashed #DDE3E0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.story-card__add-icon {
  font-size: 48rpx;
  color: #C2CAC6;
  line-height: 1;
}

.story-card__add-text {
  font-size: 24rpx;
  color: #9AA39F;
}

.story-card__cover {
  width: 100%;
  height: 100%;
}

.story-card__overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 80rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
}

.story-card__bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.story-card__avatar-wrap {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #FFFFFF;
  overflow: hidden;
  flex-shrink: 0;
}

.story-card__avatar {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}

.story-card__title {
  font-size: 22rpx;
  color: #FFFFFF;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-card__views {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
}
</style>
