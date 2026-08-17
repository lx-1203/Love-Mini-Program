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
  (e: "tap"): void;
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
    if (!props.disabled) emit("tap");
  },
});

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

defineExpose({ reset, flyDirection, onTouchMove });
</script>

<template>
  <view
    class="swipe-container"
    :class="rootClass"
    :style="dragStyle"
    @touchstart="handleTouchStart"
    catchtouchmove="onTouchMove"
    @touchend="handleTouchEnd"
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