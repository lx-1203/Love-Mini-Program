import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactive, ref } from "vue";

/**
 * 页面访问守卫组合式函数（composables/usePageAccess.ts）单测。
 *
 * 消费面：全站 14+ 个页面在 onShow 里调用本守卫决定放行/重定向/弹解锁引导，
 * 是 composables 目录里分支最多、被最多页面消费的一项。
 * 分支顺序与源码一致（showcase → loading → 离线 → 游客 → 会话恢复 → 解锁引导 → session-guard）：
 * 1. 展示模式（VITE_SHOWCASE_MODE）旁路全部守卫，正式包恒为 false；
 * 2. 会话加载中 / 离线：跳过守卫，避免误判与阻塞离线访问；
 * 3. 未登录（无 userSession 且无 token）一律放行——页面自身 LockScreen 承担引导，
 *    切换 Tab 不被踢到登录页；
 * 4. 持 token 但 userSession 为空：主动 refreshSession 恢复会话（30s 节流 + isRefreshingSession
 *    防并发），认证类错误 reLaunch 登录页，网络/业务错误不跳转；
 * 5. 锁定页资料未完善：触发 unlockGuideStore.show（Phase 4 任务 20，不再静默重定向）；
 * 6. session-guard（真实 resolveSessionAccess）：按 requires* 决定重定向，
 *    requiresAuth 重定向且本地持 token（token 失效）时补「登录已过期」toast（R15-2 对齐）。
 *
 * 载具说明：onShow 用收集器替换（与 pages/wallet-security-guest-gate.spec.ts 同款），
 * 守卫逻辑在测试里真实执行；session-guard 用真实实现（纯函数 + ROUTES 常量），
 * profile-guard/unlock-guide/navigation/http 用模块桩按用例注入。
 */

const hooks = vi.hoisted(() => ({
  onShow: [] as Array<() => unknown>,
}));

const flags = vi.hoisted(() => ({
  showcase: false,
  loading: false,
  isOffline: false,
  token: "" as string,
  currentPagePath: null as string | null,
  profileDecision: { allowed: true } as {
    allowed: boolean;
    shouldShowModal?: boolean;
    featureName?: string;
    completionPercent?: number;
  },
}));

const sessionApi = vi.hoisted(() => ({
  // 工厂里挂真实 ref（storeToRefs 只认 ref/reactive 形态的 state，login-index.spec 同款）
  userSessionRef: null as { value: unknown } | null,
  refreshSession: vi.fn(),
}));

const unlockApi = vi.hoisted(() => ({ show: vi.fn() }));
const nav = vi.hoisted(() => ({ replaceAppPath: vi.fn() }));
const guardSpy = vi.hoisted(() => ({ resolveProfileGuard: vi.fn() }));

vi.mock("@dcloudio/uni-app", () => ({
  onShow: (cb: () => unknown) => hooks.onShow.push(cb),
  onLoad: vi.fn(),
  onHide: vi.fn(),
  onUnload: vi.fn(),
  onReady: vi.fn(),
  onLaunch: vi.fn(),
  onReachBottom: vi.fn(),
  onPullDownRefresh: vi.fn(),
  onShareAppMessage: vi.fn(),
}));

vi.mock("../../config/showcase", () => ({
  get isShowcaseMode() {
    return flags.showcase;
  },
}));

vi.mock("../../stores/session", async () => {
  const userSessionRef = ref<Record<string, unknown> | null>(null);
  sessionApi.userSessionRef = userSessionRef;
  return {
    useSessionStore: () =>
      reactive({
        userSession: userSessionRef,
        loading: flags.loading,
        isOffline: flags.isOffline,
        refreshSession: sessionApi.refreshSession,
      }),
  };
});

// profile-guard 的判定已有 tests/guards/profile-guard.spec.ts 专门覆盖，
// 这里只注入决策，钉住 usePageAccess 对「弹解锁引导」这条通路的接线
vi.mock("../../guards/profile-guard", () => ({
  resolveProfileGuard: guardSpy.resolveProfileGuard,
}));

vi.mock("../../stores/unlock-guide", () => ({
  useUnlockGuideStore: () => unlockApi,
}));

vi.mock("../../utils/navigation", () => ({
  replaceAppPath: nav.replaceAppPath,
  openAppPath: vi.fn(),
}));

vi.mock("../../services/http", () => ({
  getToken: () => flags.token,
}));

// getCurrentPagePath 注入可空桩：null 即源码里的「取不到当前路径」分支
vi.mock("../../compat", async (importOriginal) => ({
  ...(await importOriginal()),
  getCurrentPagePath: () => flags.currentPagePath,
}));

// session-guard 的 isDev 调试日志关掉（其余导出保持真实实现），测试输出保持干净
vi.mock("../../config/env", async (importOriginal) => ({
  ...(await importOriginal()),
  isDev: false,
}));

import { usePageAccess } from "../../composables/usePageAccess";
import type { PageRequirements } from "../../guards/session-guard";
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";
import { t } from "../../i18n";

type UniStub = { reLaunch: ReturnType<typeof vi.fn>; showToast: ReturnType<typeof vi.fn> };
let uniStub: UniStub;

/** 从 2026-01-01T00:01:00Z 起步（60s > 30s 节流窗），每个用例再前进 60s，互不串档 */
let clockCursor = Date.parse("2026-01-01T00:01:00Z");

function req(overrides: Partial<PageRequirements> = {}): PageRequirements {
  return {
    requiresAuth: false,
    requiresProfile: false,
    requiresCampus: false,
    requiresSchedule: false,
    ...overrides,
  };
}

/** 会被 session-guard 全部放行的完整会话 */
function fullSession(): Record<string, unknown> {
  return {
    loggedIn: true,
    profileCompleted: true,
    campusVerified: true,
    scheduleCompleted: true,
    featureFlags: { chat_ai_enabled: true },
  };
}

/** 触发本次 usePageAccess() 注册的 onShow（收集器按注册顺序执行） */
async function runOnShow(): Promise<void> {
  for (const cb of hooks.onShow) await cb();
}

/** 把 refreshSession 的 .catch/.finally 微任务链跑干 */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

beforeEach(() => {
  // 每个用例时间轴前进 60s（>30s 节流窗）；setSystemTime 只在启用 fake timers 的
  // 会话恢复 describe 里调用（vitest 的 setSystemTime 依赖 fake timers 生效）
  clockCursor += 60_000;
  flags.showcase = false;
  flags.loading = false;
  flags.isOffline = false;
  flags.token = "";
  flags.currentPagePath = null;
  flags.profileDecision = { allowed: true };
  if (sessionApi.userSessionRef) sessionApi.userSessionRef.value = null;
  sessionApi.refreshSession.mockReset();
  sessionApi.refreshSession.mockImplementation(() => Promise.resolve());
  unlockApi.show.mockClear();
  nav.replaceAppPath.mockClear();
  guardSpy.resolveProfileGuard.mockReset();
  guardSpy.resolveProfileGuard.mockImplementation(() => flags.profileDecision);
  hooks.onShow.length = 0;
  uniStub = { reLaunch: vi.fn(), showToast: vi.fn() };
  vi.stubGlobal("uni", uniStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("usePageAccess：旁路与放行（短路分支顺序）", () => {
  it("展示模式旁路全部守卫：连 profile-guard 都不会被咨询（正式包 VITE_SHOWCASE_MODE 恒 false）", async () => {
    flags.showcase = true;
    flags.currentPagePath = "/subpackages/discover-extra/likes/index";
    flags.profileDecision = { allowed: false, shouldShowModal: true, featureName: "喜欢列表" };
    usePageAccess(req({ requiresAuth: true }));
    await runOnShow();
    expect(guardSpy.resolveProfileGuard).not.toHaveBeenCalled();
    expect(unlockApi.show).not.toHaveBeenCalled();
    expect(nav.replaceAppPath).not.toHaveBeenCalled();
    expect(uniStub.reLaunch).not.toHaveBeenCalled();
    expect(uniStub.showToast).not.toHaveBeenCalled();
  });

  it("会话加载中跳过守卫：即使持 token 也不会触发 refreshSession（loading 判定先于会话恢复）", async () => {
    flags.loading = true;
    flags.token = "tok-1";
    usePageAccess(req({ requiresAuth: true }));
    await runOnShow();
    expect(sessionApi.refreshSession).not.toHaveBeenCalled();
    expect(nav.replaceAppPath).not.toHaveBeenCalled();
  });

  it("离线状态跳过守卫：bootstrap 网络异常时不重定向，页面自行处理离线 UI", async () => {
    flags.isOffline = true;
    flags.token = "tok-1";
    usePageAccess(req({ requiresAuth: true }));
    await runOnShow();
    expect(sessionApi.refreshSession).not.toHaveBeenCalled();
    expect(nav.replaceAppPath).not.toHaveBeenCalled();
    expect(uniStub.showToast).not.toHaveBeenCalled();
  });

  it("未登录且无 token 一律放行：切 Tab 不被踢登录（引导交给页面 LockScreen）", async () => {
    flags.token = "";
    usePageAccess(req({ requiresAuth: true, requiresProfile: true }));
    await runOnShow();
    expect(nav.replaceAppPath).not.toHaveBeenCalled();
    expect(uniStub.showToast).not.toHaveBeenCalled();
    expect(sessionApi.refreshSession).not.toHaveBeenCalled();
    expect(unlockApi.show).not.toHaveBeenCalled();
  });

  it("会话完备 + 无门槛要求：放行且零副作用（session-guard 用真实 resolveSessionAccess 判定）", async () => {
    sessionApi.userSessionRef!.value = fullSession();
    flags.token = "tok-1";
    usePageAccess(req({ featureFlag: "chat_ai_enabled" }));
    await runOnShow();
    expect(nav.replaceAppPath).not.toHaveBeenCalled();
    expect(uniStub.showToast).not.toHaveBeenCalled();
    expect(unlockApi.show).not.toHaveBeenCalled();
  });
});

describe("usePageAccess：解锁引导弹窗分支（Phase 4 任务 20）", () => {
  it("锁定页资料未完善：触发 unlockGuideStore.show(功能名, 完善度)，不再静默重定向", async () => {
    sessionApi.userSessionRef!.value = fullSession();
    flags.currentPagePath = "/subpackages/discover-extra/likes/index";
    flags.profileDecision = {
      allowed: false,
      shouldShowModal: true,
      featureName: "喜欢列表",
      completionPercent: 40,
    };
    usePageAccess(req());
    await runOnShow();
    expect(guardSpy.resolveProfileGuard).toHaveBeenCalledTimes(1);
    expect(guardSpy.resolveProfileGuard).toHaveBeenCalledWith("/subpackages/discover-extra/likes/index");
    expect(unlockApi.show).toHaveBeenCalledTimes(1);
    expect(unlockApi.show).toHaveBeenCalledWith("喜欢列表", 40);
    expect(nav.replaceAppPath).not.toHaveBeenCalled();
  });

  it("取不到当前路径时跳过 profile-guard 检查，直接进入 session-guard 判定", async () => {
    sessionApi.userSessionRef!.value = fullSession();
    flags.currentPagePath = null;
    usePageAccess(req());
    await runOnShow();
    expect(guardSpy.resolveProfileGuard).not.toHaveBeenCalled();
    expect(unlockApi.show).not.toHaveBeenCalled();
    expect(nav.replaceAppPath).not.toHaveBeenCalled();
  });
});

describe("usePageAccess：session-guard 重定向（真实 resolveSessionAccess）", () => {
  it("requiresProfile 但资料未完善 → 重定向资料完善页；token 在手，不弹「登录已过期」", async () => {
    sessionApi.userSessionRef!.value = { ...fullSession(), profileCompleted: false };
    flags.token = "tok-1";
    usePageAccess(req({ requiresAuth: true, requiresProfile: true }));
    await runOnShow();
    expect(nav.replaceAppPath).toHaveBeenCalledTimes(1);
    expect(nav.replaceAppPath).toHaveBeenCalledWith(SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE);
    expect(uniStub.showToast).not.toHaveBeenCalled();
  });

  it("requiresCampus 但校园未认证 → 重定向校园认证页", async () => {
    sessionApi.userSessionRef!.value = { ...fullSession(), campusVerified: false };
    flags.token = "tok-1";
    usePageAccess(req({ requiresAuth: true, requiresCampus: true }));
    await runOnShow();
    expect(nav.replaceAppPath).toHaveBeenCalledWith(SUBPACKAGE_ROUTES.SETUP_PROGRESS.CAMPUS);
  });

  it("本地持 token 但会话判定未登录（token 失效）→ 重定向登录页并补「登录已过期」toast（R15-2 对齐）", async () => {
    sessionApi.userSessionRef!.value = { ...fullSession(), loggedIn: false };
    flags.token = "tok-1";
    usePageAccess(req({ requiresAuth: true }));
    await runOnShow();
    expect(nav.replaceAppPath).toHaveBeenCalledTimes(1);
    expect(nav.replaceAppPath).toHaveBeenCalledWith(ROUTES.LOGIN);
    // R15-2：原条件 !getToken() 恒为假（死代码），toast 从未触发；对齐后「重定向登录页
    // 且持 token = token 失效」正是「登录已过期」的正确语义
    expect(uniStub.showToast).toHaveBeenCalledTimes(1);
    expect(uniStub.showToast).toHaveBeenCalledWith({ title: t("apiErrors.unauthorized"), icon: "none" });
  });

  it("requiresProfile 未完善且本地无 token → 重定向资料页，不弹「登录已过期」（非重定向登录页，R15-2 对齐）", async () => {
    sessionApi.userSessionRef!.value = { ...fullSession(), profileCompleted: false };
    flags.token = "";
    usePageAccess(req({ requiresAuth: true, requiresProfile: true }));
    await runOnShow();
    expect(uniStub.showToast).not.toHaveBeenCalled();
    expect(nav.replaceAppPath).toHaveBeenCalledWith(SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE);
  });

  it("featureFlag 未开启 → 重定向寻觅 Tab（与 session-guard 的发现页兜底一致）", async () => {
    sessionApi.userSessionRef!.value = { ...fullSession(), featureFlags: {} };
    flags.token = "tok-1";
    usePageAccess(req({ featureFlag: "chat_ai_enabled" }));
    await runOnShow();
    expect(nav.replaceAppPath).toHaveBeenCalledTimes(1);
    expect(nav.replaceAppPath).toHaveBeenCalledWith(ROUTES.TAB.DISCOVER);
    expect(uniStub.showToast).not.toHaveBeenCalled();
  });
});

describe("usePageAccess：会话恢复兜底（refreshSession，30s 节流 + 防并发）", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(clockCursor);
  });

  it("持 token 但 userSession 为空 → 主动 refreshSession 恢复会话（成功则放行，不跳转）", async () => {
    flags.token = "tok-1";
    usePageAccess(req({ requiresAuth: true }));
    await runOnShow();
    expect(sessionApi.refreshSession).toHaveBeenCalledTimes(1);
    await flush();
    expect(nav.replaceAppPath).not.toHaveBeenCalled();
    expect(uniStub.reLaunch).not.toHaveBeenCalled();
  });

  it("30s 节流窗口内的下一次 onShow 不再重复刷新；窗口过期（+31s）后恢复刷新", async () => {
    flags.token = "tok-1";
    usePageAccess(req({ requiresAuth: true }));
    await runOnShow();
    expect(sessionApi.refreshSession).toHaveBeenCalledTimes(1);
    await flush();
    // 同一时刻的第二次 onShow（如连续切页）→ 命中节流，不重复往返
    await runOnShow();
    expect(sessionApi.refreshSession).toHaveBeenCalledTimes(1);
    // 跨过 30s 窗口 → 允许再次刷新
    clockCursor += 31_000;
    vi.setSystemTime(clockCursor);
    await runOnShow();
    expect(sessionApi.refreshSession).toHaveBeenCalledTimes(2);
  });

  it("刷新失败且 category=auth → reLaunch 登录页兜底（防 401 跳转竞态遗漏）", async () => {
    flags.token = "tok-1";
    sessionApi.refreshSession.mockImplementation(() =>
      Promise.reject({ category: "auth" })
    );
    usePageAccess(req({ requiresAuth: true }));
    await runOnShow();
    await flush();
    expect(uniStub.reLaunch).toHaveBeenCalledTimes(1);
    expect(uniStub.reLaunch).toHaveBeenCalledWith({ url: ROUTES.LOGIN });
    expect(nav.replaceAppPath).not.toHaveBeenCalled();
  });

  it("刷新失败但非认证类错误（网络/业务）→ 不跳转，交由 isOffline/页面自行处理", async () => {
    flags.token = "tok-1";
    sessionApi.refreshSession.mockImplementation(() =>
      Promise.reject({ category: "network" })
    );
    usePageAccess(req({ requiresAuth: true }));
    await runOnShow();
    await flush();
    expect(uniStub.reLaunch).not.toHaveBeenCalled();
    expect(nav.replaceAppPath).not.toHaveBeenCalled();
  });

  it("isRefreshingSession 防并发：in-flight 期间（即使跨过 30s 窗口）不再叠加刷新", async () => {
    flags.token = "tok-1";
    let release!: () => void;
    sessionApi.refreshSession.mockImplementation(
      () => new Promise<void>((resolve) => { release = resolve; })
    );
    usePageAccess(req({ requiresAuth: true }));
    await runOnShow();
    expect(sessionApi.refreshSession).toHaveBeenCalledTimes(1);
    // 故意跨过 30s 窗口：请求仍在飞行中（finally 未执行），不得叠加第二次刷新
    clockCursor += 40_000;
    vi.setSystemTime(clockCursor);
    await runOnShow();
    expect(sessionApi.refreshSession).toHaveBeenCalledTimes(1);
    // 落地后 finally 复位，不留悬挂状态
    release();
    await flush();
    expect(sessionApi.refreshSession).toHaveBeenCalledTimes(1);
  });
});
