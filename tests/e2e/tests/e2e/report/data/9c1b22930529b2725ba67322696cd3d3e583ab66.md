# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: core-journey.spec.ts >> 核心旅程：注册 → 匹配 → 聊天 @core-journey >> 聊天页会话列表可正常渲染 @chat
- Location: tests\e2e\specs\core-journey.spec.ts:129:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e13]: 校园恋爱
        - generic [ref=e14]: 先从推荐的人、讨论圈、活动和临时聊天开始认识彼此。
    - generic [ref=e15]:
      - generic [ref=e17]:
        - button "微信一键登录" [ref=e18]:
          - generic [ref=e20]: 微
          - generic [ref=e21]: 微信一键登录
        - button "手机号登录" [ref=e22]:
          - generic [ref=e23]: 手机号登录
        - button "一键体验全部功能" [ref=e24]:
          - generic [ref=e25]: 一键体验全部功能
          - generic [ref=e26]: 临时体验号 · 免注册，马上玩
      - generic [ref=e27]:
        - checkbox "已阅读并同意" [ref=e28]
        - generic [ref=e29]:
          - generic [ref=e30]: 已阅读并同意
          - link "《用户协议》" [ref=e31]
          - generic [ref=e32]: 和
          - link "《隐私政策》" [ref=e33]
      - generic [ref=e34]:
        - generic [ref=e37]: 其他登录方式
        - generic [ref=e39]:
          - generic [ref=e42]: Apple 登录
          - generic [ref=e43]:
            - img [ref=e46]
            - generic [ref=e47]: 账号绑定
  - generic:
    - generic:
      - generic:
        - img
        - paragraph: 登录成功
```

# Test source

```ts
  45  | 
  46  | async function skipProfileSetupIfPresent(page: Page) {
  47  |   const skipBtn = page.getByRole('button', { name: /跳过|稍后设置/ }).first();
  48  |   if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
  49  |     await skipBtn.tap();
  50  |   }
  51  | }
  52  | 
  53  | async function navigateToDiscover(page: Page) {
  54  |   // 2026-08-10 修复：custom tabBar 仅 mp-weixin 实现，H5 端无底部导航（已知平台差异，
  55  |   // 见 docs/SOCIAL-APP-ACCEPTANCE.md §4）——H5 用 URL 导航；mp-weixin 环境可切回 tab 点击
  56  |   await page.goto('/#/pages/discover/index');
  57  |   await page.waitForURL(/\/discover|#\/?$/, { timeout: 15_000 });
  58  | }
  59  | 
  60  | async function navigateToChat(page: Page) {
  61  |   // 同上：H5 端无 TabBar，直接 URL 导航到消息页
  62  |   await page.goto('/#/pages/messages/index');
  63  |   await page.waitForURL(/\/(chat|messages)/, { timeout: 15_000 });
  64  | }
  65  | 
  66  | // ── Test Cases ──
  67  | 
  68  | test.describe('核心旅程：注册 → 匹配 → 聊天 @core-journey', () => {
  69  | 
  70  |   test('用户可通过微信登录进入首页 @auth @smoke', async ({ page }) => {
  71  |     // Arrange
  72  |     await navigateToLogin(page);
  73  | 
  74  |     // Act
  75  |     await performWechatLogin(page);
  76  |     await skipProfileSetupIfPresent(page);
  77  | 
  78  |     // Assert：应进入首页或匹配页（uni-app H5 首页 tab = /#/）
  79  |     await expect(page).toHaveURL(/\/home|\/discover|#\/?$/, { timeout: 15_000 });
  80  |     // 登录后发现页应渲染核心内容（寻觅头部 / 推荐卡片；H5 无 custom tabBar，不断言 tabbar）
  81  |     await expect(page.getByText(/寻觅|发现心动的人/).first()).toBeVisible({ timeout: 10_000 });
  82  |   });
  83  | 
  84  |   test('登录后可访问匹配页查看推荐人物 @match', async ({ page }) => {
  85  |     // Arrange
  86  |     await navigateToLogin(page);
  87  |     await performWechatLogin(page);
  88  |     await skipProfileSetupIfPresent(page);
  89  | 
  90  |     // Act
  91  |     await navigateToDiscover(page);
  92  | 
  93  |     // Assert
  94  |     await expect(page).toHaveURL(/\/discover|#\/?$/);
  95  |     // 应渲染推荐卡片（PersonCard 组件）
  96  |     const personCard = page.locator('.person-card, [data-testid="person-card"]').first();
  97  |     await expect(personCard).toBeVisible({ timeout: 15_000 });
  98  |   });
  99  | 
  100 |   test('右滑匹配后产生互相喜欢可在聊天页查看 @match', async ({ page }) => {
  101 |     // Arrange
  102 |     await navigateToLogin(page);
  103 |     await performWechatLogin(page);
  104 |     await skipProfileSetupIfPresent(page);
  105 |     await navigateToDiscover(page);
  106 | 
  107 |     // Act：触发右滑（喜欢）
  108 |     const likeBtn = page.getByRole('button', { name: /喜欢|心动/ }).first();
  109 |     if (await likeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
  110 |       await likeBtn.tap();
  111 |       // 等待匹配/换卡片
  112 |       await page.waitForTimeout(2_000);
  113 |     } else {
  114 |       // 兜底：通过键盘事件模拟右滑（兼容滑动手势测试）
  115 |       await page.keyboard.press('ArrowRight');
  116 |       await page.waitForTimeout(1_000);
  117 |     }
  118 | 
  119 |     // Assert：卡片应切换或显示「匹配成功」提示
  120 |     // 不强断言成功（mock 数据可能无匹配），仅验证无白屏错误
  121 |     const errorBoundary = page.locator('[role="alert"].error, .error-state').first();
  122 |     await expect(errorBoundary).not.toBeVisible();
  123 | 
  124 |     // 切换到聊天页验证会话列表渲染
  125 |     await navigateToChat(page);
  126 |     await expect(page).toHaveURL(/\/(chat|messages)/);
  127 |   });
  128 | 
  129 |   test('聊天页会话列表可正常渲染 @chat', async ({ page }) => {
  130 |     // Arrange
  131 |     await navigateToLogin(page);
  132 |     await performWechatLogin(page);
  133 |     await skipProfileSetupIfPresent(page);
  134 | 
  135 |     // Act
  136 |     await navigateToChat(page);
  137 | 
  138 |     // Assert
  139 |     await expect(page).toHaveURL(/\/(chat|messages)/);
  140 |     // 空状态或会话列表至少渲染其一
  141 |     const emptyState = page.getByText(/还没有聊天|暂无消息/).first();
  142 |     const sessionList = page.locator('.chat-session-item, [data-testid="chat-session"]').first();
  143 |     const hasEmpty = await emptyState.isVisible({ timeout: 5_000 }).catch(() => false);
  144 |     const hasSession = await sessionList.isVisible({ timeout: 5_000 }).catch(() => false);
> 145 |     expect(hasEmpty || hasSession).toBeTruthy();
      |                                    ^ Error: expect(received).toBeTruthy()
  146 |   });
  147 | 
  148 |   test('点击会话可进入聊天详情并查看消息 @chat', async ({ page }) => {
  149 |     // Arrange
  150 |     await navigateToLogin(page);
  151 |     await performWechatLogin(page);
  152 |     await skipProfileSetupIfPresent(page);
  153 |     await navigateToChat(page);
  154 | 
  155 |     // Act
  156 |     const firstSession = page.locator('.chat-session-item, [data-testid="chat-session"]').first();
  157 |     if (await firstSession.isVisible({ timeout: 5_000 }).catch(() => false)) {
  158 |       await firstSession.tap();
  159 |       await page.waitForURL(/\/chat-session/, { timeout: 15_000 });
  160 | 
  161 |       // Assert：聊天详情页应渲染消息列表与输入框
  162 |       const messageInput = page.getByPlaceholder(/输入消息|说点什么/).first();
  163 |       await expect(messageInput).toBeVisible({ timeout: 10_000 });
  164 |     }
  165 |     // 无会话场景：跳过断言（不视为失败）
  166 |   });
  167 | 
  168 |   test('发送文本消息可在消息列表显示 @chat', async ({ page }) => {
  169 |     // Arrange
  170 |     await navigateToLogin(page);
  171 |     await performWechatLogin(page);
  172 |     await skipProfileSetupIfPresent(page);
  173 |     await navigateToChat(page);
  174 | 
  175 |     const firstSession = page.locator('.chat-session-item, [data-testid="chat-session"]').first();
  176 |     if (!(await firstSession.isVisible({ timeout: 5_000 }).catch(() => false))) {
  177 |       test.skip();
  178 |       return;
  179 |     }
  180 | 
  181 |     // Act
  182 |     await firstSession.tap();
  183 |     await page.waitForURL(/\/chat-session/, { timeout: 15_000 });
  184 | 
  185 |     const messageInput = page.getByPlaceholder(/输入消息|说点什么/).first();
  186 |     const testMessage = `E2E 测试消息 ${Date.now()}`;
  187 |     await messageInput.fill(testMessage);
  188 | 
  189 |     const sendBtn = page.getByRole('button', { name: /发送/ }).first();
  190 |     await sendBtn.tap();
  191 | 
  192 |     // Assert：消息应在列表中显示（乐观更新）
  193 |     await expect(page.getByText(testMessage).first()).toBeVisible({ timeout: 10_000 });
  194 |   });
  195 | });
  196 | 
  197 | test.describe('页面可访问性与可见性 @a11y', () => {
  198 |   test('登录页核心元素对屏幕阅读器可见 @a11y', async ({ page }) => {
  199 |     await navigateToLogin(page);
  200 |     // 验证关键 ARIA 属性（2026-08-10：toHaveAttribute 的属性名不支持正则，拆开断言）
  201 |     const loginBtn = page.getByRole('button', { name: /一键体验/ }).first();
  202 |     await expect(loginBtn).toBeVisible();
  203 |     await expect(loginBtn).toHaveAttribute('role', 'button');
  204 |     await expect(loginBtn).toHaveAttribute('aria-label', /.+/);
  205 |   });
  206 | 
  207 |   test('TabBar 满足 ARIA tablist 规范 @a11y', async ({ page }) => {
  208 |     await navigateToLogin(page);
  209 |     await performWechatLogin(page);
  210 |     await skipProfileSetupIfPresent(page);
  211 | 
  212 |     const tabBar = page.locator('[role="tablist"]').first();
  213 |     if (await tabBar.isVisible({ timeout: 5_000 }).catch(() => false)) {
  214 |       const tabs = tabBar.locator('[role="tab"]');
  215 |       const count = await tabs.count();
  216 |       expect(count).toBeGreaterThanOrEqual(4); // 至少 4 个 tab
  217 |     }
  218 |   });
  219 | });
  220 | 
```