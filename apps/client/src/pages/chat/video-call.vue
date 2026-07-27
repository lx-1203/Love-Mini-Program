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
import { ref, computed, onMounted, onUnmounted } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useVideoCallStore, type VideoCallEndReason } from "../../stores/video-call";
import { lightHaptic } from "../../utils/haptic";

const { t } = useI18n();
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

/** 拉流地址 */
const playerUrl = ref<string>("");

/** 通话时长计时器 */
let durationTimer: ReturnType<typeof setInterval> | null = null;

/** 振铃超时计时器（30 秒未接听视为未接） */
let ringTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

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
    // 返回上一页
    setTimeout(() => uni.navigateBack({ delta: 1 }), 1500);
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
      // 自动返回上一页
      setTimeout(() => uni.navigateBack({ delta: 1 }), 1500);
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
  setTimeout(() => uni.navigateBack({ delta: 1 }), 1000);
}

/**
 * 挂断通话（通话中点击挂断）
 */
function hangupCall() {
  lightHaptic();
  callStatus.value = "ENDED";
  stopDurationTimer();
  void endCallWithReason("HANGUP");
  setTimeout(() => uni.navigateBack({ delta: 1 }), 1500);
}

/**
 * 调用 store.endCall 上报通话结果
 */
async function endCallWithReason(reason: VideoCallEndReason) {
  const callId = store.currentCall?.id ?? 0;
  if (!callId) return;
  try {
    await store.endCall({
      callId,
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
  // live-pusher 上下文翻转相机（需 pusher ref）
  // 真实环境需通过 this.$refs.pusher.switchCamera() 调用
  uni.showToast({ title: t("videoCall.switchCameraBtn"), icon: "none" });
  // #endif
  // #ifndef MP-WEIXIN
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
});

onUnload(() => {
  stopDurationTimer();
  if (ringTimeoutTimer) {
    clearTimeout(ringTimeoutTimer);
    ringTimeoutTimer = null;
  }
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
      <text class="video-call-page__remote-emoji">📹</text>
    </view>
    <view class="video-call-page__local">
      <text class="video-call-page__local-emoji">📷</text>
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
          <text class="call-btn__icon">📵</text>
          <text class="call-btn__label">{{ t('videoCall.rejectBtn') }}</text>
        </view>
        <view
          class="call-btn call-btn--accept press-feedback"
          @tap="acceptCall"
          hover-class="call-btn--hover"
          hover-stay-time="100"
        >
          <text class="call-btn__icon">📞</text>
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
          <text class="call-btn__icon">📵</text>
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
            <text class="call-tool__icon">{{ micEnabled ? '🎤' : '🔇' }}</text>
            <text class="call-tool__label">{{ t('videoCall.micBtn') }}</text>
          </view>
          <view
            class="call-tool press-feedback"
            @tap="toggleCamera"
            hover-class="call-tool--hover"
            hover-stay-time="100"
          >
            <text class="call-tool__icon">{{ cameraEnabled ? '📹' : '🚫' }}</text>
            <text class="call-tool__label">{{ t('videoCall.cameraBtn') }}</text>
          </view>
          <view
            class="call-tool press-feedback"
            @tap="toggleSpeaker"
            hover-class="call-tool--hover"
            hover-stay-time="100"
          >
            <text class="call-tool__icon">{{ speakerEnabled ? '🔊' : '🔈' }}</text>
            <text class="call-tool__label">{{ t('videoCall.speakerBtn') }}</text>
          </view>
          <view
            class="call-tool press-feedback"
            @tap="switchCamera"
            hover-class="call-tool--hover"
            hover-stay-time="100"
          >
            <text class="call-tool__icon">🔄</text>
            <text class="call-tool__label">{{ t('videoCall.switchCameraBtn') }}</text>
          </view>
        </view>
        <view
          class="call-btn call-btn--hangup press-feedback"
          @tap="hangupCall"
          hover-class="call-btn--hover"
          hover-stay-time="100"
        >
          <text class="call-btn__icon">📵</text>
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
  background: var(--c-neutral-900, #1a1a2e);
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-call-page__remote-emoji {
  font-size: 200rpx;
  color: rgba(255, 255, 255, 0.3);
}

.video-call-page__local {
  position: absolute;
  top: 120rpx;
  right: 24rpx;
  width: 200rpx;
  height: 280rpx;
  background: var(--c-neutral-800, #2a2a3e);
  border-radius: var(--r-lg, 16rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  z-index: 10;
}

.video-call-page__local-emoji {
  font-size: 64rpx;
  color: rgba(255, 255, 255, 0.5);
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
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
}

.call-header__status {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 600;
  /* 反色文字：使用 token 替代硬编码 #FFFFFF */
  color: var(--c-text-inverse);
}

.call-header__duration {
  font-size: var(--fs-lg, 28rpx);
  color: rgba(255, 255, 255, 0.8);
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
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%);
}

/* ==================== 操作按钮 ==================== */
.call-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  width: 128rpx;
  transition: transform 0.15s ease;

  &--hover {
    transform: scale(0.92);
  }

  &__icon {
    width: 112rpx;
    height: 112rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-7xl, 56rpx);
    background: rgba(255, 255, 255, 0.18);
  }

  &__label {
    font-size: var(--fs-base, 24rpx);
    /* 反色文字：使用 token 替代硬编码 #FFFFFF */
    color: var(--c-text-inverse);
    font-weight: 500;
  }

  &--accept .call-btn__icon {
    background: var(--c-success, #22C55E);
  }

  &--reject .call-btn__icon,
  &--hangup .call-btn__icon {
    background: var(--c-error, #EF4444);
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
  transition: transform 0.15s ease;

  &--hover {
    transform: scale(0.92);
  }

  &__icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-6xl, 48rpx);
  }

  &__label {
    font-size: var(--fs-sm, 22rpx);
    color: rgba(255, 255, 255, 0.85);
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
  color: rgba(255, 255, 255, 0.7);
  font-family: monospace;
}

/* ==================== 安全区 ==================== */
.safe-bottom {
  height: env(safe-area-inset-bottom);
  flex-shrink: 0;
}
</style>
