<script setup lang="ts">
/**
 * 发布话题页
 * 支持标题输入、内容输入、可选图片上传
 */
import { ref, computed, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useCircleStore } from "../../stores/circle";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../utils/privacy";

const circleStore = useCircleStore();

/** 话题标题 */
const title = ref("");
/** 话题内容 */
const content = ref("");
/** 已上传的图片列表 */
const images = ref<string[]>([]);
/** 当前兴趣圈 ID */
const circleId = ref("");

/** 最大字数 */
const MAX_LENGTH = 500;
/** 最大图片数 */
const MAX_IMAGES = 9;

/** 当前字数 */
const currentLength = computed(() => content.value.length);
/** 是否超出字数限制 */
const isOverLimit = computed(() => currentLength.value > MAX_LENGTH);

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
 * SubTask 1.5.2：页面卸载时清理所有未触发的定时器。
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

/**
 * 选择图片上传
 *
 * Task 0.2.4：调用 chooseImage 前先调用 ensurePrivacyAuthorized 检查隐私授权。
 * - 用户已同意隐私协议 → 继续选择图片
 * - 用户拒绝或未授权 → 提示并终止
 * - H5/APP 环境不支持隐私 API → 直接通过
 */
async function chooseImage() {
  if (images.value.length >= MAX_IMAGES) {
    uni.showToast({ title: `最多上传${MAX_IMAGES}张图片`, icon: "none" });
    return;
  }

  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({
      title: "需同意隐私协议后才能选择图片",
      icon: "none",
    });
    return;
  }

  uni.chooseImage({
    count: MAX_IMAGES - images.value.length,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPaths = res.tempFilePaths as string[];
      images.value.push(...tempPaths);
    },
    fail: (err) => {
      console.error("选择图片失败:", err);
    },
  });
}

/**
 * 删除已选图片
 */
function removeImage(index: number) {
  images.value.splice(index, 1);
}

/**
 * 发布话题
 */
async function submitTopic() {
  if (!title.value.trim()) {
    uni.showToast({ title: "请输入标题", icon: "none" });
    return;
  }

  if (!content.value.trim()) {
    uni.showToast({ title: "请输入内容", icon: "none" });
    return;
  }

  if (isOverLimit.value) {
    uni.showToast({ title: `内容不能超过${MAX_LENGTH}字`, icon: "none" });
    return;
  }

  try {
    await circleStore.createTopic(circleId.value, {
      title: title.value.trim(),
      content: content.value.trim(),
      images: images.value,
    });

    uni.showToast({ title: "发布成功", icon: "success" });
    // SubTask 1.5.2：保存跳转定时器引用，卸载时统一清理
    if (postSuccessNavTimer) clearTimeout(postSuccessNavTimer);
    postSuccessNavTimer = setTimeout(() => {
      postSuccessNavTimer = null;
      uni.navigateBack();
    }, 800);
  } catch (_e) {
    uni.showToast({
      title: circleStore.errorMessage || "发布失败",
      icon: "none",
    });
  }
}

/**
 * 返回上一页
 */
function goBack() {
  uni.navigateBack();
}

// 获取页面参数
const pages = getCurrentPages();
const currentPage = pages[pages.length - 1];
const options = (currentPage as { options?: Record<string, string> })?.options ?? {};
circleId.value = options.circleId || "";
</script>

<template>
  <view class="post-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航栏 -->
    <view class="post-header">
      <view class="post-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">返回</text>
      </view>
      <text class="post-header__title">发布话题</text>
      <view
        class="post-header__submit press-feedback"
        :class="{ 'post-header__submit--disabled': !title.trim() || !content.trim() || isOverLimit }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="submitTopic"
      >
        <text class="submit-text">发布</text>
      </view>
    </view>

    <scroll-view class="post-body" scroll-y>
      <!-- 标题输入 -->
      <view class="title-section">
        <input
          v-model="title"
          class="title-input"
          placeholder="话题标题"
          maxlength="50" aria-label="话题标题"
        />
      </view>

      <!-- 内容输入区 -->
      <view class="content-section">
        <textarea
          v-model="content"
          class="content-input"
          placeholder="分享你的想法..."
          maxlength="500"
          :show-confirm-bar="false" aria-label="分享你的想法..."
        />
        <view class="content-count" :class="{ 'content-count--over': isOverLimit }">
          <text>{{ currentLength }}/{{ MAX_LENGTH }}</text>
        </view>
      </view>

      <!-- 图片上传区 -->
      <view class="images-section">
        <text class="section-label">添加图片（可选）</text>
        <view class="images-list" role="list">
          <view
            v-for="(img, idx) in images"
            :key="idx"
            class="image-item"
          >
            <image class="image-item__img" :src="img" mode="aspectFill"
        lazy-load alt="" />
            <view class="image-item__remove" @tap="removeImage(idx)">
              <text class="remove-icon">×</text>
            </view>
          </view>
          <view
            v-if="images.length < MAX_IMAGES"
            class="image-upload press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="chooseImage"
          >
            <view class="image-upload__inner">
              <text class="upload-icon">+</text>
              <text class="upload-text">{{ images.length }}/{{ MAX_IMAGES }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部提交 -->
      <view class="bottom-submit">
        <view
          class="bottom-submit__btn press-feedback"
          :class="{ 'bottom-submit__btn--disabled': !title.trim() || !content.trim() || isOverLimit }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="submitTopic"
        >
          <text class="bottom-submit__text">发布话题</text>
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
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
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
  border-radius: var(--r-full, 9999rpx);
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
  font-size: var(--fs-lg, 28rpx);
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
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-bg-pure, var(--c-overlay-bg-pure, rgba(255, 255, 255, 0.95)));
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
  font-size: var(--fs-md, 26rpx);
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

.section-label {
  display: block;
  font-size: var(--fs-md, 26rpx);
  color: $text-tertiary;
  margin-bottom: 16rpx;
  font-weight: 500;
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
  font-size: 34rpx;
  font-weight: 600;
  color: $text-primary;
  padding: 16rpx 20rpx;
  border-radius: var(--r-lg, 16rpx);
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
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.content-input {
  width: 100%;
  min-height: 280rpx;
  font-size: var(--fs-xl, 30rpx);
  color: $text-primary;
  line-height: 1.7;
  background: $bg-page;
  padding: 20rpx;
  border-radius: var(--r-lg, 16rpx);
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
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.content-count--over {
  color: $error;
}

/* ========== 图片上传区 ========== */
.images-section {
  padding: 28rpx;
  background: $white;
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 24rpx;
  box-shadow: $card-soft-shadow;
}

.images-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  /* mp-weixin 不支持 aspect-ratio，改用 padding-top 百分比（1:1 → 100%） */
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
  border-radius: 50%;
  background: var(--c-gradient-mask-strong, var(--c-gradient-mask-strong, rgba(0, 0, 0, 0.6)));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

/* #ifdef H5 */
.image-item__remove:active {
  transform: scale(0.9);
}
/* #endif */

.remove-icon {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse, #FFFFFF);
  font-weight: 300;
  line-height: 1;
}

.image-upload {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  /* mp-weixin 不支持 aspect-ratio，改用 padding-top 百分比（1:1 → 100%） */
  padding-top: calc((100% - 32rpx) / 3);
  border-radius: var(--r-lg, 16rpx);
  border: 2rpx dashed $border-light;
  background: $bg-page;
  overflow: hidden;
  transition: all 0.15s ease;
}

.image-upload__inner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

/* #ifdef H5 */
.image-upload:active {
  transform: scale(0.96);
  border-color: $green-primary;
  background: $green-light;
}
/* #endif */

.upload-icon {
  font-size: var(--fs-7xl, 56rpx);
  color: $text-tertiary;
  font-weight: 300;
  line-height: 1;
}

.upload-text {
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
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-inverse, #FFFFFF);
  font-weight: 600;
}

.bottom-submit__btn--disabled .bottom-submit__text {
  color: $text-tertiary;
}
</style>
