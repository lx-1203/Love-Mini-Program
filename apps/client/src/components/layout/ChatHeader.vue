<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

defineProps<{
  title?: string;
}>();

const emit = defineEmits<{
  searchTap: [];
  addTap: [];
}>();

const t = designTokens;
</script>

<template>
  <view class="chat-header">
    <text class="chat-title">{{ title || '消息' }}</text>
    <view class="chat-icons">
      <view class="chat-icon" @tap="emit('searchTap')">
        <image class="chat-icon-img" src="/static/assets/icons/common/search.png" mode="aspectFit" />
      </view>
      <view class="chat-icon" @tap="emit('addTap')">
        <image class="chat-icon-img" src="/static/assets/icons/common/add.png" mode="aspectFit" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx 20rpx;
  background: v-bind('t.color.bg.container');
  border-bottom: 1rpx solid v-bind('t.color.border.light');
}
.chat-title {
  font-size: v-bind('`${t.typography.size.h3}rpx`');
  font-weight: v-bind('t.typography.weight.bold');
  color: v-bind('t.color.text.primary');
  letter-spacing: v-bind('t.typography.letterSpacing.tight');
}
.chat-icons {
  display: flex;
  gap: 16rpx;
}
.chat-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: v-bind('t.color.neutral[50]');
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: v-bind('t.color.text.tertiary');
  cursor: pointer;
  transition: background 150ms ease;
}
.chat-icon:active {
  background: v-bind('t.color.brand[100]');
  transform: scale(0.95);
}
</style>
