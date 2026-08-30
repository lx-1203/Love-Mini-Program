import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// mock navigation
vi.mock("../../utils/navigation", () => ({
  openAppPath: vi.fn(),
}));

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import MatchCountChip from "../../components/common/MatchCountChip.vue";
import { openAppPath } from "../../utils/navigation";

describe("MatchCountChip component - 匹配次数 Chip 组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountChip(props?: {
    count: number;
    icon?: string;
  }) {
    return mount(MatchCountChip, {
      props: props ?? { count: 5 },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          image: { template: '<img class="mock-image" />', name: "uni-image" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础结构
  // ------------------------------------------------------------------
  it("渲染 chip 容器", () => {
    const wrapper = mountChip({ count: 5 });
    expect(wrapper.find(".match-count-chip").exists()).toBe(true);
  });

  it("role=button 表示可点击", () => {
    const wrapper = mountChip({ count: 5 });
    expect(wrapper.find(".match-count-chip").attributes("role")).toBe("button");
  });

  it("aria-label 不为空", () => {
    const wrapper = mountChip({ count: 5 });
    expect(wrapper.find(".match-count-chip").attributes("aria-label")).toBeTruthy();
  });

  it("aria-label 包含 count 数字", () => {
    const wrapper = mountChip({ count: 7 });
    const aria = wrapper.find(".match-count-chip").attributes("aria-label");
    expect(aria).toContain("7");
  });

  // ------------------------------------------------------------------
  // 渲染：count 数字
  // ------------------------------------------------------------------
  it("count=0 时仍渲染 chip", () => {
    const wrapper = mountChip({ count: 0 });
    expect(wrapper.find(".match-count-chip").exists()).toBe(true);
  });

  it("count=5 时 count-text 不为空", () => {
    const wrapper = mountChip({ count: 5 });
    expect(wrapper.find(".match-count-chip__count").text()).toBeTruthy();
  });

  it("count=10 时 count-text 包含 10", () => {
    const wrapper = mountChip({ count: 10 });
    expect(wrapper.find(".match-count-chip__count").text()).toContain("10");
  });

  // ------------------------------------------------------------------
  // 渲染：icon 资源
  // ------------------------------------------------------------------
  it("渲染 icon 元素", () => {
    const wrapper = mountChip({ count: 5 });
    expect(wrapper.find(".match-count-chip__icon").exists()).toBe(true);
  });

  it("自定义 icon prop 时使用自定义资源", () => {
    const wrapper = mountChip({ count: 5, icon: "/custom/icon.png" });
    expect(wrapper.find(".match-count-chip__icon").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击 chip emit tap 事件", async () => {
    const wrapper = mountChip({ count: 5 });
    await wrapper.find(".match-count-chip").trigger("tap");
    expect(wrapper.emitted("tap")).toBeTruthy();
    expect(wrapper.emitted("tap")!.length).toBe(1);
  });

  it("点击 chip 调用 openAppPath 跳转到 discover 页面", async () => {
    const wrapper = mountChip({ count: 5 });
    await wrapper.find(".match-count-chip").trigger("tap");
    expect(openAppPath).toHaveBeenCalledWith("/pages/discover/index");
  });

  it("连续点击多次 emit 多次 tap 事件", async () => {
    const wrapper = mountChip({ count: 5 });
    await wrapper.find(".match-count-chip").trigger("tap");
    await wrapper.find(".match-count-chip").trigger("tap");
    expect(wrapper.emitted("tap")!.length).toBe(2);
  });
});
