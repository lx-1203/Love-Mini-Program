import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "../../i18n";

/**
 * 设置页分组收敛契约测试（2026-08-14 主页功能入口下沉）：
 * - 社交资产分组渲染（任务中心/交友币/我的圈子/恋爱咨询/我的动态/访客/浏览历史/相册/校园认证/课表）
 * - 隐私安全分组渲染
 * - 底部「关于 + 退出登录」保留
 */

vi.mock("../../services/api", () => ({
  clientApi: {
    logout: vi.fn(),
    getSession: vi.fn(),
    getAppConfig: vi.fn(),
    getThemeSetting: vi.fn(),
    updateThemeSetting: vi.fn(),
    getDndSetting: vi.fn(),
  },
}));

vi.mock("../../utils/navigation", () => ({
  switchTabWithQuery: vi.fn(),
}));

import SettingsIndex from "../../pages/settings/index.vue";

function mountSettings() {
  return mount(SettingsIndex, {
    global: {
      plugins: [i18n],
      stubs: {
        view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        image: { template: '<img class="mock-image" />', name: "uni-image" },
        switch: { template: '<view class="mock-switch" />', name: "uni-switch" },
      },
    },
  });
}

describe("设置页分组收敛（2026-08-14）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("渲染社交资产分组（主页功能入口收敛）", () => {
    const wrapper = mountSettings();
    const titles = wrapper.findAll(".section__title-text").map((n) => n.text());
    expect(titles.some((t) => t.includes("社交资产"))).toBe(true);
    const labels = wrapper.findAll(".menu-item__label").map((n) => n.text());
    for (const expected of ["任务中心", "交友币", "我的圈子", "我的动态", "访客记录", "我的相册", "恋爱认证"]) {
      expect(labels, `应包含入口 ${expected}`).toContain(expected);
    }
  });

  it("渲染隐私安全分组", () => {
    const wrapper = mountSettings();
    const labels = wrapper.findAll(".menu-item__label").map((n) => n.text());
    expect(labels).toContain("隐私权限设置");
    expect(labels).toContain("安全中心");
  });

  it("保留关于与退出登录", () => {
    const wrapper = mountSettings();
    const labels = wrapper.findAll(".menu-item__label").map((n) => n.text());
    expect(labels.some((l) => l.includes("关于"))).toBe(true);
    expect(wrapper.find(".logout-btn").exists()).toBe(true);
  });
});
