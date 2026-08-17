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
      <text class="love-progress__count">{{ completed }} / {{ total }} 项完成</text>
    </view>
    <view class="love-progress__bar">
      <view class="love-progress__bar-fill" :style="{ width: total > 0 ? ((completed / total) * 100) + '%' : '0%' }"></view>
    </view>
    <view class="love-progress__steps">
      <view v-for="step in steps" :key="step.id" class="love-step" @tap="$emit('step', step.action)">
        <view class="love-step" :style="{ background: stepMeta(step.id).softBg }">
          <view class="love-step__icon" :style="{ background: stepMeta(step.id).bg }">
            <text class="love-step__icon-text">{{ stepMeta(step.id).icon }}</text>
          </view>
          <text class="love-step__title" :style="{ color: stepMeta(step.id).bg }">{{ step.title }}</text>
          <text class="love-step__meta" :style="{ color: step.completed ? stepMeta(step.id).bg : stepMeta(step.id).bg }">
            {{ step.completed ? '已完成' : stepMeta(step.id).todo }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.love-progress {
  margin: 0 32rpx 16rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 1rpx solid #ECEFF2;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.04);
}

.love-progress__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.love-progress__title-wrap {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.love-progress__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #222222;
}

.love-progress__help {
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  background: #F0F2F5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.love-progress__help-text {
  font-size: 20rpx;
  color: #999999;
}

.love-progress__count {
  font-size: 22rpx;
  color: #999999;
}

.love-progress__bar {
  height: 10rpx;
  margin-top: 18rpx;
  border-radius: 999rpx;
  background: #E8FBF2;
  overflow: hidden;
}

.love-progress__bar-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #36C99A;
}

.love-progress__steps {
  display: flex;
  gap: 10rpx;
  margin-top: 20rpx;
}

.love-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 6rpx;
  border-radius: 24rpx;
}

.love-step__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.love-step__icon-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 800;
}

.love-step__title {
  font-size: 21rpx;
  font-weight: 700;
  color: #333333;
  text-align: center;
}

.love-step__meta {
  font-size: 18rpx;
  color: #999999;
  text-align: center;
  line-height: 1.3;
}

.love-step__meta--done {
  color: #168B65;
}
</style>
