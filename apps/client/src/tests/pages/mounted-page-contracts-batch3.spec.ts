import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { i18n } from "../../i18n";
import { useAppConfigStore } from "../../stores/app-config";
import { useSessionStore } from "../../stores/session";

/**
 * 页面级挂载契约 · 第 3 批（R7-E，round-6 F-7「必须挂载」清单剩余 4 页）。
 *
 * <p>这 4 页的判据是动作层条件求值（封存早退 / 解封补偿 / 取数次数 / 本地队列推进），
 * 静态正则读不出响应式时序，挂载才能证。桩形态与 likes-pages-commerce.spec.ts 同款：
 * 真 store + 桩出网层（http / clientApi），页面级组合式函数替换。</p>
 *
 * <ol>
 *   <li>market/shop：封存态零请求（含 check-in）；解封补偿 watch（MP-R2-次要22-003）；</li>
 *   <li>market/detail：封存早退但 productId 先记录（MP-R2-次要22-002 的解封补偿前提）；
 *       无 id ⇒ notFound 不发请求；</li>
 *   <li>feedback/history：onShow 只拉一次（R4-00119 去掉了 onMounted 重复 load）；</li>
 *   <li>love-center/nearby：superLike 走真接口（/matches/like），成功推进本地队列，
 *       matched 跳会话页；未登录 requireLogin 早退零请求。</li>
 * </ol>
 */

type HttpOpts = { url: string; method?: string; data?: unknown; headers?: Record<string, string> };

const httpCalls = vi.hoisted(() => [] as HttpOpts[]);
const httpBehavior = vi.hoisted(() => ({
  impl: (_options: HttpOpts): Promise<unknown> => Promise.resolve({}),
}));
const apiBehavior = vi.hoisted(() => ({
  listSubmissions: vi.fn(async () => ({ items: [], total: 0 })),
}));

const hooks = vi.hoisted(() => ({
  onShow: [] as Array<() => unknown>,
  onLoad: [] as Array<(query?: Record<string, unknown>) => unknown>,
}));
const navigation = vi.hoisted(() => ({ openAppPath: vi.fn() }));

vi.mock("@dcloudio/uni-app", () => ({
  onShow: (cb: () => unknown) => hooks.onShow.push(cb),
  onLoad: (cb: (query?: Record<string, unknown>) => unknown) => hooks.onLoad.push(cb),
  onHide: () => {},
  onUnload: () => {},
  onReady: () => {},
  onReachBottom: () => {},
  onPullDownRefresh: () => {},
  onShareAppMessage: () => {},
  onShareTimeline: () => {},
}));

vi.mock("../../services/http", () => ({
  request: (options: HttpOpts) => {
    httpCalls.push(options);
    return httpBehavior.impl(options);
  },
  getToken: () => "token",
  clearTokens: () => {},
}));

vi.mock("../../stores/helpers/use-mock", () => ({ useMock: () => false }));
/* services/api 里有**本地** useMock() → isMockMode()（不走上面那个 helper），
   测试环境 clientEnv.apiMode 默认 mock ⇒ getRecommendations 落进 mockFixtures（9 条）
   而不是被桩的 http 层。这里把 env 的双判都钉成 real 档。 */
vi.mock("../../config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/env")>();
  return { ...actual, isMockMode: () => false, isRealMode: () => true };
});

/* 只覆写 feedback 测要数的 listSubmissions；其余方法用真身——nearby 页的
   getRecommendations 必须走真实现进（被桩的）http 层，全量 Proxy 会把它抹成 undefined。 */
vi.mock("../../services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/api")>();
  return {
    clientApi: new Proxy({ ...actual.clientApi }, {
      get(t, prop: string) {
        if (prop === "listSubmissions") return apiBehavior.listSubmissions;
        return (t as Record<string, unknown>)[prop];
      },
    }),
  };
});

vi.mock("../../composables/usePageAccess", () => ({ usePageAccess: vi.fn() }));
vi.mock("../../composables/useStatusBarHeight", () => ({ useStatusBarHeight: () => 0 }));
vi.mock("../../composables/useMenuButtonRect", () => ({
  useMenuButtonRect: () => ({ styleVars: {} }),
}));
vi.mock("../../utils/navigation", () => ({
  openAppPath: navigation.openAppPath,
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

import ShopPage from "../../subpackages/market/shop/index.vue";
import DetailPage from "../../subpackages/market/detail/index.vue";
import FeedbackHistoryPage from "../../subpackages/profile-extra/feedback/history.vue";
import NearbyPage from "../../subpackages/tools/love-center/nearby.vue";
import CardSwiper from "../../components/discover/CardSwiper.vue";

let pinia: Pinia;

function setCommerce(on: boolean): void {
  useAppConfigStore().$patch({
    switches: { "commerce.enabled": on, "commerce.coin": on },
    loaded: true,
  });
}

function reqCount(urlPart: string): number {
  return httpCalls.filter((c) => c.url.includes(urlPart)).length;
}

const STUBS = {
  SafeImage: { template: '<image class="stub-image" />' },
  EmptyState: { template: '<view class="stub-empty" />' },
  Skeleton: { template: '<view class="stub-skeleton" />' },
  ErrorState: { template: '<view class="stub-error" />' },
  VerificationBadge: { template: '<view class="stub-badge" />' },
  AppShell: { template: "<view><slot name='header' /><slot /></view>" },
};

beforeEach(() => {
  vi.clearAllMocks();
  hooks.onShow.length = 0;
  hooks.onLoad.length = 0;
  httpCalls.length = 0;
  pinia = createPinia();
  setActivePinia(pinia);
  useSessionStore().$patch({ userSession: { loggedIn: true, userId: "1", featureFlags: {} } });
  httpBehavior.impl = () => Promise.resolve({});
  const storage = new Map<string, unknown>();
  (globalThis as Record<string, any>).uni = {
    ...(globalThis as Record<string, any>).uni,
    getStorageSync: (key: string) => (storage.has(key) ? storage.get(key) : ""),
    setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key),
    showToast: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    showModal: vi.fn(),
    navigateTo: vi.fn(),
    navigateBack: vi.fn(),
    switchTab: vi.fn(),
    onNetworkStatusChange: vi.fn(),
    offNetworkStatusChange: vi.fn(),
    getNetworkType: vi.fn(),
    // feedback/history 的 loadQueryId 走**裸全局** getCurrentPages() 取栈（mp/H5 双端口径）
    getCurrentPages: () => [] as unknown[],
  };
  (globalThis as Record<string, unknown>).getCurrentPages = () => [];
});

afterEach(() => {
  /* 每例自建 pinia，无需全局还原 */
});

async function mountPage(component: typeof ShopPage, fire: "show" | "load" | "both", query?: Record<string, unknown>, keepSwiper = false): Promise<VueWrapper> {
  /* keepSwiper：nearby 页的被测对象就是 CardSwiper 的事件出口——桩掉它等于把被测对象桩没了 */
  const wrapper = mount(component as never, {
    global: { plugins: [i18n], stubs: keepSwiper ? STUBS : { ...STUBS, CardSwiper: true } },
  });
  if (fire === "load" || fire === "both") for (const cb of hooks.onLoad) await cb(query);
  if (fire === "show" || fire === "both") for (const cb of hooks.onShow) await cb();
  await flushPromises();
  return wrapper;
}

describe("market/shop：封存粒度与解封补偿（R7-E）", () => {
  it("封存态（总闸 false）onShow 零请求：不打 /products 也不打签到状态", async () => {
    setCommerce(false);
    await mountPage(ShopPage, "show");
    expect(reqCount("/products")).toBe(0);
    expect(httpCalls.filter((c) => c.url.includes("check-in") || c.url.includes("checkin"))).toHaveLength(0);
  });

  it("开放态 onShow 拉商品（阳性对照：上一条不是钩子没跑）", async () => {
    setCommerce(true);
    httpBehavior.impl = (o) =>
      Promise.resolve(o.url.includes("/products") ? { items: [], total: 0, page: 0, pageSize: 20 } : {});
    await mountPage(ShopPage, "show");
    expect(reqCount("/products")).toBe(1);
  });

  it("解封补偿（MP-R2-次要22-003）：封存进页后配置异步拉回 ⇒ watch 自动补拉商品", async () => {
    setCommerce(false);
    httpBehavior.impl = (o) =>
      Promise.resolve(o.url.includes("/products") ? { items: [], total: 0, page: 0, pageSize: 20 } : {});
    await mountPage(ShopPage, "show");
    expect(reqCount("/products")).toBe(0);
    setCommerce(true); // 配置异步拉回（watch 触发）
    await flushPromises();
    expect(reqCount("/products"), "解封后没有自动补拉 ⇒ 整页误显「暂无商品」").toBe(1);
  });
});

describe("market/detail：封存早退先记录 productId（R7-E）", () => {
  it("封存态 onLoad 带id ⇒ 不发商品请求；解封后用记录的 id 补拉（MP-R2-次要22-002）", async () => {
    setCommerce(false);
    httpBehavior.impl = (o) =>
      Promise.resolve(o.url.includes("/products") ? { id: 7, name: "x", description: "", price: 1, originalPrice: null, imageUrl: null, category: "goods", sales: 0, stock: 0 } : {});
    await mountPage(DetailPage, "load", { id: "7" });
    expect(reqCount("/products")).toBe(0);
    setCommerce(true);
    await flushPromises();
    expect(reqCount("/products"), "解封后没用记录的 productId 补拉 ⇒ 整页空白").toBe(1);
    expect(httpCalls.some((c) => c.url.includes("/products") && String(c.url).includes("7"))).toBe(true);
  });

  it("开放态无 id ⇒ notFound，不发请求", async () => {
    setCommerce(true);
    await mountPage(DetailPage, "load", {});
    expect(reqCount("/products")).toBe(0);
  });

  it("开放态带 id ⇒ 按 id 取商品", async () => {
    setCommerce(true);
    httpBehavior.impl = (o) =>
      Promise.resolve(o.url.includes("/products") ? { id: 7, name: "x", description: "", price: 1, originalPrice: null, imageUrl: null, category: "goods", sales: 0, stock: 0 } : {});
    await mountPage(DetailPage, "load", { id: "7" });
    expect(reqCount("/products")).toBe(1);
  });
});

describe("feedback/history：取数次数与失败呈现（R7-E）", () => {
  it("onShow 只拉一次列表（R4-00119：onMounted 不再重复 load）", async () => {
    await mountPage(FeedbackHistoryPage, "both");
    expect(apiBehavior.listSubmissions.mock.calls.length, "onMounted+onShow 双拉回归").toBe(1);
  });

  it("加载失败 ⇒ 页面呈现 store 的错误状态（不把失败折成空态，MP-R1-FEEDBACKHIST-001）", async () => {
    apiBehavior.listSubmissions.mockRejectedValueOnce(new Error("网络错误"));
    const wrapper = await mountPage(FeedbackHistoryPage, "both");
    expect(wrapper.text(), "失败被折成空态（错误卡不可见）").not.toContain("暂无");
    expect(wrapper.text()).toContain("网络错误");
  });
});

describe("love-center/nearby：动作层走真接口（R7-E）", () => {
  it("superLike ⇒ POST /matches/like，成功后本地队列推进", async () => {
    httpBehavior.impl = (o) => {
      if (o.url.includes("/recommendations")) {
        return Promise.resolve([
          { userId: 9, nickname: "a", avatar: "", headline: "", distanceKm: 1 },
          { userId: 10, nickname: "b", avatar: "", headline: "", distanceKm: 2 },
        ]);
      }
      return Promise.resolve({ matched: false });
    };
    const wrapper = await mountPage(NearbyPage, "load", undefined, true);
    const swiper = wrapper.findComponent(CardSwiper);
    expect(swiper.exists(), "CardSwiper 没挂上（桩太狠把被测对象也桩没了）").toBe(true);
    const before = swiper.props("cards") as unknown[];
    expect(before.length).toBe(2);
    swiper.vm.$emit("superLike", before[0] && (before[0] as { id: string }).id);
    await flushPromises();
    /* swipeRight 有 300ms 防抖窗口（R4-00177 幂等队列：窗口内合并、窗口末统一 flush），
       flushPromises 只排微任务，必须把真实定时器走完才看得见出网；
       superLike 的端点是 /matches/super-like（discover/api.ts:127 双分支） */
    await new Promise((r) => setTimeout(r, 380));
    await flushPromises();
    expect(httpCalls.some((c) => c.url.includes("/matches/super-like")), "superLike 没走真接口").toBe(true);
  });

  it("未登录 superLike ⇒ requireLogin 早退，零请求", async () => {
    httpBehavior.impl = (o) =>
      Promise.resolve(o.url.includes("/recommendations") ? [{ userId: 9, nickname: "a", avatar: "", headline: "", distanceKm: 1 }] : {});
    useSessionStore().$patch({ userSession: { loggedIn: false, userId: "", featureFlags: {} } });
    const wrapper = await mountPage(NearbyPage, "load", undefined, true);
    const swiper = wrapper.findComponent(CardSwiper);
    const cards = swiper.props("cards") as { id: string }[];
    swiper.vm.$emit("superLike", cards[0].id);
    await flushPromises();
    expect(httpCalls.some((c) => c.url.includes("/matches/like")), "未登录仍发了喜欢请求").toBe(false);
  });
});
