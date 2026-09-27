#!/usr/bin/env node
/**
 * 把只读复判产物里"欠的不是帧而是另一种载体"的行，登记进 open-row-dispositions.json（C 轴去向）。
 *
 * 为什么要有这个载体而不是手抄：登记表是 `verify-frame-debt-coverage` 认的三条合法去向之一。
 * 手抄最容易出事的两点这里都堵上：
 *   1) 整批盖章 —— 每行的 reason 与 nextCarrier 都必须来自复判产物里那一行自己写下的话，
 *      缺任一条就拒绝登记（"帧判不了"这句空话不构成去向，去向要说**欠哪个载体**）；
 *   2) 悄悄改写别人的条目 —— 表里已存在的 id 一律不动（只追加），撞号就报出来交给人看。
 * 判决本身留在复判文件里（谁判的、引了哪句），这里只登记去向，不改台账状态列。
 *
 * 用法：node scripts/qa/emit-openrow-register.mjs [--classify tmp/qa/srconly-owed-plan.json]
 *                                                   [--register reports/audit/round-7/open-row-dispositions.json] [--apply]
 * 退出码：0=完成（含幂等复跑），1=有行不合规则一条都不落盘，2=前置件缺失。
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const KNOWN = ["classify", "register", "apply", "include-plan-nonshoot", "plan", "matrix"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log(`REGADD_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 只认 ${KNOWN.join(",")}`); process.exit(2); }
}
const CLS = resolve(REPO, arg("classify", "tmp/qa/srconly-owed-plan.json"));
const REG = resolve(REPO, arg("register", "reports/audit/round-7/open-row-dispositions.json"));
if (!existsSync(CLS)) { console.log(`REGADD_RESULT=FAIL reason=复判产物不存在 ${CLS}`); process.exit(2); }
if (!existsSync(REG)) { console.log(`REGADD_RESULT=FAIL reason=登记表不存在 ${REG}`); process.exit(2); }

const KIND = {
  NOT_FRAME_JUDGEABLE: "not_frame_observable_declared",
  MISLABELLED_ALREADY_JUDGED_ELSEWHERE: "judged_elsewhere",
};
/* 第二类出处：取景配方里**有行但不是 SHOOT**（REWRITE / NOT_SHOOTABLE）。
   这些行不是"欠一帧"，是"欠一次判据收紧"—— 配方里那行自己写着为什么出不了帧，
   所以理由取自配方，不我来编。没有 --include-plan-nonshoot 时这段完全不跑。 */
function fromPlanNonShoot() {
  if (!has("include-plan-nonshoot")) return [];
  const p = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-merged.json"));
  if (!existsSync(p)) { console.log(`REGADD_RESULT=FAIL reason=配方不存在 ${p}`); process.exit(2); }
  const pj = JSON.parse(readFileSync(p, "utf8"));
  return (pj.rows || [])
    .filter((r) => !/^SHOOT/i.test(String(r.disposition || "")))
    .map((r) => ({
      id: String(r.id || "").trim(),
      kind: "criteria_needs_tightening",
      reason: `${r.disposition}：${String(r.why || r.demoteReason || r.unresolved || "").trim()}`.slice(0, 700),
      nextCarrier: `重写这条判据到帧上可核验的物件（配方行自带 route=${r.route || "?"} / frameName=${r.frameName || "?"}）；在判据收紧之前拍它只会得到一张没有判点的帧`,
      basis: `取景配方 ${arg("plan", "reports/audit/round-7/frameplan-merged.json")} 里该行的 disposition=${r.disposition} 与其自己的 why`,
    }))
    .filter((x) => x.id && /：\s*$/.test(x.reason) === false && x.reason.length > 12);
}

const cj = JSON.parse(readFileSync(CLS, "utf8"));
const rg = JSON.parse(readFileSync(REG, "utf8"));
const rows = cj.rows || [];
if (!rows.length) { console.log("REGADD_RESULT=FAIL reason=复判文件里没有 rows（空集不许当成「都登记过了」）"); process.exit(2); }
const have = new Set((rg.dispositions || []).map((d) => String(d.id || "").trim()));
const basisFile = arg("classify", "tmp/qa/srconly-owed-plan.json");

const add = [], refused = [], dup = [], skipped = [];
for (const r of rows) {
  const kind = KIND[String(r.verdict || "")];
  if (!kind) { skipped.push(`${r.id}（判决 ${r.verdict} 不属于"欠别的载体"，不进这张表）`); continue; }
  const id = String(r.id || "").trim();
  if (!id) { refused.push("(空 id)"); continue; }
  if (have.has(id)) { dup.push(id); continue; }
  const reason = String(r.reason || "").trim();
  const carrier = String(typeof r.carrierOrPlanRow === "string" ? r.carrierOrPlanRow : ((r.carrierOrPlanRow || {}).carrier || (r.carrierOrPlanRow || {}).nextCarrier || "")).trim();
  if (!reason) { refused.push(`${id} 没有 reason ⇒ 不许只写"帧判不了"`); continue; }
  if (!carrier) { refused.push(`${id} 没有 nextCarrier ⇒ 去向必须点名欠哪个载体（SPEC 条目 / 单测 / 后端读数…）`); continue; }
  add.push({
    id, kind, reason: reason.slice(0, 700), nextCarrier: carrier.slice(0, 500),
    basis: `只读复判 ${r.verdict}（${basisFile}；引文 ${(r.quote || "").slice(0, 160)}）`,
  });
}
if (has("include-plan-nonshoot")) {
  const ledTxt = readFileSync(resolve(REPO, arg("matrix", "reports/audit/round-6/issue-matrix.md")), "utf8").split(/\r?\n/);
  const inLedger = new Set(ledTxt.filter((l) => /^\|\s*MP-/.test(l)).map((l) => l.split("|").map((s) => s.trim())[1]));
  let fromPlan = 0;
  for (const r of fromPlanNonShoot()) {
    if (!inLedger.has(r.id)) continue;
    if (have.has(r.id) || add.some((x) => x.id === r.id)) { dup.push(r.id); continue; }
    if (r.reason.length < 14) { refused.push(`${r.id} 配方里那行没写 why ⇒ 不能替它编理由`); continue; }
    add.push(r); fromPlan++;
  }
  console.log(`REGADD_PLAN_NONSHOOT 配方里非 SHOOT 且在台账中的行：登记 ${fromPlan} 条（去向=先收紧判据，不是先拍帧）`);
}
console.log(`REGADD 复判行=${rows.length} 该登记=${Object.keys(KIND).length} 种判决｜可加=${add.length} 撞号已存在=${dup.length} 拒绝=${refused.length} 不归本表=${skipped.length}`);
for (const d of dup) console.log("  DUP(表里已有，不动它的条目) " + d);
for (const x of refused) console.log("  REFUSE " + x);
if (refused.length) { console.log("REGADD_RESULT=FAIL reason=有不合登记的行 ⇒ 表一条都不改"); process.exit(1); }
if (!add.length) { console.log(`REGADD_RESULT=PASS reason=没有需要新登记的行（可加 0、撞号 ${dup.length}）⇒ 幂等复跑`); process.exit(0); }
if (!has("apply")) {
  for (const a of add.slice(0, 8)) console.log(`  REGADD_DRY ${a.id} kind=${a.kind}`);
  console.log(`REGADD_RESULT=DRY 拟登记 ${add.length} 条（加 --apply 落盘）`);
  process.exit(0);
}
rg.dispositions = (rg.dispositions || []).concat(add);
rg.$added = [{ at: new Date().toISOString(), from: basisFile, count: add.length, ids: add.map((a) => a.id) }];
writeFileSync(REG, JSON.stringify(rg, null, 1) + "\n");
const back = (JSON.parse(readFileSync(REG, "utf8")).dispositions || []).length;
console.log(`REGADD_WRITTEN 条目 ${rg.dispositions.length - add.length} → ${back}（守恒：${back === rg.dispositions.length ? "yes" : "NO"}）`);
console.log(`REGADD_RESULT=OK 登记 ${add.length} 条去向；台账状态列一个字没改（去向≠结案）`);
