import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import BaseTabs, { BaseTab } from "../../components/common/BaseTabs.vue";

describe("BaseTabs component - 标签页组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tabs: BaseTab[] = [
    { key: "all", label: "全部" },
    { key: "following", label: "关注", badge: 5 },
    { key: "hot", label: "热门", badge: 100 },
  ];

  /**
   * 挂载辅助函数
   */
  function mountTabs(props?: {
    tabs?: BaseTab[];
    modelValue?: string;
    variant?: "underline" | "pill" | "block";
    scrollable?: boolean;
    equalSplit?: boolean;
    activeColor?: string;
    badgeColor?: string;
  }) {
    return mount(BaseTabs, {
      props: { tabs, modelValue: "all", ...props },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          "scroll-view": {
            template: '<div class="mock-scroll-view"><slot /></div>',
            name: "uni-scroll-view",
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：默认 props
  // ------------------------------------------------------------------
  it("渲染所有 tab 项", () => {
    const wrapper = mountTabs();
    expect(wrapper.findAll(".base-tab-item").length).toBe(3);
  });

  it("默认 variant=underline 添加 base-tabs--underline class", () => {
    const wrapper = mountTabs();
    expect(wrapper.find(".base-tabs").classes()).toContain("base-tabs--underline");
  });

  it("variant=pill 添加 base-tabs--pill class", () => {
    const wrapper = mountTabs({ variant: "pill" });
    expect(wrapper.find(".base-tabs").classes()).toContain("base-tabs--pill");
  });

  it("variant=block 添加 base-tabs--block class", () => {
    const wrapper = mountTabs({ variant: "block" });
    expect(wrapper.find(".base-tabs").classes()).toContain("base-tabs--block");
  });

  // ------------------------------------------------------------------
  // 激活状态
  // ------------------------------------------------------------------
  it("modelValue 对应的 tab 添加 is-active class", () => {
    const wrapper = mountTabs({ modelValue: "following" });
    const items = wrapper.findAll(".base-tab-item");
    expect(items[0].classes()).not.toContain("is-active");
    expect(items[1].classes()).toContain("is-active");
  });

  it("激活 tab 的 aria-selected=true", () => {
    const wrapper = mountTabs({ modelValue: "all" });
    const items = wrapper.findAll(".base-tab-item");
    expect(items[0].attributes("aria-selected")).toBe("true");
    expect(items[1].attributes("aria-selected")).toBe("false");
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击 tab 触发 update:modelValue 与 change 事件", async () => {
    const wrapper = mountTabs({ modelValue: "all" });
    const items = wrapper.findAll(".base-tab-item");
    await items[1].trigger("tap");
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")![0]).toEqual(["following"]);
    expect(wrapper.emitted("change")).toBeTruthy();
    expect(wrapper.emitted("change")![0][0]).toBe("following");
  });

  it("点击已激活的 tab 不触发事件", async () => {
    const wrapper = mountTabs({ modelValue: "all" });
    const items = wrapper.findAll(".base-tab-item");
    await items[0].trigger("tap");
    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
    expect(wrapper.emitted("change")).toBeFalsy();
  });

  // ------------------------------------------------------------------
  // 徽章格式化
  // ------------------------------------------------------------------
  it("badge 为数字 ≤99 时直接显示", () => {
    const wrapper = mountTabs({ modelValue: "all" });
    const badges = wrapper.findAll(".base-tab-badge");
    expect(badges[0].text()).toBe("5");
  });

  it("badge 为数字 >99 时显示 99+", () => {
    const wrapper = mountTabs({ modelValue: "all" });
    const badges = wrapper.findAll(".base-tab-badge");
    expect(badges[1].text()).toBe("99+");
  });

  it("badge 为字符串时原样显示", () => {
    const stringBadgeTabs: BaseTab[] = [
      { key: "all", label: "全部", badge: "NEW" },
    ];
    const wrapper = mountTabs({ tabs: stringBadgeTabs, modelValue: "all" });
    expect(wrapper.find(".base-tab-badge").text()).toBe("NEW");
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("容器 role=tablist", () => {
    const wrapper = mountTabs();
    expect(wrapper.find(".base-tabs").attributes("role")).toBe("tablist");
  });

  it("每个 tab role=tab 与 aria-label", () => {
    const wrapper = mountTabs();
    const items = wrapper.findAll(".base-tab-item");
    expect(items[0].attributes("role")).toBe("tab");
    expect(items[0].attributes("aria-label")).toBe("全部");
  });
});
