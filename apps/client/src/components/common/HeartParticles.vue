<script setup lang="ts">
/**
 * HeartParticles - 心形粒子撒花动画组件
 *
 * 用途：签到成功等庆祝场景下，从中心向四周抛物线扩散 12 个心形粒子。
 * 1.5s 后自动 emit done 事件，由父组件重置 visible 状态。
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类
 * - 不使用 import.meta.env.DEV
 * - 不使用 backdrop-filter
 * - CSS 变量通过内联 style 注入，保证小程序端可解析
 *
 * P6 a11y：
 * - 添加可暂停按钮（前庭功能障碍用户可停止动画）
 * - 暂停按钮可见但不遮挡内容（半透明右上角小按钮，pointer-events 仅在按钮上）
 * - 暂停状态通过 animation-play-state: paused 实现
 * - 容器保持 aria-hidden="true"，避免屏幕阅读器播报装饰性粒子
 */
import { ref, watch, onUnmounted } from "vue";
import { IMAGE_PATHS } from "../../config/images";
// R4-batch2: 暂停/恢复 aria-label 文案 i18n 化
import { useI18n } from "vue-i18n";

const { t } = useI18n();

interface Props {
  /** 是否显示粒子动画 */
  visible: boolean;
  /** 是否显示暂停按钮（默认 true，前庭功能障碍用户可关闭动画） */
  showPauseButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showPauseButton: true,
});

const emit = defineEmits<{
  (e: "done"): void;
  (e: "paused"): void;
  (e: "resumed"): void;
}>();

/** 动画是否暂停（a11y：前庭功能障碍用户可暂停粒子动画） */
const paused = ref(false);

// #ifdef H5
/**
 * P6 a11y：检测用户是否启用了「减少动态效果」系统设置
 * 仅在 H5 调用 window.matchMedia，mp-weixin 端无此 API
 * 命中时不渲染粒子扩散动画，立即触发 done 事件
 */
const prefersReducedMotion =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// #endif

/** 计时器句柄，1.5s 后触发 done 事件 */
let doneTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 清除计时器，避免内存泄漏与重复触发
 */
function clearDoneTimer() {
  if (doneTimer !== null) {
    clearTimeout(doneTimer);
    doneTimer = null;
  }
}

/**
 * 监听 visible 变化：显示时启动 1.5s 倒计时，隐藏时清理计时器
 * 暂停状态下不启动倒计时，恢复后才启动
 *
 * immediate: true 确保组件挂载时若 visible=true 也启动倒计时，
 * 避免初始可见场景下 done 事件永不触发。
 */
watch(
  () => props.visible,
  (visible) => {
    clearDoneTimer();
    if (visible && !paused.value) {
      // #ifdef H5
      // P6 a11y：reduced-motion 模式下跳过 1.5s 粒子扩散动画，立即触发 done
      if (prefersReducedMotion) {
        emit("done");
        return;
      }
      // #endif
      doneTimer = setTimeout(() => {
        emit("done");
      }, 1500);
    }
  },
  { immediate: true },
);

/**
 * 监听 paused 状态：暂停时清除倒计时，恢复时重新启动
 */
watch(paused, (isPaused) => {
  if (isPaused) {
    clearDoneTimer();
    emit("paused");
  } else if (props.visible) {
    clearDoneTimer();
    doneTimer = setTimeout(() => {
      emit("done");
    }, 1500);
    emit("resumed");
  }
});

onUnmounted(() => {
  clearDoneTimer();
});

/** 切换暂停/恢复状态 */
function togglePause() {
  paused.value = !paused.value;
}

/**
 * 计算单个粒子的扩散方向与延时
 * 12 个粒子均匀分布在 360°，距离 80~120rpx，垂直方向略微上抛
 */
function particleStyle(index: number) {
  const angle = (index / 12) * Math.PI * 2;
  const distance = 80 + ((index * 37) % 40); // 伪随机，避免 Math.random 在 SSR 不一致
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance - 40;
  return {
    "--tx": `${tx}rpx`,
    "--ty": `${ty}rpx`,
    "animation-delay": `${index * 30}ms`,
  };
}
</script>

<template>
  <view
    v-if="visible"
    class="heart-particles"
    :class="{ 'heart-particles--paused': paused }"
    aria-hidden="true"
  >
    <view
      v-for="i in 12"
      :key="i"
      class="heart-particle"
      :style="particleStyle(i)"
    >
      <image class="heart-icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.HEART" mode="aspectFit" alt="" />
    </view>
    <!-- P6 a11y：暂停按钮（前庭功能障碍用户可停止动画） -->
    <view
      v-if="showPauseButton"
      class="heart-particles__pause"
      hover-class="heart-particles__pause--pressed"
      :hover-stay-time="100"
      role="button"
      :aria-label="paused ? t('common.particlesResumeAria') : t('common.particlesPauseAria')"
      :aria-pressed="paused"
      @tap="togglePause"
    >
      <image class="heart-particles__pause-icon" :src="paused ? IMAGE_PATHS.ICONS_COMMON.PLAY_SVG : IMAGE_PATHS.ICONS_COMMON.PAUSE_SVG" mode="aspectFit" alt="" />
    </view>
  </view>
</template>

<style lang="scss">
.heart-particles {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 999;
}

.heart-particle {
  position: absolute;
  animation: heart-burst var(--d-particle, 1500ms) ease-out forwards;
}

/* P6 a11y：暂停状态时停止粒子动画 */
.heart-particles--paused .heart-particle {
  animation-play-state: paused;
}

.heart-icon {
  font-size: var(--fs-2xl, 32rpx);
  color: var(--c-romance-500, #EC4899);
}

@keyframes heart-burst {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(1.2);
    opacity: 0;
  }
}

/* ================================================================
   P6 a11y：暂停按钮样式
   - 可见但不遮挡内容：半透明白底 + 小尺寸 56rpx（约 28px，触控目标达标）
   - pointer-events: auto 仅在按钮上启用，粒子层保持 pointer-events: none
   - 位置：右上角，避免遮挡中心粒子扩散
   ================================================================ */
.heart-particles__pause {
  position: absolute;
  /* 固定布局尺寸（右上角定位偏移 -120rpx / 按钮 56rpx），无对应 token */
  top: -120rpx;
  right: -120rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-text-strong, rgba(255, 255, 255, 0.85));
  border: 1rpx solid var(--c-border-default, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  box-shadow: var(--s-sm, 0 2rpx 8rpx var(--c-neutral-shadow-md, rgba(15, 23, 42, 0.08)));
  z-index: 1000;
}

.heart-particles__pause--pressed {
  transform: scale(0.95);
  background: var(--c-overlay-white-bg-pure, rgba(255, 255, 255, 0.95));
}

.heart-particles__pause-icon {
  /* 固定布局尺寸（图标 22rpx），无对应 token */
  width: 22rpx;
  height: 22rpx;
}

/* P6 a11y：尊重 prefers-reduced-motion，粒子动画自动暂停 */
@media (prefers-reduced-motion: reduce) {
  .heart-particle {
    animation: none !important;
    transition: none !important;
    opacity: 0.5 !important;
  }
  .heart-particles__pause--pressed {
    transition: none !important;
  }
}
</style>
