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
  if (props.expired || !props.audioUrl) {
    return t("chat.voiceExpired", { n: props.durationSeconds });
  }
  return isPlaying.value
    ? t("chat.voicePaused", { n: props.durationSeconds })
    : t("chat.voicePlayback", { n: props.durationSeconds });
});

/** 气泡宽度（根据时长动态调整，模拟微信风格） */
const bubbleWidth = computed(() => {
  // 基础宽度 120rpx + 每秒 12rpx，上限 480rpx
  const base = 120;
  const perSecond = 12;
  const max = 480;
  return Math.min(max, base + props.durationSeconds * perSecond);
});

/** 是否可播放（未过期且有时频 URL 或处于 mock 模式） */
const canPlay = computed(() => !props.expired);

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

  if (!props.audioUrl) {
    // mock 模式：仅切换 UI 模拟播放
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
        'voice-bubble--expired': expired || !audioUrl,
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

    <!-- 播放/暂停图标 -->
    <view class="voice-bubble__icon">
      <text v-if="expired || !audioUrl" class="voice-bubble__icon-emoji">⏸</text>
      <text v-else-if="isPlaying" class="voice-bubble__icon-emoji">🔊</text>
      <text v-else class="voice-bubble__icon-emoji">🔈</text>
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
  border-radius: 20rpx 4rpx 20rpx 20rpx;
  background: var(--c-bg-brand, rgba(63, 207, 142, 0.08));
  color: var(--c-brand-700, #15803d);
  box-shadow: 0 2rpx 8rpx var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04));
  transition: all 200ms ease;
  min-width: 140rpx;
}

/* self 发送：右侧圆角反向 */
.voice-bubble--self {
  border-radius: 4rpx 20rpx 20rpx 20rpx;
  background: var(--c-brand, #22c55e);
  color: var(--c-text-inverse, #ffffff);
}

.voice-bubble--peer {
  border-radius: 20rpx 4rpx 20rpx 20rpx;
  background: var(--c-bubble-other, #f1f5f9);
  color: var(--c-text-primary, #1a1a2e);
}

.voice-bubble--playing {
  box-shadow: 0 4rpx 16rpx var(--c-brand-shadow-tint-mid, rgba(63, 207, 142, 0.25));
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
  border-radius: 3rpx;
  background: var(--c-brand-300, #86efac);
  transition: height 150ms ease, background 200ms ease;
}

.voice-bubble--self .voice-bubble__bar {
  background: var(--c-overlay-bg-mid, rgba(255, 255, 255, 0.6));
}

.voice-bubble__bar--active {
  animation: voice-wave 0.6s ease-in-out infinite alternate;
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
  font-size: 26rpx;
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
  font-size: 32rpx;
  line-height: 1;
}

.voice-bubble--expired .voice-bubble__icon-emoji {
  opacity: 0.6;
}
</style>
