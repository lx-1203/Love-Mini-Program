#!/usr/bin/env node
/**
 * r11-interaction-scan.mjs — R11 Phase3 交互清单生成（验收方案 §3.1）
 *
 * 静态扫描 src 全部 .vue 的 @tap/@click/@longpress/@confirm/@change/@submit/
 * @input/@blur/@scrolltolower/@refresherrefresh/@getphonenumber 绑定，
 * 按宿主页面归属（组件目录上卷：components/** 归入引用它的页面集合）。
 * 产出 reports/audit/r11-acceptance/interaction-matrix.csv：
 *   page,binding,event,action(推断分类),status(自动执行→PENDING)
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");
const OUT = path.resolve(__dirname, "../../reports/audit/r11-acceptance/interaction-matrix.csv");
const SKIP = /node_modules|dist|uni_modules|custom-tab-bar/;

const EVENTS = ["@tap", "@click", "@longpress", "@confirm", "@change", "@submit",
  "@getphonenumber", "@refresherrefresh", "@scrolltolower"];

const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!SKIP.test(p)) walk(p); continue; }
    if (p.endsWith(".vue")) files.push(p);
  }
})(SRC);

// 页面清单（pages.json 顺序展开后的 route 集合，用于归属判断）
let pagesJson = fs.readFileSync(path.join(SRC, "pages.json"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const pj = JSON.parse(pagesJson);
const pageSet = new Set();
for (const p of pj.pages) pageSet.add(p.path);
for (const sp of pj.subPackages || []) for (const p of sp.pages) pageSet.add(sp.root + "/" + p.path);

const classify = (ev, handler) => {
  const h = handler.toLowerCase();
  if (/go|nav|open|switch|back|tab|detail|home|jump/.test(h) || ev === "@tap" || ev === "@click") {
    if (/submit|save|send|publish|signup|login|register/.test(h)) return "submit";
    if (/close|cancel|dismiss|overlay/.test(h)) return "overlay";
    return "nav";
  }
  if (ev === "@longpress") return "gesture";
  if (ev === "@confirm" || ev === "@submit") return "submit";
  if (ev === "@change") return "toggle";
  return "form";
};

/** 组件 → 宿主页面（import 关系） */
const compToHosts = new Map();
for (const pagePath of pageSet) {
  const abs = path.join(SRC, pagePath + ".vue");
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, "utf8");
  for (const m of src.matchAll(/from ["']([^"']*components[^"']*)["']/g)) {
    let rel = m[1].replace(/^@/, "SRCMARK").replace(/^\.\.\//, "");
    rel = rel.replace("SRCMARK", "");
    const norm = path.normalize(rel).replaceAll("\\", "/");
    const base = path.basename(norm, ".vue");
    if (!compToHosts.has(base)) compToHosts.set(base, new Set());
    compToHosts.get(base).add(pagePath);
  }
}

const rows = ["page,binding,event,action,status"];
let total = 0;
for (const f of files) {
  const rel = path.relative(SRC, f).replaceAll("\\", "/");
  const src = fs.readFileSync(f, "utf8");
  const tpl = (src.match(/<template>([\s\S]*)<\/template>/) || ["", ""])[1];
  const base = path.basename(f, ".vue");
  let hosts = pageSet.has(rel.replace(/\.vue$/, "")) ? new Set([rel.replace(/\.vue$/, "")]) : null;
  if (!hosts) hosts = compToHosts.get(base) || new Set(["(shared-unresolved)"]);
  for (const ev of EVENTS) {
    const re = new RegExp(ev.replace("@", "@(?:once)?") + "\\s*=\\s*\"([^\"]+)\"", "g");
    for (const m of tpl.matchAll(re)) {
      total++;
      const handler = m[1];
      for (const host of hosts) {
        rows.push([host, `${base}.vue:${handler}`, ev, classify(ev, handler), "SCANNED"].map((x) => `"${x}"`).join(","));
      }
    }
  }
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, rows.join("\n"));
console.log(`interaction-matrix.csv: ${total} bindings -> ${rows.length - 1} rows (component bindings roll up to hosts)`);
