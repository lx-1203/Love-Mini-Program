import { expect, test, type Page } from '@playwright/test';
import {
  byRoleLabel,
  gotoRoute,
  hashPath,
  loginAsMockUser,
  toastWithText,
  waitForHash,
} from '../flow-helpers';

/**
 * 流程 3：匹配 / 滑动主流程（@core-journey @match）。
 *
 * <p>链路真值源（逐条核过）：</p>
 * <ul>
 *   <li>寻觅页卡片与三键：pages/discover/index.vue:361-390 —— MatchCard（.match-card）
 *       + MatchActions 停靠层（.match-actions-dock，仅 isMatchOpen && visibleCards.length>0 时渲染）。</li>
 *   <li>三键的可访问名：components/match/MatchActions.vue:9/22/34 ——
 *       role="button" + aria-label = discover.skip「跳过」/ discover.superLike「超级喜欢」/
 *       discover.like「喜欢」（i18n/locales/zh-CN.ts:934,936,938）。</li>
 *   <li>喜欢 → 匹配中页：discover/index.vue:133-152 enterMatching 先
 *       matchStore.beginCheck 再 openAppPath(ROUTES.DISCOVER.MATCHING?userId&cardId&action)；
 *       路由常量 constants/routes.ts:66 = /subpackages/discover-extra/discover/matching。</li>
 *   <li>匹配中页：matching.vue:264 `.matching-page` + MatchLoading 标题
 *       matching.searching「正在寻找适合你的 TA」（zh-CN.ts:451），
 *       动画结束（或点 .match-loading__skip 快进，matching.vue:246-251）后由
 *       watch(status, animationDone)（:93-115）分派。</li>
 * </ul>
 *
 * <p><b>在册缺口（务必读）</b>：mock 档「匹配成功」态不可驱动——
 * stores/discover/actions/swipe.ts:267-272 的 mock 分支用
 * `Math.random() < MOCK_MATCH_PROBABILITY` 决定 matched，而该常量默认 0
 * （stores/discover/constants.ts:125 + VITE_MOCK_MATCH_PROBABILITY 未设）。
 * 于是 status 恒为 idle（stores/match.ts:65），redirectToSuccess 永不触发，
 * /subpackages/discover-extra/discover/match-success 在 mock 档不可达。
 * 本文件因此把「双向喜欢」钉成**负判据**（匹配成功弹层不许出现）+
 * 「单向喜欢」的正判据（卡片被消费、配额被扣），
 * 互相喜欢成串只能在真实栈（后端真匹配）验收。</p>
 */

const DISCOVER_ROUTE = '/pages/discover/index';
const MATCHING_ROUTE = '/subpackages/discover-extra/discover/matching';

/** 读当前卡的人名（components/match/MatchInfo.vue:5 .match-info__name）。 */
async function currentCardName(page: Page): Promise<string> {
  const name = page.locator('.match-info__name').first();
  await expect(name, '寻觅页应渲染推荐卡片人名（无卡则三键不渲染，主流程无从驱动）').toBeVisible({
    timeout: 25_000,
  });
  return (await name.innerText()).trim();
}

/** 读今日剩余次数数值（.discover-quota__text 仅在 isLoggedIn 时渲染）。 */
async function remainingQuota(page: Page): Promise<number> {
  const text = await page.locator('.discover-quota__text').first().innerText();
  const matched = text.match(/今日剩余 (\d+) 次/u);
  expect(matched, `配额胶囊文案应为「今日剩余 N 次」，实际读到「${text}」`).not.toBeNull();
  return Number(matched![1]);
}

test.describe('匹配/滑动主流程 @core-journey @match', () => {
  test('游客点「喜欢」被 requireLogin 拦下：只提示、不进匹配中页 @match @core-journey', async ({
    page,
  }) => {
    // Arrange：匿名直达寻觅页（免登录可逛，见 core-journey.spec.ts:21-27 与 page-access.ts）
    await gotoRoute(page, DISCOVER_ROUTE);
    await expect(page.locator('.match-actions-dock').first()).toBeVisible({ timeout: 25_000 });

    // Act
    await byRoleLabel(page, 'button', '喜欢').tap();

    // Assert 1：命中 requireLogin（discover/index.vue:84-88 → apiErrors.loginRequired，
    // zh-CN.ts:3963「请先登录后再使用该功能」）
    await expect(toastWithText(page, '请先登录后再使用该功能')).toBeVisible({ timeout: 10_000 });

    // Assert 2：负判据——游客不得进入匹配中页（enterMatching 在守卫之后才调用）
    await waitForHash(page, DISCOVER_ROUTE);
    await expect(page.locator('.matching-page')).toHaveCount(0);

    // Assert 3：游客态不渲染配额胶囊（discover/index.vue:355 v-if="sessionStore.isLoggedIn"），
    // 否则常驻数字会变成假配额
    await expect(page.locator('.discover-quota')).toHaveCount(0);
  });

  test('登录态喜欢 → 匹配中页 → 单向喜欢回落寻觅页并轮换卡片 @core-journey @match', async ({
    page,
  }) => {
    // Arrange
    await loginAsMockUser(page);
    const firstName = await currentCardName(page);
    const quotaBefore = await remainingQuota(page);

    // Act：点「喜欢」
    await byRoleLabel(page, 'button', '喜欢').tap();

    // Assert 1：进入匹配中页
    await waitForHash(page, MATCHING_ROUTE, 20_000);
    await expect(page.locator('.matching-page').first()).toBeVisible();
    await expect(page.locator('.match-loading__title').first()).toHaveText('正在寻找适合你的 TA');

    // Act 2：点动画层的「跳过」快进（matching.vue:246-251，动画未播完时=立即 finish）
    await page.locator('.match-loading__skip').first().tap();

    // Assert 2：回落寻觅页（status=idle 分支：consumeCardFromDeck + toast + goBack，
    // matching.vue:102-107）
    await expect(toastWithText(page, '已喜欢')).toBeVisible({ timeout: 20_000 });
    await waitForHash(page, DISCOVER_ROUTE, 20_000);

    // Assert 3：卡确实被消费——首卡换人（swipe.ts:296 cards.filter 移除该卡）
    const afterName = await currentCardName(page);
    expect(afterName, '单向喜欢后卡组应前进到下一张，而不是仍停在同一人').not.toBe(firstName);

    // Assert 4：配额确实被扣一次（stores/discover/index.ts:155 dailyLimit - viewedCards.length）
    const quotaAfter = await remainingQuota(page);
    expect(quotaAfter, '喜欢一次必须扣掉一次今日额度').toBeLessThan(quotaBefore);

    // Assert 5：负判据——mock 档 MOCK_MATCH_PROBABILITY=0，不得凭空弹出「匹配成功」页
    // （页根类 .success-page，subpackages/discover-extra/discover/match-success.vue:196）
    await expect(page.locator('.success-page')).toHaveCount(0);
    expect(hashPath(page.url())).toBe(DISCOVER_ROUTE);
  });

  test('超级喜欢（打个招呼）同样进入匹配中页并带上 action=superLike @match', async ({ page }) => {
    // Arrange
    await loginAsMockUser(page);

    // Act：MatchActions 中间键 aria-label 是 discover.superLike「超级喜欢」，
    // 可见文案是 discover.greet「打个招呼」（MatchActions.vue:22-32 两处不同键，实测易踩）
    await byRoleLabel(page, 'button', '超级喜欢').tap();

    // Assert：落到匹配中页且 query 带 action=superLike（discover/index.vue:146-151）
    await waitForHash(page, MATCHING_ROUTE, 20_000);
    expect(page.url()).toContain('action=superLike');
    await expect(page.locator('.match-loading__title').first()).toBeVisible();
  });

  test('跳过（左滑）只轮换卡片，绝不进入匹配中页 @match', async ({ page }) => {
    // Arrange
    await loginAsMockUser(page);
    const firstName = await currentCardName(page);

    // Act
    await byRoleLabel(page, 'button', '跳过').tap();

    // Assert 1：卡片前进
    await page.waitForTimeout(1_200);
    const afterName = await currentCardName(page);
    expect(afterName, '跳过必须换到下一张卡').not.toBe(firstName);

    // Assert 2：负判据——跳过是本地/后端 pass，不该拉起匹配状态机
    expect(hashPath(page.url())).toBe(DISCOVER_ROUTE);
    await expect(page.locator('.matching-page')).toHaveCount(0);
  });

  test('登录态配额胶囊文案可读且落在 0–10 合法区间（DAILY_LIMIT_TOTAL=10）@match', async ({
    page,
  }) => {
    // Arrange & Act
    await loginAsMockUser(page);

    // Assert：值判据（不是「非空即可」）——上限来自 stores/discover/constants.ts:45
    const quota = await remainingQuota(page);
    expect(quota, '初始今日额度不得超过每日上限 10').toBeLessThanOrEqual(10);
    expect(quota, '今日额度不得为负').toBeGreaterThanOrEqual(0);
  });
});
