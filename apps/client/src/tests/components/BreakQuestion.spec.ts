import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

(globalThis as any).uni = {};

import BreakQuestion from "../../components/chat/BreakQuestion.vue";
import type { BreakQuestionItem } from "../../types/chat";

const stubs = {
  view: { template: '<div class="mock-view"><slot /></div>' },
  text: { template: '<span class="mock-text"><slot /></span>' },
};

const items: BreakQuestionItem[] = [
  {
    type: "common_interest",
    text: "你们都喜欢旅行",
    actionText: "如果现在可以旅行，你最想去哪？",
  },
  {
    type: "icebreaker",
    text: "推荐开场",
    actionText: "最近有遇到什么有趣的事吗？",
  },
];

describe("BreakQuestion", () => {
  it("渲染共同喜欢与推荐开场", () => {
    const wrapper = mount(BreakQuestion, {
      props: { items, loading: false },
      global: { plugins: [i18n], stubs },
    });
    expect(wrapper.findAll(".break-question__chip")).toHaveLength(2);
    expect(wrapper.find(".break-question__opener-text").text()).toContain("如果现在可以旅行");
  });

  it("点击开场 emit send actionText", async () => {
    const wrapper = mount(BreakQuestion, {
      props: { items, loading: false },
      global: { plugins: [i18n], stubs },
    });
    await wrapper.find(".break-question__opener").trigger("tap");
    expect(wrapper.emitted("send")![0]).toEqual(["如果现在可以旅行，你最想去哪？"]);
  });

  it("items 为空且非 loading 时不渲染", () => {
    const wrapper = mount(BreakQuestion, {
      props: { items: [], loading: false },
      global: { plugins: [i18n], stubs },
    });
    expect(wrapper.find(".break-question").exists()).toBe(false);
  });
});