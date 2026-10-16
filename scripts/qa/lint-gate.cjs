#!/usr/bin/env node
/* LINT-GATE —— ESLint 进门：只数 error，warning 计数但不参与染色（裁定 N7 的执行件）。
 *
 * 【裁定 N7 原文口径】lint 进门禁普查，**只计 ERRORS**（`--quiet` 语义）；
 *   warning 不得计入门的颜色。理由：永久红的门等于没有门——本仓 lint 有海量 warning，
 *   把它们算进颜色就是一把永远红、因而永远不会被读的门；而 error 预算小到个位数，才是真的约束。
 *
 * 【warning 不许被洗掉】本门一律印出 warning 计数（实测 2026-10-16：errors=2 / warnings=14103 / 650 文件）。
 *   10358 这个旧数字是历史台账的读数，已过期，现以本门实测为准。
 *   门的**颜色**只看 error，但**账本**必须留着 warning 数——否则下一程会把
 *   "lint 干净了" 当成事实（这正是前一轮点名的"洗账"形状）。
 *   本门另印 LINTGATE_WARN_SEMANTICS 说明这一轴，判读方不必猜。
 *
 * 【显式预算 = 2 —— 带具名理由，绝不静默抬阈值】
 *   起跑时实测 3 个 error，逐个核过：
 *     ① apps/client/src/subpackages/profile-extra/profile/other.vue:181 `no-constant-condition`
 *        —— 形如 `if (false) { ... }` 的静态不可达块，内容与紧随其后的活路径逐句重复
 *           （lightHaptic + likeWaiting toast + return）。它是死代码，删除对产物行为零影响
 *           （编译器/minifier 本来就不保留这条分支）⇒ **已修**，不在预算里。
 *     ② apps/client/src/env.d.ts:42 `@typescript-eslint/no-explicit-any`
 *        `onChange?: (payload: any) => void` —— 该处紧邻的注释写明"载荷由小程序运行时注入，
 *        结构与 DOM Event 不同，故不做窄化"。换成 unknown/自定义事件类型会改变 <switch> 的
 *        模板类型检查口径，属于"为了过 lint 而动类型面"，且本车道无 vue-tsc 全量回归在手，
 *        不能赌。⇒ 留账，计入预算。
 *     ③ apps/client/src/env.d.ts:49 `@typescript-eslint/no-explicit-any`
 *        `[name: string]: any` —— JSX IntrinsicElements 的兜底索引签名，注释写明
 *        "覆盖后不能丢，否则 view/text 等标签全报错"。索引签名要能兜住任意标签的属性，
 *        改成 unknown 会把每个内置标签的属性类型收成 unknown ⇒ 真会改行为。⇒ 留账，计入预算。
 *   所以 BUDGET=2 不是"把阈值抬到当前读数"的顺水推舟，而是：可修的已经修完，剩下两条是
 *   **有名字、有行号、有理由的类型面欠账**。预算只能往下改（2 → 1 → 0），不许往上改；
 *   要动阈值必须先在本头注释里点名新的欠账。
 *   本门每次都印 LINTGATE_DISTANCE_TO_ZERO=<errors>，把"离 0 还差几条"摊在机器行里。
 *
 * 【两个可红形状，缺一不可】
 *   errors > budget ⇒ 退 1 + `LINTGATE_RESULT=FAIL ...`（产品红）
 *   eslint 跑不起来（缺二进制 / 配置崩 / 超时 / JSON 没落盘）⇒ 退 2 + `LINTGATE_RESULT=NOT-EVIDENCED ...`
 *   （仪器与环境故障不计入产品 FAIL——本仓既有口径，见 verify-admin-auditor.mjs:43 一类门。）
 *   判读一律以退出码与本行机器行为准；两个载具都按 *_RESULT= 归因
 *   （DSL resultLineOf() 与 bash g() 用的就是这一把尺）。
 *
 * 【超时口径（供两个载具配 timeoutMs，实测非拍脑袋）】
 *   同一 scope 连跑两次：冷跑 85 s（OS 缓存未热），热跑 24 s ⇒ 观测上界 85 s。
 *   bash g() 与 DSL timeoutMs 取 300000 ms（≈ 3.5× 冷跑上界；仓内先例：verify-band-freshness
 *   "实测约需 99 s，180 s 太薄" 走的是同一把尺——比实测需求小的上限会读成假红）。
 *
 * 用法：node scripts/qa/lint-gate.cjs [--scope a,b,c] [--budget N] [--timeout MS] [--json-out F] [--max-list N]
 * 机器行：LINTGATE_RESULT=PASS|FAIL|NOT-EVIDENCED
 * 只读产品树：不改任何源文件；唯一写盘是 eslint 自己的 JSON 报告（落在 gitignore 的 .zcode/tmp/ 下）。
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const arg = (k, d) => {
  const i = process.argv.indexOf("--" + k);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};

// 与根 package.json 的 "lint" 脚本逐字同 scope——门判的就是开发者 `pnpm lint` 会看到的那一批，
// 不另开一个更窄的靶（窄靶会把 admin/tools 的 error 变成盲区）。
const DEFAULT_SCOPE = ["apps/admin/src", "apps/client/src", "tools", "eslint.config.mjs"];
const BUDGET = Number(arg("budget", "2")); // 见文件头【显式预算 = 2】：只能往下改，不许往上
const ESLINT_TIMEOUT = Number(arg("timeout", "240000")); // 子进程内闸；载具 timeoutMs=300000 再包一层
const MAX_LIST = Number(arg("max-list", "40"));
const JSON_OUT = path.resolve(REPO, arg("json-out", path.join(".zcode", "tmp", "lint-gate", "eslint-report.json")));
const scopeArg = arg("scope", "");
const SCOPE = scopeArg ? scopeArg.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_SCOPE;

function fail(reason, extra) {
  console.log(`LINTGATE_SCOPE=${SCOPE.join(",")}`);
  console.log(`LINTGATE_RESULT=NOT-EVIDENCED reason=${reason}${extra ? " " + extra : ""}`);
  console.log("LINTGATE_NOTE=仪器/环境故障不计入产品 FAIL（退 2，非退 1）");
  process.exit(2);
}

if (!Number.isFinite(BUDGET) || BUDGET < 0) fail("budget-非法", `budget=${arg("budget", "2")}`);
if (!SCOPE.length) fail("scope-为空", "空 scope 没有否决力，不许判绿");

const ESLINT_BIN = path.join(REPO, "node_modules", "eslint", "bin", "eslint.js");
if (!fs.existsSync(ESLINT_BIN)) fail("eslint-二进制缺失", `期望 ${path.relative(REPO, ESLINT_BIN).split("\\").join("/")}`);
for (const s of SCOPE) {
  if (!fs.existsSync(path.resolve(REPO, s))) fail("scope-不存在", `${s} 不在盘上`);
}

try {
  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
} catch (e) {
  fail("json-out-目录不可建", String(e && e.message ? e.message : e));
}
// 旧的 JSON 先删掉：eslint 崩时不会留新件，本门才不会把上一轮的读数当这一轮（陈旧件冒充读数）。
try {
  if (fs.existsSync(JSON_OUT)) fs.rmSync(JSON_OUT);
} catch (e) {
  /* 删不掉也要继续跑，下面用 mtime 复核 */
}

const t0 = Date.now();
let eslintExit = null;
let eslintErr = "";
try {
  // 不经 shell：execFileSync 直接 spawn process.execPath（两个载具都用 Node22 起本门，
  // DSL 的 WORKFLOW.nodeBin / bash 的 $N22），所以 eslint 的子进程也拿到 v22 而非 PATH 上的 v16。
  execFileSync(process.execPath, [ESLINT_BIN, ...SCOPE, "--no-warn-ignored", "-f", "json", "-o", JSON_OUT], {
    cwd: REPO,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: ESLINT_TIMEOUT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  eslintExit = 0;
} catch (e) {
  eslintExit = typeof e.status === "number" ? e.status : null;
  eslintErr = String((e && (e.stdout || "")) + (e && (e.stderr || "")) || (e && e.message) || e);
  if (e && e.signal === "SIGTERM" && e.killed) fail("eslint-超时", `limit=${ESLINT_TIMEOUT}ms`);
}
const elapsedS = Math.round((Date.now() - t0) / 1000);

if (!fs.existsSync(JSON_OUT)) {
  fail("eslint-未产出JSON", `exit=${eslintExit} ${eslintErr.replace(/\s+/g, " ").slice(0, 240)}`);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(JSON_OUT, "utf8"));
} catch (e) {
  fail("eslint-JSON不可解析", String(e && e.message ? e.message : e));
}
if (!Array.isArray(report)) fail("eslint-JSON形状异常", "顶层不是数组");
if (report.length === 0) fail("scope-零文件", "空扫描集没有否决力，不许判绿（本仓口径：扫描集空转=仪器坏了，不是东西都干净）");

let errors = 0;
let warnings = 0;
let files = 0;
const errItems = [];
const byRule = new Map();
for (const f of report) {
  files++;
  errors += f.errorCount || 0;
  warnings += f.warningCount || 0;
  for (const m of f.messages || []) {
    if (m.severity === 2) {
      const rule = String(m.ruleId || "(解析失败)");
      byRule.set(rule, (byRule.get(rule) || 0) + 1);
      if (errItems.length < MAX_LIST) {
        errItems.push(`  ERR ${path.relative(REPO, f.filePath).split("\\").join("/")}:${m.line}:${m.column} [${rule}] ${String(m.message).replace(/\s+/g, " ")}`);
      }
    }
  }
}

const ok = errors <= BUDGET;
console.log(`LINTGATE_SCOPE=${SCOPE.join(",")}`);
console.log(`LINTGATE_FILES=${files} 口径=eslint 报告里的文件条数（含无问题文件）`);
console.log(`LINTGATE_ERRORS=${errors}`);
console.log(`LINTGATE_WARNINGS=${warnings} 口径=只报数不计入门颜色（N7 --quiet 语义）；这些 warning 没有被任何门洗掉，只是不染色`);
console.log(`LINTGATE_BUDGET=${BUDGET} 口径=本文件头点名的类型面欠账条数，只能往下改，抬阈值必须先在头注释里点名新欠账`);
console.log(`LINTGATE_HEADROOM=${BUDGET - errors}`);
console.log(`LINTGATE_DISTANCE_TO_ZERO=${errors} 口径=离 error 预算清零还差几条`);
console.log(`LINTGATE_WARN_SEMANTICS=errors-only(N7):warnings-counted-not-coloured`);
console.log(`LINTGATE_ESLINT_S=${elapsedS} 口径=本门 spawn eslint 的实测墙钟秒数（载具 timeoutMs=300000 的依据）`);
console.log(`LINTGATE_ESLINT_EXIT=${eslintExit}`);
console.log(`LINTGATE_JSON=${path.relative(REPO, JSON_OUT).split("\\").join("/")}`);
if (byRule.size) {
  console.log(`LINTGATE_ERROR_RULES=${[...byRule.entries()].map(([k, v]) => `${k}=${v}`).join(",")}`);
  for (const line of errItems) console.log(line);
  if (errors > errItems.length) console.log(`  ... 其余 ${errors - errItems.length} 条见 ${JSON_OUT}`);
} else {
  console.log("LINTGATE_ERROR_RULES=none");
}
if (eslintExit !== 0 && eslintExit !== 1) {
  console.log(`LINTGATE_ESLINT_STDERR=${eslintErr.replace(/\s+/g, " ").slice(0, 240)}`);
}
console.log(
  `LINTGATE_RESULT=${ok ? "PASS" : "FAIL"} errors=${errors} budget=${BUDGET} warnings=${warnings}(不计颜色) distance_to_zero=${errors} scope=${SCOPE.length}项${ok && BUDGET > 0 ? " note=绿但欠账未清零，见 LINTGATE_DISTANCE_TO_ZERO" : ""}`
);
process.exit(ok ? 0 : 1);
