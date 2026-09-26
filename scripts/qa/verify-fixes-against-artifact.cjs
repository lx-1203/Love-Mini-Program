#!/usr/bin/env node
'use strict';
/**
 * verify-fixes-against-artifact.cjs —— 修复波「产物可观测性」核验台（全程离线、只读）
 *
 * 为什么要有它：本轮 116 条修复波条目现在只带两种状态（`待修复` / `已修复待复验（工作树，未进 HEAD）`），
 * 两者都只说明「源码看起来修了」。本仓库口径（scripts/qa/triage-exec-failures.mjs 头部注释、G 系列门禁）
 * 明令禁止把「源码改了」当证据：被测的是构建产物 apps/client/dist/build/mp-weixin，源码树与产物是两个载体。
 * 本工具唯一的动作就是：把每条修复的预期状态搬到**正确的载体**上再看一眼。
 *
 * 五桶（必须恰好覆盖全部条目，否则 exit 2 并点名漏网条目）：
 *   ARTIFACT_VERIFIED  预期修后状态在产物里看得见（给出文件 + 命中原文）
 *   SOURCE_ONLY        源码树有、产物没有 —— 「00:16 之后才改的」的诚实标签，不得算已验
 *   NEEDS_UI_FRAME     判据是行为/观感（点击后弹层出现 / 底色不再泛绿 / 遮挡已消除），静态判不了
 *   NOT_IN_EITHER      两个载体都找不到预期修后状态 —— 疑似根本没落地，附检索串
 *   UNDECIDABLE        台账判据本身太含糊（没点名文件/选择器/值），原文照抄交人收紧
 *
 * 载体口径（规则 1）：
 *   样式类判据 → 编译后的 .wxss（本仓库构建不把 CSS 变量内联掉，token 原样留在产物里）
 *   文案类判据 → 产物只出 i18n/locales/zh-CN.js（mock 构建剥掉 en-US），
 *                所以「在产物里搜英文串」是测量失败而不是产品失败，工具直接判载体不适用而不是 NOT_FOUND
 *   模板/脚本类 → 对应页/组件的 .wxml/.js；后端类名（*Controller 等）不属于客户端产物载体
 *
 * 匹配口径（规则 2）：类名/标识符走带边界的正则（裸 includes('id') 会命中 valid/width/padding，
 * 把 400 个文件全判成命中）；渲染文本走纯 substring（运行时就是这么找的）。
 * CSS 声明比对前先把两侧空白压掉（产物是压缩的：`env(...)*2`，源码是 `env(...) * 2`），且大小写折叠。
 *
 * 用法：
 *   node scripts/qa/verify-fixes-against-artifact.cjs
 *   node scripts/qa/verify-fixes-against-artifact.cjs --sample 8
 *   node scripts/qa/verify-fixes-against-artifact.cjs --only MP-R2-POST-009,MP-R2VIS-PAGES-HOME-INDEX-005
 *   node scripts/qa/verify-fixes-against-artifact.cjs --items .zcode/tmp/fixverify-selftest/broken-items.json --sabotage 3
 *
 * 只读边界：不构建、不开端口、不碰 DevTools、不跑 npm/mvnw、不写 git、不写 reports/**。
 * 全部输出落在 .zcode/tmp/fixverify/ 下（规则 4：逐条追加落盘，中途崩溃也保住已算出的条目）。
 */

var fs = require("fs");
var path = require("path");

var ROOT = path.resolve(__dirname, "..", "..");

/* ------------------------------------------------------------------ 参数 */

function parseArgs(argv) {
  var out = { sample: 0, only: null, trace: null, items: null, sabotage: 0, dist: null, src: null, ledger: null, lanes: null, out: null, baseline: null, quiet: false };
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    var next = function () { return argv[i + 1]; };
    if (a === "--sample") out.sample = parseInt(next(), 10) || 0, i++;
    else if (a === "--only") out.only = String(next() || "").split(/[,，\s]+/).filter(Boolean), i++;
    else if (a === "--trace") out.trace = String(next() || "").split(/[,，\s]+/).filter(Boolean), i++;
    else if (a === "--items") out.items = next(), i++;
    else if (a === "--sabotage") out.sabotage = parseInt(next(), 10) || 0, i++;
    else if (a === "--dist") out.dist = next(), i++;
    else if (a === "--src") out.src = next(), i++;
    else if (a === "--ledger") out.ledger = next(), i++;
    else if (a === "--lanes") out.lanes = next(), i++;
    else if (a === "--out") out.out = next(), i++;
    else if (a === "--baseline") out.baseline = next(), i++;
    else if (a === "--quiet") out.quiet = true;
  }
  return out;
}

var ARG = parseArgs(process.argv.slice(2));

var P = {
  ledger: path.join(ROOT, ARG.ledger || "reports/audit/round-6/issue-matrix.md"),
  lanes: path.join(ROOT, ARG.lanes || ".zcode/tmp/admission/fix-lanes.json"),
  closer: path.join(ROOT, ".zcode/tmp/fixwave/closer.json"),
  i18nLanded: path.join(ROOT, ".zcode/tmp/fixwave/i18n-landed.json"),
  i18nWired: path.join(ROOT, ".zcode/tmp/fixwave/i18n-wired.json"),
  consumers: path.join(ROOT, ".zcode/tmp/fixwave/_consumers.json"),
  dist: path.join(ROOT, ARG.dist || "apps/client/dist/build/mp-weixin"),
  src: path.join(ROOT, ARG.src || "apps/client/src"),
  out: path.join(ROOT, ARG.out || ".zcode/tmp/fixverify"),
};
/* 对照组基线（本轮实测出来的前提失效）：HEAD 对照判的是"这条判点在修复前就存在吗"，
   它成立的前提是 **HEAD 还没收下本轮修复**。本轮把修复波提交成 f9a60925 之后，HEAD 就成了
   "修复后"，同一批判点全部"已在 baseline 里" ⇒ ARTIFACT_VERIFIED 从 18 掉到 8、UNDECIDABLE 从 37 涨到 45，
   一次合法的提交把核验台判成了"什么都没修"。所以对照组必须是**本轮开跑时的 SHA**，而不是"当前 HEAD"：
   提交前用默认 HEAD，提交后显式 `--baseline 874ff52f`。写法仍记进 meta，读结果的人看得见对照的是谁。 */
var BASELINE = String(ARG.baseline || "HEAD");
function safeRef(s) { return /^[0-9a-zA-Z_.^{}~/+-]{1,64}$/.test(s) ? s : "HEAD"; }
if (BASELINE !== "HEAD" && safeRef(BASELINE) !== BASELINE) {
  console.log("BASELINE_REJECTED=" + JSON.stringify(BASELINE.slice(0, 24)) + "（字符集不合，退回 HEAD）");
  BASELINE = "HEAD";
}
var SRC_SRC_PREFIX = "apps/client/src/";
var LOCALE_DIST_REL = "i18n/locales/zh-CN.js";
var LOCALE_SRC_REL = "i18n/locales/zh-CN.ts";
var APP_WXSS_REL = "app.wxss";
var EXCERPT_MAX = 120;

var FATAL = [];
function fatal(msg) { FATAL.push(msg); }

/* ------------------------------------------------- 载体索引（整份读进内存） */

var EXT_DIST = [".wxml", ".wxss", ".js", ".json"];
var EXT_SRC = [".vue", ".ts", ".js", ".scss", ".css", ".json"];

function walk(dir, exts, out) {
  out = out || [];
  var ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (var i = 0; i < ents.length; i++) {
    var e = ents[i];
    var p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      walk(p, exts, out);
    } else if (exts.indexOf(path.extname(e.name)) >= 0) {
      var st;
      try { st = fs.statSync(p); } catch (err) { continue; }
      if (st.size <= 4 * 1024 * 1024) out.push(p);
    }
  }
  return out;
}

function squash(text) { var s = "", i = 0; while (i < text.length) { var c = text[i]; if (!/\s/.test(c)) s += c; i++; } return s; }

/** 把压掉空白后的下标还原回原文下标（只为截取摘录做，单次线性扫描） */
function sqToOrig(text, sqIdx) {
  var seen = 0;
  for (var i = 0; i < text.length; i++) { if (!/\s/.test(text[i])) { if (seen === sqIdx) return i; seen++; } }
  return text.length - 1;
}

function mkFile(abs, rel) {
  var text;
  try { text = fs.readFileSync(abs, "utf8"); } catch (e) { return null; }
  return { abs: abs, rel: rel, text: text, sq: squash(text).toLowerCase(), lc: text.toLowerCase() };
}

function buildIndex(root, exts) {
  var files = walk(root, exts);
  var byRel = {};
  var list = [];
  for (var i = 0; i < files.length; i++) {
    var f = mkFile(files[i], path.relative(root, files[i]).split(path.sep).join("/"));
    if (!f) continue;
    list.push(f);
    byRel[f.rel] = f;
  }
  return { root: root, list: list, byRel: byRel };
}

var DIST = buildIndex(P.dist, EXT_DIST);
var SRC = buildIndex(P.src, EXT_SRC);
if (!DIST.list.length) fatal("产物载体索引为空：" + P.dist);
if (!SRC.list.length) fatal("源码载体索引为空：" + P.src);

/** 全仓兜底命中（只用于「命中的是不是别的文件」这一条审计信息，不授予绿） */
function globalHitsIdx(idx, probe) {
  var re = probeRegex(probe);
  var useSq = needsSquash(probe);
  var hits = [];
  for (var i = 0; i < idx.list.length && hits.length < 6; i++) {
    var f = idx.list[i];
    re.lastIndex = 0;
    var m = re.exec(useSq ? f.sq : f.lc);
    if (m) hits.push({ rel: f.rel, at: m.index });
  }
  return hits;
}

/* ---------------------------------------------------------------- 摘录 */

function truncate(s) {
  s = String(s).replace(/\s+/g, " ").trim();
  return s.length > EXCERPT_MAX ? s.slice(0, EXCERPT_MAX - 1) + "…" : s;
}

function excerpt(f, sqIdx, plain) {
  var i = plain ? sqIdx : sqToOrig(f.text, sqIdx);
  var from = Math.max(0, i - 55);
  var to = Math.min(f.text.length, i + 85);
  return truncate(f.text.slice(from, to));
}

/* ------------------------------------------------------- 边界匹配正则 */

function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/** 标识符/类名：必须成词。允许两侧出现 `.`（产物把类名写成 `.foo.data-v-xxxx`），
 *  但绝不允许字母/数字/_/-/$ 贴边 —— 裸 includes('id') 会命中 valid/width/padding，把 400 个文件判成假有。 */
/** 成员表达式（IMAGE_PATHS.ICONS_V2.MORE_SVG 这类）在产物里会被打包器拆开：
 *  实测编译后是 `e.unref(o.IMAGE_PATHS).ICONS_V2.MORE_SVG`，命名空间访问被包成 `).`，
 *  所以整串字面匹配必然落空——这不是"产物里没有"，是我的探针形不对。
 *  改判据为"各段按序出现、段间只允许打包器插入的非标识符字符（≤14）"，段本身仍须成词。 */
/** 大小写必须不敏感：matchIn 的草堆是 `f.lc = text.toLowerCase()`（见 :123），
 *  而台账判据里的标识符/成员链多是大写（IMAGE_PATHS、ICONS_V2、MORE_SVG）。
 *  之前 reIdent 不带 i 标志 ⇒ 任何含大写的 token 在产物侧**永远命中不了**，
 *  这是一整类系统性假阴性（不是"产物里没有"，是我的正则形不对）。
 *  草堆已全小写，加 i 不会引入新的误绿——它只是把本来该中的补齐。 */
function reMemberPath(tok) {
  var segs = String(tok).split(".").filter(function (s) { return s.length > 0; });
  if (segs.length < 2) return null;
  for (var i = 0; i < segs.length; i++) if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segs[i])) return null;
  var gap = "[^A-Za-z0-9_$]{0,14}";
  return new RegExp("(^|[^A-Za-z0-9_$\\-])" + segs.map(esc).join(gap) + "(?![A-Za-z0-9_$\\-])", "i");
}

function reIdent(tok) {
  var mp = reMemberPath(tok);
  if (mp) return mp;
  return new RegExp("(^|[^A-Za-z0-9_$\\-])" + esc(tok) + "(?![A-Za-z0-9_$\\-])", "i");
}
/** CSS 变量：--c-brand 不得吞掉 --c-brand-500 */
function reCssVar(tok) {
  return new RegExp(esc(tok) + "(?![A-Za-z0-9_\\-])");
}
/** 渲染文本 / CSS 声明：运行时就是 substring，别自找麻烦 */
function rePlain(s) { return new RegExp(esc(s), "i"); }

/** 该探针要在哪种文本上做匹配：压缩态（CSS 声明/变量）还是原样（类名/文案/键名） */
function needsSquash(probe) { return probe.kind === "css-decl" || probe.kind === "css-var" || probe.kind === "css-var-def"; }
function probeRegex(probe) {
  if (probe.kind === "css-var" || probe.kind === "css-var-def") return reCssVar(probe.token);
  if (probe.kind === "css-decl") return rePlain(squash(probe.token));
  if (probe.kind === "literal") return rePlain(probe.token);
  return reIdent(probe.token);
}
/** 标识符/字符串值/键名这类"独一份"的 token，全局命中即视为同一实体；
 *  CSS 声明与类名会跨文件合法重复，只认该页作用域内的命中。 */
function globalCountsAsHit(probe) { return probe.kind === "symbol" || probe.kind === "string-lit" || probe.kind === "identifier" || probe.kind === "api"; }

/* -------------------------------------------------- i18n 键位解析（两侧） */

/**
 * 递归扫描 locale 对象字面量，产出全部点号路径。
 * 源码侧键带引号（"common": {）、产物侧不带（common:{），两者都要能吃。
 */
function parseLocaleKeys(text) {
  var keys = {};
  var start = text.indexOf("{");
  if (start < 0) return { keys: keys, ok: false, count: 0 };
  var i = start, depth = 0, stack = [];
  var ok = true;
  var LIMIT = 2000000;
  function skipWs() { while (i < text.length && /\s/.test(text[i])) i++; }
  function readQuotedOrIdent() {
    skipWs();
    var q = text[i];
    if (q === '"' || q === "'" || q === "`") {
      var j = i + 1, buf = "";
      while (j < text.length) {
        if (text[j] === "\\") { buf += text[j + 1]; j += 2; continue; }
        if (text[j] === q) break;
        buf += text[j]; j++;
      }
      i = j + 1;
      return buf;
    }
    var m = /^[A-Za-z0-9_$\u4e00-\u9fa5]+/.exec(text.slice(i));
    if (!m) return null;
    i += m[0].length;
    return m[0];
  }
  function skipValue() {
    skipWs();
    var c = text[i];
    if (c === "{") { var d = 1; i++; while (i < text.length && d > 0) { if (text[i] === "{") d++; else if (text[i] === "}") d--; i++; } return true; }
    if (c === "[") { var d2 = 1; i++; while (i < text.length && d2 > 0) { if (text[i] === "[") d2++; else if (text[i] === "]") d2--; i++; } return true; }
    if (c === '"' || c === "'" || c === "`") { readQuotedOrIdent(); return true; }
    var m2 = /^[^,}\]]*/.exec(text.slice(i));
    i += m2 ? m2[0].length : 0;
    return true;
  }
  while (i < text.length && LIMIT-- > 0) {
    skipWs();
    var ch = text[i];
    if (ch === "}") { stack.pop(); i++; continue; }
    if (ch === ",") { i++; continue; }
    if (ch === "/" && text[i + 1] === "*") { var e1 = text.indexOf("*/", i); i = e1 < 0 ? text.length : e1 + 2; continue; }
    if (ch === "/" && text[i + 1] === "/") { var e2 = text.indexOf("\n", i); i = e2 < 0 ? text.length : e2 + 1; continue; }
    if (ch === "{") { depth++; i++; continue; }
    var key = readQuotedOrIdent();
    if (key === null) { ok = false; i++; continue; }
    skipWs();
    if (text[i] !== ":") { i++; continue; }
    i++;
    skipWs();
    var isObj = text[i] === "{";
    var prefix = stack.length ? stack.join(".") + "." : "";
    keys[prefix + key] = isObj ? "object" : "leaf";
    if (isObj) { stack.push(key); } else { skipValue(); }
  }
  var n = 0;
  for (var k in keys) if (keys[k] === "leaf") n++;
  return { keys: keys, ok: ok, count: n };
}

var LOCALE_DIST = (function () {
  var f = DIST.byRel[LOCALE_DIST_REL];
  return f ? parseLocaleKeys(f.text) : { keys: {}, ok: false, count: 0 };
})();
var LOCALE_SRC = (function () {
  var f = SRC.byRel[LOCALE_SRC_REL.replace("i18n/locales/zh-CN.ts", "i18n/locales/zh-CN.ts")];
  return f ? parseLocaleKeys(f.text) : { keys: {}, ok: false, count: 0 };
})();

/* ----------------------------------------------------------- 台账解析 */

var LEDGER_SECTIONS = { 11: 1, 6: 2, 4: 3 };

function readLedger() {
  var txt;
  try { txt = fs.readFileSync(P.ledger, "utf8"); } catch (e) { fatal("读不到台账 " + P.ledger); return { rows: {}, alias: {}, lines: 0, badPipe: 0 }; }
  var lines = txt.split(/\r?\n/);
  var rows = {}, alias = {}, badPipe = 0, n = 0;
  var secCount = { 1: 0, 2: 0, 3: 0 };
  for (var li = 0; li < lines.length; li++) {
    var L = lines[li];
    if (L.charAt(0) !== "|") continue;
    var pipes = (L.match(/\|/g) || []).length;
    var cells = L.split("|").slice(1, -1).map(function (s) { return s.trim(); });
    var sec = LEDGER_SECTIONS[cells.length];
    if (!sec) { if (/^MP-/.test(cells[0] || "")) badPipe++; continue; }
    if (!/^MP-/.test(cells[0])) continue;
    if (/^-+$/.test(cells[0])) continue;
    n++;
    secCount[sec] = (secCount[sec] || 0) + 1;
    var r;
    if (sec === 1) {
      r = {
        sec: 1, line: li + 1, id: cells[0], aliases: cells[1], page: cells[2], category: cells[3],
        severity: cells[4], status: cells[5], confidence: cells[6], evidence: cells[7],
        statusEvidence: cells[8], ideal: cells[9], action: cells[10],
      };
    } else if (sec === 2) {
      r = {
        sec: 2, line: li + 1, id: cells[0], aliases: cells[1], page: "", category: "", severity: "",
        status: cells[3], confidence: "", evidence: cells[4], statusEvidence: "", ideal: "",
        action: cells[5],
      };
    } else {
      r = { sec: 3, line: li + 1, id: cells[0], aliases: cells[1], page: cells[2], category: "", severity: "", status: "", confidence: "", evidence: "", statusEvidence: "", ideal: "", action: cells[3] };
    }
    rows[r.id] = r;
    var am = String(r.aliases || "").match(/MP-[A-Za-z0-9\-]+/g) || [];
    for (var ai = 0; ai < am.length; ai++) if (!alias[am[ai]] && !rows[am[ai]]) alias[am[ai]] = r.id;
  }
  return { rows: rows, alias: alias, lines: n, badPipe: badPipe, secCount: secCount };
}

var LED = readLedger();

function statusHead(s) { return String(s || "").replace(/[（(].*$/, "").trim(); }

/* ------------------------------------------------- 修复波条目（含并案回源） */

function loadLaneItems() {
  var raw;
  var srcPath = ARG.items ? (path.isAbsolute(ARG.items) ? ARG.items : path.join(ROOT, ARG.items)) : P.lanes;
  try { raw = JSON.parse(fs.readFileSync(srcPath, "utf8")); } catch (e) { fatal("读不到条目集 " + srcPath + "：" + e.message); return { items: [], origin: srcPath, note: "unreadable" }; }
  var items = [];
  var note = [];
  if (Array.isArray(raw)) {
    for (var i = 0; i < raw.length; i++) {
      var r = raw[i] || {};
      items.push({ id: String(r.id || "NO-ID-" + i), laneFile: String(r.file || r.laneFile || r.path || "") });
    }
    note.push("条目集为顶层数组（fixture 模式），字段取 id/file");
  } else if (Array.isArray(raw.items)) {
    for (var j = 0; j < raw.items.length; j++) items.push({ id: String(raw.items[j].id || "NO-ID-" + j), laneFile: String(raw.items[j].file || raw.items[j].target_file || "") });
    note.push("条目集顶层是 items[]");
  } else if (Array.isArray(raw.hotspots) || Array.isArray(raw.singles)) {
    var seen = {};
    var k;
    for (k = 0; k < (raw.hotspots || []).length; k++) {
      var h = raw.hotspots[k];
      var ids = Array.isArray(h.ids) ? h.ids : [];
      for (var m = 0; m < ids.length; m++) { if (!seen[ids[m]]) { seen[ids[m]] = 1; items.push({ id: String(ids[m]), laneFile: String(h.file || "") }); } }
    }
    for (k = 0; k < (raw.singles || []).length; k++) {
      var s = raw.singles[k];
      var sid = typeof s === "string" ? s : String(s.id || "");
      if (sid && !seen[sid]) { seen[sid] = 1; items.push({ id: sid, laneFile: s && s.file ? String(s.file) : "" }); }
    }
    note.push("fix-lanes.json 实测顶层键 = " + Object.keys(raw).join(",") + "（hotspots[].{file,ids[]} + singles[].{file,id}，没有 severity/status/what-to-fix —— 判据文本一律回台账取）");
    if (typeof raw.stillOpen === "number") note.push("fix-lanes.stillOpen=" + raw.stillOpen + "，实际展开 " + items.length + " 条");
  } else {
    fatal("认不出的条目集结构：" + srcPath + " 顶层键 " + Object.keys(raw).join(","));
  }
  return { items: items, origin: srcPath, note: note.join("；") };
}

/* ------------------------------------------------ 次级来源（closer / i18n） */

function loadJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return null; } }

var CLOSER = loadJson(P.closer);
var CLOSER_BY_ID = {};
if (CLOSER && Array.isArray(CLOSER.items)) {
  for (var ci = 0; ci < CLOSER.items.length; ci++) {
    var it = CLOSER.items[ci];
    var cid = String(it.id || "").replace(/（.*$/, "").trim();
    if (!cid) continue;
    if (!CLOSER_BY_ID[cid]) CLOSER_BY_ID[cid] = it;
  }
}
var CLOSER_FILES = (CLOSER && Array.isArray(CLOSER.files_changed)) ? CLOSER.files_changed : [];

var I18N_KEYS = {};
(function () {
  var landed = loadJson(P.i18nLanded), wired = loadJson(P.i18nWired), cons = loadJson(P.consumers);
  function add(k, meta) { if (!k) return; if (!I18N_KEYS[k]) I18N_KEYS[k] = meta || {}; }
  if (landed && Array.isArray(landed.keys_landed)) landed.keys_landed.forEach(function (e) { add(e.key, { zh: e.zh, en: e.en, consumer: e.consumer, src: "i18n-landed" }); });
  if (wired && Array.isArray(wired.wired)) wired.wired.forEach(function (e) { add(e.key, { src: "i18n-wired", consumers: e.consumers }); });
  if (cons) Object.keys(cons).forEach(function (k) { add(k, { src: "_consumers", consumers: cons[k] }); });
})();

/* -------------------------------------------- 源码文件 → 产物文件映射 */

function stemOf(rel) { return rel.replace(/\.(vue|ts|tsx|js|jsx|scss|sass|css|json)$/, ""); }

function resolveSrcRel(item) {
  var cands = [];
  var f = item.laneFile || "";
  if (/^apps\/client\/src\//.test(f)) cands.push(f.slice(SRC_SRC_PREFIX.length));
  else if (/^src\//.test(f)) cands.push(f.slice(4));
  var page = (item.ledger && item.ledger.page) || "";
  if (page) {
    cands.push(page + ".vue"); cands.push(page + ".ts");
    cands.push(page + "/index.vue");
    if (!/^pages\//.test(page) && !/^subpackages\//.test(page)) { cands.push("pages/" + page + "/index.vue"); cands.push("pages/" + page + ".vue"); }
  }
  var texts = [(item.ledger && item.ledger.evidence) || "", (item.ledger && item.ledger.statusEvidence) || "", (item.ledger && item.ledger.action) || ""];
  for (var t = 0; t < texts.length; t++) {
    var mm = String(texts[t]).match(/apps\/client\/src\/[A-Za-z0-9_\-./]+\.(?:vue|ts|js|scss|css)/g) || [];
    for (var q = 0; q < mm.length; q++) cands.push(mm[q].slice(SRC_SRC_PREFIX.length));
  }
  var uniq = [], seen = {};
  for (var c = 0; c < cands.length; c++) {
    var rel = cands[c].replace(/^\.\//, "");
    if (seen[rel]) continue;
    seen[rel] = 1;
    if (SRC.byRel[rel]) uniq.push(rel);
  }
  if (!uniq.length && f) {
    var base = path.basename(f).replace(/\.[a-z]+$/, "");
    var guess = SRC.list.filter(function (x) { return path.basename(x.rel).replace(/\.[a-z]+$/, "") === base; });
    if (guess.length === 1) uniq.push(guess[0].rel);
  }
  return uniq;
}

function distScopeFor(srcRels, kinds) {
  var out = [], seen = {};
  function push(rel) { if (!seen[rel] && DIST.byRel[rel]) { seen[rel] = 1; out.push(DIST.byRel[rel]); } }
  for (var i = 0; i < srcRels.length; i++) {
    var stem = stemOf(srcRels[i]);
    if (/^theme\//.test(srcRels[i]) || /^styles?\//.test(srcRels[i]) || /\.scss$/.test(srcRels[i])) push(APP_WXSS_REL);
    if (/^i18n\/locales\//.test(srcRels[i])) push(LOCALE_DIST_REL);
    for (var e = 0; e < EXT_DIST.length; e++) push(stem + EXT_DIST[e]);
    if (!DIST.byRel[stem + ".wxml"] && !DIST.byRel[stem + ".js"]) {
      var base = path.basename(stem);
      for (var d = 0; d < DIST.list.length; d++) {
        var b = path.basename(DIST.list[d].rel).replace(/\.[a-z]+$/, "");
        if (b === base) push(DIST.list[d].rel);
      }
    }
  }
  push(LOCALE_DIST_REL);
  push(APP_WXSS_REL);
  push("common/vendor.js");
  return out;
}

function srcScopeFor(srcRels) {
  var out = [], seen = {};
  function push(rel) { if (!seen[rel] && SRC.byRel[rel]) { seen[rel] = 1; out.push(SRC.byRel[rel]); } }
  for (var i = 0; i < srcRels.length; i++) push(srcRels[i]);
  push("theme/design-variables.scss");
  push("theme/tokens.scss");
  push(LOCALE_SRC_REL);
  return out;
}

/* ------------------------------------------------------ 判据文本 → 探针 */

var CSS_PROPS = ("position top left right bottom inset z-index display flex flex-direction flex-wrap flex-shrink flex-grow " +
  "align-items justify-content align-self gap row-gap column-grid grid-template-columns width height min-height min-width max-width max-height " +
  "padding padding-top padding-right padding-bottom padding-left padding-inline margin margin-top margin-right margin-bottom margin-left " +
  "background background-color background-image color border border-top border-right border-bottom border-left border-radius border-color " +
  "box-shadow box-sizing overflow overflow-x overflow-y text-align text-overflow font-size font-weight font-family line-height letter-spacing " +
  "opacity transform transition visibility white-space word-break pointer-events cursor vertical-align list-style " +
  "-webkit-line-clamp -webkit-box-orient -webkit-overflow-scrolling appearance").split(" ");

var COPY_VERB = /(文案|措辞|提示语|标注|写成|改为|改成|输出|显示|渲染|留一句话|口径改|补一句)/;
var REMOVE_VERB = /(删掉|删除|移除|去掉|下掉|不再使用|不再保留|清空|撤掉)/;
var SUBST_VERB = /(改为|改成|改用|改走|统一走|统一为|替换为|替换成|换为|换成|补上|新增|加上|使用|应用|走|→|改)/;
var RUNTIME_MARK = /(点击|按下|长按|双击|输入后|输入时|聚焦|失焦|滚动|滑动|拖动|下拉|手势|切换后|加载|请求|接口|响应|返回体|刷新|轮询|节流|防抖|去重|重复调用|重复触发|时序|时机|状态机|守卫|拦截|键盘|弹层|弹窗|浮层|Toast|toast|出现|消失|弹出|展开|收起|动画|播放|录音|权限|授权|回调|登录态|缓存|持久化|冷启动|首次进入|二次进入|触发|生效|未生效|运行时|@error|@load|@tap|@input|@confirm|v-if|v-else|条件渲染|事件绑定|空态|骨架|占位|兜底|可达|不可隐藏)/;
/** 运行时接线类判据：静态看到属性/键不算数，必须帧 */
var WIRING_MARK = /(@error|@load|@tap|@input|v-if|v-else|条件渲染|事件绑定|空态|骨架屏|占位文案|兜底分支)/;
var VISUAL_MARK = /(遮挡|泛绿|泛色|偏色|错位|偏移|塌陷|溢出|裁切|截断|折行|抖动|闪烁|肉眼|观感|视觉|截图|真机|帧|配色|看起来|显示不全|显示异常|重影|压盖|压住|挡住)/;
var FRAME_MARK = /(需帧|要帧|状态帧|复验帧|真机帧|下轮帧|配对复验|需人|人工裁决|待裁决)/;
var BACKEND_MARK = /(后端|服务端|Controller|Repository|mvnw|数据库|SQL|migration|接口对方)/;

/** 从一段「修后」文本里抠出可静态比对的探针 */
function probesFrom(text, origin, polarity, anchored) {
  var out = [];
  if (!text) return out;
  var seen = {};
  /* `add` 是判点的唯一入口，所以"能不能当判点"也在这里定。
     台账正文里点名的常常是文件名或整句中文说明（如 `match.ts`、`align-self:flex-end（`、
     `background:var(--c-brand) + --s-brand`），拿去搜字符串必然两载体都查不到，
     于是把"抽取器的噪声"误判成"这条没修"（本轮 NOT_IN_EITHER 15 条里就有 4 条是这个成因）。
     规则：① 文件名后缀不是判点；② 全角标点处截断，截不出 ≥3 字符就丢；③ css 声明按 + 拆成独立判点。 */
  var JUNK_FILE = /\.(vue|ts|tsx|js|cjs|mjs|json|scss|sass|css|md|svg|png|jpe?g|gif|sh|txt|wxss|wxml)$/i;
  /* 取证散文里写下的命令（`grep -rn f6fbfc apps/client/src`）曾被整条当成 string-lit 判点，
     产物里当然没有这条命令串 → 又一个"我的说明在给自己造指控"的形状。命令动词开头的多词 token 一律丢。 */
  var JUNK_CMD = /^(grep|awk|sed|find|node|npm|npx|cd|ls|cat|head|tail|wc|stat|git|netstat|curl|wget)\s/i;
  /* 载体/流程自身的词不是"修后物件"，不能当判点：本轮我把 `HEAD 对照…` 这类取证说明写进证据列之后，
     抽取器真造出了 identifier=HEAD 这条硬判点，两个载体里当然都没有 "HEAD" 这个词，
     于是 CIRCLE-HOME-001 / CHAT-SESSION-A03 从"判点命中"被打成 NOT_IN_EITHER。
     也就是说：**我的取证散文在给自己造假指控**，必须在这一层拦掉。 */
  var JUNK_PROSE = /^(HEAD|HEAD[:：]?$|git|grep|awk|sed|commit|sha1?|sha16|diff|merge|rebase|NOT_IN_EITHER|ARTIFACT_VERIFIED|SOURCE_ONLY|NEEDS_UI_FRAME|UNDECIDABLE|verdict|台账|证据|产物|工作树|源码|构建|重建|复验|待复验|已修复|未修|对照|实测|直算|口径|判据)$/i;
  function refine(tok) {
    var t = String(tok || "").trim().replace(/^[`「『[]+/, "").trim();
    var cut = t.search(/[（）、「】；：]/);
    if (cut > 0) t = t.slice(0, cut).trim();
    else if (cut === 0) return "";
    t = t.replace(/[;，,`]+$/g, "").trim();
    /* 收尾仍带 markdown/代码残留的直接弃用：判点是"产物里能搜到的那段字"，
       带反引号或花括号就说明抽取器把句子的外壳当成了内容（本轮实测两种：`56rpx}\``、`{`）。 */
    if (/[`{}]/.test(t)) return "";
    return t;
  }
  function add(kind, token, carrier, extra) {
    if (!token) return;
    var parts = kind === "css-decl" && token.indexOf("+") >= 0 ? token.split(/\s*\+\s*/) : [token];
    for (var pi = 0; pi < parts.length; pi++) {
      var tok = refine(parts[pi]);
      if (tok.length < 3) continue;
      if (JUNK_FILE.test(tok.split(/\s/)[0])) continue;
      if (JUNK_CMD.test(tok)) continue;
      if (JUNK_PROSE.test(tok.trim())) continue;
      var key = kind + "|" + tok + "|" + polarity;
      if (seen[key]) continue;
      seen[key] = 1;
      out.push({ kind: kind, token: tok, carrier: carrier, polarity: polarity, origin: origin, anchored: !!anchored, extra: extra || null });
    }
  }

  var m;
  var reVar = /\(\s*(--[A-Za-z0-9_\-]+)/g;
  while ((m = reVar.exec(text))) add("css-var", m[1], "wxss");

  var reVarDef = /(^|[\s;{,，、(（])(--[A-Za-z0-9_\-]+)\s*:/g;
  while ((m = reVarDef.exec(text))) add("css-var-def", m[2], "wxss");

  for (var p = 0; p < CSS_PROPS.length; p++) {
    var prop = CSS_PROPS[p];
    var from = 0;
    while (true) {
      var idx = indexOfWord(text, prop + ":", from);
      if (idx < 0) break;
      var v = readDeclValue(text, idx + prop.length + 1);
      from = idx + 1;
      if (!v) continue;
      if (/[一-龥]/.test(v) && !/var\(/.test(v)) continue;
      if (v.length < 1) continue;
      add("css-decl", prop + ":" + v, "wxss");
    }
  }

  var reCls = /(?:^|[^A-Za-z0-9_$.\/\-])[.]([a-z][a-z0-9]*(?:__|--|-)[A-Za-z0-9_\-]+)/g;
  while ((m = reCls.exec(text))) { var c = m[1]; if (c.length >= 5 && !/\.(wxss|wxml|json|scss|ts|js|vue|md)$/.test(c)) add("class", c, "wxml+wxss"); }
  var reAttr = /class\s*=\s*["'`]([^"'`]+)["'`]/g;
  while ((m = reAttr.exec(text))) m[1].split(/\s+/).forEach(function (x) { if (/^[a-z][a-z0-9]*(__|--|-)/.test(x) && x.length >= 5) add("class", x, "wxml+wxss"); });

  var reKey = /(^|[^A-Za-z0-9_.\-])([a-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*){1,3})\b/g;
  while ((m = reKey.exec(text))) {
    var k = m[2];
    if (/^(com|org|cn|net|io|www)$/.test(k.split(".")[0])) continue;
    if (k.split(".").length < 2) continue;
    if (LOCALE_DIST.keys[k] || LOCALE_SRC.keys[k]) add("i18n-key", k, "locale");
  }

  var reImg = /\bIMAGE_PATHS\.([A-Z0-9_.]+)/g;
  while ((m = reImg.exec(text))) add("symbol", "IMAGE_PATHS." + m[1], "js");
  var reNS = /(?:^|[^A-Za-z0-9_.])([A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]+)\b/g;
  while ((m = reNS.exec(text))) if (/^(ICONS|MESSAGE_ICONS|ASSETS|SOUNDS|BANNERS|AVATARS|ILLUSTRATIONS|LOGOS|ICONS_COMMON|ICONS_EMOJI|ICONS_SOCIAL|TABS)/.test(m[1])) add("symbol", m[1], "js");

  var reAsset = /["'`]?((?:\/?static\/|\/)[A-Za-z0-9._\-\/]+\.(?:svg|png|jpe?g|webp|gif))["'`]?/g;
  while ((m = reAsset.exec(text))) add("asset", m[1], "static");

  var reApi = /["'`](\/[a-z][a-z0-9\-\/]*(?:\/[a-z0-9\-{}:]+)+)["'`]/g;
  while ((m = reApi.exec(text))) add("api", m[1], "js");

  var reCn = /[「“]([^」”]{2,40})[」”]/g;
  while ((m = reCn.exec(text))) {
    var lit = m[1];
    if (!/[\u4e00-\u9fa5]/.test(lit)) continue;
    if (/[（）()「」]/.test(lit)) continue;
    if (/(逻辑|判据|修复|口径|种子|后端|裁决|射程|台账|注释|方案|原句|非同一|需人|状态帧)/.test(lit)) continue;
    if (!COPY_VERB.test(text)) continue;
    add("literal", lit, "locale+wxml");
  }

  /* 引号/反引号里的代码字面量：字符串值不会被压缩器改名，所以它是可信判点；
     裸标识符（函数名/局部量）会被改名，只能当"存在即有效"的单边判点。 */
  var reQ = /["'`]([^"'`\n]{2,60})["'`]/g;
  while ((m = reQ.exec(text))) {
    var q = m[1];
    if (/^--/.test(q) || /^[.#]/.test(q) || /\(.*\)/.test(q)) continue;
    if (/[\u4e00-\u9fa5]/.test(q)) {
      if (!COPY_VERB.test(text)) continue;
      if (/[（）()「」]/.test(q) || /(逻辑|判据|修复|口径|种子|后端|裁决|射程|台账|注释|方案|原句|非同一|需人|状态帧)/.test(q)) continue;
      if (q.length <= 40) add("literal", q, "locale+wxml");
      continue;
    }
    if (!/^[A-Za-z0-9_$.\-\/ ]+$/.test(q)) continue;
    if (q.length < 3) continue;
    add("string-lit", q, "js");
  }

  /* Vue 事件/属性名带冒号：`update:modelValue`、`sync:xxx`。
     reId 的字符类不含冒号，会把 `update:modelValue` 劈成 `update` 与 `modelValue` 两段，
     `update` 被"纯小写多半是散文"的规则丢掉，于是判点退化成裸 `modelValue`——
     而 props 名 `modelValue` 本来就该留着，删除型判点于是永远"在产物里还在"
     （实测把 MP-R2-VILLAGE-INDEX-011 一条三载体同向（HEAD 2→工作树 0→产物 0）的已修项判成 NOT_IN_EITHER）。 */
  var reColon = /\b((?:update|sync):[A-Za-z0-9_$]+)/g;
  while ((m = reColon.exec(text))) add("symbol", m[1], "js+wxml");

  var reId = /(?:^|[^A-Za-z0-9_$.\/\-])([A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)/g;
  while ((m = reId.exec(text))) {
    var idf = m[1];
    if (IDENT_NOISE[idf] || idf.length < 4) continue;
    if (!/[A-Z_]/.test(idf.slice(1)) && idf.indexOf(".") < 0) continue; // 纯小写单词多半是散文
    if (/^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/.test(idf) && LOCALE_DIST.keys[idf]) continue; // 已按 i18n-key 处理
    if (idf.indexOf(".") >= 0 && /\.[a-z][A-Za-z0-9]*$/.test(idf) && LOCALE_DIST.keys[idf]) continue;
    add("identifier", idf, "js+wxml");
  }

  var reBackend = /\b([A-Z][A-Za-z0-9]*(?:Controller|Service|Repository|Mapper|Entity|Dto))\b/g;
  while ((m = reBackend.exec(text))) add("backend", m[1], "backend");

  return out;
}

var IDENT_NOISE = {};
("const let var function return this props computed watchEffect watch onMounted onUnmounted onShow onHide string number boolean " +
  "undefined null true false object array promise import export default from class extends item items index value values key keys " +
  "data slot slots emit refs ref nextTick defineComponent uniapp typescript javascript vue script template style scoped important " +
  "TODO FIXME conststa width height color flex grid block none auto hidden visible absolute relative fixed static center left right").split(/\s+/)
  .forEach(function (w) { IDENT_NOISE[w] = 1; IDENT_NOISE[w.toLowerCase()] = 1; });

function indexOfWord(text, needle, from) {
  var i = text.indexOf(needle, from || 0);
  if (i < 0) return -1;
  var before = i === 0 ? "" : text.charAt(i - 1);
  if (/[A-Za-z0-9_\-]/.test(before)) return indexOfWord(text, needle, i + 1);
  return i;
}

/** 从 value 起点扫到括号深度 0 处的分隔符（保留 var(--x, #FFF) 里的逗号） */
function readDeclValue(text, at) {
  var i = at, depth = 0, buf = "";
  while (i < text.length) {
    var c = text[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") { if (depth === 0) break; depth--; }
    else if (depth === 0 && /[,;。，、；\n]/.test(c)) break;
    /* 深度 0 处遇到 `}` / 反引号 / 全角括号就是值结束：台账里我写的是 markdown 代码片段
       `.not-logged__title{font-size:56rpx}`，旧值读取把 `}` 和收尾反引号一起吃进判点，
       造出 token=`font-size:56rpx}\`` 这种产物里必然搜不到的"判点"，
       于是 MP-R2VIS-PAGES-MESSAGES-INDEX-001/003 被判 NOT_IN_EITHER ——
       查不到的是我的标点，不是没修。ASCII 括号不在此列（var(--x, 1) 要能读完）。 */
    else if (depth === 0 && /[}`（）「」『』]/.test(c)) break;
    else if (depth === 0 && /[一-龥]/.test(c) && buf.replace(/\s/g, "").length > 1) break;
    buf += c;
    i++;
  }
  return buf.trim().replace(/[;,，、]+$/, "");
}

/** 把台账文本切成子句，并区分「修前」与「修后」两侧（规则 1：判据要落在对的载体上，
 *  更要落在对的一侧 —— 拿证据列的修前值去产物里搜，必然一片绿）。 */
function clausesOf(text, origin) {
  var parts = String(text || "").split(/[。；;\n]/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var raw = parts[i].trim();
    if (!raw) continue;
    var clause = { text: raw, post: "", pre: "", polarity: "present", origin: origin || "ledger-action", anchored: false };
    if (REMOVE_VERB.test(raw)) clause.polarity = "absent";
    var vi = firstVerbIndex(raw);
    var arrow = raw.indexOf("→");
    if (vi && arrow >= 0 && arrow < vi.head) { clause.pre = raw.slice(0, arrow); clause.post = raw.slice(arrow + 1); }
    else if (vi) { clause.pre = raw.slice(0, vi.head); clause.post = raw.slice(vi.at); }
    else if (arrow >= 0) { clause.pre = raw.slice(0, arrow); clause.post = raw.slice(arrow + 1); }
    else clause.post = raw;
    clause.anchored = !!(vi || arrow >= 0);
    if (/（或|\(或/.test(raw)) clause.post = clause.post + " " + raw;
    out.push(clause);
  }
  return out;
}

function firstVerbIndex(s) {
  var verbs = ["改为", "改成", "改用", "改走", "统一走", "统一为", "替换为", "替换成", "换为", "换成", "补上", "补", "新增", "加上", "删掉", "删除", "移除", "去掉", "下掉", "不再使用", "不再保留", "使用", "应", "需", "走", "改"];
  var best = null;
  for (var i = 0; i < verbs.length; i++) {
    var v = verbs[i], from = 0;
    while (true) {
      var k = s.indexOf(v, from);
      if (k < 0) break;
      var before = k === 0 ? "" : s.charAt(k - 1);
      if (!/[A-Za-z]/.test(before)) { if (!best || k < best.at) best = { at: k, head: k, verb: v }; break; }
      from = k + 1;
    }
  }
  if (!best) return null;
  return { at: best.at + best.verb.length, head: best.head };
}

/* ----------------------------------------------- closer.json 的差异串 */

function closerExpect(item) {
  var c = CLOSER_BY_ID[item.id];
  if (!c) return null;
  var rec = { action: c.action, diff: c.diff || "", evidence: c.evidence || "", post: [], pre: [] };
  var segs = String(c.diff || "").split("；");
  for (var i = 0; i < segs.length; i++) {
    var s = segs[i].replace(/^[\s:：\d\-–~,.]*\s*/, "");
    var a = s.indexOf("→");
    if (a >= 0) { rec.pre.push(s.slice(0, a)); rec.post.push(s.slice(a + 1)); }
    else rec.post.push(s);
  }
  rec.note = c.note || "";
  return rec;
}

/* -------------------------------------------- statusEvidence 的源码锚点 */

function anchorLines(srcRef) {
  var m = /^(apps\/client\/src\/[^\s:]+|src\/[^\s:]+):(\d+)(?:-(\d+))?/.exec(String(srcRef).trim());
  if (!m) return null;
  var rel = m[1].replace(/^apps\/client\/src\//, "").replace(/^src\//, "");
  var f = SRC.byRel[rel];
  if (!f) return null;
  var a = parseInt(m[2], 10), b = m[3] ? parseInt(m[3], 10) : a;
  if (b - a > 40) b = a + 40;
  var L = f.text.split(/\r?\n/).slice(a - 1, b).join("\n");
  return { rel: rel, from: a, to: b, text: L };
}

function stripComments(s) {
  return s.split(/\r?\n/).filter(function (l) {
    var t = l.trim();
    if (!t) return false;
    if (/^(\/\/|\/\*|\*)/.test(t)) return false;
    return true;
  }).join("\n");
}

/* "改动前的对照组里就有" = 这个命中什么也没证明。默认对照组是 HEAD，**这个默认只在修复尚未提交时成立**
   （前提失效的后果见上面 BASELINE 那段）。缓存按 ref+路径去重，只给候选绿行取。 */
var HEAD_CACHE = {};
function headText(rel) {
  var ck = BASELINE + "#" + rel;
  if (Object.prototype.hasOwnProperty.call(HEAD_CACHE, ck)) return HEAD_CACHE[ck];
  var txt = "";
  try {
    txt = require("child_process").execSync('git show "' + safeRef(BASELINE) + ':apps/client/src/' + rel + '"', { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) { txt = ""; }
  HEAD_CACHE[ck] = txt;
  return txt;
}
function grantingPredatesFix(item, probes) {
  var toks = probes.map(function (r) { return String(r.token || ""); }).filter(function (t) { return t.length >= 3; });
  if (!toks.length) return false;
  var rels = (item.srcRels && item.srcRels.length ? item.srcRels.slice() : (item.laneFile ? [item.laneFile] : []));
  var files = rels.map(function (x) { return String(x).replace(/^apps[/]client[/]src[/]/, ""); });
  var blob = files.map(headText).join(String.fromCharCode(10)).toLowerCase();
  if (!blob) return false;                      // HEAD 里没有这些文件（新增文件）→ 不能据此否掉
  return toks.every(function (t) { return blob.indexOf(t.toLowerCase()) >= 0; });
}

/* --------------------------------------------------------- 探针求值 */

function matchIn(files, probe) {
  var re0 = probeRegex(probe);
  var re = re0.global ? re0 : new RegExp(re0.source, re0.flags + "g");
  var useSq = needsSquash(probe);
  // css-decl 判点必须按"属性名左边界"命中：台账判据写 right:8rpx，产物里 margin-right:8rpx
  // 也含这一串——朴素 substring 命中会把"另一个属性的值"当成这条修好了（本轮 spot-check 抓到一例误绿）。
  var needLeft = probe.kind === "css-decl" || probe.kind === "literal";
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var hay = useSq ? f.sq : f.lc;
    re.lastIndex = 0;
    var m;
    while ((m = re.exec(hay))) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      if (needLeft && m.index > 0 && /[a-z0-9-]/i.test(hay.charAt(m.index - 1))) continue;
      return { hit: true, rel: f.rel, at: m.index, excerpt: excerpt(f, m.index, !useSq), squashed: useSq };
    }
  }
  return { hit: false };
}

function evalProbe(probe, item) {
  var res = {
    kind: probe.kind, token: probe.token, carrier: probe.carrier, polarity: probe.polarity,
    origin: probe.origin, anchored: !!probe.anchored, note: null,
  };
  res.hard = isHard(probe);

  if (probe.kind === "backend") { res.usable = false; res.note = "后端类名不属于客户端产物载体（apps/client/dist 里没有服务端 class）"; return res; }
  if (probe.orphanName) { res.usable = false; res.orphanName = true; res.artifact = { hit: false }; res.src = { hit: false }; res.note = "点名的标识符在两个载体里都不存在：可能是未落地，也可能只是台账里的提案名（压缩构建会改局部名，不能反推）"; return res; }
  if (probe.kind === "en-copy") { res.usable = false; res.note = "英文文案判据的载体不在被测产物里：mock 构建只出 i18n/locales/zh-CN.js，en-US 被剥掉 —— 在产物里搜英文串属测量失败，不判 NOT_FOUND"; return res; }
  if (probe.carrier === "static") {
    var rel = probe.token.replace(/^\/?static\//, "").replace(/^\//, "");
    res.artifact = { hit: !!DIST.byRel["static/" + rel] || fs.existsSync(path.join(P.dist, rel)) };
    res.artifactFile = "static/" + rel;
    res.src = { hit: !!SRC.byRel[rel] || !!SRC.byRel["static/" + rel] };
    res.srcFile = rel;
    res.artifactExcerpt = res.artifact.hit ? "（产物里存在该静态资源文件）static/" + rel : null;
    res.srcExcerpt = res.src.hit ? "（源码树里存在）" + rel : null;
    res.artifactScope = res.artifact.hit ? "static" : null;
    res.grantsGreen = !!res.artifact.hit;
    res.usable = true;
    return res;
  }

  var dScope = item.distScope, sScope = item.srcScope;

  if (probe.kind === "i18n-key") {
    var leaf = probe.token.split(".").slice(-1)[0];
    var inDistLocale = !!LOCALE_DIST.keys[probe.token];
    var inSrcLocale = !!LOCALE_SRC.keys[probe.token];
    var usageD = matchIn(dScope.filter(function (f) { return /\.js$/.test(f.rel); }), { kind: "i18n-key", token: probe.token });
    var usageS = matchIn(sScope.filter(function (f) { return /\.(vue|ts|js)$/.test(f.rel); }), { kind: "i18n-key", token: probe.token });
    res.artifact = { hit: inDistLocale || usageD.hit };
    res.artifactFile = inDistLocale ? LOCALE_DIST_REL : (usageD.rel || null);
    res.artifactExcerpt = inDistLocale ? (function () {
      var f = DIST.byRel[LOCALE_DIST_REL];
      var i = f.lc.indexOf(leaf.toLowerCase() + ":");
      return i >= 0 ? excerpt(f, i, true) : null;
    })() : usageD.excerpt;
    res.src = { hit: inSrcLocale || usageS.hit };
    res.srcFile = inSrcLocale ? LOCALE_SRC_REL : (usageS.rel || null);
    res.srcExcerpt = inSrcLocale ? leaf + ": (在 zh-CN.ts 键位表内)" : usageS.excerpt;
    var ik = I18N_KEYS[probe.token];
    if (ik) res.secondary = (ik.src || "i18n") + " 记 zh=" + JSON.stringify(ik.zh) + " en=" + JSON.stringify(ik.en);
    if (!res.artifact.hit && ik && ik.zh === true) res.note = "次级来源（" + ik.src + "）说 zh 键已落地，产物键位表里却没有 —— 该差异按 SOURCE_ONLY 记，不替产物说话";
    /* 光"共享语言包里有这个键"不背书某一条修复：要么该页编译出的 .js 里真的 t() 了这个键，
       要么次级来源（i18n-landed/wired/_consumers）点名了这把键。 */
    res.artifactScope = usageD.hit ? "page" : (inDistLocale ? "shared-locale" : null);
    res.grantsGreen = !!usageD.hit || (inDistLocale && !!ik);
    res.usable = true;
    return res;
  }

  var a = matchIn(dScope, probe);
  var s = matchIn(sScope, probe);
  res.artifact = { hit: a.hit };
  res.artifactFile = a.rel || null;
  res.artifactExcerpt = a.excerpt || null;
  res.artifactScope = a.hit ? "page" : null;
  res.src = { hit: s.hit };
  res.srcFile = s.rel || null;
  res.srcExcerpt = s.excerpt || null;

  if (!a.hit) {
    var g = globalHitsIdx(DIST, probe);
    if (g.length) {
      if (globalCountsAsHit(probe)) {
        var gf = DIST.byRel[g[0].rel];
        var gre = probeRegex(probe); gre.lastIndex = 0;
        var gm = gre.exec(needsSquash(probe) ? gf.sq : gf.lc);
        res.artifact = { hit: true };
        res.artifactFile = g[0].rel;
        res.artifactExcerpt = gm ? excerpt(gf, gm.index, !needsSquash(probe)) : null;
        res.artifactScope = "global";
        res.note = "命中不在该页作用域文件里，而在 " + g[0].rel + "（该 token 全局唯一性足够，按产物可见处理）";
      } else {
        res.elsewhere = g.slice(0, 3).map(function (x) { return x.rel; });
        res.note = "token 只在该页作用域之外的文件里出现（" + res.elsewhere.join(", ") + "），CSS/类名跨文件会合法重名，按越界命中处理，不授予绿";
      }
    }
  }

  /* 命中 ≠ 该给绿。只有落在"这条判据所属载体"上的命中才算证据（规则 1 的正面执行）：
     - 页/组件自己编译出来的文件：任何判点都算
     - app.wxss：CSS 变量"定义"算；变量"使用"只有当本条判点本就落在主题文件里才算
     - i18n/locales/zh-CN.js：只有被次级来源点名的键算（"共享语言包里有这句话"不背书某个页面消费了它）
     - vendor/common/app.js：只认 symbol / 字符串值 / 接口路径
     - 别页文件（global 越界命中）：一律不授予绿 */
  function scopeGrants(file, scope, kind) {
    if (!file || scope !== "page") return false;
    if (file === APP_WXSS_REL) return kind === "css-var-def" || (item.themeNative && (kind === "css-var" || kind === "css-decl"));
    if (file === LOCALE_DIST_REL) return kind === "i18n-key" && !!I18N_KEYS[probe.token];
    if (/^(common\/|app\.js$)/.test(file)) return kind === "symbol" || kind === "string-lit" || kind === "api" || kind === "asset";
    return true;
  }
  res.grantsGreen = scopeGrants(res.artifactFile, res.artifactScope, probe.kind);
  if (a.hit && !res.grantsGreen) res.note = (res.note ? res.note + "；" : "") + "命中落在 " + res.artifactFile + "（不在本条判据的载体上），只记为观测、不授予绿";

  /* 压缩构建会把局部函数名/变量名改掉：产物里没有该名字，不能反推「没落地」，
     也不能反推「删干净了」—— 一个从未进过产物的名字，删除在产物侧根本不可观测。 */
  if (probe.kind === "identifier" && !res.artifact.hit && (res.src.hit || probe.polarity === "absent")) {
    res.inconclusive = true;
    res.note = "标识符 " + probe.token + " 在压缩产物里搜不到：" + (probe.polarity === "absent"
      ? "该名字可能从未进过构建（minifier 改局部名），「删掉了」在产物侧不可观测"
      : "minifier 会改局部名，静态无从分辨「没进构建」与「改名了」");
  }
  res.usable = true;
  return res;
}

/** 探针可信度分级：判点来自「修→修后」的显式对侧（closer 差异串、statusEvidence 源码锚点、
 *  台账处置列动词后侧）算 hard；只是从句子里顺手抠出来的物件算 soft —— soft 命中不足以单独给绿。 */
function isHardOrigin(o) { return o === "closer-diff" || o === "src-anchor"; }
function isHard(p) { return isHardOrigin(p.origin) || p.anchored === true; }
var SPECIFICITY = { "css-decl": 5, "css-var-def": 4, "css-var": 4, asset: 4, "string-lit": 4, class: 3, "i18n-key": 3, api: 3, symbol: 2, identifier: 2, literal: 1 };

function decide(item, results) {
  var incon = results.filter(function (r) { return r.inconclusive; });
  var orphans = results.filter(function (r) { return r.orphanName; });
  var usable = results.filter(function (r) { return r.usable && !r.inconclusive; });
  var present = usable.filter(function (r) { return r.polarity === "present"; });
  var absent = usable.filter(function (r) { return r.polarity === "absent"; });
  var hard = usable.filter(isHard);

  function noJudge(whyExtra) {
    if (item.frame) return { verdict: "NEEDS_UI_FRAME", why: "台账自述需要帧/人工复验" + (whyExtra ? "；" + whyExtra : "") };
    if (item.uiMarks.length) return { verdict: "NEEDS_UI_FRAME", why: "判据是行为/观感（" + item.uiMarks.join("+") + "），静态无判点" + (whyExtra ? "；" + whyExtra : "") };
    return { verdict: "UNDECIDABLE", why: (whyExtra || "台账判据里抠不出任何可比对的具体物件（文件/选择器/值/键/文案）") };
  }

  if (!usable.length) {
    var whyExtra = "";
    if (incon.length) whyExtra = "唯一抠到的判点是标识符 " + incon.map(function (r) { return r.token; }).slice(0, 3).join(", ") + "，压缩构建会改名";
    else if (orphans.length) whyExtra = "判据只点到两载体都不存在的名字 " + orphans.map(function (r) { return r.token; }).slice(0, 3).join(", ");
    return noJudge(whyExtra);
  }
  if (!hard.length) {
    item.notes.push("只抠到 soft 级顺手词（" + usable.slice(0, 4).map(function (r) { return r.kind + " " + r.token; }).join(", ") + "），不足以授予绿");
    return noJudge("判据没点名可核验的修后物件（无 closer 差异串/源码锚点/显式「改→新值」）");
  }

  var judgedP = hard.filter(function (r) { return r.polarity === "present"; });
  var judgedA = hard.filter(function (r) { return r.polarity === "absent"; });
  /* 同一标识同时被要求"可见"与"不可见" ＝ 这条台账判据本身是「二选一」，静态侧不可能同时成立。
     实测触发者 MP-R2-PAGES-MESSAGES-INDEX-022：处置写「删掉 toggleSessionPin（并删测试）
     或 让长按菜单改调 toggleSessionPin 并补 console.warn」，抽取器于是产出
     present(console.warn) + present(toggleSessionPin) + absent(toggleSessionPin) 三支探针，
     而三支全部 grantsGreen=true —— 一套判据里两个分支互相否决对方却都判"绿"，
     等于这条永远不可能报红。判据自相矛盾时必须交回人收紧，不给任何桶。 */
  var pTok = new Set(judgedP.map(function (r) { return r.token; }));
  var conflict = judgedA.filter(function (r) { return pTok.has(r.token); });
  if (conflict.length) {
    var toks = conflict.map(function (r) { return r.token; }).join(", ");
    item.notes.push("判据自相矛盾（同一标识既要求可见又要求不可见）：" + toks);
    return {
      verdict: "UNDECIDABLE",
      why: "判据自相矛盾：同一标识（" + toks + "）既被要求存在于产物、又被要求从产物里消失 —— " +
        "台账这条是「二选一」的处置，需人先选定唯一改点再判；在此之前任何一侧命中都不构成已修",
    };
  }
  var aOk = judgedP.filter(function (r) { return r.artifact.hit && r.grantsGreen; });
  var weak = judgedP.filter(function (r) { return r.artifact.hit && !r.grantsGreen; });
  var aBad = judgedP.filter(function (r) { return !r.artifact.hit; });
  var srcOnly = aBad.filter(function (r) { return r.src.hit; });
  var nowhere = aBad.filter(function (r) { return !r.src.hit; });
  /* 删除型判点只在该页作用域内可被反驳：
     本轮实测两条假指控——MP-R2-PROFILE-034 的 fetchProgress、MP-R2-VILLAGE-INDEX-011 的 modelValue
     在该页源码/产物里都已不存在，命中全在 vendor.js / 别页组件（全局唯一性授绿规则 :838 的适用面），
     拿"别处还有这个名字"说"该删的没删"是把作用域搞混了。 */
  var absentBad = judgedA.filter(function (r) { return r.artifact.hit && r.grantsGreen && r.artifactScope === "page"; });

  /* 台账自己说「判据不成立 / 未取证 / 需裁决」的行：静态命中一律不推进到"已验"。
     这类行的预期修后状态本就没确立，命中一条早就存在的字符串不等于修了什么。 */
  if (item.statusBlocked && !aOk.length) return noJudge("台账 status=「" + item.statusBlocked + "」：判据未成立或待裁决，静态命中不推进状态");

  if (item.frame && !aOk.length) return { verdict: "NEEDS_UI_FRAME", why: "台账自述需要帧/人工复验，静态侧亦无判点命中" };
  if (!judgedP.length && judgedA.length) {
    if (!absentBad.length) return { verdict: "ARTIFACT_VERIFIED", why: "删除型判点在该页产物作用域内已不可见（" + judgedA.map(function (r) { return r.token; }).join(", ") + "）" };
    return { verdict: "NOT_IN_EITHER", why: "该删的东西在产物里还在：" + absentBad.map(function (r) { return r.token; }).join(", ") };
  }
  if (nowhere.length && !aOk.length && !srcOnly.length) {
    if (weak.length) return noJudge("只在共享载体（语言包/主题/别页）里命中，未证明该页消费了它：" + weak.map(function (r) { return r.token; }).slice(0, 3).join(", "));
    return { verdict: "NOT_IN_EITHER", why: "两个载体都查不到预期修后状态" };
  }
  if (nowhere.length) return { verdict: "NOT_IN_EITHER", why: "判点 " + nowhere.map(function (r) { return r.token; }).join(", ") + " 在两个载体里都查不到（同项其余判点已可见）" };
  if (srcOnly.length) {
    /* SOURCE_ONLY 也必须过 HEAD 对照：原来只有授绿路径（ARTIFACT_VERIFIED）跑了 grantingPredatesFix，
       于是"源码里有、产物里暂时没有"就被当成"本轮改的"——可判点在 HEAD 里本来就存在时，
       这句话什么都证明不了（实测拦下 MP-R2-PAGES-MESSAGES-INDEX-022 的 console.warn 与
       MP-R2VIS-…-PUBLISH-A01 的 village.post.mentionHint 两条假推进）。 */
    if (grantingPredatesFix(item, srcOnly)) return noJudge("只在源码树命中的判点（" + srcOnly.map(function (r) { return r.token; }).slice(0, 3).join(", ") + "）在修复前的 HEAD 里就已存在，不能算本轮落地");
    return { verdict: "SOURCE_ONLY", why: (aOk.length ? "部分判点已在产物可见、但 " : "") + srcOnly.map(function (r) { return r.token; }).join(", ") + " 只在源码树里 —— 00:16 之后才改的，不得算已验" };
  }
  if (absentBad.length) return { verdict: "SOURCE_ONLY", why: "待删项 " + absentBad.map(function (r) { return r.token; }).join(", ") + " 源码侧已不可见、产物里却还在（删除只落在工作树）" };
  if (!aOk.length) {
    if (weak.length) return noJudge("只在共享载体（语言包/主题/别页）里命中，未证明该页消费了它：" + weak.map(function (r) { return r.token; }).slice(0, 3).join(", "));
    return { verdict: "NOT_IN_EITHER", why: "全部判点在两载体皆不可见" };
  }
  if (item.statusBlocked) return { verdict: "UNDECIDABLE", why: "产物侧虽命中，但台账 status=「" + item.statusBlocked + "」自述判据未成立/需裁决，静态不代主编排层推进状态" };

  var softMiss = present.filter(function (r) { return !isHard(r) && !r.artifact.hit; });
  if (softMiss.length) item.notes.push("soft 判点未确认（不影响本判决，仅备查）：" + softMiss.slice(0, 4).map(function (r) { return r.token; }).join(", "));
  /* 只要还剩"因压缩改名而读不出"的硬判点，就不许给绿：本轮实测 MP-R2-MATCHING-014 的判据是
     onUnload 部分复位（matchedUser 仅在 status!=='matched' 时清），而 onUnload/matchedUser 三个标识符
     在产物里全被改名，唯一命中的是字符串 "matched" —— 它在修复前后的产物里都在，
     用这种"与改动无关的常量"授绿就是假绿。判据的决定性部分不可读 ⇒ 交回帧/人工。 */
  if (aOk.length && grantingPredatesFix(item, aOk)) return noJudge("授予绿用的判点在修复前的 HEAD 里就已存在（" + aOk.map(function (r) { return r.token; }).slice(0, 3).join(", ") + "）——命中不能证明改动落地");
  if (incon.length) return noJudge("有 " + incon.length + " 个硬判点是标识符，压缩构建改名后在产物里不可读（" + incon.map(function (r) { return r.token; }).slice(0, 3).join(", ") + "）；其余命中不足以证明这条改动落地 → 需帧或读源码人工判");
  return {
    verdict: "ARTIFACT_VERIFIED",
    why: "hard 判点全部在该页产物作用域内命中（" + aOk.length + "/" + judgedP.length + "）" + (incon.length ? "；另有 " + incon.length + " 个标识符判点因压缩改名不可判" : ""),
  };
}

/* ------------------------------------------------------------ 主流程 */

function buildItem(raw) {
  var item = { id: raw.id, laneFile: raw.laneFile || "", notes: [] };
  var row = LED.rows[item.id];
  item.ledgerResolvedVia = null;
  if (!row && LED.alias[item.id]) { row = LED.rows[LED.alias[item.id]]; item.ledgerResolvedVia = LED.alias[item.id]; item.notes.push("台账无本尊行，判据取自 canonical 行 " + LED.alias[item.id] + "（并案/别名口径）"); }
  item.ledger = row || null;
  if (!row) item.notes.push("台账（issue-matrix.md 第一/二/三节）里没有本尊行、也没有可回指的别名格");
  else if (row.sec === 3) item.notes.push("该号在台账第三节（DUPLICATE_OF 并 alias），无独立处置列，判据取自并入理由");

  item.srcRels = resolveSrcRel(item);
  if (!item.srcRels.length) item.notes.push("落点源码文件在本工作树里找不到（laneFile=" + item.laneFile + "）");
  item.themeNative = item.srcRels.length > 0 && item.srcRels.every(function (r) { return /\.(scss|sass|css)$/.test(r) || /^theme\//.test(r); });
  item.statusBlocked = (function () {
    var st = statusHead((row && row.status) || "");
    if (/^未取证/.test(st) || /^保留-判据不成立/.test(st)) return st;
    return null;
  })();
  item.distScope = distScopeFor(item.srcRels);
  item.srcScope = srcScopeFor(item.srcRels);

  var clauses = [];
  var pre = [];
  if (row) {
    var actionTxt = row.action || "";
    if (row.sec === 2) actionTxt = (actionTxt || "") + " " + (row.status || "");
    clauses = clausesOf(actionTxt, "ledger-action").concat(clausesOf(row.statusEvidence || "", "ledger-statusEvidence"));
    pre = pre.concat(clausesOf(row.evidence || "", "ledger-evidence").map(function (c) { return c.text; }));
    if (row.sec === 2) pre.push(row.aliases || "");
  }

  var clo = closerExpect(item);
  var cloPost = clo ? clo.post.join(" ；") : "";
  if (clo) {
    clauses = clauses.concat(clausesOf(cloPost, "closer-diff"));
    pre = pre.concat(clo.pre);
    item.closerAction = clo.action;
    if (clo.action === "no_op_already_fixed") item.notes.push("closer 记为 no_op_already_fixed（判定本就无需改）");
    if (clo.action === "deferred_p4") item.notes.push("closer 记为 deferred_p4（本轮未动手）");
    if (clo.action === "needs_backend") item.notes.push("closer 记为 needs_backend（修法在服务端）");
    if (clo.action === "needs_ruling") item.notes.push("closer 记为 needs_ruling（需裁决）");
    if (clo.action === "ledger_anchor_error") item.notes.push("closer 记为 ledger_anchor_error（台账锚点写错）");
  }

  var srcAnchorTxt = "";
  if (row && row.statusEvidence && !/^—/.test(row.statusEvidence)) {
    var refs = String(row.statusEvidence).match(/apps\/client\/src\/[^\s,;，；、）(]+:\d+(?:-\d+)?/g) || [];
    for (var i = 0; i < refs.length && i < 6; i++) {
      var al = anchorLines(refs[i]);
      if (al) srcAnchorTxt += "\n" + stripComments(al.text);
    }
    if (srcAnchorTxt.trim()) clauses = clauses.concat(clausesOf(srcAnchorTxt, "src-anchor"));
  }

  var preTokens = {};
  for (var q = 0; q < pre.length; q++) {
    var toks = String(pre[q]).match(/--[A-Za-z0-9_\-]+|[.#][a-z][A-Za-z0-9_\-]+|IMAGE_PATHS\.[A-Z0-9_.]+|#[0-9a-fA-F]{3,8}|\b[a-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+\b/g) || [];
    for (var z = 0; z < toks.length; z++) preTokens[toks[z].toLowerCase()] = 1;
  }
  item.preTokens = preTokens;

  var probes = [];
  var pseen = {};
  for (var c = 0; c < clauses.length; c++) {
    var cl = clauses[c];
    var pol = cl.polarity === "absent" ? "absent" : "present";
    var from = probesFrom(cl.post || "", cl.origin || "ledger-action", pol, cl.anchored);
    /* 中文句式里「走/给/将 X 改 …」的宾语常落在动词前侧，标识符/字符串这类不会被改名的判点
       整句都认（取值型判点仍只认修后侧，否则会把修前值当成修后值）。 */
    if (pol === "present" && cl.pre) {
      var pre2 = probesFrom(cl.pre, (cl.origin || "ledger-action") + "-pre", pol, cl.anchored).filter(function (p) {
        return p.kind === "identifier" || p.kind === "string-lit" || p.kind === "symbol" || p.kind === "api" || p.kind === "backend";
      });
      from = from.concat(pre2);
    }
    for (var f = 0; f < from.length; f++) {
      var pr = from[f];
      var k = pr.kind + "|" + pr.token + "|" + pr.polarity;
      /* 跨子句去重不能"先到先得"：isHard() 看的是 anchored 与 origin，
         同一个判点从 closer-diff（修→修后差异串，最硬）和从顺手抠出的散文（最软）都会出现一次，
         谁先 push 就定了它的硬度 —— 本轮实测 MP-R2VIS-…-DISCOVER-MATCHING-002 因此
         在判点抽取器收紧后从 ARTIFACT_VERIFIED 掉成 UNDECIDABLE（artifact 命中没变，变的只是标签）。
         归并规则：硬度取两侧更强的那个（anchored 取或、hard 来源优先）。 */
      if (pseen[k] !== undefined) {
        var prev = probes[pseen[k]];
        if (pr.anchored) prev.anchored = true;
        if (isHardOrigin(pr.origin) && !isHardOrigin(prev.origin)) prev.origin = pr.origin;
        continue;
      }
      pseen[k] = probes.length;
      /* 「修前值黑名单」只对取值型判据成立（CSS 变量/声明/类名/文案/资源）：
         标识符与字符串值本来就会被修前修后两侧同时点名，一律丢会把判点全丢光。 */
      var VALUE_BEARING = { "css-var": 1, "css-var-def": 1, "css-decl": 1, class: 1, literal: 1, asset: 1 };
      var isPre = preTokens[String(pr.token).toLowerCase()] || preTokens[String(pr.token).replace(/^--/, "").toLowerCase()];
      if (isPre && pr.polarity === "present" && VALUE_BEARING[pr.kind]) { pr.droppedAsPreFix = true; item.notes.push("丢判为「修前值」的探针：" + pr.token + "（同时出现在证据/修前列）"); continue; }
      probes.push(pr);
    }
  }
  if (ARG.trace && ARG.trace.indexOf(item.id) >= 0) {
    console.log("[trace] " + item.id + " srcRels=" + JSON.stringify(item.srcRels));
    console.log("[trace]   clauses=" + JSON.stringify(clauses.map(function (c) { return { o: c.origin, a: c.anchored, p: c.polarity, post: c.post.slice(0, 70) }; })));
    console.log("[trace]   rawProbes=" + JSON.stringify(probes.map(function (p) { return p.kind + ":" + p.token; })));
  }
  item.probes = pruneProbes(probes, item);
  if (ARG.trace && ARG.trace.indexOf(item.id) >= 0) console.log("[trace]   keptProbes=" + JSON.stringify(item.probes.map(function (p) { return p.kind + ":" + p.token + (isHard(p) ? "(hard)" : "(soft)"); })));
  item.preSide = pre.length;

  var full = ((row && (row.action || "") + " " + (row.statusEvidence || "")) || "") + " " + cloPost;
  item.frame = FRAME_MARK.test(full);
  var uiHits = [];
  if (RUNTIME_MARK.test(full)) uiHits.push("runtime");
  if (VISUAL_MARK.test(full)) uiHits.push("visual");
  if (BACKEND_MARK.test(full)) uiHits.push("backend");
  item.uiMarks = uiHits;

  /* 规则 1：英文文案判据的载体不在被测产物里，不许拿它判 NOT_FOUND */
  if (/英文|en-US|English|双语|两侧同步/i.test(full) && !item.probes.some(function (p) { return p.kind === "literal"; })) {
    item.probes.push({ kind: "en-copy", token: "（英文文案判据）", carrier: "en-US locale", polarity: "present", origin: "ledger-action", anchored: false });
    item.notes.push("判据含英文/双语口径 —— mock 构建只出 zh-CN.js，en-US 不进产物，该半边静态无从判定");
  }
  return item;
}

/** 撑起本次判决的最弱一类检索：越靠前越虚（literal 是纯 substring，最容易虚高） */
function weakestOf(results) {
  var hit = results.filter(function (r) { return r.usable && ((r.polarity === "present" && r.artifact.hit) || (r.polarity === "absent" && !r.artifact.hit)); });
  if (!hit.length) return null;
  hit.sort(function (a, b) { return (SPECIFICITY[a.kind] || 0) - (SPECIFICITY[b.kind] || 0); });
  return { kind: hit[0].kind, specificity: SPECIFICITY[hit[0].kind] || 0, token: hit[0].token, n: hit.length };
}

/** 探针剪枝：
 *  1) 裸标识符必须在源码作用域或产物里真存在过（否则多半是散文里的英文词）；
 *  2) 同 token 已被更专门的类型覆盖时丢掉泛标识符命中；
 *  3) hard 判点优先保留，soft 判点封顶。 */
var KIND_RANK = { "css-decl": 90, "css-var-def": 85, "css-var": 84, asset: 80, "i18n-key": 75, "string-lit": 70, "literal": 60, class: 55, symbol: 50, api: 45, backend: 40, identifier: 20, "en-copy": 5 };

function tokenExistsAnywhere(tok, item) {
  var re = reIdent(tok);
  for (var i = 0; i < item.srcScope.length; i++) { re.lastIndex = 0; if (re.test(item.srcScope[i].lc)) return true; }
  var g = globalHitsIdx(DIST, { kind: "identifier", token: tok });
  if (g.length) return true;
  var gs = globalHitsIdx(SRC, { kind: "identifier", token: tok });
  if (gs.length) return true;
  /* 立账时就点过名的东西（证据列/修前列/closer 的 A 侧）即使现在两个载体都搜不到，
     也是「删除型」判据的正身 —— 删掉的东西当然搜不到，不能因此把判点丢掉 */
  if (item.preTokens && item.preTokens[String(tok).toLowerCase()]) return true;
  return false;
}

function pruneProbes(probes, item) {
  var covered = {};
  var i;
  for (i = 0; i < probes.length; i++) if (probes[i].kind !== "identifier") covered[String(probes[i].token).toLowerCase()] = 1;
  /* 带冒号的事件/属性名（update:modelValue）会被 reId 顺手劈出尾巴（modelValue），两者同场时尾巴是**更弱**的判点：
     props 名 modelValue 本来就该留着，拿它做"该删的东西还在"就是假指控
     （实测把 MP-R2-VILLAGE-INDEX-011 这条三载体同向（HEAD 2 处→工作树 0→产物 0）的已修项钉在 NOT_IN_EITHER）。
     这里让裸尾巴向带冒号的正身让位。 */
  for (i = 0; i < probes.length; i++) {
    var ctk = String(probes[i].token || "");
    var ici = ctk.indexOf(":");
    if (ici > 0 && /^[A-Za-z0-9_$]+$/.test(ctk.slice(ici + 1))) covered[ctk.slice(ici + 1).toLowerCase()] = 1;
  }
  var kept = [];
  for (i = 0; i < probes.length; i++) {
    var p = probes[i];
    if (p.kind === "identifier") {
      if (covered[String(p.token).toLowerCase()]) continue;
      if (!tokenExistsAnywhere(p.token, item)) {
        /* 两载体都搜不到名字：可能压根没落地，也可能只是台账写了个提案名。
           压缩构建会改局部名，所以这里不给 NOT_IN_EITHER，只留一条"孤儿判点"备查。 */
        p.orphanName = true;
        item.notes.push("判据点名的标识符 " + p.token + " 在源码树与产物里都搜不到（疑似未落地的提案名），不据此判生死");
      }
    }
    kept.push(p);
  }
  kept.sort(function (a, b) {
    var ah = isHard(a) ? 1 : 0, bh = isHard(b) ? 1 : 0;
    if (ah !== bh) return bh - ah;
    var ar = KIND_RANK[a.kind] || 0, br = KIND_RANK[b.kind] || 0;
    if (ar !== br) return br - ar;
    return String(a.token).length - String(b.token).length;
  });
  var hardN = kept.filter(function (p) { return isHard(p); }).length;
  var cap = Math.max(10, hardN + 6);
  if (kept.length > cap) {
    item.notes.push("判点过多（" + kept.length + "），只评前 " + cap + " 个（hard 优先），其余弃评：" + kept.slice(cap).map(function (p) { return p.token; }).slice(0, 6).join(", "));
    kept = kept.slice(0, cap);
  }
  return kept;
}

function runItem(item) {
  var results = [];
  for (var i = 0; i < item.probes.length; i++) results.push(evalProbe(item.probes[i], item));
  var d = decide(item, results);
  var rec = {
    id: item.id,
    laneFile: item.laneFile || null,
    srcRels: item.srcRels,
    distScope: item.distScope.map(function (f) { return f.rel; }),
    ledger: item.ledger ? {
      sec: item.ledger.sec, line: item.ledger.line, viaAlias: item.ledgerResolvedVia || null,
      page: item.ledger.page, category: item.ledger.category, severity: item.ledger.severity,
      status: item.ledger.status, statusHead: statusHead(item.ledger.status),
      action: truncate(item.ledger.action || ""), statusEvidence: truncate(item.ledger.statusEvidence || ""),
    } : { missing: true },
    verdict: d.verdict,
    verdictWhy: d.why,
    frame: item.frame,
    uiMarkers: item.uiMarks,
    probes: results,
    probeCount: item.probes.length,
    notes: item.notes.filter(function (x, i2, a) { return a.indexOf(x) === i2; }),
    closerAction: item.closerAction || null,
  };
  var hit = results.filter(function (r) { return r.artifact && r.artifact.hit; })[0];
  rec.artifactEvidence = hit ? { file: hit.artifactFile, excerpt: hit.artifactExcerpt || hit.excerpt, kind: hit.kind, token: hit.token } : null;
  var sh = results.filter(function (r) { return r.src && r.src.hit; })[0];
  rec.srcEvidence = sh ? { file: sh.srcFile, excerpt: sh.srcExcerpt, kind: sh.kind, token: sh.token } : null;
  rec.searched = results.map(function (r) { return (r.polarity === "absent" ? "ABSENT:" : "") + r.kind + " " + r.token; });
  rec.weakestCheck = weakestOf(results);
  if (rec.verdict === "ARTIFACT_VERIFIED" && rec.weakestCheck && rec.weakestCheck.specificity <= 1) rec.weakGreen = true;
  return rec;
}

/* --------------------------------------------------------------- 输出 */

function ensureOut() { try { fs.mkdirSync(P.out, { recursive: true }); } catch (e) { } }

function writeMd(bundle) {
  var L = [];
  L.push("# 修复波 × 构建产物 可观测性核验（round-6）");
  L.push("");
  L.push("生成时间：" + new Date(bundle.meta.writtenAt).toISOString() + "（离线，只读；未构建、未开端口、未碰 DevTools、未写 git、未写 reports/**）");
  L.push("");
  L.push("## 载体");
  L.push("");
  L.push("- 被测产物：`" + bundle.meta.dist + "`（00:16 本地重建自工作树，含修复波、不含 01:40 之后的编辑）");
  L.push("- 源码树：`" + bundle.meta.src + "`");
  L.push("- 台账：`" + bundle.meta.ledger + "`（第一节 12 竖线本尊行 " + bundle.meta.ledgerSec1 + " 行；第二节并 canonical 7 列 " + bundle.meta.ledgerSec2 + " 行）");
  L.push("- 条目集：`" + bundle.meta.lanes + "` — " + bundle.meta.lanesNote);
  L.push("- i18n 载体口径：产物只出 `" + LOCALE_DIST_REL + "`，`en-US` 被构建剥掉；对英文文案的静态检索属测量失败，不判 NOT_FOUND");
  L.push("- 键位索引自检：zh-CN 产物侧解析出 " + LOCALE_DIST.count + " 个叶子键，源码侧 " + LOCALE_SRC.count + " 个（i18n-wired.json 基线记 zh=4115）");
  L.push("");
  L.push("## 五桶");
  L.push("");
  L.push("| 桶 | 条数 | 占比 |");
  L.push("|---|---|---|");
  var names = ["ARTIFACT_VERIFIED", "SOURCE_ONLY", "NEEDS_UI_FRAME", "NOT_IN_EITHER", "UNDECIDABLE"];
  for (var n = 0; n < names.length; n++) {
    var v = bundle.summary[names[n]];
    L.push("| " + names[n] + " | " + v + " | " + (bundle.meta.items ? (100 * v / bundle.meta.items).toFixed(1) : "0") + "% |");
  }
  L.push("| **合计** | **" + (bundle.summary.ARTIFACT_VERIFIED + bundle.summary.SOURCE_ONLY + bundle.summary.NEEDS_UI_FRAME + bundle.summary.NOT_IN_EITHER + bundle.summary.UNDECIDABLE) + "** | 守恒=" + (bundle.meta.conserved ? "yes" : "no") + " |");
  L.push("");
  L.push("静态可判（ARTIFACT_VERIFIED + SOURCE_ONLY + NOT_IN_EITHER）= " + bundle.meta.staticDecidable + " 条；必须排 UI 帧（NEEDS_UI_FRAME）= " + bundle.summary.NEEDS_UI_FRAME + " 条；台账含糊（UNDECIDABLE）= " + bundle.summary.UNDECIDABLE + " 条。");
  L.push("");
  L.push("## 台账状态 × 本工具判决 不一致");
  L.push("");
  L.push("台账 status 说「没修」而产物里看得见修后状态、或反之。**不改台账**，交 orchestrator 裁决。");
  L.push("");
  if (!bundle.disagreements.length) L.push("（无）");
  else {
    L.push("| ID | 台账 status | 本工具判决 | 台账侧依据 | 产物侧依据 |");
    L.push("|---|---|---|---|---|");
    for (var g = 0; g < bundle.disagreements.length; g++) {
      var d = bundle.disagreements[g];
      L.push("| " + d.id + " | " + d.ledgerStatus + " | " + d.verdict + " | " + (d.ledgerNote || "") + " | " + (d.evidence || "") + " |");
    }
  }
  L.push("");
  L.push("## 次级来源与台账不一致");
  L.push("");
  if (!bundle.sourceDisagreements.length) L.push("（closer.json / i18n-*.json / _consumers.json 与台账没有互相打脸）");
  else {
    L.push("| ID | closer.json | 台账 status | 说明 |");
    L.push("|---|---|---|---|");
    for (var b = 0; b < bundle.sourceDisagreements.length; b++) {
      var sd = bundle.sourceDisagreements[b];
      L.push("| " + sd.id + " | " + (sd.closerAction || "—") + " | " + sd.ledgerStatus + " | " + sd.detail + " |");
    }
  }
  L.push("");
  L.push("## 逐条证据（按 ID 排序）");
  L.push("");
  for (var i = 0; i < bundle.items.length; i++) {
    var it = bundle.items[i];
    L.push("### " + it.verdict + " · " + it.id);
    L.push("");
    L.push("- 落点源码：" + (it.srcRels.length ? it.srcRels.map(function (x) { return "apps/client/src/" + x; }).join(", ") : "（未解析出）") + "｜产物作用域：" + (it.distScope.length ? it.distScope.join(", ") : "（无对应产物文件）"));
    L.push("- 台账：" + (it.ledger.missing ? "**无本尊行**" : "第 " + it.ledger.sec + " 节 : " + it.ledger.line + " 行，status=" + it.ledger.status + (it.ledger.viaAlias ? "（经别名 " + it.ledger.viaAlias + " 回源）" : "")));
    L.push("- 判据原文：" + String(it.ledger.action || "（台账无处置列文本）").slice(0, 300));
    if (it.probes.length) {
      L.push("- 检索串：");
      for (var q = 0; q < it.probes.length; q++) {
        var pr = it.probes[q];
        L.push("  - `" + (pr.polarity === "absent" ? "不应在产物里出现：" : "") + pr.kind + " " + pr.token + "`（来源 " + pr.origin + "，载体 " + pr.carrier + "）"
          + (pr.artifact && pr.artifact.hit ? "\n      - 产物命中 `" + pr.artifactFile + "` ▸ " + String(pr.artifactExcerpt || "").slice(0, EXCERPT_MAX) : "\n      - 产物作用域内未命中")
          + (pr.src && pr.src.hit ? "\n      - 源码命中 `" + pr.srcFile + "` ▸ " + String(pr.srcExcerpt || "").slice(0, EXCERPT_MAX) : pr.src && pr.usable ? "\n      - 源码作用域内未命中" : "")
          + (pr.note ? "\n      - 备注：" + pr.note : ""));
      }
    } else L.push("- 检索串：（无 —— 判据里抠不出可比对物件）");
    if (it.notes && it.notes.length) L.push("- 备注：" + it.notes.join("；"));
    L.push("- 判决依据：" + it.verdictWhy + (it.uiMarkers.length ? "（命中标记：" + it.uiMarkers.join("/") + "）" : "") + (it.frame ? "（台账自述需要帧）" : ""));
    L.push("");
  }
  L.push("## 口径与已知局限");
  L.push("");
  L.push("- 「产物命中」只授予该页作用域内的命中；同名 token 出现在别页记为越界命中，不判绿（见每条「备注」）。");
  L.push("- literal 类探针是纯 substring（运行时行为），也是本工具最容易虚高的一类：一条被别的键复用的中文串可以假绿。凡 verdict 仅靠 literal 撑起来的行都带 `weakestCheck=literal`。");
  L.push("- 台账单元格本身带 `…` 截断（如证据列 100 字截），个别判据因此残缺 → 落 UNDECIDABLE 属台账问题，不是产品问题。");
  L.push("- 产物构建时刻 00:16：campus store/images 标志、TodayLoveProgress.vue:105、anonymousToggleOnReal 键删除三批编辑不在产物里，理应落 SOURCE_ONLY。");
  fs.writeFileSync(path.join(P.out, "verdicts.md"), L.join("\n"), "utf8");
}

/* ------------------------------------------------------------- 守恒 */

var BUCKETS = ["ARTIFACT_VERIFIED", "SOURCE_ONLY", "NEEDS_UI_FRAME", "NOT_IN_EITHER", "UNDECIDABLE"];

function main() {
  ensureOut();
  var loaded = loadLaneItems();
  var items = loaded.items;

  if (ARG.only && ARG.only.length) {
    var want = {};
    ARG.only.forEach(function (x) { want[x] = 1; });
    items = items.filter(function (x) { return want[x.id]; });
  }

  var jsonl = path.join(P.out, "verdicts.jsonl");
  try { fs.writeFileSync(jsonl, "", "utf8"); } catch (e) { fatal("写不出 " + jsonl + "：" + e.message); }

  var records = [];
  for (var i = 0; i < items.length; i++) {
    var it = buildItem(items[i]);
    var rec = runItem(it);
    records.push(rec);
    try { fs.appendFileSync(jsonl, JSON.stringify(rec) + "\n", "utf8"); } catch (e) { fatal("追加失败于第 " + (i + 1) + " 条：" + e.message); }
  }

  records.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });

  /* 自测用破坏阀：故意把 N 条的桶抹掉，用来证明守恒断言真的会拦（见 --help 头注） */
  if (ARG.sabotage > 0) {
    for (var s = 0; s < ARG.sabotage && s < records.length; s++) {
      var drop = records[records.length - 1 - s];
      drop.sabotaged = true;
    }
  }

  /* 守恒断言（规则 5）：五桶之和必须等于条目数，否则点名漏网条目并 exit 2 */
  var counts = { ARTIFACT_VERIFIED: 0, SOURCE_ONLY: 0, NEEDS_UI_FRAME: 0, NOT_IN_EITHER: 0, UNDECIDABLE: 0 };
  var fellThrough = [];
  for (var r = 0; r < records.length; r++) {
    var v = records[r].verdict;
    if (records[r].sabotaged) { fellThrough.push(records[r].id + "(自测注入：判决被人为丢弃，原判=" + v + ")"); continue; }
    if (BUCKETS.indexOf(v) >= 0) counts[v]++;
    else fellThrough.push(records[r].id + "(" + (v || "无判决") + ")");
  }
  var sum = counts.ARTIFACT_VERIFIED + counts.SOURCE_ONLY + counts.NEEDS_UI_FRAME + counts.NOT_IN_EITHER + counts.UNDECIDABLE;
  var conserved = sum === records.length && !fellThrough.length;

  /* 状态打脸表（规则 6） */
  var dis = [];
  for (var q = 0; q < records.length; q++) {
    var rec2 = records[q];
    var st = (rec2.ledger && rec2.ledger.statusHead) || "";
    var saysFixed = /^已修复待复验/.test(st);
    var saysOpen = /^待修复/.test(st);
    var saysUndecided = /^未取证|^保留/.test(st);
    var v2 = rec2.verdict;
    var mismatch = null;
    if (saysOpen && v2 === "ARTIFACT_VERIFIED") mismatch = "台账记「待修复」，产物里已经看得见修后状态";
    if (saysFixed && v2 === "NOT_IN_EITHER") mismatch = "台账记「已修复待复验」，两个载体都查不到修后状态";
    if (saysFixed && v2 === "SOURCE_ONLY") mismatch = "台账记「已修复待复验」，但只落在源码树、产物里没有";
    if (!st && !saysUndecided) mismatch = "台账无本尊行，状态无从对表";
    if (mismatch) {
      dis.push({
        id: rec2.id, ledgerStatus: rec2.ledger.status || "（缺行）", verdict: v2,
        ledgerNote: String(rec2.ledger.action || "").slice(0, 60),
        evidence: rec2.artifactEvidence ? (rec2.artifactEvidence.file + " ▸ " + rec2.artifactEvidence.excerpt.slice(0, 60)) : (rec2.srcEvidence ? "仅源码 " + rec2.srcEvidence.file : "—"),
      });
    }
  }

  /* 次级来源 vs 台账 */
  var srcDis = [];
  for (var y = 0; y < records.length; y++) {
    var rr = records[y];
    if (!rr.closerAction || !rr.ledger || rr.ledger.missing) continue;
    var la = rr.ledger.statusHead || "";
    var detail = null;
    if (/^(needs_backend|needs_ruling|deferred_p4|ledger_anchor_error)$/.test(rr.closerAction) && /^已修复待复验/.test(la)) detail = "closer 判「" + rr.closerAction + "」而台账已推进到已修";
    if (rr.closerAction === "patched" && /^已修复待复验/.test(la) === false && /未进 HEAD|工作树/.test(rr.ledger.status || "")) detail = "closer 记 patched（已落工作树），台账 status 已带同名括注";
    if (rr.closerAction === "no_op_already_fixed" && /^待修复/.test(la)) detail = "closer 判「本来就无需改」，台账仍是待修复";
    if (detail) srcDis.push({ id: rr.id, closerAction: rr.closerAction, ledgerStatus: rr.ledger.status, detail: detail });
  }

  var staticDecidable = counts.ARTIFACT_VERIFIED + counts.SOURCE_ONLY + counts.NOT_IN_EITHER;
  var bundle = {
    meta: {
      tool: "scripts/qa/verify-fixes-against-artifact.cjs",
      writtenAt: new Date().toISOString(),
      offline: true,
      baselineRef: BASELINE,
      baselineSha: (function () { try { return require("child_process").execSync("git rev-parse --short " + safeRef(BASELINE), { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch (e) { return "?"; } })(),
      headSha: (function () { try { return require("child_process").execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch (e) { return "?"; } })(),
      dist: path.relative(ROOT, P.dist).split(path.sep).join("/"),
      src: path.relative(ROOT, P.src).split(path.sep).join("/"),
      ledger: path.relative(ROOT, P.ledger).split(path.sep).join("/"),
      lanes: path.relative(ROOT, loaded.origin).split(path.sep).join("/"),
      lanesNote: loaded.note || "",
      ledgerSec1: (LED.secCount && LED.secCount[1]) || 0,
      ledgerSec2: (LED.secCount && LED.secCount[2]) || 0,
      ledgerSec3: (LED.secCount && LED.secCount[3]) || 0,
      ledgerAlias: Object.keys(LED.alias).length,
      items: records.length,
      conserved: conserved,
      staticDecidable: staticDecidable,
      stillOpenDeclared: (function () { try { return JSON.parse(fs.readFileSync(P.lanes, "utf8")).stillOpen; } catch (e) { return null; } })(),
      artifactBuildMtime: (function () { try { return fs.statSync(path.join(P.dist, "app.wxss")).mtime.toISOString(); } catch (e) { return null; } })(),
      sabotage: ARG.sabotage || 0,
      localeIndexDist: LOCALE_DIST.count,
      localeIndexSrc: LOCALE_SRC.count,
      fatal: FATAL,
    },
    summary: counts,
    items: records,
    disagreements: dis,
    sourceDisagreements: srcDis,
    fellThrough: fellThrough,
  };

  fs.writeFileSync(path.join(P.out, "verdicts.json"), JSON.stringify(bundle, null, 1), "utf8");
  writeMd(bundle);

  if (ARG.sample > 0) {
    var ids = records.map(function (x) { return x.id; });
    var k = Math.max(1, Math.floor(ids.length / ARG.sample));
    var picked = [];
    for (var z = 0; z < ids.length && picked.length < ARG.sample; z += k) picked.push(records[z]);
    console.log("");
    console.log("--- 抽样审计（ID 升序后每 " + k + " 条取 1，共 " + picked.length + " 条）---");
    for (var w = 0; w < picked.length; w++) {
      var p = picked[w];
      console.log("· " + p.id + " → " + p.verdict);
      for (var t2 = 0; t2 < p.probes.length; t2++) {
        var pp = p.probes[t2];
        console.log("    检索串 [" + pp.kind + "/" + pp.origin + "/" + pp.carrier + "] " + (pp.polarity === "absent" ? "ABSENT " : "") + JSON.stringify(pp.token));
        console.log("      产物：" + (pp.artifact && pp.artifact.hit ? "命中 " + pp.artifactFile + " ▸ " + String(pp.artifactExcerpt || "").slice(0, EXCERPT_MAX) : "未命中")
          + "｜源码：" + (pp.src && pp.src.hit ? "命中 " + pp.srcFile + " ▸ " + String(pp.srcExcerpt || "").slice(0, EXCERPT_MAX) : "未命中"));
      }
      if (!p.probes.length) console.log("    （无检索串：判据抠不出物件 / 全被判为修前值）" + (p.ledger.action ? "\n    台账原文：" + p.ledger.action : ""));
    }
  }

  // 分桶守恒只对"本次枚举到的条目"成立；枚举本身塌了（历史上塌过一次到 3 条）也会 CONSERVED ✔，
  // 所以必须再拿上游来源数对一次：fix-lanes.stillOpen 声明多少条，就必须枚举出多少条。
  var stillOpenDeclared = null;
  try { stillOpenDeclared = JSON.parse(fs.readFileSync(P.lanes, "utf8")).stillOpen; } catch (e) { stillOpenDeclared = null; }
  if (typeof stillOpenDeclared === "number" && stillOpenDeclared !== records.length) {
    console.log("FAIL 条目数与上游来源不符：枚举 " + records.length + " 条，fix-lanes.stillOpen=" + stillOpenDeclared + " —— 扫描集塌缩，五格守恒不作数");
    conserved = false;
  }
  /* 判据自相矛盾的条数必须出现在总行里，否则"这一支永远不会红"这件事又变成只有读逐条日志的人才知道。
     计数从 records 自身反查（不新增模块级累加器）：这份文件 1350 行，
     新增全局变量的初始化顺序本身就是下一类 bug 的源头。 */
  var conflicts = records.filter(function (r) { return JSON.stringify(r).indexOf("判据自相矛盾") >= 0; });
  if (conflicts.length) {
    console.log("PROBE_CONFLICTS=" + conflicts.length + " 条判据自相矛盾（同一标识既要求可见又要求不可见＝「二选一」判据），一律 UNDECIDABLE 不授绿：");
    for (var ci = 0; ci < Math.min(conflicts.length, 10); ci++) console.log("  CONFLICT " + conflicts[ci].id);
    if (conflicts.length > 10) console.log("  …CONFLICT 另有 " + (conflicts.length - 10) + " 条");
  }
  /* NOT_IN_EITHER 的口径必须自己讲明白：源码侧只搜「本条自报的落点文件」，产物侧却有 global 回落 ——
     两侧不对称，于是"判点其实躺在别的源文件里"会被读成"两载体都查不到＝没修"。
     本轮实测 6 条 NIE 里，callerSnapshot/TodayRecommendationView/EMOJI_SVG_MAP/metaLine
     用 git grep 在 apps/client/src 都能搜到 2~9 个文件。这里补一次同口径（squash 后小写）全仓回落，
     **只记观测、不改判**：改判要先补全每条的落点清单，那是数据工作不是判据工作，不在这一轮顺手做。 */
  var nieItems = records.filter(function (r) { return r.verdict === "NOT_IN_EITHER"; });
  if (nieItems.length) {
    console.log("NIE_SOURCE_FALLBACK 口径：" + path.relative(ROOT, P.src).split(path.sep).join("/") + " 侧只扫本条 srcRels（产物侧有 global 回落、源码侧没有），下列为全仓源码回落观测，不改判：");
    for (var ni = 0; ni < nieItems.length; ni++) {
      var it = nieItems[ni];
      var miss = (it.probes || []).filter(function (p) { return p.hard && p.polarity === "present" && !(p.artifact && p.artifact.hit) && !(p.src && p.src.hit); });
      var segs = miss.map(function (p) {
        var sq = squash(String(p.token)).toLowerCase();
        var hit = SRC.list.filter(function (f) { return f.sq.indexOf(sq) >= 0; });
        return p.token + "→" + (hit.length ? "全仓源码有(" + hit.length + " 文件，例 " + hit[0].rel + ")" : "全仓源码也没有");
      });
      console.log("  NIE_SCOPE_CHECK " + it.id + " 缺失硬判点=" + miss.length + " :: " + (segs.join(" ; ") || "(本条没有 present 硬判点缺失，NIE 由 absent/矛盾侧判出)"));
    }
  }
  /* 前提守卫（本轮实测）：对照组 == 当前 HEAD 且 apps/client/src 相对 HEAD 干净 ⇒ 本轮修复已经落进对照组，
     归因控制必然全线失效 —— 提交之后重跑一次，ARTIFACT_VERIFIED 18 → 8、UNDECIDABLE 37 → 45，
     一次合法提交把核验台判成"什么都没修"。这时必须显式 `--baseline <本轮开跑 SHA>`。 */
  try {
    var cpBase = require("child_process");
    var srcDirtyVsHead = cpBase.execSync("git status --porcelain apps/client/src", { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    console.log("BASELINE=" + BASELINE + " srcDirtyVsHead=" + (srcDirtyVsHead ? "yes" : "no"));
    if (!srcDirtyVsHead && BASELINE === "HEAD") console.log("BASELINE_PREMISE_WARN=对照组是当前 HEAD 且 src 相对 HEAD 干净 ⇒ 本轮修复已在对照组内，判点命中不再记作本轮落地；请显式 --baseline <本轮开跑 SHA>");
  } catch (e) { console.log("BASELINE_CHECK_UNAVAILABLE=" + String(e && e.message || "").slice(0, 70) + "（读不到就等于没测，不静默放行）"); }
  var tail = "FIXVERIFY_RESULT=" + (conserved && !FATAL.length ? "OK" : "FAIL") +
    " items=" + records.length +
    " ARTIFACT_VERIFIED=" + counts.ARTIFACT_VERIFIED +
    " SOURCE_ONLY=" + counts.SOURCE_ONLY +
    " NEEDS_UI_FRAME=" + counts.NEEDS_UI_FRAME +
    " NOT_IN_EITHER=" + counts.NOT_IN_EITHER +
    " UNDECIDABLE=" + counts.UNDECIDABLE +
    " PROBE_CONFLICTS=" + conflicts.length +
    " CONSERVED=" + (conserved ? "yes" : "no");

  console.log("");
  if (FATAL.length) for (var fi = 0; fi < FATAL.length; fi++) console.log("FATAL " + FATAL[fi]);
  if (!conserved) console.log("CONSERVATION FAIL 五桶之和 " + sum + " ≠ 条目数 " + records.length + "；漏网条目：" + (fellThrough.length ? fellThrough.join(", ") : "(无点名，存在重复计桶)"));
  console.log("状态打脸 " + dis.length + " 条｜次级来源与台账不一致 " + srcDis.length + " 条｜静态可判 " + staticDecidable + " 条｜需排 UI 帧 " + counts.NEEDS_UI_FRAME + " 条");
  console.log("输出：" + path.relative(ROOT, path.join(P.out, "verdicts.json")).split(path.sep).join("/") + " / " + path.relative(ROOT, path.join(P.out, "verdicts.md")).split(path.sep).join("/") + " / verdicts.jsonl（逐条追加，崩溃可续）");
  console.log(tail);

  if (!conserved || FATAL.length) process.exitCode = FATAL.length && !records.length ? 2 : 2;
  return conserved && !FATAL.length;
}

main();
