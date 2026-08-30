import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeSwipeRotate,
  resolveSwipeEnd,
  useSwipeGesture,
} from "../../components/common/swipe/SwipeGesture";

afterEach(() => {
  vi.useRealTimers();
});

describe("SwipeGesture 纯函数", () => {
  it("右滑返回正角度，左滑返回负角度，位移越大角度越接近上限", () => {
    expect(computeSwipeRotate(150)).toBeGreaterThan(0);
    expect(computeSwipeRotate(-150)).toBeLessThan(0);
    expect(Math.abs(computeSwipeRotate(9999))).toBeLessThanOrEqual(15);
  });

  it("总移动小于阈值判定为 tap", () => {
    expect(resolveSwipeEnd(2, 3)).toBe("tap");
  });

  it("超过水平阈值判定 swipe-left/right", () => {
    expect(resolveSwipeEnd(130, 131)).toBe("swipe-right");
    expect(resolveSwipeEnd(-130, 131)).toBe("swipe-left");
  });

  it("未超过阈值判定 cancel", () => {
    expect(resolveSwipeEnd(50, 60)).toBe("cancel");
  });
});

describe("SwipeGesture 组合式手势", () => {
  it("左滑后触发 onSwipeLeft", async () => {
    vi.useFakeTimers();
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const onTap = vi.fn();
    const gesture = useSwipeGesture({ onSwipeLeft, onSwipeRight, onTap });

    gesture.onTouchStart({
      touches: [{ clientX: 0, clientY: 0 }],
    } as any);
    gesture.onTouchMove({
      touches: [{ clientX: -150, clientY: 0 }],
      preventDefault: () => {},
    } as any);
    gesture.onTouchEnd();
    vi.runAllTimers();

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });

  it("位移很小时触发 onTap", () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const gesture = useSwipeGesture({ onTap });
    gesture.onTouchStart({ touches: [{ clientX: 0, clientY: 0 }] } as any);
    gesture.onTouchMove({ touches: [{ clientX: 2, clientY: 1 }], preventDefault: () => {} } as any);
    gesture.onTouchEnd();
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});