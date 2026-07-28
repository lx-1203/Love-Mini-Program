import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
const showToast = vi.fn();
(globalThis as any).uni = { showToast };

// mock haptic
vi.mock("../../utils/haptic", () => ({
  lightHaptic: vi.fn(),
}));

import TagSelector from "../../subpackages/setup/components/TagSelector.vue";

describe("TagSelector component - 资料标签选择器组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountSelector(props?: {
    modelValue?: Partial<Record<string, string[]>>;
  }) {
    return mount(TagSelector, {
      props: {
        modelValue: {},
        ...props,
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          TagIcon: { template: '<span class="mock-tag-icon" />', name: "TagIcon" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("渲染 tag-selector 容器", () => {
    const wrapper = mountSelector();
    expect(wrapper.find(".tag-selector").exists()).toBe(true);
  });

  it("渲染标题与副标题", () => {
    const wrapper = mountSelector();
    expect(wrapper.find(".tag-selector__title").exists()).toBe(true);
    expect(wrapper.find(".tag-selector__subtitle").exists()).toBe(true);
  });

  it("渲染所有分组", () => {
    const wrapper = mountSelector();
    // profile-tag-groups 包含 4 大分组
    expect(wrapper.findAll(".tag-selector__group").length).toBeGreaterThanOrEqual(1);
  });

  it("渲染每个分组中的标签 chip", () => {
    const wrapper = mountSelector();
    expect(wrapper.findAll(".tag-chip").length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // 已选区
  // ------------------------------------------------------------------
  it("未选标签时渲染空态文案", () => {
    const wrapper = mountSelector({ modelValue: {} });
    expect(wrapper.find(".tag-selector__empty").exists()).toBe(true);
  });

  it("已选标签时显示清空按钮", () => {
    const wrapper = mountSelector({
      modelValue: { interest: ["music"] },
    });
    expect(wrapper.find(".tag-selector__clear").exists()).toBe(true);
  });

  it("已选标签时在顶部渲染已选 chip", () => {
    const wrapper = mountSelector({
      modelValue: { interest: ["music"] },
    });
    // 顶部已选区
    const selected = wrapper.find(".tag-selector__selected");
    expect(selected.exists()).toBe(true);
    const selectedChips = selected.findAll(".tag-chip--selected");
    expect(selectedChips.length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // 选择交互
  // ------------------------------------------------------------------
  it("点击未选标签触发 update:modelValue 添加", async () => {
    const wrapper = mountSelector({ modelValue: {} });
    // 分组区中的第一个 chip
    const groupChips = wrapper.findAll(".tag-selector__group .tag-chip");
    if (groupChips.length > 0) {
      await groupChips[0].trigger("tap");
      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    }
  });

  it("点击已选标签触发 update:modelValue 移除", async () => {
    const wrapper = mountSelector({
      modelValue: { interest: ["music"] },
    });
    // 顶部已选区的 chip
    const selectedChips = wrapper.findAll(".tag-selector__selected .tag-chip--selected");
    if (selectedChips.length > 0) {
      await selectedChips[0].trigger("tap");
      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    }
  });

  // ------------------------------------------------------------------
  // 清空操作
  // ------------------------------------------------------------------
  it("点击清空按钮触发 update:modelValue={}", async () => {
    const wrapper = mountSelector({
      modelValue: { interest: ["music"] },
    });
    await wrapper.find(".tag-selector__clear").trigger("tap");
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    // emitted()[0] 是首次调用的参数数组，[0] 取第一个参数（即空对象）
    expect(wrapper.emitted("update:modelValue")![0][0]).toEqual({});
  });

  // ------------------------------------------------------------------
  // 选中态样式
  // ------------------------------------------------------------------
  it("已选标签添加 tag-chip--selected class", () => {
    const wrapper = mountSelector({
      modelValue: { interest: ["music"] },
    });
    expect(wrapper.find(".tag-chip--selected").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 计数显示
  // ------------------------------------------------------------------
  it("渲染 selectedCount 文案", () => {
    const wrapper = mountSelector({ modelValue: {} });
    expect(wrapper.find(".tag-selector__selected-count").exists()).toBe(true);
  });

  it("渲染分组计数", () => {
    const wrapper = mountSelector({ modelValue: {} });
    expect(wrapper.find(".tag-selector__group-count").exists()).toBe(true);
  });
});
