#!/usr/bin/env node
/**
 * verify-fix-visibility.mjs —— 上一跑与这一跑的逐帧像素对照（MP-FIDELITY Phase F 的复验）。
 *
 * 要挡的事：泳道说"已修"，但**画面根本没变**。这个项目栽过的形近事故够多——
 * 按派单归档而不是按效果归档、"已修复（源码级判点）"在 126 条里量不到一个像素。
 * 所以复验不采信任何自述，只问一件事：这一帧的字节还是不是上一轮那一帧的字节。
 *
 * 三种读数，只有前两种算"改动可见"：
 *   FIX_VISIBLE        该页本轮被批次改过，且帧 hash 变了 ⇒ 画面确实不同（仍须人/泳道确认"改成对的了"）
 *   FIXNOTVISIBLE      该页本轮被批次改过，但帧 hash 与上一跑逐字节相同 ⇒ 改动没上屏，缺陷重开
 *   UNTOUCHED          该页没有任何批次动过 ⇒ 不判（不参与分子）
 *   NO_PREV / NO_CUR   两跑之一缺这一帧 ⇒ 读数缺口，不算"没变"也不算"变了"
 *
 * 用法：node scripts/qa/verify-fix-visibility.mjs --prev <R1/sweep-manifest.json> --cur <R2/...> --fixlist <fixlist-R1.json>
 *      node scripts/qa/verify-fix-visibility.mjs --self-test
 * 退出码：0 无 FIXNOTVISIBLE；1 有 FIXNOTVISIBLE（可红）；2 输入读不到。
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "FIXVIS_RESULT";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);

const keyOf = (r, f) => `${r}__${f.state}`;
function indexManifest(p) {
  const j = JSON.parse(p);
  const m = new Map();
  for (const rec of (j.results || [])) for (const f of (rec.frames || [])) m.set(keyOf(rec.route, f), f);
  return m;
}
/** 从 fixlist 里把"哪些路由被改过"推出来：批次的 pages[] 是权威（缺陷级归属），
 *  files[] 只用于点名是哪个文件改的。 */
function touchedRoutes(fixlist) {
  const set = new Map();
  for (const b of (fixlist.batches || [])) {
    for (const r of (b.pages || [])) {
      if (!set.has(r)) set.set(r, []);
      set.get(r).push(b.batch_id + "(" + (b.files || []).join(",") + ")");
    }
  }
  return set;
}

function judge(prev, cur, fixlist) {
  const P = indexManifest(prev), C = indexManifest(cur);
  const touched = touchedRoutes(fixlist);
  const rows = [];
  let visible = 0, notVisible = 0, untouched = 0, gaps = 0;
  const routes = new Set([...[...P.values()].map((f) => f.route), ...[...C.values()].map((f) => f.route)]);
  for (const route of [...routes].sort()) {
    const isTouched = touched.has(route);
    const states = new Set([...P.values()].filter((f) => f.route === route).map((f) => f.state)
      .concat([...C.values()].filter((f) => f.route === route).map((f) => f.state)));
    for (const st of states) {
      const pf = [...P.values()].find((f) => f.route === route && f.state === st);
      const cf = [...C.values()].find((f) => f.route === route && f.state === st);
      const hashOf = (f) => (!f || f.landingMismatch ? "" : String(f.contentHash || ""));
      const hp = hashOf(pf), hc = hashOf(cf);
      let verdict;
      if (!isTouched) verdict = "UNTOUCHED";
      else if (!hp || !hc) { verdict = !hp && !cf && !pf ? "NO_BOTH" : (hp ? "NO_CUR" : (hc ? "NO_PREV" : "NO_EVIDENCE")); gaps++; }
      else if (hp === hc) { verdict = "FIXNOTVISIBLE"; notVisible++; }
      else { verdict = "FIX_VISIBLE"; visible++; }
      if (verdict === "UNTOUCHED") untouched++;
      rows.push({ route, state: st, verdict, prev: hp.slice(0, 8), cur: hc.slice(0, 8), batches: isTouched ? touched.get(route).join(" ") : "" });
    }
  }
  const problems = rows.filter((r) => r.verdict === "FIXNOTVISIBLE");
  return { rows, problems, stats: { visible, notVisible, untouched, gaps, routes: routes.size } };
}

function selfTest() {
  const SRK = "FIXVIS_SELFTEST";
  const scratch = join(REPO, ".zcode", "tmp", "fix-vis-selftest");
  mkdirSync(scratch, { recursive: true });
  /* 夹具自身也要能错：这版原先把 fixlist 也用 mk() 写（mk 会把入参包成 {results:…}），
     于是 touched 恒空、四例里三例是"空读数蒙绿"，只有期望红的那例撞出来。
     manifest 与 fixlist 因此分成两个写入器，不再共用一个包装。 */
  const mk = (name, results) => { const p = join(scratch, name); writeFileSync(p, JSON.stringify({ results }), "utf-8"); return p; };
  const mkObj = (name, obj) => { const p = join(scratch, name); writeFileSync(p, JSON.stringify(obj), "utf-8"); return p; };
  const F = (route, state, h) => ({ route, state, contentHash: h, bytes: 9000 });
  const prev = mk("prev.json", [
    { route: "pages/a/index", frames: [F("pages/a/index", "top", "aaaa1111")] },
    { route: "pages/b/index", frames: [F("pages/b/index", "top", "bbbb2222")] },
    { route: "pages/c/index", frames: [F("pages/c/index", "top", "cccc3333")] },
  ]);
  const fix = mkObj("fix.json", { batches: [{ batch_id: "B01", files: ["apps/client/src/pages/a.vue"], pages: ["pages/a/index"] }, { batch_id: "B02", files: ["apps/client/src/pages/b.vue"], pages: ["pages/b/index"] }] });
  /* wantVisible 是**反空读数断言**：只期望"不红"会让夹具自己坏掉时也蒙绿（上一版就是这样）。
     所以每例同时钉住 visible 的期望值，touched 集一旦变空，第 1/2/4 例立刻转红。 */
  const cases = [
    ["改过的页帧变了 = FIX_VISIBLE", mk("cur-ok.json", [
      { route: "pages/a/index", frames: [F("pages/a/index", "top", "AAAA9999")] },
      { route: "pages/b/index", frames: [F("pages/b/index", "top", "BBBB8888")] },
      { route: "pages/c/index", frames: [F("pages/c/index", "top", "cccc3333")] },
    ]), fix, 0, 2],
    ["改过的页逐字节没变 = 必须红", mk("cur-same.json", [
      { route: "pages/a/index", frames: [F("pages/a/index", "top", "aaaa1111")] },
      { route: "pages/b/index", frames: [F("pages/b/index", "top", "bbbb2222")] },
      { route: "pages/c/index", frames: [F("pages/c/index", "top", "cccc3333")] },
    ]), fix, 2, 0],
    ["没批次动过的页不变 = 不判（UNTOUCHED）", mk("cur-unt.json", [
      { route: "pages/a/index", frames: [F("pages/a/index", "top", "aaaa1111")] },
      { route: "pages/b/index", frames: [F("pages/b/index", "top", "bbbb2222")] },
      { route: "pages/c/index", frames: [F("pages/c/index", "top", "cccc3333")] },
    ]), mkObj("fix-empty.json", { batches: [] }), 0, 0],
    ["这一跑缺帧 = 记缺口不记没变", mk("cur-miss.json", [
      { route: "pages/a/index", frames: [] },
      { route: "pages/b/index", frames: [F("pages/b/index", "top", "BBBB8888")] },
    ]), fix, 0, 1],
  ];
  let problems = 0;
  for (const [label, cur, fl, wantRed, wantVisible] of cases) {
    const r = judge(readFileSync(prev, "utf-8"), readFileSync(cur, "utf-8"), JSON.parse(readFileSync(fl, "utf-8")));
    const got = r.problems.length;
    const ok = got === wantRed && r.stats.visible === wantVisible;
    console.log(`FIXVIS_SELF ${label.padEnd(38)} 期望 red=${wantRed} visible=${wantVisible} 实测 red=${got} visible=${r.stats.visible} untouched=${r.stats.untouched} gaps=${r.stats.gaps} ⇒ ${ok ? "对" : "错"}`);
    if (!ok) problems++;
  }
  rmSync(scratch, { recursive: true, force: true });
  console.log(problems ? `${SRK}=FAIL cases=${cases.length} problems=${problems}` : `${SRK}=PASS cases=${cases.length} 假绿可红=是`);
  return problems ? 1 : 0;
}

if (flag("self-test")) process.exit(selfTest());

const prevP = arg("prev", ""), curP = arg("cur", ""), flP = arg("fixlist", "");
for (const [k, v] of [["prev", prevP], ["cur", curP], ["fixlist", flP]]) {
  if (!v || !existsSync(resolve(REPO, v))) { console.log(`${RK}=NOT-EVIDENCED reason=${k} 读不到 ${v || "(没传)"}`); process.exit(2); }
}
const { rows, problems, stats } = judge(readFileSync(resolve(REPO, prevP), "utf-8"), readFileSync(resolve(REPO, curP), "utf-8"), JSON.parse(readFileSync(resolve(REPO, flP), "utf-8")));
const outPath = resolve(arg("out", join(REPO, "reports/audit/mp-fidelity-2026-10-18/fix-visibility.json")));
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ schema: "mp-fidelity-fix-visibility/v1", prev: prevP, cur: curP, fixlist: flP, stats, rows }, null, 2) + "\n", "utf-8");
for (const r of problems) console.log(`FIXNOTVISIBLE ${r.route}__${r.state} 两跑同字节 sha16=${r.prev} ⇒ 批次 ${r.batches} 的改动没上屏，缺陷重开`);
for (const r of rows.filter((x) => x.verdict.startsWith("NO_"))) console.log(`FIXVIS_GAP ${r.route}__${r.state} ${r.verdict}（缺读数，不判成"没变"也不判成"变了"）`);
console.log(`FIXVIS_STATS routes=${stats.routes} visible=${stats.visible} notVisible=${stats.notVisible} untouched=${stats.untouched} gaps=${stats.gaps} out=${outPath.replace(REPO + "/", "").split("\\").join("/")}`);
console.log(problems.length ? `${RK}=FAIL fixNotVisible=${problems.length} gaps=${stats.gaps}` : `${RK}=PASS visible=${stats.visible} fixNotVisible=0 gaps=${stats.gaps}`);
process.exit(problems.length ? 1 : 0);
