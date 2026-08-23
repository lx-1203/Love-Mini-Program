<script setup lang="ts">
/**
 * XunmiProgressRing — 通用进度环组件
 * 用于匹配分析页面的各项匹配进度展示
 */
withDefaults(defineProps<{
  percent?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}>(), {
  percent: 0,
  size: 64,
  strokeWidth: 8,
  color: '#36C99A',
});
</script>

<template>
  <view
    class="progress-ring"
    :style="{ width: size + 'rpx', height: size + 'rpx' }"
  >
    <view class="progress-ring__bg" :style="{ borderWidth: strokeWidth + 'rpx' }" />
    <view
      class="progress-ring__fill"
      :style="{
        borderWidth: strokeWidth + 'rpx',
        borderColor: color,
        '--pct': Math.min(100, Math.max(0, percent)) + '%',
      }"
    />
    <slot>
      <text class="progress-ring__text" :style="{ color }">{{ percent }}%</text>
    </slot>
  </view>
</template>

<style scoped lang="scss">
.progress-ring {
  position: relative;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring__bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border-style: solid;
  border-color: #EEF2F0;
  box-sizing: border-box;
}

.progress-ring__fill {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border-style: solid;
  border-top-color: transparent;
  border-left-color: transparent;
  transform: rotate(-45deg);
  box-sizing: border-box;
  clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%);
}

.progress-ring__text {
  font-size: 14px;
  font-weight: 700;
  z-index: 1;
}
</style>
