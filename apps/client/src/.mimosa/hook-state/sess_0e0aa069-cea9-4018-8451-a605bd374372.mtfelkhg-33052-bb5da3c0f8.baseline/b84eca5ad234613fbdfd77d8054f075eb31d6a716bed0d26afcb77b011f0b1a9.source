import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// mock haptic 以避免触发真实振动
const { mockLightHaptic } = vi.hoisted(() => ({
  mockLightHaptic: vi.fn(),
}));
vi.mock("../../utils/haptic", () => ({
  lightHaptic: mockLightHaptic,
  mediumHaptic: vi.fn(),
  heavyHaptic: vi.fn(),
  successHaptic: vi.fn(),
}));

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import VerificationBadge from "../../components/common/VerificationBadge.vue";

describe("VerificationBadge component - 认证徽章组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountBadge(props?: {
    level?: "none" | "school" | "email" | "idcard";
    size?: "sm" | "md";
    showCtaWhenNone?: boolean;
  }) {
    return mount(VerificationBadge, {
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
  // 渲染：已认证徽章
  // ------------------------------------------------------------------
  it("level=school 渲染 verification-badge", () => {
    const wrapper = mountBadge({ level: "school" });
    expect(wrapper.find(".verification-badge").exists()).toBe(true);
    expect(wrapper.find(".verification-badge").classes()).toContain("verification-badge--school");
  });

  it("level=email 渲染 verification-badge", () => {
    const wrapper = mountBadge({ level: "email" });
    expect(wrapper.find(".verification-badge").exists()).toBe(true);
    expect(wrapper.find(".verification-badge").classes()).toContain("verification-badge--email");
  });

  it("level=idcard 渲染 verification-badge", () => {
    const wrapper = mountBadge({ level: "idcard" });
    expect(wrapper.find(".verification-badge").exists()).toBe(true);
    expect(wrapper.find(".verification-badge").classes()).toContain("verification-badge--idcard");
  });

  it("已认证渲染 icon 与 label", () => {
    const wrapper = mountBadge({ level: "school" });
    expect(wrapper.find(".verification-badge__icon").exists()).toBe(true);
    expect(wrapper.find(".verification-badge__label").exists()).toBe(true);
    expect(wrapper.find(".verification-badge__label").text()).toBeTruthy();
  });

  it("role=img 表示图片语义", () => {
    const wrapper = mountBadge({ level: "school" });
    expect(wrapper.find(".verification-badge").attributes("role")).toBe("img");
  });

  it("aria-label 包含认证文案", () => {
    const wrapper = mountBadge({ level: "school" });
    expect(wrapper.find(".verification-badge").attributes("aria-label")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // 渲染：size 切换
  // ------------------------------------------------------------------
  it("size=sm 添加 verification-badge--sm class", () => {
    const wrapper = mountBadge({ level: "school", size: "sm" });
    expect(wrapper.find(".verification-badge").classes()).toContain("verification-badge--sm");
  });

  it("size=md 添加 verification-badge--md class", () => {
    const wrapper = mountBadge({ level: "school", size: "md" });
    expect(wrapper.find(".verification-badge").classes()).toContain("verification-badge--md");
  });

  // ------------------------------------------------------------------
  // 渲染：未认证 CTA
  // ------------------------------------------------------------------
  it("level=none 默认渲染 verification-cta", () => {
    const wrapper = mountBadge({ level: "none" });
    expect(wrapper.find(".verification-cta").exists()).toBe(true);
    expect(wrapper.find(".verification-badge").exists()).toBe(false);
  });

  it("level=none showCtaWhenNone=false 不渲染任何内容", () => {
    const wrapper = mountBadge({ level: "none", showCtaWhenNone: false });
    expect(wrapper.find(".verification-cta").exists()).toBe(false);
    expect(wrapper.find(".verification-badge").exists()).toBe(false);
  });

  it("CTA 文案使用 i18n verificationCta 文案", () => {
    const wrapper = mountBadge({ level: "none" });
    expect(wrapper.find(".verification-cta__text").text()).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // CTA 点击交互
  // ------------------------------------------------------------------
  it("点击 CTA emit click 与 tap 事件", async () => {
    const wrapper = mountBadge({ level: "none" });
    await wrapper.find(".verification-cta").trigger("tap");
    expect(wrapper.emitted("click")).toBeTruthy();
    expect(wrapper.emitted("tap")).toBeTruthy();
  });

  it("点击 CTA 触发轻振动反馈", async () => {
    const wrapper = mountBadge({ level: "none" });
    await wrapper.find(".verification-cta").trigger("tap");
    expect(mockLightHaptic).toHaveBeenCalledTimes(1);
  });

  it("CTA role=button", () => {
    const wrapper = mountBadge({ level: "none" });
    expect(wrapper.find(".verification-cta").attributes("role")).toBe("button");
  });

  it("CTA aria-label 不为空", () => {
    const wrapper = mountBadge({ level: "none" });
    expect(wrapper.find(".verification-cta").attributes("aria-label")).toBeTruthy();
  });

  it("size=sm CTA 添加 verification-cta--sm class", () => {
    const wrapper = mountBadge({ level: "none", size: "sm" });
    expect(wrapper.find(".verification-cta").classes()).toContain("verification-cta--sm");
  });
});
