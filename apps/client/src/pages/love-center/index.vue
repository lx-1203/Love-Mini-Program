<script setup lang="ts">
/**
 * 恋爱中心 - 恋爱咨询（4 板块）+ 恋爱测试入口
 *
 * Phase Feedback2：首页精简后，恋爱咨询（恋爱咨询/恋爱课程/社交咨询/社交课程）
 * 与恋爱测试（MBTI 等）统一收敛到本页，避免首页功能堆砌。
 *
 * 商业定位：为后续"情感内容付费/课程变现"预留入口位。
 * 当前为占位页：各板块点击后提示内容筹备中，待运营内容接入后替换。
 */
import { useI18n } from "vue-i18n";
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();

/** 恋爱咨询四板块 */
const consultingBoards = [
  { id: "love-consulting", icon: IMAGE_PATHS.ICONS_EMOJI.DOUBLE_HEART, titleKey: "home.loveConsulting", descKey: "home.loveConsultingDesc" },
  { id: "love-course", icon: IMAGE_PATHS.ICONS_EMOJI.BOOK, titleKey: "home.loveCourse", descKey: "home.loveCourseDesc" },
  { id: "social-consulting", icon: IMAGE_PATHS.ICONS_EMOJI.SPEECH, titleKey: "home.socialConsulting", descKey: "home.socialConsultingDesc" },
  { id: "social-course", icon: IMAGE_PATHS.ICONS_EMOJI.GRAD_CAP, titleKey: "home.socialCourse", descKey: "home.socialCourseDesc" },
] as const;

/** 恋爱测试入口 */
const testEntries = [
  { id: "mbti", icon: IMAGE_PATHS.ICONS_EMOJI.PUZZLE, titleKey: "home.mbtiTest" },
] as const;

/** 返回上一页 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: "/pages/home/index" });
  }
}

/** 点击板块：当前为占位提示，运营内容接入后替换为真实跳转 */
function onBoardTap(_boardId: string) {
  lightHaptic();
  uni.showToast({ title: t("home.consultingHint"), icon: "none" });
}

/** 点击测试：MBTI 测试入口（测试内容接入后替换） */
function onTestTap(_testId: string) {
  lightHaptic();
  uni.showToast({ title: t("home.loveTestPlaceholder"), icon: "none" });
}
</script>

<template>
  <view class="love-center page-fade-in">
    <!-- 顶部栏 -->
    <view class="love-center__header">
      <view class="love-center__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="love-center__back-text">‹</text>
      </view>
      <text class="love-center__title">{{ t('home.loveConsulting') }}</text>
      <view class="love-center__header-spacer" />
    </view>

    <!-- 恋爱咨询 4 板块 -->
    <view class="love-center__section">
      <text class="love-center__section-title">{{ t('home.loveConsulting') }}</text>
      <view class="love-center__board-grid">
        <view
          v-for="board in consultingBoards"
          :key="board.id"
          class="love-center__board press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t(board.titleKey)"
          @tap="onBoardTap(board.id)"
        >
          <image class="love-center__board-icon" :src="board.icon" mode="aspectFit" alt="" />
          <text class="love-center__board-title">{{ t(board.titleKey) }}</text>
          <text class="love-center__board-desc">{{ t(board.descKey) }}</text>
        </view>
      </view>
    </view>

    <!-- 恋爱测试 -->
    <view class="love-center__section">
      <text class="love-center__section-title">{{ t('home.loveTestEntry') }}</text>
      <view class="love-center__test-list">
        <view
          v-for="test in testEntries"
          :key="test.id"
          class="love-center__test press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t(test.titleKey)"
          @tap="onTestTap(test.id)"
        >
          <image class="love-center__test-icon" :src="test.icon" mode="aspectFit" alt="" />
          <text class="love-center__test-title">{{ t(test.titleKey) }}</text>
          <text class="love-center__test-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 底部留白 -->
    <view class="love-center__footer-space" />
  </view>
</template>

<style scoped lang="scss">
.love-center {
  min-height: 100vh;
  background: var(--c-bg-page, #f4f6fa);
  padding-bottom: env(safe-area-inset-bottom);
}

.love-center__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--sp-4) + env(safe-area-inset-top)) var(--sp-4) var(--sp-3);
  background: linear-gradient(135deg, var(--c-brand-500, #3fcf8e) 0%, var(--c-brand-400, #6fe0b0) 100%);
}

.love-center__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.2));
}

.love-center__back-text {
  font-size: var(--fs-3xl, 40rpx);
  color: var(--c-text-inverse, #ffffff);
  line-height: 1;
}

.love-center__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.love-center__header-spacer {
  width: 64rpx;
}

.love-center__section {
  margin: var(--sp-5) var(--sp-4);
}

.love-center__section-title {
  display: block;
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  margin-bottom: var(--sp-4);
}

.love-center__board-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-3);
}

.love-center__board {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: var(--sp-5);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.love-center__board-icon {
  width: 56rpx;
  height: 56rpx;
  color: var(--c-brand-500);
}

.love-center__board-title {
  font-size: var(--fs-base, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.love-center__board-desc {
  font-size: var(--fs-xs, 24rpx);
  color: var(--c-text-secondary, #6b7280);
  line-height: 1.5;
}

.love-center__test-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.love-center__test {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.love-center__test-icon {
  width: 48rpx;
  height: 48rpx;
  color: var(--c-brand-500);
}

.love-center__test-title {
  flex: 1;
  font-size: var(--fs-base, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.love-center__test-arrow {
  font-size: var(--fs-2xl, 36rpx);
  color: var(--c-text-tertiary, #9ca3af);
}

.love-center__footer-space {
  height: 120rpx;
}
</style>
