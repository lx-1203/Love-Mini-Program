#!/usr/bin/env node
/* 把「配方 + 取景结果」合成台账判决。这是 ① 那笔帧债的收口载体。
 *
 * 三条铁律（都是本轮被点过名的错）：
 *  1. 只有**当轮真拍出来的帧**才能改判。帧不存在、字节太小、或路径对不上 ⇒ 一律不改，并点名。
 *  2. 机器判点没过（该出现的没出现、不该出现的出现了）⇒ 判 `待修复`，把实测值写进去。
 *     这是发现，不是失败；把它写成"已修复"才是问题。
 *  3. 判据只能靠人读帧（FRAME_ONLY）⇒ 状态仍是"待复验"，但 statusEvidence 里必须有帧路径，
 *     这样"欠的是人眼"这件事在账上是看得见的，不会伪装成已闭环。
 *
 * 产出：
 *   reports/audit/round-7/cellplan-round7-frames.json   —— 台账补丁计划（默认 dry，交给 patch-ledger-cells）
 *   reports/audit/round-7/frame-verdicts.md             —— 逐条判决与理由
 *
 * 用法：node scripts/qa/verdict-from-frames.mjs [--frames <f>] [--plan <f>]
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PLAN = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-merged.json"));
const FRAMES_LIST = arg("frames", "reports/audit/round-7/uidebt-shoot/shoot-results.json").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = resolve(REPO, "reports/audit/round-7");

const frameFiles = FRAMES_LIST.map((f) => resolve(REPO, f));
for (const [label, f] of [["配方", PLAN], ...frameFiles.map((f) => ["取景结果", f])]) {
  if (!existsSync(f)) { console.log("FV_RESULT=FAIL reason=" + label + "不存在 " + f.split(REPO.split("\\").join("/") + "/")[1] + "（没有证据就不出判决）"); process.exit(2); }
}
const plan = JSON.parse(readFileSync(PLAN, "utf8"));
/* 多个取景文件：后给的覆盖先给的（同一 id 只留最后一次测量）。
   覆盖成"没拿到帧"时必须点名——否则一次失败的补跑会静默吃掉上一轮的有效证据。
   每条行都记下自己来自哪一份（framesFrom），判决里能看出这个结论是哪一次取景给的。 */
const byId = new Map();
const overwrites = [], srcs = [];
for (let i = 0; i < frameFiles.length; i++) {
  const f = frameFiles[i];
  const tag = f.split(REPO.split("\\").join("/") + "/")[1] || f;
  const j = JSON.parse(readFileSync(f, "utf8"));
  srcs.push({ tag, gitSha: j.gitSha || "?", identitySeen: j.identitySeen || "?", verifyLast: j.verifyLast || "?", rows: (j.rows || []).length });
  for (const r of j.rows || []) {
    const prev = byId.get(r.id);
    if (prev && prev.status === "SHOT" && r.status !== "SHOT") overwrites.push(r.id + ": " + prev.status + "→" + r.status);
    byId.set(r.id, { ...r, framesFrom: tag });
  }
}
if (overwrites.length) console.log("FV_WARN 后一次取景把 " + overwrites.length + " 条有效帧覆盖成无帧（后者胜，逐条点名）：" + overwrites.join("、"));
const fr = { plan: String(plan.generatedAt || "?"), srcs };
const planItems = plan.rows || [];
if (!planItems.length || !byId.size) { console.log("FV_RESULT=FAIL reason=输入为空集，空集不得出判决"); process.exit(2); }

const patches = [], bucket = { NO_LANDING: 0, STATE_NOT_APPLIED: 0, LEFT_PAGE: 0, FIXED_FRAME: 0, REGRESSION: 0, NEEDS_EYE: 0, NO_FRAME: 0, NOT_SHOOTABLE: 0, REWRITE: 0 };
const md = ["# round-7 · 帧级判决（取景来源 " + fr.srcs.length + " 份）", "",
  ...fr.srcs.map((s) => "- 来源 `" + s.tag + "` sha=" + s.gitSha + " 行=" + s.rows + " 身份=" + s.identitySeen + "/" + s.verifyLast), "",
  "| id | 判决 | 机器判点 | 帧 |", "|---|---|---|---|"];

for (const it of planItems) {
  const r = byId.get(it.id);
  if (it.disposition === "NOT_SHOOTABLE") {
    bucket.NOT_SHOOTABLE++;
    patches.push({ id: it.id, col: 9, new: "配方判 NOT_SHOOTABLE：" + String(it.unresolved || "").replace(/\|/g, "／").slice(0, 150), why: "把缺哪个夹具写进账，不让它冒充已闭环" });
    md.push("| " + it.id + " | NOT_SHOOTABLE | — | — |");
    continue;
  }
  if (it.disposition === "REWRITE") {
    bucket.REWRITE++;
    patches.push({ id: it.id, col: 9, new: "配方判 REWRITE（判据本身要改）：" + String(it.unresolved || "").replace(/\|/g, "／").slice(0, 150), why: "判据不可判不是缺陷不存在，写清楚欠的是判据" });
    md.push("| " + it.id + " | REWRITE | — | — |");
    continue;
  }
  if (!r || r.status !== "SHOT" || !r.frame) {
    bucket.NO_FRAME++;
    md.push("| " + it.id + " | NO_FRAME | — | " + (r ? String(r.reason || "").slice(0, 40) : "取景里没有这条") + " |");
    continue;
  }
  const abs = resolve(REPO, r.frame);
  if (!existsSync(abs)) { bucket.NO_FRAME++; md.push("| " + it.id + " | NO_FRAME | — | 帧路径不落盘：" + r.frame + " |"); continue; }
  const realBytes = statSync(abs).size;
  if (realBytes < 3000 || realBytes !== r.bytes) {
    bucket.NO_FRAME++;
    md.push("| " + it.id + " | NO_FRAME | — | 字节对不上（记 " + r.bytes + " / 实 " + realBytes + "）|");
    continue;
  }
  const checks = r.checks || [];
  /* 落点没确认 ⇒ 这一帧可能根本不是那条页（routeStack 取空/报错时最常见）。
     与 r-exec-cli 同一个三态规矩：没测到不等于测出问题。判红之前先问"页面对不对"。 */
  const landingOk = String(r.landing || "").includes(String(r.route || ""));
  if (!landingOk) {
    bucket.NO_LANDING++;
    patches.push({ id: it.id, col: 9, new: ("帧已拍但落点未确认（实落 " + String(r.landing || "(空)").slice(0, 40) + "），本帧不作判据；帧 " + r.frame).replace(/\|/g, "／"), why: "落点不明的判决不能进账" });
    md.push("| " + it.id + " | NO_LANDING | 不作判 | " + r.frame + " |");
    continue;
  }
  /* 配方要求的交互步骤（tap/input/longpress…）这条通道做不了 ⇒ 状态没施加。
     此时"判点没成立"只说明我没把页面推到那个状态，不说明产品没修。记 STATE_NOT_APPLIED，
     交给 WS 那条腿（r-exec-ws 的 wsTap）补，不写进台账判决。 */
  if (r.stateApplied === false) {
    bucket.STATE_NOT_APPLIED++;
    patches.push({ id: it.id, col: 9, new: ("帧已拍但状态未施加：欠 " + (r.stepsUnmet || []).join("、") + "；帧 " + r.frame).replace(/\|/g, "／"), why: "欠的是交互步骤，不是结论——写清楚谁来补" });
    md.push("| " + it.id + " | STATE_NOT_APPLIED | 欠 " + (r.stepsUnmet || []).join("/") + " | " + r.frame + " |");
    continue;
  }
  /* 交互确实做了，但把页面导航走了（点返回、跳详情）⇒ 探针在别的页上查本页物件，
     查不到是必然的，那不是回归。与 NO_LANDING 同一规矩：先问"页面对不对"，再问"东西在不在"。 */
  if (r.landingAfter && !String(r.landingAfter).startsWith("ERR") && !String(r.landingAfter).includes(String(r.route || ""))) {
    bucket.LEFT_PAGE++;
    patches.push({ id: it.id, col: 9, new: ("交互已施加但离开了目标页（实落 " + String(r.landingAfter).slice(0, 60) + "），本页物件的判点不作判据；帧 " + r.frame).replace(/\|/g, "／"), why: "离开目标页后的探针答案不能当判决" });
    md.push("| " + it.id + " | LEFT_PAGE | 不作判 | " + r.frame + " |");
    continue;
  }
  const hard = checks.filter((c) => !String(c.check).startsWith("FRAME_ONLY"));
  const BADV = /^PRESENT_UNEXPECTED|^ABSENT_UNEXPECTED|^PROBE_NO_ANSWER|^TEXT_LEAK|^TEXT_MISS|^BOX_SMALL|^BOX_OFF/;
  const bad = hard.filter((c) => BADV.test(String(c.check)));
  const ev = r.frame + "(" + realBytes + "B" + (r.framesFrom ? " 取自 " + r.framesFrom.split("/").slice(-2)[0] : "") + ") 判点 " + hard.length + " 条";
  if (bad.length) {
    bucket.REGRESSION++;
    patches.push({ id: it.id, col: 6, new: "待修复（帧级复验判红：判点未成立，见 statusEvidence）", why: "帧拍出来了、判点没成立 ⇒ 这是回归/未修，不能记绿" });
    patches.push({ id: it.id, col: 9, new: (ev + " 未成立：" + bad.map((c) => c.target + "=" + c.check).join("、")).replace(/\|/g, "／").slice(0, 220), why: "把实测值写进账" });
    md.push("| " + it.id + " | 判红 | " + bad.length + "/" + hard.length + " 未过 | " + r.frame + " |");
  } else if (!hard.length) {
    bucket.NEEDS_EYE++;
    patches.push({ id: it.id, col: 9, new: ("帧已拍：" + ev + "；本条判点全部是 FRAME_ONLY（只能人读帧）").replace(/\|/g, "／"), why: "欠的是人眼，不是证据" });
    md.push("| " + it.id + " | 待人读帧 | 0/" + checks.length + " | " + r.frame + " |");
  } else {
    bucket.FIXED_FRAME++;
    patches.push({ id: it.id, col: 6, new: "已修复（帧级复验：当轮帧 + " + hard.length + " 个机器判点全部成立）", why: "①的帧债按帧闭环" });
    patches.push({ id: it.id, col: 9, new: ev.replace(/\|/g, "／").slice(0, 220), why: "帧路径 + 字节，可复查" });
    md.push("| " + it.id + " | 帧级成立 | " + hard.length + "/" + hard.length + " | " + r.frame + " |");
  }
}
const ids = new Set(patches.map((p) => p.id));
writeFileSync(join(OUT, "cellplan-round7-frames.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), source: "verdict-from-frames.mjs", frames: byId.size, frameSources: fr.srcs,
  buckets: bucket, patchIds: ids.size, patches,
}, null, 1));
/* 分桶行插在判决表之前（不是固定第 4 行——表头上面现在有 N 个取景来源行，写死会把它插进来源清单里）。 */
md.splice(md.findIndex((l) => l.startsWith("| id |")), 0, "分桶：" + JSON.stringify(bucket), "");
writeFileSync(join(OUT, "frame-verdicts.md"), md.join("\n"));
const covered = [...planItems].filter((i) => i.disposition === "SHOOT").length;
console.log("FV_PLAN=" + planItems.length + " SHOOT=" + covered + " 取景行=" + byId.size);
console.log("FV_BUCKETS " + Object.entries(bucket).map(([k, v]) => k + "=" + v).join(" "));
const sum = Object.values(bucket).reduce((a, b) => a + b, 0);
console.log("FV_CONSERVED=" + (sum === planItems.length ? "yes" : "NO（" + sum + "≠" + planItems.length + "）") + " PATCHES=" + patches.length + " 涉及条目=" + ids.size);
console.log("FV_RESULT=OK 计划已写 cellplan-round7-frames.json（默认 dry）");
process.exit(sum === planItems.length ? 0 : 2);
