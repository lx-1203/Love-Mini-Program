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
import { ref, onMounted, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useCampusStore, CERT_STATUS_MAP } from "../../stores/campus";
import type { CertificationStatus } from "../../stores/campus";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../utils/privacy";

const campusStore = useCampusStore();
// 修复（严格模式 noUnusedLocals）：loading 未在模板/脚本中引用，已从解构中移除。
const { certificationStatus, certificationInfo } = storeToRefs(campusStore);

const pageVisible = ref(false);
/** SubTask 1.5.2：页面进入淡入定时器引用，用于卸载时清理 */
let pageEnterTimer: ReturnType<typeof setTimeout> | null = null;

onShow(() => {
  pageVisible.value = false;
  if (pageEnterTimer) clearTimeout(pageEnterTimer);
  pageEnterTimer = setTimeout(() => {
    pageEnterTimer = null;
    pageVisible.value = true;
  }, 30);
});

/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 */
onUnmounted(() => {
  if (pageEnterTimer) {
    clearTimeout(pageEnterTimer);
    pageEnterTimer = null;
  }
});

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
 *
 * Task 0.2.4：调用 chooseImage 前先调用 ensurePrivacyAuthorized 检查隐私授权。
 * - 用户已同意隐私协议 → 继续选择图片
 * - 用户拒绝或未授权 → 提示并终止
 * - H5/APP 环境不支持隐私 API → 直接通过
 */
async function uploadStudentCard() {
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({
      title: "需同意隐私协议后才能上传图片",
      icon: "none",
    });
    return;
  }
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
  } catch (_e) {
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
      return IMAGE_PATHS.ICONS_COMMON.CHECK;
    case "pending":
      return "";
    case "rejected":
      return IMAGE_PATHS.ICONS_COMMON.CLOSE;
    default:
      return IMAGE_PATHS.ICONS_COMMON.EDIT;
  }
}

onMounted(() => {
  void campusStore.fetchCertificationStatus();
});
</script>

<template>
  <view class="cert-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部导航栏 -->
    <view class="cert-header">
      <view class="cert-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
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
          <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="info-card__icon" mode="aspectFit" />
          <text class="info-card__title">为什么要认证？</text>
          <view class="info-card__list" role="list">
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
              placeholder="请输入你的学校全称" aria-label="请输入你的学校全称"
            />
          </view>

          <!-- 专业 -->
          <view class="form-group">
            <text class="form-label">专业</text>
            <input
              v-model="major"
              class="form-input"
              placeholder="请输入你的专业" aria-label="请输入你的专业"
            />
          </view>

          <!-- 学生证照片上传 -->
          <view class="form-group">
            <text class="form-label">学生证照片</text>
            <text class="form-hint">
              确保照片清晰，包含学校名称、姓名、学号等信息
            </text>

            <view v-if="!studentCardUrl" class="upload-area press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="uploadStudentCard">
              <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.CAMERA" custom-class="upload-icon" mode="aspectFit" />
              <text class="upload-text">点击上传学生证照片</text>
              <text class="upload-sub">支持拍照或从相册选择</text>
            </view>

            <view v-else class="upload-preview">
              <image
                class="upload-preview__img"
                :src="studentCardUrl"
                mode="aspectFill" alt=""
              />
              <view class="upload-preview__actions">
                <view class="upload-preview__reupload press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="uploadStudentCard">
                  <text class="reupload-text">重新上传</text>
                </view>
                <view class="upload-preview__remove press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="studentCardUrl = ''">
                  <text class="remove-icon">x</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 提交按钮 -->
          <view
            class="submit-btn press-feedback"
            :class="{ 'submit-btn--disabled': isSubmitting }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
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
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  height: 100%;
  background: var(--c-gradient-page);
}

/* ========== 顶部导航栏 ========== */
.cert-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + var(--sp-6)) var(--sp-8) var(--sp-6);
  background: linear-gradient(135deg, var(--c-brand) 0%, var(--c-brand-300) 60%, var(--c-romance-300) 100%);
  z-index: var(--z-header);
}

.cert-header__back {
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-full);
  background: var(--c-overlay-white-bg-mid-strong, var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.25)));
}

/* #ifdef H5 */
.cert-header__back:active {
  transform: scale(0.96);
  background: var(--c-overlay-white-bg-stronger, var(--c-overlay-white-bg-stronger, rgba(255, 255, 255, 0.4)));
}
/* #endif */

.back-icon {
  font-size: var(--fs-base);
  color: var(--c-text-inverse);
  font-weight: 500;
}

.cert-header__title {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.cert-header__spacer {
  min-width: 80rpx;
}

/* ========== 内容区 ========== */
.cert-body {
  flex: 1;
  padding: var(--sp-6);
}

/* ========== 认证状态卡片 ========== */
.status-card {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-7);
  border-radius: var(--r-xl);
  margin-bottom: var(--sp-6);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

/* #ifdef H5 */
.status-card:active {
  transform: scale(0.98);
}
/* #endif */

.status-card--pending {
  background: linear-gradient(135deg, var(--c-warning-bg-tint, #FEF9C3), var(--c-warning-bg-tint, #FEF3C7));
  border: 2rpx solid var(--c-vip-border-light, var(--c-vip-border-light, rgba(201, 163, 106, 0.3)));
}

.status-card--verified {
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-success-bg-tint, #DCFCE7));
  border: 2rpx solid var(--c-brand-border-tint-stronger, var(--c-brand-border-tint-stronger, rgba(63, 207, 142, 0.3)));
}

.status-card--rejected {
  background: linear-gradient(135deg, var(--c-red-bg-tint, #FEF2F2), var(--c-red-bg-tint, #FEE2E2));
  border: 2rpx solid var(--s-action-error, var(--s-action-error, rgba(229, 69, 77, 0.3)));
}

.status-card--unverified {
  background: var(--c-bg-container);
  border: var(--c-border-card);
}

.status-card__icon {
  font-size: var(--fs-4xl);
  flex-shrink: 0;
}

.status-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.status-card__title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.status-card__desc {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

/* ========== 说明卡片 ========== */
.info-card {
  padding: var(--sp-7);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  margin-bottom: var(--sp-6);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.info-card__icon {
  width: 44rpx;
  height: 44rpx;
  display: block;
  margin-bottom: var(--sp-3);
}

.info-card__title {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
  display: block;
  margin-bottom: var(--sp-4);
}

.info-card__list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.info-card__item {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

/* ========== 表单 ========== */
.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.form-group {
  background: var(--c-bg-container);
  padding: var(--sp-7);
  border-radius: var(--r-xl);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.form-label {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.form-hint {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  line-height: 1.5;
}

.form-input {
  padding: var(--sp-5) var(--sp-6);
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  border-radius: var(--r-md);
  background: var(--c-bg-page);
  border: 2rpx solid transparent;
}

/* ========== 上传区域 ========== */
.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: 60rpx var(--sp-5);
  border-radius: var(--r-lg);
  border: 2rpx dashed var(--c-border-default);
  background: var(--c-bg-page);
}

/* #ifdef H5 */
.upload-area:active {
  transform: scale(0.98);
  border-color: var(--c-brand);
  background: var(--c-bg-brand);
}
/* #endif */

.upload-icon {
  width: 56rpx;
  height: 56rpx;
}

.upload-text {
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  font-weight: 500;
}

.upload-sub {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* ========== 上传预览 ========== */
.upload-preview {
  border-radius: var(--r-lg);
  overflow: hidden;
  background: var(--c-bg-page);
}

.upload-preview__img {
  width: 100%;
  height: 320rpx;
}

.upload-preview__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5);
}

.upload-preview__reupload {
  padding: var(--sp-3) var(--sp-7);
  border-radius: var(--r-full);
  background: var(--c-bg-brand);
}

/* #ifdef H5 */
.upload-preview__reupload:active {
  transform: scale(0.96);
}
/* #endif */

.reupload-text {
  font-size: var(--fs-sm);
  color: var(--c-brand);
  font-weight: 500;
}

.upload-preview__remove {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: var(--c-error-bg-tint, var(--c-error-bg-tint, rgba(229, 69, 77, 0.1)));
  display: flex;
  align-items: center;
  justify-content: center;
}

/* #ifdef H5 */
.upload-preview__remove:active {
  transform: scale(0.9);
}
/* #endif */

.remove-icon {
  font-size: var(--fs-sm);
  color: var(--c-error);
  font-weight: 700;
}

/* ========== 提交按钮 ========== */
.submit-btn {
  width: 100%;
  padding: var(--sp-7) 0;
  border-radius: var(--r-xl);
  background: var(--c-gradient-float-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: var(--sp-2);
  box-shadow: var(--s-float-btn);
}

/* #ifdef H5 */
.submit-btn:active {
  transform: scale(0.96);
  box-shadow: var(--s-brand-md);
}
/* #endif */

.submit-btn--disabled {
  background: var(--c-neutral-200);
  box-shadow: none;
  pointer-events: none;
}

.submit-btn__text {
  font-size: var(--fs-xl);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.submit-btn--disabled .submit-btn__text {
  color: var(--c-text-tertiary);
}

/* ========== 隐私提示 ========== */
.privacy-tip {
  display: flex;
  justify-content: center;
  padding: var(--sp-4) 0;
}

.privacy-tip__text {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  text-align: center;
}

/* ========== 已认证信息卡片 ========== */
.verified-info {
  margin-top: var(--sp-2);
}

.verified-card {
  padding: var(--sp-7);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
}

.verified-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.verified-label {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

.verified-value {
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  font-weight: 500;
}

.verified-card__divider {
  height: 1rpx;
  background: var(--c-border-light);
}
</style>
