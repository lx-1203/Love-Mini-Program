import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import LoginLogo from "../../components/login/LoginLogo.vue";

describe("LoginLogo component - 登录页 Logo 与标语组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountLogo(props?: { title?: string; subtitle?: string }) {
    return mount(LoginLogo, {
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
  it("渲染 login-header 容器", () => {
    const wrapper = mountLogo();
    expect(wrapper.find(".login-header").exists()).toBe(true);
  });

  it("渲染 login-logo 与图标", () => {
    const wrapper = mountLogo();
    expect(wrapper.find(".login-logo").exists()).toBe(true);
    expect(wrapper.find(".login-logo-icon").exists()).toBe(true);
  });

  it("渲染 login-title 与 login-subtitle 文本", () => {
    const wrapper = mountLogo();
    expect(wrapper.find(".login-title").exists()).toBe(true);
    expect(wrapper.find(".login-subtitle").exists()).toBe(true);
  });

  it("role=banner 表示横幅语义", () => {
    const wrapper = mountLogo();
    expect(wrapper.find(".login-header").attributes("role")).toBe("banner");
  });

  it("aria-label 不为空", () => {
    const wrapper = mountLogo();
    expect(wrapper.find(".login-header").attributes("aria-label")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // 渲染：title 与 subtitle
  // ------------------------------------------------------------------
  it("提供 title 时使用自定义文案", () => {
    const wrapper = mountLogo({ title: "心动校园" });
    expect(wrapper.find(".login-title").text()).toBe("心动校园");
  });

  it("未提供 title 时使用 i18n 默认文案", () => {
    const wrapper = mountLogo();
    const title = wrapper.find(".login-title").text();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  it("提供 subtitle 时使用自定义文案", () => {
    const wrapper = mountLogo({ subtitle: "遇见对的人" });
    expect(wrapper.find(".login-subtitle").text()).toBe("遇见对的人");
  });

  it("未提供 subtitle 时使用 i18n 默认文案", () => {
    const wrapper = mountLogo();
    const sub = wrapper.find(".login-subtitle").text();
    expect(sub).toBeTruthy();
    expect(sub.length).toBeGreaterThan(0);
  });

  it("aria-label 包含 title 文案", () => {
    const wrapper = mountLogo({ title: "我的应用" });
    expect(wrapper.find(".login-header").attributes("aria-label")).toBe("我的应用");
  });
});
