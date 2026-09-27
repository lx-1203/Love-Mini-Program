#!/usr/bin/env node
/**
 * 把只读复判产物（tmp/qa/srconly-owed-plan.json 那种形状）里判成 FRAME_JUDGEABLE_NOW 的行，
 * 转成取景配方的追加清单（apply-plan-additions.mjs 的输入）。
 *
 * 为什么要单独一步而不是手抄：apply-plan-additions 要求每行自带 route / identity / frameName /
 * precondition / assertion，缺一项就拒绝（没有判点的帧不许拍）。复判文件里 identity 与 assertion
 * 是缺的 —— 但**能从别处推出来**：identity 就是腿给的 lane（A/B/guest），assertion 就是台账那一行
 * 自己的判据文本。推不出来的必须点名失败，不许拿一句空话把帧塞进配方。
 *
 * 用法：node scripts/qa/emit-frameplan-additions.mjs --classify tmp/qa/srconly-owed-plan.json \
 *        --out scripts/qa/plan-additions-stage8.json [--verdict FRAME_JUDGEABLE_NOW] [--dry]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const has = (f) => argv.includes("--" + f);
const KNOWN = ["classify", "out", "verdict", "matrix", "dry"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log(`FRAMEADD_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 只认 ${KNOWN.join(",")}`); process.exit(2); }
}
const CLS = resolve(REPO, arg("classify", "tmp/qa/srconly-owed-plan.json"));
const OUT = resolve(REPO, arg("out", "scripts/qa/plan-additions-stage8.json"));
const MATRIX = resolve(REPO, arg("matrix", "reports/audit/round-6/issue-matrix.md"));
const VERDICT = arg("verdict", "FRAME_JUDGEABLE_NOW");
if (!existsSync(CLS)) { console.log(`FRAMEADD_RESULT=FAIL reason=复判产物不存在 ${CLS}`); process.exit(2); }
if (!existsSync(MATRIX)) { console.log(`FRAMEADD_RESULT=FAIL reason=台账不存在 ${MATRIX}`); process.exit(2); }

/* 台账：id → 该行的判据文本（证据列）与页面列。列顺序按表头现算，不写死列号。 */
const ledger = new Map();
{
  const lines = readFileSync(MATRIX, "utf8").split(/\r?\n/);
  const hdr = lines.find((l) => /^\|/.test(l) && /\|\s*(?:status|状态)\s*\|/i.test(l));
  if (!hdr) { console.log("FRAMEADD_RESULT=FAIL reason=台账找不到表头"); process.exit(2); }
  const cols = hdr.split("|").map((s) => s.trim());
  const at = (re) => cols.findIndex((c) => re.test(c));
  const iId = at(/^(?:新号|id)$/i), iPage = at(/^页面$/), iEv = at(/^证据/), iSt = at(/^(?:status|状态)$/i), iDisp = at(/^处置$/);
  if ([iId, iPage, iEv].some((x) => x < 0)) { console.log(`FRAMEADD_RESULT=FAIL reason=台账列定位失败 id/页面/证据=${iId}/${iPage}/${iEv}`); process.exit(2); }
  for (const l of lines) {
    if (!/^\|\s*MP-/.test(l)) continue;
    const c = l.split("|").map((s) => s.trim());
    ledger.set(c[iId], { page: c[iPage] || "", evidence: c[iEv] || "", status: c[iSt] || "", disp: c[iDisp] || "" });
  }
}

const cj = JSON.parse(readFileSync(CLS, "utf8"));
const rows = (cj.rows || []).filter((r) => String(r.verdict || "") === VERDICT);
const out = [], dropped = [];
for (const r of rows) {
  const p = r.carrierOrPlanRow || {};
  const id = String(p.id || r.id || "").trim();
  const led = ledger.get(id) || {};
  const route = String(p.route || "").trim();
  const identity = String(p.identity || p.lane || "").trim();
  const frameName = String(p.frameName || "").trim();
  const precondition = String(p.precondition || "").trim();
  /* 判点：优先复判给的那句，退到台账自己的证据列 —— 两者都是"这帧要看见什么"的现成文字，
     不自己编。都没有就点名丢掉，不塞一张没判点的帧进配方。 */
  const assertion = String(p.assertion || p.expect || "").trim() || String(led.evidence || "").trim();
  const miss = [["route", route], ["identity", identity], ["frameName", frameName], ["precondition", precondition], ["assertion", assertion]].filter((x) => !x[1]);
  if (miss.length) { dropped.push(`${id} 缺 ${miss.map((x) => x[0]).join(",")}`); continue; }
  out.push({
    id, route, identity, frameName, precondition, assertion: assertion.slice(0, 400),
    band: String(p.band || led.disp || "").slice(0, 120),
    source: `只读复判 ${VERDICT}（${arg("classify", "")}）+ 台账证据列`,
  });
}
console.log(`FRAMEADD 复判 ${VERDICT}=${rows.length} 可转=${out.length} 因缺件丢弃=${dropped.length}`);
for (const d of dropped) console.log("  DROP " + d);
if (!out.length) { console.log("FRAMEADD_RESULT=FAIL reason=一条都没转出来 ⇒ 不写空清单（空文件会被当成「这些行不需要帧」）"); process.exit(1); }
if (has("dry")) { console.log("FRAMEADD_RESULT=DRY 只算账不落盘"); process.exit(0); }
writeFileSync(OUT, JSON.stringify({
  $comment: `由 emit-frameplan-additions.mjs 从复判产物派生（identity 来自腿给的 lane，assertion 退到台账证据列；缺件的行在 NOTES 里点名丢弃，不塞没判点的帧）`,
  $verdict: VERDICT, rows: out,
}, null, 1) + "\n");
console.log(`FRAMEADD_WRITTEN=${OUT} 行数=${out.length}（丢弃 ${dropped.length} 条，须由人补 precondition/assertion 后再跑一次）`);
console.log("FRAMEADD_RESULT=OK 下一步：apply-plan-additions --add 这份 --classify 复判产物 --dry 再 --apply");
