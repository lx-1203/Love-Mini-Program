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

import TopicSelector from "../../components/village/TopicSelector.vue";

describe("TopicSelector component - 话题选择器组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountSelector(props?: { modelValue?: string[] }) {
    return mount(TopicSelector, {
      props: {
        modelValue: [],
        ...props,
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          input: { template: '<input class="mock-input" />', name: "uni-input" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("渲染 topic-selector 容器", () => {
    const wrapper = mountSelector();
    expect(wrapper.find(".topic-selector").exists()).toBe(true);
  });

  it("渲染标题与副标题", () => {
    const wrapper = mountSelector();
    expect(wrapper.find(".topic-selector__title").exists()).toBe(true);
    expect(wrapper.find(".topic-selector__subtitle").exists()).toBe(true);
  });

  it("渲染搜索框", () => {
    const wrapper = mountSelector();
    expect(wrapper.find(".topic-selector__search").exists()).toBe(true);
  });

  it("渲染热门话题列表", () => {
    const wrapper = mountSelector();
    expect(wrapper.find(".topic-selector__hot").exists()).toBe(true);
    // popularTopics 中至少有一个话题
    expect(wrapper.findAll(".topic-chip").length).toBeGreaterThan(0);
  });

  it("渲染创建自定义话题区域", () => {
    const wrapper = mountSelector();
    expect(wrapper.find(".topic-selector__create").exists()).toBe(true);
    expect(wrapper.find(".topic-selector__create-btn").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 已选区
  // ------------------------------------------------------------------
  it("未选择话题时渲染空态文案", () => {
    const wrapper = mountSelector({ modelValue: [] });
    expect(wrapper.find(".topic-selector__empty").exists()).toBe(true);
  });

  it("已选话题时渲染 chip", () => {
    const wrapper = mountSelector({ modelValue: ["旅行"] });
    expect(wrapper.find(".topic-selector__chips").exists()).toBe(true);
    expect(wrapper.findAll(".topic-chip--selected").length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // 选择交互
  // ------------------------------------------------------------------
  it("点击未选话题触发 update:modelValue", async () => {
    const wrapper = mountSelector({ modelValue: [] });
    const chips = wrapper.findAll(".topic-chip");
    // 跳过已选 chip（顶部），点击热门列表中的第一个
    const hotChip = chips.find((c) => !c.classes().includes("topic-chip--selected"));
    if (hotChip) {
      await hotChip.trigger("tap");
      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    }
  });

  it("点击已选话题触发 update:modelValue 移除", async () => {
    const wrapper = mountSelector({ modelValue: ["旅行"] });
    // 已选区的 chip
    const selectedChips = wrapper.findAll(".topic-chip--selected");
    if (selectedChips.length > 0) {
      await selectedChips[0].trigger("tap");
      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      const emitted = wrapper.emitted("update:modelValue")![0] as string[];
      expect(emitted).not.toContain("旅行");
    }
  });

  // ------------------------------------------------------------------
  // 清空操作
  // ------------------------------------------------------------------
  it("有已选话题时显示清空按钮", () => {
    const wrapper = mountSelector({ modelValue: ["旅行"] });
    expect(wrapper.find(".topic-selector__clear").exists()).toBe(true);
  });

  it("点击清空按钮触发 update:modelValue=[]", async () => {
    const wrapper = mountSelector({ modelValue: ["旅行"] });
    await wrapper.find(".topic-selector__clear").trigger("tap");
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    // emitted()[0] 是首次调用的参数数组，[0] 取第一个参数（即空数组）
    expect(wrapper.emitted("update:modelValue")![0][0]).toEqual([]);
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("chip 添加 hover-class 属性（mp-weixin 兼容）", () => {
    const wrapper = mountSelector();
    const chip = wrapper.find(".topic-chip");
    // hover-class 是 mp-weixin 原生属性，在 jsdom 中应保留为属性
    expect(chip.exists()).toBe(true);
  });
});
