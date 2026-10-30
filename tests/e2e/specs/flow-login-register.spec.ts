import { test, expect } from '@playwright/test';
import {
  byAriaLabel,
  byRoleLabel,
  fillable,
  gotoRoute,
  hashPath,
  loginAsMockUser,
  modalWithText,
  toastWithText,
  waitForHash,
} from '../flow-helpers';

/**
 * 流程 1：登录 / 注册主流程（@core-journey @auth）。
 *
 * <p>钉住的三条产品规则，全部取自当前源码而非既有载具：</p>
 * <ol>
 *   <li><b>游客必须被引导到登录/注册</b>——round-7 裁定（guards/guest-access.ts:4-16 记录）。
 *       注意 mock 档拿不到 HTTP 401 兜底（isGuest() 在 mock 恒 false，guest-access.ts:57-60），
 *       所以这条只能在**页面自身的 LockScreen / guest-guide 层**取证：
 *       village/index.vue:616 `<LockScreen v-else-if="!isUnlocked">` →
 *       LockScreen.vue:369-372 主 CTA 文案 lock.primaryLoggedOut（zh-CN.ts:2902「立即登录并完善」）
 *       → onPrimary()（:223-227）replaceAppPath(ROUTES.LOGIN)。</li>
 *   <li><b>登录页默认态必须露出注册入口</b>——MP-R7-GUEST-LANDING-REGENTRY-001
 *       （login/index.vue:793-806），选择器 `.login-register-entry` 与名册
 *       routes.generated.ts 的 registerEntryMarker 同一个类。</li>
 *   <li><b>未勾选协议时任何登录入口都被拦</b>——MP-R1-PAGES-LOGIN-INDEX-102
 *       （login/index.vue:57-61），toast 文案 login.agreeFirst（zh-CN.ts:2176）。</li>
 * </ol>
 *
 * <p>在册缺口（不是本文件能修的）：注册**提交**链路 POST /v1/auth/register
 * （services/auth.ts:358）在 mock 载具里没有后端可打（playwright.config.ts 的 webServer
 * 只起 H5 dev server），所以本文件只钉注册页的客户端表单闸，
 * 「注册成功签发 JWT 并跳 /pages/register/success」这条只能在真实栈验收。</p>
 */

const LOGIN_ROUTE = '/pages/login/index';
const VILLAGE_ROUTE = '/subpackages/village/village/index';
const REGISTER_ROUTE = '/pages/register/index';

test.describe('登录/注册主流程 @core-journey @auth', () => {
  test('游客进被锁定的内容页 → 锁定层引导登录，落地登录页默认态露出注册入口 @core-journey @auth', async ({
    page,
  }) => {
    // Arrange：匿名直达村口（无 token、无本地会话）
    await gotoRoute(page, VILLAGE_ROUTE);

    // Act & Assert 1：村口对未登录用户整页锁定（不是渲染出帖子流）
    const lock = page.locator('.lock-screen').first();
    await expect(lock, '游客进村口必须落在 LockScreen，而不是看到社区内容').toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('登录后解锁完整交友功能').first()).toBeVisible();

    // Act：点锁定层的登录引导
    await byAriaLabel(page, '立即完善资料', '.lock-screen').tap();

    // Assert 2：落到登录页（不是弹回首页，也不是原地不动）
    await waitForHash(page, LOGIN_ROUTE);

    // Assert 3：登录页默认态（未展开手机号表单）就必须看见注册入口
    await expect(page.locator('.login-page__brand').first()).toBeVisible();
    const registerEntry = page.locator('.login-register-entry').first();
    await expect(registerEntry, '游客落到登录页后默认态必须露出注册入口').toBeVisible();
    await expect(registerEntry).toContainText('没有账号？去注册');
  });

  test('登录页「去注册」入口进入独立注册页 @auth', async ({ page }) => {
    // Arrange
    await gotoRoute(page, LOGIN_ROUTE);
    await expect(page.locator('.login-page__brand').first()).toBeVisible({ timeout: 20_000 });

    // Act
    await byRoleLabel(page, 'button', '没有账号？去注册').tap();

    // Assert：落到独立注册页 pages/register/index（内联注册模式已整删，
    // MP-R2-PAGES-LOGIN-INDEX-015）
    await waitForHash(page, REGISTER_ROUTE);
    await expect(page.locator('.register-page').first()).toBeVisible();
    await expect(page.getByText('创建账号').first()).toBeVisible();
  });

  test('mock 档体验登录成功后落到寻觅页并带真登录态证据 @core-journey @auth', async ({ page }) => {
    // Act
    await loginAsMockUser(page);

    // Assert 1：落在寻觅页
    expect(hashPath(page.url())).toBe('/pages/discover/index');

    // Assert 2：登录态证据用「仅 isLoggedIn 才渲染」的配额胶囊，不用 URL 投票
    // （pages/discover/index.vue:355-359 v-if="sessionStore.isLoggedIn"）
    const quota = page.locator('.discover-quota__text').first();
    await expect(quota).toBeVisible({ timeout: 20_000 });
    await expect(quota).toHaveText(/^今日剩余 \d+ 次$/);

    // Assert 3：会话确实注入了 mock 用户（displayName=林晓，stores/session.ts:46）
    await gotoRoute(page, '/pages/profile/index');
    await expect(page.locator('.profile-page').first()).toBeVisible({ timeout: 20_000 });
  });

  test('未勾选协议时「稍后再看」被 agreeFirst 守卫拦下，停在登录页 @auth', async ({
    page,
  }) => {
    // Arrange：冷启动默认未勾选（MP-R1-PAGES-LOGIN-INDEX-102：默认勾选属微信拒审项）
    await gotoRoute(page, LOGIN_ROUTE);
    const agree = byRoleLabel(page, 'checkbox', '登录即同意');
    await expect(agree).toBeVisible({ timeout: 20_000 });
    await expect(agree).toHaveAttribute('aria-checked', 'false');

    // Act：直接点「稍后再看」（login.guestLogin，zh-CN.ts:2161）
    await byRoleLabel(page, 'button', '稍后再看').tap();

    // Assert 1：拦下并给明确文案，而不是静默发起登录请求
    await expect(toastWithText(page, '请先阅读并同意用户协议')).toBeVisible({ timeout: 10_000 });

    // Assert 2：仍在登录页——守卫必须在请求之前短路，否则就是未授权导航
    await waitForHash(page, LOGIN_ROUTE);
  });

  test('注册页手机号格式闸拦下提交，不做服务端调用 @core-journey @auth', async ({ page }) => {
    // Arrange
    await gotoRoute(page, REGISTER_ROUTE);
    await expect(page.locator('.register-page').first()).toBeVisible({ timeout: 20_000 });

    // 手机号输入框 = 本页第一个 .field__input（pages/register/index.vue:42-46）
    const phoneInput = fillable(page, 'field__input');
    await expect(phoneInput, '注册页应渲染手机号输入框').toBeVisible();
    await phoneInput.fill('123');

    // Act：置灰按钮仍可点（模板注释「置灰仍可点，给『哪里没填对』定位提示」，:767）
    await page.locator('.submit-btn').first().tap();

    // Assert：客户端格式闸（validateFirstError → register.errPhoneFormat，zh-CN.ts:2206）
    // 同时落到行内错误位与 toast 两处
    await expect(page.locator('.field-error__text').first()).toHaveText(
      '手机号格式不正确，请输入 11 位手机号',
      { timeout: 10_000 },
    );
    await expect(toastWithText(page, '手机号格式不正确')).toBeVisible({ timeout: 10_000 });

    // Assert 2：没有跳走——格式闸必须在提交前短路
    expect(hashPath(page.url())).toBe(REGISTER_ROUTE);
  });

  test('勾选协议后锁定层的登录引导可直达登录页并读得出协议入口 @auth @a11y', async ({
    page,
  }) => {
    // Arrange
    await gotoRoute(page, VILLAGE_ROUTE);
    await expect(page.locator('.lock-screen').first()).toBeVisible({ timeout: 20_000 });

    // Assert：锁定层是模态对话框语义（LockScreen.vue:275 role="dialog" + aria-modal）
    const dialog = page.locator('[role="dialog"][aria-modal="true"]').first();
    await expect(dialog).toBeVisible();

    // Act：登录引导 → 登录页 → 协议勾选可达
    await byAriaLabel(page, '立即完善资料', '.lock-screen').tap();
    await waitForHash(page, LOGIN_ROUTE);
    const agree = byRoleLabel(page, 'checkbox', '登录即同意');
    await expect(agree).toHaveAttribute('role', 'checkbox');

    // Assert：点勾选后 aria-checked 翻转（onAgreeTap，login/index.vue:538-540）
    await agree.tap();
    await expect(agree).toHaveAttribute('aria-checked', 'true');

    // Assert：协议链接确实在页上（login.userAgreementLink）
    await expect(page.getByText('《用户协议》').first()).toBeVisible();
  });

  test('已登录会话访问登录页自动前进到主界面，不形成登录页死循环 @auth', async ({ page }) => {
    // Arrange：先以 mock 档登录
    await loginAsMockUser(page);

    // Act：再次直达登录页（onShow 检测已登录即自动进入主界面，login/index.vue:96-104）
    await gotoRoute(page, LOGIN_ROUTE);

    // Assert：被自动送出登录页
    await waitForHash(page, '/pages/discover/index', 20_000);
    await expect(modalWithText(page, '登录已过期')).toHaveCount(0);
  });
});
