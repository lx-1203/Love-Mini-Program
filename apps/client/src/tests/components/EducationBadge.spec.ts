import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import EducationBadge from "../../components/common/EducationBadge.vue";

describe("EducationBadge component - 教育徽章组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountBadge(props?: {
    school: string;
    degree?: string;
    verified?: boolean;
    size?: "sm" | "md" | "lg";
  }) {
    return mount(EducationBadge, {
      props: props ?? { school: "测试大学" },
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
  // 渲染：基础结构与无障碍属性
  // ------------------------------------------------------------------
  it("渲染 edu-badge 容器", () => {
    const wrapper = mountBadge({ school: "测试大学" });
    expect(wrapper.find(".edu-badge").exists()).toBe(true);
  });

  it("role=img 表示图片语义", () => {
    const wrapper = mountBadge({ school: "测试大学" });
    expect(wrapper.find(".edu-badge").attributes("role")).toBe("img");
  });

  it("aria-label 包含 school 名称", () => {
    const wrapper = mountBadge({ school: "北京大学" });
    expect(wrapper.find(".edu-badge").attributes("aria-label")).toContain("北京大学");
  });

  // ------------------------------------------------------------------
  // 渲染：school 与 degree
  // ------------------------------------------------------------------
  it("school 名称正确渲染", () => {
    const wrapper = mountBadge({ school: "清华大学" });
    expect(wrapper.find(".edu-badge__school").text()).toBe("清华大学");
  });

  it("提供 degree 时渲染 degree", () => {
    const wrapper = mountBadge({ school: "北大", degree: "本科" });
    const degree = wrapper.find(".edu-badge__degree");
    expect(degree.exists()).toBe(true);
    expect(degree.text()).toContain("本科");
  });

  it("未提供 degree 时不渲染 degree 元素", () => {
    const wrapper = mountBadge({ school: "北大" });
    expect(wrapper.find(".edu-badge__degree").exists()).toBe(false);
  });

  it("aria-label 同时包含 school 与 degree", () => {
    const wrapper = mountBadge({ school: "复旦大学", degree: "硕士" });
    const aria = wrapper.find(".edu-badge").attributes("aria-label");
    expect(aria).toContain("复旦大学");
    expect(aria).toContain("硕士");
  });

  // ------------------------------------------------------------------
  // 渲染：verified 状态
  // ------------------------------------------------------------------
  it("verified=true 时渲染 check 图标", () => {
    const wrapper = mountBadge({ school: "北大", verified: true });
    expect(wrapper.find(".edu-badge__check").exists()).toBe(true);
  });

  it("verified=false 时渲染 dot 占位", () => {
    const wrapper = mountBadge({ school: "北大", verified: false });
    expect(wrapper.find(".edu-badge__dot").exists()).toBe(true);
  });

  it("verified=true 时 aria-label 包含认证文案", () => {
    const wrapper = mountBadge({ school: "北大", verified: true });
    const aria = wrapper.find(".edu-badge").attributes("aria-label");
    expect(aria).toContain("北大");
  });

  // ------------------------------------------------------------------
  // 渲染：size 切换
  // ------------------------------------------------------------------
  it("size=sm 渲染对应尺寸样式", () => {
    const wrapper = mountBadge({ school: "北大", size: "sm" });
    const style = wrapper.find(".edu-badge").attributes("style");
    expect(style).toContain("padding");
    // sm padding 4rpx 8rpx
    expect(style).toContain("4rpx 8rpx");
  });

  it("size=md 渲染对应尺寸样式", () => {
    const wrapper = mountBadge({ school: "北大", size: "md" });
    const style = wrapper.find(".edu-badge").attributes("style");
    expect(style).toContain("4rpx 12rpx");
  });

  it("size=lg 渲染对应尺寸样式", () => {
    const wrapper = mountBadge({ school: "北大", size: "lg" });
    const style = wrapper.find(".edu-badge").attributes("style");
    expect(style).toContain("8rpx 16rpx");
  });
});
