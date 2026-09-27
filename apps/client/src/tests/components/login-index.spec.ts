import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive, ref } from "vue";
import { i18n, t } from "../../i18n";
import zhCN from "../../i18n/locales/zh-CN";
import enUS from "../../i18n/locales/en-US";

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

  it("协议 checkbox 默认未勾选（合规）且点击可切换选中态", async () => {
    // 2026-08-30（commit 3157b7c）曾改默认勾选（agreed=ref(true)）；
    // 2026-09-24 R1 审计修复（commit 18c91ccf）改回默认不勾选——
    // 个人信息保护要求协议须用户主动勾选，不得默认同意（代码内各登录动作均有未勾选守卫）。
    const wrapper = mountLogin();
    const checkbox = wrapper.find(".checkbox");
    expect(checkbox.classes()).not.toContain("checkbox--checked");
    expect(checkbox.attributes("aria-checked")).toBe("false");
    await checkbox.trigger("tap");
    expect(wrapper.find(".checkbox").classes()).toContain("checkbox--checked");
    await checkbox.trigger("tap");
    expect(wrapper.find(".checkbox").classes()).not.toContain("checkbox--checked");
  });

  it("切换到手机号登录后协议区仍然可见", async () => {
    const wrapper = mountLogin();
    // 2026-09-02 R11（用户要求）：「手机号登录」手动入口按钮已删除，
    // 表单唯一入口 = 手机号快捷登录授权失败/取消时自动展开（handleGetPhoneNumber fallback）。
    // 模拟用户拒绝授权（errMsg 非 ok）触发展开，验证协议区在表单视图下仍然可见。
    await wrapper.find(".btn-phone-quick").trigger("getphonenumber", {
      detail: { errMsg: "getPhoneNumber:fail cancel" },
    });
    expect(wrapper.find(".login-form").exists()).toBe(true);
    expect(wrapper.find(".terms-wrap").exists()).toBe(true);
  });

  it("协议区仅渲染一次（无重复勾选区）", () => {
    const wrapper = mountLogin();
    expect(wrapper.findAll(".terms-wrap").length).toBe(1);
  });
});

/**
 * MP-R2VIS-PAGES-LOGIN-INDEX-007：快捷授权按钮与「验证码/密码」兜底入口曾取同值文案
 * （两键值都是「手机号登录」/ "Phone Login"），同屏两枚按钮无法区分。
 * 修法 = 两键分开命名（zh-CN / en-US 同批）+ 兜底入口样式弱化，不再复用快捷按钮样式。
 */
describe("手机号快捷登录与兜底入口的文案/样式区分（MP-R2VIS-PAGES-LOGIN-INDEX-007）", () => {
  function loginLocale(messages: unknown) {
    return (messages as { login: Record<string, string> }).login;
  }

  it("zh-CN 与 en-US 两键文案分开命名（配对同批）", () => {
    const zh = loginLocale(zhCN);
    const en = loginLocale(enUS);

    expect(zh.phoneQuickLogin).toContain("快捷");
    expect(zh.phoneLogin).toContain("验证码");
    expect(zh.phoneLogin).toContain("密码");
    expect(zh.phoneQuickLogin).not.toBe(zh.phoneLogin);

    expect(en.phoneQuickLogin.toLowerCase()).toContain("quick");
    expect(en.phoneLogin.toLowerCase()).toContain("code");
    expect(en.phoneLogin.toLowerCase()).toContain("password");
    expect(en.phoneQuickLogin).not.toBe(en.phoneLogin);
  });

  it("两枚按钮渲染不同文案，且 aria-label 与可见文本同键", () => {
    const wrapper = mountLogin();
    const quick = wrapper.find(".btn-phone-quick");
    const fallback = wrapper.find(".login-sms-fallback");
    const formEntry = wrapper.find(".login-phone-entry");

    expect(quick.text()).toBe(t("login.phoneQuickLogin"));
    expect(quick.attributes("aria-label")).toBe(t("login.phoneQuickLogin"));
    expect(fallback.text()).toBe(t("login.phoneLogin"));
    expect(fallback.attributes("aria-label")).toBe(t("login.phoneLogin"));
    expect(formEntry.text()).toBe(t("login.phoneLogin"));
    expect(formEntry.attributes("aria-label")).toBe(t("login.phoneLogin"));
    expect(quick.text()).not.toBe(fallback.text());
  });

  it("兜底入口不复用快捷登录按钮样式（.btn-phone-quick 仅快捷授权一枚）", () => {
    const wrapper = mountLogin();
    expect(wrapper.findAll(".btn-phone-quick").length).toBe(1);
    expect(wrapper.find(".btn-phone-quick").attributes("open-type")).toBe("getPhoneNumber");
    expect(wrapper.find(".login-sms-fallback").classes()).not.toContain("btn-phone-quick");
    expect(wrapper.find(".login-phone-entry").classes()).not.toContain("btn-phone-quick");
  });
});
