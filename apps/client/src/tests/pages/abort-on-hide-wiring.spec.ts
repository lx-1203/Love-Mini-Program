import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "vue/compiler-sfc";
import { reactive } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";

/**
 * `useAbortOnHide` 的消费者与真实取消行为（第六轮 W2-3）。
 *
 * <p>改前实况：`grep -rn "useAbortOnHide" apps/client/src` 除 composable 自身外只有
 * `services/http.ts:937` 的一句注释在引用它 ⇒ 消费者 0、判点 0。那句注释让
 * 「页面级取消已存在」成为可被引用的假事实，而 74 页里 0 页取消在途请求。</p>
 *
 * <p>本轮选择「接上」而不是「撤掉」，接的是三处**页面自持的只读首屏请求**
 * （只有这一类能被页面级 signal 覆盖：store action 自己构造 request，页面拿不到它的 signal）：</p>
 * <ul>
 *   <li>`subpackages/market/shop/index.vue` — GET /products（onShow 会重拉 ⇒ onHide 取消安全）；</li>
 *   <li>`subpackages/profile-extra/profile/tasks.vue` — GET /tasks（同上；
 *       写请求 POST /tasks/{code}/claim 刻意不接，切后台不该撤销一次领积分）；</li>
 *   <li>`subpackages/market/detail/index.vue` — GET /products/{id}（本页只有 onLoad 取数、
 *       无 onShow 重拉 ⇒ 只开 abortOnUnmount，否则切一次后台就把页面永久留在错误态）。</li>
 * </ul>
 *
 * <p>判点两条腿：静态钉「这三页确实 import 了 composable 且受限的那次 request 带了 signal」
 * （能被反向变异判红），加一条挂载级「onHide 之后在途请求的 signal 真的 aborted、
 * 迟到的响应不再写回列表」——后者证明接上去的不是一个空口 signal。</p>
 */

const ROOT = resolve(__dirname, "../..");
const SHOP = resolve(ROOT, "subpackages/market/shop/index.vue");
const DETAIL = resolve(ROOT, "subpackages/market/detail/index.vue");
const TASKS = resolve(ROOT, "subpackages/profile-extra/profile/tasks.vue");

function source(path: string): string {
  return readFileSync(path, "utf-8");
}

/** 取 `<script setup>` 体：静态判点只看脚本，模板不参与 */
function scriptBody(path: string): string {
  const { descriptor } = parse(source(path));
  return descriptor.scriptSetup?.content ?? "";
}

/* ---------------- 挂载腿：商城页的在途取消 ---------------- */

type HttpOpts = { url: string; method?: string; signal?: AbortSignal };

const httpCalls = vi.hoisted(() => [] as HttpOpts[]);

const httpBehavior = vi.hoisted(() => ({
  impl: (_options: HttpOpts): Promise<unknown> => Promise.resolve({ items: [], total: 0, page: 0, pageSize: 20 }),
}));

const hooks = vi.hoisted(() => ({
  onShow: [] as Array<() => unknown>,
  onHide: [] as Array<() => unknown>,
  onLoad: [] as Array<(query?: Record<string, unknown>) => unknown>,
}));

vi.mock("@dcloudio/uni-app", () => ({
  onShow: (cb: () => unknown) => {
    hooks.onShow.push(cb);
  },
  onHide: (cb: () => unknown) => {
    hooks.onHide.push(cb);
  },
  onLoad: (cb: (query?: Record<string, unknown>) => unknown) => {
    hooks.onLoad.push(cb);
  },
  onUnload: () => {},
  onReady: () => {},
  onReachBottom: () => {},
  onPullDownRefresh: () => {},
  onShareAppMessage: () => {},
}));

vi.mock("../../services/http", () => ({
  request: (options: HttpOpts) => {
    httpCalls.push(options);
    const target = httpBehavior.impl(options);
    const signal = options.signal;
    if (!signal) return target;
    // 对齐真身 `services/http.ts:924-960` 的契约：signal aborted ⇒ 该次请求 reject，
    // 调用方的 catch 因此不会把迟到的响应写回页面态。桩件必须同样 honored，
    // 否则这里测的只是「页面传了个 signal」而不是「signal 真能挡住回写」。
    return new Promise<unknown>((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error("请求已取消"));
        return;
      }
      const onAbort = () => reject(new Error("请求已取消"));
      signal.addEventListener?.("abort", onAbort, { once: true });
      target.then(
        (value) => {
          signal.removeEventListener?.("abort", onAbort);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener?.("abort", onAbort);
          reject(error);
        },
      );
    });
  },
  getToken: () => null,
  clearTokens: () => {},
}));

/** real 分支才出网（mock 分支的 /products 是本地 setTimeout 夹具，signal 根本不会经过） */
vi.mock("../../stores/helpers/use-mock", () => ({ useMock: () => false }));

vi.mock("../../stores/checkin", () => ({
  useCheckInStore: () => reactive({ checkedIn: false, pointsBalance: 0, fetchStatus: () => Promise.resolve() }),
}));

vi.mock("../../stores/app-config", () => ({
  useAppConfigStore: () => reactive({ isCommerceOn: () => true }),
}));

vi.mock("../../composables/useMenuButtonRect", () => ({
  useMenuButtonRect: () => ({ styleVars: {} }),
}));

vi.mock("../../utils/media", () => ({
  resolveMediaUrl: (v: string) => v,
  isUploadedMediaUrl: () => false,
}));

import ShopPage from "../../subpackages/market/shop/index.vue";

beforeEach(() => {
  vi.clearAllMocks();
  httpCalls.length = 0;
  hooks.onShow.length = 0;
  hooks.onHide.length = 0;
  hooks.onLoad.length = 0;
  httpBehavior.impl = () => Promise.resolve({ items: [], total: 0, page: 0, pageSize: 20 });
});

describe("useAbortOnHide：接上真实消费者（W2-3）", () => {
  it("静态：三处页面各自持有一次页面级取消，且不再有「零消费者」形态", () => {
    for (const [label, path] of [["商城列表", SHOP], ["商品详情", DETAIL], ["任务列表", TASKS]] as const) {
      const script = scriptBody(path);
      expect(script, `${label} 必须 import useAbortOnHide`).toMatch(
        /import\s*\{\s*useAbortOnHide\s*\}\s*from\s*"[^"]*composables\/useAbortOnHide"/u,
      );
      expect(script, `${label} 必须解出页面级 signal`).toMatch(/useAbortOnHide\s*\(([^)]*)?\)/u);
      expect(script, `${label} 的取数请求必须带 signal`).toMatch(/signal:\s*pageSignal\.value/u);
    }
  });

  it("静态：详情页只关卸载取消（不许把只取一次的页面判成错误态）", () => {
    expect(scriptBody(DETAIL)).toMatch(/useAbortOnHide\(\{\s*abortOnHide:\s*false\s*\}\)/u);
    // 列表页/任务页保持 onHide 取消（它们 onShow 会重拉）
    expect(scriptBody(SHOP)).toMatch(/const\s*\{\s*signal:\s*pageSignal\s*\}\s*=\s*useAbortOnHide\(\)/u);
    expect(scriptBody(TASKS)).toMatch(/const\s*\{\s*signal:\s*pageSignal\s*\}\s*=\s*useAbortOnHide\(\)/u);
  });

  it("静态：商品详情里写商品态的那次请求带 signal，且商品态只有一个写点", () => {
    const script = scriptBody(DETAIL);
    const requestStart = script.indexOf("const view = await request<ProductDetail>({");
    expect(requestStart).toBeGreaterThan(-1);
    const callText = script.slice(requestStart, script.indexOf("});", requestStart) + 3);
    expect(callText).toContain("signal: pageSignal.value");
  });

  it("挂载：onHide 之后在途商品请求的 signal 进入 aborted（不是空口接上）", async () => {
    let release: (v: unknown) => void = () => {};
    httpBehavior.impl = () =>
      new Promise((r) => {
        release = r;
      });
    const wrapper: VueWrapper = mount(ShopPage);
    await flushPromises();
    for (const cb of hooks.onShow) await cb();
    await flushPromises();

    const products = httpCalls.filter((c) => c.url === "/products");
    expect(products).toHaveLength(1);
    const signal = products[0]?.signal;
    expect(signal, "商城首屏 /products 必须挂页面级 signal").toBeTruthy();
    expect(signal?.aborted).toBe(false);

    for (const cb of hooks.onHide) cb();
    expect(signal?.aborted).toBe(true);

    // 迟到的响应不能把商品写回列表（这正是「离开页面后在途请求继续写」的实害形态）
    release({ items: [{ id: 9, name: "迟到的一条", description: "", price: 1, originalPrice: null, imageUrl: null, category: "goods", sales: 0, stock: 0, createdAt: null }], total: 1, page: 0, pageSize: 20 });
    await flushPromises();
    expect(wrapper.text()).not.toContain("迟到的一条");
  });

  it("挂载：回到前台（onShow）会重建 signal，下一次取数用的是未取消的新 signal", async () => {
    const wrapper: VueWrapper = mount(ShopPage);
    await flushPromises();
    for (const cb of hooks.onShow) await cb();
    await flushPromises();
    const first = httpCalls.filter((c) => c.url === "/products")[0]?.signal;
    for (const cb of hooks.onHide) cb();
    expect(first?.aborted).toBe(true);

    for (const cb of hooks.onShow) await cb();
    await flushPromises();
    const second = httpCalls.filter((c) => c.url === "/products")[1]?.signal;
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    expect(second?.aborted).toBe(false);
    wrapper.unmount();
  });
});
