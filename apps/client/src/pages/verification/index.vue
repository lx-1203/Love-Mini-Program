<script setup lang="ts">
/**
 * 恋爱认证页
 * 校园身份认证流程：上传学生证 → 提交审核 → 审核通过
 * mock 模式下默认展示"已认证"状态
 */
import { ref, computed, onUnmounted } from "vue";
import { lightHaptic } from "../../utils/haptic";
import SafeImage from "../../components/common/SafeImage.vue";
import { IMAGE_PATHS } from "../../config/images";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../utils/privacy";

/** 认证状态：unverified | pending | verified | rejected */
type VerifyStatus = "unverified" | "pending" | "verified" | "rejected";

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

/** 提交定时器引用，用于卸载时清理 */
let submitTimer: ReturnType<typeof setTimeout> | null = null;

/** 状态文案映射 */
const statusInfo = computed(() => {
  switch (status.value) {
    case "verified":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE,
        title: "已认证",
        desc: "您的校园身份已通过认证\n享有认证用户专属权益",
        color: "var(--c-brand-500, #3FCF8E)",
        bgColor: "var(--c-brand-50, #E8F8F0)",
      };
    case "pending":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.PENDING,
        title: "审核中",
        desc: "您的认证申请已提交\n预计 1-3 个工作日内完成审核",
        color: "var(--c-warning, #F59E0B)",
        bgColor: "var(--c-tint-amber-50, #FFF8E7)",
      };
    case "rejected":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.CHECK_FAIL,
        title: "认证未通过",
        desc: "您提交的认证信息未通过审核\n请核对后重新提交",
        color: "var(--c-error, #E5454D)",
        bgColor: "var(--c-tint-pink-soft, #FFF0F5)",
      };
    default:
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.GRAD_CAP,
        title: "未认证",
        desc: "完成校园身份认证\n解锁专属权益与信任标识",
        color: "var(--c-brand-500, #3FCF8E)",
        bgColor: "var(--c-tint-blue-soft, #E8F4FF)",
      };
  }
});

/** 认证权益列表 */
const benefits = [
  { icon: IMAGE_PATHS.ICONS_EMOJI.TARGET, title: "专属标识", desc: "个人主页展示认证徽章" },
  { icon: IMAGE_PATHS.ICONS_EMOJI.SCORE, title: "信任优先", desc: "认证用户优先推荐排序" },
  { icon: IMAGE_PATHS.ICONS_EMOJI.ROCKET, title: "匹配加权", desc: "匹配概率提升 1.5 倍" },
  { icon: IMAGE_PATHS.ICONS_EMOJI.GIFT, title: "专属权益", desc: "解锁认证用户专属功能" },
];

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
      title: "需同意隐私协议后才能选择图片",
      icon: "none",
      duration: 1200,
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
        title: "学生证已上传",
        icon: "success",
        duration: 1200,
      });
    },
    fail: () => {
      uni.showToast({
        title: "已取消选择",
        icon: "none",
        duration: 1000,
      });
    },
  });
}

/** 提交认证申请 */
function submitVerification() {
  lightHaptic();

  if (!studentName.value.trim()) {
    uni.showToast({ title: "请输入学生姓名", icon: "none" });
    return;
  }
  if (!studentId.value.trim()) {
    uni.showToast({ title: "请输入学号", icon: "none" });
    return;
  }
  if (!schoolName.value.trim()) {
    uni.showToast({ title: "请输入学校名称", icon: "none" });
    return;
  }
  if (!uploadedImagePath.value) {
    uni.showToast({ title: "请上传学生证照片", icon: "none" });
    return;
  }

  submitting.value = true;
  uni.showLoading({ title: "提交中..." });

  if (submitTimer) clearTimeout(submitTimer);
  submitTimer = setTimeout(() => {
    submitting.value = false;
    uni.hideLoading();
    status.value = "pending";
    uni.showToast({
      title: "提交成功，等待审核",
      icon: "success",
      duration: 1500,
    });
    submitTimer = null;
  }, 1000);
}

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
});

/** 模拟审核通过（mock 模式演示用） */
function simulateApprove() {
  lightHaptic();
  status.value = "verified";
  uni.showToast({
    title: "认证已通过",
    icon: "success",
    duration: 1500,
  });
}

/** 重新认证 */
function resetVerification() {
  lightHaptic();
  uni.showModal({
    title: "重新认证",
    content: "确定要重新提交认证申请吗？",
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
  <view class="verification-page page-fade-in">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100">
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">恋爱认证</text>
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

    <!-- 已认证状态：展示权益 + 重新认证按钮 -->
    <template v-if="status === 'verified'">
      <!-- 认证权益列表 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">认证权益</text>
        </view>
        <view class="benefits-grid">
          <view
            v-for="(item, index) in benefits"
            :key="index"
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
        <text class="action-btn__text">重新认证</text>
      </view>
    </template>

    <!-- 审核中状态：展示提示 -->
    <template v-else-if="status === 'pending'">
      <view class="section">
        <view class="pending-card">
          <text class="pending-card__title">审核中</text>
          <text class="pending-card__desc">您的认证申请已提交\n预计 1-3 个工作日内完成审核\n审核结果将通过消息通知您</text>
        </view>
      </view>

      <!-- mock 演示：模拟审核通过按钮 -->
      <view class="action-btn action-btn--secondary press-feedback" @tap="simulateApprove" hover-class="action-btn--hover" hover-stay-time="100">
        <text class="action-btn__text action-btn__text--secondary">模拟审核通过（演示）</text>
      </view>
    </template>

    <!-- 未认证/未通过状态：展示认证表单 -->
    <template v-else>
      <!-- 认证权益预览 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">认证权益</text>
        </view>
        <view class="benefits-grid">
          <view
            v-for="(item, index) in benefits"
            :key="index"
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

      <!-- 认证表单 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">填写认证信息</text>
        </view>
        <view class="form-card">
          <!-- 学生姓名 -->
          <view class="form-item list-item">
            <label class="form-item__label" for="verification-student-name">学生姓名</label>
            <input
              id="verification-student-name"
              v-model="studentName"
              class="form-item__input"
              placeholder="请输入真实姓名"
              placeholder-class="form-item__placeholder"
              maxlength="20"
              @blur="onBlur"
              :aria-label="'请输入真实姓名'"
              aria-required="true"
            />
          </view>
          <!-- 学号 -->
          <view class="form-item list-item">
            <label class="form-item__label" for="verification-student-id">学号</label>
            <input
              id="verification-student-id"
              v-model="studentId"
              class="form-item__input"
              placeholder="请输入学号"
              placeholder-class="form-item__placeholder"
              maxlength="20"
              @blur="onBlur"
              :aria-label="'请输入学号'"
              aria-required="true"
            />
          </view>
          <!-- 学校 -->
          <view class="form-item list-item form-item--no-border">
            <label class="form-item__label" for="verification-school-name">学校</label>
            <input
              id="verification-school-name"
              v-model="schoolName"
              class="form-item__input"
              placeholder="请输入学校全称"
              placeholder-class="form-item__placeholder"
              maxlength="30"
              @blur="onBlur"
              :aria-label="'请输入学校全称'"
              aria-required="true"
            />
          </view>
        </view>
      </view>

      <!-- 上传学生证 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">上传学生证</text>
        </view>
        <view
          class="upload-card press-feedback"
          @tap="chooseImage"
          hover-class="upload-card--hover"
          hover-stay-time="100"
        >
          <view v-if="!uploadedImagePath" class="upload-card__empty">
            <text class="upload-card__text">点击上传学生证照片</text>
            <text class="upload-card__hint">支持 JPG / PNG，大小 ≤ 5MB</text>
          </view>
          <view v-else class="upload-card__preview">
            <image
              :src="uploadedImagePath"
              class="upload-card__image"
              mode="aspectFill" alt=""
            />
            <view class="upload-card__change">
              <text class="upload-card__change-text">点击更换</text>
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
        <text class="action-btn__text">{{ submitting ? '提交中...' : '提交认证申请' }}</text>
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
  background: linear-gradient(180deg, var(--c-bg-page, #f8fafc) 0%, var(--c-tint-blue-50, #eef2ff) 100%);
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
  background: var(--c-bg-container, #FFFFFF);
  box-shadow: 0 1rpx 4rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
  position: relative;
  z-index: 1;
}

.nav-bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &--hover {
    background: var(--c-bg-page, #F4F6FA);
    transform: scale(0.94);
  }
}

.nav-bar__back-icon {
  font-size: var(--fs-7xl, 56rpx);
  color: var(--c-text-primary, #1F2329);
  font-weight: 300;
  line-height: 1;
}

.nav-bar__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1F2329);
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
  box-shadow: 0 4rpx 16rpx var(--c-neutral-shadow-md, var(--c-neutral-shadow-md, rgba(15, 23, 42, 0.06)));
}

.status-card__emoji-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: var(--c-bg-container, #FFFFFF);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx var(--c-black-shadow-sm, var(--c-black-shadow-sm, rgba(0, 0, 0, 0.06)));
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
  color: var(--c-text-secondary, #5B6470);
  text-align: center;
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
  color: var(--c-text-secondary, #5B6470);
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
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04))), 0 1rpx 4rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.03)));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.benefit-item__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-lg, 16rpx);
  background: linear-gradient(135deg, var(--c-tint-blue-50, #E8F4FF) 0%, var(--c-tint-blue-50, #F0F7FF) 100%);
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
  color: var(--c-text-primary, #1F2329);
  margin-bottom: 4rpx;
}

.benefit-item__desc {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-secondary, #5B6470);
  line-height: 1.5;
}

/* ==================== 表单卡片 ==================== */
.form-card {
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04))), 0 1rpx 4rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.03)));
  overflow: hidden;
  padding: 0 28rpx;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid var(--c-border-light, #EEF0F4);
  gap: 24rpx;

  &--no-border {
    border-bottom: none;
  }
}

.form-item__label {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #1F2329);
  font-weight: 500;
  width: 120rpx;
  flex-shrink: 0;
}

.form-item__input {
  flex: 1;
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #1F2329);
}

.form-item__placeholder {
  color: var(--c-text-tertiary, #9AA1AB);
  font-size: var(--fs-lg, 28rpx);
}

/* ==================== 上传卡片 ==================== */
.upload-card {
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04))), 0 1rpx 4rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.03)));
  overflow: hidden;
  transition: all 0.15s ease;

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
  color: var(--c-text-primary, #1F2329);
  font-weight: 500;
}

.upload-card__hint {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary, #9AA1AB);
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
  background: var(--c-gradient-mask-strong, var(--c-gradient-mask-strong, rgba(0, 0, 0, 0.6)));
  border-radius: 999rpx;
}

.upload-card__change-text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-inverse, #FFFFFF);
}

/* ==================== 审核中卡片 ==================== */
.pending-card {
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04))), 0 1rpx 4rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.03)));
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
  color: var(--c-warning, #F59E0B);
  margin-bottom: 12rpx;
}

.pending-card__desc {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #5B6470);
  text-align: center;
  line-height: 1.6;
}

/* ==================== 操作按钮 ==================== */
.action-btn {
  position: relative;
  z-index: 1;
  margin: 32rpx 24rpx 0;
  padding: 28rpx;
  background: linear-gradient(135deg, var(--c-brand, #3FCF8E) 0%, var(--c-brand-300, #7CD9A6) 100%);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 4rpx 16rpx var(--c-brand-border-tint-stronger, var(--c-brand-border-tint-stronger, rgba(63, 207, 142, 0.3)));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &--hover {
    transform: scale(0.98);
    box-shadow: 0 2rpx 8rpx var(--c-brand-border-tint, var(--c-brand-border-tint, rgba(63, 207, 142, 0.2)));
  }

  &--disabled {
    opacity: 0.6;
  }

  &--secondary {
    background: var(--c-bg-container, #FFFFFF);
    box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04)));
  }
}

.action-btn__text {
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-inverse, #FFFFFF);
  font-weight: 600;

  &--secondary {
    color: var(--c-brand, #3FCF8E);
  }
}
</style>
