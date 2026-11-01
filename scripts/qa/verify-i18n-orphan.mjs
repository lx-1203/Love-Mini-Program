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

/* 棘轮收缩 1257 → 1251（2026-11-01 第四轮修复批次）：
   2026-10-31 实测读到 1277，比基线多 20 —— 棘轮已被突破而**这道门当时没接进任何链**
   （package.json 与 ci.yml 里零引用），所以突破没人看见。修法不是把数字抬回 1277，
   而是真删死键 + 把门接进 test:contracts。
   删的是 matchHub 子树 26 个键：键名 root「matchHub」在 apps/client/src（含测试）
   一字不出现，全仓只剩构建产物与 locale 文件自己在提它 ——
   即"看不见引用"之外的第二个独立判据（整棵子树的根名零命中）也判它死。
   删前用脚本断言结构：BEFORE=4169 AFTER=4143、差值恰为 26、
   非 matchHub 键 0 改动 0 新增（见下），删后 zh 键数与孤儿数都由本门重读。
   反证：--allow-orphans 1200 ⇒ exit 1（棘轮真的会咬）。 */
const ALLOW = Number(arg("allow-orphans", "1243"));
const VERBOSE = argv.includes("--verbose");
/* 第二维（第五轮 C-F8 / B-FINDING 14）：i18n 之外的"裸中文文案"棘轮。
   过去这把门只量反方向（定义了没人用的死键），完全看不见"绕过 i18n 直接硬编码进 UI 的中文"——
   于是死键在减、裸文案在涨，两条轨此消彼长却无人度量。本维在同一遍历顺带统计，口径见
   scripts/qa 本文件的分类器注释。默认允许值 = 本轮实跑读数（下方 --allow-hardcoded 缺省）；
   迁移车道（B 泳道实测生产 UI ≈358 条 + store 抛错类 16 条）落地后由主控统一下调基线并重钉，
   所以这里刻意参数化：判点用 --allow-hardcoded N 打棘轮，缩了不降也红。
   默认值 456 = 本分类器本轮实跑读数（模板文本 360 + 属性 42 + toast/modal 33 + ||兜底 21 + throw 0），
   口径见下方 classifyHardcodedChinese（剥注释/日志、排除 mock/fixture/dev 页后按 UI 上下文五分类）。
   它是"本分类器"的数，不等于 B 泳道的 358（尺不同）；两把尺的基线由主控在 i18n 迁移落点后统一重钉。
   ── 第五轮修复车道 B2（i18n 迁移）下调：456 → 341（只降不升，本行缺省即新实测数）──
   迁的三件（apps/client 生产 UI Top 3，按本门尺排序）：
     subpackages/village/village/publish.vue  43 → 1（模板文本 37→1、属性 1→0、toast/modal 5→0）
     subpackages/village/village/post.vue     45 → 0
     pages/register/index.vue                 28 → 0
   净减 115 条，逐字进 locales（village.post.* 79 键 + register.* 29 键，同文两页共用一键），
   文案措辞与布局零改动；注释、console.* 日志、mock/演示数据（HOT_TOPICS / COMMON_LOCATIONS）未动。
   剩余 341 条的构成（本门实跑逐字对齐）：模板文本 265 + 属性 33 + toast/modal 24 + ||兜底 19 + throw 0，
   分布在 84 个文件，Top 5：pages/messages/index.vue 25、pages/home/index.vue 22、
   profile-extra/profile/location.vue 19、chat/official-chat/index.vue 18、village/village/detail.vue 15。
   为什么本轮只做到这里：车道范围就是 Top 3（占 456 的 25.4%）；其余 81 个命中文件里
   detail.vue / discover-extra/** / components/discover/** / stores/** 属本车道禁改清单，
   余下按 Top 5 顺序由后续批次继续压这条基线。
   publish.vue 残留的 1 条是**本分类器的已知误差**，不是待迁文案：`>([^<>]*)<` 在 <script> 区把
   `length > 0 ? city : ""` 的 `>` 与 `ref<"general" | …>` 的 `<` 跨行配成一对，产出一个模板文本假命中
   （整库这类跨行误配约 2 条）。修判据不在本车道权限内（只许动本行缺省值与注释），故入账不消数。 */
const ALLOW_HARDCODED = Number(arg("allow-hardcoded", "341"));
const SCAN_HARDCODED = !argv.includes("--no-hardcoded");

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
/* 2026-10-29 产品决定「英文版不上线」，客户端 en-US.ts 已删除。
   没有 EN 时成对性这一维不再有意义，但它不能悄悄算"通过"——
   显式打 SKIPPED，并把 pairFail 置 false 只影响配对维，孤儿维照常判。
   若将来重新引入 en-US.ts，本工具自动恢复成对检查，无需改回来。 */
const enExists = existsSync(EN);
const en = enExists ? loadLocale(EN) : new Map();
if (!enExists) console.log(`I18N_PAIRING=SKIPPED reason=en-US 语言包已下线（${relative(REPO, EN)} 不存在）`);

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

/* ── 第二维：i18n 之外的"裸中文文案"分类器（第五轮 C-F8 / B-FINDING 14(b)）─────────────
   照报告自建分类器的五分类口径实现，并明确排除注释/日志/mock 数据/演示数据：
     - 先剥注释（//、/* *\/、<!-- -->，带字符串与模板字面量状态机，不误伤字符串里的中文）；
     - 整行剔除 console.*（日志，报告说"迁 i18n 时不该动"）；
     - 路径级排除：i18n/、tests/、*.spec.*、mock-data、fixtures、*.stories.*、dev-only 页；
     - 五分类（都要求含中日韩字符 \u3400-\u9fff）：
         1 模板文本节点 >…中文…<
         2 属性文案 placeholder/alt/aria-label/label/title
         3 toast/modal 字面量（showToast/showModal/toastModal 里的 title/content/message）
         4 `|| "中文"` 兜底
         5 new Error("中文") / throw 中文
   计数按"出现次数"，与棘轮绑定；基线默认 0 需在首跑后按实测下调口径由主控统钉（见 --allow-hardcoded）。 */
const CJK = /[㐀-鿿぀-ヿ가-힯]/u;
const HARD_CODED_EXCLUDE = /(\/tests\/|\.spec\.|mock-data|fixtures|\.stories\.|\/i18n\/|subpackages\/setup\/dev|\/dev\/)/u;

/** 剥注释（保留字符串/模板字面量内容），同时把 console.* 整行清空为空格。 */
function stripCommentsAndLogs(src) {
  let out = "";
  let i = 0;
  let mode = "code"; // code | line | block | html | string | template | char
  let prevChar = "";
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (mode === "code") {
      if (c === "/" && n === "/") { mode = "line"; out += "  "; i += 2; continue; }
      if (c === "/" && n === "*") { mode = "block"; out += "  "; i += 2; continue; }
      if (c === "<" && n === "!" && src.slice(i, i + 4) === "<!--") { mode = "html"; out += "    "; i += 4; continue; }
      if (c === '"') { mode = "string"; out += c; i += 1; continue; }
      if (c === "`") { mode = "template"; out += c; i += 1; continue; }
      if (c === "'") { mode = "char"; out += c; i += 1; continue; }
      out += c; i += 1; continue;
    }
    if (mode === "line") { if (c === "\n") { mode = "code"; out += c; } else out += " "; i += 1; continue; }
    if (mode === "block") { if (c === "*" && n === "/") { mode = "code"; out += "  "; i += 2; continue; } out += c === "\n" ? "\n" : " "; i += 1; continue; }
    if (mode === "html") { if (c === "-" && n === "-" && src.slice(i, i + 3) === "-->") { mode = "code"; out += "   "; i += 3; continue; } out += c === "\n" ? "\n" : " "; i += 1; continue; }
    // 字符串族：原样保留内容，只处理转义与闭合
    if (c === "\\") { out += c + (n ?? ""); i += 2; continue; }
    if ((mode === "string" && c === '"') || (mode === "template" && c === "`") || (mode === "char" && c === "'")) mode = "code";
    out += c; i += 1; prevChar = c;
  }
  // console.* 整行清空（迁移时不该动的日志轨）
  return out.split("\n").map((ln) => (/console\.\w+\s*\(/u.test(ln) ? "" : ln)).join("\n");
}

function classifyHardcodedChinese(src, relPath) {
  if (HARD_CODED_EXCLUDE.test(relPath.replace(/\\/gu, "/"))) return { total: 0 };
  const clean = stripCommentsAndLogs(src);
  const cat = { templateText: 0, attrText: 0, toastModal: 0, orFallback: 0, errorThrow: 0 };
  for (const m of clean.matchAll(/>([^<>]*)</gu)) if (CJK.test(m[1]) && m[1].trim() !== "") cat.templateText++;
  for (const m of clean.matchAll(/(?:placeholder|alt|aria-label|label|title)\s*=\s*["'`]([^"'`]*)["'`]/giu)) if (CJK.test(m[1])) cat.attrText++;
  for (const m of clean.matchAll(/(?:showToast|showModal|toastModal|showLoading)\b[\s\S]{0,200}?\b(?:title|content|message)\s*:\s*["'`]([^"'`]*)["'`]/giu)) if (CJK.test(m[1])) cat.toastModal++;
  for (const m of clean.matchAll(/\|\|\s*["'`]([^"'`]*)["'`]/gu)) if (CJK.test(m[1])) cat.orFallback++;
  for (const m of clean.matchAll(/(?:new\s+Error|throw)\s*\(\?\s*["'`]([^"'`]*)["'`]/giu)) if (CJK.test(m[1])) cat.errorThrow++;
  const total = cat.templateText + cat.attrText + cat.toastModal + cat.orFallback + cat.errorThrow;
  return { total, ...cat };
}

const hardcoded = { total: 0, templateText: 0, attrText: 0, toastModal: 0, orFallback: 0, errorThrow: 0, files: 0 };
if (SCAN_HARDCODED) {
  for (const f of walkFiles(SRC)) {
    const rel = relative(REPO, f);
    const res = classifyHardcodedChinese(readFileSync(f, "utf8"), rel);
    if (res.total > 0) hardcoded.files++;
    for (const k of ["total", "templateText", "attrText", "toastModal", "orFallback", "errorThrow"]) hardcoded[k] += res[k] || 0;
  }
}

/* ── 第四维（第七轮 §5.7）：同层重复键，文本级 ─────────────────────────────────
   为什么门要补这根轴：客户端 i18n-duplicate-keys.spec.ts 证过「运行时对象叶子路径唯一」
   恒真（Object.keys 永不重复，后写覆盖前写 ⇒ t() 退回裸键名，151 个 spec 全绿照不出）。
   那条 spec 只看 client locales；本门是 node 载具、按 --zh 参数可指到任意 locale 文件，
   在这里装同一条轴后 admin 的 zh-CN（无任何判点覆盖）也进同一把尺子。
   判据：TS 文本里**同一花括号层**出现两次同名键。字符串内容不参与层数统计
   （值里常见 "{n}" 与 "a: b"，naive 计数会漂层把重复藏掉）。
   基线 = 0（2026-11-01 实测 client zh-CN 与 admin zh-CN 均 0 对），出现即红，无棘轮——
   重复键没有「存量合理」的形态。 */
function duplicateSameLayerKeys(text) {
  const seen = new Map(); // 完整点号路径 -> 首见行
  const dups = [];
  const path = []; // 进入每层 `{` 时压入「打开这层的那个键」——光靠深度分不清嵌套兄弟层（自证抓过）
  let i = 0, line = 1, inStr = null, tokStart = -1, tokEnd = -1, tokQuote = "", lastKey = null;
  const completeKey = () => {
    if (tokStart < 0) return;
    const key = text.slice(tokStart, tokEnd).trim();
    if (key) {
      const full = path.filter(Boolean).length ? path.filter(Boolean).join(".") + "." + key : key;
      if (seen.has(full)) dups.push(`${full}（首见行 ${seen.get(full)}，重现行 ${line}）`);
      else seen.set(full, line);
      lastKey = key;
    }
    tokStart = -1; tokQuote = "";
  };
  while (i < text.length) {
    const c = text[i], n = text[i + 1];
    if (c === "\n") { line++; i++; continue; }
    if (inStr) {
      if (c === "\\") { i += 2; continue; }
      if (c === inStr) { if (tokQuote === inStr && tokStart >= 0) tokEnd = i; inStr = null; }
      i++; continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      if (tokStart < 0) { tokStart = i + 1; tokEnd = -1; tokQuote = c; }
      inStr = c; i++; continue;
    }
    if (c === "/" && n === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (c === "/" && n === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) { if (text[i] === "\n") line++; i++; } i += 2; continue; }
    if (/[A-Za-z0-9_$]/.test(c)) {
      if (tokStart < 0) { tokStart = i; tokEnd = -1; tokQuote = ""; }
      else if (!tokQuote) tokEnd = i + 1;
      i++; continue;
    }
    if (c === ":" && tokStart >= 0) { if (!tokQuote) tokEnd = i; completeKey(); i++; continue; }
    if (c === "{") { path.push(lastKey ?? ""); lastKey = null; tokStart = -1; i++; continue; }
    if (c === "}") { path.pop(); tokStart = -1; i++; continue; }
    if (c === "," || c === "(" || c === ")" || c === "=" || c === "." || c === "[" || c === "]") tokStart = -1;
    i++;
  }
  return dups;
}
/* 判点自证（阳性对照内嵌，坏尺子拒判不许空过）：同层重复要抓到、异层同名要放过、
   值里的 "{n}" / "a: b" / 换行不得漂层。 */
{
  const t1 = duplicateSameLayerKeys('{"a":{"k":1,"k":2}}');
  const t2 = duplicateSameLayerKeys('{"a":{"k":1},"b":{"k":2}}');
  const t3 = duplicateSameLayerKeys('{"s":"中文 {n} 值","t":"a: b","t":2}');
  const t4 = duplicateSameLayerKeys('{"m":"跨\n行 {x}","m":1}');
  const bad = (t1.length !== 1 ? "同层重复没抓到" : "") + (t2.length !== 0 ? "异层同名误报" : "")
    + (t3.length !== 1 ? "值内冒号/花括号干扰（期得 1 对 t，实得 " + t3.length + "）" : "")
    + (t4.length !== 1 ? "值内换行漂层（期得 1 对 m，实得 " + t4.length + "）" : "");
  if (bad) { console.log("I18N_RESULT=FAIL reason=同层重复键判点自证不过（" + bad + "）⇒ 尺子坏了拒判"); process.exit(2); }
}
const ADMIN_ZH = resolve(REPO, "apps/admin/src/i18n/locales/zh-CN.ts");
const dupClient = duplicateSameLayerKeys(readFileSync(ZH, "utf8"));
const dupAdmin = existsSync(ADMIN_ZH) ? duplicateSameLayerKeys(readFileSync(ADMIN_ZH, "utf8")) : null;
const dupFail = dupClient.length > 0 || (dupAdmin !== null && dupAdmin.length > 0);

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
if (SCAN_HARDCODED) {
  console.log(
    `I18N_HARDCODED=${hardcoded.total} I18N_HARDCODED_FILES=${hardcoded.files} I18N_HARDCODED_ALLOWED=${ALLOW_HARDCODED}`
      + `（模板文本=${hardcoded.templateText} 属性=${hardcoded.attrText} toast/modal=${hardcoded.toastModal} ||兜底=${hardcoded.orFallback} throw=${hardcoded.errorThrow}）`,
  );
} else {
  console.log("I18N_HARDCODED=SKIPPED reason=--no-hardcoded");
}
console.log(`I18N_DUP_KEYS client=${dupClient.length} admin=${dupAdmin === null ? "(无该文件)" : dupAdmin.length}（同层重复键：文本级，运行时后写覆盖前写 ⇒ t() 退回裸键名；基线 0，无棘轮）`);
for (const d of dupClient.slice(0, 10)) console.log(`  DUP client zh-CN ${d}`);
if (dupAdmin !== null) for (const d of dupAdmin.slice(0, 10)) console.log(`  DUP admin zh-CN ${d}`);
if (dupFail) console.log("I18N_FAIL_DUP 同层重复键 >0：后写键静默覆盖前写，被覆盖文案从此不可达——删一个或改名，没有「存量合理」的豁免形态");

const pairFail = enExists && (zhOnly.length > 0 || enOnly.length > 0);
const orphanFail = orphans.length > ALLOW;
// 收缩升级为红（第五轮 C-F8，与其它棘轮双向纪律对齐）：实测 < 基线 也红，逼着把基线同步下调。
const orphanShrink = !orphanFail && orphans.length < ALLOW;
const hardcodedFail = SCAN_HARDCODED && hardcoded.total > ALLOW_HARDCODED;
const hardcodedShrink = SCAN_HARDCODED && hardcoded.total < ALLOW_HARDCODED;
if (!existsSync(SRC)) { console.log("I18N_RESULT=FAIL reason=扫描目录不存在 " + relative(REPO, SRC)); process.exit(2); }
if (enExists && !inBoth.length) { console.log("I18N_RESULT=FAIL reason=配对键集为空（扫描/求值塌了），不许空过"); process.exit(2); }
if (pairFail) console.log("I18N_FAIL_PAIR 成对 locale 文件键集不一致 —— 本仓纪律是「成对文件无例外」，必须两端同时补/删");
if (orphanFail) console.log(`I18N_FAIL_ORPHAN 有 ${orphans.length - ALLOW} 条超出棘轮的孤儿键（定义未被任何静态/动态引用命中）`);
if (orphanShrink) console.log(`I18N_RATCHET_SHRINK 实测孤儿 ${orphans.length} < 基线 ${ALLOW} ⇒ 基线必须降到 ${orphans.length}（只许降不许升，且现在起收缩也判红，与其它棘轮一致）`);
if (hardcodedFail) console.log(`I18N_FAIL_HARDCODED 裸中文文案 ${hardcoded.total} > 允许 ${ALLOW_HARDCODED}：新增硬编码必须走 i18n 或把基线与理由写进本文件注释`);
if (hardcodedShrink) console.log(`I18N_HARDCODED_SHRINK 实测裸中文 ${hardcoded.total} < 基线 ${ALLOW_HARDCODED} ⇒ 基线必须降到 ${hardcoded.total}（双向棘轮）`);
// 判决行只报【真正失败的那一维】：成对维在 EN 下线时是 SKIPPED，
// 把它一起印进 FAIL 文案会让下一个人去追一个不存在的差异（2026-11-01 实测踩过）。
const failDims = [];
if (orphanFail) failDims.push(`孤儿 ${orphans.length}>允许 ${ALLOW}`);
if (orphanShrink) failDims.push(`孤儿可收缩 ${orphans.length}<基线 ${ALLOW}`);
if (hardcodedFail) failDims.push(`裸中文 ${hardcoded.total}>允许 ${ALLOW_HARDCODED}`);
if (hardcodedShrink) failDims.push(`裸中文可收缩 ${hardcoded.total}<基线 ${ALLOW_HARDCODED}`);
if (pairFail) failDims.push(`pair 差异 ${zhOnly.length + enOnly.length}`);
if (dupFail) failDims.push(`同层重复键 client=${dupClient.length} admin=${dupAdmin === null ? "n/a" : dupAdmin.length}`);
if (failDims.length) {
  console.log(`I18N_RESULT=FAIL（${failDims.join("；")}）`);
} else {
  const pairNote = enExists ? "" : `（成对维 SKIPPED：en 包已下线，本维不再声称覆盖；孤儿维${SCAN_HARDCODED ? " + 裸中文维" : ""}生效）`;
  console.log(`I18N_RESULT=PASS${pairNote}`);
}
process.exit(failDims.length ? 1 : 0);
