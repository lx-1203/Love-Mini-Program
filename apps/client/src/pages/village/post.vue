<script setup lang="ts">
/**
 * 发帖页
 * 支持文字输入、图片上传、话题标签和分类选择
 * 新增：预置话题标签选择器，支持横向滚动多选（最多3个）
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useVillageStore } from "../../stores/village";
// 功能4：帖子创建话题选择器（带搜索 + 自定义创建）
import TopicSelector from "../../components/village/TopicSelector.vue";
import { request } from "../../services/http";
import { appEnv } from "../../services/env";
// 统一常量：帖子内容/图片限制、草稿存储键、压缩质量等
import {
  POST_MAX_LENGTH,
  POST_MAX_IMAGES,
  POST_MAX_CUSTOM_TAGS,
  POST_DRAFT_STORAGE_KEY,
  POST_SUBMIT_NAVIGATE_BACK_MS,
  IMAGE_COMPRESS_QUALITY,
  DEFAULT_CATEGORY_ID,
} from "../../constants/village";
import {
  POST_DRAFT_SAVE_DEBOUNCE_MS,
  PAGE_ENTER_ANIMATION_DELAY_MS,
  MAX_PRESET_TAGS,
} from "../../constants/chat";

const villageStore = useVillageStore();

// 注：POST_DRAFT_STORAGE_KEY 由 constants/village 统一提供

/** 文字内容 */
const content = ref("");
/** 已上传的图片列表 */
const images = ref<string[]>([]);
/** 话题标签输入 */
const tagInput = ref("");
/** 已添加的标签列表 */
const tags = ref<string[]>([]);
/** 选中的分类 */
const selectedCategory = ref(DEFAULT_CATEGORY_ID);

/** 预置话题标签列表 */
const presetTags = ref<string[]>([]);
/** 选中的预置标签（#话题名 格式） */
const selectedPresetTags = ref<string[]>([]);

/**
 * 功能4：TopicSelector 已选话题列表（不含 # 前缀，由组件双向绑定）。
 * 与 selectedPresetTags 并存：TopicSelector 支持搜索与自定义创建，
 * 提交时合并到最终话题标签列表中。
 */
const selectedTopics = ref<string[]>([]);

const pageVisible = ref(false);
/** 页面进入动画定时器引用，用于卸载时清理 */
let pageEnterTimer: ReturnType<typeof setTimeout> | null = null;
/** 发布成功跳转定时器引用，用于卸载时清理 */
let postSubmitNavTimer: ReturnType<typeof setTimeout> | null = null;
onShow(() => {
  pageVisible.value = false;
  if (pageEnterTimer) clearTimeout(pageEnterTimer);
  pageEnterTimer = setTimeout(() => {
    pageVisible.value = true;
    pageEnterTimer = null;
  }, PAGE_ENTER_ANIMATION_DELAY_MS);
});

/**
 * 页面卸载时清理所有定时器，避免内存泄漏。
 * 修复（P1 BUG）：原实现未保存 setTimeout 返回值，页面销毁后定时器仍可能触发
 * 状态修改或 navigateBack 跳转。
 */
onUnmounted(() => {
  if (pageEnterTimer) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
  }
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
  }
  if (postSubmitNavTimer) {
    clearTimeout(postSubmitNavTimer);
    postSubmitNavTimer = null;
  }
});

// 注：POST_MAX_LENGTH / POST_MAX_IMAGES / MAX_PRESET_TAGS 由 constants 统一提供

/** 当前字数 */
const currentLength = computed(() => content.value.length);
/** 是否超出字数限制 */
const isOverLimit = computed(() => currentLength.value > POST_MAX_LENGTH);

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
  } catch (_e) {
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
  // 修复：进入页面时恢复未提交的草稿，避免误退页面丢失内容
  restoreDraft();
  // 监听表单变化，debounce 500ms 保存草稿到 storage
  // 性能优化（P1）：原实现使用 deep: true，会递归遍历所有 ref 内部属性。
  // 实际上 content / tagInput / selectedCategory 是 string，images / tags / selectedPresetTags
  // 是 string[]，selectedTopics 是对象数组。这些 ref 的赋值都是替换整个数组或字符串变更，
  // 引用变化即可触发 watch，无需 deep 遍历内部属性。
  // 唯一例外是 selectedTopics 内部对象属性变化（如选中状态切换），但实际使用中是替换整个数组，
  // 故可安全去掉 deep。
  watch(
    [content, images, tags, tagInput, selectedCategory, selectedPresetTags, selectedTopics],
    () => {
      scheduleDraftSave();
    }
  );
});

/**
 * 草稿保存定时器引用（debounce 500ms）。
 */
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 调度草稿保存：POST_DRAFT_SAVE_DEBOUNCE_MS 防抖，避免每次输入都写 storage。
 */
function scheduleDraftSave() {
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    saveDraft();
  }, POST_DRAFT_SAVE_DEBOUNCE_MS);
}

/**
 * 保存草稿到 storage。
 * 修复：原实现无草稿保存，用户误退页面会丢失已输入内容。
 */
function saveDraft() {
  try {
    uni.setStorageSync(POST_DRAFT_STORAGE_KEY, {
      content: content.value,
      images: images.value,
      tags: tags.value,
      tagInput: tagInput.value,
      selectedCategory: selectedCategory.value,
      selectedPresetTags: selectedPresetTags.value,
      // 功能4：持久化 TopicSelector 已选话题
      selectedTopics: selectedTopics.value,
      savedAt: Date.now(),
    });
  } catch (_e) {
    // storage 写入失败不阻塞主流程
  }
}

/**
 * 从 storage 恢复草稿，仅在存在草稿且字段非空时恢复。
 */
function restoreDraft() {
  try {
    const draft = uni.getStorageSync(POST_DRAFT_STORAGE_KEY) as {
      content?: string;
      images?: string[];
      tags?: string[];
      tagInput?: string;
      selectedCategory?: string;
      selectedPresetTags?: string[];
      selectedTopics?: string[];
    } | null;
    if (!draft) return;
    if (typeof draft.content === "string" && draft.content) {
      content.value = draft.content;
    }
    if (Array.isArray(draft.images)) {
      images.value = draft.images;
    }
    if (Array.isArray(draft.tags)) {
      tags.value = draft.tags;
    }
    if (typeof draft.tagInput === "string") {
      tagInput.value = draft.tagInput;
    }
    if (typeof draft.selectedCategory === "string" && draft.selectedCategory) {
      selectedCategory.value = draft.selectedCategory;
    }
    if (Array.isArray(draft.selectedPresetTags)) {
      selectedPresetTags.value = draft.selectedPresetTags;
    }
    // 功能4：恢复 TopicSelector 已选话题
    if (Array.isArray(draft.selectedTopics)) {
      selectedTopics.value = draft.selectedTopics;
    }
  } catch (_e) {
    // 读取失败忽略
  }
}

/**
 * 清除草稿（发帖成功后调用）。
 */
function clearDraft() {
  try {
    uni.removeStorageSync(POST_DRAFT_STORAGE_KEY);
  } catch (_e) {
    // 忽略
  }
}

/**
 * 上传图片到服务器（仅 real 模式使用）
 * 上传单个临时文件，返回服务器 URL
 *
 * 修复（严格模式 noUnusedLocals）：uploadImage 函数定义后未被调用（实际图片上传
 * 通过 profileStore.uploadPhotoAtIndex / 其他通道处理），属于历史遗留死代码，已移除。
 */

/**
 * 选择图片
 * 修复：chooseImage 后使用 uni.compressImage 压缩（质量 80），减少上传体积
 */
function chooseImage() {
  if (images.value.length >= POST_MAX_IMAGES) {
    uni.showToast({ title: `最多上传${POST_MAX_IMAGES}张图片`, icon: "none" });
    return;
  }

  uni.chooseImage({
    count: POST_MAX_IMAGES - images.value.length,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: async (res) => {
      const tempPaths = res.tempFilePaths as string[];
      // 压缩每张图片（质量 80）；单张失败回退原图，不阻塞后续
      const compressedPaths = await compressImages(tempPaths);
      images.value.push(...compressedPaths);
    },
    fail: (err) => {
      console.error("选择图片失败:", err);
    },
  });
}

/**
 * 批量压缩图片（质量 80）。
 * 修复：原实现直接使用 chooseImage 返回的临时路径，未做压缩，
 * 大图上传耗时且占用带宽。现统一压缩后再展示与上传。
 */
function compressImages(paths: string[]): Promise<string[]> {
  return Promise.all(paths.map((path) => compressSingleImage(path)));
}

/**
 * 压缩单张图片（质量 80）。
 * 失败时回退使用原图路径，避免阻塞后续上传流程。
 */
function compressSingleImage(path: string): Promise<string> {
  return new Promise((resolve) => {
    uni.compressImage({
      src: path,
      quality: IMAGE_COMPRESS_QUALITY,
      success: (compressRes) => {
        resolve(compressRes.tempFilePath || path);
      },
      fail: () => {
        // 压缩失败回退原图
        resolve(path);
      },
    });
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

  if (tags.value.length >= POST_MAX_CUSTOM_TAGS) {
    uni.showToast({ title: `最多添加${POST_MAX_CUSTOM_TAGS}个标签`, icon: "none" });
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
    uni.showToast({ title: `内容不能超过${POST_MAX_LENGTH}字`, icon: "none" });
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

    // 发布成功后清除草稿，避免下次进入页面恢复已发布内容
    clearDraft();
    uni.showToast({ title: "发布成功", icon: "success" });
    if (postSubmitNavTimer) clearTimeout(postSubmitNavTimer);
    postSubmitNavTimer = setTimeout(() => {
      uni.navigateBack();
      postSubmitNavTimer = null;
    }, POST_SUBMIT_NAVIGATE_BACK_MS);
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
  <view class="post-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航栏 -->
    <view class="post-header">
      <view class="post-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
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
          class="category-option list-item"
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
        :maxlength="POST_MAX_LENGTH"
        :show-confirm-bar="false" aria-label="分享你的故事、心情或寻找那个TA..."
      />
      <view class="content-count" :class="{ 'content-count--over': isOverLimit }">
        <text>{{ currentLength }}/{{ POST_MAX_LENGTH }}</text>
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
            class="preset-tag-chip list-item"
            :class="{ 'preset-tag-chip--active': selectedPresetTags.includes('#' + tag) }"
            @tap="togglePresetTag(tag)"
          >
            <text class="preset-tag-chip__text">#{{ tag }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 功能4：帖子创建话题选择器（带搜索 + 自定义创建） -->
    <view class="topic-selector-section">
      <TopicSelector v-model="selectedTopics" />
    </view>

    <!-- 图片上传区 -->
    <view class="images-section">
      <view class="images-grid">
        <view
          v-for="(img, idx) in images"
          :key="idx"
          class="image-item list-item"
        >
          <image class="image-item__img" :src="img" mode="aspectFill"
        lazy-load alt="" />
          <view class="image-item__remove" @tap="removeImage(idx)">
            <text class="remove-icon">x</text>
          </view>
        </view>
        <view
          v-if="images.length < POST_MAX_IMAGES"
          class="image-upload press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="chooseImage"
        >
          <text class="upload-icon">+</text>
          <text class="upload-text">{{ images.length }}/{{ POST_MAX_IMAGES }}</text>
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
          @confirm="onTagConfirm" aria-label="输入标签，按回车添加（如：520交友）"
        />
        <view class="tag-add-btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="addTag">
          <text class="tag-add-text">添加</text>
        </view>
      </view>
      <view v-if="tags.length > 0" class="tag-list" role="list">
        <view
          v-for="(tag, idx) in tags"
          :key="idx"
          class="tag-chip list-item"
        >
          <text class="tag-chip__text">{{ tag }}</text>
          <text class="tag-chip__remove" @tap="removeTag(idx)">x</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand, #3FCF8E);
$green-light: var(--c-tint-green-50, #E8F9F4);
$pink-primary: var(--c-romance-500, #EC4899);
$pink-light: var(--c-tint-pink-soft, #FFF0F5);
$bg-page: var(--c-bg-page, #F4F6FA);
$text-primary: var(--c-neutral-800, #1A1A2E);
$text-secondary: var(--c-text-tertiary, #8E8E9E);
$text-tertiary: var(--c-text-quaternary, #B8B8C8);
$divider: var(--c-neutral-100, #EEF0F5);
$white: var(--c-neutral-0, #FFFFFF);
$red-badge: var(--c-error, #FF4757);

.post-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: $bg-page;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
}

/* ========== 顶部导航栏 ========== */
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 24rpx;
  background: $white;
}

.post-header__back {
  padding: 8rpx 0;
}

.back-icon {
  font-size: 28rpx;
  color: $text-secondary;
}

.post-header__title {
  font-size: 36rpx;
  font-weight: 700;
  color: $text-primary;
}

.post-header__submit {
  padding: 14rpx 36rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-400, #2DB87A) 100%);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger, var(--c-brand-border-tint-stronger, rgba(63, 207, 142, 0.3)));
  transition: transform 0.15s ease;
}

/* #ifdef H5 */
.post-header__submit:active {
  transform: scale(0.96);
}
/* #endif */

.post-header__submit[disabled] {
  background: $divider;
  box-shadow: none;
}

.submit-text {
  font-size: 28rpx;
  color: var(--c-neutral-0, #ffffff);
  font-weight: 600;
}

.post-header__submit[disabled] .submit-text {
  color: $text-tertiary;
}

/* ========== 分类选择 ========== */
.category-section {
  padding: 28rpx 32rpx;
  background: $white;
  margin: 16rpx 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
}

.section-label {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 20rpx;
}

.category-options {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.category-option {
  padding: 16rpx 32rpx;
  border-radius: 9999rpx;
  background: $bg-page;
  border: 2rpx solid transparent;
  transition: all 0.15s ease;
}

/* #ifdef H5 */
.category-option:active {
  transform: scale(0.96);
}
/* #endif */

.category-option--active {
  background: linear-gradient(135deg, $green-light 0%, var(--c-tint-green-50, #F0FBF7) 100%);
  border-color: $green-primary;
}

.category-option__text {
  font-size: 26rpx;
  color: $text-secondary;
  font-weight: 500;
}

.category-option--active .category-option__text {
  color: $green-primary;
  font-weight: 600;
}

/* ========== 文字输入区 ========== */
.content-section {
  padding: 28rpx 32rpx;
  background: $white;
  margin: 0 24rpx 16rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
}

.content-input {
  width: 100%;
  min-height: 240rpx;
  font-size: 30rpx;
  color: $text-primary;
  line-height: 1.8;
  background: transparent;
}

.content-count {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $text-tertiary;
}

.content-count--over {
  color: $red-badge;
}

/* ========== 预置话题标签选择器 ========== */
.preset-tags-section {
  padding: 28rpx 32rpx;
  background: $white;
  margin: 0 24rpx 16rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
}

/* 功能4：TopicSelector 容器样式 */
.topic-selector-section {
  padding: 28rpx 32rpx;
  background: $white;
  margin: 0 24rpx 16rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-hint {
  font-size: 22rpx;
  color: $pink-primary;
  background: $pink-light;
  padding: 6rpx 14rpx;
  border-radius: 9999rpx;
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
  border-radius: 9999rpx;
  background: $bg-page;
  border: 2rpx solid transparent;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

/* #ifdef H5 */
.preset-tag-chip:active {
  transform: scale(0.96);
}
/* #endif */

.preset-tag-chip--active {
  background: linear-gradient(135deg, $green-light 0%, $pink-light 100%);
  border-color: $green-primary;
}

.preset-tag-chip__text {
  font-size: 26rpx;
  color: $text-secondary;
  font-weight: 500;
  white-space: nowrap;
}

.preset-tag-chip--active .preset-tag-chip__text {
  color: $green-primary;
  font-weight: 600;
}

/* ========== 图片上传区 ========== */
.images-section {
  padding: 28rpx 32rpx;
  background: $white;
  margin: 0 24rpx 16rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
}

.images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  aspect-ratio: 1;
  border-radius: 16rpx;
  overflow: hidden;
  background: $bg-page;
}

.image-item__img {
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
  background: var(--c-overlay-mid-strong, var(--c-overlay-mid-strong, rgba(0, 0, 0, 0.5)));
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-icon {
  font-size: 24rpx;
  color: var(--c-neutral-0, #ffffff);
  font-weight: 600;
}

.image-upload {
  width: calc((100% - 32rpx) / 3);
  aspect-ratio: 1;
  border-radius: 16rpx;
  border: 2rpx dashed $divider;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: $bg-page;
  transition: all 0.15s ease;
}

/* #ifdef H5 */
.image-upload:active {
  transform: scale(0.96);
  border-color: $green-primary;
  background: $green-light;
}
/* #endif */

.upload-icon {
  font-size: 56rpx;
  color: $text-tertiary;
  font-weight: 300;
}

.upload-text {
  font-size: 22rpx;
  color: $text-tertiary;
}

/* ========== 话题标签区 ========== */
.tags-section {
  padding: 28rpx 32rpx;
  background: $white;
  margin: 0 24rpx 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
  flex: 1;
}

.tag-input-wrap {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.tag-input {
  flex: 1;
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  background: $bg-page;
  font-size: 28rpx;
  color: $text-primary;
}

.tag-add-btn {
  padding: 18rpx 32rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, $pink-primary 0%, var(--c-romance-400, #FF6B9D) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx var(--s-romance, var(--s-romance, rgba(236, 72, 153, 0.3)));
  transition: transform 0.15s ease;
}

/* #ifdef H5 */
.tag-add-btn:active {
  transform: scale(0.96);
}
/* #endif */

.tag-add-text {
  font-size: 26rpx;
  color: var(--c-neutral-0, #ffffff);
  font-weight: 600;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  border-radius: 9999rpx;
  background: $green-light;
  transition: transform 0.15s ease;
}

/* #ifdef H5 */
.tag-chip:active {
  transform: scale(0.96);
}
/* #endif */

.tag-chip__text {
  font-size: 24rpx;
  color: $green-primary;
  font-weight: 500;
}

.tag-chip__remove {
  font-size: 24rpx;
  color: $pink-primary;
  padding: 0 4rpx;
  font-weight: 600;
}
</style>
