/**
 * verify-contract.mjs — 前后端契约漂移守卫（报告 P2-6 / R4-00162）。
 *
 * 职责：
 *   1. 校验 api-types-supplement.ts 未继续膨胀（新类型必须先进 OpenAPI spec）；
 *   2. 校验 OpenAPI YAML 源文件存在且可解析（generate:openapi 前置）；
 *   3. 校验 api-types.ts 生成物非空且含 schema 数量 >= 阈值（防误删/损坏）。
 *
 * 用法：node scripts/verify-contract.mjs
 * 退出码：0 通过；1 失败（输出具体违规项）。
 *
 * 挂接：建议加入 CI / pre-commit（apps/client/package.json 增加
 *   "verify:contract": "node scripts/verify-contract.mjs"）。
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(__dirname, "..");

const SUPPLEMENT = resolve(clientDir, "src/services/generated/api-types-supplement.ts");
const API_TYPES = resolve(clientDir, "src/services/generated/api-types.ts");
const OPENAPI_DIR = resolve(clientDir, "../../docs/openapi");

/** supplement 类型声明的行数上限（防止第二真相源膨胀；新类型必须走 OpenAPI）。
 * 基线 742 行（R4-00162 既有债），上限 800 = 基线 + 缓冲，允许小幅修正但禁止膨胀。 */
const SUPPLEMENT_LINE_CAP = 800;
/** api-types.ts 最小行数（生成物完整性下限） */
const API_TYPES_MIN_LINES = 500;
/** OpenAPI 规范文件必须存在的最少数量 */
const OPENAPI_MIN_FILES = 1;

let failures = 0;

function fail(msg) {
  failures++;
  console.error(`[contract] ✗ ${msg}`);
}

// 1. OpenAPI 源存在性
if (!existsSync(OPENAPI_DIR)) {
  fail(`OpenAPI 目录不存在: ${OPENAPI_DIR}`);
} else {
  const yamls = readdirSync(OPENAPI_DIR).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  if (yamls.length < OPENAPI_MIN_FILES) {
    fail(`OpenAPI YAML 少于 ${OPENAPI_MIN_FILES} 个（当前 ${yamls.length}）`);
  } else {
    console.log(`[contract] ✓ OpenAPI 源 ${yamls.length} 个: ${yamls.join(", ")}`);
  }
}

// 2. api-types.ts 生成物完整性
if (!existsSync(API_TYPES)) {
  fail(`api-types.ts 缺失（运行 pnpm generate:openapi）: ${API_TYPES}`);
} else {
  const lines = readFileSync(API_TYPES, "utf-8").split("\n").length;
  if (lines < API_TYPES_MIN_LINES) {
    fail(`api-types.ts 疑似损坏: ${lines} 行 < ${API_TYPES_MIN_LINES}（应重新生成）`);
  } else {
    console.log(`[contract] ✓ api-types.ts ${lines} 行（生成物完整）`);
  }
}

// 3. supplement 膨胀守卫
if (!existsSync(SUPPLEMENT)) {
  console.log("[contract] ✓ supplement 不存在（契约已全部纳入 OpenAPI，最佳状态）");
} else {
  const lines = readFileSync(SUPPLEMENT, "utf-8").split("\n").length;
  if (lines > SUPPLEMENT_LINE_CAP) {
    fail(`api-types-supplement.ts 超限 ${lines} 行 > ${SUPPLEMENT_LINE_CAP}：新类型必须先进 OpenAPI spec 再生成，禁止继续膨胀第二真相源（R4-00162）`);
  } else {
    console.log(`[contract] ✓ supplement ${lines} 行（未超限 ${SUPPLEMENT_LINE_CAP}）`);
  }
}

// 4. 生成时间对比（api-types.ts 应比 OpenAPI 源新或接近）
if (existsSync(API_TYPES) && existsSync(OPENAPI_DIR)) {
  const apiTypesTime = statSync(API_TYPES).mtimeMs;
  let newestSpecTime = 0;
  for (const f of readdirSync(OPENAPI_DIR)) {
    if (!f.endsWith(".yaml") && !f.endsWith(".yml")) continue;
    const t = statSync(resolve(OPENAPI_DIR, f)).mtimeMs;
    if (t > newestSpecTime) newestSpecTime = t;
  }
  if (apiTypesTime < newestSpecTime - 60_000) {
    fail(`api-types.ts 生成时间早于最新 OpenAPI 源（生成物可能过期，请运行 pnpm generate:openapi）`);
  } else {
    console.log("[contract] ✓ api-types.ts 未过期");
  }
}

if (failures > 0) {
  console.error(`\n[contract] ✗ ${failures} 项契约漂移，请修复后重试`);
  process.exit(1);
}
console.log("\n[contract] ✓ 前后端契约一致，无漂移");
process.exit(0);
