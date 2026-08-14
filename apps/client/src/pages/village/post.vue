<script setup lang="ts">
/**
 * 发帖页
 * 支持文字输入、图片上传、话题标签和分类选择
 * 新增：预置话题标签选择器，支持横向滚动多选（最多3个）
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useVillageStore } from "../../stores/village";
// 功能4：帖子创建话题选择器（带搜索 + 自定义创建）
import TopicSelector from "../../components/village/TopicSelector.vue";
import { request } from "../../services/http";
import { appEnv } from "../../services/env";
// P1-01：real 模式图片上传走 clientApi.uploadPostImage（/media/upload?type=image）
import { clientApi } from "../../services/api";
// P1-01：mock / real 模式分发判断（mock 下图片保留本地路径）
import { useMock } from "../../stores/helpers/use-mock";
// 统一常量：帖子内容/图片限制、草稿存储键、压缩质量等
import {
  POST_MAX_LENGTH,
  POST_MAX_IMAGES,
  POST_MAX_CUSTOM_TAGS,
  POST_DRAFT_STORAGE_KEY,
  POST_SUBMIT_NAVIGATE_BACK_MS,
  IMAGE_COMPRESS_QUALITY,
  DEFAULT_CATEGORY_ID,
  POST_TITLE_MIN_LENGTH,
  POST_TITLE_MAX_LENGTH,
} from "../../constants/village";
import {
  POST_DRAFT_SAVE_DEBOUNCE_MS,
  MAX_PRESET_TAGS,
} from "../../constants/chat";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../utils/privacy";

const villageStore = useVillageStore();
const { t } = useI18n();

// 注：POST_DRAFT_STORAGE_KEY 由 constants/village 统一提供

/** 帖子标题（P1-01：必填，5-30 字） */
const title = ref("");
/** 文字内容 */
const content = ref("");
/** 已上传的图片列表 */
const images = ref<string[]>([]);
/** 话题标签输入 */
const tagInput = ref("");
/** 已添加的标签列表 */
const tags = ref<string[]>([]);
/** 选中的分类（R4-00095：默认值迁移到契约枚举，兼容旧 cat-* 常量） */
const selectedCategory = ref(migrateCategory(DEFAULT_CATEGORY_ID));

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

/** 发布成功跳转定时器引用，用于卸载时清理 */
let postSubmitNavTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 页面卸载时清理所有定时器，避免内存泄漏。
 * 修复（P1 BUG）：原实现未保存 setTimeout 返回值，页面销毁后定时器仍可能触发
 * 状态修改或 navigateBack 跳转。
 */
onUnmounted(() => {
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
  }
  if (postSubmitNavTimer) {
    clearTimeout(postSubmitNavTimer);
    postSubmitNavTimer = null;
  }
});

// R4-00159：页面卸载时清理 village store 定时器/请求资源
onUnload(() => {
  villageStore.dispose();
});

// 注：POST_MAX_LENGTH / POST_MAX_IMAGES / MAX_PRESET_TAGS 由 constants 统一提供

/** 当前字数 */
const currentLength = computed(() => content.value.length);
/** 是否超出字数限制 */
const isOverLimit = computed(() => currentLength.value > POST_MAX_LENGTH);

/** 标题是否超出长度限制（P1-01） */
const isTitleOverLimit = computed(() => title.value.length > POST_TITLE_MAX_LENGTH);

/**
 * R4-00095：分类选项对齐契约（village.yaml CreatePostRequest.category
 * 枚举 [dating, study, life, activity, help]）。
 * 原 cat-sincere/hometown/mask/interest 经 toBackendCategory 映射为
 * sincere/hometown/mask/interest 与契约漂移，real 后端按枚举校验时发帖 400。
 * 现直接使用契约枚举值（不经 toBackendCategory 转换，原样透传）。
 */
const categoryOptions = computed(() => [
  { id: "dating", name: t("village.post.categoryDating") },
  { id: "study", name: t("village.post.categoryStudy") },
  { id: "life", name: t("village.post.categoryLife") },
  { id: "activity", name: t("village.post.categoryActivity") },
  { id: "help", name: t("village.post.categoryHelp") },
]);

/**
 * R4-00095：旧 cat-* 分类 → 契约枚举迁移（草稿恢复 / 默认值兼容，
 * 避免旧草稿恢复出不在选项内的分类）。
 */
function migrateCategory(id: string): string {
  const map: Record<string, string> = {
    "cat-sincere": "dating",
    "cat-hometown": "life",
    "cat-mask": "dating",
    "cat-interest": "study",
  };
  return map[id] ?? id;
}

/**
 * 加载预置话题标签（从后端获取）。
 * R4-00096：mock 与 real 失败兜底共用 i18n 预置列表（village.post.presetTags），
 * 不再在页面内硬编码中文标签；real 成功时以后端 /post-tags 返回为准。
 */
async function loadPresetTags() {
  const fallbackTags = (): string[] => [...t("village.post.presetTags")];
  try {
    if (appEnv.apiMode === "mock") {
      // Mock 模式下使用 i18n 预置标签
      presetTags.value = fallbackTags();
      return;
    }
    // Real 模式下从后端 API 获取
    const data = await request<string[]>({
      url: "/post-tags",
      method: "GET",
    });
    presetTags.value = data;
  } catch (_e) {
    // 加载失败时使用 i18n 默认列表
    presetTags.value = fallbackTags();
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
      uni.showToast({ title: t("village.post.maxTagsError", { n: MAX_PRESET_TAGS }), icon: "none" });
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
    [title, content, images, tags, tagInput, selectedCategory, selectedPresetTags, selectedTopics],
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
      title: title.value,
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
      title?: string;
      content?: string;
      images?: string[];
      tags?: string[];
      tagInput?: string;
      selectedCategory?: string;
      selectedPresetTags?: string[];
      selectedTopics?: string[];
    } | null;
    if (!draft) return;
    if (typeof draft.title === "string") {
      title.value = draft.title;
    }
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
      // R4-00095：旧 cat-* 草稿分类迁移到契约枚举
      selectedCategory.value = migrateCategory(draft.selectedCategory);
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
 *
 * Task 0.2.4：调用 chooseImage 前先调用 ensurePrivacyAuthorized 检查隐私授权。
 * - 用户已同意隐私协议 → 继续选择图片
 * - 用户拒绝或未授权 → 提示并终止
 * - H5/APP 环境不支持隐私 API → 直接通过
 */
async function chooseImage() {
  if (images.value.length >= POST_MAX_IMAGES) {
    uni.showToast({ title: t("village.post.maxImagesError", { n: POST_MAX_IMAGES }), icon: "none" });
    return;
  }

  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({
      title: t("village.post.privacyRequiredImage"),
      icon: "none",
    });
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
      // infra R2-00073: 选择图片失败给出用户可见反馈（原仅 console.error 静默）
      console.error("选择图片失败:", err);
      uni.showToast({ title: t("village.post.selectImageFailed"), icon: "none" });
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
    uni.showToast({ title: t("village.post.tagExists"), icon: "none" });
    return;
  }

  if (tags.value.length >= POST_MAX_CUSTOM_TAGS) {
    uni.showToast({ title: t("village.post.maxCustomTagsError", { n: POST_MAX_CUSTOM_TAGS }), icon: "none" });
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
  const trimmedTitle = title.value.trim();
  // P1-01：标题必填 + 长度校验（5-30 字）
  if (trimmedTitle.length < POST_TITLE_MIN_LENGTH || trimmedTitle.length > POST_TITLE_MAX_LENGTH) {
    uni.showToast({
      title: t("village.post.titleInvalid", { min: POST_TITLE_MIN_LENGTH, max: POST_TITLE_MAX_LENGTH }),
      icon: "none",
    });
    return;
  }

  if (!content.value.trim()) {
    uni.showToast({ title: t("village.contentRequired"), icon: "none" });
    return;
  }

  if (isOverLimit.value) {
    uni.showToast({ title: t("village.post.contentTooLong", { n: POST_MAX_LENGTH }), icon: "none" });
    return;
  }

  try {
    // 合并预置标签、自定义标签与 TopicSelector 已选话题（review #23：selectedTopics 不再丢失）
    // TopicSelector 的话题不带 # 前缀，统一补上后去重合并
    const topicTags = selectedTopics.value.map((topic) =>
      topic.startsWith("#") ? topic : `#${topic}`
    );
    const allTags = [
      ...new Set([...selectedPresetTags.value, ...tags.value, ...topicTags]),
    ];

    // P1-01：real 模式先将本地临时图片逐个上传换取 URL 再提交；
    // mock 模式继续使用本地路径（后端 mock 无上传端点，保持原行为不破坏）。
    let finalImages = images.value;
    const localImages = images.value.filter((img) => !/^https?:\/\//.test(img));
    if (localImages.length > 0 && !useMock()) {
      uni.showLoading({ title: t("village.post.uploadingImages") });
      try {
        const uploadedUrls: string[] = [];
        for (const img of localImages) {
          const result = await clientApi.uploadPostImage({
            name: `post-image-${Date.now()}.jpg`,
            path: img,
          });
          uploadedUrls.push(result.url);
        }
        // 已上传成功的图片换成远端 URL（顺序与选择顺序一致），原先已是 http 的保留
        finalImages = [
          ...images.value.filter((img) => /^https?:\/\//.test(img)),
          ...uploadedUrls,
        ];
      } catch (error) {
        console.error("帖子图片上传失败:", error);
        uni.hideLoading();
        uni.showToast({ title: t("village.post.imageUploadFailed"), icon: "none" });
        return;
      } finally {
        uni.hideLoading();
      }
    }

    await villageStore.createPost({
      categoryId: selectedCategory.value,
      title: trimmedTitle,
      content: content.value.trim(),
      images: finalImages,
      tags: allTags,
    });

    // 发布成功后清除草稿，避免下次进入页面恢复已发布内容
    clearDraft();
    uni.showToast({ title: t("village.postSuccess"), icon: "success" });
    if (postSubmitNavTimer) clearTimeout(postSubmitNavTimer);
    postSubmitNavTimer = setTimeout(() => {
      uni.navigateBack();
      postSubmitNavTimer = null;
    }, POST_SUBMIT_NAVIGATE_BACK_MS);
  } catch (_error) {
    uni.showToast({
      title: villageStore.errorMessage || t("village.post.publishFailed"),
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
      <view class="post-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="back-icon">{{ t("common.back") }}</text>
      </view>
      <text class="post-header__title">{{ t("village.post.headerTitle") }}</text>
      <button
        class="post-header__submit"
        :disabled="!title.trim() || isTitleOverLimit || !content.trim() || isOverLimit"
        @tap="submitPost"
      >
        <text class="submit-text">{{ t("village.submit") }}</text>
      </button>
    </view>

    <!-- P1-01：标题输入（必填，5-30 字；样式参考 circles/post-topic 标题输入） -->
    <view class="title-section">
      <text class="section-label">{{ t("village.post.titleLabel") }}</text>
      <input
        v-model="title"
        class="title-input"
        :class="{ 'title-input--over': isTitleOverLimit }"
        :placeholder="t('village.post.titlePlaceholder')"
        :maxlength="POST_TITLE_MAX_LENGTH"
        :aria-label="t('village.post.titlePlaceholder')"
      />
      <view class="title-count" :class="{ 'title-count--over': isTitleOverLimit }">
        <text>{{ title.length }}/{{ POST_TITLE_MAX_LENGTH }}</text>
      </view>
    </view>

    <!-- 分类选择 -->
    <view class="category-section">
      <text class="section-label">{{ t("village.post.selectCategory") }}</text>
      <view class="category-options">
        <view
          v-for="cat in categoryOptions" :key="cat.id"
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
        :placeholder="t('village.post.contentPlaceholder')"
        :maxlength="POST_MAX_LENGTH"
        :show-confirm-bar="false" :aria-label="t('village.post.contentPlaceholder')"
      />
      <view class="content-count" :class="{ 'content-count--over': isOverLimit }">
        <text>{{ currentLength }}/{{ POST_MAX_LENGTH }}</text>
      </view>
    </view>

    <!-- 预置话题标签选择器 -->
    <view class="preset-tags-section">
      <view class="section-header">
        <text class="section-label">{{ t("village.post.topicTags") }}</text>
        <text class="section-hint">{{ t("village.post.topicTagsHint", { n: MAX_PRESET_TAGS }) }}</text>
      </view>
      <scroll-view class="preset-tags-scroll" scroll-x :show-scrollbar="false" :enhanced="true">
        <view class="preset-tags-inner">
          <view
            v-for="tag in presetTags" :key="tag"
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
          v-for="(img, idx) in images" :key="idx"
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
          <view class="image-upload__inner">
            <text class="upload-icon">+</text>
            <text class="upload-text">{{ images.length }}/{{ POST_MAX_IMAGES }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 话题标签区 -->
    <view class="tags-section">
      <text class="section-label">{{ t("village.post.topicTags") }}</text>
      <view class="tag-input-wrap">
        <input
          v-model="tagInput"
          class="tag-input"
          :placeholder="t('village.post.tagInputPlaceholder')"
          confirm-type="done"
          @confirm="onTagConfirm" :aria-label="t('village.post.tagInputPlaceholder')"
        />
        <view class="tag-add-btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="addTag">
          <text class="tag-add-text">{{ t("village.post.addTag") }}</text>
        </view>
      </view>
      <view v-if="tags.length > 0" class="tag-list" role="list">
        <view
          v-for="(tag, idx) in tags" :key="idx"
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
$green-primary: var(--c-brand);
$green-light: var(--c-tint-green-50);
$pink-primary: var(--c-romance-500);
$pink-light: var(--c-tint-pink-soft);
$bg-page: var(--c-bg-page);
/* ui-ux 修复：$text-primary 统一为文本次要色 token（原 --c-neutral-800 语义漂移） */
$text-primary: var(--c-text-primary);
/* ui-ux 修复：$text-secondary 语义应为文本次要色（原映射到 tertiary） */
$text-secondary: var(--c-text-secondary);
$text-tertiary: var(--c-text-quaternary);
$divider: var(--c-neutral-100);
$white: var(--c-neutral-0);
$red-badge: var(--c-error);

.post-page {
  display: flex;
  flex-direction: column;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
  background: $bg-page;
  padding-top: calc(env(safe-area-inset-top) + 24rpx);
}

/* ========== 顶部导航栏 ========== */
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 24rpx;
  /* R4-02539：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
}

.post-header__back {
  padding: 8rpx 0;
}

.back-icon {
  font-size: var(--fs-lg, 28rpx);
  color: $text-secondary;
}

.post-header__title {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  color: $text-primary;
}

.post-header__submit {
  padding: 14rpx 36rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-400) 100%);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger);
  transition: transform var(--d-fast, 120ms) ease;
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
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-neutral-0);
  font-weight: 600;
}

.post-header__submit[disabled] .submit-text {
  color: $text-tertiary;
}

/* ========== P1-01：标题输入区（样式参考 circles/post-topic 标题输入） ========== */
.title-section {
  padding: 28rpx 32rpx;
  /* R4-02539：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  margin: 16rpx 24rpx 0;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);
}

.title-input {
  width: 100%;
  font-size: var(--fs-xl, 30rpx);
  font-weight: 600;
  color: $text-primary;
  padding: 16rpx 20rpx;
  border-radius: var(--r-lg, 16rpx);
  background: $bg-page;
  border: 2rpx solid transparent;
  transition: all var(--d-normal, 200ms) ease;
  box-sizing: border-box;
}

.title-input--over {
  border-color: $red-badge;
}

.title-count {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.title-count--over {
  color: $red-badge;
}

/* ========== 分类选择 ========== */
.category-section {
  padding: 28rpx 32rpx;
  /* R4-02539：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  margin: 16rpx 24rpx;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);
}

.section-label {
  display: block;
  font-size: var(--fs-lg, 28rpx);
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
  border-radius: var(--r-full, 9999rpx);
  background: $bg-page;
  border: 2rpx solid transparent;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.category-option:active {
  transform: scale(0.96);
}
/* #endif */

.category-option--active {
  background: linear-gradient(135deg, $green-light 0%, var(--c-tint-green-50) 100%);
  border-color: $green-primary;
}

.category-option__text {
  font-size: var(--fs-md, 26rpx);
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
  /* R4-02539：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  margin: 0 24rpx 16rpx;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);
}

.content-input {
  width: 100%;
  min-height: 240rpx;
  font-size: var(--fs-xl, 30rpx);
  color: $text-primary;
  line-height: 1.8;
  background: transparent;
}

.content-count {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.content-count--over {
  color: $red-badge;
}

/* ========== 预置话题标签选择器 ========== */
.preset-tags-section {
  padding: 28rpx 32rpx;
  /* R4-02539：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  margin: 0 24rpx 16rpx;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);
}

/* 功能4：TopicSelector 容器样式 */
.topic-selector-section {
  padding: 28rpx 32rpx;
  /* R4-02539：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  margin: 0 24rpx 16rpx;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.section-hint {
  font-size: var(--fs-sm, 22rpx);
  color: $pink-primary;
  background: $pink-light;
  padding: 6rpx 14rpx;
  border-radius: var(--r-full, 9999rpx);
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
  border-radius: var(--r-full, 9999rpx);
  background: $bg-page;
  border: 2rpx solid transparent;
  transition: all var(--d-fast, 120ms) ease;
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
  font-size: var(--fs-md, 26rpx);
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
  /* R4-02539：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  margin: 0 24rpx 16rpx;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);
}

.images-grid {
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
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-mid-strong);
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-icon {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-neutral-0);
  font-weight: 600;
}

.image-upload {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  /* mp-weixin 不支持 aspect-ratio，改用 padding-top 百分比（1:1 → 100%） */
  padding-top: calc((100% - 32rpx) / 3);
  border-radius: var(--r-lg, 16rpx);
  border: 2rpx dashed $divider;
  background: $bg-page;
  transition: all var(--d-fast, 120ms) ease;
  overflow: hidden;
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
}

.upload-text {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

/* ========== 话题标签区 ========== */
.tags-section {
  padding: 28rpx 32rpx;
  /* R4-02539：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  margin: 0 24rpx 24rpx;
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);
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
  border-radius: var(--r-lg, 16rpx);
  background: $bg-page;
  font-size: var(--fs-lg, 28rpx);
  color: $text-primary;
}

.tag-add-btn {
  padding: 18rpx 32rpx;
  border-radius: var(--r-lg, 16rpx);
  background: linear-gradient(135deg, $pink-primary 0%, var(--c-romance-400) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx var(--s-romance);
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.tag-add-btn:active {
  transform: scale(0.96);
}
/* #endif */

.tag-add-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-neutral-0);
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
  border-radius: var(--r-full, 9999rpx);
  background: $green-light;
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.tag-chip:active {
  transform: scale(0.96);
}
/* #endif */

.tag-chip__text {
  font-size: var(--fs-base, 24rpx);
  color: $green-primary;
  font-weight: 500;
}

.tag-chip__remove {
  font-size: var(--fs-base, 24rpx);
  color: $pink-primary;
  padding: 0 4rpx;
  font-weight: 600;
}
</style>
