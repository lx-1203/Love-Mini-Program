import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { featureFlags } from "../../config/feature-flags";
import { useAppConfigStore } from "../../stores/app-config";
import { useLikesStore } from "../../stores/likes";
import { useSessionStore } from "../../stores/session";
import { useVipStore } from "../../stores/vip";

/**
 * 喜欢与访客页的会员解锁闸门（第六轮 W2-1）。
 *
 * <p>改前实况：`stores/vip.ts` 的 `isVipRaw` 全仓**唯一**赋值是 `= false`（另一次是
 * `resetForLogout()` 置回 false），没有任何路径把它写成 true ⇒ 正式包
 * `vipStore.isVip` 恒假 ⇒ 本页 `if (featureFlags.membershipEnabled && vipStore.isVip)`
  这一支不可达，真会员落到下面的 `uni.showModal` 扣费确认 + `likesStore.unlockUser()`
 * （POST /wallet/unlock 的契约就是「按单价扣费并记录解锁」，后端
 * RealWalletUnlockService 里没有身份旁路）⇒ 会员照常扣交友币。</p>
 *
 * <p>判点口径：挂载级 + 真 store（likes / coins / session / app-config / vip 都是真身，
 * 只桩出网层与页面级组合式函数），所以「store 收到会员态」这条事实是真的流过页面动作层，
 * 断言的是它带来的可见后果——</p>
 * <ol>
 *   <li>会员 ⇒ 不发扣费请求（POST /wallet/unlock 0 次）、不弹扣费确认框；</li>
 *   <li>非会员 ⇒ 弹确认框 + 发扣费请求（阳性对照，证明上一条不是「按钮压根没跑」）；</li>
 *   <li>会员状态取不到 ⇒ 两者都不做（宁可不扣）；</li>
 *   <li>会员功能未启用（今日正式包）⇒ 不为判身份多打一次账单分页，扣费流程原样。</li>
 * </ol>
 */

type HttpOpts = { url: string; method?: string; data?: unknown; headers?: Record<string, string> };

const httpCalls = vi.hoisted(() => [] as HttpOpts[]);

const httpBehavior = vi.hoisted(() => ({
  impl: (_options: HttpOpts): Promise<unknown> => Promise.resolve({}),
}));

const hooks = vi.hoisted(() => ({
  onShow: [] as Array<() => unknown>,
  onLoad: [] as Array<(query?: Record<string, unknown>) => unknown>,
}));

vi.mock("@dcloudio/uni-app", () => ({
  onShow: (cb: () => unknown) => {
    hooks.onShow.push(cb);
  },
  onLoad: (cb: (query?: Record<string, unknown>) => unknown) => {
    hooks.onLoad.push(cb);
  },
  onHide: () => {},
  onUnload: () => {},
  onReady: () => {},
  onReachBottom: () => {},
  onPullDownRefresh: () => {},
  onShareAppMessage: () => {},
}));

vi.mock("../../services/http", () => ({
  request: (options: HttpOpts) => {
    httpCalls.push(options);
    return httpBehavior.impl(options);
  },
  getToken: () => null,
  clearTokens: () => {},
}));

/** 真 store 必须走 real 分支：mock 分支的 fetchBills/unlockUser 都是本地夹具，判点会判到夹具头上 */
vi.mock("../../stores/helpers/use-mock", () => ({ useMock: () => false }));

/** clientApi 只被间接依赖用到（store 的兜底路径），一律给空响应 */
vi.mock("../../services/api", () => ({
  clientApi: new Proxy({}, { get: () => () => Promise.resolve(null) }),
}));

/** 本页只用 profileStore.load()/loading，替换成轻量桩件（真 profile.load 会拉 5 个端点，与判点无关） */
vi.mock("../../stores/profile", () => ({
  useProfileStore: () => ({ loading: false, load: () => Promise.resolve() }),
}));

vi.mock("../../composables/usePageAccess", () => ({ usePageAccess: vi.fn() }));
vi.mock("../../composables/useStatusBarHeight", () => ({ useStatusBarHeight: () => 0 }));
vi.mock("../../utils/navigation", () => ({
  openAppPath: vi.fn(),
  replaceAppPath: vi.fn(),
  setPendingLoginRedirect: vi.fn(),
}));
vi.mock("../../utils/media", () => ({
  resolveMediaUrl: (v: string) => v,
  isUploadedMediaUrl: () => false,
}));
vi.mock("../../utils/haptic", () => ({
  lightHaptic: vi.fn(),
  successHaptic: vi.fn(),
  errorHaptic: vi.fn(),
}));

import LikesVisitorsPage from "../../subpackages/discover-extra/likes-visitors/index.vue";

/** 相对当前时间的本地 ISO（后端 periodEnd 就是无时区的本地串，口径保持一致） */
function isoFromNow(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 账单真相源的出网分派：/vip/bills 给「一笔 SUCCESS 到期账单」，其余给空对象 */
function routeBills(periodEnd: string | null | "error"): (options: HttpOpts) => Promise<unknown> {
  return (options) => {
    if (options.url.startsWith("/vip/bills")) {
      if (periodEnd === "error") {
        return Promise.reject(new Error("账单查询失败，请稍后重试"));
      }
      return Promise.resolve({
        items: periodEnd
          ? [{ id: 1, userId: 1, amount: 4800, type: "SUBSCRIBE", status: "SUCCESS", periodEnd, createdAt: "2026-11-01T00:00:00" }]
          : [],
        total: periodEnd ? 1 : 0,
        page: 0,
        size: 20,
        totalPages: 1,
      });
    }
    if (options.url === "/wallet/unlock") {
      return Promise.resolve({ unlocked: true, balance: 900 });
    }
    return Promise.resolve({});
  };
}

function unlockRequests(): HttpOpts[] {
  return httpCalls.filter((c) => c.url === "/wallet/unlock");
}

function billRequests(): HttpOpts[] {
  return httpCalls.filter((c) => c.url.startsWith("/vip/bills"));
}

function modalTitles(): string[] {
  const uni = globalThis as unknown as {
    uni: { showModal: { mock: { calls: Array<[{ title?: string }]> } } };
  };
  return uni.uni.showModal.mock.calls.map((call) => String(call[0]?.title ?? ""));
}

function toastTitles(): string[] {
  const uni = globalThis as unknown as {
    uni: { showToast: { mock: { calls: Array<[{ title?: string }]> } } };
  };
  return uni.uni.showToast.mock.calls.map((call) => String(call[0]?.title ?? ""));
}

let pinia: Pinia;
let previousMembershipEnabled: boolean;

beforeEach(() => {
  previousMembershipEnabled = featureFlags.membershipEnabled;
  vi.clearAllMocks();
  hooks.onShow.length = 0;
  hooks.onLoad.length = 0;
  httpCalls.length = 0;
  pinia = createPinia();
  setActivePinia(pinia);

  // 登录态 + coin 子闸开启（解锁入口的前置条件，与会员闸门无关）
  useSessionStore().$patch({ userSession: { loggedIn: true, userId: "1", featureFlags: {} } });
  useAppConfigStore().$patch({
    switches: { "commerce.enabled": true, "commerce.coin": true },
    loaded: true,
  });
  // 一条未解锁记录（服务端 unlocked=false ⇒ 页面出「解锁全部」按钮）
  useLikesStore().$patch({
    likedBy: [
      {
        id: "2001",
        userId: "2001",
        name: "",
        avatar: "",
        headline: "大二 · 同城",
        likedAt: "2026-11-01 10:00:00",
        unlocked: false,
      },
    ],
    visitors: [],
  });

  httpBehavior.impl = routeBills(null);
  const storage = new Map<string, unknown>();
  (globalThis as Record<string, any>).uni = {
    ...(globalThis as Record<string, any>).uni,
    getStorageSync: (key: string) => (storage.has(key) ? storage.get(key) : ""),
    setStorageSync: (key: string, value: unknown) => {
      storage.set(key, value);
    },
    removeStorageSync: (key: string) => {
      storage.delete(key);
    },
    showToast: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    // 扣费确认框默认点「确认」——非会员阳性对照要走完扣费分支
    showModal: vi.fn((opts: { success?: (res: { confirm: boolean }) => void }) => {
      opts.success?.({ confirm: true });
    }),
    navigateTo: vi.fn(),
    navigateBack: vi.fn(),
    switchTab: vi.fn(),
  };
});

afterEach(() => {
  featureFlags.membershipEnabled = previousMembershipEnabled;
});

async function mountPage(): Promise<VueWrapper> {
  const wrapper = mount(LikesVisitorsPage, {
    global: {
      stubs: {
        SafeImage: { template: '<image class="stub-image" />' },
        EmptyState: { template: '<view class="stub-empty" />' },
        Skeleton: { template: '<view class="stub-skeleton" />' },
        ErrorState: { template: '<view class="stub-error" />' },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

async function tapUnlock(wrapper: VueWrapper): Promise<void> {
  await wrapper.find(".unlock-bar__btn").trigger("tap");
  await flushPromises();
}

describe("喜欢与访客页：会员解锁闸门接真身份（W2-1）", () => {
  it("会员功能开启且 store 收到会员态 ⇒ 不发扣费请求、不弹扣费确认框", async () => {
    featureFlags.membershipEnabled = true;
    httpBehavior.impl = routeBills(isoFromNow(30));
    const wrapper = await mountPage();
    expect(wrapper.find(".unlock-bar__btn").exists()).toBe(true);

    await tapUnlock(wrapper);

    // 扣费出口一次都没被调用（改前：恒走这里 ⇒ 真会员被扣交友币）
    expect(unlockRequests()).toHaveLength(0);
    // 也没弹「消耗 N 交友币解锁全部」确认框
    expect(modalTitles()).toHaveLength(0);
    expect(toastTitles()).toContain("会员免费解锁");
    // 闸门放行后列表确实进入已解锁态（不是静默 return）
    expect(useLikesStore().likedBy[0]?.unlocked).toBe(true);
    // 身份确实取自账单真相源
    expect(billRequests()).toHaveLength(1);
    expect(useVipStore().isVip).toBe(true);
  });

  it("阳性对照：非会员仍走扣费确认框 + 扣费请求（闸门没被顺手撤掉）", async () => {
    featureFlags.membershipEnabled = true;
    httpBehavior.impl = routeBills(isoFromNow(-2));
    const wrapper = await mountPage();
    await tapUnlock(wrapper);

    expect(modalTitles()).toHaveLength(1);
    expect(unlockRequests()).toHaveLength(1);
    expect(toastTitles()).not.toContain("会员免费解锁");
  });

  it("会员状态取不到 ⇒ 宁可不扣：既不弹扣费确认也不发扣费请求", async () => {
    featureFlags.membershipEnabled = true;
    httpBehavior.impl = routeBills("error");
    const wrapper = await mountPage();
    await tapUnlock(wrapper);

    expect(unlockRequests()).toHaveLength(0);
    expect(modalTitles()).toHaveLength(0);
    expect(toastTitles()).toContain("会员状态未确认，请稍后重试解锁");
    expect(useVipStore().vipStatus).toBe("unknown");
  });

  it("会员功能未启用（今日正式包）⇒ 不为判身份多打一次账单分页，扣费流程原样", async () => {
    featureFlags.membershipEnabled = false;
    httpBehavior.impl = routeBills(isoFromNow(30));
    const wrapper = await mountPage();
    await tapUnlock(wrapper);

    expect(billRequests()).toHaveLength(0);
    expect(modalTitles()).toHaveLength(1);
    expect(unlockRequests()).toHaveLength(1);
    expect(useVipStore().vipStatus).toBe("unknown");
  });

  it("登出复位后同一次点击不再按会员放行（闸门跟着账号态走）", async () => {
    featureFlags.membershipEnabled = true;
    httpBehavior.impl = routeBills(isoFromNow(30));
    const wrapper = await mountPage();
    const vipStore = useVipStore();
    await vipStore.refreshVipStatus();
    expect(vipStore.isVip).toBe(true);
    vipStore.resetForLogout();
    expect(vipStore.isVip).toBe(false);

    // 新账号没有成功账单 ⇒ non_vip，必须回到扣费确认
    httpBehavior.impl = routeBills(null);
    httpCalls.length = 0;
    await tapUnlock(wrapper);

    expect(billRequests()).toHaveLength(1);
    expect(modalTitles()).toHaveLength(1);
    expect(unlockRequests()).toHaveLength(1);
  });
});
