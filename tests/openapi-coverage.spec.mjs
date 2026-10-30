import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * OpenAPI 契约漂移门（S4-1，2026-10-30）。
 *
 * 背景：`docs/openapi/` 有 9 份手写契约，但 `generate:openapi` 只吃其中 1 份
 * （apps/client/package.json 里只指向 feedback-growth-and-auth.yaml）。其余 8 份
 * 没有任何东西消费，也就没有任何东西会发现它们错了：
 *   - village.yaml 的 servers 写 `/api`，而 VillageController 是 `@RequestMapping("/api/v1/posts")`
 *     ——按这份文件生成的客户端会整体少一层版本段；
 *   - village.yaml 的 `PostSummary.id` 写 `type: string`，而 `PostSummaryView.java` 的 id 是 `Long`；
 *   - village.yaml 的 category 枚举写 `[dating, study, life, activity, help]`，
 *     而 `Post.PostCategory` 是 `[all, interest, sincere, hometown, anonymous, latest, campus, activity]`
 *     ——服务端用 `PostCategory.valueOf(...)` 解析，按文档发请求一律 400；
 *   - whispers.yaml 干脆没有 servers。
 * 这些都不会让 CI 变红，因为 CI 校验的是"文件是否是合法 YAML"（tools/lint-openapi.mjs、
 * spectral），不是"文件是否与实现一致"。本门补的就是这条判点。
 */

const root = fileURLToPath(new URL("../", import.meta.url));
const OPENAPI_DIR = join(root, "docs", "openapi");
const MAIN_JAVA = join(root, "apps", "api", "src", "main", "java");

/**
 * 尚未被类型生成消费的契约（棘轮基线，只允许收缩）。
 * 彻底方案是让运行时 `/v3/api-docs` 成为唯一真相源，本文件不在此列——见排查报告待办。
 */
const UNCONSUMED_BASELINE = new Set([
  "check-in.yaml",
  "likes.yaml",
  "notifications.yaml",
  "official-accounts.yaml",
  "recommendations.yaml",
  "users.yaml",
  "village.yaml",
  "whispers.yaml",
]);

/** 已知的类型判点（schema.属性 → 期望的 YAML type），写死便于逐条追溯实现。 */
const TYPED_SPOT_CHECKS = [
  { file: "village.yaml", schema: "PostSummary", property: "id", expectType: "integer" },
];

/** 收集 main java 里所有以 / 开头的字符串字面量（控制器映射路径）。 */
function javaPathLiterals() {
  const literals = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name !== "archive") walk(join(dir, entry.name));
        continue;
      }
      if (!entry.name.endsWith(".java")) continue;
      const text = readFileSync(join(dir, entry.name), "utf8");
      for (const m of text.matchAll(/"(\/[A-Za-z0-9_\-{}\/]*)"/gu)) literals.add(m[1]);
    }
  };
  walk(MAIN_JAVA);
  return literals;
}

/** 取一份契约里的 servers.url 与顶层 path 键。 */
function parseContract(text) {
  const serverUrls = [...text.matchAll(/^\s*-\s+url:\s*(\S+)\s*$/gmu)].map((m) => m[1]);
  const paths = [...text.matchAll(/^ {2}(\/[^:\s]+):$/gmu)].map((m) => m[1]);
  return { serverUrls, paths };
}

/** 某个路径首段能否在 Java 映射字面量里找到。 */
function segmentResolves(segment, literals) {
  for (const literal of literals) {
    if (literal === segment || literal === `/${segment.slice(1)}`) return true;
    if (literal.startsWith(`${segment}/`) || literal.endsWith(segment)) return true;
    if (literal.includes(`${segment}/`)) return true;
  }
  return false;
}

// —— 自测：判点必须能红 ——
const literals = javaPathLiterals();
assert.ok(literals.size > 200, `只收集到 ${literals.size} 个 Java 路径字面量（<200），扫描可能失效`);
const fixtureBad = [
  "servers:",
  "  - url: /api",
  "paths:",
  "  /totally-made-up-endpoint:",
  "    get:",
  "      responses:",
].join("\n");
const parsedBad = parseContract(fixtureBad);
assert.deepEqual(parsedBad.serverUrls, ["/api"], "servers 解析失效");
assert.ok(!segmentResolves("/totally-made-up-endpoint", literals),
  "路径判点失去证伪能力：编造的路径也能通过");
assert.ok(segmentResolves("/posts", literals), "正控失效：/posts 必须在 Java 侧存在");

// —— 全量校验 ——
const yamlFiles = readdirSync(OPENAPI_DIR).filter((f) => f.endsWith(".yaml")).sort();
assert.ok(yamlFiles.length >= 9, `契约文件只有 ${yamlFiles.length} 份（<9），目录可能被清空`);

const clientPkg = JSON.parse(readFileSync(join(root, "apps/client/package.json"), "utf8"));
const generatedScript = clientPkg.scripts?.["generate:openapi"] ?? "";
const consumed = new Set(
  [...generatedScript.matchAll(/docs\/openapi\/([\w.\-]+\.yaml)/giu)].map((m) => m[1]),
);
assert.ok(consumed.size >= 1, "generate:openapi 没有消费任何契约，类型生成链已断");

const unconsumed = yamlFiles.filter((f) => !consumed.has(f));
const newlyUnconsumed = unconsumed.filter((f) => !UNCONSUMED_BASELINE.has(f));
const retired = [...UNCONSUMED_BASELINE].filter((f) => !unconsumed.includes(f));
assert.deepEqual(newlyUnconsumed, [],
  `新的契约没有被任何生成链消费：${newlyUnconsumed.join(", ")}`);
assert.deepEqual(retired, [],
  `以下契约已接入生成链，请把 ${'UNCONSUMED_BASELINE'} 收小：${retired.join(", ")}`);

const serverProblems = [];
const pathProblems = [];
let checkedPaths = 0;
for (const file of yamlFiles) {
  const text = readFileSync(join(OPENAPI_DIR, file), "utf8");
  const { serverUrls, paths } = parseContract(text);
  if (serverUrls.length === 0) serverProblems.push(`${file}: 缺少 servers`);
  for (const url of serverUrls) {
    if (url !== "/api/v1") serverProblems.push(`${file}: servers 是 ${url}，控制器前缀是 /api/v1`);
  }
  for (const path of paths) {
    const segment = `/${path.split("/").filter(Boolean)[0]}`;
    checkedPaths += 1;
    if (!segmentResolves(segment, literals)) pathProblems.push(`${file}: ${path} 的首段 ${segment} 在 Java 侧找不到`);
  }
}
assert.ok(checkedPaths >= 60, `只解析到 ${checkedPaths} 条 path（<60），path 正则可能失效`);
assert.deepEqual(serverProblems, [], `servers 与实现对不上：\n  ${serverProblems.join("\n  ")}`);
assert.deepEqual(pathProblems, [], `契约里的路径在控制器中不存在：\n  ${pathProblems.join("\n  ")}`);

// —— 类型抽查 ——
for (const check of TYPED_SPOT_CHECKS) {
  const file = check.file;
  if (!existsSync(join(OPENAPI_DIR, file))) continue;
  const text = readFileSync(join(OPENAPI_DIR, file), "utf8");
  const schemaAt = text.indexOf(`    ${check.schema}:`);
  assert.ok(schemaAt >= 0, `${file} 里找不到 schema ${check.schema}，判点需同步更新`);
  const body = text.slice(schemaAt, schemaAt + 1200);
  const propAt = body.indexOf(`\n        ${check.property}:`);
  assert.ok(propAt >= 0, `${file} 的 ${check.schema}.${check.property} 结构变了，判点需同步更新`);
  const declaredType = (body.slice(propAt, propAt + 200).match(/type:\s*(\w+)/u) ?? [])[1];
  assert.equal(declaredType, check.expectType,
    `${file} 的 ${check.schema}.${check.property} 必须是 ${check.expectType}（实际 ${declaredType}）`);
}

console.log(
  `openapi coverage ok（${yamlFiles.length} 份契约：servers 全部 /api/v1、`
  + `${checkedPaths} 条路径首段均可在 Java 控制器找到、类型抽查 ${TYPED_SPOT_CHECKS.length} 项通过；`
  + `接入生成链 ${consumed.size} 份，未接入基线 ${unconsumed.length} 份只减不增）`,
);
