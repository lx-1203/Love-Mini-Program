<script setup lang="ts">
/**
 * Admin v2 - 内容创作（官方小编代发）视图（社区论坛域）。
 *
 * 对应后端 com.campuslove.api.admin.AdminContentComposeController：
 * - POST /api/v1/admin/posts        新建帖子（作者固定为配置的官方小编账号，表单不可指定作者）
 * - POST /api/v1/admin/media/upload 图片上传（返回 /api/v1/media/... 相对 URL）
 *
 * 产品约束：后台只做「新建 + 审核」，不提供帖子编辑入口（存量帖子请在
 * VillagePosts 页审核/置顶/删除），因此本视图无编辑态分支。
 *
 * 校验阈值与小程序端 apps/client/src/constants/village.ts、后端
 * AdminContentComposeController 保持一致：标题 5-30 字、正文 ≤500 字、
 * 图片 ≤9 张、标签 ≤5 个（单个 ≤20 字）。
 *
 * 图片展示注意：上传返回的是用户媒体鉴权路径，裸 URL 会 401 裂图，
 * 必须经 api/media.ts 的 withMediaToken 拼接管理员 token。
 *
 * ===== i18n 清单（postCompose.* 为本视图新增命名空间，需补进
 * apps/admin/src/i18n/locales/zh-CN.ts；下列为待补文案）=====
 * title                     发布内容 / Create Post
 * subtitle                  以官方小编身份发布新的动态（后台不支持编辑已有帖子） / Publish a new post as the official editor. Editing existing posts is not supported here.
 * titleLabel                标题 / Title
 * titlePlaceholder          请输入 5-30 字标题 / Enter a title of 5-30 characters
 * titleHint                 标题需 {min}-{max} 字 / Title must be {min}-{max} characters
 * titleLengthInvalid        标题需 {min}-{max} 字 / Title must be between {min} and {max} characters
 * contentLabel              正文 / Content
 * contentPlaceholder        请输入正文，最多 {max} 字 / Write the content, up to {max} characters
 * contentRequired           正文不能为空 / Content is required
 * contentTooLong            正文最多 {max} 字 / Content must be at most {max} characters
 * categoryLabel             分类 / Category
 * categoryActivity          活动 / Activity
 * targetLabel               发布范围 / Publish Scope
 * targetGeneral             公开（所有人可见） / Public (visible to everyone)
 * targetCampus              校园（仅同校认证用户） / Campus (verified students of the same school)
 * targetCircle              圈层（仅圈子成员） / Circle (circle members only)
 * targetFriends             日常（仅匹配/关注作者） / Daily (matches and followers only)
 * targetHint                校园范围要求小编账号已通过校园认证，圈层范围要求小编已加入该圈子，否则后端返回 403 / Campus scope requires the editor account to be campus-verified and circle scope requires membership, otherwise the server returns 403
 * targetIdLabel             圈子 ID / Circle ID
 * targetIdPlaceholder       请输入圈子 ID / Enter the circle ID
 * targetIdRequired          圈层发布必须填写圈子 ID / Circle ID is required for circle publishing
 * tagsLabel                 标签 / Tags
 * tagsPlaceholder           输入标签后回车添加 / Type a tag and press Enter
 * tagAdd                    添加标签 / Add Tag
 * tagRemove                 移除标签 / Remove tag
 * tagTooLong                单个标签最多 {max} 字 / Each tag must be at most {max} characters
 * tagsExceeded              标签最多 {max} 个 / Up to {max} tags
 * imagesLabel               配图 / Images
 * imagePick                 选择图片 / Choose Images
 * imageUploading            上传中… / Uploading...
 * imageRemove               移除图片 / Remove image
 * imageAlt                  帖子配图 / Post image
 * imageHint                 支持 jpg/png/webp，单张不超过 {max}，最多 9 张 / jpg/png/webp, up to {max} each, 9 images max
 * imageTooLarge             「{name}」超过 {max} 大小限制 / "{name}" exceeds the {max} size limit
 * imageTypeRejected         「{name}」格式不支持，仅接受 {types} / "{name}" is not supported, only {types} are accepted
 * imagesExceeded            图片最多 {max} 张 / Up to {max} images
 * uploadFailed              图片上传失败： / Image upload failed:
 * submit                    发布帖子 / Publish Post
 * submitting                发布中… / Publishing...
 * submitFailed              发布失败： / Publish failed:
 * publishedTitle            发布成功（帖子 #{id}） / Published successfully (post #{id})
 * resultAuthor              发布作者 / Author
 * authorFallback            用户#{id} / User #{id}
 * authorMisconfiguredHint   请先配置 app.admin.compose-author-user-id（官方小编账号用户 ID）并重启服务 / Set app.admin.compose-author-user-id to the official editor user ID and restart the service
 * resultCampus              目标校区 / Target Campus
 * resultCirclePath          目标圈层路径 / Target Circle Path
 * resultVisibility          可见范围 / Visibility
 * resultAuditStatus         审核状态 / Audit Status
 * resultCreatedAt           发布时间 / Published At
 *
 * 复用既有 key（无需新增）：common.reset / common.emptyPlaceholder /
 * errors.network / errors.auth / errors.unknown / villagePosts.category{All,Interest,
 * Sincere,Hometown,Anonymous,Latest,Campus}。
 */
import { computed, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import ErrorState from "../../components/ErrorState.vue";
import {
  COMPOSE_LIMITS,
  createAdminPost,
  uploadComposeImage,
  type ComposePostRequest,
  type ComposeTargetType,
  type ComposedPost,
  type PostCategory,
} from "../../api/compose";
import { withMediaToken } from "../../api/media";
import { ApiError } from "../../api/http";
import { formatDateTime } from "../../utils/format";
import { useSessionStore } from "../../stores/session";

const { t } = useI18n();

const sessionStore = useSessionStore();

/** 帖子分类选项（与后端 Post.PostCategory 枚举一一对应） */
const CATEGORY_OPTIONS: PostCategory[] = [
  "all",
  "interest",
  "sincere",
  "hometown",
  "anonymous",
  "latest",
  "campus",
  "activity",
];

/** 分类 i18n key：复用村落动态列表既有文案，activity 为后台代发新增项 */
function categoryLabel(category: PostCategory): string {
  if (category === "activity") return t("postCompose.categoryActivity");
  return t(`villagePosts.category${category.charAt(0).toUpperCase()}${category.slice(1)}`);
}

/** 发布范围选项（对应后端 targetType → visibility 映射） */
const TARGET_OPTIONS: ComposeTargetType[] = ["general", "campus", "circle", "friends"];

function targetLabel(target: ComposeTargetType): string {
  switch (target) {
    case "campus":
      return t("postCompose.targetCampus");
    case "circle":
      return t("postCompose.targetCircle");
    case "friends":
      return t("postCompose.targetFriends");
    default:
      return t("postCompose.targetGeneral");
  }
}

/** 后端 visibility 展示名（代发结果只读区用） */
function visibilityLabel(visibility: string | null): string {
  switch (visibility) {
    case "school":
      return t("postCompose.targetCampus");
    case "interest":
      return t("postCompose.targetCircle");
    case "friends":
      return t("postCompose.targetFriends");
    case "public_":
      return t("postCompose.targetGeneral");
    default:
      return visibility ?? t("common.emptyPlaceholder");
  }
}

// ===== 表单状态 =====
const title = ref("");
const content = ref("");
const category = ref<PostCategory>("sincere");
const targetType = ref<ComposeTargetType>("general");
const targetId = ref("");
const tags = ref<string[]>([]);
const tagInput = ref("");
/** 已上传图片的相对 URL（提交给后端的 images 字段） */
const images = ref<string[]>([]);

// ===== 上传 / 提交状态 =====
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
/** 页面级致命错误（小编账号未配置等，走 ErrorState 展示） */
const fatalError = ref("");
/** 是否命中「小编账号未配置/不可用」(HTTP 503)，命中时追加配置指引 */
const authorErrorFlag = ref(false);
/** 表单级错误提示（校验/上传失败） */
const formError = ref("");
const submitting = ref(false);
/** 发布成功后的后端回执（含解析出的校区/圈层，只读展示） */
const published = ref<ComposedPost | null>(null);

const titleLength = computed(() => title.value.trim().length);
const contentLength = computed(() => content.value.length);
const canSubmit = computed(
  () =>
    !submitting.value &&
    !uploading.value &&
    titleLength.value >= COMPOSE_LIMITS.titleMin &&
    titleLength.value <= COMPOSE_LIMITS.titleMax &&
    contentLength.value > 0 &&
    contentLength.value <= COMPOSE_LIMITS.contentMax,
);

/** 清空错误提示（ErrorState 的 retry 也复用：503 修正配置后重试即可） */
function resetErrors(): void {
  fatalError.value = "";
  formError.value = "";
  authorErrorFlag.value = false;
}

// ===== 标签 =====
function addTag(): void {
  const raw = tagInput.value.trim();
  if (!raw) return;
  if (raw.length > COMPOSE_LIMITS.tagMax) {
    formError.value = t("postCompose.tagTooLong", { max: COMPOSE_LIMITS.tagMax });
    return;
  }
  if (tags.value.length >= COMPOSE_LIMITS.tagsMax) {
    formError.value = t("postCompose.tagsExceeded", { max: COMPOSE_LIMITS.tagsMax });
    return;
  }
  if (tags.value.includes(raw)) {
    tagInput.value = "";
    return;
  }
  formError.value = "";
  tags.value = [...tags.value, raw];
  tagInput.value = "";
}

function removeTag(tag: string): void {
  tags.value = tags.value.filter((item) => item !== tag);
}

// ===== 图片上传 =====
function openFilePicker(): void {
  fileInput.value?.click();
}

/** 允许的 MIME（与后端 LocalMediaStorageService.ALLOWED_IMAGE_MIME 一致） */
const ACCEPTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];

async function onFilesChosen(event: Event): Promise<void> {
  if (!sessionStore.canWrite) return;
  const input = event.target as HTMLInputElement | null;
  const files = input?.files;
  if (!files || files.length === 0) return;
  formError.value = "";
  uploading.value = true;
  // 逐个串行上传：后端限流按 IP 计令牌，并发大批量易触发 429
  for (const file of Array.from(files)) {
    if (images.value.length >= COMPOSE_LIMITS.imagesMax) {
      formError.value = t("postCompose.imagesExceeded", { max: COMPOSE_LIMITS.imagesMax });
      break;
    }
    if (!ACCEPTED_IMAGE_MIME.includes(file.type)) {
      formError.value = t("postCompose.imageTypeRejected", {
        name: file.name,
        types: "jpg / jpeg / png / webp",
      });
      continue;
    }
    if (file.size > COMPOSE_LIMITS.imageMaxBytes) {
      formError.value = t("postCompose.imageTooLarge", { name: file.name, max: "10MB" });
      continue;
    }
    try {
      const result = await uploadComposeImage(file);
      images.value = [...images.value, result.url];
    } catch (err) {
      handleComposeError(err, t("postCompose.uploadFailed"));
    }
  }
  uploading.value = false;
  // 清空 input.value，允许再次选择同一文件（浏览器默认会忽略重复文件名）
  if (input) input.value = "";
}

function removeImage(url: string): void {
  images.value = images.value.filter((item) => item !== url);
}

/**
 * 统一错误处理：
 * - HTTP 503：官方小编账号未配置/不存在/被禁用，展示后端中文指引 + 配置提示；
 * - 其他 ApiError：直接展示后端 message；
 * - 未知异常：按「操作失败 + 场景」兜底。
 */
function handleComposeError(err: unknown, fallbackScene: string): void {
  if (err instanceof ApiError) {
    if (err.status === 503) {
      authorErrorFlag.value = true;
      fatalError.value = err.message;
      return;
    }
    formError.value = err.message || fallbackScene;
    return;
  }
  formError.value = `${fallbackScene}${t("errors.unknown")}`;
}

// ===== 提交 =====
async function submitPost(): Promise<void> {
  if (!sessionStore.canWrite) return;
  resetErrors();
  if (titleLength.value < COMPOSE_LIMITS.titleMin || titleLength.value > COMPOSE_LIMITS.titleMax) {
    formError.value = t("postCompose.titleLengthInvalid", {
      min: COMPOSE_LIMITS.titleMin,
      max: COMPOSE_LIMITS.titleMax,
    });
    return;
  }
  if (!content.value.trim()) {
    formError.value = t("postCompose.contentRequired");
    return;
  }
  if (contentLength.value > COMPOSE_LIMITS.contentMax) {
    formError.value = t("postCompose.contentTooLong", { max: COMPOSE_LIMITS.contentMax });
    return;
  }
  if (tags.value.length > COMPOSE_LIMITS.tagsMax) {
    formError.value = t("postCompose.tagsExceeded", { max: COMPOSE_LIMITS.tagsMax });
    return;
  }
  if (images.value.length > COMPOSE_LIMITS.imagesMax) {
    formError.value = t("postCompose.imagesExceeded", { max: COMPOSE_LIMITS.imagesMax });
    return;
  }
  const trimmedTargetId = targetId.value.trim();
  if (targetType.value === "circle" && !trimmedTargetId) {
    formError.value = t("postCompose.targetIdRequired");
    return;
  }

  const payload: ComposePostRequest = {
    title: title.value.trim(),
    content: content.value,
    category: category.value,
    tags: tags.value.length > 0 ? [...tags.value] : undefined,
    images: images.value.length > 0 ? [...images.value] : undefined,
    targetType: targetType.value,
    targetId: trimmedTargetId ? Number(trimmedTargetId) : undefined,
  };

  submitting.value = true;
  try {
    published.value = await createAdminPost(payload);
    formError.value = "";
  } catch (err) {
    handleComposeError(err, t("postCompose.submitFailed"));
  } finally {
    submitting.value = false;
  }
}

/** 发布成功后清空表单，便于连发多条官方内容 */
function resetForm(): void {
  title.value = "";
  content.value = "";
  category.value = "sincere";
  targetType.value = "general";
  targetId.value = "";
  tags.value = [];
  tagInput.value = "";
  images.value = [];
  published.value = null;
  resetErrors();
}

onBeforeUnmount(() => {
  uploading.value = false;
  submitting.value = false;
});
</script>

<template>
  <view class="post-compose-page">
    <view class="page-header">
      <text class="page-title">{{ t("postCompose.title") }}</text>
      <text class="page-subtitle">{{ t("postCompose.subtitle") }}</text>
    </view>

    <ErrorState v-if="fatalError" :message="fatalError" @retry="resetErrors" />
    <text v-if="authorErrorFlag" class="hint-text">{{ t("postCompose.authorMisconfiguredHint") }}</text>
    <text v-if="formError" class="error-message">{{ formError }}</text>

    <form v-if="sessionStore.canWrite" class="compose-form" @submit.prevent="submitPost">
      <view class="form-row">
        <label class="form-label" for="compose-title">
          {{ t("postCompose.titleLabel") }}
          <span class="counter">{{ titleLength }} / {{ COMPOSE_LIMITS.titleMax }}</span>
        </label>
        <input
          id="compose-title"
          v-model="title"
          class="form-input"
          type="text"
          :minlength="COMPOSE_LIMITS.titleMin"
          :maxlength="COMPOSE_LIMITS.titleMax"
          :placeholder="t('postCompose.titlePlaceholder')"
        />
        <text class="hint-text">
          {{ t("postCompose.titleHint", { min: COMPOSE_LIMITS.titleMin, max: COMPOSE_LIMITS.titleMax }) }}
        </text>
      </view>

      <view class="form-row">
        <label class="form-label" for="compose-content">
          {{ t("postCompose.contentLabel") }}
          <span class="counter">{{ contentLength }} / {{ COMPOSE_LIMITS.contentMax }}</span>
        </label>
        <textarea
          id="compose-content"
          v-model="content"
          class="form-textarea"
          rows="8"
          :maxlength="COMPOSE_LIMITS.contentMax"
          :placeholder="t('postCompose.contentPlaceholder')"
        />
      </view>

      <view class="form-row">
        <label class="form-label" for="compose-category">{{ t("postCompose.categoryLabel") }}</label>
        <select id="compose-category" v-model="category" class="form-input">
          <option v-for="option in CATEGORY_OPTIONS" :key="option" :value="option">
            {{ categoryLabel(option) }}
          </option>
        </select>
      </view>

      <view class="form-row">
        <label class="form-label" for="compose-target">{{ t("postCompose.targetLabel") }}</label>
        <select id="compose-target" v-model="targetType" class="form-input">
          <option v-for="option in TARGET_OPTIONS" :key="option" :value="option">
            {{ targetLabel(option) }}
          </option>
        </select>
        <text class="hint-text">{{ t("postCompose.targetHint") }}</text>
      </view>

      <view v-if="targetType === 'circle'" class="form-row">
        <label class="form-label" for="compose-target-id">{{ t("postCompose.targetIdLabel") }}</label>
        <input
          id="compose-target-id"
          v-model="targetId"
          class="form-input"
          type="number"
          inputmode="numeric"
          :placeholder="t('postCompose.targetIdPlaceholder')"
        />
      </view>

      <view class="form-row">
        <label class="form-label" for="compose-tag">
          {{ t("postCompose.tagsLabel") }}
          <span class="counter">{{ tags.length }} / {{ COMPOSE_LIMITS.tagsMax }}</span>
        </label>
        <view class="tag-editor">
          <input
            id="compose-tag"
            v-model="tagInput"
            class="form-input tag-input"
            type="text"
            :maxlength="COMPOSE_LIMITS.tagMax"
            :placeholder="t('postCompose.tagsPlaceholder')"
            @keyup.enter.prevent="addTag"
          />
          <button class="ghost-button" type="button" @click="addTag">{{ t("postCompose.tagAdd") }}</button>
        </view>
        <view v-if="tags.length > 0" class="tag-list">
          <button
            v-for="tag in tags"
            :key="tag"
            class="tag-chip"
            type="button"
            :aria-label="t('postCompose.tagRemove')"
            @click="removeTag(tag)"
          >
            {{ tag }}
            <span class="tag-chip__remove">×</span>
          </button>
        </view>
      </view>

      <view class="form-row">
        <text class="form-label">
          {{ t("postCompose.imagesLabel") }}
          <span class="counter">{{ images.length }} / {{ COMPOSE_LIMITS.imagesMax }}</span>
        </text>
        <!-- 真实文件选择器：隐藏 input + 按钮触发，accept 与后端图片白名单一致 -->
        <input
          ref="fileInput"
          class="file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          @change="onFilesChosen"
        />
        <view class="image-actions">
          <button
            class="secondary-button"
            type="button"
            :disabled="uploading || images.length >= COMPOSE_LIMITS.imagesMax"
            @click="openFilePicker"
          >
            {{ t("postCompose.imagePick") }}
          </button>
          <text v-if="uploading" class="hint-text">{{ t("postCompose.imageUploading") }}</text>
        </view>
        <view v-if="images.length > 0" class="image-grid">
          <view v-for="url in images" :key="url" class="image-cell">
            <!-- withMediaToken 必加：用户媒体 URL 裸访问会 401 裂图 -->
            <img class="image-thumb" :src="withMediaToken(url)" :alt="t('postCompose.imageAlt')" />
            <button
              class="image-remove"
              type="button"
              :aria-label="t('postCompose.imageRemove')"
              :disabled="uploading"
              @click="removeImage(url)"
            >
              {{ t("postCompose.imageRemove") }}
            </button>
          </view>
        </view>
        <text class="hint-text">{{ t("postCompose.imageHint", { max: "10MB" }) }}</text>
      </view>

      <view class="form-actions">
        <button class="primary-button" type="submit" :disabled="!canSubmit">
          {{ submitting ? t("postCompose.submitting") : t("postCompose.submit") }}
        </button>
        <button class="ghost-button" type="button" :disabled="submitting" @click="resetForm">
          {{ t("common.reset") }}
        </button>
      </view>
    </form>

    <!-- 发布回执：后端解析出的作者 / 校区 / 圈层只读展示（表单侧不可指定） -->
    <view v-if="published" class="result-panel">
      <text class="result-title">{{ t("postCompose.publishedTitle", { id: published.id }) }}</text>
      <table class="data-table">
        <tbody>
          <tr>
            <th scope="row">{{ t("postCompose.resultAuthor") }}</th>
            <td>{{ published.authorNickname || t("postCompose.authorFallback", { id: published.authorId }) }}</td>
          </tr>
          <tr>
            <th scope="row">{{ t("postCompose.resultCampus") }}</th>
            <td>{{ published.authorCampusName || t("common.emptyPlaceholder") }}</td>
          </tr>
          <tr>
            <th scope="row">{{ t("postCompose.resultCirclePath") }}</th>
            <td>{{ published.ownerCirclePath || t("common.emptyPlaceholder") }}</td>
          </tr>
          <tr>
            <th scope="row">{{ t("postCompose.resultVisibility") }}</th>
            <td>{{ visibilityLabel(published.visibility) }}</td>
          </tr>
          <tr>
            <th scope="row">{{ t("postCompose.resultAuditStatus") }}</th>
            <td>{{ published.auditStatus }}</td>
          </tr>
          <tr>
            <th scope="row">{{ t("postCompose.resultCreatedAt") }}</th>
            <td>{{ published.createdAt ? formatDateTime(published.createdAt) : t("common.emptyPlaceholder") }}</td>
          </tr>
        </tbody>
      </table>
    </view>
  </view>
</template>

<style scoped>
/* 本视图复用 data-table / primary-button / form-input 等共享类，
   而 admin-common.css 不是全局引入（main.ts 只引 admin-tokens.css），
   缺这行 import 会让按钮与表格完全裸奔。 */
@import "../../styles/admin-common.css";

.compose-form {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-lg);
  padding: var(--admin-space-xl);
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-lg);
}

.counter {
  float: right;
  font-weight: 400;
  color: var(--admin-color-text-secondary);
  font-size: var(--admin-font-sm);
}

.hint-text {
  display: block;
  margin-top: var(--admin-space-sm);
  color: var(--admin-color-text-secondary);
  font-size: var(--admin-font-sm);
}

.tag-editor {
  display: flex;
  gap: var(--admin-space-md);
  align-items: center;
}

.tag-input {
  flex: 1;
}

.tag-list,
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--admin-space-md);
  margin-top: var(--admin-space-md);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--admin-space-sm);
  padding: var(--admin-space-xs) var(--admin-space-md);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-lg);
  background: var(--admin-color-info-soft);
  font-size: var(--admin-font-sm);
  cursor: pointer;
}

.tag-chip__remove {
  color: var(--admin-color-danger);
  font-weight: 700;
}

.image-actions {
  display: flex;
  align-items: center;
  gap: var(--admin-space-md);
}

.file-input {
  /* 隐藏原生 input，改由「选择图片」按钮触发，保持后台表单视觉一致 */
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.image-cell {
  position: relative;
  width: 120px;
}

.image-thumb {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  display: block;
}

.image-remove {
  margin-top: var(--admin-space-xs);
  width: 120px;
  padding: var(--admin-space-xs) var(--admin-space-sm);
  border: 1px solid var(--admin-color-danger-border);
  border-radius: var(--admin-radius-sm);
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
  font-size: var(--admin-font-sm);
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: var(--admin-space-md);
}

.result-panel {
  margin-top: var(--admin-space-xl);
  padding: var(--admin-space-xl);
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-lg);
}

.result-title {
  display: block;
  margin-bottom: var(--admin-space-md);
  font-size: var(--admin-font-lg);
  font-weight: 600;
}

.result-panel th {
  width: 160px;
  text-align: left;
}
</style>
