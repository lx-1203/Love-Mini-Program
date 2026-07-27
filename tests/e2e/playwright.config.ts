import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置（P7 - Task 7.2.1）。
 *
 * <p>覆盖核心 E2E 旅程：注册 → 匹配 → 聊天。</p>
 *
 * <p>设计要点：</p>
 * <ul>
 *   <li>支持 H5 dev server（uni-app vite dev）与 mp-weixin 两种环境</li>
 *   <li>通过 USE_DEV_SERVER 环境变量切换 baseURL（默认 H5 dev）</li>
 *   <li>失败时自动截图 + trace 收集，便于回放调试</li>
 *   <li>并发执行：CI 资源有限时通过 workers 限制</li>
 *   <li>重试策略：本地 0 次，CI 2 次</li>
 * </ul>
 *
 * <p>运行方式：</p>
 * <pre>
 * # 安装依赖
 * pnpm --filter @campus-love/client add -D @playwright/test
 * npx playwright install --with-deps chromium
 *
 * # 本地运行（需先启动 H5 dev server: pnpm client:dev:h5）
 * npx playwright test --config=tests/e2e/playwright.config.ts
 *
 * # 带 UI 报告
 * npx playwright test --ui --config=tests/e2e/playwright.config.ts
 *
 * # 仅运行核心旅程
 * npx playwright test --grep="@core-journey" --config=tests/e2e/playwright.config.ts
 * </pre>
 */
export default defineConfig({
  testDir: './tests/e2e/specs',
  outputDir: './tests/e2e/test-results',
  fullyParallel: false, // uni-app H5 dev 单实例，避免端口冲突
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // 串行：避免 dev server 并发占用
  reporter: [
    ['html', { outputFolder: 'tests/e2e/report' }],
    ['list'],
    process.env.CI ? ['github-actions'] : ['list'],
  ],
  use: {
    // baseURL 由环境变量驱动：本地 H5 dev、CI 起的 docker compose 服务均可注入
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 390, height: 844 }, // iPhone 14 默认尺寸，模拟移动端
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
    // Desktop Chrome 用于兼容性回归（暗色模式、宽屏布局）
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // WebServer 自动启动：本地运行时无需手动启动 dev server
  // CI 环境由 docker-compose 提供服务，禁用 webServer
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm --filter @campus-love/client run dev:h5',
        url: 'http://localhost:5173',
        timeout: 120_000,
        reuseExistingServer: true,
        env: {
          // Mock 模式：避免真实微信登录依赖
          NODE_ENV: 'development',
        },
      },
});
