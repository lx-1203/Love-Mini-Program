import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import ActivityCard from "../../components/home/ActivityCard.vue";

describe("ActivityCard component - 活动卡片组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数：stub uni-app 原生组件（view/text/image）以便在 jsdom 中渲染
   */
  function mountCard(props?: {
    title?: string;
    time?: string;
    location?: string;
    status?: "open" | "ongoing" | "upcoming" | "closed";
    emoji?: string;
  }) {
    return mount(ActivityCard, {
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
  it("渲染 activity-card 容器", () => {
    const wrapper = mountCard({ title: "活动" });
    expect(wrapper.find(".activity-card").exists()).toBe(true);
  });

  it("渲染 activity-cover 与 activity-info 区块", () => {
    const wrapper = mountCard({ title: "活动" });
    expect(wrapper.find(".activity-cover").exists()).toBe(true);
    expect(wrapper.find(".activity-info").exists()).toBe(true);
  });

  it("role=article 表示文章语义", () => {
    const wrapper = mountCard({ title: "活动" });
    expect(wrapper.find(".activity-card").attributes("role")).toBe("article");
  });

  it("aria-label 不为空", () => {
    const wrapper = mountCard({ title: "篮球赛", time: "今晚 8 点", location: "体育馆" });
    expect(wrapper.find(".activity-card").attributes("aria-label")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // 渲染：title
  // ------------------------------------------------------------------
  it("title 正确渲染", () => {
    const wrapper = mountCard({ title: "校园马拉松" });
    expect(wrapper.find(".activity-title").text()).toBe("校园马拉松");
  });

  // ------------------------------------------------------------------
  // 渲染：time 与 location
  // ------------------------------------------------------------------
  it("提供 time 时渲染时间元信息", () => {
    const wrapper = mountCard({ title: "T", time: "今晚 8 点" });
    expect(wrapper.find(".activity-meta-item").exists()).toBe(true);
    expect(wrapper.find(".activity-meta-item").text()).toBe("今晚 8 点");
  });

  it("未提供 time 时不渲染时间元信息", () => {
    const wrapper = mountCard({ title: "T" });
    // activity-meta-item 仅在 time/location 提供时渲染
    const items = wrapper.findAll(".activity-meta-item");
    expect(items.length).toBe(0);
  });

  it("提供 location 时渲染地点元信息", () => {
    const wrapper = mountCard({ title: "T", location: "体育馆" });
    expect(wrapper.findAll(".activity-meta-item").length).toBe(1);
    expect(wrapper.find(".activity-meta-item").text()).toBe("体育馆");
  });

  it("同时提供 time 与 location 时渲染两条元信息", () => {
    const wrapper = mountCard({ title: "T", time: "今晚", location: "体育馆" });
    expect(wrapper.findAll(".activity-meta-item").length).toBe(2);
  });

  // ------------------------------------------------------------------
  // 渲染：status 状态徽章
  // ------------------------------------------------------------------
  it("提供 status 时渲染 activity-tag", () => {
    const wrapper = mountCard({ title: "T", status: "open" });
    expect(wrapper.find(".activity-tag").exists()).toBe(true);
  });

  it("未提供 status 时不渲染 activity-tag", () => {
    const wrapper = mountCard({ title: "T" });
    expect(wrapper.find(".activity-tag").exists()).toBe(false);
  });

  it("status=open 时 tag class 为 tag--brand", () => {
    const wrapper = mountCard({ title: "T", status: "open" });
    expect(wrapper.find(".activity-tag").classes()).toContain("tag--brand");
  });

  it("status=ongoing 时 tag class 为 tag--success", () => {
    const wrapper = mountCard({ title: "T", status: "ongoing" });
    expect(wrapper.find(".activity-tag").classes()).toContain("tag--success");
  });

  it("status 文案使用 i18n 翻译", () => {
    const wrapper = mountCard({ title: "T", status: "open" });
    expect(wrapper.find(".activity-tag-text").text()).toBeTruthy();
    expect(typeof wrapper.find(".activity-tag-text").text()).toBe("string");
  });

  it("activity-tag role=img", () => {
    const wrapper = mountCard({ title: "T", status: "open" });
    expect(wrapper.find(".activity-tag").attributes("role")).toBe("img");
  });

  // ------------------------------------------------------------------
  // 渲染：emoji 图标
  // ------------------------------------------------------------------
  it("提供 emoji 时渲染对应图标", () => {
    const wrapper = mountCard({ title: "T", emoji: "celebration.png" });
    expect(wrapper.find(".activity-emoji").exists()).toBe(true);
  });

  it("未提供 emoji 时使用默认 celebration 图标", () => {
    const wrapper = mountCard({ title: "T" });
    expect(wrapper.find(".activity-emoji").exists()).toBe(true);
  });

  it("未知 emoji 值时 fallback 到 celebration 图标", () => {
    const wrapper = mountCard({ title: "T", emoji: "unknown.png" });
    expect(wrapper.find(".activity-emoji").exists()).toBe(true);
  });
});
