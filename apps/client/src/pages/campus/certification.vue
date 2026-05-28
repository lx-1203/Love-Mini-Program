<script setup lang="ts">
/**
 * 学生证认证页面
 *
 * 功能：
 * - 学校名称输入
 * - 专业输入
 * - 学生证照片上传（使用uni-app的图片选择API）
 * - 提交审核按钮
 * - 认证状态展示（审核中/已认证/未通过）
 */
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useCampusStore, CERT_STATUS_MAP } from "../../stores/campus";
import type { CertificationStatus } from "../../stores/campus";

const campusStore = useCampusStore();
const { certificationStatus, certificationInfo, loading } = storeToRefs(campusStore);

/** 学校名称 */
const schoolName = ref("");
/** 专业 */
const major = ref("");
/** 学生证照片路径 */
const studentCardUrl = ref("");
/** 是否正在提交 */
const isSubmitting = ref(false);

/**
 * 上传学生证照片
 */
function uploadStudentCard() {
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPath = res.tempFilePaths[0] as string;
      studentCardUrl.value = tempPath;
    },
    fail: (err) => {
      console.error("选择图片失败:", err);
      uni.showToast({ title: "选择图片失败", icon: "none" });
    },
  });
}

/**
 * 提交认证
 */
async function submitCert() {
  if (!schoolName.value.trim()) {
    uni.showToast({ title: "请输入学校名称", icon: "none" });
    return;
  }
  if (!major.value.trim()) {
    uni.showToast({ title: "请输入专业", icon: "none" });
    return;
  }
  if (!studentCardUrl.value) {
    uni.showToast({ title: "请上传学生证照片", icon: "none" });
    return;
  }

  isSubmitting.value = true;
  try {
    await campusStore.submitCertification({
      schoolName: schoolName.value.trim(),
      major: major.value.trim(),
      studentCardUrl: studentCardUrl.value,
    });
    uni.showToast({ title: "提交成功，请等待审核", icon: "success" });
  } catch {
    uni.showToast({
      title: campusStore.errorMessage || "提交失败",
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

/**
 * 获取认证状态对应的样式类
 */
function statusCardClass(status: CertificationStatus): string {
  switch (status) {
    case "verified":
      return "status-card--verified";
    case "pending":
      return "status-card--pending";
    case "rejected":
      return "status-card--rejected";
    default:
      return "status-card--unverified";
  }
}

/**
 * 获取认证状态对应的图标
 */
function statusIcon(status: CertificationStatus): string {
  switch (status) {
    case "verified":
      return "✅";
    case "pending":
      return "⏳";
    case "rejected":
      return "❌";
    default:
      return "📝";
  }
}

onMounted(() => {
  void campusStore.fetchCertificationStatus();
});
</script>

<template>
  <view class="cert-page">
    <!-- 顶部导航栏 -->
    <view class="cert-header">
      <view class="cert-header__back" @tap="goBack">
        <text class="back-icon">返回</text>
      </view>
      <text class="cert-header__title">学生认证</text>
      <view class="cert-header__spacer" />
    </view>

    <scroll-view class="cert-body" scroll-y>
      <!-- 认证状态卡片 -->
      <view
        v-if="certificationStatus !== 'unverified'"
        class="status-card"
        :class="statusCardClass(certificationStatus)"
      >
        <text class="status-card__icon">{{ statusIcon(certificationStatus) }}</text>
        <view class="status-card__body">
          <text class="status-card__title">{{ CERT_STATUS_MAP[certificationStatus] }}</text>
          <text v-if="certificationStatus === 'pending'" class="status-card__desc">
            你的认证正在审核中，通常需要1-3个工作日，请耐心等待
          </text>
          <text v-else-if="certificationStatus === 'verified'" class="status-card__desc">
            恭喜！你已通过学生认证，可以畅享校园专区所有功能
          </text>
          <text v-else-if="certificationStatus === 'rejected'" class="status-card__desc">
            很遗憾，你的认证未通过。原因：{{ certificationInfo?.reviewComment || "信息不符" }}，请重新提交
          </text>
        </view>
      </view>

      <!-- 认证表单（未认证或被拒绝时显示） -->
      <template v-if="certificationStatus === 'unverified' || certificationStatus === 'rejected'">
        <!-- 说明卡片 -->
        <view class="info-card">
          <text class="info-card__icon">🎓</text>
          <text class="info-card__title">为什么要认证？</text>
          <view class="info-card__list">
            <text class="info-card__item">• 解锁校园话题讨论</text>
            <text class="info-card__item">• 与同校同学互动交流</text>
            <text class="info-card__item">• 参与校园活动和社团招新</text>
            <text class="info-card__item">• 获取校友资源和人脉</text>
          </view>
        </view>

        <!-- 表单 -->
        <view class="form-section">
          <!-- 学校名称 -->
          <view class="form-group">
            <text class="form-label">学校名称</text>
            <input
              v-model="schoolName"
              class="form-input"
              placeholder="请输入你的学校全称"
            />
          </view>

          <!-- 专业 -->
          <view class="form-group">
            <text class="form-label">专业</text>
            <input
              v-model="major"
              class="form-input"
              placeholder="请输入你的专业"
            />
          </view>

          <!-- 学生证照片上传 -->
          <view class="form-group">
            <text class="form-label">学生证照片</text>
            <text class="form-hint">
              确保照片清晰，包含学校名称、姓名、学号等信息
            </text>

            <view v-if="!studentCardUrl" class="upload-area" @tap="uploadStudentCard">
              <text class="upload-icon">📷</text>
              <text class="upload-text">点击上传学生证照片</text>
              <text class="upload-sub">支持拍照或从相册选择</text>
            </view>

            <view v-else class="upload-preview">
              <image
                class="upload-preview__img"
                :src="studentCardUrl"
                mode="aspectFill"
              />
              <view class="upload-preview__actions">
                <view class="upload-preview__reupload" @tap="uploadStudentCard">
                  <text class="reupload-text">重新上传</text>
                </view>
                <view class="upload-preview__remove" @tap="studentCardUrl = ''">
                  <text class="remove-icon">x</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 提交按钮 -->
          <view
            class="submit-btn"
            :class="{ 'submit-btn--disabled': isSubmitting }"
            @tap="submitCert"
          >
            <text class="submit-btn__text">
              {{ isSubmitting ? "提交中..." : "提交审核" }}
            </text>
          </view>

          <!-- 底部提示 -->
          <view class="privacy-tip">
            <text class="privacy-tip__text">
              你的信息仅用于学生身份认证，我们承诺保护你的隐私安全
            </text>
          </view>
        </view>
      </template>

      <!-- 已认证提示 -->
      <view v-if="certificationStatus === 'verified'" class="verified-info">
        <view class="verified-card">
          <view class="verified-card__row">
            <text class="verified-label">学校</text>
            <text class="verified-value">{{ certificationInfo?.schoolName || "-" }}</text>
          </view>
          <view class="verified-card__divider" />
          <view class="verified-card__row">
            <text class="verified-label">专业</text>
            <text class="verified-value">{{ certificationInfo?.major || "-" }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.cert-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--td-bg-app-page);
}

/* ========== 顶部导航栏 ========== */
.cert-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 24rpx) 32rpx 24rpx;
  background: var(--td-bg-color-container);
  border-bottom: 1rpx solid var(--td-border-level-1-color);
  z-index: 10;
}

.cert-header__back {
  padding: 8rpx 0;
  min-width: 80rpx;
}

.back-icon {
  font-size: 28rpx;
  color: var(--td-text-color-secondary);
}

.cert-header__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.cert-header__spacer {
  min-width: 80rpx;
}

/* ========== 内容区 ========== */
.cert-body {
  flex: 1;
  padding: 20rpx 24rpx 40rpx;
}

/* ========== 认证状态卡片 ========== */
.status-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 28rpx;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}

.status-card--pending {
  background: linear-gradient(135deg, #fefce8, #fef9c3);
  border: 1rpx solid rgba(251, 191, 36, 0.3);
}

.status-card--verified {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 1rpx solid rgba(34, 197, 94, 0.3);
}

.status-card--rejected {
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: 1rpx solid rgba(239, 68, 68, 0.3);
}

.status-card--unverified {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  border: 1rpx solid var(--td-border-level-1-color);
}

.status-card__icon {
  font-size: 48rpx;
  flex-shrink: 0;
}

.status-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.status-card__title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.status-card__desc {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.5;
}

/* ========== 说明卡片 ========== */
.info-card {
  padding: 28rpx 28rpx;
  background: var(--td-bg-color-container);
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}

.info-card__icon {
  font-size: 48rpx;
  display: block;
  margin-bottom: 12rpx;
}

.info-card__title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  display: block;
  margin-bottom: 16rpx;
}

.info-card__list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.info-card__item {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.5;
}

/* ========== 表单 ========== */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-group {
  background: var(--td-bg-color-container);
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.form-hint {
  font-size: 24rpx;
  color: var(--td-text-color-placeholder);
  line-height: 1.5;
}

.form-input {
  padding: 16rpx 0;
  font-size: 30rpx;
  color: var(--td-text-color-primary);
  border-bottom: 1rpx solid var(--td-border-level-1-color);
}

/* ========== 上传区域 ========== */
.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 60rpx 20rpx;
  border-radius: 16rpx;
  border: 2rpx dashed var(--td-border-level-2-color);
  background: var(--td-bg-app-page);
}

.upload-icon {
  font-size: 56rpx;
}

.upload-text {
  font-size: 28rpx;
  color: var(--td-text-color-primary);
  font-weight: 500;
}

.upload-sub {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
}

/* ========== 上传预览 ========== */
.upload-preview {
  border-radius: 16rpx;
  overflow: hidden;
  background: var(--td-bg-app-page);
}

.upload-preview__img {
  width: 100%;
  height: 320rpx;
}

.upload-preview__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 20rpx;
}

.upload-preview__reupload {
  padding: 10rpx 24rpx;
  border-radius: 999px;
  background: var(--td-bg-app-page);
  border: 1rpx solid var(--td-border-level-1-color);
}

.reupload-text {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.upload-preview__remove {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-icon {
  font-size: 24rpx;
  color: var(--td-error-color);
  font-weight: 700;
}

/* ========== 提交按钮 ========== */
.submit-btn {
  width: 100%;
  padding: 26rpx 0;
  border-radius: 16rpx;
  background: var(--td-brand-color-7);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12rpx;
}

.submit-btn--disabled {
  background: var(--td-bg-color-component-disabled);
  pointer-events: none;
}

.submit-btn__text {
  font-size: 32rpx;
  color: #ffffff;
  font-weight: 600;
}

.submit-btn--disabled .submit-btn__text {
  color: var(--td-text-color-disabled);
}

/* ========== 隐私提示 ========== */
.privacy-tip {
  display: flex;
  justify-content: center;
  padding: 16rpx 0;
}

.privacy-tip__text {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder);
  text-align: center;
}

/* ========== 已认证信息卡片 ========== */
.verified-info {
  margin-top: 8rpx;
}

.verified-card {
  padding: 28rpx 28rpx;
  background: var(--td-bg-color-container);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.verified-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.verified-label {
  font-size: 28rpx;
  color: var(--td-text-color-placeholder);
}

.verified-value {
  font-size: 28rpx;
  color: var(--td-text-color-primary);
  font-weight: 500;
}

.verified-card__divider {
  height: 1rpx;
  background: var(--td-border-level-1-color);
}
</style>