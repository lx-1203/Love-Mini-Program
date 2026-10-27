<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import type { LoveProgressStepViewModel } from "../../view-models/home-dashboard";

const { t } = useI18n();

const props = defineProps<{ completed: number; total: number; steps: LoveProgressStepViewModel[] }>();
defineEmits<{ (e: "step", action: string): void }>();

/**
 * R11-L01-D17（文案 P0）：卡头计数与四格「已完成」原来取同一 feed 的两个字段
 * （props.completed / steps[].completed），无人对齐，帧上出现 1/4 对上两格已完成。
 * 四格才是用户眼前的事实，计数与进度条一律按四格现算；props.completed 不再作分母来源。
 */
const completedCount = computed(() => props.steps.filter((s) => s.completed).length);

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
      <text class="love-progress__count">{{ completedCount }}/{{ total }}项完成</text>
    </view>
    <view class="love-progress__bar">
      <view class="love-progress__bar-fill" :style="{ width: total > 0 ? ((completedCount / total) * 100) + '%' : '0%' }"></view>
    </view>
    <view class="love-progress__steps">
      <view v-for="step in steps" :key="step.id" class="love-step" :style="{ background: stepMeta(step.id).softBg }" @tap="$emit('step', step.action)">
        <!-- 2026-10-26 对齐理想图（首页.png 步骤行）：四步恒显语义图标（盾形勾/心形/对话气泡/星形），
             不再因完成态切换成白色对勾（状态图形）——完成态语义由下方「已完成」文案与顶部进度条表达 -->
        <view class="love-step__index" :style="{ background: stepMeta(step.id).bg }">
          <image
            class="love-step__index-icon"
            :src="stepMeta(step.id).iconSrc || stepMeta(step.id).icon"
            mode="aspectFit"
          />
        </view>
        <text class="love-step__title" :style="{ color: stepMeta(step.id).bg }">{{ stepTitle(step) }}</text>
        <text class="love-step__meta" :style="{ color: stepMeta(step.id).bg }">
          {{ step.completed ? '已完成' : stepMeta(step.id).todo }}
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.love-progress {
  margin: 0 var(--page-padding) 20rpx;
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
  /* R11-L01-D18（字号 P2）：字号/色值归口令牌，不再裸写 rpx/hex */
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 600;
  color: var(--c-text-primary, #1A1E1C);
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
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-quaternary, #9AA39F);
}

.love-progress__count {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-brand, #36C99A);
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

/* R2b-L01-D15：格与格之间留出理想图那种色块缝隙（16→20rpx，取 --sp-5 token） */
.love-progress__steps {
  display: flex;
  gap: var(--sp-5, 20rpx);
  margin-top: 32rpx;
}

.love-step {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* R2b-L01-D15：内部 gap 6→12（--spacing-md）、padding 16rpx 8rpx→24rpx 16rpx
     （--spacing-lg / --spacing-base），图标与标题间留白对齐理想图 */
  gap: var(--spacing-md, 12rpx);
  /* 2026-09-02 R5：去掉固定 height（112rpx 把 desc 裁掉），完全自适应 */
  padding: var(--spacing-lg, 24rpx) var(--spacing-base, 16rpx);
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
  /* R11-L01-D18（字号 P2）：22rpx(≈11px) 落到 §1.3 极小档，归口 --fs-md(26rpx≈13px) */
  font-size: var(--fs-md, 26rpx);
  font-weight: 600;
  text-align: center;
  /* R21：允许换行——「参与兴趣互动」5 字标题此前单行截断成「参与兴趣…」 */
  white-space: normal;
  line-height: 1.25;
  max-width: 100%;
}

.love-step__meta {
  /* R11-L01-D18（字号 P2）：20rpx(≈10px) → --fs-sm(22rpx≈11px) */
  font-size: var(--fs-sm, 22rpx);
  font-weight: 400;
  text-align: center;
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
