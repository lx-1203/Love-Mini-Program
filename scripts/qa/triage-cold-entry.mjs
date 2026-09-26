/* 把执行轮的 FAILED("落在别的页") 拆成"有据可查的冷启动守卫"和"没解释的重定向"。
 *
 * 为什么需要这个：这些行按用例写法（直接打开 X 页再观察 Y）本来就跑不了——页面在 onLoad 里
 * 靠 navigateBack/switchTab 兜底，冷启动直达会被弹走。把它们一律记成产品缺陷是错的，
 * 一律记成"harness 限制"同样错（那就是个洗色器）。所以每条都要**在源码里找到那行守卫**才算数，
 * 找不到的留在 UNEXPLAINED 里当开口。
 *
 * 用法：node scripts/qa/triage-cold-entry.mjs [--results <f>] [--src apps/client/src] [--out <f>]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const RESULTS = opt("results", join(REPO, "reports/audit/round-7/interact/exec-results.json"));
const SRC = opt("src", join(REPO, "apps/client/src"));
const OUT = opt("out", join(REPO, "reports/audit/round-7/interact/cold-entry-triage.md"));
const GIT_SHA = (() => { try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim(); } catch { return "unknown"; } })();

const j = JSON.parse(readFileSync(RESULTS, "utf8"));
const failed = (j.results || []).filter((r) => r.status === "FAILED");
/* 常量解析：源码里写的是 ROUTES.TAB.DISCOVER，落到真机是 /pages/discover/index。
   不解析常量就会把"其实已经解释清楚"的守卫误判成 GUARD_OTHER（本轮 matching 的 17 行就是这样）。 */
function routeConstMap() {
  const p = join(SRC, "constants", "routes.ts");
  const map = new Map();
  if (!existsSync(p)) return map;
  const txt = readFileSync(p, "utf8");
  let group = "";
  const leafCount = new Map();
  const add = (k, v) => { map.set(k, v); leafCount.set(k.split(".").pop(), (leafCount.get(k.split(".").pop()) || 0) + 1); };
  for (const raw of txt.split("\n")) {
    const l = raw.trim();
    const gm = /^([A-Z_]+)\s*:\s*\{/.exec(l);
    if (gm) { group = gm[1]; continue; }
    if (/^\}/.test(l)) { group = ""; continue; }
    const kv = /^([A-Z_][A-Z0-9_]*)\s*:\s*"([^"]+)"/.exec(l);
    if (kv) add((group ? group + "." : "") + kv[1], kv[2].replace(/^\//, ""));
  }
  /* 只登记**唯一**的末段名：重名末段（例如两处 CAMPUS）退回全链匹配，避免把常量解错地方 */
  for (const [k, v] of [...map]) {
    const leaf = k.split(".").pop();
    if (leafCount.get(leaf) === 1 && !map.has(leaf)) map.set(leaf, v);
  }
  return map;
}
const ROUTE_CONST = routeConstMap();
/* 把一行里的 ROUTES.X.Y / SUBPACKAGE_ROUTES.X.Y 换成真实路径，再做落点匹配 */
function expand(line) {
  return line.replace(/((?:ROUTES|SUBPACKAGE_ROUTES)\.)?([A-Z_]{2,}(?:\.[A-Z_]{2,}){1,2})/g, (m, pre, chain) => {
    const parts = chain.split(".");
    for (let i = 0; i < parts.length; i++) {
      const cand = parts.slice(i).join(".");
      if (ROUTE_CONST.has(cand)) return ROUTE_CONST.get(cand);
    }
    return m;
  });
}
const GLOBAL_GUARDS = ["guards/session-guard.ts", "composables/usePageAccess.ts", "App.vue", "utils/auth.ts", "utils/nav.ts", "utils/router.ts"];
function globalGuardFor(landed) {
  for (const g of GLOBAL_GUARDS) {
    const p = join(SRC, g);
    if (!existsSync(p) || !statSyncIsFile(p)) continue;
    const lines = readFileSync(p, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!/navigateBack|switchTab|redirectTo|reLaunch|replaceAppPath/.test(l) || /^\s*(\/\/|\*)/.test(l.trim())) continue;
      if (expand(l).includes(landed)) return g + ":" + (i + 1);
    }
  }
  return "";
}
function statSyncIsFile(p) { try { return readFileSync(p) !== undefined; } catch { return false; } }

const rows = [];
const seen = new Map();
for (const r of failed) {
  const m = /top=(\S+)/.exec(r.observed || "");
  const landed = m ? m[1] : "?";
  const key = r.page + "->" + landed;
  seen.set(key, (seen.get(key) || 0) + 1);
  if (rows.some((x) => x.key === key)) continue;
  const srcPath = join(SRC, r.page + ".vue");
  if (!existsSync(srcPath)) { rows.push({ key, page: r.page, landed, n: 0, verdict: "NO_SOURCE", note: "找不到 " + relative(REPO, srcPath) + "（页面名与源码对不上，不能算已解释）" }); continue; }
  const lines = readFileSync(srcPath, "utf8").split("\n");
  const GUARD = /navigateBack|switchTab|redirectTo|reLaunch/;
  const hits = [];
  lines.forEach((l, i) => { if (GUARD.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)) hits.push({ n: i + 1, t: expand(l.trim()).slice(0, 90) }); });
  const landsHere = hits.filter((h) => h.t.includes(landed));
  const gg = globalGuardFor(landed);
  let verdict, note;
  if (landsHere.length) { verdict = "GUARD_COLD_ENTRY"; note = "页面自身代码里出现指向 " + landed + " 的导航（行 " + landsHere.map((h) => h.n).join(",") + "，ROUTES 常量已就地解析）⇒ 直达被兜底弹走是用例写法问题，须靠真实导航路径（交互切片）取证"; }
  else if (hits.length && gg) { verdict = "GUARD_GLOBAL"; note = "页面有 " + hits.length + " 处导航但未指向 " + landed + "；全局载体 " + gg + " 里有指向它的导航 ⇒ 归全局守卫，仍需交互路径复测"; }
  else if (hits.length) { verdict = "GUARD_OTHER"; note = "页面有 " + hits.length + " 处导航（行 " + hits.slice(0, 6).map((h) => h.n).join(",") + "），但页面内与已登记的全局载体都没有指向 " + landed + " 的语句 ⇒ 按开口处理"; }
  else if (gg) { verdict = "GUARD_GLOBAL"; note = "页面内无任何导航；全局载体 " + gg + " 里有指向 " + landed + " 的导航 ⇒ 归全局守卫"; }
  else { verdict = "UNEXPLAINED"; note = "页面内没有导航语句，App.vue/常见守卫载体里也找不到指向 " + landed + " 的导航 ⇒ 弹走原因未定，这条是开口"; }
  rows.push({ key, page: r.page, landed, n: 0, verdict, note, samples: hits.slice(0, 3) });
}
for (const r of rows) r.n = seen.get(r.key) || 0;
const byV = {};
for (const r of rows) byV[r.verdict] = (byV[r.verdict] || 0) + r.n;
const total = rows.reduce((a, b) => a + b.n, 0);

const lines = [
  "# round-7 执行轮 FAILED 归属（冷启动守卫 vs 未解释）", "",
  "- 生成：`scripts/qa/triage-cold-entry.mjs`（HEAD " + GIT_SHA + "，输入 " + relative(REPO, RESULTS).split("\\").join("/") + "）",
  "- 输入 FAILED 行数：" + total + "；按 (页 -> 实际落点) 归并后 " + rows.length + " 组",
  "- 分桶：" + Object.keys(byV).sort().map((k) => k + "=" + byV[k]).join("｜"),
  "",
  "| 用例页 | 实际落点 | 行数 | 判定 | 依据 |",
  "| --- | --- | --- | --- | --- |",
  ...rows.map((r) => "| `" + r.page + "` | `" + r.landed + "` | " + r.n + " | " + r.verdict + " | " + r.note.replace(/\|/g, "\\|") + " |"),
  "",
  "## 判读口径",
  "- `GUARD_COLD_ENTRY` 只说明「这一组用例不能靠冷启动直达取证」，**不说明页面功能正常**；",
  "  这些用例的真伪仍要靠交互路径（先导航进来再看）复测，属于 §16 的交互切片欠款。",
  "- `UNEXPLAINED` / `GUARD_OTHER` / `NO_SOURCE` 一律算本轮范围内的开口，不许并进守卫桶蒙过去。",
];
writeFileSync(OUT, lines.join("\n") + "\n");
console.log("TRIAGE_FAILED_ROWS=" + total + " 组=" + rows.length + " " + Object.keys(byV).sort().map((k) => k + "=" + byV[k]).join(" "));
rows.forEach((r) => console.log("TRIAGE " + r.verdict + " " + r.key + " n=" + r.n));
console.log("TRIAGE_WRITTEN=" + relative(REPO, OUT).split("\\").join("/"));
const open = (byV.UNEXPLAINED || 0) + (byV.GUARD_OTHER || 0) + (byV.NO_SOURCE || 0);
console.log(open ? "TRIAGE_OPEN=" + open + " 行仍未解释（不许当成本轮已收口）" : "TRIAGE_OPEN=0 全部 FAILED 都能在源码里指到具体导航");
