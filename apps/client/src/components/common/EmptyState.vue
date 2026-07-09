<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../../theme/tokens';

const props = withDefaults(defineProps<{
  type?: 'no-data' | 'no-match' | 'no-chat';
  message?: string;
}>(), {
  type: 'no-data',
  message: '暂无数据',
});

const t = designTokens;

const iconSrc = computed(() => {
  const map: Record<string, string> = {
    'no-data': '/static/assets/icons/common/search.png',
    'no-match': '/static/assets/icons/common/close.png',
    'no-chat': '/static/assets/icons/common/notification.png',
  };
  return map[props.type];
});

const subMap: Record<string, string> = { 'no-data': '这里空空如也', 'no-match': '暂时没有匹配的人', 'no-chat': '还没有聊天记录' };
</script>

<template>
  <view class="empty">
    <image class="empty-icon" :src="iconSrc" mode="aspectFit" />
    <text class="empty-msg">{{ message }}</text>
    <text class="empty-sub">{{ subMap[type] }}</text>
    <slot />
  </view>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}
.empty-icon { width: 120rpx; height: 120rpx; margin-bottom: 16rpx; }
.empty-msg {
  font-size: v-bind('`${t.typography.size.subtitle}rpx`');
  font-weight: v-bind('t.typography.weight.semibold');
  color: v-bind('t.color.text.secondary');
}
.empty-sub {
  font-size: v-bind('`${t.typography.size.bodySm}rpx`');
  color: v-bind('t.color.text.quaternary');
  margin-top: 8rpx;
}
</style>
