<script setup lang="ts">
import { computed } from "vue";
import type { UniTouchEvent } from "../../../compat";
import { useSwipeGesture } from "./SwipeGesture";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  { disabled: false }
);

const emit = defineEmits<{
  (e: "swipe-left"): void;
  (e: "swipe-right"): void;
  /* MP-R1-PAGES-DISCOVER-INDEX-005：对外点击事件由 "tap" 更名 "card-tap"——
     自定义事件与原生 tap 冒泡同名时，mp-weixin 端 bindtap（原生冒泡）与
     triggerEvent（手势层 emit）双通道都会命中同名监听，单次点击上游处理函数
     被重复执行；改用非同名事件后仅保留手势 emit 单通道。 */
  (e: "card-tap"): void;
}>();

const {
  isDragging,
  isFlyingOut,
  flyDirection,
  dragStyle,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  reset,
} = useSwipeGesture({
  onSwipeLeft: () => {
    if (!props.disabled) emit("swipe-left");
  },
  onSwipeRight: () => {
    if (!props.disabled) emit("swipe-right");
  },
  onTap: () => {
    if (!props.disabled) emit("card-tap");
  },
});

/* MP-R1-PAGES-DISCOVER-INDEX-005：catchtap 阻断原生 tap 冒泡穿越组件边界，
   原生通道彻底关闭（事件名已与原生 tap 脱钩，此为纵深防御）。 */
function onCatchTap() {
  /* 仅阻断冒泡，点击语义统一由手势层 touchend 判定后 emit("card-tap") 承载 */
}

function handleTouchStart(e: UniTouchEvent) {
  if (props.disabled) return;
  onTouchStart(e);
}

function handleTouchEnd() {
  if (props.disabled) return;
  onTouchEnd();
}

const rootClass = computed(() => ({
  "swipe-container--dragging": isDragging.value,
  "swipe-container--flying": isFlyingOut.value,
}));

// 修复（严格模式 noUnusedLocals）：onCatchTap 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ reset, flyDirection, onTouchMove, onCatchTap });
</script>

<template>
  <view
    class="swipe-container"
    :class="rootClass"
    :style="dragStyle"
    @touchstart="handleTouchStart"
    catchtouchmove="onTouchMove"
    @touchend="handleTouchEnd"
    catchtap="onCatchTap"
  >
    <slot />
  </view>
</template>

<style scoped lang="scss">
.swipe-container {
  position: relative;
  width: 100%;
  height: 100%;
  will-change: transform, opacity;
}
</style>