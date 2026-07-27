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

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountHeader(props?: { school?: string }) {
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

  // ------------------------------------------------------------------
  // 渲染：基础结构
  // ------------------------------------------------------------------
  it("渲染 home-header 容器", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".home-header").exists()).toBe(true);
  });

  it("渲染 header-left 与 header-right 区块", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-left").exists()).toBe(true);
    expect(wrapper.find(".header-right").exists()).toBe(true);
  });

  it("渲染学校名称与箭头", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-school").exists()).toBe(true);
    expect(wrapper.find(".header-arrow").exists()).toBe(true);
  });

  it("渲染学校限制徽章", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-badge").exists()).toBe(true);
    expect(wrapper.find(".header-badge-text").exists()).toBe(true);
  });

  it("渲染搜索与通知图标", () => {
    const wrapper = mountHeader();
    expect(wrapper.findAll(".header-icon").length).toBe(2);
  });

  it("通知图标带未读 dot", () => {
    const wrapper = mountHeader();
    // 第 2 个 header-icon 为通知，应包含 .header-dot
    const icons = wrapper.findAll(".header-icon");
    expect(icons[1].find(".header-dot").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 渲染：school 文案
  // ------------------------------------------------------------------
  it("提供 school 时显示学校名称", () => {
    const wrapper = mountHeader({ school: "清华大学" });
    expect(wrapper.find(".header-school").text()).toBe("清华大学");
  });

  it("未提供 school 时使用 i18n welcome 文案", () => {
    const wrapper = mountHeader();
    const text = wrapper.find(".header-school").text();
    expect(text).toBeTruthy();
    expect(text.length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("header-left role=button", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-left").attributes("role")).toBe("button");
  });

  it("header-icon role=button", () => {
    const wrapper = mountHeader();
    for (const icon of wrapper.findAll(".header-icon")) {
      expect(icon.attributes("role")).toBe("button");
    }
  });

  it("header-left aria-label 不为空", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-left").attributes("aria-label")).toBeTruthy();
  });

  it("header-icon aria-label 都不为空", () => {
    const wrapper = mountHeader();
    for (const icon of wrapper.findAll(".header-icon")) {
      expect(icon.attributes("aria-label")).toBeTruthy();
    }
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击 header-left emit schoolTap 事件", async () => {
    const wrapper = mountHeader();
    await wrapper.find(".header-left").trigger("tap");
    expect(wrapper.emitted("schoolTap")).toBeTruthy();
    expect(wrapper.emitted("schoolTap")!.length).toBe(1);
  });

  it("点击搜索图标 emit searchTap 事件", async () => {
    const wrapper = mountHeader();
    const icons = wrapper.findAll(".header-icon");
    await icons[0].trigger("tap");
    expect(wrapper.emitted("searchTap")).toBeTruthy();
    expect(wrapper.emitted("searchTap")!.length).toBe(1);
  });

  it("点击通知图标 emit notifyTap 事件", async () => {
    const wrapper = mountHeader();
    const icons = wrapper.findAll(".header-icon");
    await icons[1].trigger("tap");
    expect(wrapper.emitted("notifyTap")).toBeTruthy();
    expect(wrapper.emitted("notifyTap")!.length).toBe(1);
  });

  it("分别点击不同图标 emit 不同事件", async () => {
    const wrapper = mountHeader();
    const icons = wrapper.findAll(".header-icon");
    await icons[0].trigger("tap");
    await icons[1].trigger("tap");
    await wrapper.find(".header-left").trigger("tap");
    expect(wrapper.emitted("searchTap")!.length).toBe(1);
    expect(wrapper.emitted("notifyTap")!.length).toBe(1);
    expect(wrapper.emitted("schoolTap")!.length).toBe(1);
  });
});
