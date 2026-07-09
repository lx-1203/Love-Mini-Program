<script setup lang="ts">
import { designTokens } from '../../theme/tokens';
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

const t = designTokens;
</script>

<template>
  <scroll-view scroll-x class="activity-scroll" :show-scrollbar="false">
    <view class="activity-list">
      <view v-if="loading" class="activity-skeleton" v-for="i in 3" :key="i">
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
  border-radius: v-bind('`${t.radius.xl}rpx`');
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
