import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
const showToast = vi.fn();
(globalThis as any).uni = { showToast };

// mock haptic
vi.mock("../../utils/haptic", () => ({
  lightHaptic: vi.fn(),
}));

// mock report-api 以避免实际网络请求
vi.mock("../../services/report-api", () => ({
  reportTarget: vi.fn().mockResolvedValue({ id: 1, success: true }),
}));

import PostReportDialog from "../../components/social/PostReportDialog.vue";

describe("PostReportDialog component - 帖子举报弹窗组件", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountDialog(props?: {
    visible?: boolean;
    postId?: string | number | null;
  }) {
    return mount(PostReportDialog, {
      props: {
        visible: true,
        postId: 100,
        ...props,
      },
      global: {
        plugins: [i18n, createPinia()],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          textarea: {
            template: '<textarea class="mock-textarea" />',
            name: "uni-textarea",
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("visible=true 时渲染 report-mask", () => {
    const wrapper = mountDialog();
    expect(wrapper.find(".report-mask").exists()).toBe(true);
  });

  it("visible=false 时不渲染", () => {
    const wrapper = mountDialog({ visible: false });
    expect(wrapper.find(".report-mask").exists()).toBe(false);
  });

  it("渲染弹窗主体 report-sheet", () => {
    const wrapper = mountDialog();
    expect(wrapper.find(".report-sheet").exists()).toBe(true);
  });

  it("渲染标题与描述", () => {
    const wrapper = mountDialog();
    expect(wrapper.find(".report-sheet__title").exists()).toBe(true);
    expect(wrapper.find(".report-sheet__desc").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 原因列表
  // ------------------------------------------------------------------
  it("渲染 7 个举报原因项", () => {
    const wrapper = mountDialog();
    expect(wrapper.findAll(".reason-item").length).toBe(7);
  });

  it("未选原因时所有 radio 为空", () => {
    const wrapper = mountDialog();
    const radios = wrapper.findAll(".reason-item__radio--on");
    expect(radios.length).toBe(0);
  });

  it("点击原因项高亮该项 radio", async () => {
    const wrapper = mountDialog();
    const items = wrapper.findAll(".reason-item");
    await items[0].trigger("tap");
    expect(items[0].classes()).toContain("reason-item--selected");
  });

  it("选中原因后 aria-checked=true", async () => {
    const wrapper = mountDialog();
    const items = wrapper.findAll(".reason-item");
    await items[0].trigger("tap");
    expect(items[0].attributes("aria-checked")).toBe("true");
  });

  // ------------------------------------------------------------------
  // 提交按钮状态
  // ------------------------------------------------------------------
  it("未选原因时提交按钮 disabled", () => {
    const wrapper = mountDialog();
    expect(wrapper.find(".report-btn--submit-disabled").exists()).toBe(true);
  });

  it("选中原因后提交按钮可点击", async () => {
    const wrapper = mountDialog();
    const items = wrapper.findAll(".reason-item");
    await items[0].trigger("tap");
    expect(wrapper.find(".report-btn--submit-disabled").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // 关闭交互
  // ------------------------------------------------------------------
  it("点击遮罩触发 close 与 update:visible=false", async () => {
    const wrapper = mountDialog();
    await wrapper.find(".report-mask").trigger("tap");
    expect(wrapper.emitted("close")).toBeTruthy();
    expect(wrapper.emitted("update:visible")).toBeTruthy();
    expect(wrapper.emitted("update:visible")![0]).toEqual([false]);
  });

  it("点击取消按钮触发 close", async () => {
    const wrapper = mountDialog();
    await wrapper.find(".report-btn--cancel").trigger("tap");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // 提交逻辑
  // ------------------------------------------------------------------
  it("选中原因后点击提交触发 submitted 事件", async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mountDialog();
      const items = wrapper.findAll(".reason-item");
      await items[0].trigger("tap");
      await wrapper.find(".report-btn--submit").trigger("tap");
      // 等待异步操作完成
      await Promise.resolve();
      await Promise.resolve();
      vi.advanceTimersByTime(500);
      expect(wrapper.emitted("submitted")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("postId 为空时 toast 提示并不提交", async () => {
    const wrapper = mountDialog({ postId: null });
    const items = wrapper.findAll(".reason-item");
    await items[0].trigger("tap");
    await wrapper.find(".report-btn--submit").trigger("tap");
    await Promise.resolve();
    expect(showToast).toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("容器 role=dialog 与 aria-modal=true", () => {
    const wrapper = mountDialog();
    expect(wrapper.find(".report-mask").attributes("role")).toBe("dialog");
    expect(wrapper.find(".report-mask").attributes("aria-modal")).toBe("true");
  });

  it("原因项 role=radio", () => {
    const wrapper = mountDialog();
    const items = wrapper.findAll(".reason-item");
    expect(items[0].attributes("role")).toBe("radio");
  });

  // ------------------------------------------------------------------
  // 描述长度限制
  // ------------------------------------------------------------------
  it("补充描述区显示字符计数", () => {
    const wrapper = mountDialog();
    expect(wrapper.find(".report-sheet__count").exists()).toBe(true);
    expect(wrapper.find(".report-sheet__count").text()).toContain("0");
    expect(wrapper.find(".report-sheet__count").text()).toContain("200");
  });
});
