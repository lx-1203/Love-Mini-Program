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
 */
import { watch, onUnmounted } from "vue";

interface Props {
  /** 是否显示粒子动画 */
  visible: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "done"): void;
}>();

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
 */
watch(
  () => props.visible,
  (visible) => {
    clearDoneTimer();
    if (visible) {
      doneTimer = setTimeout(() => {
        emit("done");
      }, 1500);
    }
  },
);

onUnmounted(() => {
  clearDoneTimer();
});

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
  <view v-if="visible" class="heart-particles" aria-hidden="true">
    <view
      v-for="i in 12"
      :key="i"
      class="heart-particle"
      :style="particleStyle(i)"
    >
      <text class="heart-icon">❤</text>
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
  animation: heart-burst 1.5s ease-out forwards;
}

.heart-icon {
  font-size: 32rpx;
  color: #ec4899;
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
</style>
