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
import { ref, computed, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
// 修复 no-duplicate-imports：合并 ../../stores/campus 的重复 import
import { useCampusStore, CAMPUS_CATEGORY_MAP, type CampusTopicCategory } from "../../stores/campus";
// 功能4：帖子创建话题选择器（带搜索 + 自定义创建）
import TopicSelector from "../../components/village/TopicSelector.vue";

const campusStore = useCampusStore();
const { t } = useI18n();

const pageVisible = ref(false);
/**
 * SubTask 1.5.2：页面进入淡入定时器与发布成功跳转定时器，统一保存引用便于卸载清理。
 */
let pageEnterTimer: ReturnType<typeof setTimeout> | null = null;
let postSuccessNavTimer: ReturnType<typeof setTimeout> | null = null;

onShow(() => {
  pageVisible.value = false;
  if (pageEnterTimer) clearTimeout(pageEnterTimer);
  pageEnterTimer = setTimeout(() => {
    pageEnterTimer = null;
    pageVisible.value = true;
  }, 30);
});

/**
 * SubTask 1.5.2：页面卸载时清理所有未触发的定时器，避免在已销毁页面上修改响应式状态或触发导航。
 */
onUnmounted(() => {
  if (pageEnterTimer) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
  }
  if (postSuccessNavTimer) {
    clearTimeout(postSuccessNavTimer);
    postSuccessNavTimer = null;
  }
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
 * switch 品牌色：小程序 switch 的 color 为原生属性，不支持 CSS 变量，
 * 此处取 design token --c-brand 的实际色值（ui-ux B9 修复）。
 */
const brandColor = "#3FCF8E";

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
    uni.showToast({ title: t("campus.postTopic.errTitle"), icon: "none" });
    return;
  }

  if (!content.value.trim()) {
    uni.showToast({ title: t("campus.postTopic.errContent"), icon: "none" });
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

    uni.showToast({ title: t("campus.postTopic.publishSuccess"), icon: "success" });
    // SubTask 1.5.2：保存跳转定时器引用，卸载时统一清理
    if (postSuccessNavTimer) clearTimeout(postSuccessNavTimer);
    postSuccessNavTimer = setTimeout(() => {
      postSuccessNavTimer = null;
      uni.navigateBack();
    }, 800);
  } catch (_e) {
    uni.showToast({
      title: campusStore.errorMessage || t("campus.postTopic.publishFailed"),
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
      <view class="post-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="back-icon">{{ t('campus.postTopic.cancel') }}</text>
      </view>
      <text class="post-header__title">{{ t('campus.postTopic.navTitle') }}</text>
      <view
        class="post-header__submit press-feedback"
        :class="{ 'post-header__submit--disabled': !canSubmit }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="submitTopic"
      >
        <text class="submit-text">{{ isSubmitting ? t('campus.postTopic.submitPublishing') : t('campus.postTopic.submitPublish') }}</text>
      </view>
    </view>

    <scroll-view class="post-body" scroll-y>
      <!-- 选择分类 -->
      <view class="category-section">
        <text class="section-label">{{ t('campus.postTopic.labelCategory') }}</text>
        <view class="category-list" role="list">
          <view class="category-row">
            <view
              v-for="cat in categoryOptions.slice(0, 3)" :key="cat.key"
              class="category-option"
              :class="{ 'category-option--selected': selectedCategory === cat.key }"
              @tap="selectCategory(cat.key)"
            >
              <text class="category-option__text">{{ cat.label }}</text>
            </view>
          </view>
          <view class="category-row">
            <view
              v-for="cat in categoryOptions.slice(3, 6)" :key="cat.key"
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
        <text class="section-label">{{ t('campus.postTopic.labelTitle') }}</text>
        <input
          v-model="title"
          class="title-input"
          :placeholder="t('campus.postTopic.placeholderTitle')"
          maxlength="50" :aria-label="t('campus.postTopic.placeholderTitle')"
        />
      </view>

      <!-- 内容输入区 -->
      <view class="content-section">
        <text class="section-label">{{ t('campus.postTopic.labelContent') }}</text>
        <textarea
          v-model="content"
          class="content-input"
          :placeholder="t('campus.postTopic.placeholderContent')"
          :maxlength="MAX_LENGTH"
          :show-confirm-bar="false" :aria-label="t('campus.postTopic.placeholderContent')"
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
            <text class="option-label">{{ t('campus.postTopic.labelAnonymous') }}</text>
            <text class="option-desc">{{ t('campus.postTopic.anonymousDesc') }}</text>
          </view>
          <switch
            :checked="isAnonymous"
            :color="brandColor"
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
          <text class="bottom-submit__text">{{ isSubmitting ? t('campus.postTopic.submitPublishingBottom') : t('campus.postTopic.submitPublishBottom') }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand);
$green-light: var(--c-brand-50);
$pink-primary: var(--c-romance-500);
$pink-light: var(--c-romance-50);
$white: var(--c-neutral-0);
$bg-page: var(--c-bg-page);
$text-primary: var(--c-text-primary);
/* ui-ux 修复：$text-secondary 统一映射到文本次要色 token */
$text-secondary: var(--c-text-secondary);
$text-tertiary: var(--c-text-tertiary);
/* ui-ux 修复：$border-light 统一为 border 系列 token */
$border-light: var(--c-border-light);
$error: var(--c-error);
$card-soft-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);

.post-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: linear-gradient(180deg, var(--c-bg-brand) 0%, var(--c-bg-page) 20%);
}

/* ========== 顶部导航栏 ========== */
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 24rpx;
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-300) 60%, var(--c-romance-300) 100%);
}

.post-header__back {
  padding: 12rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-white-bg-mid-strong);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.post-header__back:active {
  transform: scale(0.96);
  background: var(--c-overlay-white-bg-stronger);
}
/* #endif */

.back-icon {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse);
  font-weight: 500;
}

.post-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
}

.post-header__submit {
  padding: 14rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-bg-pure);
  min-width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;
  box-shadow: 0 4rpx 12rpx var(--c-black-shadow-md);
}

/* #ifdef H5 */
.post-header__submit:active {
  transform: scale(0.96);
}
/* #endif */

.post-header__submit--disabled {
  background: var(--c-overlay-white-bg-stronger);
  box-shadow: none;
}

.submit-text {
  font-size: var(--fs-md, 26rpx);
  color: $green-primary;
  font-weight: 600;
}

.post-header__submit--disabled .submit-text {
  color: var(--c-overlay-white-text-strong);
}

.post-body {
  flex: 1;
  padding: 24rpx;
}

/* ========== 公共标签 ========== */
.section-label {
  display: block;
  font-size: var(--fs-md, 26rpx);
  color: $text-tertiary;
  margin-bottom: 16rpx;
  font-weight: 500;
}

/* ========== 分类选择 ========== */
.category-section {
  padding: 28rpx;
  background: $white;
  border-radius: var(--r-xl, 24rpx);
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
  border-radius: var(--r-lg, 16rpx);
  background: $bg-page;
  border: 2rpx solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.category-option:active {
  transform: scale(0.96);
}
/* #endif */

.category-option--selected {
  background: linear-gradient(135deg, $green-light, var(--c-tint-green-50));
  border-color: $green-primary;
  box-shadow: 0 4rpx 12rpx var(--c-brand-shadow-tint);
}

.category-option__text {
  font-size: var(--fs-md, 26rpx);
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
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.title-input {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 600;
  color: $text-primary;
  padding: 16rpx 20rpx;
  border-radius: var(--r-lg, 16rpx);
  background: $bg-page;
  border: 2rpx solid transparent;
  transition: all var(--d-normal, 200ms) ease;
}

.title-input:focus {
  border-color: $green-primary;
  background: $white;
}

/* ========== 内容输入区 ========== */
.content-section {
  padding: 28rpx;
  background: $white;
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.content-input {
  width: 100%;
  min-height: 240rpx;
  font-size: var(--fs-xl, 30rpx);
  color: $text-primary;
  line-height: 1.7;
  background: $bg-page;
  padding: 20rpx;
  border-radius: var(--r-lg, 16rpx);
  border: 2rpx solid transparent;
  box-sizing: border-box;
  transition: all var(--d-normal, 200ms) ease;
}

.content-input:focus {
  border-color: $green-primary;
  background: $white;
}

.content-count {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.content-count--over {
  color: $error;
}

/* ========== 选项区 ========== */
.options-section {
  padding: 28rpx;
  background: $white;
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 24rpx;
  box-shadow: $card-soft-shadow;
}

/* 功能4：话题选择器容器 */
.topic-selector-section {
  padding: 28rpx;
  background: $white;
  border-radius: var(--r-xl, 24rpx);
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
  font-size: var(--fs-lg, 28rpx);
  color: $text-primary;
  font-weight: 500;
}

.option-desc {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

/* ========== 底部提交 ========== */
.bottom-submit {
  padding: 20rpx 0 40rpx;
}

.bottom-submit__btn {
  width: 100%;
  padding: 28rpx 0;
  border-radius: var(--r-xl, 24rpx);
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx var(--c-brand-shadow-tint-strong);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.bottom-submit__btn:active {
  transform: scale(0.96);
  box-shadow: 0 4rpx 12rpx var(--c-brand-shadow-tint-mid);
}
/* #endif */

.bottom-submit__btn--disabled {
  background: $border-light;
  box-shadow: none;
}

.bottom-submit__text {
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.bottom-submit__btn--disabled .bottom-submit__text {
  color: $text-tertiary;
}
</style>
