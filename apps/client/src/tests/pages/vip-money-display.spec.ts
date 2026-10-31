import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { reactive, ref } from "vue";
import { i18n } from "../../i18n";
import PromoCodePage from "../../subpackages/vip/promo-code.vue";
import BillsPage from "../../subpackages/vip/bills.vue";

/**
 * 资金展示页不许拿客户端镜像当报价（P2 修复，2026-10-31）。
 *
 * 两条在册缺陷：
 * 1. `subpackages/vip/promo-code.vue` 用 `VIP_PLANS` 季卡的**静态镜像价**播种
 *    「订单金额」输入框，再把它换算成分当 `baseAmount` 上送，并把
 *    `payableAmount ?? orderAmountCents` 印成「应付 ¥X」—— 而服务端
 *    `PromoCodeService.ValidateResultView` 发的字段叫 `finalAmount`（可用性叫 `valid`），
 *    `?? orderAmountCents` 在 real 档**永远**命中右侧 ⇒ 页面向用户报的是一个
 *    服务端从没报过、也与成交口径无关的数（此前被 featureFlags.membershipEnabled=false
 *    遮住：进页即 toast + 弹走，所以没人看得见）。
 * 2. `subpackages/vip/bills.vue` 的 `formatAmount()` 只印 `(cents/100).toFixed(2)`，
 *    模板在最前面硬拼一个 `¥` ⇒ REFUND 行与订阅行长得一模一样（钱回来 / 钱付出去不分）。
 *
 * 本测把两处都按**渲染结果**判：镜像价不许出现在页面上，报价只可能来自服务端字段，
 * 退款行的符号+币种必须看得见，且带符号的金额不可能被印成双符号。
 */

const hooks = vi.hoisted(() => ({
  onLoad: [] as Array<() => unknown>,
  onShow: [] as Array<() => unknown>,
  onPullDownRefresh: [] as Array<() => unknown>,
}));

const state = vi.hoisted(() => ({
  /** promo-code：store 的最近一次校验/兑换结果（按服务端真实字段名造） */
  lastValidation: null as unknown,
  lastRedeemResult: null as unknown,
  /** bills：账单行 */
  bills: [] as Array<Record<string, unknown>>,
}));

vi.mock("@dcloudio/uni-app", () => ({
  onLoad: (cb: () => unknown) => hooks.onLoad.push(cb),
  onShow: (cb: () => unknown) => hooks.onShow.push(cb),
  onPullDownRefresh: (cb: () => unknown) => hooks.onPullDownRefresh.push(cb),
  onUnload: () => {},
  onHide: () => {},
  onReady: () => {},
  onReachBottom: () => {},
  onShareAppMessage: () => {},
}));

// 会员开关必须打开，否则两条腿都在「功能未启用 → 弹走」的分支上，判不到金额
vi.mock("../../config/feature-flags", () => ({
  featureFlags: { membershipEnabled: true },
}));

vi.mock("../../composables/useMenuButtonRect", () => ({
  useMenuButtonRect: () => ({ styleVars: {} }),
}));

vi.mock("../../stores/promo-code", () => ({
  usePromoCodeStore: () =>
    reactive({
      get lastValidation() {
        return state.lastValidation;
      },
      get lastRedeemResult() {
        return state.lastRedeemResult;
      },
      validating: false,
      redeeming: false,
      validateCode: vi.fn(() => Promise.resolve(state.lastValidation)),
      redeemCode: vi.fn(() => Promise.resolve(state.lastRedeemResult)),
      reset: () => {},
    }),
}));

vi.mock("../../stores/vip-billing", () => ({
  useVipBillingStore: () =>
    reactive({
      get bills() {
        return state.bills;
      },
      loading: false,
      listBills: vi.fn(() => Promise.resolve()),
    }),
}));

function resetAll() {
  hooks.onLoad.length = 0;
  hooks.onShow.length = 0;
  hooks.onPullDownRefresh.length = 0;
  state.lastValidation = null;
  state.lastRedeemResult = null;
  state.bills = [];
}

describe("优惠码页：报价只可能来自服务端", () => {
  beforeEach(() => resetAll());

  it("订单金额输入框不再被套餐镜像价播种（改前是 48）", () => {
    const wrapper = mount(PromoCodePage, { global: { plugins: [i18n] } });
    for (const cb of hooks.onLoad) cb();
    const amountInput = wrapper.find("input.amount-input");
    expect(amountInput.exists()).toBe(true);
    expect(amountInput.attributes("value") ?? "").toBe("");
    expect(wrapper.text()).not.toContain("48");
  });

  it("服务端回传 finalAmount（后端契约名）时，应付/优惠按服务端值渲染", () => {
    // 后端 PromoCodeService.ValidateResultView 的真实字段名
    state.lastValidation = {
      promoCodeId: 1,
      code: "SPRING10",
      discountType: "AMOUNT",
      discountValue: 1000,
      discountAmount: 1000,
      finalAmount: 3800,
      valid: true,
    };
    const wrapper = mount(PromoCodePage, { global: { plugins: [i18n] } });
    for (const cb of hooks.onLoad) cb();
    const text = wrapper.text();
    expect(text).toContain("¥38.00"); // 应付 = 服务端 finalAmount，不是客户端倒推
    expect(text).toContain("¥10.00"); // 优惠 = 服务端 discountAmount
    // 后端发的是 valid，改前按 available 读 ⇒ 兑换入口永不出现（这里钉住归一后的行为）
    expect(wrapper.find(".footer__btn").exists()).toBe(true);
  });

  it("服务端没报应付金额时，那一行宁可不渲染（不许回落成客户端自算值）", () => {
    state.lastValidation = {
      code: "PERCENT10",
      discountType: "PERCENT",
      discountValue: 10,
      discountAmount: 480,
      // 没有 finalAmount / payableAmount
      valid: true,
    };
    const wrapper = mount(PromoCodePage, { global: { plugins: [i18n] } });
    for (const cb of hooks.onLoad) cb();
    const text = wrapper.text();
    expect(text).toContain("¥4.80"); // 服务端报了优惠 ⇒ 显示
    expect(text).not.toContain("应付金额¥"); // 服务端没报应付 ⇒ 该行不存在
    expect(text).not.toContain("¥48.00"); // 也绝不出现「输入框现值」那种假报价
  });

  it("把 VIP_PLANS 重新接回来当金额来源＝判据必须红（镜像表只许留在展示层）", () => {
    const src = readVipPlanConsumer();
    // 判据看的是【代码】，不是文件里的字符：修复说明必须能写出 config/vip-plans.ts 这个
    // 名字（不然下一条注释就过不了门），所以先剥掉块注释与行注释再断言。
    // 行注释的匹配要求 // 前面是行首或空白，否则 "https://…" 这种字符串会被误伤。
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
    expect(codeOnly).not.toContain("vip-plans");
    expect(codeOnly).not.toMatch(/\bVIP_PLANS\b/);
  });
});

describe("账单页：退款行的符号与币种", () => {
  beforeEach(() => resetAll());

  function mountBills() {
    const wrapper = mount(BillsPage, { global: { plugins: [i18n], stubs: { "scroll-view": true } } });
    for (const cb of hooks.onShow) cb();
    return wrapper;
  }

  it("REFUND 行印出 +¥（改前是与订阅行同形的裸数字）", () => {
    state.bills = [
      {
        id: 1,
        userId: 1,
        planId: "monthly",
        planName: "月卡",
        amount: 1800,
        type: "REFUND",
        status: "REFUNDED",
      },
      {
        id: 2,
        userId: 1,
        planId: "monthly",
        planName: "月卡",
        amount: 1800,
        type: "SUBSCRIBE",
        status: "SUCCESS",
      },
    ];
    const amounts = mountBills()
      .findAll(".bill-card__value--amount")
      .map((n) => n.text());
    expect(amounts[0]).toBe("+¥18.00");
    expect(amounts[1]).toBe("¥18.00");
  });

  it("后端哪天改成有符号金额：符号只派生一次，绝不出现双符号", () => {
    state.bills = [
      {
        id: 3,
        userId: 1,
        planId: "quarterly",
        planName: "季卡",
        amount: -4800, // 带符号的退款/冲销形态
        type: "REFUND",
        status: "REFUNDED",
      },
    ];
    const text = mountBills().find(".bill-card__value--amount").text();
    expect(text).toBe("-¥48.00");
    expect(text).not.toContain("--");
  });

  it("划线原价仍是不带符号的裸价（符号判点只落在实际发生的那一笔）", () => {
    state.bills = [
      {
        id: 4,
        userId: 1,
        planId: "yearly",
        planName: "年卡",
        amount: 15800,
        originalAmount: 33600,
        type: "SUBSCRIBE",
        status: "SUCCESS",
      },
    ];
    const wrapper = mountBills();
    expect(wrapper.find(".bill-card__value--amount").text()).toBe("¥158.00");
    expect(wrapper.find(".bill-card__value--strike").text()).toBe("¥336.00");
  });
});

/** 读 promo-code.vue 源码：镜像表不许再被当成金额来源 */
function readVipPlanConsumer(): string {
  return readFileSync(resolve(__dirname, "../../subpackages/vip/promo-code.vue"), "utf8");
}
