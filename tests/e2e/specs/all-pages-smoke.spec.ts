import { test, expect, type Page } from '@playwright/test';

/**
 * 全页面冒烟测试（2026-08-10 建立）。
 *
 * <p>目标：保证「所有页面没有出错」——遍历 pages.json 注册的全部路由，
 * 逐个访问并断言：页面可渲染（无致命 JS 错误）、无 console error。
 * 覆盖小程序端（mp-weixin 路由表）与 H5 共用路由。</p>
 *
 * <p>判定标准（不过度断言，避免脆测）：</p>
 * <ul>
 *   <li>页面加载后无 pageerror（未捕获异常）与 console error（网络失败/渲染异常）；</li>
 *   <li>页面 body 有实际渲染内容（非全空白）；</li>
 *   <li>带参页面（detail/topic-detail 等）以无参访问验证「空态/错误态」路径——空态渲染无错同样视为通过；</li>
 *   <li>需登录页面在未登录时重定向到登录页/展示 LockScreen 属预期行为，不计为失败。</li>
 * </ul>
 *
 * <p>运行方式：起 H5 dev server 后</p>
 * <pre>npx playwright test --grep="@all-pages" --config=tests/e2e/playwright.config.ts</pre>
 */

const ROUTES: string[] = [
  // ── 主包（44 页，取自 pages.json；dev 调试页与 showcase 为演示页，不纳入） ──
  '/pages/discover/index',
  '/pages/login/index',
  '/pages/home/index',
  '/pages/discover/history',
  '/pages/discover/video-player',
  '/pages/likes/index',
  '/pages/likes-visitors/index',
  '/pages/village/index',
  '/pages/village/post',
  '/pages/village/detail',
  '/pages/messages/index',
  '/pages/profile/index',
  '/pages/circles/index',
  '/pages/circles/topics',
  '/pages/circles/topic-detail',
  '/pages/circles/post-topic',
  '/pages/daily-question/index',
  '/pages/love-center/index',
  '/pages/chat-session/index',
  '/pages/official-chat/index',
  '/pages/help/index',
  '/pages/security/index',
  '/pages/campus/index',
  '/pages/campus/post-topic',
  '/pages/campus/topic-detail',
  '/pages/campus/certification',
  '/pages/village/tag-posts',
  '/pages/village/history',
  '/pages/settings/index',
  '/pages/verification/index',
  '/pages/heart-signals/index',
  '/pages/profile/visitors',
  '/pages/profile/other',
  '/pages/profile/privacy',
  '/pages/profile/album',
  '/pages/profile/tasks',
  '/pages/settings/dnd',
  '/pages/feedback/history',
  '/pages/activities/detail',
  '/pages/love-center/nearby',
  '/pages/love-center/mbti',
  '/pages/love-center/consulting',
  // ── 分包（15 页） ──
  '/subpackages/setup/profile/index',
  '/subpackages/setup/campus/index',
  '/subpackages/setup/schedule/index',
  '/subpackages/setup/recommend-pref/index',
  '/subpackages/support/feedback/index',
  '/subpackages/discover/discussions/index',
  '/subpackages/discover/activities/index',
  '/subpackages/legal/privacy/index',
  '/subpackages/legal/agreement/index',
  '/subpackages/market/detail/index',
  '/subpackages/market/shop/index',
  '/subpackages/market/wallet/index',
  '/subpackages/vip/index',
  '/subpackages/vip/promo-code',
  '/subpackages/vip/bills',
];

/** 访问单个页面并断言无 JS 错误 + 有渲染内容 */
async function visitPage(page: Page, route: string) {
  const errors: string[] = [];
  const handleError = (msg: string) => errors.push(msg);

  // 收集页面级未捕获异常与 console error（warning/info 不视为失败）
  page.on('pageerror', (err) => handleError(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') handleError(`console.error: ${msg.text().slice(0, 200)}`);
  });

  // 重定向容忍：登录页跳转/未登录引导页均属预期，最多等待 8s 到达最终页面
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(1_500); // 等待首屏渲染与异步数据

  const bodyText = (await page.locator('body').innerText().catch(() => ''))?.trim() ?? '';
  const hasContent = bodyText.length > 0;

  expect.soft(hasContent, `${route} 页面 body 无渲染内容（空白页）`).toBe(true);
  expect.soft(errors, `${route} 存在 JS 错误: ${errors.join(' | ')}`).toEqual([]);
}

test.describe('全页面冒烟（@all-pages）', () => {
  for (const route of ROUTES) {
    test(`页面可渲染且无 JS 错误: ${route}`, async ({ page }) => {
      await visitPage(page, route);
    });
  }
});
