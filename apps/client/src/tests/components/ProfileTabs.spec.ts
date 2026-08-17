import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../i18n";

(globalThis as any).uni = {};

import ProfileTabs from "../../components/profile/ProfileTabs.vue";

describe("ProfileTabs - 个人主页双 Tab 切换器（2026-08-14 主页重构）", () => {
  function mountTabs(active: "about" | "posts" = "about") {
    return mount(ProfileTabs, {
      props: { active },
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        },
      },
    });
  }

  it("渲染两个 Tab（资料 / 动态）", () => {
    const wrapper = mountTabs();
    const items = wrapper.findAll(".profile-tabs__item");
    expect(items.length).toBe(2);
    expect(items[0]!.text()).toBe("资料");
    expect(items[1]!.text()).toBe("动态");
  });

  it("active=about 时资料 Tab 高亮", () => {
    const wrapper = mountTabs("about");
    expect(wrapper.findAll(".profile-tabs__item")[0]!.classes()).toContain("profile-tabs__item--active");
    expect(wrapper.findAll(".profile-tabs__item")[1]!.classes()).not.toContain("profile-tabs__item--active");
  });

  it("active=posts 时动态 Tab 高亮", () => {
    const wrapper = mountTabs("posts");
    expect(wrapper.findAll(".profile-tabs__item")[1]!.classes()).toContain("profile-tabs__item--active");
  });

  it("点击资料 Tab emit change('about')", async () => {
    const wrapper = mountTabs("posts");
    await wrapper.findAll(".profile-tabs__item")[0]!.trigger("tap");
    expect(wrapper.emitted("change")).toBeTruthy();
    expect(wrapper.emitted("change")![0]).toEqual(["about"]);
  });

  it("点击动态 Tab emit change('posts')", async () => {
    const wrapper = mountTabs("about");
    await wrapper.findAll(".profile-tabs__item")[1]!.trigger("tap");
    expect(wrapper.emitted("change")![0]).toEqual(["posts"]);
  });

  it("容器带 role=tablist 与 aria-label", () => {
    const wrapper = mountTabs();
    expect(wrapper.find(".profile-tabs").attributes("role")).toBe("tablist");
    expect(wrapper.find(".profile-tabs").attributes("aria-label")).toBeTruthy();
  });
});
