import { beforeEach, describe, expect, it, vi } from "vitest";
import zhCN from "../../i18n/locales/zh-CN";

/**
 * VIP 会员身份真相源（第六轮 W2-1）。
 *
 * <p>改前实况（实测）：`stores/vip.ts` 里 `isVipRaw` 全仓**唯一**的赋值是初始 `= false`
 * 与 `resetForLogout()` 的 `= false`，没有任何代码路径把它写成 true，也没导出它。
 * 于是 `isVip = isShowcaseMode || isVipRaw || isDevVipSimulated` 在正式包恒假
 * ——`likes` / `likes-visitors` 的「会员免费放行」分支不可达，真会员被按非会员扣交友币。</p>
 *
 * <p>本轮把身份判定接到后端真相源：`GET /vip/bills` 最近一笔 `status=SUCCESS` 账单的
 * `periodEnd`（与后端 `AutoRenewService.isVipExpiringSoon` 同一口径）。之所以不用
 * 「透传 `profileStore.vipStatus`」那条看起来更省的路：后端 `UserSessionView` 的字段里
 * 根本没有 `vipStatus`（`AuthController` 的接口描述写了「含 VIP 状态」，record 没这个字段），
 * 所以那份镜像在 real 模式恒为 `{isVip:false}`，透传同样是死路。</p>
 *
 * <p>判点口径：本文件是**行为级**判点（真 store + 真 action，只桩掉出网层并记录请求），
 * 不钉源码文本——把 `deriveVipStateFromBills` 的判定改坏，这里必红。</p>
 */

const httpCalls = vi.hoisted(() => [] as Array<{ url: string; method?: string }>);

const httpBehavior = vi.hoisted(() => ({
  impl: (): unknown => Promise.resolve({ items: [], total: 0, page: 0, size: 20, totalPages: 1 }),
}));

vi.mock("../../services/http", () => ({
  request: (options: { url: string; method?: string }) => {
    httpCalls.push(options);
    return httpBehavior.impl();
  },
  getToken: () => null,
  clearTokens: () => {},
}));

/** 强制 real 模式：mock 分支的 fetchBills 返回固定演示账单，会把「真相源」判点变成判夹具 */
vi.mock("../../stores/helpers/use-mock", () => ({ useMock: () => false }));

import { createPinia, setActivePinia } from "pinia";
import { useVipStore } from "../../stores/vip";

type BillSeed = {
  status?: "SUCCESS" | "FAILED" | "REFUNDED";
  periodEnd?: string | null;
  createdAt?: string;
};

function billsResponse(bills: BillSeed[]) {
  const items = bills.map((bill, index) => ({
    id: index + 1,
    userId: 1,
    planId: "quarterly",
    planName: "季度会员",
    amount: 4800,
    type: "SUBSCRIBE" as const,
    status: bill.status ?? "SUCCESS",
    periodStart: null,
    periodEnd: bill.periodEnd === undefined ? "2099-01-01T00:00:00" : bill.periodEnd,
    createdAt: bill.createdAt ?? "2026-11-01T00:00:00",
  }));
  return { items, total: items.length, page: 0, size: 20, totalPages: 1 };
}

/** 相对当前时间的 ISO 串（后端 periodEnd 就是无时区的本地 ISO，口径保持一致） */
function isoFromNow(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  httpCalls.length = 0;
  httpBehavior.impl = () => Promise.resolve(billsResponse([]));
  setActivePinia(createPinia());
  (globalThis as Record<string, any>).uni = {
    getStorageSync: vi.fn(() => ""),
    setStorageSync: vi.fn(),
    showToast: vi.fn(),
  };
});

describe("vip store：会员身份接账单真相源（W2-1）", () => {
  it("未取数时是 unknown 而不是「已判定为非会员」", () => {
    const store = useVipStore();
    expect(store.vipStatus).toBe("unknown");
    expect(store.isVip).toBe(false);
    // 未触发动作层 ⇒ 不该有任何出网
    expect(httpCalls).toHaveLength(0);
  });

  it("拉到未来到期的成功账单 ⇒ vipStatus=vip 且 isVip 为真", async () => {
    const end = isoFromNow(30);
    httpBehavior.impl = () => Promise.resolve(billsResponse([{ periodEnd: end }]));
    const store = useVipStore();
    const state = await store.refreshVipStatus();
    expect(state).toBe("vip");
    expect(store.vipStatus).toBe("vip");
    expect(store.isVip).toBe(true);
    expect(store.expireDate).toBe(end);
  });

  it("真相源走的是账单端点（GET /vip/bills），不是自造的状态端点", async () => {
    const store = useVipStore();
    await store.refreshVipStatus();
    expect(httpCalls.map((c) => c.url)).toContain("/vip/bills?page=0&size=20");
  });

  it("最近一笔成功账单已过期 ⇒ non_vip，isVip 为假", async () => {
    const expiredAt = isoFromNow(-1);
    httpBehavior.impl = () => Promise.resolve(billsResponse([{ periodEnd: expiredAt }]));
    const store = useVipStore();
    expect(await store.refreshVipStatus()).toBe("non_vip");
    expect(store.isVip).toBe(false);
    // 到期日仍如实回填（过期时间是「会员已到期」的证据，页面据此显示续费文案）
    expect(store.expireDate).toBe(expiredAt);
  });

  it("只有失败/退款账单 ⇒ 按「从未成功开通」判 non_vip", async () => {
    httpBehavior.impl = () =>
      Promise.resolve(
        billsResponse([
          { status: "REFUNDED", periodEnd: isoFromNow(30) },
          { status: "FAILED", periodEnd: isoFromNow(30) },
        ]),
      );
    const store = useVipStore();
    expect(await store.refreshVipStatus()).toBe("non_vip");
    expect(store.isVip).toBe(false);
  });

  it("成功账单没有可用 periodEnd ⇒ 停在 unknown，不判成非会员放行扣费", async () => {
    httpBehavior.impl = () => Promise.resolve(billsResponse([{ periodEnd: null }]));
    const store = useVipStore();
    expect(await store.refreshVipStatus()).toBe("unknown");
    expect(store.isVip).toBe(false);
  });

  it("取数失败 ⇒ 保持 unknown 并记录原因（宁可不扣，不许默认按非会员）", async () => {
    httpBehavior.impl = () => Promise.reject(new Error("账单查询失败，请稍后重试"));
    const store = useVipStore();
    expect(await store.ensureVipStatusLoaded()).toBe("unknown");
    expect(store.vipStatus).toBe("unknown");
    expect(store.vipStatusError).toBe("账单查询失败，请稍后重试");
    expect(store.isVip).toBe(false);
  });

  it("ensureVipStatusLoaded 已判定后复用内存态，不再出网", async () => {
    httpBehavior.impl = () => Promise.resolve(billsResponse([{ periodEnd: isoFromNow(30) }]));
    const store = useVipStore();
    await store.ensureVipStatusLoaded();
    const callsAfterFirst = httpCalls.length;
    expect(await store.ensureVipStatusLoaded()).toBe("vip");
    expect(httpCalls.length).toBe(callsAfterFirst);
  });

  it("并发调用只出一次网（同一次决策不重复拉账单）", async () => {
    httpBehavior.impl = () => Promise.resolve(billsResponse([{ periodEnd: isoFromNow(30) }]));
    const store = useVipStore();
    const [a, b] = await Promise.all([store.ensureVipStatusLoaded(), store.ensureVipStatusLoaded()]);
    expect(a).toBe("vip");
    expect(b).toBe("vip");
    expect(httpCalls.filter((c) => c.url.startsWith("/vip/bills"))).toHaveLength(1);
  });

  it("登出复位回到 unknown（既不沿用 A 的会员结论，也不写成非会员）", async () => {
    httpBehavior.impl = () => Promise.resolve(billsResponse([{ periodEnd: isoFromNow(30) }]));
    const store = useVipStore();
    await store.refreshVipStatus();
    expect(store.isVip).toBe(true);
    store.resetForLogout();
    expect(store.vipStatus).toBe("unknown");
    expect(store.isVip).toBe(false);
    expect(store.expireDate).toBeNull();
    expect(store.vipStatusError).toBeNull();
  });

  it("支付成功后 forceRefresh 会重取并覆盖旧结论", async () => {
    httpBehavior.impl = () => Promise.resolve(billsResponse([]));
    const store = useVipStore();
    expect(await store.refreshVipStatus()).toBe("non_vip");
    httpBehavior.impl = () => Promise.resolve(billsResponse([{ periodEnd: isoFromNow(60) }]));
    expect(await store.refreshVipStatus({ forceRefresh: true })).toBe("vip");
    expect(store.isVip).toBe(true);
  });

  it("账单分页正被别处拉取时不拿「当前页快照」判身份（停在 unknown，不多打一次请求）", async () => {
    let release: (v: unknown) => void = () => {};
    httpBehavior.impl = () =>
      new Promise((r) => {
        release = r;
      });
    const store = useVipStore();
    const inflightBills = store.fetchBills();
    // fetchBills 在途时返回的是「当前页快照」（此刻还是空表）——把它当成「不是会员」
    // 就是本条缺陷的另一种触发路径，所以这里必须拒绝判定。
    expect(await store.refreshVipStatus()).toBe("unknown");
    // store 侧走 `t()` 是本仓 `storeErrors.<模块>` 的既有口径（`stores/activity.ts` 同形），
    // UI 文案因此不写死在 store 里（i18n 裸中文棘轮守的就是这一位）。
    // 两条断言各管一半，都不许省：第一条钉「产出的就是这条键对应的文案」，
    // 第二条钉「键真的解析了」——键在语言资源里不存在时 vue-i18n 原样返回键名，
    // 那才是线上把 `storeErrors.vip.statusPending` 直接印给用户的样子（本条实测撞到过：
    // 键一度被我放进重复的 `storeErrors.vip` 块里被后者整体覆盖掉，于是取到键名）。
    expect(store.vipStatusError).toBe(zhCN.storeErrors.vip.statusPending);
    expect(store.vipStatusError).not.toMatch(/^storeErrors\./u);
    expect(httpCalls.filter((c) => c.url.startsWith("/vip/bills"))).toHaveLength(1);
    release(billsResponse([{ periodEnd: isoFromNow(30) }]));
    await inflightBills;
  });
});
