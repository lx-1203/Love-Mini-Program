<script setup lang="ts">
/**
 * MBTI 人格测试（任务 E3）
 *
 * 支持后台配置 H5 URL：onLoad 读取 contentPageUrls.mbtiUrl，
 * 非空则渲染 <web-view>；为空则展示本地示例内容：
 * 1. MBTI 16 型简介（4 维速览 + 16 型名称）；
 * 2. 简化测试（4 道示例题目，单选），提交后 toast 展示结果（如"你的类型：ENFP"）。
 */
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { contentPageUrls } from "../../config/content-pages";
import { IMAGE_PATHS } from "../../config/images";

/** R4-00977: MBTI 结果 toast 展示时长（毫秒）——需用户充分阅读结果文案 */
const MBTI_RESULT_TOAST_MS = 2500;

const { t } = useI18n();

/** 后台配置的 H5 URL（非空时展示 web-view） */
const webUrl = ref("");

/** 返回按钮图标 */
const backIcon = IMAGE_PATHS.ICONS_COMMON.BACK;

onLoad(() => {
  webUrl.value = contentPageUrls.mbtiUrl ?? "";
});

/* ========== MBTI 16 型速览 ========== */

/** 16 型代码列表（名称走 i18n contentPages.mbti.types.<code>） */
const typeCodes = [
  "ENFP", "ENTP", "ENTJ", "ENFJ",
  "INFP", "INTP", "INTJ", "INFJ",
  "ESFP", "ESTP", "ESFJ", "ESTJ",
  "ISFP", "ISTP", "ISFJ", "ISTJ",
] as const;

/** 4 个维度说明（走 i18n） */
const dimensions = [
  { code: "E/I", key: "dimensionEI" },
  { code: "S/N", key: "dimensionSN" },
  { code: "T/F", key: "dimensionTF" },
  { code: "J/P", key: "dimensionJP" },
] as const;

/* ========== 简化测试 ========== */

/** 测试题目：每道题对应一个维度，option 下标映射维度字母（0 → 前一位，1 → 后一位） */
interface MbtiQuestion {
  id: string;
  dimension: "EI" | "SN" | "TF" | "JP";
  textKey: string;
  optionAKey: string;
  optionBKey: string;
}

const questions: MbtiQuestion[] = [
  { id: "q1", dimension: "EI", textKey: "contentPages.mbti.q1.text", optionAKey: "contentPages.mbti.q1.optionA", optionBKey: "contentPages.mbti.q1.optionB" },
  { id: "q2", dimension: "SN", textKey: "contentPages.mbti.q2.text", optionAKey: "contentPages.mbti.q2.optionA", optionBKey: "contentPages.mbti.q2.optionB" },
  { id: "q3", dimension: "TF", textKey: "contentPages.mbti.q3.text", optionAKey: "contentPages.mbti.q3.optionA", optionBKey: "contentPages.mbti.q3.optionB" },
  { id: "q4", dimension: "JP", textKey: "contentPages.mbti.q4.text", optionAKey: "contentPages.mbti.q4.optionA", optionBKey: "contentPages.mbti.q4.optionB" },
];

/** 每题的选项下标（0 = A，1 = B；null = 未作答） */
const answers = ref<Array<number | null>>([null, null, null, null]);

/** 选择答案 */
function selectAnswer(index: number, optionIndex: number) {
  answers.value[index] = optionIndex;
}

/** 计算测试结果并 toast 展示（如"你的类型：ENFP"） */
function submitTest() {
  const unanswered = answers.value.some((a) => a === null);
  if (unanswered) {
    uni.showToast({ title: t("contentPages.mbti.pleaseComplete"), icon: "none" });
    return;
  }
  const letters: string[] = [];
  questions.forEach((q, i) => {
    // 选项下标 0 → 维度前一位字母，1 → 后一位字母
    // charAt 避免 noUncheckedIndexedAccess 下字符串索引返回 string | undefined
    const choice = answers.value[i] as number;
    letters.push(q.dimension.charAt(choice));
  });
  const typeCode = letters.join("");
  uni.showToast({
    title: t("contentPages.mbti.resultToast", { type: typeCode }),
    icon: "none",
    // R4-00977：结果 toast 需较长展示时间（介于 TOAST_DURATION.NORMAL_MS 与 LONG_MS 之间），
    // 保留独立常量便于统一调整
    duration: MBTI_RESULT_TOAST_MS,
  });
}

/** 返回上一页（右上角固定按钮） */
function goBack() {
  uni.navigateBack();
}
</script>

<template>
  <view class="content-page page-fade-in">
    <!-- 后台配置 H5 URL：web-view 加载 -->
    <web-view v-if="webUrl" :src="webUrl" class="content-webview" />

    <!-- 本地示例内容 -->
    <template v-else>
      <view class="content-header">
        <text class="content-header__title">{{ t('contentPages.mbti.title') }}</text>
        <view class="content-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
          <image class="content-header__back-icon" :src="backIcon" mode="aspectFit" alt="" />
        </view>
      </view>

      <scroll-view scroll-y class="content-scroll" :show-scrollbar="false">
        <!-- 16 型简介 -->
        <view class="content-section">
          <text class="content-section__title">{{ t('contentPages.mbti.typesTitle') }}</text>
          <text class="content-section__desc">{{ t('contentPages.mbti.typesDesc') }}</text>

          <!-- 4 维度说明 -->
          <view class="dimension-row">
            <view v-for="dim in dimensions" :key="dim.code" class="dimension-chip">
              <text class="dimension-chip__code">{{ dim.code }}</text>
              <text class="dimension-chip__label">{{ t(`contentPages.mbti.${dim.key}`) }}</text>
            </view>
          </view>

          <!-- 16 型速览网格 -->
          <view class="type-grid" role="list">
            <view
              v-for="code in typeCodes"
              :key="code"
              class="type-cell"
              role="listitem"
            >
              <text class="type-cell__code">{{ code }}</text>
              <text class="type-cell__name">{{ t(`contentPages.mbti.types.${code}`) }}</text>
            </view>
          </view>
        </view>

        <!-- 简化测试 -->
        <view class="content-section">
          <text class="content-section__title">{{ t('contentPages.mbti.testTitle') }}</text>
          <view class="quiz-list">
            <view v-for="(q, index) in questions" :key="q.id" class="quiz-item">
              <text class="quiz-item__question">{{ t(q.textKey) }}</text>
              <view class="quiz-item__options">
                <view
                  class="quiz-option press-feedback"
                  :class="{ 'quiz-option--selected': answers[index] === 0 }"
                  hover-class="press-feedback--active"
                  hover-stay-time="120"
                  role="radio"
                  :aria-checked="answers[index] === 0"
                  :aria-label="t(q.optionAKey)"
                  @tap="selectAnswer(index, 0)"
                >
                  <text class="quiz-option__text">{{ t(q.optionAKey) }}</text>
                </view>
                <view
                  class="quiz-option press-feedback"
                  :class="{ 'quiz-option--selected': answers[index] === 1 }"
                  hover-class="press-feedback--active"
                  hover-stay-time="120"
                  role="radio"
                  :aria-checked="answers[index] === 1"
                  :aria-label="t(q.optionBKey)"
                  @tap="selectAnswer(index, 1)"
                >
                  <text class="quiz-option__text">{{ t(q.optionBKey) }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 提交按钮 -->
          <view class="quiz-submit press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('contentPages.mbti.submit')" @tap="submitTest">
            <text class="quiz-submit__text">{{ t('contentPages.mbti.submit') }}</text>
          </view>
        </view>

        <view class="content-footer-space" />
      </scroll-view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.content-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-bg-page, #f4f6fa);
}

.content-webview {
  flex: 1;
}

/* ========== 顶部栏（标题 + 右上角固定返回按钮） ========== */
.content-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--sp-4) + env(safe-area-inset-top)) var(--sp-4) var(--sp-3);
  background: linear-gradient(135deg, var(--c-brand-500, #3fcf8e) 0%, var(--c-brand-400, #6fe0b0) 100%);
}

.content-header__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.content-header__back {
  position: absolute;
  top: calc(var(--sp-4) + env(safe-area-inset-top));
  right: var(--sp-4);
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.2));
}

.content-header__back-icon {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-inverse, #ffffff);
}

.content-scroll {
  flex: 1;
  height: 0;
}

.content-section {
  margin: var(--sp-5) var(--sp-4);
}

.content-section__title {
  display: block;
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  margin-bottom: var(--sp-2);
}

.content-section__desc {
  display: block;
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #5b6470);
  line-height: 1.6;
  margin-bottom: var(--sp-4);
}

/* ========== 4 维度说明 ========== */
.dimension-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
}

.dimension-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: var(--c-bg-brand, #e8f8f0);
  padding: 6rpx var(--sp-3);
  border-radius: var(--r-full);
}

.dimension-chip__code {
  font-size: var(--fs-base, 24rpx);
  font-weight: 700;
  color: var(--c-brand-700);
}

.dimension-chip__label {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-secondary, #5b6470);
}

/* ========== 16 型速览网格 ========== */
.type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.type-cell {
  width: calc(25% - var(--sp-2) * 3 / 4);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: var(--sp-3) 0;
  border-radius: var(--r-lg, 20rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.type-cell__code {
  font-size: var(--fs-base, 24rpx);
  font-weight: 700;
  color: var(--c-brand-700);
}

.type-cell__name {
  font-size: 18rpx;
  color: var(--c-text-secondary, #5b6470);
  text-align: center;
  line-height: 1.3;
}

/* ========== 简化测试 ========== */
.quiz-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.quiz-item {
  padding: var(--sp-4);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.quiz-item__question {
  display: block;
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary, #1f2937);
  margin-bottom: var(--sp-3);
}

.quiz-item__options {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.quiz-option {
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-lg, 20rpx);
  border: 2rpx solid var(--c-border-light, #eef0f4);
  background: var(--c-bg-surface, #fafbfc);
}

.quiz-option--selected {
  border-color: var(--c-brand-700);
  background: var(--c-bg-brand, #e8f8f0);
}

.quiz-option__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-primary, #1f2937);
}

.quiz-option--selected .quiz-option__text {
  color: var(--c-brand-700);
  font-weight: 600;
}

/* ========== 提交按钮 ========== */
.quiz-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-brand, linear-gradient(135deg, #3fcf8e, #6fe0b0));
  margin-top: var(--sp-4);
}

.quiz-submit__text {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 600;
  color: var(--c-text-inverse, #ffffff);
}

.content-footer-space {
  height: calc(120rpx + env(safe-area-inset-bottom));
}
</style>
