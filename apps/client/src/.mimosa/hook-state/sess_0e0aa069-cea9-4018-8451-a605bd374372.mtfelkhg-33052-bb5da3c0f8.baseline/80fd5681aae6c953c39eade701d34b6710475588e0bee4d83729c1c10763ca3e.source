import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import SectionCard from "../../components/common/SectionCard.vue";

describe("SectionCard component - 区块卡片组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 挂载辅助函数
   */
  function mountCard(props?: {
    title?: string;
    subtitle?: string;
    compact?: boolean;
  }, slots?: { default?: string }) {
    return mount(SectionCard, {
      props: props ?? { title: "默认标题" },
      slots: slots ?? { default: '<div class="slot-content">内容</div>' },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 渲染：默认 props
  // ------------------------------------------------------------------
  it("渲染 title 文本", () => {
    const wrapper = mountCard({ title: "推荐话题" });
    expect(wrapper.find(".card__title").text()).toBe("推荐话题");
  });

  it("渲染 role=region 与 aria-label", () => {
    const wrapper = mountCard({ title: "热门活动" });
    const card = wrapper.find(".card");
    expect(card.attributes("role")).toBe("region");
    expect(card.attributes("aria-label")).toBe("热门活动");
  });

  // ------------------------------------------------------------------
  // subtitle 可选渲染
  // ------------------------------------------------------------------
  it("未提供 subtitle 时不渲染 subtitle 元素", () => {
    const wrapper = mountCard({ title: "无副标题" });
    expect(wrapper.find(".card__subtitle").exists()).toBe(false);
  });

  it("提供 subtitle 时渲染 subtitle 元素", () => {
    const wrapper = mountCard({ title: "推荐话题", subtitle: "更多话题请进入查看" });
    expect(wrapper.find(".card__subtitle").exists()).toBe(true);
    expect(wrapper.find(".card__subtitle").text()).toBe("更多话题请进入查看");
  });

  // ------------------------------------------------------------------
  // compact 紧凑模式
  // ------------------------------------------------------------------
  it("默认不添加 card--compact class", () => {
    const wrapper = mountCard({ title: "标题" });
    expect(wrapper.find(".card").classes()).not.toContain("card--compact");
  });

  it("compact=true 时添加 card--compact class", () => {
    const wrapper = mountCard({ title: "标题", compact: true });
    expect(wrapper.find(".card").classes()).toContain("card--compact");
  });

  // ------------------------------------------------------------------
  // 默认 slot 渲染
  // ------------------------------------------------------------------
  it("渲染 default slot 内容", () => {
    const wrapper = mountCard(
      { title: "标题" },
      { default: '<div class="custom-content">自定义内容</div>' }
    );
    expect(wrapper.find(".custom-content").exists()).toBe(true);
    expect(wrapper.find(".custom-content").text()).toBe("自定义内容");
  });
});
