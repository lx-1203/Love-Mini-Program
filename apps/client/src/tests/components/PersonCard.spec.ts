import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import PersonCard from "../../components/home/PersonCard.vue";

describe("PersonCard component - 推荐人物卡片组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountCard(props?: {
    id?: string;
    name?: string;
    initials?: string;
    avatarUrl?: string;
    headline?: string;
    isSameSchool?: boolean;
    isSameMajor?: boolean;
    commonCircleCount?: number;
    actionText?: string;
  }) {
    return mount(PersonCard, {
      props: {
        name: "小明",
        headline: "热爱生活",
        ...props,
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          Avatar: { template: '<div class="mock-avatar" />', name: "avatar" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("渲染 person-card 容器", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".person-card").exists()).toBe(true);
  });

  it("渲染 name 文本", () => {
    const wrapper = mountCard({ name: "小红" });
    expect(wrapper.find(".person-name").text()).toBe("小红");
  });

  it("渲染 headline 文本", () => {
    const wrapper = mountCard({ headline: "热爱摄影" });
    expect(wrapper.find(".person-headline").text()).toBe("热爱摄影");
  });

  it("未提供 headline 时不渲染 headline 元素", () => {
    const wrapper = mountCard({ headline: undefined });
    expect(wrapper.find(".person-headline").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // 标签渲染
  // ------------------------------------------------------------------
  it("isSameSchool=true 时渲染同校标签", () => {
    const wrapper = mountCard({ isSameSchool: true });
    expect(wrapper.find(".person-tag--school").exists()).toBe(true);
  });

  it("isSameSchool=false 时不渲染同校标签", () => {
    const wrapper = mountCard({ isSameSchool: false });
    expect(wrapper.find(".person-tag--school").exists()).toBe(false);
  });

  it("isSameMajor=true 时渲染同专业标签", () => {
    const wrapper = mountCard({ isSameMajor: true });
    expect(wrapper.find(".person-tag--major").exists()).toBe(true);
  });

  it("commonCircleCount > 0 时渲染共同圈子标签", () => {
    const wrapper = mountCard({ commonCircleCount: 3 });
    expect(wrapper.find(".person-tag--circle").exists()).toBe(true);
  });

  it("commonCircleCount = 0 时不渲染共同圈子标签", () => {
    const wrapper = mountCard({ commonCircleCount: 0 });
    expect(wrapper.find(".person-tag--circle").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // 操作按钮
  // ------------------------------------------------------------------
  it("提供 actionText 时渲染自定义按钮文案", () => {
    const wrapper = mountCard({ actionText: "打招呼" });
    expect(wrapper.find(".person-action-text").text()).toBe("打招呼");
  });

  it("未提供 actionText 时使用默认按钮文案", () => {
    const wrapper = mountCard();
    const text = wrapper.find(".person-action-text").text();
    expect(text.length).toBeGreaterThan(0);
  });

  it("isSameSchool=true 时头像添加 halo class", () => {
    const wrapper = mountCard({ isSameSchool: true });
    expect(wrapper.find(".person-avatar").classes()).toContain("person-avatar--halo");
  });

  // ------------------------------------------------------------------
  // 点击交互
  // ------------------------------------------------------------------
  it("点击卡片触发 tap 事件", async () => {
    const wrapper = mountCard();
    await wrapper.find(".person-card").trigger("tap");
    expect(wrapper.emitted("tap")).toBeTruthy();
    expect(wrapper.emitted("tap")!.length).toBe(1);
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("容器 role=button", () => {
    const wrapper = mountCard();
    expect(wrapper.find(".person-card").attributes("role")).toBe("button");
  });
});
