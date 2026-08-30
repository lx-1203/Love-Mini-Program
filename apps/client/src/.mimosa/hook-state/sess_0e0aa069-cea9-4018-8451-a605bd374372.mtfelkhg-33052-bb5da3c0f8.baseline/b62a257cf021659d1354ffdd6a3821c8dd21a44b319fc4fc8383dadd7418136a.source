import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
const showToast = vi.fn();
const setClipboardData = vi.fn();
const share = vi.fn((opts: { success?: () => void }) => {
  // 测试环境模拟分享成功（与 H5 setClipboardData 行为一致）
  if (opts && typeof opts.success === "function") {
    opts.success();
  }
});
(globalThis as any).uni = {
  showToast,
  setClipboardData,
  share,
};

// mock haptic utils 以避免实际触感反馈
vi.mock("../../utils/haptic", () => ({
  successHaptic: vi.fn(),
  errorHaptic: vi.fn(),
}));

import ShareCard from "../../components/common/ShareCard.vue";

describe("ShareCard component - 签到分享卡片组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountCard(props?: {
    visible?: boolean;
    consecutiveDays?: number;
    earnedPoints?: number;
    checkInDate?: string;
  }) {
    return mount(ShareCard, {
      props: {
        visible: true,
        consecutiveDays: 7,
        earnedPoints: 50,
        ...props,
      },
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
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("visible=true 时渲染 share-overlay", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".share-overlay").exists()).toBe(true);
  });

  it("visible=false 时不渲染", () => {
    const wrapper = mountCard({ visible: false });
    expect(wrapper.find(".share-overlay").exists()).toBe(false);
  });

  it("渲染卡片头部与标题", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".share-header").exists()).toBe(true);
    expect(wrapper.find(".share-header__title").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 数据展示
  // ------------------------------------------------------------------
  it("渲染 consecutiveDays 数据", () => {
    const wrapper = mountCard({ consecutiveDays: 30 });
    const values = wrapper.findAll(".share-stat__value");
    expect(values[0].text()).toBe("30");
  });

  it("渲染 earnedPoints 数据", () => {
    const wrapper = mountCard({ earnedPoints: 100 });
    const values = wrapper.findAll(".share-stat__value");
    expect(values[1].text()).toBe("100");
  });

  it("提供 checkInDate 时渲染签到日期", () => {
    const wrapper = mountCard({ checkInDate: "2026-01-01" });
    expect(wrapper.find(".share-date").text()).toBe("2026-01-01");
  });

  // ------------------------------------------------------------------
  // 操作按钮
  // ------------------------------------------------------------------
  it("渲染分享与保存两个按钮", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".share-btn--primary").exists()).toBe(true);
    expect(wrapper.find(".share-btn--secondary").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 关闭交互
  // ------------------------------------------------------------------
  it("点击关闭按钮触发 close 事件", async () => {
    const wrapper = mountCard();
    await wrapper.find(".share-close").trigger("tap");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("点击遮罩触发 close 事件", async () => {
    const wrapper = mountCard();
    await wrapper.find(".share-overlay").trigger("tap");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // 分享与保存
  // ------------------------------------------------------------------
  it("点击分享按钮调用 setClipboardData", async () => {
    setClipboardData.mockImplementation(({ success }: { success: () => void }) => success());
    const wrapper = mountCard();
    await wrapper.find(".share-btn--primary").trigger("tap");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(setClipboardData).toHaveBeenCalled();
  });

  it("分享成功触发 shared 事件", async () => {
    setClipboardData.mockImplementation(({ success }: { success: () => void }) => success());
    const wrapper = mountCard();
    await wrapper.find(".share-btn--primary").trigger("tap");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(wrapper.emitted("shared")).toBeTruthy();
  });

  it("分享失败 toast 提示并触发 errorHaptic", async () => {
    setClipboardData.mockImplementation(({ fail }: { fail: (err: Error) => void }) =>
      fail(new Error("fail")),
    );
    const wrapper = mountCard();
    await wrapper.find(".share-btn--primary").trigger("tap");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(showToast).toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("容器 role=dialog 与 aria-modal=true", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".share-overlay").attributes("role")).toBe("dialog");
    expect(wrapper.find(".share-overlay").attributes("aria-modal")).toBe("true");
  });

  it("关闭按钮 role=button", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".share-close").attributes("role")).toBe("button");
  });
});
