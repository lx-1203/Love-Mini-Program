<template>
  <view class="skeleton" :class="[`skeleton--${variant}`]" aria-live="polite" :aria-label="label">
    <!-- 列表态：N 张卡片骨架（社区动态/附近的人/圈列表/访客） -->
    <template v-if="variant === 'list'">
      <view v-for="i in rows" :key="i" class="skeleton__card">
        <view class="skeleton__avatar shimmer" />
        <view class="skeleton__lines">
          <view class="skeleton__line shimmer skeleton__line--w40" />
          <view class="skeleton__line shimmer skeleton__line--w90" />
          <view class="skeleton__line shimmer skeleton__line--w70" />
        </view>
      </view>
    </template>
    <!-- 资料态：封面 + 头像 + 信息行（他人主页/详情） -->
    <template v-else-if="variant === 'profile'">
      <view class="skeleton__cover shimmer" />
      <view class="skeleton__card">
        <view class="skeleton__avatar skeleton__avatar--lg shimmer" />
        <view class="skeleton__lines">
          <view class="skeleton__line shimmer skeleton__line--w50" />
          <view class="skeleton__line shimmer skeleton__line--w30" />
        </view>
      </view>
      <view v-for="i in 2" :key="i" class="skeleton__block shimmer" />
    </template>
    <!-- 聊天态：对话气泡左右交替 -->
    <template v-else>
      <view v-for="i in rows" :key="i" class="skeleton__chat-row" :class="i % 2 ? 'skeleton__chat-row--l' : 'skeleton__chat-row--r'">
        <view class="skeleton__bubble shimmer" :class="i % 2 ? 'skeleton__bubble--w60' : 'skeleton__bubble--w40'" />
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * SkeletonBlock — 全局骨架屏（2026-08-31 Phase 1 体验基建）。
 *
 * 背景（真机录屏实证）：页面跳转普遍存在 1~2s 纯白/空白过渡（兴趣圈、
 * 喜欢与访客详情、助手聊天进入、访客 tab 切换），用户感知为「点了没反应/白屏」。
 * 竞品标准：点击 1 帧内必有可视反馈。本组件提供三种开箱变体：
 *  - list    列表卡片骨架（默认 3 行）
 *  - profile 封面+头像资料骨架
 *  - chat    聊天气泡交替骨架（默认 4 行）
 *
 * 用法（页面 loading 态接入）：
 *   <SkeletonBlock v-if="loading" variant="list" :rows="3" />
 *   <真实内容 v-else />
 */
withDefaults(
  defineProps<{
    /** 骨架形态：list 列表卡 | profile 资料 | chat 聊天气泡 */
    variant?: "list" | "profile" | "chat";
    /** 骨架行数（list/chat 生效） */
    rows?: number;
    /** 无障碍标签 */
    label?: string;
  }>(),
  { variant: "list", rows: 3, label: "加载中" }
);
</script>

<style scoped lang="scss">
.skeleton {
  padding: 24rpx 32rpx;
}

.shimmer {
  position: relative;
  overflow: hidden;
  background: var(--c-bg-surface, #F3FAF6);

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.65), transparent);
    animation: skeleton-shimmer 1.3s infinite;
  }
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

/* 列表态 */
.skeleton__card {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container, #ffffff);
}

.skeleton__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  flex-shrink: 0;

  &--lg {
    width: 140rpx;
    height: 140rpx;
  }
}

.skeleton__lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  justify-content: center;
}

.skeleton__line {
  height: 24rpx;
  border-radius: 12rpx;

  &--w30 { width: 30%; }
  &--w40 { width: 40%; }
  &--w50 { width: 50%; }
  &--w70 { width: 70%; }
  &--w90 { width: 90%; }
}

.skeleton__block {
  height: 160rpx;
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
}

/* 聊天态 */
.skeleton__chat-row {
  display: flex;
  margin-bottom: 24rpx;

  &--l { justify-content: flex-start; }
  &--r { justify-content: flex-end; }
}

.skeleton__bubble {
  height: 72rpx;
  border-radius: var(--r-xl, 24rpx);

  &--w40 { width: 40%; }
  &--w60 { width: 60%; }
}
</style>
