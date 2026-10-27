/**
 * 令牌引用完整性检查（2026-10-27 全项目排查 P1）。
 *
 * 背景：check-project-rules 的 R6 只查「样式块里写死色值」，且是 warn-only。
 * 它抓不到更致命的一类：`var(--xxx)` 指向一个两处登记处都没有的令牌。
 * CSS 自定义属性的规则是——
 *   · var(--x) 无兜底 + --x 未定义 ⇒ 整条声明在 computed-value 阶段作废（边框/阴影/padding 直接没了，
 *     页面上不报错、构建不报错、类型检查不报错）；
 *   · var(--x, 兜底) ⇒ 悄悄渲染成兜底字面量，与登记处的真值长期分叉。
 * 两种都是「静态检查全绿但界面坏了」，所以在交付链上单独立一道门。
 *
 * 令牌的合法来源（任一即算已定义）：
 *   1. 登记处：theme/design-variables.scss、theme/global.scss、theme/animations.scss、
 *      styles/tokens.scss、App.vue；
 *   2. 文件内局部定义：同一文件里 `--x: value`；
 *   3. 运行时注入：任一文件里出现 `'--x':` / "--x": 形式的 :style 对象键，或 setProperty("--x", …)；
 *      （--capsule-right 由 composables/useMenuButtonRect.ts 注入、HomeHeader/MyHeader 等消费——跨文件，
 *       只看引用方会误判成断引用，故注入面全局扫描。）
 *
 * 用法：
 *   node scripts/check-token-refs.mjs            # advisory：打印清单，exit 0
 *   node scripts/check-token-refs.mjs --strict   # CI 模式：任何 ERROR exit 1
 *   node scripts/check-token-refs.mjs --json     # 机器可读输出（门自证用）
 *
 * 豁免：命中行或紧邻上一非空行含 `token-audit:ignore <理由>` 时跳过（与 check-mp-image-styles 同机制）。
 * 退出码：0 通过 / 1 有 ERROR（仅 --strict）/ 2 脚本前置条件坏了（读不到登记处＝判据失效，不等于通过）。
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, "..", "src");
const strict = process.argv.includes("--strict");
const asJson = process.argv.includes("--json");

const REGISTRY = [
  "theme/design-variables.scss",
  "theme/global.scss",
  "theme/animations.scss",
  "styles/tokens.scss",
  "App.vue",
].map((p) => resolve(srcRoot, p));

/** uni-app / 小程序容器自己注入的变量，源码里没有定义点。 */
const PLATFORM = new Set(["--status-bar-height", "--window-top", "--window-bottom", "--navbar-height"]);

const SKIP_DIRS = new Set(["node_modules", "dist", ".mimosa", "static", "tests"]);

/** 剥注释：`var(--c-brand-*)` 这类通配写法只出现在注释里，不剥会误判。 */
function stripComments(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\r\n]/g, " "))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\r\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\r\n]*/g, "$1");
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(vue|scss|css|ts)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(srcRoot, []);
const texts = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

const defined = new Set();
for (const reg of REGISTRY) {
  if (!existsSync(reg)) {
    console.log(`TOKEN_REFS=NOT-EVIDENCED reason=读不到登记处 ${relative(srcRoot, reg)}（判据失效，不是通过）`);
    process.exit(2);
  }
  const t = stripComments(readFileSync(reg, "utf8"));
  for (const m of t.matchAll(/^\s*(--[A-Za-z0-9-]+)\s*:/gm)) defined.add(m[1]);
}
if (defined.size < 300) {
  console.log(`TOKEN_REFS=NOT-EVIDENCED reason=登记处只解析出 ${defined.size} 个定义（正则过期了，不是令牌少了）`);
  process.exit(2);
}

/* 生产者集合：局部定义 + 运行时注入（跨文件也算） */
const produced = new Set(defined);
const dynamicInjection = new Set();
for (const [f, raw] of texts) {
  const t = stripComments(raw);
  for (const m of t.matchAll(/^\s*(--[A-Za-z0-9-]+)\s*:/gm)) produced.add(m[1]);
  for (const m of t.matchAll(/["'`](--[A-Za-z0-9-]+)["'`]\s*:/g)) produced.add(m[1]);
  for (const m of t.matchAll(/setProperty\(\s*["'`](--[A-Za-z0-9-]+)["'`]/g)) produced.add(m[1]);
  if (/setProperty\(\s*[`"']--[^\s"'`]*\$\{|["'`]--[^\s"'`]*\$\{/.test(t)) dynamicInjection.add(f);
}

/** 取 var(...) 的顶层第二段（兜底）；depth 计数处理嵌套。 */
function readVarCall(text, openIdx) {
  let depth = 0;
  let i = openIdx;
  const args = [];
  let cur = "";
  while (i < text.length) {
    const ch = text[i];
    if (ch === "(") {
      depth++;
      if (depth === 1) { i++; continue; }
    } else if (ch === ")") {
      depth--;
      if (depth === 0) { args.push(cur); return { args, end: i }; }
    }
    if (ch === "," && depth === 1) { args.push(cur); cur = ""; }
    else cur += ch;
    i++;
  }
  return null;
}

function lineOf(text, idx) {
  let n = 1;
  for (let i = 0; i < idx; i++) if (text[i] === "\n") n++;
  return n;
}

/** 判据本体：给一段（已剥注释的）文本 + 生产者集合，返回每条断引用及其严重级。 */
function classify(text, rawLines, producerSet, relPath) {
  const found = [];
  for (const m of text.matchAll(/var\(\s*(--[A-Za-z0-9-]+)\s*([,)])/g)) {
    const tok = m[1];
    if (producerSet.has(tok) || PLATFORM.has(tok)) continue;
    const parsed = readVarCall(text, m.index + m[0].indexOf("("));
    const hasFallback = parsed ? parsed.args.length > 1 : m[2] === ",";
    const ln = lineOf(text, m.index);
    const src = rawLines[ln - 1] || "";
    const prev = rawLines.slice(0, ln - 1).reverse().find((l) => l.trim()) || "";
    if (/token-audit:ignore/.test(src) || /token-audit:ignore/.test(prev)) continue;
    found.push({
      file: relPath,
      line: ln,
      token: tok,
      severity: hasFallback ? "WARN" : "ERROR",
      decl: src.trim().slice(0, 120),
    });
  }
  return found;
}

/* ── 自证：判据必须能变红（反 vacuous-green），且不碰磁盘上的 src ── */
if (process.argv.includes("--self-test")) {
  const probe = [
    ".a { color: var(--c-brand); }", // 已登记 ⇒ 不报
    ".b { box-shadow: var(--nope-token); }", // 无兜底 ⇒ ERROR
    ".c { background: var(--nope2, #fff); }", // 有兜底 ⇒ WARN
    ".d { right: calc(var(--capsule-right, 96px) + 24px); }", // 注入位约定 ⇒ 由生产者集合吃掉
    "// .e { color: var(--nope3); } 注释里的通配 var(--c-brand-*) 不算", // 注释 ⇒ 不报
  ].join("\n");
  const probeProduced = new Set(["--c-brand", "--capsule-right"]);
  const got = classify(stripComments(probe), probe.split("\n"), probeProduced, "«fixture»");
  const want = [
    { line: 2, token: "--nope-token", severity: "ERROR" },
    { line: 3, token: "--nope2", severity: "WARN" },
  ];
  const problems = [];
  if (got.length !== want.length) problems.push(`判据在夹具上命中 ${got.length} 条，应为 ${want.length} 条`);
  for (const [i, w] of want.entries()) {
    const g = got[i];
    if (!g || g.line !== w.line || g.token !== w.token || g.severity !== w.severity) {
      problems.push(`夹具第 ${i + 1} 条不符：期望 ${JSON.stringify(w)} 实得 ${JSON.stringify(g || null)}`);
    }
  }
  // 反向负例：把「已登记」的令牌从生产者集合里抽掉，必须立刻变红（证明放行不是因为判据根本没跑）
  const stripped = classify(stripComments(probe), probe.split("\n"), new Set(["--capsule-right"]), "«fixture»");
  if (!stripped.some((h) => h.token === "--c-brand")) problems.push("抽掉已登记令牌后判据仍放行 ⇒ 扫描集是空的，绿不可信");
  console.log(problems.length ? `TOKENREFS_SELFTEST=FAIL problems=${problems.length} ${problems.join(" | ")}` : `TOKENREFS_SELFTEST=PASS cases=${want.length + 2} 负例可红=是`);
  process.exit(problems.length ? 1 : 0);
}

const hits = [];
for (const [f, raw] of texts) {
  hits.push(...classify(stripComments(raw), raw.split(/\r?\n/), produced, relative(srcRoot, f).replace(/\\/g, "/")));
}

const errors = hits.filter((h) => h.severity === "ERROR");
const warns = hits.filter((h) => h.severity === "WARN");

if (asJson) {
  console.log(JSON.stringify({ defined: defined.size, produced: produced.size, errors, warns }, null, 2));
} else {
  for (const [label, list] of [["ERROR", errors], ["WARN", warns]]) {
    console.log(`\n===== ${label} · 断引用 ${list.length} 处 =====`);
    for (const h of list) console.log(`  ${h.file}:${h.line}  ${h.token}  |  ${h.decl}`);
  }
  console.log(
    `\nTOKEN_REFS defined=${defined.size} produced=${produced.size} ` +
      `errors=${errors.length} warns=${warns.length} files=${files.length}`,
  );
  if (errors.length) {
    console.log(
      "  ⇒ ERROR 类：var() 的令牌两处登记处都没有且无兜底，整条声明作废（边框/阴影/padding 实际没渲染）。\n" +
        "    修法：改成登记处里语义对应的真令牌；确实要新增令牌就加进 theme/design-variables.scss，别在组件里私设。",
    );
  }
  if (warns.length) {
    console.log(
      "  ⇒ WARN 类：有兜底，实际渲染的是兜底字面量，与登记处分叉。\n" +
        "    修法：同上；若是有意的运行时注入，把注入点也写成 '--token': 形式或在行尾加 token-audit:ignore <理由>。",
    );
  }
}

if (strict && errors.length) process.exit(1);
process.exit(0);
