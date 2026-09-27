#!/usr/bin/env node
/* 取景配方对账：把 10:19 那份按当时认知写的配方，与"现在这份配方回盘核过帧能不能判"对齐。
   只允许一个方向：**把 SHOOT 降级**（配方说要拍，但回盘的帧证明不了这个判点）。
   反向（把非 SHOOT 提成 SHOOT）一律视为造假并当场红 —— 那等于凭脚本给一条已判过的行"再拍一次机会"。
   依据不是我的判断，而是 reports/audit/round-7/frame-debt-triage.json 里逐条写清的归置。
   用法：node scripts/qa/reconcile-frameplan.mjs [--apply] */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const APPLY = process.argv.includes("--apply");
const PLAN = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-merged.json"));
const TRI = resolve(REPO, arg("triage", "reports/audit/round-7/frame-debt-triage.json"));
const OUT = resolve(REPO, arg("out", "reports/audit/round-7/frameplan-round7-final.json"));

/* 哪些归置下「拍了也判不了」——写死在这里而不是靠文字匹配，
   否则改一句归置措辞就能悄悄把一行放回 SHOOT。 */
const UNJUDGABLE = {
  not_frame_observable: ["NOT_SHOOTABLE", "帧分不出改前改后（判据要的是帧上没有的量：顺序/嵌套/等值文案/已在基线内）"],
  needs_ruling: ["NOT_SHOOTABLE", "欠的是裁决而不是帧（判据本身有事实错误或两条待拍板项）"],
  needs_naming: ["REWRITE", "判据没点名可核验的物件 ⇒ 出一张没有判点的帧"],
};

const plan = JSON.parse(readFileSync(PLAN, "utf8"));
const tri = JSON.parse(readFileSync(TRI, "utf8"));
const rows = plan.rows || [];
const byId = {};
for (const t of (tri.dispositions || [])) byId[t.id] = t;
if (!Object.keys(byId).length) { console.log("FRAMEPLAN_RESULT=FAIL reason=归置文件里没有 dispositions[]（空集不能当成「全部已归置」）"); process.exit(2); }

const problems = [];
const demotions = [];
const kept = [];
const info = [];
const out = rows.map((r) => {
  const t = byId[r.id];
  if (!t || r.disposition !== "SHOOT") {
    /* 归置说"这行已经点名可判"而配方里它不是 SHOOT：不动它（棘轮只许降），但要说出来，
       否则"该拍的没排"会以"配方很干净"的样子混过去。 */
    if (t && r.disposition !== "SHOOT" && t.resolved === true)
      info.push(`ALREADY_NAMED ${r.id} 归置=已点名，但配方里是 ${r.disposition}（本脚本不升级，交给人看是不是漏排）`);
    return r;
  }
  const cls = String(t.kind || "");
  const hit = UNJUDGABLE[cls];
  if (!hit) { kept.push(r.id); return r; }
  const [to, why] = hit;
  demotions.push({ id: r.id, from: "SHOOT", to, cls, why: (t.why || t.next || "").slice(0, 160), planWhy: why });
  return { ...r, disposition: to, demotedFrom: "SHOOT", demoteReason: `${why}｜归置：${(t.why || t.next || "").slice(0, 200)}` };
});


const cnt = {};
for (const r of out) cnt[r.disposition] = (cnt[r.disposition] || 0) + 1;
if (out.length !== rows.length) problems.push(`守恒破：出行 ${out.length} ≠ 入行 ${rows.length}`);
const beforeShoot = rows.filter((r) => r.disposition === "SHOOT").length;
const afterShoot = cnt.SHOOT || 0;
if (afterShoot > beforeShoot) problems.push(`SHOOT 反而变多（${beforeShoot} → ${afterShoot}）—— 本脚本只许降级`);
const orphan = demotions.filter((d) => !out.find((r) => r.id === d.id));
if (orphan.length) problems.push("降级记录找不到对应行：" + orphan.map((d) => d.id).join(","));
/* 归置提到而配方里没有的行：只有 needs_code 才是"取景配方的欠排"——
   代码已落地 ⇒ 帧有能力证明那个判点，没排就是漏拍。
   其余 kinds 的债本来就不是一张页帧能还的（not_frame_observable=帧上没有那个量、
   needs_ruling=欠裁决、needs_naming 未点名=欠判据），把它们也计成"欠排"等于用红掩绿：
   真正该被看见的是"这条欠的是另一种载体"，所以逐条列出来交给终报，而不是塞进同一个红里。 */
const inPlan = new Set(rows.map((r) => r.id));
const unplanned = Object.values(byId).filter((t) => !inPlan.has(t.id));
const unplannedShoot = unplanned.filter((t) => String(t.kind || "") === "needs_code");
if (unplannedShoot.length) problems.push(`欠排（needs_code 已落地却没配方）：` + unplannedShoot.map((t) => t.id).join(" "));
for (const t of unplanned.filter((x) => String(x.kind || "") !== "needs_code"))
  info.push(`UNPLANNED_NONFRAME ${t.id} 归置=${t.kind} resolved=${t.resolved} 欠的载体=${(t.next || t.why || "").slice(0, 110)}`);


if (APPLY) {
  writeFileSync(OUT, JSON.stringify({
    ...plan,
    generatedAt: new Date().toISOString(),
    reconciledFrom: arg("plan"),
    reconciledBy: "scripts/qa/reconcile-frameplan.mjs（只允许 SHOOT→NOT_SHOOTABLE/REWRITE 的单向棘轮）",
    demotions, counts: cnt, rows: out,
    conserved: out.length === rows.length,
    unplannedNonFrame: unplanned.filter((x) => String(x.kind || "") !== "needs_code")
      .map((t) => ({ id: t.id, kind: t.kind, resolved: t.resolved, owedCarrier: String(t.next || t.why || "").slice(0, 220) })),
  }, null, 1));
}
console.log(`FRAMEPLAN_RECONCILE 入=${rows.length} 出=${out.length} SHOOT ${beforeShoot} → ${afterShoot} 降级=${demotions.length}（其中 NOT_SHOOTABLE ${demotions.filter((d) => d.to === "NOT_SHOOTABLE").length} / REWRITE ${demotions.filter((d) => d.to === "REWRITE").length}）`);
for (const d of demotions) console.log(`  DEMOTE ${d.id} SHOOT→${d.to} 归置=${d.cls} :: ${d.planWhy}`);
for (const s of info) console.log("  " + s);
console.log("  档位分布 " + Object.entries(cnt).map(([k, v]) => k + "=" + v).join(" "));
if (problems.length) {
  console.log(`FRAMEPLAN_RESULT=FAIL problems=${problems.length}`);
  for (const p of problems) console.log("  ✗ " + p);
  process.exit(2);
}
console.log(APPLY ? "FRAMEPLAN_RESULT=OK（已落盘，SHOOT 只剩帧能判的那些）" : "FRAMEPLAN_RESULT=DRY（加 --apply 落盘）");
