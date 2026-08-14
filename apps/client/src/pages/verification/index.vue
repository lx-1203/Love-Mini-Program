<script setup lang="ts">
/**
 * 恋爱认证页
 * 校园身份认证流程：上传学生证 → 提交审核 → 审核通过
 * mock 模式下默认展示"已认证"状态
 */
import { ref, computed, onUnmounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { lightHaptic } from "../../utils/haptic";
import SafeImage from "../../components/common/SafeImage.vue";
import { IMAGE_PATHS } from "../../config/images";
import { TOAST_DURATION } from "../../constants/limits";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../utils/privacy";
import { isMockMode } from "../../services/env";
// 3-A 恋爱认证 real 链路：GET/POST /verification（mock 分支保留本地演示逻辑）
import { useMock } from "../../stores/helpers/use-mock";
import { request } from "../../services/http";
import { clientApi } from "../../services/api";

const { t } = useI18n();

/** 即时反馈 toast 时长（毫秒）：隐私授权/图片选择等轻提示，比 SHORT_MS 更短 */
const QUICK_TOAST_MS = 1200;
/** 最短反馈 toast 时长（毫秒）：取消类提示，一闪即过 */
const MIN_TOAST_MS = 1000;

/** 认证状态：unverified | pending | verified | rejected */
type VerifyStatus = "unverified" | "pending" | "verified" | "rejected";

/**
 * 后端恋爱认证视图（GET /verification 响应载荷，3-A）。
 * 未提交过申请时 status 为 null（前端映射为 unverified）。
 */
interface LoveVerificationView {
  id: number | null;
  status: "pending" | "approved" | "rejected" | null;
  studentName: string | null;
  studentId: string | null;
  schoolName: string | null;
  studentIdCardUrl: string | null;
  rejectReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

/** 当前认证状态（mock 模式默认 verified） */
const status = ref<VerifyStatus>("unverified");

/** 学生姓名 */
const studentName = ref("");
/** 学号 */
const studentId = ref("");
/** 学校名称 */
const schoolName = ref("");
/** 上传的学生证图片路径 */
const uploadedImagePath = ref("");

/** 是否正在提交 */
const submitting = ref(false);

/** real 模式：驳回原因（仅 rejected 状态下有值，展示在状态卡片） */
const rejectReason = ref("");

/** 提交定时器引用，用于卸载时清理 */
let submitTimer: ReturnType<typeof setTimeout> | null = null;

/** 状态文案映射 */
const statusInfo = computed(() => {
  switch (status.value) {
    case "verified":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE,
        title: t("verification.statusVerified"),
        desc: t("verification.statusVerifiedDesc"),
        color: "var(--c-brand-500, #3FCF8E)",
        bgColor: "var(--c-brand-50, #E8F8F0)",
      };
    case "pending":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.PENDING,
        title: t("verification.statusPending"),
        desc: t("verification.statusPendingDesc"),
        color: "var(--c-warning, #F59E0B)",
        bgColor: "var(--c-tint-amber-50, #FFF8E7)",
      };
    case "rejected":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.CHECK_FAIL,
        title: t("verification.statusRejected"),
        // real 模式：驳回原因追加到描述（mock 模式无原因展示原文案）
        desc: rejectReason.value
          ? `${t("verification.statusRejectedDesc")}\n${t("verification.rejectReasonLabel")}：${rejectReason.value}`
          : t("verification.statusRejectedDesc"),
        color: "var(--c-error, #E5454D)",
        bgColor: "var(--c-tint-pink-soft, #FFF0F5)",
      };
    default:
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.GRAD_CAP,
        title: t("verification.statusUnverified"),
        desc: t("verification.statusUnverifiedDesc"),
        color: "var(--c-brand-500, #3FCF8E)",
        bgColor: "var(--c-tint-blue-soft, #E8F4FF)",
      };
  }
});

/** 认证权益列表（B4 强化，2026-08-13：新增第 5 项「互动资格」） */
const benefits = computed(() => [
  { icon: IMAGE_PATHS.ICONS_EMOJI.TARGET, title: t("verification.benefitBadgeTitle"), desc: t("verification.benefitBadgeDesc") },
  { icon: IMAGE_PATHS.ICONS_EMOJI.SCORE, title: t("verification.benefitTrustTitle"), desc: t("verification.benefitTrustDesc") },
  { icon: IMAGE_PATHS.ICONS_EMOJI.ROCKET, title: t("verification.benefitMatchTitle"), desc: t("verification.benefitMatchDesc") },
  { icon: IMAGE_PATHS.ICONS_EMOJI.GIFT, title: t("verification.benefitPerksTitle"), desc: t("verification.benefitPerksDesc") },
  { icon: IMAGE_PATHS.ICONS_EMOJI.CHAT, title: t("verification.benefitInteractTitle"), desc: t("verification.benefitInteractDesc") },
]);

/** 认证流程步骤（B4 强化：上传学生证 → 人工审核 → 认证通过） */
const processSteps = computed(() => [
  { step: "1", title: t("verification.processStep1Title"), desc: t("verification.processStep1Desc") },
  { step: "2", title: t("verification.processStep2Title"), desc: t("verification.processStep2Desc") },
  { step: "3", title: t("verification.processStep3Title"), desc: t("verification.processStep3Desc") },
]);

/** 选择学生证图片
 *
 * Task 0.2.4：调用 chooseImage 前先调用 ensurePrivacyAuthorized 检查隐私授权。
 */
async function chooseImage() {
  lightHaptic();
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({
      title: t("verification.privacyRequiredImage"),
      icon: "none",
      duration: QUICK_TOAST_MS,
    });
    return;
  }
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      // 修复（严格模式 noUncheckedIndexedAccess）：res.tempFilePaths[0] 索引访问返回 string | undefined，
      // 此处兜底空字符串，避免在异常（空数组）情况下赋值 undefined 给 ref<string>。
      uploadedImagePath.value = res.tempFilePaths[0] ?? "";
      uni.showToast({
        title: t("verification.imageUploaded"),
        icon: "success",
        duration: QUICK_TOAST_MS,
      });
    },
    fail: () => {
      uni.showToast({
        title: t("verification.imageChooseCancelled"),
        icon: "none",
        duration: MIN_TOAST_MS,
      });
    },
  });
}

/** 提交认证申请 */
function submitVerification() {
  lightHaptic();

  if (!studentName.value.trim()) {
    uni.showToast({ title: t("verification.errStudentName"), icon: "none" });
    return;
  }
  if (!studentId.value.trim()) {
    uni.showToast({ title: t("verification.errStudentId"), icon: "none" });
    return;
  }
  if (!schoolName.value.trim()) {
    uni.showToast({ title: t("verification.errSchoolName"), icon: "none" });
    return;
  }
  if (!uploadedImagePath.value) {
    uni.showToast({ title: t("verification.errImageRequired"), icon: "none" });
    return;
  }

  submitting.value = true;
  uni.showLoading({ title: t("verification.submitting") });

  // Mock 分支：保留本地演示逻辑（1s 后置为 pending）
  if (useMock()) {
    if (submitTimer) clearTimeout(submitTimer);
    submitTimer = setTimeout(() => {
      submitting.value = false;
      uni.hideLoading();
      status.value = "pending";
      uni.showToast({
        title: t("verification.submitSuccess"),
        icon: "success",
        duration: TOAST_DURATION.SHORT_MS,
      });
      submitTimer = null;
    }, 1000);
    return;
  }

  // Real 分支（3-A）：先上传学生证图片换取可访问 URL（对齐 campus/certification 链路），
  // 再 POST /verification 提交；重复提交（pending/approved）后端返回 409 业务冲突。
  void submitVerificationReal();
}

/**
 * real 模式提交认证申请（与 mock 分支解耦，便于异常处理收敛）。
 * - 本地临时路径先经 clientApi.uploadPostImage 上传换取 URL；
 * - 后端 409（已有 pending/approved 申请）提示「已有申请审核中」；
 * - 提交成功后重新拉取状态（pending）。
 */
async function submitVerificationReal(): Promise<void> {
  try {
    let cardUrl = uploadedImagePath.value;
    // 非 http(s) 开头视为本地临时路径：上传换取可访问 URL，否则审核人员无法查看学生证
    if (!/^https?:\/\//.test(cardUrl)) {
      const uploaded = await clientApi.uploadPostImage({
        name: "love-verification-id-card",
        path: cardUrl,
      });
      cardUrl = uploaded?.url ?? cardUrl;
    }
    await request<LoveVerificationView, { studentName: string; studentId: string; schoolName: string; studentIdCardUrl: string }>({
      url: "/verification",
      method: "POST",
      data: {
        studentName: studentName.value.trim(),
        studentId: studentId.value.trim(),
        schoolName: schoolName.value.trim(),
        studentIdCardUrl: cardUrl,
      },
    });
    // 提交成功后刷新状态（置为 pending 并回显）
    await loadVerification();
    uni.showToast({
      title: t("verification.submitSuccess"),
      icon: "success",
      duration: TOAST_DURATION.SHORT_MS,
    });
  } catch (error) {
    // 409：已有 pending/approved 申请，提示「已有申请审核中」
    const status =
      error !== null && typeof error === "object" && "status" in error
        ? (error as { status: number }).status
        : 0;
    const message =
      error instanceof Error && error.message && error.message.trim().length > 0
        ? error.message
        : t("verification.submitFailed");
    uni.showToast({
      title: status === 409 ? t("verification.alreadyPending") : message,
      icon: "none",
      duration: TOAST_DURATION.SHORT_MS,
    });
  } finally {
    submitting.value = false;
    uni.hideLoading();
  }
}

/**
 * 将后端恋爱认证视图映射到页面状态。
 * @param view GET /verification 返回的视图（status 为 null 表示未提交）
 */
function applyVerificationView(view: LoveVerificationView): void {
  const s = view.status;
  if (s === "approved") {
    status.value = "verified";
  } else if (s === "pending") {
    status.value = "pending";
  } else if (s === "rejected") {
    status.value = "rejected";
  } else {
    status.value = "unverified";
  }
  rejectReason.value = view.rejectReason ?? "";
  // 回显已提交的信息（驳回后重新提交时表单预填，减少重复输入）
  if (view.studentName) studentName.value = view.studentName;
  if (view.studentId) studentId.value = view.studentId;
  if (view.schoolName) schoolName.value = view.schoolName;
  if (view.studentIdCardUrl) uploadedImagePath.value = view.studentIdCardUrl;
}

/**
 * 拉取当前用户的恋爱认证状态（real 模式）。
 * mock 模式保留现有本地演示逻辑，不做任何请求。
 */
async function loadVerification(): Promise<void> {
  if (useMock()) return;
  try {
    const view = await request<LoveVerificationView>({ url: "/verification", method: "GET" });
    applyVerificationView(view);
  } catch (_e) {
    // 拉取失败保持当前状态（不阻塞页面展示）
  }
}

/** 进入页面时拉取认证状态（real 模式）；mock 模式无操作 */
onLoad(() => {
  void loadVerification();
});

/** 审核状态轮询间隔（pending 态自动刷新审核结果，2026-08-10 B2） */
const VERIFICATION_POLL_MS = 30_000;
/** pending 态轮询定时器 */
let verificationPollTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * pending 态轮询：进入页面与页面再次展示时，若状态为 pending 则每 30s 重拉
 * GET /verification（审核通过/驳回后自动反映到页面，无需手动刷新）。
 */
function startVerificationPolling() {
  if (useMock()) return;
  if (verificationPollTimer) {
    clearTimeout(verificationPollTimer);
    verificationPollTimer = null;
  }
  if (status.value !== "pending") return;
  verificationPollTimer = setTimeout(async () => {
    await loadVerification();
    if (status.value === "pending") {
      startVerificationPolling();
    }
  }, VERIFICATION_POLL_MS);
}

/** 页面再次展示时续接 pending 轮询（后台期间审核结果可能在返回时已更新） */
onShow(() => {
  if (!useMock() && status.value === "pending") {
    void loadVerification();
  }
  startVerificationPolling();
});

/**
 * 页面卸载时清理定时器，避免内存泄漏。
 * 修复（P1 BUG）：原实现未保存 setTimeout 返回值，页面销毁后定时器仍会触发
 * uni.hideLoading 与状态修改。
 */
onUnmounted(() => {
  if (submitTimer) {
    clearTimeout(submitTimer);
    submitTimer = null;
  }
  if (verificationPollTimer) {
    clearTimeout(verificationPollTimer);
    verificationPollTimer = null;
  }
});

/** 模拟审核通过（mock 模式演示用）
 * R4-00029：函数内增加 isMockMode 守卫——仅 mock/演示模式允许伪造认证通过，
 * 防止未来其他调用点绕过模板 v-if 在真实模式伪造认证状态。
 * 2026-08-10 B2：real 模式已接入 GET /verification 状态轮询（pending 态 30s 自动刷新），
 * 本函数保留仅用于 mock 演示。 */
function simulateApprove() {
  if (!isMockMode) {
    console.warn("[Verification] simulateApprove 仅允许在 mock 模式调用");
    return;
  }
  lightHaptic();
  status.value = "verified";
  uni.showToast({
    title: t("verification.approvedTitle"),
    icon: "success",
    duration: TOAST_DURATION.SHORT_MS,
  });
}

/** 重新认证 */
function resetVerification() {
  lightHaptic();
  uni.showModal({
    title: t("verification.resetConfirmTitle"),
    content: t("verification.resetConfirmContent"),
    success: (res) => {
      if (res.confirm) {
        status.value = "unverified";
        studentName.value = "";
        studentId.value = "";
        schoolName.value = "";
        uploadedImagePath.value = "";
      }
    },
  });
}

/** 删除人工认证（解除认证状态，回到未认证） */
function removeVerification() {
  uni.showModal({
    title: t("verification.removeConfirmTitle"),
    content: t("verification.removeConfirmContent"),
    // 原生属性不支持 CSS 变量：取 design token --c-error 的实际色值 #E5454D
    confirmColor: "#E5454D",
    success: (res) => {
      if (res.confirm) {
        status.value = "unverified";
        studentName.value = "";
        studentId.value = "";
        schoolName.value = "";
        uploadedImagePath.value = "";
        uni.showToast({ title: t("verification.removedToast"), icon: "none" });
      }
    },
  });
}

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
  <view class="verification-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100" role="button" :aria-label="t('common.backAria')">
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">{{ t('verification.navTitle') }}</text>
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

    <!-- B4 认证门控横幅（2026-08-13）：未认证用户仅可浏览，引导完成认证解锁互动 -->
    <view v-if="status === 'unverified'" class="gate-banner">
      <SafeImage :src="IMAGE_PATHS.ICONS_EMOJI.WARNING" custom-class="gate-banner__icon" mode="aspectFit" />
      <text class="gate-banner__text">{{ t('verification.gateBanner') }}</text>
    </view>

    <!-- 已认证状态：展示权益 + 重新认证按钮 -->
    <template v-if="status === 'verified'">
      <!-- 认证权益列表 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('verification.benefitsTitle') }}</text>
        </view>
        <view class="benefits-grid">
          <view
            v-for="(item, index) in benefits" :key="index"
            class="benefit-item"
          >
            <view class="benefit-item__icon">
              <SafeImage :src="item.icon" custom-class="benefit-item__icon-img" mode="aspectFit" />
            </view>
            <text class="benefit-item__title">{{ item.title }}</text>
            <text class="benefit-item__desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 重新认证按钮 -->
      <view class="action-btn press-feedback" @tap="resetVerification" hover-class="action-btn--hover" hover-stay-time="100">
        <text class="action-btn__text">{{ t('verification.resetBtn') }}</text>
      </view>

      <!-- 删除认证（解除人工认定） -->
      <view class="action-btn action-btn--danger press-feedback" @tap="removeVerification" hover-class="action-btn--hover" hover-stay-time="100">
        <text class="action-btn__text action-btn__text--danger">{{ t('verification.removeVerificationBtn') }}</text>
      </view>
    </template>

    <!-- 审核中状态：展示提示 -->
    <template v-else-if="status === 'pending'">
      <view class="section">
        <view class="pending-card">
          <text class="pending-card__title">{{ t('verification.pendingTitle') }}</text>
          <text class="pending-card__desc">{{ t('verification.pendingDesc') }}</text>
        </view>
      </view>

      <!-- infra R2-00019 修复：模拟审核通过按钮仅 mock 模式可见（原无环境守卫，
           真实用户可自行伪造恋爱认证通过，身份信任体系崩塌） -->
      <view v-if="isMockMode()" class="action-btn action-btn--secondary press-feedback" @tap="simulateApprove" hover-class="action-btn--hover" hover-stay-time="100">
        <text class="action-btn__text action-btn__text--secondary">{{ t('verification.simulateApproveBtn') }}</text>
      </view>
    </template>

    <!-- 未认证/未通过状态：展示认证表单 -->
    <template v-else>
      <!-- 认证权益预览 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('verification.benefitsTitle') }}</text>
        </view>
        <view class="benefits-grid">
          <view
            v-for="(item, index) in benefits" :key="index"
            class="benefit-item"
          >
            <view class="benefit-item__icon">
              <SafeImage :src="item.icon" custom-class="benefit-item__icon-img" mode="aspectFit" />
            </view>
            <text class="benefit-item__title">{{ item.title }}</text>
            <text class="benefit-item__desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 认证流程（B4 强化，2026-08-13：上传 → 人工审核 → 通过 三步卡） -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('verification.processTitle') }}</text>
        </view>
        <view class="process-card">
          <view v-for="(step, index) in processSteps" :key="index" class="process-step">
            <view class="process-step__badge">
              <text class="process-step__badge-text">{{ step.step }}</text>
            </view>
            <view class="process-step__content">
              <text class="process-step__title">{{ step.title }}</text>
              <text class="process-step__desc">{{ step.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 认证表单 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('verification.formTitle') }}</text>
        </view>
        <view class="form-card">
          <!-- 学生姓名 -->
          <view class="form-item">
            <label class="form-item__label" for="verification-student-name">{{ t('verification.labelStudentName') }}</label>
            <input
              id="verification-student-name"
              v-model="studentName"
              class="form-item__input"
              :placeholder="t('verification.placeholderStudentName')"
              placeholder-class="form-item__placeholder"
              maxlength="20"
              @blur="onBlur"
              :aria-label="t('verification.placeholderStudentName')"
              aria-required="true"
            />
          </view>
          <!-- 学号 -->
          <view class="form-item">
            <label class="form-item__label" for="verification-student-id">{{ t('verification.labelStudentId') }}</label>
            <input
              id="verification-student-id"
              v-model="studentId"
              class="form-item__input"
              :placeholder="t('verification.placeholderStudentId')"
              placeholder-class="form-item__placeholder"
              maxlength="20"
              @blur="onBlur"
              :aria-label="t('verification.placeholderStudentId')"
              aria-required="true"
            />
          </view>
          <!-- 学校 -->
          <view class="form-item form-item--no-border">
            <label class="form-item__label" for="verification-school-name">{{ t('verification.labelSchool') }}</label>
            <input
              id="verification-school-name"
              v-model="schoolName"
              class="form-item__input"
              :placeholder="t('verification.placeholderSchool')"
              placeholder-class="form-item__placeholder"
              maxlength="30"
              @blur="onBlur"
              :aria-label="t('verification.placeholderSchool')"
              aria-required="true"
            />
          </view>
        </view>
      </view>

      <!-- 上传学生证 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('verification.uploadTitle') }}</text>
        </view>
        <view
          class="upload-card press-feedback"
          @tap="chooseImage"
          hover-class="upload-card--hover"
          hover-stay-time="100"
          role="button"
          :aria-label="t('verification.uploadTitle')"
        >
          <view v-if="!uploadedImagePath" class="upload-card__empty">
            <text class="upload-card__text">{{ t('verification.uploadText') }}</text>
            <text class="upload-card__hint">{{ t('verification.uploadHint') }}</text>
          </view>
          <view v-else class="upload-card__preview">
            <image
              :src="uploadedImagePath"
              class="upload-card__image"
              mode="aspectFill" lazy-load alt=""
            />
            <view class="upload-card__change">
              <text class="upload-card__change-text">{{ t('verification.uploadChange') }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view
        class="action-btn press-feedback"
        :class="{ 'action-btn--disabled': submitting }"
        @tap="submitVerification"
        hover-class="action-btn--hover"
        hover-stay-time="100"
      >
        <text class="action-btn__text">{{ submitting ? t('verification.submittingBtn') : t('verification.submitBtn') }}</text>
      </view>
    </template>

    <!-- 底部安全区占位 -->
    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.verification-page {
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

.status-card__emoji {
  font-size: 64rpx;
  line-height: 1;
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

/* ==================== B4 认证门控横幅（2026-08-13） ==================== */
.gate-banner {
  position: relative;
  z-index: 1;
  margin: 0 24rpx;
  padding: 20rpx 24rpx;
  background: var(--c-tint-amber-50, #FFF8E7);
  border: 1rpx solid var(--c-border-light);
  border-radius: var(--r-lg, 20rpx);
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.gate-banner__icon {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.gate-banner__text {
  flex: 1;
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-warning, #F59E0B);
  line-height: 1.5;
}

/* ==================== 认证流程卡（B4 强化） ==================== */
.process-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  padding: 24rpx 28rpx;
}

.process-step {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 20rpx 0;

  & + & {
    border-top: 1rpx dashed var(--c-border-light);
  }
}

.process-step__badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: var(--r-circle, 50%);
  background: linear-gradient(135deg, var(--c-brand) 0%, var(--c-brand-300) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.process-step__badge-text {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.process-step__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.process-step__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
}

.process-step__desc {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-secondary);
  line-height: 1.5;
  white-space: pre-line;
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

/* ==================== 权益网格 ==================== */
.benefits-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.benefit-item {
  flex: 1 1 calc(50% - 8rpx);
  min-width: 280rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-lg, 20rpx);
  padding: 24rpx;
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.benefit-item__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-lg, 16rpx);
  background: linear-gradient(135deg, var(--c-tint-blue-50) 0%, var(--c-tint-blue-50) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.benefit-item__emoji {
  font-size: var(--fs-2xl, 32rpx);
}

.benefit-item__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary);
  margin-bottom: 4rpx;
}

.benefit-item__desc {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

/* ==================== 表单卡片 ==================== */
.form-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  overflow: hidden;
  padding: 0 28rpx;
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
  width: 120rpx;
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

/* ==================== 上传卡片 ==================== */
.upload-card {
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
  padding: 64rpx 32rpx;
  gap: 12rpx;
}

.upload-card__icon {
  font-size: 80rpx;
  line-height: 1;
}

.upload-card__text {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary);
  font-weight: 500;
}

.upload-card__hint {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
}

.upload-card__preview {
  position: relative;
  width: 100%;
  height: 360rpx;
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

.pending-card__emoji {
  font-size: 80rpx;
  line-height: 1;
  margin-bottom: 20rpx;
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

  &--secondary {
    background: var(--c-bg-container);
    box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs);
  }

  &--danger {
    background: var(--c-bg-container);
    border: 1rpx solid var(--c-error, #e5454d);
    box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs);
  }
}

.action-btn__text {
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-inverse);
  font-weight: 600;

  &--secondary {
    color: var(--c-brand);
  }

  &--danger {
    color: var(--c-error, #e5454d);
  }
}
</style>
