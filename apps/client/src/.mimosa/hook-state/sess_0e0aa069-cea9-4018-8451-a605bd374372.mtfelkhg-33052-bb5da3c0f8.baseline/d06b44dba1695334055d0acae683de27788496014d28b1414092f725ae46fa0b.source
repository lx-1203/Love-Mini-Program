import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

(globalThis as any).uni = {};

import MatchSuccess from "../../components/match/MatchSuccess.vue";
import type { MatchReason } from "../../types/match";

const stubs = {
  view: { template: '<div class="mock-view"><slot /></div>' },
  text: { template: '<span class="mock-text"><slot /></span>' },
  image: { template: '<img class="mock-image" />' },
};

const reasons: MatchReason[] = [
  { type: "common_interest", text: "摄影" },
  { type: "same_school", text: "同校" },
];

function mountSuccess() {
  return mount(MatchSuccess, {
    props: {
      myAvatar: "/static/assets/default-avatar.jpg",
      partnerAvatar: "/static/assets/default-avatar.jpg",
      partnerName: "林晓",
      reasons,
    },
    global: { plugins: [i18n], stubs },
  });
}

describe("MatchSuccess", () => {
  it("渲染双头像、关系建立理由与两个 CTA", () => {
    const wrapper = mountSuccess();
    expect(wrapper.findAll(".match-success__avatar")).toHaveLength(2);
    expect(wrapper.findAll(".match-success__reason-chip")).toHaveLength(2);
    expect(wrapper.text()).toContain("摄影");
    expect(wrapper.text()).toContain("同校");
    expect(wrapper.find(".match-success__primary").exists()).toBe(true);
    expect(wrapper.find(".match-success__secondary").exists()).toBe(true);
  });

  it("点击立即聊天/继续探索分别 emit", async () => {
    const wrapper = mountSuccess();
    await wrapper.find(".match-success__primary").trigger("tap");
    await wrapper.find(".match-success__secondary").trigger("tap");
    expect(wrapper.emitted("chat")).toBeTruthy();
    expect(wrapper.emitted("explore")).toBeTruthy();
  });
});