import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { InterestCircleViewModel } from "../../view-models/home-dashboard";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import InterestRecommendation from "../../components/home/InterestRecommendation.vue";

const circles: InterestCircleViewModel[] = [
  { id: 1, name: "摄影社", icon: "📷", memberCount: 12000, joined: false },
  { id: 2, name: "露营圈", icon: "", memberCount: 8932, joined: true },
];

function mountFeed(props: { items: InterestCircleViewModel[]; loading?: boolean }) {
  return mount(InterestRecommendation, {
    props,
    global: {
      stubs: {
        view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        image: { template: '<img class="mock-image" />', name: "uni-image" },
        "scroll-view": { template: '<div class="mock-scroll-view"><slot /></div>', name: "uni-scroll-view" },
      },
    },
  });
}

describe("InterestRecommendation - MP-R2-PAGES-HOME-INDEX-111 空态分支", () => {
  it("loading 期间渲染骨架，不渲染空态块", () => {
    const wrapper = mountFeed({ items: [], loading: true });
    expect(wrapper.find(".skeleton").exists()).toBe(true);
    expect(wrapper.find(".interest-recommend__empty").exists()).toBe(false);
    expect(wrapper.findAll(".interest-card").length).toBe(0);
  });

  it("加载完成且 items 为空 → 渲染空态块（替代此前的空白横滑区）", () => {
    const wrapper = mountFeed({ items: [], loading: false });
    const empty = wrapper.find(".interest-recommend__empty");
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toBe("暂无兴趣圈");
    expect(wrapper.find(".skeleton").exists()).toBe(false);
    expect(wrapper.find(".interest-scroll").exists()).toBe(false);
  });

  it("有数据时渲染卡片列表，空态与骨架都不出现", () => {
    const wrapper = mountFeed({ items: circles, loading: false });
    expect(wrapper.findAll(".interest-card").length).toBe(2);
    expect(wrapper.find(".interest-recommend__empty").exists()).toBe(false);
    expect(wrapper.find(".skeleton").exists()).toBe(false);
  });

  it("loading 优先于数据（骨架分支时序不变）", () => {
    const wrapper = mountFeed({ items: circles, loading: true });
    expect(wrapper.find(".skeleton").exists()).toBe(true);
    expect(wrapper.find(".interest-recommend__empty").exists()).toBe(false);
  });
});
