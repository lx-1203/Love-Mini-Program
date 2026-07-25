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
 * - 功能4：集成 TopicSelector 话题选择器（带搜索 + 自定义创建，最多 3 个）
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（hover-class 替代）
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding
 */
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useCampusStore, CAMPUS_CATEGORY_MAP } from "../../stores/campus";
import type { CampusTopicCategory } from "../../stores/campus";
// 功能4：帖子创建话题选择器（带搜索 + 自定义创建）
import TopicSelector from "../../components/village/TopicSelector.vue";

const campusStore = useCampusStore();

const pageVisible = ref(false);
onShow(() => {
  pageVisible.value = false;
  setTimeout(() => {
    pageVisible.value = true;
  }, 30);
});

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

/**
 * 功能4：TopicSelector 已选话题列表（不含 # 前缀）。
 * 由 TopicSelector 组件通过 v-model 双向绑定。
 * 提交时附加到内容末尾作为 #话题 标签（后端 createCampusTopic 暂未支持 tags 字段，
 * 采用内容追加方式保留现有 API 不变）。
 */
const selectedTopics = ref<string[]>([]);

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
 *
 * 功能4：若用户选择了话题标签，将其以 #话题 格式追加到内容末尾，
 * 保留 createCampusTopic 现有 API 签名不变（不引入 tags 字段）。
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
    // 功能4：拼接最终内容（如有话题标签则追加到末尾）
    const trimmedContent = content.value.trim();
    const topics = selectedTopics.value.map((name) => `#${name}`).join(" ");
    const finalContent = topics ? `${trimmedContent}\n\n${topics}` : trimmedContent;

    await campusStore.createCampusTopic({
      category: selectedCategory.value,
      title: title.value.trim(),
      content: finalContent,
      isAnonymous: isAnonymous.value,
    });

    uni.showToast({ title: "发布成功", icon: "success" });
    setTimeout(() => {
      uni.navigateBack();
    }, 800);
  } catch (_e) {
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
  <view class="post-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航栏 -->
    <view class="post-header">
      <view class="post-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">取消</text>
      </view>
      <text class="post-header__title">发布话题</text>
      <view
        class="post-header__submit press-feedback"
        :class="{ 'post-header__submit--disabled': !canSubmit }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="submitTopic"
      >
        <text class="submit-text">{{ isSubmitting ? "发布中" : "发布" }}</text>
      </view>
    </view>

    <scroll-view class="post-body" scroll-y>
      <!-- 选择分类 -->
      <view class="category-section">
        <text class="section-label">选择分类</text>
        <view class="category-list">
          <view class="category-row">
            <view
              v-for="(cat, idx) in categoryOptions.slice(0, 3)"
              :key="cat.key"
              class="category-option"
              :class="{ 'category-option--selected': selectedCategory === cat.key }"
              @tap="selectCategory(cat.key)"
            >
              <text class="category-option__text">{{ cat.label }}</text>
            </view>
          </view>
          <view class="category-row">
            <view
              v-for="(cat, idx) in categoryOptions.slice(3, 6)"
              :key="cat.key"
              class="category-option"
              :class="{ 'category-option--selected': selectedCategory === cat.key }"
              @tap="selectCategory(cat.key)"
            >
              <text class="category-option__text">{{ cat.label }}</text>
            </view>
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

      <!-- 功能4：帖子创建话题选择器（带搜索 + 自定义创建） -->
      <view class="topic-selector-section">
        <TopicSelector v-model="selectedTopics" />
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
            color="#3FCF8E"
            @change="toggleAnonymous"
          />
        </view>
      </view>

      <!-- 底部提交按钮（移动端可见，防止内容过长时找不到顶部按钮） -->
      <view class="bottom-submit">
        <view
          class="bottom-submit__btn press-feedback"
          :class="{ 'bottom-submit__btn--disabled': !canSubmit }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="submitTopic"
        >
          <text class="bottom-submit__text">{{ isSubmitting ? "发布中..." : "发布话题" }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand, #3FCF8E);
$green-light: var(--c-brand-50, #E8F8F0);
$pink-primary: var(--c-romance-500, #EC4899);
$pink-light: var(--c-romance-50, #FFF5F7);
$white: var(--c-neutral-0, #FFFFFF);
$bg-page: var(--c-bg-page, #F4F6FA);
$text-primary: var(--c-text-primary, #1F2329);
$text-secondary: var(--c-neutral-500, #64748B);
$text-tertiary: var(--c-text-tertiary, #9AA1AB);
$border-light: var(--c-neutral-200, #E2E8F0);
$error: var(--c-error, #EF4444);
$card-soft-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));

.post-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: linear-gradient(180deg, var(--c-bg-brand, #E8F8F0) 0%, var(--c-bg-page, #F4F6FA) 20%);
}

/* ========== 顶部导航栏 ========== */
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 24rpx;
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-300, #7CD9A6) 60%, var(--c-romance-300, #F9A8C4) 100%);
}

.post-header__back {
  padding: 12rpx 20rpx;
  border-radius: 999px;
  background: var(--c-overlay-white-bg-mid-strong, var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.25)));
  transition: all 0.15s ease;
}

/* #ifdef H5 */
.post-header__back:active {
  transform: scale(0.96);
  background: var(--c-overlay-white-bg-stronger, var(--c-overlay-white-bg-stronger, rgba(255, 255, 255, 0.4)));
}
/* #endif */

.back-icon {
  font-size: 28rpx;
  color: var(--c-text-inverse, #FFFFFF);
  font-weight: 500;
}

.post-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

.post-header__submit {
  padding: 14rpx 32rpx;
  border-radius: 999px;
  background: var(--c-overlay-bg-pure, var(--c-overlay-bg-pure, rgba(255, 255, 255, 0.95)));
  min-width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  box-shadow: 0 4rpx 12rpx var(--c-black-shadow-md, var(--c-black-shadow-md, rgba(0, 0, 0, 0.1)));
}

/* #ifdef H5 */
.post-header__submit:active {
  transform: scale(0.96);
}
/* #endif */

.post-header__submit--disabled {
  background: var(--c-overlay-white-bg-stronger, var(--c-overlay-white-bg-stronger, rgba(255, 255, 255, 0.4)));
  box-shadow: none;
}

.submit-text {
  font-size: 26rpx;
  color: $green-primary;
  font-weight: 600;
}

.post-header__submit--disabled .submit-text {
  color: var(--c-overlay-white-text-strong, var(--c-overlay-white-text-strong, rgba(255, 255, 255, 0.8)));
}

.post-body {
  flex: 1;
  padding: 24rpx;
}

/* ========== 公共标签 ========== */
.section-label {
  display: block;
  font-size: 26rpx;
  color: $text-tertiary;
  margin-bottom: 16rpx;
  font-weight: 500;
}

/* ========== 分类选择 ========== */
.category-section {
  padding: 28rpx;
  background: $white;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.category-row {
  display: flex;
  gap: 14rpx;
}

.category-option {
  flex: 1;
  padding: 20rpx 8rpx;
  border-radius: 16rpx;
  background: $bg-page;
  border: 2rpx solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

/* #ifdef H5 */
.category-option:active {
  transform: scale(0.96);
}
/* #endif */

.category-option--selected {
  background: linear-gradient(135deg, $green-light, var(--c-tint-green-50, #F0FDF8));
  border-color: $green-primary;
  box-shadow: 0 4rpx 12rpx var(--c-brand-shadow-tint, var(--c-brand-shadow-tint, rgba(63, 207, 142, 0.15)));
}

.category-option__text {
  font-size: 26rpx;
  font-weight: 500;
  color: $text-secondary;
  text-align: center;
}

.category-option--selected .category-option__text {
  color: $green-primary;
  font-weight: 600;
}

/* ========== 标题输入 ========== */
.title-section {
  padding: 28rpx;
  background: $white;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.title-input {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: $bg-page;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}

.title-input:focus {
  border-color: $green-primary;
  background: $white;
}

/* ========== 内容输入区 ========== */
.content-section {
  padding: 28rpx;
  background: $white;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.content-input {
  width: 100%;
  min-height: 240rpx;
  font-size: 30rpx;
  color: $text-primary;
  line-height: 1.7;
  background: $bg-page;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.content-input:focus {
  border-color: $green-primary;
  background: $white;
}

.content-count {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $text-tertiary;
}

.content-count--over {
  color: $error;
}

/* ========== 选项区 ========== */
.options-section {
  padding: 28rpx;
  background: $white;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: $card-soft-shadow;
}

/* 功能4：话题选择器容器 */
.topic-selector-section {
  padding: 28rpx;
  background: $white;
  border-radius: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
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
  color: $text-primary;
  font-weight: 500;
}

.option-desc {
  font-size: 22rpx;
  color: $text-tertiary;
}

/* ========== 底部提交 ========== */
.bottom-submit {
  padding: 20rpx 0 40rpx;
}

.bottom-submit__btn {
  width: 100%;
  padding: 28rpx 0;
  border-radius: 24rpx;
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300, #5ADBA0));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx var(--c-brand-shadow-tint-strong, var(--c-brand-shadow-tint-strong, rgba(63, 207, 142, 0.35)));
  transition: all 0.15s ease;
}

/* #ifdef H5 */
.bottom-submit__btn:active {
  transform: scale(0.96);
  box-shadow: 0 4rpx 12rpx var(--c-brand-shadow-tint-mid, var(--c-brand-shadow-tint-mid, rgba(63, 207, 142, 0.25)));
}
/* #endif */

.bottom-submit__btn--disabled {
  background: $border-light;
  box-shadow: none;
}

.bottom-submit__text {
  font-size: 30rpx;
  color: var(--c-text-inverse, #FFFFFF);
  font-weight: 600;
}

.bottom-submit__btn--disabled .bottom-submit__text {
  color: $text-tertiary;
}
</style>
