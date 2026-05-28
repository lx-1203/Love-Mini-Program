<script setup lang="ts">
/**
 * 每日一问页面
 * 展示今日问题，支持回答提交和查看其他人的回答
 */
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useDailyQuestionStore, formatAnswerTime } from "../../stores/daily-question";
import { useCheckInStore } from "../../stores/checkin";

const dailyQuestionStore = useDailyQuestionStore();
const checkInStore = useCheckInStore();
const { todayQuestion, answers, hasAnswered, loading } = storeToRefs(dailyQuestionStore);

/** 回答内容 */
const answerContent = ref("");
/** 是否匿名 */
const isAnonymous = ref(false);
/** 是否正在提交 */
const isSubmitting = ref(false);

/**
 * 提交回答
 */
async function submitAnswer() {
  if (!todayQuestion.value || !answerContent.value.trim()) return;

  isSubmitting.value = true;
  try {
    await dailyQuestionStore.submitAnswer(
      todayQuestion.value.id,
      answerContent.value.trim(),
      isAnonymous.value
    );
    answerContent.value = "";
    uni.showToast({ title: "回答成功", icon: "success" });
  } catch {
    uni.showToast({
      title: dailyQuestionStore.errorMessage || "回答失败",
      icon: "none",
    });
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * 返回上一页
 */
function goBack() {
  uni.navigateBack();
}

onMounted(async () => {
  await dailyQuestionStore.fetchTodayQuestion();
  if (todayQuestion.value) {
    void dailyQuestionStore.fetchAnswers(todayQuestion.value.id, 1);
  }
});
</script>

<template>
  <view class="daily-question-page">
    <!-- 顶部导航栏 -->
    <view class="dq-header">
      <view class="dq-header__back" @tap="goBack">
        <text class="back-icon">返回</text>
      </view>
      <text class="dq-header__title">每日一问</text>
      <view class="dq-header__spacer" />
    </view>

    <scroll-view class="dq-body" scroll-y>
      <!-- 未签到提示 -->
      <view v-if="!checkInStore.checkedIn" class="lock-card">
        <text class="lock-card__icon">🔒</text>
        <text class="lock-card__title">签到后解锁</text>
        <text class="lock-card__desc">完成今日签到即可参与每日一问</text>
      </view>

      <!-- 已签到：显示问题内容 -->
      <template v-else>
        <!-- 加载状态 -->
        <view v-if="loading && !todayQuestion" class="dq-state">
          <view class="loading-spinner" />
          <text class="dq-state__text">正在加载...</text>
        </view>

        <!-- 问题卡片 -->
        <view v-if="todayQuestion" class="question-card">
          <view class="question-card__badge">
            <text class="question-card__badge-text">今日话题</text>
          </view>
          <text class="question-card__text">{{ todayQuestion.question }}</text>
          <text class="question-card__date">{{ todayQuestion.date }}</text>
        </view>

        <!-- 回答区域：未回答时显示输入框 -->
        <view v-if="!hasAnswered && todayQuestion" class="answer-section">
          <text class="answer-section__title">写下你的回答</text>
          <textarea
            v-model="answerContent"
            class="answer-input"
            placeholder="分享你的想法..."
            maxlength="500"
            :show-confirm-bar="false"
          />
          <view class="answer-actions">
            <view class="anonymous-toggle" @tap="isAnonymous = !isAnonymous">
              <view class="anonymous-toggle__check" :class="{ 'anonymous-toggle__check--active': isAnonymous }">
                <text v-if="isAnonymous" class="check-mark">✓</text>
              </view>
              <text class="anonymous-toggle__label">匿名回答</text>
            </view>
            <view
              class="submit-btn"
              :class="{ 'submit-btn--disabled': !answerContent.trim() || isSubmitting }"
              @tap="submitAnswer"
            >
              <text class="submit-btn__text">{{ isSubmitting ? "提交中..." : "提交回答" }}</text>
            </view>
          </view>
        </view>

        <!-- 已回答提示 -->
        <view v-if="hasAnswered" class="answered-hint">
          <text class="answered-hint__icon">✅</text>
          <text class="answered-hint__text">你已回答今日问题</text>
        </view>

        <!-- 回答列表 -->
        <view v-if="answers.length > 0" class="answers-list">
          <view class="answers-list__header">
            <text class="answers-list__title">大家的回答</text>
            <text class="answers-list__count">{{ answers.length }}</text>
          </view>

          <view
            v-for="answer in answers"
            :key="answer.id"
            class="answer-card"
          >
            <view class="answer-card__header">
              <view class="answer-card__avatar">
                <image
                  v-if="answer.authorAvatar"
                  class="answer-card__avatar-img"
                  :src="answer.authorAvatar"
                  mode="aspectFill"
                />
                <text v-else class="answer-card__avatar-char">
                  {{ answer.isAnonymous ? "?" : answer.authorName[0] }}
                </text>
              </view>
              <view class="answer-card__info">
                <text class="answer-card__name">
                  {{ answer.isAnonymous ? "匿名用户" : answer.authorName }}
                </text>
                <text class="answer-card__time">{{ formatAnswerTime(answer.createdAt) }}</text>
              </view>
            </view>
            <text class="answer-card__content">{{ answer.content }}</text>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else-if="!loading && hasAnswered" class="answers-empty">
          <text class="answers-empty__text">还没有其他人回答，快来看看吧</text>
        </view>
      </template>

      <!-- 底部留白 -->
      <view class="body-footer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.daily-question-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
}

/* ========== 顶部导航栏 ========== */
.dq-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: var(--td-bg-color-container);
  border-bottom: 1rpx solid var(--td-border-level-1-color);
  z-index: 10;
}

.dq-header__back {
  padding: 8rpx 0;
  min-width: 80rpx;
}

.back-icon {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
}

.dq-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.dq-header__spacer {
  min-width: 80rpx;
}

/* ========== 内容区 ========== */
.dq-body {
  flex: 1;
  overflow-y: auto;
}

.dq-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 120rpx 40rpx;
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid var(--td-border-level-1-color);
  border-top-color: var(--td-brand-color-7);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.dq-state__text {
  font-size: 28rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 未签到锁定 ========== */
.lock-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin: 80rpx 32rpx;
  padding: 60rpx 40rpx;
  background: var(--td-bg-color-container);
  border-radius: 24rpx;
  box-shadow: var(--td-shadow-1);
}

.lock-card__icon {
  font-size: 80rpx;
}

.lock-card__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.lock-card__desc {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 问题卡片 ========== */
.question-card {
  margin: 24rpx 32rpx;
  padding: 32rpx;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
  border: 1rpx solid rgba(102, 126, 234, 0.15);
  border-radius: 24rpx;
}

.question-card__badge {
  display: inline-flex;
  padding: 6rpx 16rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  margin-bottom: 20rpx;
}

.question-card__badge-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 600;
}

.question-card__text {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.question-card__date {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 回答区域 ========== */
.answer-section {
  margin: 0 32rpx 24rpx;
  padding: 28rpx;
  background: var(--td-bg-color-container);
  border-radius: 20rpx;
  box-shadow: var(--td-shadow-1);
}

.answer-section__title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin-bottom: 16rpx;
}

.answer-input {
  width: 100%;
  min-height: 180rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: var(--td-bg-app-page);
  font-size: 28rpx;
  color: var(--td-text-color-primary);
  line-height: 1.6;
  box-sizing: border-box;
  margin-bottom: 20rpx;
}

.answer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.anonymous-toggle {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.anonymous-toggle__check {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  border: 2rpx solid var(--td-border-level-2-color);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 160ms ease;
}

.anonymous-toggle__check--active {
  background: var(--td-brand-color-7);
  border-color: var(--td-brand-color-7);
}

.check-mark {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 700;
}

.anonymous-toggle__label {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
}

.submit-btn {
  padding: 16rpx 40rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
}

.submit-btn--disabled {
  background: var(--td-bg-color-component-disabled);
  pointer-events: none;
}

.submit-btn__text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
}

.submit-btn--disabled .submit-btn__text {
  color: var(--td-text-color-disabled);
}

/* ========== 已回答提示 ========== */
.answered-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin: 0 32rpx 24rpx;
  padding: 20rpx;
  background: rgba(34, 197, 94, 0.06);
  border: 1rpx solid rgba(34, 197, 94, 0.15);
  border-radius: 16rpx;
}

.answered-hint__icon {
  font-size: 28rpx;
}

.answered-hint__text {
  font-size: 26rpx;
  color: #16a34a;
  font-weight: 500;
}

/* ========== 回答列表 ========== */
.answers-list {
  margin: 0 32rpx;
}

.answers-list__header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.answers-list__title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.answers-list__count {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  background: var(--td-bg-app-page);
  padding: 4rpx 16rpx;
  border-radius: 999px;
}

.answer-card {
  padding: 24rpx 28rpx;
  background: var(--td-bg-color-container);
  border-radius: 20rpx;
  box-shadow: var(--td-shadow-1);
  margin-bottom: 16rpx;
}

.answer-card__header {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.answer-card__avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--td-brand-color-2), var(--td-brand-color-3));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.answer-card__avatar-img {
  width: 100%;
  height: 100%;
}

.answer-card__avatar-char {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--td-brand-color-7);
}

.answer-card__info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.answer-card__name {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.answer-card__time {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

.answer-card__content {
  font-size: 28rpx;
  color: var(--td-text-color-primary);
  line-height: 1.7;
}

.answers-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.answers-empty__text {
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
}

.body-footer {
  height: 40rpx;
}
</style>
