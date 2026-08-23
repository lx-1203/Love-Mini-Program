<script setup lang="ts">
/**
 * XunmiStatusTag — 状态标签组件
 * 用于聊天列表中的状态标签（聊天中/刚认识/互相关注/暧昧中）
 */
withDefaults(defineProps<{
  variant?: 'chatting' | 'new' | 'mutual' | 'flirting';
  label?: string;
}>(), {
  variant: 'new',
  label: '',
});

const VARIANT_MAP: Record<string, { bg: string; color: string; text: string }> = {
  chatting: { bg: '#E8FAF3', color: '#36C99A', text: '聊天中' },
  new: { bg: '#EEF2F0', color: '#9AA39F', text: '刚认识' },
  mutual: { bg: '#E8F0FF', color: '#54A0FF', text: '互相关注' },
  flirting: { bg: '#FFECEF', color: '#FF6B81', text: '暧昧中' },
};
</script>

<template>
  <view
    class="status-tag"
    :style="{ background: VARIANT_MAP[variant]?.bg, color: VARIANT_MAP[variant]?.color }"
  >
    <text class="status-tag__text" :style="{ color: VARIANT_MAP[variant]?.color }">{{ label || VARIANT_MAP[variant]?.text }}</text>
  </view>
</template>

<style scoped lang="scss">
.status-tag {
  display: inline-flex;
  align-items: center;
  height: 36rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
}

.status-tag__text {
  font-size: 20rpx;
  font-weight: 500;
  line-height: 1;
}
</style>
