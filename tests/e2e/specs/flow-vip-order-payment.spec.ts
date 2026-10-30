import { expect, request, test } from '@playwright/test';
import {
  API_BASE,
  errorEnvelope,
  gotoRoute,
  loginAsMockUser,
  toastWithText,
  trackRequests,
  waitForHash,
} from '../flow-helpers';

/**
 * 流程 4：VIP 下单 + 支付回调（@core-journey @vip）。
 *
 * <p><b>钱的路径必须真实栈取证，mock 档给不了可发货证据——这条前提在本仓是真不成立</b>，
 * 逐条核过的原因写在这里，别读成一闪而过的注释：</p>
 * <ol>
 *   <li>mock 档「立即开通」压根不下单：subpackages/vip/index.vue:186-215 ——
 *       `isMockMode()` 分支只做 `setTimeout(MOCK_PAYMENT_DELAY_MS=1200)` 后
 *       `resolve({ok:true})` 再弹成功模态框，**不发 POST /v1/vip/orders，
 *       不调 uni.requestPayment，不产生订单号**。它是 UI 走查用的假支付。</li>
 *   <li>VIP 页在默认构建里根本进不去：config/feature-flags.ts:40
 *       `membershipEnabled: false` 是编译期常量，唯一置 true 的运行时入口是
 *       config/showcase.ts:68-71 的 applyShowcaseMode()，而它只在
 *       VITE_SHOWCASE_MODE=true 的展示构建里执行；
 *       tests/e2e/playwright.config.ts:76-87 的 webServer 起的是 `dev:h5`（无该变量）。
 *       于是 vip/index.vue:60-69 的 onLoad 守卫直接把页弹回「我的」Tab
 *       （= 名册 routes.generated.ts:931-942 登记的 flag-bounce 族）。</li>
 *   <li>因此本文件 mock 档钉的是两条**真实存在的规则**：会员封存时 VIP 页必须回弹、
 *       且回弹全程不得发出任何下单请求（负判据，真下单就该红）；
 *       真正的下单/入账验签在下面的 real 档用例里钉，
 *       门控与 specs/real-stack-smoke.spec.ts:26-29 同口径（E2E_API_MODE=real，
 *       由 .github/workflows/ci.yml 的 e2e-real job 注入 E2E_BASE_URL/E2E_API_BASE_URL）。
 *       mock 档 E2E job（ci.yml:572-623）不跑下面的用例。</li>
 * </ol>
 *
 * <p>real 档用例的可证范围也如实标注：CI 的 e2e-real job 不带微信支付凭据
 * （ci.yml:664-690 只注入 DB/Redis/JWT，没有 WECHAT_PAY_* ），
 * 且 app_switch 的 commerce 三闸 seed 成 FALSE
 * （database/flyway/sql/V2026.09.01.0001__seed_commerce_switches.sql）。
 * 所以「下单成功 → 拿到 paySign → 回调入账」这条正向资金链在现有载具里同样不可证；
 * 能钉的是<b>封存态必须拒绝、回调不得被伪造报文推进</b>这两条 fail-closed 判据。</p>
 */

const VIP_ROUTE = '/subpackages/vip/index';
const PROFILE_ROUTE = '/pages/profile/index';

test.describe('VIP 下单与支付 @core-journey @vip', () => {
  test('会员封存时 VIP 页回弹到「我的」，并给出「会员功能暂未开放」提示 @core-journey @vip', async ({
    page,
  }) => {
    // Arrange：登录态直达 VIP 页（排除游客登录引导这一层干扰）
    await loginAsMockUser(page);

    // Act
    await gotoRoute(page, VIP_ROUTE);

    // Assert 1（硬判据）：落点是「我的」，不是 VIP 页（vip/index.vue:60-69 onLoad 守卫）
    await waitForHash(page, PROFILE_ROUTE, 15_000);
    await expect(page.locator('.profile-page').first()).toBeVisible();

    // Assert 2（软判据）：给出真实原因（vip.membershipDisabled，zh-CN.ts:2523）。
    // 软断言的理由：guardMembershipDisabled() 的 toast 与随后的 switchTab 同帧竞争，
    // H5 上导航可能截掉 toast——那是提示可见性的缺陷，不该把「封存必回弹」这条主规则一起判红。
    await expect
      .soft(toastWithText(page, '会员功能暂未开放'), '封存回弹应说明原因而不是静默跳转')
      .toBeVisible({ timeout: 8_000 });
  });

  test('mock 档访问 VIP 页全程不得发出任何下单/充值请求 @vip', async ({ page }) => {
    // Arrange：把下单与充值两条资金写路径都盯住
    const moneyWrites = trackRequests(page, /\/v1\/(vip\/orders|vip\/bills\/purchase|wallet\/recharge)/u);
    await loginAsMockUser(page);

    // Act
    await gotoRoute(page, VIP_ROUTE);
    await waitForHash(page, PROFILE_ROUTE, 15_000);

    // Assert：负判据——会员封存态不得出现任何资金写请求；出现即说明假支付泄漏成真请求
    expect(
      moneyWrites,
      `封存态发出了资金写请求：${moneyWrites.join(' | ')}`,
    ).toHaveLength(0);
  });

  test('VIP 封存回弹过程不得抛出未捕获 JS 错误，也不得把套餐/开通按钮渲染到「我的」页 @vip', async ({
    page,
  }) => {
    // Arrange：错误采集口径同 specs/all-pages-smoke.spec.ts:75-82
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    await loginAsMockUser(page);

    // Act
    await gotoRoute(page, VIP_ROUTE);
    await waitForHash(page, PROFILE_ROUTE, 15_000);

    // Assert 1：导航竞态（onLoad 里弹页）最容易出现的就是未捕获异常
    expect(errors, `VIP 回弹链路存在 JS 错误：${errors.join(' | ')}`).toEqual([]);

    // Assert 2：付费 UI 三件套一律不得渲染——
    // 套餐卡 .plan-card、开通按钮 .footer__btn、应付金额 .footer__price（vip/index.vue 模板）
    await expect(page.locator('.plan-card'), '封存态不得渲染出可选套餐').toHaveCount(0);
    await expect(page.locator('.footer__btn'), '封存态不得渲染出「立即开通」按钮').toHaveCount(0);
    await expect(page.locator('.footer__price')).toHaveCount(0);
  });
});

// ────────────────────────────────────────────────────────────
// 真实栈：资金链的 fail-closed 判据（门控口径同 real-stack-smoke.spec.ts）
// ────────────────────────────────────────────────────────────
test.describe('VIP 下单与支付回调（真实栈） @core-journey @vip', () => {
  test.skip(
    process.env.E2E_API_MODE !== 'real',
    '资金路径必须打真实后端：mock E2E 载具没有后端，且 vip/index.vue:186-215 的 mock 支付是 setTimeout 假成功，拿它当「支付跑通」是假绿',
  );

  test('登录用户下单：商业化封存时必须 403 COMMERCE_DISABLED，且不得返回任何支付参数 @core-journey @vip', async () => {
    const api = await request.newContext({ baseURL: API_BASE, timeout: 30_000 });
    try {
      const login = await api.post('v1/auth/guest-login');
      expect(login.status(), await login.text()).toBe(200);
      const body = await login.json();
      const token: string | undefined = body.token ?? body.data?.token;
      expect(token, 'guest-login 必须返回 token').toBeTruthy();

      // VipOrderController.java:58-67 —— @FeatureSwitch(COMMERCE_VIP) + @PreAuthorize(USER)
      const order = await api.post('v1/vip/orders', {
        headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': `e2e-vip-${Date.now()}` },
        data: { planId: 'monthly' },
      });

      // 闸封（FeatureSwitchKeys.java:27 缺省 false，seed 亦为 FALSE）→ 403 COMMERCE_DISABLED
      // （CommerceGuardAspect.java:16 / GlobalExceptionHandler.java:222-230）
      expect(order.status(), await order.text()).toBe(403);
      const env = errorEnvelope(await order.json());
      expect(env.error, `封存错误码必须是 COMMERCE_DISABLED，实际 ${env.error}`).toBe(
        'COMMERCE_DISABLED',
      );

      // 负判据：拒绝态绝不泄漏 wx.requestPayment 五件套
      const raw = JSON.stringify(env);
      expect(raw).not.toContain('paySign');
      expect(raw).not.toContain('prepay');
    } finally {
      await api.dispose();
    }
  });

  test('支付回调：伪造报文不得被承认入账（配置闸关闭时 404，开启时必须 FAIL）@core-journey @vip', async () => {
    const api = await request.newContext({ baseURL: API_BASE, timeout: 30_000 });
    try {
      // BillingController.java:112-139 —— 无 Wechatpay-Signature 头的伪造回调
      const forged = {
        id: 'e2e-forged-notify',
        event_type: 'TRANSACTION.SUCCESS',
        resource: { ciphertext: 'x', nonce: 'x', associated_data: 'x' },
      };
      const res = await api.post('v1/vip/bills/payment-callback', {
        data: forged,
        headers: { 'Content-Type': 'application/json' },
      });

      const status = res.status();
      const text = await res.text();

      // 只允许两种合法终态：① 微信支付配置闸未开 → 404（BillingController.java:121-123）；
      // ② 配置闸已开但验签失败 → 200 + {"code":"FAIL"}（:133-138，微信侧要求 HTTP 200 承载 FAIL）。
      // 塌成 500 说明伪造报文穿透了防护层，属于必须红的失效。
      expect(
        [404, 200],
        `伪造回调落到未预期状态 ${status}，响应体：${text}`,
      ).toContain(status);

      let code: string | undefined;
      try {
        code = (JSON.parse(text) as { code?: string }).code;
      } catch {
        code = undefined;
      }
      expect(
        code,
        `伪造回调绝不能被承认为已入账（status=${status}，响应体=${text}）`,
      ).not.toBe('SUCCESS');
      expect(text, `响应体不得回显 SUCCESS 语义：${text}`).not.toContain('SUCCESS');
    } finally {
      await api.dispose();
    }
  });

  test('订单查询按用户隔离：非本人订单号不得返回订单内容 @core-journey @vip', async () => {
    const api = await request.newContext({ baseURL: API_BASE, timeout: 30_000 });
    try {
      // 独立访客（P0-4 访客隔离：每次 guest-login 新建账号）
      const loginA = await api.post('v1/auth/guest-login');
      expect(loginA.status(), await loginA.text()).toBe(200);
      const tokenA: string | undefined = (await loginA.json()).token;
      expect(tokenA, 'guest-login 必须返回 token').toBeTruthy();

      // VipOrderController.java:77-81 的读键是
      // VipOrderService.java:303 `findByUserIdAndOrderNo(userId, orderNo)`——
      // 归属过滤写在查询条件里，别人的单号对本用户等价于「不存在」，
      // 服务层抛 IllegalArgumentException → 400（GlobalExceptionHandler.java:126）。
      const foreign = await api.get('v1/vip/orders/VIP99999999999999', {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const status = foreign.status();
      const text = await foreign.text();

      // 硬判据：既不得 2xx（读到别人的单），也不得塌成 5xx
      expect(status < 300, `跨用户订单读取被放行为 ${status}：${text}`).toBe(false);
      expect(status < 500, `跨用户订单读取塌成 ${status}：${text}`).toBe(true);

      // 负判据：响应体不得带出任何订单字段
      expect(text, `响应体泄漏订单内容：${text}`).not.toContain('amountCents');
      expect(text, `响应体泄漏订单内容：${text}`).not.toContain('paidAt');
    } finally {
      await api.dispose();
    }
  });
});
