<script setup lang="ts">
/**
 * 通知免打扰设置页（功能6）
 *
 * 提供以下设置：
 * - 总开关：开启/关闭免打扰
 * - 时段：开始时间 + 结束时间
 * - 重复方式：每天 / 工作日 / 周末 / 自定义
 * - 紧急消息穿透：开启后紧急消息仍会通知
 *
 * 数据来源：后端 GET/PUT /api/dnd（DoNotDisturbController）
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（mp-weixin 不支持），改用 hover-class
 * - 不使用 import.meta.env.DEV（mp-weixin 运行时会报错）
 * - 不使用 optional catch binding（catch {}），mp-weixin 不兼容
 * - 不使用 backdrop-filter（仅 H5 条件编译）
 * - 时间选择使用 uni 模式 picker，兼容双端
 */
import { onMounted, ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../services/api";
import type {
  DoNotDisturbRequest,
  DoNotDisturbView,
} from "../../services/generated/api-types-supplement";
import { lightHaptic, successHaptic, errorHaptic } from "../../utils/haptic";

const { t } = useI18n();

/** 重复方式枚举类型 */
type RepeatMode = "EVERYDAY" | "WEEKDAYS" | "WEEKENDS" | "CUSTOM";

/** 页面状态：loading / error / content */
const pageState = ref<"loading" | "error" | "content">("loading");
/** 错误信息（错误态展示） */
const errorMessage = ref<string | null>(null);
/** 是否正在保存（防重复提交） */
const isSaving = ref<boolean>(false);

/** 免打扰设置表单（响应式） */
const form = ref<DoNotDisturbView>({
  enabled: false,
  startTime: "22:00",
  endTime: "08:00",
  repeatMode: "EVERYDAY",
  customWeekdays: null,
  allowUrgent: true,
});

/** 重复方式选项列表（用于渲染单选列表） */
const repeatModeOptions = computed<{ value: RepeatMode; label: string }[]>(() => [
  { value: "EVERYDAY", label: t("dnd.repeatEveryday") },
  { value: "WEEKDAYS", label: t("dnd.repeatWeekdays") },
  { value: "WEEKENDS", label: t("dnd.repeatWeekends") },
  { value: "CUSTOM", label: t("dnd.repeatCustom") },
]);

/** 星期选项（自定义模式下使用，1-7 对应周一到周日） */
const weekdayOptions = [
  { value: "1", label: "周一" },
  { value: "2", label: "周二" },
  { value: "3", label: "周三" },
  { value: "4", label: "周四" },
  { value: "5", label: "周五" },
  { value: "6", label: "周六" },
  { value: "7", label: "周日" },
];

/** 自定义模式下选中的星期数组（响应式） */
const customWeekdaysSelected = ref<string[]>([]);

/**
 * 加载免打扰设置。
 *
 * 错误处理：
 * - 网络错误：设置 errorMessage，展示错误状态
 * - 401：由 http 拦截器统一处理
 */
async function loadSetting(): Promise<void> {
  pageState.value = "loading";
  errorMessage.value = null;
  try {
    const data = await clientApi.getDndSetting();
    form.value = {
      enabled: data.enabled,
      startTime: data.startTime,
      endTime: data.endTime,
      repeatMode: data.repeatMode,
      customWeekdays: data.customWeekdays,
      allowUrgent: data.allowUrgent,
    };
    // 同步自定义星期到选中数组
    if (data.customWeekdays) {
      customWeekdaysSelected.value = data.customWeekdays
        .split(",")
        .filter((s: string) => s.length > 0);
    } else {
      customWeekdaysSelected.value = [];
    }
    pageState.value = "content";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("common.networkError");
    pageState.value = "error";
  }
}

/**
 * 切换总开关。
 *
 * @param e - switch change 事件对象
 */
function handleToggleEnabled(e: Event): void {
  lightHaptic();
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail;
  form.value.enabled = !!detail?.value;
}

/**
 * 切换紧急消息穿透开关。
 *
 * @param e - switch change 事件对象
 */
function handleToggleAllowUrgent(e: Event): void {
  lightHaptic();
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail;
  form.value.allowUrgent = !!detail?.value;
}

/**
 * 选择开始时间。
 *
 * @param e - picker change 事件对象
 */
function handleStartTimeChange(e: Event): void {
  lightHaptic();
  const value = (e as unknown as { detail?: { value?: string } }).detail?.value;
  if (typeof value === "string") {
    form.value.startTime = value;
  }
}

/**
 * 选择结束时间。
 *
 * @param e - picker change 事件对象
 */
function handleEndTimeChange(e: Event): void {
  lightHaptic();
  const value = (e as unknown as { detail?: { value?: string } }).detail?.value;
  if (typeof value === "string") {
    form.value.endTime = value;
  }
}

/**
 * 选择重复方式。
 *
 * @param mode - 重复方式
 */
function handleRepeatModeSelect(mode: RepeatMode): void {
  lightHaptic();
  form.value.repeatMode = mode;
  // 切换到非自定义模式时清空 customWeekdays
  if (mode !== "CUSTOM") {
    customWeekdaysSelected.value = [];
    form.value.customWeekdays = null;
  }
}

/**
 * 切换自定义星期选中状态。
 *
 * @param value - 星期值（1-7）
 */
function handleWeekdayToggle(value: string): void {
  lightHaptic();
  const idx = customWeekdaysSelected.value.indexOf(value);
  if (idx >= 0) {
    customWeekdaysSelected.value.splice(idx, 1);
  } else {
    customWeekdaysSelected.value.push(value);
  }
  // 排序后更新到 form
  const sorted = [...customWeekdaysSelected.value].sort(
    (a, b) => Number(a) - Number(b)
  );
  customWeekdaysSelected.value = sorted;
  form.value.customWeekdays = sorted.length > 0 ? sorted.join(",") : null;
}

/**
 * 校验表单。
 *
 * 校验规则：
 * - 自定义模式下必须至少选择 1 个星期
 * - 结束时间与开始时间不能完全相同（跨天允许）
 *
 * @returns 校验通过返回 null，否则返回错误信息
 */
function validateForm(): string | null {
  if (form.value.repeatMode === "CUSTOM") {
    if (
      !form.value.customWeekdays ||
      form.value.customWeekdays.length === 0
    ) {
      return t("dnd.invalidTimeRange");
    }
  }
  if (form.value.startTime === form.value.endTime) {
    return t("dnd.invalidTimeRange");
  }
  return null;
}

/**
 * 保存设置。
 *
 * 流程：
 * 1. 校验表单
 * 2. 构造请求体，调用 clientApi.updateDndSetting
 * 3. 成功：toast 提示 + 触觉反馈
 * 4. 失败：toast 提示错误信息
 */
async function handleSave(): Promise<void> {
  if (isSaving.value) return;
  const validationError = validateForm();
  if (validationError) {
    errorHaptic();
    uni.showToast({ title: validationError, icon: "none" });
    return;
  }
  isSaving.value = true;
  try {
    const payload: DoNotDisturbRequest = {
      enabled: form.value.enabled,
      startTime: form.value.startTime,
      endTime: form.value.endTime,
      repeatMode: form.value.repeatMode,
      customWeekdays: form.value.customWeekdays ?? null,
      allowUrgent: form.value.allowUrgent,
    };
    const updated = await clientApi.updateDndSetting(payload);
    form.value = {
      enabled: updated.enabled,
      startTime: updated.startTime,
      endTime: updated.endTime,
      repeatMode: updated.repeatMode,
      customWeekdays: updated.customWeekdays,
      allowUrgent: updated.allowUrgent,
    };
    successHaptic();
    uni.showToast({ title: t("dnd.saveSuccess"), icon: "success" });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : t("dnd.saveFailed");
    errorHaptic();
    uni.showToast({ title: msg, icon: "none" });
  } finally {
    isSaving.value = false;
  }
}

/**
 * 返回上一页。
 */
function goBack(): void {
  lightHaptic();
  uni.navigateBack({ delta: 1 });
}

/**
 * 重试加载（错误状态下点击重试按钮）。
 */
function handleRetry(): void {
  errorHaptic();
  void loadSetting();
}

/** 当前状态文本 */
const statusText = computed(() =>
  form.value.enabled ? t("dnd.statusOn") : t("dnd.statusOff")
);

onMounted(() => {
  void loadSetting();
});
</script>

<template>
  <view class="dnd-page page-fade-in">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view
        class="nav-bar__back press-feedback"
        @tap="goBack"
        hover-class="nav-bar__back--hover"
        hover-stay-time="100"
      >
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">{{ t("dnd.pageName") }}</text>
      <view class="nav-bar__placeholder" />
    </view>

    <!-- 顶部安全区占位 -->
    <view class="safe-top" />

    <!-- 加载状态 -->
    <view v-if="pageState === 'loading'" class="state-wrap">
      <view class="spinner" />
      <text class="state-text">{{ t("common.loading") }}</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="pageState === 'error'" class="state-wrap">
      <text class="state-text">{{ errorMessage }}</text>
      <view
        class="retry-btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="handleRetry"
      >
        <text class="retry-btn__text">{{ t("common.retry") }}</text>
      </view>
    </view>

    <!-- 内容区 -->
    <view v-else class="content">
      <!-- 总开关分组 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t("dnd.enable") }}</text>
        </view>
        <view class="card">
          <view class="switch-row">
            <view class="switch-row__left">
              <text class="switch-row__label">{{ t("dnd.enable") }}</text>
              <text class="switch-row__desc">{{ t("dnd.enableDesc") }}</text>
            </view>
            <switch
              :checked="form.enabled"
              color="#3FCF8E"
              @change="handleToggleEnabled"
            />
          </view>
          <view class="status-row">
            <text class="status-row__label">{{ t("dnd.currentStatus") }}</text>
            <text
              class="status-row__value"
              :class="{ 'status-row__value--on': form.enabled }"
            >{{ statusText }}</text>
          </view>
        </view>
      </view>

      <!-- 时段设置 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t("dnd.timeRange") }}</text>
        </view>
        <view class="card">
          <view class="time-row">
            <text class="time-row__label">{{ t("dnd.startTime") }}</text>
            <picker
              mode="time"
              :value="form.startTime"
              @change="handleStartTimeChange"
            >
              <view class="time-row__picker">
                <text class="time-row__value">{{ form.startTime }}</text>
                <text class="time-row__arrow">›</text>
              </view>
            </picker>
          </view>
          <view class="time-row time-row--no-border">
            <text class="time-row__label">{{ t("dnd.endTime") }}</text>
            <picker
              mode="time"
              :value="form.endTime"
              @change="handleEndTimeChange"
            >
              <view class="time-row__picker">
                <text class="time-row__value">{{ form.endTime }}</text>
                <text class="time-row__arrow">›</text>
              </view>
            </picker>
          </view>
        </view>
      </view>

      <!-- 重复方式 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t("dnd.repeatMode") }}</text>
        </view>
        <view class="card">
          <view
            v-for="(option, index) in repeatModeOptions"
            :key="option.value"
            class="radio-row"
            :class="{ 'radio-row--no-border': index === repeatModeOptions.length - 1 && form.repeatMode !== 'CUSTOM' }"
            @tap="handleRepeatModeSelect(option.value)"
            hover-class="radio-row--hover"
            hover-stay-time="100"
          >
            <text class="radio-row__label">{{ option.label }}</text>
            <view
              class="radio-row__indicator"
              :class="{ 'radio-row__indicator--active': form.repeatMode === option.value }"
            />
          </view>
        </view>
      </view>

      <!-- 自定义星期（仅 CUSTOM 模式显示） -->
      <view v-if="form.repeatMode === 'CUSTOM'" class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t("dnd.repeatCustom") }}</text>
        </view>
        <view class="card">
          <view class="weekday-grid">
            <view
              v-for="day in weekdayOptions"
              :key="day.value"
              class="weekday-item press-feedback"
              :class="{
                'weekday-item--active': customWeekdaysSelected.includes(day.value),
              }"
              @tap="handleWeekdayToggle(day.value)"
              hover-class="press-feedback--active"
              hover-stay-time="100"
            >
              <text class="weekday-item__label">{{ day.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 紧急消息穿透 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t("dnd.tip") }}</text>
        </view>
        <view class="card">
          <view class="switch-row switch-row--no-border">
            <view class="switch-row__left">
              <text class="switch-row__label">{{ t("dnd.tip") }}</text>
            </view>
            <switch
              :checked="form.allowUrgent"
              color="#3FCF8E"
              @change="handleToggleAllowUrgent"
            />
          </view>
        </view>
      </view>

      <!-- 保存按钮 -->
      <view
        class="save-btn press-feedback"
        :class="{ 'save-btn--disabled': isSaving }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="handleSave"
      >
        <text class="save-btn__text">
          {{ isSaving ? t("common.processing") : t("common.save") }}
        </text>
      </view>
    </view>

    <!-- 底部安全区占位 -->
    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.dnd-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: linear-gradient(
    180deg,
    var(--c-bg-page, #f8fafc) 0%,
    var(--c-tint-blue-50, #eef2ff) 100%
  );
  box-sizing: border-box;
  position: relative;
}

/* ==================== 顶部导航栏 ==================== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  background: var(--c-bg-container, #ffffff);
  box-shadow: 0 1rpx 4rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04));
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
    background: var(--c-bg-page, #f4f6fa);
    transform: scale(0.94);
  }
}

.nav-bar__back-icon {
  font-size: 56rpx;
  color: var(--c-text-primary, #1f2329);
  font-weight: 300;
  line-height: 1;
}

.nav-bar__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1f2329);
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

/* ==================== 状态容器 ==================== */
.state-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
  gap: 24rpx;
}

.spinner {
  width: 64rpx;
  height: 64rpx;
  border: 4rpx solid var(--c-border-light, #eef0f4);
  border-top-color: var(--c-brand, #3fcf8e);
  border-radius: 50%;
  animation: dnd-spin 1s linear infinite;
}

@keyframes dnd-spin {
  to {
    transform: rotate(360deg);
  }
}

.state-text {
  font-size: 28rpx;
  color: var(--c-text-secondary, #5b6470);
}

.retry-btn {
  padding: 16rpx 48rpx;
  background: var(--c-brand, #3fcf8e);
  border-radius: 999rpx;
}

.retry-btn__text {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}

/* ==================== 内容区 ==================== */
.content {
  flex: 1;
  padding: 0 0 32rpx;
}

/* ==================== 分组 ==================== */
.section {
  margin: 24rpx 24rpx 0;
  position: relative;
  z-index: 1;
}

.section__title {
  padding: 0 12rpx 12rpx;
}

.section__title-text {
  font-size: 24rpx;
  color: var(--c-text-secondary, #5b6470);
  font-weight: 500;
}

/* ==================== 卡片 ==================== */
.card {
  background: var(--c-bg-container, #ffffff);
  border-radius: 24rpx;
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04));
  overflow: hidden;
}

/* ==================== 开关行 ==================== */
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  border-bottom: 1rpx solid var(--c-border-light, #eef0f4);

  &--no-border {
    border-bottom: none;
  }
}

.switch-row__left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  padding-right: 16rpx;
}

.switch-row__label {
  font-size: 28rpx;
  color: var(--c-text-primary, #1f2329);
  font-weight: 500;
}

.switch-row__desc {
  font-size: 24rpx;
  color: var(--c-text-tertiary, #9aa1ab);
  line-height: 1.5;
}

/* ==================== 状态行 ==================== */
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
}

.status-row__label {
  font-size: 26rpx;
  color: var(--c-text-secondary, #5b6470);
}

.status-row__value {
  font-size: 28rpx;
  color: var(--c-text-tertiary, #9aa1ab);
  font-weight: 600;

  &--on {
    color: var(--c-brand, #3fcf8e);
  }
}

/* ==================== 时间选择行 ==================== */
.time-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid var(--c-border-light, #eef0f4);

  &--no-border {
    border-bottom: none;
  }
}

.time-row__label {
  font-size: 28rpx;
  color: var(--c-text-primary, #1f2329);
  font-weight: 500;
}

.time-row__picker {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.time-row__value {
  font-size: 28rpx;
  color: var(--c-brand, #3fcf8e);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.time-row__arrow {
  font-size: 32rpx;
  color: var(--c-border-strong, #cbd5e1);
  font-weight: 300;
}

/* ==================== 单选行 ==================== */
.radio-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid var(--c-border-light, #eef0f4);
  transition: background 0.15s ease;

  &--no-border {
    border-bottom: none;
  }

  &--hover {
    background: var(--c-bg-surface, #fafbfc);
  }
}

.radio-row__label {
  font-size: 28rpx;
  color: var(--c-text-primary, #1f2329);
  font-weight: 500;
}

.radio-row__indicator {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid var(--c-border-strong, #cbd5e1);
  position: relative;
  transition: all 0.15s ease;

  &--active {
    border-color: var(--c-brand, #3fcf8e);
    background: var(--c-brand, #3fcf8e);

    &::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 16rpx;
      height: 16rpx;
      border-radius: 50%;
      background: #ffffff;
    }
  }
}

/* ==================== 星期网格 ==================== */
.weekday-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  padding: 24rpx 28rpx;
}

.weekday-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
  background: var(--c-bg-page, #f4f6fa);
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.15s ease;

  &--active {
    background: var(--c-bg-brand, #e8f8f0);
    border-color: var(--c-brand, #3fcf8e);
  }
}

.weekday-item__label {
  font-size: 26rpx;
  color: var(--c-text-primary, #1f2329);
  font-weight: 500;
}

/* ==================== 保存按钮 ==================== */
.save-btn {
  margin: 40rpx 24rpx 0;
  padding: 28rpx;
  background: var(--c-brand, #3fcf8e);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx var(--c-neutral-shadow-sm, rgba(63, 207, 142, 0.2));
  transition: all 0.15s ease;

  &--disabled {
    opacity: 0.6;
  }
}

.save-btn__text {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
}
</style>
