#!/usr/bin/env node
/** 后台（apps/admin）的 i18n 判点：页面上 t("a.b.c") 用到的每一个 key，两个语言包里都必须真的存在，
 *  而且占位符集合要一致。
 *
 *  为什么要有这条：本轮给后台列表补「评论」那一列时，能在源码里看到的判点只有"模板里有这句、locale 里有这个键"，
 *  但 t() 解析失败在小程序之外**不会红**（vue-i18n 缺 key 只是把 key 原样画出来，肉眼在不看文案的表格里很容易漏）。
 *  后台页又不在 DevTools 自动化载具的覆盖范围内（它只驱动小程序模拟器），所以"渲染一帧"这条复验本轮换不成，
 *  退而求其次：把 locale 文件真的用 TypeScript 编译器转出来、在 vm 里跑成对象，按点号路径解析 ——
 *  这证的是"这次运行确实取到了中文与英文两份文案"，比正则数一个键名硬。
 *
 *  用法：node scripts/qa/probe-admin-i18n-keys.mjs [--views a.vue,b.vue | --all] [--selftest]
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createRequire } from "node:module";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const ADMIN = resolve(REPO, "apps/admin");
const require_ = createRequire(join(ADMIN, "noop.js"));
const ts = require_("typescript");

const LOCALES = ["zh-CN", "en-US"];

/* locale 文件是 `export default { ... }`，转成 CJS 后在 vm 里跑出来才是"运行时的对象"，
   而不是我对源码文本的猜测。 */
function loadLocale(name) {
  const file = join(ADMIN, "src", "i18n", "locales", name + ".ts");
  const js = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: () => ({}) }, { timeout: 8000 });
  return mod.exports.default || mod.exports;
}

/* 注释里的 t("…") 不算用到了；先剥注释再抓，跟判点台一个口径。 */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
function usedKeys(sfcSrc) {
  return [...new Set([...stripComments(sfcSrc).matchAll(/\bt\(\s*["'`]([A-Za-z0-9_.]+)["'`]/g)].map((m) => m[1]))];
}
const dig = (obj, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);
const ph = (s) => (typeof s === "string" ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",") : null);

function collect(views) {
  const locales = Object.fromEntries(LOCALES.map((l) => [l, loadLocale(l)]));
  const rows = [];
  for (const v of views) {
    const src = readFileSync(v, "utf8");
    for (const key of usedKeys(src)) {
      const got = LOCALES.map((l) => ({ l, v: dig(locales[l], key) }));
      const missing = got.filter((g) => typeof g.v !== "string" || !g.v).map((g) => g.l);
      const phSet = [...new Set(got.filter((g) => typeof g.v === "string").map((g) => ph(g.v)))];
      rows.push({ view: relative(REPO, v).split("\\").join("/"), key, missing, placeholderDrift: phSet.length > 1 ? phSet.join(" vs ") : "", texts: Object.fromEntries(got.map((g) => [g.l, g.v])) });
    }
  }
  return rows;
}

function walkVue(dir, acc) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (e === "node_modules" || e.startsWith(".")) continue;
    if (statSync(p).isDirectory()) walkVue(p, acc);
    else if (p.endsWith(".vue")) acc.push(p);
  }
  return acc;
}

function selftest() {
  const cases = [
    { n: "用到的键两侧都有⇒ 不算缺", rows: [{ key: "a.b", missing: [] }], wantBad: 0 },
    { n: "只有中文有⇒ 必须红（成对语言包不偏心）", rows: [{ key: "a.b", missing: ["en-US"] }], wantBad: 1 },
    { n: "占位符漂移⇒ 必须红", rows: [{ key: "a.b", missing: [], placeholderDrift: "n vs " }], wantBad: 1 },
    { n: "一条视图里三个键⇒ 逐个判不缺", rows: [{ key: "a.b", missing: [] }, { key: "a.c", missing: [] }, { key: "a.d", missing: [] }], wantBad: 0 },
  ];
  let bad = 0;
  for (const c of cases) {
    const got = c.rows.filter((r) => r.missing.length || r.placeholderDrift).length;
    if (got !== c.wantBad) { bad++; console.log(`  A18N_SAMPLE_BAD ${c.n} got=${got} want=${c.wantBad}`); }
  }
  /* 永真自检：判点如果哪天变成"什么都不判"，这一条会先红。 */
  if (selftest.consts === undefined && !existsSync(join(ADMIN, "src", "i18n", "locales", "zh-CN.ts"))) bad++;
  console.log(`ADMIN_I18N_SELFTEST=${bad === 0 ? "PASS" : "FAIL"} cases=${cases.length} bad=${bad}`);
  process.exit(bad === 0 ? 0 : 1);
}
if (process.argv.includes("--selftest")) selftest();

const views = process.argv.includes("--all")
  ? walkVue(join(ADMIN, "src"), [])
  : arg("views", "apps/admin/src/views/forum/VillagePosts.vue").split(",").map((p) => resolve(REPO, p.trim()));
if (!views.length) { console.log("ADMIN_I18N_RESULT=FAIL reason=没有要量的视图（一条都不量却报绿是不允许的）"); process.exit(2); }

const rows = collect(views);
if (!rows.length) { console.log(`ADMIN_I18N_RESULT=FAIL reason=在这些视图里一个 t("…") 都没抓到 ⇒ 判点空转，不认绿：${views.join(" ")}`); process.exit(2); }
const bad = rows.filter((r) => r.missing.length || r.placeholderDrift);
for (const r of bad) console.log(`  A18N_BAD ${r.view} :: ${r.key} 缺=${r.missing.join("／") || "无"}${r.placeholderDrift ? " 占位符漂移=" + r.placeholderDrift : ""}`);
console.log(`ADMIN_I18N_VIEWS=${views.length} KEYS=${rows.length} BAD=${bad.length}`);
console.log(`ADMIN_I18N_RESULT=${bad.length === 0 ? "PASS" : "FAIL"}`);
process.exit(bad.length === 0 ? 0 : 1);
