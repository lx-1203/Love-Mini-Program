import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import BottomActionBar from "../../components/common/BottomActionBar.vue";

describe("BottomActionBar component - 底部操作栏组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountBar(props?: {
    primaryLabel?: string;
    secondaryLabel?: string;
  }) {
    return mount(BottomActionBar, {
      props: props ?? { primaryLabel: "确定" },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          button: { template: '<button class="mock-button"><slot /></button>', name: "uni-button" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：默认 props
  // ------------------------------------------------------------------
  it("始终渲染 primary 按钮", () => {
    const wrapper = mountBar({ primaryLabel: "确定" });
    expect(wrapper.find(".bar__primary").exists()).toBe(true);
    expect(wrapper.find(".bar__primary").text()).toBe("确定");
  });

  it("未提供 secondaryLabel 时只渲染 primary 按钮", () => {
    const wrapper = mountBar({ primaryLabel: "确定" });
    expect(wrapper.find(".bar__secondary").exists()).toBe(false);
  });

  it("提供 secondaryLabel 时渲染 secondary 按钮", () => {
    const wrapper = mountBar({ primaryLabel: "确定", secondaryLabel: "取消" });
    expect(wrapper.find(".bar__secondary").exists()).toBe(true);
    expect(wrapper.find(".bar__secondary").text()).toBe("取消");
  });

  // ------------------------------------------------------------------
  // 单按钮/双按钮模式
  // ------------------------------------------------------------------
  it("未提供 secondaryLabel 时容器添加 bar--single class", () => {
    const wrapper = mountBar({ primaryLabel: "确定" });
    expect(wrapper.find(".bar").classes()).toContain("bar--single");
  });

  it("提供 secondaryLabel 时不添加 bar--single class", () => {
    const wrapper = mountBar({ primaryLabel: "确定", secondaryLabel: "取消" });
    expect(wrapper.find(".bar").classes()).not.toContain("bar--single");
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击 primary 按钮 emit primary 事件", async () => {
    const wrapper = mountBar({ primaryLabel: "确定" });
    await wrapper.find(".bar__primary").trigger("tap");
    expect(wrapper.emitted("primary")).toBeTruthy();
    expect(wrapper.emitted("primary")!.length).toBe(1);
  });

  it("点击 secondary 按钮 emit secondary 事件", async () => {
    const wrapper = mountBar({ primaryLabel: "确定", secondaryLabel: "取消" });
    await wrapper.find(".bar__secondary").trigger("tap");
    expect(wrapper.emitted("secondary")).toBeTruthy();
    expect(wrapper.emitted("secondary")!.length).toBe(1);
  });

  it("点击 primary 按钮不触发 secondary 事件", async () => {
    const wrapper = mountBar({ primaryLabel: "确定", secondaryLabel: "取消" });
    await wrapper.find(".bar__primary").trigger("tap");
    expect(wrapper.emitted("secondary")).toBeFalsy();
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("容器 role=toolbar 与 aria-label", () => {
    const wrapper = mountBar({ primaryLabel: "确定" });
    const bar = wrapper.find(".bar");
    expect(bar.attributes("role")).toBe("toolbar");
    expect(bar.attributes("aria-label")).toBe("操作栏");
  });

  it("primary 按钮 aria-label 等于 primaryLabel", () => {
    const wrapper = mountBar({ primaryLabel: "提交" });
    expect(wrapper.find(".bar__primary").attributes("aria-label")).toBe("提交");
  });

  it("secondary 按钮 aria-label 等于 secondaryLabel", () => {
    const wrapper = mountBar({ primaryLabel: "确定", secondaryLabel: "返回" });
    expect(wrapper.find(".bar__secondary").attributes("aria-label")).toBe("返回");
  });
});
