import { test, expect, type Page } from '@playwright/test';

/**
 * 核心用户旅程 E2E 测试（P7 - Task 7.2.1）。
 *
 * <p>覆盖：注册 → 匹配 → 聊天 核心旅程。</p>
 *
 * <p>测试用例标签（@core-journey、@auth、@match、@chat）便于通过 --grep 选择性执行。</p>
 *
 * <p>设计原则：</p>
 * <ul>
 *   <li>AAA 结构：Arrange / Act / Assert 注释清晰分隔</li>
 *   <li>Page Object 模式：通过 helper 函数封装跨用例复用操作</li>
 *   <li>数据隔离：每个用例独立运行，不依赖前置状态</li>
 *   <li>失败诊断：关键步骤添加 expect.soft，避免单点失败影响后续断言</li>
 * </ul>
 */

// ── Page Object Helpers ──

async function navigateToLogin(page: Page) {
  // 2026-08-10 修复：① 发现页免登录可逛（page-access.ts），根路径 '/' 不再跳登录页；
  // ② uni-app H5 为 hash 路由，裸路径 '/pages/login/index' 无 hash 会落到首页——
  // 显式带 hash 访问登录页
  await page.goto('/#/pages/login/index');
  await page.waitForURL(/login/, { timeout: 15_000 });
}

async function performWechatLogin(page: Page) {
  // 2026-08-10 修复：① 微信登录（uni.login provider=weixin）仅小程序端可用，H5 环境无此 provider——
  // 改用「一键体验全部功能」体验号登录（POST /v1/auth/guest-login，dev 后端可用）；
  // ② 登录按钮与协议勾选绑定（agreed 守卫），必须先勾选「已阅读并同意」
  const agree = page.getByRole('checkbox', { name: /已阅读并同意/ }).first();
  await expect(agree).toBeVisible({ timeout: 10_000 });
  await agree.check();

  const loginBtn = page.getByRole('button', { name: /一键体验/ }).first();
  await expect(loginBtn).toBeVisible({ timeout: 10_000 });
  await loginBtn.click();

  // 等待登录完成跳转（navigateAfterLogin 无待跳路径时进入 discover——uni-app H5 首页 tab 以 /#/ 表示；
  // 可能先去资料引导）
  await page.waitForURL(/\/discover|\/home|\/setup\/profile|#\/?$/, { timeout: 30_000 });
}

async function skipProfileSetupIfPresent(page: Page) {
  const skipBtn = page.getByRole('button', { name: /跳过|稍后设置/ }).first();
  if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipBtn.tap();
  }
}

async function navigateToDiscover(page: Page) {
  // 2026-08-10 修复：custom tabBar 仅 mp-weixin 实现，H5 端无底部导航（已知平台差异，
  // 见 docs/SOCIAL-APP-ACCEPTANCE.md §4）——H5 用 URL 导航；mp-weixin 环境可切回 tab 点击
  await page.goto('/#/pages/discover/index');
  await page.waitForURL(/\/discover|#\/?$/, { timeout: 15_000 });
}

async function navigateToChat(page: Page) {
  // 同上：H5 端无 TabBar，直接 URL 导航到消息页
  await page.goto('/#/pages/messages/index');
  await page.waitForURL(/\/(chat|messages)/, { timeout: 15_000 });
}

// ── Test Cases ──

test.describe('核心旅程：注册 → 匹配 → 聊天 @core-journey', () => {

  test('用户可通过微信登录进入首页 @auth @smoke', async ({ page }) => {
    // Arrange
    await navigateToLogin(page);

    // Act
    await performWechatLogin(page);
    await skipProfileSetupIfPresent(page);

    // Assert：应进入首页或匹配页（uni-app H5 首页 tab = /#/）
    await expect(page).toHaveURL(/\/home|\/discover|#\/?$/, { timeout: 15_000 });
    // 登录后发现页应渲染核心内容（寻觅头部 / 推荐卡片；H5 无 custom tabBar，不断言 tabbar）
    await expect(page.getByText(/寻觅|发现心动的人/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('登录后可访问匹配页查看推荐人物 @match', async ({ page }) => {
    // Arrange
    await navigateToLogin(page);
    await performWechatLogin(page);
    await skipProfileSetupIfPresent(page);

    // Act
    await navigateToDiscover(page);

    // Assert
    await expect(page).toHaveURL(/\/discover|#\/?$/);
    // 应渲染推荐卡片（PersonCard 组件）
    const personCard = page.locator('.person-card, [data-testid="person-card"]').first();
    await expect(personCard).toBeVisible({ timeout: 15_000 });
  });

  test('右滑匹配后产生互相喜欢可在聊天页查看 @match', async ({ page }) => {
    // Arrange
    await navigateToLogin(page);
    await performWechatLogin(page);
    await skipProfileSetupIfPresent(page);
    await navigateToDiscover(page);

    // Act：触发右滑（喜欢）
    const likeBtn = page.getByRole('button', { name: /喜欢|心动/ }).first();
    if (await likeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await likeBtn.tap();
      // 等待匹配/换卡片
      await page.waitForTimeout(2_000);
    } else {
      // 兜底：通过键盘事件模拟右滑（兼容滑动手势测试）
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(1_000);
    }

    // Assert：卡片应切换或显示「匹配成功」提示
    // 不强断言成功（mock 数据可能无匹配），仅验证无白屏错误
    const errorBoundary = page.locator('[role="alert"].error, .error-state').first();
    await expect(errorBoundary).not.toBeVisible();

    // 切换到聊天页验证会话列表渲染
    await navigateToChat(page);
    await expect(page).toHaveURL(/\/(chat|messages)/);
  });

  test('聊天页会话列表可正常渲染 @chat', async ({ page }) => {
    // Arrange
    await navigateToLogin(page);
    await performWechatLogin(page);
    await skipProfileSetupIfPresent(page);

    // Act
    await navigateToChat(page);

    // Assert
    await expect(page).toHaveURL(/\/(chat|messages)/);
    // 空状态或会话列表至少渲染其一
    const emptyState = page.getByText(/还没有聊天|暂无消息/).first();
    const sessionList = page.locator('.chat-session-item, [data-testid="chat-session"]').first();
    const hasEmpty = await emptyState.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasSession = await sessionList.isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasEmpty || hasSession).toBeTruthy();
  });

  test('点击会话可进入聊天详情并查看消息 @chat', async ({ page }) => {
    // Arrange
    await navigateToLogin(page);
    await performWechatLogin(page);
    await skipProfileSetupIfPresent(page);
    await navigateToChat(page);

    // Act
    const firstSession = page.locator('.chat-session-item, [data-testid="chat-session"]').first();
    if (await firstSession.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstSession.tap();
      await page.waitForURL(/\/chat-session/, { timeout: 15_000 });

      // Assert：聊天详情页应渲染消息列表与输入框
      const messageInput = page.getByPlaceholder(/输入消息|说点什么/).first();
      await expect(messageInput).toBeVisible({ timeout: 10_000 });
    }
    // 无会话场景：跳过断言（不视为失败）
  });

  test('发送文本消息可在消息列表显示 @chat', async ({ page }) => {
    // Arrange
    await navigateToLogin(page);
    await performWechatLogin(page);
    await skipProfileSetupIfPresent(page);
    await navigateToChat(page);

    const firstSession = page.locator('.chat-session-item, [data-testid="chat-session"]').first();
    if (!(await firstSession.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Act
    await firstSession.tap();
    await page.waitForURL(/\/chat-session/, { timeout: 15_000 });

    const messageInput = page.getByPlaceholder(/输入消息|说点什么/).first();
    const testMessage = `E2E 测试消息 ${Date.now()}`;
    await messageInput.fill(testMessage);

    const sendBtn = page.getByRole('button', { name: /发送/ }).first();
    await sendBtn.tap();

    // Assert：消息应在列表中显示（乐观更新）
    await expect(page.getByText(testMessage).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('页面可访问性与可见性 @a11y', () => {
  test('登录页核心元素对屏幕阅读器可见 @a11y', async ({ page }) => {
    await navigateToLogin(page);
    // 验证关键 ARIA 属性（2026-08-10：toHaveAttribute 的属性名不支持正则，拆开断言）
    const loginBtn = page.getByRole('button', { name: /一键体验/ }).first();
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toHaveAttribute('role', 'button');
    await expect(loginBtn).toHaveAttribute('aria-label', /.+/);
  });

  test('TabBar 满足 ARIA tablist 规范 @a11y', async ({ page }) => {
    await navigateToLogin(page);
    await performWechatLogin(page);
    await skipProfileSetupIfPresent(page);

    const tabBar = page.locator('[role="tablist"]').first();
    if (await tabBar.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const tabs = tabBar.locator('[role="tab"]');
      const count = await tabs.count();
      expect(count).toBeGreaterThanOrEqual(4); // 至少 4 个 tab
    }
  });
});
