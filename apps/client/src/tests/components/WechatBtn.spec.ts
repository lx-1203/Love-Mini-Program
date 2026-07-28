import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import WechatBtn from "../../components/login/WechatBtn.vue";

describe("WechatBtn component - 微信登录按钮组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountBtn(props?: { loading?: boolean }) {
    return mount(WechatBtn, {
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
  it("渲染 wechat-btn 容器", () => {
    const wrapper = mountBtn();
    expect(wrapper.find(".wechat-btn").exists()).toBe(true);
  });

  it("渲染 wechat-btn-icon 图标", () => {
    const wrapper = mountBtn();
    expect(wrapper.find(".wechat-btn-icon").exists()).toBe(true);
  });

  it("渲染 wechat-btn-text 文案", () => {
    const wrapper = mountBtn();
    expect(wrapper.find(".wechat-btn-text").exists()).toBe(true);
    expect(wrapper.find(".wechat-btn-text").text()).toBeTruthy();
  });

  it("role=button 表示可点击", () => {
    const wrapper = mountBtn();
    expect(wrapper.find(".wechat-btn").attributes("role")).toBe("button");
  });

  it("aria-label 不为空", () => {
    const wrapper = mountBtn();
    expect(wrapper.find(".wechat-btn").attributes("aria-label")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // loading 状态
  // ------------------------------------------------------------------
  it("loading=false 时无 wechat-btn--loading class", () => {
    const wrapper = mountBtn({ loading: false });
    expect(wrapper.find(".wechat-btn").classes()).not.toContain("wechat-btn--loading");
  });

  it("loading=true 时添加 wechat-btn--loading class", () => {
    const wrapper = mountBtn({ loading: true });
    expect(wrapper.find(".wechat-btn").classes()).toContain("wechat-btn--loading");
  });

  it("loading=true 时 aria-disabled=true", () => {
    const wrapper = mountBtn({ loading: true });
    expect(wrapper.find(".wechat-btn").attributes("aria-disabled")).toBe("true");
  });

  it("loading=true 时 aria-busy=true", () => {
    const wrapper = mountBtn({ loading: true });
    expect(wrapper.find(".wechat-btn").attributes("aria-busy")).toBe("true");
  });

  it("loading=false 时 aria-disabled=false", () => {
    const wrapper = mountBtn({ loading: false });
    expect(wrapper.find(".wechat-btn").attributes("aria-disabled")).toBe("false");
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击 emit tap 事件", async () => {
    const wrapper = mountBtn();
    await wrapper.find(".wechat-btn").trigger("tap");
    expect(wrapper.emitted("tap")).toBeTruthy();
    expect(wrapper.emitted("tap")!.length).toBe(1);
  });

  it("连续点击多次 emit 多次 tap 事件", async () => {
    const wrapper = mountBtn();
    await wrapper.find(".wechat-btn").trigger("tap");
    await wrapper.find(".wechat-btn").trigger("tap");
    expect(wrapper.emitted("tap")!.length).toBe(2);
  });
});
