import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import UnlockGuideOverlay from "../../components/UnlockGuideOverlay.vue";

describe("UnlockGuideOverlay component - 首次引导蒙层组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountOverlay(props?: { visible?: boolean }) {
    return mount(UnlockGuideOverlay, {
      props: {
        visible: true,
        ...props,
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          button: { template: '<button class="mock-button"><slot /></button>', name: "uni-button" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("visible=true 时渲染 unlock-overlay 容器", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".unlock-overlay").exists()).toBe(true);
  });

  it("visible=false 时不渲染", () => {
    const wrapper = mountOverlay({ visible: false });
    expect(wrapper.find(".unlock-overlay").exists()).toBe(false);
  });

  it("渲染全屏蒙层", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".unlock-overlay__mask").exists()).toBe(true);
  });

  it("渲染引导提示卡片", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".unlock-overlay__hint").exists()).toBe(true);
  });

  it("渲染箭头指示", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".unlock-overlay__arrow").exists()).toBe(true);
    expect(wrapper.find(".unlock-overlay__arrow-icon").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 文案渲染
  // ------------------------------------------------------------------
  it("渲染标题文案", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".unlock-overlay__title").exists()).toBe(true);
    expect(wrapper.find(".unlock-overlay__title").text().length).toBeGreaterThan(0);
  });

  it("渲染描述文案", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".unlock-overlay__desc").exists()).toBe(true);
    expect(wrapper.find(".unlock-overlay__desc").text().length).toBeGreaterThan(0);
  });

  it("渲染按钮文案", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".unlock-overlay__btn").exists()).toBe(true);
    expect(wrapper.find(".unlock-overlay__btn-text").text().length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击我知道了按钮触发 known 事件", async () => {
    const wrapper = mountOverlay();
    await wrapper.find(".unlock-overlay__btn").trigger("tap");
    expect(wrapper.emitted("known")).toBeTruthy();
    expect(wrapper.emitted("known")!.length).toBe(1);
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("容器 role=dialog 与 aria-modal=true", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".unlock-overlay").attributes("role")).toBe("dialog");
    expect(wrapper.find(".unlock-overlay").attributes("aria-modal")).toBe("true");
  });

  it("按钮包含 aria-label", () => {
    const wrapper = mountOverlay();
    const btn = wrapper.find(".unlock-overlay__btn");
    expect(btn.attributes("aria-label")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // visible 监听
  // ------------------------------------------------------------------
  it("visible 由 false 变为 true 时打印调试日志", async () => {
    const consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const wrapper = mountOverlay({ visible: false });
    await wrapper.setProps({ visible: true });
    expect(consoleDebug).toHaveBeenCalled();
    consoleDebug.mockRestore();
  });

  it("visible 由 true 变为 false 时不打印调试日志", async () => {
    const consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => {});
    const wrapper = mountOverlay({ visible: true });
    await wrapper.setProps({ visible: false });
    expect(consoleDebug).not.toHaveBeenCalled();
    consoleDebug.mockRestore();
  });
});
