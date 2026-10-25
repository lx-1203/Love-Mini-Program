import { test, expect, type Page } from '@playwright/test';
import { ROUTES } from '../routes.generated';

/**
 * 全页面冒烟测试（2026-08-10 建立；2026-10-25 改为 pages.json 单源派生）。
 *
 * <p>目标：遍历 pages.json 注册的全部路由，逐个访问并断言：页面可渲染（无致命 JS 错误）、
 * 无 console error、最终落到预期路由。原实现硬编码 63 条旧路由且用裸路径访问 hash 路由，
 * 实际可能全部落到首页仍显示通过。</p>
 */

/** 访问单个页面并断言无 JS 错误 + 有渲染内容 */
async function visitPage(page: Page, route: string) {
  const errors: string[] = [];
  const handleError = (msg: string) => errors.push(msg);

  // 收集页面级未捕获异常与 console error（warning/info 不视为失败）
  page.on('pageerror', (err) => handleError(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') handleError(`console.error: ${msg.text().slice(0, 200)}`);
  });

  // uni-app H5 是 hash 路由：裸路径不会进入页面，而是落到首页。
  await page.goto(`/#${route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForTimeout(1_500); // 等待首屏渲染与异步数据

  const finalPath = new URL(page.url()).hash.replace(/^#/, "").split("?")[0];
  const redirectFallbacks = new Set([
    "/",
    "/pages/login/index",
    "/pages/home/index",
    "/pages/discover/index",
    "/subpackages/setup/profile/index",
  ]);
  const reachedExpectedPage = finalPath === route || redirectFallbacks.has(finalPath);
  expect.soft(reachedExpectedPage, `${route} 最终落到了意外的路由: ${finalPath || "(空 hash)"}`).toBe(true);

  // 公开页阳性对照：整体重定向到首页不能伪装为“全页通过”。
  const publicExactRoutes = new Set([
    "/pages/login/index",
    "/pages/discover/index",
    "/subpackages/village/village/index",
  ]);
  if (publicExactRoutes.has(route)) {
    expect.soft(finalPath, `${route} 应能在匿名态直接到达，不能被统一重定向`).toBe(route);
  }

  await expect(page.locator("#app")).toBeVisible();
  const bodyText = (await page.locator('body').innerText().catch(() => ''))?.trim() ?? '';
  const hasContent = bodyText.length > 3;

  expect.soft(hasContent, `${route} 页面 body 无实际渲染内容（空白页）`).toBe(true);
  expect.soft(errors, `${route} 存在 JS 错误: ${errors.join(' | ')}`).toEqual([]);
}

test.describe('全页面冒烟（@all-pages）', () => {
  for (const route of ROUTES) {
    test(`页面可渲染且无 JS 错误: ${route}`, async ({ page }) => {
      await visitPage(page, route);
    });
  }
});
