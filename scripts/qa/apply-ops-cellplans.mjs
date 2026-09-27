#!/usr/bin/env node
/**
 * 把手写计划（scripts/qa/cellplan-round7-*.json）落进判据台正文 reports/audit/round-6/ops/*.json。
 *
 * 为什么不手改 JSON：这三份计划一共 30 行，改的是"执行器拿什么去点"的正文。手改会出两类事故，两类本轮都真发生过：
 *   1) 把名字改成一个产物里仍然不存在的类名 ⇒ 下一轮执行器还是点不到，又被读成"产品没做"。
 *      所以每个新名字必须在**两档产物的该页 wxml 里逐字命中**才允许落盘（只看 .vue 源码不算：
 *      动态拼出来的 class 在源码里在、在产物里不一定在）。
 *   2) 拿"这条判据不可自动化"当删条目的借口 ⇒ 1107 例总数悄悄变小，通过率却涨。
 *      所以 B 组只打标记（automatable:false + 理由 + 已核过的载体），条目一条都不增删，
 *      落盘前后各数一次用例总数，不守恒就 exit 1。
 *
 * 用法：node scripts/qa/apply-ops-cellplans.mjs [--plan a.json [--plan b.json ...]] [--bands p1,p2] [--apply]
 * 退出码：0=完成（或 dry 全部可落），1=有行被拒或不守恒 ⇒ 一条都不落盘，2=前置件缺失。
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const argAll = (k) => argv.map((a, i) => (a === "--" + k ? argv[i + 1] : null)).filter((x) => x !== null);
const OPS = resolve(REPO, "reports/audit/round-6/ops");
const BANDS = (argAll("bands").join(",") || "apps/client/dist/build/mp-weixin,apps/client/dist/build/mp-weixin-real")
  .split(",").map((s) => s.trim()).filter(Boolean).map((s) => resolve(REPO, s));
const APPLY = has("apply");
const KNOWN = ["plan", "bands", "apply"];
{
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log(`OPSCELL_RESULT=FAIL reason=未知旗标 ${bad.join(",")} ⇒ 本工具只认 ${KNOWN.join(",")}（被忽略的旗标会把"只落一半"当成落完）`); process.exit(2); }
}
const PLANS = (argAll("plan").length ? argAll("plan") : [
  "scripts/qa/cellplan-round7-deadselectors.json",
  "scripts/qa/cellplan-round7-login-skips.json",
  "scripts/qa/cellplan-round7-taptarget.json",
  "scripts/qa/cellplan-round7-recovered.json",
]).map((s) => resolve(REPO, s));

for (const b of BANDS) if (!existsSync(b)) { console.log(`OPSCELL_RESULT=FAIL reason=档位不存在 ${b}（没有档位就没法核名字，不许按"应该存在"落盘）`); process.exit(2); }
for (const p of PLANS) if (!existsSync(p)) { console.log(`OPSCELL_RESULT=FAIL reason=计划缺失 ${p}`); process.exit(2); }

/* 页 → 各档该页的 wxml 文本。读不到页文件是**拒绝理由**，既不按"名字不存在"也不按"检查通过"处理。 */
const wxmlCache = new Map();
function pageWxml(page) {
  if (wxmlCache.has(page)) return wxmlCache.get(page);
  const per = BANDS.map((b) => {
    const f = join(b, page + ".wxml");
    return { band: b.replace(REPO + "/", "").split("\\").join("/"), file: f, text: existsSync(f) ? readFileSync(f, "utf8") : null };
  });
  const res = { per, missing: per.filter((p) => p.text === null).map((p) => p.band) };
  wxmlCache.set(page, res);
  return res;
}
/* 产物 wxml 里 class 属性写的是裸名（class="campus-guide__btn press-feedback"），选择器带点。
   直接 includes(".campus-guide__btn") 永远不命中 —— 第一版就是这么把 9 条真名字全判成"产物里没有"的。
   所以：类名脱点查 class="…" 的属性值边界；id 选择器查 id="…"。 */
function tokenIn(text, tok) {
  if (tok.startsWith("#")) return text.includes(`id="${tok.slice(1)}"`);
  const bare = tok.startsWith(".") ? tok.slice(1) : tok;
  /* 逐个 class 属性按空白切开比整词，不做子串匹配：`.post-content` 命中 `post-content-extra` 那种
     前缀假阳性，上一版选择器门就是这么误判过的。 */
  for (const m of text.matchAll(/class="([^"]*)"/g)) if (m[1].split(/\s+/).includes(bare)) return true;
  return false;
}
function nameInBands(page, tok) {
  const w = pageWxml(page);
  if (w.missing.length) return { ok: false, why: `页 wxml 读不到：${w.missing.join("，")}`, hit: [] };
  const hit = w.per.filter((p) => tokenIn(p.text, tok)).map((p) => p.band);
  return { ok: hit.length === w.per.length, why: `只有 ${hit.length}/${w.per.length} 档逐字命中 ${tok}`, hit };
}

const ops = new Map();
function loadOps(manifest) {
  if (ops.has(manifest)) return ops.get(manifest);
  const file = join(OPS, manifest + ".json");
  if (!existsSync(file)) { const e = { file, j: null, cases: null }; ops.set(manifest, e); return e; }
  const j = JSON.parse(readFileSync(file, "utf8"));
  const e = { file, j, cases: (j.cases || []).length, next: JSON.parse(JSON.stringify(j)) };
  ops.set(manifest, e);
  return e;
}
const caseIn = (manifest, id) => {
  const e = loadOps(manifest);
  const c = e.j ? (e.j.cases || []).find((x) => String(x.id) === String(id)) : null;
  return { e, c: c ? { ref: e.next.cases.find((x) => String(x.id) === String(id)), orig: c } : null };
};

const A = [], B = [], refused = [], already = [];
const KNOWN_GROUPS = new Set(["A-add-tapTarget", "A-rename-to-real-name", "B-not-automatable", "B-criterion-targets-a-removed-feature"]);
const superseded = [];
for (const p of PLANS) {
  const tag = String(p).split(/[\\/]/).pop();
  const j = JSON.parse(readFileSync(p, "utf8"));
  for (const r of j["A-add-tapTarget"] || []) A.push({ ...r, _plan: tag, kind: "tapTarget" });
  for (const r of j["A-rename-to-real-name"] || []) A.push({ ...r, _plan: tag, kind: "rename", tapTarget: r.proposed });
  for (const r of j["B-not-automatable"] || []) B.push({ ...r, _plan: tag });
  for (const r of j["B-criterion-targets-a-removed-feature"] || [])
    for (const id of r.ids || (r.id ? [r.id] : [])) B.push({ manifest: r.manifest, id, _plan: tag, dead: r.dead, why: r.disposition || r.finding || r["why-not-just-rename"] || "" });
  for (const k of Object.keys(j)) {
    if (!Array.isArray(j[k]) || KNOWN_GROUPS.has(k) || k.startsWith("D-")) continue;
    /* 组名打错一个字（A-add-tapTaget…）⇒ 那一组静默贡献 0 行，门照样绿。宁可比计划严一格，不肯漏读。 */
    refused.push(`${tag} :: 有一个本工具读不到的数组组「${k}」（${j[k].length} 行）⇒ 不许当成空集`);
  }
  for (const r of Object.keys(j).filter((k) => k.startsWith("D-") && Array.isArray(j[k])).flatMap((k) => j[k].map((x) => ({ ...x, _plan: tag, _group: k }))))
    superseded.push(`${tag} [${r._group}] ${r.manifest || "?"}::${r.id || "?"} 撤下名=${r.droppedTapTarget || r.dead || "?"} 赢家=${r.winnerTapTarget || r.winner || "见 why"}`);
}

const todoA = [], todoB = [];
for (const r of A) {
  const { c } = caseIn(r.manifest, r.id);
  if (!c) { refused.push(`${r._plan} :: ${r.id} 判据台里没有这个 id（不许借落地之名新增判据）`); continue; }
  const page = c.orig.page || r.page;
  if (!page) { refused.push(`${r._plan} :: ${r.id} 推不出页路径 ⇒ 没法去产物里核名字`); continue; }
  const tok = String(r.tapTarget || "").trim();
  /* 允许 .class 与 #id：c.tapTarget 是执行器直接当选择器用的（不经类名抠取），
     所以 id 形态是合法的点名；其余形态（裸词、标签链）一律拒。 */
  if (!/^[.#][\w-]+$/.test(tok)) { refused.push(`${r._plan} :: ${r.id} tapTarget 不是 .class / #id 形态：${tok || "(空)"}`); continue; }
  /* 幂等：这一行已经落进正文了（带着本计划的落款 + 目标名一致）就跳过而不是判红。
     没有这一步，收口之后再跑一次会看见"正文里找不到那个死名字"⇒ 把"已经做完"报成"不合规"。 */
  const stamped = r.kind === "rename"
    ? (c.orig.cellplanRename && c.orig.cellplanRename.to === tok && c.orig.cellplanRename.from === r.dead)
    : c.orig.tapTargetFrom === r._plan;
  if (stamped && c.orig.tapTarget === tok) { already.push(`${r._plan} :: ${r.id} 已落地（${tok}）`); continue; }
  const chk = nameInBands(page, tok);
  if (!chk.ok) { refused.push(`${r._plan} :: ${r.id} 新名字在产物里不成立：${chk.why}（页 ${page}）`); continue; }
  if (r.kind === "rename") {
    const dead = String(r.dead || "").trim();
    if (!dead) { refused.push(`${r._plan} :: ${r.id} rename 组没给 dead 原名 ⇒ 改名会变成换判据`); continue; }
    if (!String(c.orig.action || "").includes(dead)) { refused.push(`${r._plan} :: ${r.id} 正文里找不到要点名的 ${dead}（正文已被改过？不许就地换判据）`); continue; }
    todoA.push(r);
    continue;
  }
  r._hit = chk.hit;
  todoA.push(r);
}
for (const r of B) {
  const { c } = caseIn(r.manifest, r.id);
  if (!c) { refused.push(`${r._plan} :: ${r.id} B 组：判据台里没有这个 id`); continue; }
  if (!String(r.why || "").trim()) { refused.push(`${r._plan} :: ${r.id} B 组：没有 why ⇒ "不可自动化"不许无理由盖章`); continue; }
  if (c.orig.automatable === false) {
    const also = c.orig.notAutomatableAlso || [];
    if (c.orig.notAutomatableFrom === r._plan || also.includes(r._plan)) { already.push(`${r._plan} :: ${r.id} 已盖章不可自动化`); continue; }
    /* 两份计划对同一条判出同样结论（不可自动化）：第一份的理由是逐字核过产物的那一份，
       后到的只补共章归因，绝不覆盖 ⇒ "谁先落章"可追溯，也不会被后来的计划悄悄换掉说辞。 */
    r._coStamp = true;
    todoB.push(r);
    continue;
  }
  todoB.push(r);
}

console.log(`OPSCELL 计划=${PLANS.length} 份｜A 组=${A.length} 行｜B 组=${B.length} 行｜其中已落地=${already.length} 待改=${todoA.length + todoB.length}｜拒绝=${refused.length}`);
for (const a of already) console.log("  ALREADY " + a);
for (const r of refused) console.log("  REFUSE " + r);
for (const s of superseded) console.log("  SUPERSEDED " + s);
/* 待改必须逐行报出名字：只报一个「待改=2」的计数，就无法证明幂等复跑收敛到了 0
   （数数不是证据，点名才是）。 */
for (const r of todoA) console.log(`  TODO A ${r._plan} :: ${r.id} ${r.kind === "rename" ? "rename " + String(r.dead).trim() + " → " : "tapTarget="}${String(r.tapTarget).trim()}`);
for (const r of todoB) console.log(`  TODO B ${r._plan} :: ${r.id} ${r._coStamp ? "补共章归因（首章=" + (caseIn(r.manifest, r.id).c.orig.notAutomatableFrom || "?") + "）" : "盖章不可自动化"}`);
if (refused.length) { console.log("OPSCELL_RESULT=FAIL reason=有不合规行 ⇒ ops 正文一条都不改（半份判据台比旧判据台更坏）"); process.exit(1); }
if (!todoA.length && !todoB.length) {
  if (already.length) { console.log(`OPSCELL_RESULT=PASS 计划 ${already.length} 行全部已在正文里，本轮无需改动（幂等复跑）`); process.exit(0); }
  console.log("OPSCELL_RESULT=FAIL reason=计划里一行都没有（空集不能当成「全部已落地」）"); process.exit(2);
}

/* 同一 (manifest,id) 被两份计划同时点名 ⇒ 必须点名谁赢，不能让"后写的吃掉先写的"变成隐式改判
   （merge-cellplans 对台账格子做的是同一件事，这里补 ops 这一半）。 */
{
  const seen = new Map();
  const clash = [];
  for (const r of todoA) {
    const key = r.manifest + "|" + r.id;
    const val = String(r.tapTarget || "");
    if (seen.has(key) && seen.get(key) !== val) clash.push(`${key}：${seen.get(key)} vs ${val}`);
    seen.set(key, val);
  }
  if (clash.length && !has("allow-conflict")) {
    console.log(`OPSCELL_RESULT=FAIL reason=跨计划撞号 ${clash.length} 处 ⇒ 一条都不落盘，先用 --allow-conflict 点名谁赢：`);
    for (const c of clash) console.log("  CONFLICT " + c);
    process.exit(1);
  }
  if (clash.length) console.log("OPSCELL_CONFLICT_ALLOWED 已放行 " + clash.length + " 处跨计划撞号（后落盘的赢）：" + clash.join(" ; "));
}
/* 全部改动先在内存里做完整份，再一次性落盘：半途 exit 不会留下"改了一半"的判据台。 */
for (const r of todoA) {
  const { c } = caseIn(r.manifest, r.id);
  const t = c.ref;
  if (r.kind === "rename") {
    if (t.actionPreCellplan === undefined) t.actionPreCellplan = t.action;
    t.action = String(t.action).split(r.dead).join(r.tapTarget);
    t.cellplanRename = { from: r.dead, to: r.tapTarget, source: `${r.file || "?"}:${r.line || "?"}`, evidence: String(r.evidence || "").slice(0, 400), plan: r._plan };
  }
  t.tapTarget = r.tapTarget;
  t.tapTargetFrom = r._plan;
  if (r.tapTargetEvidence) t.tapTargetEvidence = r.tapTargetEvidence;
  else if (r.file) t.tapTargetEvidence = `${r.file}:${r.line || "?"}`;
  else t.tapTargetEvidence = `产物逐字命中：${(r._hit || []).join("，")}`;
  if (r.confirmedAt) t.tapTargetConfirmedAt = r.confirmedAt;
  if (r.expectedQuote) t.tapTargetQuote = r.expectedQuote;
}
for (const r of todoB) {
  const { c } = caseIn(r.manifest, r.id);
  const t = c.ref;
  if (r._coStamp) {
    t.notAutomatableAlso = [...(t.notAutomatableAlso || []), r._plan];
    continue;
  }
  t.automatable = false;
  t.notAutomatableReason = String(r.why).slice(0, 600);
  if (r.carrierChecked) t.notAutomatableCarrier = String(r.carrierChecked).slice(0, 300);
  if (r.dead) t.notAutomatableDeadName = String(r.dead).slice(0, 200);
  if (r.page) t.notAutomatablePage = r.page;
  t.notAutomatableFrom = r._plan;
}

let totalBefore = 0, totalAfter = 0, touched = 0;
for (const [m, e] of ops) {
  if (!e.j) { refused.push(`读不到 ${m}.json（计划点名了它）`); continue; }
  totalBefore += e.cases;
  totalAfter += (e.next.cases || []).length;
  const changed = e.j !== e.next ? JSON.stringify(e.j) !== JSON.stringify(e.next) : false;
  if (changed) touched++;
}
if (refused.length) { console.log("OPSCELL_RESULT=FAIL reason=落盘前又发现缺件 ⇒ 一条都不改：" + refused.join(" / ")); process.exit(1); }
if (totalBefore !== totalAfter) { console.log(`OPSCELL_CONSERVATION 用例总数 ${totalBefore} → ${totalAfter} MISMATCH ⇒ 有条目被增删，本工具只许改正文与打标记`); process.exit(1); }
console.log(`OPSCELL_CONSERVATION 涉及 ${ops.size} 个 manifest 的用例总数=${totalAfter}（改前=${totalBefore}）OK｜其中被改动=${touched} 个（注意：这是"被点名的那些 manifest"的和，不是全库 1107）`);

if (!APPLY) {
  for (const [m, e] of ops) {
    const n = todoA.filter((x) => x.manifest === m).length, k = todoB.filter((x) => x.manifest === m).length;
    if (n || k) console.log(`  OPSCELL_DRY ${m} 拟改 tapTarget/rename=${n} 拟盖章=${k} 用例数=${e.cases}（不变）`);
  }
  console.log("OPSCELL_RESULT=DRY 只算账不落盘（核对过再自己加 --apply）");
  process.exit(0);
}
for (const [m, e] of ops) {
  const n = todoA.filter((x) => x.manifest === m).length, k = todoB.filter((x) => x.manifest === m).length;
  if (!n && !k) continue;
  let bak = e.file + ".pre-ops-cellplan.bak";
  for (let i = 2; existsSync(bak); i++) bak = e.file + `.pre-ops-cellplan.${i}.bak`;
  copyFileSync(e.file, bak);
  writeFileSync(e.file, JSON.stringify(e.next, null, 1) + "\n");
  console.log(`  OPSCELL_APPLIED ${m} A=${n} B=${k} 备份=${bak.split(/[\\/]/).pop()}`);
}
/* 落盘后复算要分两个宇宙，别拿"整个语料目录的总数"去比"本次点名到的那些 manifest 之和"：
   第一版就是这么写出一个永假的 MISMATCH（640 当然不等于 1107），把一次成功的落盘说成失败。
   现在两条各自成立：点名到的那些不许增删；整个目录必须仍是 1107 条。 */
let dirTotal = 0, dirFiles = 0;
for (const f of readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
  dirTotal += (JSON.parse(readFileSync(join(OPS, f), "utf8")).cases || []).length; dirFiles++;
}
let touchedAfter = 0;
for (const [, e] of ops) if (e.j) touchedAfter += (JSON.parse(readFileSync(e.file, "utf8")).cases || []).length;
const perOk = touchedAfter === totalAfter, dirOk = dirTotal === 1107;
console.log(`OPSCELL_REREAD 点名到的 ${ops.size} 个 manifest 用例数=${touchedAfter}（改前=${totalAfter}）${perOk ? "OK" : "MISMATCH"}｜全目录 ${dirFiles} 份=${dirTotal} ${dirOk ? "OK（=1107，没增删条目）" : "MISMATCH ⇒ 有条目被增删"}`);
const allOk = perOk && dirOk;
console.log(`OPSCELL_RESULT=${allOk ? "OK" : "FAIL"} 落盘完成；B 组盖章=${todoB.length} 条（另有 ${already.length} 行是复跑幂等跳过的）只打了标记没删条目。下一步：重新 --write 语料戳（#69）→ 重建三档产物 → 定向复测。`);
process.exit(allOk ? 0 : 1);
