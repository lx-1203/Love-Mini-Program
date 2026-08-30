import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import HomeHeader from "../../components/home/HomeHeader.vue";

describe("HomeHeader component - 首页头部组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mountHeader(props?: { subtitle?: string; school?: string; locationText?: string }) {
    return mount(HomeHeader, {
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

  it("渲染 home-header 容器", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".home-header").exists()).toBe(true);
  });

  it("渲染 header-left 与 header-right 区块", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-left").exists()).toBe(true);
    expect(wrapper.find(".header-right").exists()).toBe(true);
  });

  it("渲染定位胶囊与通知铃铛", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-location").exists()).toBe(true);
    expect(wrapper.findAll(".header-icon").length).toBe(1);
  });

  it("通知铃铛带未读角标", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-icon").text()).toContain("6");
  });

  it("提供 locationText 时显示定位文案", () => {
    const wrapper = mountHeader({ locationText: "清华大学 · 2km" });
    expect(wrapper.find(".header-location__text").text()).toBe("清华大学 · 2km");
  });

  it("未提供 locationText 时回退 school 文案", () => {
    const wrapper = mountHeader({ school: "清华大学" });
    expect(wrapper.find(".header-location__text").text()).toBe("清华大学");
  });

  it("header-location role=button 且 aria-label 非空", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-location").attributes("role")).toBe("button");
    expect(wrapper.find(".header-location").attributes("aria-label")).toBeTruthy();
  });

  it("header-icon role=button 且 aria-label 非空", () => {
    const wrapper = mountHeader();
    const icon = wrapper.find(".header-icon");
    expect(icon.attributes("role")).toBe("button");
    expect(icon.attributes("aria-label")).toBeTruthy();
  });

  it("点击定位胶囊 emit schoolTap 事件", async () => {
    const wrapper = mountHeader();
    await wrapper.find(".header-location").trigger("tap");
    expect(wrapper.emitted("schoolTap")).toBeTruthy();
    expect(wrapper.emitted("schoolTap")!.length).toBe(1);
  });

  it("点击通知图标 emit notifyTap 事件", async () => {
    const wrapper = mountHeader();
    await wrapper.find(".header-icon").trigger("tap");
    expect(wrapper.emitted("notifyTap")).toBeTruthy();
    expect(wrapper.emitted("notifyTap")!.length).toBe(1);
  });

  it("副标题使用默认文案", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".home-header__subtitle").text()).toBe("发现今天值得遇见的人");
  });
});
