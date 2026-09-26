/* 把判据台欠的帧（NEEDS_UI_FRAME）转成"能不能拍"的清单，而不是一句"还欠 82 条帧"。
 *
 * 取景工具 tour-cli-states.mjs 要的是**每行既有 tap 选择器又有 expect 选择器**
 * （它自己就拒绝缺任一项的行："没有元素级判据的行拍了帧也判不了"）。
 * 所以债能不能还，取决于条目里有没有这两个物件 —— 这一步就是把这件事先算出来：
 *   SHOOTABLE 能直接进 TSV；
 *   NEEDS_CRITERIA 缺 tap 或缺 expect ⇒ 要先补判据（和 361 条交互用例同一类账），
 *   NO_ROUTE 页在产物路由表里找不到（拍不了）。
 * 只有 SHOOTABLE 会进 TSV，其余逐条留在 JSON 里当开口，不做"先拍了再说"。
 *
 * 用法：node scripts/qa/gen-states-from-debt.mjs [--verdicts …] [--out-tsv .zcode/tmp/…] [--out-json …]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const VERDICTS = opt("verdicts", ".zcode/tmp/fixverify/verdicts.json");
const TSV = opt("out-tsv", ".zcode/tmp/round7/states-from-debt.tsv");
const OUTJSON = opt("out-json", "reports/audit/round-7/frame-debt-shootable.json");
const PROJECT = opt("project", "apps/client/dist/build/mp-weixin");

/* 产物路由表：主包 pages + 各 subPackage root/page，全部当成可拍页 */
const app = JSON.parse(readFileSync(join(REPO, PROJECT, "app.json"), "utf8"));
const routes = new Set((app.pages || []).slice());
for (const sp of (app.subPackages || [])) for (const p of (sp.pages || [])) routes.add(sp.root + "/" + p);

const v = JSON.parse(readFileSync(join(REPO, VERDICTS), "utf8"));
const items = (v.items || []).filter((x) => (x.verdict || x.bucket) === "NEEDS_UI_FRAME");
function routeOf(laneFile) {
  let s = String(laneFile || "").trim();
  s = s.replace(/^apps\/client\/src\//, "").replace(/\.vue$/, "");
  if (routes.has(s)) return s;
  const alt = s.replace(/^pages\//, "pages/");
  return routes.has(alt) ? alt : "";
}
const TAPY = /(btn|button|tab|item|cell|icon|entry|trigger|close|open|switch|chip|link)$/i;
const CLSY = /^\.[a-z][a-z0-9]*(-[a-z0-9]+)*(__|--)[a-z0-9_-]+$/;

const buckets = { SHOOTABLE: [], NO_ROUTE: [], NEEDS_CRITERIA: [] };
for (const it of items) {
  const route = routeOf(it.laneFile);
  const toks = (it.probes || []).map((p) => String(p.token || "").trim()).filter((t) => CLSY.test(t));
  const uniq = [...new Set(toks)];
  if (!route) { buckets.NO_ROUTE.push({ id: it.id, laneFile: it.laneFile, cls: uniq }); continue; }
  const tap = uniq.find((t) => TAPY.test(t));
  const expect = uniq.find((t) => t !== tap);
  if (!tap || !expect) { buckets.NEEDS_CRITERIA.push({ id: it.id, route, cls: uniq, why: !uniq.length ? "判点里没有一个是 BEM 类名（多是 CSS 值片段/裸标识符，取景工具判不了）" : (tap ? "只有一枚类名，缺 expect 或 expect==tap" : "有类名但没有一枚像可点元素（btn/tab/item/…）") }); continue; }
  const state = (String(it.verdictWhy || "").slice(0, 24) || "交互后").replace(/[\t\r\n|]/g, " ");
  buckets.SHOOTABLE.push({ id: it.id, route, tap, expect, state, cls: uniq });
}
const lines = [
  "# 由 scripts/qa/gen-states-from-debt.mjs 从判据台 NEEDS_UI_FRAME 派生",
  "# 列：identity<TAB>page<TAB>query<TAB>state<TAB>tap<TAB>expect",
  "# identity 一律 A：游客按既有裁定不能浏览广场，欠帧条目里没有一条能给游客拍",
];
for (const s of buckets.SHOOTABLE) lines.push(["A", s.route, "", s.state.slice(0, 20), s.tap, s.expect].join("\t"));
writeFileSync(join(REPO, TSV), lines.join("\n") + "\n");
writeFileSync(join(REPO, OUTJSON), JSON.stringify({
  generatedAt: new Date().toISOString(), verdicts: VERDICTS, note:
    "只有 SHOOTABLE 能进取景清单；NEEDS_CRITERIA/NO_ROUTE 是要先补判据或页名对不上，不许硬凑一行去拍",
  buckets,
}, null, 1) + "\n");
console.log("DEBT_INPUT 欠帧=" + items.length + " 产物路由数=" + routes.size);
console.log("DEBT_SHOOTABLE=" + buckets.SHOOTABLE.length + " NEEDS_CRITERIA=" + buckets.NEEDS_CRITERIA.length + " NO_ROUTE=" + buckets.NO_ROUTE.length);
console.log("DEBT_TSV=" + TSV + " 行=" + buckets.SHOOTABLE.length);
console.log("DEBT_JSON=" + relative(REPO, join(REPO, OUTJSON)).split("\\").join("/"));
buckets.NEEDS_CRITERIA.slice(0, 5).forEach((x) => console.log("  NC " + x.id + " " + x.route + " :: " + String(x.why).slice(0, 60) + " 类名=" + x.cls.slice(0, 3).join(",")));
console.log(buckets.SHOOTABLE.length ? "GEN_RESULT=OK 有 " + buckets.SHOOTABLE.length + " 条可以真拍，其余 " + (buckets.NEEDS_CRITERIA.length + buckets.NO_ROUTE.length) + " 条是判据账不是取景账" : "GEN_RESULT=NONE 一条都派生不出可执行取景行 ⇒ 82 条欠帧全是判据没写够");
