/* eslint-env node */
/**
 * release 构建环境校验脚本（R4-00199 / R4-00200）
 *
 * 用途：
 *   校验 release 构建（build:h5:real / build:mp-weixin:real，mode=real）所加载的
 *   环境变量中 VITE_API_BASE_URL 是否满足发布要求：
 *     - 必须为 https
 *     - 不得指向本机地址（127.0.0.1 / localhost / 0.0.0.0）
 *     - 不得使用示例域名（example.com）
 *   校验失败时以非 0 退出码终止构建（&& 串联在 build 脚本前），
 *   避免把 .env.mp-weixin / .env.production 中的本机/示例域名打包进生产包。
 *
 * 使用方式：
 *   已接入 apps/client/package.json 的 build:h5:real / build:mp-weixin:real，
 *   无需手动执行。
 *
 * 退出码：
 *   0 - 校验通过
 *   1 - 校验失败（输出具体错误项）
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "../apps/client");

/** Vite 环境变量加载顺序（后加载覆盖先加载）：.env → .env.[mode] */
const ENV_FILES = [".env", ".env.real"];

/** 解析 .env 文件的 KEY=VALUE 行（忽略注释与空行，支持引号包裹的值）。 */
function parseEnv(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/** 读取客户端 env 配置（.env.real 覆盖 .env）。 */
function loadClientEnv() {
  const merged = {};
  for (const file of ENV_FILES) {
    const filePath = resolve(clientDir, file);
    if (!existsSync(filePath)) continue;
    Object.assign(merged, parseEnv(readFileSync(filePath, "utf8")));
  }
  return merged;
}

const env = loadClientEnv();
const apiBaseUrl = (env.VITE_API_BASE_URL ?? "").trim();
const errors = [];

if (!apiBaseUrl) {
  errors.push("未配置 VITE_API_BASE_URL（apps/client/.env.real）");
} else {
  const lower = apiBaseUrl.toLowerCase();
  if (!lower.startsWith("https://")) {
    errors.push(`VITE_API_BASE_URL 必须为 https（当前: ${apiBaseUrl}）`);
  }
  if (lower.includes("127.0.0.1") || lower.includes("localhost") || lower.includes("0.0.0.0")) {
    errors.push(`VITE_API_BASE_URL 不得指向本机地址（当前: ${apiBaseUrl}）`);
  }
  if (lower.includes("example.com")) {
    errors.push(`VITE_API_BASE_URL 不得使用示例域名 example.com（当前: ${apiBaseUrl}）`);
  }
}

if (errors.length > 0) {
  console.error("[verify-env-release] FAIL: release 构建环境校验未通过：");
  for (const msg of errors) {
    console.error(`  - ${msg}`);
  }
  console.error(
    "[verify-env-release] 请在 apps/client/.env.real 配置真实 HTTPS 后端域名后重试（微信小程序合法域名必须为 HTTPS）。"
  );
  process.exit(1);
}

console.error(`[verify-env-release] OK: release 构建环境校验通过（VITE_API_BASE_URL=${apiBaseUrl}）`);
process.exit(0);
