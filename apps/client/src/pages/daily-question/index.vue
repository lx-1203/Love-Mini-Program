<script setup lang="ts">
/**
 * 每日一问页面
 * 展示今日问题，支持回答提交和查看其他人的回答
 */
import { ref, onMounted } from "vue";
import { onUnload } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useDailyQuestionStore, formatAnswerTime } from "../../stores/daily-question";
import { useCheckInStore } from "../../stores/checkin";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
import EmptyState from "../../components/common/EmptyState.vue";

const { t } = useI18n();
const dailyQuestionStore = useDailyQuestionStore();
const checkInStore = useCheckInStore();
const { todayQuestion, answers, hasAnswered, loading, answerPage, answerHasMore } = storeToRefs(dailyQuestionStore);

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
    uni.showToast({ title: t("dailyQuestion.answerSuccess"), icon: "success" });
  } catch (_e) {
    uni.showToast({
      title: dailyQuestionStore.errorMessage || t("dailyQuestion.answerFailed"),
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

// R4-00157：页面卸载时清理签到动画定时器等 store 资源
onUnload(() => {
  checkInStore.dispose();
});

/**
 * 重试加载今日问题（review #32：原实现无错误态/重试入口，
 * 请求失败时页面停留在空白加载态）。
 */
async function retryQuestion() {
  await dailyQuestionStore.fetchTodayQuestion();
  if (todayQuestion.value) {
    void dailyQuestionStore.fetchAnswers(todayQuestion.value.id, 1);
  }
}

/**
 * P1-12：回答列表分页加载更多。
 * store 已维护 answerPage / answerHasMore（fetchAnswers 按页追加），
 * 这里仅需推进页码；加载失败由 store 设置 errorMessage，不中断页面。
 */
function loadMoreAnswers(): void {
  if (!todayQuestion.value || !answerHasMore.value || loading.value) return;
  void dailyQuestionStore.fetchAnswers(todayQuestion.value.id, answerPage.value + 1);
}

/** 回答列表滚动到底：触发加载更多（scroll-view 的 scrolltolower） */
function onAnswersScrollLower(): void {
  loadMoreAnswers();
}
</script>

<template>
  <view class="daily-question-page">
    <!-- 顶部导航栏 -->
    <view class="dq-header">
      <view class="dq-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">{{ t("dailyQuestion.back") }}</text>
      </view>
      <text class="dq-header__title">{{ t("dailyQuestion.navTitle") }}</text>
      <view class="dq-header__spacer" />
    </view>

    <scroll-view class="dq-body" scroll-y @scrolltolower="onAnswersScrollLower">
      <!-- 未签到提示 -->
      <view v-if="!checkInStore.checkedIn" class="lock-card">
        <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.CLOSE" custom-class="lock-card__icon" mode="aspectFit" />
        <text class="lock-card__title">{{ t("dailyQuestion.lockTitle") }}</text>
        <text class="lock-card__desc">{{ t("dailyQuestion.lockDesc") }}</text>
      </view>

      <!-- 已签到：显示问题内容 -->
      <template v-else>
        <!-- 加载状态 -->
        <view v-if="loading && !todayQuestion" class="dq-state">
          <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('dailyQuestion.loadingAria')" />
          <text class="dq-state__text">{{ t("dailyQuestion.loadingTextProgress") }}</text>
        </view>

        <!-- 加载失败错误态（review #32：新增错误展示 + 重试入口） -->
        <view v-else-if="dailyQuestionStore.errorMessage && !todayQuestion" class="dq-state">
          <text class="dq-state__text">{{ dailyQuestionStore.errorMessage || t("dailyQuestion.loadFailed") }}</text>
          <view
            class="dq-state__retry press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('dailyQuestion.retryText')"
            @tap="retryQuestion"
          >
            <text class="dq-state__retry-text">{{ t("dailyQuestion.retryText") }}</text>
          </view>
        </view>

        <!-- 问题卡片 -->
        <view v-if="todayQuestion" class="question-card card-base">
          <view class="question-card__badge">
            <text class="question-card__badge-text">{{ t("dailyQuestion.todayTopic") }}</text>
          </view>
          <text class="question-card__text">{{ todayQuestion.question }}</text>
          <text class="question-card__date">{{ todayQuestion.date }}</text>
        </view>

        <!-- 回答区域：未回答时显示输入框 -->
        <view v-if="!hasAnswered && todayQuestion" class="answer-section">
          <text class="answer-section__title">{{ t("dailyQuestion.answerSectionTitle") }}</text>
          <textarea
            v-model="answerContent"
            class="answer-input"
            :placeholder="t('dailyQuestion.inputPlaceholder')"
            maxlength="500"
            :show-confirm-bar="false" :aria-label="t('dailyQuestion.inputPlaceholder')"
          />
          <view class="answer-actions">
            <view class="anonymous-toggle press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="isAnonymous = !isAnonymous">
              <view class="anonymous-toggle__check" :class="{ 'anonymous-toggle__check--active': isAnonymous }">
                <image v-if="isAnonymous" class="check-mark" :src="IMAGE_PATHS.ICONS_COMMON.CHECK_WHITE_SVG" mode="aspectFit" alt="" />
              </view>
              <text class="anonymous-toggle__label">{{ t("dailyQuestion.anonymousLabel") }}</text>
            </view>
            <view
              class="submit-btn press-feedback"
              :class="{ 'submit-btn--disabled': !answerContent.trim() || isSubmitting }"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              @tap="submitAnswer"
            >
              <text class="submit-btn__text">{{ isSubmitting ? t("dailyQuestion.submittingBtn") : t("dailyQuestion.submitBtn") }}</text>
            </view>
          </view>
        </view>

        <!-- 已回答提示 -->
        <view v-if="hasAnswered" class="answered-hint">
          <image class="answered-hint__icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE" mode="aspectFit" alt="" />
          <text class="answered-hint__text">{{ t("dailyQuestion.answeredHint") }}</text>
        </view>

        <!-- 回答列表 -->
        <view v-if="answers.length > 0" class="answers-list" role="list">
          <view class="answers-list__header">
            <text class="answers-list__title">{{ t("dailyQuestion.answersListTitle") }}</text>
            <text class="answers-list__count">{{ answers.length }}</text>
          </view>

          <view
            v-for="answer in answers" :key="answer.id"
            class="answer-card"
          >
            <view class="answer-card__header">
              <view class="answer-card__avatar">
                <image
                  v-if="answer.authorAvatar"
                  class="answer-card__avatar-img"
                  :src="answer.authorAvatar"
                  mode="aspectFill"
                  lazy-load alt=""
                />
                <text v-else class="answer-card__avatar-char">
                  {{ answer.isAnonymous ? "?" : answer.authorName[0] }}
                </text>
              </view>
              <view class="answer-card__info">
                <text class="answer-card__name">
                  {{ answer.isAnonymous ? t("dailyQuestion.anonymousUser") : answer.authorName }}
                </text>
                <text class="answer-card__time">{{ formatAnswerTime(answer.createdAt) }}</text>
              </view>
            </view>
            <text class="answer-card__content">{{ answer.content }}</text>
          </view>

          <!-- P1-12：加载更多按钮（还有更多数据时显示） -->
          <view
            v-if="answerHasMore"
            class="answers-load-more press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('dailyQuestion.loadMore')"
            @tap="loadMoreAnswers"
          >
            <text class="answers-load-more__text">{{ loading ? t("dailyQuestion.loadingMore") : t("dailyQuestion.loadMore") }}</text>
          </view>
          <view v-else-if="answers.length > 0" class="answers-load-more">
            <text class="answers-load-more__text">{{ t("dailyQuestion.noMoreAnswers") }}</text>
          </view>
        </view>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="!loading && hasAnswered"
          type="no-data"
          :title="t('dailyQuestion.emptyTitle')"
          :description="t('dailyQuestion.emptyDesc')"
        />
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
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: var(--c-gradient-page);
}

/* ========== 顶部导航栏 ========== */
.dq-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + var(--sp-6)) var(--sp-8) var(--sp-6);
  background: linear-gradient(135deg, var(--c-brand) 0%, var(--c-brand-300) 60%, var(--c-romance-300) 100%);
  z-index: var(--z-header);
}

.dq-header__back {
  padding: var(--sp-2) 0;
  min-width: 80rpx;
}

/* #ifdef H5 */
.dq-header__back:active {
  opacity: 0.7;
  transform: scale(0.96);
}
/* #endif */

.back-icon {
  font-size: var(--fs-base);
  color: var(--c-text-inverse);
  font-weight: 500;
}

.dq-header__title {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-inverse);
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
  gap: var(--sp-6);
  padding: 120rpx var(--sp-10);
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid var(--c-border-light);
  border-top-color: var(--c-brand);
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dq-state__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

/* review #32：错误态重试按钮 */
.dq-state__retry {
  padding: var(--sp-3) var(--sp-8);
  border-radius: var(--r-full);
  background: var(--c-bg-brand);
}

.dq-state__retry-text {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-brand-700);
}

/* ========== 未签到锁定 ========== */
.lock-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  margin: 80rpx var(--sp-8);
  padding: 60rpx var(--sp-10);
  background: var(--c-bg-container);
  border-radius: var(--r-xxl);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.lock-card__icon {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: var(--sp-3);
  opacity: 0.6;
}

.lock-card__title {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.lock-card__desc {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  text-align: center;
  line-height: 1.6;
}

/* ========== 问题卡片 ========== */
.question-card {
  margin: var(--sp-7) var(--sp-6);
  padding: var(--sp-9);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  border: none;
  border-radius: var(--r-xxl);
  box-shadow: 0 8rpx 32rpx var(--c-brand-shadow-tint, var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.15)));
  position: relative;
  overflow: hidden;
}

.question-card::before {
  content: '';
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 160rpx;
  height: 160rpx;
  background: radial-gradient(circle, var(--c-romance-bg-tint, var(--c-romance-bg-tint, rgba(236, 72, 153, 0.1))) 0%, transparent 70%);
  border-radius: var(--r-circle, 50%);
}

.question-card__badge {
  display: inline-flex;
  padding: var(--sp-2) var(--sp-5);
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  margin-bottom: var(--sp-6);
  box-shadow: var(--s-brand-sm);
}

.question-card__badge-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.question-card__text {
  display: block;
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1.6;
  margin-bottom: var(--sp-5);
  position: relative;
  z-index: 1;
}

.question-card__date {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  font-weight: 500;
}

/* ========== 回答区域 ========== */
.answer-section {
  margin: 0 var(--sp-6) var(--sp-6);
  padding: var(--sp-8);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.answer-section__title {
  display: block;
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-primary);
  margin-bottom: var(--sp-5);
}

.answer-input {
  width: 100%;
  min-height: 200rpx;
  padding: var(--sp-6);
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  line-height: 1.7;
  box-sizing: border-box;
  margin-bottom: var(--sp-6);
  border: 2rpx solid transparent;
}

.answer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.anonymous-toggle {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) 0;
}

/* #ifdef H5 */
.anonymous-toggle:active {
  opacity: 0.7;
}
/* #endif */

.anonymous-toggle__check {
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-md);
  border: 2rpx solid var(--c-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container);
}

.anonymous-toggle__check--active {
  background: var(--c-gradient-float-btn);
  border-color: var(--c-brand);
  box-shadow: var(--s-brand-sm);
}

.check-mark {
  width: 26rpx;
  height: 26rpx;
}

.anonymous-toggle__label {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
}

.submit-btn {
  padding: var(--sp-5) var(--sp-10);
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  box-shadow: var(--s-float-btn);
}

/* #ifdef H5 */
.submit-btn:active {
  transform: scale(0.96);
}
/* #endif */

.submit-btn--disabled {
  background: var(--c-bg-page);
  box-shadow: none;
  pointer-events: none;
}

.submit-btn__text {
  font-size: var(--fs-md);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.submit-btn--disabled .submit-btn__text {
  color: var(--c-text-tertiary);
}

/* ========== 已回答提示 ========== */
.answered-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  margin: 0 var(--sp-6) var(--sp-6);
  padding: var(--sp-6);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-bg-tint, var(--c-brand-bg-tint, rgba(63, 207, 142, 0.08))));
  border: 2rpx solid var(--c-brand-border-tint, var(--c-brand-border-tint, rgba(63, 207, 142, 0.2)));
  border-radius: var(--r-lg);
}

.answered-hint__icon {
  font-size: var(--fs-xl);
}

.answered-hint__text {
  font-size: var(--fs-md);
  color: var(--c-brand);
  font-weight: 600;
}

/* ========== 回答列表 ========== */
.answers-list {
  margin: 0 var(--sp-6);
}

.answers-list__header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
  padding: 0 var(--sp-2);
}

.answers-list__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.answers-list__count {
  font-size: var(--fs-sm);
  color: var(--c-brand);
  background: var(--c-bg-brand);
  padding: var(--sp-1) var(--sp-4);
  border-radius: var(--r-full);
  font-weight: 600;
}

.answer-card {
  padding: var(--sp-7);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  margin-bottom: var(--sp-4);
  border: var(--c-border-card);
}

/* #ifdef H5 */
.answer-card:active {
  transform: scale(0.98);
}
/* #endif */

.answer-card__header {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-bottom: var(--sp-5);
}

.answer-card__avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-brand-100));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 3rpx solid var(--c-bg-brand);
}

.answer-card__avatar-img {
  width: 100%;
  height: 100%;
}

.answer-card__avatar-char {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-brand);
}

.answer-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.answer-card__name {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.answer-card__time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.answer-card__content {
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  line-height: 1.8;
  background: var(--c-bg-page);
  padding: var(--sp-5);
  border-radius: var(--r-md);
}

/* P1-12：加载更多按钮 */
.answers-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-4);
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  margin-top: var(--sp-4);
}

.answers-load-more__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.answers-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  margin-top: var(--sp-5);
}

.answers-empty__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

.body-footer {
  height: 60rpx;
}
</style>
