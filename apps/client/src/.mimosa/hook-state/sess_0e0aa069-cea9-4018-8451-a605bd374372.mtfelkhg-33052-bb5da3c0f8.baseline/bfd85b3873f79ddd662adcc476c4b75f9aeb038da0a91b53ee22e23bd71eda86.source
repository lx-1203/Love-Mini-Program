import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import PhoneBtn from "../../components/login/PhoneBtn.vue";

describe("PhoneBtn component - 手机号登录按钮组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text）以便在 jsdom 中渲染
   */
  function mountBtn(props?: { loading?: boolean }) {
    return mount(PhoneBtn, {
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
  // 渲染：基础结构
  // ------------------------------------------------------------------
  it("渲染 phone-btn 容器", () => {
    const wrapper = mountBtn();
    expect(wrapper.find(".phone-btn").exists()).toBe(true);
  });

  it("渲染按钮文案", () => {
    const wrapper = mountBtn();
    expect(wrapper.find(".phone-btn-text").exists()).toBe(true);
    expect(wrapper.find(".phone-btn-text").text()).toBeTruthy();
    expect(typeof wrapper.find(".phone-btn-text").text()).toBe("string");
  });

  it("role=button 表示可点击", () => {
    const wrapper = mountBtn();
    expect(wrapper.find(".phone-btn").attributes("role")).toBe("button");
  });

  it("aria-label 不为空", () => {
    const wrapper = mountBtn();
    expect(wrapper.find(".phone-btn").attributes("aria-label")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // loading 状态
  // ------------------------------------------------------------------
  it("loading=false 时无 phone-btn--loading class", () => {
    const wrapper = mountBtn({ loading: false });
    expect(wrapper.find(".phone-btn").classes()).not.toContain("phone-btn--loading");
  });

  it("loading=true 时添加 phone-btn--loading class", () => {
    const wrapper = mountBtn({ loading: true });
    expect(wrapper.find(".phone-btn").classes()).toContain("phone-btn--loading");
  });

  it("loading=true 时 aria-disabled=true", () => {
    const wrapper = mountBtn({ loading: true });
    expect(wrapper.find(".phone-btn").attributes("aria-disabled")).toBe("true");
  });

  it("loading=false 时 aria-disabled=false", () => {
    const wrapper = mountBtn({ loading: false });
    expect(wrapper.find(".phone-btn").attributes("aria-disabled")).toBe("false");
  });

  it("loading=true 时 aria-busy=true", () => {
    const wrapper = mountBtn({ loading: true });
    expect(wrapper.find(".phone-btn").attributes("aria-busy")).toBe("true");
  });

  it("loading=false 时 aria-busy=false", () => {
    const wrapper = mountBtn({ loading: false });
    expect(wrapper.find(".phone-btn").attributes("aria-busy")).toBe("false");
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击 emit tap 事件", async () => {
    const wrapper = mountBtn();
    await wrapper.find(".phone-btn").trigger("tap");
    expect(wrapper.emitted("tap")).toBeTruthy();
    expect(wrapper.emitted("tap")!.length).toBe(1);
  });

  it("连续点击多次 emit 多次 tap 事件", async () => {
    const wrapper = mountBtn();
    await wrapper.find(".phone-btn").trigger("tap");
    await wrapper.find(".phone-btn").trigger("tap");
    await wrapper.find(".phone-btn").trigger("tap");
    expect(wrapper.emitted("tap")!.length).toBe(3);
  });
});
