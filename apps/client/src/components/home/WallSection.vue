<script setup lang="ts">
import { useI18n } from 'vue-i18n';
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

const { t } = useI18n();

// 修复（严格模式 noUnusedLocals）：t 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用。
defineExpose({ t });
</script>

<template>
  <view
    class="wall-section"
    role="list"
    :aria-label="t('home.campusNews')"
  >
    <view
      v-show="loading"
      class="wall-skeleton"
      v-for="i in 2"
      :key="i"
      role="status"
      aria-live="polite"
      :aria-label="t('common.loading')"
    >
      <view class="skeleton-card shimmer" />
    </view>
    <WallPostCard
      v-show="!loading"
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
  border-radius: var(--r-xl);
  overflow: hidden;
}
.skeleton-card {
  height: 300rpx;
  background: linear-gradient(90deg, var(--c-neutral-50, #f1f5f9) 25%, var(--c-neutral-200, #e2e8f0) 50%, var(--c-neutral-50, #f1f5f9) 75%);
  background-size: 200% 100%;
  animation: shimmer var(--d-particle, 1500ms) ease-in-out infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
