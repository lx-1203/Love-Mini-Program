<script setup lang="ts">
/**
 * 发布话题页
 * 支持标题输入、内容输入、可选图片上传
 */
import { ref, computed, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useCircleStore } from "../../stores/circle";
import { useVillageStore } from "../../stores/village";
import { useActivityStore, type ActivityItem } from "../../stores/activity";
// 图片上传链路（review #2 / R4-00071）：真实模式下需先上传拿 URL 再提交，mock 模式保留本地路径
import { useMock } from "../../stores/helpers/use-mock";
import { clientApi } from "../../services/api";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../utils/privacy";
import { getChannelConfig } from "../../config/channels";
import { IMAGE_PATHS } from "../../config/images";
import ActivityCard from "../../components/village/ActivityCard.vue";

const { t } = useI18n();
const circleStore = useCircleStore();
const villageStore = useVillageStore();
const activityStore = useActivityStore();

/** 话题标题 */
const title = ref("");
/** 话题内容 */
const content = ref("");
/** 已上传的图片列表 */
const images = ref<string[]>([]);
/** 当前兴趣圈 ID */
const circleId = ref("");

/* ========== Task B5：发帖编辑页增强 ========== */
/** 发布目标（校园圈 / 兴趣圈） */
const publishTarget = ref<"campus" | "interest">("campus");
/** 兴趣圈模式下选择的兴趣分类 ID（如 study/sports/music/...） */
const interestCategory = ref("");
/** 已选话题标签（存 i18n key，最多 MAX_TAGS 个） */
const selectedTags = ref<string[]>([]);
/** 是否标记为喜爱内容 */
const favoriteEnabled = ref(false);
/** 话题标签最大选择数 */
const MAX_TAGS = 3;

/** 预设话题标签（i18n key 列表，文案统一走 vue-i18n） */
const PRESET_TAG_KEYS = [
  "circle.tagDating",
  "circle.tagStudy",
  "circle.tagTeamUp",
  "circle.tagTreehole",
  "circle.tagShare",
  "circle.tagHelp",
  "circle.tagRant",
];

/** 兴趣分类映射（与圈子 Tab 兴趣分类宫格保持一致） */
const INTEREST_CATEGORY_KEY_MAP: Array<{ id: string; key: string }> = [
  { id: "study", key: "circle.catStudy" },
  { id: "sports", key: "circle.catSports" },
  { id: "music", key: "circle.catMusic" },
  { id: "movie", key: "circle.catMovie" },
  { id: "travel", key: "circle.catTravel" },
  { id: "game", key: "circle.catGame" },
  { id: "food", key: "circle.catFood" },
  { id: "reading", key: "circle.catReading" },
];

/** 预设标签展示列表（已翻译文案） */
const presetTagList = computed(() => PRESET_TAG_KEYS.map((key) => ({ key, label: t(key) })));

/** 兴趣分类展示列表（已翻译文案） */
const interestCategoryList = computed(() =>
  INTEREST_CATEGORY_KEY_MAP.map((cat) => ({ id: cat.id, name: t(cat.key) }))
);

/** 当前发布目标圈子名称（校园圈 / 兴趣分类名） */
const targetName = computed(() => {
  if (publishTarget.value === "campus") return t("circle.postTopicTargetCampus");
  const cat = interestCategoryList.value.find((c) => c.id === interestCategory.value);
  return cat ? cat.name : t("circle.postTopicCategoryHint");
});

/** 切换发布目标（切回校园圈时清空兴趣分类选择） */
function selectPublishTarget(target: "campus" | "interest") {
  publishTarget.value = target;
  if (target === "campus") {
    interestCategory.value = "";
  }
}

/** 选择兴趣分类 */
function selectInterestCategory(id: string) {
  interestCategory.value = id;
}

/** 切换话题标签（最多 MAX_TAGS 个，超出提示） */
function toggleTag(tagKey: string) {
  const idx = selectedTags.value.indexOf(tagKey);
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1);
    return;
  }
  if (selectedTags.value.length >= MAX_TAGS) {
    uni.showToast({ title: t("circle.postTopicMaxTags", { n: MAX_TAGS }), icon: "none" });
    return;
  }
  selectedTags.value.push(tagKey);
}

/** 切换「喜爱」开关 */
function toggleFavorite() {
  favoriteEnabled.value = !favoriteEnabled.value;
}

/** 最大字数 */
const MAX_LENGTH = 500;
/** 最大图片数 */
const MAX_IMAGES = 9;

/**
 * switch 品牌色：小程序 switch 的 color 为原生属性，不支持 CSS 变量，
 * 此处取 design token --c-brand 的实际色值，与主题保持一致（ui-ux B9 修复）。
 */
const brandColor = "#3FCF8E";

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
    uni.showToast({ title: t("circle.postTopicMaxImages", { max: MAX_IMAGES }), icon: "none" });
    return;
  }

  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({
      title: t("circle.postTopicPrivacyRequired"),
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

/** 是否正在提交（review #22：防重复提交） */
const isSubmitting = ref(false);

/* ========== 2026-08-08 频道化重构：帖子模式 + 关联活动 ========== */

/** 来源频道（today/school/activity 走帖子模式；interest/空走话题模式） */
const sourceChannel = ref<string>("");
/** 帖子模式下是否已发布成功（发布后 emit 事件刷新圈子页） */
const postedChannel = ref<string>("");

/** 是否帖子模式（发帖进 posts 流：今日广场/学校圈/活动频道） */
const isPostMode = computed(() =>
  ["today", "school", "activity"].includes(sourceChannel.value)
);

/** 帖子模式下的后端分类（由频道配置推导） */
const postCategory = computed(() => {
  const cfg = getChannelConfig(sourceChannel.value);
  return cfg?.postCategory ?? "all";
});

/** 已选关联活动（帖子模式） */
const selectedActivity = ref<ActivityItem | null>(null);
/** 是否显示活动选择弹层 */
const showActivityPicker = ref(false);
/** 活动选择列表（前 10 条） */
const activityOptions = ref<ActivityItem[]>([]);
/** 活动列表是否加载中 */
const loadingActivities = ref(false);

/** 打开活动选择弹层（懒加载活动列表） */
async function openActivityPicker() {
  if (activityOptions.value.length === 0) {
    loadingActivities.value = true;
    try {
      await activityStore.fetchActivities();
      activityOptions.value = activityStore.activities.slice(0, 10);
    } catch (_e) {
      activityOptions.value = [];
    } finally {
      loadingActivities.value = false;
    }
  }
  showActivityPicker.value = true;
}

function selectActivity(act: ActivityItem) {
  selectedActivity.value = act;
  showActivityPicker.value = false;
}

function removeActivity() {
  selectedActivity.value = null;
}

/**
 * 发布话题
 */
async function submitTopic() {
  if (isSubmitting.value) return;
  if (!title.value.trim()) {
    uni.showToast({ title: t("circle.postTopicErrTitle"), icon: "none" });
    return;
  }

  if (!content.value.trim()) {
    uni.showToast({ title: t("circle.postTopicErrContent"), icon: "none" });
    return;
  }

  if (isOverLimit.value) {
    uni.showToast({ title: t("circle.postTopicErrContentTooLong", { max: MAX_LENGTH }), icon: "none" });
    return;
  }

  isSubmitting.value = true;
  try {
    // 2026-08-08 频道化重构：帖子模式（今日广场/学校圈/活动）→ 走 posts 流，发布后圈子页可见
    if (isPostMode.value) {
      // 帖子标题需满足后端 5-30 字校验
      if (title.value.trim().length < 5) {
        uni.showToast({ title: t("circle.postTopicErrTitleTooShort"), icon: "none" });
        isSubmitting.value = false;
        return;
      }
      await villageStore.createPost({
        categoryId: `cat-${postCategory.value}`,
        title: title.value.trim(),
        content: content.value.trim(),
        images: images.value,
        tags: selectedTags.value.map((key) => t(key)),
        activityId: selectedActivity.value ? String(selectedActivity.value.id) : undefined,
      });
      // 通知圈子页刷新当前频道（post-topic 发布成功）
      postedChannel.value = sourceChannel.value;
      uni.$emit("village:post-created");
      uni.showToast({ title: t("circle.postTopicPublishSuccess"), icon: "success" });
      if (postSuccessNavTimer) clearTimeout(postSuccessNavTimer);
      postSuccessNavTimer = setTimeout(() => {
        postSuccessNavTimer = null;
        uni.navigateBack();
      }, 800);
      return;
    }

    // Task B5：解析目标圈子 ID —— 优先使用入口参数 circleId；
    // 否则按发布目标推导（兴趣圈 → 兴趣分类 ID；校园圈 → 兜底 "campus-circle"）
    const resolvedCircleId =
      circleId.value ||
      (publishTarget.value === "interest" && interestCategory.value
        ? interestCategory.value
        : "campus-circle");

    // 修复（review #22）：提交翻译后的标签文本，而不是 i18n key
    const tagTexts = selectedTags.value.map((key) => t(key));

    // 修复（R4-00071）：话题图片本地临时路径（tempFilePath）在 real 模式
    // 先经 clientApi.uploadPostImage（/media/upload）逐张上传换取可访问 URL，
    // 再随 createTopic 提交，避免话题配图在 real 模式全部裂图。
    // mock 模式下 clientApi.uploadPostImage 内部返回原路径，行为不变。
    const localImages = images.value.filter((img) => !/^https?:\/\//.test(img));
    let submitImages = images.value;
    if (localImages.length > 0 && !useMock()) {
      const uploaded: string[] = [];
      for (const img of images.value) {
        if (/^https?:\/\//.test(img)) {
          uploaded.push(img);
          continue;
        }
        const result = await clientApi.uploadPostImage({ name: "topic.jpg", path: img });
        uploaded.push(result?.url ?? img);
      }
      submitImages = uploaded;
    }

    await circleStore.createTopic(resolvedCircleId, {
      title: title.value.trim(),
      content: content.value.trim(),
      images: submitImages,
      tags: tagTexts,
      favorite: favoriteEnabled.value,
    });

    uni.showToast({ title: t("circle.postTopicPublishSuccess"), icon: "success" });
    // SubTask 1.5.2：保存跳转定时器引用，卸载时统一清理
    if (postSuccessNavTimer) clearTimeout(postSuccessNavTimer);
    postSuccessNavTimer = setTimeout(() => {
      postSuccessNavTimer = null;
      uni.navigateBack();
    }, 800);
  } catch (_e) {
    uni.showToast({
      title: circleStore.errorMessage || t("circle.postTopicPublishFailed"),
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

// 获取页面参数
const pages = getCurrentPages();
const currentPage = pages[pages.length - 1];
const options = (currentPage as { options?: Record<string, string> })?.options ?? {};
circleId.value = options.circleId || "";
// 2026-08-08 频道化重构：帖子模式来源频道 + 预选活动
sourceChannel.value = options.channel || "";
if (options.activityId) {
  const actId = options.activityId;
  // 预选活动：从活动列表查（懒加载后回填）
  void activityStore.fetchActivities().then(() => {
    const found = activityStore.activities.find((a) => String(a.id) === actId);
    if (found) selectedActivity.value = found;
  });
}
</script>

<template>
  <view class="post-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航栏 -->
    <view class="post-header">
      <view class="post-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="back-icon">{{ t("circle.postTopicBack") }}</text>
      </view>
      <text class="post-header__title">{{ t("circle.postTopicNavTitle") }}</text>
      <view
        class="post-header__submit press-feedback"
        :class="{ 'post-header__submit--disabled': !title.trim() || !content.trim() || isOverLimit }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="submitTopic"
      >
        <text class="submit-text">{{ t("circle.postTopicSubmit") }}</text>
      </view>
    </view>

    <scroll-view class="post-body" scroll-y>
      <!-- 标题输入 -->
      <view class="title-section">
        <input
          v-model="title"
          class="title-input"
          :placeholder="t('circle.postTopicTitlePlaceholder')"
          maxlength="50" :aria-label="t('circle.postTopicTitleAria')"
        />
      </view>

      <!-- 内容输入区 -->
      <view class="content-section">
        <textarea
          v-model="content"
          class="content-input"
          :placeholder="t('circle.postTopicContentPlaceholder')"
          maxlength="500"
          :show-confirm-bar="false" :aria-label="t('circle.postTopicContentAria')"
        />
        <view class="content-count" :class="{ 'content-count--over': isOverLimit }">
          <text>{{ currentLength }}/{{ MAX_LENGTH }}</text>
        </view>
      </view>

      <!-- ===== 发布到圈子选择器（Task B5） ===== -->
      <view class="target-section">
        <text class="section-label">{{ t('circle.postTopicPublishTo') }}</text>
        <view class="target-options" role="radiogroup">
          <view
            class="target-chip press-feedback"
            :class="{ 'target-chip--active': publishTarget === 'campus' }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="radio"
            :aria-checked="publishTarget === 'campus'"
            :aria-label="t('circle.postTopicTargetCampusAria')"
            @tap="selectPublishTarget('campus')"
          >
            <text class="target-chip__text">{{ t('circle.postTopicTargetCampus') }}</text>
          </view>
          <view
            class="target-chip press-feedback"
            :class="{ 'target-chip--active': publishTarget === 'interest' }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="radio"
            :aria-checked="publishTarget === 'interest'"
            :aria-label="t('circle.postTopicTargetInterestAria')"
            @tap="selectPublishTarget('interest')"
          >
            <text class="target-chip__text">{{ t('circle.postTopicTargetInterest') }}</text>
          </view>
        </view>

        <!-- 兴趣圈模式：兴趣分类选择 -->
        <view v-if="publishTarget === 'interest'" class="category-options">
          <view
            v-for="cat in interestCategoryList" :key="cat.id"
            class="category-chip press-feedback"
            :class="{ 'category-chip--active': interestCategory === cat.id }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('circle.postTopicTagAria', { label: cat.name })"
            :aria-pressed="interestCategory === cat.id"
            @tap="selectInterestCategory(cat.id)"
          >
            <text class="category-chip__text">{{ cat.name }}</text>
          </view>
        </view>

        <!-- 当前发布目标圈子名称 -->
        <view class="target-name">
          <text class="target-name__text">{{ t('circle.postTopicSelectedTarget', { name: targetName }) }}</text>
        </view>
      </view>

      <!-- ===== 话题标签多选（Task B5，最多 3 个） ===== -->
      <view class="tags-section">
        <view class="tags-section__header">
          <text class="section-label">{{ t('circle.postTopicTagsLabel') }}</text>
          <text class="tags-section__hint">{{ t('circle.postTopicTagsHint', { n: MAX_TAGS }) }}</text>
        </view>
        <view class="tags-list">
          <view
            v-for="tag in presetTagList" :key="tag.key"
            class="tag-chip press-feedback"
            :class="{ 'tag-chip--active': selectedTags.includes(tag.key) }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('circle.postTopicTagAria', { label: tag.label })"
            :aria-pressed="selectedTags.includes(tag.key)"
            @tap="toggleTag(tag.key)"
          >
            <text class="tag-chip__text">{{ tag.label }}</text>
          </view>
        </view>
      </view>

      <!-- ===== 2026-08-08 频道化重构：关联活动（帖子模式；发活动链接帖） ===== -->
      <view v-if="isPostMode" class="activity-section">
        <text class="section-label">{{ t('circle.postTopicActivityLabel') }}</text>
        <view v-if="!selectedActivity" class="activity-empty">
          <view
            class="activity-add press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('circle.postTopicActivityPick')"
            @tap="openActivityPicker"
          >
            <text class="activity-add__icon">+</text>
            <text class="activity-add__text">{{ t('circle.postTopicActivityPick') }}</text>
          </view>
        </view>
        <view v-else class="activity-selected">
          <ActivityCard :activity="selectedActivity" compact />
          <view
            class="activity-remove press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('circle.postTopicActivityRemove')"
            @tap="removeActivity"
          >
            <text class="activity-remove__text">{{ t('circle.postTopicActivityRemove') }}</text>
          </view>
        </view>
      </view>

      <!-- ===== 喜爱标签开关（Task B5） ===== -->
      <view class="favorite-section">
        <view class="favorite-section__left">
          <text class="favorite-section__title">{{ t('circle.postTopicFavoriteLabel') }}</text>
          <text class="favorite-section__desc">{{ t('circle.postTopicFavoriteDesc') }}</text>
        </view>
        <switch
          :checked="favoriteEnabled"
          :color="brandColor"
          @change="toggleFavorite"
          :aria-label="t('circle.postTopicFavoriteLabel')"
        />
      </view>

      <!-- 图片上传区 -->
      <view class="images-section">
        <text class="section-label">{{ t("circle.postTopicImageSectionLabel") }}</text>
        <view class="images-list" role="list">
          <view
            v-for="(img, idx) in images" :key="idx"
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
          <text class="bottom-submit__text">{{ t("circle.postTopicNavTitle") }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- ===== 2026-08-08 频道化重构：活动选择弹层（帖子模式） ===== -->
    <view v-if="showActivityPicker" class="activity-picker" role="button" :aria-label="t('common.closeAria')" @tap="showActivityPicker = false">
      <view class="activity-picker__content" catchtap="noop">
        <view class="activity-picker__header">
          <text class="activity-picker__title">{{ t('circle.postTopicActivityPick') }}</text>
          <image class="activity-picker__close" role="button" :aria-label="t('common.closeAria')" @tap="showActivityPicker = false" :src="IMAGE_PATHS.ICONS_COMMON.CLOSE_SVG" mode="aspectFit" alt="" />
        </view>
        <scroll-view scroll-y class="activity-picker__list" :show-scrollbar="false">
          <view v-if="loadingActivities" class="activity-picker__loading">
            <text class="activity-picker__loading-text">{{ t('common.loading') }}</text>
          </view>
          <view
            v-for="act in activityOptions"
            :key="act.id"
            class="activity-picker__item press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="100"
            role="button"
            :aria-label="act.title"
            @tap="selectActivity(act)"
          >
            <view class="activity-picker__item-info">
              <text class="activity-picker__item-title">{{ act.title }}</text>
              <text class="activity-picker__item-meta">{{ act.scheduleText }} · {{ act.location }}</text>
            </view>
            <text class="activity-picker__item-check">›</text>
          </view>
          <view v-if="!loadingActivities && activityOptions.length === 0" class="activity-picker__empty">
            <text class="activity-picker__empty-text">{{ t('circle.postTopicActivityEmpty') }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
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
  min-height: 280rpx;
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

/* ========== Task B5：发布到圈子选择器 ========== */
.target-section {
  padding: 28rpx;
  background: $white;
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.target-options {
  display: flex;
  gap: 16rpx;
}

.target-chip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
  border-radius: var(--r-lg, 16rpx);
  border: 2rpx solid $border-light;
  background: $bg-page;
  transition: all var(--d-fast, 120ms) ease;
}

.target-chip--active {
  background: $green-light;
  border-color: $green-primary;
}

.target-chip__text {
  font-size: var(--fs-md, 26rpx);
  color: $text-secondary;
  font-weight: 500;
}

.target-chip--active .target-chip__text {
  color: $green-primary;
  font-weight: 700;
}

.category-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 20rpx;
}

.category-chip {
  padding: 12rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
  border: 2rpx solid $border-light;
  background: $bg-page;
  transition: all var(--d-fast, 120ms) ease;
}

.category-chip--active {
  background: $green-light;
  border-color: $green-primary;
}

.category-chip__text {
  font-size: var(--fs-sm, 22rpx);
  color: $text-secondary;
  font-weight: 500;
}

.category-chip--active .category-chip__text {
  color: $green-primary;
  font-weight: 700;
}

.target-name {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  border-radius: var(--r-lg, 16rpx);
  background: $bg-page;
}

.target-name__text {
  font-size: var(--fs-md, 26rpx);
  color: $green-primary;
  font-weight: 600;
}

/* ========== Task B5：话题标签多选 ========== */
.tags-section {
  padding: 28rpx;
  background: $white;
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.tags-section__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.tags-section__header .section-label {
  margin-bottom: 0;
}

.tags-section__hint {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-chip {
  padding: 12rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
  border: 2rpx solid $border-light;
  background: $bg-page;
  transition: all var(--d-fast, 120ms) ease;
}

.tag-chip--active {
  background: $green-light;
  border-color: $green-primary;
}

.tag-chip__text {
  font-size: var(--fs-md, 26rpx);
  color: $text-secondary;
  font-weight: 500;
}

.tag-chip--active .tag-chip__text {
  color: $green-primary;
  font-weight: 700;
}

/* ========== Task B5：喜爱标签开关 ========== */
.favorite-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  background: $white;
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.favorite-section__left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
  min-width: 0;
}

.favorite-section__title {
  font-size: var(--fs-md, 26rpx);
  color: $text-primary;
  font-weight: 600;
}

.favorite-section__desc {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
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
  border-radius: var(--r-circle, 50%);
  background: var(--c-gradient-mask-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.image-item__remove:active {
  transform: scale(0.9);
}
/* #endif */

.remove-icon {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse);
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
  transition: all var(--d-fast, 120ms) ease;
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

/* ================================================================
   2026-08-08 频道化重构：关联活动选择区（帖子模式）
   ================================================================ */
.activity-section {
  margin: var(--sp-5) var(--sp-5) 0;
}

.activity-add {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-lg);
  border: 1rpx dashed var(--c-brand-300, #86e8c8);
  background: var(--c-bg-brand-soft, #f0fdf9);
}

.activity-add__icon {
  font-size: 32rpx;
  color: var(--c-brand-500);
  font-weight: 600;
}

.activity-add__text {
  font-size: var(--fs-base, 28rpx);
  color: var(--c-brand-500);
  font-weight: 500;
}

.activity-selected {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.activity-remove {
  align-self: flex-end;
  padding: 6rpx 20rpx;
  border-radius: var(--r-full);
  border: 1rpx solid var(--c-neutral-100, #eef1f6);
}

.activity-remove__text {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}

/* 活动选择弹层 */
.activity-picker {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 1000);
  background: var(--c-overlay-bg, rgba(0, 0, 0, 0.45));
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-picker__content {
  width: 640rpx;
  max-height: 70vh;
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  padding: var(--sp-5);
  display: flex;
  flex-direction: column;
}

.activity-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--sp-4);
  border-bottom: 1rpx solid var(--c-divider-light, #f0f0f0);
}

.activity-picker__title {
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.activity-picker__close {
  width: 32rpx;
  height: 32rpx;
  padding: 4rpx 12rpx;
}

.activity-picker__list {
  margin-top: var(--sp-4);
  max-height: 50vh;
}

.activity-picker__loading,
.activity-picker__empty {
  padding: var(--sp-8) 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-picker__loading-text,
.activity-picker__empty-text {
  font-size: var(--fs-base, 28rpx);
  color: var(--c-text-tertiary);
}

.activity-picker__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--r-lg, 20rpx);
}

.activity-picker__item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.activity-picker__item-title {
  font-size: var(--fs-base, 28rpx);
  color: var(--c-text-primary);
  font-weight: 500;
}

.activity-picker__item-meta {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}

.activity-picker__item-check {
  color: var(--c-brand-500, #3fcf8e);
  font-size: 28rpx;
}
</style>
