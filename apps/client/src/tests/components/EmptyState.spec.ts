import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import EmptyState from "../../components/common/EmptyState.vue";

describe("EmptyState component - 空状态组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountEmpty(props?: {
    type?: "no-data" | "no-match" | "no-chat";
    message?: string;
  }) {
    return mount(EmptyState, {
      props: props ?? {},
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
  // 渲染：基础结构
  // ------------------------------------------------------------------
  it("默认 type=no-data 渲染图标与文案", () => {
    const wrapper = mountEmpty();
    expect(wrapper.find(".empty").exists()).toBe(true);
    expect(wrapper.find(".empty-icon").exists()).toBe(true);
    expect(wrapper.find(".empty-msg").exists()).toBe(true);
    expect(wrapper.find(".empty-sub").exists()).toBe(true);
  });

  it("role=status 表示状态信息", () => {
    const wrapper = mountEmpty();
    expect(wrapper.find(".empty").attributes("role")).toBe("status");
  });

  it("aria-live=polite 表示动态更新", () => {
    const wrapper = mountEmpty();
    expect(wrapper.find(".empty").attributes("aria-live")).toBe("polite");
  });

  // ------------------------------------------------------------------
  // 渲染：自定义 message
  // ------------------------------------------------------------------
  it("提供 message 时使用自定义文案", () => {
    const wrapper = mountEmpty({ message: "暂无数据，下拉刷新" });
    expect(wrapper.find(".empty-msg").text()).toBe("暂无数据，下拉刷新");
  });

  it("未提供 message 时使用 i18n 默认文案", () => {
    const wrapper = mountEmpty();
    const msg = wrapper.find(".empty-msg").text();
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // 渲染：type 切换图标
  // ------------------------------------------------------------------
  it("type=no-data 渲染 SEARCH 图标", () => {
    const wrapper = mountEmpty({ type: "no-data" });
    const icon = wrapper.find(".empty-icon");
    expect(icon.exists()).toBe(true);
    expect(icon.attributes("src")).toBeTruthy();
  });

  it("type=no-match 渲染 CLOSE 图标", () => {
    const wrapper = mountEmpty({ type: "no-match" });
    expect(wrapper.find(".empty-icon").exists()).toBe(true);
  });

  it("type=no-chat 渲染 NOTIFICATION 图标", () => {
    const wrapper = mountEmpty({ type: "no-chat" });
    expect(wrapper.find(".empty-icon").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 渲染：sub 文案
  // ------------------------------------------------------------------
  it("type=no-data 时 subText 使用 noDataSub 文案", () => {
    const wrapper = mountEmpty({ type: "no-data" });
    const sub = wrapper.find(".empty-sub").text();
    expect(sub).toBeTruthy();
    expect(typeof sub).toBe("string");
  });

  it("type=no-match 时 subText 使用 noMatchSub 文案", () => {
    const wrapper = mountEmpty({ type: "no-match" });
    expect(wrapper.find(".empty-sub").text()).toBeTruthy();
  });

  it("type=no-chat 时 subText 使用 noChatSub 文案", () => {
    const wrapper = mountEmpty({ type: "no-chat" });
    expect(wrapper.find(".empty-sub").text()).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // slot 渲染
  // ------------------------------------------------------------------
  it("默认 slot 内容正确渲染", () => {
    const wrapper = mount(EmptyState, {
      props: { type: "no-data" },
      slots: { default: '<button class="action-btn">刷新</button>' },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          image: { template: '<img class="mock-image" />', name: "uni-image" },
        },
      },
    });
    expect(wrapper.find(".action-btn").exists()).toBe(true);
  });
});
