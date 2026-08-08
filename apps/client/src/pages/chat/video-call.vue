<script setup lang="ts">
/**
 * 视频通话页
 *
 * 功能：
 * - 发起方：进入页面后调用 startCall 创建房间，等待对方接听
 * - 被叫方：通过 URL 参数 ?roomId=xxx&callerId=xxx&calleeId=xxx 进入
 * - 通话中：显示本地/远端视频流，支持麦克风/摄像头/扬声器/翻转相机
 * - 结束通话：调用 endCall 上报通话时长与结束原因
 *
 * mp-weixin 兼容：
 * - 使用 @tap / hover-class 而非 click / :hover
 * - 使用 uni.createLivePusherContext / <live-pusher> 推流，<live-player> 拉流
 * - 不使用 import.meta.env，状态由 store 管理
 * - 条件编译：mp-weixin 使用 live-pusher/live-player；H5 使用 video 标签
 */
import { ref, computed, getCurrentInstance, onMounted, onUnmounted } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useVideoCallStore, type VideoCallEndReason } from "../../stores/video-call";
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();

/** 通话控制图标（emoji 替换为 SVG，lucide 风格） */
const callIcons = {
  video: IMAGE_PATHS.ICONS_EMOJI.VIDEO,
  camera: IMAGE_PATHS.ICONS_EMOJI.CAMERA_ICON,
  prohibited: IMAGE_PATHS.ICONS_EMOJI.PROHIBITED,
  phone: IMAGE_PATHS.ICONS_EMOJI.PHONE,
  mic: IMAGE_PATHS.ICONS_EMOJI.MICROPHONE,
  micOff: IMAGE_PATHS.ICONS_EMOJI.VOLUME_X,
  speaker: IMAGE_PATHS.ICONS_EMOJI.VOLUME_HIGH,
  speakerOff: IMAGE_PATHS.ICONS_EMOJI.VOLUME_LOW,
  switchCamera: IMAGE_PATHS.ICONS_EMOJI.REFRESH_CW,
} as const;
const store = useVideoCallStore();

/** 是否为发起方（true）或被叫方（false） */
const isCaller = ref(true);

/** 对方用户 ID */
const peerUserId = ref<number>(0);

/** 房间号 */
const roomId = ref<string>("");

/** 通话状态：RINGING / ONGOING / ENDED */
const callStatus = ref<"RINGING" | "ONGOING" | "ENDED" | "REJECTED" | "MISSED">("RINGING");

/** 通话时长（秒） */
const durationSec = ref(0);

/** 麦克风是否开启 */
const micEnabled = ref(true);

/** 摄像头是否开启 */
const cameraEnabled = ref(true);

/** 扬声器是否开启（默认开启） */
const speakerEnabled = ref(true);

/** 推流地址（mock 模式为空，真实环境从信令服务器获取） */
const pusherUrl = ref<string>("");

/** R4-00070：live-pusher 上下文（懒创建，用于翻转相机等真实操作） */
let pusherContext: UniApp.LivePusherContext | null = null;

/** 拉流地址 */
const playerUrl = ref<string>("");

/** 通话时长计时器 */
let durationTimer: ReturnType<typeof setInterval> | null = null;

/** 振铃超时计时器（30 秒未接听视为未接） */
let ringTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 待执行的页面返回定时器集合。
 *
 * 修复（Task 18.7）：原 startCallAsCaller / startRingTimeout / rejectCall / hangupCall 内
 * 4 处 {@code setTimeout(() => uni.navigateBack(...), N)} 未保存返回值，
 * 若用户在延迟窗口内手动返回上一页，定时器仍会触发 navigateBack，造成多次返回或返回到错误页面。
 * 现统一通过 scheduleNavBack 入队，onUnload 时通过 clearPendingNavBackTimers 清理。
 */
const pendingNavBackTimers: Set<ReturnType<typeof setTimeout>> = new Set();

/**
 * 注册延迟返回上一页的定时器，并入队待清理集合。
 *
 * @param delay - 延迟毫秒数
 */
function scheduleNavBack(delay: number): void {
  const timer = setTimeout(() => {
    pendingNavBackTimers.delete(timer);
    uni.navigateBack({ delta: 1 });
  }, delay);
  pendingNavBackTimers.add(timer);
}

/**
 * 清理所有待执行的页面返回定时器。
 *
 * 用于 onUnload，避免离开页面后仍触发 navigateBack。
 */
function clearPendingNavBackTimers(): void {
  pendingNavBackTimers.forEach((timer) => clearTimeout(timer));
  pendingNavBackTimers.clear();
}

/** 通话状态文案 */
const statusText = computed(() => {
  switch (callStatus.value) {
    case "RINGING":
      return isCaller.value
        ? t("videoCall.waitingTitle")
        : t("videoCall.incomingTitle");
    case "ONGOING":
      return t("videoCall.callingTitle");
    case "ENDED":
      return t("videoCall.endedTitle");
    case "REJECTED":
      return t("videoCall.rejectedTitle");
    case "MISSED":
      return t("videoCall.missedTitle");
    default:
      return "";
  }
});

/** 格式化通话时长 mm:ss */
const durationDisplay = computed(() => {
  const m = Math.floor(durationSec.value / 60);
  const s = durationSec.value % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});

/**
 * 发起方：调用 store.startCall 创建房间
 */
async function startCallAsCaller() {
  if (!peerUserId.value || peerUserId.value <= 0) {
    uni.showToast({ title: t("videoCall.startFailed"), icon: "none" });
    return;
  }
  try {
    const result = await store.startCall({
      calleeId: peerUserId.value,
    });
    roomId.value = result.call.roomId;
    pusherUrl.value = ""; // 真实环境填入信令服务器返回的推流地址
    playerUrl.value = "";
    // 启动振铃超时计时器
    startRingTimeout();
  } catch (error) {
    const message = error instanceof Error ? error.message : t("videoCall.startFailed");
    uni.showToast({ title: message, icon: "none" });
    // 返回上一页（修复 Task 18.7：通过 scheduleNavBack 入队，支持 onUnload 清理）
    scheduleNavBack(1500);
  }
}

/**
 * 被叫方：从 URL 参数同步房间状态
 */
function syncFromRouteAsCallee(params: {
  roomId: string;
  callerId: number;
  calleeId: number;
}) {
  isCaller.value = false;
  roomId.value = params.roomId;
  store.syncFromRoute(params.roomId, params.callerId, params.calleeId);
  // 启动振铃超时计时器
  startRingTimeout();
}

/**
 * 启动振铃超时计时器：30 秒未接听视为未接
 */
function startRingTimeout() {
  if (ringTimeoutTimer) clearTimeout(ringTimeoutTimer);
  ringTimeoutTimer = setTimeout(() => {
    if (callStatus.value === "RINGING") {
      callStatus.value = "MISSED";
      // 自动返回上一页（修复 Task 18.7：通过 scheduleNavBack 入队，支持 onUnload 清理）
      scheduleNavBack(1500);
    }
  }, 30_000);
}

/**
 * 接听通话（被叫方点击接听）
 */
function acceptCall() {
  lightHaptic();
  if (ringTimeoutTimer) {
    clearTimeout(ringTimeoutTimer);
    ringTimeoutTimer = null;
  }
  callStatus.value = "ONGOING";
  startDurationTimer();
}

/**
 * 拒绝接听（被叫方点击拒绝）
 */
function rejectCall() {
  lightHaptic();
  if (ringTimeoutTimer) {
    clearTimeout(ringTimeoutTimer);
    ringTimeoutTimer = null;
  }
  callStatus.value = "REJECTED";
  void endCallWithReason("REJECTED");
  // 修复 Task 18.7：通过 scheduleNavBack 入队，支持 onUnload 清理
  scheduleNavBack(1000);
}

/**
 * 挂断通话（通话中点击挂断）
 */
function hangupCall() {
  lightHaptic();
  callStatus.value = "ENDED";
  stopDurationTimer();
  void endCallWithReason("HANGUP");
  // 修复 Task 18.7：通过 scheduleNavBack 入队，支持 onUnload 清理
  scheduleNavBack(1500);
}

/**
 * 调用 store.endCall 上报通话结果
 *
 * 修复（P0-09）：后端 EndCallRequest 以 roomId 定位通话（不再用 callId），
 * 且被叫方经 syncFromRoute 进入时 currentCall.id 恒为 0（原实现会直接 return，
 * 导致被叫方挂断/拒接从不上报）；改为传 roomId 并在 store 内映射结束原因。
 */
async function endCallWithReason(reason: VideoCallEndReason) {
  const roomId = store.currentCall?.roomId ?? "";
  if (!roomId) return;
  try {
    await store.endCall({
      roomId,
      endReason: reason,
      durationSec: durationSec.value,
    });
  } catch (error) {
    // 静默处理：结束通话失败不阻塞返回流程
    console.warn("[video-call] endCall 失败:", error);
  }
}

/**
 * 启动通话时长计时器
 */
function startDurationTimer() {
  if (durationTimer) clearInterval(durationTimer);
  durationSec.value = 0;
  durationTimer = setInterval(() => {
    durationSec.value++;
  }, 1000);
}

/**
 * 停止通话时长计时器
 */
function stopDurationTimer() {
  if (durationTimer) {
    clearInterval(durationTimer);
    durationTimer = null;
  }
}

/** 切换麦克风 */
function toggleMic() {
  lightHaptic();
  micEnabled.value = !micEnabled.value;
  uni.showToast({
    title: micEnabled.value ? t("videoCall.micOn") : t("videoCall.micOff"),
    icon: "none",
  });
}

/** 切换摄像头 */
function toggleCamera() {
  lightHaptic();
  cameraEnabled.value = !cameraEnabled.value;
  uni.showToast({
    title: cameraEnabled.value ? t("videoCall.cameraOn") : t("videoCall.cameraOff"),
    icon: "none",
  });
}

/** 切换扬声器 */
function toggleSpeaker() {
  lightHaptic();
  speakerEnabled.value = !speakerEnabled.value;
}

/** 翻转摄像头 */
function switchCamera() {
  lightHaptic();
  // #ifdef MP-WEIXIN
  // R4-00070：真实调用 live-pusher 上下文 switchCamera，不再仅 toast 欺骗。
  // 首次点击时懒创建 context（id 对应模板 live-pusher 的 id），后续复用。
  if (!pusherContext) {
    pusherContext = uni.createLivePusherContext("video-call-pusher", getCurrentInstance());
  }
  pusherContext?.switchCamera({
    success: () => {
      uni.showToast({ title: t("videoCall.switchCameraDone"), icon: "none" });
    },
    fail: () => {
      // 未处于通话中（pusher 未渲染/未推流）时上下文调用失败，提示而非静默
      uni.showToast({ title: t("videoCall.switchCameraFail"), icon: "none" });
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  // H5 端无 live-pusher（WebRTC 未接入），保留占位提示
  uni.showToast({ title: t("videoCall.switchCameraBtn"), icon: "none" });
  // #endif
}

onLoad((query) => {
  // 解析 URL 参数：
  // - 发起方：?calleeId=123
  // - 被叫方：?roomId=xxx&callerId=123&calleeId=456
  if (!query) return;

  // 被叫方路径：URL 含 roomId + callerId
  if (
    typeof query.roomId === "string" &&
    query.roomId.trim().length > 0 &&
    typeof query.callerId === "string"
  ) {
    const callerId = parseInt(query.callerId, 10);
    const calleeId = parseInt(query.calleeId ?? "0", 10);
    if (!isNaN(callerId) && !isNaN(calleeId)) {
      syncFromRouteAsCallee({
        roomId: query.roomId.trim(),
        callerId,
        calleeId,
      });
      return;
    }
  }

  // 发起方路径：URL 含 calleeId
  if (typeof query.calleeId === "string") {
    const id = parseInt(query.calleeId, 10);
    if (!isNaN(id) && id > 0) {
      isCaller.value = true;
      peerUserId.value = id;
      void startCallAsCaller();
    }
  }
});

onUnmounted(() => {
  stopDurationTimer();
  if (ringTimeoutTimer) {
    clearTimeout(ringTimeoutTimer);
    ringTimeoutTimer = null;
  }
  // 修复 Task 18.7：清理待执行的页面返回定时器，避免组件卸载后仍触发 navigateBack
  clearPendingNavBackTimers();
});

onUnload(() => {
  stopDurationTimer();
  if (ringTimeoutTimer) {
    clearTimeout(ringTimeoutTimer);
    ringTimeoutTimer = null;
  }
  // 修复 Task 18.7：清理待执行的页面返回定时器，避免离开页面后仍触发 navigateBack
  clearPendingNavBackTimers();
});

// 页面挂载时锁定屏幕为竖屏（视频通话一般使用竖屏）
onMounted(() => {
  // #ifdef MP-WEIXIN
  try {
    uni.setKeepScreenOn?.({ keepScreenOn: true });
  } catch (_e) {
    // 静默处理
  }
  // #endif
});
</script>

<template>
  <view class="video-call-page">
    <!-- #ifdef MP-WEIXIN -->
    <!-- 远端视频流（被叫方推流，本地拉流） -->
    <live-player
      v-if="playerUrl"
      class="video-call-page__player"
      :src="playerUrl"
      mode="RTC"
      :autoplay="true"
      :muted="!speakerEnabled"
      :enable-camera="cameraEnabled"
      object-fit="cover"
    />
    <!-- 本地视频流（推流） -->
    <live-pusher
      v-if="pusherUrl"
      id="video-call-pusher"
      class="video-call-page__pusher"
      :url="pusherUrl"
      mode="RTC"
      :muted="!micEnabled"
      :enable-camera="cameraEnabled"
      :autopush="true"
      object-fit="cover"
    />
    <!-- #endif -->

    <!-- #ifndef MP-WEIXIN -->
    <!-- H5 占位（真实环境使用 video 标签接入 WebRTC） -->
    <view class="video-call-page__remote">
      <image class="video-call-page__remote-emoji" :src="callIcons.video" mode="aspectFit" alt="" />
    </view>
    <view class="video-call-page__local">
      <image class="video-call-page__local-emoji" :src="callIcons.camera" mode="aspectFit" alt="" />
    </view>
    <!-- #endif -->

    <!-- 顶部状态栏 -->
    <view class="call-header">
      <text class="call-header__status">{{ statusText }}</text>
      <text v-if="callStatus === 'ONGOING'" class="call-header__duration">
        {{ durationDisplay }}
      </text>
    </view>

    <!-- 底部操作区 -->
    <view class="call-footer">
      <!-- 振铃中：被叫方显示接听/拒绝 -->
      <template v-if="callStatus === 'RINGING' && !isCaller">
        <view
          class="call-btn call-btn--reject press-feedback"
          @tap="rejectCall"
          hover-class="call-btn--hover"
          hover-stay-time="100"
        >
          <image class="call-btn__icon" :src="callIcons.prohibited" mode="aspectFit" alt="" />
          <text class="call-btn__label">{{ t('videoCall.rejectBtn') }}</text>
        </view>
        <view
          class="call-btn call-btn--accept press-feedback"
          @tap="acceptCall"
          hover-class="call-btn--hover"
          hover-stay-time="100"
        >
          <image class="call-btn__icon" :src="callIcons.phone" mode="aspectFit" alt="" />
          <text class="call-btn__label">{{ t('videoCall.acceptBtn') }}</text>
        </view>
      </template>

      <!-- 振铃中：发起方显示取消 -->
      <template v-else-if="callStatus === 'RINGING' && isCaller">
        <view
          class="call-btn call-btn--reject press-feedback"
          @tap="hangupCall"
          hover-class="call-btn--hover"
          hover-stay-time="100"
        >
          <image class="call-btn__icon" :src="callIcons.prohibited" mode="aspectFit" alt="" />
          <text class="call-btn__label">{{ t('videoCall.hangupBtn') }}</text>
        </view>
      </template>

      <!-- 通话中：显示麦克风/摄像头/扬声器/翻转/挂断 -->
      <template v-else-if="callStatus === 'ONGOING'">
        <view class="call-toolbar">
          <view
            class="call-tool press-feedback"
            @tap="toggleMic"
            hover-class="call-tool--hover"
            hover-stay-time="100"
          >
            <image class="call-tool__icon" :src="micEnabled ? callIcons.mic : callIcons.micOff" mode="aspectFit" alt="" />
            <text class="call-tool__label">{{ t('videoCall.micBtn') }}</text>
          </view>
          <view
            class="call-tool press-feedback"
            @tap="toggleCamera"
            hover-class="call-tool--hover"
            hover-stay-time="100"
          >
            <image class="call-tool__icon" :src="cameraEnabled ? callIcons.camera : callIcons.prohibited" mode="aspectFit" alt="" />
            <text class="call-tool__label">{{ t('videoCall.cameraBtn') }}</text>
          </view>
          <view
            class="call-tool press-feedback"
            @tap="toggleSpeaker"
            hover-class="call-tool--hover"
            hover-stay-time="100"
          >
            <image class="call-tool__icon" :src="speakerEnabled ? callIcons.speaker : callIcons.speakerOff" mode="aspectFit" alt="" />
            <text class="call-tool__label">{{ t('videoCall.speakerBtn') }}</text>
          </view>
          <view
            class="call-tool press-feedback"
            @tap="switchCamera"
            hover-class="call-tool--hover"
            hover-stay-time="100"
          >
            <image class="call-tool__icon" :src="callIcons.switchCamera" mode="aspectFit" alt="" />
            <text class="call-tool__label">{{ t('videoCall.switchCameraBtn') }}</text>
          </view>
        </view>
        <view
          class="call-btn call-btn--hangup press-feedback"
          @tap="hangupCall"
          hover-class="call-btn--hover"
          hover-stay-time="100"
        >
          <image class="call-btn__icon" :src="callIcons.prohibited" mode="aspectFit" alt="" />
          <text class="call-btn__label">{{ t('videoCall.hangupBtn') }}</text>
        </view>
      </template>

      <!-- 通话结束：显示状态 -->
      <template v-else>
        <view class="call-ended">
          <text class="call-ended__title">{{ statusText }}</text>
          <text v-if="durationSec > 0" class="call-ended__duration">
            {{ t('videoCall.durationLabel', { duration: durationDisplay }) }}
          </text>
        </view>
      </template>
    </view>

    <!-- 安全区占位 -->
    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.video-call-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* 视频通话页面背景：使用深色 token 替代硬编码 #000000 */
  background: var(--c-neutral-900);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==================== 视频 ==================== */
.video-call-page__player,
.video-call-page__pusher,
.video-call-page__remote {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: var(--c-neutral-900);
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-call-page__remote-emoji {
  width: 200rpx;
  height: 200rpx;
  color: var(--c-overlay-text-placeholder);
}

.video-call-page__local {
  position: absolute;
  top: 120rpx;
  right: 24rpx;
  width: 200rpx;
  height: 280rpx;
  background: var(--c-neutral-800);
  border-radius: var(--r-lg, 16rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid var(--c-overlay-bg-light);
  z-index: 10;
}

.video-call-page__local-emoji {
  width: 64rpx;
  height: 64rpx;
  color: var(--c-overlay-text-quaternary);
}

/* ==================== 顶部状态栏 ==================== */
.call-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: calc(env(safe-area-inset-top) + 40rpx) 24rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  z-index: 20;
  background: linear-gradient(180deg, var(--c-black-overlay-50) 0%, var(--c-black-overlay-transparent) 100%);
}

.call-header__status {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 600;
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
}

.call-header__duration {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-overlay-white-text-strong);
  font-family: monospace;
}

/* ==================== 底部操作区 ==================== */
.call-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 48rpx;
  flex-wrap: wrap;
  z-index: 20;
  background: linear-gradient(0deg, var(--c-black-overlay-strong) 0%, var(--c-black-overlay-transparent) 100%);
}

/* ==================== 操作按钮 ==================== */
.call-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  width: 128rpx;
  transition: transform var(--d-fast, 120ms) ease;

  &--hover {
    transform: scale(0.92);
  }

  &__icon {
    width: 112rpx;
    height: 112rpx;
    border-radius: var(--r-circle, 50%);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-overlay-border-light);

    image {
      width: 48rpx;
      height: 48rpx;
      color: var(--c-text-inverse);
    }
  }

  &__label {
    font-size: var(--fs-base, 24rpx);
    /* 反色文字：使用 token 替代硬编码 #FFFFFF */
    color: var(--c-text-inverse);
    font-weight: 500;
  }

  &--accept .call-btn__icon {
    background: var(--c-success);
  }

  &--reject .call-btn__icon,
  &--hangup .call-btn__icon {
    background: var(--c-error);
  }
}

/* ==================== 工具栏 ==================== */
.call-toolbar {
  display: flex;
  gap: 32rpx;
  margin-bottom: 24rpx;
  flex-basis: 100%;
  justify-content: center;
}

.call-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: transform var(--d-fast, 120ms) ease;

  &--hover {
    transform: scale(0.92);
  }

  &__icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: var(--r-circle, 50%);
    background: var(--c-overlay-border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-overlay-border-light);

    image {
      width: 48rpx;
      height: 48rpx;
      color: var(--c-text-inverse);
    }
  }

  &__label {
    font-size: var(--fs-sm, 22rpx);
    color: var(--c-overlay-text-secondary);
  }
}

/* ==================== 结束状态 ==================== */
.call-ended {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx;
}

.call-ended__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 600;
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
}

.call-ended__duration {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-overlay-white-text-mid);
  font-family: monospace;
}

/* ==================== 安全区 ==================== */
.safe-bottom {
  height: env(safe-area-inset-bottom);
  flex-shrink: 0;
}
</style>
