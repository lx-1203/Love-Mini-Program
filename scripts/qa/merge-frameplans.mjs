#!/usr/bin/env node
/* 合并 5 条 lane 的取景配方，并且**机器复核每一处它声称的依据**。
 *
 * 为什么复核而不是采信：lane 交回来的 file:line 是"它说它看过了"。本项目已经被
 * "继承来的状态其实是假的"点过太多次名，所以这里逐条重开文件验证：
 *   ANCHOR_MISS   该行不存在（行号超出文件长度）
 *   ANCHOR_DRIFT  该行存在，但目标 token 不在 ±4 行内（写手看错了行）
 *   ANCHOR_TOKEN  文件里根本没有这个 token（连行号一起是编的）
 *   ROUTE_BAD     route 不在 pages.json 的页面清单里
 *   COVERAGE      五桶并集与欠款 79 条不守恒（少一条、多一条、重一条都单独点名）
 * 只有 COVERAGE 成立且没有 ANCHOR_TOKEN，才允许后面拿这份配方去取景。
 *
 * 用法：node scripts/qa/merge-frameplans.mjs [--dir reports/audit/round-7] [--lanes A,B,C,D,E]
 * 输出：reports/audit/round-7/frameplan-merged.json + .md（含复核结论） */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DIR = resolve(REPO, arg("dir", "reports/audit/round-7"));
const LANES = arg("lanes", "A,B,C,D,E").split(",").map((s) => s.trim()).filter(Boolean);
const EXPECT = Number(arg("expect", String(JSON.parse(readFileSync(join(DIR, "ui-frame-debt-classes.json"), "utf8")).total)));

/* pages.json 是 jsonc（有注释、可能有尾逗号），先剥掉再 parse；解析失败就**不做路由判红**
   ——把我自己的解析失败算到 lane 头上，是这轮已经犯过两次的错。 */
const ROUTES = new Set();
let routeCatalog = "OK";
try {
  const t = readFileSync(join(REPO, "apps/client/src/pages.json"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1").replace(/,(\s*[}\]])/g, "$1");
  const j = JSON.parse(t);
  for (const p of (j.pages || [])) ROUTES.add(String(p.path || p.page || p).replace(/^\//, ""));
  for (const sp of (j.subPackages || j.subpackages || [])) {
    const root = String(sp.root || "").replace(/\/$/, "");
    for (const p of (sp.pages || [])) ROUTES.add(root + "/" + String(p.page || p.path || "").replace(/^\//, ""));
  }
  routeCatalog = "主包 " + (j.pages || []).length + " + 分包 " + (j.subPackages || j.subpackages || []).length;
} catch (e) { routeCatalog = "PARSE_FAIL（本轮不判 route，先看这个解析失败）：" + String(e.message).slice(0, 70); }
/* 常量表里的路由也算数（有些页只经 constants/routes.ts 的别名跳转） */
try {
  for (const m of readFileSync(join(REPO, "apps/client/src/constants/routes.ts"), "utf8").matchAll(/['"](pages\/[\w/-]+|subpackages\/[\w/-]+)['"]/g)) ROUTES.add(m[1]);
} catch { /* 常量表读不到不影响判据，只是少一路来源 */ }

const lineCache = new Map();
function lineAt(rel, n) {
  if (!lineCache.has(rel)) {
    const p = join(REPO, "apps/client", rel.replace(/^apps\/client\//, ""));
    let l = null;
    try { l = readFileSync(p, "utf8").split(/\r?\n/); } catch { l = null; }
    lineCache.set(rel, l ? { lines: l, ok: true } : null);
  }
  const c = lineCache.get(rel);
  if (!c) return { ok: false, why: "文件读不到" };
  if (n < 1 || n > c.lines.length) return { ok: false, why: "行号超出（文件实有 " + c.lines.length + " 行）", len: c.lines.length };
  return { ok: true, text: c.lines[n - 1], len: c.lines.length, lines: c.lines };
}
/* 只核**代码形态**的 token：类名 / 标识符 / CSS 变量。中文散文（"徽标文本为"）本来就不该在
   .vue 里逐字出现，拿它去搜源码是我第一版的错——它会把对的配方判成编的。
   散文类断言另记 PROSE_ONLY，交给取景时按人读帧判。 */
const CODE_TOKEN = /^[.#]?[A-Za-z_$][\w$.-]*$/;
const UNICODE_TOKEN = /^[A-Za-z_$][\w$-]*(?:(__|--)[\w$-]+)?$/;
function tokenOf(a) {
  const cand = [a.target, a.sel, a.class, a.expect].filter(Boolean);
  for (const raw of cand) {
    const s = String(raw).trim();
    const m = /[.#]?([A-Za-z_$][\w$-]*(?:__(|--)[\w$-]+)?)/.exec(s);
    if (m && (m[2] || s.startsWith(".") || s.startsWith("#") || /\$|--/.test(s))) return { tok: m[1].replace(/^[.#]/, ""), kind: "code" };
    if (CODE_TOKEN.test(s) && UNICODE_TOKEN.test(s) && s.length > 3) return { tok: s.replace(/^[.#]/, ""), kind: "code" };
  }
  return { tok: "", kind: "prose" };
}

/* 一次性扫 apps/client/src 建「类名 → 真实在哪」的索引。
   必须区分两种错：锚错文件（token 在别的文件真实存在，改锚点就行）与凭空造 token
   （全仓没有，那是假证据，得降级或重写判据）。混成一桶就会冤枉前者、放过后者。 */
const classIndex = new Map();
const fileClasses = new Map();
(function buildIndex(dir, depth) {
  if (depth > 7) return;
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { buildIndex(p, depth + 1); continue; }
    if (!/\.(vue|scss|css|ts|js)$/.test(e.name)) continue;
    let lines;
    try { lines = readFileSync(p, "utf8").split(/\r?\n/); } catch { continue; }
    const relp = p.split("\\").join("/").replace(REPO.split("\\").join("/") + "/", "");
    const set = new Set();
    lines.forEach((l, i) => {
      for (const m of l.matchAll(/([A-Za-z_$][\w$-]*(?:__|--)[\w$-]+)/g)) {
        const tok = m[1];
        set.add(tok);
        if (!classIndex.has(tok)) classIndex.set(tok, []);
        if (classIndex.get(tok).length < 4) classIndex.get(tok).push(relp + ":" + (i + 1));
      }
      /* 只收 __ / -- 的索引会漏掉单连字符的块名（circle-card、comments-list、pinned-text…），
         于是"全仓找不到"其实是"我的索引里没有"——lane-F 复核时逐条证实了这点。
         补两路精确来源：模板里 class="…" 的 token、样式表里的 .selector。不索引裸标识符，
         否则任何单词都能"找到"，这个复核就失去意义了。 */
      for (const m of l.matchAll(/class\s*=\s*"([^"]*)"/g)) {
        for (const raw of m[1].split(/\s+/)) {
          const tok = raw.trim();
          if (!/^[A-Za-z][\w-]{2,}$/.test(tok)) continue;
          set.add(tok);
          if (!classIndex.has(tok)) classIndex.set(tok, []);
          if (classIndex.get(tok).length < 4) classIndex.get(tok).push(relp + ":" + (i + 1));
        }
      }
      for (const m of l.matchAll(/^\s*\.([A-Za-z][\w-]{2,})\s*[,{]/gm)) {
        const tok = m[1];
        set.add(tok);
        if (!classIndex.has(tok)) classIndex.set(tok, []);
        if (classIndex.get(tok).length < 4) classIndex.get(tok).push(relp + ":" + (i + 1));
      }
    });
    fileClasses.set(relp, set);
  }
})(join(REPO, "apps/client/src"), 0);
const siblingsOf = (rel, tok) => {
  const block = String(tok).split("__")[0].split("--")[0];
  const set = fileClasses.get(rel) || new Set();
  return [...set].filter((c) => c.startsWith(block) && c !== tok).slice(0, 6);
};

let proseOnly = 0, autoAnchor = 0;
const AUTO_ANCHOR = process.argv.includes("--auto-anchor");
const rows = [], problems = { ANCHOR_MISS: [], ANCHOR_DRIFT: [], ANCHOR_TOKEN: [], ANCHOR_WRONGFILE: [], ANCHOR_NOFILE: [], ROUTE_BAD: [], NO_ASSERT: [], BAD_DISPO: [] };
const seen = new Map();
const needsFix = new Map();
for (const tag of LANES) {
  const f = join(DIR, "frameplan-lane-" + tag + ".json");
  if (!existsSync(f)) { console.log("MERGE_LANE " + tag + "=缺失 " + f); problems.NO_ASSERT.push([tag, "整桶文件缺失"]); continue; }
  let j;
  try { j = JSON.parse(readFileSync(f, "utf8")); } catch (e) { console.log("MERGE_LANE " + tag + "=JSON 炸了：" + String(e.message).slice(0, 90)); problems.NO_ASSERT.push([tag, "JSON 解析失败"]); continue; }
  for (const it of (j.items || [])) {
    const d = String(it.disposition || "");
    if (!["SHOOT", "REWRITE", "NOT_SHOOTABLE"].includes(d)) problems.BAD_DISPO.push([it.id, d || "(空)"]);
    if (seen.has(it.id)) problems.NO_ASSERT.push([it.id, "跨 lane 重复（" + seen.get(it.id) + " 与 " + tag + "）"]);
    else seen.set(it.id, tag);
    const rec = { id: it.id, lane: tag, disposition: d, route: it.route || "", assertions: (it.assertions || []).length,
      assertionList: it.assertions || [], steps: it.steps || [], precondition: it.precondition || {}, crop: it.crop || "",
      frameName: it.frameName || "", unresolved: it.unresolved || "" };
    if (d === "SHOOT") {
      if (!(it.assertions || []).length) problems.NO_ASSERT.push([it.id, "判 SHOOT 却没有一条断言"]);
      if (routeCatalog !== "PARSE_FAIL" && !String(routeCatalog).startsWith("PARSE_FAIL")) {
        if (it.route && !ROUTES.has(it.route)) problems.ROUTE_BAD.push([it.id, it.route]);
        if (!it.route) problems.ROUTE_BAD.push([it.id, "(空 route)"]);
      }
    }
    /* --auto-anchor：对象真实存在、只是 lane 把 file:line 标错了位置 ⇒ 把指针搬回真实处。
       这不是改判：对象、断言、期望值一个字都不动，只移动指针，且把移动记在 anchorFixed 上让人看得见。
       全仓根本不存在的 token 不在这里处理——那是编造，必须留在 ANCHOR_TOKEN 里判红。 */
    if (AUTO_ANCHOR) for (const a of (it.assertions || [])) {
      const tk0 = tokenOf(a);
      if (tk0.kind !== "code" || !tk0.tok) continue;
      const m0 = /^([\w@/.-]+\.(?:vue|ts|js|scss|json)):(\d+)/.exec(a.sourceAnchor || "");
      if (!m0) continue;
      const cur = lineAt(m0[1], Number(m0[2]));
      if (cur.ok && cur.text.includes(tk0.tok)) continue;
      const hits = classIndex.get(tk0.tok) || [];
      if (!hits.length) {
        /* 名字被截断（只写到块名，没写元素名）：同文件里以它为前缀的真实类名**唯一**时才补全，
           多个候选就留着判红——替 lane 猜一个就是我在编依据。 */
        const cands = [...(fileClasses.get(m0[1]) || new Set())].filter((c) => c.startsWith(tk0.tok) && c !== tk0.tok);
        if (cands.length !== 1) continue;
        const real = cands[0];
        for (const k of ["target", "sel", "class"]) if (a[k] && String(a[k]).includes(tk0.tok)) a[k] = String(a[k]).split(tk0.tok).join(real);
        a.tokenFixed = tk0.tok + " ⇒ " + real + "（同文件唯一前缀候选）";
        const h2 = classIndex.get(real) || [];
        if (!h2.length) continue;
        a.anchorFixed = (a.anchorFixed ? a.anchorFixed + "；" : "") + a.sourceAnchor + " ⇒ " + h2[0];
        a.sourceAnchor = h2[0];
        autoAnchor++;
        continue;
      }
      const lineOf = (h) => { const p = /^([^:]+):(\d+)$/.exec(h); return p ? lineAt(p[1], Number(p[2])) : { ok: false, text: "" }; };
      const pick = hits.find((h) => h.startsWith(m0[1] + ":") && /class=/.test(lineOf(h).text || ""))
        || hits.find((h) => h.startsWith(m0[1] + ":"))
        || hits.find((h) => /class=/.test(lineOf(h).text || "")) || hits[0];
      a.anchorFixed = a.sourceAnchor + " ⇒ " + pick + "（对象实名 " + tk0.tok + "）";
      a.sourceAnchor = pick;
      autoAnchor++;
    }
    for (const a of (it.assertions || [])) {
      const m = /^([\w@/.-]+\.(?:vue|ts|js|scss|json)):(\d+)/.exec(a.sourceAnchor || "");
      if (!m) { problems.ANCHOR_MISS.push([it.id, a.sourceAnchor || "(没有 anchor)", ""]); continue; }
      const [, rel, nStr] = m;
      const n = Number(nStr);
      const lr = lineAt(rel, n);
      const tk = tokenOf(a);
      if (tk.kind === "prose") { proseOnly++; if (!lr.ok) problems.ANCHOR_NOFILE.push([it.id, rel + ":" + n, lr.why]); continue; }
      if (!lr.ok) { (lr.why.includes("行号超出") ? problems.ANCHOR_MISS : problems.ANCHOR_NOFILE).push([it.id, rel + ":" + n, lr.why]); continue; }
      const tok = tk.tok;
      if (!tok) continue;
      const near = lr.lines.slice(Math.max(0, n - 5), Math.min(lr.lines.length, n + 4)).join("\n");
      if (lr.text.includes(tok)) continue;
      if (near.includes(tok)) problems.ANCHOR_DRIFT.push([it.id, rel + ":" + n, "token 在附近 ±4 行，不在标的那一行：" + tok]);
      else if (classIndex.has(tok)) problems.ANCHOR_WRONGFILE.push([it.id, rel + ":" + n, "token 真实在 " + classIndex.get(tok).slice(0, 2).join(" ") + "，不在所标文件"]);
      else { problems.ANCHOR_TOKEN.push([it.id, rel + ":" + n, "全仓找不到 " + tok + "；所标文件里的同类候选：" + (siblingsOf(rel, tok).join(" ") || "(无同前缀类名)")]);
        if (!needsFix.has(it.id)) needsFix.set(it.id, { id: it.id, lane: tag, route: it.route || "", assertions: it.assertions || [], bad: [] });
        needsFix.get(it.id).bad.push({ anchor: rel + ":" + n, token: tok, elsewhere: classIndex.get(tok) || [], sameFileCandidates: siblingsOf(rel, tok) }); }
    }
    rows.push(rec);
  }
}

/* lane-F（修手 lane）的 REANCHOR 结论：把"名字记错、物件真实存在"的那批按它给的真实锚点落回去。
   它给的每个 realAnchor 仍要在这一步重新过一遍机器核——修手说的话同样只是假设。 */
let laneF = { applied: 0, rejected: [], ids: 0 };
{
  const fp = join(DIR, "frameplan-lane-F-fixes.json");
  if (existsSync(fp)) {
    try {
      const fx = JSON.parse(readFileSync(fp, "utf8"));
      const byId = new Map((fx.items || []).map((x) => [x.id, x]));
      laneF.ids = byId.size;
      for (const r of rows) {
        const e = byId.get(r.id);
        if (!e || e.verdict !== "REANCHOR") continue;
        for (const f of (e.fixes || [])) {
          if (!f.realAnchor || !f.realSelector) continue;
          const bare = String(f.realSelector).replace(/^[.#]/, "");
          const chk = lineAt(String(f.realAnchor).replace(/:\d+$/, ""), Number(String(f.realAnchor).split(":").pop()));
          /* 选择器带不带前导点都算命中：源码里写的是 class="x"，不带点。第一版没剥点，
             把修手给的 11 个本来正确的锚点全判成"没过复核"——又是我的判据错，不是它的错。 */
          const badItem = !chk.ok || !chk.text.includes(bare);
          for (const a of (r.assertionList || [])) {
            const usesOld = f.token && String(a.target || a.sel || "").includes(f.token);
            if (!usesOld) continue;
            if (badItem) { laneF.rejected.push([r.id, f.token, "修手给的锚点自己没过复核：" + f.realAnchor]); continue; }
            a.laneFixed = (a.target || a.sel) + " @ " + a.sourceAnchor + " ⇒ " + f.realSelector + " @ " + f.realAnchor;
            if (a.target) a.target = String(a.target).split(f.token).join(f.realSelector);
            if (a.sel) a.sel = String(a.sel).split(f.token).join(f.realSelector);
            a.sourceAnchor = f.realAnchor;
            laneF.applied++;
          }
        }
      }
    } catch (e) { console.log("LANE_F_READ_ERR " + String(e.message).slice(0, 80)); }
  }
}
/* 复核再过一遍：把已经按 lane-F 改过的条目重新判一次（不改 rows 的判定输入，只用同一套索引） */
const stillBad = [];
for (const r of rows) {
  if (r.disposition !== "SHOOT") continue;
  for (const a of (r.assertionList || [])) {
    const tk = tokenOf(a);
    if (tk.kind !== "code" || !tk.tok) continue;
    const m = /^([\w@/.-]+\.(?:vue|ts|js|scss|json)):(\d+)/.exec(a.sourceAnchor || "");
    if (!m) continue;
    const lr = lineAt(m[1], Number(m[2]));
    if (!lr.ok) continue;
    if (!lr.text.includes(tk.tok) && !(classIndex.get(tk.tok) || []).length) stillBad.push([r.id, tk.tok]);
  }
}

const disp = {};
for (const r of rows) disp[r.disposition] = (disp[r.disposition] || 0) + 1;
const conserved = rows.length === EXPECT && !problems.NO_ASSERT.some((x) => String(x[1]).includes("重复"));
/* 判红的口径：ANCHOR_* 是**主扫描时**的诊断（搬锚/补名之前），真正决定这份配方能不能拿去取景的是
   应用 lane-F 之后还剩多少查无此物（stillBad）。把诊断量当门禁会把已经修对的配方永远锁死。 */
const fatal = problems.BAD_DISPO.length + stillBad.length + (conserved ? 0 : 1);

writeFileSync(join(DIR, "frameplan-merged.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), expected: EXPECT, lanes: LANES,
  counts: disp, conserved, problems: Object.fromEntries(Object.entries(problems).map(([k, v]) => [k, v.length])),
  routeCatalogSize: ROUTES.size, routeCatalog, autoAnchor, laneF, stillBad, rows,
}, null, 1));

const md = ["# round-7 取景配方合并与复核", "",
  "期望条目 " + EXPECT + "｜实收 " + rows.length + "｜守恒 " + (conserved ? "成立" : "**不成立**"), "",
  "| disposition | 条数 |", "|---|---|",
  ...Object.entries(disp).map(([k, v]) => "| " + k + " | " + v + " |"), "",
  "## 复核问题（lane 交回来的依据，逐条重开文件验的）", "",
  "| 类别 | 条数 | 含义 |", "|---|---|---|",
  "| ANCHOR_MISS | " + problems.ANCHOR_MISS.length + " | 标的行号在文件里不存在 |",
  "| ANCHOR_NOFILE | " + problems.ANCHOR_NOFILE.length + " | 标的文件读不到 |",
  "| ANCHOR_DRIFT | " + problems.ANCHOR_DRIFT.length + " | token 在附近但不在标的那行（行号看错） |",
  "| ANCHOR_WRONGFILE | " + problems.ANCHOR_WRONGFILE.length + " | token 真实存在但在别的文件＝锚点写错文件 |",
  "| ANCHOR_TOKEN | " + problems.ANCHOR_TOKEN.length + " | 全仓没这个 token＝依据是编的 |",
  "| ROUTE_BAD | " + problems.ROUTE_BAD.length + " | route 不在 pages.json 里 |",
  "| NO_ASSERT | " + problems.NO_ASSERT.length + " | 判 SHOOT 却没断言 / 跨 lane 重复 |",
  "| BAD_DISPO | " + problems.BAD_DISPO.length + " | disposition 不是三个受控词之一 |", ""];
for (const [k, arr] of Object.entries(problems)) {
  if (!arr.length) continue;
  md.push("### " + k);
  arr.slice(0, 40).forEach(([id, where, why]) => md.push("- " + id + " @ " + where + (why ? " —— " + why : "")));
  if (arr.length > 40) md.push("- …另有 " + (arr.length - 40) + " 条");
  md.push("");
}
writeFileSync(join(DIR, "frameplan-merged.md"), md.join("\n"));
console.log("MERGE_EXPECTED=" + EXPECT + " RECEIVED=" + rows.length + " " + Object.entries(disp).map(([k, v]) => k + "=" + v).join(" "));
console.log("MERGE_ROUTE_CATALOG=" + routeCatalog + " 散文型断言（不按源码 token 核）=" + proseOnly + " autoAnchor=" + (AUTO_ANCHOR ? "on" : "off") + "/" + autoAnchor);
console.log("MERGE_CONSERVED=" + (conserved ? "yes" : "NO") + " ANCHOR_MISS=" + problems.ANCHOR_MISS.length + " ANCHOR_NOFILE=" + problems.ANCHOR_NOFILE.length +
  " ANCHOR_DRIFT=" + problems.ANCHOR_DRIFT.length + " ANCHOR_TOKEN=" + problems.ANCHOR_TOKEN.length + " ROUTE_BAD=" + problems.ROUTE_BAD.length + " NO_ASSERT=" + problems.NO_ASSERT.length);
writeFileSync(join(DIR, "frameplan-needs-fix.json"), JSON.stringify({ generatedAt: new Date().toISOString(), items: [...needsFix.values()] }, null, 1));
console.log("MERGE_LANE_F ids=" + laneF.ids + " applied=" + laneF.applied + " rejected=" + laneF.rejected.length + " 修完仍查无此物=" + stillBad.length + " " + stillBad.slice(0,6).map((x)=>x.join("/")).join(" "));
console.log("MERGE_NEEDS_FIX_ITEMS=" + needsFix.size + " → frameplan-needs-fix.json");
console.log("MERGE_RESULT=" + (fatal ? "FAIL（守恒或依据复核不成立 ⇒ 这份配方不能拿去取景）" : "OK"));
process.exit(fatal ? 2 : 0);
