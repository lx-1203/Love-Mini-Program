<script setup lang="ts">
/**
 * 发帖页
 * 支持文字输入、图片上传、话题标签和分类选择
 * 新增：预置话题标签选择器，支持横向滚动多选（最多3个）
 */
import { ref, computed, onMounted } from "vue";
import { useVillageStore } from "../../stores/village";
import { openAppPath } from "../../utils/navigation";
import { request } from "../../services/http";
import { appEnv } from "../../services/env";

const villageStore = useVillageStore();

/** 文字内容 */
const content = ref("");
/** 已上传的图片列表 */
const images = ref<string[]>([]);
/** 话题标签输入 */
const tagInput = ref("");
/** 已添加的标签列表 */
const tags = ref<string[]>([]);
/** 选中的分类 */
const selectedCategory = ref("cat-sincere");

/** 预置话题标签列表 */
const presetTags = ref<string[]>([]);
/** 选中的预置标签（#话题名 格式） */
const selectedPresetTags = ref<string[]>([]);

/** 最大字数 */
const MAX_LENGTH = 500;
/** 最大图片数 */
const MAX_IMAGES = 9;
/** 预置标签最大选择数 */
const MAX_PRESET_TAGS = 3;

/** 当前字数 */
const currentLength = computed(() => content.value.length);
/** 是否超出字数限制 */
const isOverLimit = computed(() => currentLength.value > MAX_LENGTH);

/** 分类选项 */
const categoryOptions = [
  { id: "cat-sincere", name: "诚意帖" },
  { id: "cat-hometown", name: "同乡" },
  { id: "cat-mask", name: "蒙面" },
  { id: "cat-interest", name: "兴趣圈" },
];

/**
 * 加载预置话题标签（从后端获取）
 */
async function loadPresetTags() {
  try {
    if (appEnv.apiMode === "mock") {
      // Mock 模式下使用本地预置标签
      presetTags.value = [
        "校园日常", "兴趣分享", "找搭子", "求助",
        "表白墙", "校友动态", "生活记录", "技术交流",
      ];
      return;
    }
    // Real 模式下从后端 API 获取
    const data = await request<string[]>({
      url: "/post-tags",
      method: "GET",
    });
    presetTags.value = data;
  } catch {
    // 加载失败时使用默认列表
    presetTags.value = [
      "校园日常", "兴趣分享", "找搭子", "求助",
      "表白墙", "校友动态", "生活记录", "技术交流",
    ];
  }
}

/**
 * 切换预置标签选中状态
 */
function togglePresetTag(tagName: string) {
  const tag = "#" + tagName;
  const idx = selectedPresetTags.value.indexOf(tag);
  if (idx >= 0) {
    // 已选中，取消选中
    selectedPresetTags.value.splice(idx, 1);
  } else {
    // 未选中，检查数量限制
    if (selectedPresetTags.value.length >= MAX_PRESET_TAGS) {
      uni.showToast({ title: `最多选择${MAX_PRESET_TAGS}个话题标签`, icon: "none" });
      return;
    }
    selectedPresetTags.value.push(tag);
  }
}

onMounted(() => {
  loadPresetTags();
});

/**
 * 上传图片到服务器（仅 real 模式使用）
 * 上传单个临时文件，返回服务器 URL
 */
async function uploadImage(tempPath: string): Promise<string> {
  // real 模式：调用上传 API
  try {
    const res = await uni.uploadFile({
      url: "/api/upload",
      filePath: tempPath,
      name: "file",
    });
    const data = JSON.parse(res.data);
    return data.url ?? data.path ?? tempPath;
  } catch {
    // 上传失败时回退到临时路径（mock 模式行为）
    return tempPath;
  }
}

/**
 * 选择图片
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
 * 添加话题标签
 */
function addTag() {
  const raw = tagInput.value.trim();
  if (!raw) return;

  let tag = raw;
  if (!tag.startsWith("#")) {
    tag = "#" + tag;
  }

  if (tags.value.includes(tag)) {
    uni.showToast({ title: "标签已存在", icon: "none" });
    return;
  }

  if (tags.value.length >= 5) {
    uni.showToast({ title: "最多添加5个标签", icon: "none" });
    return;
  }

  tags.value.push(tag);
  tagInput.value = "";
}

/**
 * 删除标签
 */
function removeTag(index: number) {
  tags.value.splice(index, 1);
}

/**
 * 处理标签输入回车
 */
function onTagConfirm() {
  addTag();
}

/**
 * 发布帖子
 */
async function submitPost() {
  if (!content.value.trim()) {
    uni.showToast({ title: "请输入内容", icon: "none" });
    return;
  }

  if (isOverLimit.value) {
    uni.showToast({ title: `内容不能超过${MAX_LENGTH}字`, icon: "none" });
    return;
  }

  try {
    // 合并预置标签和自定义标签
    const allTags = [...selectedPresetTags.value, ...tags.value];

    await villageStore.createPost({
      categoryId: selectedCategory.value,
      title: "",
      content: content.value.trim(),
      images: images.value,
      tags: allTags,
    });

    uni.showToast({ title: "发布成功", icon: "success" });
    setTimeout(() => {
      uni.navigateBack();
    }, 800);
  } catch (error) {
    uni.showToast({
      title: villageStore.errorMessage || "发布失败",
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
</script>

<template>
  <view class="post-page">
    <!-- 顶部导航栏 -->
    <view class="post-header">
      <view class="post-header__back" @tap="goBack">
        <text class="back-icon">返回</text>
      </view>
      <text class="post-header__title">发布帖子</text>
      <button
        class="post-header__submit"
        :disabled="!content.trim() || isOverLimit"
        @tap="submitPost"
      >
        <text class="submit-text">发布</text>
      </button>
    </view>

    <!-- 分类选择 -->
    <view class="category-section">
      <text class="section-label">选择分类</text>
      <view class="category-options">
        <view
          v-for="cat in categoryOptions"
          :key="cat.id"
          class="category-option"
          :class="{ 'category-option--active': selectedCategory === cat.id }"
          @tap="selectedCategory = cat.id"
        >
          <text class="category-option__text">{{ cat.name }}</text>
        </view>
      </view>
    </view>

    <!-- 文字输入区 -->
    <view class="content-section">
      <textarea
        v-model="content"
        class="content-input"
        placeholder="分享你的故事、心情或寻找那个TA..."
        maxlength="500"
        :show-confirm-bar="false"
      />
      <view class="content-count" :class="{ 'content-count--over': isOverLimit }">
        <text>{{ currentLength }}/{{ MAX_LENGTH }}</text>
      </view>
    </view>

    <!-- 预置话题标签选择器 -->
    <view class="preset-tags-section">
      <view class="section-header">
        <text class="section-label">话题标签</text>
        <text class="section-hint">最多选择{{ MAX_PRESET_TAGS }}个</text>
      </view>
      <scroll-view class="preset-tags-scroll" scroll-x :show-scrollbar="false" :enhanced="true">
        <view class="preset-tags-inner">
          <view
            v-for="tag in presetTags"
            :key="tag"
            class="preset-tag-chip"
            :class="{ 'preset-tag-chip--active': selectedPresetTags.includes('#' + tag) }"
            @tap="togglePresetTag(tag)"
          >
            <text class="preset-tag-chip__text">#{{ tag }}</text>
          </view>
        </view>
      </scroll-view>
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

    <!-- 话题标签区 -->
    <view class="tags-section">
      <text class="section-label">话题标签</text>
      <view class="tag-input-wrap">
        <input
          v-model="tagInput"
          class="tag-input"
          placeholder="输入标签，按回车添加（如：520交友）"
          confirm-type="done"
          @confirm="onTagConfirm"
        />
        <view class="tag-add-btn" @tap="addTag">
          <text class="tag-add-text">添加</text>
        </view>
      </view>
      <view v-if="tags.length > 0" class="tag-list">
        <view
          v-for="(tag, idx) in tags"
          :key="idx"
          class="tag-chip"
        >
          <text class="tag-chip__text">{{ tag }}</text>
          <text class="tag-chip__remove" @tap="removeTag(idx)">x</text>
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

/* ========== 分类选择 ========== */
.category-section {
  padding: 24rpx 32rpx;
  background: var(--td-bg-color-container);
  margin-bottom: 16rpx;
}

.section-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin-bottom: 16rpx;
}

.category-options {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.category-option {
  padding: 14rpx 32rpx;
  border-radius: 999px;
  background: var(--td-bg-app-page);
  border: 2rpx solid transparent;
  transition: all 160ms ease;
}

.category-option--active {
  background: var(--td-brand-color-1);
  border-color: var(--td-brand-color-7);
}

.category-option__text {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  font-weight: 500;
}

.category-option--active .category-option__text {
  color: var(--td-brand-color-7);
}

/* ========== 文字输入区 ========== */
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

/* ========== 预置话题标签选择器 ========== */
.preset-tags-section {
  padding: 24rpx 32rpx;
  background: var(--td-bg-color-container);
  margin-bottom: 16rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-hint {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

.preset-tags-scroll {
  white-space: nowrap;
}

.preset-tags-inner {
  display: flex;
  gap: 16rpx;
  padding: 4rpx 0;
}

.preset-tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 14rpx 28rpx;
  border-radius: 999px;
  background: var(--td-bg-app-page);
  border: 2rpx solid transparent;
  transition: all 160ms ease;
  flex-shrink: 0;
}

.preset-tag-chip--active {
  background: var(--td-brand-color-1);
  border-color: var(--td-brand-color-7);
}

.preset-tag-chip__text {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.preset-tag-chip--active .preset-tag-chip__text {
  color: var(--td-brand-color-7);
  font-weight: 600;
}

/* ========== 图片上传区 ========== */
.images-section {
  padding: 24rpx 32rpx;
  background: var(--td-bg-color-container);
  margin-bottom: 16rpx;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--td-radius-small);
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
  border-radius: var(--td-radius-small);
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

/* ========== 话题标签区 ========== */
.tags-section {
  padding: 24rpx 32rpx;
  background: var(--td-bg-color-container);
  flex: 1;
}

.tag-input-wrap {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.tag-input {
  flex: 1;
  padding: 16rpx 24rpx;
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-app-page);
  font-size: 28rpx;
  color: var(--td-text-color-primary);
}

.tag-add-btn {
  padding: 16rpx 32rpx;
  border-radius: var(--td-radius-medium);
  background: var(--td-brand-color-7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-add-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border-radius: 999px;
  background: var(--td-brand-color-1);
}

.tag-chip__text {
  font-size: 24rpx;
  color: var(--td-brand-color-7);
}

.tag-chip__remove {
  font-size: 22rpx;
  color: var(--td-brand-color-6);
  padding: 0 4rpx;
}
</style>
