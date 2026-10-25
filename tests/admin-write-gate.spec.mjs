/**
 * 后台「只读角色不得出现写入口」结构门。
 *
 * 判据不是数按钮，而是从两侧对齐：
 *   1) apps/admin/src/api/*.ts 里真正发出写请求（post/put/patch/del）的导出函数名；
 *   2) 每个视图从 api 模块 import 了哪些这样的函数。
 * 只要某视图 import 了写函数，它就必须显式引用 sessionStore.canWrite —— 否则
 * AUDITOR 会看到可用的写按钮，点了才吃一次 403（R16 遗留项，P2-14(d)）。
 *
 * api/http.ts 里的本地写拦截是第一道下限（挡住所有视图的越权提交），
 * 本门守的是第二道：入口本身按角色收敛。
 * 豁免表刻意留空：任何「先放开再补」都要显式写进本文件并说明理由。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const API_DIR = join(ROOT, "apps", "admin", "src", "api");
const VIEWS_DIR = join(ROOT, "apps", "admin", "src", "views");
const HTTP_FILE = join(API_DIR, "http.ts");

/** 已知不含写控件的共享文件（http 客户端自身与测试替身不参与判定）。 */
const API_FILE_IGNORE = (name) => name === "http.ts" || name.includes(".test.");

/** 视图豁免表：相对 apps/admin/src/views 的 posix 路径 → 理由。刻意空表。 */
const VIEW_EXEMPTIONS = new Map();

const WRITE_CALL = /(?:^|[^.\w])(post|put|patch|del)\s*(?:<[^()]*>)?\s*\(/;

/** 收集 api 模块中会发出写请求的导出函数名。 */
function collectWriteApiFunctions() {
  const names = new Set();
  for (const file of readdirSync(API_DIR)) {
    if (!file.endsWith(".ts") || API_FILE_IGNORE(file)) continue;
    const lines = readFileSync(join(API_DIR, file), "utf8").split(/\r?\n/);
    let current = null;
    let buffer = [];
    const flush = () => {
      if (current && WRITE_CALL.test(buffer.join("\n"))) names.add(current);
      current = null;
      buffer = [];
    };
    for (const line of lines) {
      const decl = line.match(/^export (?:async )?function (\w+)|^export const (\w+) *=/);
      if (decl) {
        flush();
        current = decl[1] || decl[2];
        buffer = [line];
        continue;
      }
      if (current) buffer.push(line);
    }
    flush();
  }
  return names;
}

function walkVue(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walkVue(p, out);
    else if (p.endsWith(".vue")) out.push(p);
  }
  return out;
}

/** 取视图从 api 模块 import 进来的符号名（含 `import { x } from "../api/y"` 多行形态）。 */
function importedApiSymbols(src) {
  const names = new Set();
  const re = /import\s*\{([^}]*)\}\s*from\s*["']([^"']*\/api\/[^"']+)["']/gs;
  for (const m of src.matchAll(re)) {
    for (const raw of m[1].split(",")) {
      const token = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
      if (token) names.add(token);
    }
  }
  return names;
}

function relativeViewPath(absolute) {
  return absolute.slice(VIEWS_DIR.length + 1).split("\\").join("/");
}

const writeApiFunctions = collectWriteApiFunctions();
if (writeApiFunctions.size < 20) {
  throw new Error(
    `写 API 函数只识别到 ${writeApiFunctions.size} 个，判据本身可疑（api 目录形态变了？），拒绝以门放行`
  );
}

const problems = [];
let writeViews = 0;

/** 藏按钮（模板按角色收敛）与挡程序化调用（写函数首行守卫）必须同时成立。 */
const TEMPLATE_GATE = /v-if="[^"]*sessionStore\.canWrite|:disabled="[^"]*sessionStore\.canWrite/;
const HANDLER_GATE = /if\s*\(\s*!sessionStore\.canWrite\s*\)\s*return/;

for (const file of walkVue(VIEWS_DIR)) {
  const rel = relativeViewPath(file);
  const src = readFileSync(file, "utf8");
  const writes = [...importedApiSymbols(src)].filter((n) => writeApiFunctions.has(n));
  if (writes.length === 0) continue;
  writeViews += 1;
  if (VIEW_EXEMPTIONS.has(rel)) continue;
  const templateGated = TEMPLATE_GATE.test(src);
  const handlerGated = HANDLER_GATE.test(src);
  if (!templateGated && !handlerGated) {
    problems.push(`${rel}：import 了 ${writes.length} 个写函数，但既没藏写入口也没挡写函数`);
  } else if (!templateGated) {
    problems.push(`${rel}：写了 canWrite 守卫但模板无 v-if/:disabled，AUDITOR 仍会看到可点的写按钮`);
  } else if (!handlerGated) {
    problems.push(`${rel}：只藏了按钮，写函数入口无 canWrite 守卫（只藏按钮、函数仍可被程序化调用）`);
  }
}

// 反向对照：本门自身的判据不能空转——若一个写视图都没识别到，说明扫描面塌了。
if (writeViews === 0) {
  throw new Error("未识别到任何 import 写函数的视图，扫描面失效，本门拒绝报绿");
}

// 下限闸必须在位：http.ts 少了本地写拦截，AUDITOR 就能真的把请求发出去。
const httpSrc = readFileSync(HTTP_FILE, "utf8");
for (const anchor of ["persistedSessionRole", "roleCanWrite"]) {
  if (!httpSrc.includes(anchor)) {
    problems.push(`api/http.ts 缺少 ${anchor}：只读角色的写请求不再被本地拦下`);
  }
}

if (problems.length > 0) {
  console.error(`admin write-gate contract FAIL（写视图 ${writeViews} 个，不中 ${problems.length} 条）`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(
  `admin write-gate contract ok（写 API 函数 ${writeApiFunctions.size} 个 / 写视图 ${writeViews} 个 / 不中 0 条 / 豁免 ${VIEW_EXEMPTIONS.size} 条）`
);
