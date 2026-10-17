/**
 * 收口桶去向棘轮：状态列已经"收口"的行，必须留下一处可重跑凭据或写明去向。
 *
 * 为什么要它：2026-10-17 实测——把 MP-R2-PAGES-HOME-INDEX-103 按事实改判 回归核对 之后，
 * 才发现那一格落进两把门都不看的桶：verify-frame-debt-coverage 的 OPEN_STATUS 只列 7 个未收口词，
 * 而 保留-判据不成立 / 并入-不另立案 / 不立账 / 回归核对 / 判据不成立 / 撤销 都不在里面；
 * verify-status-vs-disposition 只抓"处置列还写着欠款"的行。全库这种行 89 条，其中 82 条
 * 在 A取景配方(SHOOT)/B帧债归置表/C显式登记表 三处都查不到自己的 id。⇒ 一笔债只要被打成收口词，
 * 就从所有管辖里消失。这正是要堵的形状。
 *
 * 棘轮而非硬门：现值 82 是历史累计，本轮不可能逐条补完。所以判据是"只许降不许升"——
 * 超过基线即红（新增的收口行必须带去向），等于基线如实报数并继续红着提示，低于基线则提示可由人下调基线。
 * 基线一律不自动升格/缩水（见 MEMORY 的 baseline-promotion-self-reference：同一动作不许改自己要比对的基线）。
 *
 * 用法：node scripts/qa/verify-closed-bucket-destinations.mjs [--matrix 台账] [--plans a,b,c]
 *        [--triage 归置表] [--extra 登记表] [--baseline 82] [--selftest]
 * 机器行：CLOSEDBUCKET_RESULT=PASS|FAIL|NOT-EVIDENCED rows=N untracked=M baseline=B buckets=…
 * 退出码：0 不高于基线；1 高于基线或 --selftest 失败；2 台账读不到 / 一行都没解析出来 / 配方一份都读不到。
 */
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const CLOSED_BUCKETS = ["保留-判据不成立", "判据不成立", "并入-不另立案", "不立账", "回归核对", "撤销"];
const BASELINE = Number(arg("baseline", "80"));

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
function parseMatrix(text) {
  const rows = [];
  for (const l of String(text).split(/\r?\n/)) {
    if (!/^\|\s*MP-/.test(l)) continue;
    const c = l.split(/\s*\|\s*/).slice(1, 12);
    if (c.length !== 11) continue;
    rows.push({ id: c[0], bucket: String(c[5] || "").split("（")[0].trim() });
  }
  return rows;
}
/** 三处去向：配方里 disposition=SHOOT、归置表 dispositions[]、登记表 dispositions[]。 */
function destinations(planList, triagePath, extraPath) {
  const set = new Set();
  for (const p of planList) {
    const j = readJson(p);
    for (const c of (j && (j.cases || j.rows || [])) || []) if (String(c.disposition || "").toUpperCase() === "SHOOT") set.add(String(c.id || "").split("（")[0].trim());
  }
  for (const p of [triagePath, extraPath]) {
    const j = readJson(p);
    for (const d of (j && j.dispositions) || []) set.add(String(d.id || "").split("（")[0].trim());
  }
  return set;
}
function evaluate({ matrixText, planSet }) {
  const rows = parseMatrix(matrixText);
  const closed = rows.filter((r) => CLOSED_BUCKETS.includes(r.bucket));
  const untracked = closed.filter((r) => !planSet.has(r.id));
  const byBucket = {};
  for (const r of closed) byBucket[r.bucket] = (byBucket[r.bucket] || 0) + 1;
  return { scanned: rows.length, closed: closed.length, untracked, byBucket };
}

/* ---------- 自检：证明这把门真能红 ---------- */
if (process.argv.includes("--selftest")) {
  const dir = mkdtempSync(resolve(tmpdir(), "closedbucket-"));
  const ledger = ["| 新号 | 历史别名 | 页面 | 类别 | 等级 | 状态 | 证据 | 锚点 | 结案条件 | 理想图 | 处置 |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    "| MP-A-001 |  | pages/x | UI | P2 | 回归核对 | e | a | c | i | d |",
    "| MP-A-002 |  | pages/y | UI | P2 | 不立账 | e | a | c | i | d |",
    "| MP-A-003 |  | pages/z | UI | P2 | 待修复 | e | a | c | i | d |"].join("\n");
  const triage = resolve(dir, "t.json"), extra = resolve(dir, "e.json"), plans = resolve(dir, "p.json");
  writeFileSync(triage, JSON.stringify({ dispositions: [{ id: "MP-A-001", kind: "x" }] }));
  writeFileSync(extra, JSON.stringify({ dispositions: [] }));
  writeFileSync(plans, JSON.stringify({ cases: [{ id: "MP-A-002", disposition: "SHOOT" }] }));
  const bad = [];
  const r1 = evaluate({ matrixText: ledger, planSet: destinations([plans], triage, extra) });
  if (r1.closed !== 2) bad.push("收口行应数到 2，实得 " + r1.closed + "（待修复那条不该算）");
  if (r1.untracked.length !== 0) bad.push("两处去向都在册却仍算裸 ⇒ " + JSON.stringify(r1.untracked));
  /* 负例：抽掉 MP-A-002 的配方去向 ⇒ 必须立刻数到 1 条无去向，且基线 0 时判红 */
  writeFileSync(plans, JSON.stringify({ cases: [{ id: "MP-A-002", disposition: "NOT_SHOOTABLE" }] }));
  const r2 = evaluate({ matrixText: ledger, planSet: destinations([plans], triage, extra) });
  if (r2.untracked.length !== 1 || r2.untracked[0].id !== "MP-A-002") bad.push("抽掉去向却没抓到（负例失效）：" + JSON.stringify(r2.untracked));
  const r3 = evaluate({ matrixText: "不是台账", planSet: new Set() });
  if (r3.scanned !== 0) bad.push("空扫描集没被识别成 0 行");
  rmSync(dir, { recursive: true, force: true });
  console.log(`CLOSEDBUCKET_SELFTEST=${bad.length ? "FAIL" : "PASS"} 收口=2 抽走后无去向=${r2.untracked.length} 空扫描=${r3.scanned}`);
  for (const b of bad) console.log("  ✗ " + b);
  process.exit(bad.length ? 1 : 0);
}

const MATRIX = resolve(REPO, arg("matrix", "reports/audit/round-6/issue-matrix.md"));
if (!existsSync(MATRIX)) { console.log(`CLOSEDBUCKET_RESULT=NOT-EVIDENCED reason=台账读不到 ${MATRIX}`); process.exit(2); }
const planArg = arg("plans", "reports/audit/round-7/frameplan-round7-final.json,reports/audit/round-7/frameplan-round7-a-real.json,reports/audit/round-7/frameplan-merged.json");
const plans = planArg.split(",").map((p) => resolve(REPO, p)).filter((p) => existsSync(p));
const res = evaluate({ matrixText: readFileSync(MATRIX, "utf8"), planSet: destinations(plans, resolve(REPO, arg("triage", "reports/audit/round-7/frame-debt-triage.json")), resolve(REPO, arg("extra", "reports/audit/round-7/open-row-dispositions.json"))) });
if (!res.scanned) { console.log("CLOSEDBUCKET_RESULT=NOT-EVIDENCED reason=一行台账都没解析出来 ⇒ 表头或行前缀变了，不得当成\"没有裸行\""); process.exit(2); }

const over = res.untracked.length > BASELINE;
const dist = Object.entries(res.byBucket).map(([k, v]) => k + "=" + v).join(" ");
console.log(`CLOSEDBUCKET_SCANNED rows=${res.scanned} 收口桶=${res.closed}（${dist}）无去向=${res.untracked.length} 基线=${BASELINE} 配方份数=${plans.length}`);
for (const u of res.untracked.slice(0, 12)) console.log(`  NODEST ${u.id} [${u.bucket}]`);
if (res.untracked.length > 12) console.log(`  NODEST …另有 ${res.untracked.length - 12} 条（本门只点名前 12 条，全量按同口径可复算）`);
if (over) console.log(`CLOSEDBUCKET_RESULT=FAIL untracked=${res.untracked.length} > baseline=${BASELINE} ⇒ 本轮新增了"打成收口词就脱离管辖"的行；要么补去向，要么别用收口词`);
else if (res.untracked.length < BASELINE) console.log(`CLOSEDBUCKET_RESULT=PASS untracked=${res.untracked.length} < baseline=${BASELINE} ⇒ 基线可由人在下一次提交里下调到本值（本门不自己升格基线）`);
else console.log(`CLOSEDBUCKET_RESULT=PASS untracked=${res.untracked.length} = baseline=${BASELINE}（持平；棘轮只拦新增）`);
process.exit(over ? 1 : 0);
