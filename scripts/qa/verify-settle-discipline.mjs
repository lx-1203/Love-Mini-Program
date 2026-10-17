#!/usr/bin/env node
/**
 * SETTLE-DISCIPLINE —— E9「判决不许建立在固定 sleep 后单发读上」的**可红判点**（棘轮门）。
 *
 * 【为什么存在（本轮三条实测仪表伪红，全是同一个形状）】
 *   代码写 `await sleep(<固定毫秒>)` ⇒ 只发一发读 ⇒ 拿那一发下判决。三次都这样：
 *     ① 路由检查：固定 sleep 后读一次 page stack，量到的是**上一页**的落点，01-home 被记 FAIL；
 *     ② village store：`sleep(3200)` 后一发读回 `n=0 loading=true`，被写成产品缺陷；
 *     ③ 补上等稳环之后同一条检查读到 `n=20`，同一条腿从 `pass=39 fail=1` 变成
 *        `pass=41 fail=0`（real@f0677920）。
 *   ⇒ 结论：这三条都是**首读不可信**（竞态），不是产品缺陷。E9 在 v3.8 只是措辞纪律，
 *     没有任何判点守着它；本文件就是把 E9 从散文变成能红的那一格（DSL :51-55 点的"欠下一程"）。
 *
 * 【扫描载具（先实核再点名，不猜）】
 *   2026-10-16 用 `grep -c 'await sleep(' ` 实测：
 *     scripts/verify-device-leg.mjs  = 14 条  → 收（腿本体，E9 三条伪红的两条住在这里）
 *     scripts/qa/r-exec-ws.mjs       = 12 条  → 收（WS 通道执行器，同族"sleep 后一发读"）
 *     scripts/qa/r-exec-cli.mjs      =  0 条  → 不收（没有该形状，硬列进来只会造出空载具红）
 *     scripts/qa/exec-capabilities.mjs = 0 条 → 不收（同上）
 *   列进来的载具若一条 `await sleep(` 站点都找不到 ⇒ exit 2（要么文件被改写、要么本门的尺坏了；
 *   "量不到"绝不当成"没问题"，本仓口径：量不到的东西必须响亮地失败）。
 *
 * 【分类规则（可判定，逐条实现于 analyzeSite()，没有自由裁量）】
 *   站点 = 一行匹配 /\bawait\s+sleep\s*\(/，且该行不是注释行（纯注释/块注释续行里的引文不算站点）。
 *   参数形态：括号配平取出 sleep 的实参；实参是纯数字 ⇒ literal 站点（参与判定）；
 *             否则（变量/三元/Math.max/Number(opt(...))）⇒ arg_not_literal，只报数不判定
 *             ——它多半是"节拍由调用方给"的循环，静态读不出等的是不是稳态，硬判会造出假债。
 *   先剥注释再扫（尺与 scripts/qa/verify-gate-list-sync.cjs:58 同源，保留行号）：
 *   本仓的块注释是缩进式续行（只有首行带 /*，见 device-leg:509-511/:520-522），
 *   不剥就会把散文当代码行喂进前窗——等稳纪律注释写得越详细，门反而越看不见它守着的东西。
 *   对每个 literal 站点，向后看 **LOOKAHEAD=14 个代码行**（跳过空行与注释行）的前窗，按下列**固定次序**判：
 *     1) guarded（前窗）：前窗里出现循环头（for (/while (/do {），且该循环体内
 *        同时含另一发 `sleep(` 与一发读（evaluate/element/getStack/route）⇒ 它在轮询到稳。
 *        循环体边界用**缩进**收口（体=头行之后、缩进大于头行、且不超过 BODY_MAX=25 行），
 *        不用花括号配平：这些文件的选择器探针是**带大量 { 的 JS 字符串字面量**，
 *        括号配平会被字符串里的 { 骗走（实测 device-leg:446-450），缩进法对本仓排版是确定的。
 *     2) guarded（自身即轮询那一发）：站点往上 BACK=2 个代码行内出现循环头，且该循环体含一发读
 *        ⇒ 站点本身就是等稳环里的节拍（device-leg:417/460 就是这一形状）。
 *        没有这一条，等稳环补得越多、`other` 越多，门就看不见进度——方向是错的。
 *     3) single_read（欠账）：前窗内在**任何循环头之前**出现判决辅助
 *        （check( / checkI( / tally.check）⇒ "固定 sleep + 单发读喂判决"，E9 禁的就是这个。
 *        每一个都按 file:line 点名印出来（欠账必须有名字，不许只给一个数）。
 *     4) other：以上都不是 ⇒ 印出来交人看，绝不静默丢弃。
 *
 * 【棘轮（不是硬零）—— BASELINE 的来历与逐条判读】
 *   有些单发读是**安全的**：sleep 之后接的是截图/出帧（判决不依赖那一发读的时序）、
 *   或 sleep 之后做的就是被测动作本身（写操作），把它们当欠账只会教下一程去删门。
 *   所以本门用棘轮：BASELINE = 本门在 HEAD 上**实测**出来的 single_read 条数（见下），
 *   只许往下调，不许往上调；新增一条单发判决 ⇒ 超过基线 ⇒ exit 1 红。
 *   基线由实测写入，不是拍脑袋：`node scripts/qa/verify-settle-discipline.mjs --baseline 999999`
 *   读 SETTLE_COUNTS 行的 single_read=<N>，那个 N 就是下面这个常数（改尺必须同步改注释里的点名清单）。
 *   BASELINE = 7（实测 2026-10-16，尺=本文件当前实现；7 条逐条判读见 .zcode/tmp/settle-gate-lane-report.md）：
 *     device-leg:369(900ms→checkI 圈层树，读的是后台 HTTP 不是 UI，风险低但确实是单发)
 *     device-leg:508(1500ms→公告发布后等后端落库；判决在 :526，与 :516 同一条判决链，两处都被点名)
 *     device-leg:516(4500ms→routeStack+outerWxml 一发读喂 check ← E9 正身，欠账)
 *     device-leg:544(3000ms→开发布页后 input() 一发写读 check；动作本身是被测物，安全)
 *     device-leg:550(600ms→回读 input 的 value 喂 check；输入是同步的，风险低)
 *     device-leg:585(3500ms→wx.request 写本地文件后 statSync 一发读喂 checkI ← 异步写后单发读，欠账)
 *     device-leg:605(2500ms→点加图后读页面 data 数组喂 checkI ← 异步链路，欠账)
 *   清零进度由 SETTLE_RATCHET_HEADROOM 报数；上面两条标了「欠账」的先补等稳环，再往下改这个常数。
 *
 * 【两个可红形状，缺一不可】
 *   single_read > BASELINE ⇒ exit 1 + `SETTLE_RESULT=FAIL ...`（判断红：新欠账）
 *   载具文件缺失/读不了/扫描到 0 个文件/点名载具里一条站点都没有 ⇒ exit 2 +
 *   `SETTLE_RESULT=NOT-EVIDENCED ...`（仪表红：量不到不等于达标）
 *   判读以退出码与机器行为准；两个载具（DSL resultLineOf() 与 bash g()）都按 *_RESULT= 归因，
 *   所以**最后一行必须是判决行**。
 *
 * 【超时口径（供两个载具配 timeoutMs / g 秒数，实测非拍脑袋）】
 *   Node22 连测 3 发 wall：默认判定跑 148/138/142 ms；--selftest（内含 3 发子进程）375/389/383 ms。
 *   本门只读两个脚本文件、不取租约、不连模拟器、不碰 DB；默认形态不写盘，
 *   --selftest 只写 .zcode/tmp/settle-discipline/（tmp 不是任何门的输入）。
 *   两个载具一律取 60 s（bash `g settle-discipline 60`、DSL timeoutMs=60000，二者齐平：
 *   DSL 不许比 bash 小——被掐死的门读起来像红而不是跳过），对最慢实测形态有 ~150 倍余量，
 *   与本仓"比实测需求小的上限会读成假红"的口径一致（见 lint-gate.cjs:41-44）。
 *
 * 用法：node scripts/qa/verify-settle-discipline.mjs [--carriers a,b] [--baseline N]
 *        [--lookahead N] [--selftest]
 * 机器行：SETTLE_RESULT=PASS|FAIL|NOT-EVIDENCED
 * 只读：默认不写盘；--selftest 只写 .zcode/tmp/settle-discipline/（tmp 不是任何门的输入）。
 * 不取设备/自动化租约，不连模拟器，不碰 DB。
 */
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { spawnSync } from "node:child_process";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);

// ── 配置 ────────────────────────────────────────────────────────────────
const DEFAULT_CARRIERS = ["scripts/verify-device-leg.mjs", "scripts/qa/r-exec-ws.mjs"];
const MEASURED_BASELINE = 7;          // 见文件头：实测读数，只能往下改
const CARRIERS = (String(arg("carriers", "")).split(",").map((s) => s.trim()).filter(Boolean).length
  ? String(arg("carriers", "")).split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_CARRIERS);
const BASELINE = Number(arg("baseline", String(MEASURED_BASELINE)));
const LOOKAHEAD = Number(arg("lookahead", "14"));
const BACK = 2;
const BODY_MAX = 25;

const SLEEP_RE = /\bawait\s+sleep\s*\(/;
const LOOP_RE = /(?:^|[^\w$.])(?:for|while)\s*\(|(?:^|[^\w$.])do\s*\{/;
const READ_RE = /\b(?:evaluate|element|getStack|route)/;
const VERDICT_RE = /\b(?:check|checkI)\s*\(|tally\.check/;

const isBlank = (l) => /^\s*$/.test(l);
const isCommentish = (l) => { const t = l.trim(); return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*"); };
const indentOf = (l) => (l.match(/^[ \t]*/m) || [""])[0].replace(/\t/g, "  ").length;

/** 剥注释但**保留行号**（每行仍然产出一行，注释部分变空）。
 *  尺与 scripts/qa/verify-gate-list-sync.cjs:58 的 stripComments 同源（同一把尺才不漂移）：
 *  逐字符维护字符串状态（' " ` 与反斜杠转义）与块注释状态，字符串外的 // 与 /* 起丢弃。
 *  为什么本门也必须要这一把尺：本仓的块注释是缩进式续行（device-leg:509-511、:520-522 那种
 *  只有首行带 /* 的写法），只看行首会把注释行当代码行喂进前窗，于是 14 个代码行的窗口里
 *  有 5 行是散文——判决辅助被挤出窗外，等稳纪律注释写得越详细，门越看不见它守着的东西。 */
function stripCommentsPreserveLines(src) {
  const lines = [];
  let inBlock = false;
  for (const raw of src.split(/\r?\n/)) {
    let out = "";
    let q = null;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (inBlock) {
        if (c === "*" && raw[i + 1] === "/") { inBlock = false; i++; }
        continue;
      }
      if (q) {
        out += c;
        if (c === "\\") out += raw[++i] || "";
        else if (c === q) q = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") { q = c; out += c; continue; }
      if (c === "/" && raw[i + 1] === "/") break;
      if (c === "/" && raw[i + 1] === "*") { inBlock = true; i++; continue; }
      out += c;
    }
    lines.push(out);
  }
  return lines;
}

/** sleep(...) 的实参文本：从 `sleep(` 后第一个 ( 起做括号配平（跳过字符串字面量里的括号）。 */
function sleepArgOf(line) {
  const m = /(?:^|[^\w$.])sleep\s*\(/.exec(line);
  if (!m) return null;
  let i = line.indexOf("(", m.index + m[0].length - 1);
  let depth = 0, q = null, out = "";
  for (; i < line.length; i++) {
    const c = line[i];
    if (q) { out += c; if (c === "\\") { out += line[++i] || ""; } else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; out += c; continue; }
    if (c === "(") { depth++; if (depth === 1) continue; }
    if (c === ")") { depth--; if (depth === 0) return out.trim(); }
    out += c;
  }
  return out.trim();
}

/** 循环体行集合：头行之后、缩进严格大于头行、最多 BODY_MAX 行；单行循环就返回头行自己。 */
function loopBodyLines(lines, h) {
  const head = lines[h];
  const opens = (head.match(/\{/g) || []).length;
  const closes = (head.match(/\}/g) || []).length;
  if (opens > 0 && closes >= opens) return [head];
  const hi = indentOf(head);
  const body = [];
  for (let j = h + 1; j < lines.length && j <= h + BODY_MAX; j++) {
    if (isBlank(lines[j])) continue;
    if (indentOf(lines[j]) <= hi) break;
    body.push(lines[j]);
  }
  return body;
}

const bodyHas = (body, re) => body.some((l) => !isCommentish(l) && re.test(l));

/** 对一个站点定类：返回 {cls, why}
 *  前窗按**代码行**计（跳过空行与可识别注释行），不按物理行计。
 *  理由是本仓补等稳环时一定自带一段纪律注释（device-leg:405-412、:457-458 就是），
 *  物理行窗口会让"把理由写清楚"这件事反过来把等稳环挤出窗口——那是反向激励。
 *  实测：物理行 14 把 device-leg:444（E9 点名的 village store 那一发，循环头在 +15 物理行）
 *  读成 other；代码行 14 读成 guarded。 */
function analyzeSite(lines, i) {
  const win = [];
  for (let j = i + 1; j < lines.length && win.length < LOOKAHEAD; j++) {
    if (isBlank(lines[j]) || isCommentish(lines[j])) continue;
    win.push(j);
  }
  // 1) 前窗里的轮询循环
  for (const j of win) {
    if (!LOOP_RE.test(lines[j])) continue;
    const body = loopBodyLines(lines, j);
    if (bodyHas(body, /\bsleep\s*\(/) && bodyHas(body, READ_RE)) {
      return { cls: "guarded", why: `前窗第 ${win.indexOf(j) + 1} 代码行(L${j + 1})是轮询循环，体内有 sleep+读 ⇒ 等稳到阈值为止` };
    }
  }
  // 2) 站点自己贴在循环头后面（它就是轮询的那一发节拍）：往前数最多 BACK 个代码行
  let seen = 0;
  for (let j = i - 1; j >= 0 && seen < BACK; j--) {
    if (isBlank(lines[j]) || isCommentish(lines[j])) continue;
    seen++;
    if (!LOOP_RE.test(lines[j])) continue;
    const body = loopBodyLines(lines, j);
    if (bodyHas(body, READ_RE)) {
      return { cls: "guarded", why: `自身位于 L${j + 1} 循环体内且体含读 ⇒ 站点即等稳轮询的一发` };
    }
  }
  // 3) 前窗内在任何循环头之前出现判决辅助
  for (const j of win) {
    if (LOOP_RE.test(lines[j])) break;
    if (VERDICT_RE.test(lines[j])) {
      return { cls: "single_read", why: `固定 sleep 后单发读喂判决：L${j + 1} 「${lines[j].trim().slice(0, 60)}」，其间无轮询` };
    }
  }
  return { cls: "other", why: "前窗既无轮询循环也无判决辅助（等的是别的通道/别的动作，需人看）" };
}

/** 扫一个文件（已剥注释、行号与原文件一一对应）：返回站点清单 */
function scanLines(lines, label) {
  const sites = [];
  for (let i = 0; i < lines.length; i++) {
    if (isCommentish(lines[i])) continue;
    if (!SLEEP_RE.test(lines[i])) continue;
    const a = sleepArgOf(lines[i]);
    const literal = a !== null && /^\d+$/.test(a);
    const rec = { file: label, line: i + 1, arg: a === null ? "?" : a.slice(0, 40), literal };
    if (!literal) { rec.cls = "arg_not_literal"; rec.why = "sleep 的实参不是字面毫秒数（节拍由变量/表达式给）⇒ 静态读不出等的是不是稳态"; }
    else Object.assign(rec, analyzeSite(lines, i));
    sites.push(rec);
  }
  return sites;
}

const CLS = ["guarded", "single_read", "other", "arg_not_literal"];
function tally(sites) {
  const t = {};
  for (const c of CLS) t[c] = sites.filter((s) => s.cls === c).length;
  t.literal = sites.filter((s) => s.literal).length;
  t.total = sites.length;
  return t;
}

function readCarrier(rel) {
  const p = resolve(REPO, rel);
  if (!existsSync(p)) return { err: `载具不存在: ${rel}` };
  let text = "";
  try { text = readFileSync(p, "utf8"); } catch (e) { return { err: `载具读不了: ${rel} :: ${String(e.message).slice(0, 80)}` }; }
  return { text, p };
}

function run({ carriers = CARRIERS, quiet = false } = {}) {
  const out = [];
  const say = (s) => { if (!quiet) out.push(s); };
  const all = [];
  const errs = [];
  let filesScanned = 0;
  for (const rel of carriers) {
    const r = readCarrier(rel);
    if (r.err) { errs.push(r.err); continue; }
    filesScanned++;
    const rawLines = r.text.split(/\r?\n/);
    const sites = scanLines(stripCommentsPreserveLines(r.text), rel);
    const t = tally(sites);
    say(`SETTLE_SCAN ${rel} 行数=${rawLines.length} 站点=${t.total} literal=${t.literal} guarded=${t.guarded} single_read=${t.single_read} other=${t.other} arg_not_literal=${t.arg_not_literal}`);
    if (t.total === 0) errs.push(`载具里一条 await sleep( 站点都找不到: ${rel} ⇒ 尺与文件形状不符`);
    for (const s of sites) {
      s.file = rel;
      all.push(s);
    }
  }
  const T = tally(all);
  if (filesScanned === 0 || errs.length) {
    for (const e of errs) say("SETTLE_FAULT " + e);
    say(`SETTLE_RESULT=NOT-EVIDENCED files=${filesScanned}/${carriers.length} single_read=${T.single_read} baseline=${BASELINE} ⇒ 仪表本身失败，量不到≠达标`);
    return { lines: out, code: 2, counts: T, sites: all, filesScanned };
  }
  if (T.total === 0) {
    say("SETTLE_FAULT 全部载具零站点 ⇒ 扫描集空转，本判据当前无否决力");
    say(`SETTLE_RESULT=NOT-EVIDENCED files=${filesScanned} single_read=0 baseline=${BASELINE}`);
    return { lines: out, code: 2, counts: T, sites: all, filesScanned };
  }
  for (const s of all.filter((x) => x.cls === "single_read")) say(`  SINGLE_READ ${s.file}:${s.line} sleep(${s.arg}) :: ${s.why}`);
  for (const s of all.filter((x) => x.cls === "other")) say(`  OTHER ${s.file}:${s.line} sleep(${s.arg}) :: ${s.why}`);
  for (const s of all.filter((x) => x.cls === "guarded")) say(`  GUARDED ${s.file}:${s.line} sleep(${s.arg}) :: ${s.why}`);
  for (const s of all.filter((x) => x.cls === "arg_not_literal")) say(`  NONLITERAL ${s.file}:${s.line} sleep(${s.arg})`);
  const headroom = BASELINE - T.single_read;
  say(`SETTLE_COUNTS files=${filesScanned} sites=${T.total} literal=${T.literal} guarded=${T.guarded} single_read=${T.single_read} other=${T.other} arg_not_literal=${T.arg_not_literal}`);
  say(`SETTLE_RATCHET_HEADROOM=${headroom}（基线 ${BASELINE} 还差 ${headroom} 条清零；新单发判决一律红）`);
  const bad = T.single_read > BASELINE;
  say(`SETTLE_RESULT=${bad ? "FAIL" : "PASS"} single=${T.single_read} baseline=${BASELINE} guarded=${T.guarded} other=${T.other} nonliteral=${T.arg_not_literal} files=${filesScanned}`);
  return { lines: out, code: bad ? 1 : 0, counts: T, sites: all, filesScanned };
}

const print = (r) => { for (const l of r.lines) console.log(l); };

// ── --selftest：证明这把门真能红（负例必须落在盘上并 grep-back 验证）────────
const INJECT_MS = "2750";
const MARKER = "SETTLE_SELFTEST_MARKER";
function injectBlock() {
  return [
    `  await sleep(${INJECT_MS}); // ${MARKER} 注入的一条「固定 sleep + 单发读喂判决」`,
    `  const ${MARKER}_RAW = String(evaluate("${MARKER} probe"));`,
    `  check("${MARKER} 单发判决（本行是负例，不是产品码）", ${MARKER}_RAW.length > 0, ${MARKER}_RAW.slice(0, 30));`,
  ].join("\n");
}

function selftest() {
  const TMPD = join(REPO, ".zcode", "tmp", "settle-discipline", "selftest");
  const GATE = resolve(REPO, "scripts/qa/verify-settle-discipline.mjs");
  rmSync(TMPD, { recursive: true, force: true });
  mkdirSync(TMPD, { recursive: true });
  const rel = CARRIERS[0];
  const src = resolve(REPO, rel);
  if (!existsSync(src)) { console.log(`SETTLE_FAULT 源载具不存在 ${rel}`); console.log("SETTLE_RESULT=NOT-EVIDENCED selftest=源缺失"); return 2; }
  const cpRel = join(".zcode", "tmp", "settle-discipline", "selftest", basename(src));
  const cp = resolve(REPO, cpRel);
  const original = readFileSync(src, "utf8");
  const L = original.split(/\r?\n/);
  // 锚点：判决辅助 check 的定义行（本仓腿文件都有），找不到就退回首个 await sleep 站点行
  let anchor = L.findIndex((l) => /^const check = /.test(l));
  if (anchor < 0) anchor = L.findIndex((l) => SLEEP_RE.test(l) && !isCommentish(l));
  if (anchor < 0) { console.log("SETTLE_FAULT 注入锚点找不到 ⇒ 变异无从落盘，这条负例不算测过"); console.log("SETTLE_RESULT=NOT-EVIDENCED selftest=无锚点"); return 2; }

  const gateOn = (baseline) => {
    const r = spawnSync(process.execPath, [GATE, "--carriers", cpRel, "--baseline", String(baseline), "--lookahead", String(LOOKAHEAD)], { cwd: REPO, encoding: "utf8" });
    const out = String(r.stdout || "") + String(r.stderr || "");
    const m = /SETTLE_COUNTS .*single_read=(\d+)/.exec(out);
    return { exit: r.status, single: m ? Number(m[1]) : -1, out };
  };

  writeFileSync(cp, original, "utf8");
  const clean = gateOn(999999);
  if (clean.exit !== 0 || clean.single < 0) {
    console.log("SETTLE_FAULT 副本基线测量失败（副本读不出 single_read 数）⇒ 不做假负例");
    console.log(out2lines(clean.out));
    console.log("SETTLE_RESULT=NOT-EVIDENCED selftest=基线失败");
    return 2;
  }
  L.splice(anchor + 1, 0, injectBlock());
  writeFileSync(cp, L.join("\n"), "utf8");
  const back = readFileSync(cp, "utf8");
  const proof = {
    marker: (back.match(new RegExp(MARKER, "g")) || []).length,
    injectedSleep: (back.match(new RegExp(`await sleep\\(${INJECT_MS}\\)`, "g")) || []).length,
    injectedCheck: back.includes(`check("${MARKER}`),
  };
  const mut = gateOn(clean.single);
  const writeBack = original;
  writeFileSync(cp, writeBack, "utf8");
  const gone = readFileSync(cp, "utf8");
  const removed = !gone.includes(MARKER) && !gone.includes(`await sleep(${INJECT_MS})`);
  const restored = gateOn(clean.single);

  console.log(`SETTLE_SELFTEST_ANCHOR ${cpRel}:${anchor + 1}`);
  console.log(`SETTLE_SELFTEST_PROOF markerHits=${proof.marker} injectedSleep=${proof.injectedSleep} injectedCheck=${proof.injectedCheck}`);
  console.log(`SETTLE_SELFTEST_CLEAN single=${clean.single} baseline=${clean.single} exit=${clean.exit}`);
  console.log(`SETTLE_SELFTEST_MUTATED single=${mut.single} baseline=${clean.single} exit=${mut.exit} delta=${mut.single - clean.single}`);
  console.log(`SETTLE_SELFTEST_RESTORED single=${restored.single} exit=${restored.exit}`);
  rmSync(TMPD, { recursive: true, force: true });
  const landed = proof.injectedSleep === 1 && proof.injectedCheck && proof.marker > 0;
  const reddened = mut.exit === 1 && mut.single === clean.single + 1;
  const greened = restored.exit === 0 && restored.single === clean.single && removed;
  console.log(`SETTLE_SELFTEST=${landed && reddened && greened ? "PASS" : "FAIL"} red_proven=${reddened ? "yes" : "no"} green_restored=${greened ? "yes" : "no"} tamper_landed=${landed ? "yes" : "no"}`);
  console.log(`SETTLE_RESULT=${landed && reddened && greened ? "PASS" : "FAIL"} selftest single=${clean.single}->${mut.single}->${restored.single}`);
  return landed && reddened && greened ? 0 : 1;
}
const out2lines = (s) => String(s).split(/\r?\n/).filter(Boolean).map((l) => "  | " + l.slice(0, 140));

if (has("selftest")) process.exit(selftest());
const R = run();
print(R);
process.exit(R.code);
