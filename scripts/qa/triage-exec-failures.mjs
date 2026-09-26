#!/usr/bin/env node
/**
 * 执行轮 FAILED / SKIPPED 行的分诊台（只读，不改任何权威件）。
 *
 * 为什么要"两份载体各查一遍"：执行轮跑的是 874ff52f 的冻结构建（dist），
 * 而修复波在这期间改的是源码树（src）。同一条"元素找不到"，
 * 在 dist 里有 / 没有，与在 src 里有 / 没有，是四个完全不同的结论：
 *   dist 无 + src 无 → 用例文案/选择器本就不属于这个构建（规格噪声或产品确实没有）
 *   dist 无 + src 有 → 修复波刚刚补上了它（本轮失败，重建后应复验）
 *   dist 有 + src 无 → 修复波把它删了（本轮通过的东西下次会没，必须复验）
 *   dist 有 + src 有 → 构建里有却定位不到 → 状态没到 / 时机太早 / 作用域找错（harness 或产品）
 * 只看其中一份就会把"harness 找不到"误报成"产品没有"，或反过来。
 *
 * 用法：node scripts/qa/triage-exec-failures.mjs \
 *         [--results reports/audit/round-6/interact/exec-results.json] \
 *         [--dist apps/client/dist/build/mp-weixin] [--src apps/client/src] \
 *         [--out .zcode/tmp/triage-r6]
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const RESULTS = arg("results", "reports/audit/round-6/interact/exec-results.json");
const DIST = arg("dist", "apps/client/dist/build/mp-weixin");
const SRC = arg("src", "apps/client/src");
const OUT = arg("out", ".zcode/tmp/triage-r6");

const die = (m) => { console.log(m); process.exitCode = 2; throw new Error(m); };

if (!fs.existsSync(RESULTS)) die(`FAIL 权威件不存在：${RESULTS}`);
if (!fs.existsSync(DIST)) die(`FAIL 冻结构建不存在：${DIST}（没有它就无法区分"跑的构建里没有"与"源码里没有"）`);

const doc = JSON.parse(fs.readFileSync(RESULTS, "utf8"));
if (!Array.isArray(doc.results)) die(`FAIL ${RESULTS} 没有 results[] 数组（顶层键：${Object.keys(doc).join(",")}）`);
const rows = doc.results;

// ---------- 载体索引：整份读进内存，逐 token 做 indexOf ----------
const EXT_DIST = new Set([".wxml", ".js", ".json", ".wxss"]);
const EXT_SRC = new Set([".vue", ".ts", ".js", ".json", ".scss", ".css"]);
function walk(dir, exts, stopAt) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git") continue;
        stack.push(p);
      } else if (exts.has(path.extname(e.name))) {
        try { if (fs.statSync(p).size <= 4 * 1024 * 1024) out.push(p); } catch { /* 断链/权限：跳过但要计数 */ }
        if (stopAt && out.length > stopAt) return out;
      }
    }
  }
  return out;
}
function index(files) {
  const idx = [];
  for (const p of files) {
    let t;
    try { t = fs.readFileSync(p, "utf8"); } catch { continue; }
    idx.push({ p, t });
  }
  return idx;
}
const distFiles = walk(DIST, EXT_DIST);
const srcFiles = walk(SRC, EXT_SRC);
const distIdx = index(distFiles);
const srcIdx = index(srcFiles);
if (!distIdx.length) die(`FAIL 构建索引为空：${DIST}`);
if (!srcIdx.length) die(`FAIL 源码索引为空：${SRC}`);

function hits(idx, token) {
  const out = [];
  for (const f of idx) if (f.t.includes(token)) out.push(f.p);
  return out;
}
// 选择器必须按"独立类名 token"匹配：裸 indexOf 会把 .id 命中 valid/width/padding，把"构建里有没有"判成假有
function hitsSel(idx, token) {
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^A-Za-z0-9_-])${esc}(?![A-Za-z0-9_-])`);
  const out = [];
  for (const f of idx) if (re.test(f.t)) out.push(f.p);
  return out;
}
// 页面前缀：定位失败最可能落在"该页自己的文件"里，单独标出来免得被全仓命中淹没
function pageScoped(list, page) {
  if (!page) return [];
  const stem = String(page).split("/").slice(-1)[0];
  const dir = String(page).replace(/\/[^/]*$/, "");
  return list.filter((p) => p.includes(dir + path.sep) || p.includes(stem));
}

// ---------- 分类 ----------
// failureReason 是"每行一句"的机读字段，优先信它；observed 里可能串多条 act-FAIL（一条用例多动作），
// 用非贪婪 + 锚末端从 observed 抠目标会跨条吞（实测把 `发布") / act-FAIL:tap(__CAND__) ...` 整串当成文案），
// 所以 observed 只在 failureReason 不成形时兜底，且兜底取**最后一条** act-FAIL。
const RE_OBS_FAIL = /act-FAIL:(\w+)\((.*?)\)\s+([^|]*)$/;
const RE_REASON = /^action (\S+) (\S+) failed: (.*)$/;
const RE_NOT_FOUND = /^element not found:\s*(.*)$/;
const RE_OBS_SKIP = /^action-not-automatable:\s*(.*)$/;

const BUCKET = {
  "SKIPPED-not-automatable": "用例要求的动作本通道做不了（拖动/连点/量 rect 等），只能人工驱动 —— 覆盖缺口，不是产品失败",
  "locate-label": "按文案找不到元素（__CAND__ 是执行器「按标签解析」的哨兵，不是漏替换）",
  "locate-label-token-lost": "按文案找不到，且消息里没留下要找的文案 —— 无法复核，属执行器取证缺陷",
  "locate-selector": "按选择器找不到元素",
  "harness-api": "执行器自身报错（方法不存在 / 类型错误），与被测物无关",
  "timeout": "动作超时",
  "auth-precondition": "前置登录/登出/token 铸造失败",
  "other-fail": "未归类，需人工读原文",
};

const buckets = {};
const items = [];
let unclassified = 0;
let curOnTarget = null;   // 每条迭代重算：动作发生时是否就在用例声明的页面上
let curMismatch = false;  // observed 里的 `MISMATCH!`：前置身份/状态与自己声明的不符

const push = (r, b, extra) => {
  buckets[b] = (buckets[b] || 0) + 1;
  items.push({ id: r.id, suite: r.suite, page: r.page, status: r.status, bucket: b, onTarget: curOnTarget, mismatch: curMismatch, ...extra });
};

for (const r of rows) {
  if (r.status === "EXECUTED") { buckets["EXECUTED"] = (buckets["EXECUTED"] || 0) + 1; continue; }
  const obs = String(r.observed || "");
  const reason = String(r.failureReason || "");

  // 动作发生时在不在目标页：`top=` 与 route[] 末条都是执行器自报；与 page 不符 → 定位失败与元素存在性无关
  const topM = obs.match(/top=([^\s|]+)/);
  const lastRoute = Array.isArray(r.route) && r.route.length ? r.route[r.route.length - 1].route : null;
  curOnTarget = topM ? topM[1] === r.page : lastRoute ? lastRoute === r.page : null;
  curMismatch = /MISMATCH!/.test(obs);

  if (r.status === "SKIPPED") {
    const m = obs.match(RE_OBS_SKIP);
    push(r, "SKIPPED-not-automatable", { want: m ? m[1] : null, note: m ? null : `observed 里没有 action-not-automatable 尾注：${obs.slice(0, 120)}` });
    if (!m) unclassified++;
    continue;
  }
  if (r.status !== "FAILED") { push(r, "other-fail", { want: null, note: `未知 status=${r.status}` }); unclassified++; continue; }

  // 取"失败那一幕"的原文：优先 failureReason（单句、机读），observed 只做兜底且取最后一条 act-FAIL
  let op = null, target = null, detail = null, src = null;
  const rm = reason.match(RE_REASON);
  const om = [...obs.matchAll(new RegExp(RE_OBS_FAIL.source, "g"))].pop();
  if (rm) { op = rm[1]; target = rm[2]; detail = rm[3]; src = "reason"; }
  else if (om) { op = om[1]; target = om[2]; detail = om[3].trim(); src = "observed"; }
  else { push(r, "other-fail", { want: null, note: `observed/failureReason 都不是 act-FAIL/action-x-failed 形态：obs="${obs.slice(0, 100)}" reason="${reason.slice(0, 100)}"` }); unclassified++; continue; }

  if (/is not a function|is not defined|TypeError|Cannot read/.test(detail)) { push(r, "harness-api", { want: detail.slice(0, 120), op, from: src }); continue; }
  if (/timeout|TIMEOUT/.test(detail)) { push(r, "timeout", { want: detail.slice(0, 120), op, from: src }); continue; }
  // 只按动作名判前置失败：`/login|logout/` 这种松散匹配会把 .login-sms-fallback 之类的选择器误判成登录前置失败
  if (op === "login" || op === "logout" || /^(login|logout|mint token|bootstrap)/i.test(detail)) {
    push(r, "auth-precondition", { want: detail.slice(0, 120), op, target, from: src }); continue;
  }

  const nf = detail.match(RE_NOT_FOUND);
  if (!nf) { push(r, "other-fail", { want: detail.slice(0, 160), op, from: src }); unclassified++; continue; }
  const found = nf[1].trim();

  const lm = found.match(/^__CAND__\s*[（(]"(.*)"[)）]$/);
  if (lm) {
    push(r, "locate-label", { want: lm[1], op, token: lm[1], tokenKind: "label", recoverable: true, suspect: lm[1].length < 2, from: src });
    continue;
  }
  // 选择器 + 标签混排（`.btn-text("返回微信登录")`）：决定性的是标签，选择器只是作用域
  const sm = found.match(/^(.+?)\s*[（(]"(.*)"[)）]$/);
  if (sm && sm[1] !== "__CAND__") {
    push(r, "locate-label", { want: sm[2], op, sel: sm[1], token: sm[2], tokenKind: "label", recoverable: true, suspect: sm[2].length < 2, from: src });
    continue;
  }
  if (found === "__CAND__" || found === "") {
    // 执行器只留下哨兵，没写要找的文案，也没写候选选择器 → 这条证据无法复核
    push(r, "locate-label-token-lost", { want: null, op, token: null, recoverable: false, from: src });
    unclassified++;
    continue;
  }
  push(r, "locate-selector", { want: found, op, token: found.replace(/^[.#]/, ""), tokenKind: "selector", recoverable: true, from: src });
}

// ---------- token 存在性双查（标签按运行时语义 substring 匹配，选择器按类名 token 匹配）----------
const NEEDS_INDEX = items.filter((it) => it.recoverable && it.token);
for (const it of NEEDS_INDEX) {
  const matcher = it.tokenKind === "selector" ? hitsSel : hits;
  const dh = matcher(distIdx, it.token), sh = matcher(srcIdx, it.token);
  it.distHits = dh.length; it.srcHits = sh.length;
  it.distHere = pageScoped(dh, it.page).length;
  it.srcHere = pageScoped(sh, it.page).length;
  it.verdict =
    it.onTarget === false ? "不在目标页：前置导航没到位（用例前置/harness 通道），元素存在性无从判断"
      : (!dh.length && !sh.length) ? "两载皆无：本构建确无此文案/类，用例断言的目标不存在（产品缺或规格臆造）"
      : (!dh.length && sh.length) ? "仅源码有：修复波补上了它 → 本轮失败作废，重建后必须复验"
        : (dh.length && !sh.length) ? "仅构建有：修复波删掉了它 → 下次构建会新增失败，必须复验"
          : "两载皆有且就在目标页：构建里有却定位不到 → 状态没到/时机太早/作用域找错（harness 或产品状态机）";
}

// ---------- 守恒断言 ----------
const total = rows.length;
const sum = Object.values(buckets).reduce((a, b) => a + b, 0);
if (sum !== total) die(`FAIL 分类不守恒：桶合计 ${sum} ≠ 行总数 ${total}（有行被重复计或漏计）`);
const neg = Object.entries(buckets).filter(([, v]) => v < 0);
if (neg.length) die(`FAIL 出现负计数：${JSON.stringify(neg)}`);

const suspect = items.filter((it) => it.suspect).length;
const fromObserved = items.filter((it) => it.from === "observed").length;
const noReason = rows.filter((r) => r.status === "FAILED" && !r.failureReason).length;
const offTarget = items.filter((it) => it.onTarget === false).length;
const noTop = items.filter((it) => it.onTarget === null).length;
const mism = items.filter((it) => it.mismatch).length;

// ---------- 输出 ----------
const order = ["EXECUTED", ...Object.keys(BUCKET)];
const lines = [];
lines.push(`# 执行轮失败分诊（round 权威件：${RESULTS}）`);
lines.push("");
lines.push(`- 权威件快照：round=${doc.round ?? "?"} gitSha=${doc.gitSha ?? "?"} updatedAt=${doc.updatedAt ?? "?"} 行数=${total}`);
lines.push(`- 构建索引：${DIST} → ${distIdx.length}/${distFiles.length} 文件；源码索引：${SRC} → ${srcIdx.length}/${srcFiles.length} 文件`);
if (distFiles.length !== distIdx.length || srcFiles.length !== srcIdx.length)
  lines.push(`- **读取失败计数**：dist ${distFiles.length - distIdx.length} 个、src ${srcFiles.length - srcIdx.length} 个文件读不出（存在性判定是在"可读物集"上做的，不是全量，见上）`);
lines.push(`- 守恒：桶合计 ${sum} == 行数 ${total} ✔`);
lines.push(`- 解析来源：failureReason ${items.filter((i) => i.from === "reason").length} 条 / observed 兜底 ${fromObserved} 条；FAILED 行里 failureReason 为空 ${noReason} 条`);
lines.push(`- 单字标签（从用例散文里抠出来的残字，几乎必是规格噪声而不是产品缺陷）：${suspect} 条`);
lines.push(`- 动作发生时不在用例声明的页面上：${offTarget} 条；observed 里读不到 top= 也读不到 route[]（判不了）：${noTop} 条`);
lines.push(`- observed 带 \`MISMATCH!\`（执行器自报前置身份/状态不符）：${mism} 条`);
lines.push("");
lines.push("| 桶 | 条数 | 含义 |");
lines.push("|---|---|---|");
for (const b of order) if (buckets[b]) lines.push(`| ${b} | ${buckets[b]} | ${BUCKET[b] || "已通过的行，不参与分诊"} |`);
lines.push("");
lines.push(`判据形态未能归类的行数（归在兜底桶里，逐条列在下文）：**${unclassified}**`);
lines.push("");

const four = {};
for (const it of NEEDS_INDEX) four[it.verdict] = (four[it.verdict] || 0) + 1;
lines.push("## 存在性四格（只统计能恢复出查找目标的定位失败）");
lines.push("");
lines.push("| 结论 | 条数 |");
lines.push("|---|---|");
for (const [k, v] of Object.entries(four).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
lines.push("");

for (const b of order) {
  const list = items.filter((it) => it.bucket === b);
  if (!list.length || b === "EXECUTED") continue;
  lines.push(`## ${b}（${list.length} 条）`);
  lines.push("");
  if (b === "SKIPPED-not-automatable") {
    const byPage = {};
    for (const it of list) (byPage[it.page] = byPage[it.page] || []).push(it);
    for (const [p, l] of Object.entries(byPage).sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`- ${p}（${l.length} 条）：` + l.slice(0, 3).map((x) => `${x.id}「${String(x.want || x.note).slice(0, 70)}」`).join("；") + (l.length > 3 ? `；另 ${l.length - 3} 条` : ""));
    }
  } else {
    const grouped = {};
    for (const it of list) {
      const k = `${(it.sel ? it.sel + '「' + it.token + '」' : it.want) || "?"} @ ${it.page}`;
      (grouped[k] = grouped[k] || []).push(it);
    }
    lines.push("| 要找的东西 | 页面 | 条数 | dist 命中(本页) | src 命中(本页) | 结论 |");
    lines.push("|---|---|---|---|---|---|");
    for (const [k, l] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
      const f = l[0];
      const tk = String(k.split(" @ ")[0]).replace(/\|/g, "/") + (f.suspect ? " ←单字残标签" : "");
      lines.push(`| ${tk} | ${f.page} | ${l.length} | ${f.distHits ?? "—"}(${f.distHere ?? "—"}) | ${f.srcHits ?? "—"}(${f.srcHere ?? "—"}) | ${f.verdict || "无查找目标"} |`);
    }
  }
  lines.push("");
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT + ".md", lines.join("\n"));
fs.writeFileSync(OUT + ".json", JSON.stringify({ results: RESULTS, updatedAt: doc.updatedAt ?? null, total, buckets, unclassified, items }, null, 1));
console.log(`TRIAGE_RESULT=OK rows=${total} unclassified=${unclassified}`);
for (const b of order) if (buckets[b]) console.log(`  ${String(buckets[b]).padStart(4)} ${b}`);
console.log(`out=${OUT}.md / ${OUT}.json`);
