<script setup lang="ts">
/**
 * 发布动态页（village/post）
 *
 * 对齐「发布动态」理想图流式布局（替代原论坛式发帖表单）：
 *  顶部导航（X 关闭 + 发布动态 + 深绿胶囊发布按钮）
 *  发布到选择器（个人动态/校园圈/兴趣圈）→ 正文输入 → 图片九宫格
 *  附加功能（添加话题/位置/提及/谁可以看）→ 发帖小贴士 → 底部工具栏
 *
 * 保留既有发布提交链路与路由（ROUTES.VILLAGE.POST=/subpackages/village/village/post）：
 *  - real 模式本地图片经 clientApi.uploadPostImage 上传换取 URL 后再提交；
 *  - mock 模式沿用本地路径；
 *  - 圈内目标走 circleStore.createTopic，其余走 villageStore.createPost；
 *  - 草稿写入本地 storage(POST_DRAFT_STORAGE_KEY)，进入自动恢复、发布成功清除。
 */
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useVillageStore } from "../../../stores/village";
import { useCircleStore, type CircleItem } from "../../../stores/circle";
import { clientApi } from "../../../services/api";
import { useMock } from "../../../stores/helpers/use-mock";
import { IMAGE_PATHS } from "../../../config/images";
import {
  POST_MAX_LENGTH,
  POST_MAX_IMAGES,
  POST_MAX_CUSTOM_TAGS,
  POST_DRAFT_STORAGE_KEY,
  POST_SUBMIT_NAVIGATE_BACK_MS,
  IMAGE_COMPRESS_QUALITY,
} from "../../../constants/village";
import { POST_DRAFT_SAVE_DEBOUNCE_MS } from "../../../constants/chat";
// 调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../../utils/privacy";
// R20（2026-09-08）：post-header 此前无状态栏留白（padding: 24rpx 32rpx 起步），
// 全局自定义导航下系统时间与「发布动态」标题叠印（P0 显示 Bug）→ JS 注入 statusBarHeight
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";

const statusBarHeightPx = useStatusBarHeight();

const villageStore = useVillageStore();
const circleStore = useCircleStore();
const { t } = useI18n();

/** 标题（2026-09-05 R17 小红书化：独立可编辑标题，20 字内） */
const TITLE_MAX_LENGTH = 20;
const title = ref("");
/** 正文内容 */
const content = ref("");
/** 已选图片（本地临时路径 / 远端 http URL） */
const images = ref<string[]>([]);
/** 话题标签（# 前缀） */
const topics = ref<string[]>([]);
/** 位置（可编辑：常用位置 chips + 自定义输入） */
const location = ref("");
/** 可见范围：public | school | interest（对齐后端 Post.Visibility 枚举，
 *  2026-09-03 审查报告 P3-7：原 legacy 值 circle_members/private 后端不识别） */
const visibility = ref("public");
/** 发帖小贴士是否展示 */
const tipVisible = ref(true);
/** 提交中标志（防重复提交） */
const submitting = ref(false);

/** 发布目标类型：general | circle | campus */
const targetType = ref<"general" | "circle" | "campus">("general");
const targetId = ref<number | null>(null);
const targetCircle = ref<CircleItem | null>(null);
const targetOpen = ref(false);

/* ---------- 2026-09-05 R17：话题/位置/可见范围选择弹层（全部可编辑） ---------- */
const topicSheetOpen = ref(false);
const locationSheetOpen = ref(false);
const visibilitySheetOpen = ref(false);
/** 自定义话题输入 */
const customTopic = ref("");
/** 自定义位置输入 */
const customLocation = ref("");
/** 热门话题（小红书式：点选 + 自定义输入） */
const HOT_TOPICS = ["校园日常", "晚自习", "食堂美食", "社团活动", "运动打卡", "考研上岸", "宿舍日常", "恋爱心事", "周末去哪", "校园美景"];
/** 常用位置（学校场景快捷项，可被自定义输入覆盖） */
const COMMON_LOCATIONS = ["校园·图书馆", "校园·操场", "校园·食堂", "校园·教学楼", "宿舍", "校外·咖啡馆"];

/** 可见范围选项（按发布目标约束合法集合，来自 cycleVisibility 语义） */
const visibilityOptions = computed(() => {
  if (targetType.value === "general") {
    return [
      { value: "public", label: "所有人可见", desc: "公开广场 · 全平台用户可见" },
      { value: "school", label: "学校圈可见", desc: "仅同校认证成员可见" },
    ];
  }
  if (targetType.value === "campus") {
    return [{ value: "school", label: "学校圈可见", desc: "仅同校认证成员可见" }];
  }
  return [{ value: "interest", label: "圈子成员可见", desc: "仅该兴趣圈成员可见" }];
});

function addCustomTopic() {
  const raw = customTopic.value.trim().replace(/^#/, "");
  if (!raw) return;
  const tag = "#" + raw;
  if (topics.value.includes(tag)) {
    uni.showToast({ title: "该话题已添加", icon: "none" });
    return;
  }
  if (topics.value.length >= POST_MAX_CUSTOM_TAGS) {
    uni.showToast({ title: `最多 ${POST_MAX_CUSTOM_TAGS} 个话题`, icon: "none" });
    return;
  }
  topics.value.push(tag);
  customTopic.value = "";
  topicSheetOpen.value = false;
}

function pickLocation(text: string) {
  location.value = text;
  locationSheetOpen.value = false;
}

function addCustomLocation() {
  const raw = customLocation.value.trim();
  if (!raw) return;
  location.value = raw;
  customLocation.value = "";
  locationSheetOpen.value = false;
}

/** 提及好友：向正文末尾插入 @，可直接续打昵称（轻量可编辑方案） */
function insertMention() {
  content.value = content.value.replace(/\s*$/, "") + " @";
  uni.showToast({ title: "已在正文末尾插入 @，请输入昵称", icon: "none" });
}

/** 发布成功返回定时器，卸载时清理 */
let postSubmitNavTimer: ReturnType<typeof setTimeout> | null = null;
/** 草稿保存防抖定时器 */
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

const currentLength = computed(() => content.value.length);
const isOverLimit = computed(() => currentLength.value > POST_MAX_LENGTH);
// 2026-09-05 R17：标题或正文任一非空即可发布（小红书语义）
const canSubmit = computed(
  () => (title.value.trim().length > 0 || content.value.trim().length > 0) && !submitting.value
);
const isCircleTarget = computed(() => targetType.value === "circle");

/** 发布到展示标题 */
const targetTitle = computed(() => {
  if (isCircleTarget.value && targetCircle.value) return targetCircle.value.name;
  if (targetType.value === "campus") return t("circle.postTopicTargetCampus");
  return "个人动态";
});

/** 发布到展示副标题 */
const targetSubtitle = computed(() => {
  if (isCircleTarget.value && targetCircle.value) {
    const n = targetCircle.value.memberCount ?? 0;
    return `${n >= 10000 ? (n / 10000).toFixed(1) + "w" : n} 成员`;
  }
  if (targetType.value === "campus") return "校园圈 · 所有校园成员可见";
  return "默认公开 · 所有人可见";
});

/** 谁可以看文案 */
const visibilityText = computed(() => {
  if (visibility.value === "public") return t("village.post.visibilityPublic");
  if (visibility.value === "school") return "学校圈";
  if (visibility.value === "interest") return "兴趣圈";
  return t("village.post.visibilityPublic");
});

/* ---------- 进入：解析发布目标 + 恢复草稿 ---------- */
onLoad((query) => {
  const cid = query?.circleId ? Number(query.circleId) : null;
  if (query?.target === "campus") targetType.value = "campus";
  if (cid && !Number.isNaN(cid)) {
    targetType.value = "circle";
    targetId.value = cid;
  }
  void loadTarget();
  void restoreDraft();
});

onMounted(() => {
  // 监听表单变化，debounce 保存草稿到 storage
  watch(
    [title, content, images, topics, location, visibility, targetType, targetId],
    () => scheduleDraftSave()
  );
});

// 卸载时清理定时器，避免内存泄漏
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

// 页面卸载时清理 village store 定时器/请求资源
onUnload(() => {
  villageStore.dispose();
});

async function loadTarget() {
  if (!isCircleTarget.value) return;
  try {
    if (circleStore.circles.length === 0) await circleStore.fetchCircles();
    targetCircle.value = circleStore.circles.find((c) => c.id === String(targetId.value)) ?? null;
  } catch (_e) {
    targetCircle.value = null;
  }
}

function selectTarget(circle: CircleItem) {
  targetType.value = "circle";
  targetId.value = Number(circle.id);
  targetCircle.value = circle;
  // 圈子目标 → 仅圈内成员可见（对齐后端 visibility interest）
  visibility.value = "interest";
  targetOpen.value = false;
}

function chooseGeneral() {
  targetType.value = "general";
  targetId.value = null;
  targetCircle.value = null;
  // 公开广场 → 所有人可见
  visibility.value = "public";
  targetOpen.value = false;
}

function chooseCampus() {
  targetType.value = "campus";
  targetId.value = null;
  targetCircle.value = null;
  // 校园圈 → 仅同校认证成员可见（对齐后端 visibility school）
  visibility.value = "school";
  targetOpen.value = false;
}

/* ---------- 图片 ---------- */
async function chooseImage() {
  if (images.value.length >= POST_MAX_IMAGES) {
    uni.showToast({ title: t("village.post.maxImagesError", { n: POST_MAX_IMAGES }), icon: "none" });
    return;
  }
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({ title: t("village.post.privacyRequiredImage"), icon: "none" });
    return;
  }
  uni.chooseImage({
    count: POST_MAX_IMAGES - images.value.length,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: async (res) => {
      const tempPaths = res.tempFilePaths as string[];
      // 批量压缩（质量 80）；单张失败回退原图，不阻塞后续
      const compressedPaths = await Promise.all(tempPaths.map((p) => compressSingleImage(p)));
      images.value.push(...compressedPaths);
    },
    fail: (err) => {
      console.error("选择图片失败:", err);
      uni.showToast({ title: t("village.post.selectImageFailed"), icon: "none" });
    },
  });
}

/** 压缩单张图片（质量 80）；失败回退原图路径 */
function compressSingleImage(path: string): Promise<string> {
  return new Promise((resolve) => {
    uni.compressImage({
      src: path,
      quality: IMAGE_COMPRESS_QUALITY,
      success: (compressRes) => resolve(compressRes.tempFilePath || path),
      fail: () => resolve(path),
    });
  });
}

/** 删除已选图片 */
function removeImage(index: number) {
  images.value.splice(index, 1);
}

/* ---------- 话题 / 位置 / 可见范围 ---------- */
function toggleTopic(topic: string) {
  const tag = topic.startsWith("#") ? topic : "#" + topic;
  const idx = topics.value.indexOf(tag);
  if (idx >= 0) topics.value.splice(idx, 1);
  else if (topics.value.length < POST_MAX_CUSTOM_TAGS) topics.value.push(tag);
}

/* ---------- 草稿：本地 storage ---------- */
function snapshotDraft() {
  return {
    targetType: targetType.value,
    targetId: targetId.value,
    title: title.value,
    content: content.value,
    images: images.value,
    topics: topics.value,
    location: location.value,
    visibility: visibility.value,
  };
}

function scheduleDraftSave() {
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    try {
      uni.setStorageSync(POST_DRAFT_STORAGE_KEY, snapshotDraft());
    } catch (_e) {
      // storage 写入失败不阻塞主流程
    }
  }, POST_DRAFT_SAVE_DEBOUNCE_MS);
}

async function restoreDraft() {
  let draft: {
    targetType?: string;
    targetId?: number | null;
    title?: string;
    content?: string;
    images?: string[];
    topics?: string[];
    tags?: string[];
    location?: string;
    visibility?: string;
  } | null = null;
  try {
    const local = uni.getStorageSync(POST_DRAFT_STORAGE_KEY);
    if (local && typeof local === "object") draft = local;
  } catch (_e) {
    // 读取失败忽略
  }
  if (!draft) return;
  if (draft.targetType === "circle" && draft.targetId) {
    targetType.value = "circle";
    targetId.value = Number(draft.targetId);
  } else if (draft.targetType === "campus") {
    targetType.value = "campus";
  }
  if (typeof draft.title === "string") title.value = draft.title;
  if (typeof draft.content === "string") content.value = draft.content;
  if (Array.isArray(draft.images)) images.value = draft.images;
  if (Array.isArray(draft.topics)) topics.value = draft.topics;
  else if (Array.isArray(draft.tags)) topics.value = draft.tags;
  if (typeof draft.location === "string") location.value = draft.location;
  if (typeof draft.visibility === "string") visibility.value = draft.visibility;
  if (images.value.length > 0) void loadTarget();
}

function clearDraft() {
  try {
    uni.removeStorageSync(POST_DRAFT_STORAGE_KEY);
  } catch (_e) {
    // 忽略
  }
}

/* ---------- 退出：未发布提示保留草稿 ---------- */
const allowLeave = ref(false);
function requestLeave() {
  if (allowLeave.value) return;
  const dirty = title.value.trim() || content.value.trim() || images.value.length || topics.value.length;
  if (!dirty) {
    leave();
    return;
  }
  uni.showModal({
    title: t("village.post.draftModalTitle"),
    content: t("village.post.draftModalContent"),
    confirmText: t("village.post.draftKeep"),
    cancelText: t("village.post.draftDiscard"),
    success: (res) => {
      if (res.confirm) {
        scheduleDraftSave();
        leave();
      } else {
        clearDraft();
        leave();
      }
    },
  });
}

function leave() {
  allowLeave.value = true;
  // 兜底：首页/深链场景 navigateBack 会失败
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({ url: "/subpackages/village/village/index" });
  }
}

/* ---------- 提交 ---------- */
async function submitPublish() {
  if (!canSubmit.value) {
    uni.showToast({ title: t("village.contentRequired"), icon: "none" });
    return;
  }
  if (isOverLimit.value) {
    uni.showToast({ title: t("village.post.contentTooLong", { n: POST_MAX_LENGTH }), icon: "none" });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    // real 模式先上传本地图片换取远端 URL；mock 沿用本地路径
    let finalImages = images.value;
    const localImages = images.value.filter((img) => !/^https?:\/\//.test(img));
    if (localImages.length > 0 && !useMock()) {
      uni.showLoading({ title: t("village.post.uploadingImages") });
      try {
        const urls: string[] = [];
        for (const img of localImages) {
          const r = await clientApi.uploadPostImage({ name: `post-image-${Date.now()}.jpg`, path: img });
          urls.push(r.url);
        }
        finalImages = [...images.value.filter((img) => /^https?:\/\//.test(img)), ...urls];
      } catch (_e) {
        uni.hideLoading();
        uni.showToast({ title: t("village.post.imageUploadFailed"), icon: "none" });
        return;
      } finally {
        uni.hideLoading();
      }
    }

    // 2026-09-05 R17 小红书化：独立标题优先；未填标题时回退正文首行（截 50 字），
    // 正文与标题分离提交（原实现 title=content=全文，列表卡只能渲染大段文字）
    const firstLine = content.value.trim().split("\n")[0] ?? "";
    const titleText = title.value.trim() || firstLine.slice(0, 50);
    const contentText = content.value.trim();
    if (isCircleTarget.value && targetId.value != null) {
      await circleStore.createTopic(String(targetId.value), {
        title: titleText,
        content: contentText || titleText,
        images: finalImages,
        tags: topics.value,
      });
    } else {
      await villageStore.createPost({
        // 第五轮 P0 修复：原值 "life" 不在后端支持列表
        // （all/interest/sincere/hometown/anonymous/latest/campus/activity），
        // 导致统一发帖页通用发布恒 400「请求参数错误」。
        // 与 publish.vue 对齐，通用动态默认归类 interest（DB 帖子主流分类）。
        categoryId: "interest",
        title: titleText,
        content: contentText || titleText,
        images: finalImages,
        tags: topics.value,
        // 2026-09-03：目标/可见范围透传后端——原实现 campus 目标也落到
        // 公开广场（targetType/visibility 丢失），学校圈语义失效
        visibility: visibility.value,
        targetType: targetType.value,
        targetId: targetId.value,
      });
    }

    // 发布成功后清除草稿，避免下次进入恢复已发布内容
    clearDraft();
    // 2026-09-05 R17：清空本地表单（返回 feed 后重新进入应为全新表单）
    title.value = "";
    content.value = "";
    images.value = [];
    topics.value = [];
    location.value = "";
    uni.showToast({ title: t("village.postSuccess"), icon: "success" });
    if (postSubmitNavTimer) clearTimeout(postSubmitNavTimer);
    postSubmitNavTimer = setTimeout(() => {
      // 2026-09-05 R17：navigateBack 仅在页面栈>1 时可用（深链/reLaunch 直进时栈=1 会静默失败），
      // 统一走 leave() 兜底（栈>1 back，否则 reLaunch 回村口）
      leave();
      postSubmitNavTimer = null;
    }, POST_SUBMIT_NAVIGATE_BACK_MS);
  } catch (_e) {
    uni.showToast({
      title: villageStore.errorMessage || t("village.post.publishFailed"),
      icon: "none",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="post-page">
    <!-- 顶部导航（R20：padding-top 动态注入状态栏高度，标题不再与系统时间叠印） -->
    <view class="post-header" :style="{ paddingTop: statusBarHeightPx + 'px' }">
      <view
        class="post-header__close press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.closeAria')"
        @tap="requestLeave"
      >
        <image class="post-header__x" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
      </view>
      <text class="post-header__title">{{ t("village.post.headerTitle") }}</text>
      <view
        class="post-header__submit"
        :class="{ 'post-header__submit--disabled': !canSubmit }"
        role="button"
        :aria-label="t('common.publish')"
        @tap="submitPublish"
      >
        <text class="post-header__submit-text">{{ t("common.publish") }}</text>
      </view>
    </view>

    <scroll-view class="post-body" scroll-y :show-scrollbar="false">
      <!-- 发布到（圈子选择卡片） -->
      <view class="post-to">
        <text class="post-to__label">发布到</text>
        <view
          class="post-to__card press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="targetOpen = !targetOpen"
        >
          <view class="post-to__avatar">
            <image
              v-if="isCircleTarget && targetCircle"
              class="post-to__avatar-img"
              :src="IMAGE_PATHS.CIRCLE_COVERS.DEFAULT"
              mode="aspectFill"
              alt=""
            />
            <image
              v-else-if="isCircleTarget"
              class="post-to__avatar-emoji"
              :src="IMAGE_PATHS.ICONS_EMOJI.CAMERA_ICON"
              mode="aspectFit"
              alt=""
            />
            <image v-else class="post-to__avatar-emoji" :src="IMAGE_PATHS.ICONS_EMOJI.SCHOOL" mode="aspectFit" alt="" />
          </view>
          <view class="post-to__info">
            <view class="post-to__name-row">
              <text class="post-to__name">{{ targetTitle }}</text>
              <text v-if="isCircleTarget" class="post-to__tag">{{ t('village.post.visibilityCircleMembers') }}</text>
            </view>
            <text class="post-to__subtitle">{{ targetSubtitle }}</text>
          </view>
          <text class="post-to__arrow">›</text>
        </view>

        <!-- 目标选择弹层（R20：按 公域 → 校园私域 → 兴趣圈子 三级分组，消除平铺混排） -->
        <view v-if="targetOpen" class="post-target-sheet" @tap="targetOpen = false">
          <view class="post-target-sheet__panel" @tap.stop>
            <view class="post-target-sheet__head">
              <text class="post-target-sheet__title">选择发布到</text>
            </view>

            <text class="post-target-sheet__group">公域 · 所有人可见</text>
            <view
              class="post-target-sheet__option press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              @tap="chooseGeneral"
            >
              <text class="post-target-sheet__name">个人动态</text>
              <text class="post-target-sheet__desc">默认公开，所有人可见</text>
              <image
                v-if="targetType === 'general'"
                class="post-target-sheet__check"
                :src="IMAGE_PATHS.ICONS_EMOJI.CHECK"
                mode="aspectFit"
                alt=""
              />
            </view>

            <text class="post-target-sheet__group">校园私域 · 同校可见</text>
            <view
              class="post-target-sheet__option press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              @tap="chooseCampus"
            >
              <text class="post-target-sheet__name">校园圈</text>
              <text class="post-target-sheet__desc">仅认证同校同学可见</text>
              <image
                v-if="targetType === 'campus'"
                class="post-target-sheet__check"
                :src="IMAGE_PATHS.ICONS_EMOJI.CHECK"
                mode="aspectFit"
                alt=""
              />
            </view>

            <template v-if="circleStore.circles.length > 0">
              <text class="post-target-sheet__group">兴趣圈子 · 圈内成员可见</text>
              <view
                v-for="circle in circleStore.circles.slice(0, 8)"
                :key="circle.id"
                class="post-target-sheet__option press-feedback"
                hover-class="press-feedback--active"
                hover-stay-time="120"
                role="button"
                @tap="selectTarget(circle)"
              >
                <text class="post-target-sheet__name">{{ circle.name }}</text>
                <text class="post-target-sheet__desc">{{ circle.isJoined ? '已加入' : '' }}</text>
                <image
                  v-if="isCircleTarget && targetId === Number(circle.id)"
                  class="post-target-sheet__check"
                  :src="IMAGE_PATHS.ICONS_EMOJI.CHECK"
                  mode="aspectFit"
                  alt=""
                />
              </view>
            </template>
          </view>
        </view>
      </view>

      <!-- 标题输入（2026-09-05 R17 小红书化：独立标题，20 字内） -->
      <view class="post-title">
        <input
  cursor-spacing="20"
          v-model="title"
          class="post-title__input"
          :maxlength="TITLE_MAX_LENGTH"
          placeholder="填写标题会有更多赞哦～"
          placeholder-class="post-title__placeholder"
          :aria-label="'标题'"
        />
        <view class="post-title__count">
          <text>{{ title.length }}/{{ TITLE_MAX_LENGTH }}</text>
        </view>
      </view>

      <!-- 正文输入 -->
      <view class="post-content">
        <textarea
  cursor-spacing="20"
          v-model="content"
          class="post-content__input"
          :placeholder="t('village.post.contentPlaceholder')"
          :maxlength="POST_MAX_LENGTH"
          :show-confirm-bar="false"
          :aria-label="t('village.post.contentPlaceholder')"
        />
        <view class="post-content__count" :class="{ 'post-content__count--over': isOverLimit }">
          <text>{{ currentLength }}/{{ POST_MAX_LENGTH }}</text>
        </view>
      </view>

      <!-- 图片上传/预览区 -->
      <view class="post-images">
        <view v-for="(img, idx) in images" :key="idx" class="post-image">
          <image class="post-image__img" :src="img" mode="aspectFill" alt="" />
          <view
            class="post-image__remove press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="removeImage(idx)"
          >
            <image class="post-image__remove-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
          </view>
        </view>
        <view
          v-if="images.length < POST_MAX_IMAGES"
          class="post-image post-image--add press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="chooseImage"
        >
          <text class="post-image__plus">＋</text>
        </view>
      </view>

      <!-- 附加功能（话题/位置/提及/可见范围）——2026-09-05 R17 全部可编辑 -->
      <view class="post-rows">
        <view
          class="post-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="topicSheetOpen = true"
        >
          <text class="post-row__icon">#</text>
          <text class="post-row__label">添加话题</text>
          <text class="post-row__meta">已选 {{ topics.length }}/{{ POST_MAX_CUSTOM_TAGS }}</text>
          <text class="post-row__arrow">›</text>
        </view>
        <view
          class="post-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="customLocation = location; locationSheetOpen = true"
        >
          <image class="post-row__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
          <text class="post-row__label">添加位置</text>
          <text class="post-row__meta">{{ location || '选择或输入位置' }}</text>
          <text class="post-row__arrow">›</text>
        </view>
        <view
          class="post-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="insertMention"
        >
          <text class="post-row__icon">@</text>
          <text class="post-row__label">提及好友</text>
          <text class="post-row__meta">插入 @ 到正文</text>
          <text class="post-row__arrow">›</text>
        </view>
        <view
          class="post-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="visibilitySheetOpen = true"
        >
          <image class="post-row__icon" :src="IMAGE_PATHS.ICONS_EMOJI.EYE" mode="aspectFit" alt="" />
          <text class="post-row__label">谁可以看</text>
          <text class="post-row__meta">{{ visibilityText }}</text>
          <text class="post-row__arrow">›</text>
        </view>
      </view>

      <!-- 已选话题 chips -->
      <view v-if="topics.length > 0" class="post-topics">
        <view v-for="(tag, idx) in topics" :key="`${tag}-${idx}`" class="post-topic-chip">
          <text class="post-topic-chip__text">{{ tag }}</text>
          <text class="post-topic-chip__remove" @tap="topics.splice(idx, 1)">×</text>
        </view>
      </view>

      <!-- 发帖小贴士 -->
      <view v-if="tipVisible" class="post-tip">
        <view class="post-tip__text-wrap">
          <view class="post-tip__title">
            <image class="post-tip__title-icon" :src="IMAGE_PATHS.ICONS_EMOJI.SPROUT" mode="aspectFit" alt="" />
            <text>发帖小贴士</text>
          </view>
          <text class="post-tip__desc">真实分享校园生活，友善互动，让更多人认识有趣的你～</text>
        </view>
        <view
          class="post-tip__close press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="tipVisible = false"
        >
          <image class="post-tip__close-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
        </view>
      </view>

      <view class="post-body__bottom-space" />
    </scroll-view>

    <!-- 底部工具栏 -->
    <view class="post-toolbar">
      <view
        class="post-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        @tap="chooseImage"
      >
        <image class="post-tool__icon" :src="IMAGE_PATHS.ICONS_EMOJI.IMAGE" mode="aspectFit" alt="" />
        <text class="post-tool__label">图片</text>
      </view>
      <view
        class="post-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        @tap="topicSheetOpen = true"
      >
        <text class="post-tool__icon">#</text>
        <text class="post-tool__label">话题</text>
      </view>
      <view
        class="post-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        @tap="customLocation = location; locationSheetOpen = true"
      >
        <image class="post-tool__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
        <text class="post-tool__label">位置</text>
      </view>
      <view
        class="post-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        @tap="insertMention"
      >
        <text class="post-tool__icon">@</text>
        <text class="post-tool__label">提及</text>
      </view>
      <view
        class="post-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        @tap="visibilitySheetOpen = true"
      >
        <image class="post-tool__icon" :src="IMAGE_PATHS.ICONS_EMOJI.EYE" mode="aspectFit" alt="" />
        <text class="post-tool__label">更多</text>
      </view>
    </view>

    <!-- ===== 话题选择弹层（2026-09-05 R17：热门点选 + 自定义输入） ===== -->
    <view v-if="topicSheetOpen" class="post-sheet" @tap="topicSheetOpen = false">
      <view class="post-sheet__panel" @tap.stop>
        <view class="post-sheet__head">
          <text class="post-sheet__title">添加话题</text>
          <text class="post-sheet__sub">已选 {{ topics.length }}/{{ POST_MAX_CUSTOM_TAGS }}</text>
        </view>
        <view class="post-sheet__chips">
          <view
            v-for="topic in HOT_TOPICS"
            :key="topic"
            class="post-sheet__chip press-feedback"
            :class="{ 'post-sheet__chip--on': topics.includes('#' + topic) }"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            @tap="toggleTopic(topic)"
          >
            <text class="post-sheet__chip-text"># {{ topic }}</text>
          </view>
        </view>
        <view class="post-sheet__input-row">
          <input
  cursor-spacing="20"
            v-model="customTopic"
            class="post-sheet__input"
            maxlength="16"
            placeholder="输入自定义话题（16 字内）"
            placeholder-class="post-sheet__placeholder"
            confirm-type="done"
            :aria-label="'自定义话题'"
          />
          <view
            class="post-sheet__confirm press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            @tap="addCustomTopic"
          >
            <text class="post-sheet__confirm-text">添加</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 位置选择弹层（常用位置点选 + 自定义输入） ===== -->
    <view v-if="locationSheetOpen" class="post-sheet" @tap="locationSheetOpen = false">
      <view class="post-sheet__panel" @tap.stop>
        <view class="post-sheet__head">
          <text class="post-sheet__title">添加位置</text>
          <text v-if="location" class="post-sheet__sub">当前：{{ location }}</text>
        </view>
        <view class="post-sheet__chips">
          <view
            v-for="spot in COMMON_LOCATIONS"
            :key="spot"
            class="post-sheet__chip press-feedback"
            :class="{ 'post-sheet__chip--on': location === spot }"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            @tap="pickLocation(spot)"
          >
            <text class="post-sheet__chip-text">{{ spot }}</text>
          </view>
        </view>
        <view class="post-sheet__input-row">
          <input
  cursor-spacing="20"
            v-model="customLocation"
            class="post-sheet__input"
            maxlength="30"
            placeholder="输入自定义位置（30 字内）"
            placeholder-class="post-sheet__placeholder"
            confirm-type="done"
            :aria-label="'自定义位置'"
          />
          <view
            class="post-sheet__confirm press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            @tap="addCustomLocation"
          >
            <text class="post-sheet__confirm-text">使用</text>
          </view>
        </view>
        <view v-if="location" class="post-sheet__clear-row">
          <text class="post-sheet__clear" @tap="location = ''">清除当前位置</text>
        </view>
      </view>
    </view>

    <!-- ===== 可见范围弹层（按发布目标约束的选项） ===== -->
    <view v-if="visibilitySheetOpen" class="post-sheet" @tap="visibilitySheetOpen = false">
      <view class="post-sheet__panel" @tap.stop>
        <view class="post-sheet__head">
          <text class="post-sheet__title">谁可以看</text>
        </view>
        <view
          v-for="opt in visibilityOptions"
          :key="opt.value"
          class="post-sheet__option press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="40"
          role="button"
          :aria-label="opt.label"
          @tap="visibility = opt.value; visibilitySheetOpen = false"
        >
          <view class="post-sheet__option-info">
            <text class="post-sheet__option-name">{{ opt.label }}</text>
            <text class="post-sheet__option-desc">{{ opt.desc }}</text>
          </view>
          <image
            v-if="visibility === opt.value"
            class="post-sheet__check"
            :src="IMAGE_PATHS.ICONS_EMOJI.CHECK"
            mode="aspectFit"
            alt=""
          />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* 设计令牌：主色深绿 --c-brand / --c-brand-600，粉 --c-romance-500 */
.post-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--c-bg-page, #EEF7F2);
}

/* ========== 顶部导航 ========== */
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  /* R21：右侧避让微信胶囊（--capsule-right≈7px 间隙 + 胶囊本体 87px），
     「发布」按钮此前与胶囊碰撞（•••发布◎ 挤在一起） */
  padding-right: calc(var(--capsule-right, 7px) + 104px);
  background: var(--c-bg-container, #FFFFFF);
  border-bottom: 1rpx solid var(--c-line, #EEF2F0);
  flex-shrink: 0;
}
.post-header__close {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.post-header__x {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-primary, #1A1E1C);
}
.post-header__title {
  font-size: var(--fs-3xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.post-header__submit {
  padding: 12rpx 40rpx;
  border-radius: var(--r-full, 999rpx);
  background: linear-gradient(135deg, var(--c-brand, #36C99A) 0%, var(--c-brand-600, #2AAE83) 100%);
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger, rgba(61, 201, 148, 0.4));
  transition: transform var(--d-fast, 120ms) ease;
}
.post-header__submit--disabled {
  background: var(--c-neutral-200, #D8E2DE);
  box-shadow: none;
}
.post-header__submit-text {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-neutral-0, #FFFFFF);
}
.post-header__submit--disabled .post-header__submit-text {
  color: var(--c-text-quaternary, #C2CAC6);
}

.post-body {
  flex: 1;
  min-height: 0;
}

/* ========== 发布到（圈子选择卡片） ========== */
.post-to {
  padding: 32rpx 32rpx 8rpx;
}
.post-to__label {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-secondary, #6B7571);
  margin-bottom: 16rpx;
}
.post-to__card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-xl, 24rpx);
  border: 1rpx solid var(--c-line, #EEF2F0);
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs, rgba(15, 23, 42, 0.04));
}
.post-to__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--c-brand-50, #E8FAF3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.post-to__avatar-img {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}
.post-to__avatar-emoji {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-brand, #36C99A);
}
.post-to__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.post-to__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.post-to__name {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.post-to__tag {
  padding: 2rpx 12rpx;
  border-radius: var(--r-md, 8rpx);
  background: var(--c-brand-bg-tint, rgba(61, 201, 148, 0.08));
  color: var(--c-brand, #36C99A);
  font-size: var(--fs-xs, 20rpx);
  flex-shrink: 0;
}
.post-to__subtitle {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #9AA39F);
}
.post-to__arrow {
  font-size: var(--fs-2xl, 36rpx);
  color: var(--c-text-quaternary, #C2CAC6);
  flex-shrink: 0;
}

/* 目标选择弹层 */
.post-target-sheet {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: var(--c-overlay-mid, rgba(0, 0, 0, 0.45));
  display: flex;
  align-items: flex-end;
}
.post-target-sheet__panel {
  width: 100%;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 32rpx 32rpx 0 0;
  /* R21：底部安全区——末行「宠物」此前贴屏幕底缘被裁切 */
  padding: 24rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  max-height: 78vh;
  overflow-y: auto;
  box-sizing: border-box;
}
.post-target-sheet__head {
  padding: 16rpx 0 24rpx;
}
.post-target-sheet__title {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
/* R20：渠道分组标题（公域 / 校园私域 / 兴趣圈子） */
.post-target-sheet__group {
  display: block;
  padding: 20rpx 8rpx 8rpx;
  font-size: var(--fs-xs, 22rpx);
  font-weight: 600;
  color: var(--c-brand, #36C99A);
}
.post-target-sheet__option {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 8rpx;
  border-bottom: 1rpx solid var(--c-neutral-50, #F2F5F3);
}
.post-target-sheet__name {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #1A1E1C);
}
.post-target-sheet__desc {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #9AA39F);
  flex: 1;
}
.post-target-sheet__check {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-brand, #36C99A);
  flex-shrink: 0;
}

/* ========== 标题输入（2026-09-05 R17 小红书化） ========== */
.post-title {
  padding: 28rpx 32rpx 0;
}
.post-title__input {
  width: 100%;
  font-size: 36rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  min-height: 56rpx;
  box-sizing: border-box;
}
.post-title__placeholder {
  color: var(--c-text-quaternary, #C2CAC6);
  font-weight: 500;
}
.post-title__count {
  text-align: right;
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-text-tertiary, #9AA39F);
  margin-top: 4rpx;
}

/* ========== 正文输入 ========== */
.post-content {
  padding: 24rpx 32rpx;
}
.post-content__input {
  width: 100%;
  min-height: 220rpx;
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-primary, #1A1E1C);
  line-height: 1.6;
  box-sizing: border-box;
}
.post-content__count {
  text-align: right;
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-text-tertiary, #9AA39F);
  margin-top: 8rpx;
}
.post-content__count--over {
  color: var(--c-error, #E5454D);
}

/* ========== 图片上传/预览区 ========== */
.post-images {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 16rpx 32rpx;
}
.post-image {
  width: calc((100% - 3 * 16rpx) / 4);
  height: calc((100% - 3 * 16rpx) / 4);
  aspect-ratio: 1;
  border-radius: var(--r-lg, 16rpx);
  overflow: hidden;
  position: relative;
  background: var(--c-brand-50, #E8FAF3);
}
.post-image__img {
  width: 100%;
  height: 100%;
  display: block;
}
.post-image__remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--c-overlay-mid-strong, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
}
.post-image__remove-icon {
  width: 22rpx;
  height: 22rpx;
  color: var(--c-neutral-0, #FFFFFF);
}
.post-image--add {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed var(--c-neutral-200, #D8E2DE);
  background: var(--c-bg-container, #FFFFFF);
}
.post-image__plus {
  font-size: var(--fs-5xl, 48rpx);
  color: var(--c-text-tertiary, #9AA39F);
  line-height: 1;
}

/* ========== 附加功能 ========== */
.post-rows {
  margin: 16rpx 32rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-xl, 24rpx);
  border: 1rpx solid var(--c-line, #EEF2F0);
  overflow: hidden;
}
.post-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 26rpx 24rpx;
  border-bottom: 1rpx solid var(--c-neutral-50, #F2F5F3);
}
.post-row:last-child {
  border-bottom: none;
}
.post-row__icon {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-brand, #36C99A);
  text-align: center;
  font-size: var(--fs-lg, 28rpx);
  flex-shrink: 0;
}
.post-row__label {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #1A1E1C);
}
.post-row__meta {
  flex: 1;
  text-align: right;
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #9AA39F);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.post-row__arrow {
  font-size: var(--fs-2xl, 32rpx);
  color: var(--c-text-quaternary, #C2CAC6);
  flex-shrink: 0;
}

/* ========== 已选话题 chips ========== */
.post-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 16rpx 32rpx 0;
}
.post-topic-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border-radius: var(--r-full, 999rpx);
  background: var(--c-brand-50, #E8FAF3);
}
.post-topic-chip__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-brand, #36C99A);
  font-weight: 500;
}
.post-topic-chip__remove {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-romance-500, #FF6B81);
  padding: 0 2rpx;
  font-weight: 600;
}

/* ========== 发帖小贴士 ========== */
.post-tip {
  margin: 24rpx 32rpx;
  padding: 24rpx;
  background: var(--c-brand-50, #EAF9F3);
  border-radius: var(--r-lg, 20rpx);
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.post-tip__text-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.post-tip__title {
  font-size: var(--fs-md, 26rpx);
  font-weight: 700;
  color: var(--c-brand, #36C99A);
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.post-tip__title-icon {
  width: 28rpx;
  height: 28rpx;
  color: var(--c-brand, #36C99A);
}
.post-tip__desc {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #6B7571);
}
.post-tip__close-icon {
  width: 28rpx;
  height: 28rpx;
  color: var(--c-text-tertiary, #9AA39F);
}

.post-body__bottom-space {
  /* 2026-09-05 R17：底部工具栏改 fixed 后预留其高度 + 安全区，避免滚动到底被遮挡 */
  height: calc(200rpx + env(safe-area-inset-bottom));
}

/* ========== 底部工具栏（2026-09-05 R17 改 fixed：滚动时始终吸底） ========== */
.post-toolbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120;
  display: flex;
  justify-content: space-around;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 12rpx);
  background: var(--c-bg-container, #FFFFFF);
  border-top: 1rpx solid var(--c-line, #EEF2F0);
  flex-shrink: 0;
}
.post-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.post-tool__icon {
  width: 40rpx;
  height: 40rpx;
  color: var(--c-text-secondary, #6B7571);
  font-size: var(--fs-xl, 30rpx);
  text-align: center;
  line-height: 40rpx;
}
.post-tool__label {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary, #9AA39F);
}

/* ========== 2026-09-05 R17：话题/位置/可见范围通用底部弹层（对齐 target-sheet 规范） ========== */
.post-sheet {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: var(--c-overlay-mid, rgba(0, 0, 0, 0.45));
  display: flex;
  align-items: flex-end;
}
.post-sheet__panel {
  width: 100%;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 32rpx 32rpx 0 0;
  padding: 24rpx 32rpx calc(env(safe-area-inset-bottom) + 48rpx);
  max-height: 70vh;
  overflow-y: auto;
  box-sizing: border-box;
}
.post-sheet__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 8rpx 0 20rpx;
}
.post-sheet__title {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.post-sheet__sub {
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-text-tertiary, #9AA39F);
}
.post-sheet__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-bottom: 20rpx;
}
.post-sheet__chip {
  padding: 12rpx 26rpx;
  border-radius: var(--r-full, 999rpx);
  background: var(--c-brand-50, #E8FAF3);
  border: 1rpx solid transparent;
}
.post-sheet__chip--on {
  background: var(--c-brand, #36C99A);
  border-color: var(--c-brand, #36C99A);
}
.post-sheet__chip--on .post-sheet__chip-text {
  color: var(--c-neutral-0, #FFFFFF);
}
.post-sheet__chip-text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-brand, #36C99A);
  font-weight: 500;
}
.post-sheet__input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0 4rpx;
}
.post-sheet__input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: var(--r-lg, 16rpx);
  background: var(--c-neutral-50, #F2F5F3);
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-primary, #1A1E1C);
  box-sizing: border-box;
}
.post-sheet__placeholder {
  color: var(--c-text-quaternary, #C2CAC6);
}
.post-sheet__confirm {
  padding: 16rpx 36rpx;
  border-radius: var(--r-full, 999rpx);
  background: linear-gradient(135deg, var(--c-brand, #36C99A) 0%, var(--c-brand-600, #2AAE83) 100%);
  flex-shrink: 0;
}
.post-sheet__confirm-text {
  font-size: var(--fs-base, 24rpx);
  font-weight: 700;
  color: var(--c-neutral-0, #FFFFFF);
}
.post-sheet__clear-row {
  padding-top: 20rpx;
  text-align: center;
}
.post-sheet__clear {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-romance-500, #FF6B81);
}
.post-sheet__option {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 26rpx 8rpx;
  border-bottom: 1rpx solid var(--c-neutral-50, #F2F5F3);
}
.post-sheet__option:last-child {
  border-bottom: none;
}
.post-sheet__option-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.post-sheet__option-name {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #1A1E1C);
}
.post-sheet__option-desc {
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-text-tertiary, #9AA39F);
}
.post-sheet__check {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-brand, #36C99A);
  flex-shrink: 0;
}


/* R16（2026-09-07）：页面背景统一纯白（对齐「他人显示主页」理想图色调） */
page {
  background: #ffffff;
}

</style>
