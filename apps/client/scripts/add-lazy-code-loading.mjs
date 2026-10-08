/**
 * add-lazy-code-loading.mjs —— 给 mp-weixin 产物 app.json 补写 lazyCodeLoading。
 *
 * 背景（2026-10-05 发布档减负）：pages.json 根节点声明了
 * `"lazyCodeLoading": "requiredComponents"`，但当前 uni alpha
 * （@dcloudio/uni-cli-shared dist/json/mp/pages.js 的 appJson 字段白名单只含
 * preloadRule/workers/plugins/entryPagePath）不会把该字段透传到 dist app.json。
 * 本脚本在构建后显式补写，等 uni 版本透传后即自动幂等跳过（重复执行安全）。
 *
 * 效果：微信基础库 ≥2.11.1 按需注入自定义组件与代码，减小主包启动注入量。
 * 前提校验：dist app.json 的全局 usingComponents 必须为空（uni 产物恒为 {}），
 * 否则按需注入会漏掉全局组件，直接 fail 提示人工评估。
 *
 * 用法：node scripts/add-lazy-code-loading.mjs [distDir]
 *   distDir 默认 dist/build/mp-weixin（挂载在 release-chain.mjs 的 uni build 之后、
 *   verify-package-size 之前，保证被测产物即最终产物）。
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");
const distArg = process.argv[2];
const distDir = distArg ? resolve(distArg) : join(clientDir, "dist/build/mp-weixin");
const appJsonPath = join(distDir, "app.json");

if (!existsSync(appJsonPath)) {
  console.error(`[lazy-code-loading] 缺少产物 app.json: ${appJsonPath}（构建未成功？）`);
  process.exit(1);
}

const appJson = JSON.parse(readFileSync(appJsonPath, "utf-8"));

// 全局 usingComponents 非空时按需注入会漏组件，拒绝静默写入
if (appJson.usingComponents && Object.keys(appJson.usingComponents).length > 0) {
  console.error(
    `[lazy-code-loading] 全局 usingComponents 非空（${Object.keys(appJson.usingComponents).join(", ")}），` +
      `按需注入会漏掉全局组件；请先评估迁移到页面级声明再开启 lazyCodeLoading`
  );
  process.exit(1);
}

if (appJson.lazyCodeLoading === "requiredComponents") {
  console.log("[lazy-code-loading] app.json 已含 lazyCodeLoading=requiredComponents（uni 已透传，幂等跳过）");
  process.exit(0);
}

if (appJson.lazyCodeLoading && appJson.lazyCodeLoading !== "requiredComponents") {
  console.error(`[lazy-code-loading] app.json 已有其他取值 lazyCodeLoading=${appJson.lazyCodeLoading}，不覆盖`);
  process.exit(1);
}

appJson.lazyCodeLoading = "requiredComponents";
writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
console.log("[lazy-code-loading] 已写入 lazyCodeLoading=requiredComponents（按需注入，主包减负）");
