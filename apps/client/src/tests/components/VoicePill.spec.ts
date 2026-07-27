import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// 依赖 setup.ts 中已注入的 globalThis.uni 桩（包含 createInnerAudioContext 等 API），
// 不再覆盖，避免 VoicePill.togglePlay 调用 uni.createInnerAudioContext 时报错。

import VoicePill from "../../components/chat/VoicePill.vue";

describe("VoicePill component - 语音消息气泡组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text）以便在 jsdom 中渲染
   */
  function mountPill(props?: {
    durationSeconds: number;
    audioUrl?: string;
    expired?: boolean;
  }) {
    return mount(VoicePill, {
      props: props ?? { durationSeconds: 5 },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础结构
  // ------------------------------------------------------------------
  it("渲染 voice-pill 容器", () => {
    const wrapper = mountPill({ durationSeconds: 5 });
    expect(wrapper.find(".voice-pill").exists()).toBe(true);
  });

  it("渲染 3 条波形 bar", () => {
    const wrapper = mountPill({ durationSeconds: 5 });
    expect(wrapper.findAll(".voice-pill__bar").length).toBe(3);
  });

  it("渲染时长文本（含秒符号）", () => {
    const wrapper = mountPill({ durationSeconds: 8 });
    expect(wrapper.find(".voice-pill__duration").text()).toContain("8");
    expect(wrapper.find(".voice-pill__duration").text()).toContain("″");
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("role=button 表示可点击", () => {
    const wrapper = mountPill({ durationSeconds: 5 });
    expect(wrapper.find(".voice-pill").attributes("role")).toBe("button");
  });

  it("aria-label 不为空", () => {
    const wrapper = mountPill({ durationSeconds: 5 });
    expect(wrapper.find(".voice-pill").attributes("aria-label")).toBeTruthy();
  });

  it("aria-pressed=false 初始状态", () => {
    const wrapper = mountPill({ durationSeconds: 5 });
    expect(wrapper.find(".voice-pill").attributes("aria-pressed")).toBe("false");
  });

  it("aria-disabled=true 当 expired=true", () => {
    const wrapper = mountPill({ durationSeconds: 5, expired: true });
    expect(wrapper.find(".voice-pill").attributes("aria-disabled")).toBe("true");
  });

  it("aria-disabled=false 或不存在 当 expired=false", () => {
    const wrapper = mountPill({ durationSeconds: 5, expired: false });
    // 当 expired=false 时 aria-disabled 应为 false 或不存在
    const aria = wrapper.find(".voice-pill").attributes("aria-disabled");
    expect(aria === "false" || aria === undefined).toBe(true);
  });

  // ------------------------------------------------------------------
  // expired 状态
  // ------------------------------------------------------------------
  it("expired=true 添加 voice-pill--expired class", () => {
    const wrapper = mountPill({ durationSeconds: 5, expired: true });
    expect(wrapper.find(".voice-pill").classes()).toContain("voice-pill--expired");
  });

  it("expired=false 不添加 voice-pill--expired class", () => {
    const wrapper = mountPill({ durationSeconds: 5, expired: false });
    expect(wrapper.find(".voice-pill").classes()).not.toContain("voice-pill--expired");
  });

  // ------------------------------------------------------------------
  // 播放交互
  // ------------------------------------------------------------------
  it("点击切换 playing 状态", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountPill({ durationSeconds: 5 });
      expect(wrapper.find(".voice-pill").classes()).not.toContain("voice-pill--playing");

      await wrapper.find(".voice-pill").trigger("tap");
      expect(wrapper.find(".voice-pill").classes()).toContain("voice-pill--playing");

      // 推进 5 秒后模拟播放结束，playing 状态自动清除
      vi.advanceTimersByTime(5000);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".voice-pill").classes()).not.toContain("voice-pill--playing");
    } finally {
      vi.useRealTimers();
    }
  });

  it("expired=true 时点击不切换 playing 状态", async () => {
    const wrapper = mountPill({ durationSeconds: 5, expired: true });
    await wrapper.find(".voice-pill").trigger("tap");
    expect(wrapper.find(".voice-pill").classes()).not.toContain("voice-pill--playing");
  });

  it("播放中波形 bar 添加 active class", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountPill({ durationSeconds: 5 });
      // 初始未播放
      for (const bar of wrapper.findAll(".voice-pill__bar")) {
        expect(bar.classes()).not.toContain("voice-pill__bar--active");
      }
      await wrapper.find(".voice-pill").trigger("tap");
      // 播放中应有 active class
      for (const bar of wrapper.findAll(".voice-pill__bar")) {
        expect(bar.classes()).toContain("voice-pill__bar--active");
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("bar 带递增的 animation-delay", () => {
    const wrapper = mountPill({ durationSeconds: 5 });
    const bars = wrapper.findAll(".voice-pill__bar");
    // 第 1 个 bar delay=0s, 第 2 个 delay=0.15s, 第 3 个 delay=0.3s
    expect(bars[0].attributes("style")).toContain("animation-delay: 0s");
    expect(bars[1].attributes("style")).toContain("animation-delay: 0.15s");
    expect(bars[2].attributes("style")).toContain("animation-delay: 0.3s");
  });
});
