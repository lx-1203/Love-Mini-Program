<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../../theme/tokens';

const props = withDefaults(defineProps<{
  type?: 'network' | 'server';
}>(), {
  type: 'network',
});

const emit = defineEmits<{
  retry: [];
}>();

const t = designTokens;

const iconSrc = computed(() => {
  const map: Record<string, string> = {
    network: '/static/assets/icons/common/search.png',
    server: '/static/assets/icons/common/close.png',
  };
  return map[props.type];
});

const msgMap: Record<string, string> = { network: '网络连接失败', server: '服务器开小差了' };
const subMap: Record<string, string> = { network: '请检查网络后重试', server: '请稍后再试' };
</script>

<template>
  <view class="error">
    <image class="error-icon" :src="iconSrc" mode="aspectFit" />
    <text class="error-msg">{{ msgMap[type] }}</text>
    <text class="error-sub">{{ subMap[type] }}</text>
    <view class="error-btn" @tap="emit('retry')">
      <text class="error-btn-text">重试</text>
    </view>
  </view>
</template>

<style scoped>
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}
.error-icon { width: 120rpx; height: 120rpx; margin-bottom: 16rpx; }
.error-msg {
  font-size: v-bind('`${t.typography.size.subtitle}rpx`');
  font-weight: v-bind('t.typography.weight.semibold');
  color: v-bind('t.color.text.secondary');
}
.error-sub {
  font-size: v-bind('`${t.typography.size.bodySm}rpx`');
  color: v-bind('t.color.text.quaternary');
  margin-top: 8rpx;
}
.error-btn {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  border-radius: 9999rpx;
  background: v-bind('t.color.brand[400]');
  cursor: pointer;
}
.error-btn:active { transform: scale(0.97); }
.error-btn-text {
  color: #fff;
  font-size: v-bind('`${t.typography.size.body}rpx`');
  font-weight: v-bind('t.typography.weight.semibold');
}
</style>
