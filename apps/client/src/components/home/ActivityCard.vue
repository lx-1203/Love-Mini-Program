<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../../theme/tokens';
import { IMAGE_PATHS } from '../../config/images';

const props = defineProps<{
  title?: string;
  time?: string;
  location?: string;
  status?: 'open' | 'ongoing' | 'upcoming' | 'closed';
  emoji?: string;
}>();

const t = designTokens;

const emojiIconMap: Record<string, string> = {
  'celebration.png': IMAGE_PATHS.ICONS_COMMON.CELEBRATION,
  'school.png': IMAGE_PATHS.ICONS_COMMON.SCHOOL,
  'fire.png': IMAGE_PATHS.ICONS_COMMON.FIRE,
  'star.png': IMAGE_PATHS.ICONS_COMMON.STAR,
  'heart.png': IMAGE_PATHS.ICONS_COMMON.HEART,
  'schedule.png': IMAGE_PATHS.ICONS_COMMON.SCHEDULE,
  'graduation.png': IMAGE_PATHS.ICONS_COMMON.GRADUATION,
  'location.png': IMAGE_PATHS.ICONS_COMMON.LOCATION,
};

const emojiSrc = computed(() => {
  if (!props.emoji) return IMAGE_PATHS.ICONS_COMMON.CELEBRATION;
  return emojiIconMap[props.emoji] || IMAGE_PATHS.ICONS_COMMON.CELEBRATION;
});

const statusMap: Record<string, string> = { open: '报名中', ongoing: '进行中', upcoming: '预告', closed: '已结束' };
const statusClass = (status?: string) => {
  const map: Record<string, string> = { open: 'tag--brand', ongoing: 'tag--success', upcoming: 'tag--neutral', closed: 'tag--neutral' };
  return map[status || ''] || 'tag--brand';
};
</script>

<template>
  <view class="activity-card">
    <view class="activity-cover">
      <view class="activity-tag" v-if="status" :class="statusClass(status)">
        <text class="activity-tag-text">{{ statusMap[status] }}</text>
      </view>
      <image v-if="emoji" class="activity-emoji" :src="emojiSrc" mode="aspectFit" />
      <image v-else class="activity-emoji" :src="IMAGE_PATHS.ICONS_COMMON.CELEBRATION" mode="aspectFit" />
    </view>
    <view class="activity-info">
      <text class="activity-title">{{ title }}</text>
      <view class="activity-meta">
        <text v-if="time" class="activity-meta-item">{{ time }}</text>
        <text v-if="location" class="activity-meta-item">{{ location }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.activity-card {
  min-width: 400rpx;
  border-radius: var(--r-xl);
  overflow: hidden;
  background: var(--c-bg-container);
  box-shadow: var(--c-elevation-1);
  border: var(--c-border-card);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}
.activity-card:active {
  transform: translateY(-4rpx);
  box-shadow: var(--c-elevation-2);
  border: var(--c-border-card-brand);
}

.activity-cover {
  height: 200rpx;
  background: linear-gradient(135deg, var(--c-brand-100), var(--c-brand-50));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.activity-cover::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80rpx;
  background: linear-gradient(0deg, rgba(255,255,255,0.3) 0%, transparent 100%);
}
.activity-tag {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 4rpx 16rpx;
  border-radius: var(--r-sm);
  /* mp-weixin 不支持，H5 保留毛玻璃 */
  // #ifdef H5
  backdrop-filter: blur(12rpx);
  // #endif
}
.activity-tag.tag--brand {
  background: rgba(91, 127, 255, 0.85);
}
.activity-tag.tag--success {
  background: rgba(16, 185, 129, 0.85);
}
.activity-tag.tag--neutral {
  background: rgba(100, 116, 139, 0.75);
}
.activity-tag-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #fff;
}
.activity-emoji {
  width: 56rpx;
  height: 56rpx;
}

.activity-info { padding: 20rpx; }
.activity-title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8rpx;
}
.activity-meta {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}
.activity-meta-item {
  font-size: var(--fs-sm);
  color: var(--c-text-quaternary);
}
</style>
