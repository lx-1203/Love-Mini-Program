import { test, expect, type Page } from '@playwright/test';
import { ROUTE_EXPECTATIONS, type RouteExpectation } from '../routes.generated';

/**
 * 全页面冒烟测试（2026-08-10 建立；2026-10-25 改为 pages.json 单源派生）。
 *
 * <p>遍历 pages.json 注册的全部路由，匿名逐个访问并断言：最终落到**该路由自己在
 * guest-landing-policy.json 里的预期落点**、页面无致命 JS 错误、无 console error、
 * 落地页有该族的标记类。</p>
 *
 * <p>为什么落点预期必须由名册派生（本次改动）：原实现写死一个 redirectFallbacks
 * 集合，把 `/`、首页、寻觅、我的 都列为合法落点 —— 于是「路由压根没命中、整站弹回
 * 首页」这一整类失效可以 73 条全绿；名册里 28 条是实测过的「游客被 401 兜底弹到登录页 /
 * 弹到 profile 页」，另外 45 条没有弹走理由，必须原页到达。</p>
 */

/** 401 兜底跳登录页前有 LOGIN_REDIRECT_DELAY_MS（实测 500ms）延迟，判定窗要跨过它。 */
const REDIRECT_SETTLE_MS = 1500;

/** 落点不在允许集时，再多给一段有界轮询窗（异步开关/资料闸决定弹走的时机不固定）。 */
const BOUNCE_POLL_MS = 3000;

/**
 * 本载具跑的 API 模式，决定 guide-401 族的落点。
 *
 * guest-landing-policy.json 的 anchors 写得很明确：游客被弹到登录页出自
 * services/http.ts 的 401 兜底（uni.reLaunch），**不是路由守卫**。而 playwright.config.ts
 * 的 webServer 起的是 mock 档（NODE_ENV=development），mock 不会产生 401 ⇒
 * 这一族在 mock 跑里必然原页停留。把它们按名册断言成登录页，得到的是
 * 「载具没接上后端」造成的红，不是产品缺陷（实测：2026-10-25 mock 档下
 * /subpackages/village/village/index 原页停留）。
 * flag-bounce 族不受影响 —— 那是客户端开关/资料闸；但实测它在 mock 档会随
 * app_config 拉取竞态（同一条 vip/index 两次跑一次弹一次不弹），所以判定改成
 * 轮询等落点出现，而不是固定 sleep。
 * 真机/真后端复验时以 E2E_API_MODE=real 运行，名册落点即全部生效。
 */
const API_MODE = process.env.E2E_API_MODE ?? 'mock';

/**
 * mock 档允许落点。
 *
 * selfRedirects 由脚本从**本页源码**派生（uni.redirectTo/reLaunch/switchTab/navigateTo
 * 的目标，ROUTES 常量已解析），所以「页面本来就写明要跳去别处」不再被我手打成白名单——
 * 那正是原实现「首页/寻觅/我的 都算合法落点」那个洞的复发形态。
 * 没有源码依据的落点（含弹回首页）仍然红。
 */
function allowedLandings(e: RouteExpectation): string[] {
  const names = [e.expectedLanding];
  if (e.loggedInLanding) names.push(e.loggedInLanding);
  if (API_MODE !== 'real') {
    names.push(e.route);
    names.push(...(e.selfRedirects ?? []));
  }
  return [...new Set(names)];
}

function markerForLanding(e: RouteExpectation, landing: string): string | null {
  // 标记类属于「那一族弹到指定落地页」这一条因果链：只有真的落在名册登记的目标页上，
  // 那块页的锚点才该存在。落在原页或实测备选页（campus/index→hub、matching→discover）
  // 时去要 .login-page__brand，得到的是我自己造的假红
  //（2026-10-25 实测：两条因此红在「落地页缺 .login-page__brand」上）。
  return landing === e.expectedLanding ? e.landingMarker : null;
}

function registerMarkerForLanding(e: RouteExpectation, landing: string): string | null {
  return landing === e.expectedLanding ? e.registerEntryMarker : null;
}

function hashPath(url: string): string {
  return new URL(url).hash.replace(/^#/, '').split('?')[0];
}

/** 访问单个页面并按名册断言落点与渲染 */
async function visitPage(page: Page, expectation: RouteExpectation) {
  const errors: string[] = [];
  const handleError = (msg: string) => errors.push(msg);

  // 收集页面级未捕获异常与 console error（warning/info 不视为失败）
  page.on('pageerror', (err) => handleError(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') handleError(`console.error: ${msg.text().slice(0, 200)}`);
  });

  // uni-app H5 是 hash 路由：裸路径不会进入页面，而是落到首页。
  // 不传 goto 级 timeout：dev 档首访要现编译该路由，实测能吃掉 30s
  //（/pages/discover/index 在 navigationTimeout 上 TimeoutError 过），
  // 而编译完成后同一路由第二发是热的 ⇒ 冷编译超时重试一次，别把它读成页面缺陷。
  try {
    await page.goto(`/#${expectation.route}`, { waitUntil: 'domcontentloaded' });
  } catch (err) {
    if (!String(err).includes('Timeout')) throw err;
    await page.goto(`/#${expectation.route}`, { waitUntil: 'domcontentloaded' });
  }
  const allowed = allowedLandings(expectation);

  // 先给渲染窗口：uni-app H5 的 hash 在导航返回时就已是目标路由，
  // 若直接拿「落点在允许集」当轮询退出条件会立刻成立，body 还没渲染 ⇒ 把每个页面
  // 都读成空白页（2026-10-25 实测：去掉这段等待后 9 条里 7 条报「无实际渲染内容」）。
  await page.waitForTimeout(REDIRECT_SETTLE_MS);

  // 再补一轮有界轮询：名册的 flag-bounce 依赖 app_config 异步拉取，
  // 实测同一页两次跑一次弹一次不弹（vip/index），固定 sleep 会把竞态读成缺陷。
  let finalPath = hashPath(page.url());
  const deadline = Date.now() + BOUNCE_POLL_MS;
  while (Date.now() < deadline && !allowed.includes(finalPath)) {
    await page.waitForTimeout(200);
    finalPath = hashPath(page.url());
  }

  expect
    .soft(
      allowed.includes(finalPath),
      `${expectation.route} 落到 ${finalPath || '(空 hash)'}，不在允许集 ${JSON.stringify(allowed)}` +
        `${expectation.family ? `（成因族 ${expectation.family}，E2E_API_MODE=${API_MODE}）` : '（本页无弹走理由）'}`,
    )
    .toBe(true);

  await expect(page.locator('#app')).toBeVisible();

  // 落地页标记类：名册为该族登记的锚点，能挡住「弹到登录页但登录页没渲染出来」。
  const landingMarker = markerForLanding(expectation, finalPath);
  if (landingMarker) {
    await expect
      .soft(page.locator(landingMarker), `${expectation.route} 的落地页缺 ${landingMarker}`)
      .toBeVisible();
  }

  // 「被引导到注册」这条裁定要求登录页**默认态**就露出注册入口（$ruling），
  // 只断言落在登录页等于没断言——入口不在，游客看到的是一堵墙。
  const registerMarker = registerMarkerForLanding(expectation, finalPath);
  if (registerMarker) {
    await expect
      .soft(
        page.locator(registerMarker),
        `${expectation.route} 被弹到登录页后，默认态应露出注册入口 ${registerMarker}`,
      )
      .toBeVisible();
  }

  const bodyText = (await page.locator('body').innerText().catch(() => ''))?.trim() ?? '';
  if (!expectation.devOnly) {
    expect.soft(bodyText.length > 3, `${expectation.route} 页面 body 无实际渲染内容（空白页）`).toBe(true);
  }
  expect.soft(errors, `${expectation.route} 存在 JS 错误: ${errors.join(' | ')}`).toEqual([]);
}

test.describe('全页面冒烟（@all-pages）', () => {
  for (const expectation of ROUTE_EXPECTATIONS) {
    test(`游客落点与渲染: ${expectation.route}`, async ({ page }) => {
      await visitPage(page, expectation);
    });
  }

  // 判据自身的活性：名册断链（没有任何路由带弹走预期）说明派生失效，
  // 不能让它悄悄退化成「都要求原页到达」还报绿。
  test('落点名册确实接进了本载具', () => {
    const bouncedInRegistry = ROUTE_EXPECTATIONS.filter((e) => e.expectedLanding !== e.route);
    expect(
      bouncedInRegistry.length,
      '名册里没有任何弹走行：guest-landing-policy 派生断链',
    ).toBeGreaterThan(0);
    // 允许集必须真的窄于「所有在册路由」——否则等于回到原来那条
    // 「首页/寻觅/我的 都算合法落点」的空转判据。
    const allowedTotal = new Set(
      ROUTE_EXPECTATIONS.flatMap((e) => allowedLandings(e)),
    ).size;
    expect(
      allowedTotal,
      `允许落点集合 ${allowedTotal} 条不比路由集窄，落点判据失去区分力`,
    ).toBeLessThan(ROUTE_EXPECTATIONS.length * 3);
    expect(
      ROUTE_EXPECTATIONS.filter((e) => e.landingMarker).length,
      '弹走族没有落地标记类：标记断言等于没跑',
    ).toBeGreaterThan(0);
    // 空白页判据的覆盖面不许被 devOnly 排除掏空：
    // 派生判据（模板整页包在 #ifdef DEV）一旦误伤大面积路由，本门就退化成「什么都不判」。
    const devOnly = ROUTE_EXPECTATIONS.filter((e) => e.devOnly);
    expect(
      devOnly.length,
      `devOnly 排除到 ${devOnly.length}/${ROUTE_EXPECTATIONS.length} 条，内容判据覆盖面失守：` +
        devOnly.map((e) => e.route).join(', '),
    ).toBeLessThan(ROUTE_EXPECTATIONS.length * 0.1);
  });
});
