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
import { useI18n } from "vue-i18n";
// 修复 no-duplicate-imports：合并 ../../stores/campus 的重复 import
import { useCampusStore, CERT_STATUS_MAP, type CertificationStatus } from "../../stores/campus";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
// R4-00056: 学生证图片先上传换取 URL 再提交（real 模式后端无法访问本地临时路径）
import { clientApi } from "../../services/api";
import { useMock } from "../../stores/helpers/use-mock";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../utils/privacy";
// infra R2-00131：统一图片选择封装（隐私授权守卫 + 大小校验）
import { chooseImages } from "../../utils/media";

const campusStore = useCampusStore();
// 修复（严格模式 noUnusedLocals）：loading 未在模板/脚本中引用，已从解构中移除。
const { certificationStatus, certificationInfo } = storeToRefs(campusStore);
// Task 28：i18n 文案
const { t } = useI18n();


/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 */
/** 学校名称 */
const schoolName = ref("");
/** 专业 */
const major = ref("");
/** 学生证照片路径 */
const studentCardUrl = ref("");
/** 是否正在提交 */
const isSubmitting = ref(false);

/* ========== B1-2 实名认证前置门槛 ========== */
/** 是否已通过实名认证（true 才允许提交校园认证；mock 模式默认放行） */
const idCardVerified = ref(true);
/** 前置门槛加载中（避免闪烁） */
const gateLoading = ref(true);

/* ========== B1-3 学历认证（学信网，选填） ========== */
/** 学信网在线验证码 */
const chsiCode = ref("");
/** 学信网学历截图本地临时路径/URL */
const chsiScreenshotUrl = ref("");

/**
 * 拉取实名认证状态（B1-2 前置门槛）。
 * real 模式：GET /profile/basic 的 idCardVerified 字段；
 * mock 模式：默认放行（mock 分支不调用后端）。
 */
async function loadRealNameGate() {
  if (useMock()) {
    gateLoading.value = false;
    return;
  }
  try {
    const profile = await clientApi.getBasicProfile();
    // 未返回该字段视为未实名（旧后端兼容：null/undefined → false）
    idCardVerified.value = profile?.idCardVerified === true;
  } catch (_e) {
    // 拉取失败保持默认放行，后端仍会兜底校验
    idCardVerified.value = true;
  } finally {
    gateLoading.value = false;
  }
}

/**
 * 上传学信网学历截图（B1-3，选填）。
 * 复用统一图片选择封装（隐私授权 + 大小校验）。
 */
async function uploadChsiScreenshot() {
  try {
    const paths = await chooseImages({ count: 1, maxSizeMB: 5 });
    const path = paths[0];
    if (path) {
      chsiScreenshotUrl.value = path;
    }
  } catch (_e) {
    uni.showToast({
      title: t("campus.certification.privacyRequiredImage"),
      icon: "none",
    });
  }
}

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
      title: t("campus.certification.privacyRequiredImage"),
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
      uni.showToast({ title: t("campus.certification.chooseImageFailed"), icon: "none" });
    },
  });
}

/**
 * 提交认证（B1-2 前置：未实名认证时禁用并提示；B1-3 学信网字段选填）
 */
async function submitCert() {
  // B1-2 前置门槛：未完成实名认证直接拦截（双保险，表单已禁用）
  if (!idCardVerified.value) {
    uni.showToast({ title: t("campus.certification.realNameRequiredBanner"), icon: "none" });
    return;
  }
  if (!schoolName.value.trim()) {
    uni.showToast({ title: t("campus.certification.errSchoolName"), icon: "none" });
    return;
  }
  if (!major.value.trim()) {
    uni.showToast({ title: t("campus.certification.errMajor"), icon: "none" });
    return;
  }
  if (!studentCardUrl.value) {
    uni.showToast({ title: t("campus.certification.errStudentCard"), icon: "none" });
    return;
  }

  isSubmitting.value = true;
  try {
    // 修复（R4-00056）：real 模式下学生证本地临时路径（tempFilePath）先经
    // /media/upload 上传换取可访问 URL 再提交，否则审核人员无法查看学生证。
    // mock 模式下保持本地路径（clientApi.uploadPostImage 内部 mock 分支返回原路径）。
    let uploadUrl = studentCardUrl.value;
    if (!useMock() && !/^https?:\/\//.test(uploadUrl)) {
      const uploaded = await clientApi.uploadPostImage({
        name: "studentCard.jpg",
        path: uploadUrl,
      });
      uploadUrl = uploaded?.url ?? uploadUrl;
    }
    // B1-3：学信网截图同样先上传换取可访问 URL（real 模式）
    let chsiUploadUrl = chsiScreenshotUrl.value;
    if (!useMock() && chsiUploadUrl && !/^https?:\/\//.test(chsiUploadUrl)) {
      const uploaded = await clientApi.uploadPostImage({
        name: "chsi-screenshot.jpg",
        path: chsiUploadUrl,
      });
      chsiUploadUrl = uploaded?.url ?? chsiUploadUrl;
    }
    await campusStore.submitCertification({
      schoolName: schoolName.value.trim(),
      major: major.value.trim(),
      studentCardUrl: uploadUrl,
      chsiCode: chsiCode.value.trim(),
      chsiScreenshotUrl: chsiUploadUrl,
    });
    // P1-36：提交成功后重新拉取认证状态，刷新状态卡片（审核中/已认证）
    void campusStore.fetchCertificationStatus();
    uni.showToast({ title: t("campus.certification.submitSuccess"), icon: "success" });
  } catch (_e) {
    uni.showToast({
      title: campusStore.errorMessage || t("campus.certification.submitFailed"),
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
 * 跳转实名认证页（B1-2 前置门槛引导）。
 */
function goRealNameCertification() {
  uni.navigateTo({ url: "/pages/verification/real-name" });
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
  void loadRealNameGate();
  void campusStore.fetchCertificationStatus();
});
</script>

<template>
  <view class="cert-page">
    <!-- 顶部导航栏 -->
    <view class="cert-header">
      <view class="cert-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">{{ t("campus.certification.back") }}</text>
      </view>
      <text class="cert-header__title">{{ t("campus.certification.navTitle") }}</text>
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
            {{ t("campus.certification.pendingDesc") }}
          </text>
          <text v-else-if="certificationStatus === 'verified'" class="status-card__desc">
            {{ t("campus.certification.verifiedDesc") }}
          </text>
          <text v-else-if="certificationStatus === 'rejected'" class="status-card__desc">
            {{ t("campus.certification.rejectedDescPrefix") }}{{ certificationInfo?.reviewComment || t("campus.certification.rejectedDescDefault") }}{{ t("campus.certification.rejectedDescSuffix") }}
          </text>
        </view>
      </view>

      <!-- 认证表单（未认证或被拒绝时显示） -->
      <template v-if="certificationStatus === 'unverified' || certificationStatus === 'rejected'">
        <!-- B1-2 实名认证前置门槛：未实名时展示引导并禁用表单 -->
        <view v-if="!gateLoading && !idCardVerified" class="gate-banner">
          <text class="gate-banner__text">{{ t("campus.certification.realNameRequiredBanner") }}</text>
          <view class="gate-banner__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goRealNameCertification">
            <text class="gate-banner__btn-text">{{ t("campus.certification.realNameRequiredBtn") }}</text>
          </view>
        </view>

        <!-- 说明卡片 -->
        <view class="info-card">
          <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL" custom-class="info-card__icon" mode="aspectFit" />
          <text class="info-card__title">{{ t("campus.certification.whyCertifyTitle") }}</text>
          <view class="info-card__list" role="list">
            <text class="info-card__item">{{ t("campus.certification.whyCertifyItem1") }}</text>
            <text class="info-card__item">{{ t("campus.certification.whyCertifyItem2") }}</text>
            <text class="info-card__item">{{ t("campus.certification.whyCertifyItem3") }}</text>
            <text class="info-card__item">{{ t("campus.certification.whyCertifyItem4") }}</text>
          </view>
        </view>

        <!-- 表单 -->
        <view class="form-section">
          <!-- 学校名称 -->
          <view class="form-group">
            <text class="form-label">{{ t("campus.certification.labelSchool") }}</text>
            <input
              v-model="schoolName"
              class="form-input"
              :placeholder="t('campus.certification.placeholderSchool')" :aria-label="t('campus.certification.placeholderSchool')"
            />
          </view>

          <!-- 专业 -->
          <view class="form-group">
            <text class="form-label">{{ t("campus.certification.labelMajor") }}</text>
            <input
              v-model="major"
              class="form-input"
              :placeholder="t('campus.certification.placeholderMajor')" :aria-label="t('campus.certification.placeholderMajor')"
            />
          </view>

          <!-- 学生证照片上传 -->
          <view class="form-group">
            <text class="form-label">{{ t("campus.certification.labelStudentCard") }}</text>
            <text class="form-hint">
              {{ t("campus.certification.studentCardHint") }}
            </text>

            <view v-if="!studentCardUrl" class="upload-area press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="uploadStudentCard">
              <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.CAMERA" custom-class="upload-icon" mode="aspectFit" />
              <text class="upload-text">{{ t("campus.certification.uploadText") }}</text>
              <text class="upload-sub">{{ t("campus.certification.uploadSub") }}</text>
            </view>

            <view v-else class="upload-preview">
              <image
                class="upload-preview__img"
                :src="studentCardUrl"
                mode="aspectFill" lazy-load alt=""
              />
              <view class="upload-preview__actions">
                <view class="upload-preview__reupload press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="uploadStudentCard">
                  <text class="reupload-text">{{ t("campus.certification.reupload") }}</text>
                </view>
                <view class="upload-preview__remove press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="studentCardUrl = ''">
                  <text class="remove-icon">x</text>
                </view>
              </view>
            </view>
          </view>

          <!-- B1-3 学历认证：学信网在线验证码（选填） -->
          <view class="form-group">
            <text class="form-label">{{ t("campus.certification.labelChsiCode") }}</text>
            <text class="form-hint">
              {{ t("campus.certification.chsiHint") }}
            </text>
            <input
              v-model="chsiCode"
              class="form-input"
              :placeholder="t('campus.certification.placeholderChsiCode')" :aria-label="t('campus.certification.placeholderChsiCode')"
            />
          </view>

          <!-- B1-3 学历认证：学信网学历截图（选填） -->
          <view class="form-group">
            <text class="form-label">{{ t("campus.certification.labelChsiScreenshot") }}</text>
            <text class="form-hint">
              {{ t("campus.certification.chsiHint") }}
            </text>

            <view v-if="!chsiScreenshotUrl" class="upload-area press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="uploadChsiScreenshot">
              <SafeImage :src="IMAGE_PATHS.ICONS_COMMON.CAMERA" custom-class="upload-icon" mode="aspectFit" />
              <text class="upload-text">{{ t("campus.certification.chsiUploadText") }}</text>
              <text class="upload-sub">{{ t("campus.certification.chsiUploadSub") }}</text>
            </view>

            <view v-else class="upload-preview">
              <image
                class="upload-preview__img"
                :src="chsiScreenshotUrl"
                mode="aspectFill" lazy-load alt=""
              />
              <view class="upload-preview__actions">
                <view class="upload-preview__reupload press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="uploadChsiScreenshot">
                  <text class="reupload-text">{{ t("campus.certification.reupload") }}</text>
                </view>
                <view class="upload-preview__remove press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="chsiScreenshotUrl = ''">
                  <text class="remove-icon">x</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 提交按钮（B1-2 前置：未实名认证时禁用） -->
          <view
            class="submit-btn press-feedback"
            :class="{ 'submit-btn--disabled': isSubmitting || !idCardVerified }"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="submitCert"
          >
            <text class="submit-btn__text">
              {{ isSubmitting ? t("campus.certification.submitting") : t("campus.certification.submitBtn") }}
            </text>
          </view>

          <!-- 底部提示 -->
          <view class="privacy-tip">
            <text class="privacy-tip__text">
              {{ t("campus.certification.privacyTip") }}
            </text>
          </view>
        </view>
      </template>

      <!-- 已认证提示 -->
      <view v-if="certificationStatus === 'verified'" class="verified-info">
        <view class="verified-card">
          <view class="verified-card__row">
            <text class="verified-label">{{ t("campus.certification.verifiedLabelSchool") }}</text>
            <text class="verified-value">{{ certificationInfo?.schoolName || "-" }}</text>
          </view>
          <view class="verified-card__divider" />
          <view class="verified-card__row">
            <text class="verified-label">{{ t("campus.certification.verifiedLabelMajor") }}</text>
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
  background: var(--c-overlay-white-bg-mid-strong);
}

/* #ifdef H5 */
.cert-header__back:active {
  transform: scale(0.96);
  background: var(--c-overlay-white-bg-stronger);
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
  background: linear-gradient(135deg, var(--c-warning-bg-tint), var(--c-warning-bg-tint));
  border: 2rpx solid var(--c-vip-border-light);
}

.status-card--verified {
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-success-bg-tint));
  border: 2rpx solid var(--c-brand-border-tint-stronger);
}

.status-card--rejected {
  background: linear-gradient(135deg, var(--c-red-bg-tint), var(--c-red-bg-tint));
  border: 2rpx solid var(--c-error-bg-tint-strong);
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

/* ========== B1-2 实名认证前置门槛横幅 ========== */
.gate-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-7);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  margin-bottom: var(--sp-6);
  box-shadow: var(--s-card-soft);
  border: 2rpx solid var(--c-warning-border-tint);
}

.gate-banner__text {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.5;
  text-align: center;
}

.gate-banner__btn {
  padding: var(--sp-3) var(--sp-8);
  border-radius: var(--r-full);
  background: var(--c-bg-brand);
}

.gate-banner__btn-text {
  font-size: var(--fs-sm);
  color: var(--c-brand);
  font-weight: 600;
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
  border-radius: var(--r-circle, 50%);
  background: var(--c-error-bg-tint);
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
