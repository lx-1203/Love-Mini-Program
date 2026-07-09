<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

defineProps<{
  title?: string;
  time?: string;
  location?: string;
  status?: 'open' | 'ongoing' | 'upcoming' | 'closed';
  emoji?: string;
}>();

const t = designTokens;

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
      <image v-if="emoji" class="activity-emoji" :src="`/static/assets/icons/common/${emoji}`" mode="aspectFit" />
      <image v-else class="activity-emoji" src="/static/assets/icons/common/celebration.png" mode="aspectFit" />
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
  border-radius: v-bind('`${t.radius.xl}rpx`');
  overflow: hidden;
  background: v-bind('t.color.bg.container');
  box-shadow: var(--c-elevation-1);
  border: var(--c-border-card);
  transition: transform v-bind('`${t.motion.duration.normal}ms`') v-bind('t.motion.easing.default'), box-shadow v-bind('`${t.motion.duration.normal}ms`') v-bind('t.motion.easing.default'), border-color v-bind('`${t.motion.duration.normal}ms`') v-bind('t.motion.easing.default');
  cursor: pointer;
}
.activity-card:active {
  transform: translateY(-4rpx);
  box-shadow: var(--c-elevation-2);
  border: var(--c-border-card-brand);
}

.activity-cover {
  height: 200rpx;
  background: linear-gradient(135deg, v-bind('t.color.brand[100]'), v-bind('t.color.brand[50]'));
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
  border-radius: v-bind('`${t.radius.sm}rpx`');
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
  font-weight: v-bind('t.typography.weight.semibold');
  color: #fff;
}
.activity-emoji { font-size: 56rpx; }

.activity-info { padding: 20rpx; }
.activity-title {
  font-size: v-bind('`${t.typography.size.body}rpx`');
  font-weight: v-bind('t.typography.weight.semibold');
  color: v-bind('t.color.text.primary');
  line-height: v-bind('t.typography.lineHeight.tight');
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
  font-size: v-bind('`${t.typography.size.caption}rpx`');
  color: v-bind('t.color.text.quaternary');
}
</style>
