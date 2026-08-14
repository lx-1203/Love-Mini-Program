# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: core-journey.spec.ts >> 核心旅程：注册 → 匹配 → 聊天 @core-journey >> 登录后可访问匹配页查看推荐人物 @match
- Location: tests\e2e\specs\core-journey.spec.ts:84:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.person-card, [data-testid="person-card"]').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('.person-card, [data-testid="person-card"]').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: 寻觅
        - generic [ref=e11]: 发现心动的人
      - generic [ref=e12]: 今日剩余 10 次
    - generic [ref=e18]:
      - button "附近" [ref=e19]:
        - img [ref=e22]
        - generic [ref=e23]: 附近
      - button "匹配范围" [ref=e24]:
        - generic [ref=e25]: 不限
        - generic [ref=e26]: ▾
      - button "年龄区间" [ref=e27]:
        - generic [ref=e28]: 18-35岁
        - generic [ref=e29]: ▾
      - button "排序规则" [ref=e30]:
        - generic [ref=e31]: 匹配度优先
        - generic [ref=e32]: ▾
      - button "全部筛选" [ref=e33]:
        - generic [ref=e34]: 全部筛选
    - generic [ref=e35]:
      - search "搜索用户/标签/学校" [ref=e36]:
        - img [ref=e39]
        - generic "搜索用户/标签/学校" [ref=e40]:
          - generic [ref=e41]:
            - generic: 搜索用户/标签/学校
            - textbox [ref=e42]
      - button "今日签到" [ref=e43]:
        - img [ref=e46]
        - generic [ref=e47]: 今日签到
    - generic [ref=e49]:
      - generic [ref=e50]:
        - img "图片" [ref=e52]:
          - img [ref=e55]
        - generic [ref=e56]:
          - img "图片" [ref=e57]:
            - img [ref=e60]
          - generic [ref=e61]:
            - generic [ref=e62]: "ID: CL-4001"
            - button "认证详情" [ref=e63]:
              - generic [ref=e64]: 双重认证
              - generic [ref=e65]: ›
          - generic [ref=e66]:
            - generic [ref=e67]:
              - generic [ref=e68]: 夏言
              - generic [ref=e69]: 21岁
              - generic [ref=e70]: 北京大学
              - img "已认证" [ref=e71]:
                - img [ref=e74]
                - generic [ref=e75]: 已认证
            - generic [ref=e76]:
              - generic [ref=e78]: 距离你1.2km
              - generic [ref=e80]: 刚刚活跃
              - generic [ref=e82]: 80%匹配
            - generic [ref=e83]:
              - generic [ref=e84]:
                - img [ref=e87]
                - generic [ref=e88]: 165cm
              - generic [ref=e89]:
                - img [ref=e92]
                - generic [ref=e93]: 产品经理
              - generic [ref=e94]:
                - img [ref=e97]
                - generic [ref=e98]: 8k-15k
              - generic [ref=e99]:
                - img [ref=e102]
                - generic [ref=e103]: 未婚
            - generic [ref=e104]:
              - generic [ref=e105]: 喜欢听人讲故事，也擅长保守秘密。想认识有趣的人，一起喝咖啡、看电影、夜跑。周末通常比较空闲，欢迎约我出去逛逛。
              - generic [ref=e107]: 展开
            - generic [ref=e108]:
              - generic [ref=e110]: 咖啡
              - generic [ref=e112]: 电影
              - generic [ref=e114]: 夜跑
              - generic [ref=e116]: 心理学
            - generic [ref=e117]:
              - generic [ref=e119]: INFJ
              - generic [ref=e121]: 温柔体贴
              - generic [ref=e123]: 文艺安静
            - generic [ref=e124]:
              - generic [ref=e125]: 我期待遇见的你
              - generic [ref=e126]: 希望遇到一个喜欢猫、愿意一起逛展的男生
            - button "TA的动态" [ref=e127]:
              - generic [ref=e128]:
                - generic [ref=e129]: TA的动态
                - generic [ref=e130]: 图书馆的橘猫今天又蹭了我一下午，太治愈了。
                - generic [ref=e131]:
                  - generic [ref=e132]:
                    - img [ref=e135]
                    - generic [ref=e136]: "32"
                  - generic [ref=e137]:
                    - img [ref=e140]
                    - generic [ref=e141]: "8"
      - generic [ref=e142]:
        - button "跳过" [ref=e143]:
          - img [ref=e146]
        - button "悄悄话" [ref=e147]:
          - img [ref=e150]
          - generic [ref=e151]: 悄悄话
        - button "喜欢" [ref=e152]:
          - img [ref=e155]
    - button "发布" [ref=e156]:
      - generic:
        - img
  - generic [ref=e158]:
    - generic [ref=e161] [cursor=pointer]:
      - img [ref=e163]
      - generic [ref=e164]: 首页
    - generic [ref=e166] [cursor=pointer]:
      - img [ref=e168]
      - generic [ref=e169]: 匹配
    - generic [ref=e171] [cursor=pointer]:
      - img [ref=e173]
      - generic [ref=e174]: 圈子
    - generic [ref=e176] [cursor=pointer]:
      - img [ref=e178]
      - generic [ref=e179]: 消息
    - generic [ref=e181] [cursor=pointer]:
      - img [ref=e183]
      - generic [ref=e184]: 我的
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * 核心用户旅程 E2E 测试（P7 - Task 7.2.1）。
  5   |  *
  6   |  * <p>覆盖：注册 → 匹配 → 聊天 核心旅程。</p>
  7   |  *
  8   |  * <p>测试用例标签（@core-journey、@auth、@match、@chat）便于通过 --grep 选择性执行。</p>
  9   |  *
  10  |  * <p>设计原则：</p>
  11  |  * <ul>
  12  |  *   <li>AAA 结构：Arrange / Act / Assert 注释清晰分隔</li>
  13  |  *   <li>Page Object 模式：通过 helper 函数封装跨用例复用操作</li>
  14  |  *   <li>数据隔离：每个用例独立运行，不依赖前置状态</li>
  15  |  *   <li>失败诊断：关键步骤添加 expect.soft，避免单点失败影响后续断言</li>
  16  |  * </ul>
  17  |  */
  18  | 
  19  | // ── Page Object Helpers ──
  20  | 
  21  | async function navigateToLogin(page: Page) {
  22  |   // 2026-08-10 修复：① 发现页免登录可逛（page-access.ts），根路径 '/' 不再跳登录页；
  23  |   // ② uni-app H5 为 hash 路由，裸路径 '/pages/login/index' 无 hash 会落到首页——
  24  |   // 显式带 hash 访问登录页
  25  |   await page.goto('/#/pages/login/index');
  26  |   await page.waitForURL(/login/, { timeout: 15_000 });
  27  | }
  28  | 
  29  | async function performWechatLogin(page: Page) {
  30  |   // 2026-08-10 修复：① 微信登录（uni.login provider=weixin）仅小程序端可用，H5 环境无此 provider——
  31  |   // 改用「一键体验全部功能」体验号登录（POST /v1/auth/guest-login，dev 后端可用）；
  32  |   // ② 登录按钮与协议勾选绑定（agreed 守卫），必须先勾选「已阅读并同意」
  33  |   const agree = page.getByRole('checkbox', { name: /已阅读并同意/ }).first();
  34  |   await expect(agree).toBeVisible({ timeout: 10_000 });
  35  |   await agree.check();
  36  | 
  37  |   const loginBtn = page.getByRole('button', { name: /一键体验/ }).first();
  38  |   await expect(loginBtn).toBeVisible({ timeout: 10_000 });
  39  |   await loginBtn.click();
  40  | 
  41  |   // 等待登录完成跳转（navigateAfterLogin 无待跳路径时进入 discover——uni-app H5 首页 tab 以 /#/ 表示；
  42  |   // 可能先去资料引导）
  43  |   await page.waitForURL(/\/discover|\/home|\/setup\/profile|#\/?$/, { timeout: 30_000 });
  44  | }
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
> 97  |     await expect(personCard).toBeVisible({ timeout: 15_000 });
      |                              ^ Error: expect(locator).toBeVisible() failed
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
  145 |     expect(hasEmpty || hasSession).toBeTruthy();
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
```