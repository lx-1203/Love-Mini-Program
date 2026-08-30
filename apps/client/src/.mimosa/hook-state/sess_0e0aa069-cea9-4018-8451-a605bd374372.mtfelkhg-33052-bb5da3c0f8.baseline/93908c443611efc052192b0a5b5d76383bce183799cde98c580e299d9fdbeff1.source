import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import StatusState from "../../components/common/StatusState.vue";

describe("StatusState component - 状态徽章组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountPill(props?: {
    tone?: "brand" | "success" | "warning";
    label: string;
  }) {
    return mount(StatusState, {
      props: props ?? { label: "测试" },
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
  // 渲染：基础结构
  // ------------------------------------------------------------------
  it("渲染 pill 容器", () => {
    const wrapper = mountPill({ label: "已认证" });
    expect(wrapper.find(".pill").exists()).toBe(true);
  });

  it("label 必填，正确渲染", () => {
    const wrapper = mountPill({ label: "已通过审核" });
    expect(wrapper.find(".pill-label").text()).toBe("已通过审核");
  });

  it("role=img 表示图片语义", () => {
    const wrapper = mountPill({ label: "状态" });
    expect(wrapper.find(".pill").attributes("role")).toBe("img");
  });

  it("aria-label 包含 label 文案", () => {
    const wrapper = mountPill({ label: "审核中" });
    expect(wrapper.find(".pill").attributes("aria-label")).toBe("审核中");
  });

  // ------------------------------------------------------------------
  // 渲染：tone 切换
  // ------------------------------------------------------------------
  it("默认 tone=brand 添加 pill--brand class", () => {
    const wrapper = mountPill({ label: "默认" });
    expect(wrapper.find(".pill").classes()).toContain("pill--brand");
  });

  it("tone=brand 添加 pill--brand class", () => {
    const wrapper = mountPill({ tone: "brand", label: "T" });
    expect(wrapper.find(".pill").classes()).toContain("pill--brand");
  });

  it("tone=success 添加 pill--success class", () => {
    const wrapper = mountPill({ tone: "success", label: "T" });
    expect(wrapper.find(".pill").classes()).toContain("pill--success");
  });

  it("tone=warning 添加 pill--warning class", () => {
    const wrapper = mountPill({ tone: "warning", label: "T" });
    expect(wrapper.find(".pill").classes()).toContain("pill--warning");
  });

  // ------------------------------------------------------------------
  // 渲染：图标资源
  // ------------------------------------------------------------------
  it("tone=brand 渲染 CHECK 图标", () => {
    const wrapper = mountPill({ tone: "brand", label: "T" });
    expect(wrapper.find(".pill-icon").exists()).toBe(true);
    expect(wrapper.find(".pill-icon").attributes("src")).toBeTruthy();
  });

  it("tone=success 渲染 CHECK 图标", () => {
    const wrapper = mountPill({ tone: "success", label: "T" });
    expect(wrapper.find(".pill-icon").exists()).toBe(true);
  });

  it("tone=warning 渲染 CLOSE 图标", () => {
    const wrapper = mountPill({ tone: "warning", label: "T" });
    expect(wrapper.find(".pill-icon").exists()).toBe(true);
  });

  it("icon mode=aspectFit", () => {
    const wrapper = mountPill({ label: "T" });
    expect(wrapper.find(".pill-icon").attributes("mode")).toBe("aspectFit");
  });

  it("icon alt 为空字符串（装饰图标）", () => {
    const wrapper = mountPill({ label: "T" });
    expect(wrapper.find(".pill-icon").attributes("alt")).toBe("");
  });
});
