import { expect, type Page } from '@playwright/test';

/**
 * 五大主流程 E2E 的共享载具（2026-10-30）。
 *
 * <p>为什么需要这一层：五个流程都要「以 mock 档登录态进入某个页面」，
 * 而既有 specs/core-journey.spec.ts 里的 performWechatLogin 依赖的按钮文案
 * 「一键体验」与勾选框文案「已阅读并同意」在当前源码里已经不存在
 * （apps/client/src/i18n/locales/zh-CN.ts:2198 login.devUserEntryTitle=「演示模式进入」、
 * :2172 login.agreedPrefix=「登录即同意」）。本文件只收录取证于当前模板的选择器。</p>
 *
 * <p>选择器纪律：每一个 selector 都能在 apps/client/src 的模板里逐字找到，
 * 且 uni-app H5 运行时 DOM 类名（.uni-sample-toast / .uni-modal）取自
 * apps/client/node_modules/@dcloudio/uni-h5/dist/uni-h5.es.js。
 * 禁止凭想象补选择器。</p>
 */

/** 本载具跑的 API 模式，与 all-pages-smoke.spec.ts / real-stack-smoke.spec.ts 同口径。 */
export const API_MODE = process.env.E2E_API_MODE ?? 'mock';

/** 真实栈判据：只有 E2E_API_MODE=real 时后端在 8080 上真实可用。 */
export const IS_REAL_STACK = API_MODE === 'real';

/**
 * Playwright 的 baseURL 解析会把不带尾斜杠的 /api 当「文件名」丢掉前缀
 * （见 specs/real-stack-smoke.spec.ts:15-18 同注释），统一补尾斜杠。
 */
export const API_BASE =
  (process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080/api').replace(/\/+$/u, '') + '/';

/** uni-app H5 是 hash 路由：裸路径不会进入页面，而是落到首页（core-journey.spec.ts:21-27 同结论）。 */
export function hashPath(url: string): string {
  return new URL(url).hash.replace(/^#/, '').split('?')[0];
}

/**
 * 访问某个 hash 路由。
 *
 * <p>不传 goto 级 timeout：dev 档首访要现编译该路由，实测能吃掉 30s
 * （all-pages-smoke.spec.ts:84-93 同一处理）；编译完成后第二发是热的。</p>
 */
export async function gotoRoute(page: Page, route: string): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(`/#${route}`, { waitUntil: 'domcontentloaded' });
      return;
    } catch (err) {
      if (!String(err).includes('Timeout') || attempt === 1) throw err;
    }
  }
}

/**
 * 等落点稳定（有界轮询，不用固定 sleep 判定）。
 *
 * <p>页面自带异步闸（app_config 拉取、资料完善度、401 兜底 500ms 延迟），
 * 落点不是导航返回那一刻就定死的 —— all-pages-smoke.spec.ts:100-108 已实证过竞态。</p>
 */
export async function waitForHash(page: Page, expected: string, timeoutMs = 8_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let current = hashPath(page.url());
  while (Date.now() < deadline && current !== expected) {
    await page.waitForTimeout(150);
    current = hashPath(page.url());
  }
  expect(current, `期望落在 ${expected}，实际停在 ${current || '(空 hash)'}`).toBe(expected);
  return current;
}

/**
 * 以模板上真实存在的 role/aria-label 命中可点件。
 *
 * <p>uni-app H5 把 <view role="button" :aria-label="t('...')"> 原样渲染成
 * <uni-view role="button" aria-label="...">，因此属性选择器逐字对应模板。</p>
 */
export function byRoleLabel(page: Page, role: 'button' | 'checkbox', ariaLabel: string) {
  return page.locator(`[role="${role}"][aria-label="${ariaLabel}"]`).first();
}

/**
 * 只按 aria-label 命中（不带 role 前置）。
 *
 * <p>用于模板里写的是原生 `<button :aria-label="...">`（uni-app H5 渲染成 <uni-button>
 * 自定义元素，不带 role 属性）的场合——components/common/LockScreen.vue:367-373
 * 的主 CTA 就是这一类，用 role 前置选择器会选空。</p>
 */
export function byAriaLabel(page: Page, ariaLabel: string, scopeSelector?: string) {
  const selector = `[aria-label="${ariaLabel}"]`;
  return (scopeSelector ? page.locator(`${scopeSelector} ${selector}`) : page.locator(selector)).first();
}

/**
 * mock 档登录：走登录页的「演示模式进入」入口（pages/login/index.vue:834-846，
 * aria-label = t('login.devUserEntryTitle') = zh-CN.ts:2198「演示模式进入」）。
 *
 * <p>为什么用它而不是「稍后再看」：后者（login.guestLogin，zh-CN.ts:2161）要真发
 * POST /v1/auth/guest-login，而 mock E2E 载具里没有后端（playwright.config.ts 的
 * webServer 只起 H5 dev server），必然网络失败。
 * onDevUserEntry（login/index.vue:521-536）是纯本地注入 mockUserSession 后
 * reLaunch 到寻觅页，注释自证「不发起任何真实登录/注册请求」。</p>
 */
export async function loginAsMockUser(page: Page): Promise<void> {
  await gotoRoute(page, '/pages/login/index');
  const devEntry = byRoleLabel(page, 'button', '演示模式进入');
  await expect(devEntry, 'mock 档登录页应渲染「演示模式进入」入口（showDevUserEntry=isDev||isMockMode）')
    .toBeVisible({ timeout: 15_000 });
  await devEntry.tap();
  await waitForHash(page, '/pages/discover/index', 20_000);
}

/**
 * 断言「确实带上了登录态」——不靠 URL 投票。
 *
 * <p>判据来自 pages/discover/index.vue:355-359：配额胶囊 `.discover-quota`
 * 整块包在 v-if="sessionStore.isLoggedIn" 里，游客恒不渲染；
 * 文案是 discover.remainingToday（zh-CN.ts:950「今日剩余 {n} 次」）。</p>
 */
export async function expectLoggedInEvidence(page: Page): Promise<void> {
  const quota = page.locator('.discover-quota__text').first();
  await expect(quota).toBeVisible({ timeout: 15_000 });
  await expect(quota).toHaveText(/^今日剩余 \d+ 次$/);
}

/**
 * 命中 uni-app H5 的原生可输入节点。
 *
 * <p>模板上的 class 落在宿主自定义元素（<uni-textarea class="publish-content__input">），
 * 真正可 fill 的原生节点是它的子级 <textarea class="uni-textarea-textarea">
 * （类名取自 apps/client/node_modules/@dcloudio/uni-h5/dist/uni-h5.es.js 的
 * uni-textarea-textarea / uni-input-input）。两种落点都覆盖，避免把类挂在宿主还是
 * 子节点上读成「元素不存在」。</p>
 */
export function fillable(page: Page, hostClass: string) {
  return page
    .locator(
      `textarea.${hostClass}, ${hostClass} textarea, input.${hostClass}, ${hostClass} input`,
    )
    .first();
}

/** uni.showToast 在 H5 的运行时 DOM：icon:"none" 走 .uni-sample-toast，带图标走 .uni-toast（uni-h5.es.js:18956）。 */
export function toastWithText(page: Page, text: string) {
  return page
    .locator(`.uni-sample-toast:has-text("${text}"), .uni-toast:has-text("${text}")`)
    .first();
}

/** uni.showModal 在 H5 的运行时 DOM：.uni-modal（同文件，含 __title / __bd / __btn）。 */
export function modalWithText(page: Page, text: string) {
  return page.locator(`.uni-modal:has-text("${text}")`).first();
}

/** 收集某一类 HTTP 请求（用于「本地档位绝不产生资金请求」这类负判据）。 */
export function trackRequests(page: Page, urlPattern: RegExp): string[] {
  const hits: string[] = [];
  page.on('request', (req) => {
    if (urlPattern.test(req.url()) && req.method() === 'POST') hits.push(`${req.method()} ${req.url()}`);
  });
  return hits;
}

/** 解后端统一信封（{ status, error, message, details? }，见 GlobalExceptionHandler）。 */
export function errorEnvelope(body: unknown): { error?: string; message?: string; status?: number } {
  return (body ?? {}) as { error?: string; message?: string; status?: number };
}
