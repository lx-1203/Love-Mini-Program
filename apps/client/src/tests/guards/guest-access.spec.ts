import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 游客落点守卫（guards/guest-access.ts）单测。
 *
 * 立项目标（round-7 用户裁定）：游客一律必须被引导到登录/注册，setup 引导流程不豁免。
 * 在册事实（本测就是照它写的，不许反过来迁就现状）：
 * - 游客此前被弹到登录页只出自 HTTP 401 兜底（services/http.ts:493 的 uni.reLaunch +
 *   :494 的 LOGIN_REDIRECT_DELAY_MS）；页面不发受保护请求（或 mock 带吃 fixture）时 401 永远不来。
 * - 路由守卫 composables/usePageAccess.ts:79 对「无 token 的游客」是放行的，
 *   所以它不是落点来源，也不能改成全局弹登录（会连带改掉其余已入账落点组）。
 */

const mocks = vi.hoisted(() => {
  // getToken() 的真实签名返回 string（无 token 时为空串），桩值与真实实现同形
  return {
    getToken: vi.fn((): string => ""),
    showcase: { value: false },
    mockBand: { value: false },
  };
});

vi.mock("../../services/http", () => ({ getToken: mocks.getToken }));
vi.mock("../../config/showcase", () => ({
  get isShowcaseMode() {
    return mocks.showcase.value;
  },
}));
// mock 演示带的「登录」是本地注入会话、getToken 恒空（在册口径 pages/nearby/index.vue:60-68），
// 所以 isMockMode 必须可注入，才能同时测到真实带与演示带两种结论
vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: () => mocks.mockBand.value,
}));

import { guideGuestToLogin, isGuest } from "../../guards/guest-access";
import { ROUTES } from "../../constants/routes";
import { LOGIN_REDIRECT_DELAY_MS } from "../../constants/app";
import { t } from "../../i18n";

type UniStub = { showToast: ReturnType<typeof vi.fn>; reLaunch: ReturnType<typeof vi.fn> };
let uniStub: UniStub;

beforeEach(() => {
  vi.useFakeTimers();
  mocks.getToken.mockReset();
  mocks.getToken.mockReturnValue("");
  mocks.showcase.value = false;
  mocks.mockBand.value = false;
  uniStub = { showToast: vi.fn(), reLaunch: vi.fn() };
  vi.stubGlobal("uni", uniStub);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("guest-access 游客落点守卫", () => {
  it("isGuest 只看本地 token，与 usePageAccess.ts:79 / http.ts 的 hadSession 同一真相源", () => {
    mocks.getToken.mockReturnValue("");
    expect(isGuest()).toBe(true);
    mocks.getToken.mockReturnValue("tok-1");
    expect(isGuest()).toBe(false);
  });

  it("游客（无 token）：返回 true 表示已拦，并给出「请先登录」提示", () => {
    expect(guideGuestToLogin()).toBe(true);
    expect(uniStub.showToast).toHaveBeenCalledWith({
      title: t("apiErrors.loginRequired"),
      icon: "none",
    });
  });

  it("游客：引导目标是既有 ROUTES.LOGIN 常量，不新造跳转路径", () => {
    expect(ROUTES.LOGIN).toBe("/pages/login/index");
    guideGuestToLogin();
    vi.advanceTimersByTime(LOGIN_REDIRECT_DELAY_MS);
    expect(uniStub.reLaunch).toHaveBeenCalledTimes(1);
    expect(uniStub.reLaunch).toHaveBeenCalledWith({ url: ROUTES.LOGIN });
  });

  it("游客：延迟复用 LOGIN_REDIRECT_DELAY_MS（与 http.ts:494 同一常量），到点前不得抢跳", () => {
    expect(LOGIN_REDIRECT_DELAY_MS).toBeGreaterThan(0);
    guideGuestToLogin();
    vi.advanceTimersByTime(LOGIN_REDIRECT_DELAY_MS - 1);
    expect(uniStub.reLaunch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(uniStub.reLaunch).toHaveBeenCalledTimes(1);
  });

  it("持 token 者（含失效 token）一律放行：401 兜底那套既有行为不被抢跑", () => {
    mocks.getToken.mockReturnValue("stale-token");
    expect(guideGuestToLogin()).toBe(false);
    vi.advanceTimersByTime(LOGIN_REDIRECT_DELAY_MS * 3);
    expect(uniStub.showToast).not.toHaveBeenCalled();
    expect(uniStub.reLaunch).not.toHaveBeenCalled();
  });

  it("展示包（VITE_SHOWCASE_MODE）沿用 usePageAccess.ts:58 的旁路口径", () => {
    mocks.showcase.value = true;
    expect(guideGuestToLogin()).toBe(false);
    vi.advanceTimersByTime(LOGIN_REDIRECT_DELAY_MS * 3);
    expect(uniStub.reLaunch).not.toHaveBeenCalled();
  });

  it("mock 演示带不算游客：本地注入会话没有 token，也不该被踢出页面", () => {
    // 在册口径 pages/nearby/index.vue:60-68「mock 模式登录为本地模拟会话（getToken 恒空），需放行」；
    // 真实构建里 mock 分支被 scripts/strip-mock-for-mp.mjs 剔除，不构成「一律」的逃逸通道。
    mocks.mockBand.value = true;
    mocks.getToken.mockReturnValue("");
    expect(isGuest()).toBe(false);
    expect(guideGuestToLogin()).toBe(false);
    vi.advanceTimersByTime(LOGIN_REDIRECT_DELAY_MS * 3);
    expect(uniStub.showToast).not.toHaveBeenCalled();
    expect(uniStub.reLaunch).not.toHaveBeenCalled();
  });
});
