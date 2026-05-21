<script setup lang="ts">
/**
 * AvatarUploader - 头像上传组件
 * 圆形头像展示区域，点击可拍照或从相册选择
 * 支持上传前预览和上传中加载状态
 */
import { ref } from "vue";
import { clientApi } from "../../services/api";

const props = defineProps<{
  /** 当前头像 URL，为空时显示默认占位 */
  currentAvatar?: string;
}>();

const emit = defineEmits<{
  /** 上传成功后通知父组件新的头像 URL */
  uploaded: [url: string];
}>();

const previewUrl = ref<string | null>(null);
const uploading = ref(false);
const errorMsg = ref("");

/** 点击头像触发选择图片 */
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

    const tempFilePath = res.tempFilePaths[0];
    if (!tempFilePath) {
      return;
    }

    // 先预览
    previewUrl.value = tempFilePath;
    uploading.value = true;
    errorMsg.value = "";

    try {
      const result = await clientApi.uploadAvatar(tempFilePath);
      previewUrl.value = result.avatarUrl;
      emit("uploaded", result.avatarUrl);
      uni.showToast({ title: "头像上传成功", icon: "success", duration: 1500 });
    } catch (uploadErr: unknown) {
      const msg =
        uploadErr instanceof Error ? uploadErr.message : "头像上传失败";
      errorMsg.value = msg;
      uni.showToast({ title: msg, icon: "none", duration: 2000 });
      // 上传失败清除预览，恢复原头像
      previewUrl.value = null;
    } finally {
      uploading.value = false;
    }
  } catch (_chooseErr: unknown) {
    // 用户取消选择或选择失败，不做处理
  }
}

/** 当前展示的头像 URL */
const displayUrl = () => {
  if (previewUrl.value) return previewUrl.value;
  if (props.currentAvatar) return props.currentAvatar;
  return "";
};
</script>

<template>
  <view class="avatar-uploader">
    <!-- 圆形头像展示区 -->
    <view class="avatar-uploader__wrap" @click="chooseImage">
      <image
        v-if="displayUrl()"
        class="avatar-uploader__image"
        :src="displayUrl()"
        mode="aspectFill"
      />
      <view v-else class="avatar-uploader__placeholder">
        <text class="avatar-uploader__placeholder-text">点击上传</text>
      </view>

      <!-- 上传中旋转加载 -->
      <view v-if="uploading" class="avatar-uploader__loading">
        <view class="avatar-uploader__spinner" />
      </view>

      <!-- 底部分隔提示 -->
      <view class="avatar-uploader__overlay">
        <text class="avatar-uploader__overlay-text">
          {{ uploading ? '上传中...' : '更换头像' }}
        </text>
      </view>
    </view>

    <!-- 错误提示 -->
    <text v-if="errorMsg" class="avatar-uploader__error">{{ errorMsg }}</text>
  </view>
</template>

<style scoped lang="scss">
.avatar-uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx 0;
}

.avatar-uploader__wrap {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 3rpx solid var(--td-border-level-1-color, #dbe2ea);
  background: var(--td-bg-app-page, #f4f7fb);
}

.avatar-uploader__image {
  width: 100%;
  height: 100%;
}

.avatar-uploader__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.avatar-uploader__placeholder-text {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder, #94a3b8);
}

.avatar-uploader__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
}

.avatar-uploader__spinner {
  width: 44rpx;
  height: 44rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.avatar-uploader__overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  padding: 10rpx 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.45));
}

.avatar-uploader__overlay-text {
  font-size: 20rpx;
  color: #fff;
}

.avatar-uploader__error {
  font-size: 22rpx;
  color: #be123c;
}
</style>