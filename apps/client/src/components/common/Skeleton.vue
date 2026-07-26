<script setup lang="ts">
// 修复（严格模式 noUnusedLocals）：
// 1. 原 `const props = withDefaults(...)` 中 props 在脚本中未被引用，模板内 prop 字段直接解构自 defineProps，
//    故移除 `const props = ` 前缀，仅保留 withDefaults(defineProps...) 调用以声明默认值。
// 2. 原 `const t = designTokens;` 后未使用 t，designTokens 导入也仅用于该别名，一并移除。
withDefaults(defineProps<{
  variant?: 'card' | 'list' | 'avatar' | 'paragraph';
  count?: number;
}>(), {
  variant: 'card',
  count: 1,
});
</script>

<template>
  <view
    class="skeleton"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label="加载中"
  >
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
  border-radius: var(--r-xl);
  overflow: hidden;
}
.shimmer {
  background: linear-gradient(
    90deg,
    var(--c-neutral-100) 25%,
    var(--c-neutral-200) 50%,
    var(--c-neutral-100) 75%
  );
  background-size: 200% 100%;
  /* #ifndef MP-WEIXIN */
  /* H5 / App 端：保持原 1.5s 流畅 shimmer */
  animation: shimmer 1.5s ease-in-out infinite;
  /* #endif */
  /* #ifdef MP-WEIXIN */
  /* mp-weixin 低端机性能差，降低动画频率到 3s 减少重绘开销 */
  animation: shimmer 3s ease-in-out infinite;
  /* #endif */
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 尊重用户「减少动效」系统偏好：完全关闭 shimmer 动画，仅显示静态渐变背景 */
@media (prefers-reduced-motion: reduce) {
  .shimmer {
    animation: none;
  }
}

/* ---- 列表 ---- */
.skeleton-list {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
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
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
}

/* ---- 卡片 ---- */
.skeleton-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
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
