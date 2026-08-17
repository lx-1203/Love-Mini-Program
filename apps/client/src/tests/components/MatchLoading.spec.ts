import { describe, expect, it, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

(globalThis as any).uni = {};

import MatchLoading from "../../components/match/MatchLoading.vue";

const stubs = {
  view: { template: '<div class="mock-view"><slot /></div>' },
  text: { template: '<span class="mock-text"><slot /></span>' },
  image: { template: '<img class="mock-image" />' },
};

function mountLoading() {
  return mount(MatchLoading, {
    props: {
      myAvatar: "/static/assets/default-avatar.jpg",
      partnerAvatar: "/static/assets/default-avatar.jpg",
      partnerName: "林晓",
    },
    global: { plugins: [i18n], stubs },
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("MatchLoading", () => {
  it("渲染双方头像与匹配提示", () => {
    const wrapper = mountLoading();
    expect(wrapper.findAll(".match-loading__avatar")).toHaveLength(2);
    expect(wrapper.text()).toContain("林晓");
  });

  it("animationend 后触发 finished", async () => {
    const wrapper = mountLoading();
    await wrapper.find(".match-loading__heart").trigger("animationend");
    expect(wrapper.emitted("finished")).toBeTruthy();
  });

  it("动画兜底定时器触发 finished", () => {
    vi.useFakeTimers();
    const wrapper = mountLoading();
    vi.advanceTimersByTime(2600);
    expect(wrapper.emitted("finished")).toBeTruthy();
  });
});