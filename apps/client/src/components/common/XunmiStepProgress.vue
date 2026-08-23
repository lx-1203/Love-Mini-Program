<script setup lang="ts">
/**
 * XunmiStepProgress — 步骤进度组件
 * 用于今日恋爱进度四步卡片
 */
import { computed } from 'vue';

interface StepItem {
  id: string;
  icon: string;
  label: string;
  status: 'done' | 'active' | 'todo';
}

const props = withDefaults(defineProps<{
  steps?: StepItem[];
}>(), {
  steps: () => [],
});

const STEP_COLORS: Record<string, { bg: string; color: string; iconBg: string }> = {
  done:    { bg: '#E8FAF3', color: '#36C99A', iconBg: '#36C99A' },
  active:  { bg: '#FFECEF', color: '#FF6B81', iconBg: '#FF6B81' },
  todo:    { bg: '#EEF2F0', color: '#9AA39F', iconBg: '#9AA39F' },
};

function stepStyle(status: string) {
  const c = STEP_COLORS[status] ?? STEP_COLORS.todo;
  return { background: c?.bg ?? '#EEF2F0', color: c?.color ?? '#9AA39F' };
}

function iconBg(status: string) {
  return STEP_COLORS[status]?.iconBg ?? STEP_COLORS.todo?.iconBg ?? '#9AA39F';
}

const doneCount = computed(() => props.steps.filter(s => s.status === 'done').length);
</script>

<template>
  <view class="step-progress">
    <view class="step-progress__header">
      <text class="step-progress__title">今日恋爱进度</text>
      <text class="step-progress__count">{{ doneCount }}/{{ steps.length }}项完成</text>
    </view>
    <view class="step-progress__bar">
      <view class="step-progress__bar-fill" :style="{ width: (doneCount / Math.max(steps.length, 1) * 100) + '%' }" />
    </view>
    <view class="step-progress__steps">
      <view
        v-for="step in steps"
        :key="step.id"
        class="step-progress__step"
        :style="stepStyle(step.status)"
      >
        <view class="step-progress__step-icon" :style="{ background: iconBg(step.status) }">
          <text class="step-progress__step-icon-text">{{ step.icon }}</text>
        </view>
        <text class="step-progress__step-label" :style="{ color: stepStyle(step.status).color }">{{ step.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.step-progress {
  padding: 24rpx;
  background: #FFFFFF;
  border-radius: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.step-progress__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.step-progress__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333A37;
}

.step-progress__count {
  font-size: 28rpx;
  color: #9AA39F;
}

.step-progress__bar {
  height: 12rpx;
  background: #EEF2F0;
  border-radius: 999rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
}

.step-progress__bar-fill {
  height: 100%;
  background: linear-gradient(135deg, #36C99A, #55D5A7);
  border-radius: 999rpx;
  transition: width 0.3s ease;
}

.step-progress__steps {
  display: flex;
  gap: 16rpx;
}

.step-progress__step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 8rpx;
  border-radius: 24rpx;
}

.step-progress__step-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-progress__step-icon-text {
  font-size: 20rpx;
  color: #FFFFFF;
}

.step-progress__step-label {
  font-size: 20rpx;
  font-weight: 500;
  text-align: center;
}
</style>
