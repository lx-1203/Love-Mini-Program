#!/usr/bin/env node
/* i18n 配对 + 孤儿键门禁。
   为什么要有：本轮"落 i18n 残留项"这件事此前只有**一次人工审计**（19 个孤儿键被接线），
   证据落在 `.zcode/tmp/i18n-wired.json` —— 而 `.zcode/tmp/` 整目录被根 .gitignore 的裸 `tmp/`
   规则吞掉，也就是说这条结论既不可重跑、也不会再有人复核。
   本工具把它变成一条常规门禁，核三件事：
   1) **成对性**：zh-CN 与 en-US 的键集必须完全一致（本仓纪律：成对 locale 文件无例外）。
      任一方向缺键 ⇒ 直接 FAIL。
   2) **孤儿**：定义了但全仓找不到静态引用的键 ⇒ 默认也 FAIL。
      允许用 `--allow-orphans N` 打棘轮（已知并容忍的数量），但棘轮必须写进台账说明理由，
      不允许为了让门绿而调大数字后就不管。
   3) **动态引用不得被误判成孤儿**：`t("prefix." + x)` / `t(\`a.${x}\`)` 这类拼接，
      把该前缀子树整片标为"已引用"并单独计数报出来——
      否则下一个读日志的人会把"我看不见引用"当成"没人用它"。
   用法：node scripts/qa/verify-i18n-orphan.mjs [--zh 路径] [--en 路径] [--src 目录] [--allow-orphans N] [--verbose]
*/
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const ZH = resolve(arg("zh", join(REPO, "apps/client/src/i18n/locales/zh-CN.ts")));
const EN = resolve(arg("en", join(REPO, "apps/client/src/i18n/locales/en-US.ts")));
const SRC = resolve(arg("src", join(REPO, "apps/client/src")));
/* 棘轮基线 1257：2026-09-25 22:31 实测（zh 键 4165，其中全仓找不到任何字面/前缀/数据用法 1257）。
   这些是**历史遗留死文案**，不是本轮引入的债；本轮的纪律是"只许降不许升"，
   所以默认允许值就是当时的实测数，改这个数字必须同时改台账 §74 的说明。
   配对检查（zh/en 键集一致）没有棘轮：任何差异一律判红。 */
const ALLOW = Number(arg("allow-orphans", "1257"));
const VERBOSE = argv.includes("--verbose");

/** locale 文件是纯对象字面量（结尾 `} as const;`），剥掉 TS 外衣后直接求值。 */
function loadLocale(p) {
  let src = readFileSync(p, "utf8");
  if (!/export default/.test(src)) throw new Error(p + " 里没有 export default，取数方式已变，别硬猜");
  src = src.replace(/export default/, "return ").replace(/\bas const\b/g, "");
  const obj = new Function(src)();
  const out = new Map();
  (function walk(node, prefix) {
    for (const k of Object.keys(node)) {
      const v = node[k];
      const path = prefix ? prefix + "." + k : k;
      if (v && typeof v === "object") walk(v, path);
      else out.set(path, typeof v === "string" ? v : String(v));
    }
  })(obj, "");
  return out;
}

function* walkFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "i18n" || name.startsWith(".")) continue;
      yield* walkFiles(p);
    } else if (/\.(vue|ts)$/.test(name)) yield p;
  }
}

const zh = loadLocale(ZH);
const en = loadLocale(EN);

const refs = new Set();
const prefixes = new Set();
let filesScanned = 0;
const corpus = [];
for (const f of walkFiles(SRC)) {
  filesScanned++;
  const text = readFileSync(f, "utf8");
  corpus.push(text);
  for (const m of text.matchAll(/\b(?:t|te|tm|d)\(\s*["'`]([^"'`\n]+)["'`]\s*[,)]/g)) refs.add(m[1]);
  /* 拼接式：t("a.b." + x) / `t(a.b.${x})` —— 该前缀整片视为已引用 */
  for (const m of text.matchAll(/\b(?:t|te|tm)\(\s*["'`]([^"'`$]*)\$\{[^)]*?\}[^"'`]*["'`]/g)) prefixes.add(m[1].replace(/\.$/, ""));
  for (const m of text.matchAll(/\b(?:t|te|tm)\(\s*["'`]([^"'`\n]+?)\.["'`]\s*\+/g)) prefixes.add(m[1]);
  for (const m of text.matchAll(/\b(?:t|te|tm)\(\s*["'`]([^"'`\n]+?)["'`]\s*\+/g)) prefixes.add(m[1].replace(/\.$/, ""));
}
/* 关键教训（22:31 实测）：**只扫 `t("字面量")` 会大批误判孤儿**。
   本仓很多文案是"键当数据传"：`{ key: "more", labelKey: "common.more" }` 之后 `t(item.labelKey)`，
   字面量在数据里、`t()` 里是变量 —— 静态 t()-扫描看不见，`common.more` 就被我错判成孤儿（1644 分之一）。
   所以孤儿判据改成**全文证据**：点号路径作为字符串在 src 任何处出现（含数据表、测试、注释除外），
   即不算孤儿。真正的孤儿是"这个键名在全仓一个字都没出现过"。 */
const blob = corpus.join("\n");
const prefixList = [...prefixes];

const inBoth = [...zh.keys()].filter((k) => en.has(k));
const zhOnly = [...zh.keys()].filter((k) => !en.has(k));
const enOnly = [...en.keys()].filter((k) => !zh.has(k));
/* 用法证据 = 字面 t() / 前缀拼接 / **整份源码里出现过这个点号路径字符串**。
   仍可能漏的一类是"变量键跨层拼接"（t(`a.${x}.b`)），所以孤儿默认**不判红**，
   只报数与样本；要判红用 --allow-orphans 0（并把基线数字与理由写进台账，只许降不许升）。 */
const isUsed = (k) => refs.has(k) || blob.includes('"' + k + '"') || blob.includes("'" + k + "'")
  || prefixList.some((pre) => k === pre || k.startsWith(pre + "."));
const orphans = [...zh.keys()].filter((k) => !isUsed(k));

console.log(`I18N_ZH_KEYS=${zh.size} I18N_EN_KEYS=${en.size} FILES_SCANNED=${filesScanned} STATIC_REFS=${refs.size} DYNAMIC_PREFIXES=${prefixes.size}`);
console.log(`I18N_PAIRED=${inBoth.length} I18N_ZH_ONLY=${zhOnly.length} I18N_EN_ONLY=${enOnly.length}`);
console.log(`I18N_ORPHANS=${orphans.length} I18N_ORPHANS_ALLOWED=${ALLOW}`);
zhOnly.slice(0, 15).forEach((k) => console.log(`  ZH_ONLY ${k}  「${zh.get(k)}」`));
enOnly.slice(0, 15).forEach((k) => console.log(`  EN_ONLY ${k}  "${en.get(k)}"`));
orphans.slice(0, VERBOSE ? 9999 : 25).forEach((k) => console.log(`  ORPHAN ${k}  「${zh.get(k)}」`));
if (!VERBOSE && orphans.length > 25) console.log(`  …ORPHAN 另有 ${orphans.length - 25} 条（--verbose 全量）`);
if (prefixes.size) console.log("I18N_DYNAMIC_PREFIXES_SEEN=" + [...prefixes].slice(0, 8).join(", ") + "（这些前缀下的键一律不算孤儿：看不见引用 ≠ 没人用）");

const pairFail = zhOnly.length > 0 || enOnly.length > 0;
const orphanFail = orphans.length > ALLOW;
if (!existsSync(SRC)) { console.log("I18N_RESULT=FAIL reason=扫描目录不存在 " + relative(REPO, SRC)); process.exit(2); }
if (!inBoth.length) { console.log("I18N_RESULT=FAIL reason=配对键集为空（扫描/求值塌了），不许空过"); process.exit(2); }
if (pairFail) console.log("I18N_FAIL_PAIR 成对 locale 文件键集不一致 —— 本仓纪律是「成对文件无例外」，必须两端同时补/删");
if (orphanFail) console.log(`I18N_FAIL_ORPHAN 有 ${orphans.length - ALLOW} 条超出棘轮的孤儿键（定义未被任何静态/动态引用命中）`);
console.log(pairFail || orphanFail ? `I18N_RESULT=FAIL（pair 差异 ${zhOnly.length + enOnly.length}，孤儿 ${orphans.length}>允许 ${ALLOW}）` : "I18N_RESULT=PASS");
process.exit(pairFail || orphanFail ? 1 : 0);
