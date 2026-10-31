import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { reactive } from "vue";
import { i18n } from "../../i18n";
import { STORAGE_KEYS } from "../../constants/storage-keys";

/**
 * 钱包页「演示充值」幂等键回归测（P1：每击重生成 Idempotency-Key）。
 *
 * 改前实况（`subpackages/market/wallet/index.vue:114-126`）：
 * - 键在**调用内**拼 `RECHARGE-DEMO-${Date.now()}` ⇒ 每次点击都是新键，
 *   与自己 :119 那行「幂等键单次流程内固定」的注释直接矛盾；
 * - 服务端 `POST /wallet/recharge` 是 `@Idempotent`（Idempotency-Key + Redis SETNX，
 *   见 apps/api WalletController + IdempotentInterceptor），**同键**才会被拒；
 *   键每击都变 ⇒ 这道闸从不执行；
 * - 唯一真闸是内存 ref `recharging`，`onUnload` / H5 刷新 / 请求被杀时一并消失
 *   ⇒ 「服务端已入账、响应丢失」的那笔会被下一次点击再入账一次。
 *
 * 载具说明：与在册 wallet-security-guest-gate.spec.ts 同款 —— uni-app 生命周期钩子
 * 换成收集器按真实时序触发；`services/http` 换成可控桩，逐次记录出网请求（含请求头）。
 */

const hooks = vi.hoisted(() => ({
  onLoad: [] as Array<(query?: Record<string, unknown>) => unknown>,
  onShow: [] as Array<() => unknown>,
}));

/** 本地存储桩（跨页面实例存活 —— 这正是本测要验的性质） */
const storage = vi.hoisted(() => new Map<string, unknown>());

type HttpOpts = {
  url: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
};

/** 真正出网的请求快照（下标 = 第 N 次派发） */
const httpCalls = vi.hoisted(() => [] as HttpOpts[]);

const httpBehavior = vi.hoisted(() => ({
  impl: (): Promise<unknown> => Promise.resolve({ balanceAfterCents: 10000 }),
}));

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
  isGuest: () => false,
  guideGuestToLogin: () => false,
}));

vi.mock("../../composables/usePageAccess", () => ({ usePageAccess: vi.fn() }));

vi.mock("../../services/http", () => ({
  request: (options: HttpOpts) => {
    httpCalls.push(options);
    return httpBehavior.impl();
  },
  getToken: () => null,
  clearTokens: () => {},
}));

vi.mock("../../stores/coins", () => ({
  useCoinsStore: () =>
    reactive({
      balanceYuan: 0,
      balanceCents: 0,
      transactions: [],
      fetchBalance: () => Promise.resolve(0),
      listTransactions: () =>
        Promise.resolve({ items: [], total: 0, page: 0, size: 20, totalPages: 1 }),
      spend: () => Promise.resolve(0),
    }),
  UNLOCK_COST_YUAN: { MESSAGE: 1, VISITORS: 3, LIKES: 3, WHISPER: 2 },
}));

vi.mock("../../stores/app-config", () => ({
  useAppConfigStore: () => reactive({ isCommerceOn: () => true }),
}));

vi.mock("../../stores/helpers/use-mock", () => ({ useMock: () => true }));
vi.mock("../../config/env", () => ({ isDev: false }));
vi.mock("../../composables/useMenuButtonRect", () => ({
  useMenuButtonRect: () => ({ styleVars: {} }),
}));
vi.mock("../../utils/haptic", () => ({ lightHaptic: vi.fn(), successHaptic: vi.fn() }));
vi.mock("../../utils/media", () => ({
  resolveMediaUrl: (v: string) => v,
  isUploadedMediaUrl: () => false,
}));

import WalletPage from "../../subpackages/market/wallet/index.vue";

/** 每次调用推进 1 秒：改前实现把 Date.now() 拼进键 ⇒ 两次点击必然两个键 */
let clock = 1_793_000_000_000;

function rechargeKeys(): string[] {
  return httpCalls
    .filter((c) => c.url === "/wallet/recharge")
    .map((c) => String(c.headers?.["Idempotency-Key"] ?? ""));
}

function pendingRecord(): { key: string; amountCents: number } | undefined {
  const raw = storage.get(STORAGE_KEYS.WALLET_PENDING_RECHARGE);
  if (!raw) return undefined;
  return typeof raw === "string" ? JSON.parse(raw) : (raw as never);
}

async function runLifecycle(): Promise<void> {
  for (const cb of hooks.onLoad) cb(undefined);
  for (const cb of hooks.onShow) await cb();
}

function mountWallet(): VueWrapper {
  return mount(WalletPage, { global: { plugins: [i18n] } });
}

async function tapRecharge(wrapper: VueWrapper): Promise<void> {
  await wrapper.find(".wallet__recharge").trigger("tap");
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.onLoad.length = 0;
  hooks.onShow.length = 0;
  httpCalls.length = 0;
  storage.clear();
  httpBehavior.impl = () => Promise.resolve({ balanceAfterCents: 10000 });
  clock = 1_793_000_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => {
    clock += 1000;
    return clock;
  });
  (globalThis as Record<string, any>).uni = {
    ...(globalThis as Record<string, any>).uni,
    setStorageSync: (key: string, value: unknown) => {
      storage.set(key, value);
    },
    getStorageSync: (key: string) => (storage.has(key) ? storage.get(key) : ""),
    removeStorageSync: (key: string) => {
      storage.delete(key);
    },
    showToast: vi.fn(),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("钱包页演示充值：幂等键 = 一次操作，不是一次点击", () => {  it("在途期间的第二次点击不再派发请求，且按钮进入禁用态", async () => {
    let release: (v: unknown) => void = () => {};
    httpBehavior.impl = () =>
      new Promise((r) => {
        release = r;
      });
    const wrapper = mountWallet();
    await runLifecycle();

    await tapRecharge(wrapper);
    expect(wrapper.find(".wallet__recharge").classes()).toContain("wallet__recharge--pending");
    expect(wrapper.find(".wallet__recharge").attributes("aria-disabled")).toBe("true");
    await tapRecharge(wrapper);
    await flushPromises();

    expect(httpCalls.filter((c) => c.url === "/wallet/recharge")).toHaveLength(1);
    release({ balanceAfterCents: 10000 });
    await flushPromises();
    expect(wrapper.find(".wallet__recharge--pending").exists()).toBe(false);
  });

  it("响应丢失（reject）后的重试复用同一个 Idempotency-Key（键跟着这笔操作，不跟着点击）", async () => {
    httpBehavior.impl = () => Promise.reject(new Error("网络超时：响应丢失"));
    const wrapper = mountWallet();
    await runLifecycle();

    await tapRecharge(wrapper);
    await flushPromises();
    await tapRecharge(wrapper);
    await flushPromises();

    const keys = rechargeKeys();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    // 改前这里是两个不同的 RECHARGE-DEMO-<Date.now()> ⇒ 服务端 @Idempotent 无从去重
    expect(keys[1]).toBe(keys[0]);
    // 键必须落盘（内存 ref 扛不住 onUnload / H5 刷新）
    expect(pendingRecord()?.key).toBe(keys[0]);
  });

  it("页面实例销毁重建（onUnload / H5 刷新）后重试仍是同一个键", async () => {
    httpBehavior.impl = () => Promise.reject(new Error("请求被杀"));
    const first = mountWallet();
    await runLifecycle();
    await tapRecharge(first);
    await flushPromises();
    const firstKey = rechargeKeys()[0];
    first.unmount();

    // 新实例 = 刷新后的同一账号同一笔未完成充值
    hooks.onLoad.length = 0;
    hooks.onShow.length = 0;
    const second = mountWallet();
    await runLifecycle();
    await tapRecharge(second);
    await flushPromises();

    expect(rechargeKeys()).toHaveLength(2);
    expect(rechargeKeys()[1]).toBe(firstKey);
  });

  it("入账成功是终态：清掉未完成记录，下一次充值是新操作、新键", async () => {
    const wrapper = mountWallet();
    await runLifecycle();

    await tapRecharge(wrapper);
    await flushPromises();
    const firstKey = rechargeKeys()[0];
    expect(pendingRecord()).toBeUndefined();

    await tapRecharge(wrapper);
    await flushPromises();
    const keys = rechargeKeys();
    expect(keys).toHaveLength(2);
    // 终态之后必须换键，否则「再来一笔」会被服务端当成重复请求一直拒掉
    expect(keys[1]).not.toBe(firstKey);
  });

  it("充值请求体金额与键绑定：amountCents 恒为 10000 分（=100 元），落盘记录同额", async () => {
    let release: (v: unknown) => void = () => {};
    httpBehavior.impl = () =>
      new Promise((r) => {
        release = r;
      });
    const wrapper = mountWallet();
    await runLifecycle();
    await tapRecharge(wrapper);
    await flushPromises();

    const call = httpCalls.find((c) => c.url === "/wallet/recharge");
    expect(call?.method).toBe("POST");
    expect(call?.data).toEqual({ amountCents: 10000 });
    // 在途（未终态）时这笔操作必须已经落盘，且金额与键同条记录
    expect(pendingRecord()).toEqual({ key: String(call?.headers?.["Idempotency-Key"]), amountCents: 10000 });

    release({ balanceAfterCents: 10000 });
    await flushPromises();
    expect(pendingRecord()).toBeUndefined();
  });
});
