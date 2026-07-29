<script setup lang="ts">
import ActivityCard from './ActivityCard.vue';

interface Activity {
  id: string;
  title: string;
  time?: string;
  location?: string;
  status?: 'open' | 'ongoing' | 'upcoming';
  emoji?: string;
}

defineProps<{
  items?: Activity[];
  loading?: boolean;
}>();

// 修复（严格模式 noUnusedLocals）：原 `const t = designTokens;` 后未使用 t，
// designTokens 导入也仅用于该别名；模板/style 未引用 designTokens，故导入与别名一并移除。
</script>

<template>
  <scroll-view scroll-x class="activity-scroll" :show-scrollbar="false">
    <view class="activity-list" role="list">
      <view v-if="loading" class="activity-skeleton" v-for="i in 3" :key="i" role="listitem">
        <view class="skeleton-card shimmer" />
      </view>
      <ActivityCard
        v-else
        v-for="item in (items || [])"
        :key="item.id"
        :title="item.title"
        :time="item.time"
        :location="item.location"
        :status="item.status"
        :emoji="item.emoji"
      />
    </view>
  </scroll-view>
</template>

<style scoped>
.activity-scroll {
  width: 100%;
}
.activity-list {
  display: flex;
  gap: 24rpx;
  padding: 4rpx 32rpx;
}
.activity-skeleton {
  min-width: 400rpx;
  flex-shrink: 0;
}
.skeleton-card {
  height: 340rpx;
  border-radius: var(--r-xl);
  background: linear-gradient(90deg, var(--c-neutral-50, #f1f5f9) 25%, var(--c-neutral-200, #e2e8f0) 50%, var(--c-neutral-50, #f1f5f9) 75%);
  background-size: 200% 100%;
  animation: shimmer var(--d-particle, 1500ms) ease-in-out infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
