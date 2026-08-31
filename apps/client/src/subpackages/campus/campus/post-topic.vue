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
import { useI18n } from "vue-i18n";
// 修复 no-duplicate-imports：合并 ../../stores/campus 的重复 import
import { useCampusStore, CAMPUS_CATEGORY_MAP, type CampusTopicCategory } from "../../../stores/campus";
import { useMock } from "../../../stores/helpers/use-mock";
// 2026-08-26 P7：校园圈发帖支持上传图片（chooseImage + 预览 + 上传）
import { clientApi } from "../../../services/api";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../../utils/privacy";
import { UI_LIMITS } from "../../../constants/limits";
// 功能4：帖子创建话题选择器（带搜索 + 自定义创建）
import TopicSelector from "../../../components/village/TopicSelector.vue";
import { designTokens } from "../../../theme/tokens";

const campusStore = useCampusStore();
const { t } = useI18n();

/**
 * SubTask 1.5.2：发布成功跳转定时器引用，便于卸载清理。
 */
let postSuccessNavTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * SubTask 1.5.2：页面卸载时清理所有未触发的定时器，避免在已销毁页面上修改响应式状态或触发导航。
 */
onUnmounted(() => {
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
/** 2026-08-26 P7：已选配图（校园圈发帖照片墙，上限 6 张与项目约定一致） */
const images = ref<string[]>([]);
/** 配图上限（复用抬分约定：照片墙 6 张内） */
const MAX_IMAGES = UI_LIMITS.PHOTO_GALLERY_MAX;

/**
 * switch 品牌色：小程序 switch 的 color 为原生属性，不支持 CSS 变量，
 * 此处取 design token --c-brand（designTokens.color.brand[500]）的实际色值（ui-ux B9 修复）。
 */
const brandColor = designTokens.color.brand[500];

/**
 * 功能4：TopicSelector 已选话题列表（不含 # 前缀）。
 * 由 TopicSelector 组件通过 v-model 双向绑定。
 * 2026-08-10 B5：real 模式以 tags 数组字段提交（后端已支持 ≤5 个、每个 ≤20 字符）；
 * mock 模式保留内容末尾 #话题 拼接（后端 mock 无 tags 语义）。
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
 * 2026-08-26 P7：选择配图上传（Task 0.2.4 隐私授权检查；上限 MAX_IMAGES 张）
 */
async function chooseImage() {
  if (images.value.length >= MAX_IMAGES) {
    uni.showToast({ title: t("campus.postTopic.maxImages", { max: MAX_IMAGES }), icon: "none" });
    return;
  }
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({ title: t("campus.postTopic.privacyRequired"), icon: "none" });
    return;
  }
  uni.chooseImage({
    count: MAX_IMAGES - images.value.length,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      images.value.push(...(res.tempFilePaths as string[]));
    },
    fail: (err) => {
      console.error("选择图片失败:", err);
    },
  });
}

/** 2026-08-26 P7：删除已选配图 */
function removeImage(index: number) {
  images.value.splice(index, 1);
}

/**
 * 发布话题
 *
 * 功能4：real 模式将话题标签作为 tags 字段提交（后端原生支持）；
 * mock 模式（B5 兼容）将标签以 #话题 格式追加到内容末尾（mock 无 tags 语义）。
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
    const trimmedContent = content.value.trim();
    // 2026-08-26 P7：配图本地临时路径（tempFilePath）在 real 模式先经
    // clientApi.uploadPostImage 逐张上传换取可访问 URL，mock 模式保留原始路径。
    let submitImages = images.value;
    if (images.value.some((img) => !/^https?:\/\//.test(img)) && !useMock()) {
      const uploaded: string[] = [];
      for (const img of images.value) {
        if (/^https?:\/\//.test(img)) {
          uploaded.push(img);
          continue;
        }
        const result = await clientApi.uploadPostImage({ name: "campus-topic.jpg", path: img });
        uploaded.push(result?.url ?? img);
      }
      submitImages = uploaded;
    }

    if (useMock()) {
      // mock：拼接最终内容（如有话题标签则追加到末尾）
      const topics = selectedTopics.value.map((name) => `#${name}`).join(" ");
      const finalContent = topics ? `${trimmedContent}\n\n${topics}` : trimmedContent;
      await campusStore.createCampusTopic({
        category: selectedCategory.value,
        title: title.value.trim(),
        content: finalContent,
        isAnonymous: isAnonymous.value,
        images: submitImages,
      });
    } else {
      // real：tags 字段提交（后端校验 ≤5 个、每个 ≤20 字符，超限前端先截断）
      const tags = selectedTopics.value
        .slice(0, 5)
        .map((name) => name.slice(0, 20))
        .filter((name) => name.trim().length > 0);
      await campusStore.createCampusTopic({
        category: selectedCategory.value,
        title: title.value.trim(),
        content: trimmedContent,
        isAnonymous: isAnonymous.value,
        images: submitImages,
        ...(tags.length > 0 ? { tags } : {}),
      });
    }

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
  <view class="post-page">
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

      <!-- 2026-08-26 P7：图片上传区（晒照片墙，上限 6 张） -->
      <view class="images-section">
        <view class="images-section__head">
          <text class="section-label">{{ t('campus.postTopic.imagePickLabel') }}</text>
          <text class="images-section__hint">{{ images.length }}/{{ MAX_IMAGES }}</text>
        </view>
        <view class="images-list">
          <view v-for="(img, idx) in images" :key="idx" class="image-item">
            <image class="image-item__img" :src="img" mode="aspectFill" lazy-load alt="" />
            <view class="image-item__remove press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" aria-label="删除图片" @tap="removeImage(idx)">
              <text class="image-item__remove-icon">×</text>
            </view>
          </view>
          <view
            v-if="images.length < MAX_IMAGES"
            class="image-upload press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('campus.postTopic.imagePickLabel')"
            @tap="chooseImage"
          >
            <text class="image-upload__icon">+</text>
            <text class="image-upload__text">{{ t('campus.postTopic.imagePickHint') }}</text>
          </view>
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
  min-height: 100%;
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
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
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
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
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
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
}

/* ========== 内容输入区 ========== */
.content-section {
  padding: 28rpx;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
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
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
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

/* ========== 2026-08-26 P7：图片上传区 ========== */
.images-section {
  padding: 28rpx;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.images-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.images-section__head .section-label {
  margin-bottom: 0;
}

.images-section__hint {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

.images-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  /* mp-weixin 不支持 aspect-ratio，用 padding-top 百分比实现 1:1 方格 */
  padding-top: calc((100% - 32rpx) / 3);
  border-radius: var(--r-lg, 16rpx);
  overflow: hidden;
  background: $bg-page;
}

.image-item__img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.image-item__remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-circle, 50%);
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-item__remove-icon {
  font-size: var(--fs-lg, 28rpx);
  color: #ffffff;
  font-weight: 300;
  line-height: 1;
}

.image-upload {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  /* mp-weixin 不支持 aspect-ratio，用 padding-top 百分比实现 1:1 方格 */
  padding-top: calc((100% - 32rpx) / 3);
  border-radius: var(--r-lg, 16rpx);
  border: 2rpx dashed $border-light;
  background: $bg-page;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-upload__icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -70%);
  font-size: 48rpx;
  color: $text-tertiary;
  font-weight: 300;
  line-height: 1;
}

.image-upload__text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 30%);
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  white-space: nowrap;
}

/* ========== 选项区 ========== */
.options-section {
  padding: 28rpx;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 24rpx;
  box-shadow: $card-soft-shadow;
}

/* 功能4：话题选择器容器 */
.topic-selector-section {
  padding: 28rpx;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
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
