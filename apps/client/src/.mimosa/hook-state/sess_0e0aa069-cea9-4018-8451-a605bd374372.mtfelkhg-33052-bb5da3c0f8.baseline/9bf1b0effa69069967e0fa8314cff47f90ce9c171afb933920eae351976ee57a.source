import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import Card from "../../components/common/Card.vue";

describe("Card component - 通用卡片组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view）以便在 jsdom 中渲染
   */
  function mountCard(props?: {
    variant?: "default" | "interactive" | "gradient" | "atmosphere";
    padding?: number;
    radius?: number;
    ripple?: boolean;
    gradient?: "romance" | "brand" | "pink" | "vip" | false;
  }) {
    return mount(Card, {
      props: props ?? {},
      slots: { default: '<div class="card-content">内容</div>' },
      global: {
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础结构
  // ------------------------------------------------------------------
  it("渲染 card 容器与默认 slot", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".card").exists()).toBe(true);
    expect(wrapper.find(".card-content").exists()).toBe(true);
  });

  it("默认 variant=default 添加 card--default class", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".card").classes()).toContain("card--default");
  });

  it("role=group 表示分组语义", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".card").attributes("role")).toBe("group");
  });

  // ------------------------------------------------------------------
  // 渲染：variant 切换
  // ------------------------------------------------------------------
  it("variant=interactive 添加 card--interactive class", () => {
    const wrapper = mountCard({ variant: "interactive", ripple: false });
    expect(wrapper.find(".card").classes()).toContain("card--interactive");
  });

  it("variant=gradient 添加 card--gradient class", () => {
    const wrapper = mountCard({ variant: "gradient" });
    expect(wrapper.find(".card").classes()).toContain("card--gradient");
  });

  it("variant=atmosphere 添加 card--atmosphere class", () => {
    const wrapper = mountCard({ variant: "atmosphere" });
    expect(wrapper.find(".card").classes()).toContain("card--atmosphere");
  });

  // ------------------------------------------------------------------
  // 渲染：gradient prop
  // ------------------------------------------------------------------
  it("gradient=romance 添加 card--gradient-romance class", () => {
    const wrapper = mountCard({ gradient: "romance" });
    expect(wrapper.find(".card").classes()).toContain("card--gradient-romance");
  });

  it("gradient=brand 添加 card--gradient-brand class", () => {
    const wrapper = mountCard({ gradient: "brand" });
    expect(wrapper.find(".card").classes()).toContain("card--gradient-brand");
  });

  it("gradient=pink 添加 card--gradient-pink class", () => {
    const wrapper = mountCard({ gradient: "pink" });
    expect(wrapper.find(".card").classes()).toContain("card--gradient-pink");
  });

  it("gradient=vip 添加 card--gradient-vip class", () => {
    const wrapper = mountCard({ gradient: "vip" });
    expect(wrapper.find(".card").classes()).toContain("card--gradient-vip");
  });

  // ------------------------------------------------------------------
  // 渲染：padding 与 radius
  // ------------------------------------------------------------------
  it("默认 padding=32rpx 与 radius=16rpx 应用到 style", () => {
    const wrapper = mountCard();
    const style = wrapper.find(".card").attributes("style");
    expect(style).toContain("padding: 32rpx");
    expect(style).toContain("border-radius: 16rpx");
  });

  it("自定义 padding 与 radius 应用到 style", () => {
    const wrapper = mountCard({ padding: 24, radius: 12 });
    const style = wrapper.find(".card").attributes("style");
    expect(style).toContain("padding: 24rpx");
    expect(style).toContain("border-radius: 12rpx");
  });

  it("padding=0 时 style 中 padding=0rpx", () => {
    const wrapper = mountCard({ padding: 0 });
    expect(wrapper.find(".card").attributes("style")).toContain("padding: 0rpx");
  });

  // ------------------------------------------------------------------
  // interactive + ripple 行为
  // ------------------------------------------------------------------
  it("variant=interactive ripple=true 时包裹 Ripple 组件", () => {
    const wrapper = mountCard({ variant: "interactive", ripple: true });
    // Ripple 组件根容器为 .ripple-container
    expect(wrapper.find(".ripple-container").exists()).toBe(true);
  });

  it("variant=interactive ripple=false 时不包裹 Ripple 组件", () => {
    const wrapper = mountCard({ variant: "interactive", ripple: false });
    expect(wrapper.find(".ripple-container").exists()).toBe(false);
  });

  it("variant=default 时即使 ripple=true 也不包裹 Ripple", () => {
    const wrapper = mountCard({ variant: "default", ripple: true });
    expect(wrapper.find(".ripple-container").exists()).toBe(false);
  });
});
