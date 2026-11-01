import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useCheckInStore } from "../../stores/checkin";
import { useSessionStore } from "../../stores/session";

/**
 * 每日一问页的签到状态来源（第六轮 W2-2）。
 *
 * <p>改前实况：本页用 `v-if="!checkInStore.checkedIn"`（`:162`、`:205`）当**唯一**渲染依据，
 * 而 `checkedIn` 是内存态：`stores/checkin.ts` 的 `fetchStatus()` 全站只有两个非 store 内触发点
 * （`services/websocket/store-dispatch.ts:402`、`subpackages/market/shop/index.vue:45`），
 * 本页不调。于是登出重登后（第五轮 FINDING 15 把 `checkedIn` 纳进登出复位）内存态归 false，
 * 当天明明已签到 ⇒ 页面必落锁屏，只能再点一次「去签到」发 `POST /check-in` 才回得来。</p>
 *
 * <p>判点两条腿（都是行为级，不只判源码文本）：</p>
 * <ol>
 *   <li>复位后重新进入页面（触发 onShow）⇒ 真的出网取状态（`GET /check-in/status`）；</li>
 *   <li>服务端说已签到 ⇒ 锁屏不再显示、题目卡渲染；服务端说没签到 ⇒ 锁屏仍在
 *       （签到是业务闸门，本轮没有把它撤掉）。</li>
 * </ol>
 */

const PAGE = resolve(__dirname, "../../subpackages/tools/daily-question/index.vue");
const pageSource = readFileSync(PAGE, "utf-8");

type HttpOpts = { url: string; method?: string };

const httpCalls = vi.hoisted(() => [] as HttpOpts[]);

const httpBehavior = vi.hoisted(() => ({
  impl: (_options: HttpOpts): Promise<unknown> => Promise.resolve({}),
}));

const hooks = vi.hoisted(() => ({
  onShow: [] as Array<() => unknown>,
  onUnload: [] as Array<() => unknown>,
}));

vi.mock("@dcloudio/uni-app", () => ({
  onShow: (cb: () => unknown) => {
    hooks.onShow.push(cb);
  },
  onUnload: (cb: () => unknown) => {
    hooks.onUnload.push(cb);
  },
  onLoad: () => {},
  onHide: () => {},
  onReady: () => {},
  onReachBottom: () => {},
  onPullDownRefresh: () => {},
  onShareAppMessage: () => {},
}));

vi.mock("../../services/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/http")>();
  return {
    ...actual,
    request: (options: HttpOpts) => {
      httpCalls.push(options);
      return httpBehavior.impl(options);
    },
    getToken: () => null,
    clearTokens: () => {},
    /** 测试里不要真超时：透传目标 Promise，让 store 的 try/catch 正常收敛失败态 */
    withTimeout: <T>(target: Promise<T>): Promise<T> => target,
  };
});

/** real 分支才出网；mock 分支的 fetchStatus 读的是本地夹具，判点会判到夹具头上 */
vi.mock("../../stores/helpers/use-mock", () => ({ useMock: () => false }));

/** 新鲜度窗口恒定判过期：判点要的是「页面确实驱动了一次状态获取」，不被 30s 短路吞掉 */
vi.mock("../../utils/cache-ttl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/cache-ttl")>();
  return { ...actual, isCacheFresh: () => false };
});

vi.mock("../../composables/useMenuButtonRect", () => ({
  useMenuButtonRect: () => ({ styleVars: {} }),
}));
vi.mock("../../utils/media", () => ({
  resolveMediaUrl: (v: string) => v,
  isUploadedMediaUrl: () => false,
}));

import DailyQuestionPage from "../../subpackages/tools/daily-question/index.vue";

function statusHttp(checkedInToday: boolean): (options: HttpOpts) => Promise<unknown> {
  return (options) => {
    if (options.url === "/check-in/status") {
      return Promise.resolve({ checkedInToday, consecutiveDays: 3, extraQuota: 0, points: 120 });
    }
    if (options.url === "/daily-question/today") {
      return Promise.resolve({
        id: 77,
        questionDate: "2026-11-01",
        questionText: "今天有没有想起某个人？",
        hasAnswered: true,
        category: "daily",
        answerCount: 2,
      });
    }
    if (options.url.startsWith("/daily-question/answers")) {
      return Promise.resolve({ items: [], total: 0, page: 1, size: 10 });
    }
    return Promise.resolve({});
  };
}

async function mountAndShow(): Promise<VueWrapper> {
  const wrapper = mount(DailyQuestionPage);
  await flushPromises();
  for (const cb of hooks.onShow) {
    await cb();
  }
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  httpCalls.length = 0;
  hooks.onShow.length = 0;
  hooks.onUnload.length = 0;
  setActivePinia(createPinia());
  httpBehavior.impl = statusHttp(false);
  // fetchStatus 在未登录时会直接早退不发请求（D2 守卫），这里给一个已登录主体
  useSessionStore().$patch({
    userSession: { loggedIn: true, userId: "10001", featureFlags: {} },
  });
  // 登出复位后的形态：内存态已签到标志归 false
  useCheckInStore().$patch({ checkedIn: false, consecutiveDays: 0 });
  (globalThis as Record<string, any>).uni = {
    ...(globalThis as Record<string, any>).uni,
    getStorageSync: () => "",
    setStorageSync: () => {},
    showToast: vi.fn(),
    showModal: vi.fn(),
    navigateBack: vi.fn(),
    switchTab: vi.fn(),
  };
});

describe("每日一问页：签到状态有来源，锁屏不再冒充结论（W2-2）", () => {
  it("复位后重新进入页面会发起状态获取（GET /check-in/status）", async () => {
    await mountAndShow();
    expect(httpCalls.filter((c) => c.url === "/check-in/status")).toHaveLength(1);
  });

  it("服务端说已签到 ⇒ 锁屏不再渲染，题目卡出现", async () => {
    httpBehavior.impl = statusHttp(true);
    const wrapper = await mountAndShow();
    expect(useCheckInStore().checkedIn).toBe(true);
    expect(wrapper.find(".lock-card").exists()).toBe(false);
    expect(wrapper.find(".lock-back").exists()).toBe(false);
    expect(wrapper.find(".question-card").exists()).toBe(true);
  });

  it("服务端说没签到 ⇒ 锁屏与「去签到」出口仍在（业务闸门没被顺手撤掉）", async () => {
    httpBehavior.impl = statusHttp(false);
    const wrapper = await mountAndShow();
    expect(useCheckInStore().checkedIn).toBe(false);
    expect(wrapper.find(".lock-card").exists()).toBe(true);
    expect(wrapper.find(".lock-card__cta").exists()).toBe(true);
    expect(wrapper.find(".question-card").exists()).toBe(false);
  });

  it("状态获取失败（请求 reject）⇒ 不把「没取到」写成已签到，页面留在锁屏", async () => {
    httpBehavior.impl = (options) => {
      if (options.url === "/check-in/status") return Promise.reject(new Error("网络超时"));
      return statusHttp(true)(options);
    };
    const wrapper = await mountAndShow();
    expect(useCheckInStore().checkedIn).toBe(false);
    expect(wrapper.find(".lock-card").exists()).toBe(true);
  });

  it("静态契约：入口走 store 既有刷新方法 onShow→fetchStatus，不自己拼 storage 读法", () => {
    expect(pageSource).toMatch(/onShow\(\(\) => \{\s*void checkInStore\.fetchStatus\(\);/u);
    // 状态来源只能来自 store，页面里不得出现「本地存储读签到态」这种第二真相源
    expect(pageSource).not.toMatch(/getStorageSync\([^)]*checkin/iu);
  });
});
