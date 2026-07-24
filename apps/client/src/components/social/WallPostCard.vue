<script setup lang="ts">
import { designTokens } from '../../theme/tokens';
import Avatar from '../common/Avatar.vue';

defineProps<{
  avatarUrl?: string;
  initials?: string;
  name?: string;
  school?: string;
  time?: string;
  content?: string;
  images?: string[];
  likes?: number;
  comments?: number;
  shares?: number;
  isLiked?: boolean;
}>();

const emit = defineEmits<{
  like: [];
  comment: [];
  share: [];
  tap: [];
}>();

const t = designTokens;
</script>

<template>
  <view class="wall-card" @tap="emit('tap')">
    <view class="wall-header">
      <Avatar :name="initials || name?.charAt(0)" :src="avatarUrl" size="sm" />
      <view class="wall-meta">
        <text class="wall-name">{{ name }}</text>
        <text class="wall-time">{{ time }} · {{ school }}</text>
      </view>
    </view>
    <text class="wall-content" v-if="content">{{ content }}</text>
    <view class="wall-images" v-if="images && images.length > 0">
      <image
        v-for="(img, idx) in images.slice(0, 3)"
        :key="idx"
        class="wall-img"
        :src="img"
        mode="aspectFill"
        lazy-load
      />
    </view>
    <view class="wall-actions">
      <view class="wall-action" :class="{ 'wall-action--liked': isLiked }" @tap.stop="emit('like')">
        <image class="wall-action__icon" src="/static/assets/icons/social/like-filled.png" mode="aspectFit" />
        <text>{{ likes || 0 }}</text>
      </view>
      <view class="wall-action" @tap.stop="emit('comment')">
        <image class="wall-action__icon" src="/static/assets/icons/social/comment.png" mode="aspectFit" />
        <text>{{ comments || 0 }}</text>
      </view>
      <view class="wall-action" @tap.stop="emit('share')">
        <text>↗</text>
        <text>{{ shares || 0 }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.wall-card {
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  padding: 28rpx;
  box-shadow: var(--s-sm);
  border: 1rpx solid var(--c-border-light);
  transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.wall-card:active {
  box-shadow: var(--s-md);
}
.wall-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.wall-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.wall-name {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
  line-height: 1.3;
}
.wall-time {
  font-size: var(--fs-sm);
  color: var(--c-text-quaternary);
  margin-top: 2rpx;
  line-height: 1.3;
}
.wall-content {
  margin-top: 16rpx;
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.5;
}
.wall-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8rpx;
  border-radius: var(--r-md);
  overflow: hidden;
  margin-top: 16rpx;
}
.wall-img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--r-sm);
}
.wall-actions {
  display: flex;
  gap: 48rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--c-border-light);
}
.wall-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: var(--fs-sm);
  color: var(--c-text-quaternary);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  padding: 4rpx 0;
}
.wall-action:active {
  transform: scale(0.97);
  color: var(--c-brand-400);
}
.wall-action--liked {
  color: #EC4899;
  font-weight: 600;
}
.wall-action--liked:active {
  color: #DB2777;
  transform: scale(0.97);
}
</style>
