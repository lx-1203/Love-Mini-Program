/* 把「元素存在、但躲在自定义组件里」的判据行导成 WS 腿的 id 名单。
   为什么要单独一个导出器：verify-case-selectors-exist 已经按作用域轴把它们分出来了
   （该门自己记的实测：只在组件里 ⇒ CLI 腿 116/128=90.6% 点不动），但这些行以前只印在面板上，
   没有任何载具能拿着它们去跑第二把腿 ⇒ 193 条就成了"知道却没人补"的欠款。
   现在：本工具产名单 → r-exec-ws.mjs --ids-file 吃名单 → 名单守恒由 WS 腿自己断言。
   用法：node scripts/qa/emit-component-scoped-ids.mjs [--band <目录>] [--out <文件>] [--selftest] */
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
function arg(n, d) { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; }
function flag(n) { return argv.includes("--" + n); }
const KNOWN = new Set(["band", "out", "selftest", "gate"]);
for (const a of argv) {
  if (!a.startsWith("--")) continue;
  if (!KNOWN.has(a.slice(2))) { console.log("CSCOPED_RESULT=FAIL reason=不认识的旗标 " + a + "（拼错一个字母就会静默少传 --band ⇒ 拒跑）"); process.exit(2); }
}

const LINE_RE = /^\s*SEL_COMPONENT_SCOPE\s+([^\s#]+)(?:#([^\s]+))?\s+(.*)$/;
/* 纯函数：门的面板 ⇒ 名单。所有分支都要能被合成数据打到。 */
/* 原先这里是 `export function parseScoped` —— 全仓 0 个外部消费者（verify-carrier-wiring 判死件），
   而它只被本文件 :60/:91 两处内部使用，所以去掉 export：导出面收窄到真正有人用的形状，
   不是给死件找个豁免。要复用它就把它搬进共用件，而不是留一个没人 import 的公开面。 */
function parseScoped(stdout) {
  const cases = [];
  const seen = new Set();
  const byKey = new Map();
  let reportedTotal = null;
  /* entries 与 cases 是两个轴：门按"一条判据点一个名"出行（同一条点两个名就是两行），
     cases 是按 manifest|id 去重后的判据数。守恒只能拿 entries 对门的读数——
     拿 cases 去对会得到 145 vs 200 这种"看着像漏了 55 条"的假红（本次就是这么撞上的）。 */
  let entries = 0;
  const bad = [];
  for (const line of String(stdout).split(/\r?\n/)) {
    /* 门自己的读数行：SEL_SCOPE 页内可点=N 只在别处 wxml(组件作用域，CLI 腿实测 90.6% 点不动)=193 …
       取的是"）="后面的那个数——不能从"组件作用域"往后找第一个数字，那是 90.6% 的 90。 */
    const tot = line.match(/组件作用域[^)]*\)\s*=\s*(\d+)/);
    if (tot) reportedTotal = Number(tot[1]);
    if (!line.includes("SEL_COMPONENT_SCOPE")) continue;
    const tail = line.slice(line.indexOf("SEL_COMPONENT_SCOPE") + "SEL_COMPONENT_SCOPE".length).trim();
    if (/未逐条打印/.test(tail)) { bad.push("面板被 --max-samples 截断：" + tail); continue; }
    const g = tail.match(/^([^\s#]+)#([^\s]+)\s/);
    if (!g) { bad.push("行格式不认识（不该按'少一条'静默处理）：" + tail.slice(0, 80)); continue; }
    const k = g[1].toUpperCase() + "|" + g[2].toUpperCase();
    entries++;
    /* 同一条判据可以点两个名 ⇒ 选择器要并起来，不然 detail 会写成"只有一个名"，
       读的人以为组件里只躲了一个物件。 */
    const cls = (tail.match(/\.[\w-]+/g) || []);
    if (seen.has(k)) { byKey.get(k).selectorSet.add(...cls); continue; }
    seen.add(k);
    const rec = { key: k, manifest: g[1], id: g[2], selectorSet: new Set(cls) };
    byKey.set(k, rec);
    cases.push(rec);
  }
  for (const c of cases) c.selector = [...c.selectorSet].join(",");
  return { cases, bad, reportedTotal, entries };
}

if (flag("selftest")) {
  const ok = [];
  const P = (s) => parseScoped(s);
  const SCOPE_LINE = "SEL_SCOPE 页内可点=44 只在别处 wxml(组件作用域，CLI 腿实测 90.6% 点不动)=193 运行期拼名=7";
  ok.push({ n: "两行（第二条与第一条同键）⇒ 去重后 2 条", r: P(" SEL_COMPONENT_SCOPE A-M#X01 .foo —— x\n SEL_COMPONENT_SCOPE A-M#X01 .foo —— x\n SEL_COMPONENT_SCOPE B-M#X02 .bar —— y").cases.length === 2 });
  ok.push({ n: "截断行必须点名而不是被当成少一条", r: P("  SEL_COMPONENT_SCOPE …另 181 条未逐条打印（--max-samples 放大）").bad.length === 1 });
  ok.push({ n: "格式不认识的行要报红（不许静默丢）", r: P("  SEL_COMPONENT_SCOPE 没有井号的一行 .foo").bad.length === 1 });
  ok.push({ n: "键归一成 MANIFEST|ID 且大写", r: (P(" SEL_COMPONENT_SCOPE a-m#x01 .foo").cases[0] || {}).key === "A-M|X01" });
  /* 这一条专门盯住"从读数行里取哪个数"：写错就会取到 90.6% 的 90，
     于是守恒式变成 90 vs 193 —— 一个看起来像"门和导出不一致"的假红。 */
  ok.push({ n: "读数行取 )= 后面的那个数（不能被 90.6% 的 90 骗走）", r: P(SCOPE_LINE).reportedTotal === 193 });
  /* 门的轴是"一行一个名"：同一条判据点两个名就是两行。守恒对的是行数，不是判据数。 */
  const TWO = P(" SEL_COMPONENT_SCOPE M#C1 .aa —— x\n SEL_COMPONENT_SCOPE M#C1 .bb —— y\n SEL_COMPONENT_SCOPE M#C2 .cc —— z");
  ok.push({ n: "同一条两个名 ⇒ 行数 3、判据数 2，且选择器并起来", r: TWO.entries === 3 && TWO.cases.length === 2 && TWO.cases[0].selector === ".aa,.bb" && TWO.cases[1].selector === ".cc" });
  const badN = ok.filter((c) => !c.r).length;
  for (const c of ok) console.log((c.r ? "  ok " : "  BAD") + c.n);
  console.log("CSCOPED_SELFTEST=" + (badN ? "FAIL" : "PASS") + " cases=" + ok.length + " bad=" + badN);
  process.exit(badN ? 1 : 0);
}

const GATE = arg("gate", "scripts/qa/verify-case-selectors-exist.mjs");
const band = arg("band", "");
const OUT = arg("out", join(REPO, "reports/audit/round-7/ids-component-scoped.json"));
const node = process.execPath;
const args = [resolve(REPO, GATE), "--max-samples", "100000"];
if (band) args.push("--band", band);
let stdout = "";
try { stdout = execFileSync(node, args, { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 }); } catch (e) {
  /* 门自己红过不等于导出失败：先把它的读数留下再判。 */
  stdout = String((e && e.stdout) || "");
  if (!stdout) { console.log("CSCOPED_RESULT=FAIL reason=门跑不起来：" + String(e && e.message).slice(0, 120)); process.exit(2); }
  console.log("CSCOPED_GATE_EXIT=非0（照样按 stdout 导出，门红本身由下面的守恒读数暴露）");
}
const { cases, bad, reportedTotal, entries } = parseScoped(stdout);
const problems = [];
for (const b of bad) problems.push(b);
if (reportedTotal !== null && reportedTotal !== entries) problems.push("守恒破：门自报组件作用域 " + reportedTotal + " 行 ≠ 收到 " + entries + " 行（按门的「一行一个名」轴对）");
if (!cases.length) problems.push("导出 0 条 ⇒ 要么真的没有，要么面板口径变了；空名单不许交给 WS 腿");
const pages = new Set();
for (const c of cases) pages.add(c.manifest);
const payload = {
  $source: GATE + (band ? " --band " + band : "（默认 mock 档）") + " 的 SEL_COMPONENT_SCOPE 轴",
  $why: "元素在被测产物里存在，但只在组件自己的 wxml 里 ⇒ 页面作用域的元素查询进不去（该门实测 90.6% 点不动）。换 WS 腿点，不改判据、不降格成源码判点。",
  $use: "node scripts/qa/r-exec-ws.mjs --ids-file " + OUT.replace(REPO + "\\", "").replace(REPO + "/", "") + " —— WS 腿会自断言 名单==盘上有行",
  band: band || "apps/client/dist/build/mp-weixin",
  count: cases.length,
  gateRows: entries,
  gateReported: reportedTotal,
  manifests: [...pages].sort().length,
  cases: cases.map((c) => c.key),
  detail: cases.map(({ selectorSet, ...r }) => r),
};
if (problems.length) {
  for (const p of problems) console.log("CSCOPED_PROBLEM :: " + p);
  console.log("CSCOPED_RESULT=FAIL problems=" + problems.length + "（不写盘）");
  process.exit(2);
}
writeFileSync(OUT, JSON.stringify(payload, null, 1) + "\n");
console.log("CSCOPED 判据数=" + cases.length + " 门行数=" + entries + " 门自报=" + reportedTotal + " manifests=" + payload.manifests + " out=" + OUT.replace(REPO + "\\", ""));
console.log("CSCOPED_RESULT=OK（把它交给 WS 腿：node scripts/qa/r-exec-ws.mjs --ids-file …）");
