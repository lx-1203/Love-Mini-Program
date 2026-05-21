<script setup lang="ts">
import VoicePill from "./VoicePill.vue";

defineProps<{
  sender: "self" | "peer" | "system";
  kind: "text" | "voice" | "emoji" | "system";
  body: string;
  sentAt: string;
  durationSeconds?: number | null;
}>();
</script>

<template>
  <view class="bubble" :class="[`bubble--${sender}`]">
    <template v-if="kind === 'voice'">
      <VoicePill :duration-seconds="durationSeconds || 0" />
    </template>
    <template v-else>
      <text class="bubble__body">{{ body }}</text>
    </template>
    <text class="bubble__meta">{{ sentAt }}</text>
  </view>
</template>

<style scoped lang="scss">
.bubble {
  display: grid;
  gap: 8rpx;
  max-width: 84%;
  padding: 18rpx;
  border-radius: 20rpx;
}

.bubble--self {
  justify-self: end;
  background: var(--td-brand-color-7);
  color: #fff;
}

.bubble--peer {
  justify-self: start;
  background: #fff;
  color: var(--td-text-color-primary);
}

.bubble--system {
  justify-self: center;
  background: transparent;
  color: var(--td-text-color-secondary);
}

.bubble__body {
  line-height: 1.6;
}

.bubble__meta {
  font-size: 20rpx;
  opacity: 0.72;
}
</style>
