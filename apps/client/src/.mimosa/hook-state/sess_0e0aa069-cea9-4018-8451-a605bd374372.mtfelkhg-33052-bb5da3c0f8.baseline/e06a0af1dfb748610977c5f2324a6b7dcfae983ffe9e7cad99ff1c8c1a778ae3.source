import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import Ripple from "../../components/common/Ripple.vue";

describe("Ripple component - 涟漪效果组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view）以便在 jsdom 中渲染
   */
  function mountRipple(props?: {
    color?: string;
    duration?: number;
    disabled?: boolean;
  }) {
    return mount(Ripple, {
      props: props ?? {},
      slots: { default: '<div class="content">点击我</div>' },
      global: {
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础结构
  // ------------------------------------------------------------------
  it("渲染 ripple-container 容器与默认 slot", () => {
    const wrapper = mountRipple();
    expect(wrapper.find(".ripple-container").exists()).toBe(true);
    expect(wrapper.find(".content").exists()).toBe(true);
  });

  it("初始 rippleKey=0 时 not 渲染 .ripple 元素", () => {
    const wrapper = mountRipple();
    expect(wrapper.find(".ripple").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // start 方法行为
  // ------------------------------------------------------------------
  it("调用 start 后渲染 .ripple 元素", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountRipple();
      const rippleComp = wrapper.findComponent(Ripple);
      // 调用暴露的 start 方法
      const exposed = (rippleComp.vm as any).$.exposed;
      expect(exposed).toBeTruthy();
      expect(exposed.start).toBeTruthy();

      exposed.start();
      // 触发 16ms 激活定时器
      vi.advanceTimersByTime(20);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".ripple").exists()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("disabled=true 时 start 不触发 ripple", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountRipple({ disabled: true });
      const rippleComp = wrapper.findComponent(Ripple);
      const exposed = (rippleComp.vm as any).$.exposed;
      exposed.start();
      vi.advanceTimersByTime(20);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".ripple").exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("duration 后 ripple 元素自动清除", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountRipple({ duration: 200 });
      const rippleComp = wrapper.findComponent(Ripple);
      const exposed = (rippleComp.vm as any).$.exposed;
      exposed.start();

      // 激活后应渲染
      vi.advanceTimersByTime(20);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".ripple").exists()).toBe(true);

      // 200ms 后应清除
      vi.advanceTimersByTime(220);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".ripple").exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  // ------------------------------------------------------------------
  // 容器 tap 监听
  // ------------------------------------------------------------------
  it("容器 @tap 触发 onContainerTap 并渲染 ripple", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountRipple();
      await wrapper.find(".ripple-container").trigger("tap", { detail: { x: 100, y: 100 } });
      vi.advanceTimersByTime(20);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".ripple").exists()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("disabled=true 时容器 @tap 不触发 ripple", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountRipple({ disabled: true });
      await wrapper.find(".ripple-container").trigger("tap");
      vi.advanceTimersByTime(20);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".ripple").exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  // ------------------------------------------------------------------
  // 无坐标参数时退化为容器中心
  // ------------------------------------------------------------------
  it("start() 无坐标参数时退化为容器中心（50%）", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountRipple();
      const rippleComp = wrapper.findComponent(Ripple);
      const exposed = (rippleComp.vm as any).$.exposed;
      exposed.start();
      vi.advanceTimersByTime(20);
      await wrapper.vm.$nextTick();

      const ripple = wrapper.find(".ripple");
      expect(ripple.exists()).toBe(true);
      // 默认坐标为 50%
      expect(ripple.attributes("style")).toContain("left: 50%");
      expect(ripple.attributes("style")).toContain("top: 50%");
    } finally {
      vi.useRealTimers();
    }
  });

  // ------------------------------------------------------------------
  // 默认 props
  // ------------------------------------------------------------------
  it("默认 color 为 rgba(91, 127, 255, 0.15)", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountRipple();
      const rippleComp = wrapper.findComponent(Ripple);
      const exposed = (rippleComp.vm as any).$.exposed;
      exposed.start();
      vi.advanceTimersByTime(20);
      await wrapper.vm.$nextTick();

      const ripple = wrapper.find(".ripple");
      expect(ripple.attributes("style")).toContain("rgba(91, 127, 255, 0.15)");
    } finally {
      vi.useRealTimers();
    }
  });

  it("自定义 color 正确应用", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountRipple({ color: "rgba(255, 0, 0, 0.3)" });
      const rippleComp = wrapper.findComponent(Ripple);
      const exposed = (rippleComp.vm as any).$.exposed;
      exposed.start();
      vi.advanceTimersByTime(20);
      await wrapper.vm.$nextTick();

      const ripple = wrapper.find(".ripple");
      expect(ripple.attributes("style")).toContain("rgba(255, 0, 0, 0.3)");
    } finally {
      vi.useRealTimers();
    }
  });
});
