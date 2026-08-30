import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import SectionHeader from "../../components/common/SectionHeader.vue";

describe("SectionHeader component - 区块标题组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text）以便在 jsdom 中渲染
   */
  function mountHeader(props?: {
    title?: string;
    more?: boolean;
    moreText?: string;
  }) {
    return mount(SectionHeader, {
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
  // 渲染：基础结构与无障碍属性
  // ------------------------------------------------------------------
  it("渲染 section-header 容器", () => {
    const wrapper = mountHeader({ title: "推荐" });
    expect(wrapper.find(".section-header").exists()).toBe(true);
  });

  it("role=heading 表示标题", () => {
    const wrapper = mountHeader({ title: "推荐" });
    expect(wrapper.find(".section-header").attributes("role")).toBe("heading");
  });

  it("aria-level=2 表示二级标题", () => {
    const wrapper = mountHeader({ title: "推荐" });
    expect(wrapper.find(".section-header").attributes("aria-level")).toBe("2");
  });

  it("aria-label 包含 title", () => {
    const wrapper = mountHeader({ title: "今日推荐" });
    expect(wrapper.find(".section-header").attributes("aria-label")).toBe("今日推荐");
  });

  // ------------------------------------------------------------------
  // 渲染：title 文案
  // ------------------------------------------------------------------
  it("title 正确渲染", () => {
    const wrapper = mountHeader({ title: "热门话题" });
    expect(wrapper.find(".section-title").text()).toBe("热门话题");
  });

  // ------------------------------------------------------------------
  // more 按钮渲染与触发
  // ------------------------------------------------------------------
  it("more=false 时不渲染 more 按钮", () => {
    const wrapper = mountHeader({ title: "T", more: false });
    expect(wrapper.find(".section-more").exists()).toBe(false);
  });

  it("more=true 时渲染 more 按钮", () => {
    const wrapper = mountHeader({ title: "T", more: true });
    expect(wrapper.find(".section-more").exists()).toBe(true);
  });

  it("moreText 提供时使用自定义文案", () => {
    const wrapper = mountHeader({ title: "T", more: true, moreText: "查看全部" });
    expect(wrapper.find(".section-more-text").text()).toContain("查看全部");
  });

  it("moreText 未提供时使用 i18n 默认文案", () => {
    const wrapper = mountHeader({ title: "T", more: true });
    const text = wrapper.find(".section-more-text").text();
    expect(text).toBeTruthy();
    expect(text.length).toBeGreaterThan(0);
  });

  it("点击 more 按钮 emit more 事件", async () => {
    const wrapper = mountHeader({ title: "T", more: true });
    await wrapper.find(".section-more").trigger("tap");
    expect(wrapper.emitted("more")).toBeTruthy();
    expect(wrapper.emitted("more")!.length).toBe(1);
  });

  it("more 按钮 role=button", () => {
    const wrapper = mountHeader({ title: "T", more: true });
    expect(wrapper.find(".section-more").attributes("role")).toBe("button");
  });

  it("more 按钮 aria-label 不为空", () => {
    const wrapper = mountHeader({ title: "T", more: true });
    expect(wrapper.find(".section-more").attributes("aria-label")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // right slot 渲染
  // ------------------------------------------------------------------
  it("right slot 内容正确渲染", () => {
    const wrapper = mount(SectionHeader, {
      props: { title: "T" },
      slots: {
        right: '<view class="custom-right"><text>自定义</text></view>',
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        },
      },
    });
    expect(wrapper.find(".custom-right").exists()).toBe(true);
  });
});
