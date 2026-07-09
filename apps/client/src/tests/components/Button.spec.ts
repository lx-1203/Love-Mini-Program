import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

// mock haptic 以避免触发真实振动
// 使用 vi.hoisted 确保 mock 函数在 vi.mock 工厂执行前已初始化
const { mockLightHaptic } = vi.hoisted(() => ({
  mockLightHaptic: vi.fn(),
}));
vi.mock("../../utils/haptic", () => ({
  lightHaptic: mockLightHaptic,
  mediumHaptic: vi.fn(),
  heavyHaptic: vi.fn(),
  successHaptic: vi.fn(),
}));

// stub global uni
(globalThis as any).uni = {
  vibrateShort: vi.fn(),
};

import Button from "../../components/common/Button.vue";
import Ripple from "../../components/common/Ripple.vue";

describe("Button component - ripple 动画", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text）以便在 jsdom 中渲染
   */
  function mountButton(props?: {
    variant?: any;
    size?: any;
    block?: boolean;
    loading?: boolean;
    disabled?: boolean;
    icon?: string;
    ripple?: boolean;
  }) {
    return mount(Button, {
      props,
      slots: { default: "按钮文本" },
      global: {
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // ripple 动画触发
  // ------------------------------------------------------------------
  it("点击触发 ripple 动画（ripple 元素出现）", async () => {
    const wrapper = mountButton();

    // 初始无 ripple 元素
    expect(wrapper.find(".ripple").exists()).toBe(false);

    // 点击按钮
    await wrapper.find(".btn").trigger("tap");

    // ripple 元素出现
    expect(wrapper.find(".ripple").exists()).toBe(true);
  });

  it("disabled 状态下点击不触发 ripple 动画", async () => {
    const wrapper = mountButton({ disabled: true });

    await wrapper.find(".btn").trigger("tap");

    expect(wrapper.find(".ripple").exists()).toBe(false);
  });

  it("loading 状态下点击不触发 ripple 动画", async () => {
    const wrapper = mountButton({ loading: true });

    await wrapper.find(".btn").trigger("tap");

    expect(wrapper.find(".ripple").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // ripple 动画持续时间和清除
  // ------------------------------------------------------------------
  it("ripple 动画在 duration（200ms）后自动清除", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountButton();

      await wrapper.find(".btn").trigger("tap");
      expect(wrapper.find(".ripple").exists()).toBe(true);

      // 快进 200ms（Button 传入 Ripple 的 duration，Task G2 调整为 200ms）
      vi.advanceTimersByTime(200);
      await nextTick();
      expect(wrapper.find(".ripple").exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("快速连续点击重置 ripple 定时器（防抖）", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountButton();

      // 第一次点击
      await wrapper.find(".btn").trigger("tap");
      expect(wrapper.find(".ripple").exists()).toBe(true);

      // 快进 120ms（未到 200ms）
      vi.advanceTimersByTime(120);
      await nextTick();
      expect(wrapper.find(".ripple").exists()).toBe(true);

      // 第二次点击：应重置定时器
      await wrapper.find(".btn").trigger("tap");
      vi.advanceTimersByTime(120);
      await nextTick();
      // 由于第二次点击重置了定时器，120ms 后 ripple 仍存在（未到 200ms）
      expect(wrapper.find(".ripple").exists()).toBe(true);

      // 再快进 80ms（总计时达 200ms），ripple 消失
      vi.advanceTimersByTime(80);
      await nextTick();
      expect(wrapper.find(".ripple").exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  // ------------------------------------------------------------------
  // tap 事件
  // ------------------------------------------------------------------
  it("点击触发 tap 事件", async () => {
    const wrapper = mountButton();
    await wrapper.find(".btn").trigger("tap");
    expect(wrapper.emitted("tap")).toBeTruthy();
    expect(wrapper.emitted("tap")!.length).toBe(1);
  });

  it("disabled 状态下点击不触发 tap 事件", async () => {
    const wrapper = mountButton({ disabled: true });
    await wrapper.find(".btn").trigger("tap");
    expect(wrapper.emitted("tap")).toBeFalsy();
  });

  it("loading 状态下点击不触发 tap 事件", async () => {
    const wrapper = mountButton({ loading: true });
    await wrapper.find(".btn").trigger("tap");
    expect(wrapper.emitted("tap")).toBeFalsy();
  });

  // ------------------------------------------------------------------
  // 坐标传递：handleTap 提取点击坐标传给 Ripple.start
  // ------------------------------------------------------------------
  it("handleTap 提取点击坐标传给 Ripple.start", async () => {
    const wrapper = mountButton();
    // 找到 Ripple 子组件实例并 spy 其暴露的 start 方法
    const rippleComp = wrapper.findComponent(Ripple);
    expect(rippleComp.exists()).toBe(true);
    // 通过 instance.exposed 暴露的对象 spy start 方法（保持原方法被调用）
    const exposed = (rippleComp.vm as any).$.exposed;
    expect(exposed).toBeTruthy();
    const startSpy = vi.spyOn(exposed, "start");

    // 触发带坐标的 tap 事件（mp-weixin @tap 的 e.detail = { x, y } 为页面坐标）
    await wrapper.find(".btn").trigger("tap", { detail: { x: 100, y: 200 } });

    // 验证 start 被调用时传入了坐标参数
    expect(startSpy).toHaveBeenCalledWith(100, 200);
  });

  it("changedTouches 路径：handleTap 从 e.changedTouches 提取坐标传给 start", async () => {
    const wrapper = mountButton();
    const rippleComp = wrapper.findComponent(Ripple);
    const exposed = (rippleComp.vm as any).$.exposed;
    const startSpy = vi.spyOn(exposed, "start");

    // H5 路径：e.changedTouches[0].clientX/Y
    await wrapper.find(".btn").trigger("tap", {
      changedTouches: [{ clientX: 250, clientY: 350 }],
    });

    expect(startSpy).toHaveBeenCalledWith(250, 350);
  });

  it("无坐标信息时 start 仍被调用（退化为容器中心）", async () => {
    const wrapper = mountButton();
    const rippleComp = wrapper.findComponent(Ripple);
    const exposed = (rippleComp.vm as any).$.exposed;
    const startSpy = vi.spyOn(exposed, "start");

    await wrapper.find(".btn").trigger("tap");

    // 未传坐标时，handleTap 以 (0, 0) 调用 start（start 内部会退化为容器中心）
    expect(startSpy).toHaveBeenCalledWith(0, 0);
  });

  // ------------------------------------------------------------------
  // 振动反馈
  // ------------------------------------------------------------------
  it("点击触发轻量振动反馈 lightHaptic", async () => {
    const wrapper = mountButton();
    await wrapper.find(".btn").trigger("tap");
    expect(mockLightHaptic).toHaveBeenCalledTimes(1);
  });

  it("disabled 状态下不触发振动反馈", async () => {
    const wrapper = mountButton({ disabled: true });
    await wrapper.find(".btn").trigger("tap");
    expect(mockLightHaptic).not.toHaveBeenCalled();
  });

  it("loading 状态下不触发振动反馈", async () => {
    const wrapper = mountButton({ loading: true });
    await wrapper.find(".btn").trigger("tap");
    expect(mockLightHaptic).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 渲染：variant / size / block
  // ------------------------------------------------------------------
  it("默认渲染 primary variant 和 md size", () => {
    const wrapper = mountButton();
    const btn = wrapper.find(".btn");
    expect(btn.classes()).toContain("btn--primary");
    expect(btn.classes()).toContain("btn--md");
  });

  it("block prop 添加 btn--block 类", () => {
    const wrapper = mountButton({ block: true });
    expect(wrapper.find(".btn").classes()).toContain("btn--block");
  });

  it("不同 variant 渲染对应类名", () => {
    const variants = ["secondary", "outline", "ghost", "wechat", "danger", "success", "romance"];
    for (const variant of variants) {
      const wrapper = mountButton({ variant: variant as any });
      expect(wrapper.find(".btn").classes()).toContain(`btn--${variant}`);
    }
  });

  it("不同 size 渲染对应类名", () => {
    const wrapper = mountButton({ size: "lg" as any });
    expect(wrapper.find(".btn").classes()).toContain("btn--lg");
  });

  // ------------------------------------------------------------------
  // 渲染：loading / icon
  // ------------------------------------------------------------------
  it("loading 状态渲染 spinner 并添加 btn--loading 类", () => {
    const wrapper = mountButton({ loading: true });
    expect(wrapper.find(".btn-spinner").exists()).toBe(true);
    expect(wrapper.find(".btn").classes()).toContain("btn--loading");
  });

  it("disabled 状态添加 btn--disabled 类", () => {
    const wrapper = mountButton({ disabled: true });
    expect(wrapper.find(".btn").classes()).toContain("btn--disabled");
  });

  it("icon prop 渲染图标文本", () => {
    const wrapper = mountButton({ icon: "❤" });
    expect(wrapper.find(".btn-icon").exists()).toBe(true);
    expect(wrapper.find(".btn-icon").text()).toBe("❤");
  });

  it("loading 状态下不渲染 icon", () => {
    const wrapper = mountButton({ icon: "❤", loading: true });
    expect(wrapper.find(".btn-icon").exists()).toBe(false);
  });

  it("slot 内容正确渲染", () => {
    const wrapper = mountButton();
    expect(wrapper.find(".btn-text").text()).toBe("按钮文本");
  });
});
