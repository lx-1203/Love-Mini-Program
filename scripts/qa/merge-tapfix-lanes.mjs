#!/usr/bin/env node
/* 合并并**独立复核**各 lane 交回来的"交互判点点名"结果。
   为什么不直接信 lane：lane 的输出是一条判据被改写后的样子，它一旦写错，
   下一轮执行器就会拿着不存在的类名去点，点不到 ⇒ 又被读成"产品没做"。
   所以这里逐条重做三件事，全部用文件现场重算，不看 lane 的自述：
     1. selector 真的出现在它声称的 file 的那一行（行号对得上、类名逐字对得上）；
     2. lane 的 planned 与普查表里该页的 missing 条数一致，且 planned == ok + unverifiable；
     3. lane 声称的 id 确实在这条页的 missing 清单里（防止凭空多写或漏写）。
   通过校验的条目可以 --apply 写回判据台（ops/*.json 的 action 字段，带备份）；
   不通过的条目一律不写，并把拒绝原因打出来。
   用法：node scripts/qa/merge-tapfix-lanes.mjs [--lanes a,b,c] [--apply] */
import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const APPLY = argv.includes("--apply");
const CENSUS = resolve(REPO, arg("census", "reports/audit/round-7/tap-target-census.json"));
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const OUT = resolve(REPO, "reports/audit/round-7");
const laneFiles = (arg("lanes", "") || "").split(",").map((s) => s.trim()).filter(Boolean)
  .map((s) => resolve(REPO, s));
/* 默认扫描要**递归**：lane 产物按批次摊在 tapfix-briefs/NN/ 下面，
   只扫根目录会静默漏掉整批（"零条通过"与"根本没看见"在两版里长得一样）。 */
const walk = (dir) => {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/^tapfix-lane-.*\.json$/.test(e.name)) out.push(p);
  }
  return out;
};
const found = laneFiles.length ? laneFiles : walk(OUT);

if (!existsSync(CENSUS)) { console.log("TAPFIX_RESULT=FAIL reason=普查表不存在 " + CENSUS); process.exit(2); }
if (!found.length) { console.log("TAPFIX_RESULT=FAIL reason=没有任何 lane 产物（tapfix-lane-*.json），空集合不许当通过"); process.exit(2); }

const census = JSON.parse(readFileSync(CENSUS, "utf8"));
const censusPages = new Map((census.pages || []).map((p) => [p.page, p]));
/* 判据台全文是唯一权威：简报里抄给 lane 的 oldAction 曾被普查截断过，
   拿截断文当底改写再落盘，等于把一条长判据换成短句 ⇒ 断掉的那半条从此没人测。
   这里落盘前逐条与 ops 现文比对，丢了原文字符的一律不采信。 */
const opsCache = new Map();
const opsCase = (mf, id) => {
  const key = String(mf || "").replace(/\.json$/, "");
  if (!opsCache.has(key)) {
    const f = join(OPS, key + ".json");
    opsCache.set(key, existsSync(f) ? new Map((JSON.parse(readFileSync(f, "utf8")).cases || []).map((c) => [c.id, c])) : null);
  }
  const m = opsCache.get(key);
  return m ? (m.get(id) || null) : null;
};
const norm = (s) => String(s || "").replace(/[\s\u3000]+/g, "");
const lostChars = (a, b) => {
  const bag = new Map();
  for (const ch of norm(a)) if (/[\p{Script=Han}\p{L}\p{N}]/u.test(ch)) bag.set(ch, (bag.get(ch) || 0) + 1);
  for (const ch of norm(b)) if (bag.get(ch) > 0) bag.set(ch, bag.get(ch) - 1);
  let n = 0; const ex = [];
  for (const [ch, k] of bag) if (k > 0) { n += k; if (ex.length < 12) ex.push(ch); }
  return { n, ex: ex.join("") };
};
const srcCache = new Map();
const readSrc = (rel) => {
  if (!srcCache.has(rel)) {
    const f = join(REPO, rel);
    srcCache.set(rel, existsSync(f) ? readFileSync(f, "utf8").replace(/\r\n/g, "\n").split("\n") : null);
  }
  return srcCache.get(rel);
};

const accepted = [], rejected = [];
for (const lf of found) {
  const tag = lf.split(/[\\/]/).pop();
  if (!existsSync(lf)) { rejected.push({ lane: tag, id: "(整份)", why: "文件不存在" }); continue; }
  let lane;
  try { lane = JSON.parse(readFileSync(lf, "utf8")); } catch (e) { rejected.push({ lane: tag, id: "(整份)", why: "读不出 JSON：" + String(e.message).slice(0, 60) }); continue; }
  const cp = censusPages.get(lane.lane);
  if (!cp) { rejected.push({ lane: tag, id: "(整份)", why: "普查表里没有这一页：" + lane.lane }); continue; }
  const missingIds = new Set((cp.missing || []).map((m) => m.id));
  const planned = (cp.missing || []).length;
  const ok = (lane.cases || []).length, unf = (lane.unverifiable || []).length;
  console.log("TAPFIX_LANE " + tag + " 页=" + lane.lane + " 普查应补=" + planned +
    " lane自报[planned=" + (lane.counts && lane.counts.planned) + ",ok=" + ok + ",unverifiable=" + unf + "]" +
    " 实际 ok+unverifiable=" + (ok + unf));
  /* 守恒按"普查应补"这条硬线判，不按 lane 自报的数字：自报的 planned 写错时，
     只比 lane 内部三个数会一样"闭合"。 */
  /* 守恒从"条数相等"换成"普查点名要的每条都被覆盖"。
     2026-09-27 放宽 classesOf/动词轴之后，普查的待补集从 223 缩到 76，于是"lane 交了 11 条、普查只要 4 条"
     这种**多做**会被相等判据整份否掉 —— 相等只是集合相等的一个代理，代理失效时要用真集合。
     仍然硬拒的情形：普查要的某条 lane 根本没交（那是真缺口）。多交的部分照常逐条回源核，并打印 SURPLUS 让人看得见。 */
  const demanded = new Set((cp.missing || []).map((m) => String(m.id)));
  const delivered = new Set((lane.cases || []).map((m) => String(m.id)).concat((lane.unverifiable || []).map((m) => String(typeof m === "string" ? m : (m && m.id) || ""))));
  const lacked = [...demanded].filter((x) => !delivered.has(x));
  const surplus = [...delivered].filter((x) => !demanded.has(x));
  if (lacked.length) {
  if (surplus.length) console.log("TAPFIX_SURPLUS " + tag + " 多交=" + surplus.length + " 条（普查放宽后不再要求，仍逐条回源核，不因此整份作废）：" + surplus.slice(0, 8).join(",") + (surplus.length > 8 ? " …" : ""));
    rejected.push({ lane: tag, id: "(整页)", why: "普查要补的 " + demanded.size + " 条里有 " + lacked.length + " 条 lane 根本没交：" + lacked.slice(0, 6).join(",") + (lacked.length > 6 ? " …" : "") + " ⇒ 整份不采信" });
    continue;
  }
  if (lane.counts && lane.counts.planned !== planned) {
    console.log("TAPFIX_WARN " + tag + " 自报 planned=" + lane.counts.planned + " 与普查 " + planned + " 不符（以普查为准）");
  }
  const surplusIds = new Set();
  const unvOffList = [];
  for (const c of (lane.cases || [])) {
    const why = [];
    /* 普查放宽口径后，lane 多交的名字不再算"整页作废"：多给一个权威 tapTarget 比让执行器去猜正文里的类名更准，
       所以按 surplus 收下并打上出处；仍然要过下面那几条硬校验（选择器形态、源码行号逐字、事件绑定）。
       真正的缺口是反方向 —— 普查要的没交，那才整份不采信（上面 lacked 已经拦了）。 */
    if (!missingIds.has(c.id)) surplusIds.add(c.id);
    if (!/^\.[A-Za-z][\w-]*([.#][\w-]+)*$/.test(String(c.selector || ""))) why.push("selector 形态不对：" + c.selector);
    const lines = readSrc(c.file || "");
    if (!lines) why.push("承载文件读不到：" + c.file);
    else {
      const ln = Number(c.line);
      if (!(ln >= 1 && ln <= lines.length)) why.push("行号越界：" + c.line);
      else if (!String(lines[ln - 1]).includes(String(c.selector).replace(/^\./, "").split(/[.#]/)[0])) why.push("第 " + c.line + " 行里没有这个类名片段");
      if (!lines.join("\n").includes(String(c.selector).replace(/^\./, ""))) why.push("整份文件里没有这个类名");
    }
    if (!c.newAction || !String(c.newAction).includes(String(c.selector || "@@none@@"))) why.push("newAction 没点名 selector");
    /* 语义守恒：补目标不许顺手换动词。实测有 lane 为了让执行器走点击腿，
       把「输入 xxx」改写成「预置/敲 xxx」——那等于把一条输入框判据改成了按钮判据，
       通过率低是因为测错了东西，而不是东西没做。动词必须逐字保留。 */
    const VERBS = ["点击", "输入", "长按", "双击", "滚动", "滑动", "拖动", "下拉", "勾选", "聚焦", "失焦"];
    const oldVerbs = VERBS.filter((v) => String(c.oldAction || "").includes(v));
    const newVerbs = VERBS.filter((v) => String(c.newAction || "").includes(v));
    const lost = oldVerbs.filter((v) => !newVerbs.includes(v));
    const added = newVerbs.filter((v) => !oldVerbs.includes(v));
    if (lost.length || added.length) {
      why.push("改写换了交互动词（丢了：" + (lost.join("/") || "无") + "；多了：" + (added.join("/") || "无") + "）⇒ 判据测的东西被换了，不接受");
    }
    /* 与判据台现文比对：lane 交回来的 newAction 必须还装得下原文。
       普查→简报→lane 这条链上老判据被截断过一次（实测有 lane 拿截断文本当底改写并主动报了警），
       直接落盘就会把长判据的尾巴静默删掉。允许 ≤3 个字的同义改写，多的按"丢了原文"拒。 */
    const oc = opsCase(c.manifest, c.id);
    if (!oc) why.push("判据台（" + c.manifest + "）里没有这个 id ⇒ 落盘无处可写");
    else {
      if (String(oc.action || "").replace(/\s+/g, "") !== String(c.oldAction || "").replace(/\s+/g, "")) {
        console.log("TAPFIX_WARN_OLDACT " + c.id + " lane 抄的 oldAction 与判据台现文不一致（多半是简报截断）⇒ 以现文为准核 newAction");
      }
      const lc = lostChars(String(oc.action || ""), String(c.newAction || ""));
      if (lc.n > 3) why.push("newAction 丢了判据台原文的 " + lc.n + " 个字（[" + lc.ex + "]）⇒ 不许用更短的句子替换原判据");
    }
    if (why.length) rejected.push({ lane: tag, id: c.id, why: why.join(" / "), selector: c.selector, file: c.file, line: c.line });
    else accepted.push({ lane: tag, id: c.id, manifest: c.manifest, page: lane.lane, selector: c.selector, oldAction: c.oldAction, newAction: c.newAction, file: c.file, line: c.line, needsIdentity: c.needsIdentity || "", surplus: surplusIds.has(c.id) });
  }
  if (unvOffList.length) console.log("TAPFIX_UNVER_OFFLIST " + tag + " " + unvOffList.length + " 条被标 unverifiable 但普查已不点名（口径放宽后不再是欠账，忽略但不隐瞒：" + unvOffList.slice(0, 8).join(",") + (unvOffList.length > 8 ? " …" : "") + "）");
  for (const u of (lane.unverifiable || [])) {
    if (!missingIds.has(u.id)) unvOffList.push(u.id);
  }
}

console.log("TAPFIX_ACCEPTED=" + accepted.length + " REJECTED=" + rejected.length +
  " 普查缺口=" + (census.totals ? census.totals.actionMissingSelector : "?"));
for (const r of rejected.slice(0, 25)) console.log("TAPFIX_REJECT " + r.lane + " " + r.id + " :: " + r.why);
/* dry 也必须落一份文件才看得了逐条理由，但不能占住 `tapfix-merged.json` 这个名字：
   `emit-tapfix-register.mjs` 读的就是这个名字，一张没人核对过的计划不该冒充已核对的计划。 */
const PLAN_FILE = join(OUT, APPLY ? "tapfix-merged.json" : "tapfix-merged.dry.json");
writeFileSync(PLAN_FILE, JSON.stringify({
  generatedAt: new Date().toISOString(), mode: APPLY ? "apply" : "dry",
  census: CENSUS.replace(REPO + "/", "").split("\\").join("/"),
  lanes: found.map((f) => f.replace(REPO + "/", "").split("\\").join("/")),
  accepted, rejected,
}, null, 1));
console.log("TAPFIX_WRITTEN=" + PLAN_FILE);

if (!APPLY) { console.log("TAPFIX_RESULT=DRY 只出计划；核对过再自己加 --apply"); process.exit(0); }
if (!accepted.length) { console.log("TAPFIX_RESULT=FAIL reason=零条通过校验，ops 一个字都不改"); process.exit(2); }
const byManifest = new Map();
for (const a of accepted) {
  if (!byManifest.has(a.manifest)) byManifest.set(a.manifest, []);
  byManifest.get(a.manifest).push(a);
}
let written = 0;
for (const [rawMf, items] of byManifest) {
  /* 普查给出来的 manifest 带 .json 尾巴（本轮 54 个页全是），
     上一版在这里再拼一次 .json ⇒ 拼出 PAGES-X.json.json，整批读不到、
     只在 --apply 那一步才炸。 */
  const mf = String(rawMf || "").replace(/.json$/, "");
  const f = join(OPS, mf + ".json");
  if (!existsSync(f)) { console.log("TAPFIX_SKIP_MANIFEST 读不到 " + mf + ".json"); continue; }
  /* 备份名必须唯一：上一波已经用过 .pre-tapfix.bak，直接覆写会把
     "改动前"的更早状态冲掉，事后就没法比对判据原文了。 */
  let bak = f + ".pre-tapfix.bak";
  for (let i = 2; existsSync(bak); i++) bak = f + ".pre-tapfix." + i + ".bak";
  copyFileSync(f, bak);
  const j = JSON.parse(readFileSync(f, "utf8"));
  const want = new Map(items.map((x) => [x.id, x]));
  for (const c of (j.cases || [])) {
    const hit = want.get(c.id);
    if (!hit) continue;
    if (c.actionPreTapfix === undefined) c.actionPreTapfix = c.action;
    c.action = hit.newAction;
    c.tapTarget = hit.selector;
    c.tapTargetEvidence = hit.file + ":" + hit.line;
    if (hit.needsIdentity) c.needsIdentity = hit.needsIdentity;
    want.delete(c.id);
  }
  if (want.size) { console.log("TAPFIX_MISSING " + mf + " 有 " + want.size + " 个 id 在该 manifest 里找不到：" + [...want.keys()].join(",")); continue; }
  writeFileSync(f, JSON.stringify(j, null, 1) + "\n");
  written += items.length;
  console.log("TAPFIX_APPLIED " + mf + " 改写=" + items.length + " 备份=" + bak.split(/[\\/]/).pop() +
    "（已有 .bak 时自动续号，不覆盖上一波的改动前状态）");
}
console.log("TAPFIX_RESULT=" + (written ? "OK" : "FAIL") + " 落盘 action 条数=" + written + "（被拒 " + rejected.length + " 条未改）");
process.exit(written ? 0 : 2);
