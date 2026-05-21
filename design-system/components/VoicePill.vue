<!-- ============================================================
  VoicePill - 语音消息胶囊组件
  变更点：
  1. 从 tokens 读取全部样式
  2. 增加播放时的波形动画
  3. 增加 sender 区分样式
============================================================ -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { designTokens } from '../tokens';

const props = defineProps<{
  durationSeconds: number;
  expired?: boolean;
  sender?: 'self' | 'peer';
}>();

const t = computed(() => designTokens);
const isPlaying = ref(false);

const pillStyle = computed(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: `${t.value.spacing[2]}rpx`,
  padding: `${t.value.spacing[2]}rpx ${t.value.spacing[4]}rpx`,
  borderRadius: `${t.value.radius.full}rpx`,
  background: props.sender === 'self'
    ? 'rgba(255,255,255,0.2)'
    : t.value.color.bg.surface,
  color: props.sender === 'self' ? t.value.color.text.inverse : t.value.color.text.primary,
  fontSize: `${t.value.typography.size.bodySm}rpx`,
  opacity: props.expired ? 0.5 : 1,
}));

const iconStyle = computed(() => ({
  fontSize: `${t.value.typography.size.h4}rpx`,
  color: props.sender === 'self' ? t.value.color.text.inverse : t.value.color.brand[400],
}));

const waveBarStyle = computed(() => ({
  background: props.sender === 'self' ? t.value.color.text.inverse : t.value.color.brand[400],
  opacity: 0.4,
}));

function togglePlay() {
  isPlaying.value = !isPlaying.value;
}
</script>

<template>
  <view class="voice" :style="pillStyle" @click="togglePlay">
    <text class="voice__icon" :style="iconStyle">
      {{ isPlaying ? '⏸' : '▶' }}
    </text>
    <view class="voice__waves" :class="{ 'voice__waves--playing': isPlaying }">
      <view v-for="i in 5" :key="i" class="voice__wave-bar" :style="waveBarStyle" />
    </view>
    <text class="voice__duration">{{ durationSeconds }}"</text>
  </view>
</template>

<style lang="scss" scoped>
.voice {
  &__waves {
    display: flex;
    align-items: center;
    gap: 4rpx;
    height: 24rpx;
  }

  &__wave-bar {
    width: 4rpx;
    height: 12rpx;
    border-radius: 9999rpx;
    transition: height 0.2s ease;

    &:nth-child(2) { height: 16rpx; }
    &:nth-child(3) { height: 20rpx; }
    &:nth-child(4) { height: 16rpx; }
  }

  &__waves--playing {
    .voice__wave-bar {
      animation: wave 0.6s ease-in-out infinite;

      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.1s; }
      &:nth-child(3) { animation-delay: 0.2s; }
      &:nth-child(4) { animation-delay: 0.3s; }
      &:nth-child(5) { animation-delay: 0.4s; }
    }
  }

  @keyframes wave {
    0%, 100% { height: 8rpx; opacity: 0.4; }
    50% { height: 24rpx; opacity: 1; }
  }
}
</style>
