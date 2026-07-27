import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import SetupProgress from "../../components/setup/SetupProgress.vue";

describe("SetupProgress component - 引导流程进度条组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text）以便在 jsdom 中渲染
   */
  function mountProgress(props?: { currentStep: number; totalSteps?: number }) {
    return mount(SetupProgress, {
      props: props ?? { currentStep: 1 },
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
  // 渲染：基础结构
  // ------------------------------------------------------------------
  it("渲染 setup-progress 容器", () => {
    const wrapper = mountProgress({ currentStep: 1 });
    expect(wrapper.find(".setup-progress").exists()).toBe(true);
  });

  it("渲染 header（当前步骤文案 + 名称）", () => {
    const wrapper = mountProgress({ currentStep: 1 });
    expect(wrapper.find(".setup-progress__header").exists()).toBe(true);
    expect(wrapper.find(".setup-progress__current").exists()).toBe(true);
    expect(wrapper.find(".setup-progress__label").exists()).toBe(true);
  });

  it("渲染步骤条与步骤名称行", () => {
    const wrapper = mountProgress({ currentStep: 1 });
    expect(wrapper.find(".setup-progress__bar").exists()).toBe(true);
    expect(wrapper.find(".setup-progress__labels").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 渲染：默认 totalSteps=5 渲染 5 个步骤
  // ------------------------------------------------------------------
  it("默认 totalSteps=5 渲染 5 个 step-wrap", () => {
    const wrapper = mountProgress({ currentStep: 1 });
    expect(wrapper.findAll(".setup-progress__step-wrap").length).toBe(5);
  });

  it("默认渲染 5 个步骤圆点", () => {
    const wrapper = mountProgress({ currentStep: 1 });
    expect(wrapper.findAll(".setup-progress__dot").length).toBe(5);
  });

  it("渲染 4 条连接线（最后一个不显示）", () => {
    const wrapper = mountProgress({ currentStep: 1 });
    expect(wrapper.findAll(".setup-progress__line").length).toBe(4);
  });

  it("渲染 5 个步骤名称", () => {
    const wrapper = mountProgress({ currentStep: 1 });
    expect(wrapper.findAll(".setup-progress__label-item").length).toBe(5);
  });

  // ------------------------------------------------------------------
  // 渲染：状态计算
  // ------------------------------------------------------------------
  it("currentStep=1 时第 1 个圆点为 current 状态", () => {
    const wrapper = mountProgress({ currentStep: 1 });
    const dots = wrapper.findAll(".setup-progress__dot");
    expect(dots[0].classes()).toContain("setup-progress__dot--current");
    expect(dots[1].classes()).toContain("setup-progress__dot--upcoming");
  });

  it("currentStep=3 时前 2 个圆点为 completed，第 3 个为 current", () => {
    const wrapper = mountProgress({ currentStep: 3 });
    const dots = wrapper.findAll(".setup-progress__dot");
    expect(dots[0].classes()).toContain("setup-progress__dot--completed");
    expect(dots[1].classes()).toContain("setup-progress__dot--completed");
    expect(dots[2].classes()).toContain("setup-progress__dot--current");
    expect(dots[3].classes()).toContain("setup-progress__dot--upcoming");
    expect(dots[4].classes()).toContain("setup-progress__dot--upcoming");
  });

  it("currentStep=5 时所有圆点为 completed（最后一个为 current）", () => {
    const wrapper = mountProgress({ currentStep: 5 });
    const dots = wrapper.findAll(".setup-progress__dot");
    expect(dots[0].classes()).toContain("setup-progress__dot--completed");
    expect(dots[1].classes()).toContain("setup-progress__dot--completed");
    expect(dots[2].classes()).toContain("setup-progress__dot--completed");
    expect(dots[3].classes()).toContain("setup-progress__dot--completed");
    expect(dots[4].classes()).toContain("setup-progress__dot--current");
  });

  // ------------------------------------------------------------------
  // 渲染：completed 圆点显示对勾
  // ------------------------------------------------------------------
  it("completed 圆点显示对勾 ✓", () => {
    const wrapper = mountProgress({ currentStep: 3 });
    const completedDot = wrapper.findAll(".setup-progress__dot")[0];
    expect(completedDot.find(".setup-progress__check").exists()).toBe(true);
    expect(completedDot.find(".setup-progress__check").text()).toBe("✓");
  });

  it("current/upcoming 圆点显示步骤序号", () => {
    const wrapper = mountProgress({ currentStep: 1 });
    const currentDot = wrapper.findAll(".setup-progress__dot")[0];
    expect(currentDot.find(".setup-progress__num").exists()).toBe(true);
    expect(currentDot.find(".setup-progress__num").text()).toBe("1");
  });

  // ------------------------------------------------------------------
  // 渲染：连接线状态
  // ------------------------------------------------------------------
  it("completed 步骤后的连接线为 completed 状态", () => {
    const wrapper = mountProgress({ currentStep: 3 });
    const lines = wrapper.findAll(".setup-progress__line");
    expect(lines[0].classes()).toContain("setup-progress__line--completed");
    expect(lines[1].classes()).toContain("setup-progress__line--completed");
    expect(lines[2].classes()).not.toContain("setup-progress__line--completed");
  });

  // ------------------------------------------------------------------
  // 边界处理：currentStep 越界自动 clamp
  // ------------------------------------------------------------------
  it("currentStep=0 时 clamp 到 1", () => {
    const wrapper = mountProgress({ currentStep: 0 });
    const dots = wrapper.findAll(".setup-progress__dot");
    expect(dots[0].classes()).toContain("setup-progress__dot--current");
  });

  it("currentStep>totalSteps 时 clamp 到 totalSteps", () => {
    const wrapper = mountProgress({ currentStep: 99 });
    const dots = wrapper.findAll(".setup-progress__dot");
    expect(dots[4].classes()).toContain("setup-progress__dot--current");
  });

  it("currentStep 为非数字时回退到 1", () => {
    const wrapper = mountProgress({ currentStep: Number.NaN });
    const dots = wrapper.findAll(".setup-progress__dot");
    expect(dots[0].classes()).toContain("setup-progress__dot--current");
  });

  // ------------------------------------------------------------------
  // 渲染：当前步骤文案
  // ------------------------------------------------------------------
  it("currentStep=3 时 currentStepText 包含 3 与 5", () => {
    const wrapper = mountProgress({ currentStep: 3 });
    const text = wrapper.find(".setup-progress__current").text();
    expect(text).toContain("3");
    expect(text).toContain("5");
  });

  it("currentStepLabel 不为空", () => {
    const wrapper = mountProgress({ currentStep: 1 });
    const label = wrapper.find(".setup-progress__label").text();
    expect(label).toBeTruthy();
    expect(label.length).toBeGreaterThan(0);
  });
});
