/**
 * E2E 目录的最小 Node 环境声明。
 *
 * 为什么手写而不是装 @types/node：本仓根 devDependencies 里没有 @types/node，
 * 而 tests/e2e 之前**不在任何 tsconfig 射程内**（playwright 运行时用 esbuild 直接转，
 * 类型错了要等到跑测试才炸）。为了让这块能被 `npm run test:e2e-types` 静态检查，
 * 只声明实际用到的那一个全局：playwright.config.ts 里的 process.env 读取
 * （CI / E2E_BASE_URL）。spec 文件本身只用浏览器全局，走 lib: ["DOM"]。
 */
declare const process: {
  env: Record<string, string | undefined>;
};
