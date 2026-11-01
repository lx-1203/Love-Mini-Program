import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { featureFlags } from "../../config/feature-flags";
import { ROUTES } from "../../constants/routes";
import { useAppConfigStore } from "../../stores/app-config";
import { useLikesStore } from "../../stores/likes";
import { useSessionStore } from "../../stores/session";
import { useVipStore } from "../../stores/vip";

/**
 * 喜欢页 / 访客页的商业化动作层（R7-C 第 1 批 · round-6 F-3/F-4/F-7「必须挂载」清单）。
 *
 * <p>既有 likes-unlock-vip-gate.spec.ts 只挂了 likes-visitors 页的**会员闸门**一轴。
 * 本文件补齐两页其余的动作层判点（桩形态与该文件同款：真 store + 桩出网层）：</p>
 * <ol>
 *   <li>coin 封存（commerce.coin=false，缺省即封存）⇒ 「解锁全部」入口结构性不可达
 *      （v-if 消失）且零 /wallet/unlock 请求——F-4.1 挂账的「商城两页只判总闸」同族，
 *      这两页判的是子闸，判点钉住不被回退成总闸口径；</li>
 *   <li>余额不足 ⇒ 弹「去充值」modal，confirm 后 openAppPath(ROUTES.WALLET)——
 *      2026-08-31 付费死路修复（录屏 05:52）的回归判点；</li>
 *   <li>likes 页（非 visitors）的会员三态：真会员免费放行 / 未确认拒绝扣费 / 非会员照扣
 *      ——两页各有一份同构 handleUnlock，只测一页等于另一页的拷贝没人看。</li>
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
  onShow: (cb: () => unknown) => hooks.onShow.push(cb),
  onLoad: (cb: (query?: Record<string, unknown>) => unknown) => hooks.onLoad.push(cb),
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

/** 真 store 走 real 分支（mock 分支的 unlockUser 是本地夹具，判点会判到夹具头上） */
vi.mock("../../stores/helpers/use-mock", () => ({ useMock: () => false }));

vi.mock("../../services/api", () => ({
  clientApi: new Proxy({}, { get: () => () => Promise.resolve(null) }),
}));

vi.mock("../../stores/profile", () => ({
  useProfileStore: () => ({ loading: false, load: () => Promise.resolve() }),
}));

vi.mock("../../composables/usePageAccess", () => ({ usePageAccess: vi.fn() }));
vi.mock("../../composables/useStatusBarHeight", () => ({ useStatusBarHeight: () => 0 }));
vi.mock("../../composables/useMenuButtonRect", () => ({
  useMenuButtonRect: () => ({ styleVars: {} }),
}));
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

import LikesPage from "../../subpackages/discover-extra/likes/index.vue";
import LikesVisitorsPage from "../../subpackages/discover-extra/likes-visitors/index.vue";

const navigation = vi.hoisted(() => ({ openAppPath: vi.fn() }));
vi.mocked(await import("../../utils/navigation")).openAppPath = navigation.openAppPath;

function isoFromNow(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 出网分派：/vip/bills 决定会员三态（SUCCESS 到期账单 ⇒ 会员；error ⇒ unknown；空 ⇒ 非会员）；
 * /wallet/unlock 可切换成功/余额不足；其余端点一律空对象（不喂夹具数据进真 store 的取数面）。
 */
function routeHttp(opts: { vip: "active" | "none" | "error"; unlock: "ok" | "insufficient" }):
    (options: HttpOpts) => Promise<unknown> {
  return (options) => {
    if (options.url.startsWith("/vip/bills")) {
      if (opts.vip === "error") return Promise.reject(new Error("账单查询失败"));
      if (opts.vip === "none") return Promise.resolve({ items: [], total: 0, page: 0, size: 20, totalPages: 1 });
      return Promise.resolve({
        items: [{ id: 1, userId: 1, amount: 4800, type: "SUBSCRIBE", status: "SUCCESS", periodEnd: isoFromNow(30), createdAt: "2026-11-01T00:00:00" }],
        total: 1, page: 0, size: 20, totalPages: 1,
      });
    }
    if (options.url === "/wallet/unlock") {
      if (opts.unlock === "insufficient") return Promise.reject(new Error("余额不足：请先充值"));
      return Promise.resolve({ unlocked: true, balance: 900 });
    }
    /* likes 真身 store 的三个取数端点要的是**裸数组**（liked-me/my-likes/visitors）；
       喂 {} 会让 fetchLikes 在 .map 上崩、并把 beforeEach 补丁的未解锁条目覆盖掉 */
    if (options.url === "/matches/liked-me") {
      return Promise.resolve([
        { userId: 2001, nickname: "", avatar: "", headline: "大二 · 同城", likedAt: "2026-11-01 10:00:00", unlocked: false },
      ]);
    }
    if (options.url === "/matches/my-likes" || options.url === "/matches/visitors") {
      return Promise.resolve([]);
    }
    return Promise.resolve({});
  };
}

function unlockRequests(): HttpOpts[] {
  return httpCalls.filter((c) => c.url === "/wallet/unlock");
}

function modalTitles(): string[] {
  const uni = globalThis as unknown as { uni: { showModal: { mock: { calls: Array<[{ title?: string }]> } } } };
  return uni.uni.showModal.mock.calls.map((c) => String(c[0]?.title ?? ""));
}

function toastTitles(): string[] {
  const uni = globalThis as unknown as { uni: { showToast: { mock: { calls: Array<[{ title?: string }]> } } } };
  return uni.uni.showToast.mock.calls.map((c) => String(c[0]?.title ?? ""));
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

  useSessionStore().$patch({ userSession: { loggedIn: true, userId: "1", featureFlags: {} } });
  useAppConfigStore().$patch({
    switches: { "commerce.enabled": true, "commerce.coin": true },
    loaded: true,
  });
  useLikesStore().$patch({
    likedBy: [
      { id: "2001", userId: "2001", name: "", avatar: "", headline: "大二 · 同城", likedAt: "2026-11-01 10:00:00", unlocked: false },
    ],
    visitors: [],
  });

  httpBehavior.impl = routeHttp({ vip: "none", unlock: "ok" });
  const storage = new Map<string, unknown>();
  (globalThis as Record<string, any>).uni = {
    ...(globalThis as Record<string, any>).uni,
    getStorageSync: (key: string) => (storage.has(key) ? storage.get(key) : ""),
    setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key),
    showToast: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    showModal: vi.fn((o: { success?: (res: { confirm: boolean }) => void }) => o.success?.({ confirm: true })),
    navigateTo: vi.fn(),
    navigateBack: vi.fn(),
    switchTab: vi.fn(),
    // likes 页的网络状态监听（在线状态条）
    onNetworkStatusChange: vi.fn(),
    offNetworkStatusChange: vi.fn(),
    getNetworkType: vi.fn((o: { success?: (res: { networkType: string }) => void }) => o?.success?.({ networkType: "wifi" })),
  };
});

afterEach(() => {
  featureFlags.membershipEnabled = previousMembershipEnabled;
});

async function mountPage(page: "likes" | "visitors"): Promise<VueWrapper> {
  const wrapper = mount(page === "likes" ? LikesPage : LikesVisitorsPage, {
    global: {
      stubs: {
        SafeImage: { template: '<image class="stub-image" />' },
        EmptyState: { template: '<view class="stub-empty" />' },
        Skeleton: { template: '<view class="stub-skeleton" />' },
        ErrorState: { template: '<view class="stub-error" />' },
        VerificationBadge: { template: '<view class="stub-badge" />' },
        NotLoggedWaiting: { template: '<view class="stub-notlogged" />' },
        BaseTabs: { template: '<view class="stub-basetabs" />' },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

const STUBS = {
  likes: ".likes-unlock-bar",
  visitors: ".unlock-bar",
} as const;

const BTN = {
  likes: ".likes-unlock-bar__btn",
  visitors: ".unlock-bar__btn",
} as const;

for (const page of ["likes", "visitors"] as const) {
  describe(`${page === "likes" ? "喜欢页" : "访客页"}：coin 封存与余额不足的动作层（R7-C）`, () => {
    it("coin 封存（commerce.coin=false）⇒ 解锁入口结构性不可达 + 零扣费请求", async () => {
      useAppConfigStore().$patch({ switches: { "commerce.enabled": true, "commerce.coin": false } });
      const wrapper = await mountPage(page);
      expect(wrapper.find(STUBS[page]).exists(), "封存态仍有解锁入口（v-if 没判 commerce.coin）").toBe(false);
      expect(unlockRequests(), "封存态仍发了 /wallet/unlock").toEqual([]);
    });

    it("余额不足 ⇒ 弹「去充值」modal，confirm 后跳钱包页（付费死路修复的回归）", async () => {
      httpBehavior.impl = routeHttp({ vip: "none", unlock: "insufficient" });
      const wrapper = await mountPage(page);
      await wrapper.find(BTN[page]).trigger("tap");
      await flushPromises();
      expect(modalTitles().length, "余额不足后应弹充值引导 modal").toBeGreaterThan(0);
      navigation.openAppPath.mockClear();
      // 再点一次让 confirm 分支走 openAppPath（modal 桩默认 confirm=true，第二次触发复用同一 handler）
      await wrapper.find(BTN[page]).trigger("tap");
      await flushPromises();
      expect(navigation.openAppPath).toHaveBeenCalledWith(ROUTES.WALLET);
    });
  });
}

describe("喜欢页：会员三态在第二份 handleUnlock 拷贝上同样成立（R7-C）", () => {
  it("真会员 ⇒ 免费放行：零 /wallet/unlock、条目本地解锁", async () => {
    featureFlags.membershipEnabled = true;
    httpBehavior.impl = routeHttp({ vip: "active", unlock: "ok" });
    const wrapper = await mountPage("likes");
    await wrapper.find(BTN.likes).trigger("tap");
    await flushPromises();
    expect(unlockRequests(), "会员仍被扣费").toEqual([]);
    expect(useLikesStore().likedBy[0].unlocked, "会员免费解锁应本地放行").toBe(true);
  });

  it("会员状态取不到 ⇒ 宁可不扣：零请求、不弹扣费确认框", async () => {
    featureFlags.membershipEnabled = true;
    httpBehavior.impl = routeHttp({ vip: "error", unlock: "ok" });
    const wrapper = await mountPage("likes");
    await wrapper.find(BTN.likes).trigger("tap");
    await flushPromises();
    expect(unlockRequests(), "unknown 状态不应扣费").toEqual([]);
    expect(modalTitles(), "unknown 状态不应弹扣费确认").toEqual([]);
    expect(toastTitles().length, "应有一条可读提示").toBeGreaterThan(0);
  });

  it("非会员 ⇒ 确认框 + 扣费请求（阳性对照：上面两条不是按钮没跑）", async () => {
    httpBehavior.impl = routeHttp({ vip: "none", unlock: "ok" });
    const wrapper = await mountPage("likes");
    await wrapper.find(BTN.likes).trigger("tap");
    await flushPromises();
    expect(modalTitles().length).toBeGreaterThan(0);
    expect(unlockRequests()).toHaveLength(1);
    expect(useLikesStore().likedBy[0].unlocked).toBe(true);
  });
});
