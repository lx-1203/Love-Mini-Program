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
 * 【本轮补 · gap-identshape】precondition 不许再被 String() 一遍。旧写法（本版 :61
 * `const precondition = String(p.precondition || "").trim()`）碰上对象形态的 precondition ——
 * 那正是配方里的标准形状 {identity, theme, fixture}（reports/audit/round-7/frameplan-round7-final.json
 * 里 76 条如此）—— 会把它洗成字面量 "[object Object]"：身份正文当场销毁，取景器
 * （shoot-frameplan.mjs 的分组键）读不到 precondition.identity。实测经这条路进配方的 16 条
 * 至今带着 "[object Object]"（scripts/qa/plan-additions-stage8.json），旧版取景器于是把它们
 * 默认成 identity=A 并出一张登录态帧关掉要求登出态的台账行 —— 那是伪证不是缺测量。
 * 现在的口径：precondition 一律以**对象**产出且必须带非空 .identity；身份说不出（源头被销毁、
 * lane 也没给）⇒ 该行点名丢弃，绝不产出身份不可归因的配方行。
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
const out = [], dropped = [], destroyed = [], conflicts = [];
const shapeTally = { object: 0, prose: 0, absent: 0, destroyed: 0, other: 0 };
/* 上游生产者（本文件改前的 :61）留下的 "[object Object]"：身份正文已经销毁，不许再抄一遍进新配方 ⇒
   单独一个桶点名，要求回源头重述 precondition.identity。口径同 shoot-frameplan.mjs 的
   identityResolutionOf（"[object …]" 一律判不可归因），拼写沿用 unattributed / NOT_SHOOTABLE 那一族。 */
const OBJ_GARBAGE = /^\s*\[object \w*\]\s*$/;

/* precondition 的三种来路，一律产出**对象** {identity, theme?, fixture?}：
   · 对象 ⇒ 身份取它自己的 .identity（正文退到 .fixture），lane 只在它没说时补位；
   · 裸串 ⇒ 那是**状态散文**不是身份：正文原样留在 .fixture，身份只能来自点名的 lane/identity 字段；
     （绝不从散文里猜身份 —— 那正是本轮堵掉的口径）
   · 缺失/数组/数字 ⇒ 同上，身份没说出来就不许产出这一行。 */
function preconditionOf(p) {
  const stated = String(p.identity || p.lane || "").trim();
  const raw = p.precondition;
  if (typeof raw === "string" && OBJ_GARBAGE.test(raw)) {
    return { kind: "destroyed", preIdentity: "", theme: "", fixture: "", stated };
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const pi = String(raw.identity ?? "").trim();
    return { kind: "object", preIdentity: pi, theme: String(raw.theme ?? "").trim(), fixture: String(raw.fixture ?? "").trim(), stated };
  }
  if (typeof raw === "string") {
    return { kind: "prose", preIdentity: "", theme: "", fixture: raw.trim(), stated };
  }
  if (raw === undefined || raw === null) return { kind: "absent", preIdentity: "", theme: "", fixture: "", stated };
  return { kind: "other", preIdentity: "", theme: "", fixture: JSON.stringify(raw).slice(0, 300), stated };
}

for (const r of rows) {
  const p = r.carrierOrPlanRow || {};
  const id = String(p.id || r.id || "").trim();
  const led = ledger.get(id) || {};
  const route = String(p.route || "").trim();
  const pre = preconditionOf(p);
  shapeTally[pre.kind] = (shapeTally[pre.kind] || 0) + 1;
  /* 身份以配方自己说出来的那句话为准（precondition.identity），腿给的 lane 只补位；
     两者都说了且不是同一档 ⇒ 不静默取舍，点名出来（取景分组读的是 precondition.identity）。 */
  const normG = (v) => (/guest|游客|未登录|登出|注销/i.test(String(v || "")) ? "guest" : "A");
  const identity = pre.preIdentity || pre.stated;
  if (pre.preIdentity && pre.stated && normG(pre.preIdentity) !== normG(pre.stated)) {
    conflicts.push(`${id} precondition.identity="${pre.preIdentity.slice(0, 40)}" 与 lane/identity="${pre.stated}" 不同档 ⇒ 取景按 precondition.identity 走，lane 那句要么改要么删`);
  }
  const frameName = String(p.frameName || "").trim();
  /* 判点：优先复判给的那句，退到台账自己的证据列 —— 两者都是"这帧要看见什么"的现成文字，
     不自己编。都没有就点名丢掉，不塞一张没判点的帧进配方。 */
  const assertion = String(p.assertion || p.expect || "").trim() || String(led.evidence || "").trim();
  if (pre.kind === "destroyed") {
    destroyed.push(`${id} precondition 是 "[object Object]"（旧生产者把对象 String() 过的产物）⇒ 身份正文不可恢复，须在源头重述 precondition.identity 后再生成`);
    continue;
  }
  const miss = [["route", route], ["identity/precondition.identity（同一句话，取景只读后者）", identity], ["frameName", frameName], ["assertion", assertion]].filter((x) => !x[1]);
  if (miss.length) { dropped.push(`${id} 缺 ${miss.map((x) => x[0]).join(",")}`); continue; }
  const precondition = { identity };
  if (pre.theme) precondition.theme = pre.theme;
  if (pre.fixture) precondition.fixture = pre.fixture.slice(0, 400);
  out.push({
    id, route, identity, frameName, precondition, assertion: assertion.slice(0, 400),
    band: String(p.band || led.disp || "").slice(0, 120),
    source: `只读复判 ${VERDICT}（${arg("classify", "")}）+ 台账证据列；precondition 身份出自 ${pre.preIdentity ? "carrierOrPlanRow.precondition.identity" : "腿给的 lane/identity"}`,
  });
}
console.log(`FRAMEADD 复判 ${VERDICT}=${rows.length} 可转=${out.length} 因缺件丢弃=${dropped.length} 身份已销毁=${destroyed.length} precondition形态=${JSON.stringify(shapeTally)}`);
console.log("FRAMEADD_IDENTITY_ATTRIBUTABLE=" + out.filter((x) => x.precondition && x.precondition.identity).length + "/" + out.length + "（产出的每行都带 precondition.identity ⇒ 取景分组可归因）");
for (const d of dropped) console.log("  DROP " + d);
for (const d of destroyed) console.log("  DESTROYED " + d);
for (const c of conflicts) console.log("  IDENTITY_CONFLICT " + c);
if (!out.length) { console.log("FRAMEADD_RESULT=FAIL reason=一条都没转出来 ⇒ 不写空清单（空文件会被当成「这些行不需要帧」）"); process.exit(1); }
/* 自检：产出的每一行的 precondition 必须是带非空 identity 的对象。这一条是给未来的自己设的 ——
   上一版就是这个字段被 String() 掉，才让取景器把 20 行默认成 identity=A。不合格就不落盘。 */
const bad = out.filter((x) => !x.precondition || typeof x.precondition !== "object" || Array.isArray(x.precondition) || !String(x.precondition.identity || "").trim());
if (bad.length) { console.log(`FRAMEADD_RESULT=FAIL reason=${bad.length} 行的 precondition 不是带 identity 的对象（${bad.slice(0, 5).map((x) => x.id).join(",")}）⇒ 一条都不落盘：不可归因的配方行会让取景器默认成 A`); process.exit(1); }
console.log("FRAMEADD_UNATTRIBUTED_ROWS=0");
if (has("dry")) { console.log("FRAMEADD_RESULT=DRY 只算账不落盘"); process.exit(0); }
writeFileSync(OUT, JSON.stringify({
  $comment: `由 emit-frameplan-additions.mjs 从复判产物派生（identity 来自腿给的 lane，assertion 退到台账证据列；缺件的行在 NOTES 里点名丢弃，不塞没判点的帧。precondition 一律是 {identity, theme?, fixture?} 对象 —— 旧版在这里 String() 过对象，产出 "[object Object]" 并把取景身份洗成默认 A，已修）。`,
  $verdict: VERDICT, rows: out,
}, null, 1) + "\n");
console.log(`FRAMEADD_WRITTEN=${OUT} 行数=${out.length}（丢弃 ${dropped.length} 条 + 身份已销毁 ${destroyed.length} 条，须由人在源头补 precondition.identity/assertion 后再跑一次）`);
console.log("FRAMEADD_RESULT=OK 下一步：apply-plan-additions --add 这份 --classify 复判产物 --dry 再 --apply");
