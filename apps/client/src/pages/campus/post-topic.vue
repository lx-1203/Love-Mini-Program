<script setup lang="ts">
/**
 * 校园话题发布页
 *
 * 功能：
 * - 选择话题分类（6选1）
 * - 标题输入
 * - 内容输入
 * - 匿名开关
 * - 提交按钮
 */
import { ref, computed } from "vue";
import { useCampusStore, CAMPUS_CATEGORY_MAP } from "../../stores/campus";
import type { CampusTopicCategory } from "../../stores/campus";

const campusStore = useCampusStore();

/** 选中的分类 */
const selectedCategory = ref<CampusTopicCategory>("course_exchange");
/** 话题标题 */
const title = ref("");
/** 话题内容 */
const content = ref("");
/** 是否匿名 */
const isAnonymous = ref(false);
/** 是否正在提交 */
const isSubmitting = ref(false);

/** 6个话题分类选项 */
const categoryOptions: { key: CampusTopicCategory; label: string }[] = [
  { key: "course_exchange", label: CAMPUS_CATEGORY_MAP.course_exchange },
  { key: "club_recruitment", label: CAMPUS_CATEGORY_MAP.club_recruitment },
  { key: "campus_activity", label: CAMPUS_CATEGORY_MAP.campus_activity },
  { key: "study_help", label: CAMPUS_CATEGORY_MAP.study_help },
  { key: "life_service", label: CAMPUS_CATEGORY_MAP.life_service },
  { key: "alumni_news", label: CAMPUS_CATEGORY_MAP.alumni_news },
];

/** 最大字数 */
const MAX_LENGTH = 500;

/** 当前字数 */
const currentLength = computed(() => content.value.length);
/** 是否超出字数限制 */
const isOverLimit = computed(() => currentLength.value > MAX_LENGTH);
/** 是否可以提交 */
const canSubmit = computed(
  () => title.value.trim().length > 0 && content.value.trim().length > 0 && !isOverLimit.value && !isSubmitting.value,
);

/**
 * 选择分类
 * @param category - 分类 key
 */
function selectCategory(category: CampusTopicCategory) {
  selectedCategory.value = category;
}

/**
 * 切换匿名
 */
function toggleAnonymous() {
  isAnonymous.value = !isAnonymous.value;
}

/**
 * 发布话题
 */
async function submitTopic() {
  if (!canSubmit.value) return;

  if (!title.value.trim()) {
    uni.showToast({ title: "请输入标题", icon: "none" });
    return;
  }

  if (!content.value.trim()) {
    uni.showToast({ title: "请输入内容", icon: "none" });
    return;
  }

  isSubmitting.value = true;
  try {
    await campusStore.createCampusTopic({
      category: selectedCategory.value,
      title: title.value.trim(),
      content: content.value.trim(),
      isAnonymous: isAnonymous.value,
    });

    uni.showToast({ title: "发布成功", icon: "success" });
    setTimeout(() => {
      uni.navigateBack();
    }, 800);
  } catch {
    uni.showToast({
      title: campusStore.errorMessage || "发布失败",
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
</script>

<template>
  <view class="post-page">
    <!-- 顶部导航栏 -->
    <view class="post-header">
      <view class="post-header__back" @tap="goBack">
        <text class="back-icon">取消</text>
      </view>
      <text class="post-header__title">发布话题</text>
      <view
        class="post-header__submit"
        :class="{ 'post-header__submit--disabled': !canSubmit }"
        @tap="submitTopic"
      >
        <text class="submit-text">{{ isSubmitting ? "发布中" : "发布" }}</text>
      </view>
    </view>

    <!-- 选择分类 -->
    <view class="category-section">
      <text class="section-label">选择分类</text>
      <view class="category-grid">
        <view
          v-for="cat in categoryOptions"
          :key="cat.key"
          class="category-option"
          :class="{ 'category-option--selected': selectedCategory === cat.key }"
          @tap="selectCategory(cat.key)"
        >
          <text class="category-option__text">{{ cat.label }}</text>
        </view>
      </view>
    </view>

    <!-- 标题输入 -->
    <view class="title-section">
      <text class="section-label">话题标题</text>
      <input
        v-model="title"
        class="title-input"
        placeholder="输入一个吸引人的标题"
        maxlength="50"
      />
    </view>

    <!-- 内容输入区 -->
    <view class="content-section">
      <text class="section-label">话题内容</text>
      <textarea
        v-model="content"
        class="content-input"
        placeholder="分享你的想法、经验或求助..."
        :maxlength="MAX_LENGTH"
        :show-confirm-bar="false"
      />
      <view class="content-count" :class="{ 'content-count--over': isOverLimit }">
        <text>{{ currentLength }}/{{ MAX_LENGTH }}</text>
      </view>
    </view>

    <!-- 匿名开关 -->
    <view class="options-section">
      <view class="option-row">
        <view class="option-info">
          <text class="option-label">匿名发布</text>
          <text class="option-desc">开启后，你的信息将显示为"匿名校友"</text>
        </view>
        <switch
          :checked="isAnonymous"
          color="var(--td-brand-color-7)"
          @change="toggleAnonymous"
        />
      </view>
    </view>

    <!-- 底部提交按钮（移动端可见，防止内容过长时找不到顶部按钮） -->
    <view class="bottom-submit">
      <view
        class="bottom-submit__btn"
        :class="{ 'bottom-submit__btn--disabled': !canSubmit }"
        @tap="submitTopic"
      >
        <text class="bottom-submit__text">{{ isSubmitting ? "发布中..." : "发布话题" }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.post-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--td-bg-app-page);
}

/* ========== 顶部导航栏 ========== */
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 20rpx;
  background: var(--td-bg-color-container);
  border-bottom: 1rpx solid var(--td-border-level-1-color);
}

.post-header__back {
  padding: 8rpx 0;
  min-width: 80rpx;
}

.back-icon {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
}

.post-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.post-header__submit {
  padding: 12rpx 32rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  min-width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.post-header__submit--disabled {
  background: var(--td-bg-color-surface);
}

.submit-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
}

.post-header__submit--disabled .submit-text {
  color: var(--td-text-color-placeholder);
}

/* ========== 公共标签 ========== */
.section-label {
  display: block;
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
  margin-bottom: 16rpx;
}

/* ========== 分类选择 ========== */
.category-section {
  padding: 28rpx 32rpx 24rpx;
  background: var(--td-bg-color-container);
  margin-bottom: 16rpx;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
}

.category-option {
  padding: 16rpx 8rpx;
  border-radius: 12rpx;
  background: var(--td-bg-app-page);
  border: 2rpx solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.category-option--selected {
  background: var(--td-brand-color-1);
  border-color: var(--td-brand-color-3);
}

.category-option__text {
  font-size: 26rpx;
  font-weight: 500;
  color: var(--td-text-color-secondary);
  text-align: center;
}

.category-option--selected .category-option__text {
  color: var(--td-brand-color-7);
  font-weight: 600;
}

/* ========== 标题输入 ========== */
.title-section {
  padding: 28rpx 32rpx;
  background: var(--td-bg-color-container);
  margin-bottom: 16rpx;
}

.title-input {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  padding: 12rpx 0;
}

/* ========== 内容输入区 ========== */
.content-section {
  padding: 28rpx 32rpx;
  background: var(--td-bg-color-container);
  margin-bottom: 16rpx;
}

.content-input {
  width: 100%;
  min-height: 200rpx;
  font-size: 30rpx;
  color: var(--td-text-color-primary);
  line-height: 1.7;
  background: transparent;
  padding: 12rpx 0;
}

.content-count {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
}

.content-count--over {
  color: var(--td-error-color);
}

/* ========== 选项区 ========== */
.options-section {
  padding: 28rpx 32rpx;
  background: var(--td-bg-color-container);
  margin-bottom: 24rpx;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
  min-width: 0;
  margin-right: 20rpx;
}

.option-label {
  font-size: 28rpx;
  color: var(--td-text-color-primary);
  font-weight: 500;
}

.option-desc {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 底部提交 ========== */
.bottom-submit {
  padding: 20rpx 32rpx 40rpx;
}

.bottom-submit__btn {
  width: 100%;
  padding: 24rpx 0;
  border-radius: 16rpx;
  background: var(--td-brand-color-7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-submit__btn--disabled {
  background: var(--td-bg-color-surface);
}

.bottom-submit__text {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 600;
}

.bottom-submit__btn--disabled .bottom-submit__text {
  color: var(--td-text-color-placeholder);
}
</style>