import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import Tag from "../../components/common/Tag.vue";

describe("Tag component - 标签组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text）以便在 jsdom 中渲染
   */
  function mountTag(props?: {
    variant?: string;
    label?: string;
    icon?: string;
    selected?: boolean;
    size?: "sm" | "md";
    shape?: "sm" | "pill";
  }) {
    return mount(Tag, {
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
  // 渲染：基础 props 与 class
  // ------------------------------------------------------------------
  it("默认 variant=gray + size=md + shape=pill", () => {
    const wrapper = mountTag({ label: "标签" });
    const tag = wrapper.find(".tag");
    expect(tag.exists()).toBe(true);
    expect(tag.classes()).toContain("tag--gray");
    expect(tag.classes()).toContain("tag--md");
    expect(tag.classes()).toContain("tag--shape-pill");
  });

  it("size=sm 渲染对应 class", () => {
    const wrapper = mountTag({ size: "sm" });
    expect(wrapper.find(".tag").classes()).toContain("tag--sm");
  });

  it("shape=sm 渲染对应 class", () => {
    const wrapper = mountTag({ shape: "sm" });
    expect(wrapper.find(".tag").classes()).toContain("tag--shape-sm");
  });

  it("所有 variant 渲染对应 class", () => {
    const variants = [
      "gray", "blue", "pill", "topic", "cert", "success", "warning", "error",
      "romance", "vip", "campus", "signup", "ongoing", "preview", "location", "price",
    ];
    for (const variant of variants) {
      const wrapper = mountTag({ variant, label: "T" });
      expect(wrapper.find(".tag").classes()).toContain(`tag--${variant}`);
    }
  });

  // ------------------------------------------------------------------
  // selected 状态
  // ------------------------------------------------------------------
  it("selected=true 添加 tag--selected class", () => {
    const wrapper = mountTag({ selected: true });
    expect(wrapper.find(".tag").classes()).toContain("tag--selected");
  });

  it("selected=false 不添加 tag--selected class", () => {
    const wrapper = mountTag({ selected: false });
    expect(wrapper.find(".tag").classes()).not.toContain("tag--selected");
  });

  // ------------------------------------------------------------------
  // 渲染：label 与 icon
  // ------------------------------------------------------------------
  it("label 正确渲染", () => {
    const wrapper = mountTag({ label: "我的标签" });
    expect(wrapper.find(".tag-label").text()).toBe("我的标签");
  });

  it("提供 icon 时渲染 tag-icon 元素", () => {
    const wrapper = mountTag({ label: "T", icon: "❤" });
    const icon = wrapper.find(".tag-icon");
    expect(icon.exists()).toBe(true);
    expect(icon.text()).toBe("❤");
  });

  it("未提供 icon 时不渲染 tag-icon 元素", () => {
    const wrapper = mountTag({ label: "T" });
    expect(wrapper.find(".tag-icon").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // slot 渲染
  // ------------------------------------------------------------------
  it("默认 slot 内容正确渲染", () => {
    const wrapper = mount(Tag, {
      props: { label: "T" },
      slots: { default: '<span class="extra">EXTRA</span>' },
      global: {
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        },
      },
    });
    expect(wrapper.find(".extra").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("提供 label 时 aria-label 包含该 label", () => {
    const wrapper = mountTag({ label: "校园认证" });
    expect(wrapper.find(".tag").attributes("aria-label")).toBe("校园认证");
  });

  it("selected 状态 aria-selected=true", () => {
    const wrapper = mountTag({ selected: true });
    expect(wrapper.find(".tag").attributes("aria-selected")).toBe("true");
  });

  it("未选中状态 aria-selected=false", () => {
    const wrapper = mountTag({ selected: false });
    expect(wrapper.find(".tag").attributes("aria-selected")).toBe("false");
  });
});
