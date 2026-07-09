<script setup lang="ts">
import { designTokens } from '../../theme/tokens';
import Avatar from '../common/Avatar.vue';

defineProps<{
  id?: string;
  name?: string;
  initials?: string;
  avatarUrl?: string;
  headline?: string;
  isSameSchool?: boolean;
  isSameMajor?: boolean;
  commonCircleCount?: number;
  actionText?: string;
}>();

const emit = defineEmits<{
  tap: [];
}>();

const t = designTokens;
</script>

<template>
  <view class="person-card" @tap="emit('tap')">
    <view class="person-avatar" :class="{ 'person-avatar--halo': isSameSchool }">
      <Avatar :name="initials || name?.charAt(0)" :src="avatarUrl" size="md" />
    </view>
    <view class="person-info">
      <text class="person-name">{{ name }}</text>
      <text class="person-headline" v-if="headline">{{ headline }}</text>
      <view class="person-tags">
        <text v-if="isSameSchool" class="person-tag person-tag--school">同校</text>
        <text v-if="isSameMajor" class="person-tag person-tag--major">同专业</text>
        <text v-if="commonCircleCount && commonCircleCount > 0" class="person-tag person-tag--circle">
          {{ commonCircleCount }}个共同圈
        </text>
      </view>
    </view>
    <view class="person-action">
      <text class="person-action-text">{{ actionText || '去聊天' }}</text>
    </view>
  </view>
</template>

<style scoped>
.person-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: v-bind('`${t.radius.xl}rpx`');
  background: v-bind('t.color.bg.container');
  box-shadow: var(--c-elevation-1);
  border: var(--c-border-card);
  cursor: pointer;
  transition: transform v-bind('`${t.motion.duration.normal}ms`') v-bind('t.motion.easing.default'), box-shadow v-bind('`${t.motion.duration.normal}ms`') v-bind('t.motion.easing.default'), border-color v-bind('`${t.motion.duration.normal}ms`') v-bind('t.motion.easing.default');
}
.person-card:active {
  transform: translateY(-2rpx);
  box-shadow: var(--c-elevation-2);
  border: var(--c-border-card-brand);
}

.person-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: box-shadow v-bind('`${t.motion.duration.normal}ms`') v-bind('t.motion.easing.default');
}

.person-avatar--halo {
  box-shadow: 0 0 0 4rpx rgba(91, 127, 255, 0.2), 0 0 16rpx rgba(91, 127, 255, 0.15);
}

.person-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.person-name {
  font-size: v-bind('`${t.typography.size.body}rpx`');
  font-weight: v-bind('t.typography.weight.semibold');
  color: v-bind('t.color.text.primary');
  line-height: v-bind('t.typography.lineHeight.tight');
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.person-headline {
  font-size: v-bind('`${t.typography.size.caption}rpx`');
  color: v-bind('t.color.text.tertiary');
  line-height: v-bind('t.typography.lineHeight.tight');
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.person-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  margin-top: 6rpx;
}
.person-tag {
  padding: 2rpx 12rpx;
  border-radius: v-bind('`${t.radius.sm}rpx`');
  font-size: 20rpx;
  font-weight: v-bind('t.typography.weight.medium');
}
.person-tag--school {
  background: v-bind('t.color.brand[50]');
  color: v-bind('t.color.brand[500]');
}
.person-tag--major {
  background: v-bind('t.color.accent[50]');
  color: v-bind('t.color.accent[500]');
}
.person-tag--circle {
  background: v-bind('t.color.neutral[100]');
  color: v-bind('t.color.text.tertiary');
}

.person-action {
  padding: 12rpx 24rpx;
  border-radius: 9999rpx;
  background: v-bind('t.color.brand[400]');
  flex-shrink: 0;
}
.person-action:active { background: v-bind('t.color.brand[500]'); }
.person-action-text {
  font-size: v-bind('`${t.typography.size.caption}rpx`');
  font-weight: v-bind('t.typography.weight.semibold');
  color: #fff;
}
</style>
