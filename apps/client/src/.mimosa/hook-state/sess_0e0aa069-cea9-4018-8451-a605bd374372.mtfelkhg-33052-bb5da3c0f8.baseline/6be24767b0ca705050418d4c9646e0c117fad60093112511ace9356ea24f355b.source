import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import IcebreakerSuggestions from "../../components/chat/IcebreakerSuggestions.vue";

describe("IcebreakerSuggestions component - 破冰话题建议组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleItems = [
    { id: 1, content: "你最近在追什么剧？", category: "兴趣爱好", source: "common_interest" },
    { id: 2, content: "周末一般做什么？", category: "生活方式", source: "common_interest" },
    { id: 3, content: "喜欢什么运动？", category: "兴趣爱好", source: "common_interest" },
  ];

  /**
   * 挂载辅助函数
   */
  function mountComponent(props?: {
    items?: Array<{ id: number; content: string; category: string; source: string }>;
    loading?: boolean;
  }) {
    return mount(IcebreakerSuggestions, {
      props: {
        items: sampleItems,
        loading: false,
        ...props,
      },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          "scroll-view": {
            template: '<div class="mock-scroll-view"><slot /></div>',
            name: "uni-scroll-view",
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：基础场景
  // ------------------------------------------------------------------
  it("渲染 icebreaker-suggestions 容器", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".icebreaker-suggestions").exists()).toBe(true);
  });

  it("渲染标题行", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".icebreaker__header").exists()).toBe(true);
    expect(wrapper.find(".icebreaker__label").exists()).toBe(true);
  });

  it("渲染刷新按钮", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".icebreaker__refresh-btn").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 话题卡片列表
  // ------------------------------------------------------------------
  it("提供 items 时渲染所有话题卡片", () => {
    const wrapper = mountComponent();
    const cards = wrapper.findAll(".icebreaker__card");
    expect(cards.length).toBe(3);
  });

  it("话题卡片包含 category 与 content", () => {
    const wrapper = mountComponent();
    const firstCard = wrapper.findAll(".icebreaker__card")[0];
    expect(firstCard.find(".icebreaker__card-badge-text").text()).toBe("兴趣爱好");
    expect(firstCard.find(".icebreaker__card-content").text()).toBe("你最近在追什么剧？");
  });

  // ------------------------------------------------------------------
  // 加载态
  // ------------------------------------------------------------------
  it("loading=true 且 items 为空时渲染骨架屏", () => {
    const wrapper = mountComponent({ items: [], loading: true });
    expect(wrapper.find(".icebreaker__loading").exists()).toBe(true);
    expect(wrapper.findAll(".icebreaker__skeleton").length).toBe(3);
  });

  it("loading=true 且 items 非空时不渲染骨架屏", () => {
    const wrapper = mountComponent({ loading: true });
    expect(wrapper.find(".icebreaker__loading").exists()).toBe(false);
  });

  it("loading=true 时显示加载中文案", () => {
    const wrapper = mountComponent({ loading: true });
    expect(wrapper.find(".icebreaker__loading-hint").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 空态
  // ------------------------------------------------------------------
  it("loading=false 且 items 为空时渲染空态", () => {
    const wrapper = mountComponent({ items: [], loading: false });
    expect(wrapper.find(".icebreaker__empty").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // 交互事件
  // ------------------------------------------------------------------
  it("点击话题卡片触发 select 事件并传出 content", async () => {
    const wrapper = mountComponent();
    const cards = wrapper.findAll(".icebreaker__card");
    await cards[0].trigger("tap");
    expect(wrapper.emitted("select")).toBeTruthy();
    expect(wrapper.emitted("select")![0]).toEqual(["你最近在追什么剧？"]);
  });

  it("点击刷新按钮触发 refresh 事件", async () => {
    const wrapper = mountComponent();
    await wrapper.find(".icebreaker__refresh-btn").trigger("tap");
    expect(wrapper.emitted("refresh")).toBeTruthy();
    expect(wrapper.emitted("refresh")!.length).toBe(1);
  });

  // ------------------------------------------------------------------
  // 无障碍属性
  // ------------------------------------------------------------------
  it("话题卡片 role=button", () => {
    const wrapper = mountComponent();
    const card = wrapper.find(".icebreaker__card");
    expect(card.attributes("role")).toBe("button");
  });

  it("刷新按钮 role=button", () => {
    const wrapper = mountComponent();
    expect(wrapper.find(".icebreaker__refresh-btn").attributes("role")).toBe("button");
  });

  it("加载态 role=status 与 aria-live=polite", () => {
    const wrapper = mountComponent({ items: [], loading: true });
    const loading = wrapper.find(".icebreaker__loading");
    expect(loading.attributes("role")).toBe("status");
    expect(loading.attributes("aria-live")).toBe("polite");
  });
});
