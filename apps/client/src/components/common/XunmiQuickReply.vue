<script setup lang="ts">
/**
 * XunmiQuickReply — 快捷回复按钮组组件
 * 用于聊天页助手推荐的快捷回复按钮
 */
defineProps<{
  options?: Array<{ text: string; variant?: 'brand' | 'default' }>;
}>();

const emit = defineEmits<{ (e: 'select', text: string): void }>();
</script>

<template>
  <view class="quick-reply">
    <view
      v-for="opt in (options || [])"
      :key="opt.text"
      class="quick-reply__btn"
      :class="opt.variant === 'brand' ? 'quick-reply__btn--brand' : 'quick-reply__btn--default'"
      hover-class="quick-reply__btn--pressed"
      @tap="emit('select', opt.text)"
    >
      <text class="quick-reply__text" :class="opt.variant === 'brand' ? 'quick-reply__text--brand' : 'quick-reply__text--default'">{{ opt.text }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.quick-reply {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 0;
}

.quick-reply__btn {
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-reply__btn--brand {
  background: #E8FAF3;
  border: 2rpx solid #36C99A;
}

.quick-reply__btn--default {
  background: #F7FAF9;
  border: 2rpx solid #DDE3E0;
}

.quick-reply__btn--pressed {
  opacity: 0.7;
  transform: scale(0.96);
}

.quick-reply__text {
  font-size: 26rpx;
  font-weight: 500;
}

.quick-reply__text--brand { color: #36C99A; }
.quick-reply__text--default { color: #9AA39F; }
</style>
