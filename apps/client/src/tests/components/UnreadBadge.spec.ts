import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import UnreadBadge from "../../components/common/UnreadBadge.vue";

describe("UnreadBadge component - 未读徽章组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text）以便在 jsdom 中渲染
   */
  function mountBadge(props?: { count?: number; dot?: boolean }) {
    return mount(UnreadBadge, {
      props: props ?? {},
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
  // 渲染：show 状态（v-if）
  // ------------------------------------------------------------------
  it("count=0 且 dot=false 时不渲染", () => {
    const wrapper = mountBadge({ count: 0 });
    expect(wrapper.find(".badge").exists()).toBe(false);
  });

  it("count>0 时渲染", () => {
    const wrapper = mountBadge({ count: 5 });
    expect(wrapper.find(".badge").exists()).toBe(true);
  });

  it("dot=true 时即使 count=0 也渲染", () => {
    const wrapper = mountBadge({ count: 0, dot: true });
    expect(wrapper.find(".badge").exists()).toBe(true);
  });

  it("dot=true 且 count>0 同时渲染时显示为 dot 样式", () => {
    const wrapper = mountBadge({ count: 5, dot: true });
    expect(wrapper.find(".badge").classes()).toContain("badge--dot");
  });

  // ------------------------------------------------------------------
  // 渲染：count 数字格式
  // ------------------------------------------------------------------
  it("count<100 时显示具体数字", () => {
    const wrapper = mountBadge({ count: 42 });
    expect(wrapper.find(".badge-text").text()).toBe("42");
  });

  it("count=1 时显示 1", () => {
    const wrapper = mountBadge({ count: 1 });
    expect(wrapper.find(".badge-text").text()).toBe("1");
  });

  it("count=99 时显示 99", () => {
    const wrapper = mountBadge({ count: 99 });
    expect(wrapper.find(".badge-text").text()).toBe("99");
  });

  it("count>99 时显示 99+", () => {
    const wrapper = mountBadge({ count: 100 });
    expect(wrapper.find(".badge-text").text()).toBe("99+");
  });

  it("count=9999 时显示 99+", () => {
    const wrapper = mountBadge({ count: 9999 });
    expect(wrapper.find(".badge-text").text()).toBe("99+");
  });

  // ------------------------------------------------------------------
  // 渲染：dot 模式不显示数字
  // ------------------------------------------------------------------
  it("dot=true 时不渲染 badge-text", () => {
    const wrapper = mountBadge({ count: 5, dot: true });
    expect(wrapper.find(".badge-text").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("count 模式 aria-label 包含数字", () => {
    const wrapper = mountBadge({ count: 7 });
    const aria = wrapper.find(".badge").attributes("aria-label");
    expect(aria).toContain("7");
  });

  it("dot 模式 aria-label 不为空", () => {
    const wrapper = mountBadge({ dot: true });
    const aria = wrapper.find(".badge").attributes("aria-label");
    expect(aria).toBeTruthy();
    expect(typeof aria).toBe("string");
  });

  it("role=status 表示状态信息", () => {
    const wrapper = mountBadge({ count: 5 });
    expect(wrapper.find(".badge").attributes("role")).toBe("status");
  });
});
