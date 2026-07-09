<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

const props = withDefaults(defineProps<{
  variant?: 'card' | 'list' | 'avatar' | 'paragraph';
  count?: number;
}>(), {
  variant: 'card',
  count: 1,
});

const t = designTokens;
</script>

<template>
  <view class="skeleton">
    <view v-for="i in count" :key="i" class="skeleton-item" :class="`skeleton--${variant}`">
      <!-- 列表骨架 -->
      <view v-if="variant === 'list'" class="skeleton-list">
        <view class="skeleton-avatar shimmer" />
        <view class="skeleton-lines">
          <view class="skeleton-line skeleton-line--w60 shimmer" />
          <view class="skeleton-line skeleton-line--w40 shimmer" />
        </view>
      </view>
      <!-- 头像骨架 -->
      <view v-else-if="variant === 'avatar'" class="skeleton-avatar-wrap">
        <view class="skeleton-avatar-lg shimmer" />
        <view class="skeleton-line skeleton-line--w30 shimmer" style="margin-top:12rpx" />
      </view>
      <!-- 段落骨架（无图片） -->
      <view v-else-if="variant === 'paragraph'" class="skeleton-paragraph">
        <view class="skeleton-line skeleton-line--w100 shimmer" />
        <view class="skeleton-line skeleton-line--w100 shimmer" />
        <view class="skeleton-line skeleton-line--w60 shimmer" />
      </view>
      <!-- 卡片骨架（默认） -->
      <view v-else class="skeleton-card">
        <view class="skeleton-card-img shimmer" />
        <view class="skeleton-card-body">
          <view class="skeleton-line skeleton-line--w70 shimmer" />
          <view class="skeleton-line skeleton-line--w50 shimmer" />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.skeleton-item {
  border-radius: v-bind('`${t.radius.xl}rpx`');
  overflow: hidden;
}
.shimmer {
  background: linear-gradient(
    90deg,
    v-bind('t.color.neutral[100]') 25%,
    v-bind('t.color.neutral[200]') 50%,
    v-bind('t.color.neutral[100]') 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ---- 列表 ---- */
.skeleton-list {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: v-bind('t.color.bg.container');
  border-radius: v-bind('`${t.radius.xl}rpx`');
}
.skeleton-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.skeleton-line {
  height: 24rpx;
  border-radius: 6rpx;
}
.skeleton-line--w30 { width: 30%; }
.skeleton-line--w40 { width: 40%; }
.skeleton-line--w50 { width: 50%; }
.skeleton-line--w60 { width: 60%; }
.skeleton-line--w70 { width: 70%; }
.skeleton-line--w100 { width: 100%; }

/* ---- 头像 ---- */
.skeleton-avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx;
}
.skeleton-avatar-lg {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
}

/* ---- 段落 ---- */
.skeleton-paragraph {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 32rpx 24rpx;
  background: v-bind('t.color.bg.container');
  border-radius: v-bind('`${t.radius.xl}rpx`');
}

/* ---- 卡片 ---- */
.skeleton-card {
  background: v-bind('t.color.bg.container');
  border-radius: v-bind('`${t.radius.xl}rpx`');
  overflow: hidden;
}
.skeleton-card-img {
  width: 100%;
  height: 240rpx;
}
.skeleton-card-body {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
</style>
