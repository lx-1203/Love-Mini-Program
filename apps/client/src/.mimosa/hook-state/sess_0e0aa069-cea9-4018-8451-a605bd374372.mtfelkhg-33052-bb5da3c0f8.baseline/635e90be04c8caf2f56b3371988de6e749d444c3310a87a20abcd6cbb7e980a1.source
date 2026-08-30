import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import ErrorState from "../../components/common/ErrorState.vue";

describe("ErrorState component - 错误状态组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountError(props?: { type?: "network" | "server" }) {
    return mount(ErrorState, {
      props: props ?? {},
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
  it("默认 type=network 渲染图标、文案与重试按钮", () => {
    const wrapper = mountError();
    expect(wrapper.find(".error").exists()).toBe(true);
    expect(wrapper.find(".error-icon").exists()).toBe(true);
    expect(wrapper.find(".error-msg").exists()).toBe(true);
    expect(wrapper.find(".error-sub").exists()).toBe(true);
    expect(wrapper.find(".error-btn").exists()).toBe(true);
  });

  it("role=alert 表示警示信息", () => {
    const wrapper = mountError();
    expect(wrapper.find(".error").attributes("role")).toBe("alert");
  });

  it("aria-live=assertive 表示重要动态信息", () => {
    const wrapper = mountError();
    expect(wrapper.find(".error").attributes("aria-live")).toBe("assertive");
  });

  // ------------------------------------------------------------------
  // 渲染：type 切换文案
  // ------------------------------------------------------------------
  it("type=network 时使用 network 文案", () => {
    const wrapper = mountError({ type: "network" });
    expect(wrapper.find(".error-msg").text()).toBeTruthy();
    expect(wrapper.find(".error-sub").text()).toBeTruthy();
  });

  it("type=server 时使用 server 文案", () => {
    const wrapper = mountError({ type: "server" });
    expect(wrapper.find(".error-msg").text()).toBeTruthy();
    expect(wrapper.find(".error-sub").text()).toBeTruthy();
  });

  it("type=network 与 type=server 文案不同", () => {
    const w1 = mountError({ type: "network" });
    const w2 = mountError({ type: "server" });
    expect(w1.find(".error-msg").text()).not.toBe(w2.find(".error-msg").text());
  });

  // ------------------------------------------------------------------
  // 重试按钮
  // ------------------------------------------------------------------
  it("点击重试按钮 emit retry 事件", async () => {
    const wrapper = mountError();
    await wrapper.find(".error-btn").trigger("tap");
    expect(wrapper.emitted("retry")).toBeTruthy();
    expect(wrapper.emitted("retry")!.length).toBe(1);
  });

  it("重试按钮 role=button", () => {
    const wrapper = mountError();
    expect(wrapper.find(".error-btn").attributes("role")).toBe("button");
  });

  it("重试按钮 aria-label 不为空", () => {
    const wrapper = mountError();
    expect(wrapper.find(".error-btn").attributes("aria-label")).toBeTruthy();
  });

  it("连续点击重试按钮多次触发多次 retry 事件", async () => {
    const wrapper = mountError();
    await wrapper.find(".error-btn").trigger("tap");
    await wrapper.find(".error-btn").trigger("tap");
    await wrapper.find(".error-btn").trigger("tap");
    expect(wrapper.emitted("retry")!.length).toBe(3);
  });
});
