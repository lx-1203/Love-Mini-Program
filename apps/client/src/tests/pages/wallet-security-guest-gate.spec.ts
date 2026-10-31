import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive } from "vue";
import { i18n } from "../../i18n";
import WalletPage from "../../subpackages/market/wallet/index.vue";
import SecurityPage from "../../subpackages/tools/security/index.vue";

/**
 * P1 修复（2026-10-31）：钱包页与账号安全中心页必须是「守卫先于取数」。
 *
 * 改前实况（逐条核过源码）：
 * - `subpackages/market/wallet/index.vue` **整页没有** usePageAccess，onShow 直接
 *   `Promise.all([fetchBalance(true), listTransactions(...)])` ⇒ 游客点「我的钱包」
 *   = 两个必 401 的请求，且弹走之前余额卡/流水/充值按钮都已经渲染过了；
 * - `subpackages/tools/security/index.vue` 用的是 `profilePageRequirements`
 *   （requiresAuth:**false**，那枚描述的是「我的」Tab 免登录可看），onShow 无条件
 *   `GET /auth/devices` ⇒ 同样是先打请求、后由 401 兜底弹人，且看得见「更换手机号 / 注销账号」。
 *
 * 本测把三条都钉住：① 游客档**一个请求都不发**（守卫返回 true 时取数函数不得被调用）；
 * ② 游客档不得渲染账号级控件；③ 已登录/持 token 的用户功能原样不变（防止把修复做成「整页罢工」）。
 *
 * 载具说明：`@dcloudio/uni-app` 的 onLoad/onShow 在测试里被替换成收集器，
 * 按 uni-app 的真实时序（onLoad → onShow）依次触发，因此「守卫先于取数」是被**执行**出来的，
 * 不是靠读源码字符串猜出来的。
 */

const hooks = vi.hoisted(() => ({
  onLoad: [] as Array<(query?: Record<string, unknown>) => unknown>,
  onShow: [] as Array<() => unknown>,
}));

/** 本页面的守卫返回值（true = 游客已被引导走）与 mock 档开关，按用例改 */
const flags = vi.hoisted(() => ({ guest: false, mockMode: false }));

const httpCalls: Array<Record<string, unknown>> = vi.hoisted(() => []);
const coinsCalls: string[] = vi.hoisted(() => []);

vi.mock("@dcloudio/uni-app", () => ({
  onLoad: (cb: (query?: Record<string, unknown>) => unknown) => hooks.onLoad.push(cb),
  onShow: (cb: () => unknown) => hooks.onShow.push(cb),
  onUnload: () => {},
  onHide: () => {},
  onReady: () => {},
  onReachBottom: () => {},
  onPullDownRefresh: () => {},
  onShareAppMessage: () => {},
}));

vi.mock("../../guards/guest-access", () => ({
  isGuest: () => flags.guest,
  guideGuestToLogin: () => flags.guest,
}));

// 会话守卫本身由 tests/guards/* 与 composables 的既有用例覆盖，这里只断言「页面确实接了门槛」
vi.mock("../../composables/usePageAccess", () => ({ usePageAccess: vi.fn() }));

vi.mock("../../services/http", () => ({
  request: (options: Record<string, unknown>) => {
    httpCalls.push(options);
    if (String(options?.url ?? "").startsWith("/auth/devices")) {
      return Promise.resolve([]);
    }
    return Promise.resolve({ balanceAfterCents: 1, amountCents: 1 });
  },
  getToken: () => null,
  clearTokens: () => {},
}));

vi.mock("../../stores/coins", () => ({
  useCoinsStore: () =>
    reactive({
      balanceYuan: 800,
      balanceCents: 80000,
      transactions: [],
      fetchBalance: (force = false) => {
        coinsCalls.push(`fetchBalance:${String(force)}`);
        return Promise.resolve(80000);
      },
      listTransactions: () => {
        coinsCalls.push("listTransactions");
        return Promise.resolve({ items: [], total: 0, page: 0, size: 20, totalPages: 1 });
      },
      spend: () => Promise.resolve(0),
    }),
  UNLOCK_COST_YUAN: { MESSAGE: 1, VISITORS: 3, LIKES: 3, WHISPER: 2 },
}));

vi.mock("../../stores/app-config", () => ({
  // 商业化放行：这样「游客不发请求」的结论不可能被封存态顺便蒙过去
  useAppConfigStore: () => reactive({ isCommerceOn: () => true }),
}));

vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: () => flags.mockMode,
}));

vi.mock("../../stores/session", () => ({
  useSessionStore: () => reactive({ userSession: null }),
}));

vi.mock("../../composables/useMenuButtonRect", () => ({
  useMenuButtonRect: () => ({ styleVars: {} }),
}));

vi.mock("../../utils/media", () => ({
  resolveMediaUrl: (v: string) => v,
  isUploadedMediaUrl: () => false,
}));

function resetHooks() {
  hooks.onLoad.length = 0;
  hooks.onShow.length = 0;
  httpCalls.length = 0;
  coinsCalls.length = 0;
  flags.guest = false;
  flags.mockMode = false;
}

/** 按 uni-app 首帧时序跑一遍页面生命周期（onLoad → onShow） */
async function runLifecycle() {
  for (const cb of hooks.onLoad) cb(undefined);
  for (const cb of hooks.onShow) await cb();
}

function mountWallet() {
  return mount(WalletPage, { global: { plugins: [i18n] } });
}

function mountSecurity() {
  return mount(SecurityPage, {
    global: { plugins: [i18n], stubs: { SectionCard: true } },
  });
}

describe("钱包页：游客不得发受保护请求（P1 守卫先行）", () => {
  beforeEach(() => resetHooks());

  it("游客档：refreshWallet 一条都不发（GET /wallet/balance + /wallet/transactions 都没打出去）", async () => {
    flags.guest = true;
    flags.mockMode = false; // real 档才是缺陷现场（mock 档本地内存数据不会 401）
    mountWallet();
    await runLifecycle();
    expect(coinsCalls).toEqual([]);
    expect(httpCalls).toEqual([]);
  });

  it("已登录/持 token 档：余额与流水照旧各取一次（修复没把功能做成整页罢工）", async () => {
    flags.guest = false;
    flags.mockMode = false;
    mountWallet();
    await runLifecycle();
    expect(coinsCalls).toEqual(["fetchBalance:true", "listTransactions"]);
  });

  it("游客档不渲染余额卡/流水/充值入口，也不冒充商业化封存卡文案", async () => {
    flags.guest = true;
    const wrapper = mountWallet();
    await runLifecycle();
    expect(wrapper.find(".wallet__balance-card").exists()).toBe(false);
    expect(wrapper.find(".wallet__recharge").exists()).toBe(false);
    expect(wrapper.find(".wallet__tx-list").exists()).toBe(false);
    // 封存卡说的是「功能未开放」，对游客印它等于假解释
    expect(wrapper.find(".wallet__sealed").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("充值");
  });

  it("放行档：余额卡照渲染（上一条红不是因为页没挂载起来）", async () => {
    flags.guest = false;
    const wrapper = mountWallet();
    await runLifecycle();
    expect(wrapper.find(".wallet__balance-card").exists()).toBe(true);
  });
});

describe("账号安全中心：游客不得发 GET /auth/devices，也不得看见账号级控件（P1）", () => {
  beforeEach(() => resetHooks());

  it("游客档：/auth/devices 一个都不发", async () => {
    flags.guest = true;
    flags.mockMode = false;
    mountSecurity();
    await runLifecycle();
    expect(httpCalls.filter((c) => String(c.url).startsWith("/auth/devices"))).toEqual([]);
  });

  it("放行档（real）：设备列表照旧拉取一次（守卫只拦游客，不砍功能）", async () => {
    flags.guest = false;
    flags.mockMode = false;
    mountSecurity();
    await runLifecycle();
    const devices = httpCalls.filter((c) => String(c.url).startsWith("/auth/devices"));
    expect(devices).toHaveLength(1);
    expect(devices[0].method).toBe("GET");
  });

  it("游客档：四张账号级卡（账号安全/第三方绑定/登录设备/危险操作）都不在屏上，只剩隐私入口", async () => {
    flags.guest = true;
    const wrapper = mountSecurity();
    await runLifecycle();
    // SectionCard 被 stub 成 <section-card-stub>：数量就是「有几张卡」
    expect(wrapper.findAll("section-card-stub")).toHaveLength(1);
    expect(wrapper.text()).not.toContain("注销账号");
    expect(wrapper.text()).not.toContain("修改密码");
    expect(wrapper.text()).not.toContain("登录设备");
  });

  it("放行档：五张卡都在（上一条的红不是因为卡本来就渲染不出来）", async () => {
    flags.guest = false;
    const wrapper = mountSecurity();
    await runLifecycle();
    expect(wrapper.findAll("section-card-stub")).toHaveLength(5);
  });
});
