<script setup lang="ts">
/**
 * 发布话题页
 * 支持标题输入、内容输入、可选图片上传
 */
import { ref, computed } from "vue";
import { useCircleStore } from "../../stores/circle";

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

/**
 * 选择图片上传
 */
function chooseImage() {
  if (images.value.length >= MAX_IMAGES) {
    uni.showToast({ title: `最多上传${MAX_IMAGES}张图片`, icon: "none" });
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
    setTimeout(() => {
      uni.navigateBack();
    }, 800);
  } catch {
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
  <view class="post-page">
    <!-- 顶部导航栏 -->
    <view class="post-header">
      <view class="post-header__back" @tap="goBack">
        <text class="back-icon">返回</text>
      </view>
      <text class="post-header__title">发布话题</text>
      <button
        class="post-header__submit"
        :disabled="!title.trim() || !content.trim() || isOverLimit"
        @tap="submitTopic"
      >
        <text class="submit-text">发布</text>
      </button>
    </view>

    <!-- 标题输入 -->
    <view class="title-section">
      <input
        v-model="title"
        class="title-input"
        placeholder="话题标题"
        maxlength="50"
      />
    </view>

    <!-- 内容输入区 -->
    <view class="content-section">
      <textarea
        v-model="content"
        class="content-input"
        placeholder="分享你的想法..."
        maxlength="500"
        :show-confirm-bar="false"
      />
      <view class="content-count" :class="{ 'content-count--over': isOverLimit }">
        <text>{{ currentLength }}/{{ MAX_LENGTH }}</text>
      </view>
    </view>

    <!-- 图片上传区 -->
    <view class="images-section">
      <view class="images-grid">
        <view
          v-for="(img, idx) in images"
          :key="idx"
          class="image-item"
        >
          <image class="image-item__img" :src="img" mode="aspectFill" />
          <view class="image-item__remove" @tap="removeImage(idx)">
            <text class="remove-icon">x</text>
          </view>
        </view>
        <view
          v-if="images.length < MAX_IMAGES"
          class="image-upload"
          @tap="chooseImage"
        >
          <text class="upload-icon">+</text>
          <text class="upload-text">{{ images.length }}/{{ MAX_IMAGES }}</text>
        </view>
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
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
}

/* ========== 顶部导航栏 ========== */
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 24rpx;
  border-bottom: 1rpx solid var(--td-border-level-1-color);
}

.post-header__back {
  padding: 8rpx 0;
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
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.post-header__submit[disabled] {
  background: var(--td-bg-color-surface);
}

.submit-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
}

.post-header__submit[disabled] .submit-text {
  color: var(--td-text-color-placeholder);
}

/* ========== 标题输入 ========== */
.title-section {
  padding: 24rpx 32rpx;
  background: var(--td-bg-color-container);
  margin-bottom: 16rpx;
}

.title-input {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

/* ========== 内容输入区 ========== */
.content-section {
  padding: 24rpx 32rpx;
  background: var(--td-bg-color-container);
  margin-bottom: 16rpx;
}

.content-input {
  width: 100%;
  min-height: 240rpx;
  font-size: 30rpx;
  color: var(--td-text-color-primary);
  line-height: 1.7;
  background: transparent;
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

/* ========== 图片上传区 ========== */
.images-section {
  padding: 24rpx 32rpx;
  background: var(--td-bg-color-container);
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12rpx;
  overflow: hidden;
  background: var(--td-bg-app-page);
}

.image-item__img {
  width: 100%;
  height: 100%;
}

.image-item__remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-icon {
  font-size: 22rpx;
  color: #ffffff;
}

.image-upload {
  aspect-ratio: 1;
  border-radius: 12rpx;
  border: 2rpx dashed var(--td-border-level-1-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: var(--td-bg-app-page);
}

.upload-icon {
  font-size: 48rpx;
  color: var(--td-text-color-placeholder);
  font-weight: 300;
}

.upload-text {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}
</style>
