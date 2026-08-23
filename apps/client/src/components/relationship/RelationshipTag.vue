<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    status: "just_met" | "chatting" | "ambiguous" | "mutual_follow";
    size?: "sm" | "md";
  }>(),
  { size: "sm" }
);

const labelMap = {
  just_met: "刚认识",
  chatting: "聊天中",
  ambiguous: "暧昧中",
  mutual_follow: "互相关注",
} as const;

const colorMap = {
  just_met: "#9AA39F",
  chatting: "#36C99A",
  ambiguous: "#FF6B81",
  mutual_follow: "#54A0FF",
} as const;

const bgColorMap = {
  just_met: "#EEF2F0",
  chatting: "#E8FAF3",
  ambiguous: "#FFECEF",
  mutual_follow: "#E8F0FF",
} as const;

const label = computed(() => labelMap[props.status]);
const color = computed(() => colorMap[props.status]);
const bgColor = computed(() => bgColorMap[props.status]);
</script>

<template>
  <view class="relationship-tag" :class="[`relationship-tag--${size}`]" :style="{ color, borderColor: color, backgroundColor: bgColor }">
    <text class="relationship-tag__text">{{ label }}</text>
  </view>
</template>

<style scoped lang="scss">
.relationship-tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  border: 1rpx solid currentColor;
}
.relationship-tag--sm {
  font-size: 20rpx;
}
.relationship-tag--md {
  font-size: 24rpx;
  padding: 6rpx 18rpx;
}
.relationship-tag__text {
  font-weight: 600;
  line-height: 1.4;
}
</style>
