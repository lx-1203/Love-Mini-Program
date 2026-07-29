<script setup lang="ts">
/**
 * VoiceRecorder — 语音录制组件
 *
 * 功能：
 * - 长按"按住说话"按钮开始录音，松开停止并发送
 * - 上滑取消录音（避免误发）
 * - 录音时长实时显示（最长 60 秒，与后端 VoiceMessageService 限制一致）
 * - 录音权限申请与错误提示
 * - 录音过短（<1 秒）自动取消
 *
 * mp-weixin 兼容：
 * - 使用 @touchstart / @touchend / @touchmove 监听手势
 * - 通过 utils/audio-recorder.ts 封装的 createRecorder 调用 uni.getRecorderManager
 * - 不使用 :hover，使用 hover-class 实现按压反馈
 * - 不使用 import.meta，状态由闭包管理
 *
 * 错误处理：
 * - 权限被拒绝：toast 提示用户开启麦克风权限
 * - 录音失败：toast 提示重试
 * - 录音过短：toast 提示说话时间太短
 *
 * 使用方式：
 * <VoiceRecorder :disabled="false" @recorded="onRecorded" />
 */
import { ref, onUnmounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  createRecorder,
  type RecorderStopResult,
} from "../../utils/audio-recorder";
import { lightHaptic } from "../../utils/haptic";

const props = withDefaults(
  defineProps<{
    /** 是否禁用（会话结束时禁用录音） */
    disabled?: boolean;
    /** 录音最长时长（秒），默认 60 */
    maxDuration?: number;
  }>(),
  {
    disabled: false,
    maxDuration: 60,
  }
);

const emit = defineEmits<{
  /** 录音完成，返回文件路径与时长 */
  recorded: [result: RecorderStopResult];
  /** 录音取消（用户上滑或时长过短） */
  cancel: [];
  /** 录音状态变化 */
  stateChange: [recording: boolean];
}>();

const { t } = useI18n();

/**
 * 从触摸事件中安全读取首个触点的 clientY 坐标。
 *
 * uni-app 的 @touchstart / @touchmove 事件回调签名跨平台形态不一：
 * - H5 端 touches 为 TouchList（类数组，需通过 [0] 访问）
 * - mp-weixin 端 touches 为数组
 * 此处统一通过安全的类型断言访问，兼容双端。
 *
 * @param e - 触摸事件对象
 * @returns 首个触点的 clientY 坐标，无触点时返回 undefined
 */
function readTouchClientY(e: Event): number | undefined {
  const evt = e as unknown as {
    touches?: Array<{ clientY?: number }> | { 0?: { clientY?: number }; length?: number };
    changedTouches?: Array<{ clientY?: number }> | { 0?: { clientY?: number }; length?: number };
  };
  const touches = evt.touches;
  const touch =
    (Array.isArray(touches) ? touches[0] : touches?.[0]) ||
    (Array.isArray(evt.changedTouches) ? evt.changedTouches[0] : evt.changedTouches?.[0]);
  return touch?.clientY;
}

/** 录音器实例 */
const recorder = createRecorder();

/** 当前是否正在录音 */
const isRecording = ref(false);

/** 录音已用时长（秒） */
const recordingSeconds = ref(0);

/** 用户手指是否已上滑到取消区域 */
const isCancelArea = ref(false);

/** 录音时长计时器 */
let durationTimer: ReturnType<typeof setInterval> | null = null;

/** 录音开始时的触摸点 Y 坐标（用于判断上滑取消） */
let touchStartY = 0;

/** 上滑取消阈值（px）：手指上滑超过此距离视为取消 */
const CANCEL_THRESHOLD = 80;

/** 录音状态文案 */
const statusText = computed(() => {
  if (isCancelArea.value) {
    return t("chat.voiceCancelHint");
  }
  if (isRecording.value) {
    return t("chat.voiceRecordingHint", { n: recordingSeconds.value });
  }
  return t("chat.voiceHoldToTalk");
});

/** 录音按钮主文案（"按住说话"） */
const buttonText = computed(() => {
  if (isRecording.value) {
    return isCancelArea.value
      ? t("chat.voiceCancelText")
      : t("chat.voiceRecordingText", { n: recordingSeconds.value });
  }
  return t("chat.voiceHoldToTalk");
});

/** 录音器事件订阅（注册一次） */
recorder.onStart(() => {
  isRecording.value = true;
  recordingSeconds.value = 0;
  emit("stateChange", true);

  // 启动时长计时器
  if (durationTimer) clearInterval(durationTimer);
  durationTimer = setInterval(() => {
    recordingSeconds.value++;
    // 达到最大时长自动停止
    if (recordingSeconds.value >= props.maxDuration) {
      recorder.stop();
    }
  }, 1000);
});

recorder.onStop((result: RecorderStopResult) => {
  cleanup();
  emit("recorded", result);
});

recorder.onCancel(() => {
  cleanup();
  emit("cancel");
  uni.showToast({
    title: t("chat.voiceTooShort"),
    icon: "none",
  });
});

recorder.onError((error: Error) => {
  cleanup();
  console.error("[VoiceRecorder] 录音失败:", error);
  uni.showToast({
    title: error.message || t("chat.voiceRecordFailed"),
    icon: "none",
  });
});

/**
 * 清理录音状态（计时器、UI 状态）
 */
function cleanup(): void {
  if (durationTimer) {
    clearInterval(durationTimer);
    durationTimer = null;
  }
  isRecording.value = false;
  isCancelArea.value = false;
  recordingSeconds.value = 0;
  emit("stateChange", false);
}

/**
 * 触摸开始：开始录音
 */
function handleTouchStart(e: Event): void {
  if (props.disabled) {
    uni.showToast({
      title: t("chat.voiceSessionClosed"),
      icon: "none",
    });
    return;
  }

  // 记录起始 Y 坐标（用于上滑取消判断）
  touchStartY = readTouchClientY(e) ?? 0;

  lightHaptic();
  void recorder.start({
    format: "mp3",
    duration: props.maxDuration * 1000,
  });
}

/**
 * 触摸移动：判断是否进入取消区域
 */
function handleTouchMove(e: Event): void {
  if (!isRecording.value) return;
  const currentY = readTouchClientY(e) ?? touchStartY;
  const deltaY = touchStartY - currentY;

  // 上滑超过阈值进入取消区域
  const wasCancelArea = isCancelArea.value;
  isCancelArea.value = deltaY > CANCEL_THRESHOLD;

  // 状态变化时触发振动反馈
  if (wasCancelArea !== isCancelArea.value) {
    lightHaptic();
  }
}

/**
 * 触摸结束：根据是否在取消区域决定发送或取消
 */
function handleTouchEnd(): void {
  if (!isRecording.value) return;

  if (isCancelArea.value) {
    // 在取消区域：取消录音
    recorder.cancel();
  } else {
    // 正常结束：停止录音，触发 onStop
    recorder.stop();
  }
}

/**
 * 触摸被外部打断（如来电）：视为取消
 */
function handleTouchCancel(): void {
  if (!isRecording.value) return;
  recorder.cancel();
}

onUnmounted(() => {
  if (durationTimer) {
    clearInterval(durationTimer);
  }
  recorder.destroy();
});
</script>

<template>
  <view class="voice-recorder">
    <!-- 录音状态指示器（仅录音时显示） -->
    <view v-if="isRecording" class="voice-recorder__indicator">
      <view class="voice-recorder__indicator-icon">
        <view class="voice-recorder__wave">
          <view
            v-for="n in 5"
            :key="n"
            class="voice-recorder__wave-bar"
            :class="{ 'voice-recorder__wave-bar--cancel': isCancelArea }"
            :style="{ animationDelay: `${(n - 1) * 0.12}s` }"
          />
        </view>
      </view>
      <text class="voice-recorder__indicator-text">{{ statusText }}</text>
    </view>

    <!-- 按住说话按钮 -->
    <view
      class="voice-recorder__btn press-feedback"
      :class="{
        'voice-recorder__btn--recording': isRecording,
        'voice-recorder__btn--cancel': isCancelArea,
        'voice-recorder__btn--disabled': disabled,
      }"
      hover-class="voice-recorder__btn--hover"
      hover-stay-time="100"
      @touchstart.prevent="handleTouchStart"
      @touchmove.prevent="handleTouchMove"
      @touchend.prevent="handleTouchEnd"
      @touchcancel.prevent="handleTouchCancel"
    >
      <text class="voice-recorder__btn-text">{{ buttonText }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 容器 ==================== */
.voice-recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
}

/* ==================== 录音指示器 ==================== */
.voice-recorder__indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-md);
  background: var(--c-bg-container, #ffffff);
  border: 1rpx solid var(--c-border-light, #e5e7eb);
  box-shadow: var(--s-sm);
  animation: voice-indicator-fade-in var(--d-normal, 200ms) ease-out;
}

@keyframes voice-indicator-fade-in {
  from {
    opacity: 0;
    transform: translateY(8rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.voice-recorder__indicator-icon {
  width: 80rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-recorder__wave {
  display: flex;
  align-items: center;
  gap: 6rpx;
  height: 56rpx;
}

.voice-recorder__wave-bar {
  width: 8rpx;
  height: 24rpx;
  border-radius: var(--r-xs, 4rpx);
  background: var(--c-brand-500, #3FCF8E);
  animation: voice-wave var(--d-slowest, 600ms) ease-in-out infinite alternate;
}

.voice-recorder__wave-bar--cancel {
  background: var(--c-error, #E5454D);
}

@keyframes voice-wave {
  0% {
    height: 12rpx;
  }
  100% {
    height: 48rpx;
  }
}

.voice-recorder__indicator-text {
  font-size: var(--fs-sm, 24rpx);
  color: var(--c-text-secondary, #475569);
}

/* ==================== 按住说话按钮 ==================== */
.voice-recorder__btn {
  flex: 1;
  width: 100%;
  min-height: 64rpx;
  border-radius: var(--r-md);
  background: var(--c-neutral-50, #f5f5f7);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid var(--c-border-light, #e5e7eb);
  transition: all var(--d-fast, 120ms) ease;
}

.voice-recorder__btn--hover {
  transform: scale(0.97);
  opacity: 0.85;
}

.voice-recorder__btn--recording {
  background: var(--c-brand-50, rgba(63, 207, 142, 0.08));
  border-color: var(--c-brand-500, #3FCF8E);
}

.voice-recorder__btn--cancel {
  background: var(--c-error-bg-tint, rgba(229, 69, 77, 0.1));
  border-color: var(--c-error, #E5454D);
}

.voice-recorder__btn--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.voice-recorder__btn-text {
  font-size: var(--fs-lg, 30rpx);
  color: var(--c-text-primary, #1a1a2e);
  font-weight: 600;
}

.voice-recorder__btn--recording .voice-recorder__btn-text {
  color: var(--c-brand-700, #1D8A5A);
}

.voice-recorder__btn--cancel .voice-recorder__btn-text {
  color: var(--c-error, #E5454D);
}
</style>
