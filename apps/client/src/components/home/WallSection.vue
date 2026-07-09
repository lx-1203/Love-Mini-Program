<script setup lang="ts">
import { designTokens } from '../../theme/tokens';
import WallPostCard from '../social/WallPostCard.vue';

interface WallPost {
  id: string;
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
}

defineProps<{
  posts?: WallPost[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  like: [postId: string];
  comment: [postId: string];
  postTap: [postId: string];
  createPost: [];
}>();

const t = designTokens;
</script>

<template>
  <view class="wall-section">
    <view v-if="loading" class="wall-skeleton" v-for="i in 2" :key="i">
      <view class="skeleton-card shimmer" />
    </view>
    <WallPostCard
      v-else
      v-for="post in (posts || []).slice(0, 3)"
      :key="post.id"
      :avatar-url="post.avatarUrl"
      :initials="post.initials"
      :name="post.name"
      :school="post.school"
      :time="post.time"
      :content="post.content"
      :images="post.images"
      :likes="post.likes"
      :comments="post.comments"
      :shares="post.shares"
      :is-liked="post.isLiked"
      @like="emit('like', post.id)"
      @comment="emit('comment', post.id)"
      @tap="emit('postTap', post.id)"
    />
  </view>
</template>

<style scoped>
.wall-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.wall-skeleton {
  border-radius: v-bind('`${t.radius.xl}rpx`');
  overflow: hidden;
}
.skeleton-card {
  height: 300rpx;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
