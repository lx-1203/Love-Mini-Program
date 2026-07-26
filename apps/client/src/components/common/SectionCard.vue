<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  compact?: boolean;
}>();
</script>

<template>
  <view
    class="card"
    :class="{ 'card--compact': compact }"
    role="region"
    :aria-label="title"
  >
    <text class="card__title">{{ title }}</text>
    <text v-if="subtitle" class="card__subtitle">{{ subtitle }}</text>
    <view class="card__body">
      <slot />
    </view>
  </view>
</template>

<style scoped lang="scss">
// P3 修复：复用 _components.scss 的设计令牌，避免与其他 .card 类重复定义
// 共享样式位置：src/styles/_components.scss 中的 .base-card
.card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-8);
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  box-shadow: var(--c-elevation-1);
  transition: box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1),
              border-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.card:active {
  box-shadow: var(--c-elevation-2);
  border: var(--c-border-card-brand);
}

.card--compact {
  padding: var(--sp-7);
}

.card__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--c-text-primary);
}

.card__subtitle {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--c-text-secondary);
}

.card__body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
</style>
