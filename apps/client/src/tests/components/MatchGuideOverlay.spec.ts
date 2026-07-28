import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import MatchGuideOverlay from "../../components/social/MatchGuideOverlay.vue";

describe("MatchGuideOverlay component - 匹配成功引导弹窗组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleIcebreakers = ["你最近在追什么剧？", "周末一般做什么？"];
  const sampleCircles = [
    { id: "1", name: "摄影圈", icon: "📷" },
    { id: "2", name: "篮球圈", icon: "🏀" },
  ];
  const sampleActivities = [
    { id: "a1", title: "周末户外徒步", scheduleText: "周六 09:00" },
  ];

  /**
   * 挂载辅助函数
   */
  function mountOverlay(props?: {
    partnerName?: string;
    partnerAvatar?: string;
    icebreakers?: string[];
    commonCircles?: Array<{ id: string; name: string; icon: string }>;
    activities?: Array<{ id: string; title: string; scheduleText: string }>;
    sessionId?: string;
  }) {
    return mount(MatchGuideOverlay, {
      props: {
        partnerName: "小明",
        partnerAvatar: "https://cdn.example.com/avatar.png",
        icebreakers: sampleIcebreakers,
        commonCircles: sampleCircles,
        activities: sampleActivities,
        sessionId: "session-123",
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
  it("渲染 mgo-overlay 容器", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".mgo-overlay").exists()).toBe(true);
  });

  it("渲染标题与副标题", () => {
    const wrapper = mountOverlay({ partnerName: "小红" });
    expect(wrapper.find(".mgo-title").exists()).toBe(true);
    expect(wrapper.find(".mgo-subtitle").exists()).toBe(true);
    expect(wrapper.find(".mgo-subtitle").text()).toContain("小红");
  });

  // ------------------------------------------------------------------
  // 破冰话题
  // ------------------------------------------------------------------
  it("提供 icebreakers 时渲染话题列表", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".mgo-section").exists()).toBe(true);
    const topics = wrapper.findAll(".mgo-topic-chip");
    expect(topics.length).toBe(2);
  });

  it("icebreakers 为空时不渲染话题区", () => {
    const wrapper = mountOverlay({ icebreakers: [] });
    // 仍有 commonCircles / activities 区块，但话题块不应渲染
    const sections = wrapper.findAll(".mgo-section");
    // 验证至少没有 topic-chip
    expect(wrapper.find(".mgo-topic-chip").exists()).toBe(false);
  });

  it("点击话题 chip 触发 select-icebreaker 事件", async () => {
    const wrapper = mountOverlay();
    const topic = wrapper.findAll(".mgo-topic-chip")[0];
    await topic.trigger("tap");
    expect(wrapper.emitted("select-icebreaker")).toBeTruthy();
    expect(wrapper.emitted("select-icebreaker")![0]).toEqual(["你最近在追什么剧？"]);
  });

  // ------------------------------------------------------------------
  // 共同兴趣圈
  // ------------------------------------------------------------------
  it("提供 commonCircles 时渲染兴趣圈 chip", () => {
    const wrapper = mountOverlay();
    const circles = wrapper.findAll(".mgo-circle-chip");
    expect(circles.length).toBe(2);
  });

  it("渲染兴趣圈名称与图标", () => {
    const wrapper = mountOverlay();
    const first = wrapper.findAll(".mgo-circle-chip")[0];
    expect(first.find(".mgo-circle-name").text()).toBe("摄影圈");
    expect(first.find(".mgo-circle-icon").text()).toBe("📷");
  });

  // ------------------------------------------------------------------
  // 推荐活动
  // ------------------------------------------------------------------
  it("提供 activities 时渲染活动项", () => {
    const wrapper = mountOverlay();
    const acts = wrapper.findAll(".mgo-activity-item");
    expect(acts.length).toBe(1);
  });

  it("渲染活动标题与时间", () => {
    const wrapper = mountOverlay();
    const act = wrapper.findAll(".mgo-activity-item")[0];
    expect(act.find(".mgo-activity-title").text()).toBe("周末户外徒步");
    expect(act.find(".mgo-activity-time").text()).toBe("周六 09:00");
  });

  // ------------------------------------------------------------------
  // 操作按钮
  // ------------------------------------------------------------------
  it("渲染主操作按钮与次操作按钮", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".mgo-btn--primary").exists()).toBe(true);
    expect(wrapper.find(".mgo-btn--ghost").exists()).toBe(true);
  });

  it("点击主按钮触发 start-chat 事件", async () => {
    const wrapper = mountOverlay();
    await wrapper.find(".mgo-btn--primary").trigger("tap");
    expect(wrapper.emitted("start-chat")).toBeTruthy();
  });

  it("点击次按钮触发 close 事件", async () => {
    const wrapper = mountOverlay();
    await wrapper.find(".mgo-btn--ghost").trigger("tap");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // 关闭交互
  // ------------------------------------------------------------------
  it("点击遮罩触发 close 事件", async () => {
    const wrapper = mountOverlay();
    await wrapper.find(".mgo-mask").trigger("tap");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("容器 role=dialog 与 aria-modal=true", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".mgo-overlay").attributes("role")).toBe("dialog");
    expect(wrapper.find(".mgo-overlay").attributes("aria-modal")).toBe("true");
  });

  it("话题 chip role=button", () => {
    const wrapper = mountOverlay();
    expect(wrapper.find(".mgo-topic-chip").attributes("role")).toBe("button");
  });
});
