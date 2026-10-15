/**
 * 后台 i18n 覆盖检查：把视图里 t("a.b.c") 用到的每个 key 真正解析一遍。
 *
 * 为什么需要它：漏 key 不会编译报错，只会在界面上把 "postDetail.title" 原样渲染出来
 * （面包屑就踩过一次）。vue-tsc 管不到字符串，所以必须单独有一道。
 *
 * 扫描域按目录派生（views/components/stores/router 四棵树整树枚举），不再手写文件清单：
 * 旧版曾手写 SOURCES，45 个视图只覆盖 12 个，"缺失 0" 其实是没看剩下的文件——
 * 门必须只宣称它扫过的东西。派生扫描域让"新建页面忘了加进检查清单"变成天然不可能，
 * 而下面的 SCOPE_FAIL 自检兜住另一个方向：目录整棵消失/为空 ⇒ 判红，不做缩水的绿。
 *
 * 用法：node scripts/check-admin-i18n.mjs [--admin-root <dir>]
 *   --admin-root 仅供红能力取证（用 fixtures 目录当扫描根）；缺省 = apps/admin。
 *   typescript 编译器固定从仓库真实 apps/admin 解析，fixtures 只需带 src/ 树。
 * 退出码：0 = 全部命中；1 = 存在缺失 key 或扫描域自检不通过
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// 编译器解析锚点恒为仓库真实 apps/admin（--admin-root 的 fixtures 不必装依赖）。
const require = createRequire(path.resolve("apps/admin/package.json"));
const ts = require("typescript");

const rootArg = process.argv.indexOf("--admin-root");
const ADMIN = rootArg > -1 ? path.resolve(process.argv[rootArg + 1]) : path.resolve("apps/admin");
const TMP = path.resolve("node_modules/.cache/admin-i18n");
const LOCALES = { "zh-CN": "zh", "en-US": "en" };

/** 扫描域：这四棵树整树派生，新增 .vue/.ts 自动进检查清单，无需手工登记 */
const SCAN_TREES = ["src/views", "src/components", "src/stores", "src/router"];

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const SOURCES = [];
const scopeErrors = [];
for (const tree of SCAN_TREES) {
  const abs = path.join(ADMIN, tree);
  if (!fs.existsSync(abs)) {
    scopeErrors.push(`扫描域目录不存在: ${tree}`);
    continue;
  }
  const files = walk(abs, [])
    .filter((f) => /\.(vue|ts)$/.test(f) && !f.endsWith(".test.ts"))
    .map((f) => path.relative(ADMIN, f).split(path.sep).join("/"));
  if (files.length === 0) {
    scopeErrors.push(`扫描域目录为空（整棵树没一个 .vue/.ts？）: ${tree}`);
    continue;
  }
  SOURCES.push(...files);
}
if (SOURCES.length === 0) scopeErrors.push("扫描域为空：没有任何文件被检查，判红而不是假绿");

fs.mkdirSync(TMP, { recursive: true });
const get = (obj, dotted) =>
  dotted.split(".").reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), obj);

let failed = false;

// 先报分母，让每个绿读数都能说出自己扫了多少文件。
console.log(`SCOPE: ${ADMIN} 下 ${SCAN_TREES.join(", ")} 共 ${SOURCES.length} 个文件`);
for (const line of scopeErrors) {
  console.log(`   SCOPE_FAIL ${line}`);
  failed = true;
}

for (const [file, tag] of Object.entries(LOCALES)) {
  const srcPath = path.join(ADMIN, "src/i18n/locales", `${file}.ts`);
  const source = fs.readFileSync(srcPath, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const outFile = path.join(TMP, `${tag}.mjs`);
  fs.writeFileSync(outFile, js);
  const messages = (await import(pathToFileURL(outFile).href)).default;

  const missing = [];
  let checked = 0;
  for (const rel of SOURCES) {
    const abs = path.join(ADMIN, rel);
    if (!fs.existsSync(abs)) {
      missing.push(`${rel} (文件不存在)`);
      continue;
    }
    const text = fs.readFileSync(abs, "utf8");
    const keys = new Set();
    for (const m of text.matchAll(/\bt\(\s*["']([A-Za-z0-9_.]+)["']/g)) keys.add(m[1]);
    for (const key of keys) {
      checked += 1;
      if (get(messages, key) === undefined) missing.push(`${rel} -> ${key}`);
    }
  }

  console.log(`${file}: 检查 ${checked} 处 key 引用，缺失 ${missing.length}`);
  for (const line of [...new Set(missing)]) console.log(`   MISSING ${line}`);
  if (missing.length > 0) failed = true;
}

process.exit(failed ? 1 : 0);
