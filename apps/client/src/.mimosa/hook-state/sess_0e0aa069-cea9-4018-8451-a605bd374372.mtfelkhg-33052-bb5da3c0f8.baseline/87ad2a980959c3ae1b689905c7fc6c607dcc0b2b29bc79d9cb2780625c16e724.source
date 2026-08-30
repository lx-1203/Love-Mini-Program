import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import HeartParticles from "../../components/common/HeartParticles.vue";

describe("HeartParticles component - 心形粒子动画组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountParticles(props?: {
    visible: boolean;
    showPauseButton?: boolean;
  }) {
    return mount(HeartParticles, {
      props: props ?? { visible: true },
      global: {
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          image: { template: '<img class="mock-image" />', name: "uni-image" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：visible 控制
  // ------------------------------------------------------------------
  it("visible=true 时渲染粒子容器", () => {
    const wrapper = mountParticles({ visible: true });
    expect(wrapper.find(".heart-particles").exists()).toBe(true);
  });

  it("visible=false 时不渲染粒子容器", () => {
    const wrapper = mountParticles({ visible: false });
    expect(wrapper.find(".heart-particles").exists()).toBe(false);
  });

  it("渲染 12 个粒子（固定数量）", () => {
    const wrapper = mountParticles({ visible: true });
    expect(wrapper.findAll(".heart-particle").length).toBe(12);
  });

  it("aria-hidden=true 表示装饰性元素", () => {
    const wrapper = mountParticles({ visible: true });
    expect(wrapper.find(".heart-particles").attributes("aria-hidden")).toBe("true");
  });

  // ------------------------------------------------------------------
  // 渲染：粒子样式
  // ------------------------------------------------------------------
  it("每个粒子带 animation-delay 样式", () => {
    const wrapper = mountParticles({ visible: true });
    const particles = wrapper.findAll(".heart-particle");
    for (let i = 0; i < particles.length; i++) {
      const style = particles[i].attributes("style");
      // 第一个粒子 index=1，所以 delay=30ms
      expect(style).toContain("animation-delay");
    }
  });

  it("粒子带 --tx/--ty 自定义属性", () => {
    const wrapper = mountParticles({ visible: true });
    const particle = wrapper.findAll(".heart-particle")[0];
    const style = particle.attributes("style");
    expect(style).toContain("--tx");
    expect(style).toContain("--ty");
  });

  // ------------------------------------------------------------------
  // 暂停按钮
  // ------------------------------------------------------------------
  it("showPauseButton=true 时渲染暂停按钮", () => {
    const wrapper = mountParticles({ visible: true, showPauseButton: true });
    expect(wrapper.find(".heart-particles__pause").exists()).toBe(true);
  });

  it("showPauseButton=false 时不渲染暂停按钮", () => {
    const wrapper = mountParticles({ visible: true, showPauseButton: false });
    expect(wrapper.find(".heart-particles__pause").exists()).toBe(false);
  });

  it("默认渲染暂停按钮（showPauseButton 默认 true）", () => {
    const wrapper = mountParticles({ visible: true });
    expect(wrapper.find(".heart-particles__pause").exists()).toBe(true);
  });

  it("点击暂停按钮切换 paused 状态（class 变化）", async () => {
    const wrapper = mountParticles({ visible: true });
    expect(wrapper.find(".heart-particles").classes()).not.toContain("heart-particles--paused");
    await wrapper.find(".heart-particles__pause").trigger("tap");
    expect(wrapper.find(".heart-particles").classes()).toContain("heart-particles--paused");
    // 再次点击恢复
    await wrapper.find(".heart-particles__pause").trigger("tap");
    expect(wrapper.find(".heart-particles").classes()).not.toContain("heart-particles--paused");
  });

  it("暂停按钮 role=button", () => {
    const wrapper = mountParticles({ visible: true });
    expect(wrapper.find(".heart-particles__pause").attributes("role")).toBe("button");
  });

  it("暂停按钮 aria-label 不为空", () => {
    const wrapper = mountParticles({ visible: true });
    expect(wrapper.find(".heart-particles__pause").attributes("aria-label")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // done 事件
  // ------------------------------------------------------------------
  it("visible=true 后 1.5s 自动 emit done 事件", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountParticles({ visible: true });
      // 等待 watch 回调调度完成（Vue 3 watch 默认 pre-flush，需 nextTick 触发）
      await flushPromises();
      expect(wrapper.emitted("done")).toBeFalsy();
      vi.advanceTimersByTime(1500);
      expect(wrapper.emitted("done")).toBeTruthy();
      expect(wrapper.emitted("done")!.length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("暂停状态下不 emit done 事件", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountParticles({ visible: true });
      // 等待 watch 回调调度完成
      await flushPromises();
      // 点击暂停
      await wrapper.find(".heart-particles__pause").trigger("tap");
      await flushPromises();
      // 推进时间，不应触发 done
      vi.advanceTimersByTime(2000);
      expect(wrapper.emitted("done")).toBeFalsy();
      // 应触发 paused 事件
      expect(wrapper.emitted("paused")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("恢复动画后 emit resumed 事件", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountParticles({ visible: true });
      // 暂停
      await wrapper.find(".heart-particles__pause").trigger("tap");
      expect(wrapper.emitted("paused")).toBeTruthy();
      // 恢复
      await wrapper.find(".heart-particles__pause").trigger("tap");
      expect(wrapper.emitted("resumed")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
