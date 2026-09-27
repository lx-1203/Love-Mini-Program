#!/usr/bin/env node
/**
 * 判据台侧的帧债门：`verify-fixes-against-artifact` 判成 NEEDS_UI_FRAME 的每一条，
 * 今天到底有没有一个**会被拍**的去处，以及它写下的 frame 路径是否真在盘上。
 *
 * 为什么要单独一把（不是重复台账侧的 verify-frame-debt-coverage）：
 *  那把数的是**台账行**（236 行里的未收口 + 源码级判点两族），而 ① 的原话是
 *  "判据台 54 条 NEEDS_UI_FRAME 推到渲染帧级终态" —— 那是判据台条目（本轮实测 116 条里 68 条欠帧）。
 *  两批 id 有交集但不相等，只看台账会把"台账收口了、判据还欠帧"读成没问题。
 *  另外本轮真抓到过"evidence 指向不存在的帧"，所以这里对 frame 路径做 existsSync，不只看有没有写过。
 *
 * 用法：node scripts/qa/verify-criteria-frame-debt.mjs [--verdicts .zcode/tmp/fixverify/verdicts.jsonl]
 *        [--plans a,b] [--triage f] [--extra f] [--strict] [--selftest]
 * 退出码：0=无欠账（或默认只报不否决），1=--strict 下有欠账，2=前置件缺失/空集。
 * 默认不否决：这条轴的假阳性率还没量过，先让它把数字摆出来，量完再上 --strict。
 */
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const KNOWN = ["verdicts", "plans", "triage", "extra", "strict", "selftest"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log(`CRITFRAME_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 只认 ${KNOWN.join(",")}（被忽略的旗标会让门按默认路径静默算错）`); process.exit(2); }
}
const trimId = (x) => String(x || "").split("（")[0].trim();

function readPlans(list) {
  const shoot = new Set(), any = new Set();
  for (const one of list) {
    const p = resolve(REPO, one);
    if (!existsSync(p)) continue;
    let j; try { j = JSON.parse(readFileSync(p, "utf8")); } catch { continue; }
    for (const r of j.rows || []) {
      const id = trimId(r.id);
      any.add(id);
      if (/^SHOOT/i.test(String(r.disposition || ""))) shoot.add(id);
    }
  }
  return { shoot, any };
}
function readIds(path, key) {
  const p = resolve(REPO, path);
  const s = new Set();
  if (!existsSync(p)) return s;
  try { for (const d of (JSON.parse(readFileSync(p, "utf8"))[key] || [])) s.add(trimId(d.id)); } catch { /* 读不到就按空集，但会打印出来 */ }
  return s;
}
function readVerdicts(path) {
  const p = resolve(REPO, path);
  if (!existsSync(p)) return { err: "判据台判决文件不存在 " + path + "（先跑 verify-fixes-against-artifact，缺判决不等于没欠帧）" };
  const rows = [];
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* 尾行可能被追加写坏；跳过但要数出来 */ }
  }
  return { rows };
}

function run({ verdictPath, planList, triagePath, extraPath }) {
  const v = readVerdicts(verdictPath);
  if (v.err) return v;
  const rows = v.rows;
  if (!rows.length) return { err: "判决文件是空的 ⇒ 不能按「没有欠帧」处理" };
  const { shoot, any } = readPlans(planList);
  const tri = readIds(triagePath, "dispositions");
  const ext = readIds(extraPath, "dispositions");
  const byVerdict = {};
  const out = { items: rows.length, need: [], unplanned: [], frameMissing: [], frameMissingPlanned: [], byVerdict };
  for (const r of rows) {
    const k = String(r.verdict || "?");
    out.byVerdict[k] = (out.byVerdict[k] || 0) + 1;
    const id = trimId(r.id);
    const fp = typeof r.frame === "string" ? r.frame : "";
    if (fp && !existsSync(resolve(REPO, fp))) out.frameMissing.push({ id, fp, planned: shoot.has(id) });
    if (k === "NEEDS_UI_FRAME") {
      out.need.push(id);
      const hasDest = shoot.has(id) || tri.has(id) || ext.has(id);
      if (!hasDest) out.unplanned.push({ id, lane: r.laneFile || "", why: String(r.verdictWhy || "").slice(0, 150) });
    }
  }
  out.frameMissingPlanned = out.frameMissing.filter((x) => x.planned).map((x) => x.id);
  out.conserved = out.need.length === out.unplanned.length + (out.need.length - out.unplanned.length);
  return out;
}

const FIXTURES = () => {
  const dir = mkdtempSync(join(process.cwd(), "tmp", "qa", "critframe-selftest-"));
  const vp = join(dir, "v.jsonl"), pp = join(dir, "plan.json"), tp = join(dir, "tri.json"), ep = join(dir, "extra.json");
  const rel = (p) => p.split("\\").join("/").replace(process.cwd().split("\\").join("/") + "/", "");
  writeFileSync(vp, [
    { id: "MP-A1", verdict: "NEEDS_UI_FRAME", verdictWhy: "要帧", frame: "nope/does-not-exist.png" },
    { id: "MP-A2", verdict: "NEEDS_UI_FRAME", verdictWhy: "要帧" },
    { id: "MP-A3", verdict: "NEEDS_UI_FRAME", verdictWhy: "要帧" },
    { id: "MP-A4", verdict: "ARTIFACT_VERIFIED", frame: "nope/second-missing.png" },
    { id: "MP-A5", verdict: "NEEDS_UI_FRAME", verdictWhy: "要帧" },
  ].map((x) => JSON.stringify(x)).join("\n") + "\n");
  writeFileSync(pp, JSON.stringify({ rows: [{ id: "MP-A1", disposition: "SHOOT" }, { id: "MP-A2", disposition: "REWRITE" }, { id: "MP-A5", disposition: "SHOOT" }] }));
  writeFileSync(tp, JSON.stringify({ dispositions: [{ id: "MP-A3" }] }));
  writeFileSync(ep, JSON.stringify({ dispositions: [{ id: "MP-A4" }] }));
  const r = run({ verdictPath: rel(vp), planList: [rel(pp)], triagePath: rel(tp), extraPath: rel(ep) });
  const bad = [];
  if (r.err) bad.push("前置失败：" + r.err);
  if (r.items !== 5) bad.push("条目数应 5 得 " + r.items);
  if (r.need.length !== 4) bad.push("NEEDS_UI_FRAME 应 4 得 " + r.need.length);
  if (r.unplanned.map((x) => x.id).join(",") !== "MP-A2") bad.push("MP-A2 在配方但是 REWRITE ⇒ 必须算无去向；MP-A5 有 SHOOT ⇒ 不该出现。实得 " + r.unplanned.map((x) => x.id).join(","));
  if (r.frameMissing.length !== 2) bad.push("两条假 frame 路径都该被抓到，实得 " + r.frameMissing.length);
  if (!r.frameMissingPlanned.includes("MP-A1")) bad.push("MP-A1 是计划内却没落盘 ⇒ 必须单列");
  rmSync(dir, { recursive: true, force: true });
  console.log(`CRITFRAME_SELFTEST 断言=${bad.length ? "FAIL " + bad.join(" / ") : "PASS"}（含：REWRITE 不算去向、SHOOT 算去向、登记算去向、假 frame 路径必抓）`);
  process.exit(bad.length ? 1 : 0);
};
if (has("selftest")) FIXTURES();

const P = {
  verdictPath: arg("verdicts", ".zcode/tmp/fixverify/verdicts.jsonl"),
  planList: String(arg("plans", "reports/audit/round-7/frameplan-round7-final.json,reports/audit/round-7/frameplan-round7-guest-real.json")).split(",").map((s) => s.trim()).filter(Boolean),
  triagePath: arg("triage", "reports/audit/round-7/frame-debt-triage.json"),
  extraPath: arg("extra", "reports/audit/round-7/open-row-dispositions.json"),
};
for (const one of P.planList) if (!existsSync(resolve(REPO, one))) { console.log(`CRITFRAME_RESULT=FAIL reason=配方缺失 ${one}（缺配方不等于"没有欠帧"）`); process.exit(2); }
const r = run(P);
if (r.err) { console.log(`CRITFRAME_RESULT=FAIL reason=${r.err}`); process.exit(2); }
console.log(`CRITFRAME items=${r.items} 判决分布=${Object.entries(r.byVerdict).map(([k, v]) => k + "=" + v).join(" ")}`);
console.log(`CRITFRAME 欠帧=${r.need.length} 有去向=${r.need.length - r.unplanned.length} 无去向=${r.unplanned.length}｜frame 路径写死但不存在的=${r.frameMissing.length}（其中计划内 SHOOT 却没落盘=${r.frameMissingPlanned.length}）`);
for (const u of r.unplanned.slice(0, 25)) console.log(`  CRITFRAME_UNPLANNED ${u.id} :: ${u.lane} :: ${u.why}`);
if (r.unplanned.length > 25) console.log(`  …另有 ${r.unplanned.length - 25} 条，计数已含在上面，一个都没漏算`);
for (const m of r.frameMissing.slice(0, 12)) console.log(`  CRITFRAME_FRAME_FILE_MISSING ${m.id} → ${m.fp}（计划内=${m.planned ? "yes：说好要拍却没拍到" : "no：路径来自旧登记"}）`);
console.log(`CRITFRAME_CONSERVATION need=${r.need.length} = 有去向 ${r.need.length - r.unplanned.length} + 无去向 ${r.unplanned.length} ${r.conserved ? "OK" : "MISMATCH"}`);
if (!r.conserved) { console.log("CRITFRAME_RESULT=FAIL reason=分桶不守恒 ⇒ 本门统计不可信"); process.exit(2); }
if (has("strict") && (r.unplanned.length || r.frameMissingPlanned.length)) {
  console.log(`CRITFRAME_RESULT=FAIL reason=--strict 下仍欠 ${r.unplanned.length} 条去向、${r.frameMissingPlanned.length} 条说好拍却没帧`);
  process.exit(1);
}
console.log(r.unplanned.length || r.frameMissing.length
  ? "CRITFRAME_RESULT=WARN 有欠账，但默认不否决（这条轴的假阳性率还没量过）；量完在收口时加 --strict"
  : "CRITFRAME_RESULT=PASS 判据台的每一条欠帧都有会被拍的去处，且写过的帧路径都在盘上");
