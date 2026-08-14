<script setup lang="ts">
/**
 * VoicePill — 语音消息气泡组件
 *
 * 展示语音消息时长 + 播放/暂停状态。
 * mp-weixin 使用 wx.createInnerAudioContext() 播放，
 * 点击气泡切换播放/暂停，显示波形动画。
 */
import { ref, computed, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  durationSeconds: number;
  /** 语音文件 URL（可为空，mock 模式仅显示时长） */
  audioUrl?: string;
  expired?: boolean;
}>();

const { t } = useI18n();

const isPlaying = ref(false);
/** 音频上下文（mp-weixin 平台为 InnerAudioContext，其他平台为 null） */
const audioCtx = ref<ReturnType<typeof uni.createInnerAudioContext> | null>(null);
/** 模拟播放结束定时器引用（用于无音频 URL 时的 UI 状态切换） */
let playEndTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * 暂停时的播放位置（秒）。
 * 修复（P1 BUG）：原实现暂停后重新播放会重新设置 src（从头播放），
 * 用户听一半暂停再继续会从头开始。现记录 pausedAt，恢复时 seek 回原位。
 */
let pausedAt = 0;

/** ARIA 标签：根据播放状态/过期状态生成无障碍描述 */
const ariaLabel = computed(() => {
  if (props.expired) return t("chat.voiceExpired", { n: props.durationSeconds });
  return isPlaying.value
    ? t("chat.voicePaused", { n: props.durationSeconds })
    : t("chat.voicePlayback", { n: props.durationSeconds });
});

// 修复（严格模式 noUnusedLocals）：ariaLabel 仅在模板的 #ifdef H5 条件编译块内引用，
// vue-tsc 无法识别 HTML 注释内的模板绑定，故通过 defineExpose 标记为已使用。
defineExpose({ ariaLabel });

function togglePlay() {
  if (props.expired) return;

  // #ifdef MP-WEIXIN
  if (!audioCtx.value) {
    audioCtx.value = uni.createInnerAudioContext();
    audioCtx.value.onEnded(() => { isPlaying.value = false; pausedAt = 0; });
    audioCtx.value.onError(() => { isPlaying.value = false; pausedAt = 0; });
  }

  if (isPlaying.value) {
    // 暂停：记录当前位置，便于恢复播放时 seek 回原位
    pausedAt = audioCtx.value.currentTime || 0;
    audioCtx.value.pause();
    isPlaying.value = false;
  } else if (props.audioUrl) {
    // 修复（P1 BUG）：仅在 src 变化时才重新赋值，避免重设 src 导致从头播放；
    // 恢复播放后 seek 到暂停位置（InnerAudioContext.seek 需在 play 后调用）
    if (audioCtx.value.src !== props.audioUrl) {
      audioCtx.value.src = props.audioUrl;
      pausedAt = 0;
    }
    audioCtx.value.play();
    if (pausedAt > 0) {
      audioCtx.value.seek(pausedAt);
      pausedAt = 0;
    }
    isPlaying.value = true;
  } else {
    // 无音频 URL，仅切换 UI 模拟播放状态
    isPlaying.value = true;
    if (playEndTimer) clearTimeout(playEndTimer);
    playEndTimer = setTimeout(() => { isPlaying.value = false; }, props.durationSeconds * 1000);
  }
  // #endif

  // #ifndef MP-WEIXIN
  isPlaying.value = true;
  if (playEndTimer) clearTimeout(playEndTimer);
  playEndTimer = setTimeout(() => { isPlaying.value = false; }, props.durationSeconds * 1000);
  // #endif
}

onUnmounted(() => {
  // 修复（P1 BUG）：清理模拟播放定时器，避免组件卸载后定时器仍触发回调
  // 修改已销毁组件的响应式状态 isPlaying。
  if (playEndTimer) {
    clearTimeout(playEndTimer);
    playEndTimer = null;
  }
  audioCtx.value?.destroy();
});
</script>

<template>
  <view
    class="voice-pill"
    :class="{ 'voice-pill--expired': expired, 'voice-pill--playing': isPlaying }"
    @tap="togglePlay"
    role="button"
    :aria-label="ariaLabel"
    :aria-pressed="isPlaying"
    :aria-disabled="expired"
  >
    <view class="voice-pill__wave">
      <view
        v-for="n in 3"
        :key="n"
        class="voice-pill__bar"
        :class="{ 'voice-pill__bar--active': isPlaying }"
        :style="{ animationDelay: `${(n - 1) * 0.15}s` }"
      />
    </view>
    <text class="voice-pill__duration">{{ durationSeconds }}″</text>
  </view>
</template>

<style scoped lang="scss">
.voice-pill {
  display: inline-flex;
  align-items: center;
  /* 14rpx 无对应 token 档位，保留 */
  gap: 14rpx;
  /* 18rpx 无对应 token 档位，保留 */
  padding: 18rpx var(--sp-6);
  border-radius: var(--r-lg, 20rpx) var(--r-xs, 4rpx) var(--r-lg, 20rpx) var(--r-lg, 20rpx);
  background: var(--c-bg-brand);
  color: var(--c-brand-700);
  box-shadow: var(--s-sm, 0 2rpx 8rpx var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
  transition: all var(--d-normal, 200ms) ease;
  /* 气泡固定最小宽度（时长布局值），无对应 token */
  min-width: 140rpx;
}

.voice-pill:active {
  transform: scale(0.98);
  opacity: 0.85;
}

.voice-pill--expired {
  opacity: 0.45;
  pointer-events: none;
}

.voice-pill--playing {
  background: linear-gradient(135deg, var(--c-brand-400), var(--c-brand-600));
  color: var(--c-text-inverse, #FFFFFF);
  box-shadow: var(--s-brand-md, 0 4rpx 16rpx var(--c-brand-shadow-tint-mid, rgba(63, 207, 142, 0.25)));
}

.voice-pill__wave {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-1);
  /* 波形容器固定高度（32rpx），无对应 token */
  height: 32rpx;
}

.voice-pill__bar {
  /* 波形条固定尺寸（宽 6rpx 高 12rpx），无对应 token */
  width: 6rpx;
  height: 12rpx;
  border-radius: var(--r-xs, 3rpx);
  background: var(--c-brand-300);
  transition: height var(--d-fast, 150ms) ease, background var(--d-normal, 200ms) ease;
}

.voice-pill__bar--active {
  background: var(--c-text-inverse, #FFFFFF);
  animation: voice-wave var(--d-slowest, 600ms) ease-in-out infinite alternate;
}

@keyframes voice-wave {
  /* 波形动画高度为固定布局值（8rpx→28rpx），无对应 token */
  from { height: 8rpx; }
  to { height: 28rpx; }
}

.voice-pill__duration {
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
