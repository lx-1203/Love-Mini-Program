import { computed, onUnmounted, ref } from "vue";
import type { UniTouchEvent } from "../../../compat";
import {
  SWIPE_THRESHOLD,
  SWIPE_ROTATION_MAX,
  SWIPE_ROTATION_DIVISOR,
  TAP_MOVE_THRESHOLD,
  CARD_FLY_OUT_DURATION_MS,
  CARD_FLY_OUT_DISTANCE_PX,
  CARD_FLY_OUT_ROTATION_DEGREE,
} from "../../../constants/match";

export type SwipeGestureDirection = "left" | "right";
export type SwipeEndAction =
  | "tap"
  | "swipe-left"
  | "swipe-right"
  | "cancel";

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
}

/** 当前拖动位移对应的旋转角。CardSwiper 与 MatchCard 共用，避免两套手势参数漂移。 */
export function computeSwipeRotate(deltaX: number): number {
  const ratio = Math.min(Math.abs(deltaX) / SWIPE_ROTATION_DIVISOR, 1);
  return (deltaX > 0 ? 1 : -1) * ratio * SWIPE_ROTATION_MAX;
}

/** 根据松手时的位移与总移动距离判定点击/左滑/右滑/回弹。 */
export function resolveSwipeEnd(
  deltaX: number,
  totalMove: number
): SwipeEndAction {
  if (totalMove < TAP_MOVE_THRESHOLD) return "tap";
  if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
    return deltaX > 0 ? "swipe-right" : "swipe-left";
  }
  return "cancel";
}

export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const isDragging = ref(false);
  const isFlyingOut = ref(false);
  const flyDirection = ref<SwipeGestureDirection | null>(null);
  const translateX = ref(0);
  const rotate = ref(0);
  const opacity = ref(1);

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  function clearTimers() {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  }

  function registerTimer(fn: () => void, delay: number) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, delay);
    timers.add(timer);
    return timer;
  }

  function onTouchStart(e: UniTouchEvent) {
    if (isFlyingOut.value) return;
    const touch = e.touches[0];
    if (!touch) return;
    isDragging.value = true;
    startX = touch.clientX;
    startY = touch.clientY;
    currentX = startX;
    currentY = startY;
  }

  function onTouchMove(e: UniTouchEvent) {
    if (typeof (e as unknown as { preventDefault?: () => void }).preventDefault === "function") {
      (e as unknown as { preventDefault: () => void }).preventDefault();
    }
    if (!isDragging.value || isFlyingOut.value) return;
    const touch = e.touches[0];
    if (!touch) return;
    currentX = touch.clientX;
    currentY = touch.clientY;
    const deltaX = currentX - startX;
    translateX.value = deltaX;
    rotate.value = computeSwipeRotate(deltaX);
  }

  function resetPosition() {
    translateX.value = 0;
    rotate.value = 0;
    opacity.value = 1;
  }

  function onTouchEnd() {
    if (!isDragging.value || isFlyingOut.value) return;
    isDragging.value = false;
    const deltaX = currentX - startX;
    const totalMove = Math.abs(deltaX) + Math.abs(currentY - startY);
    const action = resolveSwipeEnd(deltaX, totalMove);

    if (action === "tap") {
      resetPosition();
      options.onTap?.();
      return;
    }

    if (action === "swipe-left" || action === "swipe-right") {
      performFlyOut(action === "swipe-right" ? "right" : "left");
      return;
    }

    resetPosition();
  }

  function performFlyOut(direction: SwipeGestureDirection) {
    isFlyingOut.value = true;
    flyDirection.value = direction;
    translateX.value =
      (direction === "right" ? 1 : -1) * CARD_FLY_OUT_DISTANCE_PX;
    rotate.value =
      (direction === "right" ? 1 : -1) * CARD_FLY_OUT_ROTATION_DEGREE;
    opacity.value = 0;

    registerTimer(() => {
      if (direction === "left") {
        options.onSwipeLeft?.();
      } else {
        options.onSwipeRight?.();
      }
      isFlyingOut.value = false;
      flyDirection.value = null;
      resetPosition();
    }, CARD_FLY_OUT_DURATION_MS);
  }

  function reset() {
    clearTimers();
    isDragging.value = false;
    isFlyingOut.value = false;
    flyDirection.value = null;
    resetPosition();
  }

  onUnmounted(clearTimers);

  const dragStyle = computed(() => ({
    transform: `translateX(${translateX.value}px) rotate(${rotate.value}deg)`,
    opacity: opacity.value,
    transition: isDragging.value
      ? "none"
      : "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 260ms ease-out",
  }));

  return {
    isDragging,
    isFlyingOut,
    flyDirection,
    dragStyle,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    reset,
  };
}