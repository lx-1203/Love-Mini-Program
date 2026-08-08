<script setup lang="ts">
/**
 * VoiceMessageBubble — 语音消息气泡组件
 *
 * 功能：
 * - 展示语音消息时长与播放按钮
 * - 点击播放/暂停，显示波形动画
 * - 同时只允许一个语音消息播放（互斥控制）
 * - 过期语音消息展示"已过期"状态
 *
 * mp-weixin 兼容：
 * - 通过 utils/audio-recorder.ts 的 createAudioPlayer 调用 uni.createInnerAudioContext
 * - 使用 @tap 而非 click，hover-class 而非 :hover
 * - 不使用 import.meta，状态由闭包管理
 *
 * 错误处理：
 * - 播放失败：toast 提示
 * - URL 为空：toast 提示语音已过期
 *
 * 使用方式：
 * <VoiceMessageBubble
 *   :audio-url="msg.audioUrl"
 *   :duration-seconds="msg.durationSeconds"
 *   :expired="false"
 *   :sender="'self' | 'peer'"
 * />
 */
import { ref, computed, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { createAudioPlayer } from "../../utils/audio-recorder";
import { IMAGE_PATHS } from "../../config/images";

const props = withDefaults(
  defineProps<{
    /** 语音文件 URL（过期或不存在时为空字符串） */
    audioUrl?: string;
    /** 语音时长（秒） */
    durationSeconds: number;
    /** 是否已过期 */
    expired?: boolean;
    /** 发送方：self / peer（影响样式与 ARIA） */
    sender?: "self" | "peer";
  }>(),
  {
    audioUrl: "",
    expired: false,
    sender: "peer",
  }
);

const { t } = useI18n();

/** 语音气泡图标（emoji 替换为 SVG） */
const voiceIcons = {
  speakerOn: IMAGE_PATHS.ICONS_EMOJI.VOLUME_HIGH,
  speakerOff: IMAGE_PATHS.ICONS_EMOJI.VOLUME_LOW,
} as const;

/** 播放器实例 */
const player = createAudioPlayer();

/** 当前是否正在播放 */
const isPlaying = ref(false);

/** 播放进度（0-100） */
const playProgress = ref(0);

/** 进度计时器 */
let progressTimer: ReturnType<typeof setInterval> | null = null;

/** ARIA 标签 */
const ariaLabel = computed(() => {
  // 录音修复：与播放逻辑一致——仅 expired 或无真实音频 URL 时视为不可播放
  if (props.expired || !hasRealAudio.value) {
    return t("chat.voiceExpired", { n: props.durationSeconds });
  }
  return isPlaying.value
    ? t("chat.voicePaused", { n: props.durationSeconds })
    : t("chat.voicePlayback", { n: props.durationSeconds });
});

// 修复（严格模式 noUnusedLocals）：ariaLabel 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用。
defineExpose({ ariaLabel });

/** 气泡宽度（根据时长动态调整，模拟微信风格） */
const bubbleWidth = computed(() => {
  // 基础宽度 120rpx + 每秒 12rpx，上限 480rpx
  const base = 120;
  const perSecond = 12;
  const max = 480;
  return Math.min(max, base + props.durationSeconds * perSecond);
});

/** 是否可播放（未过期） */
const canPlay = computed(() => !props.expired);

/**
 * 是否持有可真实播放的音频 URL。
 *
 * 录音修复：mock 模式消息 body 为占位文本（如"语音消息"），经 resolveMediaUrl
 * 透传后仍为普通字符串——若按真值判断会进入真实播放路径，mp-weixin 端
 * InnerAudioContext 加载非法 src 报错且无模拟反馈。此处仅认可
 * http(s)/wxfile/blob/鉴权代理 前缀的 URL 为真实音频。
 */
const hasRealAudio = computed(() => {
  const url = props.audioUrl;
  if (!url) return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("wxfile://") ||
    url.startsWith("blob:") ||
    url.includes("/api/v1/media/")
  );
});

/**
 * 切换播放/暂停
 */
function togglePlay(): void {
  if (!canPlay.value) {
    uni.showToast({
      title: t("chat.voiceExpired", { n: props.durationSeconds }),
      icon: "none",
    });
    return;
  }

  if (!hasRealAudio.value) {
    // mock 模式（无真实音频 URL）：仅切换 UI 模拟播放
    if (isPlaying.value) {
      stopPlayback();
    } else {
      startPlaybackSimulation();
    }
    return;
  }

  // 真实播放
  void player.play(props.audioUrl, (playing) => {
    if (playing) {
      startPlaybackSimulation();
    } else {
      stopPlayback();
    }
  });
}

/**
 * 启动播放进度模拟（用于波形动画与进度展示）
 */
function startPlaybackSimulation(): void {
  isPlaying.value = true;
  playProgress.value = 0;
  if (progressTimer) clearInterval(progressTimer);
  const totalMs = props.durationSeconds * 1000;
  const interval = 100;
  const steps = Math.max(1, totalMs / interval);
  progressTimer = setInterval(() => {
    playProgress.value = Math.min(100, playProgress.value + 100 / steps);
    if (playProgress.value >= 100) {
      stopPlayback();
    }
  }, interval);
}

/**
 * 停止播放
 */
function stopPlayback(): void {
  isPlaying.value = false;
  playProgress.value = 0;
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
  player.stop();
}

/**
 * 监听 audioUrl 变化时停止播放
 */
watch(
  () => props.audioUrl,
  () => {
    stopPlayback();
  }
);

onUnmounted(() => {
  if (progressTimer) {
    clearInterval(progressTimer);
  }
  player.destroy();
});

/** 格式化时长显示 */
const durationDisplay = computed(() => {
  return `${props.durationSeconds}″`;
});
</script>

<template>
  <view
    class="voice-bubble"
    :class="[
      `voice-bubble--${sender}`,
      {
        'voice-bubble--playing': isPlaying,
        // 录音修复：仅 expired 属性触发过期态。
        // 原 `expired || !audioUrl` 导致 mock 模式（无真实音频 URL）的气泡
        // 被渲染为过期态（opacity+pointer-events:none），既不能点也没有模拟播放，
        // 语音消息展示完全不可用。
        'voice-bubble--expired': expired,
      },
    ]"
    :style="{ minWidth: `${bubbleWidth}rpx` }"
    @tap="togglePlay"
  >
    <!-- 左侧波形（self 时在右） -->
    <view class="voice-bubble__wave" :class="`voice-bubble__wave--${sender}`">
      <view
        v-for="n in 5"
        :key="n"
        class="voice-bubble__bar"
        :class="{
          'voice-bubble__bar--active': isPlaying,
          'voice-bubble__bar--progress': isPlaying && playProgress > (n - 1) * 20,
        }"
        :style="{ animationDelay: `${(n - 1) * 0.1}s` }"
      />
    </view>

    <!-- 时长 -->
    <text class="voice-bubble__duration">{{ durationDisplay }}</text>

    <!-- 播放/暂停图标（录音修复：仅 expired 显示暂停图标，空 URL 的 mock 消息显示播放按钮） -->
    <view class="voice-bubble__icon">
      <image v-if="expired" class="voice-bubble__icon-emoji" :src="IMAGE_PATHS.ICONS_COMMON.PAUSE_SVG" mode="aspectFit" alt="" />
      <image v-else-if="isPlaying" class="voice-bubble__icon-emoji" :src="voiceIcons.speakerOn" mode="aspectFit" alt="" />
      <image v-else class="voice-bubble__icon-emoji" :src="voiceIcons.speakerOff" mode="aspectFit" alt="" />
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ==================== 气泡容器 ==================== */
.voice-bubble {
  display: inline-flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 24rpx;
  border-radius: var(--r-xl, 24rpx) var(--r-xs, 4rpx) var(--r-xl, 24rpx) var(--r-xl, 24rpx);
  background: var(--c-bg-brand, rgba(63, 207, 142, 0.08));
  color: var(--c-brand-700, #1D8A5A);
  box-shadow: var(--s-sm, 0 2rpx 8rpx var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
  transition: all var(--d-normal, 200ms) ease;
  min-width: 140rpx;
}

/* self 发送：右侧圆角反向 */
.voice-bubble--self {
  border-radius: var(--r-xs, 4rpx) var(--r-xl, 24rpx) var(--r-xl, 24rpx) var(--r-xl, 24rpx);
  background: var(--c-brand, #3FCF8E);
  color: var(--c-text-inverse, #ffffff);
}

.voice-bubble--peer {
  border-radius: var(--r-xl, 24rpx) var(--r-xs, 4rpx) var(--r-xl, 24rpx) var(--r-xl, 24rpx);
  background: var(--c-bubble-other, #F0F2F5);
  color: var(--c-text-primary, #1a1a2e);
}

.voice-bubble--playing {
  box-shadow: var(--s-brand-md, 0 4rpx 16rpx var(--c-brand-shadow-tint-mid, rgba(63, 207, 142, 0.20)));
}

.voice-bubble--expired {
  opacity: 0.55;
  pointer-events: none;
}

/* ==================== 波形 ==================== */
.voice-bubble__wave {
  display: flex;
  align-items: center;
  gap: 4rpx;
  height: 32rpx;
}

/* self 时波形在右侧（视觉对称） */
.voice-bubble__wave--self {
  flex-direction: row-reverse;
}

.voice-bubble__bar {
  width: 6rpx;
  height: 12rpx;
  border-radius: var(--r-xs, 4rpx);
  background: var(--c-brand-300, #7CD9A6);
  transition: height var(--d-fast, 120ms) ease, background var(--d-normal, 200ms) ease;
}

.voice-bubble--self .voice-bubble__bar {
  background: var(--c-overlay-bg-mid, rgba(255, 255, 255, 0.6));
}

.voice-bubble__bar--active {
  animation: voice-wave var(--d-slowest, 600ms) ease-in-out infinite alternate;
}

.voice-bubble__bar--progress {
  height: 28rpx;
}

.voice-bubble--self .voice-bubble__bar--progress {
  background: var(--c-text-inverse, #ffffff);
}

.voice-bubble--peer .voice-bubble__bar--progress {
  background: var(--c-brand-500, #22c55e);
}

@keyframes voice-wave {
  from {
    height: 8rpx;
  }
  to {
    height: 28rpx;
  }
}

/* ==================== 时长 ==================== */
.voice-bubble__duration {
  font-size: var(--fs-md, 26rpx);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* ==================== 播放图标 ==================== */
.voice-bubble__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.voice-bubble__icon-emoji {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-text-secondary);
}

.voice-bubble--expired .voice-bubble__icon-emoji {
  opacity: 0.6;
}
</style>
