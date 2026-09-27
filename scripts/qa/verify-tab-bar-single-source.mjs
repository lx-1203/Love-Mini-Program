#!/usr/bin/env node
/** 自定义 TabBar 的"高度单点化"静态核对（MP-R2-PAGES-DISCOVER-INDEX-014 的判点载体）。
 *
 *  这条行为什么不能靠帧判：`.tab-bar` 面板实高 = height(160rpx) + padding-bottom(24rpx) + 两个
 *  env(safe-area-inset-bottom)，而消费侧读的是 `--tab-bar-total-h: calc(184rpx + env + env)`。
 *  两边相等时像素完全一样，两边不相等时截图上也看不出"哪个数写错了"—— 184 与 160+24 的差异
 *  只在**其中一侧被单独改动**之后才成为回归。能判这件事的只有源码里的数，不是帧。
 *
 *  为什么不能把 .tab-bar 直接改成 var(--tab-bar-total-h)：mp-weixin 的 custom-tab-bar 是原生
 *  组件，不在 page 的后代之下，page 上定义的 CSS 变量传不进去（这条是台账 (a) 方案的机制障碍）。
 *  所以本门核对的是"两处字面量相加 == token"这一**可判的等价关系**，而不是"是否只有一处字面量"。
 *
 *  三条断言（任何一条不成立 ⇒ 红）：
 *   1) 主题里 --tab-bar-total-h 的式子能解析出「常量部分 + n×env(safe-area-inset-bottom)」；
 *   2) custom-tab-bar/index.wxss 的 .tab-bar 在 box-sizing:content-box 下，
 *      height 常量 + padding-bottom 常量 == token 常量，且 env 个数相同；
 *   3) 消费侧（列在 CONSUMERS 里的文件）确实通过 var(--tab-bar-total-h… 抬底，
 *      不许有人重新抄回字面量。
 *
 *  用法：node scripts/qa/verify-tab-bar-single-source.mjs [--strict] [--selftest]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
{
  const KNOWN = ["selftest", "strict", "theme", "tabbar", "repo"];
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log("TABBARSRC_RESULT=FAIL reason=不认识的旗标 " + bad.join(",") + " ⇒ 会被静默忽略而按默认路径判（拼错一个旗标就把门挪了靶子）"); process.exit(2); }
}
const R = resolve(REPO, arg("repo", "."));
const THEME = arg("theme", "apps/client/src/theme/design-variables.scss");
const TABBAR = arg("tabbar", "apps/client/src/custom-tab-bar/index.wxss");
const CONSUMERS = [
  "apps/client/src/pages/discover/index.vue",
  "apps/client/src/components/profile/mine/MyProfile.vue",
  "apps/client/src/components/profile/NotLoggedProfile.vue",
];

/* 从一段 CSS 文本里抠出"rpx 常量之和 + n 个 env(safe-area-inset-bottom)"。
   只认 safe-area-inset-bottom：这是这条判据讲的那个量，别把 statusbar 的 env 混进来。 */
function parseExpr(text) {
  const t = String(text || "").replace(/\/\*[\s\S]*?\*\//g, "");
  let rpx = 0, envs = 0;
  for (const m of t.matchAll(/(-?\d+(?:\.\d+)?)rpx/g)) rpx += Number(m[1]);
  for (const m of t.matchAll(/env\(\s*safe-area-inset-bottom/g)) envs++;
  return { rpx, envs, raw: t.replace(/\s+/g, " ").trim() };
}
/* 取某个声明的值：只认"这一条声明"，不做全文求和 —— 否则同文件里别的 calc 会被误加进来。
   返回**最后一个捕获组**：像 /(^|\n)\s*height:\s*([^;\n]+)/ 这种带行首锚的正则，
   值在组 2 而不是组 1 —— 上一版按 m[1] 取，取到的是那个换行，于是每条声明都"读不到"。 */
function declValue(src, re) {
  const m = re.exec(src);
  return m ? String(m[m.length - 1]).trim() : "";
}
function tabBarFace(src) {
  const block = /\.tab-bar\s*\{([\s\S]*?)\n\}/.exec(src);
  if (!block) return { err: "读不到 .tab-bar 规则块" };
  const b = block[1];
  const h = declValue(b, /(^|\n)\s*height:\s*([^;\n]+)/);
  const p = declValue(b, /(^|\n)\s*padding-bottom:\s*([^;\n]+)/);
  const box = declValue(b, /(^|\n)\s*box-sizing:\s*([^;\n]+)/);
  if (!h || !p) return { err: ".tab-bar 缺 height 或 padding-bottom 声明" };
  if (!/content-box/.test(box)) return { err: ".tab-bar 不是 content-box（那 padding 会计进 height，相加口径失效）" };
  const a = parseExpr(h), c = parseExpr(p);
  return { rpx: a.rpx + c.rpx, envs: a.envs + c.envs, height: h, pad: p };
}
function tokenValue(src) {
  const v = declValue(src, /--tab-bar-total-h:\s*([^;\n]+)/);
  if (!v) return { err: "主题里找不到 --tab-bar-total-h 的定义" };
  const p = parseExpr(v);
  return { rpx: p.rpx, envs: p.envs, decl: v };
}

function check({ themeSrc, tabbarSrc, consumers }) {
  const problems = [];
  const tok = tokenValue(themeSrc);
  const face = tabBarFace(tabbarSrc);
  if (tok.err) problems.push("token: " + tok.err);
  if (face.err) problems.push("面板: " + face.err);
  if (!tok.err && !face.err) {
    if (tok.rpx !== face.rpx) problems.push(`常量部分不等：token=${tok.rpx}rpx vs .tab-bar height(${face.height}) + padding-bottom(${face.pad}) = ${face.rpx}rpx ⇒ 消费侧抬底与面板实高已经漂移`);
    if (tok.envs !== face.envs) problems.push(`env(safe-area-inset-bottom) 个数不等：token=${tok.envs} 个 vs 面板=${face.envs} 个 ⇒ 有安全区的真机上会差出整整一个安全区的高度`);
  }
  for (const [c, src] of Object.entries(consumers)) {
    if (src === undefined) { problems.push("消费侧文件读不到：" + c); continue; }
    if (!/var\(\s*--tab-bar-total-h/.test(src)) problems.push("消费侧没有走 var(--tab-bar-total-h…)：" + c);
    const badLine = src.split(/\r?\n/).find((l) => /padding(-bottom)?\s*:\s*[^;]*\b\d{2,4}rpx/.test(l) && !/var\(\s*--tab-bar-total-h/.test(l) && /tab|footer|bottom/i.test(l));
    if (badLine) problems.push(`消费侧疑似重新抄回字面量：${c} :: ${badLine.trim().slice(0, 90)}`);
  }
  return { problems, tok, face };
}

function selftest() {
  const goodTheme = "page{ --tab-bar-total-h: calc(184rpx + env(safe-area-inset-bottom) + env(safe-area-inset-bottom)); }";
  const goodTab = ".tab-bar {\n  height: calc(160rpx + env(safe-area-inset-bottom));\n  padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx);\n  box-sizing: content-box;\n}";
  const consumers = { "a.vue": ".x{ padding-bottom: calc(var(--tab-bar-total-h, 184rpx) + 48rpx); }" };
  const cases = [
    { n: "现状相等 ⇒ 绿", p: { themeSrc: goodTheme, tabbarSrc: goodTab, consumers }, want: 0 },
    { n: "面板高度被单独改成 200rpx ⇒ 必须红（这就是帧看不出来的那种回归）", p: { themeSrc: goodTheme, tabbarSrc: goodTab.replace("160rpx", "200rpx"), consumers }, want: 1 },
    { n: "token 单独加了一个 env ⇒ 必须红", p: { themeSrc: goodTheme.replace("calc(184rpx +", "calc(184rpx + env(safe-area-inset-bottom) +"), tabbarSrc: goodTab, consumers }, want: 1 },
    { n: "消费侧退回字面量（没有 var）⇒ 必须红", p: { themeSrc: goodTheme, tabbarSrc: goodTab, consumers: { "a.vue": ".x{ padding-bottom: 232rpx; }" } }, want: 2 },
    { n: "box-sizing 不是 content-box ⇒ 相加口径失效，必须红", p: { themeSrc: goodTheme, tabbarSrc: goodTab.replace("content-box", "border-box"), consumers }, want: 1 },
    { n: "主题里没有这个 token ⇒ 判点空转，必须红", p: { themeSrc: "page{ --c-primary: #36C99A; }", tabbarSrc: goodTab, consumers }, want: 1 },
  ];
  let bad = 0;
  for (const c of cases) {
    const r = check(c.p);
    const got = r.problems.length;
    const ok = got > 0 === c.want > 0;
    if (!ok) bad++;
    console.log(`  ${ok ? "ok " : "BAD"} ${c.n} problems=${got}（期望${c.want > 0 ? ">0" : "0"}）`);
  }
  console.log(`TABBARSRC_SELFTEST=${bad === 0 ? "PASS" : "FAIL"} cases=${cases.length} bad=${bad}`);
  process.exit(bad ? 1 : 0);
}
if (argv.includes("--selftest")) selftest();

const missing = [THEME, TABBAR, ...CONSUMERS].filter((f) => !existsSync(join(R, f)));
if (missing.length) { console.log("TABBARSRC_RESULT=FAIL reason=前置文件缺失：" + missing.join(", ") + " ⇒ 读不到就没得判，不记绿"); process.exit(2); }
const consumers = {};
for (const c of CONSUMERS) consumers[c] = readFileSync(join(R, c), "utf8");
const { problems, tok, face } = check({ themeSrc: readFileSync(join(R, THEME), "utf8"), tabbarSrc: readFileSync(join(R, TABBAR), "utf8"), consumers });
console.log(`TABBARSRC token=${tok.rpx ?? "?"}rpx+${tok.envs ?? "?"}env（${tok.decl || tok.err || ""}）`);
console.log(`TABBARSRC face=${face.rpx ?? "?"}rpx+${face.envs ?? "?"}env（height=${face.height || face.err || ""} padding-bottom=${face.pad || ""}）`);
console.log(`TABBARSRC 消费侧=${CONSUMERS.length} 个文件（都要求出现 var(--tab-bar-total-h…)）`);
for (const p of problems) console.log("  PROBLEM " + p);
console.log(`TABBARSRC_RESULT=${problems.length ? "FAIL" : "PASS"}${problems.length ? " 漂移点=" + problems.length + "（面板与 token 各写各的字面量，正是这条判据要拦的东西）" : " 面板字面量相加==token ⇒ 单点化按 (b) 口径成立"}`);
process.exit(problems.length ? 1 : 0);
