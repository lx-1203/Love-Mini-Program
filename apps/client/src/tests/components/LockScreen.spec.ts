import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import LockScreen from "../../components/common/LockScreen.vue";
import { i18n } from "../../i18n";
import { useSessionStore } from "../../stores/session";

// mock navigation utility – factory must be inline for hoisting
// 保留其他真实导出（session store 依赖链可能引用），仅替换 LockScreen 使用的方法
vi.mock("../../utils/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/navigation")>();
  return {
    ...actual,
    openAppPath: vi.fn(),
    replaceAppPath: vi.fn(),
    isTabPath: vi.fn(() => false),
    setPendingLoginRedirect: vi.fn(),
  };
});

// compat 模块被 config/env.ts（getDevApiBaseUrl）等依赖链引用，
// 仅替换 getCurrentPagePath（jsdom 下固定返回空串，保证 isTabHost=false 分支稳定）
vi.mock("../../compat", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../compat")>();
  return { ...actual, getCurrentPagePath: vi.fn(() => "") };
});

import { openAppPath, replaceAppPath, setPendingLoginRedirect } from "../../utils/navigation";

describe("LockScreen component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** 设置会话登录态（userSession.loggedIn） */
  function setLoggedIn(loggedIn: boolean) {
    const sessionStore = useSessionStore();
    sessionStore.userSession = loggedIn
      ? ({ loggedIn: true } as unknown as typeof sessionStore.userSession)
      : null;
  }

  // mount helper with uni-app element stubs
  function mountLockScreen(props?: { completionPercent?: number }) {
    return mount(LockScreen, {
      props: props ?? {},
      global: {
        plugins: [i18n],
        stubs: {
          view: {
            template: '<div class="mock-view"><slot /></div>',
            name: "uni-view",
          },
          text: {
            template: '<span class="mock-text"><slot /></span>',
            name: "uni-text",
          },
          button: {
            template:
              '<button class="mock-button" @click="$emit(\'tap\')"><slot /></button>',
            name: "uni-button",
            emits: ["tap"],
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // 分级文案：未登录 vs 已登录未完善
  // ------------------------------------------------------------------
  it("renders login-focused copy when logged out", () => {
    const wrapper = mountLockScreen();

    expect(wrapper.find(".lock-screen__title").text()).toBe("登录后解锁完整交友功能");
    expect(wrapper.find(".lock-screen__subtitle").text()).toContain(
      "完成登录授权与基础资料填写"
    );
    expect(wrapper.find(".lock-screen__btn-text").text()).toBe("立即登录并完善");
  });

  it("renders profile-completion copy when logged in", () => {
    setLoggedIn(true);
    const wrapper = mountLockScreen();

    expect(wrapper.find(".lock-screen__title").text()).toBe(
      "完善资料，解锁完整交友功能"
    );
    expect(wrapper.find(".lock-screen__subtitle").text()).toContain(
      "完成基础资料填写"
    );
    expect(wrapper.find(".lock-screen__btn-text").text()).toBe("立即完善");
  });

  // ------------------------------------------------------------------
  // 未登录：主按钮先登录，登录成功后自动进资料完善
  // ------------------------------------------------------------------
  it("logged out: primary button sets pending redirect and goes to login", async () => {
    const wrapper = mountLockScreen();

    await wrapper.find(".lock-screen__btn").trigger("tap");

    expect(setPendingLoginRedirect).toHaveBeenCalledWith(
      "/subpackages/setup/profile/index"
    );
    expect(replaceAppPath).toHaveBeenCalledWith("/pages/login/index");
    expect(openAppPath).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 已登录：主按钮直接进资料完善页
  // ------------------------------------------------------------------
  it("logged in: primary button goes to profile setup directly", async () => {
    setLoggedIn(true);
    const wrapper = mountLockScreen();

    await wrapper.find(".lock-screen__btn").trigger("tap");

    expect(openAppPath).toHaveBeenCalledWith("/subpackages/setup/profile/index");
    expect(setPendingLoginRedirect).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 完善进度（已登录 + 进度 > 0 时展示，支持继续完善）
  // ------------------------------------------------------------------
  it("shows completion percent when logged in and percent provided", () => {
    setLoggedIn(true);
    const wrapper = mountLockScreen({ completionPercent: 66 });

    expect(wrapper.find(".lock-screen__progress").text()).toContain("66%");
  });

  it("hides progress when logged in but percent is zero", () => {
    setLoggedIn(true);
    const wrapper = mountLockScreen({ completionPercent: 0 });

    expect(wrapper.find(".lock-screen__progress").exists()).toBe(false);
  });

  it("hides progress when logged out", () => {
    const wrapper = mountLockScreen({ completionPercent: 66 });

    expect(wrapper.find(".lock-screen__progress").exists()).toBe(false);
  });

  // ------------------------------------------------------------------
  // 权益清单
  // ------------------------------------------------------------------
  it("renders the three benefit items", () => {
    const wrapper = mountLockScreen();

    const texts = wrapper.findAll(".benefit__text").map((n) => n.text());
    expect(texts).toEqual([
      "解锁精准匹配推荐",
      "查看同校校友主页",
      "发起私信与匿名聊天",
    ]);
  });

  // ------------------------------------------------------------------
  // 备选路径：先逛逛公开内容 → 切到公开 Tab（匹配推荐页）
  // ------------------------------------------------------------------
  it("secondary button switches to a public tab", async () => {
    const switchTabSpy = vi.spyOn(uni, "switchTab");
    const wrapper = mountLockScreen();

    await wrapper.find(".lock-screen__btn-link").trigger("tap");

    expect(switchTabSpy).toHaveBeenCalledWith({ url: "/pages/discover/index" });
  });

  // ------------------------------------------------------------------
  // 「×」关闭：栈深 >1 返回上一页，否则切到公开 Tab
  // ------------------------------------------------------------------
  it("close button goes back when there is a previous page", async () => {
    vi.stubGlobal("getCurrentPages", vi.fn(() => [{ route: "pages/likes/index" }, { route: "pages/profile/index" }]));
    const navigateBackSpy = vi.spyOn(uni, "navigateBack");
    const switchTabSpy = vi.spyOn(uni, "switchTab");
    const wrapper = mountLockScreen();

    await wrapper.find(".lock-screen__close").trigger("tap");

    expect(navigateBackSpy).toHaveBeenCalled();
    expect(switchTabSpy).not.toHaveBeenCalled();
  });

  it("close button switches to a public tab when stack depth is 1", async () => {
    vi.stubGlobal("getCurrentPages", vi.fn(() => [{ route: "pages/profile/index" }]));
    const navigateBackSpy = vi.spyOn(uni, "navigateBack");
    const switchTabSpy = vi.spyOn(uni, "switchTab");
    const wrapper = mountLockScreen();

    await wrapper.find(".lock-screen__close").trigger("tap");

    expect(switchTabSpy).toHaveBeenCalledWith({ url: "/pages/discover/index" });
    expect(navigateBackSpy).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // 底部提示
  // ------------------------------------------------------------------
  it("renders the footer tip text", () => {
    const wrapper = mountLockScreen();

    expect(wrapper.find(".lock-screen__footer-text").text()).toBe(
      "资料越完善，匹配越精准，曝光机会越多"
    );
  });
});
