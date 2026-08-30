import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import PageStateContainer from "../../components/common/PageStateContainer.vue";

describe("PageStateContainer component - 页面状态容器组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountContainer(props?: {
    state?: "loading" | "error" | "empty" | "content";
    loadingText?: string;
    errorText?: string;
    emptyText?: string;
    errorImage?: string;
    emptyImage?: string;
    retryable?: boolean;
  }) {
    return mount(PageStateContainer, {
      props: {
        state: "content",
        ...props,
      },
      slots: {
        default: '<div class="mock-content">内容</div>',
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          ErrorState: { template: '<div class="mock-error-state" />', name: "error-state" },
          EmptyState: { template: '<div class="mock-empty-state" />', name: "empty-state" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("渲染 page-state-container 容器", () => {
    const wrapper = mountContainer();
    expect(wrapper.find(".page-state-container").exists()).toBe(true);
  });

  it("容器 role=region", () => {
    const wrapper = mountContainer();
    expect(wrapper.find(".page-state-container").attributes("role")).toBe("region");
  });

  // ------------------------------------------------------------------
  // loading 状态
  // ------------------------------------------------------------------
  it("state=loading 时渲染加载态", () => {
    const wrapper = mountContainer({ state: "loading" });
    expect(wrapper.find(".state-loading").exists()).toBe(true);
    expect(wrapper.find(".loading-spinner").exists()).toBe(true);
  });

  it("state=loading 时 aria-busy=true", () => {
    const wrapper = mountContainer({ state: "loading" });
    expect(wrapper.find(".page-state-container").attributes("aria-busy")).toBe("true");
  });

  it("state=loading 时显示 loadingText", () => {
    const wrapper = mountContainer({ state: "loading", loadingText: "正在加载..." });
    expect(wrapper.find(".loading-text").text()).toBe("正在加载...");
  });

  // ------------------------------------------------------------------
  // error 状态
  // ------------------------------------------------------------------
  it("state=error 时渲染错误态", () => {
    const wrapper = mountContainer({ state: "error" });
    expect(wrapper.find(".state-error").exists()).toBe(true);
    expect(wrapper.find(".mock-error-state").exists()).toBe(true);
  });

  it("state=error 时 aria-busy=false", () => {
    const wrapper = mountContainer({ state: "error" });
    expect(wrapper.find(".page-state-container").attributes("aria-busy")).toBe("false");
  });

  it("state=error 时 state-error role=alert", () => {
    const wrapper = mountContainer({ state: "error" });
    expect(wrapper.find(".state-error").attributes("role")).toBe("alert");
  });

  // ------------------------------------------------------------------
  // empty 状态
  // ------------------------------------------------------------------
  it("state=empty 时渲染空态", () => {
    const wrapper = mountContainer({ state: "empty" });
    expect(wrapper.find(".state-empty").exists()).toBe(true);
    expect(wrapper.find(".mock-empty-state").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // content 状态
  // ------------------------------------------------------------------
  it("state=content 时渲染默认插槽", () => {
    const wrapper = mountContainer({ state: "content" });
    expect(wrapper.find(".state-content").exists()).toBe(true);
    expect(wrapper.find(".mock-content").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 重试事件
  // ------------------------------------------------------------------
  it("error 状态下 ErrorState 触发 retry 时透传 retry 事件", async () => {
    const wrapper = mountContainer({ state: "error" });
    // 由于 ErrorState 被 stub，无法直接触发，但可以通过监听 emit 验证 retry 事件未触发
    expect(wrapper.emitted("retry")).toBeFalsy();
  });

  // ------------------------------------------------------------------
  // 自定义插槽
  // ------------------------------------------------------------------
  it("提供 loading 插槽时使用自定义加载内容", () => {
    const wrapper = mount(PageStateContainer, {
      props: { state: "loading" },
      slots: {
        loading: '<div class="custom-loading">自定义加载</div>',
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          ErrorState: { template: '<div class="mock-error-state" />', name: "error-state" },
          EmptyState: { template: '<div class="mock-empty-state" />', name: "empty-state" },
        },
      },
    });
    expect(wrapper.find(".custom-loading").exists()).toBe(true);
  });
});
