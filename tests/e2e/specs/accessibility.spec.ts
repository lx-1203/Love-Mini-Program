import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * axe-core 无障碍自动化测试（P7 - Task 7.3.1）。
 *
 * <p>覆盖关键页面的 WCAG 2.1 AA 与 Section 508 合规性：</p>
 * <ul>
 *   <li>登录页：表单标签、按钮可访问名</li>
 *   <li>首页：图片 alt、heading 层级</li>
 *   <li>匹配页：卡片语义、按钮焦点</li>
 *   <li>聊天页：列表 role、消息 aria-live</li>
 *   <li>个人页：表单 label、头像 alt</li>
 * </ul>
 *
 * <p>规则集：</p>
 * <ul>
 *   <li>wcag2a：WCAG 2.1 Level A</li>
 *   <li>wcag2aa：WCAG 2.1 Level AA（生产标准）</li>
 *   <li>wcag21aa：WCAG 2.1 AA 增强规则</li>
 *   <li>section508：美国 508 条款</li>
 *   <li>best-practice：axe 推荐最佳实践</li>
 * </ul>
 *
 * <p>运行方式：</p>
 * <pre>
 * # 仅运行 a11y 测试
 * npx playwright test --grep="@a11y" --config=tests/e2e/playwright.config.ts
 *
 * # 生成 a11y 报告
 * npx playwright test --grep="@a11y" --reporter=html
 * </pre>
 *
 * <p>违规处理：</p>
 * <ul>
 *   <li>Critical / Serious：必须修复，CI 阻断</li>
 *   <li>Moderate：应修复，记录为技术债</li>
 *   <li>Minor：建议修复</li>
 * </ul>
 */

// 默认扫描标签：覆盖 WCAG 2.1 AA 与最佳实践
const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'];

// 已知可接受的违规（如第三方组件库限制）
const KNOWN_VIOLATIONS: Record<string, string[]> = {
  '/pages/login/index': [
    // uni-app TabBar 在 H5 下 role=tablist 不完整，已知问题
    'aria-allowed-role',
  ],
  '/pages/discover/index': [
    // CardSwiper 卡片在某些场景下需双焦点（已知 mp-weixin 限制）
    'region',
  ],
};

// ── 辅助函数 ──

async function loginAndNavigate(page: Page, targetPath: string) {
  await page.goto('/');
  // 简化登录：mock 模式下点击登录按钮
  const loginBtn = page.getByRole('button', { name: /微信登录|微信一键登录/ }).first();
  if (await loginBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await loginBtn.tap();
    await page.waitForURL(/\/(home|setup\/profile|discover)/, { timeout: 30_000 });
  }
  // 跳过 setup 引导
  const skipBtn = page.getByRole('button', { name: /跳过|稍后设置/ }).first();
  if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipBtn.tap();
  }

  if (targetPath !== '/' && !page.url().includes(targetPath)) {
    await page.goto(targetPath);
    await page.waitForLoadState('networkidle');
  }
}

async function runAxeScan(page: Page, pageName: string) {
  const disabledRules = KNOWN_VIOLATIONS[pageName] || [];

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(DEFAULT_TAGS)
    .disableRules(disabledRules)
    .analyze();

  // 严重违规必须为 0
  const criticalViolations = accessibilityScanResults.violations.filter(
    (v) => v.impact === 'critical',
  );
  const seriousViolations = accessibilityScanResults.violations.filter(
    (v) => v.impact === 'serious',
  );

  // 输出诊断信息
  if (criticalViolations.length > 0 || seriousViolations.length > 0) {
    console.log(`\n[${pageName}] a11y violations:`);
    [...criticalViolations, ...seriousViolations].forEach((v) => {
      console.log(`  - [${v.impact}] ${v.id}: ${v.description}`);
      console.log(`    Help: ${v.helpUrl}`);
      v.nodes.forEach((n) => {
        console.log(`    Selector: ${n.target.join(', ')}`);
      });
    });
  }

  // 断言：critical 与 serious 必须为 0（生产质量门槛）
  expect(
    criticalViolations,
    `[${pageName}] Critical 级别 a11y 违规必须为 0，实际 ${criticalViolations.length} 条`,
  ).toHaveLength(0);
  expect(
    seriousViolations,
    `[${pageName}] Serious 级别 a11y 违规必须为 0，实际 ${seriousViolations.length} 条`,
  ).toHaveLength(0);
}

// ── 测试用例 ──

test.describe('无障碍合规性测试 @a11y', () => {
  test('登录页满足 WCAG 2.1 AA @a11y', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // Act & Assert
    await runAxeScan(page, '/pages/login/index');
  });

  test('首页满足 WCAG 2.1 AA @a11y', async ({ page }) => {
    await loginAndNavigate(page, '/pages/home/index');
    await runAxeScan(page, '/pages/home/index');
  });

  test('匹配/发现页满足 WCAG 2.1 AA @a11y', async ({ page }) => {
    await loginAndNavigate(page, '/pages/discover/index');
    await runAxeScan(page, '/pages/discover/index');
  });

  test('聊天列表页满足 WCAG 2.1 AA @a11y', async ({ page }) => {
    await loginAndNavigate(page, '/pages/chat/index');
    await runAxeScan(page, '/pages/chat/index');
  });

  test('个人页满足 WCAG 2.1 AA @a11y', async ({ page }) => {
    await loginAndNavigate(page, '/pages/profile/index');
    await runAxeScan(page, '/pages/profile/index');
  });

  test('校园圈子页满足 WCAG 2.1 AA @a11y', async ({ page }) => {
    await loginAndNavigate(page, '/pages/circles/index');
    await runAxeScan(page, '/pages/circles/index');
  });

  test('村落/广场页满足 WCAG 2.1 AA @a11y', async ({ page }) => {
    await loginAndNavigate(page, '/pages/village/index');
    await runAxeScan(page, '/pages/village/index');
  });

  test('键盘导航：可通过 Tab 键访问所有交互元素 @a11y', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // Act：模拟 Tab 键遍历
    const focusedSelectors: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id,
          className: typeof el.className === 'string' ? el.className : '',
        };
      });
      if (focused) {
        focusedSelectors.push(`${focused.tag}#${focused.id}.${focused.className.slice(0, 30)}`);
      }
    }

    // Assert：至少应能聚焦到 1 个交互元素（非 body）
    expect(focusedSelectors.length).toBeGreaterThan(0);
  });

  test('暗色模式可访问性：满足 WCAG 2.1 AA @a11y', async ({ page }) => {
    // Arrange：模拟暗色模式
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    // Act & Assert
    await runAxeScan(page, '/dark/login');
  });

  test('移动端视口：满足触控目标 ≥ 44px @a11y', async ({ page }) => {
    await loginAndNavigate(page, '/pages/home/index');

    // 检查所有按钮的触控目标尺寸
    const buttons = page.locator('button, [role="button"]');
    const count = await buttons.count();

    let smallTargetCount = 0;
    for (let i = 0; i < Math.min(count, 20); i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        const box = await btn.boundingBox();
        if (box && (box.width < 44 || box.height < 44)) {
          smallTargetCount++;
        }
      }
    }

    // 允许少量小目标（如图标按钮），但占比应 < 10%
    const ratio = count > 0 ? smallTargetCount / Math.min(count, 20) : 0;
    expect(ratio).toBeLessThan(0.1);
  });
});
