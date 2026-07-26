<script setup lang="ts">
/**
 * PostReportDialog — 帖子举报弹窗
 *
 * 功能：
 * - 选择举报原因（与产品约定的 7 类违规场景）
 * - 选填补充描述（最多 200 字）
 * - 调用后端 POST /api/posts/{id}/report（复用 reportTarget("POST", ...) 接口）
 * - 提交成功后 toast 提示并关闭弹窗，向父组件透传 submitted 事件
 *
 * mp-weixin 兼容：
 * - 使用 @tap / hover-class 而非 click / :hover
 * - 不使用 import.meta.env
 * - 使用 v-model:visible 双向绑定，避免父组件手动同步
 * - 不使用 backdrop-filter（mp-weixin 不支持）
 *
 * 错误处理：
 * - API 调用失败时 toast 提示错误信息，弹窗保持打开让用户重试
 * - 网络异常或登录失效由 services/http 统一拦截处理
 */
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { reportTarget } from "../../services/report-api";
import { lightHaptic } from "../../utils/haptic";

const props = defineProps<{
  /** 是否显示弹窗（v-model:visible） */
  visible: boolean;
  /** 被举报的帖子 ID */
  postId: string | number | null;
}>();

const emit = defineEmits<{
  /** 更新 visible（v-model:visible） */
  (e: "update:visible", val: boolean): void;
  /** 关闭弹窗 */
  (e: "close"): void;
  /** 举报提交成功 */
  (e: "submitted"): void;
}>();

const { t } = useI18n();

/** 举报原因列表（与 i18n 一一对应） */
const reasons = computed(() => [
  { key: "reasonSpam", label: t("postReport.reasonSpam") },
  { key: "reasonPorn", label: t("postReport.reasonPorn") },
  { key: "reasonAbuse", label: t("postReport.reasonAbuse") },
  { key: "reasonFraud", label: t("postReport.reasonFraud") },
  { key: "reasonIllegal", label: t("postReport.reasonIllegal") },
  { key: "reasonInfringe", label: t("postReport.reasonInfringe") },
  { key: "reasonOther", label: t("postReport.reasonOther") },
] as const);

/** 当前选中的原因 key */
const selectedReason = ref<string>("");

/** 补充描述 */
const description = ref<string>("");

/** 提交中标志 */
const submitting = ref<boolean>(false);

/**
 * 监听弹窗显隐：打开时重置状态，关闭时清空表单
 * 避免上一次输入残留影响下次使用
 */
watch(
  () => props.visible,
  (val) => {
    if (val) {
      selectedReason.value = "";
      description.value = "";
      submitting.value = false;
    }
  }
);

/** 提交按钮是否可点击 */
const canSubmit = computed(() => {
  return !submitting.value && selectedReason.value.length > 0;
});

/** 关闭弹窗 */
function close() {
  if (submitting.value) return; // 提交中禁止关闭
  emit("update:visible", false);
  emit("close");
}

/** 点击遮罩关闭 */
function onMaskTap() {
  close();
}

/** 阻止内容区点击事件冒泡到遮罩 */
function onContentTap() {
  // 仅阻止冒泡，无其他逻辑
}

/** 选择举报原因 */
function selectReason(key: string) {
  lightHaptic();
  selectedReason.value = key;
}

/**
 * 提交举报
 *
 * 流程：
 * 1. 校验 postId 与 reason
 * 2. 调用 reportTarget("POST", postId, reason, description)
 * 3. 成功：toast 提示 + 关闭弹窗 + 透传 submitted
 * 4. 失败：toast 提示错误，弹窗保持打开
 */
async function submit() {
  if (!canSubmit.value) return;
  if (props.postId === null || props.postId === undefined || props.postId === "") {
    uni.showToast({ title: t("postReport.submitFailed"), icon: "none" });
    return;
  }

  submitting.value = true;
  try {
    const reasonLabel = reasons.value.find((r) => r.key === selectedReason.value)?.label ?? selectedReason.value;
    await reportTarget("POST", props.postId, reasonLabel, description.value.trim() || undefined);
    uni.showToast({ title: t("postReport.submitSuccess"), icon: "success" });
    emit("submitted");
    // 关闭弹窗
    setTimeout(() => {
      submitting.value = false;
      emit("update:visible", false);
      emit("close");
    }, 400);
  } catch (error) {
    submitting.value = false;
    const message = error instanceof Error ? error.message : t("postReport.submitFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}
</script>

<template>
  <view
    v-if="visible"
    class="report-mask"
    @tap="onMaskTap"
    role="dialog"
    aria-modal="true"
    :aria-label="t('postReport.title')"
  >
    <view
      class="report-sheet press-feedback"
      @tap.stop="onContentTap"
      hover-class="report-sheet--hover"
      hover-stay-time="100"
    >
      <!-- 头部 -->
      <view class="report-sheet__header">
        <text class="report-sheet__title">{{ t("postReport.title") }}</text>
        <text class="report-sheet__desc">{{ t("postReport.desc") }}</text>
      </view>

      <!-- 原因列表 -->
      <view class="report-sheet__reasons">
        <view
          v-for="item in reasons"
          :key="item.key"
          class="reason-item press-feedback"
          :class="{ 'reason-item--selected': selectedReason === item.key }"
          @tap.stop="selectReason(item.key)"
          hover-class="reason-item--hover"
          hover-stay-time="80"
          role="radio"
          :aria-checked="selectedReason === item.key"
          :aria-label="item.label"
        >
          <text class="reason-item__label">{{ item.label }}</text>
          <view class="reason-item__radio" :class="{ 'reason-item__radio--on': selectedReason === item.key }">
            <text v-if="selectedReason === item.key" class="reason-item__radio-icon">✓</text>
          </view>
        </view>
      </view>

      <!-- 补充描述 -->
      <view class="report-sheet__desc-wrap">
        <textarea
          v-model="description"
          class="report-sheet__textarea"
          :placeholder="t('postReport.otherPlaceholder')"
          :maxlength="200"
          :auto-height="true"
          :show-confirm-bar="false"
          :cursor-spacing="20"
          :adjust-position="true" aria-label="t('postReport.otherPlaceholder')"
        />
        <text class="report-sheet__count">{{ description.length }}/200</text>
      </view>

      <!-- 按钮组 -->
      <view class="report-sheet__actions">
        <view
          class="report-btn report-btn--cancel press-feedback"
          @tap.stop="close"
          hover-class="report-btn--hover"
          hover-stay-time="80"
        >
          <text class="report-btn__text">{{ t("postReport.cancel") }}</text>
        </view>
        <view
          class="report-btn report-btn--submit press-feedback"
          :class="{ 'report-btn--submit-disabled': !canSubmit }"
          @tap.stop="submit"
          hover-class="report-btn--hover"
          hover-stay-time="80"
        >
          <text class="report-btn__text report-btn__text--submit">
            {{ submitting ? t("postReport.submitting") : t("postReport.submitBtn") }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* ==================== 遮罩层 ==================== */
.report-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  /* 进入动画 */
  animation: report-mask-in 200ms ease-out;
}

@keyframes report-mask-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ==================== 弹窗主体 ==================== */
.report-sheet {
  width: 100%;
  background: var(--c-bg-container, #ffffff);
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom, 0));
  box-sizing: border-box;
  /* 进入动画：从底部滑入 */
  animation: report-sheet-in 240ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes report-sheet-in {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.report-sheet--hover {
  /* 仅占位，避免 hover-class 无样式告警 */
}

/* ==================== 头部 ==================== */
.report-sheet__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid var(--c-border-light, #e5e7eb);
}

.report-sheet__title {
  font-size: var(--fs-lg, 32rpx);
  font-weight: 600;
  color: var(--c-text-primary, #1a1a2e);
  line-height: 1.4;
}

.report-sheet__desc {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-tertiary, #6b7280);
  line-height: 1.4;
  text-align: center;
}

/* ==================== 原因列表 ==================== */
.report-sheet__reasons {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  margin-top: 16rpx;
}

.reason-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 16rpx;
  border-radius: var(--r-md, 16rpx);
  transition: background-color 160ms ease-out;
}

.reason-item--hover {
  background: var(--c-bg-hover, #f5f5f7);
}

.reason-item--selected {
  background: var(--c-brand-50, #fff5f7);
}

.reason-item__label {
  font-size: var(--fs-md, 28rpx);
  color: var(--c-text-primary, #1a1a2e);
  line-height: 1.4;
}

.reason-item__radio {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid var(--c-border, #d1d5db);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 160ms ease-out;
}

.reason-item__radio--on {
  background: var(--c-romance-500, #EC4899);
  border-color: var(--c-romance-500, #EC4899);
}

.reason-item__radio-icon {
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1;
}

/* ==================== 补充描述 ==================== */
.report-sheet__desc-wrap {
  margin-top: 16rpx;
  padding: 16rpx;
  background: var(--c-bg-hover, #f5f5f7);
  border-radius: var(--r-md, 16rpx);
  position: relative;
}

.report-sheet__textarea {
  width: 100%;
  min-height: 120rpx;
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-primary, #1a1a2e);
  line-height: 1.5;
  background: transparent;
}

.report-sheet__count {
  position: absolute;
  right: 16rpx;
  bottom: 8rpx;
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-quaternary, #9ca3af);
  line-height: 1.4;
}

/* ==================== 按钮组 ==================== */
.report-sheet__actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}

.report-btn {
  flex: 1;
  height: 88rpx;
  border-radius: var(--r-md, 16rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 160ms ease-out;
}

.report-btn--cancel {
  background: var(--c-bg-hover, #f5f5f7);
}

.report-btn--submit {
  background: var(--c-romance-500, #EC4899);
}

.report-btn--submit-disabled {
  opacity: 0.5;
}

.report-btn--hover {
  opacity: 0.85;
}

.report-btn__text {
  font-size: var(--fs-md, 28rpx);
  font-weight: 500;
  color: var(--c-text-primary, #1a1a2e);
  line-height: 1.4;
}

.report-btn__text--submit {
  color: #ffffff;
  font-weight: 600;
}
</style>
