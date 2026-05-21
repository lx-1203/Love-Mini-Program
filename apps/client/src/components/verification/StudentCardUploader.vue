<script setup lang="ts">
/**
 * StudentCardUploader - 学生证上传组件
 * 包含：图片选择预览、学号输入、提交按钮、上传进度
 */
import { ref } from "vue";
import { clientApi } from "../../services/api";

const props = defineProps<{
  /** 已存在的学号（用于预填） */
  studentIdInitial?: string;
  /** 当前认证状态 */
  verificationStatus?: "pending" | "approved" | "rejected";
}>();

const emit = defineEmits<{
  /** 提交成功后通知父组件 */
  submitted: [status: typeof props.verificationStatus];
}>();

const imagePath = ref<string | null>(null);
const studentId = ref(props.studentIdInitial || "");
const uploading = ref(false);
const uploadProgress = ref(0);
const errorMsg = ref("");

/** 选择学生证图片 */
async function chooseImage() {
  errorMsg.value = "";
  try {
    const res = await new Promise<UniApp.ChooseImageSuccessCallbackResult>(
      (resolve, reject) => {
        uni.chooseImage({
          count: 1,
          sizeType: ["compressed"],
          sourceType: ["album", "camera"],
          success: (result) => resolve(result),
          fail: (err) => reject(err),
        });
      }
    );

    if (res.tempFilePaths[0]) {
      imagePath.value = res.tempFilePaths[0];
    }
  } catch (_err: unknown) {
    // 用户取消选择
  }
}

/** 清除已选择的图片 */
function clearImage() {
  imagePath.value = null;
}

/** 提交认证 */
async function submit() {
  if (!imagePath.value) {
    errorMsg.value = "请先选择学生证照片";
    return;
  }
  if (!studentId.value.trim()) {
    errorMsg.value = "请输入学号";
    return;
  }

  errorMsg.value = "";
  uploading.value = true;
  uploadProgress.value = 0;

  // 模拟上传进度
  const progressTimer = setInterval(() => {
    if (uploadProgress.value < 90) {
      uploadProgress.value += 10;
    }
  }, 300);

  try {
    const status = await clientApi.submitVerification(imagePath.value, studentId.value.trim());
    uploadProgress.value = 100;
    uni.showToast({ title: "认证申请已提交", icon: "success", duration: 2000 });
    emit("submitted", status.status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "提交失败，请稍后重试";
    errorMsg.value = msg;
    uni.showToast({ title: msg, icon: "none", duration: 2000 });
  } finally {
    clearInterval(progressTimer);
    uploading.value = false;
    uploadProgress.value = 0;
  }
}

/** 是否可以提交 */
const canSubmit = () => imagePath.value && studentId.value.trim() && !uploading.value;
</script>

<template>
  <view class="student-card-uploader">
    <!-- 图片上传区域 -->
    <view class="student-card-uploader__image-area" @click="chooseImage">
      <image
        v-if="imagePath"
        class="student-card-uploader__preview"
        :src="imagePath"
        mode="aspectFit"
      />
      <view v-else class="student-card-uploader__placeholder">
        <text class="student-card-uploader__placeholder-icon">+</text>
        <text class="student-card-uploader__placeholder-text">点击上传学生证照片</text>
        <text class="student-card-uploader__placeholder-hint">支持从相册选择或拍照</text>
      </view>

      <!-- 上传进度条 -->
      <view v-if="uploading" class="student-card-uploader__progress">
        <view
          class="student-card-uploader__progress-bar"
          :style="{ width: uploadProgress + '%' }"
        />
        <text class="student-card-uploader__progress-text">
          {{ uploadProgress }}%
        </text>
      </view>
    </view>

    <!-- 图片操作按钮 -->
    <view v-if="imagePath && !uploading" class="student-card-uploader__image-actions">
      <text class="student-card-uploader__action-link" @click="chooseImage">重新选择</text>
      <text class="student-card-uploader__action-link" @click="clearImage">移除</text>
    </view>

    <!-- 学号输入 -->
    <view class="student-card-uploader__field">
      <text class="student-card-uploader__field-label">学号</text>
      <input
        v-model="studentId"
        class="student-card-uploader__input"
        type="text"
        placeholder="请输入学号"
        :disabled="uploading"
        maxlength="20"
      />
    </view>

    <!-- 错误提示 -->
    <text v-if="errorMsg" class="student-card-uploader__error">{{ errorMsg }}</text>

    <!-- 提交按钮 -->
    <button
      class="student-card-uploader__submit-btn"
      :disabled="!canSubmit()"
      :class="{ 'student-card-uploader__submit-btn--disabled': !canSubmit() }"
      @click="submit"
    >
      {{ uploading ? '提交中...' : '提交认证' }}
    </button>
  </view>
</template>

<style scoped lang="scss">
.student-card-uploader {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.student-card-uploader__image-area {
  position: relative;
  width: 100%;
  aspect-ratio: 1.58; // 学生证标准比例
  border: 2rpx dashed var(--td-border-level-1-color, #dbe2ea);
  border-radius: 18rpx;
  overflow: hidden;
  background: var(--td-bg-app-page, #f4f7fb);
}

.student-card-uploader__preview {
  width: 100%;
  height: 100%;
}

.student-card-uploader__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 10rpx;
}

.student-card-uploader__placeholder-icon {
  font-size: 56rpx;
  color: var(--td-brand-color-7, #1d4ed8);
  font-weight: 300;
}

.student-card-uploader__placeholder-text {
  font-size: 26rpx;
  color: var(--td-text-color-secondary, #475569);
}

.student-card-uploader__placeholder-hint {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder, #94a3b8);
}

.student-card-uploader__progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 8rpx;
  background: rgba(0, 0, 0, 0.15);
}

.student-card-uploader__progress-bar {
  height: 100%;
  background: var(--td-brand-color-7, #1d4ed8);
  transition: width 0.3s ease;
}

.student-card-uploader__progress-text {
  position: absolute;
  right: 8rpx;
  top: -28rpx;
  font-size: 20rpx;
  color: var(--td-brand-color-7, #1d4ed8);
}

.student-card-uploader__image-actions {
  display: flex;
  justify-content: flex-end;
  gap: 28rpx;
}

.student-card-uploader__action-link {
  font-size: 24rpx;
  color: var(--td-brand-color-7, #1d4ed8);
}

.student-card-uploader__field {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.student-card-uploader__field-label {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--td-text-color-primary, #0f172a);
  flex-shrink: 0;
  width: 80rpx;
}

.student-card-uploader__input {
  flex: 1;
  height: 88rpx;
  padding: 0 20rpx;
  border-radius: 18rpx;
  background: var(--td-bg-app-page, #f4f7fb);
  font-size: 28rpx;
  box-sizing: border-box;
}

.student-card-uploader__error {
  font-size: 24rpx;
  color: #be123c;
}

.student-card-uploader__submit-btn {
  width: 100%;
  height: 92rpx;
  border: 0;
  border-radius: 20rpx;
  background: var(--td-brand-color-7, #1d4ed8);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}

.student-card-uploader__submit-btn--disabled {
  opacity: 0.5;
}
</style>