<script setup lang="ts">
/**
 * SetupProgress - 引导流程进度条组件（功能5）。
 *
 * 功能：
 * - 横向展示 5 个引导步骤：基本信息 → 校园认证 → 推荐偏好 → 课表导入 → 完成
 * - 顶部显示当前步骤文案（第 n/total 步 + 步骤名称）
 * - 步骤间用连接线连接
 * - 已完成步骤显示对勾（✓）
 * - 当前步骤高亮显示（品牌色 + 脉冲动画）
 * - 未到达步骤灰色显示
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类
 * - 不使用 backdrop-filter
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding
 * - 所有动画内联在 .vue 文件中
 *
 * 错误处理：
 * - currentStep 越界（<1 或 >total）时自动 clamp 到合法范围
 * - currentStep 为非数字时回退到 1
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 组件 props。
 */
const props = withDefaults(defineProps<{
  /** 当前步骤（1-based，1~totalSteps） */
  currentStep: number;
  /** 总步骤数（默认 5） */
  totalSteps?: number;
}>(), {
  totalSteps: 5,
});

const { t } = useI18n();

/**
 * 步骤定义（与 i18n key 对齐）。
 *
 * 顺序固定：基本信息 → 校园认证 → 推荐偏好 → 课表导入 → 完成。
 * 与 subpackages/setup/{profile,campus,recommend-pref,schedule}/index.vue 的跳转链路一致：
 *   profile(1) → campus(2) → recommend-pref(3) → schedule(4) → 完成(5)
 */
const STEP_DEFS = [
  { key: "stepBasicInfo", descKey: "stepBasicInfoDesc" },
  { key: "stepCampus", descKey: "stepCampusDesc" },
  { key: "stepRecommend", descKey: "stepRecommendDesc" },
  { key: "stepSchedule", descKey: "stepScheduleDesc" },
  { key: "stepComplete", descKey: "stepCompleteDesc" },
] as const;

/**
 * 安全的当前步骤（clamp 到 [1, totalSteps]，非数字时回退到 1）。
 */
const safeCurrentStep = computed<number>(() => {
  const raw = Number(props.currentStep);
  if (!Number.isFinite(raw)) return 1;
  const min = 1;
  const max = Math.max(1, props.totalSteps);
  return Math.min(max, Math.max(min, Math.floor(raw)));
});

/**
 * 渲染用步骤列表。
 * 每个步骤附带：序号、i18n key、状态（completed / current / upcoming）。
 */
const renderSteps = computed(() => {
  return STEP_DEFS.map((def, idx) => {
    const stepNo = idx + 1;
    let status: "completed" | "current" | "upcoming";
    if (stepNo < safeCurrentStep.value) {
      status = "completed";
    } else if (stepNo === safeCurrentStep.value) {
      status = "current";
    } else {
      status = "upcoming";
    }
    return {
      stepNo,
      labelKey: def.key,
      descKey: def.descKey,
      status,
    };
  });
});

/**
 * 当前步骤的展示文案：第 n/total 步。
 */
const currentStepText = computed(() => {
  return t("setupProgress.currentStep", {
    n: safeCurrentStep.value,
    total: props.totalSteps,
  });
});

/**
 * 当前步骤的名称。
 */
const currentStepLabel = computed(() => {
  const def = STEP_DEFS[safeCurrentStep.value - 1];
  return def ? t(`setupProgress.${def.key}`) : "";
});
</script>

<template>
  <view class="setup-progress">
    <!-- 顶部当前步骤文案 -->
    <view class="setup-progress__header">
      <text class="setup-progress__current">{{ currentStepText }}</text>
      <text class="setup-progress__label">{{ currentStepLabel }}</text>
    </view>

    <!-- 步骤条 -->
    <view class="setup-progress__bar">
      <view
        v-for="(step, idx) in renderSteps" :key="`step-${step.stepNo}`"
        class="setup-progress__step-wrap"
      >
        <!-- 步骤圆点 -->
        <view
          class="setup-progress__dot"
          :class="[
            `setup-progress__dot--${step.status}`,
          ]"
        >
          <!-- 已完成：显示对勾 -->
          <text v-if="step.status === 'completed'" class="setup-progress__check">✓</text>
          <!-- 当前/未到达：显示步骤序号 -->
          <text v-else class="setup-progress__num">{{ step.stepNo }}</text>
        </view>

        <!-- 连接线（最后一个步骤不显示） -->
        <view
          v-if="idx < renderSteps.length - 1"
          class="setup-progress__line"
          :class="{
            'setup-progress__line--completed': step.status === 'completed',
          }"
        />
      </view>
    </view>

    <!-- 步骤名称行（每个步骤下方显示名称） -->
    <view class="setup-progress__labels">
      <view
        v-for="step in renderSteps" :key="`label-${step.stepNo}`"
        class="setup-progress__label-item"
        :class="[`setup-progress__label-item--${step.status}`]"
      >
        <text class="setup-progress__label-text">{{ t(`setupProgress.${step.labelKey}`) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/**
 * 进度条样式说明：
 * - 使用 flex 横向布局，每个步骤 + 连接线 占等分宽度
 * - 当前步骤圆点使用品牌色 + 脉冲动画
 * - 已完成步骤使用品牌色填充
 * - 未到达步骤使用灰色边框
 */
.setup-progress {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5);
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  box-shadow: var(--s-card-sm);
}

/* ========== 顶部文案 ========== */
.setup-progress__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
}

.setup-progress__current {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.setup-progress__label {
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  font-weight: 700;
}

/* ========== 步骤条 ========== */
.setup-progress__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-2);
}

.setup-progress__step-wrap {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.setup-progress__step-wrap:first-child {
  flex: 0 0 auto;
}

.setup-progress__step-wrap:last-child {
  flex: 0 0 auto;
}

/* 步骤圆点 */
.setup-progress__dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: var(--r-circle, 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2rpx solid var(--c-border-default);
  background: var(--c-bg-surface);
  transition: all var(--d-fade, 300ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 已完成状态：品牌色填充 */
.setup-progress__dot--completed {
  background: var(--c-brand);
  border-color: var(--c-brand);
  box-shadow: var(--s-brand-sm, 0 2rpx 8rpx var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.25)));
}

/* 当前状态：品牌色边框 + 脉冲动画 */
.setup-progress__dot--current {
  background: var(--c-bg-brand);
  border-color: var(--c-brand);
  box-shadow: 0 0 0 6rpx var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.18));
  animation: setup-progress-pulse var(--d-particle, 1600ms) ease-in-out infinite;
}

@keyframes setup-progress-pulse {
  0%, 100% {
    box-shadow: 0 0 0 6rpx var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.18));
  }
  50% {
    box-shadow: 0 0 0 12rpx var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.08));
  }
}

/* 未到达状态：灰色 */
.setup-progress__dot--upcoming {
  background: var(--c-bg-surface);
  border-color: var(--c-border-default);
}

.setup-progress__check {
  font-size: var(--fs-md);
  color: var(--c-text-inverse);
  font-weight: 700;
  line-height: 1;
}

.setup-progress__num {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 600;
}

.setup-progress__dot--current .setup-progress__num {
  color: var(--c-brand-700);
}

/* 连接线 */
.setup-progress__line {
  flex: 1;
  height: 4rpx;
  background: var(--c-border-default);
  margin: 0 var(--sp-1);
  border-radius: var(--r-xs, 2rpx);
  transition: background var(--d-fade, 300ms) ease;
  min-width: 24rpx;
}

.setup-progress__line--completed {
  background: var(--c-brand);
}

/* ========== 步骤名称行 ========== */
.setup-progress__labels {
  display: flex;
  justify-content: space-between;
  padding: 0 var(--sp-1);
}

.setup-progress__label-item {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.setup-progress__label-item:first-child {
  text-align: left;
}

.setup-progress__label-item:last-child {
  text-align: right;
}

.setup-progress__label-text {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.setup-progress__label-item--completed .setup-progress__label-text {
  color: var(--c-brand-700);
  font-weight: 600;
}

.setup-progress__label-item--current .setup-progress__label-text {
  color: var(--c-text-primary);
  font-weight: 700;
}
</style>
