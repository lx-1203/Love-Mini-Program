import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import Toast, { showToast, __resetToastState } from "../../components/common/Toast.vue";

describe("Toast component - 通知组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 Toast 模块级状态，避免前一个用例残留的 active=true
    // 让后续 showToast 调用进入队列分支，导致 type/options 不更新
    __resetToastState();
  });

  /**
   * 挂载辅助函数
   */
  function mountToast() {
    return mount(Toast, {
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
  // 默认渲染
  // ------------------------------------------------------------------
  it("未调用 showToast 时不渲染 toast", () => {
    const wrapper = mountToast();
    expect(wrapper.find(".toast-notification").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // showToast 触发渲染
  // ------------------------------------------------------------------
  it("showToast 调用后渲染 toast-notification", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountToast();
      showToast("操作成功", "success", 1000);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".toast-notification").exists()).toBe(true);
      expect(wrapper.find(".toast-notification__message").text()).toBe("操作成功");
    } finally {
      vi.useRealTimers();
    }
  });

  it("showToast 类型为 success 时添加 toast-notification--success class", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountToast();
      showToast("成功", "success", 1000);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".toast-notification").classes()).toContain("toast-notification--success");
    } finally {
      vi.useRealTimers();
    }
  });

  it("showToast 类型为 error 时添加 toast-notification--error class", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountToast();
      showToast("失败", "error", 1000);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".toast-notification").classes()).toContain("toast-notification--error");
    } finally {
      vi.useRealTimers();
    }
  });

  it("showToast 类型为 warning 时添加 toast-notification--warning class", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountToast();
      showToast("警告", "warning", 1000);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".toast-notification").classes()).toContain("toast-notification--warning");
    } finally {
      vi.useRealTimers();
    }
  });

  it("showToast 默认类型为 info 时添加 toast-notification--info class", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountToast();
      showToast("提示", "info", 1000);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".toast-notification").classes()).toContain("toast-notification--info");
    } finally {
      vi.useRealTimers();
    }
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("toast 渲染时包含 role=alert 与 aria-live=assertive", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountToast();
      showToast("提示", "info", 1000);
      await wrapper.vm.$nextTick();
      const toast = wrapper.find(".toast-notification");
      expect(toast.attributes("role")).toBe("alert");
      expect(toast.attributes("aria-live")).toBe("assertive");
    } finally {
      vi.useRealTimers();
    }
  });

  // ------------------------------------------------------------------
  // 自动隐藏
  // ------------------------------------------------------------------
  it("duration 后自动隐藏", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountToast();
      showToast("提示", "info", 1000);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".toast-notification").exists()).toBe(true);

      // 快进 1000ms 触发隐藏
      vi.advanceTimersByTime(1000);
      await wrapper.vm.$nextTick();
      // 进入 leaving 状态
      expect(wrapper.find(".toast-slide-out").exists()).toBe(true);

      // 快进 250ms 完成退出动画
      vi.advanceTimersByTime(300);
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".toast-notification").exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
