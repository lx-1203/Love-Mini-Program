import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import HeartSignal from "../../components/chat/HeartSignal.vue";

describe("HeartSignal component - 心动信号卡片组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountSignal(props?: {
    title?: string;
    subtitle?: string;
    countdown?: string;
    count?: number;
  }) {
    return mount(HeartSignal, {
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
  it("渲染 heart-signal 容器", () => {
    const wrapper = mountSignal();
    expect(wrapper.find(".heart-signal").exists()).toBe(true);
  });

  it("渲染 signal-icon 容器", () => {
    const wrapper = mountSignal();
    expect(wrapper.find(".signal-icon").exists()).toBe(true);
  });

  it("渲染 signal-img 图标", () => {
    const wrapper = mountSignal();
    expect(wrapper.find(".signal-img").exists()).toBe(true);
  });

  it("渲染 signal-info 区块", () => {
    const wrapper = mountSignal();
    expect(wrapper.find(".signal-info").exists()).toBe(true);
  });

  it("role=button 表示可点击", () => {
    const wrapper = mountSignal();
    expect(wrapper.find(".heart-signal").attributes("role")).toBe("button");
  });

  it("aria-label 不为空", () => {
    const wrapper = mountSignal();
    expect(wrapper.find(".heart-signal").attributes("aria-label")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // 渲染：title 与 subtitle
  // ------------------------------------------------------------------
  it("提供 title 时使用自定义文案", () => {
    const wrapper = mountSignal({ title: "今日心动" });
    expect(wrapper.find(".signal-title").text()).toBe("今日心动");
  });

  it("未提供 title 时使用 i18n 默认文案", () => {
    const wrapper = mountSignal();
    const title = wrapper.find(".signal-title").text();
    expect(title).toBeTruthy();
    expect(typeof title).toBe("string");
    expect(title.length).toBeGreaterThan(0);
  });

  it("提供 subtitle 时使用自定义文案", () => {
    const wrapper = mountSignal({ subtitle: "还剩 3 小时" });
    expect(wrapper.find(".signal-sub").text()).toBe("还剩 3 小时");
  });

  it("未提供 subtitle 时使用 i18n 默认文案（含 count 插值）", () => {
    const wrapper = mountSignal({ count: 5 });
    const sub = wrapper.find(".signal-sub").text();
    expect(sub).toBeTruthy();
    expect(sub.length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // 渲染：countdown
  // ------------------------------------------------------------------
  it("提供 countdown 时渲染 signal-countdown", () => {
    const wrapper = mountSignal({ countdown: "02:30" });
    expect(wrapper.find(".signal-countdown").exists()).toBe(true);
    expect(wrapper.find(".signal-time").text()).toBe("02:30");
  });

  it("未提供 countdown 时不渲染 signal-countdown", () => {
    const wrapper = mountSignal();
    expect(wrapper.find(".signal-countdown").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击 emit tap 事件", async () => {
    const wrapper = mountSignal();
    await wrapper.find(".heart-signal").trigger("tap");
    expect(wrapper.emitted("tap")).toBeTruthy();
    expect(wrapper.emitted("tap")!.length).toBe(1);
  });

  it("连续点击多次 emit 多次 tap 事件", async () => {
    const wrapper = mountSignal();
    await wrapper.find(".heart-signal").trigger("tap");
    await wrapper.find(".heart-signal").trigger("tap");
    expect(wrapper.emitted("tap")!.length).toBe(2);
  });
});
