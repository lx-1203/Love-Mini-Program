/* 路由断链核对：openAppPath/navigateTo 目标 vs pages.json 注册（支持注释 JSON） */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "apps", "client", "src");
const pagesJsonRaw = fs.readFileSync(path.join(ROOT, "pages.json"), "utf-8");
// 去除 // 行注释与 /* */ 块注释（pages.json 允许注释的 uni-app 约定）
const cleaned = pagesJsonRaw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((l) => !l.trim().startsWith("//"))
  .join("\n");
const pages = JSON.parse(cleaned);

const reg = new Set();
for (const p of pages.pages || []) reg.add("/" + p.path);
for (const sp of pages.subPackages || []) {
  for (const p of sp.pages || []) reg.add("/" + sp.root + "/" + p.path);
}

const used = new Set();
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(vue|ts)$/.test(f)) files.push(full);
  }
})(ROOT);

for (const f of files) {
  const src = fs.readFileSync(f, "utf-8");
  const re = /openAppPath\("([^"?]+)|url:\s*"([^"?]+)/g;
  let m;
  while ((m = re.exec(src))) {
    const route = m[1] || m[2];
    if (route.startsWith("/")) used.add(route);
  }
}

const missing = [...used]
  .filter((u) => u.startsWith("/pages/") || u.startsWith("/subpackages/"))
  .filter((u) => !reg.has(u))
  .sort();
console.log(`registered=${reg.size} used=${used.size}`);
console.log("=== UNREGISTERED ===");
for (const m of missing) console.log("  " + m);
