<script setup lang="ts">
/**
 * Ripple 涟漪效果组件（mp-weixin 兼容版）
 * 在用户点击/触摸时产生圆形扩散波纹，增强交互反馈
 *
 * 实现说明（Phase G 修复 G2.3 + G2.4）：
 * - 使用 CSS transition（200ms cubic-bezier(0,0,0.2,1)）切换 transform: scale(0) → scale(2.4)
 * - 通过 :style 切换 transform 触发 transition（替代原 CSS animation forwards 方案）
 * - start(clientX, clientY) 接收页面坐标，使用 uni.createSelectorQuery 异步查询容器位置后计算容器相对坐标
 * - 若获取容器位置失败或未传坐标，退化为容器中心扩散（保持向后兼容）
 * - mp-weixin 兼容：不使用 :hover / backdrop-filter / import.meta.env.DEV / 裸 catch 语法
 *
 * 用法：
 *   <Ripple color="rgba(91,127,255,0.2)" :duration="200" />
 *   主动触发（推荐，可携带点击坐标）：rippleRef.value?.start(clientX, clientY)
 */
import { ref, onBeforeUnmount, getCurrentInstance } from 'vue';

const props = withDefaults(defineProps<{
  color?: string;
  duration?: number;
  disabled?: boolean;
}>(), {
  color: 'rgba(91, 127, 255, 0.15)',
  duration: 200,
  disabled: false,
});

/** 波纹唯一 key，递增以强制重渲染触发 transition */
const rippleKey = ref(0);
/** 波纹激活态：true 时 transform: scale(2.4)，false 时 scale(0) */
const rippleActive = ref(false);
/** 波纹位置（容器相对坐标，CSS left/top 值，默认 50% 即容器中心） */
const rippleX = ref('50%');
const rippleY = ref('50%');

let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
let activationTimer: ReturnType<typeof setTimeout> | null = null;

const instance = getCurrentInstance();

/**
 * 异步查询容器 boundingClientRect
 * 失败时返回 null（调用方需退化为中心扩散）
 */
function queryContainerRect(): Promise<{ left: number; top: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    try {
      // #ifdef H5 || MP-WEIXIN || APP-PLUS
      if (typeof uni === 'undefined' || typeof uni.createSelectorQuery !== 'function') {
        resolve(null);
        return;
      }
      const query = (instance && instance.proxy)
        ? uni.createSelectorQuery().in(instance.proxy as any)
        : uni.createSelectorQuery();
      query
        .select('.ripple-container')
        .boundingClientRect((rect: any) => {
          if (rect && typeof rect.left === 'number' && typeof rect.top === 'number') {
            resolve(rect as { left: number; top: number; width: number; height: number });
          } else {
            resolve(null);
          }
        })
        .exec();
      // #endif
      // #ifndef H5 || MP-WEIXIN || APP-PLUS
      // 非uni环境（如单元测试）：返回 null，调用方退化为容器中心
      resolve(null);
      // #endif
    } catch (_e) {
      resolve(null);
    }
  });
}

/**
 * 触发涟漪效果（同步入口，避免 async/await 在 fake timer 环境下阻塞定时器注册）
 * @param clientX 可选，页面坐标 X（mp-weixin e.detail.x 或 H5 e.changedTouches[0].clientX）
 * @param clientY 可选，页面坐标 Y
 *
 * 实现说明：
 * - 同步重置 rippleActive/rippleKey 并清理旧 timer，确保新的 cleanupTimer 立即注册
 *   （避免第二次点击时旧 cleanupTimer 在 await 期间被触发导致 rippleKey 重置为 0）
 * - 异步查询容器位置放在 activationTimer 回调中执行，不阻塞 start 主流程
 * - 容器位置查询失败时退化为容器中心（rippleX/Y 已被同步设为 '50%'）
 */
function start(clientX?: number, clientY?: number) {
  if (props.disabled) return;

  // 同步重置激活态、默认位置、递增 key 强制重渲染节点
  rippleActive.value = false;
  rippleX.value = '50%';
  rippleY.value = '50%';
  rippleKey.value += 1;

  // 同步清理已有定时器（关键：避免旧 cleanupTimer 在 await 期间被触发）
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
  if (activationTimer) {
    clearTimeout(activationTimer);
    activationTimer = null;
  }

  // 16ms 后激活涟漪：在回调内异步查询容器位置并更新 rippleX/Y
  // setTimeout(16) 同时确保 mp-weixin setData 完成初始渲染后再切换 transform 触发 transition
  activationTimer = setTimeout(() => {
    activationTimer = null;
    const hasCoord = typeof clientX === 'number' && typeof clientY === 'number'
      && !Number.isNaN(clientX) && !Number.isNaN(clientY);
    if (!hasCoord) {
      rippleActive.value = true;
      return;
    }
    // 异步查询容器位置后更新坐标并激活
    queryContainerRect().then((rect) => {
      if (rect) {
        rippleX.value = `${(clientX as number) - rect.left}px`;
        rippleY.value = `${(clientY as number) - rect.top}px`;
      }
      rippleActive.value = true;
    });
  }, 16);

  // duration 后清理（默认 200ms 内完成扩散）
  cleanupTimer = setTimeout(() => {
    rippleKey.value = 0;
    rippleActive.value = false;
    cleanupTimer = null;
  }, props.duration);
}

/**
 * 容器 @tap 监听：从事件中提取坐标后调用 start
 * 用于 Card.vue 等不主动调用 start 的场景，保持向后兼容
 */
function onContainerTap(e: any) {
  if (props.disabled) return;
  let px: number | undefined;
  let py: number | undefined;
  if (e && e.detail && typeof e.detail.x === 'number' && typeof e.detail.y === 'number') {
    px = e.detail.x;
    py = e.detail.y;
  } else if (e && e.changedTouches && e.changedTouches[0]) {
    px = e.changedTouches[0].clientX;
    py = e.changedTouches[0].clientY;
  }
  start(px, py);
}

defineExpose({ start });

onBeforeUnmount(() => {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
  if (activationTimer) {
    clearTimeout(activationTimer);
    activationTimer = null;
  }
});
</script>

<template>
  <view class="ripple-container" @tap="onContainerTap">
    <slot />
    <view
      v-if="rippleKey > 0"
      :key="rippleKey"
      class="ripple"
      :style="{
        backgroundColor: color,
        left: rippleX,
        top: rippleY,
        transform: rippleActive ? 'translate(-50%, -50%) scale(2.4)' : 'translate(-50%, -50%) scale(0)',
        opacity: rippleActive ? 0 : 1,
        transition: rippleActive
          ? `transform ${duration}ms cubic-bezier(0, 0, 0.2, 1), opacity ${duration}ms cubic-bezier(0, 0, 0.2, 1)`
          : 'none',
      }"
    />
  </view>
</template>

<style scoped>
.ripple-container {
  position: relative;
  overflow: hidden;
}
.ripple {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  pointer-events: none;
  /* 初始 opacity 由 :style 控制，此处仅作为兜底 */
  opacity: 1;
}
</style>
