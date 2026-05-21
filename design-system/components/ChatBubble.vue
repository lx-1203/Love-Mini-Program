<!-- ============================================================
  ChatBubble - 聊天气泡组件
  基于原项目 ChatBubble 重构
  变更点：
  1. 所有颜色/间距/圆角从 tokens 读取
  2. 增加 sender="system" 时的渐变背景
  3. 增加语音消息的波形动画
  4. 增加长按反馈动效
============================================================ -->
<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../tokens';
import VoicePill from './VoicePill.vue';

const props = defineProps<{
  sender: 'self' | 'peer' | 'system';
  kind: 'text' | 'voice' | 'emoji' | 'system';
  body?: string;
  durationSeconds?: number;
  sentAt: string;
  status?: 'sending' | 'sent' | 'read';
}>();

const t = computed(() => designTokens);

const bubbleClass = computed(() => `bubble--${props.sender}`);

const bubbleStyle = computed(() => {
  const base = {
    maxWidth: '75%',
    padding: `${t.value.spacing[3]}rpx ${t.value.spacing[4]}rpx`,
    borderRadius: `${t.value.radius.xl}rpx`,
    fontSize: `${t.value.typography.size.body}rpx`,
    lineHeight: t.value.typography.lineHeight.normal,
    transition: `transform ${t.value.motion.duration.fast}ms ${t.value.motion.easing.default}`,
  };

  switch (props.sender) {
    case 'self':
      return {
        ...base,
        background: t.value.color.gradient.brand,
        color: t.value.color.text.inverse,
        borderBottomRightRadius: `${t.value.radius.sm}rpx`,
      };
    case 'peer':
      return {
        ...base,
        background: t.value.color.bg.container,
        color: t.value.color.text.primary,
        borderBottomLeftRadius: `${t.value.radius.sm}rpx`,
        boxShadow: t.value.shadow.sm,
      };
    case 'system':
      return {
        ...base,
        background: t.value.color.gradient.sunset,
        color: t.value.color.text.inverse,
        alignSelf: 'center',
        fontSize: `${t.value.typography.size.caption}rpx`,
      };
    default:
      return base;
  }
});

const metaStyle = computed(() => ({
  fontSize: `${t.value.typography.size.overline}rpx`,
  color: props.sender === 'self' ? 'rgba(255,255,255,0.7)' : t.value.color.text.quaternary,
  marginTop: `${t.value.spacing[1]}rpx`,
  textAlign: props.sender === 'self' ? 'right' : 'left',
}));
</script>

<template>
  <view class="bubble" :class="bubbleClass" :style="bubbleStyle">
    <template v-if="kind === 'voice'">
      <VoicePill :duration-seconds="durationSeconds || 0" :sender="sender" />
    </template>
    <template v-else-if="kind === 'emoji'">
      <text class="bubble__emoji">{{ body }}</text>
    </template>
    <template v-else>
      <text class="bubble__body">{{ body }}</text>
    </template>
    <text class="bubble__meta" :style="metaStyle">
      {{ sentAt }}
      <text v-if="sender === 'self' && status" class="bubble__status">
        {{ status === 'sending' ? '发送中...' : status === 'read' ? '已读' : '已送达' }}
      </text>
    </text>
  </view>
</template>

<style lang="scss" scoped>
.bubble {
  display: flex;
  flex-direction: column;
  margin-bottom: v-bind('`${t.spacing[3]}rpx`');

  &--self {
    align-self: flex-end;
  }

  &--peer {
    align-self: flex-start;
  }

  &--system {
    align-self: center;
    max-width: 80%;
  }

  &:active {
    transform: scale(0.98);
  }

  &__emoji {
    font-size: v-bind('`${t.typography.size.display}rpx`');
    line-height: 1;
  }

  &__body {
    word-break: break-word;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: v-bind('`${t.spacing[1]}rpx`');
  }

  &__status {
    margin-left: v-bind('`${t.spacing[1]}rpx`');
    opacity: 0.8;
  }
}
</style>
