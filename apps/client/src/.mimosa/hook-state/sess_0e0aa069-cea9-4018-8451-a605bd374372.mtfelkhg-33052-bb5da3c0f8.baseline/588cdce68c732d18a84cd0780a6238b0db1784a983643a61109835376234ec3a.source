import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

(globalThis as any).uni = {};

import MatchActions from "../../components/match/MatchActions.vue";

const stubs = {
  view: { template: '<div class="mock-view"><slot /></div>' },
  text: { template: '<span class="mock-text"><slot /></span>' },
  image: { template: '<img class="mock-image" />' },
};

function mountActions(props?: { disabled?: boolean; busy?: boolean }) {
  return mount(MatchActions, {
    props,
    global: { plugins: [i18n], stubs },
  });
}

describe("MatchActions", () => {
  it("渲染三枚动作按钮", () => {
    const wrapper = mountActions();
    expect(wrapper.findAll(".match-actions__item")).toHaveLength(3);
    expect(wrapper.text()).toContain("跳过");
    expect(wrapper.text()).toContain("打招呼");
    expect(wrapper.text()).toContain("喜欢");
  });

  it("点击跳过/超级喜欢/喜欢分别 emit", async () => {
    const wrapper = mountActions();
    const items = wrapper.findAll(".match-actions__item");
    await items[0].trigger("tap");
    await items[1].trigger("tap");
    await items[2].trigger("tap");

    expect(wrapper.emitted("pass")).toBeTruthy();
    expect(wrapper.emitted("superLike")).toBeTruthy();
    expect(wrapper.emitted("like")).toBeTruthy();
  });

  it("disabled 时不 emit", async () => {
    const wrapper = mountActions({ disabled: true });
    await wrapper.findAll(".match-actions__item")[0].trigger("tap");
    expect(wrapper.emitted("pass")).toBeFalsy();
  });
});