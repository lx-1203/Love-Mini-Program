#!/usr/bin/env node
/* 从**已编译产物**的 app.json 派生巡检清单，不从源码、也不从上一轮抄一份页面表。
   为什么：判据要落在"这一轮真正被取景的那棵页面树"上。抄历史清单会漏掉本轮新增页、
   也留不下已删页；而源码 pages.json 与产物 app.json 之间还隔着 strip-mock / 分包裁剪。
   身份约定沿用仓内既有裁定：A=登录态扫全部页；B=游客只扫 tabBar 的页
   （游客被引导到登录页是产品裁定，不是缺陷，所以不给游客排非 tab 页）。
   用法：node scripts/qa/gen-tour-tsv.mjs --project <产物目录> --out <tsv 路径> [--identities A,B] */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PROJECT = resolve(ROOT, arg("project", "apps/client/dist/build/mp-weixin-real"));
const OUT = resolve(ROOT, arg("out", ".zcode/tmp/tour.tsv"));
const IDENT = arg("identities", "A,B").split(",").map((s) => s.trim()).filter(Boolean);

const appJsonPath = join(PROJECT, "app.json");
if (!existsSync(appJsonPath)) { console.log(`TOURTSV_RESULT=FAIL reason=读不到 ${appJsonPath}（先构建产物）`); process.exit(2); }
const app = JSON.parse(readFileSync(appJsonPath, "utf8"));
const main = app.pages || [];
const sub = (app.subPackages || app.subpackages || []).flatMap((sp) => (sp.pages || []).map((p) => `${sp.root}/${p}`));
const all = [...main, ...sub];
const tabs = new Set((app.tabBar && app.tabBar.list || []).map((t) => t.pagePath.replace(/^\//, "")));
if (!all.length) { console.log("TOURTSV_RESULT=FAIL reason=产物页面数为 0（空扫描集不得占设备）"); process.exit(2); }

const rows = [];
for (const idt of IDENT) {
  const list = idt === "B" ? all.filter((p) => tabs.has(p)) : all;
  for (const p of list) rows.push(`${idt}\t${p}`);
}
const header = [
  `# 由 scripts/qa/gen-tour-tsv.mjs 从 ${PROJECT.replace(ROOT + "/", "")}/app.json 派生（勿手改页面集）`,
  `# 产物页面：主包 ${main.length} + 分包 ${sub.length} = ${all.length}；tabBar ${tabs.size} 页`,
  `# A=登录态全页；B=游客仅 tabBar（游客不得浏览广场是既有裁定）`,
].join("\n");
writeFileSync(OUT, header + "\n" + rows.join("\n") + "\n");
console.log(`TOURTSV pages=${all.length} main=${main.length} sub=${sub.length} tabs=${tabs.size} identities=${IDENT.join("/")}`);
console.log(`TOURTSV_ROWS=${rows.length} out=${OUT.replace(ROOT + "/", "")}`);
if (!rows.length) { console.log("TOURTSV_RESULT=FAIL reason=拼出来是空的"); process.exit(2); }
console.log("TOURTSV_RESULT=OK");
