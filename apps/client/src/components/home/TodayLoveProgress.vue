<script setup lang="ts">
import type { LoveProgressStepViewModel } from "../../view-models/home-dashboard";

defineProps<{ completed: number; total: number; steps: LoveProgressStepViewModel[] }>();
defineEmits<{ (e: "step", action: string): void }>();

const STEP_META: Record<string, { bg: string; softBg: string; icon: string; todo: string }> = {
  profile: { bg: "#36C99A", softBg: "#E8FAF3", icon: "✓", todo: "未完成" },
  discover: { bg: "#FF6B81", softBg: "#FFECEF", icon: "♥", todo: "进行中" },
  whisper: { bg: "#FF9F43", softBg: "#FFF5E6", icon: "☺", todo: "待处理" },
  interest: { bg: "#A29BFE", softBg: "#F0EEFF", icon: "★", todo: "未完成" },
};

function stepMeta(id: string) {
  return STEP_META[id] ?? { bg: "#36C99A", softBg: "#E8FAF3", icon: "♥", todo: "未完成" };
}
</script>

<template>
  <view class="love-progress">
    <view class="love-progress__head">
      <view class="love-progress__title-wrap">
        <text class="love-progress__title">今日恋爱进度</text>
        <view class="love-progress__help">
          <text class="love-progress__help-text">?</text>
        </view>
      </view>
      <text class="love-progress__count">{{ completed }}/{{ total }}项完成</text>
    </view>
    <view class="love-progress__bar">
      <view class="love-progress__bar-fill" :style="{ width: total > 0 ? ((completed / total) * 100) + '%' : '0%' }"></view>
    </view>
    <view class="love-progress__steps">
      <view v-for="step in steps" :key="step.id" class="love-step" :style="{ background: stepMeta(step.id).softBg }" @tap="$emit('step', step.action)">
        <view class="love-step__icon" :style="{ background: stepMeta(step.id).bg }">
          <text class="love-step__icon-text">{{ stepMeta(step.id).icon }}</text>
        </view>
        <text class="love-step__title" :style="{ color: stepMeta(step.id).bg }">{{ step.title }}</text>
        <text class="love-step__meta" :style="{ color: stepMeta(step.id).bg }">
          {{ step.completed ? '已完成' : stepMeta(step.id).todo }}
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.love-progress {
  margin: 0 40rpx 20rpx;
  padding: 32rpx;
  border-radius: 40rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.love-progress__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.love-progress__title-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.love-progress__title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333A37;
}

.love-progress__help {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #F0F2F5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.love-progress__help-text {
  font-size: 20rpx;
  color: #9AA39F;
}

.love-progress__count {
  font-size: 28rpx;
  color: #36C99A;
  font-weight: 500;
}

.love-progress__bar {
  height: 12rpx;
  margin-top: 24rpx;
  border-radius: 999rpx;
  background: #EEF2F0;
  overflow: hidden;
}

.love-progress__bar-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #36C99A 0%, #55D5A7 100%);
}

.love-progress__steps {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}

.love-step {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  height: 112rpx;
  padding: 16rpx 8rpx;
  border-radius: 24rpx;
  box-sizing: border-box;
}

.love-step__icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.love-step__icon-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 700;
}

.love-step__title {
  font-size: 24rpx;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.love-step__meta {
  font-size: 20rpx;
  font-weight: 400;
  text-align: center;
}
</style>
