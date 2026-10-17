#!/usr/bin/env node
/**
 * 证明门禁能变红（反 vacuous-green）。
 * 为什么存在：本项目反复出现"恒绿的门"——度量口径空转、扫描集为空却放行、
 * `or -1` 抹掉合法的 0、等待被静态 HTML 满足。一条从没红过的绿不算证据。
 * 纪律：只在临时副本上做变异，绝不碰真实台账/判决件；每个变异先 grep-back 证明真的写进去了，
 * 否则这条案例判 INCONCLUSIVE（本项目吃过多次"负例根本没生效却当成通过"）。
 * 用法：node scripts/qa/prove-gates-can-fail.mjs [--ledger-dir D] [--round-dir D] [--keep]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

// import.meta.dirname 已是路径字符串（Node>=20.11），不要再过 fileURLToPath——那样会 ERR_INVALID_URL_SCHEME
const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const LEDGER_DIR = arg("ledger-dir", "reports/audit/round-6");
const ROUND_DIR = arg("round-dir", "reports/audit/round-7");
const KEEP = process.argv.includes("--keep");
const TMP = join(REPO, ".zcode", "tmp", "prove-gates-can-fail");

function runGate(script, args) {
  try {
    const out = execFileSync(process.execPath, [resolve(REPO, script), ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return { exit: 0, out };
  } catch (e) {
    return { exit: typeof e.status === "number" ? e.status : 127, out: (e.stdout || "") + (e.stderr || "") };
  }
}
const lastMachine = (s) => {
  const l = s.split(/\r?\n/).filter(x => /LEDGER_RESULT|QUEUE_RESULT|STATE_RESULT|_RESULT\s*=/.test(x));
  return (l.pop() || "(无机器行)").slice(0, 160);
};

const cases = [];
function record(id, target, mutationProof, baselineExit, mutatedExit, mutatedOut) {
  let verdict;
  if (baselineExit !== 0) verdict = "INCONCLUSIVE(基线本就不绿，无法判这条案例)";
  else if (!mutationProof) verdict = "INCONCLUSIVE(变异没落到盘上，负例未成立)";
  else if (mutatedExit === 0) verdict = "VACUOUS(变异后门仍放行)";
  else verdict = "RED-PROVEN";
  cases.push({ id, target, mutationProof, baselineExit, mutatedExit, machine: lastMachine(mutatedOut), verdict });
  console.log(`[${id}] ${verdict} :: ${lastMachine(mutatedOut)}`);
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, "round-6"), { recursive: true });
mkdirSync(join(TMP, "empty-round-7"), { recursive: true });

// —— 案例 1：status 值域外（受控词被写成整段散文）——
const MATRIX_SRC = join(REPO, LEDGER_DIR, "issue-matrix.md");
const MATRIX_CP = join(TMP, "round-6", "issue-matrix.md");
const baselineLedger = runGate("scripts/qa/verify-ledger.mjs", [LEDGER_DIR]);
if (existsSync(MATRIX_SRC)) {
  cpSync(MATRIX_SRC, MATRIX_CP);
  const L = readFileSync(MATRIX_CP, "utf8").split(/\r?\n/);
  let n = 0;
  for (let i = 0; i < L.length; i++) {
    if (!L[i].startsWith("|")) continue;
    const c = L[i].split("|");
    if (c.length <= 7) continue;
    if (/^(已修复|待修复|已修复待复验)/.test((c[6] || "").trim())) {
      c[6] = " 【源码复核推翻 finding 的 status】这段散文不是受控词 ";
      L[i] = c.join("|"); n++; break;
    }
  }
  writeFileSync(MATRIX_CP, L.join("\n"));
  const proof = readFileSync(MATRIX_CP, "utf8").includes("这段散文不是受控词") && n === 1;
  const mut = runGate("scripts/qa/verify-ledger.mjs", [join(".zcode", "tmp", "prove-gates-can-fail", "round-6")]);
  record("ledger-vocab", "verify-ledger.mjs", proof, baselineLedger.exit, mut.exit, mut.out);
} else {
  record("ledger-vocab", "verify-ledger.mjs", false, baselineLedger.exit, 0, "找不到 issue-matrix.md");
}

// —— 案例 2：扫描集为空（台账文件不在）——
rmSync(MATRIX_CP, { force: true });
const mut2 = runGate("scripts/qa/verify-ledger.mjs", [join(".zcode", "tmp", "prove-gates-can-fail", "round-6")]);
record("ledger-empty-scan", "verify-ledger.mjs", existsSync(join(REPO, ".zcode", "tmp", "prove-gates-can-fail", "round-6")), baselineLedger.exit, mut2.exit, mut2.out);

// —— 案例 3/4：另两条带轮次入参的门，空目录该不该放行 ——
for (const [id, script] of [["queue-reconcile-empty", "scripts/verify-queue-reconcile.mjs"], ["state-truth-empty", "scripts/qa/verify-state-truth.mjs"]]) {
  const base = runGate(script, [ROUND_DIR]);
  const mut = runGate(script, [join(".zcode", "tmp", "prove-gates-can-fail", "empty-round-7")]);
  record(id, script, true, base.exit, mut.exit, mut.out);
}

// —— 案例 5/6：lint 进门（裁定 N7：门色只看 error，warning 报数不染色）——
// 5 = 新 error 越过**显式预算**必须红：预算若不 binding，这把门就是恒绿的装饰；
// 6 = scope 里没有可 lint 文件时必须 NOT-EVIDENCED（空扫描集不许判绿，本仓反复吃过这条形状）。
// 变异只落在 .zcode/tmp/ 的临时副本上，绝不往产品树里塞坏文件（跑完 TMP 整目录自清）。
// 注：本仓 @typescript-eslint/no-unused-vars 是 **warn**，所以"未使用变量"在 N7 下不染门色——
//     负例必须用 error 级规则（no-var / eqeqeq / no-console / no-debugger），否则证不出红。
const LINT_NEG = join(TMP, "lintneg");
const LINT_EMPTY = join(TMP, "lintempty");
mkdirSync(LINT_NEG, { recursive: true });
mkdirSync(LINT_EMPTY, { recursive: true });
const NEG_FILE = join(LINT_NEG, "probe.js");
writeFileSync(NEG_FILE, 'var LINTGATE_NEG_MARKER = 1;\nif (LINTGATE_NEG_MARKER == 1) {\n  console.log("neg");\n}\ndebugger;\n');
writeFileSync(join(LINT_EMPTY, "note.txt"), "这个目录里没有任何可 lint 的文件\n");
const baselineLint = runGate("scripts/qa/lint-gate.cjs", []);
const mutLint = runGate("scripts/qa/lint-gate.cjs", [
  "--scope", join(".zcode", "tmp", "prove-gates-can-fail", "lintneg"),
  "--budget", "2",
  "--json-out", join(".zcode", "tmp", "prove-gates-can-fail", "lintneg-report.json"),
]);
record(
  "lint-error-budget-breach",
  "lint-gate.cjs",
  existsSync(NEG_FILE) && readFileSync(NEG_FILE, "utf8").includes("LINTGATE_NEG_MARKER"),
  baselineLint.exit,
  mutLint.exit,
  mutLint.out
);
const mutLintEmpty = runGate("scripts/qa/lint-gate.cjs", [
  "--scope", join(".zcode", "tmp", "prove-gates-can-fail", "lintempty"),
  "--json-out", join(".zcode", "tmp", "prove-gates-can-fail", "lintempty-report.json"),
]);
record(
  "lint-empty-scan-not-green",
  "lint-gate.cjs",
  existsSync(join(LINT_EMPTY, "note.txt")),
  baselineLint.exit,
  mutLintEmpty.exit,
  mutLintEmpty.out
);

// —— 案例 7：E9 等稳纪律棘轮（【D9-E9 补判点】本轮三条仪表伪红同族：固定 sleep 后单发读下判决）——
// 变异 = 在**临时副本**（scripts/verify-device-leg.mjs 的 .zcode/tmp 拷贝，绝不碰原件——原件由车道所有者持有）
// 里注入一条 `await sleep(2750) + evaluate 一发读 + check(...)`；基线 = 副本自己的实测 single_read 条数，
// 所以这条红只可能由注入造成（delta 必须恰为 +1，否则判 INCONCLUSIVE 而不是当成通过）。
// 撤掉注入后必须回到绿——两头都量，才证明"红"来自变异而不是来自尺。
const SETTLE_TMP = join(TMP, "settle");
const SETTLE_SRC_REL = join("scripts", "verify-device-leg.mjs");
mkdirSync(SETTLE_TMP, { recursive: true });
const SETTLE_CP_REL = join(".zcode", "tmp", "prove-gates-can-fail", "settle", "verify-device-leg.mjs");
const SETTLE_CP = join(REPO, SETTLE_CP_REL);
const SETTLE_MARK = "PGCF_SETTLE_MARKER";
const SETTLE_MS = "2750";
const settleCount = (s) => { const m = /SETTLE_COUNTS .*single_read=(\d+)/.exec(String(s)); return m ? Number(m[1]) : NaN; };
if (existsSync(join(REPO, SETTLE_SRC_REL))) {
  const settleOriginal = readFileSync(join(REPO, SETTLE_SRC_REL), "utf8");
  writeFileSync(SETTLE_CP, settleOriginal, "utf8");   // 不用 cpSync 覆写已存在的副本：Windows 上它会 EPERM 抛死整个套件
  const cleanRun = runGate("scripts/qa/verify-settle-discipline.mjs", ["--carriers", SETTLE_CP_REL, "--baseline", "999999"]);
  const cleanSingle = settleCount(cleanRun.out);
  if (!Number.isFinite(cleanSingle)) {
    record("settle-single-read", "verify-settle-discipline.mjs", false, cleanRun.exit, 0,
      "副本基线量不出 single_read 数 ⇒ 尺与文件形状不符，这条负例不算测过：" + cleanRun.out.slice(-400));
  } else {
    const SL = readFileSync(SETTLE_CP, "utf8").split(/\r?\n/);
    let anc = SL.findIndex((l) => /^const check = /.test(l));
    if (anc < 0) anc = SL.findIndex((l) => /await\s+sleep\(/.test(l));
    if (anc < 0) {
      record("settle-single-read", "verify-settle-discipline.mjs", false, cleanRun.exit, 0, "注入锚点不存在 ⇒ 变异无法落盘");
    } else {
      SL.splice(anc + 1, 0, [
        `  await sleep(${SETTLE_MS}); // ${SETTLE_MARK} 注入的一条固定 sleep + 单发判决`,
        `  const ${SETTLE_MARK}_RAW = String(evaluate("${SETTLE_MARK} probe"));`,
        `  check("${SETTLE_MARK} 单发判决（负例夹具，不是产品码）", ${SETTLE_MARK}_RAW.length > 0, ${SETTLE_MARK}_RAW.slice(0, 30));`,
      ].join("\n"));
      writeFileSync(SETTLE_CP, SL.join("\n"), "utf8");
      const back = readFileSync(SETTLE_CP, "utf8");
      const proof = (back.match(new RegExp(`await sleep\\(${SETTLE_MS}\\)`, "g")) || []).length === 1
        && back.includes(`check("${SETTLE_MARK}`);
      const mutSettle = runGate("scripts/qa/verify-settle-discipline.mjs", ["--carriers", SETTLE_CP_REL, "--baseline", String(cleanSingle)]);
      const mutated = settleCount(mutSettle.out);
      const deltaOk = mutated === cleanSingle + 1;
      console.log(`[settle-single-read] 副本基线 single=${cleanSingle} → 注入后 single=${mutated} delta=${mutated - cleanSingle}（要求恰为 +1）`);
      record("settle-single-read", "verify-settle-discipline.mjs", proof && deltaOk, cleanRun.exit, mutSettle.exit, mutSettle.out);
      writeFileSync(SETTLE_CP, settleOriginal, "utf8"); // 撤掉变异，证明绿是能回来的（只在临时副本上做）
      const rev = runGate("scripts/qa/verify-settle-discipline.mjs", ["--carriers", SETTLE_CP_REL, "--baseline", String(cleanSingle)]);
      console.log(`[settle-single-read] 撤掉注入后 single=${settleCount(rev.out)} exit=${rev.exit}（应为 ${cleanSingle}/0）`);
      if (rev.exit !== 0) cases.push({ id: "settle-green-restored", target: "verify-settle-discipline.mjs", mutationProof: true, baselineExit: 0, mutatedExit: rev.exit, machine: lastMachine(rev.out), verdict: "VACUOUS(撤掉变异后仍不放行，尺不可信)" });
    }
  }
} else {
  record("settle-single-read", "verify-settle-discipline.mjs", false, 0, 0, "找不到 scripts/verify-device-leg.mjs");
}

const vacuous = cases.filter(c => c.verdict.startsWith("VACUOUS"));
const inconc = cases.filter(c => c.verdict.startsWith("INCONCLUSIVE"));
const proven = cases.filter(c => c.verdict === "RED-PROVEN").length;
console.log(`GATES_RED_PROVEN=${proven}/${cases.length} VACUOUS=${vacuous.length} INCONCLUSIVE=${inconc.length}`);
console.log(`PROVE_GATES_CAN_FAIL_RESULT=${vacuous.length === 0 && inconc.length === 0 ? "PASS" : "FAIL"}${vacuous.length ? "（有门在变异后仍放行，见上）" : ""}${inconc.length ? "（有案例证据不足，别当成通过）" : ""}`);
if (!KEEP) rmSync(TMP, { recursive: true, force: true });
process.exit(vacuous.length === 0 && inconc.length === 0 ? 0 : 1);
