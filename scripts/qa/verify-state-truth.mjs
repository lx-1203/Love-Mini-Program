/**
 * D10：状态单一真值源核对。终止前 100 秒内三份产物给出过 922/940/941 三个用例数、
 * 282/288/289 三个 FAILED 数，而且 checkpoint 的 failures 数组恒空 —— 说明"看哪一份"没有约定。
 * 本工具把四列并排打出来，任何不一致都判 FAIL，禁止"挑一份好看的"收尾。
 * 范围例外（D10 之后补的）：checkpoint 是**最后一个写入者的窗口**，与权威件不同范围时
 * 不参与全局极差比较，改为逐 suite 包含核对（窗口的数可以小、不可以大）—— 详见下方注释。
 * 用法：node scripts/qa/verify-state-truth.mjs <roundDir> [--ckpt path] [--snap path]
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";

const argv = process.argv.slice(2);
const roundDir = resolve(argv.find((a) => !a.startsWith("--") && !argv[argv.indexOf(a) - 1]?.startsWith("--")) || "");
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
if (!roundDir || !existsSync(roundDir)) { console.log("STATE_RESULT=FAIL reason=用法 node scripts/qa/verify-state-truth.mjs <roundDir>"); process.exit(1); }

const j = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const rows = (f) => { try { return readFileSync(f, "utf8").split("\n"); } catch { return []; } };
const opsDir = join(roundDir, "ops");
const resultsPath = opt("results") || join(roundDir, "interact", "exec-results.json");
const ckptPath = opt("ckpt") || "tmp/qa/checkpoints/" + (basename(roundDir).startsWith("round-") ? "exec-" + basename(roundDir).replace("round-", "R") + ".json" : "exec.json");
const snapPath = opt("snap") || ".zcode/tmp/exec-stop-snapshot.json";

let planned = 0, plannedSuites = 0;
try {
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(opsDir).filter((f) => f.endsWith(".json"));
  plannedSuites = files.length;
  for (const f of files) planned += (j(join(opsDir, f))?.cases ?? []).length;
} catch { console.log("STATE_NOTE=计划侧 ops/ 读不到"); }

const res = j(resultsPath);
const recorded = res ? (res.results ?? []).length : null;
const recordedSuites = res ? new Set((res.results ?? []).map((r) => r.suite)).size : null;
const recFailed = res ? (res.results ?? []).filter((r) => r.status === "FAILED").length : null;
const uniqIds = res ? new Set((res.results ?? []).map((r) => r.id)).size : null;

const ck = j(ckptPath);
const ckSuites = ck ? Object.keys(ck.suites || {}) : [];
const ckExec = ck ? ckSuites.reduce((s, k) => s + (Number(ck.suites[k]?.executed) || 0), 0) : null;
const ckFail = ck ? ckSuites.reduce((s, k) => s + (Number(ck.suites[k]?.failed) || 0), 0) : null;
const ckFailArr = ck && Array.isArray(ck.failures) ? ck.failures.length : "n/a";

const snap = j(snapPath);
// 终止快照是**异常停机时**写下的派生视图，跨轮留在盘上。首版不认轮次，于是新一轮的轮末
// 对账会拿上一轮（gitSha 不同）的 940 例来比，极差被永久钉在上一轮的缺口上——要么假红，
// 要么（更糟）被当成"本轮也这样"而忽略。按 gitSha 判定归属；不同轮就排除比较集并如实记一笔。
const resSha = res && res.gitSha ? res.gitSha : null;
const snapForeign = !!(snap && resSha && snap.gitSha && snap.gitSha !== resSha);
if (snapForeign) console.log(`STATE_NOTE=snap 属另一轮（snap.gitSha=${snap.gitSha} ≠ 权威 ${resSha}），已从比较集排除`);
const snapInScope = snap && !snapForeign;

const cols = [
  ["计划 ops", planned, plannedSuites, "", ""],
  ["权威 results", recorded, recordedSuites, recFailed, ""],
  ["检查点 ckpt", ckExec, ckSuites.length, ckFail, `failures[]=${ckFailArr}`],
  ["终止快照 snap", snapInScope ? (snap.cases ?? snap.total ?? null) : null, snapInScope ? (snap.suites_recorded ?? null) : null, snapInScope && snap.status ? snap.status.FAILED ?? null : null, snap ? (snapForeign ? basename(snapPath) + "(非本轮)" : basename(snapPath)) : "缺"],
];
console.log("COLUMN            CASES  SUITES  FAILED  NOTE");
for (const [n, a, b, c, d] of cols) console.log(`${n.padEnd(17)} ${String(a ?? "-").padStart(5)}  ${String(b ?? "-").padStart(6)}  ${String(c ?? "-").padStart(6)}  ${d || ""}`);

const cases = cols.map((r) => r[1]).filter((v) => typeof v === "number");
const fails = cols.map((r) => r[3]).filter((v) => typeof v === "number");
let bad = false; // 声明提前：下面的包含核对与 STATE_FAIL_0 都要往同一个累加器里记账
/* 检查点是"最后一个写入者的窗口"，不是全轮计数器。round-6 实测：T4 复跑（219 例）把同一份
   exec-R6.json 的 per-suite executed 从 1107 覆盖成 219，而权威件仍是 1107 行
   （verify-exec-delta 守恒 1107=1107、ONLY_IN_* 两侧均 0）。这不是"三个源谁对"，
   是两个源量的**范围**不同 —— 把它们塞进同一个极差比较，得到的 STATE_FAIL_1 是范畴错误。
   但检查点绝不免检：它报的每一个数必须在权威件里装得下（containment），超了才是真漂移。 */
const ckSubset = ckExec !== null && recorded !== null && ckExec < recorded;
/* 包含核对的范围判据是"不等"，不是"更小"：更小是合法的窗口，更大永远非法。
   首版只在更小分支里跑包含核对，于是 ckpt 报得比权威件还大时，
   唯一响的是笼统的 STATE_FAIL_1（极差 3），拿不到"哪套、超了多少"的点名 —— 修成两个方向都核。 */
const ckDiff = ckExec !== null && recorded !== null && ckExec !== recorded;
if (ckSubset) {
  const ci = cases.indexOf(ckExec); if (ci >= 0) cases.splice(ci, 1);
  const fi = fails.indexOf(ckFail); if (fi >= 0) fails.splice(fi, 1);
  console.log(`STATE_CK_SCOPE=subset-window（ckpt executed=${ckExec} < 权威 ${recorded}，已从全局极差比较排除，改做逐套包含核对）`);
} else if (ckDiff) {
  console.log(`STATE_CK_SCOPE=oversized（ckpt executed=${ckExec} > 权威 ${recorded} —— 窗口只会更小，更大就是漂移，两边都要响）`);
} else if (ckExec !== null) {
  console.log(`STATE_CK_SCOPE=full-round（ckpt executed=${ckExec}）`);
}
if (ckDiff && res) {
  const bySuite = new Map();
  for (const r of (res.results ?? [])) {
    const s = bySuite.get(r.suite) || { n: 0, f: 0 };
    s.n++; if (r.status === "FAILED") s.f++;
    bySuite.set(r.suite, s);
  }
  const over = [];
  let matched = 0;
  for (const k of ckSuites) {
    const e = Number(ck.suites[k]?.executed) || 0, f = Number(ck.suites[k]?.failed) || 0;
    const a = bySuite.get(k);
    if (!a) { over.push(`${k}：权威件里没有这套（ckpt executed=${e}）`); continue; }
    matched++;
    if (e > a.n) over.push(`${k}：ckpt executed=${e} > 权威行数 ${a.n}`);
    if (f > a.f) over.push(`${k}：ckpt failed=${f} > 权威 FAILED ${a.f}`);
  }
  console.log(`STATE_CK_SUITES_MATCHED=${matched}/${ckSuites.length}（键须与权威 suite 同名才可核，对不上就是两套命名）`);
  if (ckSuites.length && matched === 0) {
    console.log("STATE_FAIL_1B 检查点 29 个 suite 键与权威件一个都对不上 —— 包含核对扫描集为空，不得当作通过");
    bad = true;
  }
  if (over.length) {
    console.log(`STATE_FAIL_1C 检查点报了权威件装不下的数（窗口可以小，不能大）：${over.slice(0, 5).join(" ; ")}`);
    bad = true;
  }
}
const caseSpread = cases.length ? Math.max(...cases) - Math.min(...cases) : 0;
const failSpread = fails.length > 1 ? Math.max(...fails) - Math.min(...fails) : 0;
console.log(`STATE_CASE_SPREAD=${caseSpread} STATE_FAIL_SPREAD=${failSpread} STATE_DUP_ID_GROUPS=${res ? recorded - uniqIds : "-"}`);
// D10 的硬前提：本轮的三个必需源都得在。首版只有"极差>0 才 FAIL"，于是"只扫到一列"时
// spread 恒为 0 → 空过判绿（本仓同类"扫描集为空却 PASS"已修两处，这是第三处）。
const missingSources = [];
if (!(planned > 0)) missingSources.push(`计划侧 ops/ 无用例（读不到 ${opsDir}）`);
if (recorded === null) missingSources.push(`权威 exec-results 不可读（${resultsPath}）`);
if (ckExec === null) missingSources.push(`检查点缺失（${ckptPath}）—— 执行员必须与权威文件同批写它`);
if (missingSources.length) { console.log("STATE_FAIL_0 必需源缺失：" + missingSources.join(" ; ")); bad = true; }
if (caseSpread > 0) { console.log("STATE_FAIL_1 用例数跨源不一致（没有单一真值源，禁止收尾）"); bad = true; }
if (failSpread > 0) { console.log("STATE_FAIL_2 FAILED 数跨源不一致"); bad = true; }
if (typeof ckFailArr === "number" && ckFailArr === 0 && typeof ckFail === "number" && ckFail > 0) {
  console.log(`STATE_FAIL_3 checkpoint.failures[] 恒空但各 suite 累计 failed=${ckFail} —— 明细没落盘，事后无法逐条复核`); bad = true;
}
if (res && recorded !== uniqIds) console.log(`STATE_WARN_ID ${recorded} 条记录只有 ${uniqIds} 个唯一 id，按 id 去重会低估 ${recorded - uniqIds} 条`);

// checkpoint.failures[] 是执行员自 D21 起才写的「最近 300 条」滚动视图，不是明细全集。
// 注意：按 suite 做「行数 - 条目数」的加减是恒等式（每个 suite 必然等于 m 本身），
// 拿它当"账不平"检测器永远不响 —— 首版就是这么写的，实测 residual 恒为 0。
// 所以这里逐条按 (suite,manifest,id) 键比，三个量各自可独立不为 0：
//   MISSING  = 权威 FAILED 行在窗口里没有对应条目（D21 落码前的 attempt、或被 300 条 splice 掉）
//   DUP      = 同一用例被 push 多次（续跑时该用例再次失败，各 attempt 都 push 了一条；
//              权威件是 upsert，只有一条。round-6 实测 13 条，STALE=0 说明它们都仍在失败，
//              不是「改判后残留」—— 那正是 STALE 这个量要区分的东西）
//   STALE    = 条目指向的用例如今已不是 FAILED（改判了，窗口视图会误导排产）
//   ORPHAN   = 条目指向的用例在权威件里根本不存在（检查点在描述不存在的用例）
// 逐条复核唯一 durable 的载体仍是 exec-results 每行的 failureReason —— 顺带核那条链断没断。
if (res && typeof ckFailArr === "number" && typeof recFailed === "number") {
  const rowsArr = res.results ?? [];
  const keyOf = (x) => `${x.suite}|${x.manifest ?? ""}|${x.id}`;
  const failedKeys = new Set();
  const allRowKeys = new Set();
  for (const r of rowsArr) { allRowKeys.add(keyOf(r)); if (r.status === "FAILED") failedKeys.add(keyOf(r)); }
  const entryCount = new Map();
  let orphan = 0;
  for (const f of ck.failures ?? []) {
    const k = keyOf(f);
    entryCount.set(k, (entryCount.get(k) ?? 0) + 1);
    if (!allRowKeys.has(k)) orphan++;
  }
  let dup = 0, stale = 0;
  for (const [k, n] of entryCount) { if (n > 1) dup += n - 1; if (!failedKeys.has(k)) stale++; }
  const covered = entryCount.size - stale;
  const missing = failedKeys.size - covered;
  const missingReason = rowsArr.filter(
    (r) => r.status === "FAILED" && !String(r.failureReason || "").trim() && !String(r.observed || "").trim()
  ).length;
  console.log(`STATE_CK_ENTRIES=${ckFailArr}（唯一用例 ${entryCount.size}） vs 权威 FAILED 用例=${failedKeys.size}/行=${recFailed} —— 滚动窗口，非明细全集`);
  console.log(`STATE_CK_MISSING=${missing} STATE_CK_DUP_PUSH=${dup} STATE_CK_STALE=${stale} STATE_CK_ORPHAN=${orphan} STATE_AUTHORITATIVE_REASON_MISSING=${missingReason}`);
  if (ckFailArr === 300) console.log("STATE_NOTE=failures[] 正好等于写入端上限 300，最早条目已被 splice 丢弃，其长度与缺失数都只能当下界读");
  if (orphan > 0) {
    console.log(`STATE_FAIL_4 检查点有 ${orphan} 条 failure 指向权威件里不存在的用例 —— 两份产物已不同源，检查点不可用于排产`);
    bad = true;
  }
  if (missingReason > 0) {
    console.log(`STATE_FAIL_5 权威件有 ${missingReason} 行 FAILED 既无 failureReason 也无 observed —— 逐条复核在唯一 durable 载体上断链`);
    bad = true;
  }
}
console.log(bad ? "STATE_RESULT=FAIL" : `STATE_RESULT=PASS（全局极差比的是 ${cases.length} 列同范围源；检查点按 ${ckSubset ? "subset-window 已做逐套包含核对" : ckDiff ? "oversized 已判红" : "full-round 同范围比较"}）`);
process.exit(bad ? 1 : 0);
