import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import Avatar from "../../components/common/Avatar.vue";

describe("Avatar component - 头像组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountAvatar(props?: {
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    src?: string;
    name?: string;
    online?: boolean;
    vip?: boolean;
    ring?: boolean;
    vipRing?: boolean;
    liveDot?: boolean | "green" | "red";
    gradient?: string;
  }) {
    return mount(Avatar, {
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
  // 渲染：默认 props 与样式
  // ------------------------------------------------------------------
  it("默认 size=md 渲染", () => {
    const wrapper = mountAvatar();
    const avatar = wrapper.find(".avatar");
    expect(avatar.exists()).toBe(true);
    // md size 在 designTokens.component.avatar.md 中值为 48
    expect(avatar.attributes("style")).toContain("width: 48rpx");
  });

  it("size=xs 渲染对应尺寸", () => {
    const wrapper = mountAvatar({ size: "xs" });
    // xs size 在 designTokens.component.avatar.xs 中值为 32
    expect(wrapper.find(".avatar").attributes("style")).toContain("width: 32rpx");
  });

  it("size=xl 渲染对应尺寸", () => {
    const wrapper = mountAvatar({ size: "xl" });
    // xl size 在 designTokens.component.avatar.xl 中值为 80
    expect(wrapper.find(".avatar").attributes("style")).toContain("width: 80rpx");
  });

  // ------------------------------------------------------------------
  // 渲染：图片源与 fallback
  // ------------------------------------------------------------------
  it("提供 src 时渲染 SafeImage 而非 fallback", () => {
    const wrapper = mountAvatar({ src: "https://cdn.example.com/a.png", name: "小明" });
    // SafeImage 内部渲染 image 标签
    expect(wrapper.find(".avatar-img").exists()).toBe(true);
    expect(wrapper.find(".avatar-fallback").exists()).toBe(false);
  });

  it("未提供 src 时显示首字母 fallback", () => {
    const wrapper = mountAvatar({ name: "小明" });
    const fallback = wrapper.find(".avatar-fallback");
    expect(fallback.exists()).toBe(true);
    expect(fallback.text()).toContain("小");
  });

  it("未提供 name 时 fallback 首字母为 ?", () => {
    const wrapper = mountAvatar();
    expect(wrapper.find(".avatar-fallback").text()).toContain("?");
  });

  // ------------------------------------------------------------------
  // 渲染：在线状态与直播标识
  // ------------------------------------------------------------------
  it("online=true 显示在线点", () => {
    const wrapper = mountAvatar({ online: true });
    expect(wrapper.find(".avatar-dot--online").exists()).toBe(true);
  });

  it("liveDot=red 显示直播点", () => {
    const wrapper = mountAvatar({ liveDot: "red" });
    expect(wrapper.find(".avatar-dot--live").exists()).toBe(true);
  });

  it("liveDot=green 显示在线点（与 online 等价）", () => {
    const wrapper = mountAvatar({ liveDot: "green" });
    expect(wrapper.find(".avatar-dot--online").exists()).toBe(true);
    expect(wrapper.find(".avatar-dot--live").exists()).toBe(false);
  });

  it("默认不显示任何 dot", () => {
    const wrapper = mountAvatar();
    expect(wrapper.find(".avatar-dot--online").exists()).toBe(false);
    expect(wrapper.find(".avatar-dot--live").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // 渲染：环样式与 vip 描边
  // ------------------------------------------------------------------
  it("vip=true 添加 vip-ring class", () => {
    const wrapper = mountAvatar({ vip: true });
    expect(wrapper.find(".avatar").classes()).toContain("avatar--vip-ring");
  });

  it("vipRing=true 添加 vip-ring class", () => {
    const wrapper = mountAvatar({ vipRing: true });
    expect(wrapper.find(".avatar").classes()).toContain("avatar--vip-ring");
  });

  it("ring=true 且非 vip 添加 green-ring class", () => {
    const wrapper = mountAvatar({ ring: true });
    expect(wrapper.find(".avatar").classes()).toContain("avatar--green-ring");
  });

  it("ring + vip 同时设置时显示 vip-ring（vip 优先）", () => {
    const wrapper = mountAvatar({ ring: true, vip: true });
    expect(wrapper.find(".avatar").classes()).toContain("avatar--vip-ring");
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("提供 name 时 aria-label 包含该 name", () => {
    const wrapper = mountAvatar({ name: "小红" });
    expect(wrapper.find(".avatar").attributes("aria-label")).toBe("小红");
  });

  it("未提供 name 时 aria-label 使用 i18n 默认文案", () => {
    const wrapper = mountAvatar();
    const aria = wrapper.find(".avatar").attributes("aria-label");
    // 应当是 i18n 中 messages.avatarAria 的值
    expect(aria).toBeTruthy();
    expect(typeof aria).toBe("string");
  });
});
