<!-- ============================================================
  EducationBadge - 青藤风格学历徽章组件
  设计灵感：青藤之恋 App 的学历认证徽章
  特点：
  1. 青藤绿渐变背景，象征成长与学术
  2. 盾牌形状边框，代表认证与可信
  3. 支持 size 变体与 verified 状态
============================================================ -->
<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../tokens';

const props = defineProps<{
  school: string;
  degree?: '本科' | '硕士' | '博士' | '专科' | string;
  verified?: boolean;
  size?: 'sm' | 'md' | 'lg';
}>();

const t = computed(() => designTokens);

const sizeMap = {
  sm: { padding: `${t.value.spacing[1]}rpx ${t.value.spacing[2]}rpx`, fontSize: `${t.value.typography.size.overline}rpx`, iconSize: '16rpx' },
  md: { padding: `${t.value.spacing[1]}rpx ${t.value.spacing[3]}rpx`, fontSize: `${t.value.typography.size.caption}rpx`, iconSize: '20rpx' },
  lg: { padding: `${t.value.spacing[2]}rpx ${t.value.spacing[4]}rpx`, fontSize: `${t.value.typography.size.bodySm}rpx`, iconSize: '24rpx' },
};

const currentSize = computed(() => sizeMap[props.size || 'md']);

const badgeStyle = computed(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: `${t.value.spacing[1]}rpx`,
  padding: currentSize.value.padding,
  borderRadius: `${t.value.radius.sm}rpx`,
  background: props.verified
    ? t.value.color.gradient.brand
    : t.value.color.bg.surface,
  color: props.verified ? t.value.color.text.inverse : t.value.color.text.secondary,
  fontSize: currentSize.value.fontSize,
  fontWeight: t.value.typography.weight.medium,
  lineHeight: 1,
  border: props.verified ? 'none' : `1rpx solid ${t.value.color.border.default}`,
}));

const shieldStyle = computed(() => ({
  width: currentSize.value.iconSize,
  height: currentSize.value.iconSize,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}));
</script>

<template>
  <view class="edu-badge" :style="badgeStyle">
    <view class="edu-badge__shield" :style="shieldStyle">
      <text v-if="verified" class="edu-badge__check">✓</text>
      <text v-else class="edu-badge__dot">•</text>
    </view>
    <text class="edu-badge__school">{{ school }}</text>
    <text v-if="degree" class="edu-badge__degree">· {{ degree }}</text>
  </view>
</template>

<style lang="scss" scoped>
.edu-badge {
  &__check {
    font-weight: v-bind('t.typography.weight.bold');
    opacity: 0.95;
  }

  &__dot {
    opacity: 0.5;
  }

  &__degree {
    opacity: 0.85;
  }
}
</style>
