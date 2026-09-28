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

const vacuous = cases.filter(c => c.verdict.startsWith("VACUOUS"));
const inconc = cases.filter(c => c.verdict.startsWith("INCONCLUSIVE"));
const proven = cases.filter(c => c.verdict === "RED-PROVEN").length;
console.log(`GATES_RED_PROVEN=${proven}/${cases.length} VACUOUS=${vacuous.length} INCONCLUSIVE=${inconc.length}`);
console.log(`PROVE_GATES_CAN_FAIL_RESULT=${vacuous.length === 0 && inconc.length === 0 ? "PASS" : "FAIL"}${vacuous.length ? "（有门在变异后仍放行，见上）" : ""}${inconc.length ? "（有案例证据不足，别当成通过）" : ""}`);
if (!KEEP) rmSync(TMP, { recursive: true, force: true });
process.exit(vacuous.length === 0 && inconc.length === 0 ? 0 : 1);
