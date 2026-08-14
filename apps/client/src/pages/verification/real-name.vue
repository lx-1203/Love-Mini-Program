<script setup lang="ts">
/**
 * 实名认证页（B1-2）
 * 实名认证流程：填写姓名/身份证号 → 上传身份证正反面 → 提交审核 → 审核通过
 * 审核通过后置位 idCardVerified，作为校园认证（学历认证 B1-3）的前置门槛。
 *
 * 安全说明：
 * - 身份证号仅用于本次提交，后端 AES-GCM 加密存储，视图仅返回脱敏号码；
 * - 身份证照片与恋爱认证学生证同链路（/media/upload 换取可访问 URL）。
 */
import { ref, computed, onUnmounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { lightHaptic } from "../../utils/haptic";
import SafeImage from "../../components/common/SafeImage.vue";
import { IMAGE_PATHS } from "../../config/images";
import { TOAST_DURATION } from "../../constants/limits";
import { useMock } from "../../stores/helpers/use-mock";
import { request } from "../../services/http";
import { clientApi } from "../../services/api";
// infra R2-00131：统一图片选择封装（含隐私授权守卫 + 大小校验）
import { chooseImages } from "../../utils/media";

const { t } = useI18n();

/** 即时反馈 toast 时长（毫秒） */
const QUICK_TOAST_MS = 1200;

/** 认证状态：unverified | pending | verified | rejected */
type RealNameStatus = "unverified" | "pending" | "verified" | "rejected";

/**
 * 后端实名认证视图（GET /real-name-certification 响应载荷，B1-2）。
 * 未提交过申请时 status 为 null（前端映射为 unverified）。
 */
interface RealNameCertificationView {
  id: number | null;
  userId: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | null;
  userName: string | null;
  /** 脱敏身份证号（前 6 后 4，中间掩码） */
  idCardNo: string | null;
  idCardFrontUrl: string | null;
  idCardBackUrl: string | null;
  reviewComment: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

/** 当前认证状态（mock 模式默认 unverified） */
const status = ref<RealNameStatus>("unverified");

/** 真实姓名 */
const userName = ref("");
/** 身份证号 */
const idCardNo = ref("");
/** 身份证正面（人像面）本地临时路径/URL */
const idCardFrontPath = ref("");
/** 身份证背面（国徽面）本地临时路径/URL */
const idCardBackPath = ref("");

/** 是否正在提交 */
const submitting = ref(false);

/** real 模式：驳回原因（仅 rejected 状态下有值） */
const rejectReason = ref("");
/** real 模式：已认证时回显的脱敏身份证号 */
const maskedIdCardNo = ref("");

/** 未成年人保护（3-N）：未满 18 周岁展示提示并禁用表单（与后端 AgePolicy 口径一致） */
const isAdult = ref(true);

/** 提交定时器引用，用于卸载时清理 */
let submitTimer: ReturnType<typeof setTimeout> | null = null;

/** 状态文案映射 */
const statusInfo = computed(() => {
  switch (status.value) {
    case "verified":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE,
        title: t("realName.statusVerified"),
        desc: t("realName.statusVerifiedDesc"),
        color: "var(--c-brand-500, #3FCF8E)",
        bgColor: "var(--c-brand-50, #E8F8F0)",
      };
    case "pending":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.PENDING,
        title: t("realName.statusPending"),
        desc: t("realName.statusPendingDesc"),
        color: "var(--c-warning, #F59E0B)",
        bgColor: "var(--c-tint-amber-50, #FFF8E7)",
      };
    case "rejected":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.CHECK_FAIL,
        title: t("realName.statusRejected"),
        desc: rejectReason.value
          ? `${t("realName.statusRejectedDesc")}\n${t("realName.rejectReasonLabel")}：${rejectReason.value}`
          : t("realName.statusRejectedDesc"),
        color: "var(--c-error, #E5454D)",
        bgColor: "var(--c-tint-pink-soft, #FFF0F5)",
      };
    default:
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE,
        title: t("realName.statusUnverified"),
        desc: t("realName.statusUnverifiedDesc"),
        color: "var(--c-brand-500, #3FCF8E)",
        bgColor: "var(--c-tint-blue-soft, #E8F4FF)",
      };
  }
});

/**
 * 计算出生日期对应的年龄（完整年数）。
 * @param birthDate yyyy-MM-dd 字符串
 * @returns 年龄；无法解析返回 -1
 */
function ageOf(birthDate: string): number {
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return -1;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const now = new Date();
  let age = now.getFullYear() - year;
  const monthDiff = now.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) {
    age -= 1;
  }
  return age;
}

/**
 * 选择身份证照片（正面/背面）。
 * 复用统一图片选择封装（隐私授权 + 大小校验）。
 */
async function chooseIdCardImage(slot: "front" | "back") {
  lightHaptic();
  try {
    const paths = await chooseImages({ count: 1, maxSizeMB: 5 });
    const path = paths[0];
    if (!path) return; // 用户取消
    if (slot === "front") {
      idCardFrontPath.value = path;
    } else {
      idCardBackPath.value = path;
    }
    uni.showToast({
      title: t("realName.imageUploaded"),
      icon: "success",
      duration: QUICK_TOAST_MS,
    });
  } catch (_e) {
    uni.showToast({
      title: t("realName.privacyRequiredImage"),
      icon: "none",
      duration: QUICK_TOAST_MS,
    });
  }
}

/** 身份证号格式校验（与后端一致：15 位或 18 位，末位可为 X/x） */
const ID_CARD_PATTERN = /^\d{15}$|^\d{17}[\dXx]$/;

/** 提交实名认证申请 */
function submitRealName() {
  lightHaptic();

  if (!isAdult.value) {
    uni.showToast({ title: t("realName.errMinorNotAllowed"), icon: "none" });
    return;
  }
  if (!userName.value.trim()) {
    uni.showToast({ title: t("realName.errUserName"), icon: "none" });
    return;
  }
  if (!ID_CARD_PATTERN.test(idCardNo.value.trim())) {
    uni.showToast({ title: t("realName.errIdCardNo"), icon: "none" });
    return;
  }
  if (!idCardFrontPath.value) {
    uni.showToast({ title: t("realName.errFrontRequired"), icon: "none" });
    return;
  }
  if (!idCardBackPath.value) {
    uni.showToast({ title: t("realName.errBackRequired"), icon: "none" });
    return;
  }

  submitting.value = true;
  uni.showLoading({ title: t("realName.submitting") });

  // Mock 分支：保留本地演示逻辑（1s 后置为 pending）
  if (useMock()) {
    if (submitTimer) clearTimeout(submitTimer);
    submitTimer = setTimeout(() => {
      submitting.value = false;
      uni.hideLoading();
      status.value = "pending";
      uni.showToast({
        title: t("realName.submitSuccess"),
        icon: "success",
        duration: TOAST_DURATION.SHORT_MS,
      });
      submitTimer = null;
    }, 1000);
    return;
  }

  void submitRealNameReal();
}

/**
 * real 模式提交实名认证申请（与 mock 分支解耦，便于异常处理收敛）。
 * - 本地临时路径先经 clientApi.uploadPostImage 上传换取 URL；
 * - 后端 409（已有 pending/approved 申请）提示「已有申请审核中」；
 * - 提交成功后重新拉取状态（pending）。
 */
async function submitRealNameReal(): Promise<void> {
  try {
    const upload = async (path: string, name: string): Promise<string> => {
      if (/^https?:\/\//.test(path)) return path;
      const uploaded = await clientApi.uploadPostImage({ name, path });
      return uploaded?.url ?? path;
    };
    const frontUrl = await upload(idCardFrontPath.value, "real-name-id-front.jpg");
    const backUrl = await upload(idCardBackPath.value, "real-name-id-back.jpg");
    await request<
      RealNameCertificationView,
      { userName: string; idCardNo: string; idCardFrontUrl: string; idCardBackUrl: string }
    >({
      url: "/real-name-certification",
      method: "POST",
      data: {
        userName: userName.value.trim(),
        idCardNo: idCardNo.value.trim(),
        idCardFrontUrl: frontUrl,
        idCardBackUrl: backUrl,
      },
    });
    // 提交成功后刷新状态（置为 pending 并回显）
    await loadRealNameStatus();
    uni.showToast({
      title: t("realName.submitSuccess"),
      icon: "success",
      duration: TOAST_DURATION.SHORT_MS,
    });
  } catch (error) {
    // 409：已有 pending/approved 申请，提示「已有申请审核中」
    const errStatus =
      error !== null && typeof error === "object" && "status" in error
        ? (error as { status: number }).status
        : 0;
    const message =
      error instanceof Error && error.message && error.message.trim().length > 0
        ? error.message
        : t("realName.submitFailed");
    uni.showToast({
      title: errStatus === 409 ? t("realName.alreadyPending") : message,
      icon: "none",
      duration: TOAST_DURATION.SHORT_MS,
    });
  } finally {
    submitting.value = false;
    uni.hideLoading();
  }
}

/**
 * 将后端实名认证视图映射到页面状态。
 * @param view GET /real-name-certification 返回的视图（status 为 null 表示未提交）
 */
function applyRealNameView(view: RealNameCertificationView): void {
  const s = view.status;
  if (s === "APPROVED") {
    status.value = "verified";
    maskedIdCardNo.value = view.idCardNo ?? "";
  } else if (s === "PENDING") {
    status.value = "pending";
  } else if (s === "REJECTED") {
    status.value = "rejected";
  } else {
    status.value = "unverified";
  }
  rejectReason.value = view.reviewComment ?? "";
  // 回显已提交的信息（驳回后重新提交时表单预填，减少重复输入）
  if (view.userName) userName.value = view.userName;
  if (view.idCardFrontUrl) idCardFrontPath.value = view.idCardFrontUrl;
  if (view.idCardBackUrl) idCardBackPath.value = view.idCardBackUrl;
}

/**
 * 拉取当前用户的实名认证状态与出生日期（real 模式）。
 * mock 模式保留现有本地演示逻辑，不做任何请求。
 */
async function loadRealNameStatus(): Promise<void> {
  if (useMock()) return;
  try {
    const view = await request<RealNameCertificationView>({
      url: "/real-name-certification",
      method: "GET",
    });
    applyRealNameView(view);
  } catch (_e) {
    // 拉取失败保持当前状态（不阻塞页面展示）
  }
}

/**
 * 未成年人保护（3-N）：拉取基本资料出生日期，未满 18 周岁（或未填写出生日期）
 * 展示提示并禁用表单（与后端 AgePolicy 拒绝口径一致）。
 */
async function loadAdultGate(): Promise<void> {
  if (useMock()) return;
  try {
    const profile = await clientApi.getBasicProfile();
    const birthDate = (profile as { birthDate?: string | null }).birthDate;
    // 出生日期缺失视为未成年（后端 AgePolicy.isAdult(null) = false，从严处理）
    isAdult.value = birthDate ? ageOf(birthDate) >= 18 : false;
  } catch (_e) {
    // 拉取失败保持默认放行，后端仍会兜底校验
  }
}

/** 进入页面时拉取认证状态（real 模式）；mock 模式无操作 */
onLoad(() => {
  void loadAdultGate();
  void loadRealNameStatus();
});

/** 审核状态轮询间隔（pending 态自动刷新审核结果，与恋爱认证页一致） */
const REAL_NAME_POLL_MS = 30_000;
/** pending 态轮询定时器 */
let realNamePollTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * pending 态轮询：进入页面与页面再次展示时，若状态为 pending 则每 30s 重拉
 * GET /real-name-certification（审核通过/驳回后自动反映到页面，无需手动刷新）。
 */
function startRealNamePolling() {
  if (useMock()) return;
  if (realNamePollTimer) {
    clearTimeout(realNamePollTimer);
    realNamePollTimer = null;
  }
  if (status.value !== "pending") return;
  realNamePollTimer = setTimeout(async () => {
    await loadRealNameStatus();
    if (status.value === "pending") {
      startRealNamePolling();
    }
  }, REAL_NAME_POLL_MS);
}

/** 页面再次展示时续接 pending 轮询（后台期间审核结果可能在返回时已更新） */
onShow(() => {
  if (!useMock() && status.value === "pending") {
    void loadRealNameStatus();
  }
  startRealNamePolling();
});

/**
 * 页面卸载时清理定时器，避免内存泄漏。
 */
onUnmounted(() => {
  if (submitTimer) {
    clearTimeout(submitTimer);
    submitTimer = null;
  }
  if (realNamePollTimer) {
    clearTimeout(realNamePollTimer);
    realNamePollTimer = null;
  }
});

/** 返回上一页 */
function goBack() {
  lightHaptic();
  uni.navigateBack({ delta: 1 });
}

/** 输入框失去焦点时轻振动 */
function onBlur() {
  lightHaptic();
}
</script>

<template>
  <view class="real-name-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100" role="button" :aria-label="t('common.backAria')">
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">{{ t('realName.navTitle') }}</text>
      <view class="nav-bar__placeholder" />
    </view>

    <!-- 顶部安全区占位 -->
    <view class="safe-top" />

    <!-- 认证状态卡片 -->
    <view class="status-card" :style="{ background: statusInfo.bgColor }">
      <view class="status-card__emoji-wrap">
        <SafeImage :src="statusInfo.icon" custom-class="status-card__emoji-img" mode="aspectFit" />
      </view>
      <text class="status-card__title" :style="{ color: statusInfo.color }">{{ statusInfo.title }}</text>
      <text class="status-card__desc">{{ statusInfo.desc }}</text>
    </view>

    <!-- 未成年人保护提示（B1-2/3-N）：未满 18 周岁展示提示并禁用表单 -->
    <view v-if="!isAdult" class="minor-banner">
      <text class="minor-banner__text">{{ t('realName.minorNotice') }}</text>
    </view>

    <!-- 已认证状态：展示脱敏信息 -->
    <template v-if="status === 'verified'">
      <view class="section">
        <view class="verified-card">
          <view class="verified-card__row">
            <text class="verified-card__label">{{ t('realName.labelUserName') }}</text>
            <text class="verified-card__value">{{ userName }}</text>
          </view>
          <view class="verified-card__divider" />
          <view class="verified-card__row">
            <text class="verified-card__label">{{ t('realName.labelIdCardNo') }}</text>
            <text class="verified-card__value">{{ maskedIdCardNo }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 审核中状态：展示提示 -->
    <template v-else-if="status === 'pending'">
      <view class="section">
        <view class="pending-card">
          <text class="pending-card__title">{{ t('realName.pendingTitle') }}</text>
          <text class="pending-card__desc">{{ t('realName.pendingDesc') }}</text>
        </view>
      </view>
    </template>

    <!-- 未认证/未通过状态：展示认证表单（未成年人禁用） -->
    <template v-else>
      <!-- 表单 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('realName.formTitle') }}</text>
        </view>
        <view class="form-card" :class="{ 'form-card--disabled': !isAdult }">
          <!-- 真实姓名 -->
          <view class="form-item">
            <label class="form-item__label" for="real-name-user-name">{{ t('realName.labelUserName') }}</label>
            <input
              id="real-name-user-name"
              v-model="userName"
              class="form-item__input"
              :placeholder="t('realName.placeholderUserName')"
              placeholder-class="form-item__placeholder"
              maxlength="20"
              :disabled="!isAdult"
              @blur="onBlur"
              :aria-label="t('realName.placeholderUserName')"
              aria-required="true"
            />
          </view>
          <!-- 身份证号 -->
          <view class="form-item form-item--no-border">
            <label class="form-item__label" for="real-name-id-card-no">{{ t('realName.labelIdCardNo') }}</label>
            <input
              id="real-name-id-card-no"
              v-model="idCardNo"
              class="form-item__input"
              :placeholder="t('realName.placeholderIdCardNo')"
              placeholder-class="form-item__placeholder"
              maxlength="18"
              :disabled="!isAdult"
              @blur="onBlur"
              :aria-label="t('realName.placeholderIdCardNo')"
              aria-required="true"
            />
          </view>
        </view>
      </view>

      <!-- 上传身份证正反面 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('realName.uploadTitle') }}</text>
        </view>
        <view class="upload-row">
          <view
            class="upload-card press-feedback"
            @tap="chooseIdCardImage('front')"
            hover-class="upload-card--hover"
            hover-stay-time="100"
            role="button"
            :aria-label="t('realName.labelIdCardFront')"
          >
            <view v-if="!idCardFrontPath" class="upload-card__empty">
              <text class="upload-card__text">{{ t('realName.labelIdCardFront') }}</text>
              <text class="upload-card__hint">{{ t('realName.uploadHint') }}</text>
            </view>
            <view v-else class="upload-card__preview">
              <image
                :src="idCardFrontPath"
                class="upload-card__image"
                mode="aspectFill" lazy-load alt=""
              />
              <view class="upload-card__change">
                <text class="upload-card__change-text">{{ t('realName.uploadChange') }}</text>
              </view>
            </view>
          </view>

          <view
            class="upload-card press-feedback"
            @tap="chooseIdCardImage('back')"
            hover-class="upload-card--hover"
            hover-stay-time="100"
            role="button"
            :aria-label="t('realName.labelIdCardBack')"
          >
            <view v-if="!idCardBackPath" class="upload-card__empty">
              <text class="upload-card__text">{{ t('realName.labelIdCardBack') }}</text>
              <text class="upload-card__hint">{{ t('realName.uploadHint') }}</text>
            </view>
            <view v-else class="upload-card__preview">
              <image
                :src="idCardBackPath"
                class="upload-card__image"
                mode="aspectFill" lazy-load alt=""
              />
              <view class="upload-card__change">
                <text class="upload-card__change-text">{{ t('realName.uploadChange') }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 隐私说明 -->
      <view class="section">
        <view class="privacy-note">
          <text class="privacy-note__text">{{ t('realName.privacyNote') }}</text>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view
        class="action-btn press-feedback"
        :class="{ 'action-btn--disabled': submitting || !isAdult }"
        @tap="submitRealName"
        hover-class="action-btn--hover"
        hover-stay-time="100"
      >
        <text class="action-btn__text">{{ submitting ? t('realName.submittingBtn') : t('realName.submitBtn') }}</text>
      </view>
    </template>

    <!-- 底部安全区占位 -->
    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.real-name-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: linear-gradient(180deg, var(--c-bg-page) 0%, var(--c-tint-blue-50) 100%);
  box-sizing: border-box;
  position: relative;
  padding-bottom: 32rpx;
}

/* ==================== 顶部导航栏 ==================== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  background: var(--c-bg-container);
  box-shadow: 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  position: relative;
  z-index: 1;
}

.nav-bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);

  &--hover {
    background: var(--c-bg-page);
    transform: scale(0.94);
  }
}

.nav-bar__back-icon {
  font-size: var(--fs-7xl, 56rpx);
  color: var(--c-text-primary);
  font-weight: 300;
  line-height: 1;
}

.nav-bar__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.nav-bar__placeholder {
  width: 64rpx;
  height: 64rpx;
}

/* ==================== 安全区占位 ==================== */
.safe-top {
  height: calc(constant(safe-area-inset-top) + 0rpx);
  height: calc(env(safe-area-inset-top) + 0rpx);
  flex-shrink: 0;
}

.safe-bottom {
  height: calc(constant(safe-area-inset-bottom) + 24rpx);
  height: calc(env(safe-area-inset-bottom) + 24rpx);
  flex-shrink: 0;
}

/* ==================== 状态卡片 ==================== */
.status-card {
  position: relative;
  z-index: 1;
  margin: 24rpx;
  padding: 48rpx 32rpx;
  border-radius: var(--r-xl, 24rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 16rpx var(--c-neutral-shadow-md);
}

.status-card__emoji-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-container);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx var(--c-black-shadow-sm);
}

.status-card__title {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  margin-bottom: 12rpx;
}

.status-card__desc {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.6;
}

/* ==================== 未成年人保护提示（3-N） ==================== */
.minor-banner {
  position: relative;
  z-index: 1;
  margin: 0 24rpx;
  padding: 24rpx 28rpx;
  border-radius: var(--r-lg, 20rpx);
  background: var(--c-tint-amber-50, #FFF8E7);
  border: 1rpx solid var(--c-warning-border-tint, #F59E0B);
}

.minor-banner__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-warning, #F59E0B);
  line-height: 1.6;
}

/* ==================== 分组 ==================== */
.section {
  position: relative;
  z-index: 1;
  margin: 24rpx 24rpx 0;
}

.section__title {
  padding: 0 12rpx 12rpx;
}

.section__title-text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
  font-weight: 500;
}

/* ==================== 表单卡片 ==================== */
.form-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  overflow: hidden;
  padding: 0 28rpx;

  &--disabled {
    opacity: 0.6;
  }
}

.form-item {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid var(--c-border-light);
  gap: 24rpx;

  &--no-border {
    border-bottom: none;
  }
}

.form-item__label {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary);
  font-weight: 500;
  width: 160rpx;
  flex-shrink: 0;
}

.form-item__input {
  flex: 1;
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary);
}

.form-item__placeholder {
  color: var(--c-text-tertiary);
  font-size: var(--fs-lg, 28rpx);
}

/* ==================== 上传卡片（正反面并排） ==================== */
.upload-row {
  display: flex;
  gap: 16rpx;
}

.upload-card {
  flex: 1;
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  overflow: hidden;
  transition: all var(--d-fast, 120ms) ease;

  &--hover {
    transform: scale(0.98);
  }
}

.upload-card__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 16rpx;
  gap: 12rpx;
}

.upload-card__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-primary);
  font-weight: 500;
  text-align: center;
}

.upload-card__hint {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
  text-align: center;
}

.upload-card__preview {
  position: relative;
  width: 100%;
  height: 280rpx;
}

.upload-card__image {
  width: 100%;
  height: 100%;
}

.upload-card__change {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  padding: 8rpx 20rpx;
  background: var(--c-gradient-mask-strong);
  border-radius: var(--r-full, 9999rpx);
}

.upload-card__change-text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-inverse);
}

/* ==================== 隐私说明 ==================== */
.privacy-note {
  background: var(--c-bg-container);
  border-radius: var(--r-lg, 20rpx);
  padding: 20rpx 24rpx;
}

.privacy-note__text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
  line-height: 1.6;
}

/* ==================== 审核中卡片 ==================== */
.pending-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pending-card__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-warning);
  margin-bottom: 12rpx;
}

.pending-card__desc {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.6;
}

/* ==================== 已认证信息卡片 ==================== */
.verified-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.verified-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.verified-card__label {
  font-size: var(--fs-md, 24rpx);
  color: var(--c-text-tertiary);
}

.verified-card__value {
  font-size: var(--fs-md, 24rpx);
  color: var(--c-text-primary);
  font-weight: 500;
}

.verified-card__divider {
  height: 1rpx;
  background: var(--c-border-light);
}

/* ==================== 操作按钮 ==================== */
.action-btn {
  position: relative;
  z-index: 1;
  margin: 32rpx 24rpx 0;
  padding: 28rpx;
  background: linear-gradient(135deg, var(--c-brand) 0%, var(--c-brand-300) 100%);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 4rpx 16rpx var(--c-brand-border-tint-stronger);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;

  &--hover {
    transform: scale(0.98);
    box-shadow: 0 2rpx 8rpx var(--c-brand-border-tint);
  }

  &--disabled {
    opacity: 0.6;
  }
}

.action-btn__text {
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}
</style>
