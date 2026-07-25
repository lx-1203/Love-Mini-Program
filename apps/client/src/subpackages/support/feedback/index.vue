<script setup lang="ts">
/**
 * 反馈中心页（功能9 + 功能10 入口）
 *
 * 功能9（反馈图片上传）：
 * - 表单中支持上传最多 3 张图片（jpg/png/webp，单张 ≤ 5MB）
 * - 选用 uni.chooseImage 选图，clientApi.uploadFeedbackImage 上传
 * - 已上传的图片以缩略图网格展示，支持点击预览、长按删除
 * - 提交时将图片 URL 数组通过 attachments 字段一并发送
 *
 * 功能10（反馈历史记录）：
 * - 顶部「查看历史」入口，跳转到 /pages/feedback/history
 * - 提交记录列表项支持点击，跳转到历史详情页并带上 id 参数
 *
 * mp-weixin 兼容性：
 * - 使用 @tap（不使用 @click）
 * - 使用 hover-class（不使用 :hover 伪类）
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding（catch 必须带参数）
 * - 不使用 backdrop-filter
 */
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import StatusState from "../../../components/common/StatusState.vue";
import { useFeedbackStore } from "../../../stores/feedback";
import { clientApi } from "../../../services/api";
import {
  toSubmissionStatusLabel,
  toSubmissionStatusTone,
} from "../../../view-models/feedback";
import { errorHaptic, lightHaptic, successHaptic } from "../../../utils/haptic";
import { IMAGE_PATHS } from "../../../config/images";

/** 反馈类型枚举常量（提取为常量，便于扩展与统一维护） */
type FeedbackType = "feedback" | "suggestion" | "activity_proposal";
const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: "feedback", label: "反馈" },
  { value: "suggestion", label: "建议" },
  { value: "activity_proposal", label: "活动提案" },
];

/** 单张图片大小上限（5MB，与后端约定一致） */
const IMAGE_SIZE_LIMIT = 5 * 1024 * 1024;
/** 最多上传图片数量 */
const IMAGE_MAX_COUNT = 3;
/** 允许的图片扩展名（用于客户端预校验，后端会再次校验） */
const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"];

const { t } = useI18n();
const feedbackStore = useFeedbackStore();
const activeType = ref<FeedbackType>("feedback");
const form = reactive({
  title: "",
  content: "",
  contactWechat: "",
  /** 已上传图片 URL 数组（提交时一并发送） */
  attachments: [] as string[],
  expectedCity: null as string | null,
  expectedCampus: null as string | null,
});

/** 上传中标志（控制 + 号占位的 loading 状态与防重复触发） */
const isUploading = ref<boolean>(false);
/** 全局错误信息（用于错误条展示） */
const errorMessage = ref<string | null>(null);

/** 是否可继续添加图片（未达上限且未在上传中） */
const canAddImage = computed(
  () => !isUploading.value && form.attachments.length < IMAGE_MAX_COUNT,
);

/** 历史页路径（功能10 入口跳转） */
const HISTORY_PAGE_URL = "/pages/feedback/history";

onMounted(() => {
  void feedbackStore.load();
});

/**
 * 从 uni.chooseImage 返回值构造类 File 对象。
 *
 * 兼容 H5（File 标准）与 mp-weixin（tempFilePaths + path 字段）双端：
 * - H5：uni.chooseImage 返回 tempFiles，每项是标准 File
 * - mp-weixin：tempFiles 仅含 path/size，无 name 字段，包装为 File-like
 *
 * @param filePath - 文件路径（tempFilePath）
 * @param size - 文件大小（字节）
 * @returns 类 File 对象（含 name/path/size 字段，满足 clientApi 上传签名）
 */
function buildFileLike(filePath: string, size: number): File {
  const name = filePath.split("/").pop() || "upload";
  return {
    name,
    size,
    type: "application/octet-stream",
    path: filePath,
  } as unknown as File;
}

/**
 * 校验文件扩展名是否合法。
 *
 * @param filePath - 文件路径或文件名
 * @returns 合法返回 true，否则 false
 */
function isValidImageExt(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return ALLOWED_EXTS.some((ext) => lower.endsWith("." + ext));
}

/**
 * 选择并上传一张图片（功能9）。
 *
 * 流程：
 * 1. 校验是否已达上限（最多 3 张）
 * 2. uni.chooseImage 选择单张压缩图
 * 3. 校验文件扩展名与大小
 * 4. 构造类 File 对象（兼容 mp-weixin path 字段）
 * 5. 调用 clientApi.uploadFeedbackImage 上传，拿到 URL 后追加到 form.attachments
 * 6. 失败时 toast 提示错误信息
 *
 * 错误处理：
 * - 用户取消选择：静默处理（errMsg 包含 "cancel"）
 * - 扩展名不合法：toast 提示
 * - 文件过大：toast 提示
 * - 上传失败：toast 提示并设置 errorMessage
 */
function handleAddImage(): void {
  // 防重复触发 + 上限校验
  if (isUploading.value) return;
  if (form.attachments.length >= IMAGE_MAX_COUNT) {
    errorHaptic();
    uni.showToast({
      title: t("feedback.imageMaxLimit"),
      icon: "none",
    });
    return;
  }
  lightHaptic();
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPath = res.tempFilePaths?.[0] ?? "";
      const tempFile = res.tempFiles?.[0];
      const size = (tempFile as { size?: number })?.size ?? 0;
      if (!tempPath) {
        errorHaptic();
        uni.showToast({
          title: t("feedback.imageUploadFailed"),
          icon: "none",
        });
        return;
      }
      // 校验扩展名
      if (!isValidImageExt(tempPath)) {
        errorHaptic();
        uni.showToast({
          title: t("feedback.imageUploadFailed"),
          icon: "none",
        });
        return;
      }
      // 校验文件大小
      if (size > IMAGE_SIZE_LIMIT) {
        errorHaptic();
        uni.showToast({
          title: t("feedback.imageSizeLimit"),
          icon: "none",
        });
        return;
      }
      const file = buildFileLike(tempPath, size);
      void uploadImage(file);
    },
    fail: (err) => {
      // 用户取消选择时不报错（errMsg 包含 "cancel"）
      if (err && typeof err.errMsg === "string" && err.errMsg.includes("cancel")) {
        return;
      }
      errorHaptic();
      uni.showToast({
        title: t("feedback.imageUploadFailed"),
        icon: "none",
      });
    },
  });
}

/**
 * 执行图片上传（内联辅助函数，统一处理 loading / 错误）。
 *
 * @param file - 类 File 对象
 */
async function uploadImage(file: File): Promise<void> {
  isUploading.value = true;
  errorMessage.value = null;
  try {
    const result = await clientApi.uploadFeedbackImage(file);
    if (!result?.url) {
      throw new Error(t("feedback.imageUploadFailed"));
    }
    form.attachments = [...form.attachments, result.url];
    successHaptic();
    uni.showToast({
      title: t("feedback.imageUploadSuccess"),
      icon: "success",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : t("feedback.imageUploadFailed");
    errorMessage.value = msg;
    errorHaptic();
    uni.showToast({ title: msg, icon: "none" });
  } finally {
    isUploading.value = false;
  }
}

/**
 * 删除已上传的图片（带二次确认）。
 *
 * @param index - 图片在 attachments 数组中的索引
 */
function handleRemoveImage(index: number): void {
  if (index < 0 || index >= form.attachments.length) return;
  lightHaptic();
  uni.showModal({
    title: t("feedback.imageRemove"),
    content: t("feedback.imageRemove"),
    confirmText: t("common.confirm"),
    cancelText: t("common.cancel"),
    success: (res) => {
      if (res.confirm) {
        form.attachments = form.attachments.filter((_, i) => i !== index);
        successHaptic();
      }
    },
  });
}

/**
 * 点击已上传图片：全屏预览。
 *
 * @param index - 图片索引
 */
function handleImageTap(index: number): void {
  const url = form.attachments[index];
  if (!url) return;
  lightHaptic();
  uni.previewImage({
    urls: form.attachments,
    current: url,
  });
}

/**
 * 提交反馈：包裹 try-catch，失败时 toast 提示；防重复提交锁。
 *
 * 提交成功后清空表单（包括 attachments），并刷新列表。
 */
const isSubmitting = ref(false);
async function submit(): Promise<void> {
  if (isSubmitting.value) return;
  // 标题与内容必填校验
  if (!form.title.trim() || !form.content.trim()) {
    errorHaptic();
    uni.showToast({
      title: t("feedback.submitFailed"),
      icon: "none",
    });
    return;
  }
  isSubmitting.value = true;
  try {
    let ok = false;
    if (activeType.value === "feedback") {
      ok = await feedbackStore.submitIssue(form);
    } else if (activeType.value === "suggestion") {
      ok = await feedbackStore.submitSuggestion(form);
    } else {
      ok = await feedbackStore.submitActivityProposal(form);
    }
    if (ok) {
      // 清空表单
      form.title = "";
      form.content = "";
      form.contactWechat = "";
      form.attachments = [];
      successHaptic();
      uni.showToast({
        title: t("feedback.submitSuccess"),
        icon: "success",
      });
    } else {
      // 失败时统一提示，错误信息来自 store.errorMessage
      errorHaptic();
      uni.showToast({
        title: feedbackStore.errorMessage || t("feedback.submitFailed"),
        icon: "none",
      });
    }
  } catch (error) {
    // 异常兜底（store 已 try-catch，理论上不会抛出，但保险起见）
    const message = error instanceof Error ? error.message : t("feedback.submitFailed");
    errorHaptic();
    uni.showToast({ title: message, icon: "none" });
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * 跳转到反馈历史页（功能10 入口）。
 *
 * 使用 uni.navigateTo 跳转到 /pages/feedback/history。
 * 失败时静默处理（如页面栈已满），不抛出异常。
 */
function goHistory(): void {
  lightHaptic();
  // #ifdef MP-WEIXIN
  uni.navigateTo({
    url: HISTORY_PAGE_URL,
    fail: () => {
      // 跳转失败时静默处理
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateTo({ url: HISTORY_PAGE_URL }).catch(() => {
    // 跳转失败时静默处理
  });
  // #endif
}

/**
 * 点击列表项跳转到历史详情页（功能10 详情入口）。
 *
 * @param id - 反馈记录 ID
 */
function goDetail(id: number): void {
  lightHaptic();
  const url = `${HISTORY_PAGE_URL}?id=${id}`;
  // #ifdef MP-WEIXIN
  uni.navigateTo({
    url,
    fail: () => {
      // 跳转失败时静默处理
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateTo({ url }).catch(() => {
    // 跳转失败时静默处理
  });
  // #endif
}
</script>

<template>
  <AppShell title="反馈中心" subtitle="反馈、建议和活动提案共用一个入口。" :show-tab-bar="false">
    <SectionCard title="新建提交" compact>
      <view class="chips">
        <text
          v-for="item in FEEDBACK_TYPES"
          :key="item.value"
          class="chip press-feedback"
          :class="{ 'chip--active': activeType === item.value }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="activeType = item.value"
        >{{ item.label }}</text>
      </view>
      <input v-model="form.title" class="field" placeholder="标题" />
      <textarea v-model="form.content" class="field field--textarea" maxlength="280" />
      <input v-model="form.contactWechat" class="field" placeholder="选填微信号" />

      <!-- 功能9：图片上传区 -->
      <view class="image-upload">
        <view class="image-upload__header">
          <text class="image-upload__title">{{ t("feedback.imageUpload") }}</text>
          <text class="image-upload__hint">{{ t("feedback.imageUploadHint") }}</text>
        </view>
        <view class="image-grid">
          <!-- 已上传图片缩略图 -->
          <view
            v-for="(url, idx) in form.attachments"
            :key="`img-${idx}`"
            class="image-cell press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleImageTap(idx)"
            @longpress="handleRemoveImage(idx)"
          >
            <image
              class="image-cell__img"
              :src="url"
              mode="aspectFill"
              lazy-load
            />
            <view class="image-cell__remove" @tap.stop="handleRemoveImage(idx)">
              <text class="image-cell__remove-icon">✕</text>
            </view>
          </view>
          <!-- 添加图片占位（+ 号按钮） -->
          <view
            v-if="canAddImage"
            class="image-cell image-cell--add press-feedback"
            :class="{ 'image-cell--uploading': isUploading }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="handleAddImage"
          >
            <view v-if="isUploading" class="image-cell__spinner" />
            <template v-else>
              <image
                class="image-cell__plus-icon"
                :src="IMAGE_PATHS.ICONS_COMMON.CAMERA"
                mode="aspectFit"
              />
              <text class="image-cell__plus-text">{{ t("feedback.imageUpload") }}</text>
            </template>
          </view>
        </view>
      </view>

      <BottomActionBar
        :primary-label="isSubmitting ? t('common.submitting') : t('common.submit')"
        @primary="submit"
      />
    </SectionCard>

    <!-- 功能10：提交记录列表 + 历史入口 -->
    <SectionCard :title="t('feedback.historyTitle')" compact>
      <view class="history-header">
        <text class="history-header__hint">{{ t("feedback.historyEmptyDesc") }}</text>
        <view
          class="history-header__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="goHistory"
        >
          <text class="history-header__btn-text">{{ t("feedback.history") }}</text>
        </view>
      </view>

      <view v-if="feedbackStore.submissions.length === 0" class="empty-state">
        <text class="empty-state__text">{{ t("feedback.historyEmpty") }}</text>
      </view>

      <view
        v-for="item in feedbackStore.submissions"
        :key="item.id"
        class="submission press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="goDetail(item.id)"
      >
        <view class="submission__top">
          <text class="submission__title">{{ item.title }}</text>
          <StatusState
            :tone="toSubmissionStatusTone(item.status)"
            :label="toSubmissionStatusLabel(item.status)"
          />
        </view>
        <text class="submission__summary">{{ item.latestReplySummary }}</text>
        <text class="submission__time">{{ item.submittedAt }}</text>
      </view>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.chip {
  padding: 12rpx 18rpx;
  border-radius: 999px;
  background: var(--c-bg-brand);
  color: var(--c-brand-700);
}

.chip--active {
  background: var(--c-brand);
  color: var(--c-text-inverse, #ffffff);
  font-weight: 600;
}

.field {
  width: 100%;
  min-height: 88rpx;
  padding: 18rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: var(--c-bg-page);
}

.field--textarea {
  min-height: 180rpx;
}

/* ========== 功能9：图片上传区 ========== */
.image-upload {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.image-upload__header {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.image-upload__title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--c-text-primary);
}

.image-upload__hint {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-cell {
  position: relative;
  width: 180rpx;
  height: 180rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: var(--c-bg-page);
  border: 1rpx dashed var(--c-border-default, rgba(15, 23, 42, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-cell__img {
  width: 100%;
  height: 100%;
  display: block;
}

.image-cell__remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-cell__remove-icon {
  color: #ffffff;
  font-size: 22rpx;
  line-height: 1;
}

.image-cell--add {
  flex-direction: column;
  gap: 8rpx;
}

.image-cell--uploading {
  border-style: solid;
}

.image-cell__plus-icon {
  width: 48rpx;
  height: 48rpx;
  opacity: 0.55;
}

.image-cell__plus-text {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}

.image-cell__spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid var(--c-border-default, rgba(15, 23, 42, 0.08));
  border-top-color: var(--c-brand);
  border-radius: 50%;
  animation: feedback-spinner 0.8s linear infinite;
}

@keyframes feedback-spinner {
  to {
    transform: rotate(360deg);
  }
}

/* ========== 功能10：历史入口与列表 ========== */
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid var(--c-border-light, rgba(15, 23, 42, 0.04));
}

.history-header__hint {
  font-size: 24rpx;
  color: var(--c-text-tertiary);
  flex: 1;
}

.history-header__btn {
  padding: 10rpx 20rpx;
  border-radius: 999px;
  background: var(--c-bg-brand);
}

.history-header__btn-text {
  font-size: 24rpx;
  color: var(--c-brand-700);
  font-weight: 600;
}

.empty-state {
  padding: 40rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state__text {
  font-size: 26rpx;
  color: var(--c-text-tertiary);
}

.submission {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 18rpx 0;
  border-top: 1px solid var(--c-border-light, rgba(15, 23, 42, 0.04));
}

.submission__top {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.submission__title {
  font-weight: 700;
  color: var(--c-text-primary);
}

.submission__summary {
  color: var(--c-text-secondary);
  line-height: 1.6;
  font-size: 26rpx;
}

.submission__time {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}
</style>
