#!/usr/bin/env node
/** 真实模式覆盖守恒：每一条 requiresReal 用例，必须至少被一条"档位=real"的执行腿**判过**（不是跳过），
 *  而且 ⑤ 要的双身份 ⇒ A 与 guest 两把身份各要有一条。
 *
 *  为什么单独一条门（2026-09-27）：执行器把 236 条 requiresReal 全记成 SKIPPED，
 *  而排队器与 queue-reconcile 数的是"这条用例有没有一行结果"——SKIPPED 也算一行，
 *  于是覆盖账看起来是满的。真实模式实际量为零。跳过原因那句"本切片只跑 mock 产物"
 *  在它自己那次运行里都不成立（它开的就是 real 档），更没人去核。
 *  这条门只认一个事实：**行上的 band 是不是 real，状态是不是"没被跳过"**。
 *
 *  用法：node scripts/qa/verify-real-coverage.mjs [--round round-7]
 *       [--ops reports/audit/round-6/ops] [--dir reports/audit/round-7] [--selftest]
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? argv1(i) : d; };
function argv1(i) { return process.argv[i + 1]; }
const ROUND = arg("round", "round-7");
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const DIR = resolve(REPO, arg("dir", "reports/audit/" + ROUND));

/** 权威用例集：ops 判据台里逐条点名 requiresReal 的那些（不从执行结果反推，
 *  否则"没跑 ⇒ 没行 ⇒ 不欠账"会自己把自己证明成满分）。 */
function requiredCases() {
  const out = [];
  if (!existsSync(OPS)) { console.log("REALCOV_RESULT=FAIL reason=判据台目录不存在 " + OPS); process.exit(2); }
  for (const f of readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
    let j; try { j = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch { continue; }
    const cases = j.cases || j.items || [];
    for (const c of cases) {
      if (c && c.requiresReal === true) {
        /* 身份适用范围（#51 由 tag-ops-identity-scope.mjs 落的 c.identities）也来自判据台：
           判据说"这条的前置是登录态"，那 guest 这一腿就无权认领 ⇒ 门不能再替它记账。
           口径只减不增：没标的照旧要求双身份，标了的按标的那几腿各要一条。 */
        const ids = Array.isArray(c.identities) ? c.identities.map(String).filter(Boolean) : [];
        out.push({ manifest: (j.suite || f.replace(/\.json$/, "")), id: String(c.id || c.caseId || ""), page: j.page || c.page || "", identities: ids });
      }
    }
  }
  return out.filter((c) => c.id);
}

function execRows() {
  const rows = [];
  if (!existsSync(DIR)) { console.log("REALCOV_RESULT=FAIL reason=本轮结果目录不存在 " + DIR); process.exit(2); }
  for (const d of readdirSync(DIR)) {
    const p = join(DIR, d, "exec-results.json");
    if (!d.startsWith("exec-") || !existsSync(p)) continue;
    let j; try { j = JSON.parse(readFileSync(p, "utf8")); } catch { console.log("REALCOV_SKIP_UNPARSEABLE " + d); continue; }
    for (const r of j.results || []) rows.push({ key: r.manifest + "|" + r.id, band: String(r.band || ""), identity: String(r.identity || "?"), status: String(r.status || "") });
  }
  return rows;
}

/* 只有"判过"才算覆盖：EXECUTED / FAILED 是判过（哪怕判成红），SKIPPED 不是。
   把 SKIPPED 记成覆盖，正是本轮 236 条被吞掉的那条路径。 */
const JUDGED = /^(EXECUTED|FAILED|PASS)$/;
const REAL_BAND = /^real(@|$)/;

/* 一条判据"该由谁来判"，按 ops 的 identities 折算成两条轴（本门只有这两条轴）：
   登录侧 = A 或 B（这条门不区分账号，区分账号是台账的事）；游客侧 = guest/none。
   没标 identities ⇒ 两轴都要（⑤ 的双身份原口径，一条都不放松）。 */
function axesOf(identities) {
  const ids = (identities || []).map(String).filter(Boolean);
  if (!ids.length) return { login: true, guest: true };
  return { login: ids.some((x) => x === "A" || x === "B"), guest: ids.some((x) => x === "guest" || x === "none") };
}

function judge(rows, req, ids) {
  const byId = new Map();
  for (const r of rows) {
    if (!ids.has(r.key)) continue;
    const rec = byId.get(r.key) || { real: new Set(), realJudged: new Set() };
    if (REAL_BAND.test(r.band)) {
      rec.real.add(r.identity);
      if (JUDGED.test(r.status)) rec.realJudged.add(r.identity);
    }
    byId.set(r.key, rec);
  }
  const missing = { neverOnReal: [], skippedOnly: {}, noGuest: [], noA: [], scopedGuestExempt: 0, scopedLoginExempt: 0 };
  for (const c of req) {
    const key = c.manifest + "|" + c.id;
    const ax = axesOf(c.identities);
    if (!ax.guest) missing.scopedGuestExempt++;
    if (!ax.login) missing.scopedLoginExempt++;
    const rec = byId.get(key);
    if (!rec || rec.real.size === 0) { missing.neverOnReal.push(key); continue; }
    const judgedLogin = rec.realJudged.has("A") || rec.realJudged.has("B");
    const judgedGuest = rec.realJudged.has("guest") || rec.realJudged.has("not-logged-in");
    if (ax.login && !judgedLogin) missing.noA.push(key);
    if (ax.guest && !judgedGuest) missing.noGuest.push(key);
    if (rec.realJudged.size === 0) missing.skippedOnly[key] = [...rec.real];
  }
  return missing;
}

function selftest() {
  const req = [{ manifest: "M", id: "1" }, { manifest: "M", id: "2" }, { manifest: "M", id: "3" }];
  const ids = new Set(req.map((c) => c.manifest + "|" + c.id));
  const cases = [
    { n: "两把身份都在 real 档判过⇒ 不欠", rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "real@abc", identity: "guest", status: "EXECUTED" }, { key: "M|2", band: "real@abc", identity: "A", status: "FAILED" }, { key: "M|2", band: "real@abc", identity: "not-logged-in", status: "FAILED" }, { key: "M|3", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "real@abc", identity: "guest", status: "EXECUTED" }], wantMissing: 0 },
    { n: "只在 mock 档有行⇒ 三条全欠（本轮的真实形状）", rows: [{ key: "M|1", band: "mock@abc", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "mock@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "mock@abc", identity: "A", status: "EXECUTED" }], wantMissing: 3 },
    { n: "real 档但全被 SKIPPED⇒ 仍算欠（跳过不等于覆盖）", rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "SKIPPED" }, { key: "M|2", band: "real@abc", identity: "A", status: "SKIPPED" }, { key: "M|3", band: "real@abc", identity: "A", status: "SKIPPED" }], wantMissing: 3 },
    { n: "只有 A 判过、guest 缺⇒ 双身份口径下欠 3", rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 3 },
  ];
  let bad = 0;
  const reqOf = (c) => c.req || req;
  const extraReq = [{ manifest: "M", id: "1", identities: ["A", "B"] }];
  const extraIds = new Set(extraReq.map((c) => c.manifest + "|" + c.id));
  const cases2 = cases.concat([
    { n: "标了 A/B 且 A 在 real 档判过 ⇒ 游客轴不再记账（收窄≠免检，登录轴还在）", req: extraReq, ids: extraIds, rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 0 },
    { n: "标了 A/B 但只有 guest 判过 ⇒ 仍算欠（identity 只减少认领者，不降低标准）", req: extraReq, ids: extraIds, rows: [{ key: "M|1", band: "real@abc", identity: "guest", status: "EXECUTED" }], wantMissing: 1 },
    { n: "标了 A/B 且全被 SKIPPED ⇒ 欠", req: extraReq, ids: extraIds, rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "SKIPPED" }], wantMissing: 1 },
    { n: "没标 identities 的同款行 ⇒ 维持双身份口径，游客缺就算欠", req: [{ manifest: "M", id: "1" }], ids: new Set(["M|1"]), rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 1 },
  ]);
  for (const c of cases2) {
    const m = judge(c.rows, reqOf(c), c.ids || ids);
    const got = new Set([...m.neverOnReal, ...m.noA, ...m.noGuest]).size;
    if (got !== c.wantMissing) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} got=${got} want=${c.wantMissing}`); }
  }
  console.log(`REALCOV_SELFTEST=${bad === 0 ? "PASS" : "FAIL"} cases=${cases2.length} bad=${bad}`);
  process.exit(bad === 0 ? 0 : 1);
}
if (process.argv.includes("--selftest")) selftest();

const req = requiredCases();
if (!req.length) { console.log("REALCOV_RESULT=FAIL reason=判据台里一条 requiresReal 都没抓到 ⇒ 判点空转，不认绿"); process.exit(2); }
const ids = new Set(req.map((c) => c.manifest + "|" + c.id));
const rows = execRows();
const m = judge(rows, req, ids);
console.log(`REALCOV_CASES=${req.length} EXEC_ROWS=${rows.length} 结果目录=${DIR.replace(REPO + "/", "")}`);
console.log(`REALCOV_NEVER_ON_REAL=${m.neverOnReal.length} REAL_BAND_BUT_ALL_SKIPPED=${Object.keys(m.skippedOnly).length} JUDGED_MISSING_A=${m.noA.length} JUDGED_MISSING_GUEST=${m.noGuest.length}`);
console.log(`REALCOV_IDENTITY_SCOPED 游客轴豁免=${m.scopedGuestExempt} 登录轴豁免=${m.scopedLoginExempt}（来源=ops 用例上的 c.identities，载体 tag-ops-identity-scope.mjs；豁免只减认领者，不减判据）`);
for (const k of m.neverOnReal.slice(0, 6)) console.log("  NEVER_ON_REAL " + k);
for (const k of m.noA.slice(0, 6)) console.log("  NO_A_JUDGED " + k);
for (const k of m.noGuest.slice(0, 6)) console.log("  NO_GUEST_JUDGED " + k);
const uncovered = new Set([...m.neverOnReal, ...m.noA, ...m.noGuest]).size;
console.log(`REALCOV_UNCOVERED=${uncovered}／${req.length}`);
console.log(`REALCOV_RESULT=${uncovered === 0 ? "PASS" : "FAIL"}（真实模式覆盖守恒：跳过不算量到，单身份不算双身份）`);
process.exit(uncovered === 0 ? 0 : 1);
