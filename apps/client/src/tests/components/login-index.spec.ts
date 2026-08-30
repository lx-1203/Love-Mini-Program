import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive, ref } from "vue";
import { i18n } from "../../i18n";

/**
 * 登录页协议可见性回归测试（2026-08-14 缺陷修复）：
 *
 * 缺陷：用户协议/隐私政策勾选区原先只渲染在手机号登录表单（v-else 分支）内，
 * 微信快捷登录（默认首屏）没有「用户须知」勾选与协议链接可点，
 * 而 onWechatLogin 强制要求 agreed=true → 用户无法登录。
 *
 * 修复：terms-wrap 提升为 login-card 直接子节点，两种登录形态共用，
 * 默认快捷登录视图即可勾选协议。
 */

vi.mock("@dcloudio/uni-app", () => ({
  onShow: vi.fn(),
}));

vi.mock("../../stores/session", () => {
  const loginHero = ref(null);
  const loading = ref(false);
  const isLoggedIn = ref(false);
  return {
    useSessionStore: vi.fn(() =>
      reactive({
        loginHero,
        loading,
        isLoggedIn,
        loginWithWechat: vi.fn(),
        refreshSession: vi.fn(() => Promise.resolve()),
      })
    ),
  };
});

vi.mock("../../stores/app-config", () => ({
  useAppConfigStore: vi.fn(() =>
    reactive({
      isLoginOpen: ref(true),
      isRegisterOpen: ref(true),
    })
  ),
}));

vi.mock("../../services/auth", () => ({
  loginWithPhone: vi.fn(),
  registerUser: vi.fn(),
  loginAsGuest: vi.fn(),
}));

vi.mock("../../services/http", () => ({
  request: vi.fn(),
  setToken: vi.fn(),
  setRefreshToken: vi.fn(),
}));

vi.mock("../../utils/navigation", () => ({
  replaceAppPath: vi.fn(),
  consumePendingLoginRedirect: vi.fn(),
}));

vi.mock("../../services/sentry", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock("../../config/showcase", () => ({
  isShowcaseMode: false,
}));

vi.mock("../../config/env", () => ({
  isDev: false,
  isMockMode: () => true,
}));

vi.mock("../../utils/debounce", () => ({
  createButtonGuard: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("../../utils/haptic", () => ({
  lightHaptic: vi.fn(),
}));

vi.mock("../../services/api-error", () => ({
  AppApiError: class AppApiError extends Error {},
}));

import LoginIndex from "../../pages/login/index.vue";

function mountLogin() {
  return mount(LoginIndex, {
    global: {
      plugins: [i18n],
      stubs: {
        view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        image: { template: '<img class="mock-image" />', name: "uni-image" },
        input: { template: '<input class="mock-input" />', name: "uni-input" },
        button: { template: '<button class="mock-button"><slot /></button>', name: "uni-button" },
        label: { template: '<label class="mock-label"><slot /></label>', name: "uni-label" },
        picker: { template: '<view class="mock-picker"><slot /></view>', name: "uni-picker" },
      },
    },
  });
}

describe("登录页协议可见性（2026-08-14）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("默认微信快捷登录视图渲染用户协议勾选区（terms-wrap）", () => {
    const wrapper = mountLogin();
    // 默认 showPhoneLogin=false（快捷登录视图）
    expect(wrapper.find(".login-quick").exists()).toBe(true);
    expect(wrapper.find(".login-form").exists()).toBe(false);
    // 协议区必须在两种登录形态之外（login-card 直接子节点），快捷登录也可勾选
    expect(wrapper.find(".terms-wrap").exists()).toBe(true);
    expect(wrapper.find(".terms-link").exists()).toBe(true);
  });

  it("勾选协议后 checkbox 进入选中态", async () => {
    const wrapper = mountLogin();
    const checkbox = wrapper.find(".checkbox");
    expect(checkbox.classes()).not.toContain("checkbox--checked");
    await checkbox.trigger("tap");
    expect(wrapper.find(".checkbox").classes()).toContain("checkbox--checked");
  });

  it("切换到手机号登录后协议区仍然可见", async () => {
    const wrapper = mountLogin();
    // 手机号登录入口
    await wrapper.find(".btn-secondary").trigger("tap");
    expect(wrapper.find(".login-form").exists()).toBe(true);
    expect(wrapper.find(".terms-wrap").exists()).toBe(true);
  });

  it("协议区仅渲染一次（无重复勾选区）", () => {
    const wrapper = mountLogin();
    expect(wrapper.findAll(".terms-wrap").length).toBe(1);
  });
});
