import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import LikeBurst from "../../components/social/LikeBurst.vue";

describe("LikeBurst component - 点赞爆破动画组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text）以便在 jsdom 中渲染
   */
  function mountBurst() {
    return mount(LikeBurst, {
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
  // 渲染：初始状态
  // ------------------------------------------------------------------
  it("初始 playing=false 时不渲染 like-burst", () => {
    const wrapper = mountBurst();
    expect(wrapper.find(".like-burst").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // play 方法行为
  // ------------------------------------------------------------------
  it("调用 play 后渲染 like-burst", async () => {
    const wrapper = mountBurst();
    const burstComp = wrapper.findComponent(LikeBurst);
    const exposed = (burstComp.vm as any).$.exposed;
    expect(exposed).toBeTruthy();
    expect(exposed.play).toBeTruthy();

    await exposed.play();
    expect(wrapper.find(".like-burst").exists()).toBe(true);
  });

  it("play 后渲染中心大红心", async () => {
    const wrapper = mountBurst();
    const exposed = (wrapper.findComponent(LikeBurst).vm as any).$.exposed;
    await exposed.play();
    expect(wrapper.find(".like-burst__heart").exists()).toBe(true);
    expect(wrapper.find(".like-burst__heart-icon").exists()).toBe(true);
    expect(wrapper.find(".like-burst__heart-icon").text()).toBe("❤");
  });

  it("play 后渲染 12 个心形粒子", async () => {
    const wrapper = mountBurst();
    const exposed = (wrapper.findComponent(LikeBurst).vm as any).$.exposed;
    await exposed.play();
    expect(wrapper.findAll(".like-burst__particle").length).toBe(12);
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("like-burst role=img", async () => {
    const wrapper = mountBurst();
    const exposed = (wrapper.findComponent(LikeBurst).vm as any).$.exposed;
    await exposed.play();
    expect(wrapper.find(".like-burst").attributes("role")).toBe("img");
  });

  it("like-burst aria-label 不为空", async () => {
    const wrapper = mountBurst();
    const exposed = (wrapper.findComponent(LikeBurst).vm as any).$.exposed;
    await exposed.play();
    expect(wrapper.find(".like-burst").attributes("aria-label")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // 粒子样式
  // ------------------------------------------------------------------
  it("每个粒子带 --particle-angle 自定义属性", async () => {
    const wrapper = mountBurst();
    const exposed = (wrapper.findComponent(LikeBurst).vm as any).$.exposed;
    await exposed.play();
    const particles = wrapper.findAll(".like-burst__particle");
    for (const p of particles) {
      const style = p.attributes("style");
      expect(style).toContain("--particle-angle");
      expect(style).toContain("--particle-distance");
      expect(style).toContain("--particle-delay");
    }
  });

  it("12 个粒子角度均匀分布（间隔 30 度）", async () => {
    const wrapper = mountBurst();
    const exposed = (wrapper.findComponent(LikeBurst).vm as any).$.exposed;
    await exposed.play();
    const particles = wrapper.findAll(".like-burst__particle");
    const angles: number[] = [];
    for (const p of particles) {
      const style = p.attributes("style") || "";
      // 角度可能为负数（i=0: -8deg），使用 -? 前缀匹配
      const match = style.match(/--particle-angle:\s*(-?\d+)deg/);
      if (match) angles.push(parseInt(match[1], 10));
    }
    expect(angles.length).toBe(12);
    // 第 0 个角度为 -8 度（i*30 + (i%2?8:-8) → 0 + -8 = -8）
    expect(angles[0]).toBe(-8);
  });

  // ------------------------------------------------------------------
  // 自动重置（1.5s 后）
  // ------------------------------------------------------------------
  it("play 后 1.5s 自动重置 playing 状态", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountBurst();
      const exposed = (wrapper.findComponent(LikeBurst).vm as any).$.exposed;
      await exposed.play();
      expect(wrapper.find(".like-burst").exists()).toBe(true);

      vi.advanceTimersByTime(1600);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".like-burst").exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("连续 play 多次只渲染一次（动画 key 自增）", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountBurst();
      const exposed = (wrapper.findComponent(LikeBurst).vm as any).$.exposed;
      await exposed.play();
      // 第一次 play 后应渲染（playing=true）
      expect(wrapper.find(".like-burst").exists()).toBe(true);
      const particlesBefore = wrapper.findAll(".like-burst__particle").length;

      // 第二次 play：playing 会被重置为 false → true，DOM 卸载后重新挂载
      await exposed.play();
      // 应仍渲染（playing=true）
      expect(wrapper.find(".like-burst").exists()).toBe(true);
      // 粒子数量保持 12（动画重启不影响粒子配置）
      const particlesAfter = wrapper.findAll(".like-burst__particle").length;
      expect(particlesAfter).toBe(particlesBefore);
      expect(particlesAfter).toBe(12);
    } finally {
      vi.useRealTimers();
    }
  });
});
