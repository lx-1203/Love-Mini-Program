/**
 * Reduced-Motion 无障碍降级单元测试
 *
 * 验证 HeartParticles / LikeBurst 等动画组件在用户启用
 * 「减少动态效果」（prefers-reduced-motion: reduce）时：
 * - 不渲染动画粒子
 * - 不触发 1.5s 计时器
 * - 立即触发完成事件（如 done）以跳过动画展示
 *
 * 关联审计：REAUDIT-REPORT-100+ 第 3.4 节 编号 99、100、101
 */
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as Record<string, unknown>).uni = (globalThis as Record<string, unknown>).uni ?? {};

import HeartParticles from "../../components/common/HeartParticles.vue";
import LikeBurst from "../../components/social/LikeBurst.vue";
import { i18n } from "../../i18n";

/**
 * 在 window 上注入 matchMedia mock。
 * jsdom 默认不实现 matchMedia，需在测试中手动注入以触发组件内的 prefers-reduced-motion 分支。
 *
 * @param reduceEnabled true 表示用户启用了「减少动态效果」
 */
function mockMatchMedia(reduceEnabled: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduceEnabled && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/**
 * 还原 window.matchMedia：删除测试中注入的 mock，避免影响后续测试文件。
 */
function restoreMatchMedia(): void {
  // 删除自定义 mock，让后续测试以未定义状态进入
  // @ts-expect-error - 测试环境允许直接 delete window 属性
  delete (window as Record<string, unknown>).matchMedia;
}

describe("reduced-motion a11y 降级 - prefers-reduced-motion=true", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(true);
  });

  afterEach(() => {
    restoreMatchMedia();
  });

  // ----------------------------------------------------------------
  // HeartParticles
  // ----------------------------------------------------------------
  it("HeartParticles: visible=true 时立即 emit done，跳过 1.5s 计时器", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(HeartParticles, {
        props: { visible: true },
        global: {
          stubs: {
            view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
            text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
            image: { template: '<img class="mock-image" />', name: "uni-image" },
          },
        },
      });
      await flushPromises();

      // 不推进时间，应立即触发 done 事件
      expect(wrapper.emitted("done")).toBeTruthy();
      expect(wrapper.emitted("done")!.length).toBe(1);

      // 推进 2s 后 done 仍只触发一次（说明未走 setTimeout 路径）
      vi.advanceTimersByTime(2000);
      await flushPromises();
      expect(wrapper.emitted("done")!.length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("HeartParticles: reduced-motion 模式下 done 在 50ms 内触发（无 1.5s 等待）", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(HeartParticles, {
        props: { visible: true },
        global: {
          stubs: {
            view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
            text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
            image: { template: '<img class="mock-image" />', name: "uni-image" },
          },
        },
      });
      // 不需要 flushPromises 也能同步 emit，但保留以确保 watch 调度完成
      await flushPromises();
      const events = wrapper.emitted("done");
      expect(events).toBeTruthy();
      expect(events!.length).toBeGreaterThanOrEqual(1);
    } finally {
      vi.useRealTimers();
    }
  });

  // ----------------------------------------------------------------
  // LikeBurst
  // ----------------------------------------------------------------
  it("LikeBurst: play() 直接返回，playing 保持 false 不渲染粒子", async () => {
    const wrapper = mount(LikeBurst, {
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        },
      },
    });
    const exposed = (wrapper.findComponent(LikeBurst).vm as Record<string, unknown>).$
      .exposed as { play: () => Promise<void> } | undefined;
    expect(exposed).toBeTruthy();
    expect(exposed!.play).toBeTruthy();

    await exposed!.play();
    // reduced-motion 模式下 play 直接 return，playing 不会被置为 true
    expect(wrapper.find(".like-burst").exists()).toBe(false);
    expect(wrapper.findAll(".like-burst__particle").length).toBe(0);
  });

  it("LikeBurst: reduced-motion 模式下不渲染中心大红心", async () => {
    const wrapper = mount(LikeBurst, {
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        },
      },
    });
    const exposed = (wrapper.findComponent(LikeBurst).vm as Record<string, unknown>).$
      .exposed as { play: () => Promise<void> } | undefined;
    await exposed!.play();
    expect(wrapper.find(".like-burst__heart").exists()).toBe(false);
  });
});

describe("reduced-motion a11y 降级 - prefers-reduced-motion=false（对照组）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 关闭 reduced-motion，验证动画正常触发
    mockMatchMedia(false);
  });

  afterEach(() => {
    restoreMatchMedia();
  });

  it("HeartParticles: visible=true 后 1.5s emit done（保留原有动画行为）", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(HeartParticles, {
        props: { visible: true },
        global: {
          stubs: {
            view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
            text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
            image: { template: '<img class="mock-image" />', name: "uni-image" },
          },
        },
      });
      await flushPromises();
      // 未到 1.5s 不应触发 done
      expect(wrapper.emitted("done")).toBeFalsy();
      vi.advanceTimersByTime(1500);
      await flushPromises();
      expect(wrapper.emitted("done")).toBeTruthy();
      expect(wrapper.emitted("done")!.length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("LikeBurst: play() 后渲染 12 个粒子（保留原有动画行为）", async () => {
    const wrapper = mount(LikeBurst, {
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        },
      },
    });
    const exposed = (wrapper.findComponent(LikeBurst).vm as Record<string, unknown>).$
      .exposed as { play: () => Promise<void> } | undefined;
    await exposed!.play();
    expect(wrapper.find(".like-burst").exists()).toBe(true);
    expect(wrapper.findAll(".like-burst__particle").length).toBe(12);
  });
});
