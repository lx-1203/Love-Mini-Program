/**
 * 把 scripts/qa/plan-additions-stage7.json 里的行追加进取景配方输入 frameplan-merged.json。
 *
 * 为什么要有这个小程序而不是手改 JSON：追加动作必须满足三条才不会变成"给自己放行"——
 *   1. 只有登记在册的行（--ledger 里第 6 列确实是未收口词表）才允许被追加成 SHOOT；
 *   2. 行必须自带 route / assertion / precondition / identity，缺一项就拒绝（否则 reshoot 会拍出一张没有判点的帧）；
 *   3. 已在配方里的行不覆盖：SHOOT 保持、非 SHOOT 报"降级过，需要人先看为什么"，绝不静默升级
 *      （reconcile-frameplan 的单向棘轮是同一道理：能拍的可以改成不能拍，反过来就是洗绿）。
 * 用法：node scripts/qa/apply-plan-additions.mjs [--add 追加清单] [--plan 配方] [--dry]
 * 退出码：0=完成（或 dry 算账通过），1=有行不合规则全部不落盘，2=前置件缺失。
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const ADD = resolve(REPO, arg("add", "scripts/qa/plan-additions-stage7.json"));
/* 状态列不是"未收口"的行默认一律拒绝。唯一的例外必须是有出处的：--classify 指一份只读复判产物，
   里面把该行判成 --verdict（默认 FRAME_JUDGEABLE_NOW，"今天就能被帧判"）。
   没有这份凭据就想给 已修复（源码级判点…） 换身份 ⇒ 仍然拒绝。这不是放宽，是把"谁说的"落到盘上。 */
const CLASSIFY = arg("classify", "");
const VERDICT = arg("verdict", "FRAME_JUDGEABLE_NOW");
/* 放行必须是点名的：--allow-upgrade 只说"我认这套"，--upgrade-only 说"认的是这几行"。
   只给前者就 exit 2 —— 一次批量升回整批降级行，正是棘轮要拦的那种动作。 */
const UPG_ONLY = (arg("upgrade-only", "") || "").split(",").map((x) => x.trim()).filter(Boolean);
if (has("allow-upgrade") && !UPG_ONLY.length) { console.log("PLANADD_RESULT=FAIL reason=--allow-upgrade 必须配 --upgrade-only 点名放行哪几行（不许整批升回）"); process.exit(2); }
const dropped = [];
const KNOWN = ["add", "plan", "ledger", "dry", "classify", "verdict", "allow-upgrade", "upgrade-only"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log(`PLANADD_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 本工具只认 ${KNOWN.join(",")}`); process.exit(2); }
}
const allowedByClassify = new Set();
if (CLASSIFY) {
  const cp = resolve(REPO, CLASSIFY);
  if (!existsSync(cp)) { console.log(`PLANADD_RESULT=FAIL reason=--classify 指的文件不存在 ${cp}（没有出处就不许动那些行的状态）`); process.exit(2); }
  const cj = JSON.parse(readFileSync(cp, "utf8"));
  for (const r of cj.rows || []) if (String(r.verdict || "") === VERDICT && r.id) allowedByClassify.add(String(r.id).trim());
  console.log(`PLANADD_CLASSIFY 出处=${CLASSIFY} 判成 ${VERDICT} 的行=${allowedByClassify.size}`);
  if (!allowedByClassify.size) { console.log(`PLANADD_RESULT=FAIL reason=出处里没有一条 ${VERDICT} ⇒ 空集不许当成"允许追加"（要么改 --verdict，要么承认没这东西）`); process.exit(2); }
}
const PLAN = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-merged.json"));
const LEDGER = resolve(REPO, arg("ledger", "reports/audit/round-6/issue-matrix.md"));
const OPEN_STATUS = ["待修复", "已修复待复验", "待复验", "未取证", "未取证/需裁决", "需裁决", "待人裁决"];

if (!existsSync(ADD)) { console.log(`PLANADD_RESULT=FAIL reason=追加清单不存在 ${ADD}`); process.exit(2); }
if (!existsSync(PLAN)) { console.log(`PLANADD_RESULT=FAIL reason=配方不存在 ${PLAN}`); process.exit(2); }
if (!existsSync(LEDGER)) { console.log(`PLANADD_RESULT=FAIL reason=台账不存在 ${LEDGER}`); process.exit(2); }

const ledgerOpen = new Set();
{
  const lines = readFileSync(LEDGER, "utf8").split(/\r?\n/);
  const hdr = lines.find((l) => /^\|/.test(l) && /\|\s*(?:status|状态)\s*\|/i.test(l));
  if (!hdr) { console.log("PLANADD_RESULT=FAIL reason=台账找不到 status 表头（无法核\"这行是不是真未收口\"）"); process.exit(2); }
  const cols = hdr.split("|").map((s) => s.trim());
  const si = cols.findIndex((c) => /^(?:status|状态)$/i.test(c));
  const ii = cols.findIndex((c) => /^(?:新号|id)$/i.test(c));
  for (const l of lines) {
    if (!/^\|\s*MP-/.test(l)) continue;
    const c = l.split("|").map((s) => s.trim());
    if (OPEN_STATUS.includes(String(c[si] || "").split("（")[0].trim())) ledgerOpen.add(c[ii]);
  }
}
if (!ledgerOpen.size) { console.log("PLANADD_RESULT=FAIL reason=台账里未收口行为 0 ⇒ 那就没有\"追加取景行\"这回事，先复核台账状态词表"); process.exit(2); }

const plan = JSON.parse(readFileSync(PLAN, "utf8"));
const add = JSON.parse(readFileSync(ADD, "utf8"));
const rows = plan.rows || [];
const byId = new Map(rows.map((r) => [String(r.id || "").trim(), r]));
const need = ["route", "identity", "frameName", "precondition", "assertion"];
const refused = [], wouldAdd = [], already = [], viaClassify = [], upgrades = [];
for (const r of add.rows || []) {
  const id = String(r.id || "").trim();
  if (!id) { refused.push({ id: "(空)", why: "没有 id" }); continue; }
  const miss = need.filter((k) => !String(r[k] || "").trim() && r[k] !== 0);
  if (miss.length) { refused.push({ id, why: "缺字段 " + miss.join(",") + "（没有判点的帧不许拍）" }); continue; }
  if (!ledgerOpen.has(id)) {
    if (allowedByClassify.has(id)) { viaClassify.push(id); }
    else { refused.push({ id, why: "台账第 6 列不是未收口状态 ⇒ 不许借追加取景行给它换身份（若它被只读复判判成可帧判，带 --classify 出处来）" }); continue; }
  }
  const cur = byId.get(id);
  if (cur) {
    const disp = String(cur.disposition || "").toUpperCase();
    if (disp.startsWith("SHOOT")) { already.push(id + "（已在配方且已是 SHOOT，跳过不动）"); continue; }
    /* 升级需要两样东西：复判出处（--classify 里这行判成 --verdict）+ 人明确说允许（--allow-upgrade）。
       只给其中一个都不算：出处是"谁说这句"，旗标是"我看过并认了"。 */
    if (allowedByClassify.has(id) && has("allow-upgrade") && UPG_ONLY.includes(id)) {
      upgrades.push({
        id, from: cur.disposition, to: "SHOOT", route: r.route, identity: r.identity, frameName: r.frameName,
        precondition: r.precondition, assertionList: [r.assertion],
        upgradeBasis: `只读复判 ${VERDICT}（${CLASSIFY}）+ --allow-upgrade 人放行`,
      });
      continue;
    }
    if (allowedByClassify.has(id) && has("allow-upgrade")) { dropped.push(id + "（复判说可帧判，但我没点它在 --upgrade-only 里 ⇒ 维持 " + cur.disposition + "，这条判决就此留痕）"); continue; }
    refused.push({ id, why: "配方里它是 " + cur.disposition + "（无降级记录 ⇒ 是当初就这么写的）；升回 SHOOT 需要 --classify 出处 + --allow-upgrade + --upgrade-only 三道，缺" + (allowedByClassify.has(id) ? " 旗标/点名" : " 出处") });
    continue;
  }
  wouldAdd.push({
    id, lane: r.lane || "ADDED-stage7", manifest: r.manifest || "ADDED", route: r.route,
    disposition: "SHOOT", addedBy: "scripts/qa/apply-plan-additions.mjs",
    precondition: r.precondition, frameName: r.frameName,
    assertions: 1, assertionList: [r.assertion], steps: [r.assertion],
    crop: r.crop || "full", unresolved: "",
  });
}
console.log(`PLANADD 追加清单=${(add.rows || []).length} 可加=${wouldAdd.length}（其中凭复判出处进来的=${viaClassify.length}）升级=${upgrades.length} 已在配方=${already.length} 拒绝=${refused.length} 台账未收口=${ledgerOpen.size}`);
for (const a of already) console.log("  已存在 " + a);
for (const d of dropped) console.log("  DROPPED " + d);
for (const u of upgrades) console.log(`  UPGRADE ${u.id} ${u.from} → SHOOT（${u.upgradeBasis}）`);
for (const r of refused) console.log(`  REFUSE ${r.id} :: ${r.why}`);
if (refused.length) { console.log("PLANADD_RESULT=FAIL reason=有不合规行 ⇒ 一条都不落盘（半份配方比没有配方更坏）"); process.exit(1); }
if (!wouldAdd.length && !upgrades.length) { console.log("PLANADD_RESULT=PASS reason=没有需要追加或升级的行（清单里的都已在配方里）"); process.exit(0); }
if (has("dry")) { console.log(`PLANADD_RESULT=DRY 将追加 ${wouldAdd.length} 行：${wouldAdd.map((x) => x.id).join(" ")}`); process.exit(0); }
if (upgrades.length) {
  for (const u of upgrades) {
    const cur = plan.rows.find((x) => String(x.id).trim() === u.id);
    if (!cur) { console.log(`PLANADD_RESULT=FAIL reason=升级目标在配方里找不到了 ${u.id}`); process.exit(1); }
    Object.assign(cur, {
      disposition: "SHOOT", upgradedFrom: u.from, upgradeBasis: u.upgradeBasis,
      route: u.route, identity: u.identity, frameName: u.frameName, precondition: u.precondition,
      assertionList: u.assertionList, assertions: 1, steps: u.assertionList,
    });
  }
}
plan.rows = rows.map((x) => x).concat(wouldAdd);
plan.addedByStage7 = (plan.addedByStage7 || []).concat(wouldAdd.map((x) => x.id));
writeFileSync(PLAN, JSON.stringify(plan, null, 1));
const recheck = JSON.parse(readFileSync(PLAN, "utf8")).rows || [];
if (recheck.length !== rows.length + wouldAdd.length) { console.log(`PLANADD_RESULT=FAIL reason=落盘后行数不守恒 期望 ${rows.length + wouldAdd.length} 实得 ${recheck.length}`); process.exit(1); }
console.log(`PLANADD_WRITTEN=${PLAN} 行数 ${rows.length} → ${recheck.length}（守恒：yes）`);
console.log("PLANADD_RESULT=PASS 追加完成；下一步跑 reconcile-frameplan（只降不升）与 reshoot 腿");
process.exit(0);
