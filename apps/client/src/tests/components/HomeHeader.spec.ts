import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import HomeHeader from "../../components/home/HomeHeader.vue";
import { useMessagesStore } from "../../stores/messages";

describe("HomeHeader component - 首页头部组件", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    vi.clearAllMocks();
    // 2026-09-03 组件演进：通知角标改为真实未读通知数驱动（useMessagesStore），
    // 挂载前必须提供激活的 Pinia 实例（原静态演示值 "6" 已移除）。
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function mountHeader(props?: { subtitle?: string; school?: string; locationText?: string }) {
    // 预置 6 条未读通知：保持「通知铃铛带未读角标」断言语义不变
    // （2026-09-03 起角标数值 = messages store 真实未读通知数，0 时隐藏）。
    const messagesStore = useMessagesStore();
    messagesStore.notifications = Array.from({ length: 6 }, (_, i) => ({
      id: `notification-${i + 1}`,
      type: "system",
      title: `通知 ${i + 1}`,
      content: `通知内容 ${i + 1}`,
      isRead: false,
      createdAt: new Date().toISOString(),
      actionUrl: null,
      triggerUserId: null,
      resourceId: null,
      signalType: "SOCIAL",
    })) as any;

    return mount(HomeHeader, {
      props: props ?? {},
      global: {
        plugins: [i18n, pinia],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          image: { template: '<img class="mock-image" />', name: "uni-image" },
        },
      },
    });
  }

  it("渲染 home-header 容器", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".home-header").exists()).toBe(true);
  });

  it("渲染 header-left 与 header-right 区块", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-left").exists()).toBe(true);
    expect(wrapper.find(".header-right").exists()).toBe(true);
  });

  it("渲染定位胶囊与通知铃铛", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-location").exists()).toBe(true);
    expect(wrapper.findAll(".header-icon").length).toBe(1);
  });

  it("通知铃铛带未读角标", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-icon").text()).toContain("6");
  });

  it("提供 locationText 时显示定位文案", () => {
    const wrapper = mountHeader({ locationText: "清华大学 · 2km" });
    expect(wrapper.find(".header-location__text").text()).toBe("清华大学 · 2km");
  });

  it("未提供 locationText 时回退 school 文案", () => {
    const wrapper = mountHeader({ school: "清华大学" });
    expect(wrapper.find(".header-location__text").text()).toBe("清华大学");
  });

  it("header-location role=button 且 aria-label 非空", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".header-location").attributes("role")).toBe("button");
    expect(wrapper.find(".header-location").attributes("aria-label")).toBeTruthy();
  });

  it("header-icon role=button 且 aria-label 非空", () => {
    const wrapper = mountHeader();
    const icon = wrapper.find(".header-icon");
    expect(icon.attributes("role")).toBe("button");
    expect(icon.attributes("aria-label")).toBeTruthy();
  });

  it("点击定位胶囊 emit schoolTap 事件", async () => {
    const wrapper = mountHeader();
    await wrapper.find(".header-location").trigger("tap");
    expect(wrapper.emitted("schoolTap")).toBeTruthy();
    expect(wrapper.emitted("schoolTap")!.length).toBe(1);
  });

  it("点击通知图标 emit notifyTap 事件", async () => {
    const wrapper = mountHeader();
    await wrapper.find(".header-icon").trigger("tap");
    expect(wrapper.emitted("notifyTap")).toBeTruthy();
    expect(wrapper.emitted("notifyTap")!.length).toBe(1);
  });

  it("副标题使用默认文案", () => {
    const wrapper = mountHeader();
    expect(wrapper.find(".home-header__subtitle").text()).toBe("发现今天值得遇见的人");
  });
});
