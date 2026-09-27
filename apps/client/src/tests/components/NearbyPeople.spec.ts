import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { NearbyPersonViewModel } from "../../view-models/home-dashboard";

// Stub global uni to avoid mp-weixin runtime references in tests
(globalThis as any).uni = {};

import NearbyPeople from "../../components/home/NearbyPeople.vue";

const people: NearbyPersonViewModel[] = [
  { userId: 11, name: "陈默", distanceText: "1.2km", avatarUrl: "/uploads/a.jpg", online: true, commonInterests: [] },
  { userId: 12, name: "夏野", distanceText: "3km", avatarUrl: "", online: false, commonInterests: [] },
];

function mountNearby(props: { items: NearbyPersonViewModel[]; loading?: boolean }) {
  return mount(NearbyPeople, {
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

describe("NearbyPeople - MP-R2-PAGES-HOME-INDEX-111 空态分支", () => {
  it("loading 且无数据 → 头像骨架，空态块不出现", () => {
    const wrapper = mountNearby({ items: [], loading: true });
    expect(wrapper.findAll(".nearby-item__avatar--skeleton").length).toBe(4);
    expect(wrapper.find(".nearby-people__empty").exists()).toBe(false);
  });

  it("加载完成且 items 为空 → 渲染空态块，底部人数条不再出现", () => {
    const wrapper = mountNearby({ items: [], loading: false });
    const empty = wrapper.find(".nearby-people__empty");
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toBe("附近暂时没有可匹配的人，去看看推荐吧");
    expect(wrapper.findAll(".nearby-item__avatar--skeleton").length).toBe(0);
    expect(wrapper.find(".nearby-people__bar").exists()).toBe(false);
  });

  it("有数据时渲染头像列表与真实人数条，空态不出现", () => {
    const wrapper = mountNearby({ items: people, loading: false });
    expect(wrapper.findAll(".nearby-item").length).toBe(2);
    expect(wrapper.find(".nearby-people__empty").exists()).toBe(false);
    expect(wrapper.find(".nearby-people__bar").text()).toContain("附近有 2 位值得认识的人");
  });

  it("loading 期间已有数据 → 列表照常渲染（骨架分支不误吞数据）", () => {
    const wrapper = mountNearby({ items: people, loading: true });
    expect(wrapper.findAll(".nearby-item").length).toBe(2);
    expect(wrapper.find(".nearby-people__empty").exists()).toBe(false);
  });
});
