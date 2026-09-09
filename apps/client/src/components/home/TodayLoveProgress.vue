<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import type { LoveProgressStepViewModel } from "../../view-models/home-dashboard";

const { t } = useI18n();

defineProps<{ completed: number; total: number; steps: LoveProgressStepViewModel[] }>();
defineEmits<{ (e: "step", action: string): void }>();

const STEP_META: Record<string, { bg: string; softBg: string; icon: string; iconSrc: string; todo: string }> = {
  profile: { bg: "#36C99A", softBg: "#E8FAF3", icon: IMAGE_PATHS.ICONS_EMOJI.CHECK, iconSrc: IMAGE_PATHS.HOME_ICONS.TASK_PROFILE, todo: "已完成" },
  discover: { bg: "#FF6B81", softBg: "#FFECEF", icon: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, iconSrc: IMAGE_PATHS.HOME_ICONS.TASK_DISCOVER, todo: "进行中" },
  whisper: { bg: "#FF9F43", softBg: "#FFF5E6", icon: IMAGE_PATHS.ICONS_EMOJI.SMILE, iconSrc: IMAGE_PATHS.HOME_ICONS.TASK_WHISPER, todo: "待开始" },
  interest: { bg: "#A29BFE", softBg: "#F0EEFF", icon: IMAGE_PATHS.ICONS_EMOJI.STAR, iconSrc: IMAGE_PATHS.HOME_ICONS.TASK_INTEREST, todo: "待开始" },
};

function stepMeta(id: string) {
  return STEP_META[id] ?? { bg: "#36C99A", softBg: "#E8FAF3", icon: IMAGE_PATHS.ICONS_EMOJI.HEART_FILLED, iconSrc: "", todo: "未完成" };
}
/**
 * 2026-08-25 P1：步骤名接入 i18n（规格书 3.8）。
 * 优先展示 i18n 步骤名，确保用户看到「完善资料/认识新人/回复悄悄话/参与兴趣互动」，
 * 而非后端可能返回的状态标签（"已完成/待开始"）。
 */
const TITLE_FALLBACK: Record<string, string> = {
  profile: t("home.loveStepProfile"),
  discover: t("home.loveStepDiscover"),
  whisper: t("home.loveStepWhisper"),
  interest: t("home.loveStepInterest"),
};

function stepTitle(step: { id: string; title?: string }): string {
  // 优先 i18n 步骤名（后端 title 可能被状态标签污染）
  const fallback = TITLE_FALLBACK[step.id];
  if (fallback) return fallback;
  return step.title || "任务";
}

/**
 * 2026-09-02 R5/R7：步骤文字说明（描述随状态动态变化）
 * 优先级：
 *   1. 已完成 → i18n Done 文案（鼓励性），即使后端 desc 非空也覆盖（避免后端静态文案与状态不一致）
 *   2. 未完成 → 优先用 view-model 后端 desc（个性化），否则 i18n Desc 文案
 * 这样确保「未完成→待做说明」「已完成→鼓励文案」状态联动真正可见。
 */
function stepDescription(step: LoveProgressStepViewModel): string {
  if (step.completed) {
    return t(`home.loveStep${capitalize(step.id)}Done`);
  }
  if (step.description && step.description.trim().length > 0) {
    return step.description;
  }
  return t(`home.loveStep${capitalize(step.id)}Desc`);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
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
      <view v-for="(step, idx) in steps" :key="step.id" class="love-step" :style="{ background: stepMeta(step.id).softBg }" @tap="$emit('step', step.action)">
        <!-- R21（2026-09-09）：序号圆点改回理想图的语义图标（对勾/爱心/对话/星星），
             完成态显示对勾，未完成显示该步骤的类别图标 -->
        <view class="love-step__index" :style="{ background: stepMeta(step.id).bg }">
          <image
            class="love-step__index-icon"
            :src="step.completed ? IMAGE_PATHS.ICONS_COMMON.CHECK_WHITE_SVG : stepMeta(step.id).iconSrc || stepMeta(step.id).icon"
            mode="aspectFit"
          />
        </view>
        <text class="love-step__title" :style="{ color: stepMeta(step.id).bg }">{{ stepTitle(step) }}</text>
        <text class="love-step__meta" :style="{ color: stepMeta(step.id).bg }">
          {{ step.completed ? '已完成' : stepMeta(step.id).todo }}
        </text>
        <!-- 2026-09-02 R5/R7：每个步骤补充文字说明（描述随状态动态变化）；
             R21：限两行防溢出（此前第 4 卡「参与兴趣互动」被截断成「参与兴趣…」） -->
        <text class="love-step__desc">
          {{ stepDescription(step) }}
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
  gap: 6rpx;
  /* 2026-09-02 R5：去掉固定 height（112rpx 把 desc 裁掉），完全自适应 */
  padding: 16rpx 8rpx;
  border-radius: 24rpx;
  box-sizing: border-box;
  /* 2026-09-02 R5 用户反馈「表签1234看不清」：加内部弹性布局，让 title/meta/desc 都清晰 */
  overflow: visible;
}

.love-step__icon {
  position: relative;  /* 2026-09-02 R5：序号徽章绝对定位 */
  width: 48rpx;
  height: 48rpx;
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

.love-step__icon-img {
  width: 36rpx;
  height: 36rpx;
}

.love-step__title {
  font-size: 22rpx;
  font-weight: 600;
  text-align: center;
  /* R21：允许换行——「参与兴趣互动」5 字标题此前单行截断成「参与兴趣…」 */
  white-space: normal;
  line-height: 1.25;
  max-width: 100%;
}

.love-step__meta {
  font-size: 20rpx;
  font-weight: 400;
  text-align: center;
}

/* 2026-09-02 R5：步骤文字说明（描述每步具体含义 + 随状态变化） */
.love-step__desc {
  font-size: 18rpx;
  font-weight: 400;
  color: var(--c-text-tertiary, #94a3b8);
  text-align: center;
  line-height: 1.4;
  padding: 0 6rpx;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

/* 2026-09-02 R8：序号作为圆形主体（背景色=步骤色，白色大号数字，完全覆盖圆区，不叠加图标） */
.love-step__index {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 1;
  flex-shrink: 0;
}

.love-step__index-icon {
  width: 30rpx;
  height: 30rpx;
  box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.12);
}
</style>
