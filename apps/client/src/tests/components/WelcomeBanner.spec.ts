import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import WelcomeBanner from "../../components/home/WelcomeBanner.vue";

describe("WelcomeBanner component - 欢迎横幅组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text）以便在 jsdom 中渲染
   */
  function mountBanner(props?: { greeting?: string; subtitle?: string; tags?: string[] }) {
    return mount(WelcomeBanner, {
      props: props ?? {},
      global: {
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
  it("渲染 banner 容器", () => {
    const wrapper = mountBanner();
    expect(wrapper.find(".banner").exists()).toBe(true);
  });

  it("渲染 banner-bg 与装饰元素", () => {
    const wrapper = mountBanner();
    expect(wrapper.find(".banner-bg").exists()).toBe(true);
    expect(wrapper.find(".banner-deco--1").exists()).toBe(true);
    expect(wrapper.find(".banner-deco--2").exists()).toBe(true);
    expect(wrapper.find(".banner-deco--3").exists()).toBe(true);
  });

  it("渲染 banner-content 区块", () => {
    const wrapper = mountBanner();
    expect(wrapper.find(".banner-content").exists()).toBe(true);
    expect(wrapper.find(".banner-greeting").exists()).toBe(true);
    expect(wrapper.find(".banner-sub").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 渲染：greeting 与 subtitle
  // ------------------------------------------------------------------
  it("提供 greeting 时使用自定义文案", () => {
    const wrapper = mountBanner({ greeting: "早上好，同学" });
    expect(wrapper.find(".banner-greeting").text()).toBe("早上好，同学");
  });

  it("未提供 greeting 时使用默认文案", () => {
    const wrapper = mountBanner();
    expect(wrapper.find(".banner-greeting").text()).toBe("下午好，同学");
  });

  it("提供 subtitle 时使用自定义文案", () => {
    const wrapper = mountBanner({ subtitle: "今天没有课" });
    expect(wrapper.find(".banner-sub").text()).toBe("今天没有课");
  });

  it("未提供 subtitle 时使用默认文案", () => {
    const wrapper = mountBanner();
    const sub = wrapper.find(".banner-sub").text();
    expect(sub).toContain("今天有");
    expect(sub).toContain("节课");
  });

  // ------------------------------------------------------------------
  // 渲染：tags
  // ------------------------------------------------------------------
  it("未提供 tags 时不渲染 banner-tags", () => {
    const wrapper = mountBanner();
    expect(wrapper.find(".banner-tags").exists()).toBe(false);
  });

  it("提供空 tags 数组时不渲染 banner-tags", () => {
    const wrapper = mountBanner({ tags: [] });
    expect(wrapper.find(".banner-tags").exists()).toBe(false);
  });

  it("提供 tags 时渲染对应数量的 tag", () => {
    const wrapper = mountBanner({ tags: ["音乐", "运动", "读书"] });
    expect(wrapper.find(".banner-tags").exists()).toBe(true);
    expect(wrapper.findAll(".banner-tag").length).toBe(3);
    const tags = wrapper.findAll(".banner-tag-text");
    expect(tags[0].text()).toBe("音乐");
    expect(tags[1].text()).toBe("运动");
    expect(tags[2].text()).toBe("读书");
  });

  it("提供单个 tag 时渲染一个 tag", () => {
    const wrapper = mountBanner({ tags: ["测试"] });
    expect(wrapper.findAll(".banner-tag").length).toBe(1);
    expect(wrapper.find(".banner-tag-text").text()).toBe("测试");
  });
});
